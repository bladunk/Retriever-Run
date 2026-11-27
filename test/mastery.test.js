import assert from 'node:assert/strict'
import test from 'node:test'
import { advance, act, collect, createCourse, newRun } from '../src/runner.js'
import { createMasteryCourse } from '../src/mastery-course.js'
import { distanceAtTime, localDirector, masteryDirector, speedAtTime } from '../src/difficulty.js'
import { endlessPressure, masterySpeedCeiling } from '../src/mastery-pace.js'
import { masteryCourseRuleset } from '../src/ruleset.js'
import { collectMastery, createSkillTracker, sweptPickup } from '../src/mastery-events.js'
import { masteryReplayVersion, validMasteryTrace, verifyMasteryReplay } from '../src/ranked-replay.js'
import { simulateMastery } from '../scripts/mastery-survey.mjs'
import { firstContact } from '../src/collision.js'
import { careerStanding, xpAt, xpTransitions } from '../src/career.js'
import { createHuntRecap } from '../src/hunt-recap.js'
import { openLodge, saveKey, saveVersion } from '../src/lodge-save.js'

test('Mastery preserves the migration route and has a bounded progressive Endless', () => {
  for (const seed of [0,7,83]) {
    const older = createCourse(seed,localDirector)
    const next = createMasteryCourse(seed)
    for (let row=older();row.time<450;row=older()) assert.deepEqual(next(),row)
    assert.ok(next().time >= 450)
  }
  const times = [450,600,900,1200,1800,3600,14400]
  for (const [i, t] of times.entries()) {
    const speed = speedAtTime(t,masteryDirector)
    assert.ok(speed < masterySpeedCeiling)
    const slope = (distanceAtTime(t+.1,masteryDirector)-distanceAtTime(t,masteryDirector))/.1
    assert.ok(Math.abs(slope-speed) < .002)
    if (i) {
      assert.ok(speed > speedAtTime(times[i-1],masteryDirector))
      assert.ok(endlessPressure(t).decisionGap < endlessPressure(times[i-1]).decisionGap)
      assert.ok(endlessPressure(t).relief < endlessPressure(times[i-1]).relief)
    }
  }
})

test('the 60 minute reference path clears all requested intermediate targets with bounded entities', () => {
  const result = simulateMastery(7,3600)
  assert.equal(result.contact,null)
  assert.equal(result.results.length,5)
  assert.equal(result.elapsed,3600)
  assert.ok(result.peak < 85)
  assert.ok(result.metrics.cleanStreak >= 6)
})

test('Mastery replay reproduces the result and rejects an incompatible version or impossible input', () => {
  const result = simulateMastery(7,720,{coastAt:610})
  assert.ok(result.contact)
  assert.deepEqual(verifyMasteryReplay(7,result.trace),result.metrics)
  assert.equal(verifyMasteryReplay(7,{...result.trace,course:'migration-30-phase-05'}),null)
  assert.equal(verifyMasteryReplay(7,{...result.trace,ticks:result.ticks-1}),null)
  assert.equal(validMasteryTrace({course:masteryCourseRuleset,season:masteryReplayVersion,
    ticks:300,actions:[4,5,6]}),false)
  assert.equal(validMasteryTrace({...result.trace,ticks:Number.MAX_SAFE_INTEGER}),false)
})

test('a swept treat during lateral movement is picked up at actual overlap and combo bonuses cap', () => {
  const start = { ...newRun(masteryDirector), distance:9.45, x:.66 }
  const end = { ...start, distance:10.57, x:0, elapsed:.0083 }
  const treat = { type:'treat',distance:10,lane:0 }
  assert.equal(sweptPickup(start,end,treat),true)
  assert.equal(sweptPickup({...start,x:1.4},{...end,x:1.1},treat),false)
  assert.equal(sweptPickup({...start,jump:.46},{...end,jump:.45},treat),false)
  assert.equal(sweptPickup(start,end,{...treat,hazard:true}),false)
  for (let i=0;i<42;i++) {
    const result = collectMastery(end,treat,collect)
    assert.equal(result.milestone,[5,10,15,25,40].includes(end.streak))
    assert.ok(result.points <= 74)
  }
  assert.equal(end.bestStreak,42)
})

test('directional debounce applies to Mastery and leaves archived input semantics', () => {
  const run = newRun(masteryDirector)
  assert.ok(act(run,'left'))
  assert.equal(act(run,'right'),false)
  for(let i=0;i<12;i++) advance(run,1/120,masteryDirector)
  assert.ok(act(run,'right'))
  assert.ok(act(run,'jump'))
  assert.equal(act(run,'slide'),false)
  const old = newRun()
  assert.ok(act(old,'left'))
  assert.ok(act(old,'right'))
})

test('exact XP boundaries, overflow and level 100 use real career thresholds', () => {
  const leg = (from,to) => xpTransitions(careerStanding({xp:from}),careerStanding({xp:to}))
  assert.deepEqual(leg(90,110),[{level:1,from:90,to:110,max:110},{level:2,from:0,to:0,max:xpAt(3)-110}])
  const weeks = leg(24,xpAt(4)+121)
  assert.deepEqual(weeks.map(stage=>stage.level),[1,2,3,4])
  assert.equal(weeks.at(-1).to,121)
  assert.deepEqual(leg(xpAt(100)-3,xpAt(100)+500).at(-1),{level:100,from:0,to:1,max:1})
})

test('a real swept near miss is paid once at safe passage', () => {
  const tracker = createSkillTracker()
  const item = { type:'log',lane:0,distance:60,hazard:true,rowId:1 }
  const run = Object.assign(newRun(masteryDirector),{x:1.27,lane:1,lastLaneFrom:0,lastLaneAt:2,elapsed:2.5,distance:60})
  const previous = { ...run,distance:59.76 }
  assert.equal(firstContact(previous,run,[item],{}),undefined)
  tracker(previous,run,[item,{...item}])
  const passed = { ...run,distance:63.16 }
  const events = []
  tracker({...run,distance:63.12},passed,[item],(...event) => events.push(event))
  tracker(previous,passed,[item],(...event) => events.push(event))
  assert.deepEqual(events,[['near',24]])
  assert.equal(passed.nearMisses,1)
  assert.equal(passed.cleanStreak,1)
  assert.equal(passed.scoreBonus,24)
})

test('replay state is limited to the last 84 poses and 96 hazards and does not modify the run', () => {
  const recap = createHuntRecap()
  const run = newRun(masteryDirector)
  for(let i=0;i<300;i++){
    run.distance = i
    run.elapsed = i / 30
    recap.record(run,i)
    recap.hazard({type:'log',distance:i,lane:1},i)
  }
  const { history,hazards } = recap.snapshot()
  assert.equal(history.length,84)
  assert.equal(history.at(-1).distance,299)
  assert.ok(hazards.length<=96)
  assert.equal(run.scoreBonus,0)
  recap.reset()
  assert.equal(recap.canWatch(),false)
})

test('version six personal records stay archived and finalizing Mastery twice never pays twice', () => {
  const data = new Map([[saveKey,JSON.stringify({version:6,active:1,players:[{id:1,profile:{score:1250,best:1250}},{id:2}]})]])
  const storage = () => ({ getItem:key=>data.get(key) ?? null, setItem:(key,value)=>data.set(key,value) })
  const lodge = openLodge(storage)
  const tracker = lodge.beginRun(undefined,masteryCourseRuleset)
  const run = Object.assign(newRun(masteryDirector),{elapsed:10,distance:145,scoreBonus:73})
  const report = lodge.finalize(1,tracker,run,'log')
  assert.ok(report.saved)
  assert.equal(lodge.finalize(1,tracker,run,'log'),null)
  assert.equal(JSON.parse(data.get(saveKey)).version,saveVersion)
  const saved = openLodge(storage)
  assert.equal(saved.players()[0].masteryBest,218)
  assert.equal(saved.players()[0].profile.best,1250)
  assert.equal(saved.players()[0].stats.runs,1)
  assert.equal(saved.players()[1].stats.runs,0)
  assert.equal(saved.board('score',masteryCourseRuleset)[0].score,218)
})
