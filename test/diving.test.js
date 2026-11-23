import assert from 'node:assert/strict'
import test from 'node:test'
import { Matrix4, Scene, Vector3 } from 'three'
import { hazardFrame, traceContact } from '../src/collision.js'
import { diveAge, diveApproach, diveDuckLead, diveFrame, diveWarning, diveWarningLead } from '../src/dive.js'
import { act, advance, createCourse, director, distanceAtTime, laneWidth, newRun, speedAtTime, validateRow } from '../src/runner.js'
import { createFixedClock, tickSeconds } from '../src/timing.js'
import { createDivingFlocks } from '../src/wildlife.js'

const fixture = (type, distance, lane = 0) => ({ type, distance, lane, hazard: true })
const goose = (distance, lane = 0, direction = 1) => ({
  ...fixture('goose', distance, lane), direction, flightSpeed: 22, safeLane: lane === 1 ? 0 : 1, lead: true,
})

function replay(initial, entity, frames, action = () => {}) {
  const run = { ...initial }
  const clock = createFixedClock()
  const hit = {}
  let dead = false
  let tick = 0
  for (let frame = 0; frame < 4000 && !dead && run.distance < entity.distance + 3; frame++) {
    clock.advance(frames[frame % frames.length], (dt) => {
      action(run, tick++)
      const prev = { ...run }
      advance(run, dt)
      if (traceContact(prev, run, entity, hit)) dead = true
      if (dead || run.distance >= entity.distance + 3) return false
    })
  }
  return { dead, hit }
}

test('logs, fences and tree trunks stop a direct impact even during a scoring bonus', () => {
  for (const distance of [8, 279, 611]) {
    const run = { ...newRun(), distance: distance - 4, power: 6 }
    for (const type of ['log', 'root', 'fence', 'tree', 'puddle', 'stream']) {
      const result = replay(run, fixture(type, distance), [.20])
      assert.ok(result.dead, type)
      assert.equal(result.hit.type, type)
      assert.equal(replay(run, { ...fixture(type, distance), hazard: false }, [.20]).dead, false)
    }
  }
})

test('jump timing and lane evasion decide contacts on curves', () => {
  const log = fixture('log', 279)
  const run = { ...newRun(), distance: 274 }
  assert.equal(replay(run, log, [.20], (run, tick) => { if (!tick) act(run, 'jump') }).dead, false)
  assert.equal(replay(run, log, [.20], (run, tick) => { if (tick === 43) act(run, 'jump') }).dead, true)
  assert.equal(replay(run, log, [.20], (run, tick) => { if (!tick) act(run, 'right') }).dead, false)
  assert.equal(replay(run, log, [.20], (run, tick) => { if (tick === 43) act(run, 'right') }).dead, true)
})

test('high-speed impacts agree under different render schedules', () => {
  const run = { ...newRun(), distance: 603.3, elapsed: 120, speed: speedAtTime(120), x: -laneWidth, lane: -1 }
  const obstacle = fixture('fence', 606, -1)
  const smooth = replay(run, obstacle, [1 / 60])
  assert.ok(smooth.dead)
  assert.deepEqual(replay(run, obstacle, [.20, .071, .125]), smooth)
})

test('a swooping goose hits only at playable height and both lane evasion and ducking work', () => {
  for (const distance of [220, 690, 2700]) {
    for (const lane of [-1, 0, 1]) {
      const bird = goose(distance, lane, lane === 1 ? -1 : 1)
      const run = { ...newRun(), elapsed: 58, speed: speedAtTime(58), distance: distance - 12, x: lane * laneWidth, lane }
      const grounded = replay(run, bird, [.2])
      assert.ok(grounded.dead)
      assert.match(grounded.hit.solid, /goose/)
      assert.deepEqual(replay(run, bird, [1 / 60]), grounded)
      assert.equal(replay(run, bird, [.2], (state) => {
        if (diveAge(bird, state.distance) >= -diveDuckLead && !state.slide) act(state, 'slide')
      }).dead, false)
      assert.equal(replay(run, bird, [.2], (state, tick) => {
        if (!tick) act(state, lane === 1 ? 'left' : 'right')
      }).dead, false)
      assert.equal(replay(run, { ...bird, hazard: false }, [.20]).dead, false)
    }
  }
})

test('a flight approaches before its warning and visible bird bodies use the collision frame', () => {
  const bird = goose(900)
  const at = (age) => bird.distance + age * bird.flightSpeed
  assert.equal(diveWarning(bird, at(-diveApproach)), null)
  assert.equal(diveWarning(bird, at(-diveWarningLead + .001)), 'approach')
  assert.equal(diveWarning(bird, at(-diveDuckLead + .001)), 'duck')
  assert.equal(diveWarning(bird, at(.32)), null)
  assert.equal(diveWarning({ ...bird, lead: false }, at(-1)), null)
  const start = diveFrame({}, bird, at(-3.1), at(-3.1))
  const pass = hazardFrame({}, bird, 900, 900)
  const exit = diveFrame({}, bird, at(1.6), at(1.6))
  assert.ok(start.y > 6 && start.z < -65)
  assert.ok(pass.y < 1.33 && exit.y > 5 && exit.z > 40)
  assert.ok(diveFrame({}, bird, 900, 900, 1).y > pass.y + 4)

  const scene = new Scene()
  const draw = createDivingFlocks(scene)
  draw([bird], 900, 51, true)
  assert.equal(scene.children[0].count, 3)
  assert.equal(scene.children[0].visible, true)
  const matrix = new Matrix4()
  scene.children[0].getMatrixAt(0, matrix)
  const position = new Vector3().setFromMatrixPosition(matrix)
  assert.ok(position.distanceTo(new Vector3(pass.x, pass.y, pass.z)) < 1e-5)
  draw([bird], at(2.2), 53, true)
  assert.equal(scene.children[0].visible, false)
})

test('director timing, warning lead, pacing and paired jumps are seeded and configurable', () => {
  const custom = { ...director, startingSpeed: 10, firstGoose: [52, 52], doubleGooseAfter: 52 }
  const generate = createCourse(24, custom)
  const customRows = Array.from({ length: 68 }, generate)
  assert.equal(customRows[0].at, distanceAtTime(custom.openingTime, custom))
  const firstCustomFlight = customRows.find(row => row.entities[0].type === 'goose')
  assert.ok(firstCustomFlight.time >= 52)
  assert.equal(firstCustomFlight.entities.filter(entity => entity.type === 'goose').length, 2)

  let jumpPairs = 0
  for (let seed = 0; seed < 30; seed++) {
    const next = createCourse(seed)
    const rows = Array.from({ length: 175 }, next)
    const gooseRows = rows.filter(row => row.entities[0].type === 'goose')
    assert.ok(gooseRows[0].time >= 45 && gooseRows[0].time <= 60)
    for (const row of gooseRows) {
      const birds = row.entities.filter(entity => entity.type === 'goose')
      assert.equal(birds.length, row.time >= 90 ? 2 : 1)
      assert.equal(new Set(birds.map(entity => entity.lane)).size, birds.length)
      assert.ok(birds.every(entity => entity.lane !== row.lane))
      assert.ok(validateRow({ at: row.at - 30, lane: row.lane }, row, speedAtTime(row.time + .35)))
    }
    for (let i = 1; i < rows.length; i++) {
      if (rows[i - 1].entities[0].type === 'stream' && rows[i].entities[0].type === 'stream') jumpPairs++
    }
    const early = rows.filter(row => row.time < 15)
    const late = rows.filter(row => row.time >= 100 && row.time < 115)
    assert.ok(late.length > early.length)
  }
  assert.ok(jumpPairs > 15)
  assert.ok(speedAtTime(30) > speedAtTime(0) * 1.6)
  const timing = newRun()
  for (let i = 0; i < 120 * 125; i++) advance(timing, tickSeconds)
  assert.ok(Math.abs(timing.distance - distanceAtTime(125)) < .005)
})
