import * as T from 'three'
import { createHazard, createPickup } from './art.js'
import { createAtmosphere } from './atmosphere.js'
import { createSound } from './audio.js'
import { cameraLayout, newCameraState, updateFollow } from './camera.js'
import { firstContact, hazardFrame, playerFrame } from './collision.js'
import { createFixedClock, samplePose } from './timing.js'
import { swipeDirection } from './gesture.js'
import { createRunControls } from './run-controls.js'
import { adaptivePresentation, adaptiveQuality, graphics, pixelRatio } from './quality.js'
import { createPlayer } from './player.js'
import { createFootSpray } from './spray.js'
import { audioDefaults } from './profile.js'
import { pendingPatches } from './honors.js'
import { openLodge } from './lodge-save.js'
import { createCampTransport } from './camp-transport.js'
import { createWorldwideCamp } from './worldwide-camp.js'
import { submissionMessages } from './camp-ui.js'
import { createLodgeUI, fillReport, insignia, patchName } from './lodge-ui.js'
import { careerStanding } from './career.js'
import { careerLine, createPromotion, fillCareerReport } from './career-ui.js'
import { createOnboarding, restoreEnrollment } from './camp-onboarding.js'
import { createReportRival } from './rival-ui.js'
import { createKennelView } from './kennel-view.js'
import {
  advance, collect, createCourse, getHeight, laneWidth, multiplier, newRun, touchesPickup,
  jumpDuration, pickupNames, powerDuration, score,
} from './runner.js'
import { habitatAt, placeOnTrail, surfaceAt, trailHeight } from './trail.js'
import { createTerrain } from './terrain.js'
import { createDivingFlocks, createWildlife } from './wildlife.js'
import { diveAge, diveExit, diveWarning } from './dive.js'
import './style.css'
import './lodge.css'
import './top-dog.css'

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]))
const sound = createSound(background)
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
const contact = {}
const controls = createRunControls()
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

const diagnosticsRequested = new URLSearchParams(location.search).get('debug') === 'collision'
const lodge = openLodge(undefined, undefined, { practice: diagnosticsRequested })
const camp = createWorldwideCamp(createCampTransport())
if (!diagnosticsRequested) {
  restoreEnrollment(lodge, camp)
  window.addEventListener('online', () => camp.syncPending())
}
window.addEventListener('load', () => {
  if (!diagnosticsRequested) camp.syncPending()
  if (import.meta.env.PROD && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register(new URL('offline-sw.js', document.baseURI)).catch(() => {})
  }
}, { once: true })
const saveProfile = lodge.commit
let profile = lodge.current().profile
let runPlayer
let runStatistics
let runRival
let runMetric
let audioGesture = false
let nextPatchCheck = 0
let toastUntil = 0
const seenPatches = new Map()
const patchNotices = []

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
let showKennel
let needsRedraw = true
let trailReady = false
let contextReady = true

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

const lodgeUI = createLodgeUI(ui, lodge, {
  camp,
  onPlayer() {
    profile = lodge.current().profile
    dog?.appearance(lodge.current().kennel.equipment)
    resize?.()
    sound.settings(profile)
    updateMusicButton()
    if (mode === 'title') showTitleRecord()
  },
  onOpen() { engageMusic() },
  onClose() { sound.selectScene(mode) },
  onKennel(stage) { showKennel?.(stage) },
  onAppearance(equipment) { dog?.appearance(equipment) },
  onStart() {
    if (!contextReady || !trailReady) return
    ui.lodge.close()
    start()
  },
  onJoin(player, member) {
    if (player.enrollment === 'guest' || !player.enrollment) {
      lodge.enroll(player.id, member.nickname, 'worldwide')
      if (mode === 'title') showTitleRecord()
    }
  },
})
const onboarding = createOnboarding(ui, lodge, camp, showTitleRecord, start)
const promotion = createPromotion(ui, lodge, insignia, () => sound.play('promotion'))
const renderReportRival = createReportRival(ui['report-rival'], camp)
ui['open-lodge'].addEventListener('click', event => lodgeUI.open(event.currentTarget))
ui['report-lodge'].addEventListener('click', event => lodgeUI.open(event.currentTarget))
ui.lodge.addEventListener('click', () => { if (ui.lodge.open && !audioGesture) engageMusic() })
sound.settings(profile)
updateMusicButton()
setTimeout(sound.preload, 250)

const renderer = makeRenderer()
if (renderer) initialize()

function initialize() {
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  const atmosphere = createAtmosphere(scene)
  const terrain = createTerrain(scene)
  const wildlife = createWildlife(scene, sound.bird)
  const diving = createDivingFlocks(scene)
  if (diagnosticsRequested) {
    import('./collision-debug.js').then(({ collisionDebug }) => { debug = collisionDebug(scene) })
  }
  dog = createPlayer(scene)
  spray = createFootSpray(scene)
  dog.appearance(lodge.current().kennel.equipment)
  sound.settings(profile)
  const glow = new T.Mesh(
    new T.RingGeometry(.49, .63, 32),
    new T.MeshBasicMaterial({ color: 0xeaa65b, side: T.DoubleSide, transparent: true, opacity: .74, depthWrite: false }),
  )
  glow.rotation.x = -Math.PI / 2
  scene.add(glow)

  let kennel
  let kennelStage
  const kennelSize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => {
    if (kennelStage) resize()
  }) : null
  let trailPose
  resize = () => {
    needsRedraw = true
    if (kennelStage) {
      kennel.resize(renderer, kennelStage.clientWidth, kennelStage.clientHeight)
      return
    }
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
  showKennel = stage => {
    if (stage === kennelStage || (!stage && !kennelStage)) return
    kennelSize?.disconnect()
    kennelStage = stage
    if (stage) {
      kennel ??= createKennelView()
      stage.append(ui.trail)
      kennelSize?.observe(stage)
      ui.trail.setAttribute('aria-label', '3D Labrador equipment preview')
      dog.moveTo(kennel.room)
    } else {
      ui.game.prepend(ui.trail)
      ui.trail.setAttribute('aria-label', '3D wetlands trail')
      dog.moveTo(scene)
      dog.appearance(lodge.current().kennel.equipment)
      if (trailPose && mode !== 'title') dog.pose({ ...trailPose, dt: .25 })
    }
    resize()
  }

  const present = adaptivePresentation()
  let lastRenderMs

  const stepOnTerrain = dt => terrain.readyAt(run.distance) && step(dt)

  function render(ms) {
    const wall = previousTime === undefined ? 0 : (ms - previousTime) / 1000
    previousTime = ms
    if (!contextReady) return
    if (ui.lodge.open) {
      if (kennelStage) kennel.render(renderer, dog, ms, reducedMotion.matches)
      return
    }
    if (!trailReady && terrain.readyAt(0) && terrain.readyAt(-1)) {
      trailReady = true
      ui.primary.disabled = false
      if (mode === 'title') ui.primary.textContent = 'Start run'
      if (!diagnosticsRequested && mode === 'title') {
        if (lodge.current().enrollment) promotion.show()
        else onboarding.open()
      }
    }
    if (mode === 'running' && profile.quality === 'auto') {
      const selected = adapt(wall)
      if (selected !== autoPreset) {
        autoPreset = selected
        resize()
      }
    }
    let alpha = 1
    if (mode === 'running' && terrain.readyAt(run.distance)) {
      alpha = clock.advance(wall, stepOnTerrain)
      updateHud()
    }
    if (mode === 'title' || mode === 'running' || frozen) populate()
    const autoLow = mode === 'running' && profile.quality === 'auto' && autoPreset === 'low'
    const batterySaver = mode === 'running' && profile.quality === 'low'
    if (!present(ms, wall, autoLow, batterySaver) && !needsRedraw) return
    const dt = Math.min(.10, Math.max(0, (ms - (lastRenderMs ?? ms)) / 1000))
    lastRenderMs = ms
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
      trailPose = {
        x: body.x, z: body.z, height, ground, sliding: body.depth, stride: previousStride + (stride - previousStride) * alpha,
        time: visualTime, heading: idle ? -2.10 : body.angle, turn, dt, idle, landing,
        airborne: display.jump > 0, jumpPhase: display.jump > 0 ? 1 - display.jump / jumpDuration : 1,
      }
      dog.pose(trailPose)
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
    contextReady = false
    background()
    ui.primary.disabled = true
    ui.pause.disabled = true
    ui['run-again'].disabled = true
    ui['menu-copy'].textContent = 'Graphics were interrupted. Waiting for the connection to recover.'
  })
  ui.trail.addEventListener('webglcontextrestored', () => {
    contextReady = true
    ui.primary.disabled = !trailReady
    ui.pause.disabled = false
    ui['run-again'].disabled = false
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

function onAction(move) {
  runStatistics.action(move)
  sound.play(move, runningSurface())
}

function step(dt) {
  controls.apply(run, onAction)
  const wasAirborne = run.jump > 0
  samplePose(previous, run, run, 1)
  previousStride = stride
  advance(run, dt)
  ticks++

  const impacted = firstContact(previous, run, entities, contact)
  if (impacted) {
    samplePose(run, previous, run, contact.fraction)
    for (const entity of entities) {
      if (entity.hazard && entity !== impacted) runStatistics.passed(previous, run, entity)
    }
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
    announce(distance + ' m · Distance milestone', 2)
    sound.play('milestone')
  }

  let warningLabel = ''
  let warningPhase
  for (let index = entities.length - 1; index >= 0; index--) {
    const entity = entities[index]
    const ahead = entity.distance - run.distance
    if (entity.hazard) runStatistics.passed(previous, run, entity)
    if (entity.type === 'goose') {
      const warning = diveWarning(entity, run.distance)
      if (warning) {
        warningPhase = warning
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
    if (touchesPickup(run, entity)) {
      const result = collect(run, entity.type)
      runStatistics.pickup(entity.type)
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
  sound.flight(warningPhase)
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
  checkPatches()

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

function checkPatches() {
  if (run.elapsed >= nextPatchCheck) {
    nextPatchCheck = run.elapsed + .30
    patchNotices.push(...pendingPatches(lodge.current(), runStatistics.preview(run), seenPatches))
  }
  if (run.elapsed < toastUntil) return
  const notice = patchNotices.shift()
  const toast = ui['patch-toast']
  toast.hidden = !notice
  if (!notice) return
  toastUntil = run.elapsed + 2.35
  toast.textContent = patchName(notice.patch, notice.level) + ' · Patch earned'
}

function showTitleRecord() {
  const player = lodge.current()
  const career = careerStanding(player.career)
  ui['current-runner'].textContent = 'Playing as ' + player.nickname + (player.enrollment === 'guest' ? ' · Guest Camp' : '')
  ui['title-rank'].textContent = careerLine(player)
  ui['title-xp'].max = career.span
  ui['title-xp'].value = career.within
  ui.record.hidden = !profile.best && !profile.farthest
  ui.record.textContent = 'Best ' + format.format(profile.best) + '  ·  Longest run ' + format.format(profile.farthest) + ' m'
}

function updateMusicButton() {
  const button = ui['music-toggle']
  button.textContent = profile.musicVolume ? audioGesture ? 'Mute music' : 'Play music' : 'Unmute music'
}

function engageMusic() {
  audioGesture = true
  updateMusicButton()
  sound.selectScene(ui.lodge.open ? 'lodge' : mode, { gesture: true })
}

function background() {
  audioGesture = false
  updateMusicButton()
  if (mode === 'running') setMode('paused', { immediate: true })
  else sound.suspend()
}

function setMode(value, options = {}) {
  needsRedraw = true
  const oldMode = mode
  mode = value
  if (oldMode !== value) {
    clock.reset()
    previousTime = undefined
    controls.reset()
    gesture = undefined
  }
  ui.game.dataset.mode = value
  const running = value === 'running'
  const title = value === 'title'
  const over = value === 'over'
  const paused = value === 'paused'
  let newRecord = false
  if (over && oldMode !== 'over') {
    const report = lodge.finalize(runPlayer, runStatistics, run, contact.type)
    if (report) {
      profile = lodge.current().profile
      fillReport(ui, report)
      fillCareerReport(ui, report, button => lodgeUI.open(button, 'kennel'))
      const posting = diagnosticsRequested ? null : camp.record(runPlayer, report)
      const worldwide = ui['report-worldwide']
      worldwide.dataset.run = String(report.id)
      worldwide.hidden = !posting
      if (posting) {
        worldwide.textContent = submissionMessages[posting.status]
        posting.done?.then(status => {
          if (worldwide.dataset.run === String(report.id)) {
            worldwide.textContent = submissionMessages[status] ?? submissionMessages.pending
          }
        })
      }
      if (!diagnosticsRequested) {
        renderReportRival(runPlayer, runMetric, report, runRival, posting)
        queueMicrotask(() => { if (mode === 'over') promotion.show() })
      }
      newRecord = report.improved.includes('score') || report.improved.includes('distance')
      ui['field-report'].scrollTop = 0
    }
  }
  ui.menu.hidden = running || over
  ui['field-report'].hidden = !over
  ui.hud.hidden = !running
  ui.controls.hidden = !running
  ui.conditions.hidden = !running
  ui.pause.hidden = !(running || paused)
  ui.pause.textContent = paused ? 'Resume' : 'Pause'
  ui.hint.hidden = !title
  ui['current-runner'].hidden = !title
  ui['title-career'].hidden = !title
  ui['open-lodge'].hidden = !title
  if (title) showTitleRecord()
  else ui.record.hidden = true
  ui.eyebrow.textContent = title ? 'THE WETLANDS TRAIL' : habitatAt(run.distance).toUpperCase()
  ui['menu-title'].innerHTML = title ? 'Retriever<br><em>Run</em>' : '<em>Paused</em>'
  ui['menu-copy'].textContent = title ? 'Follow a yellow Lab through the cattails, creek beds, and flooded timber.'
    : 'Your run is held at ' + Math.floor(run.distance) + ' m.'
  ui.primary.textContent = title ? trailReady ? 'Start run' : 'Preparing trail…' : 'Resume run'
  if (!running) {
    flightLabel = ''
    ui['flight-warning'].hidden = true
    ui['patch-toast'].hidden = true
    calloutAnimation?.cancel()
    ui.callout.textContent = ''
  }
  if (options.gesture) {
    audioGesture = true
    updateMusicButton()
  }
  sound.selectScene(value, { ...options, record: newRecord })
  if (over) ui['run-again'].focus({ preventScroll: true })
  if (paused) ui.primary.focus({ preventScroll: true })
  if (running) {
    ui.primary.blur()
    ui.pause.blur()
    ui['run-again'].blur()
    updateHud()
  }
}

function resetTrail(seed) {
  for (const entity of entities) release(entity)
  for (const effect of effects) release(effect)
  entities.length = 0
  effects.length = 0
  run = newRun()
  nextRow = createCourse(seed)
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
  frozen = false
  dog.reset()
  spray.reset()
}

function start() {
  if (!trailReady || !contextReady || ui.onboarding.open || ui.promotion.open ||
      (!lodge.current().enrollment && !diagnosticsRequested)) return
  resetTrail(debug?.seed ?? Math.floor(Math.random() * 0x100000000))
  runPlayer = lodge.current().id
  runStatistics = lodge.beginRun()
  runMetric = lodgeUI.rivalMetric()
  runRival = diagnosticsRequested ? null : camp.peekRival(runPlayer, runMetric)
  nextPatchCheck = toastUntil = 0
  seenPatches.clear()
  patchNotices.length = 0
  setMode('running', { gesture: true, restart: true })
  populate()
}

function mainMenu() {
  resetTrail(2026)
  setMode('title', { gesture: true })
  ui.primary.focus({ preventScroll: true })
}

function move(direction) {
  if (mode === 'running') controls.enqueue(direction)
}

function pause() {
  if (mode === 'running') setMode('paused')
  else if (mode === 'paused' && contextReady) setMode('running', { gesture: true })
}

function openSettings() {
  if (mode === 'running') pause()
  else if (mode !== 'paused') engageMusic()
  for (const key of volumeKeys) ui[key].value = Math.round(profile[key] * 100)
  ui.quality.value = profile.quality
  ui.comfort.checked = profile.comfort
  ui.preferences.showModal()
}

function bindInput() {
  ui.primary.addEventListener('click', () => mode === 'paused' ? pause() : start())
  ui['run-again'].addEventListener('click', start)
  ui['main-menu'].addEventListener('click', mainMenu)
  ui['music-toggle'].addEventListener('click', () => {
    if (!audioGesture && profile.musicVolume) {
      engageMusic()
      return
    }
    if (profile.musicVolume) {
      profile.musicRestore = profile.musicVolume
      profile.musicVolume = 0
    } else {
      profile.musicVolume = profile.musicRestore
    }
    sound.settings(profile)
    saveProfile()
    engageMusic()
  })
  ui.pause.addEventListener('click', pause)
  ui.settings.addEventListener('click', openSettings)
  ui['close-settings'].addEventListener('click', () => ui.preferences.close())
  ui.preferences.addEventListener('close', () => ui.settings.focus())
  for (const key of volumeKeys) {
    ui[key].addEventListener('input', () => {
      profile[key] = ui[key].valueAsNumber / 100
      if (key === 'musicVolume') {
        if (profile.musicVolume) profile.musicRestore = profile.musicVolume
        updateMusicButton()
      }
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
    if (event.altKey || event.metaKey || event.ctrlKey || ui.preferences.open || ui.lodge.open ||
        ui.onboarding.open || ui.promotion.open) return
    const key = event.key.toLowerCase()
    if (key in keys && mode === 'running' && !(key === ' ' && event.target instanceof HTMLButtonElement)) {
      event.preventDefault()
      if (!event.repeat) move(keys[key])
    } else if (!event.repeat && ['p', 'escape'].includes(key)) {
      event.preventDefault()
      pause()
    } else if (!event.repeat && ['enter', ' '].includes(key) && mode !== 'running' && !(event.target instanceof HTMLButtonElement)) {
      event.preventDefault()
      if (mode === 'over') ui['run-again'].click()
      else ui.primary.click()
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
  document.addEventListener('visibilitychange', () => { if (document.hidden) background() })
  window.addEventListener('blur', () => { if (mode === 'running') background() })
  window.addEventListener('pagehide', background)
}
