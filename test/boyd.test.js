import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { offlineWorker } from '../build/offline-worker.js'
import { buildLabel } from '../src/build-info.js'
import { kennelItems } from '../src/kennel-catalog.js'
import { boydAppearance, inspectionBreed, masterHunter } from '../src/master-hunter.js'

test('Boyd preview requires practice and his prestige gear stays outside saved ownership', () => {
  assert.equal(inspectionBreed(false, 'boyd'), 'lab')
  assert.equal(inspectionBreed(true, 'boyd'), 'boyd')
  assert.equal(inspectionBreed(true, 'pointer'), 'pointer')
  assert.equal(masterHunter.level, 100)
  const active = boydAppearance()
  const collar = boydAppearance('signature')
  const scarf = boydAppearance('bandana')
  assert.equal(active.collar.id, masterHunter.signature)
  assert.equal(active.vest.id, masterHunter.vest)
  assert.equal(collar.vest.color, null)
  assert.equal(scarf.collar.id, masterHunter.bandana)
  for (const id of [masterHunter.signature, masterHunter.vest, masterHunter.bandana])
    assert.ok(!kennelItems.some(item => item.id === id))
})

async function dogAsset(name) {
  const file = await readFile(new URL('../src/assets/' + name + '.glb', import.meta.url))
  assert.equal(file.toString('ascii', 0, 4), 'glTF')
  const end = 20 + file.readUInt32LE(12)
  return JSON.parse(file.toString('utf8', 20, end))
}

test('Boyd has a separate custom mesh with the working dog skin and clip contract', async () => {
  const [boyd, lab] = await Promise.all([dogAsset('boyd'), dogAsset('labrador')])
  const jointNames = asset => asset.skins[0].joints.map(i => asset.nodes[i].name)
  assert.deepEqual(jointNames(boyd), jointNames(lab))
  assert.deepEqual(boyd.animations.map(clip => clip.name), lab.animations.map(clip => clip.name))
  const vertexCount = asset => asset.accessors[asset.meshes[0].primitives[0].attributes.POSITION].count
  assert.ok(vertexCount(boyd) > vertexCount(lab))
  assert.ok(boyd.extensionsRequired.includes('EXT_meshopt_compression'))
})

test('public build rejects unregistered copies even when a reference photo uses an art extension', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'private-release-'))
  try {
    await writeFile(join(dir, 'example.webp'), 'fixture')
    const plugin = offlineWorker({ version: '1.0.0-phase.5.1', id: 'abcdef0' })
    plugin.configResolved({ publicDir: dir })
    const context = { error(message) { throw new Error(message) } }
    assert.throws(() => plugin.buildStart.call(context), /Only registered release assets/)
  } finally { await rm(dir, { recursive: true, force: true }) }
})

test('the iPhone and browser use separate Boyd icon sizes and the running version supports Phase 05.1', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  assert.match(html, /apple-mobile-web-app-title" content="Retriever Run"/)
  assert.match(html, /rel="apple-touch-icon" href="\.\/icons\/boyd-apple-touch-180\.png"/)
  assert.match(html, /rel="icon" href="\.\/icons\/favicon\.png"/)
  const favicon = await readFile(new URL('../public/icons/favicon.png', import.meta.url))
  assert.equal(favicon.readUInt32BE(16), 48)
  assert.equal(favicon.readUInt32BE(20), 48)
  assert.equal(buildLabel({ version: '1.0.0-phase.5.1', id: 'abcdef0' }),
    'v1.0 Development · Phase 05.1 · abcdef0')
})
