import * as T from 'three'
import { createHazard, createPickup } from './art.js'
import { createAtmosphere } from './atmosphere.js'
import { createSound } from './audio.js'
import { cameraLayout, newCameraState, updateFollow } from './camera.js'
import { hazardFrame, playerFrame, traceContact } from './collision.js'
import { createFixedClock, samplePose } from './timing.js'
import { swipeDirection } from './gesture.js'
import { adaptiveQuality, graphics, pixelRatio } from './quality.js'
import { createPlayer } from './player.js'
import { createFootSpray } from './spray.js'
import { audioDefaults, completeRun, normalizeProfile, outfits } from './profile.js'
import {
  act, advance, collect, createCourse, getHeight, laneWidth, multiplier, newRun,
  jumpDuration, pickupNames, powerDuration, score,
} from './runner.js'
import { habitatAt, placeOnTrail, surfaceAt, trailHeight } from './trail.js'
import { createTerrain } from './terrain.js'
import { createDivingFlocks, createWildlife } from './wildlife.js'
import { diveAge, diveExit, diveWarning } from './dive.js'
import './style.css'

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]))
const recordKey = 'retriever-run.record'
const sound = createSound(() => {
  if (mode === 'running') setMode('paused')
})
const volumeKeys = Object.keys(audioDefaults)
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const format = new Intl.NumberFormat()
const scene = new T.Scene()
const camera = new T.PerspectiveCamera(50, 1, .1, 190)
const scenery = new T.Group()
scene.add(scenery)
const entities = []
const effects = []
const pool = new Map()
const dogPosition = {}
const obstaclePosition = {}
const cuePosition = {}
const cueRunner = {}
const clock = createFixedClock()
const previous = {}
const display = {}
const candidate = {}
const contact = {}
const controls = []
const hudCache = {}
const clearLanes = ['Left lane clear', 'Center lane clear', 'Right lane clear']
const flightWarnings = {
  approach: clearLanes.map(lane => 'Low geese ahead · ' + lane),
  duck: clearLanes.map(lane => '↓  Duck · ' + lane),
}
let ticks = 0
let debug
let viewWidth = 390
let previousStride = 0
let frozen = false
let calloutAnimation
let actionBuffer = null
let bufferUntil = 0

function loadProfile() {
  try { return normalizeProfile(JSON.parse(localStorage.getItem(recordKey))) }
  catch { return normalizeProfile(null) }
}

function saveProfile() {
  try { localStorage.setItem(recordKey, JSON.stringify(profile)) } catch { /* storage may be unavailable */ }
}

let profile = loadProfile()
let mode = 'title'
let run = newRun()
samplePose(previous, run, run, 1)
let nextRow = createCourse(2026)
let row = nextRow()
let stride = 0
let foot = 0
let landing = 0
let splashUntil = 0
let layout = cameraLayout(1)
const follow = newCameraState()
const adapt = adaptiveQuality()
let previousTime
let gesture
let lastCondition = ''
let cuePriority = 0
let flightLabel = ''
let cueUntil = 0
let visualTime = 0
let autoPreset = 'balanced'
let preset = graphics.balanced
let dog
let spray
let resize
let needsRedraw = true

function makeRenderer() {
  try {
    return new T.WebGLRenderer({ canvas: ui.trail, antialias: true, powerPreference: 'high-performance' })
  } catch {
    ui['menu-copy'].textContent = 'Wildlands needs a browser with WebGL 2 and hardware acceleration.'
    ui.primary.hidden = true
    ui.hint.hidden = true
    ui.settings.hidden = true
  }
}

const renderer = makeRenderer()
if (renderer) initialize()

function initialize() {
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  const atmosphere = createAtmosphere(scene)
  const terrain = createTerrain(scene)
  const wildlife = createWildlife(scene, sound.bird)
  const diving = createDivingFlocks(scene)
  if (new URLSearchParams(location.search).get('debug') === 'collision') {
    import('./collision-debug.js').then(({ collisionDebug }) => { debug = collisionDebug(scene) })
  }
  dog = createPlayer(scene)
  spray = createFootSpray(scene)
  dog.appearance(profile.outfit)
  sound.settings(profile)
  const glow = new T.Mesh(
    new T.RingGeometry(.49, .63, 32),
    new T.MeshBasicMaterial({ color: 0xeaa65b, side: T.DoubleSide, transparent: true, opacity: .74, depthWrite: false }),
  )
  glow.rotation.x = -Math.PI / 2
  scene.add(glow)

  resize = () => {
    needsRedraw = true
    const width = ui.game.clientWidth
    viewWidth = width
    const height = ui.game.clientHeight
    preset = graphics[profile.quality === 'auto' ? autoPreset : profile.quality]
    layout = cameraLayout(width / Math.max(1, height))
    camera.aspect = width / Math.max(1, height)
    camera.fov = layout.fov
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(pixelRatio(width, height, devicePixelRatio, preset))
    renderer.setSize(width, height, false)
  }

  function render(ms) {
    const wall = previousTime === undefined ? 0 : (ms - previousTime) / 1000
    const dt = Math.min(.10, Math.max(0, wall))
    previousTime = ms
    if (mode === 'running' && profile.quality === 'auto') {
      const selected = adapt(wall)
      if (selected !== autoPreset) {
        autoPreset = selected
        resize()
      }
    }
    let alpha = 1
    if (mode === 'running') {
      alpha = clock.advance(wall, step)
      updateHud()
    }
    const animate = mode === 'title' || mode === 'running' || frozen
    if (animate) {
      const idle = mode === 'title'
      if (idle) visualTime += dt
      samplePose(display, previous, run, frozen || idle ? 1 : alpha)
      if (!idle) visualTime = display.elapsed
      const distance = display.distance
      const turn = display.lane * laneWidth - display.x
      const ground = trailHeight(distance, display.x)
      const body = playerFrame(dogPosition, display, distance)
      const comfort = profile.comfort || reducedMotion.matches
      if (idle) {
        if (layout.portrait) {
          camera.position.set(2.4, 1.95, 3.85)
          camera.lookAt(.06, -.26, -.65)
        } else {
          camera.position.set(2.43, 1.81, 3.37)
          camera.lookAt(-3.92, 1.08, -3.4)
        }
      } else {
        updateFollow(follow, layout, distance, display.x, dt, comfort)
        camera.position.set(follow.x, follow.y, follow.z)
        camera.lookAt(follow.tx, follow.ty, follow.tz)
      }
      landing *= Math.exp(-12 * dt)
      const height = getHeight(display)
      dog.pose({
        x: body.x, z: body.z, height, ground, sliding: body.depth, stride: previousStride + (stride - previousStride) * alpha,
        time: visualTime, heading: idle ? -2.10 : body.angle, turn, dt, idle, landing,
        airborne: display.jump > 0, jumpPhase: display.jump > 0 ? 1 - display.jump / jumpDuration : 1,
      })
      glow.visible = display.power > 0
      glow.position.set(body.x, ground + .045, body.z)
      const pulse = 1.05 + Math.sin(visualTime * 11) * .13
      glow.scale.set(pulse, pulse, 1)
      const weather = atmosphere.update(display.elapsed, visualTime, reducedMotion.matches ? .34 : preset.weather)
      terrain.update(distance, visualTime, weather, preset.detail)
      wildlife(visualTime, distance, preset.detail === 0, mode === 'running')
      if (!idle && !frozen) {
        updateConditions(weather.name)
        sound.ambience(weather, visualTime, surfaceAt(distance) === 'mud', !display.jump && !display.slide)
      }
      spray.update(distance, visualTime)
      populate()
      positionEntities(visualTime, distance)
      diving(entities, distance, visualTime, preset.detail === 0)
      frozen = false
    }
    if (mode === 'title' || mode === 'running' || needsRedraw) {
      debug?.draw(mode === 'title' ? run : display, entities, mode, {
        ticks, drawCalls: renderer.info.render.calls, geometries: renderer.info.memory.geometries, tiles: terrain.count(),
      })
      renderer.render(scene, camera)
      needsRedraw = false
    }
  }

  window.addEventListener('resize', resize)
  ui.trail.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    if (mode === 'running') setMode('paused')
    ui.primary.disabled = true
    ui['menu-copy'].textContent = 'Graphics were interrupted. Waiting for the connection to recover.'
  })
  ui.trail.addEventListener('webglcontextrestored', () => {
    ui.primary.disabled = false
    setMode(mode)
  })
  resize()
  bindInput()
  setMode('title')
  renderer.setAnimationLoop(render)
}

function acquire(entity) {
  const key = entity.type + (entity.wide ? '-wide' : '')
  const model = pool.get(key)?.pop()
  if (model) {
    model.visible = true
    scenery.add(model)
    return model
  }
  return entity.hazard ? createHazard(scenery, entity.type, 0, 0, entity.wide) : createPickup(scenery, entity.type)
}

function release(entity) {
  if (!entity.model) return
  entity.model.removeFromParent()
  const key = entity.type + (entity.wide ? '-wide' : '')
  if (!entity.hazard) entity.model.scale.setScalar(1)
  if (!pool.has(key)) pool.set(key, [])
  pool.get(key).push(entity.model)
}

function populate() {
  while (row.at < run.distance + 102) {
    for (const entity of row.entities) {
      if (entity.type !== 'goose') entity.model = acquire(entity)
      entities.push(entity)
    }
    row = nextRow()
  }
}

function positionEntities(time, distance) {
  for (const entity of entities) {
    if (!entity.model) continue
    entity.model.visible = entity.distance <= distance + 80
    if (!entity.model.visible) continue
    const pose = hazardFrame(obstaclePosition, entity, distance, distance)
    entity.model.position.set(pose.x, pose.y, pose.z)
    entity.model.rotation.y = pose.angle
    if (!entity.hazard) {
      entity.model.rotation.y += time * 1.45 + entity.distance
      entity.model.position.y += .58 + Math.sin(time * 5 + entity.distance * .27) * .11
      if (entity.type !== 'treat') entity.model.scale.setScalar(1.18)
    }
  }
  for (const effect of effects) {
    placeOnTrail(effect.model.position, effect.distance, effect.lane * laneWidth, distance)
    effect.model.position.y = .70 + (1 - effect.remaining / effect.duration) * 1.24
    effect.model.rotation.y += .09
    effect.model.scale.setScalar(Math.max(.01, effect.remaining / effect.duration))
  }
}

function runningSurface() {
  if (splashUntil > run.distance) return 'splash'
  return habitatAt(run.distance) === 'Prairie Potholes' ? 'grass' : surfaceAt(run.distance)
}

function step(dt) {
  for (const direction of controls) {
    if (act(run, direction)) {
      sound.play(direction, runningSurface())
      actionBuffer = null
    } else if ((direction === 'jump' || direction === 'slide') &&
      (run.jump > 0 && run.jump < .13 || run.slide > 0 && run.slide < .13)) {
      actionBuffer = direction
      bufferUntil = run.elapsed + .14
    }
  }
  controls.length = 0
  if (actionBuffer && run.elapsed >= bufferUntil) actionBuffer = null
  if (actionBuffer && act(run, actionBuffer)) {
    sound.play(actionBuffer, runningSurface())
    actionBuffer = null
  }
  const wasAirborne = run.jump > 0
  samplePose(previous, run, run, 1)
  previousStride = stride
  advance(run, dt)
  ticks++

  let fraction = Infinity
  for (const entity of entities) {
    if (!entity.hazard || !traceContact(previous, run, entity, candidate)) continue
    if (candidate.fraction < fraction) {
      fraction = candidate.fraction
      Object.assign(contact, candidate)
    }
  }
  if (Number.isFinite(fraction)) {
    samplePose(run, previous, run, fraction)
    debug?.hit(contact)
    frozen = true
    sound.play('hit')
    setMode('over')
    return false
  }
  stride += dt * Math.PI * 2 * Math.min(2.86, 1.84 + (run.speed - 11) * .061)
  const nextFoot = Math.floor(stride / Math.PI)
  if (!run.jump && (nextFoot !== foot || wasAirborne) && !run.slide) {
    const surface = runningSurface()
    sound.footstep(surface, wasAirborne)
    if (surface === 'mud' || surface === 'splash') spray.step(run.distance, run.x, run.elapsed, surface === 'splash', preset.detail)
    if (wasAirborne) landing = 1
  }
  foot = nextFoot
  if (Math.floor(previous.distance / 150) < Math.floor(run.distance / 150)) {
    const distance = Math.floor(run.distance / 150) * 150
    announce(distance + ' m · ' + (distance === 150 && profile.farthest < 150 ? 'Blaze collar unlocked'
      : distance === 600 && profile.farthest < 600 ? 'Fox red coat unlocked' : 'Distance milestone'), 2)
    sound.play('milestone')
  }

  let warningLabel = ''
  for (let index = entities.length - 1; index >= 0; index--) {
    const entity = entities[index]
    const ahead = entity.distance - run.distance
    if (entity.type === 'goose') {
      const warning = diveWarning(entity, run.distance)
      if (warning) {
        warningLabel = flightWarnings[warning][entity.safeLane + 1]
        if (entity.audioCue !== warning) {
          entity.audioCue = warning
          const source = hazardFrame(cuePosition, entity, run.distance, run.distance)
          const listener = playerFrame(cueRunner, run, run.distance)
          const near = warning === 'duck'
          const dx = source.x - listener.x
          const dz = source.z - listener.z
          sound.bird('goose', {
            distance: Math.hypot(dx, source.y - listener.y, dz),
            x: dx * Math.cos(listener.angle) - dz * Math.sin(listener.angle),
            movement: entity.direction, near, wings: near,
          })
        }
      }
      if (diveAge(entity, run.distance) > diveExit) entities.splice(index, 1)
      continue
    }
    if (entity.hazard) {
      if (entity.wide && !entity.cued && ahead > 0 && ahead < run.speed * 1.05) {
        announce(entity.type === 'stream' ? '↑  Jump the crossing' : '↓  Slide under the branch', 4)
        entity.cued = true
      }
      if (entity.type === 'stream' && previous.distance < entity.distance && run.distance >= entity.distance) {
        splashUntil = entity.distance + 2.4
      }
    }
    if (!entity.hazard && Math.abs(ahead) < 1 && Math.abs(run.x - entity.lane * laneWidth) < .88 && getHeight(run) < 1.45) {
      const result = collect(run, entity.type)
      const treat = entity.type === 'treat'
      const retrieve = entity.type === 'mallard' || entity.type === 'pheasant'
      entity.duration = retrieve ? .72 : .30
      entity.remaining = entity.duration
      sound.play(retrieve ? 'retrieve' : result.activated ? 'power' : treat ? 'treat' : 'bonus')
      if (retrieve && result.activated) announce(pickupNames[entity.type] + '  +' + result.points + ' · Good Boy bonus', 3)
      else if (retrieve && run.retrieves + profile.retrieves === 3) announce(pickupNames[entity.type] + ' · Marsh bandana unlocked', 3)
      else if (result.activated) announce('Good Boy!  ·  Double pickup points', 3)
      else if (!treat) announce(pickupNames[entity.type] + '  +' + result.points, 3)
      else announce('+' + result.points + (multiplier(run.streak) > 1 ? '  ·  ' + multiplier(run.streak) + '× streak' : ''), 1)
      effects.push(entity)
      entities.splice(index, 1)
    } else if (ahead < (entity.type === 'treat' ? -1 : -8)) {
      if (entity.type === 'treat') run.streak = 0
      release(entity)
      entities.splice(index, 1)
    }
  }
  if (warningLabel !== flightLabel) {
    flightLabel = warningLabel
    ui['flight-warning'].hidden = !flightLabel
    ui['flight-warning'].textContent = flightLabel
  }
  for (let index = effects.length - 1; index >= 0; index--) {
    const effect = effects[index]
    effect.remaining -= dt
    if (effect.remaining <= 0) {
      release(effect)
      effects.splice(index, 1)
    }
  }
}

function announce(message, priority) {
  if (priority < cuePriority && visualTime < cueUntil) return
  cuePriority = priority
  cueUntil = visualTime + (priority >= 3 ? .94 : .48)
  ui.callout.textContent = message
  calloutAnimation?.cancel()
  if (reducedMotion.matches) {
    calloutAnimation = ui.callout.animate([{ opacity: 1 }, { opacity: 1, offset: .75 }, { opacity: 0 }], 1000)
  } else {
    calloutAnimation = ui.callout.animate([
      { opacity: 0, transform: 'translateY(6px)' },
      { opacity: 1, transform: 'translateY(0)', offset: .12 },
      { opacity: 1, offset: .8 },
      { opacity: 0, transform: 'translateY(-11px)' },
    ], 1000)
  }
}

function updateConditions(weather) {
  const habitat = habitatAt(run.distance)
  const condition = habitat + weather
  if (lastCondition === condition) return
  lastCondition = condition
  ui.habitat.textContent = habitat
  ui.weather.textContent = weather
}

function updateHud() {
  const points = score(run)
  const distance = Math.floor(run.distance)
  const charge = run.power ? Math.ceil(run.power / powerDuration * 100) : run.meter
  if (hudCache.points !== points) ui.score.textContent = format.format(points)
  if (hudCache.distance !== distance) ui.distance.textContent = format.format(distance) + ' m'
  if (hudCache.best !== profile.best) ui.best.textContent = format.format(profile.best)
  if (hudCache.charge !== charge) ui.charge.value = charge
  if (hudCache.streak !== run.streak) {
    ui.combo.hidden = run.streak < 5
    if (!ui.combo.hidden) ui.combo.textContent = run.streak + ' treats · ' + multiplier(run.streak) + '× combo'
  }
  const powered = run.power > 0
  if (hudCache.powered !== powered) {
    ui.hud.classList.toggle('power', powered)
    ui['meter-label'].textContent = powered ? 'Good Boy · 2× pickup points' : 'Good Boy Meter'
  }
  hudCache.points = points
  hudCache.distance = distance
  hudCache.best = profile.best
  hudCache.charge = charge
  hudCache.streak = run.streak
  hudCache.powered = powered
}

function setMode(value) {
  needsRedraw = true
  const oldMode = mode
  mode = value
  if (oldMode !== value) {
    clock.reset()
    previousTime = undefined
    controls.length = 0
    gesture = undefined
    actionBuffer = null
  }
  ui.game.dataset.mode = value
  const running = value === 'running'
  const title = value === 'title'
  const over = value === 'over'
  const paused = value === 'paused'
  const newBest = over && score(run) > profile.best
  const unlocks = []
  if (over && oldMode !== 'over') {
    const completed = completeRun(profile, run, score(run))
    for (const outfit of outfits) {
      if (outfit.available(completed) && !outfit.available(profile)) unlocks.push(outfit.name)
    }
    profile = completed
    saveProfile()
  }
  ui.menu.hidden = running
  ui.hud.hidden = !running
  ui.controls.hidden = !running
  ui.conditions.hidden = !running
  ui.pause.hidden = !(running || paused)
  ui.pause.textContent = paused ? 'Resume' : 'Pause'
  ui.hint.hidden = !title
  ui.record.hidden = !(over || (title && profile.best))
  ui.record.textContent = over
    ? (newBest ? 'New best · ' : '') + format.format(profile.score) + ' points  ·  ' + profile.distance + ' m  ·  Best ' + format.format(profile.best)
    : 'Best ' + format.format(profile.best) + '  ·  Longest run ' + format.format(profile.farthest) + ' m'
  ui.eyebrow.textContent = title ? 'THE WETLANDS TRAIL' : over ? 'FIELD REPORT' : habitatAt(run.distance).toUpperCase()
  ui['menu-title'].innerHTML = title ? 'Retriever<br><em>Run</em>' : over ? 'Trail<br><em>end</em>' : '<em>Paused</em>'
  ui['menu-copy'].textContent = title ? 'Follow a yellow Lab through the cattails, creek beds, and flooded timber.'
    : over ? (unlocks.length ? 'Outfitter unlocked · ' + unlocks.join(', ') : run.retrieves + ' retrieved · ' + run.bestStreak + ' best treat streak')
      : 'Your run is held at ' + Math.floor(run.distance) + ' m.'
  ui.primary.firstChild.textContent = title ? 'Start run ' : over ? 'Run again ' : 'Resume run '
  if (!running) {
    flightLabel = ''
    ui['flight-warning'].hidden = true
    if (over) sound.finish()
    else sound.pause()
    calloutAnimation?.cancel()
    ui.callout.textContent = ''
  }
  if (!title && !running) ui.primary.focus({ preventScroll: true })
  if (running) {
    ui.primary.blur()
    ui.pause.blur()
    updateHud()
  }
}

function start() {
  for (const entity of entities) release(entity)
  for (const effect of effects) release(effect)
  entities.length = 0
  effects.length = 0
  run = newRun()
  nextRow = createCourse(debug?.seed ?? Math.floor(Math.random() * 0x100000000))
  row = nextRow()
  stride = previousStride = 0
  ticks = 0
  samplePose(previous, run, run, 1)
  debug?.reset()
  foot = 0
  landing = 0
  splashUntil = 0
  cueUntil = 0
  follow.heading = null
  follow.offset = 0
  visualTime = 0
  dog.reset()
  spray.reset()
  setMode('running')
  sound.unlock(true)
  populate()
}

function move(direction) {
  if (mode === 'running' && controls.length < 16) controls.push(direction)
}

function pause() {
  if (mode === 'running') setMode('paused')
  else if (mode === 'paused') {
    setMode('running')
    sound.unlock()
  }
}

function openSettings() {
  if (mode === 'running') pause()
  for (const key of volumeKeys) ui[key].value = Math.round(profile[key] * 100)
  ui.quality.value = profile.quality
  ui.comfort.checked = profile.comfort
  function drawOutfits() {
    ui.outfits.replaceChildren(...outfits.map((outfit) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.disabled = !outfit.available(profile)
      button.setAttribute('aria-pressed', String(profile.outfit === outfit.id))
      button.textContent = outfit.name + (button.disabled ? ' · ' + outfit.hint : '')
      button.addEventListener('click', () => {
        profile.outfit = outfit.id
        dog.appearance(outfit.id)
        needsRedraw = true
        saveProfile()
        for (const option of ui.outfits.children) option.setAttribute('aria-pressed', String(option === button))
      })
      return button
    }))
  }
  drawOutfits()
  ui.preferences.showModal()
}

function bindInput() {
  ui.primary.addEventListener('click', () => mode === 'paused' ? pause() : start())
  ui.pause.addEventListener('click', pause)
  ui.settings.addEventListener('click', openSettings)
  ui['close-settings'].addEventListener('click', () => ui.preferences.close())
  ui.preferences.addEventListener('close', () => ui.settings.focus())
  for (const key of volumeKeys) {
    ui[key].addEventListener('input', () => {
      profile[key] = ui[key].valueAsNumber / 100
      sound.settings(profile)
      saveProfile()
    })
  }
  for (const key of ['quality', 'comfort']) {
    ui[key].addEventListener('change', () => {
      profile[key] = key === 'quality' ? ui[key].value : ui[key].checked
      if (key === 'quality') resize()
      saveProfile()
    })
  }
  for (const button of ui.controls.querySelectorAll('button')) {
    button.addEventListener('click', (event) => {
      move(button.dataset.move)
      if (event.detail) button.blur()
    })
  }
  const keys = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'jump', w: 'jump',
    ' ': 'jump', arrowdown: 'slide', s: 'slide' }
  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.metaKey || event.ctrlKey || ui.preferences.open) return
    const key = event.key.toLowerCase()
    if (key in keys && mode === 'running' && !(key === ' ' && event.target instanceof HTMLButtonElement)) {
      event.preventDefault()
      if (!event.repeat) move(keys[key])
    } else if (!event.repeat && ['p', 'escape'].includes(key)) {
      event.preventDefault()
      pause()
    } else if (!event.repeat && ['enter', ' '].includes(key) && mode !== 'running' && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault()
      ui.primary.click()
    }
  })
  ui.game.addEventListener('pointerdown', (event) => {
    if (mode !== 'running' || event.target.closest('button') || gesture || !event.isPrimary) return
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false }
    ui.game.setPointerCapture(event.pointerId)
  })
  function sendSwipe(event, finished) {
    if (gesture?.id !== event.pointerId || gesture.moved) return
    const direction = swipeDirection(event.clientX - gesture.x, event.clientY - gesture.y, viewWidth, finished)
    if (direction) {
      gesture.moved = true
      move(direction)
    }
  }
  ui.game.addEventListener('pointermove', (event) => sendSwipe(event, false))
  ui.game.addEventListener('pointerup', (event) => sendSwipe(event, true))
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    ui.game.addEventListener(name, (event) => {
      if (gesture?.id === event.pointerId) gesture = undefined
    })
  }
  const background = () => {
    if (mode === 'running') setMode('paused')
    else sound.pause()
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) background() })
  window.addEventListener('pagehide', background)
}
