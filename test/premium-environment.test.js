import assert from 'node:assert/strict'
import { test } from 'node:test'
import { cornModel } from '../src/corn.js'
import { createEnvironmentCache } from '../src/environment-assets.js'
import { forestModel, forestProfiles } from '../src/forest-models.js'
import { firstContact, jumpDuration, laneWidth, slideDuration, traceContact, washoutSegments, washoutSpacing } from '../src/collision.js'
import { distanceAtTime, speedAtTime } from '../src/difficulty.js'
import { expeditionRegions } from '../src/expedition.js'
import { act, advance, createCourse, newRun } from '../src/runner.js'
import { buildTile } from '../src/terrain-geometry.js'
import { centerAt, segmentLength } from '../src/trail.js'

test('environment packs deduplicate requests and keep the fallback after a missing asset', async () => {
  const attempts = []
  const pack = { models: ['two shared meshes'] }
  const cache = createEnvironmentCache(async key => {
    attempts.push(key)
    if (key === 'trees') return pack
    throw new Error('atlas missing')
  })
  assert.equal(cache.get('trees'), null)
  const first = cache.request('trees')
  assert.equal(cache.request('trees'), first)
  assert.equal(await first, pack)
  assert.equal(cache.get('trees'), pack)
  assert.equal(await cache.request('grass'), null)
  assert.equal(await cache.request('grass'), null)
  assert.deepEqual(attempts, ['trees', 'grass'])
  assert.equal(cache.get('grass'), null)
})

test('ten territories use their own shared tree profiles and corn stays off the active path', () => {
  assert.deepEqual(Object.keys(forestProfiles), expeditionRegions.map(region => region.key))
  assert.equal(new Set(Object.values(forestProfiles).map(pair => pair.join('/'))).size, 10)
  for (const kind of new Set(Object.values(forestProfiles).flat())) {
    const geometry = forestModel(kind)
    assert.equal(forestModel(kind), geometry)
    assert.ok(geometry.index.count / 3 <= 1500)
    assert.equal(geometry.attributes.uv.count, geometry.attributes.position.count)
    assert.ok(geometry.attributes.position.array.every(Number.isFinite))
  }
  const crops = [cornModel(), cornModel(false, true), cornModel(true)]
  assert.ok(crops[0].index.count > crops[1].index.count && crops[1].index.count > crops[2].index.count)
  assert.ok(forestModel('spruce', true).index.count < forestModel('spruce').index.count)
  const farm = Math.floor(distanceAtTime(134) / segmentLength)
  const fields = [farm, farm + 1, farm + 2].map(buildTile)
  const farmland = fields.find(tile => tile.crops.length)
  assert.ok(farmland.crops.length > 240)
  assert.deepEqual(buildTile(farmland.index), farmland)
  for (let i = 0; i < farmland.crops.length; i += 6) {
    const at = farmland.index * segmentLength - farmland.crops[i + 2]
    const trailX = centerAt(at) - centerAt(farmland.index * segmentLength)
    assert.ok(Math.abs(farmland.crops[i] - trailX) > laneWidth * 2)
  }
  assert.equal(buildTile(0).crops.length, 0)
})

test('standing, full-height jump, slide and adjacent-lane contact match the intended solids', () => {
  const obstacle = type => ({ type, distance: 20, lane: 0, hazard: true, wide: false })
  const stand = { ...newRun(), distance: 20 }
  const jump = { ...stand, jump: jumpDuration / 2 }
  const slide = { ...stand, slide: slideDuration / 2 }
  const side = { ...stand, x: laneWidth, lane: 1 }
  for (const type of ['log', 'stream']) {
    assert.ok(traceContact(stand, stand, obstacle(type)))
    assert.equal(traceContact(jump, jump, obstacle(type)), false)
  }
  for (const type of ['fallen', 'tractor', 'branch']) {
    const object = obstacle(type)
    assert.ok(traceContact(jump, jump, object), type)
    assert.equal(traceContact(side, side, object), false, type)
  }
  assert.ok(traceContact(stand, stand, obstacle('branch')))
  assert.equal(traceContact(slide, slide, obstacle('branch')), false)
})

test('a flooded lane outlasts the fastest jump and leaves the planned route open', () => {
  const start = 7200
  const entities = Array.from({ length: washoutSegments }, (_, index) => ({
    type: 'washout', lane: 0, distance: start + index * washoutSpacing, hazard: true,
  }))
  const previous = {}
  for (let offset = -45; offset <= 30; offset += .25) {
    const run = { ...newRun(), distance: start - 45, elapsed: 300, speed: speedAtTime(300) }
    let jumped = false, hit = false
    while (run.distance < entities.at(-1).distance + 5) {
      if (!jumped && run.distance >= start + offset) jumped = act(run, 'jump')
      Object.assign(previous, run)
      advance(run, 1 / 120)
      if (firstContact(previous, run, entities, {})) { hit = true; break }
    }
    assert.ok(hit, 'jump triggered from ' + offset)
  }
  const course = createCourse(17)
  let seen = 0
  for (let row = course(); row.time < 600; row = course()) {
    if (!row.entities.some(item => item.type === 'washout')) continue
    seen++
    const band = row.entities.filter(item => item.type === 'washout')
    assert.equal(band.length, washoutSegments)
    assert.equal(band.filter(item => item.span).length, 1)
    assert.ok(band.every(item => item.lane !== row.lane))
    assert.equal(row.end, band.at(-1).distance)
  }
  assert.ok(seen > 1)
})
