import assert from 'node:assert/strict'
import test from 'node:test'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial } from 'three'
import { buildLabel } from '../src/build-info.js'
import { courseStages, primaryDuration, stageAt } from '../src/difficulty.js'
import { fallenTimber, fallenVariant } from '../src/fallen-timber.js'
import { kennelCatalog, unlocked } from '../src/kennel-catalog.js'
import { encounterApproach, encounterPose } from '../src/living-wilderness.js'
import { openLodge, saveVersion } from '../src/lodge-save.js'
import { courseRuleset, legacyMigrationRuleset } from '../src/ruleset.js'
import { createCourse } from '../src/runner.js'
import { fieldSpecies } from '../src/wildlife-catalog.js'
import { createWildlifeModels } from '../src/wildlife-models.js'

test('bundled development and release labels distinguish exact builds', () => {
  assert.equal(buildLabel({ version: '1.0.0-phase.5', id: '123abcd' }), 'v1.0 Development · Phase 05 · 123abcd')
  assert.equal(buildLabel({ version: '1.0.0-phase.4.1', id: '123abcd' }), 'v1.0 Development · Phase 04.1 · 123abcd')
  assert.equal(buildLabel({ version: '1.0.0', id: 'a05da7e' }), 'v1.0.0 · a05da7e')
})

test('working coat previews preserve earned palettes and add career gates and count twelve plausible colors', () => {
  assert.equal(kennelCatalog.coat.length, 12)
  assert.equal(new Set(kennelCatalog.coat.map(coat => coat.color)).size, 12)
  const black = kennelCatalog.coat.find(coat => coat.id === 'black')
  assert.equal(unlocked(black, { level: 71 }, { inherited: [] }), false)
  assert.equal(unlocked(black, { level: 72 }, { inherited: [] }), true)
  assert.equal(unlocked(kennelCatalog.coat.find(coat => coat.id === 'fox-red'), { level: 1 }, { inherited: ['fox-red'] }), true)
})

test('historical runs remain available without sharing the new course ranks', () => {
  const snapshot = JSON.stringify({ version: saveVersion, active: 1, players: [{ id: 1 }], entries: [
    { id: 1, player: 1, date: '2025-01-01', score: 3000, duration: 45, territory: 2, course: legacyMigrationRuleset },
    { id: 2, player: 1, date: '2025-01-02', score: 1000, duration: 45, territory: 2, course: courseRuleset },
  ] })
  const lodge = openLodge(() => ({ getItem: () => snapshot, setItem() {} }))
  assert.equal(lodge.board('score', legacyMigrationRuleset)[0].id, 1)
  assert.equal(lodge.board('score', courseRuleset)[0].id, 2)
})

test('late pressure keeps the migration schedule and timber selects stable adjacent variants', () => {
  assert.equal(primaryDuration, 450)
  assert.equal(stageAt(463).level, 30)
  assert.equal(courseStages[5].gap, 1.23)
  assert.ok(courseStages[24].gap < .79 && courseStages[24].gap > courseStages[23].gap)
  assert.ok(courseStages[24].reward > courseStages[23].reward + .1)
  for (let d = 950; d < 965; d += .33) {
    const models = [-1, 0, 1].map(lane => fallenTimber(fallenVariant(d, lane)))
    assert.equal(new Set(models).size, 3)
  }
})

test('deer and flushing pheasant gain forward travel while remaining outside the trail', () => {
  const event = { kind: 'cover', lateral: 6, height: .15, distance:3500, seed: 117 }
  for (const id of ['deer', 'pheasant']) {
    const [approach, exit] = encounterApproach(id)
    assert.ok(approach + exit >= 100)
    const animal = fieldSpecies[id]
    const far = encounterPose(event, animal, 45, 155, 0, {})
    const near = encounterPose(event, animal, -8, 157, 0, {})
    assert.ok(near.along > far.along + 14)
    assert.ok(near.lateral >= 4.82)
  }
})

test('the northern paired creek and chute can demand a validated two-lane slide', () => {
  const next = createCourse(7)
  let previous
  let found = 0
  for (let row = next(); row.time < 540; row = next()) {
    if (row.pattern === 'cross-trail-slide-followup') {
      assert.ok(row.time >= 360)
      assert.equal(previous.gate?.action, 'jump')
      assert.equal(row.gate?.action, 'slide')
      assert.equal(Math.abs(row.lane - previous.lane), 2)
      assert.ok(row.time - previous.time >= 1.47)
      found++
    }
    previous = row
  }
  assert.ok(found > 0)
})

test('the two-rig pool reuses an idle model and evicts only an unpinned rig', async () => {
  const released = []
  const models = createWildlifeModels(undefined, async url => {
    const scene = new Group()
    const geo = new BoxGeometry()
    geo.addEventListener('dispose', () => released.push(url))
    scene.add(new Mesh(geo, new MeshBasicMaterial()))
    return { scene, animations: [] }
  })
  const settle = () => new Promise(resolve => setImmediate(resolve))
  const renderer = { compileAsync: async () => {}, getRenderTarget() {}, setRenderTarget() {}, render() {} }
  const finishLoading = async () => {
    for (let i = 0; i < 6; i++) {
      models.warm(renderer, {}, {})
      await settle()
    }
  }
  models.retain(['mallard', 'deer'])
  await finishLoading()
  assert.equal(models.metrics().resident, 2)
  const original = models.get('mallard')
  models.retain([])
  models.retain(['mallard', 'eagle'])
  await finishLoading()
  assert.equal(models.get('mallard'), original)
  assert.equal(models.get('deer'), undefined)
  assert.equal(models.metrics().resident, 2)
  assert.equal(models.metrics().evictions, 1)
  assert.equal(released.length, 1)
  assert.ok(released[0].includes('living-deer'))
})

test('wildlife geometry is staged with a limited draw and returns the renderer to its main target', async () => {
  const scene = new Group()
  const geometry = new BoxGeometry()
  scene.add(new Mesh(geometry, new MeshBasicMaterial()))
  const models = createWildlifeModels(undefined, async () => ({ scene, animations: [] }))
  const originalTarget = {}
  const calls = []
  let target = originalTarget
  const renderer = {
    compileAsync: async () => { calls.push('shader') },
    getRenderTarget: () => target,
    setRenderTarget(value) { target = value },
    render(staging) {
      assert.notEqual(target, originalTarget)
      assert.equal(staging.children[0].geometry, geometry)
      assert.equal(geometry.drawRange.count, 3)
      calls.push('geometry')
    },
  }
  models.retain(['mallard'])
  models.warm(renderer, {}, scene)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(models.ready('mallard'), undefined)
  models.warm(renderer, {}, scene)
  assert.deepEqual(calls, [])
  models.warm(renderer, {}, scene)
  assert.deepEqual(calls, ['shader'])
  await new Promise(resolve => setImmediate(resolve))
  models.warm(renderer, {}, scene)
  assert.deepEqual(calls, ['shader', 'geometry'])
  assert.equal(target, originalTarget)
  assert.equal(geometry.drawRange.count, Infinity)
  assert.equal(models.ready('mallard'), models.get('mallard'))
  models.warm(renderer, {}, scene)
  assert.equal(calls.length, 2)
  models.invalidateGPU()
  assert.equal(models.ready('mallard'), undefined)
})

test('a quick start defers rigs that finished loading to the next safe break', async () => {
  const scene = new Group()
  scene.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial()))
  let safe = true
  const outcomes = []
  const models = createWildlifeModels(undefined, async url => {
    outcomes.push(url)
    return { scene, animations: [] }
  }, () => safe)
  models.retain(['mallard', 'deer'])
  models.warm({}, {}, scene)
  safe = false
  await new Promise(resolve => setImmediate(resolve))
  models.warm({}, {}, scene)
  assert.equal(outcomes.length, 1)
  assert.equal(models.metrics().preparing, 'mallard')
  assert.equal(models.get('mallard'), undefined)
  safe = true
  models.warm({}, {}, scene)
  assert.ok(models.get('mallard'))
  assert.equal(models.ready('mallard'), undefined)
  assert.equal(outcomes.length, 1)
})
