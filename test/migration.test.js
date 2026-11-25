import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Color, Scene } from 'three'
import { canPostRun } from '../src/camp-rules.js'
import { firstContact } from '../src/collision.js'
import { createFixedClock, tickSeconds } from '../src/timing.js'
import { courseStages, distanceAtTime, speedAtTime } from '../src/difficulty.js'
import { atmosphereBlend, expeditionBlend, expeditionRegions, migrationSecondsByTerritory, regionAt } from '../src/expedition.js'
import { openLodge, saveKey } from '../src/lodge-save.js'
import { createNorthernHorizon, horizonPosition } from '../src/northern-horizon.js'
import { createRunControls } from '../src/run-controls.js'
import { advance, createCourse, newRun, reactionWindow } from '../src/runner.js'
import { buildTile } from '../src/terrain-geometry.js'
import { centerAt, segmentLength } from '../src/trail.js'

test('the territory timer advances on the exact simulation tick and remains northern in overtime', () => {
  const clock = createFixedClock()
  const run = newRun()
  const step = dt => advance(run, dt)
  for (let territory = 1; territory < expeditionRegions.length; territory++) {
    for (let tick = 0; tick < 30 * 120 - 1; tick++) clock.advance(tickSeconds, step)
    assert.equal(regionAt(run.elapsed).index, territory - 1)
    clock.reset()
    // The paused and hidden render paths never feed their wall deltas into advance.
    clock.advance(0, step)
    assert.equal(regionAt(run.elapsed).index, territory - 1)
    clock.advance(tickSeconds, step)
    assert.equal(run.elapsed, territory * 30)
    assert.equal(regionAt(run.elapsed).index, territory)
    assert.ok(Math.abs(run.distance - distanceAtTime(run.elapsed)) < .003)
    assert.ok(Math.abs(atmosphereBlend(run.elapsed).blend - .5) < 1e-9)
    assert.equal(regionAt(run.elapsed - 1e-10).index, territory - 1)
  }
  for (let tick = 0; tick < 55 * 120; tick++) clock.advance(tickSeconds, step)
  assert.equal(run.elapsed, 475)
  assert.equal(regionAt(run.elapsed).key, 'mountain')
  assert.deepEqual(migrationSecondsByTerritory(455), [...Array(14).fill(30), 35])
})

test('all fifteen territory profiles stream distinct deterministic scenery on connected terrain', () => {
  const terrain = []
  const plantAndSilhouette = new Set()
  for (const region of expeditionRegions) {
    const middle = Math.floor(distanceAtTime(region.seconds + 15) / segmentLength)
    const tile = buildTile(middle)
    assert.equal(tile.territory, region.key)
    assert.equal(tile.plantType, region.plant)
    assert.notEqual(region.birds.length, 0)
    assert.ok(tile.trees.length <= region.treesPerSide * 14)
    assert.deepEqual(buildTile(middle), tile)
    terrain.push(tile)
    plantAndSilhouette.add(tile.plantType + '/' + tile.treeStyle)
    if (!region.index) continue
    const { from, to, blend } = expeditionBlend(region.marker)
    assert.equal(from.index, region.index - 1)
    assert.equal(to, region)
    assert.ok(blend > .485 && blend < .515)
    const seam = Math.floor(region.marker / segmentLength)
    const here = buildTile(seam).ground.buffers.position.values
    const stride = here.length / (segmentLength * 2 + 1)
    const last = here.slice(-stride)
    const first = buildTile(seam + 1).ground.buffers.position.values.slice(0, stride)
    const dx = centerAt((seam + 1) * segmentLength) - centerAt(seam * segmentLength)
    for (let i = 0; i < stride; i += 3) {
      assert.ok(Math.abs(last[i] - dx - first[i]) < .001)
      assert.ok(Math.abs(last[i + 1] - first[i + 1]) < .001)
      assert.ok(Math.abs(last[i + 2] + segmentLength - first[i + 2]) < .001)
    }
  }
  assert.ok(plantAndSilhouette.size >= 6)
  assert.ok(terrain.every(tile => tile.detail.index.length > 0))
  for (let index = 1; index < terrain.length; index++) {
    assert.notDeepEqual(terrain[index].detail.buffers.position.values, terrain[index - 1].detail.buffers.position.values)
    assert.notDeepEqual(terrain[index].water.buffers.marshDepth.values, terrain[index - 1].water.buffers.marshDepth.values)
  }
})

test('far terrain reuses two alpha-blended meshes across chunk seams and the endless endgame', () => {
  const scene = new Scene()
  const update = createNorthernHorizon(scene)
  const geometry = scene.children.map(ridge => ridge.geometry)
  const haze = new Color()
  const seam = Math.ceil(expeditionRegions[13].marker / segmentLength) * segmentLength
  update(seam - .01, 0, .38, haze)
  assert.ok(scene.children.every(ridge => !ridge.visible))
  update(seam - .01, .00001, .38, haze)
  assert.ok(scene.children.every(ridge => ridge.visible && ridge.material.transparent && !ridge.material.depthWrite))
  const previous = scene.children.map(ridge => ridge.position.clone())
  update(seam + .01, .46, .38, haze)
  scene.children.forEach((ridge, layer) => {
    assert.equal(ridge.geometry, geometry[layer])
    assert.ok(ridge.position.distanceTo(previous[layer]) < .03)
    assert.ok(Math.abs(ridge.position.x + centerAt(seam + .01) - horizonPosition(0, layer).x) < 1e-9)
  })
  update(21_000, 1, 1, haze)
  assert.deepEqual(scene.children.map(ridge => ridge.geometry), geometry)
  assert.ok(scene.children.every(ridge => Math.abs(ridge.position.z) <= 32))
})

test('late sets add action chains while preserving a delayed swept route and Camp speed bounds', () => {
  const samples = expeditionRegions.map(() => ({ decisions: 0, forcedLanes: 0, wide: 0, alternating: 0 }))
  for (const stages of [courseStages.slice(0, 24), courseStages.slice(24)]) {
    assert.ok(stages.every(({ gap }, index) => index === 0 || gap <= stages[index - 1].gap))
  }
  assert.ok(courseStages[24].gap - courseStages[23].gap <= .06, 'allow a bounded recovery before the fastest lane commitments')
  for (let seed = 0; seed < 14; seed++) {
    const course = createCourse(16427 + seed * 1837)
    const controls = createRunControls()
    const run = newRun()
    const previous = {}
    const witness = {}
    const active = []
    const upcoming = []
    let planned = course()
    let last
    let released = -1
    let nextSwipe = -1
    let usedGate = false
    while (run.elapsed < 478) {
      while (planned.at < run.distance + 65) {
        upcoming.push(planned)
        const hazards = planned.entities.filter(item => item.hazard)
        active.push(...hazards)
        const count = samples[regionAt(planned.time).index]
        if (hazards.length) count.decisions++
        if (planned.gate) count.wide++
        if (!planned.gate && hazards.length === 2 && last && planned.lane !== last.lane) count.forcedLanes++
        if (planned.gate && last?.gate && planned.entities[0].type !== last.entities[0].type) count.alternating++
        last = planned
        planned = course()
      }
      const row = upcoming[0]
      if (run.lane !== row.lane && run.elapsed - released >= reactionWindow + .033 && run.elapsed >= nextSwipe) {
        controls.enqueue(run.lane < row.lane ? 'right' : 'left')
        nextSwipe = run.elapsed + .16
      }
      if (row.gate && !usedGate && run.distance >= row.at - run.speed * (row.gate.duration / 2 + (seed % 3 - 1) * .047)) {
        controls.enqueue(row.gate.action)
        usedGate = true
      }
      controls.apply(run, () => {})
      Object.assign(previous, run)
      advance(run, tickSeconds)
      if (firstContact(previous, run, active, witness)) {
        assert.fail('Seed ' + seed + ' at ' + run.elapsed.toFixed(2) + ' ' + JSON.stringify(witness))
      }
      while (active.length && active[0].distance < run.distance - 4) active.shift()
      if (run.distance > (row.end ?? row.at) + 1.58) {
        upcoming.shift()
        released = run.elapsed
        usedGate = false
      }
    }
  }
  assert.ok(samples[12].forcedLanes > samples[0].forcedLanes)
  assert.ok(samples[13].decisions > samples[0].decisions)
  assert.ok(samples[14].alternating > 0)
  assert.ok(samples.every(sample => sample.wide > 0))
  for (const time of [2, 30, 90, 150, 210, 270, 300, 600, 14_400]) {
    const distance = Math.floor(distanceAtTime(time))
    assert.ok(speedAtTime(time) < 29)
    assert.ok(canPostRun({ durationMs: time * 1000, distance, score: distance, retrieves: 0 }))
  }
})

test('existing duration records carry over while only newly completed runs earn travel honors', () => {
  const original = { version: 3, active: 1, players: [{ id: 1, nickname: 'Scout', enrollment: 'guest',
    profile: { best: 5500, farthest: 5000 }, stats: { runs: 1, playtime: 260, distance: 5000 }, records: { duration: 260 },
    career: { xp: 1310 } }] }
  const backing = new Map([[saveKey, JSON.stringify(original)]])
  const storage = () => ({ getItem: key => backing.get(key), setItem: (key, value) => backing.set(key, value) })
  const lodge = openLodge(storage)
  assert.equal(lodge.current().records.duration, 260)
  assert.equal(lodge.current().migration.farthest, 0)
  const run = { ...newRun(), elapsed: 189, distance: distanceAtTime(189) }
  const report = lodge.finalize(1, lodge.beginRun(), run, 'tree')
  assert.equal(report.territory, 7)
  assert.equal(report.earned.filter(item => item.patch.id === 'flyway-traveler').length, 2)
  assert.equal(lodge.current().records.duration, 260)
  const reloaded = openLodge(storage)
  assert.equal(reloaded.current().migration.farthest, 7)
  assert.equal(reloaded.current().migration.seconds[6], 9)
  assert.equal(reloaded.current().nickname, 'Scout')
  assert.equal(reloaded.board('distance')[0].territory, 7)
})
