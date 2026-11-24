import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Color, Scene } from 'three'
import { canPostRun } from '../src/camp-rules.js'
import { traceContact } from '../src/collision.js'
import { fallenTimberModel, fallenTimbers, fallenVariant } from '../src/fallen-timber.js'
import { forestModel, forestProfileAt } from '../src/forest-models.js'
import { trailTimber } from '../src/trail-timber.js'
import { courseStages, distanceAtTime, speedAtTime, stageAt } from '../src/difficulty.js'
import { createDriftingLeaves } from '../src/drifting-leaves.js'
import { regionAt } from '../src/expedition.js'
import { act, advance, newRun } from '../src/runner.js'
import { createTrailSigns } from '../src/sign-scenery.js'
import { signMessages } from '../src/sign-lines.js'
import { signAnchor, signDistance } from '../src/sign-placement.js'
import { fitSignLettering } from '../src/sign-lettering.js'
import { signSlots, trailSign } from '../src/trail-signs.js'
import { createFixedClock, tickSeconds } from '../src/timing.js'
import { centerAt, headingAt, segmentLength, laneWidth } from '../src/trail.js'

test('every 15-second stage changes on active time and its travel fits current Camp rules', () => {
  assert.equal(courseStages.length, 20)
  for (const { start, level, territory, pace } of courseStages) {
    assert.equal(stageAt(start).level, level)
    assert.equal(regionAt(start).index, territory)
    if (start) {
      assert.equal(stageAt(start - tickSeconds).level, level - 1)
      assert.ok(courseStages[level - 2].pace < pace)
    }
  }
  assert.equal(stageAt(14_400).level, 20)
  const run = newRun()
  const clock = createFixedClock()
  for (let i = 0; i < 1499; i++) clock.advance(.01, dt => advance(run, dt))
  assert.equal(stageAt(run.elapsed).level, 1)
  clock.reset()
  assert.equal(stageAt(run.elapsed).level, 1)
  clock.advance(.033, dt => advance(run, dt))
  assert.equal(stageAt(run.elapsed).level, 2)
  for (let time = 2; time <= 14_400; time += .857) {
    const durationMs = Math.round(time * 1000)
    const distance = Math.floor(distanceAtTime(durationMs / 1000))
    assert.ok(speedAtTime(time) < 29)
    assert.ok(canPostRun({ durationMs, distance, score: distance, retrieves: 0 }))
  }
})

test('all 280 notices remain reachable without short repeats and fit in three lines', () => {
  const catalog = Object.values(signMessages).flat()
  assert.equal(catalog.length, 280)
  assert.equal(new Set(catalog.map(value => value.replace(/[^A-Z]/g, ''))).size, catalog.length)
  const reached = new Set()
  const categories = Array.from({ length: 10 }, () => ({}))
  let seed = 78654
  for (let run = 0; run < 1120; run++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const recent = []
    const length = run < 50 ? 250 : 20
    for (let ordinal = 0; ordinal < length; ordinal++) {
      const anchor = { ordinal, distance: signDistance(ordinal) }
      const sign = trailSign(anchor, seed)
      assert.deepEqual(trailSign(anchor, seed), sign)
      assert.ok(!recent.includes(sign.line), sign.line)
      recent.push(sign.line)
      if (recent.length > 19) recent.shift()
      reached.add(sign.line)
      if (ordinal < 13) {
        const group = categories[sign.region]
        group[sign.category] = (group[sign.category] ?? 0) + 1
      }
    }
  }
  assert.deepEqual(reached, new Set(catalog))
  assert.ok(categories[4].farm > 65)
  assert.ok(categories[8].canada > 20)
  assert.ok(categories[1].marsh > 20)
  const measure = line => [...line].reduce((n, symbol) => n + (symbol === ' ' ? 29 : 60), 0)
  for (const message of catalog) {
    const fit = fitSignLettering(message, measure)
    assert.equal(fit.lines.join(' '), message)
    assert.ok(fit.lines.length <= 3 && fit.size >= 43)
    assert.ok(fit.lines.every(line => measure(line) * fit.size * fit.scale / 100 <= 450.001))
    assert.ok(fit.lines.length * fit.lineHeight <= 194)
  }
})

test('notice placement stays off the outside lanes and unclustered through the speed limit', () => {
  function timeAt(distance) {
    let low = 0, high = distance / 11
    for (let i = 0; i < 38; i++) {
      const middle = (low + high) * .5
      if (distanceAtTime(middle) < distance) low = middle
      else high = middle
    }
    return (low + high) * .5
  }
  let previous = 0
  const sides = new Set()
  for (let ordinal = 0; ordinal < 150; ordinal++) {
    const distance = signDistance(ordinal)
    const tile = Math.floor(distance / segmentLength)
    const anchor = signAnchor(tile, () => -.17)
    assert.equal(anchor.distance, distance)
    assert.equal(anchor.ordinal, ordinal)
    assert.equal(anchor.y, -.17)
    assert.ok(Math.abs(anchor.width) - 2.76 / 2 > laneWidth + .55)
    sides.add(Math.sign(anchor.width))
    const time = timeAt(distance)
    assert.ok(time - previous >= 15 && time - previous <= 29)
    assert.equal(signAnchor(tile + 1, () => 0), null)
    previous = time
  }
  assert.equal(sides.size, 2)
})

test('sign art and drifting leaves reuse allocations across trail recycling and quality changes', () => {
  let canvasCount = 0
  let painted = 0
  const ctx = { clearRect() { painted++ }, createLinearGradient: () => ({ addColorStop() {} }),
    fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, bezierCurveTo() {}, stroke() {},
    arc() {}, fill() {}, fillText() {}, strokeText() {}, save() {}, restore() {}, scale() {}, translate() {},
    measureText: line => ({ width: line.length * 53 }) }
  const scene = new Scene()
  const signs = createTrailSigns(scene, () => {
    canvasCount++
    return { getContext: () => ctx }
  })
  const models = [...scene.children]
  const texture = models[0].children.at(-1).material.map
  const paint = (ordinal, from, seed = 7) => {
    const tile = Math.floor(signDistance(ordinal) / segmentLength)
    signs.begin()
    signs.show(signAnchor(tile, () => -.15), from, seed)
    signs.finish()
  }
  const first = signDistance(0)
  paint(0, first - 11)
  paint(0, first - 9)
  assert.equal(painted, 1)
  assert.equal(models[0].visible, true)
  const relative = models[0].position.x - centerAt(first) + centerAt(first - 9)
  const offset = relative / Math.cos(headingAt(first))
  const turn = models[0].rotation.y - headingAt(first)
  assert.ok(Math.abs(offset) > 4)
  assert.ok(offset * turn < 0)
  const after = texture.version
  const next = signDistance(2)
  paint(2, next - 12)
  assert.equal(painted, 2)
  assert.equal(texture.version, after + 1)
  paint(2, next - 7, 53521)
  assert.equal(painted, 3)
  paint(2, next + 10)
  assert.equal(models[0].visible, false)
  assert.equal(canvasCount, signSlots)
  assert.deepEqual(scene.children, models)

  const leaves = createDriftingLeaves(scene)
  const points = scene.children.at(-1)
  const position = points.geometry.attributes.position
  const weather = { wind: .5, sky: new Color() }
  leaves(4, 980, 45, weather, 1, false)
  assert.equal(points.geometry.drawRange.count, 28)
  assert.equal(points.visible, true)
  assert.equal(points.material.depthWrite, false)
  leaves(4, 985, 46, weather, 2, false)
  assert.equal(points.geometry.drawRange.count, 54)
  assert.equal(points.geometry.attributes.position, position)
  leaves(4, 985, 46, weather, 0, false)
  assert.equal(points.visible, false)
  leaves(4, 985, 46, weather, 2, true)
  assert.equal(points.visible, false)
  leaves(9, 985, 46, weather, 2, false)
  assert.equal(points.visible, false)
})

test('each new fallen timber reads tall and uses the same dodge-only swept hull', () => {
  const geometry = fallenTimbers.map((_, variant) => fallenTimberModel(variant))
  assert.equal(new Set(geometry).size, 3)
  for (const [variant, model] of geometry.entries()) {
    assert.equal(fallenTimberModel(variant), model)
    assert.ok(model.index.count / 3 < 1700)
    assert.ok(model.boundingBox.max.y > 2.10 && model.boundingBox.max.y < 2.39)
    assert.ok(model.boundingBox.min.y < .06)
    assert.ok(model.boundingBox.max.x - model.boundingBox.min.x > 1.65)
    assert.ok(model.attributes.fieldLayer.array.includes(3))
    const target = 6118 + variant / 4
    const hazard = { type: 'fallen', distance: target, lane: 0, hazard: true }
    for (const action of ['slide', 'jump']) {
      for (const timing of [-.23, -.14, -.05, 0, .085, .17, .25]) {
        const run = { ...newRun(), distance: target - 24, speed: speedAtTime(289), elapsed: 289 }
        let fired = false
        let hit = false
        const before = {}
        while (run.distance < target + 3 && !hit) {
          if (!fired && (target - run.distance) / run.speed < .45 + timing) fired = act(run, action)
          Object.assign(before, run)
          advance(run, tickSeconds)
          hit = traceContact(before, run, hazard)
        }
        assert.ok(hit, model.name + ' allowed ' + action + ' at ' + timing)
      }
    }
    for (const [move, lane] of [['left', -1], ['right', 1]]) {
      const run = { ...newRun(), distance: target - 14, speed: speedAtTime(289), elapsed: 289 }
      act(run, move)
      const before = {}
      while (run.distance < target + 3) {
        Object.assign(before, run)
        advance(run, tickSeconds)
        assert.equal(traceContact(before, run, hazard), false)
      }
      assert.equal(run.lane, lane)
    }
  }
  assert.deepEqual(new Set(Array.from({ length: 12 }, (_, n) => fallenVariant(6118 + n * .127, n % 3 - 1))), new Set([0, 1, 2]))
})

test('northern tree stands include three live silhouettes and dead snags with bounded geometry', () => {
  for (const territory of ['boreal', 'mountain']) {
    const species = new Set(Array.from({ length: 15 }, (_, tile) => forestProfileAt(territory, tile)).flat())
    assert.ok(species.has('snag') && species.has('spruce') && species.has('fir') && species.has('jackPine'))
    for (const kind of species) {
      const mesh = forestModel(kind, true)
      assert.equal(forestModel(kind, true), mesh)
      assert.ok(mesh.index.count / 3 < 1000)
      assert.ok(mesh.attributes.position.array.every(Number.isFinite))
    }
  }
})

test('small timber forms have distinct shared meshes and retain their intended visual envelope', () => {
  const bounds = { log: [.55, .73], root: [.30, .49], drift: [.48, .70], tree: [1.14, 1.34] }
  const meshes = new Set()
  for (const [kind, [min, max]] of Object.entries(bounds)) {
    const mesh = trailTimber(kind)
    assert.equal(trailTimber(kind), mesh)
    assert.ok(mesh.boundingBox.max.y >= min && mesh.boundingBox.max.y <= max)
    assert.ok(mesh.index.count / 3 < 500)
    assert.ok(mesh.attributes.fieldLayer.array.includes(3))
    meshes.add(mesh)
  }
  assert.equal(meshes.size, 4)
})
