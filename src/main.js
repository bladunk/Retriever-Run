import * as T from 'three'
import { createHazard, createPickup } from './art.js'
import { createAtmosphere } from './atmosphere.js'
import { createSound } from './audio.js'
import { cameraLayout, newCameraState, updateFollow } from './camera.js'
import { swipeDirection } from './gesture.js'
import { adaptiveQuality, graphics, pixelRatio } from './quality.js'
import { createPlayer } from './player.js'
import { createFootSpray } from './spray.js'
import { completeRun, normalizeProfile, outfits } from './profile.js'
import {
  act, advance, collides, collect, createCourse, crossing, getHeight, laneWidth, multiplier, newRun,
  jumpDuration, obstacleOffset, pickupNames, powerDuration, score,
} from './runner.js'
import { habitatAt, placeOnTrail, surfaceAt } from './trail.js'
import { createTerrain } from './terrain.js'
import { createWildlife } from './wildlife.js'
import './style.css'

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]))
const recordKey = 'retriever-run.record'
const sound = createSound()
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
const format = new Intl.NumberFormat()
const scene = new T.Scene()
const camera = new T.PerspectiveCamera(50, 1, .1, 190)
const scenery = new T.Group()
scene.add(scenery)
const entities = []
const effects = []
const pool = new Map()
const dogPosition = new T.Vector3()

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
let lastStats = ''
let lastCondition = ''
let cuePriority = 0
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
    const dt = Math.min(.075, wall)
    previousTime = ms
    if (mode === 'running' && profile.quality === 'auto') {
      const selected = adapt(wall)
      if (selected !== autoPreset) {
        autoPreset = selected
        resize()
      }
    }
    if (mode === 'running') {
      const steps = Math.max(1, Math.ceil(dt / .025))
      for (let i = 0; i < steps && mode === 'running'; i++) step(dt / steps)
      updateHud()
    }
    if (mode !== 'paused' && mode !== 'over') {
      const idle = mode === 'title'
      visualTime += dt
      const distance = run.distance
      const turn = run.lane * laneWidth - run.x
      const heading = placeOnTrail(dogPosition, distance, run.x, distance)
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
        updateFollow(follow, layout, distance, run.x, dt, comfort)
        camera.position.set(follow.x, follow.y, follow.z)
        camera.lookAt(follow.tx, follow.ty, follow.tz)
      }
      landing *= Math.exp(-12 * dt)
      const height = getHeight(run)
      dog.pose({
        x: dogPosition.x, z: dogPosition.z, height, sliding: run.slide > 0, stride, time: visualTime,
        heading: idle ? -2.38 : heading - turn * .080, turn, dt, idle, landing,
        airborne: run.jump > 0, jumpPhase: run.jump > 0 ? 1 - run.jump / jumpDuration : 1,
      })
      glow.visible = run.power > 0
      glow.position.set(dogPosition.x, .045, dogPosition.z)
      const pulse = 1.05 + Math.sin(visualTime * 11) * .13
      glow.scale.set(pulse, pulse, 1)
      const weather = atmosphere.update(run.elapsed, visualTime, reducedMotion.matches ? .34 : preset.weather)
      terrain.update(distance, visualTime, weather, preset.detail)
      wildlife(visualTime, distance, preset.detail === 0, !idle && !ui.preferences.open)
      if (!idle) {
        updateConditions(weather.name)
        sound.ambience(weather, true)
      }
      spray.update(distance, visualTime)
      populate()
      positionEntities(visualTime)
    }
    if (mode === 'title' || mode === 'running' || needsRedraw) {
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
  entity.model.removeFromParent()
  const key = entity.type + (entity.wide ? '-wide' : '')
  if (!entity.hazard) entity.model.scale.setScalar(1)
  if (!pool.has(key)) pool.set(key, [])
  pool.get(key).push(entity.model)
}

function populate() {
  while (row.at < run.distance + 80) {
    for (const entity of row.entities) {
      entity.model = acquire(entity)
      entities.push(entity)
    }
    row = nextRow()
  }
}

function positionEntities(time) {
  for (const entity of entities) {
    const angle = placeOnTrail(entity.model.position, entity.distance, obstacleOffset(entity, run.distance), run.distance)
    entity.model.rotation.y = entity.hazard ? angle : angle + time * 1.45 + entity.distance
    if (!entity.hazard) {
      entity.model.position.y = .58 + Math.sin(time * 5 + entity.distance * .27) * .11
      if (entity.type !== 'treat') entity.model.scale.setScalar(1.18)
    }
  }
  for (const effect of effects) {
    placeOnTrail(effect.model.position, effect.distance, effect.lane * laneWidth, run.distance)
    effect.model.position.y = .70 + (1 - effect.remaining / effect.duration) * 1.24
    effect.model.rotation.y += .09
    effect.model.scale.setScalar(Math.max(.01, effect.remaining / effect.duration))
  }
}

function step(dt) {
  const wasAirborne = run.jump > 0
  const previous = advance(run, dt)
  stride += dt * Math.PI * 2 * Math.min(2.86, 1.84 + (run.speed - 11) * .061)
  const nextFoot = Math.floor(stride / Math.PI)
  if (!run.jump && (nextFoot !== foot || wasAirborne) && !run.slide) {
    const surface = splashUntil > run.distance ? 'splash' : surfaceAt(run.distance)
    sound.footstep(surface, wasAirborne)
    if (surface === 'mud' || surface === 'splash') spray.step(run.distance, run.x, visualTime, surface === 'splash', preset.detail)
    if (wasAirborne) landing = 1
  }
  foot = nextFoot
  if (Math.floor(previous / 150) < Math.floor(run.distance / 150)) {
    const distance = Math.floor(run.distance / 150) * 150
    announce(distance + ' m · ' + (distance === 150 && profile.farthest < 150 ? 'Blaze collar unlocked'
      : distance === 600 && profile.farthest < 600 ? 'Fox red coat unlocked' : 'Distance milestone'), 2)
    sound.play('milestone')
  }

  for (let index = entities.length - 1; index >= 0; index--) {
    const entity = entities[index]
    const ahead = entity.distance - run.distance
    if (entity.hazard) {
      if (entity.wide && !entity.cued && ahead > 0 && ahead < run.speed * 1.05) {
        announce(entity.type === 'stream' ? '↑  Jump the crossing' : '↓  Slide under the branch', 4)
        entity.cued = true
      }
      if (crossing(previous, run.distance, entity)) {
        if (collides(run, entity)) {
          sound.play('hit')
          setMode('over')
          return
        }
        if (entity.type === 'stream') splashUntil = entity.distance + 8
      }
    }
    if (!entity.hazard && Math.abs(ahead) < 1 && Math.abs(run.x - entity.lane * laneWidth) < .88 && getHeight(run) < 1.45) {
      const result = collect(run, entity.type)
      const treat = entity.type === 'treat'
      const retrieve = entity.type === 'mallard' || entity.type === 'pheasant'
      entity.duration = retrieve ? .72 : .30
      entity.remaining = entity.duration
      sound.play(retrieve ? 'retrieve' : result.activated ? 'power' : treat ? 'treat' : 'bonus')
      if (retrieve && result.activated) announce(pickupNames[entity.type] + '  +' + result.points + ' · Good Boy shield', 3)
      else if (retrieve && run.retrieves + profile.retrieves === 3) announce(pickupNames[entity.type] + ' · Marsh bandana unlocked', 3)
      else if (result.activated) announce('Good Boy!  ·  Shield + double pickups', 3)
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
  ui.callout.classList.remove('pop')
  void ui.callout.offsetWidth
  ui.callout.classList.add('pop')
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
  const stats = [points, distance, profile.best, charge, Boolean(run.power), run.streak].join(',')
  if (stats === lastStats) return
  lastStats = stats
  ui.score.textContent = format.format(points)
  ui.distance.textContent = format.format(distance) + ' m'
  ui.best.textContent = format.format(profile.best)
  ui.charge.value = charge
  ui.combo.hidden = run.streak < 5
  if (!ui.combo.hidden) ui.combo.textContent = run.streak + ' treats · ' + multiplier(run.streak) + '× combo'
  ui.hud.classList.toggle('power', Boolean(run.power))
  ui['meter-label'].textContent = run.power ? 'Good Boy · Shield + 2× pickups' : 'Good Boy Meter'
}

function setMode(value) {
  needsRedraw = true
  const oldMode = mode
  mode = value
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
    sound.ambience({ wind: 0, rain: 0 }, false)
    ui.callout.classList.remove('pop')
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
  sound.unlock()
  sound.play('start')
  for (const entity of entities) release(entity)
  for (const effect of effects) release(effect)
  entities.length = 0
  effects.length = 0
  run = newRun()
  nextRow = createCourse(Math.floor(Math.random() * 0x100000000))
  row = nextRow()
  stride = 0
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
  populate()
}

function move(direction) {
  if (mode === 'running' && act(run, direction)) sound.play(direction)
}

function pause() {
  if (mode === 'running') setMode('paused')
  else if (mode === 'paused') {
    sound.unlock()
    setMode('running')
  }
}

function openSettings() {
  if (mode === 'running') pause()
  ui.sfx.checked = profile.sfx
  ui.soundtrack.checked = profile.soundtrack
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
  for (const key of ['sfx', 'soundtrack', 'quality', 'comfort']) {
    ui[key].addEventListener('change', () => {
      profile[key] = key === 'quality' ? ui[key].value : ui[key].checked
      if (key === 'quality') resize()
      else if (key !== 'comfort') {
        sound.settings(profile)
        sound.unlock()
      }
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
    const direction = swipeDirection(event.clientX - gesture.x, event.clientY - gesture.y, ui.game.clientWidth, finished)
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
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'running') setMode('paused')
  })
}
