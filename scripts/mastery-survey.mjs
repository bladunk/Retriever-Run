import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import { createMasteryCourse } from '../src/mastery-course.js'
import { localDirector, masteryDirector, speedAtTime } from '../src/difficulty.js'
import { endlessPressure } from '../src/mastery-pace.js'
import { createCourse, newRun, advance, collect, score } from '../src/runner.js'
import { createRunControls } from '../src/run-controls.js'
import { firstContact } from '../src/collision.js'
import { diveAge, diveExit } from '../src/dive.js'
import { collectMastery, createSkillTracker, sweptPickup } from '../src/mastery-events.js'
import { samplePose, tickSeconds } from '../src/timing.js'
import { masteryCourseRuleset } from '../src/ruleset.js'
import { masteryReplayVersion, rankedMoves, verifyMasteryReplay } from '../src/ranked-replay.js'

export const checkpoints = [600, 900, 1200, 1800, 3600]

export function simulateMastery(seed, duration, { coastAt = Infinity, timing = 0 } = {}) {
  const run = newRun(masteryDirector)
  const next = createMasteryCourse(seed)
  const controls = createRunControls()
  const skills = createSkillTracker()
  const before = {}
  const contact = {}
  const actions = []
  const rows = []
  const entities = []
  const results = []
  const pickupSeen = new WeakSet()
  let row = next()
  let ticks = 0
  let peak = 0
  let spawns = 0
  let usedGate = false
  let lastTurn = -Infinity
  let released = -Infinity
  let collision
  let style = { pickupPoints: 0, skillPoints: 0 }

  while (run.elapsed < duration && !collision) {
    while (row.at < run.distance + 102) {
      rows.push(row)
      entities.push(...row.entities)
      row = next()
      spawns++
      peak = Math.max(entities.length, peak)
    }
    const target = rows[0]
    if (target && run.elapsed < coastAt) {
      const earlier = .42
      if (run.elapsed >= released + earlier && target.lane !== run.lane && run.elapsed - lastTurn >= .16 - 1e-9) {
        controls.enqueue(run.lane < target.lane ? 'right' : 'left')
        lastTurn = run.elapsed
      }
      if (!usedGate && target.gate && target.at - run.distance <= run.speed * (target.gate.duration / 2 - (target.sequence === undefined ? 0 : timing))) {
        controls.enqueue(target.gate.action)
        usedGate = true
      }
    }
    controls.apply(run, move => actions.push(ticks * 4 + rankedMoves.indexOf(move)))
    samplePose(before, run, run, 1)
    advance(run, tickSeconds, masteryDirector)
    ticks++
    collision = firstContact(before, run, entities, contact)
    if (collision) {
      samplePose(run, before, run, contact.fraction)
      break
    }
    skills(before, run, entities, (_, points) => { style.skillPoints += points })
    for (let i = 0; i < entities.length; i++) {
      const item = entities[i]
      if (item.type === 'goose') {
        if (diveAge(item, run.distance) > diveExit) entities.splice(i--, 1)
      } else if (sweptPickup(before, run, item)) {
        assert.ok(!pickupSeen.has(item), 'duplicate pickup')
        pickupSeen.add(item)
        style.pickupPoints += collectMastery(run, item, collect).points
        entities.splice(i--, 1)
      } else if (item.distance - run.distance < (item.type === 'treat' ? -1 : -8 - (item.span ?? 0) * .5)) {
        if (item.type === 'treat' && !item.comboOptional) run.streak = 0
        entities.splice(i--, 1)
      }
    }
    if (target && run.distance > (target.end ?? target.at) + (target.pattern === 'endless-goose' ? run.speed * .85 : 1.58)) {
      rows.shift()
      released = run.elapsed
      usedGate = false
    }
    const threshold = checkpoints[results.length]
    if (run.elapsed >= threshold) results.push({ elapsed: run.elapsed, peak, spawns, score: score(run) })
  }
  assert.ok(Number.isSafeInteger(score(run)))
  assert.equal(score(run), Math.floor(run.distance) + style.pickupPoints + style.skillPoints)
  const metrics = { score:score(run), distance:Math.floor(run.distance), duration:Math.round(run.elapsed*1000),
    retrieves:run.retrieves, combo:run.bestStreak, nearMisses:run.nearMisses, cleanStreak:run.bestCleanStreak }
  return { seed, ticks, peak, spawns, style, results, metrics, elapsed: run.elapsed,
    contact: collision ? { ...contact, row: collision.rowId, pattern: collision.pattern } : null, trace: { course:masteryCourseRuleset, season:masteryReplayVersion, ticks, actions } }
}

export function measures(seed, at, mastery) {
  const start = at - 60
  const next = mastery ? createMasteryCourse(seed) : createCourse(seed, localDirector)
  const window = []
  for (let row = next(); row.time < at; row = next()) if (row.time >= start) window.push(row)
  const withHazards = window.filter(row => row.entities.some(item => item.hazard))
  const gaps = window.slice(1).map((row, i) => row.time - window[i].time).sort((a,b) => a - b)
  const reserves = window.map(row=>row.decisionReserve).filter(Number.isFinite).sort((a,b)=>a-b)
  const formatted = value => Number(value.toFixed(3))
  return { time: at, edition: mastery ? 'mastery' : 'raptor',
    speed: formatted(speedAtTime(at, mastery ? masteryDirector : localDirector)),
    hazards: withHazards.reduce((sum,row) => sum+row.entities.filter(item=>item.hazard).length,0),
    decisions: withHazards.length, gates: withHazards.filter(row=>row.gate).length,
    laneChanges: withHazards.filter((row,i)=>i && row.lane !== withHazards[i-1].lane).length,
    strings: mastery && at >= 510 ? endlessPressure(at).stringLength : null,
    decisionReserve: reserves.length ? [formatted(reserves[0]), formatted(reserves[Math.floor(reserves.length*.5)])] : null,
    medianGap: formatted(gaps[Math.floor(gaps.length*.5)] ?? 0),
    longestGap: formatted(gaps.at(-1) ?? 0) }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seeds = process.argv.slice(2).map(Number)
  for (const seed of seeds.length ? seeds : [0,1,2,7,11,13,17,19,23,29,83,391]) {
    const { trace, ...result } = simulateMastery(seed, 3600)
    console.log(JSON.stringify(result))
    if (result.contact) process.exitCode = 1
  }
  const comparison = checkpoints.flatMap(t => [measures(7,t,false), measures(7,t,true)])
  console.log(JSON.stringify({comparison}))
  const verified = simulateMastery(7, 1100, { coastAt:1050 })
  assert.ok(verified.contact)
  assert.deepEqual(verifyMasteryReplay(verified.seed,verified.trace),verified.metrics)
  console.log(JSON.stringify({replay:verified.metrics, ticks:verified.ticks, inputs:verified.trace.actions.length}))
}
