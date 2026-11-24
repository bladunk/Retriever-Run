import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Matrix4, PerspectiveCamera, Scene, Vector3 } from 'three'
import { cameraLayout, newCameraState, updateFollow } from '../src/camera.js'
import { swipeDirection } from '../src/gesture.js'
import { normalizeProfile } from '../src/profile.js'
import { adaptivePresentation, adaptiveQuality, graphics, pixelRatio } from '../src/quality.js'
import { laneWidth } from '../src/runner.js'
import { headingAt, placeOnTrail } from '../src/trail.js'
import { createWildlife } from '../src/wildlife.js'

test('portrait camera keeps all three lanes and upcoming hazards in frame at full speed', () => {
  for (const [width, height] of [[320, 740], [375, 667], [390, 844], [430, 932]]) {
    const aspect = width / height
    const layout = cameraLayout(aspect)
    const rig = newCameraState()
    const camera = new PerspectiveCamera(layout.fov, aspect, .1, 190)
    const target = new Vector3()
    for (let frame = 0; frame < 2200; frame++) {
      const distance = frame * .45
      const lane = (Math.floor(frame / 22) % 3 - 1) * laneWidth
      const previous = rig.heading
      updateFollow(rig, layout, distance, lane, 1 / 60, true)
      if (previous !== null) assert.ok(Math.abs(rig.heading - previous) <= .311 / 60)
      assert.equal(rig.y, layout.height)
      assert.equal(rig.ty, layout.height - Math.tan(layout.pitch) * 24)
      camera.position.set(rig.x, rig.y, rig.z)
      camera.lookAt(rig.tx, rig.ty, rig.tz)
      camera.updateMatrixWorld()
      placeOnTrail(target, distance, lane, distance)
      target.y = .82
      target.project(camera)
      assert.ok(Math.abs(target.x) < .86)
      assert.ok((1 - target.y) / 2 > 2 / 3)
      assert.ok((1 - target.y) / 2 < .77)
      // Distant hazards remain visible on both sides without panning to the lane.
      for (const ahead of [12, 22, 37]) {
        for (const side of [-1, 1]) {
          placeOnTrail(target, distance + ahead, side * laneWidth, distance)
          target.y = .5
          target.project(camera)
          assert.ok(Math.abs(target.x) < .94)
        }
      }
      assert.ok(Math.abs(camera.matrix.elements[1]) < 1e-10, 'camera roll')
    }
  }
})

test('comfort damps lane tracking further and the trail has no sharp heading transitions', () => {
  const layout = cameraLayout(844 / 390)
  const comfort = newCameraState()
  const standard = newCameraState()
  for (let frame = 0; frame < 60; frame++) {
    updateFollow(comfort, layout, 170 + frame * .4, laneWidth, 1 / 60, true)
    updateFollow(standard, layout, 170 + frame * .4, laneWidth, 1 / 60, false)
  }
  assert.ok(Math.abs(comfort.offset) < .22)
  assert.ok(standard.offset > comfort.offset * 2)
  for (let distance = 0; distance < 2000; distance++) assert.ok(Math.abs(headingAt(distance + 1) - headingAt(distance)) < .017)
})

test('short and diagonal gestures wait for intent while cardinal swipes respond during movement', () => {
  assert.equal(swipeDirection(8, 5, 390), null)
  assert.equal(swipeDirection(18, 9, 390), 'right')
  assert.equal(swipeDirection(-19, 7, 390), 'left')
  assert.equal(swipeDirection(4, -18, 390), 'jump')
  assert.equal(swipeDirection(4, 19, 390), 'slide')
  assert.equal(swipeDirection(20, 19, 390), null)
  assert.equal(swipeDirection(20, 19, 390, true), null)
})

test('quality caps resolution and adapts down and up after sustained frame pressure', () => {
  const select = adaptiveQuality()
  assert.equal(select(1 / 60), 'balanced')
  for (let i = 0; i < 120; i++) select(1 / 30)
  assert.equal(select(1 / 30), 'low')
  for (let i = 0; i < 2400; i++) select(1 / 90)
  assert.equal(select(1 / 90), 'high')
  assert.ok(pixelRatio(390, 844, 3, graphics.high) > pixelRatio(390, 844, 3, graphics.balanced))
  assert.ok(pixelRatio(1920, 1200, 2, graphics.low) < .6)
})

test('prior profiles retain records, cosmetics and settings with comfort enabled by default', () => {
  const old = { score: 810, distance: 608, best: 911, farthest: 631, retrieves: 4, streak: 23,
    outfit: 'copper', quality: 'high', sfx: false, soundtrack: true }
  const { sfx, soundtrack, ...progress } = old
  assert.deepEqual(normalizeProfile(old), {
    ...progress, swipe: 'standard', comfort: true, haptics: false, masterVolume: .9, musicVolume: .55,
    musicRestore: .55, wildlifeVolume: 0, ambientVolume: 0, effectsVolume: 0,
  })
  assert.equal(normalizeProfile({ ...old, comfort: false, quality: 'balanced' }).comfort, false)
  assert.equal(normalizeProfile({ quality: 'balanced' }).quality, 'balanced')
})

test('the compressed Labrador includes an actual skin, embedded coat and each pose', async () => {
  const bytes = await readFile(new URL('../src/assets/labrador.glb', import.meta.url))
  assert.equal(bytes.toString('ascii', 0, 4), 'glTF')
  const size = bytes.readUInt32LE(12)
  const asset = JSON.parse(bytes.toString('utf8', 20, 20 + size))
  assert.ok(bytes.length < 350_000)
  assert.ok(asset.skins[0].joints.length > 30)
  assert.ok(asset.meshes[0].primitives[0].attributes.WEIGHTS_0 !== undefined)
  assert.equal(asset.images[0].mimeType, 'image/jpeg')
  assert.deepEqual(asset.animations.map((clip) => clip.name).sort(), ['Gallop', 'Idle', 'Jump', 'Low'])
})

test('wildlife continues to recycle moving geese with independently flapping wings', () => {
  const scene = new Scene()
  const calls = []
  const update = createWildlife(scene, (bird, cue) => calls.push({ bird, ...cue }))
  update(84, 12, false, true)
  const wings = scene.children[1]
  const tips = scene.children[2]
  const initial = new Matrix4()
  const later = new Matrix4()
  assert.equal(wings.count, 14)
  wings.getMatrixAt(0, initial)
  const tipInitial = new Matrix4()
  const tipLater = new Matrix4()
  tips.getMatrixAt(0, tipInitial)
  tipInitial.premultiply(initial.clone().invert())
  update(84.14, 12, false, true)
  wings.getMatrixAt(0, later)
  assert.notDeepEqual(later.elements, initial.elements)
  tips.getMatrixAt(0, tipLater)
  tipLater.premultiply(later.clone().invert())
  assert.notDeepEqual(tipInitial.elements, tipLater.elements)
  assert.equal(scene.children[1], wings)
  assert.equal(scene.children.filter(batch => batch.visible).length, 3)
  assert.deepEqual(calls.map(cue => cue.bird), ['goose'])
  assert.ok(calls[0].distance > 20)
  update(14, 12, false, false)
  assert.equal(wings.visible, false)
  assert.equal(scene.children[3].visible, true)
  update(14.1, 12, false, true)
  update(16.4, 12, false, true)
  update(16.6, 13, false, true)
  assert.deepEqual(calls.map(cue => cue.bird), ['goose', 'mallard', 'mallard'])
  assert.equal(calls[2].wings, true)
  assert.equal(calls[2].vocal, false)
  assert.ok(calls[2].distance < calls[1].distance)
})

test('sustained slow Auto Low caps presentation at 30 Hz independently of simulation', () => {
  const draw = adaptivePresentation()
  let timestamp = 0
  for (let i = 0; i < 65; i++) {
    timestamp += 34
    draw(timestamp, .034, true)
  }
  let presented = 0
  for (let i = 0; i < 60; i++) {
    timestamp += 1000 / 60
    presented += Number(draw(timestamp, 1 / 60, true))
  }
  assert.ok(presented >= 29 && presented <= 31)
  for (let i = 0; i < 60; i++) {
    timestamp += 1000 / 60
    assert.equal(draw(timestamp, 1 / 60, false), true)
  }
})


test('the explicit Battery Saver preset uses a 30 Hz presentation budget immediately', () => {
  const present = adaptivePresentation()
  let renders = 0
  for (let i = 0; i < 120; i++) renders += Number(present(i * (1000 / 60), 1 / 60, false, true))
  assert.equal(renders, 60)
  assert.equal(present(2010, 1 / 60, false, false), true)
  assert.ok(graphics.low.pixels < graphics.balanced.pixels)
})
