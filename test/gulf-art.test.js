import assert from 'node:assert/strict'
import test from 'node:test'
import { buildTile, gulfGrassCount } from '../src/terrain-geometry.js'
import { gulfGeometry } from '../src/gulf-models.js'
import { expeditionRegions } from '../src/expedition.js'
import { centerAt } from '../src/trail.js'

test('Gulf exports preserve indexed topology and share immutable source geometry', () => {
  for (const [name, limit] of Object.entries({ CampWood: 1750, CampRoof: 400, CampRecess: 18,
    CattailLOD0: 450, CattailLOD1: 175, CordgrassLOD0: 280, CordgrassLOD1: 95,
    MallardDrake: 1300, MallardHen: 1250, ShoreDriftwood: 1700 })) {
    const mesh = gulfGeometry(name)
    const vertices = mesh.attributes.position.count
    assert.equal(gulfGeometry(name), mesh)
    assert.ok(mesh.index.count > 0 && mesh.index.count / 3 <= limit, name)
    assert.equal(mesh.index.count % 3, 0, name)
    assert.ok(mesh.index.array.every(index => index < vertices), name)
    for (const attribute of ['position', 'normal', 'uv', 'color']) {
      assert.equal(mesh.attributes[attribute].count, vertices, name)
      assert.ok(mesh.attributes[attribute].array.every(Number.isFinite), name)
    }
    assert.ok(mesh.attributes.color.array.every(value => value >= 0 && value <= 1), name)
    const firstPosition = mesh.attributes.position.getX(0)
    const clone = mesh.clone()
    clone.translate(1, 0, 0)
    clone.dispose()
    assert.equal(mesh.attributes.position.getX(0), firstPosition, name)
  }
})

test('Gulf bank cover is local, bounded and seeded outside the playable trail', () => {
  let instances = 0
  for (const index of [0, 1, 3, 6]) {
    const tile = buildTile(index, 7)
    const grass = tile.shoreGrass
    assert.deepEqual(grass, buildTile(index, 7).shoreGrass)
    assert.ok(grass.length <= 4 * gulfGrassCount)
    instances += grass.length / 4
    for (let i = 0; i < grass.length; i += 4) {
      const worldX = grass[i] + centerAt(index * 30)
      const distance = index * 30 - grass[i + 2]
      assert.ok(Math.abs(worldX - centerAt(distance)) > 3.4)
      assert.ok(grass[i + 1] >= -.80 && grass[i + 1] <= .10)
    }
  }
  assert.ok(instances > 30)
  for (const region of expeditionRegions.slice(2,10).filter(region => !region.heartland))
    assert.equal(buildTile(Math.ceil(region.marker / 30), 7).shoreGrass.length, 0, region.key)
})
