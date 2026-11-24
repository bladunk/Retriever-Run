import assert from 'node:assert/strict'
import { test } from 'node:test'
import { Color, Group, Scene } from 'three'
import { canPostRun } from '../src/camp-rules.js'
import { traceContact } from '../src/collision.js'
import { fallenTimberModel, fallenTimbers, fallenVariant } from '../src/fallen-timber.js'
import { forestModel, forestProfileAt } from '../src/forest-models.js'
import { courseStages, distanceAtTime, speedAtTime, stageAt } from '../src/difficulty.js'
import { createDriftingLeaves } from '../src/drifting-leaves.js'
import { regionAt } from '../src/expedition.js'
import { act, advance, newRun } from '../src/runner.js'
import { createPostedTimber, createTrailSigns } from '../src/sign-scenery.js'
import { signMessages } from '../src/sign-lines.js'
import { signAnchor, signInterval } from '../src/sign-placement.js'
import { signSlots, signTextRows, trailSign } from '../src/trail-signs.js'
import { createFixedClock, tickSeconds } from '../src/timing.js'
import { centerAt, headingAt } from '../src/trail.js'

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

test('280 original trail messages have a readable two-line layout and are reachable', () => {
  const all = Object.values(signMessages).flat()
  assert.equal(all.length, 280)
  assert.equal(new Set(all.map(value => value.replace(/[^A-Z]/g, ''))).size, all.length)
  const reached = new Set()
  let next = 78654
  for (let run = 0; run < 200; run++) {
    next = (Math.imul(next, 1664525) + 1013904223) >>> 0
    const recent = []
    for (let tile = 0; tile < 750; tile += signInterval) {
      const notice = trailSign(tile, next)
      assert.deepEqual(trailSign(tile, next), notice)
      assert.ok(!recent.includes(notice.line), notice.line)
      recent.push(notice.line)
      if (recent.length > 19) recent.shift()
      reached.add(notice.line)
    }
  }
  assert.deepEqual(reached, new Set(all))
  for (const value of all) {
    const rows = signTextRows(value, line => line.length, 28)
    assert.equal(rows.join(' '), value)
    assert.ok(rows.every(line => line.length <= 28), value)
  }
  const watch = (territory, category) => Array.from({ length: 200 }, (_, n) => trailSign(n * signInterval, 7))
    .filter(sign => sign.region === territory && sign.category === category).length
  assert.ok(watch(4, 'farm') > watch(0, 'farm'))
  assert.ok(watch(9, 'canada') > watch(4, 'canada'))
  assert.ok(watch(1, 'marsh') > watch(9, 'marsh'))
})

test('sign art and drifting leaves reuse allocations across trail recycling and quality changes', () => {
  let canvasCount = 0
  let painted = 0
  const ctx = { clearRect() { painted++ }, createLinearGradient: () => ({ addColorStop() {} }),
    fillRect() {}, strokeRect() {}, beginPath() {}, moveTo() {}, bezierCurveTo() {}, stroke() {},
    arc() {}, fill() {}, fillText() {}, measureText: line => ({ width: line.length * 15 }) }
  const scene = new Scene()
  const signs = createTrailSigns(scene, () => {
    canvasCount++
    return { getContext: () => ctx }
  })
  const models = [...scene.children]
  const texture = models[0].children.at(-1).material.map
  const paint = (tile, from, seed = 7) => {
    signs.begin()
    signs.show(signAnchor(tile, () => -.15), from, seed)
    signs.finish()
  }
  paint(0, 0)
  paint(0, 2)
  assert.equal(painted, 1)
  assert.equal(models[0].visible, true)
  const relative = models[0].position.x - centerAt(13) + centerAt(2)
  assert.ok(relative / Math.cos(headingAt(13)) < -4)
  const after = texture.version
  paint(9, 270)
  assert.equal(painted, 2)
  assert.equal(texture.version, after + 1)
  paint(9, 280, 53521)
  assert.equal(painted, 3)
  paint(9, 380)
  assert.equal(models[0].visible, false)
  assert.equal(canvasCount, signSlots)
  assert.deepEqual(scene.children, models)

  const posted = createPostedTimber(() => {
    canvasCount++
    return { getContext: () => ctx }
  })
  const model = new Group()
  const notice = { type: 'branch', model, lane: 0, distance: 25 }
  posted([notice], 2, 62)
  const plate = model.children[0]
  assert.equal(plate.name, 'Posted timber lettering')
  const postedPaint = painted
  posted([notice], 3, 62)
  assert.equal(painted, postedPaint)
  posted([], 26, 62)
  assert.equal(plate.parent, null)
  posted([notice], 25, 62)
  assert.equal(model.children[0], plate)
  assert.equal(painted, postedPaint)
  assert.equal(canvasCount, signSlots + 2)

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
