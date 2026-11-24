import * as T from 'three'
import { createHazard, prepareWashout } from '/src/art.js'
import { createAtmosphere } from '/src/atmosphere.js'
import { cameraLayout, newCameraState, updateFollow } from '/src/camera.js'
import { hazardFrame, washoutSegments, washoutSpacing } from '/src/collision.js'
import { distanceAtTime, speedAtTime } from '/src/difficulty.js'
import { createPlayer } from '/src/player.js'
import { createTerrain } from '/src/terrain.js'
import { laneWidth, segmentLength, trailHeight } from '/src/trail.js'
import { createDivingFlocks } from '/src/wildlife.js'

const baseline = new URLSearchParams(location.search).has('baseline')
const renderer = new T.WebGLRenderer({ canvas: document.querySelector('canvas'), antialias: true })
renderer.setPixelRatio(Math.min(1, devicePixelRatio))
renderer.setSize(innerWidth, innerHeight, false)
renderer.toneMapping = T.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.15
const scene = new T.Scene()
const terrain = createTerrain(scene)
const atmosphere = createAtmosphere(scene)
const dog = createPlayer(scene)
const diving = createDivingFlocks(scene)
const obstacles = new T.Group()
const actor = new T.Group()
dog.moveTo(actor)
scene.add(actor, obstacles)
const camera = new T.PerspectiveCamera(50, innerWidth / innerHeight, .1, 190)
let decorate
if (!baseline) {
  const asset = '/src/' + 'sign-scenery.js'
  const signs = await import(/* @vite-ignore */ asset)
  decorate = signs.createPostedTimber()
}

const nextFrame = () => new Promise(resolve => requestAnimationFrame(resolve))
const elapsedAt = distance => {
  let low = 0
  let high = 380
  for (let step = 0; step < 28; step++) {
    const mid = (low + high) / 2
    if (distanceAtTime(mid) < distance) low = mid
    else high = mid
  }
  return (low + high) / 2
}

async function cameraScene({ type, variety = 0, shot, elapsed = 246 }) {
  obstacles.clear()
  const target = type === 'fallen' ? 6118 : distanceAtTime(elapsed)
  const trees = shot === 'trees'
  const character = shot === 'character'
  const panorama = shot === 'panorama' || trees || character
  const near = shot === 'close'
  const gap = near ? 0 : type === 'goose' ? 9 : 13.5
  const origin = panorama ? target : target - gap
  const currentTime = elapsedAt(origin)
  const vegetationTime = type === 'fallen' ? 252 : elapsed
  const weather = atmosphere.update(vegetationTime, vegetationTime, .62, origin)
  terrain.update(origin, vegetationTime, weather, 1)
  const tile = Math.floor(origin / segmentLength) * segmentLength
  for (let attempt = 0; attempt < 240 && !terrain.readyAt(tile + segmentLength * 3); attempt++) await nextFrame()
  terrain.update(origin, vegetationTime, weather, 1)
  if (!terrain.readyAt(tile)) throw new Error('Terrain never became available')

  const hazard = {
    type, lane: 0, distance: target, wide: type === 'branch-wide' || type === 'stream', direction: 1,
    flightSpeed: speedAtTime(currentTime), lead: true,
  }
  if (type === 'branch-wide') hazard.type = 'branch'
  if (type === 'washout') hazard.span = (washoutSegments - 1) * washoutSpacing
  const position = hazardFrame({}, hazard, origin, origin)
  if (!panorama && type !== 'goose') {
    hazard.model = createHazard(obstacles, hazard.type, position.x, position.z, hazard.wide, variety)
    hazard.model.position.y = position.y
    hazard.model.rotation.y = position.angle
    if (hazard.span) prepareWashout(hazard.model, hazard)
  }
  decorate?.([hazard], origin, 13861)
  diving(type === 'goose' ? [hazard] : [], origin, vegetationTime, true)
  actor.visible = character || !near && !panorama
  if (character) {
    dog.appearance({ coat: 'classic-yellow', collar: 'junior-collar', vest: 'canvas-vest' })
    let skinned = false
    for (let attempt = 0; attempt < 180 && !skinned; attempt++) {
      actor.traverse(node => { skinned ||= Boolean(node.isSkinnedMesh) })
      if (!skinned) await nextFrame()
    }
    if (!skinned) throw new Error('Labrador skin never became available')
  }
  const dogGround = trailHeight(origin, -laneWidth)
  if (actor.visible) dog.pose({ height: 0, x: -laneWidth, z: 0, time: vegetationTime, dt: 1 / 60,
    stride: 2.1, idle: false, turn: 0, sliding: 0, ground: dogGround, heading: 0,
    airborne: false, jumpPhase: 1, landing: 0 })
  const layout = cameraLayout(innerWidth / innerHeight)
  const follow = newCameraState()
  updateFollow(follow, layout, origin, -laneWidth, 1 / 60, true)
  camera.fov = near ? 44 : layout.fov
  if (character) {
    camera.position.set(.47, 1.63, -2.31)
    camera.lookAt(-laneWidth, dogGround + .89, -.10)
  } else if (trees) {
    const offset = new T.Matrix4()
    const position = new T.Vector3()
    const scale = new T.Vector3()
    const spin = new T.Quaternion()
    let sample
    let score = Infinity
    scene.updateMatrixWorld(true)
    for (const tile of scene.children) for (const grove of tile.children) {
      if (!tile.visible || !grove.visible || grove.name !== 'Canopy instances') continue
      for (let n = 0; n < grove.count; n++) {
        grove.getMatrixAt(n, offset)
        offset.premultiply(grove.matrixWorld).decompose(position, spin, scale)
        if (position.z > -5 || scale.y < 4) continue
        const separation = Math.abs(position.z + 12) + Math.abs(position.x) * .80
        if (separation < score) {
          score = separation
          sample = { position: position.clone(), scale: scale.clone() }
        }
      }
    }
    if (!sample) throw new Error('No loaded canopy was available for close-up')
    const { x, y, z } = sample.position
    const height = sample.scale.y
    camera.position.set(x - Math.sign(x) * height * .62, y + height * .64, z + height * 1.58)
    camera.lookAt(x, y + height * .52, z)
  } else if (near) {
    const center = type === 'washout' ? [0, 0, 0] : [position.x, position.y, position.z]
    const width = hazard.wide || type === 'washout' ? 8.6 : type === 'tractor' ? 5.1 : 4.2
    const height = type === 'puddle' || type === 'stream' || type === 'washout' ? 2.35 : 1.92
    camera.position.set(center[0] + width * .25, height + center[1], center[2] + width)
    camera.lookAt(center[0], center[1] + (type === 'goose' ? .53 : hazard.wide ? .78 : .87), center[2])
  } else {
    camera.position.set(follow.x, follow.y, follow.z)
    camera.lookAt(follow.tx, follow.ty, follow.tz)
  }
  camera.updateProjectionMatrix()
  renderer.render(scene, camera)
  await nextFrame()
  renderer.render(scene, camera)
  return { distance: Math.round(target), shot, type, variety, triangles: renderer.info.render.triangles }
}

window.captureTerrainForm = cameraScene
