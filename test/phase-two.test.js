import assert from 'node:assert/strict'
import test from 'node:test'
import { createRunStatistics, hazardName } from '../src/field-stats.js'
import { hazardFrame, jumpDuration, laneWidth, slideDuration, traceContact } from '../src/collision.js'
import { defineStages, director, distanceAtTime, speedAtTime, stageAt } from '../src/difficulty.js'
import { leaningTree } from '../src/leaning-tree.js'
import { obstacles } from '../src/obstacles.js'
import { createRunControls } from '../src/run-controls.js'
import { act, advance, clearsHazard, createCourse, newRun, touchesPickup, validateRow } from '../src/runner.js'
import { campRuleset, courseRuleset } from '../src/ruleset.js'
import { fitSignLettering } from '../src/sign-lettering.js'
import { signDistance } from '../src/sign-placement.js'
import { shortSignMessages, trailSign } from '../src/trail-signs.js'
import { swipeDirection } from '../src/gesture.js'
import { tickSeconds } from '../src/timing.js'

test('forked tree offers the same three passages at opening, wetland and maximum speed', () => {
  assert.equal(leaningTree(), leaningTree())
  assert.ok(leaningTree().geometry.index.count / 3 < 2200)
  for (const time of [9, 14, 28, 64, 96, 151, 226, 300]) {
    const timber = { type: 'leaning-tree', wide: true, hazard: true, distance: distanceAtTime(time), lane: 0 }
    const speed = speedAtTime(time)
    assert.equal(clearsHazard(-1, timber, 'run', speed), false)
    assert.equal(clearsHazard(-1, timber, 'slide', speed), false)
    assert.equal(clearsHazard(-1, timber, 'jump', speed), true)
    assert.equal(clearsHazard(0, timber, 'run', speed), false)
    assert.equal(clearsHazard(0, timber, 'jump', speed), false)
    assert.equal(clearsHazard(0, timber, 'slide', speed), true)
    assert.equal(clearsHazard(1, timber, 'run', speed), true)
    assert.equal(clearsHazard(1, timber, 'jump', speed), false)
  }
})

test('log, driftwood, roots and parked machinery stay fixed as the runner approaches', () => {
  for (const type of ['log', 'drift', 'root', 'tree', 'fallen', 'leaning-tree', 'tractor', 'fence', 'rock']) {
    const entity = { type, lane: 1, distance: 90, variant: 5 }
    const frame = hazardFrame({}, entity, 35, 90)
    for (const time of [40, 49, 58, 89, 90, 95]) assert.deepEqual(hazardFrame({}, entity, time, 90), frame, type)
  }
})

test('an airborne lane transition follows the spring and sweeps the correct tree part at speed', () => {
  const entity = { type: 'leaning-tree', lane: 0, hazard: true, wide: true, distance: 202, pattern: 'forked-timber' }
  const start = { ...newRun(), x: laneWidth, lane: 1, distance: 200, elapsed: 16, jump: jumpDuration * .58 }
  const current = { ...start, distance: 204, elapsed: 16.16, jump: jumpDuration * .42 }
  const witness = {}
  assert.equal(traceContact(start, current, entity, witness), true)
  assert.equal(witness.type, 'leaning-tree')
  assert.equal(witness.pattern, 'forked-timber')
  assert.equal(witness.action, 'jump')
  assert.equal(witness.lane, 1)
  assert.ok(witness.fraction >= 0 && witness.fraction <= 1)
  assert.ok([witness.contactX, witness.contactY, witness.contactZ].every(Number.isFinite))
  assert.equal(traceContact({ ...start, jump: 0 }, { ...current, jump: 0 }, entity), false)

  const run = newRun()
  const controls = createRunControls()
  const accepted = []
  for (const move of ['right', 'jump', 'slide']) controls.enqueue(move)
  controls.apply(run, move => accepted.push(move))
  assert.deepEqual(accepted, ['right', 'jump'])
  assert.equal(run.lane, 1)
  assert.equal(run.jump, jumpDuration)
  assert.equal(run.lateralSpeed, 0)
  advance(run, tickSeconds)
  assert.ok(run.lateralSpeed > 0 && run.x > 0 && run.x < .08)
  assert.ok(act(run, 'left'), 'can counter-steer while airborne')
  for (let i = 0; i < 42; i++) advance(run, tickSeconds)
  assert.ok(Math.abs(run.x) < .02)
  assert.ok(run.jump > 0)
})

test('a risk branch includes a verified aerial reward trail, safe recovery and one route event', () => {
  const course = createCourse(7)
  let previous = course()
  let row = course()
  while (!row.pattern.endsWith('retrieve-choice')) { previous = row; row = course() }
  const items = row.entities.filter(item => item.riskRoute)
  assert.equal(items.length, 3)
  const core = row.entities.find(item => item.hazard && item.lane === items[0].lane)
  assert.ok(core)
  assert.ok(clearsHazard(core.lane, core, 'jump', speedAtTime(row.time)))
  assert.ok(row.exits.includes(core.lane))
  assert.ok(validateRow(previous, row, speedAtTime(row.time + .35)))
  const events = []
  const tracker = createRunStatistics(1, event => events.push(event))
  for (const item of items) {
    const run = { ...newRun(), distance: item.distance, x: item.lane * laneWidth, lane: item.lane, elapsed: row.time,
      jump: jumpDuration / 2 - (item.distance - row.at) / speedAtTime(row.time) }
    assert.equal(touchesPickup(run, item), true)
    tracker.pickup(item.type, item)
  }
  tracker.pickup(items[2].type, items[2])
  assert.equal(events.filter(event => event.kind === 'risk-route').length, 1)
  const dummy = { at: row.at + 18, lane: 1, entities: [] }
  assert.equal(validateRow({ at: row.at, end: row.at + 4.5, lane: 1, exits: [1, -1] }, dummy, 26), false)
  assert.equal(touchesPickup({ ...newRun(), jump: jumpDuration / 2 }, { lane: 0, type: 'treat', distance: 0 }), false)
})

test('a 30-stage configuration runs through the same planner without truncating at stage 20', () => {
  const template = [8, 1.1, .7, .36, .45, .40, .22, .08, 15]
  const stages = defineStages(Array.from({ length: 30 }, (_, index) => index ? template : [2, ...template.slice(1)]))
  assert.equal(stageAt(435, stages).territory, 14)
  assert.equal(stageAt(560, stages).level, 30)
  const next = createCourse(9, { ...director, stages, curve: stages.map(({ start, pace }) => [start, pace]) })
  let row
  while (!row || row.time < 451) row = next()
  assert.ok(row.entities.every(item => !item.hazard || Object.hasOwn(obstacles, item.type)))
  assert.notEqual(courseRuleset, campRuleset, 'changed course may not post into the earlier ruleset')
  assert.equal(hazardName('leaning-tree'), 'Fallen tree against a fork')
})

test('live sign selection stays short and light swipes preserve a dominant axis', () => {
  const allowed = new Set(Object.values(shortSignMessages).flat())
  assert.ok(allowed.size > 230)
  for (let ordinal = 0; ordinal < 200; ordinal++) {
    const { line } = trailSign({ ordinal, distance: signDistance(ordinal) }, 7)
    assert.ok(allowed.has(line))
    assert.ok(line.split(' ').length <= 7)
    const fit = fitSignLettering(line, text => text.length * 63)
    assert.ok(fit.lines.length <= 2 && fit.size >= 42)
  }
  assert.equal(swipeDirection(15, 4, 390, false, 'light'), 'right')
  assert.equal(swipeDirection(15, 4, 390, false, 'deliberate'), null)
  assert.equal(swipeDirection(25, 24, 390, true, 'light'), null)
  assert.equal(swipeDirection(7, -25, 390, false, 'deliberate'), 'jump')
})

test('failed clearance cannot award timber mastery or change the reported cause', () => {
  const eventLog = []
  const track = createRunStatistics(42, event => eventLog.push(event))
  const run = { ...newRun(), distance: 10, slide: slideDuration * .9 }
  const report = track.finish(run, 'leaning-tree')
  assert.equal(report.hazard, 'leaning-tree')
  assert.equal(report.cause, 'logs')
  assert.equal(report.slidesCleared, 0)
  assert.equal(track.finish(run, 'rock'), null)
  assert.deepEqual(eventLog, [])
})
