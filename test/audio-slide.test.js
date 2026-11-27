import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { Group, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { obstacleVolumes, playerFrame, playerVolumes, traceContact, volumeY } from '../src/collision.js'
import { createLabradorRig } from '../src/lab-rig.js'
import { gearAppearance } from '../src/kennel-material.js'
import { createRunControls } from '../src/run-controls.js'
import { beatSeconds, composeBar, loopBeats, musicIntensity, musicMix } from '../src/marshland.js'
import { createMusicTransport, loopSeconds } from '../src/music-transport.js'
import { audioDefaults, normalizeProfile } from '../src/profile.js'
import { act, advance, jumpDuration, newRun, speedAtTime } from '../src/runner.js'
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

async function loadRig(createPickup) {
  // The texture is immaterial to this test. The original mesh, skin weights and
  // animation clips are decoded and sampled through the same loader as the game.
  globalThis.self = globalThis
  globalThis.createImageBitmap = async () => ({ width: 1, height: 1, close() {} })
  try {
    const file = await readFile(new URL('../src/assets/labrador.glb', import.meta.url))
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
      .parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')
    return createLabradorRig(gltf, 'lab', createPickup)
  } finally {
    delete globalThis.self
    delete globalThis.createImageBitmap
  }
}

test('the retrieve pose uses one neck-mounted prop and clears it on the title', async () => {
  const birds = new Map()
  const rig = await loadRig((mouth, species) => {
    const bird = new Group()
    birds.set(species, bird)
    mouth.add(bird)
    return bird
  })
  const pose = { dt: 1 / 60, time: 2, stride: 1.2, airborne: false, jumpPhase: 1,
    sliding: 0, idle: false, turn: 0, landing: 0, ground: 0, retrieve: 'mallard' }
  rig.pose({ ...pose, sinceRetrieve: .04 })
  assert.ok([...birds.values()].every(bird => !bird.visible))
  rig.pose({ ...pose, sinceRetrieve: .37 })
  assert.ok(birds.get('mallard').visible)
  assert.equal(birds.get('mallard').parent.parent.name, 'Head')
  assert.ok(!birds.get('pheasant').visible)
  rig.pose({ ...pose, idle: true, sinceRetrieve: .44 })
  assert.ok([...birds.values()].every(bird => !bird.visible))
})

test('the skinned Labrador clears the terrain and overhead envelope through real slide clips', async () => {
  const rig = await loadRig()
  const player = new Group()
  player.add(rig.root)
  rig.appearance(gearAppearance({ collar: 'brass-collar', vest: 'marsh-vest' }))
  const vest = rig.root.getObjectByName('WorkingDogVest')
  let skin
  rig.root.traverse(node => { if (node.isSkinnedMesh && node.name !== 'WorkingDogVest') skin = node })
  const point = new Vector3()
  const frame = {}
  const overhead = obstacleVolumes({ type: 'branch' }).filter(part => Math.abs(part.x) < .43 && part.y < 1.8)
  const soffit = Math.min(...overhead.map(part => part.y - part.hy))
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
      for (const mesh of [skin, vest]) {
        for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
          mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld)
          const at = run.distance - point.z
          const lateral = (point.x - centerAt(at) + centerAt(run.distance)) / Math.cos(headingAt(at))
          clearance = Math.min(clearance, point.y - (trailHeight(at, lateral) - .008))
          max = Math.max(max, point.y - floor)
        }
      }
      assert.ok(clearance >= -.005, `distance ${run.distance}, depth ${frame.depth}, floor clearance ${clearance}`)
      if (lastMax !== undefined) assert.ok(Math.abs(max - lastMax) < .24, 'smooth pose blending')
      lastMax = max
      assert.equal(player.position.y, floor)
      if (frame.depth === 1) {
        assert.ok(max < soffit, 'mesh clears the overhead timber')
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
  assert.ok(traceContact(start, end, { ...obstacle, type: 'branch' }))
  const sliding = { ...start, slide: .62 }
  const slidingEnd = { ...end, slide: .45 }
  assert.equal(traceContact(sliding, slidingEnd, { ...obstacle, type: 'branch' }), false)
  for (const type of ['log', 'root', 'tree', 'fence', 'puddle', 'stream']) {
    assert.ok(traceContact(sliding, slidingEnd, { ...obstacle, type }), type)
  }
})

test('rapid jump and slide transitions retain skinned ground clearance after a long run', async () => {
  const rig = await loadRig()
  rig.appearance(gearAppearance({ coat: 'fox-red', collar: 'brass-collar', vest: 'marsh-vest' }))
  const buckle = rig.root.getObjectByName('KennelBuckle')
  assert.equal(buckle.parent.name, 'Neck1')
  assert.equal(buckle.visible, true)
  const player = new Group()
  player.add(rig.root)
  let skin
  rig.root.traverse(node => { if (node.isSkinnedMesh && node.name !== 'WorkingDogVest') skin = node })
  const point = new Vector3()
  const frame = {}
  const run = { ...newRun(), distance: 38_260, elapsed: 1380, speed: speedAtTime(1380) }
  const controls = createRunControls()
  let animation = 'jump'
  let changes = 0
  let landing = 0
  controls.enqueue(animation)
  for (let index = 0; index < 240; index++) {
    if (run[animation] > .07 && run[animation] < .11) controls.enqueue(animation === 'jump' ? 'slide' : 'jump')
    controls.apply(run, move => { animation = move; changes++ })
    const wasAirborne = run.jump > 0
    advance(run, 1 / 60)
    const ground = trailHeight(run.distance, run.x)
    landing = wasAirborne && !run.jump ? 1 : landing * .81
    playerFrame(frame, run, run.distance)
    player.position.set(frame.x, frame.y, frame.z)
    player.rotation.y = frame.angle
    player.updateMatrixWorld(true)
    rig.pose({ time: run.elapsed, dt: 1 / 60, stride: index * .24, airborne: run.jump > 0,
      jumpPhase: run.jump ? 1 - run.jump / jumpDuration : 1, sliding: frame.depth, idle: false,
      turn: 0, landing, ground })
    player.updateMatrixWorld(true)
    let clearance = Infinity
    for (const mesh of [skin, rig.root.getObjectByName('WorkingDogVest')]) {
      for (let vertex = 0; vertex < mesh.geometry.attributes.position.count; vertex++) {
        mesh.getVertexPosition(vertex, point).applyMatrix4(mesh.matrixWorld)
        const at = run.distance - point.z
        const lateral = (point.x - centerAt(at) + centerAt(run.distance)) / Math.cos(headingAt(at))
        clearance = Math.min(clearance, point.y - (trailHeight(at, lateral) - .008))
      }
    }
    assert.ok(clearance >= -.008, `frame ${index}, depth ${frame.depth}, clearance ${clearance}`)
  }
  assert.ok(changes >= 4)
})

test('all six vest styles share a separate weighted shell and leave the collision body and coat intact', async () => {
  const rig = await loadRig()
  rig.appearance(gearAppearance({ vest: 'canvas-vest' }))
  const vest = rig.root.getObjectByName('WorkingDogVest')
  const body = vest.parent
  const skin = body.geometry
  const bounds = playerVolumes().map(volume => ({ ...volume }))
  const material = vest.material
  const garment = vest.geometry
  const points = garment.getAttribute('fitRest')
  assert.ok(garment.index.count / 3 < 6500)
  assert.equal(vest.skeleton, body.skeleton)
  rig.appearance(gearAppearance())
  assert.ok(!vest.visible)
  let chest = 0
  let hem = 0
  for (let i = 0; i < points.count; i++) {
    assert.ok(points.getY(i) >= .999 && points.getY(i) < 2.4)
    assert.ok(points.getZ(i) >= -.901 && points.getZ(i) <= 1.75)
    if (points.getZ(i) > 1.45 && points.getY(i) < 1.81 && Math.abs(points.getX(i)) < .25) chest++
    if (points.getW(i) < 0) hem++
    const weight = garment.getAttribute('skinWeight')
    const sum = weight.getX(i) + weight.getY(i) + weight.getZ(i) + weight.getW(i)
    assert.ok(Math.abs(sum - 1) < 1e-6)
  }
  assert.ok(chest > 20 && hem > 40, `chest: ${chest}, hem: ${hem}`)
  const colors = new Set()
  for (const id of ['canvas', 'marsh', 'seasoned', 'blaze', 'master', 'legend']) {
    rig.appearance(gearAppearance({ coat: 'fox-red', vest: id + '-vest' }))
    assert.ok(vest.visible)
    colors.add(material.color.getHex())
    assert.equal(vest.material, material)
    assert.equal(vest.geometry, garment)
    assert.equal(body.geometry, skin)
    assert.equal(body.material.color.getHex(), 0xbb8053)
    assert.deepEqual(playerVolumes(), bounds)
  }
  assert.equal(colors.size, 6)
  rig.appearance(gearAppearance())
  assert.ok(!vest.visible)
  assert.equal(body.material.color.getHex(), 0xffffff)
})

test('hemmed neckwear stays attached through inspection, movement and full-catalog swaps without duplicating the vest', async () => {
  const { kennelCatalog } = await import('../src/kennel-catalog.js')
  const rig = await loadRig()
  const pose = { dt:1/30,time:0,stride:0,airborne:false,jumpPhase:1,sliding:0,idle:true,turn:0,landing:0,ground:0,
    kennel:true,sit:true }
  rig.appearance(gearAppearance({ vest:'canvas-vest',collar:'marsh-bandana' }))
  const garment = rig.root.getObjectByName('WorkingDogVest')
  const scarf = rig.root.getObjectByName('WorkingDogBandana')
  const bib = scarf.getObjectByName('HemmedTriangularBib')
  const positions = bib.geometry.attributes.position
  assert.equal(scarf.parent.name,'Neck1')
  assert.ok(scarf.visible && garment.visible)
  assert.ok(Math.abs(positions.getX(14)-positions.getX(0)) > 1)
  assert.ok(Math.abs(positions.getX(239)-positions.getX(225)) < .025)
  assert.ok(positions.getY(0)-positions.getY(225) > .65)
  for (let i=0;i<16;i++) rig.pose({ ...pose,time:i/30 })
  rig.root.traverse(part => assert.ok(part.matrixWorld.elements.every(Number.isFinite),part.name))
  for (const [category,items] of Object.entries(kennelCatalog)) for (const item of items) {
    rig.appearance(gearAppearance({ vest:'canvas-vest',[category]:item.id }))
    assert.equal(rig.root.getObjectByName('WorkingDogVest'),garment)
    assert.equal(rig.root.getObjectByName('HemmedTriangularBib'),bib)
    if (category === 'collar') assert.equal(scarf.visible,Boolean(item.bandana))
  }
  let disposed = 0
  for (const mesh of [garment,bib]) mesh.geometry.addEventListener('dispose',() => disposed++)
  rig.dispose()
  assert.equal(disposed,2)
})
