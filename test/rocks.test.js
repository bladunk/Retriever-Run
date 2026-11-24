import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rockMesh } from '../src/rock-art.js'
import { rocks, rockShape, rockTurns } from '../src/rocks.js'
import { distanceAtTime, speedAtTime, stageAt } from '../src/difficulty.js'
import { act, advance, createCourse, newRun } from '../src/runner.js'
import { laneWidth, obstacleVolumes, traceContact } from '../src/collision.js'

test('all twelve rock models draw the same hulls used by collision', () => {
  assert.equal(rocks.length, 12)
  for (const [variant, profile] of rocks.entries()) for (const turn of rockTurns.keys()) {
    const entity = { type: 'rock', variant, turn }
    const bounds = obstacleVolumes(entity)
    const mesh = rockMesh(variant, turn)
    assert.equal(mesh.geometry, rockMesh(variant, turn).geometry)
    assert.equal(bounds, rockShape(variant, turn))
    const positions = mesh.geometry.attributes.position
    let offset = 0
    for (const part of bounds) {
      assert.ok(part.y - part.hy < -.09)
      assert.ok(Math.abs(part.x) + part.hx < 1.23)
      for (let index = offset; index < offset + part.planes.length * 3; index++) {
        const vx = positions.getX(index), vy = positions.getY(index), vz = positions.getZ(index)
        assert.ok(part.planes.every(({ x, y, z, limit }) => vx * x + vy * y + vz * z <= limit + .000002))
      }
      offset += part.planes.length * 3
    }
    assert.equal(offset, positions.count)
    assert.ok(positions.count / 3 >= 45 && positions.count / 3 <= 250, profile.name)
  }
})

function replay(variant, turn, at, move, lead = .46, side = -1) {
  const distance = distanceAtTime(at)
  const entity = { type: 'rock', variant, turn, lane: 0, hazard: true, distance }
  const elapsed = at - 26 / speedAtTime(at)
  const run = { ...newRun(), elapsed, distance: distanceAtTime(elapsed), speed: speedAtTime(elapsed) }
  const previous = {}
  let used = false
  while (run.distance < distance + 3) {
    if (move === 'repeat') act(run, 'jump')
    else if (move && !used && run.distance >= distance - run.speed * lead) {
      act(run, move)
      used = true
    }
    Object.assign(previous, run)
    advance(run, .01)
    if (traceContact(previous, run, entity)) return false
  }
  assert.equal(run.lane, move === 'left' ? side : move === 'right' ? 1 : 0)
  return true
}

test('rocks block running and sliding, clear by lane change, and only low silhouettes clear a jump', () => {
  for (const [variant, profile] of rocks.entries()) for (const turn of rockTurns.keys()) {
    for (const time of [8, 165, 300]) {
      const label = profile.name + ' / ' + turn + ' / ' + time
      assert.equal(replay(variant, turn, time), false, label)
      assert.equal(replay(variant, turn, time, 'slide'), false, label)
      assert.ok(replay(variant, turn, time, 'left', .65), label)
      assert.ok(replay(variant, turn, time, 'right', .65), label)
      if (profile.size === 'small' || profile.size === 'medium') {
        assert.ok([.41, .46, .51].some(lead => replay(variant, turn, time, 'jump', lead)), label)
      } else {
        assert.equal(replay(variant, turn, time, 'repeat'), false, label)
        for (let step = 1; step <= 17; step++) {
          assert.equal(replay(variant, turn, time, 'jump', step * .05), false, label)
        }
      }
    }
  }
})

test('seeded routes limit rock repetition and keep a reachable lane with regional scale', () => {
  const visited = new Set()
  const hazards = Array.from({ length: 10 }, () => new Map())
  for (let seed = 1; seed <= 110; seed++) {
    const next = createCourse(Math.imul(seed, 0x43f15ec7))
    let rowIndex = 0, previous = -Infinity, variant
    for (let row = next(); row.time < 330; row = next()) {
      const territory = stageAt(row.time).territory
      const rock = row.entities.filter(item => item.type === 'rock')
      for (const entity of row.entities) if (entity.hazard) {
        const counts = hazards[territory]
        counts.set(entity.type, (counts.get(entity.type) ?? 0) + 1)
      }
      assert.ok(rock.length <= 1)
      if (rock.length) {
        const item = rock[0]
        assert.ok(item.hazard && !item.wide && item.lane !== row.lane)
        assert.ok(rowIndex - previous >= 3)
        assert.notEqual(item.variant, variant)
        previous = rowIndex
        variant = item.variant
        visited.add(variant)
        if (territory <= 3) assert.ok(['small', 'medium'].includes(rocks[variant].size))
        assert.ok(obstacleVolumes(item).every(part => Math.abs(part.x) + part.hx + .45 < laneWidth))
      }
      rowIndex++
    }
  }
  assert.equal(visited.size, rocks.length)
  for (const counts of hazards) {
    const fraction = counts.get('rock') / [...counts.values()].reduce((sum, n) => sum + n, 0)
    assert.ok(fraction >= .03 && fraction <= .20, fraction)
    assert.ok(counts.size >= 9)
  }
})
