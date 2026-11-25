import assert from 'node:assert/strict'
import test from 'node:test'
import { buildLabel } from '../src/build-info.js'
import { cypressModel } from '../src/cypress-models.js'
import { buildTile } from '../src/terrain-geometry.js'
import { centerAt, segmentLength } from '../src/trail.js'

test('Cypress Blender forms have bounded indexed geometry and share reusable templates', () => {
  for (const [form, triangleLimit] of [950, 950, 350, 110].entries()) {
    const mesh = cypressModel(form)
    const { position, color, uv, normal } = mesh.attributes
    assert.equal(cypressModel(form), mesh)
    assert.ok(mesh.index.count > 0 && mesh.index.count / 3 <= triangleLimit)
    assert.ok(mesh.index.array.every(index => index < position.count))
    assert.ok([position, color, uv, normal].every(attribute => attribute.count === position.count &&
      attribute.array.every(Number.isFinite)))
    mesh.computeBoundingBox()
    if (form < 3) {
      assert.ok(mesh.boundingBox.min.y < -.04)
      assert.ok(mesh.boundingBox.max.y > .98)
    }
  }
})

test('Cypress stands and bank plants are seeded, bounded, and clear of the trail', () => {
  for (const index of [15, 16, 22, 28]) {
    const first = buildTile(index, 7)
    const again = buildTile(index, 7)
    assert.equal(first.territory, 'cypress')
    assert.deepEqual(first.trees, again.trees)
    assert.deepEqual(first.shoreGrass, again.shoreGrass)
    assert.ok(first.trees.length >= 17 * 7 && first.trees.length <= 26 * 7)
    assert.ok(first.shoreGrass.length <= 20 * 4)
    const at = index * segmentLength
    for (const [plants, stride, clearance] of [[first.trees, 7, 6.1], [first.shoreGrass, 4, 3.8]]) {
      for (let i = 0; i < plants.length; i += stride)
        assert.ok(Math.abs(plants[i] + centerAt(at) - centerAt(at - plants[i + 2])) > clearance)
    }
  }
  assert.equal(buildLabel({ version: '1.0.0-phase.5.3a', id: 'abc1234' }), 'v1.0 Development · Phase 05.3A · abc1234')
})
