import { test } from 'node:test'
import assert from 'node:assert/strict'
import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three'
import { buildTile } from '../src/terrain-geometry.js'
import { replaceTileGeometry } from '../src/tile-mesh.js'
import { expeditionRegions } from '../src/expedition.js'
import { createLandscapeAtlas, landscapeVariant, surfaceOrder, waterProfiles } from '../src/landscape-surfaces.js'

test('every territory has a distinct scanned surface index, a water profile and an opaque landmark packet', () => {
  assert.deepEqual(expeditionRegions.map(({ key }) => surfaceOrder[key]), Array.from({ length: 15 }, (_, i) => i))
  assert.equal(new Set(Object.values(waterProfiles).map(values => values.join(','))).size, 15)
  for (const region of expeditionRegions) {
    let tile
    for (let i = Math.ceil(region.marker / 30); i < Math.ceil(region.marker / 30) + 13; i++) {
      const candidate = buildTile(i, 7)
      if (candidate.territory === region.key && candidate.landmark) {
        tile = candidate
        break
      }
    }
    assert.ok(tile, region.key)
    assert.ok(tile.solid.index.length > 0, region.key)
    assert.ok(tile.detail.index.length > 0, region.key)
    assert.notDeepEqual(tile.solid.buffers.position.values, tile.detail.buffers.position.values, region.key)
    const duplicate = buildTile(tile.index, 7)
    assert.deepEqual(duplicate.landmark, tile.landmark)
    assert.deepEqual(duplicate.solid.buffers.position.values, tile.solid.buffers.position.values)
  }
})

test('replacing a tile owns its packet geometry, leaving the other tile and shared material intact', () => {
  const material = new MeshStandardMaterial()
  const first = new Mesh(new BoxGeometry(), material)
  const second = new Mesh(new BoxGeometry(), material)
  const active = second.geometry
  const packet = buildTile(0).solid
  let materialDisposals = 0, firstDisposals = 0, neighborDisposals = 0
  material.addEventListener('dispose', () => materialDisposals++)
  first.geometry.addEventListener('dispose', () => firstDisposals++)
  active.addEventListener('dispose', () => neighborDisposals++)
  replaceTileGeometry(first, packet)
  assert.equal(firstDisposals, 1)
  assert.equal(first.material, material)
  assert.equal(second.geometry, active)
  assert.equal(first.geometry.getAttribute('position').array, packet.buffers.position.values)
  replaceTileGeometry(first, null)
  assert.deepEqual([materialDisposals, neighborDisposals], [0, 0])
  assert.equal(material.transparent, false)
  assert.equal(material.opacity, 1)
})

test('atlas quality swaps serialize decoding, reject stale completions and dispose the previous map after assignment', async () => {
  const events = []
  const pending = new Map()
  const atlas = createLandscapeAtlas(key => new Promise(resolve => {
    events.push('load:' + key)
    pending.set(key, resolve)
  }), key => events.push('apply:' + key), key => events.push('dispose:' + key))
  const tick = () => new Promise(resolve => setImmediate(resolve))
  atlas.select(landscapeVariant(0))
  await tick()
  atlas.select(landscapeVariant(1))
  assert.equal(atlas.state().pending, true)
  pending.get('compact')('old-compact')
  await tick()
  assert.deepEqual(events, ['load:compact', 'dispose:old-compact', 'load:full'])
  pending.get('full')('full')
  await tick()
  assert.equal(atlas.state().active, 'full')
  atlas.select(landscapeVariant(2))
  await tick()
  assert.equal(events.filter(event => event === 'load:full').length, 1)
  atlas.select(landscapeVariant(0))
  await tick()
  assert.equal(atlas.state().active, 'full')
  pending.get('compact')('compact')
  await tick()
  assert.deepEqual(events.slice(-3), ['load:compact', 'apply:compact', 'dispose:full'])
  assert.equal(atlas.state().active, 'compact')
})
