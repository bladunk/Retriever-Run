import { createIncidentCapture } from './support-incident.js'
import { createHuntRecap } from './hunt-recap.js'
import { renderHuntResults } from './hunt-results.js'
import fontLicense from './assets/fonts/SOURCE-SERIF-OFL.txt?url'
import { addDestinationIcons } from './field-icons.js'
import { pawSurface } from './field-foley.js'
import { hapticFeedback, rewardGroups } from './hunt-presentation.js'
import * as T from 'three'
import { createHazard, createPickup, prepareWashout } from './art.js'
import { preparePuddle } from './puddle-art.js'
import { createAtmosphere } from './atmosphere.js'
import { discoveryStrength, planDiscoveries, skyDiscovery } from './environment-discoveries.js'
import { createSound } from './audio.js'
import { cameraLayout, newCameraState, updateFollow } from './camera.js'
import { firstContact, hazardFrame, isWaterHazard, playerFrame } from './collision.js'
import { createCampfire } from './campfire.js'
import { createFixedClock, samplePose } from './timing.js'
import { masterySwipe, swipeDirection } from './gesture.js'
import { createRunControls } from './run-controls.js'
import { adaptivePresentation, adaptiveQuality, graphics, pixelRatio } from './quality.js'
import { createPlayer } from './player.js'
import { inspectionBreed } from './master-hunter.js'
import { createFootSpray } from './spray.js'
import { audioDefaults } from './profile.js'
import { productionSession } from './production-session.js'
import { createWakeLock } from './mobile-lifecycle.js'
import { runningBuild } from './build-info.js'
import { createPerformanceProbe } from './performance-probe.js'
import { openLodge } from './lodge-save.js'
import { createCampTransport } from './camp-transport.js'
import { createWorldwideCamp } from './worldwide-camp.js'
import { createRankedCamp, rankedMetrics, verifiedHonorNames } from './ranked-camp.js'
import { recordRankedActions } from './ranked-replay.js'
import { createLodgeUI, fillReport } from './lodge-ui.js'
import { createRunStatistics, deathCause } from './field-stats.js'
import { careerStanding, xpAt } from './career.js'
import { careerLine, fillCareerReport } from './career-ui.js'
import { createOnboarding, restoreEnrollment } from './camp-onboarding.js'
import { createKennelView } from './kennel-view.js'
import {
  advance, collect, courseRuleset, createCourse, getHeight, laneWidth, multiplier, newRun, pickupElevation, touchesPickup,
  jumpDuration, pickupNames, powerDuration, score,
} from './runner.js'
import { expeditionRegions, regionAt } from './expedition.js'
import { courseStages, director, distanceAtTime, localDirector, masteryDirector, speedAtTime, stageAt } from './difficulty.js'
import { localCourseRuleset, masteryCourseRuleset } from './ruleset.js'
import { createMasteryCourse } from './mastery-course.js'
import { collectMastery, createSkillTracker, sweptPickup } from './mastery-events.js'
import { endlessPressure, masteryStart } from './mastery-pace.js'
import { placeOnTrail, trailHeight } from './trail.js'
import { createTerrain } from './terrain.js'
import { createTrailSigns } from './sign-scenery.js'
import { setRockWeather } from './rock-art.js'
import { createDriftingLeaves } from './drifting-leaves.js'
import { fallenVariant } from './fallen-timber.js'
import { createDivingFlocks } from './wildlife.js'
import { fieldSpecies } from './wildlife-catalog.js'
import { createLivingWilderness } from './living-wilderness.js'
import { encounterPose } from './wildlife-motion.js'
import { cranePassage, planWildlifeDiscovery } from './wildlife-encounters.js'
import { createWildlifeSightProbe } from './wildlife-sight-probe.js'
import { diveAge, diveExit, diveWarning } from './dive.js'
import './style.css'
import './lodge.css'
import './experience.css'
import './ranked-camp.css'
import './top-dog.css'
import './masterpiece.css'
import './mastery.css'

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]))
addDestinationIcons(ui)
ui['font-license'].href = fontLicense
const volumeKeys = Object.keys(audioDefaults)
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)')
const reduceMotion = () => systemMotion.matches || profile.motion
function setMotionPreference() {
  document.documentElement.toggleAttribute('data-reduce-motion', reduceMotion())
}
systemMotion.addEventListener?.('change', setMotionPreference)
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
const advancedFlight = { approach: 'Low geese ahead', duck: '↓  Duck or move' }
const introduced = new Set()
let ticks = 0
let debug
let viewWidth = 390
let previousStride = 0
let frozen = false
let finishResults
let completionNeedsSave = false
let playback
const recap = createHuntRecap()
const incidentCapture = createIncidentCapture()
let calloutAnimation

const flags = new URLSearchParams(location.search)
const localPerformance = flags.get('perf') === '1'
const performanceProbe = localPerformance ? createPerformanceProbe(undefined, flags.get('resources') !== '0') : null
const sound = createSound(background, performanceProbe)
const acceptedInputs = []
const pendingInputTimes = new Map()
if (performanceProbe) {
  const readPerformance = () => ({
    ...performanceProbe.read(), audio: sound.resources(), build: runningBuild,
    fairness: { ruleset: runCourse, seed: signSeed, elapsed: run.elapsed, speed: run.speed, lane: run.lane,
      movement: { x:run.x, jump:run.jump, slide:run.slide }, pressure: run.mastery ? endlessPressure(run.elapsed) : null,
      recentInputs: acceptedInputs.map(input => ({ ...input })),
      fatal: mode === 'over' && ticks ? { ...contact } : null,
      nearbyHazards: entities.filter(item => item.hazard).slice(0,12).map(({type,lane,distance,pattern,rowId}) =>
        ({type,lane,ahead:distance-run.distance,pattern,rowId})) },
  })
  window.retrieverPerformance = readPerformance
  const controls = document.createElement('details')
  const label = document.createElement('summary')
  const snapshot = document.createElement('button')
  const output = document.createElement('textarea')
  label.textContent = 'Developer performance'
  snapshot.type = 'button'
  snapshot.textContent = 'Capture performance report'
  output.readOnly = true
  output.rows = 7
  output.setAttribute('aria-label', 'Performance report')
  output.hidden = true
  snapshot.addEventListener('click', () => {
    output.value = JSON.stringify(readPerformance(), null, 2)
    output.hidden = false
    output.select()
  })
  controls.append(label, snapshot, output)
  ui.preferences.append(controls)
}
const wakeLock = createWakeLock(navigator.wakeLock && (() => navigator.wakeLock.request('screen')), () => !document.hidden)
const studioRequested = flags.get('studio') === '1' && (import.meta.env.DEV || import.meta.env.MODE === 'art-studio')
const studioSeed = Number(flags.get('seed') ?? 7) >>> 0
const studioMinute = studioRequested && [5,10,15,20,30].includes(Number(flags.get('minute'))) ? Number(flags.get('minute')) : 0
const previewRegion = studioRequested ? studioMinute ? regionAt(studioMinute * 60) :
  expeditionRegions[Number(flags.get('territory')) - 1] ?? expeditionRegions[0]
  : (import.meta.env.DEV || import.meta.env.MODE === 'migration-qa') ? expeditionRegions[Number(flags.get('preview')) - 1] : undefined
const previewElapsed = studioMinute ? studioMinute * 60 : previewRegion ? previewRegion.seconds + Math.max(0,
  Math.min(previewRegion === expeditionRegions.at(-1) ? 180 : 29.95, Number(flags.get('offset') ?? (studioRequested ? 6 : 0)) || 0)) : 0
const collisionRequested = flags.get('debug') === 'collision' &&
  (import.meta.env.DEV || /^(localhost|127\.0\.0\.1)$/.test(location.hostname))
const diagnosticsRequested = Boolean(previewRegion) || collisionRequested
const lodge = openLodge(undefined, undefined, { practice: diagnosticsRequested })
const breed = collisionRequested || studioRequested ? inspectionBreed(true, flags.get('breed')) : lodge.current().kennel.breed
const campfire = createCampfire(diagnosticsRequested ? () => undefined : undefined)
const campTransport = diagnosticsRequested ? null : createCampTransport()
const camp = createWorldwideCamp(campTransport)
if (!campTransport) performanceProbe?.operation('worldwide-config', 'unconfigured')
const rankedCamp = createRankedCamp(campTransport, camp, { safe: () => mode !== 'running' && !document.hidden,
  onStatus: performanceProbe ? (operation, status) => performanceProbe.operation('worldwide-' + operation, status) : undefined })
ui.game.toggleAttribute('data-practice', diagnosticsRequested)
if (previewRegion) document.querySelector('.practice-status').textContent = 'Territory preview · progress disabled'
if (!diagnosticsRequested) restoreEnrollment(lodge, camp)
const saveProfile = lodge.commit
let profile = lodge.current().profile
setMotionPreference()
let runPlayer
let runStatistics
let discoveriesPlan = []
let wildlifeDiscovery
let lastDiscovery
let discoverySince = 0
let runPermit
let runTrace
let coaching = false
let lastShift = -Infinity
let lastTreat = -Infinity
let lastRetrieve = -Infinity
let carriedBird
let signSeed = 7
let setTerrainSeed = () => {}
let currentTerritory = null
let audioGesture = false

let mode = 'title'
function syncCamp() {
  if (!campTransport || mode === 'running' || document.hidden) return
  void camp.syncPending()
  void rankedCamp.flush()
}
window.addEventListener('online', syncCamp)
if (document.readyState === 'complete') queueMicrotask(syncCamp)
else window.addEventListener('load', syncCamp, { once: true })
let run = newRun()
samplePose(previous, run, run, 1)
let runCourse = localCourseRuleset
let runRules = localDirector
let skill
const announceSkill = (kind, points) => {
  announce((kind === 'near' ? 'Near miss · +' : 'Clean run · +') + points, 2)
  sound.play(kind)
}
let nextRow = createCourse(2026, localDirector)
let row = nextRow()
let stride = 0
let foot = 0
let landing = 0
let splashUntil = 0
let pawWeather = { wet: 0, frost: 0 }
let layout = cameraLayout(1)
const follow = newCameraState()
const adapt = adaptiveQuality(decision => performanceProbe?.operation('auto-quality-decision', decision))
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
  inspectDogs: collisionRequested || studioRequested,
  camp,
  rankedCamp,
  onPlayer() {
    profile = lodge.current().profile
    adapt.stabilize('profile change', true)
    autoPreset = 'balanced'
    setMotionPreference()
    if (!diagnosticsRequested) dog?.chooseBreed(lodge.current().kennel.breed)
    dog?.appearance(lodge.current().kennel.equipment)
    resize?.()
    sound.settings(profile)
    updateMusicButton()
    if (mode === 'title') showTitleRecord()
  },
  onOpen() { engageMusic() },
  onClose() { sound.selectScene(mode) },
  onKennel(stage) { showKennel?.(stage) },
  onDestination(destination) { sound.selectScene(destination === 'kennel' ? 'kennel' : 'lodge') },
  onAppearance(equipment) { dog?.appearance(equipment) },
  onStart(ticket) {
    if (!contextReady || !trailReady || productionSession.locked() ||
        (ticket && (!productionSession.prepared() || !navigator.onLine || Date.parse(ticket.expires) <= Date.now()))) return false
    ui.lodge.close()
    start(ticket)
    return true
  },
  onJoin(player, member) {
    if (player.enrollment === 'guest' || !player.enrollment) {
      lodge.enroll(player.id, member.nickname, 'worldwide')
      if (mode === 'title') showTitleRecord()
    }
  },
  onErase(player) { lodge.enroll(player.id, player.nickname, 'guest') },
})
const onboarding = createOnboarding(ui, lodge, camp, showTitleRecord, start)
ui.lodge.addEventListener('click', event => {
  if (event.target.closest('.lodge-tabs button, .legacy-room-nav button, .journal-categories button, .wildlife-card summary')) {
    sound.play('interface')
  }
})
ui['custom-camp'].addEventListener('click', () => { ui.preferences.close(); onboarding.open() })
ui['open-lodge'].addEventListener('click', event => lodgeUI.open(event.currentTarget))
for (const button of ui['title-rooms'].querySelectorAll('[data-entry]'))
  button.addEventListener('click', () => lodgeUI.open(button, button.dataset.entry))
ui['report-lodge'].addEventListener('click', event => lodgeUI.open(event.currentTarget))
ui.lodge.addEventListener('click', () => { if (ui.lodge.open && !audioGesture) engageMusic() })
sound.settings(profile)
updateMusicButton()
setTimeout(sound.preload, 250)

const renderer = makeRenderer()
if (renderer) initialize()

function initialize() {
  performanceProbe?.stage('rendererReadyMs')
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  const atmosphere = createAtmosphere(scene)
  const signs = createTrailSigns(scene, undefined, performanceProbe)
  const terrain = createTerrain(scene, (anchor, distance) => signs.show(anchor, distance, signSeed), performanceProbe)
  setTerrainSeed = terrain.setSeed
  const leaves = createDriftingLeaves(scene)
  const sightProbe = collisionRequested && flags.get('sight') === '1' ? createWildlifeSightProbe(terrain, () => viewWidth / camera.aspect) : undefined
  if (sightProbe) window.retrieverSightings = () => sightProbe.stamp()
  const mayPrepareWildlife = () => contextReady && mode !== 'running' && !document.hidden &&
    !ui.lodge.open && !ui.preferences.open && !ui.onboarding.open && !ui.tutorial.open && !ui['content-screen'].open
  const wildlife = createLivingWilderness(scene, sound.bird, sound.prepareWildlife, performanceProbe, sightProbe, mayPrepareWildlife)
  performanceProbe?.watch(() => ({
    residentTiles: terrain.count(), residentPacks: terrain.packCount(), surfaces: terrain.landscapeResidency(),
    openingTerrain: terrain.openingMetrics(),
    fernResidency: terrain.fernResidency(),
    dogBreed: dog?.activeBreed() ?? 'loading', migrationFlight:wildlife.migration(),
    adaptiveQuality: adapt.read(),
    drawingBuffer: { width:ui.trail.width, height:ui.trail.height, scale:renderer.getPixelRatio(), devicePixelRatio,
      preset:profile.quality === 'auto' ? autoPreset : profile.quality },
    signs: signs.clarity(), foliage: terrain.foliage(),
    tileTimings: terrain.measurements(), wildlife: wildlife.active(), wildlifeModels: wildlife.metrics(),
    trailPool: { keys: pool.size, idle: [...pool.values()].reduce((sum, bucket) => sum + bucket.length, 0) },
  }))
  const observeWildlife = event => {
    runStatistics?.observe(event)
    if (event.discovery && !diagnosticsRequested) runStatistics?.observeEnvironment(event.discovery)
  }
  const diving = createDivingFlocks(scene)
  if (diagnosticsRequested && navigator.onLine) {
    // The collision overlay is an optional download. A verified offline
    // edition can still inspect a dog when that developer chunk is absent.
    window.retrieverSimulationState = () => ({ ticks, mode, elapsed: run.elapsed, distance: run.distance })
    import('./collision-debug.js').then(({ collisionDebug }) => { debug = collisionDebug(scene) })
      .catch(error => { if (navigator.onLine) console.error(error) })
  }
  dog = createPlayer(scene, breed, createPickup, studioRequested ? 'studio' : collisionRequested ? flags.get('kit') ?? 'master' : undefined,
    () => mode !== 'running')
  if (collisionRequested) window.retrieverInspectDog = {
    breed,
    ready: dog.modelReady,
    orbit: framing => kennel?.inspect(framing),
    resources: () => ({ ...renderer.info.memory }),
  }
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
  let titleWeather
  let studio
  let studioTime = 0
  let studioEvent
  const studioTarget = {}
  const studioAnimalPose = {}
  const studioEvents = []
  const drawingSize = new T.Vector2()
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
    const ratio = pixelRatio(width, height, devicePixelRatio, preset)
    renderer.getSize(drawingSize)
    if (drawingSize.x !== width || drawingSize.y !== height || renderer.getPixelRatio() !== ratio) {
      const started = performanceProbe?.stamp()
      renderer.setDrawingBufferSize(width, height, ratio)
      if (performanceProbe) performanceProbe.operation('drawing-buffer-resize', `${width}×${height} @ ${ratio}`, started)
    }
  }
  showKennel = stage => {
    if (stage === kennelStage || (!stage && !kennelStage)) return
    kennelSize?.disconnect()
    kennelStage = stage
    if (stage) {
      kennel ??= createKennelView()
      kennel.attach(stage)
      stage.append(ui.trail)
      kennelSize?.observe(stage)
      ui.trail.setAttribute('aria-label', '3D Labrador equipment preview')
      dog.moveTo(kennel.room)
    } else {
      kennel?.attach(null)
      ui.game.prepend(ui.trail)
      ui.trail.setAttribute('aria-label', '3D wetlands trail')
      dog.moveTo(scene)
      dog.appearance(studio?.outfit ?? lodge.current().kennel.equipment)
      if (trailPose && mode !== 'title') dog.pose({ ...trailPose, dt: .25 })
    }
    resize()
  }

  if (studioRequested) runCourse = masteryCourseRuleset
  if (studioRequested) import('./art-studio.js').then(({ openArtStudio }) => {
    studio = openArtStudio(ui.game, flags, {
      seed: studioSeed, region: previewRegion.index, breed,
      quality: profile.quality === 'auto' ? autoPreset : profile.quality,
      graphics(quality) { profile.quality = quality; resize() },
      reset: restartStudio,
      appearance: equipment => dog.appearance(equipment),
      kennel: button => lodgeUI.open(button, 'kennel'),
      lodge: (button, room, exhibit, preview) => lodgeUI.open(button,room,exhibit,preview),
      renderer: () => renderer.info.memory,
      practice: () => start(null, performance.now()),
      feedback: kind => {
        const at = run.distance
        if (kind === 'water' || kind === 'mud')
          spray.step(at, run.x, visualTime, kind === 'water', preset.detail, kind)
        if (kind === 'pickup' || kind === 'combo') {
          spray.pickup(at, run.x, visualTime)
          announce(kind === 'combo' ? '25 in a row' : '+6', 2)
          sound.selectScene('studio', { gesture:true })
          sound.play(kind === 'combo' ? 'combo' : 'treat', undefined, 25)
        }
        if (kind === 'near' || kind === 'clean') {
          sound.selectScene('studio', { gesture:true })
          announceSkill(kind, kind === 'near' ? 24 : 36)
        }
      },
      report: exampleReport => setMode('over', { exampleReport }),
      sound,
    })
    restartStudio()
  })

  function restartStudio() {
    studioTime = 0
    resetTrail(studioSeed)
    studioEvent = undefined
    studioEvents.length = 0
    if (studio.take === 'Trail' && studio.hazard) {
      const entity = { hazard:true, type:studio.hazard, lane:studio.hazardLane, distance:run.distance + 17 }
      entity.model = acquire(entity)
      entities.push(entity)
    }
    if (studio.take === 'Wildlife') {
      const animal = fieldSpecies[studio.species]
      const flock = ['goose','crane'].includes(animal.family)
      const flying = flock || animal.family === 'raptor'
      const grounded = ['pheasant','deer','moose','alligator'].includes(animal.family)
      const ahead = (animal.family === 'pheasant' ? { Approach:50, Action:39, Flight:26, Glide:9, Flock:68 } :
        { Approach:42, Action:31, Flight:17, Glide:7, Flock:68 })[studio.wildlifeAction]
      studioEvent = studio.wildlifeAction === 'Flock' ? cranePassage(studioSeed,run.distance+ahead) :
        { id:'studio:'+animal.id+':'+Number(studio.fallback), species:animal.id, seed:studioSeed,
          distance:run.distance+ahead,lateral:-5.6,height:flying ? 4 : 0,count:flock ? 5 : 1,
          kind:grounded ? 'studio' : flying ? 'open' : 'water' }
      studioEvent.previewElapsed = previewElapsed
      studioEvent.previewClock = 0
      studioEvents.push(studioEvent)
    }
    setMode('studio')
  }

  const present = adaptivePresentation()
  const scissor = new T.Vector4()
  const discoveryPoint = new T.Vector3()
  let openerStamp
  let lastRenderMs
  let lastWildlifeWarm = -Infinity

  const stepOnTerrain = dt => terrain.readyAt(run.distance) && step(dt)
  function scenery(distance, time, weather) {
    signs.begin()
    // Auto can reduce drawing work without reallocating the terrain atlas.
    terrain.update(distance, time, weather, preset.detail, profile.quality === 'low' ? 0 : 1,
      profile.quality === 'auto')
    signs.finish()
  }

  function render(ms) {
    const renderStart = performanceProbe?.stamp() ?? 0
    performanceProbe?.animationCallback(renderStart)
    const wall = previousTime === undefined ? 0 : (ms - previousTime) / 1000
    previousTime = ms
    if (!contextReady) return
    const replaying = Boolean(playback)
    if (replaying && !document.hidden) {
      playback.time += Math.min(.10, Math.max(0, wall)) * .48
      if (playback.time > playback.history.at(-1).elapsed + .32) closeRecap()
    }
    let titleSceneUpdated = false
    if (dog.installPrepared()) needsRedraw = true
    if (ui.lodge.open) {
      if (kennelStage) kennel.render(renderer, dog, ms, reduceMotion())
      return
    }
    if (!trailReady && terrain.readyAt(0) && terrain.readyAt(-1)) {
      trailReady = needsRedraw = true
      performanceProbe?.ready()
      ui.primary.disabled = false
      if (mode === 'title') ui.primary.textContent = 'Hunt'

      if (collisionRequested && flags.get('inspect') === 'kennel') {
        ui['open-lodge'].click()
        ui['tab-kennel'].click()
      }
    }
    // The approved title artwork is opaque. Keep the opener's worker and
    // resource jobs moving without continuously animating a covered scene.
    if (mode === 'title' && !needsRedraw && titleWeather && !diagnosticsRequested) {
      scenery(run.distance, visualTime, titleWeather)
      titleSceneUpdated = true
      if (openerStamp === terrain.openingStamp() || navigator.scheduling?.isInputPending?.()) {
        warmSafe(ms)
        return
      }
      needsRedraw = true
    }
    if (mode === 'running' && profile.quality === 'auto') {
      const selected = adapt(wall)
      if (selected !== autoPreset) {
        if (performanceProbe) performanceProbe.operation('auto-quality', `${autoPreset} → ${selected}`)
        autoPreset = selected
        resize()
      }
    }
    let alpha = 1
    if (mode === 'running' && !document.hidden && terrain.readyAt(run.distance)) {
      alpha = clock.advance(wall, stepOnTerrain)
      updateHud()
    }
    const inspecting = mode === 'studio'
    if (inspecting && !document.hidden) {
      studioTime += Math.min(.10, Math.max(0, wall)) * studio.speed
      if (studio.moving && terrain.readyAt(run.distance)) {
        run.elapsed = Math.min(previewElapsed + 18, run.elapsed + Math.max(0, Math.min(.20, wall)) * studio.speed)
        run.distance = distanceAtTime(run.elapsed, runRules)
        for (let i = entities.length - 1; i >= 0; i--) {
          if (entities[i].distance < run.distance - 14) release(entities.splice(i, 1)[0])
        }
      }
    }
    if (mode === 'title' || mode === 'running' || frozen || inspecting && (studio.take !== 'Trail' || !studio.hazard)) populate()
    const autoLow = mode === 'running' && profile.quality === 'auto' && autoPreset === 'low'
    const batterySaver = mode === 'running' && profile.quality === 'low'
    if (!replaying && !present(ms, wall, autoLow, batterySaver) && !needsRedraw) return
    const dt = Math.min(.10, Math.max(0, (ms - (lastRenderMs ?? ms)) / 1000))
    lastRenderMs = ms
    const animate = mode === 'title' || mode === 'running' || inspecting || frozen || replaying
    if (animate) {
      const idle = mode === 'title'
      if (idle) visualTime += dt
      samplePose(display, previous, run, frozen || idle || inspecting ? 1 : alpha)
      let replayStride
      if (playback) {
        const { history, time } = playback
        const after = history.findIndex(pose => pose.elapsed > time)
        const index = after === -1 ? history.length - 1 : after
        const end = history[index]
        const start = history[Math.max(0, index - 1)]
        const fraction = end.elapsed === start.elapsed ? 1 : Math.max(0, Math.min(1, (time - start.elapsed) / (end.elapsed - start.elapsed)))
        samplePose(display, start, end, fraction)
        replayStride = start.stride + (end.stride - start.stride) * fraction
      }
      if (!idle) visualTime = inspecting ? studioTime : display.elapsed
      const distance = display.distance
      const turn = display.lane * laneWidth - display.x
      const ground = trailHeight(distance, display.x)
      const body = playerFrame(dogPosition, display, distance)
      const comfort = profile.comfort || reduceMotion()
      if (idle && diagnosticsRequested) {
        if (layout.portrait) {
          camera.position.set(2.4, 1.95, 3.85)
          camera.lookAt(.06, -.26, -.65)
        } else {
          camera.position.set(2.43, 1.81, 3.37)
          camera.lookAt(-3.92, 1.08, -3.4)
        }
      } else {
        updateFollow(follow, layout, distance, display.x, dt, comfort)
        const impact = run.mastery && !comfort ? Math.min(.035, landing * .035) : 0
        camera.position.set(follow.x, follow.y - impact, follow.z)
        camera.lookAt(follow.tx, follow.ty, follow.tz)
      }
      if (inspecting) {
        if (studioEvent) studioEvent.previewClock = studio.moving ? 0 : studioTime % 3.5
        if (studioEvent && studio.framing === 'animal' && !studioEvent.migration) {
          const animal = fieldSpecies[studioEvent.species]
          encounterPose(studioEvent, animal, studioEvent.distance - distance, visualTime, 0, studioAnimalPose)
          placeOnTrail(studioTarget, studioEvent.distance + studioAnimalPose.along, studioAnimalPose.lateral, distance)
          studioTarget.y = studioAnimalPose.height + animal.size * .32
        } else {
          studioTarget.x = body.x
          studioTarget.y = ground + .75
          studioTarget.z = body.z
        }
        if ((studio.take === 'Dog' && studio.dogCamera !== 'gameplay' || studioEvent && studio.framing === 'animal' && !studioEvent.migration) ||
            studio.yaw || studio.pitch || studio.zoom !== 1) {
          const radius = (studio.take === 'Dog' ? 3.8 : studioEvent ? 4.8 : 6.6) * studio.zoom
          const { x, y, z } = studioTarget
          camera.position.set(x + Math.sin(studio.yaw) * radius, y + 1.25 + studio.pitch, z + Math.cos(studio.yaw) * radius)
          camera.lookAt(x, y, studio.take === 'Trail' ? -12 : z)
        }
        if (studio.take === 'Dog') {
          const cycle = studioTime % 1.7
          const action = studio.playback
          display.jump = action === 'Jump' && cycle < jumpDuration ? jumpDuration - cycle : 0
          body.depth = action === 'Slide' ? .92 : 0
          landing = action === 'Land' ? Math.exp(-cycle * 6) : 0
        }
      }
      landing *= Math.exp(-12 * dt)
      const height = getHeight(display)
      const skyEvent = !inspecting && skyDiscovery(discoveriesPlan,display.elapsed)
      const strength = inspecting ? Number(Boolean(studio.nature)) : discoveryStrength(skyEvent,display.elapsed)
      const weather = atmosphere.update(display.elapsed, visualTime, reduceMotion() ? .34 : preset.weather, distance,
        inspecting ? studio.lighting : 'route', inspecting ? studio.nature : skyEvent?.effect, strength)
      if (idle) titleWeather = weather
      setRockWeather(weather)
      trailPose = {
        x: body.x, z: body.z, height, ground, sliding: body.depth, stride: replayStride ?? previousStride + (stride - previousStride) * alpha,
        time: visualTime, heading: idle ? -2.10 : body.angle - (run.mastery ? Math.max(-.14,Math.min(.14,display.lateralSpeed * .021)) : 0), turn, dt, idle, landing, wet: weather.wet,
        speed: display.speed, lateralSpeed: display.lateralSpeed, retrieve: carriedBird, sinceRetrieve: visualTime - lastRetrieve,
        airborne: display.jump > 0, jumpPhase: display.jump > 0 ? 1 - display.jump / jumpDuration : 1,
      }
      if (inspecting && studio.take === 'Dog') {
        const pace = studio.playback === 'Late run' ? 18.2 : 12
        trailPose.stride = studioTime * pace
        trailPose.height = getHeight(display)
        trailPose.speed = studio.playback === 'Late run' ? 21 : 11
        trailPose.idle = studio.playback === 'Idle' || studio.playback === 'Sit'
        trailPose.sit = studio.playback === 'Sit'
        trailPose.kennel = true
        if (studio.playback === 'Lane change') {
          trailPose.x += Math.sin(studioTime*1.8) * .91
          trailPose.lateralSpeed = Math.cos(studioTime*1.8) * 7
          trailPose.turn = Math.cos(studioTime*1.8)
          trailPose.heading = trailPose.turn * -.18
        }
        if (studio.playback === 'Retrieve') {
          trailPose.retrieve = 'mallard'
          trailPose.sinceRetrieve = studioTime % 2.4
        }
      }
      dog.pose(trailPose)
      glow.visible = display.power > 0
      glow.position.set(body.x, ground + .045, body.z)
      const pulse = 1.05 + Math.sin(visualTime * 11) * .13
      glow.scale.set(pulse, pulse, 1)
      if (!titleSceneUpdated) scenery(distance, visualTime, weather)
      const region = regionAt(display.elapsed)
      leaves(region.index, distance, visualTime, weather, preset.detail, reduceMotion())
      camera.updateMatrixWorld()
      if (mode === 'running' && !diagnosticsRequested) {
        let visible = strength >= .66 ? skyEvent?.id : undefined
        const landmark = !visible && region.key === 'manitoba' && terrain.discovery(distance)
        if (landmark) {
          placeOnTrail(discoveryPoint,landmark.distance,landmark.x,distance)
          discoveryPoint.y = Math.max(-.26,landmark.ground) + 1.15
          discoveryPoint.project(camera)
          if (Math.abs(discoveryPoint.x)<.92 && Math.abs(discoveryPoint.y)<.90 && Math.abs(discoveryPoint.z)<1)
            visible = landmark.discovery
        }
        if (lastDiscovery !== visible) {
          lastDiscovery = visible
          discoverySince = display.elapsed
        }
        if (visible && display.elapsed-discoverySince >= .7) runStatistics?.observeEnvironment(visible)
      }
      const encounters = inspecting && studioEvent ? (studioEvent.migration ? [] : studioEvents) : terrain.encounters()
      const migration = inspecting ? (studioEvent?.migration ? studioEvent : undefined) : wildlifeDiscovery
      wildlife(visualTime, distance, inspecting && studio.fallback ? 0 : preset.detail, mode, encounters, camera, observeWildlife,
        inspecting ? !studio.fallback && preset.detail > 0 : profile.quality !== 'low', migration)
      if (!idle && !frozen && !inspecting && !replaying) {
        pawWeather = weather
        updateConditions(weather.name)
        sound.ambience(weather, visualTime, runningSurface() === 'mud', !display.jump && !display.slide)
      }
      spray.update(distance, visualTime)
      const visibleEntities = playback?.hazards ?? entities
      positionEntities(visualTime, distance, visibleEntities)
      diving(visibleEntities, distance, visualTime, preset.detail === 0)
      frozen = false
    }
    if (mode === 'running' && !document.hidden && !navigator.scheduling?.isInputPending?.())
      terrain.prepareFerns(renderer, camera, false, preset.detail, run.distance)
    if (mode === 'title' || mode === 'running' || inspecting || replaying || needsRedraw) {
      debug?.draw(mode === 'title' ? run : display, entities, mode, {
        ticks, drawCalls: renderer.info.render.calls, geometries: renderer.info.memory.geometries, tiles: terrain.count(), world: terrain.stamps, wildlife: wildlife.stamp,
      }, camera, signs)
      const drawStart = performanceProbe?.stamp()
      if (mode === 'title' && !diagnosticsRequested) {
        // Use the gameplay camera and backbuffer program variants while the
        // approved title covers the canvas. Draw as opener tiles arrive.
        openerStamp = terrain.openingStamp()
        performanceProbe?.nameOpening(scene)
        renderer.getScissor(scissor)
        renderer.setScissor(0,0,2,2)
        renderer.setScissorTest(true)
        try { renderer.render(scene,camera) } finally {
          renderer.setScissorTest(false)
          renderer.setScissor(scissor)
        }
        performanceProbe?.openingRender(drawStart,renderer.info)
      } else {
        const { memory, programs } = renderer.info
        const beforeDraw = performanceProbe && { textures:memory.textures, geometries:memory.geometries,
          programs:programs?.length ?? 0 }
        renderer.render(scene, camera)
        if (mode === 'running' && performanceProbe) {
          const submitted = performanceProbe.stamp()
          for (const input of acceptedInputs) input.submittedAt ??= submitted
        }
        if (mode === 'running' && !studioRequested && wall > 0) incidentCapture.frame(wall * 1000)
        if ((mode === 'running' || inspecting) && performanceProbe) {
          const end = performanceProbe.stamp()
          performanceProbe.graphics(profile.quality, preset.detail)
          performanceProbe.frame(wall * 1000, end - renderStart, renderer.info, regionAt(display.elapsed).key, end, end - drawStart, beforeDraw)
        }
      }
      performanceProbe?.stage('firstSceneSubmitMs')
      needsRedraw = false
    }
    if (mode !== 'title' || diagnosticsRequested) warmSafe(ms)
  }

  function warmSafe(ms) {
    if (mayPrepareWildlife() && ms - lastWildlifeWarm >= 60 && !navigator.scheduling?.isInputPending?.()) {
      lastWildlifeWarm = ms
      if (!trailReady || !terrain.prepareFerns(renderer, camera, true, preset.detail, run.distance))
        wildlife.warmBreak(renderer, camera, mode, preset.detail, run.distance, studioEvent ? studioEvents : terrain.encounters(),
          profile.quality !== 'low' && !studio?.fallback)
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
    ui['menu-copy'].textContent = 'Graphics were interrupted. Waiting for the renderer to recover.'
  })
  ui.trail.addEventListener('webglcontextrestored', () => {
    wildlife.invalidateGPU(renderer)
    terrain.invalidateGPU()
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
  const variant = entity.type === 'fallen' ? fallenVariant(entity.distance, entity.lane) : entity.variant ?? 0
  const style = entity.type === 'rock' ? '-' + variant + '-' + entity.turn : entity.type === 'fallen' ? '-' + variant : ''
  const key = entity.modelKey = entity.type + (entity.wide ? '-wide' : '') + style
  const model = pool.get(key)?.pop()
  const object = model ?? (entity.hazard
    ? createHazard(scenery, entity.type, 0, 0, entity.wide, variant, entity.turn) : createPickup(scenery, entity.type))
  if (model) {
    object.visible = true
    scenery.add(object)
  }
  if (entity.span) prepareWashout(object, entity)
  if (entity.type === 'puddle') preparePuddle(object.children[0], entity)
  return object
}

function release(entity) {
  if (!entity.model) return
  entity.model.removeFromParent()
  const key = entity.modelKey
  if (!entity.hazard) entity.model.scale.setScalar(1)
  if (!pool.has(key)) pool.set(key, [])
  const available = pool.get(key)
  const limit = entity.type === 'treat' ? 32 : entity.span ? 2 : 6
  if (available.length < limit) available.push(entity.model)
  // Ground-conforming water belongs to its pooled object.
  else if (entity.span || entity.type === 'puddle') entity.model.children[0]?.geometry.dispose()
}

function populate() {
  while (row.at < run.distance + 102) {
    for (const entity of row.entities) {
      if (entity.type !== 'goose' && (entity.type !== 'washout' || entity.span)) entity.model = acquire(entity)
      entities.push(entity)
      if (mode === 'running' && entity.hazard) recap.hazard(entity, run.distance)
    }
    row = nextRow()
  }
}

function positionEntities(time, distance, visibleEntities) {
  for (const entity of visibleEntities) {
    if (!entity.model) continue
    entity.model.visible = entity.distance <= distance + 80
    if (!entity.model.visible) continue
    const pose = hazardFrame(obstaclePosition, entity, distance, distance)
    entity.model.position.set(pose.x, pose.y, pose.z)
    entity.model.rotation.y = pose.angle
    if (!entity.hazard) {
      entity.model.rotation.y += time * 1.45 + entity.distance
      entity.model.position.y += pickupElevation(entity, time)
      if (entity.type !== 'treat') entity.model.scale.setScalar(1.18)
    }
  }
  for (const effect of playback ? [] : effects) {
    placeOnTrail(effect.model.position, effect.distance, effect.lane * laneWidth, distance)
    effect.model.position.y = .70 + (1 - effect.remaining / effect.duration) * 1.24
    effect.model.rotation.y += .09
    effect.model.scale.setScalar(Math.max(.01, effect.remaining / effect.duration))
  }
}

function runningSurface() {
  if (splashUntil > run.distance) return 'splash'
  const { kind, snow } = regionAt(run.elapsed)
  if (snow > .32) return 'snow'
  return ['field', 'pothole', 'dunes', 'parkland'].includes(kind) ? 'grass' : ['braids', 'limestone', 'foothills', 'alpine'].includes(kind) ? 'dirt' : 'mud'
}

function onAction(move) {
  if (!studioRequested) incidentCapture.input(ticks, move)
  if (performanceProbe) {
    if (acceptedInputs.length === 24) acceptedInputs.shift()
    acceptedInputs.push({ move, tick:ticks, elapsed:run.elapsed,
      queuedAt:pendingInputTimes.get(move), acceptedAt:performanceProbe.stamp() })
    pendingInputTimes.delete(move)
  }
  runTrace?.add(ticks, move)
  runStatistics.action(move)
  if (move === 'left' || move === 'right') {
    lastShift = run.elapsed
    return
  }
  const surface = runningSurface()
  sound.play(move, run.mastery ? pawSurface(regionAt(run.elapsed), pawWeather.wet, pawWeather.frost, surface === 'splash') : surface)
}

function step(dt) {
  if (collisionRequested) window.retrieverTestTick?.(ticks)
  controls.apply(run, onAction)
  const wasAirborne = run.jump > 0
  samplePose(previous, run, run, 1)
  previousStride = stride
  advance(run, dt, runRules)
  ticks++

  const impacted = firstContact(previous, run, entities, contact)
  if (impacted) {
    if (!studioRequested) incidentCapture.fatal({ seed: signSeed, ruleset: runCourse, territory: regionAt(contact.elapsed).key,
      stage: stageAt(contact.elapsed).level, tick: ticks, before: previous, after: run, contact, entities,
      pressure: run.mastery ? endlessPressure(contact.elapsed) : undefined })
    samplePose(run, previous, run, contact.fraction)
    for (const entity of entities) {
      if (entity.hazard && entity !== impacted) runStatistics.passed(previous, run, entity)
    }
    recap.record(run, stride)
    contact.seed = signSeed
    contact.ruleset = runCourse
    contact.territory = regionAt(contact.elapsed).key
    contact.stage = stageAt(contact.elapsed).level
    debug?.hit(contact)
    frozen = true
    sound.play('hit', isWaterHazard(impacted.type) ? 'splash' : runningSurface())
    hapticFeedback(navigator, profile.haptics, 'collision')
    setMode('over')
    return false
  }
  stride += dt * Math.PI * 2 * Math.min(2.86, 1.84 + (run.speed - 11) * .061)
  const nextFoot = Math.floor(stride / Math.PI)
  if (!run.jump && (nextFoot !== foot || wasAirborne) && !run.slide) {
    const surface = runningSurface()
    sound.footstep(pawSurface(regionAt(run.elapsed), pawWeather.wet, pawWeather.frost, surface === 'splash'), wasAirborne)
    if (surface === 'mud' || surface === 'splash' || run.mastery && !reduceMotion() && (wasAirborne || nextFoot % 4 === 0)) {
      spray.step(run.distance, run.x, run.elapsed, surface === 'splash', preset.detail,
        pawSurface(regionAt(run.elapsed), pawWeather.wet, pawWeather.frost, surface === 'splash'))
    }
    if (wasAirborne) landing = 1
  }
  foot = nextFoot
  if (ticks % 4 === 0) recap.record(run, stride)
  if (Math.floor(previous.distance / 150) < Math.floor(run.distance / 150)) {
    const distance = Math.floor(run.distance / 150) * 150
    announce(distance + ' m · Distance milestone', 2)
    sound.play('milestone')
    if (distance % 750 === 0) hapticFeedback(navigator, profile.haptics, 'milestone')
  }

  skill?.(previous, run, entities, announceSkill)
  let warningLabel = ''
  let warningPhase
  // Rows emit their pickups in course order. Expire earlier treats before
  // collecting a later pickup on the same fixed step.
  for (let index = 0; index < entities.length; index++) {
    const entity = entities[index]
    const ahead = entity.distance - run.distance
    if (entity.hazard) runStatistics.passed(previous, run, entity)
    if (entity.type === 'goose') {
      const warning = diveWarning(entity, run.distance)
      if (warning) {
        if (!warningPhase) {
          warningPhase = warning
          warningLabel = coaching && run.elapsed < 60 ? flightWarnings[warning][entity.safeLane + 1] : advancedFlight[warning]
        }
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
      if (diveAge(entity, run.distance) > diveExit) entities.splice(index--, 1)
      continue
    }
    if (entity.hazard) {
      if (entity.span && !entity.cued && ahead - entity.span * .5 > 0 && ahead - entity.span * .5 < run.speed * 1.45) {
        announce('Change lanes · Flooded trail', 4)
        entity.cued = true
      }
      if (entity.wide && !entity.cued && ahead > 0 && ahead < run.speed * 1.05) {
        if (coaching && run.elapsed < 60 && !introduced.has(entity.type)) {
          announce(entity.type === 'stream' ? '↑  Jump the crossing' : 'Fallen tree · Right lane clear', 4)
          introduced.add(entity.type)
        }
        entity.cued = true
      }
      if (entity.type === 'stream' && previous.distance < entity.distance && run.distance >= entity.distance) {
        splashUntil = entity.distance + 2.4
      }
    }
    if (run.mastery ? sweptPickup(previous, run, entity) : touchesPickup(run, entity)) {
      const result = run.mastery ? collectMastery(run, entity, collect) : collect(run, entity.type)
      runStatistics.pickup(entity.type, entity)
      const treat = entity.type === 'treat'
      if (treat) lastTreat = run.elapsed
      const retrieve = entity.type === 'mallard' || entity.type === 'pheasant'
      if (retrieve) {
        lastRetrieve = run.elapsed
        carriedBird = entity.type
      }
      entity.duration = retrieve ? .72 : .30
      entity.remaining = entity.duration
      const combo = run.mastery ? result.milestone : treat && run.streak <= 15 && run.streak % 5 === 0
      if (retrieve || combo && run.mastery) hapticFeedback(navigator, profile.haptics, 'retrieve')
      sound.play(retrieve ? 'retrieve' : result.activated ? 'power' : combo ? 'combo' : treat ? 'treat' : 'bonus',
        undefined, run.mastery ? run.streak : 0)
      if (retrieve && result.activated) announce(pickupNames[entity.type] + '  +' + result.points + ' · Good Boy bonus', 3)
      else if (result.activated) announce('Good Boy!  ·  Double pickup points', 3)
      else if (!treat) announce(pickupNames[entity.type] + '  +' + result.points, 3)
      else announce('+' + result.points + (run.mastery ? combo ? ' · ' + run.streak + ' in a row' : '' :
        multiplier(run.streak) > 1 ? ' · ' + multiplier(run.streak) + '× streak' : ''), combo ? 2 : 1)
      if (treat && run.mastery) {
        if (!reduceMotion()) spray.pickup(entity.distance, entity.lane * laneWidth, run.elapsed)
        release(entity)
      } else if (retrieve && dog.canCarry()) release(entity)
      else effects.push(entity)
      entities.splice(index--, 1)
    } else if (ahead < (entity.type === 'treat' ? -1 : -8 - (entity.span ?? 0) * .5)) {
      if (entity.type === 'treat' && !entity.comboOptional) run.streak = 0
      release(entity)
      entities.splice(index--, 1)
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

}

function announce(message, priority) {
  if (priority < cuePriority && visualTime < cueUntil) return
  cuePriority = priority
  cueUntil = visualTime + (priority >= 3 ? .94 : .48)
  ui.callout.textContent = message
  calloutAnimation?.cancel()
  if (reduceMotion()) {
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
  const region = regionAt(run.elapsed)
  const habitat = region.name
  if (currentTerritory !== null && currentTerritory !== region.key && !frozen) {
    runStatistics?.discover(region, run.elapsed)
    if (mode === 'running') {
      sound.play('territory')
      hapticFeedback(navigator, profile.haptics, 'milestone')
    }
    announce(region.key === 'manitoba' ? 'Canada · Manitoba Marshlands' : region.name, 2)
  }
  currentTerritory = region.key
  if (ui.habitat.textContent !== habitat) {
    ui.habitat.textContent = habitat
    if (!reduceMotion()) ui.habitat.animate([{ color: '#ffe4a2' }, { color: '#fff3de' }], 1800)
  }
  const condition = habitat + weather
  if (lastCondition === condition) return
  lastCondition = condition
  ui.weather.textContent = weather
}

function updateHud() {
  const points = score(run)
  const distance = Math.floor(run.distance)
  const charge = run.power ? Math.ceil(run.power / powerDuration * 100) : run.meter
  const stage = stageAt(run.elapsed)
  const endless = run.mastery && run.elapsed >= masteryStart
  const stageLabel = endless ? 'Endless' : stage.level
  if (hudCache.stage !== stageLabel) {
    const display = ui['difficulty-stage']
    display.textContent = endless ? 'Endless' : stage.level + ' / ' + courseStages.length
    display.title = endless ? 'Endless survival' : stage.group
    display.setAttribute('aria-label', endless ? 'Endless survival' : 'Stage ' + stage.level + ' of ' + courseStages.length + ', ' + stage.group)
    if (hudCache.stage && stage.level > hudCache.stage && !reduceMotion()) {
      display.animate([{ color: '#fff0cd' }, { color: '#efca91' }], 650)
    }
    hudCache.stage = stageLabel
  }
  if (hudCache.points !== points) ui.score.textContent = format.format(points)
  if (hudCache.distance !== distance) ui.distance.textContent = distance < 1000 ? format.format(distance) + ' m' : (distance / 1000).toFixed(2) + ' km'
  if (hudCache.retrieves !== run.retrieves) ui['hud-retrieves'].textContent = format.format(run.retrieves)
  if (hudCache.charge !== charge) ui.charge.value = charge
  if (hudCache.streak !== run.streak) {
    ui.combo.hidden = run.streak < 5
    if (!ui.combo.hidden) ui.combo.textContent = run.streak + ' treats · ' +
      (run.mastery ? 6 + 2 * (multiplier(run.streak) - 1) + ' pts each' : multiplier(run.streak) + '× combo')
  }
  const powered = run.power > 0
  if (hudCache.powered !== powered) {
    ui.hud.classList.toggle('power', powered)
    ui['meter-label'].textContent = powered ? 'Good Boy · 2× pickup points' : 'Good Boy Meter'
  }
  hudCache.points = points
  hudCache.distance = distance
  hudCache.retrieves = run.retrieves
  hudCache.charge = charge
  hudCache.streak = run.streak
  hudCache.powered = powered
}

function showTitleRecord() {
  const player = lodge.current()
  const career = careerStanding(player.career)
  ui['current-runner'].textContent = 'Playing as ' + player.nickname + (player.enrollment === 'guest' ? ' · Guest Camp' : '')
  ui['title-rank'].textContent = careerLine(player)
  ui['title-xp'].max = career.span
  ui['title-xp'].value = career.within
  ui.record.hidden = !player.masteryBest && !profile.best && !profile.farthest
  const record = player.masteryBest ? 'Best ' + format.format(player.masteryBest)
    : profile.best ? 'Earlier best ' + format.format(profile.best) : ''
  ui.record.textContent = [record, 'Longest run ' + format.format(profile.farthest) + ' m'].filter(Boolean).join('  ·  ')
  const next = career.nextRank
  const remaining = next ? xpAt(next.level) - career.xp : Infinity
  const milestone = !player.stats.runs ? 'Your first hunt earns career XP.'
    : next?.id !== 'master-hunter' && remaining <= 500 ? format.format(remaining) + ' XP to ' + next.name : ''
  ui['title-milestone'].textContent = milestone
  ui['title-milestone'].hidden = !milestone
}

function updateMusicButton() {
  const button = ui['music-toggle']
  button.textContent = profile.musicVolume ? audioGesture ? 'Mute music' : 'Play music' : 'Unmute music'
}

function engageMusic() {
  audioGesture = true
  updateMusicButton()
  const room = ui.lodge.dataset.destination === 'kennel' ? 'kennel' : 'lodge'
  sound.selectScene(ui.lodge.open ? room : mode, { gesture: true })
}

function background() {
  retryHuntSave()
  if (playback) closeRecap()
  finishResults?.()
  audioGesture = false
  updateMusicButton()
  if (mode === 'running') setMode('paused', { immediate: true })
  else sound.suspend()
}

function fitReport() {
  const viewport = window.visualViewport
  if (mode !== 'over' || !viewport || viewport.scale !== 1) return
  ui['field-report'].style.setProperty('--report-viewport', viewport.height + 'px')
  ui['field-report'].style.setProperty('--report-offset', viewport.offsetTop + 'px')
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
    if (value === 'running') adapt.stabilize(options.restart ? 'hunt start' : 'resume')
  }
  ui.game.dataset.mode = value
  const running = value === 'running'
  if (!running) performanceProbe?.pause()
  void wakeLock.set(running && profile.keepAwake)
  const title = value === 'title'
  const over = value === 'over'
  if (!over && oldMode === 'over') {
    finishResults?.()
    finishResults = undefined
  }
  const paused = value === 'paused'
  let newRecord = false
  let rewardCue
  const example = studioRequested && options.exampleReport
  if (over && example) {
    fillReport(ui, example, { heckle: 'Gulf to the Rockies, with a good dog along for the whole ride.' })
    ui['report-career'].hidden = true
    finishResults = renderHuntResults(ui, example, { motion: !reduceMotion() })
  } else if (over && oldMode !== 'over') {
    const runner = lodge.current()
    const previousBest = run.mastery ? runner.masteryBest : runner.profile.best
    const priorRuns = runner.stats.runs
    const repeated = runner.stats.lastHazard === contact.type
    const report = previewRegion
      ? { ...runStatistics.preview(run), cause: deathCause(contact.type), hazard: contact.type, nickname: 'Territory preview',
        improved: [], earned: [], placements: {}, gear: [], preview: true }
      : lodge.finalize(runPlayer, runStatistics, run, contact.type)
    if (report) {
      completionNeedsSave = report.saved === false
      profile = lodge.current().profile
      const { line } = campfire.choose({
        hazard: report.hazard, duration: report.duration, score: report.score, previousBest, priorRuns,
        jump: run.jump > 0, slide: run.slide > 0, changingLane: run.elapsed - lastShift < .45,
        bestStreak: run.bestStreak,
        recentTreat: run.elapsed - lastTreat < .65,
        territory: report.territory, retrieves: report.retrieves, repeated,
        rankedUp: report.career?.before.rank.id !== report.career?.after.rank.id && report.career?.after.rank.id !== 'master-hunter',
        notable: report.newHonors?.some(honor => honor.category === 'Legendary') || report.boyd,
      })
      report.impact = { ...contact }
      const player = previewRegion ? undefined : lodge.players().find(player => player.id === runPlayer)
      fillReport(ui, report, { heckle: line, previousBest: report.previousBest ?? previousBest, player })
      fillCareerReport(ui, report, player, (button, id) => lodgeUI.open(button, 'kennel', id), button => lodgeUI.open(button))
      finishResults = renderHuntResults(ui, report, { player, motion: !reduceMotion(),
        openRoom: (button, room, id) => lodgeUI.open(button, room, id) })
      reportRankedResult()
      newRecord = report.improved.includes('score') || report.improved.includes('distance')
      rewardCue = rewardGroups(report)[0]?.type
      if (rewardCue === 'prestige') hapticFeedback(navigator, profile.haptics, 'prestige')
    }
  }
  ui.menu.hidden = running || over || value === 'studio'
  ui['field-report'].hidden = !over
  ui['run-again'].textContent = example ? 'Back to Art Studio' : 'Play Again'
  ui['report-watch'].hidden = !over || Boolean(example) || !recap.canWatch()
  ui['report-unfair'].hidden = !over || studioRequested
  ui['report-lodge'].hidden = Boolean(example)
  ui['main-menu'].hidden = Boolean(example)
  ui.game.inert = over
  ui.hud.hidden = !running
  ui.controls.hidden = !running
  ui.conditions.hidden = !running
  ui.pause.hidden = !(running || paused)
  ui.pause.textContent = paused ? 'Resume' : 'Pause'
  ui.hint.hidden = !title
  ui['current-runner'].hidden = !title
  ui['title-career'].hidden = !title
  ui['title-rooms'].hidden = !title
  ui['tutorial-entry'].hidden = !title
  ui['pause-actions'].hidden = !paused
  if (!title) ui['title-milestone'].hidden = true
  ui['running-version'].hidden = !title
  if (title) {
    showTitleRecord()
    syncCamp()
  }
  else ui.record.hidden = true
  ui.eyebrow.textContent = title ? 'THE GREAT MIGRATION' : regionAt(run.elapsed).name.toUpperCase()
  ui['menu-title'].innerHTML = title ? 'Retriever <em>Run</em>' : '<em>Paused</em>'
  ui['menu-copy'].textContent = title ? 'Run the Great Migration with your retriever.'
    : 'Your run is held at ' + Math.floor(run.distance) + ' m.'
  ui.primary.textContent = title ? trailReady ? 'Hunt' : 'Preparing trail…' : 'Resume run'
  if (!running) {
    flightLabel = ''
    ui['flight-warning'].hidden = true
    calloutAnimation?.cancel()
    ui.callout.textContent = ''
  }
  if (options.gesture) {
    audioGesture = true
    updateMusicButton()
  }
  sound.selectScene(value, { ...options, record: newRecord, reward: rewardCue })
  if (over) {
    fitReport()
    if (oldMode !== 'over') {
      ui['report-scroll'].scrollTop = 0
      ui['report-title'].focus({ preventScroll: true })
    }
  }
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
  runRules = runCourse === masteryCourseRuleset ? masteryDirector : runCourse === courseRuleset ? director : localDirector
  run = newRun(runRules)
  skill = run.mastery ? createSkillTracker() : undefined
  recap.reset()
  incidentCapture.reset()
  acceptedInputs.length = 0
  pendingInputTimes.clear()
  discoveriesPlan = planDiscoveries(seed)
  wildlifeDiscovery = planWildlifeDiscovery(seed)
  lastDiscovery = undefined
  signSeed = seed
  setTerrainSeed(seed)
  currentTerritory = null
  nextRow = run.mastery ? createMasteryCourse(seed) : createCourse(seed, runRules)
  row = nextRow()
  if (previewRegion) {
    run.elapsed = previewElapsed
    run.distance = distanceAtTime(run.elapsed, runRules)
    run.speed = speedAtTime(run.elapsed, runRules)
  } else debug?.depart(run, runRules)
  const firstPlayable = studioMinute ? run.distance + 28 : run.distance - 2
  while ((row.end ?? row.at) < firstPlayable) row = nextRow()
  stride = previousStride = 0
  ticks = 0
  samplePose(previous, run, run, 1)
  debug?.reset()
  foot = 0
  landing = 0
  splashUntil = 0
  cueUntil = 0
  cuePriority = 0
  lastShift = -Infinity
  lastTreat = -Infinity
  lastRetrieve = -Infinity
  carriedBird = undefined
  introduced.clear()
  follow.heading = null
  follow.offset = 0
  visualTime = 0
  frozen = false
  dog.reset()
  spray.reset()
}

function start(ticket, inputAt) {
  if (productionSession.locked() || ui['content-screen'].open || mode === 'running' || !trailReady || !contextReady ||
      ui.onboarding.open || ui.tutorial.open) return
  if (playback) closeRecap()
  retryHuntSave()
  performanceProbe?.restart(inputAt, renderer.info)
  const profileStart = performanceProbe?.stamp()
  if (!lodge.current().enrollment && !diagnosticsRequested) {
    const player = lodge.current()
    lodge.enroll(player.id, player.nickname, 'guest')
    performanceProbe?.operation('hunt-guest-profile', 'local save', profileStart)
  }
  runPlayer = lodge.current().id
  runPermit = !diagnosticsRequested && ticket?.profile === runPlayer &&
    ticket.owner === camp.member(runPlayer)?.identity ? ticket : null
  runTrace = runPermit ? recordRankedActions() : null
  if (runPermit || collisionRequested && flags.get('course') === 'phase05') runCourse = courseRuleset
  else if (collisionRequested && flags.get('course') !== 'mastery') runCourse = localCourseRuleset
  else runCourse = masteryCourseRuleset
  const trailStart = performanceProbe?.stamp()
  resetTrail(runPermit?.seed ?? debug?.seed ?? (studioRequested ? studioSeed : Math.floor(Math.random() * 0x100000000)))
  performanceProbe?.operation('hunt-trail-reset', 'state and replay setup', trailStart)
  coaching = lodge.current().stats.runs < 3
  const onSkill = debug ? event => debug.skill(event) : undefined
  runStatistics = previewRegion ? createRunStatistics(undefined, onSkill, runCourse) : lodge.beginRun(onSkill, runCourse)
  const uiStart = performanceProbe?.stamp()
  setMode('running', { gesture: true, restart: true })
  performanceProbe?.operation('hunt-scene-entry','HUD and gesture audio',uiStart)
  const spawnStart = performanceProbe?.stamp()
  populate()
  performanceProbe?.operation('hunt-opening-entities','trail entity population',spawnStart)
}

function mainMenu() {
  runCourse = localCourseRuleset
  resetTrail(2026)
  setMode('title', { gesture: true })
  ui.primary.focus({ preventScroll: true })
}

function move(direction) {
  if (mode === 'running' && controls.enqueue(direction) && performanceProbe)
    pendingInputTimes.set(direction, performanceProbe.stamp())
}

function pause() {
  if (mode === 'running') setMode('paused')
  else if (mode === 'paused' && contextReady) setMode('running', { gesture: true })
}

function reportRankedResult() {
  const summary = ui['report-ranked']
  const detail = ui['report-worldwide']
  summary.hidden = detail.hidden = !runPermit
  if (!runPermit) return
  const trace = runTrace?.finish(ticks)
  const posting = rankedCamp.finish(runPermit, trace)
  const local = !trace ? 'Local result saved · Ranked verification covers up to 15 minutes and 2,048 accepted moves.' :
    posting.status === 'expired' ? 'Local result saved · Ranked entry expired.' :
    posting.status === 'queue_full' ? 'Local result saved · The ranked submission queue is full.' :
    'Local result saved · This hunt did not meet ranked verification requirements.'
  summary.textContent = detail.textContent = posting.status === 'pending' ? 'Worldwide verification pending' : local
  const current = runStatistics
  runPermit = runTrace = null
  posting.done?.then(receipt => {
    if (mode !== 'over' || current !== runStatistics) return
    if (receipt.status === 'ok' || receipt.status === 'duplicate') {
      const records = (receipt.improved ?? []).map(key => rankedMetrics[key]).filter(Boolean)
      summary.textContent = records.length ? 'New Worldwide personal best · ' + records.join(', ') : 'Worldwide hunt verified'
      const honors = verifiedHonorNames(receipt.honors ?? [])
      detail.textContent = [summary.textContent, ...honors].join(' · ')
      if (honors.length) {
        const item = document.createElement('li')
        item.dataset.reward = 'platinum'
        item.textContent = honors.length + (honors.length === 1 ? ' Camp Honor' : ' Camp Honors')
        ui['report-reward-summary'].append(item)
      }
    } else if (['invalid_run', 'invalid_ticket', 'expired'].includes(receipt.status)) {
      summary.textContent = detail.textContent = 'Worldwide result ineligible · Local record saved'
    } else if (receipt.status === 'verifier_missing' || receipt.status === 'schema_missing') {
      detail.textContent = 'Worldwide verification is awaiting server configuration. Your eligible result is queued.'
    } else if (receipt.status === 'reconnect' || receipt.status === 'auth_required') {
      detail.textContent = 'Reconnect your Worldwide identity from Competitive profile. Your eligible result is queued.'
    }
  })
}

function openSettings() {
  if (mode === 'running') pause()
  else if (mode !== 'paused') engageMusic()
  for (const key of volumeKeys) ui[key].value = Math.round(profile[key] * 100)
  ui.quality.value = profile.quality
  ui.swipe.value = profile.swipe
  ui.comfort.checked = profile.comfort
  ui.haptics.checked = profile.haptics
  ui.motion.checked = profile.motion || systemMotion.matches
  ui.motion.disabled = systemMotion.matches
  ui['custom-camp'].hidden = Boolean(lodge.current().enrollment)
  ui.keepAwake.checked = profile.keepAwake
  ui.keepAwake.closest('label').hidden = !navigator.wakeLock
  ui.haptics.closest('label').hidden = typeof navigator.vibrate !== 'function'
  ui.preferences.showModal()
}

function watchRecap() {
  if (mode !== 'over' || playback || !recap.canWatch()) return
  finishResults?.()
  const { history, hazards } = recap.snapshot()
  for (const item of hazards) {
    if (item.type !== 'goose' && (item.type !== 'washout' || item.span)) item.model = acquire(item)
  }
  for (const item of [...entities, ...effects]) if (item.model) item.model.visible = false
  playback = { history, hazards, time: history[0].elapsed }
  ui.game.inert = false
  ui['field-report'].hidden = true
  ui['replay-exit'].hidden = false
  ui['replay-exit'].focus({ preventScroll: true })
  needsRedraw = true
}

function closeRecap() {
  if (!playback) return
  for (const item of playback.hazards) release(item)
  playback = undefined
  ui['replay-exit'].hidden = true
  ui['field-report'].hidden = false
  ui.game.inert = true
  ui['report-watch'].focus({ preventScroll: true })
  frozen = needsRedraw = true
}

function retryHuntSave() {
  if (completionNeedsSave && lodge.commit()) completionNeedsSave = false
}

function bindInput() {
  window.addEventListener('pagehide', retryHuntSave)
  ui['report-watch'].addEventListener('click', watchRecap)
  ui['replay-exit'].addEventListener('click', closeRecap)
  window.visualViewport?.addEventListener('resize', fitReport)
  window.visualViewport?.addEventListener('scroll', fitReport)
  ui.primary.addEventListener('click', event => mode === 'paused' ? pause() : start(null, event.timeStamp))
  ui['run-again'].addEventListener('click', event => {
    if (studioRequested) setMode('studio')
    else start(null, event.timeStamp)
  })
  ui['main-menu'].addEventListener('click', mainMenu)
  ui['pause-settings'].addEventListener('click', openSettings)
  ui['pause-menu'].addEventListener('click', mainMenu)
  ui['pause-restart'].addEventListener('click', event => start(null, event.timeStamp))
  let tutorialTrigger
  for (const id of ['tutorial-entry', 'settings-tutorial']) ui[id].addEventListener('click', event => {
    tutorialTrigger = event.currentTarget
    ui.tutorial.showModal()
  })
  ui['tutorial-close'].addEventListener('click', () => ui.tutorial.close())
  ui.tutorial.addEventListener('close', () => tutorialTrigger?.focus({ preventScroll: true }))
  ui['report-details-toggle'].addEventListener('click', event => {
    const opening = ui['report-details'].hidden
    ui['report-details'].hidden = !opening
    event.currentTarget.setAttribute('aria-expanded', String(opening))
    event.currentTarget.textContent = opening ? 'Hunt summary' : 'Full Field Report'
    if (opening) {
      ui['report-details-title'].scrollIntoView({ block: 'start' })
      ui['report-details-title'].focus({ preventScroll: true })
    } else ui['report-scroll'].scrollTop = 0
  })
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
  ui['export-save'].hidden = diagnosticsRequested
  ui['export-save'].addEventListener('click', () => {
    const json = lodge.exportSave()
    const status = ui['export-save-status']
    status.hidden = false
    if (!json) {
      status.textContent = 'Open the latest version to export this save.'
      return
    }
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'retriever-run-save.json'
    link.click()
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
    status.textContent = 'Keep the exported file private. It contains local profiles, progress and records.'
  })
  ui.preferences.addEventListener('close', () => (mode === 'paused' ? ui['pause-settings'] : ui.settings).focus())
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
  for (const key of ['quality', 'swipe', 'comfort', 'haptics', 'motion', 'keepAwake']) {
    ui[key].addEventListener('change', () => {
      profile[key] = key === 'quality' || key === 'swipe' ? ui[key].value : ui[key].checked
      if (key === 'quality') {
        adapt.stabilize('graphics preference', true)
        autoPreset = 'balanced'
        resize()
      }
      if (key === 'motion') setMotionPreference()
      if (key === 'keepAwake') void wakeLock.set(mode === 'running' && profile.keepAwake)
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
    if (event.altKey || event.metaKey || event.ctrlKey || ui['content-screen'].open || ui.preferences.open || ui.lodge.open ||
        ui.onboarding.open || ui.tutorial.open) return
    const key = event.key.toLowerCase()
    if (mode === 'over' && (event.target === ui['report-scroll'] || event.target.closest?.('summary,a,input,select'))) return
    if (key in keys && mode === 'running' && !(key === ' ' && event.target instanceof HTMLButtonElement)) {
      event.preventDefault()
      if (!event.repeat) move(keys[key])
    } else if (!event.repeat && ['p', 'escape'].includes(key)) {
      event.preventDefault()
      if (playback) closeRecap()
      else pause()
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
    const recognize = run.mastery ? masterySwipe : swipeDirection
    const direction = recognize(event.clientX - gesture.x, event.clientY - gesture.y, viewWidth, finished, profile.swipe)
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
  window.addEventListener('pageshow', () => {
    clock.reset()
    previousTime = undefined
    resize()
  })
}

async function openSupport(kind, source) {
  const { showSupport } = await import('./support-ui.js')
  showSupport({ kind, source, build: runningBuild, diagnostics: () =>
    incidentCapture.diagnostics(profile.quality, kind === 'unfair') })
}
for (const [id, kind] of [['open-feedback','feedback'], ['open-release-notes','updates'], ['report-unfair','unfair']]) {
  ui[id].addEventListener('click', () => void openSupport(kind, ui[id]))
}

function retrySavedFeedback() {
  try {
    const queued = localStorage.getItem('retriever-run.feedback.pending.v1')
    if (queued && queued !== '[]' && !studioRequested) {
      void import('./support-ui.js').then(({ retryFeedback }) => retryFeedback()).catch(() => {})
    }
  } catch { /* Feedback storage can be unavailable. */ }
}
window.addEventListener('online', retrySavedFeedback)
if (navigator.onLine) {
  document.addEventListener('pointerdown', () => setTimeout(retrySavedFeedback, 2000), { once: true })
}
