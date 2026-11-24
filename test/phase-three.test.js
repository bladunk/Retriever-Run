import assert from 'node:assert/strict'
import { test } from 'node:test'
import { courseStages, distanceAtTime, primaryDuration, speedAtTime, stageAt } from '../src/difficulty.js'
import { expeditionBlend, expeditionRegions, northLevel, regionAt } from '../src/expedition.js'
import { forestModel } from '../src/forest-models.js'
import { buildTile } from '../src/terrain-geometry.js'
import { segmentLength } from '../src/trail.js'
import { clearsHazard, createCourse } from '../src/runner.js'
import { obstacles } from '../src/obstacles.js'
import { lowTimber } from '../src/low-timber.js'
import { campRuleset, courseRuleset } from '../src/ruleset.js'
import { openLodge, saveKey } from '../src/lodge-save.js'

test('the production route follows 15 geographic keys and continues after 450 seconds', () => {
  const sequence = ['gulf','cypress','flyway','timber','ozark','farm','platte','sandhills',
    'prairie','dakota','manitoba','parklands','boreal','foothills','mountain']
  assert.deepEqual(expeditionRegions.map(region => region.key), sequence)
  assert.equal(primaryDuration, 450)
  assert.equal(courseStages.length, 30)
  for (let n = 0; n < sequence.length; n++) {
    const region = expeditionRegions[n]
    assert.equal(region.seconds, n * 30)
    assert.equal(regionAt(region.seconds + 15).key, sequence[n])
    assert.equal(stageAt(region.seconds).level, n * 2 + 1)
    assert.equal(stageAt(region.seconds + 15).level, n * 2 + 2)
    if (n < 13) assert.equal(northLevel(expeditionBlend(distanceAtTime(region.seconds + 15))), 0)
  }
  assert.equal(stageAt(450.001), courseStages.at(-1))
  assert.ok(distanceAtTime(625) > distanceAtTime(450))
  assert.notEqual(courseRuleset, campRuleset)
})

test('all landmark families are off-lane and seeded habitat variation preserves identical ground and channel topology', () => {
  for (const region of expeditionRegions) {
    const index = Math.ceil(region.marker / segmentLength)
    const generation = [index, index + 1].map(i => buildTile(i, 2026))
    const site = generation.find(packet => packet.landmark)?.landmark
    assert.equal(site?.role, region.landmark)
    assert.ok(Math.abs(site.x) >= 6, region.key)
    assert.ok(generation.some(packet => packet.habitats.length > 0), region.key)
    const selected = buildTile(index + 1, 7)
    const variation = buildTile(index + 1, 15)
    assert.deepEqual(selected.ground.buffers.position.values, variation.ground.buffers.position.values)
    assert.deepEqual(selected.water.buffers.marshDepth.values, variation.water.buffers.marshDepth.values)
    assert.notDeepEqual(selected.detail.buffers.position.values, variation.detail.buffers.position.values)
    assert.ok(selected.trees.length / 7 <= 26)
    assert.ok(variation.habitats.every(habitat => Math.abs(habitat.lateral) > 3.4))
  }
  assert.notDeepEqual(forestModel('cypress', true, 0).attributes.position.array,
    forestModel('cypress', true, 1).attributes.position.array)
})

test('the rooted timber remains a timed center slide at early and extreme paces', () => {
  const model = lowTimber()
  assert.equal(lowTimber(), model)
  assert.ok(model.geometry.boundingBox.min.y < 0)
  assert.ok(model.geometry.boundingBox.max.y > 3)
  for (const time of [12, 50, 150, 320, 452]) {
    const item = { type: 'branch', distance: distanceAtTime(time), lane: 0, hazard: true }
    const speed = speedAtTime(time)
    assert.equal(clearsHazard(0, item, 'run', speed), false)
    assert.equal(clearsHazard(0, item, 'jump', speed), false)
    assert.equal(clearsHazard(0, item, 'slide', speed), true)
    assert.equal(clearsHazard(1, item, 'run', speed), true)
  }
})

test('parked snowmobiles block a grounded dog and are restricted to the two mountain territories', () => {
  const traveled = new Set()
  const rule = obstacles.snowmobile
  for (let seed = 2; seed < 20; seed++) {
    const next = createCourse(seed)
    for (let row = next(); row.time < 490; row = next()) {
      for (const item of row.entities.filter(item => item.type === 'snowmobile')) {
        const territory = regionAt(row.time).index
        assert.ok(territory === 13 || territory === 14)
        assert.ok(rule.weights[territory] > 0 && stageAt(row.time).level >= rule.minimumStage)
        assert.notEqual(item.lane, row.lane)
        assert.equal(clearsHazard(item.lane, item, 'run', speedAtTime(row.time)), false)
        assert.equal(clearsHazard(item.lane, item, 'slide', speedAtTime(row.time)), false)
        assert.equal(clearsHazard(row.lane, item, 'run', speedAtTime(row.time)), true)
        traveled.add(territory)
      }
    }
  }
  assert.deepEqual(traveled, new Set([13, 14]))
})

test('upgrading a legacy Lodge preserves career, lifetime scores and the ten-territory archive', () => {
  const before = { version: 3, active: 1, players: [{ id: 1, nickname: 'Scout', enrollment: 'worldwide',
    stats: { runs: 1, playtime: 330, distance: 8500 }, records: { duration: 330 },
    profile: { best: 9400, farthest: 8500, swipe: 'light' },
    migration: { duration: 330, farthest: 10, seconds: [...Array(9).fill(30),60] } }],
    entries: [{ id: 51, player: 1, date: '2026-11-20', score: 9400, distance: 8500, territory: 10, duration: 330 }] }
  const values = new Map([[saveKey, JSON.stringify(before)]])
  const source = () => ({ getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) })
  const lodge = openLodge(source)
  assert.equal(lodge.current().profile.best, 9400)
  assert.equal(lodge.current().enrollment, 'worldwide')
  assert.equal(lodge.current().legacyMigration.seconds[9], 60)
  assert.equal(lodge.current().migration.farthest, 0)
  assert.equal(lodge.board('score')[0].course, 'legacy-10')
  assert.equal(lodge.board('score')[0].territory, 10)
  assert.ok(lodge.commit())
  assert.equal(JSON.parse(values.get(saveKey + '.backup')).version, 3)
  assert.equal(openLodge(source).current().legacyMigration.duration, 330)
  assert.equal(openLodge(source).current().profile.swipe, 'light')
})
