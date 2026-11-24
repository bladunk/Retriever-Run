import assert from 'node:assert/strict'
import { test } from 'node:test'
import { BoxGeometry, Color, Group, Mesh, Vector3 } from 'three'
import { expeditionRegions } from '../src/expedition.js'
import { addObstacleSignFace, createObstacleSigns, fitObstacleLettering, obstacleSignFace } from '../src/obstacle-signs.js'
import { signMessages } from '../src/sign-lines.js'
import { seededRandom } from '../src/trail.js'
import { obstacleSignLine } from '../src/trail-signs.js'

const catalog = Object.values(signMessages).flat()
const timber = new BoxGeometry(2.14, .9, .53)

function board(wide) {
  const model = new Group()
  model.add(new Mesh(timber))
  addObstacleSignFace(model, wide)
  return model
}

test('narrow and wide timber have upright forward UVs and a face clear of the baked wood', () => {
  for (const wide of [false, true]) {
    const model = board(wide)
    const face = model.getObjectByName(obstacleSignFace)
    const { position, uv, normal } = face.geometry.attributes
    assert.ok(face.position.z > timber.boundingBox.max.z)
    assert.ok(face.position.z - timber.boundingBox.max.z < .01)
    assert.equal(face.position.y, 1.72)
    assert.equal(face.visible, false)
    for (let i = 0; i < uv.count; i++) {
      assert.equal(normal.getZ(i), 1)
      assert.equal(uv.getY(i), position.getY(i) + .5)
      assert.equal(uv.getX(i), position.getX(i) + .5)
    }
    const forward = new Vector3(0, 0, 1).applyQuaternion(face.quaternion)
    assert.equal(forward.z, 1)
  }
})

test('obstacle signs fit the full existing catalog using at most three lines', () => {
  const measure = line => [...line].reduce((total, symbol) => total + (symbol === ' ' ? 29 : 60), 0)
  const shapes = new Set()
  for (const message of catalog) {
    const fit = fitObstacleLettering(message, measure)
    assert.equal(fit.lines.join(' '), message)
    assert.ok(fit.lines.length >= 1 && fit.lines.length <= 3)
    assert.ok(fit.lines.length * fit.lineHeight <= 194)
    assert.ok(fit.lines.every(line => measure(line) * (fit.size / 100) * fit.scale <= 450.001), message)
    assert.ok(fit.size >= 43, message)
    shapes.add(fit.lines.length)
  }
  assert.ok(shapes.has(2) && shapes.has(3))
  assert.equal(fitObstacleLettering('DUCKS?', measure).lines.length, 1)
})

test('obstacle text draws from all slogans, avoids repeats and favors the actual territory', () => {
  const seen = new Set()
  const samples = [0, 4, 8].map(region => {
    const recent = []
    const random = seededRandom(1023)
    const values = Array.from({ length: 5200 }, () => {
      const line = obstacleSignLine(expeditionRegions[region].marker + 1, random, recent)
      assert.ok(!recent.includes(line))
      recent.push(line)
      if (recent.length > 24) recent.shift()
      seen.add(line)
      return line
    })
    return values
  })
  assert.deepEqual(seen, new Set(catalog))
  assert.ok(samples[1].filter(line => signMessages.farm.includes(line)).length >
    5 * samples[0].filter(line => signMessages.farm.includes(line)).length)
  assert.ok(samples[2].filter(line => signMessages.canada.includes(line)).length >
    5 * samples[0].filter(line => signMessages.canada.includes(line)).length)
})

test('a face owns its lettering until release and recycled signs cap texture allocations', () => {
  let allocations = 0
  const context = { createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, beginPath() {},
    moveTo() {}, bezierCurveTo() {}, stroke() {}, strokeRect() {}, arc() {}, fill() {}, strokeText() {}, fillText() {},
    save() {}, restore() {}, translate() {}, scale() {},
    measureText: line => ({ width: line.length * 56 }) }
  const signs = createObstacleSigns(() => {
    allocations++
    return { getContext: () => context }
  })
  const models = Array.from({ length: 9 }, (_, index) => board(index % 2 === 0))
  for (let wave = 0; wave < 400; wave++) {
    const messages = new Set()
    for (const [index, model] of models.entries()) {
      const entity = { lane: index % 3 - 1, distance: 377 + wave * 10 + index }
      signs.bind(model, entity, 421)
      const face = model.getObjectByName(obstacleSignFace)
      assert.ok(face.visible && face.material.isMeshBasicMaterial && face.material.fog)
      assert.equal(face.material.toneMapped, false)
      assert.equal(face.material.side, 0)
      assert.equal(face.material.depthTest, true)
      assert.ok(new Color('#fff2d8').r > .90)
      assert.ok(!messages.has(face.userData.lettering.message))
      messages.add(face.userData.lettering.message)
      const version = face.material.map.version
      signs.bind(model, entity, 421)
      assert.equal(face.material.map.version, version)
    }
    assert.equal(signs.stats().active, 9)
    for (const model of models) signs.release(model)
    assert.equal(signs.stats().active, 0)
  }
  assert.equal(allocations, 9)
  assert.equal(signs.stats().capacity, 9)
})
