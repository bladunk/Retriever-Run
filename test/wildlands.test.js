import test from 'node:test'
import assert from 'node:assert/strict'
import { weatherAt } from '../src/atmosphere.js'
import { completeRun, normalizeProfile, outfits } from '../src/profile.js'
import {
  act, advance, collides, collect, createCourse, crossing, difficultyAt, difficultyCurve, getHeight, jumpDuration,
  laneWidth, newRun, obstacleOffset, powerDuration, reactionWindow, score, slideDuration, speedAt, validateRow,
} from '../src/runner.js'
import { centerAt, habitatAt, headingAt, placeOnTrail, segmentLength } from '../src/trail.js'

test('difficulty follows the requested time curve and saturates', () => {
  for (const [seconds, level] of difficultyCurve) assert.equal(difficultyAt(seconds), level)
  assert.equal(difficultyAt(15), 2.75)
  assert.equal(difficultyAt(240), 9.5)
  const run = newRun()
  for (let i = 0; i < 60; i++) advance(run, .5)
  assert.equal(run.elapsed, 30)
  assert.equal(run.speed, speedAt(3.5))
  assert.ok(run.distance > 330)
})

test('trail is continuous across segments and lanes remain perpendicular to the local heading', () => {
  const seenHeadings = []
  for (let distance = 0; distance < 1200; distance += segmentLength) {
    const center = {}
    const right = {}
    const nextCenter = {}
    placeOnTrail(center, distance, 0, distance)
    const heading = placeOnTrail(right, distance, laneWidth, distance)
    placeOnTrail(nextCenter, distance + .001, 0, distance)
    assert.ok(Math.abs(Math.hypot(right.x, right.z) - laneWidth) < 1e-9)
    assert.ok(Math.abs(nextCenter.x * right.x + nextCenter.z * right.z) < 1e-6)
    assert.ok(Math.abs(centerAt(distance + .001) - centerAt(distance)) < .002)
    assert.equal(heading, headingAt(distance))
    seenHeadings.push(heading)
  }
  assert.ok(Math.min(...seenHeadings) < -.38)
  assert.ok(Math.max(...seenHeadings) > .38)
  assert.equal(new Set(Array.from({ length: 10 }, (_, n) => habitatAt(n * 180))).size, 5)
})

test('jump clears centered ground obstacles, slide clears branches, and crossings cannot tunnel', () => {
  const run = newRun()
  const ground = ['fence', 'log', 'puddle', 'root', 'stream', 'drift'].map((type) => ({ type, lane: 0, distance: 0 }))
  const branch = { type: 'branch', wide: true, lane: 0, distance: 0 }
  for (const obstacle of [...ground, branch]) assert.ok(collides(run, obstacle))
  assert.ok(act(run, 'jump'))
  assert.equal(act(run, 'slide'), false)
  advance(run, jumpDuration / 2)
  assert.ok(getHeight(run) > 1.6)
  for (const obstacle of ground) assert.equal(collides(run, obstacle), false)
  assert.ok(collides(run, branch))
  advance(run, jumpDuration / 2)
  assert.ok(act(run, 'slide'))
  assert.equal(collides(run, branch), false)
  assert.ok(collides(run, ground[0]))
  act(run, 'right')
  advance(run, .30)
  assert.equal(collides(run, ground[0]), false)
  assert.ok(collides(run, ground[4]))
  assert.ok(crossing(99.1, 100.95, { type: 'stream', distance: 100 }))
  assert.equal(crossing(100.8, 101, { type: 'stream', distance: 100 }), false)
  assert.notEqual(obstacleOffset({ type: 'drift', lane: 0, distance: 70 }, 64), obstacleOffset({ type: 'drift', lane: 0, distance: 70 }, 68))
})

test('planner is deterministic and rejects unsafe or overlapping rows', () => {
  const left = createCourse(231)
  const right = createCourse(231)
  for (let i = 0; i < 170; i++) assert.deepEqual(left(), right())
  const previous = { at: 100, lane: -1, gate: { distance: 100, duration: jumpDuration } }
  assert.equal(validateRow(previous, { at: 103, lane: 1, entities: [] }, 24), false)
  const stream = { type: 'stream', lane: 0, distance: 123, wide: true, hazard: true }
  assert.equal(validateRow(previous, { at: 123, lane: 0, entities: [stream] }, 24), false)
  assert.equal(validateRow(previous, { at: 138, lane: 0, entities: [{ ...stream, distance: 138 }] }, 24), true)
  const log = { type: 'log', lane: 0, distance: 138, hazard: true }
  assert.equal(validateRow(previous, { at: 138, lane: 0, entities: [log] }, 24), false)
})

test('a timed lane, jump and slide policy can finish 80 seeded courses without a shield', () => {
  const encountered = new Set()
  for (let seed = 0; seed < 80; seed++) {
    const course = createCourse(seed)
    const run = newRun()
    let row = course()
    let crossedAt = -1
    let laneAction = -1
    let gateAction = false
    while (run.elapsed < 253) {
      const gate = row.gate
      if (run.elapsed - crossedAt >= reactionWindow && run.lane !== row.lane && run.elapsed > laneAction) {
        act(run, run.lane < row.lane ? 'right' : 'left')
        laneAction = run.elapsed + .16
      }
      if (gate && !gateAction && gate.distance - run.distance <= run.speed * gate.duration / 2) {
        const branch = row.entities.some((entity) => entity.type === 'branch' && entity.wide)
        gateAction = act(run, branch ? 'slide' : 'jump')
      }
      const previous = advance(run, .025)
      for (const item of row.entities) {
        if (!item.hazard || !crossing(previous, run.distance, item)) continue
        encountered.add(item.type + (item.wide ? '-wide' : ''))
        assert.equal(collides(run, item), false, 'seed ' + seed + ', ' + item.type + ' near ' + row.at)
      }
      if (run.distance > row.at + .82) {
        row = course()
        crossedAt = run.elapsed
        gateAction = false
      }
    }
  }
  for (const type of ['stream-wide', 'branch-wide', 'drift', 'fence', 'root', 'puddle', 'log']) assert.ok(encountered.has(type))
})

test('combos, rare retrieves, power and old local records remain consistent', () => {
  const run = newRun()
  for (let i = 0; i < 4; i++) assert.equal(collect(run, 'treat').points, 10)
  assert.equal(collect(run, 'treat').points, 20)
  assert.equal(collect(run, 'mallard').points, 75)
  assert.equal(collect(run, 'pheasant').activated, true)
  assert.equal(run.retrieves, 2)
  assert.equal(run.power, powerDuration)
  assert.equal(collect(run, 'call').points, 150)
  assert.equal(collides(run, { type: 'stream', lane: 0 }), false)
  advance(run, 6)
  assert.equal(run.power, 0)
  run.distance = 600.1
  const original = normalizeProfile({ score: 210, best: 250, distance: 151, retrieves: 1, outfit: 'blaze' })
  assert.equal(original.farthest, 151)
  assert.equal(original.outfit, 'blaze')
  const result = completeRun(original, run, score(run))
  assert.ok(outfits.every((outfit) => outfit.available(result)))
  assert.equal(result.distance, 600)
  assert.equal(result.best, result.score)
  assert.equal(result.retrieves, 3)
})

test('weather gradually blends all eight conditions and resets the cycle', () => {
  const names = new Set()
  for (let n = 0; n < 8; n++) {
    const boundary = weatherAt(n * 34)
    names.add(boundary.to.name)
    assert.equal(boundary.blend, n === 0 ? 1 : 0)
    if (n > 0) assert.equal(weatherAt(n * 34 + 6).blend, .5)
    assert.equal(weatherAt(n * 34 + 12).blend, 1)
  }
  assert.equal(names.size, 8)
  assert.equal(weatherAt(8 * 34).to.name, 'Autumn sunrise')
})
