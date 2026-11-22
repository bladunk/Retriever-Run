import * as T from 'three'
import { createDog, createHazard, createPickup, createSegment, createSky, segmentLength } from './art.js'
import { createSound } from './audio.js'
import { act, advance, collides, collect, createCourse, getHeight, laneWidth, newRun, pickupNames, powerDuration, score } from './runner.js'
import './style.css'

const ui = Object.fromEntries([...document.querySelectorAll('[id]')].map((element) => [element.id, element]))
const recordKey = 'retriever-run.record'
const sound = createSound()

function readRecord() {
  try {
    const saved = JSON.parse(localStorage.getItem(recordKey))
    if (saved && [saved.score, saved.distance, saved.best].every(Number.isSafeInteger)
      && saved.score >= 0 && saved.distance >= 0 && saved.best >= saved.score) return saved
  } catch {
    // Storage can be unavailable or contain malformed data.
  }
  return { score: 0, distance: 0, best: 0 }
}

function rememberRun() {
  const points = score(run)
  record = { score: points, distance: Math.floor(run.distance), best: Math.max(record.best, points) }
  try { localStorage.setItem(recordKey, JSON.stringify(record)) } catch { /* storage can be unavailable */ }
}

let record = readRecord()
let mode = 'title'
let run = newRun()
let nextRow = createCourse()
let row = nextRow()
let stride = 0
let cameraX = 0
let tall = false
let previousTime
let muted = false
let gesture
let lastStats = ''
let streamHint = false
const entities = []
const effects = []

const scene = new T.Scene()
const camera = new T.PerspectiveCamera(54, 1, .1, 185)
const scenery = new T.Group()
scene.add(scenery)

function makeRenderer() {
  try {
    return new T.WebGLRenderer({ canvas: ui.trail, antialias: true, powerPreference: 'high-performance' })
  } catch {
    ui['menu-copy'].textContent = 'This game needs WebGL 2. Open it in a current browser with hardware acceleration.'
    ui.primary.hidden = true
    ui.hint.hidden = true
    ui.sound.hidden = true
  }
}

const renderer = makeRenderer()
if (renderer) initialize()

function initialize() {
  renderer.toneMapping = T.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.05
  createSky(scene)
  const dog = createDog(scene)
  const tiles = Array.from({ length: 6 }, (_, index) => createSegment(scenery, index % 3 !== 0, index))
  const glow = new T.Mesh(
    new T.RingGeometry(.48, .65, 28),
    new T.MeshBasicMaterial({ color: 0xeaff78, side: T.DoubleSide, transparent: true, opacity: .85 }),
  )
  glow.rotation.x = -Math.PI / 2
  scene.add(glow)

  function resize() {
    const width = ui.game.clientWidth
    const height = ui.game.clientHeight
    tall = width < height
    camera.aspect = width / height
    camera.fov = tall ? 60 : 52
    camera.updateProjectionMatrix()
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5, 1440 / width, 960 / height))
    renderer.setSize(width, height, false)
  }

  function render(time) {
    const dt = Math.min(.045, previousTime === undefined ? 0 : (time - previousTime) / 1000)
    previousTime = time
    if (mode === 'running') step(dt, time / 1000)
    if (mode !== 'paused' && mode !== 'over') {
      const idle = mode === 'title'
      const target = idle && !tall ? -2.55 : run.x * .43
      cameraX += (target - cameraX) * (1 - Math.exp(-6 * dt))
      if (idle && dt === 0) cameraX = target
      camera.position.set(cameraX + (idle && !tall ? 1.45 : 0), tall ? 4.25 : 3.85, tall ? 8.4 : 6.65)
      camera.lookAt(cameraX, idle ? 1.13 : .82, idle ? -7 : -7.8)
      dog.pose({
        x: run.x, height: getHeight(run), sliding: run.slide > 0, stride, time: time / 1000,
        heading: idle ? -1.82 : (run.x - run.lane * laneWidth) * .13, idle,
      })
      glow.visible = run.power > 0
      glow.position.set(run.x, .035, 0)
      const pulse = 1.05 + Math.sin(time * .012) * .18
      glow.scale.set(pulse, pulse, 1)
      if (idle) populate()
    }
    for (const [index, tile] of tiles.entries()) {
      const span = tiles.length * segmentLength
      const offset = (run.distance - index * segmentLength) % span
      tile.position.z = offset > segmentLength ? offset - span : offset < segmentLength - span ? offset + span : offset
    }
    renderer.render(scene, camera)
  }

  resize()
  window.addEventListener('resize', resize)
  ui.trail.addEventListener('webglcontextlost', (event) => {
    event.preventDefault()
    if (mode === 'running') setMode('paused')
    ui.primary.disabled = true
    ui['menu-copy'].textContent = 'The graphics connection was interrupted. Waiting for it to recover.'
  })
  ui.trail.addEventListener('webglcontextrestored', () => {
    ui.primary.disabled = false
    if (mode !== 'running') setMode(mode)
  })
  bindInput()
  setMode('title')
  renderer.setAnimationLoop(render)
}

function populate() {
  while (row.at < run.distance + 88) {
    for (const entity of row.entities) {
      const x = entity.lane * laneWidth
      entity.model = entity.hazard ? createHazard(scenery, entity.type, x, -entity.distance)
        : createPickup(scenery, entity.type, x, -entity.distance)
      entities.push(entity)
    }
    row = nextRow()
  }
}

function step(dt, time) {
  const previous = advance(run, dt)
  stride += dt * run.speed * 1.36
  populate()
  for (let index = entities.length - 1; index >= 0; index--) {
    const entity = entities[index]
    const ahead = entity.distance - run.distance
    entity.model.position.z = -ahead
    if (!entity.hazard) {
      entity.model.rotation.y = time * 2.1 + entity.distance
      entity.model.position.y = .66 + Math.sin(time * 5 + entity.distance * .27) * .11
    }
    if (entity.type === 'stream' && !streamHint && ahead > 0 && ahead < 13) {
      announce('↑ Jump the stream')
      streamHint = true
    }
    if (ahead <= 0 && previous < entity.distance && entity.hazard && collides(run, entity)) {
      sound.play('hit')
      setMode('over')
      break
    }
    if (!entity.hazard && Math.abs(ahead) < .82 && Math.abs(run.x - entity.model.position.x) < .83 && getHeight(run) < 1.4) {
      const result = collect(run, entity.type)
      sound.play(result.activated ? 'power' : entity.type === 'treat' ? 'treat' : 'bonus')
      announce(result.activated ? 'Good Boy!  ·  Shield + 2× pickups'
        : entity.type === 'treat' ? '+' + result.points : pickupNames[entity.type] + '  +' + result.points)
      effects.push({ model: entity.model, time: .22 })
      entities.splice(index, 1)
    } else if (ahead < -9) {
      entity.model.removeFromParent()
      entities.splice(index, 1)
    }
  }
  for (let index = effects.length - 1; index >= 0; index--) {
    const effect = effects[index]
    effect.time -= dt
    effect.model.position.y += dt * 6
    effect.model.scale.setScalar(Math.max(.001, effect.time / .22))
    if (effect.time <= 0) {
      effect.model.removeFromParent()
      effects.splice(index, 1)
    }
  }
  updateHud()
}

function announce(message) {
  ui.callout.textContent = message
  ui.callout.classList.remove('pop')
  void ui.callout.offsetWidth
  ui.callout.classList.add('pop')
}

function updateHud() {
  const points = score(run)
  const distance = Math.floor(run.distance)
  const charge = run.power ? Math.ceil(run.power / powerDuration * 100) : run.meter
  const stats = [points, distance, record.best, charge, Boolean(run.power)].join(',')
  if (stats === lastStats) return
  lastStats = stats
  ui.score.textContent = points.toLocaleString()
  ui.distance.textContent = distance.toLocaleString() + ' m'
  ui.best.textContent = record.best.toLocaleString()
  ui.charge.value = charge
  ui.hud.classList.toggle('power', Boolean(run.power))
  ui['meter-label'].textContent = run.power ? 'Good Boy! · Shield + 2× pickups' : 'Good Boy Meter'
}

function setMode(value) {
  mode = value
  const running = value === 'running'
  const title = value === 'title'
  const over = value === 'over'
  const paused = value === 'paused'
  const newBest = over && score(run) > record.best
  if (over) rememberRun()
  ui.menu.hidden = running
  ui.hud.hidden = !running
  ui.controls.hidden = !running
  ui.pause.hidden = !(running || paused)
  ui.pause.textContent = paused ? 'Resume' : 'Pause'
  ui.hint.hidden = !title
  ui.record.hidden = !(over || (title && record.best))
  ui.record.textContent = over
    ? (newBest ? 'New best · ' : '') + record.score.toLocaleString() + ' points  ·  ' + record.distance + ' m  ·  Best ' + record.best.toLocaleString()
    : 'Best ' + record.best.toLocaleString() + '  ·  Last run ' + record.score.toLocaleString() + ' points / ' + record.distance + ' m'
  ui.eyebrow.textContent = title ? 'THE WETLANDS TRAIL' : over ? 'RUN COMPLETE' : 'TAKE A BREATHER'
  ui['menu-title'].innerHTML = title ? 'Retriever<br><em>Run.</em>' : over ? 'Trail<br><em>end.</em>' : '<em>Paused.</em>'
  ui['menu-copy'].textContent = title ? 'Dash through the marsh, dodge the trail hazards, and follow the treats.'
    : over ? 'The marsh is ready for another run.' : 'Pick up where you left off.'
  ui.primary.firstChild.textContent = title ? 'Start run ' : over ? 'Run again ' : 'Resume run '
  if (!running) {
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
  for (const item of [...entities, ...effects]) item.model.removeFromParent()
  entities.length = 0
  effects.length = 0
  run = newRun()
  nextRow = createCourse()
  row = nextRow()
  stride = 0
  streamHint = false
  setMode('running')
}

function move(direction) {
  if (mode !== 'running') return
  if (act(run, direction)) sound.play(direction)
}

function pause() {
  if (mode === 'running') setMode('paused')
  else if (mode === 'paused') {
    sound.unlock()
    setMode('running')
  }
}

function bindInput() {
  ui.primary.addEventListener('click', () => mode === 'paused' ? pause() : start())
  ui.pause.addEventListener('click', pause)
  ui.sound.addEventListener('click', () => {
    muted = !muted
    sound.setEnabled(!muted)
    ui.sound.textContent = muted ? 'Sound off' : 'Sound on'
    ui.sound.setAttribute('aria-pressed', String(!muted))
  })
  for (const button of ui.controls.querySelectorAll('button')) {
    button.addEventListener('click', () => move(button.dataset.move))
  }

  const keys = { arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', arrowup: 'jump', w: 'jump',
    ' ': 'jump', arrowdown: 'slide', s: 'slide' }
  window.addEventListener('keydown', (event) => {
    if (event.altKey || event.metaKey || event.ctrlKey) return
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
  ui.game.addEventListener('pointermove', (event) => {
    if (gesture?.id !== event.pointerId || gesture.moved) return
    const dx = event.clientX - gesture.x
    const dy = event.clientY - gesture.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    gesture.moved = true
    move(Math.abs(dx) > Math.abs(dy) ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'jump' : 'slide')
  })
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    ui.game.addEventListener(name, (event) => {
      if (gesture?.id === event.pointerId) gesture = undefined
    })
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'running') setMode('paused')
  })
}
