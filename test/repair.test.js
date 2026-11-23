import assert from 'node:assert/strict'
import test from 'node:test'
import { hazardFrame, obstacleVolumes, playerFrame, traceContact } from '../src/collision.js'
import { act, advance, jumpDuration, laneWidth, newRun, slideDuration } from '../src/runner.js'
import { createFixedClock, samplePose, tickSeconds } from '../src/timing.js'
import { buildTile } from '../src/terrain-geometry.js'
import { expeditionRegions } from '../src/expedition.js'
import { centerAt, segmentLength, surfaceAt } from '../src/trail.js'

const fixture = (type, distance = 100, lane = 0, wide = false) => ({ type, distance, lane, wide, hazard: true })

test('grounded stream contact uses paws and shallow jumps clear the rendered surface', () => {
  const stream = fixture('stream', 39, 0, true)
  const pose = { ...newRun(), distance: 39 }
  const witness = {}
  assert.equal(traceContact(pose, pose, stream, witness), true)
  assert.equal(witness.solid, 'wet channel')
  assert.match(witness.part, /paws/)
  pose.jump = .86
  assert.equal(traceContact(pose, pose, stream), false)
  assert.equal(traceContact(pose, pose, fixture('puddle', 39)), false)
})

test('scenery is physics-free and passing a hazard clears it for good', () => {
  const log = fixture('log')
  const pose = { ...newRun(), distance: 100 }
  assert.equal(traceContact(pose, pose, { ...log, hazard: false }), false)
  assert.equal(traceContact(pose, pose, { ...fixture('tree'), hazard: false }), false)
  assert.equal(traceContact(pose, pose, fixture('tree')), true)
  for (let n = 0; n < 25; n++) {
    const old = { ...pose, distance: log.distance + 1.6 + n * .2 }
    const next = { ...old, distance: old.distance + .22 }
    assert.equal(traceContact(old, next, log), false)
  }
})

test('branch contact follows beam height, supports and the crouch envelope', () => {
  const standing = { ...newRun(), distance: 100 }
  const beam = fixture('branch', 100, 0, true)
  assert.ok(traceContact(standing, standing, beam))
  const jumping = { ...standing, jump: jumpDuration / 2 }
  assert.equal(traceContact(jumping, jumping, beam), false)
  const sliding = { ...standing, slide: slideDuration / 2 }
  assert.equal(traceContact(sliding, sliding, beam), false)
  assert.ok(traceContact({ ...standing, slide: slideDuration }, { ...standing, slide: slideDuration }, beam))
  assert.notDeepEqual(obstacleVolumes(beam), obstacleVolumes({ ...beam, wide: false }))
})

test('sweep reports the same earliest contact during a Good Boy scoring bonus', () => {
  const log = fixture('log')
  const before = { ...newRun(), distance: 98.45, elapsed: 2 }
  const after = { ...before, distance: 100.35, elapsed: 2.2 }
  const details = {}
  assert.ok(traceContact(before, after, log, details))
  assert.ok(details.fraction > 0 && details.fraction < 1)
  assert.ok(details.part && details.solid && details.type === 'log')
  const impact = samplePose({}, before, after, details.fraction)
  assert.equal(impact.distance, details.distance)
  const original = { ...details }
  assert.ok(traceContact({ ...before, power: 1 }, { ...after, power: .8 }, log, details))
  assert.deepEqual(details, original)
})

test('curve and lane changes share the same rendered positions with the solver', () => {
  for (const distance of [38, 138, 267, 390, 670]) {
    const log = fixture('log', distance, 1)
    const pose = { ...newRun(), distance, x: laneWidth, lane: 1 }
    const dog = playerFrame({}, pose, distance)
    const model = hazardFrame({}, log, distance, distance)
    assert.deepEqual([dog.x, dog.z, dog.y, dog.angle], [model.x, model.z, model.y, model.angle])
    assert.ok(traceContact(pose, pose, log))
    assert.equal(traceContact({ ...pose, x: 0, lane: 0 }, { ...pose, x: 0, lane: 0 }, log), false)
  }
})

function replay(frames, play) {
  const run = newRun()
  const clock = createFixedClock()
  const hazards = [fixture('log', 17), fixture('fence', 28, 0), fixture('root', 44, -1), fixture('log', 63, 1)]
  const witness = {}
  let tick = 0
  let hits = 0
  for (let frame = 0; frame < 1800 && run.elapsed < 7 && !hits; frame++) {
    clock.advance(frames[frame % frames.length], (dt) => {
      play(run, tick)
      const old = { ...run }
      advance(run, dt)
      tick++
      for (const entity of hazards) {
        if (!traceContact(old, run, entity, witness)) continue
        samplePose(run, old, run, witness.fraction)
        hits++
        return false
      }
      if (tick >= 840) return false
    })
  }
  return { elapsed: run.elapsed, distance: run.distance, lane: run.lane, hits, witness }
}

test('a deterministic touch route can jump a log, chain lanes, and clear roots under stutter', () => {
  const commands = new Map([[127, ['jump']], [239, ['right']], [406, ['left', 'left', 'jump']], [464, ['right']]])
  const play = (run, tick) => { for (const key of commands.get(tick) ?? []) act(run, key) }
  const smooth = replay([1 / 60], play)
  const stutter = replay([1 / 60, .035, .20, .032, .09], play)
  assert.deepEqual(stutter, smooth)
  assert.equal(smooth.hits, 0, JSON.stringify(smooth.witness))
  assert.ok(smooth.distance > 74)
})

test('unavoided hazards have exactly one identical attributed death at 5 and 60 FPS', () => {
  const fast = replay([1 / 60], () => {})
  const slow = replay([.20], () => {})
  assert.deepEqual(slow, fast)
  assert.equal(slow.hits, 1)
  assert.equal(slow.witness.type, 'log')
  assert.equal(slow.distance, slow.witness.distance)
})

test('clock discards suspended-frame backlog and clears interpolation state on pause', () => {
  let ticks = 0
  const clock = createFixedClock()
  clock.advance(2.5, () => ticks++)
  assert.ok(ticks * tickSeconds <= .24)
  clock.advance(.003, () => ticks++)
  clock.reset()
  assert.equal(clock.advance(.0001, () => ticks++) < .02, true)
})

test('natural surface tiles align at boardwalk-free boundaries and pack transferable geometry', () => {
  for (let n = 0; n < 600; n++) assert.ok(['dirt', 'mud'].includes(surfaceAt(n)))
  for (const i of [0, 7, 8, 17, 18, 29, 30, 35]) {
    const current = buildTile(i)
    const next = buildTile(i + 1)
    const columns = 29
    const data = current.ground.buffers.position.values
    const nextData = next.ground.buffers.position.values
    const offset = columns * segmentLength * 2 * 3
    const delta = centerAt((i + 1) * segmentLength) - centerAt(i * segmentLength)
    for (let j = 0; j < columns * 3; j += 3) {
      const a = [data[offset + j] - delta, data[offset + j + 1], data[offset + j + 2] + segmentLength]
      for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(a[axis] - nextData[j + axis]) < .001, 'tile seam ' + i)
    }
    assert.equal(current.ground.index.length, (columns - 1) * segmentLength * 2 * 6)
    assert.ok(current.reeds.buffer instanceof ArrayBuffer && current.trees.length <= 120)
    assert.ok(current.detail.index.length > 0)
  }
})


test('the same streamed habitat reproduces shore planting, water depths and tree locations', () => {
  const marsh = buildTile(3)
  assert.deepEqual(buildTile(3), marsh)
  const examples = [0, 5, 7, 9].map(region => buildTile(Math.ceil(expeditionRegions[region].marker / segmentLength)))
  assert.deepEqual(examples.map(tile => tile.plantType), [0, 2, 1, 2])
  assert.ok(marsh.water.buffers.marshDepth.values.some(depth => depth > .35))
  assert.ok(marsh.water.buffers.marshDepth.values.some(depth => depth === 0))
  assert.notDeepEqual(buildTile(4).reeds, marsh.reeds)
  assert.deepEqual(examples.map(tile => tile.treeStyle), [0, 0, 2, 3])
  assert.notDeepEqual(examples[3].ground.buffers.color.values, marsh.ground.buffers.color.values)
})
