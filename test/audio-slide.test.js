import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Group, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { obstacleVolumes, playerFrame, playerVolumes, traceContact, volumeY } from '../src/collision.js'
import { createLabradorRig } from '../src/lab-rig.js'
import { beatSeconds, composeBar, loopBeats, musicIntensity, musicMix } from '../src/marshland.js'
import { createMusicTransport, loopSeconds } from '../src/music-transport.js'
import { audioDefaults, normalizeProfile } from '../src/profile.js'
import { act, advance, newRun, speedAtTime } from '../src/runner.js'
import { centerAt, headingAt, laneWidth, trailHeight } from '../src/trail.js'

test('Marshland Run repeats after 32 bars and increases mix intensity without changing the score', () => {
  assert.equal(60 / beatSeconds, 120)
  assert.ok(loopBeats * beatSeconds > 60 && loopBeats * beatSeconds < 90)
  for (let bar = 0; bar < 32; bar++) {
    const events = composeBar(bar)
    assert.deepEqual(events, composeBar(bar + 32))
    assert.ok(new Set(events.map(note => note.layer)).size >= 7)
    assert.ok(events.every(note => note.beat >= 0 && note.beat < 4 && note.length > 0))
    assert.ok(events.every((note, index) => !index || note.beat >= events[index - 1].beat))
  }
  assert.notDeepEqual(composeBar(0), composeBar(16))
  for (const edge of [30, 60, 90, 120]) {
    const previous = musicIntensity(edge - .01)
    const next = musicIntensity(edge)
    assert.equal(next[0], previous[0])
    assert.ok(next.some((level, index) => level > previous[index]))
    assert.ok(next.every((level, index) => level >= previous[index]))
  }
  assert.deepEqual(musicIntensity(150), musicIntensity(120))
  assert.equal(musicIntensity(0)[3], 0)
  assert.ok(musicIntensity(30)[3] > 0)
  assert.ok(musicIntensity(60)[5] > 0)
  assert.ok(musicMix('lodge', 0)[7] > musicMix('title', 0)[7])
  assert.equal(musicMix('lodge', 120)[2], 0)
  assert.ok(composeBar(7).some(note => note.instrument === 'harmonica'))
})

test('the audio clock transport wraps on the beat without replaying already scheduled notes', () => {
  const transport = createMusicTransport()
  const recorded = []
  const schedule = (note, at) => recorded.push({ at, note })
  for (let time = 0; time < loopSeconds * 2 + 1; time += .065) {
    transport(time, schedule)
    transport(time, schedule)
  }
  const downbeats = recorded.filter(({ note }) => note.at === 0 && note.instrument === 'bass' && note.layer === 1)
  assert.equal(downbeats.length, 3)
  for (let index = 1; index < downbeats.length; index++) {
    assert.ok(Math.abs(downbeats[index].at - downbeats[index - 1].at - loopSeconds) < .0001)
  }
  const count = recorded.length
  transport(160, schedule)
  assert.ok(recorded.length > count)
  assert.ok(recorded.slice(count).every(({ at }) => at >= 160))
})

test('the mixer retains old mute settings and clamps independent volume values', () => {
  assert.equal(normalizeProfile(null).musicVolume, audioDefaults.musicVolume)
  const migrated = normalizeProfile({ soundtrack: false, sfx: false, score: 41, best: 94, retrieves: 7 })
  assert.equal(migrated.musicVolume, 0)
  assert.equal(migrated.wildlifeVolume, 0)
  assert.equal(migrated.effectsVolume, 0)
  assert.equal(migrated.best, 94)
  assert.equal(migrated.retrieves, 7)
  const mixed = normalizeProfile({ soundtrack: false, sfx: false, musicVolume: .31,
    wildlifeVolume: 1.8, effectsVolume: -.3, masterVolume: 0 })
  assert.equal(mixed.masterVolume, 0)
  assert.equal(mixed.musicVolume, .31)
  assert.equal(mixed.wildlifeVolume, 1)
  assert.equal(mixed.effectsVolume, 0)
  assert.deepEqual(normalizeProfile(JSON.parse(JSON.stringify(mixed))), mixed)
})

async function loadRig() {
  // The texture is immaterial to this test. The original mesh, skin weights and
  // animation clips are decoded and sampled through the same loader as the game.
  globalThis.self = globalThis
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} })
  try {
    const file = await readFile(new URL('../src/assets/labrador.glb', import.meta.url))
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')
    return createLabradorRig(gltf)
  } finally {
    delete globalThis.self
    delete globalThis.createImageBitmap
  }
}

test('the skinned Labrador clears the terrain and overhead envelope through real slide clips', async () => {
  const rig = await loadRig()
  const player = new Group()
  player.add(rig.root)
  let skin
  rig.root.traverse(node => { if (node.isSkinnedMesh) skin = node })
  const point = new Vector3()
  const frame = {}
  const beam = obstacleVolumes({ type: 'branch', wide: true })[0]
  const head = playerVolumes().find(part => part.name === 'head')
  const collisionTop = volumeY(head, 1) + head.hy * .58

  for (const [distance, lane, elapsed] of [[0, 0, 0], [49, -1, 16], [150, 1, 36], [278, 0, 86], [606, -1, 120]]) {
    const run = { ...newRun(), distance, lane, x: lane * laneWidth, elapsed, speed: speedAtTime(elapsed) }
    rig.reset()
    let lastMax
    let checkedFullSlide = false
    for (let n = 0; n < 65; n++) {
      if (n === 5) assert.ok(act(run, 'slide'))
      advance(run, 1 / 60)
      playerFrame(frame, run, run.distance)
      const floor = trailHeight(run.distance, run.x)
      player.position.set(frame.x, floor, frame.z)
      player.rotation.y = frame.angle
      player.updateMatrixWorld(true)
      rig.pose({ dt: 1 / 60, time: run.elapsed, stride: n * .22, airborne: false, jumpPhase: 1,
        sliding: frame.depth, idle: false, turn: 0, landing: 0, ground: floor })
      player.updateMatrixWorld(true)
      let max = -Infinity
      let clearance = Infinity
      for (let i = 0; i < skin.geometry.attributes.position.count; i++) {
        skin.getVertexPosition(i, point).applyMatrix4(skin.matrixWorld)
        const at = run.distance - point.z
        const lateral = (point.x - centerAt(at) + centerAt(run.distance)) / Math.cos(headingAt(at))
        clearance = Math.min(clearance, point.y - (trailHeight(at, lateral) - .008))
        max = Math.max(max, point.y - floor)
      }
      assert.ok(clearance >= -.005, `distance ${run.distance}, depth ${frame.depth}, floor clearance ${clearance}`)
      if (lastMax !== undefined) assert.ok(Math.abs(max - lastMax) < .24, 'smooth pose blending')
      lastMax = max
      assert.equal(player.position.y, floor)
      if (frame.depth === 1) {
        assert.ok(max < beam.y - beam.hy, 'mesh clears the overhead timber')
        assert.ok(Math.abs(max - collisionTop) < .08, 'crouched mesh and collision head agree')
        checkedFullSlide = true
      }
    }
    assert.ok(checkedFullSlide)
  }
})

test('at full speed a swept crouch clears overhead timber and still hits ground obstacles', () => {
  const start = { ...newRun(), distance: 603.7, lane: -1, x: -laneWidth, elapsed: 120,
    speed: speedAtTime(120) }
  const end = { ...start, distance: 608.3 }
  const obstacle = { distance: 606, lane: -1, hazard: true }
  assert.ok(traceContact(start, end, { ...obstacle, type: 'branch', wide: true }))
  const sliding = { ...start, slide: .62 }
  const slidingEnd = { ...end, slide: .45 }
  assert.equal(traceContact(sliding, slidingEnd, { ...obstacle, type: 'branch', wide: true }), false)
  for (const type of ['log', 'root', 'tree', 'fence', 'puddle', 'stream']) {
    assert.ok(traceContact(sliding, slidingEnd, { ...obstacle, type }), type)
  }
})
