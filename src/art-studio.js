import { expeditionRegions } from './expedition.js'
import { fieldSpecies } from './wildlife-catalog.js'

const cameras = {
  trail: [0,0,1], shore: [-.82,-.25,.80], grove: [.74,1.2,1.05],
}

export function openArtStudio(game, flags, api) {
  const details = document.createElement('details')
  details.id = 'art-studio'
  const summary = document.createElement('summary')
  summary.textContent = 'Art Studio · isolated preview'
  details.append(summary)
  const form = document.createElement('form')
  details.append(form)
  form.addEventListener('submit', event => event.preventDefault())
  const state = { moving: false, speed: 1, yaw: 0, pitch: 0, zoom: 1, take: 'Trail', playback: 'Idle' }
  state.lighting = ['dawn','overcast','mist','rain','snow'].includes(flags.get('light')) ? flags.get('light') : 'route'
  state.nature = ['aurora','sunbreak'].includes(flags.get('nature')) ? flags.get('nature') : ''
  state.hazard = flags.get('hazard') === 'puddle' ? 'puddle' : ''
  state.hazardLane = Math.max(-1, Math.min(1, Number.parseInt(flags.get('lane'), 10) || 0))
  const saved = new URL(location.href)

  function label(text, control) {
    const row = document.createElement('label')
    control.setAttribute('aria-label', text)
    row.append(text, control)
    form.append(row)
    return control
  }

  function select(text, entries, initial, change) {
    const input = document.createElement('select')
    for (const [value, name] of entries) input.add(new Option(name, value))
    input.value = initial
    input.addEventListener('change', () => change(input.value))
    return label(text, input)
  }

  function range(text, min, max, step, initial, change) {
    const input = document.createElement('input')
    Object.assign(input, { type: 'range', min, max, step, value: initial })
    input.addEventListener('input', () => change(Number(input.value)))
    return label(text, input)
  }

  function button(text, click) {
    const input = document.createElement('button')
    input.type = 'button'
    input.textContent = text
    input.addEventListener('click', click)
    form.append(input)
    return input
  }

  function load(key, value) {
    saved.searchParams.set(key, value)
    location.replace(saved.href)
  }

  select('Territory', expeditionRegions.map(region => [region.index + 1, region.name]), String(api.region + 1),
    value => load('territory', value))
  const seed = document.createElement('input')
  Object.assign(seed, { type: 'number', inputMode: 'numeric', min: 0, max: 4294967295, value: api.seed, step: 1 })
  label('Course seed', seed)
  button('Load seed', () => { if (seed.checkValidity()) load('seed', seed.value) })
  const presets = ['low','balanced','high']
  const graphics = presets.includes(flags.get('quality')) ? flags.get('quality') : api.quality
  select('Graphics', presets.map((key, i) => [key, ['Battery Saver','Balanced','High'][i]]), graphics, api.graphics)
  if (graphics !== api.quality) api.graphics(graphics)
  select('View', [['Trail','Territory'], ['Wildlife','Wildlife'], ['Dog','Dog']], 'Trail', value => { state.take = value; api.reset() })
  select('Trail hazard', [['','Course as played'],['puddle','Isolated puddle']],state.hazard,
    value => { state.hazard = value; api.reset() })
  select('Hazard lane', [[-1,'Left'],[0,'Middle'],[1,'Right']],String(state.hazardLane),
    value => { state.hazardLane = Number(value); api.reset() })
  const cameraPreset = Object.hasOwn(cameras, flags.get('camera')) ? flags.get('camera') : 'trail'
  select('Camera preset', [['trail','Gameplay'],['shore','Shoreline'],['grove','Canopy']],cameraPreset, setCamera)
  select('Lighting', [['route','Route weather'],['dawn','Sunrise'],['overcast','Overcast'],['mist','Morning mist'],['rain','Heavy rain'],['snow','Snow']],
    state.lighting, value => { state.lighting = value })
  select('Environmental event', [['','Route lighting'],['aurora','Aurora over the Divide'],['sunbreak','Eastern slopes sunbreak']],
    state.nature, value => { state.nature = value })
  const species = select('Wildlife species', Object.values(fieldSpecies).map(animal => [animal.id, animal.name]), flags.get('species') ?? 'deer',
    value => { state.species = value; api.reset() })
  state.species = species.value || 'deer'
  select('Wildlife motion', [['Approach','Approach'],['Action','Flush, flight or gallop']], 'Approach',
    value => { state.wildlifeAction = value === 'Action'; api.reset() })
  select('Wildlife model', [['auto','Rig when available'],['fallback','Fallback']], 'auto',
    value => { state.fallback = value === 'fallback'; api.reset() })
  select('Dog', [['lab','Labrador'],['pointer','Pointer'],['boyd','Boyd']], api.breed, value => load('breed', value))
  select('Dog animation', ['Idle','Run','Jump','Slide','Land','Retrieve'].map(key => [key,key]), 'Idle',
    value => { state.playback = value })
  const yaw = range('Yaw', -3.14, 3.14, .04, 0, value => { state.yaw = value })
  const pitch = range('Elevation', -1, 2, .05, 0, value => { state.pitch = value })
  const zoom = range('Distance', .4, 2, .05, 1, value => { state.zoom = value })
  function setCamera(value) {
    const [angle, elevation, distance] = cameras[value]
    state.yaw = yaw.value = angle
    state.pitch = pitch.value = elevation
    state.zoom = zoom.value = distance
  }
  setCamera(cameraPreset)
  range('Playback speed', .25, 2, .25, 1, value => { state.speed = value })
  const move = button('Play camera', () => {
    state.moving = !state.moving
    move.textContent = state.moving ? 'Stop camera' : 'Play camera'
    move.setAttribute('aria-pressed', String(state.moving))
  })
  move.setAttribute('aria-pressed', 'false')
  button('Reset view', api.reset)
  button('Equipment in Kennel', event => api.kennel(event.currentTarget))
  button('Frame stats', () => {
    const snapshot = window.retrieverPerformance?.()
    stats.hidden = !snapshot || !stats.hidden
    if (snapshot) stats.textContent = [
      snapshot.dogBreed, snapshot.preset, snapshot.residentTiles + ' tiles',
      snapshot.wildlifeModels.resident + ' rigged wildlife',
      api.renderer().geometries + ' geometries',
      api.renderer().textures + ' textures',
    ].join(' · ')
  })
  const stats = document.createElement('output')
  stats.hidden = true
  form.append(stats)
  game.append(details)
  return state
}
