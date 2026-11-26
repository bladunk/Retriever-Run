import { expeditionRegions } from './expedition.js'
import { fieldSpecies } from './wildlife-catalog.js'

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
  const saved = new URL(location.href)

  function label(text, control) {
    const row = document.createElement('label')
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
    label(text, input)
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
  select('Graphics', ['low','balanced','high'].map((key, i) => [key, ['Battery Saver','Balanced','High'][i]]),
    api.quality, api.graphics)
  select('View', [['Trail','Territory'], ['Wildlife','Wildlife'], ['Dog','Dog']], 'Trail', value => { state.take = value; api.reset() })
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
  range('Yaw', -3.14, 3.14, .04, 0, value => { state.yaw = value })
  range('Elevation', -1, 2, .05, 0, value => { state.pitch = value })
  range('Distance', .4, 2, .05, 1, value => { state.zoom = value })
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
