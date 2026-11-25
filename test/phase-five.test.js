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
import { fieldSpecies } from '../src/wildlife-catalog.js'
import { createWildlifeModels } from '../src/wildlife-models.js'

test('bundled development and release labels distinguish exact builds', () => {
  assert.equal(buildLabel({ version: '1.0.0-phase.5', id: '123abcd' }), 'v1.0 Development · Phase 05 · 123abcd')
  assert.equal(buildLabel({ version: '1.0.0-phase.4.1', id: '123abcd' }), 'v1.0 Development · Phase 04.1 · 123abcd')
  assert.equal(buildLabel({ version: '1.0.0', id: 'a05da7e' }), 'v1.0.0 · a05da7e')
})

test('working coat previews preserve existing gates and count twelve plausible colors', () => {
  assert.equal(kennelCatalog.coat.length, 12)
  assert.equal(new Set(kennelCatalog.coat.map(coat => coat.color)).size, 12)
  assert.equal(unlocked(kennelCatalog.coat.find(coat => coat.id === 'black'), { level: 100 }, []), false)
  assert.equal(unlocked(kennelCatalog.coat.find(coat => coat.id === 'fox-red'), { level: 1 }, ['fox-red']), true)
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
  const event = { kind: 'cover', lateral: 6, height: .15, seed: 117 }
  for (const id of ['deer', 'pheasant']) {
    const [approach, exit] = encounterApproach(id)
    assert.ok(approach + exit >= 100)
    const animal = fieldSpecies[id]
    const far = encounterPose(event, animal, 34, 0, 0, {})
    const near = encounterPose(event, animal, -8, 2, 0, {})
    assert.ok(near.along > far.along + 22)
    assert.ok(near.lateral >= 4.82)
  }
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
  models.retain(['mallard', 'deer'])
  await settle()
  assert.equal(models.metrics().resident, 2)
  const original = models.get('mallard')
  models.retain([])
  await settle()
  models.retain(['mallard', 'eagle'])
  await settle()
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
  await new Promise(resolve => setImmediate(resolve))
  models.warm(renderer, {}, scene)
  assert.deepEqual(calls, ['shader'])
  await new Promise(resolve => setImmediate(resolve))
  models.warm(renderer, {}, scene)
  assert.deepEqual(calls, ['shader', 'geometry'])
  assert.equal(target, originalTarget)
  assert.equal(geometry.drawRange.count, Infinity)
  models.warm(renderer, {}, scene)
  assert.equal(calls.length, 2)
})
