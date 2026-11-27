import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BufferGeometry, Group, MeshBasicMaterial, Skeleton, SkinnedMesh, Texture } from 'three'
import { fieldSpecies, habitatEncounters } from '../src/wildlife-catalog.js'
import { encounterRarity, encounterVisible, planEncounter } from '../src/wildlife-encounters.js'
import { normalizeWildlife, commitWildlife } from '../src/wildlife-journal.js'
import { createRunStatistics } from '../src/field-stats.js'
import { newRun, score } from '../src/runner.js'
import { expeditionRegions } from '../src/expedition.js'
import { fallenTimber } from '../src/fallen-timber.js'
import { buildTile } from '../src/terrain-geometry.js'
import { createEncounterArt } from '../src/wildlife-art.js'
import { encounterPose } from '../src/living-wilderness.js'
import { assignForestGeometry, forestModel } from '../src/forest-models.js'
import { disposeWildlifeModel } from '../src/wildlife-models.js'

test('every territory only draws from its own tier and all catalog species are reachable', () => {
  assert.deepEqual(Object.keys(habitatEncounters),expeditionRegions.map(region=>region.key))
  assert.deepEqual([0,.649,.65,.889,.89,.979,.98,.999].map(encounterRarity),
    ['common','common','uncommon','uncommon','rare','rare','exceptional','exceptional'])
  const anchors = ['bank','cover','water','open'].map(kind => ({ kind, distance: 142, lateral: -7, height: 1 }))
  const presented = new Set()
  for (const [territory, group] of Object.entries(habitatEncounters)) {
    const packet = { index: 4, territory, anchors }
    for (let seed = 0; seed < 2048; seed++) {
      const event = planEncounter(packet,seed)
      assert.ok(group.flat().includes(event.species))
      assert.deepEqual(planEncounter(packet,seed),event)
      presented.add(event.species)
    }
    assert.equal(planEncounter({ ...packet,index: 3 },7), null)
  }
  assert.deepEqual([...presented].sort(),Object.keys(fieldSpecies).sort())
})

test('bank and flight routes stay off the trail and the pheasant rises only after the flush distance', () => {
  const event = { seed: 17, lateral: -6, height: .04, distance:3400, kind: 'cover' }
  const pose = {}
  encounterPose(event, fieldSpecies.pheasant, 46, 4, 0, pose)
  assert.equal(pose.state,'rest')
  assert.equal(pose.fold,1)
  assert.equal(pose.along,0)
  const first = encounterPose(event, fieldSpecies.pheasant, 21, 5, 0, {}).height
  const later = encounterPose(event, fieldSpecies.pheasant, 11, 6, 0, {}).height
  assert.ok(later > first)
  assert.equal(encounterPose({ ...event,kind:'water' }, fieldSpecies.mallard, 36, 4, 0, {}).rig,'Idle')
  assert.equal(encounterPose({ ...event,kind:'water' }, fieldSpecies.mallard, 16, 5, 0, {}).rig,'Fly')
  assert.ok(encounterPose(event, fieldSpecies.crane, 25, 5, 0, {}).height > event.height + 2)
  for (const animal of Object.values(fieldSpecies)) for (const ahead of [41,30,20,10,0,-5]) {
    const pose = encounterPose(event,animal,ahead,8,4,{})
    assert.ok(pose.lateral <= -4.82, animal.id)
    assert.ok(Number.isFinite(pose.height),animal.id)
  }
  assert.ok(encounterVisible(16,.35,.6,.9,true))
  for (const args of [[43,0,0,0,true],[12,1,0,0,true],[12,0,0,0,false],[12,0,0,1.1,true]])
    assert.equal(encounterVisible(...args),false)
})

test('observations, retrieved birds and old save totals remain distinct and duplicate commits do not award anything', () => {
  const old = normalizeWildlife(null,{ ducks: 8, pheasants: 3 })
  const seen = []
  const stats = createRunStatistics(12,event => seen.push(event))
  const run = newRun()
  const encounter = { id: 'platte:140:crane', species: 'crane', territory: 'platte', rarity: 'rare' }
  stats.observe(encounter)
  stats.observe(encounter)
  stats.pickup('mallard')
  assert.equal(score(run),0)
  assert.equal(seen.length,1)
  assert.equal(seen[0].kind,'wildlife-observed')
  const report = stats.finish(run,'log')
  const date = '2026-11-24T20:00:00Z'
  assert.deepEqual(commitWildlife(old,report,12,date),['crane'])
  assert.deepEqual(commitWildlife(old,report,12,date),[])
  const reloaded = normalizeWildlife(JSON.parse(JSON.stringify(old)))
  assert.deepEqual(reloaded,old)
  assert.equal(reloaded.species.mallard.retrieves,9)
  assert.equal(reloaded.species.mallard.seen,0)
  assert.equal(reloaded.species.crane.rare,1)
  assert.equal(reloaded.species.crane.territory,'platte')
})

test('tipped root plates have distinct bounded meshes and the terrain worker includes finite bounds', () => {
  const shapes = [0, 1, 2].map(variant => fallenTimber(variant))
  assert.equal(new Set(shapes.map(({ geometry }) => geometry.name)).size, 3)
  for (const { geometry, volumes } of shapes) {
    assert.ok(volumes.some(volume => volume.name === 'root fan'))
    assert.ok(volumes.length > 10)
    assert.ok(geometry.boundingBox.min.y < .07 && geometry.boundingBox.max.y > 1.4)
    assert.ok(geometry.boundingBox.min.x > -1.23 && geometry.boundingBox.max.x < 1.23)
    assert.ok(geometry.boundingBox.max.z > 1.90)
  }
  const { ground, solid, water, anchors } = buildTile(0,7)
  for (const part of [ground,solid,water].filter(Boolean)) {
    assert.equal(part.bounds.length,4)
    assert.ok(part.bounds.every(Number.isFinite))
  }
  assert.ok(anchors.every(anchor=>Math.abs(anchor.lateral)>4.82))
})

test('pooled animal geometry releases only local buffers', () => {
  const first = createEncounterArt(fieldSpecies.crane)
  const second = createEncounterArt(fieldSpecies.moose)
  let released = 0, other = 0
  for (const mesh of [first.bodyMesh,first.wingMesh,first.tipMesh]) mesh.geometry.addEventListener('dispose',()=>released++)
  second.bodyMesh.geometry.addEventListener('dispose',()=>other++)
  first.dispose()
  assert.equal(released,3)
  assert.equal(other,0)
  second.dispose()
})

test('forest residency releases a shared GPU buffer when its last terrain tile leaves', () => {
  const willow = forestModel('willow',true)
  const spruce = forestModel('spruce',true)
  const foreground = { geometry: undefined }
  const next = { geometry: undefined }
  let released = 0
  willow.addEventListener('dispose', () => released++)
  assignForestGeometry(foreground,willow)
  assignForestGeometry(next,willow)
  assignForestGeometry(foreground,spruce)
  assert.equal(released,0)
  assignForestGeometry(next,spruce)
  assert.equal(released,1)
  assert.equal(forestModel('willow',true),willow)
})

test('retiring a wildlife rig frees its shared Three.js bone texture and material images once', () => {
  const root = new Group()
  const parent = new Group().add(root)
  const skeleton = new Skeleton().computeBoneTexture()
  let bonesReleased = 0
  let imagesClosed = 0
  skeleton.boneTexture.addEventListener('dispose', () => bonesReleased++)
  const image = { close() { imagesClosed++ } }
  const color = new Texture(image)
  const alpha = new Texture(image)
  const material = new MeshBasicMaterial({ map: color, alphaMap: alpha })
  for (let n = 0; n < 2; n++) {
    const mesh = new SkinnedMesh(new BufferGeometry(), material)
    mesh.skeleton = skeleton
    root.add(mesh)
  }
  assert.equal(disposeWildlifeModel({ root }), 1)
  assert.equal(bonesReleased, 1)
  assert.equal(imagesClosed, 1)
  assert.equal(skeleton.boneTexture, null)
  assert.equal(parent.children.length, 0)
})
