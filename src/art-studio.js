import { masteryDirector, speedAtTime } from './difficulty.js'
import { endlessPressure } from './mastery-pace.js'
import { careerStanding, xpAt } from './career.js'
import { honorById } from './field-honors.js'
import { kennelItems } from './kennel-catalog.js'
import { lodgeTiers } from './lodge-progress.js'
import { createLegacyPreview } from './legacy-preview.js'
import { defaultGear, kennelCatalog } from './kennel-catalog.js'
import { expeditionRegions } from './expedition.js'
import { pawSounds } from './field-foley.js'
import { fieldSpecies } from './wildlife-catalog.js'

const cameras = {
  trail: [0,0,1], shore: [-.82,-.25,.80], grove: [.74,1.2,1.05], front: [3.14,-.52,.80], side: [1.57,-.47,.88], face: [2.58,-.26,.52],
}

const dogMoves = ['Idle','Sit','Run','Late run','Lane change','Jump','Slide','Land','Retrieve']

export function openArtStudio(game, flags, api) {
  const details = document.createElement('details')
  details.id = 'art-studio'
  const summary = document.createElement('summary')
  summary.textContent = 'Art Studio · isolated preview'
  details.append(summary)
  const form = document.createElement('form')
  details.append(form)
  form.addEventListener('submit', event => event.preventDefault())
  const view = { dog: 'Dog', wildlife: 'Wildlife' }[flags.get('view')]
  const playback = flags.get('motion')
  const state = { moving: false, speed: 1, yaw: 0, pitch: 0, zoom: 1, take: view ?? 'Trail',
    playback: dogMoves.includes(playback) ? playback : 'Idle',
    dogCamera: flags.get('framing') === 'trail' ? 'gameplay' : 'orbit',
    outfit: defaultGear(api.breed) }
  state.lighting = ['dawn','overcast','mist','rain','snow'].includes(flags.get('light')) ? flags.get('light') : 'route'
  state.nature = ['aurora','sunbreak'].includes(flags.get('nature')) ? flags.get('nature') : ''
  state.hazard = flags.get('hazard') === 'puddle' ? 'puddle' : ''
  state.hazardLane = Math.max(-1, Math.min(1, Number.parseInt(flags.get('lane'), 10) || 0))
  state.wildlifeAction = ['Action','Flight','Glide','Flock'].includes(flags.get('motion')) ? flags.get('motion') : 'Approach'
  state.fallback = flags.get('model') === 'fallback'
  state.framing = flags.get('framing') === 'trail' ? 'trail' : 'animal'
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
  select('View', [['Trail','Territory'], ['Wildlife','Wildlife'], ['Dog','Dog']], state.take, value => { state.take = value; api.reset() })
  select('Trail hazard', [['','Course as played'],['puddle','Isolated puddle']],state.hazard,
    value => { state.hazard = value; api.reset() })
  select('Hazard lane', [[-1,'Left'],[0,'Middle'],[1,'Right']],String(state.hazardLane),
    value => { state.hazardLane = Number(value); api.reset() })
  const cameraPreset = Object.hasOwn(cameras, flags.get('camera')) ? flags.get('camera') : 'trail'
  select('Camera preset', [['trail','Gameplay'],['shore','Shoreline'],['grove','Canopy'],['front','Dog front'],['side','Dog side'],['face','Dog face']],cameraPreset, setCamera)
  select('Lighting', [['route','Route weather'],['dawn','Sunrise'],['overcast','Overcast'],['mist','Morning mist'],['rain','Heavy rain'],['snow','Snow']],
    state.lighting, value => { state.lighting = value })
  select('Environmental event', [['','Route lighting'],['aurora','Aurora over the Divide'],['sunbreak','Eastern slopes sunbreak']],
    state.nature, value => { state.nature = value })
  const species = select('Wildlife species', Object.values(fieldSpecies).map(animal => [animal.id, animal.name]), flags.get('species') ?? 'deer',
    value => { state.species = value; api.reset() })
  state.species = species.value || 'deer'
  select('Wildlife motion', [['Approach','Rest or approach'],['Action','Takeoff or ground movement'],
    ['Flight','Powered flight'],['Glide','Glide or sustained flight'],['Flock','Platte crane migration']],state.wildlifeAction,
    value => { state.wildlifeAction = value; api.reset() })
  select('Wildlife framing', [['animal','Follow animal'],['trail','Gameplay camera']],state.framing,
    value => { state.framing = value })
  select('Wildlife model', [['auto','Default detail'],['fallback','Compact / unskinned']], state.fallback ? 'fallback' : 'auto',
    value => { state.fallback = value === 'fallback'; api.reset() })
  select('Dog', [['lab','Labrador'],['pointer','Pointer'],['boyd','Boyd']], api.breed, value => load('breed', value))
  select('Dog animation', dogMoves.map(key => [key,key]), state.playback, value => { state.playback = value })
  select('Dog framing', [['gameplay','Gameplay'],['orbit','Inspection']], state.dogCamera,
    value => { state.dogCamera = value })
  for (const [category, label, query] of [
    ['coat','Dog coat','coat'], ['vest','Dog vest','vest'], ['collar','Dog neckwear','neckwear'],
  ]) {
    const requested = flags.get(query)
    const items = kennelCatalog[category].filter(item => !item.breed || item.breed === api.breed)
    if (items.some(item => item.id === requested)) state.outfit[category] = requested
    select(label, items.map(item => [item.id, item.name]), state.outfit[category], value => {
      state.outfit[category] = value
      api.appearance(state.outfit)
    })
  }
  api.appearance(state.outfit)
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
  const audioChoices = [
    ['title','Music · title'], ['early','Music · opening'], ['middle','Music · Heartland'],
    ['north','Music · northern wilderness'], ['endless','Music · Endless'],
    ...expeditionRegions.map(region => ['region:' + region.index, region.name + ' ambience']),
    ...Object.keys(pawSounds).map(key => ['paw:' + key, 'Footsteps · ' + key]),
    ['bird:crane','Sandhill crane call'], ['bird:pheasant','Pheasant flush'],
    ['bird:goose','Canada goose call'], ['bird:mallard','Mallard call'], ['bird:eagle','Bald eagle call'],
    ['lodge','Lodge music and room tone'], ['kennel','Kennel music and room tone'],
    ['cue:interface','Navigation cue'], ['cue:retrieve','Retrieve cue'],
  ]
  if (flags.get('view') === 'audio') details.open = true
  const selectedAudio = audioChoices.some(([key]) => key === flags.get('sound')) ? flags.get('sound') : 'title'
  const soundChoice = select('Sound preview', audioChoices, selectedAudio, () => {})
  let stopAudio = () => {}
  const stopButton = button('Stop sound', () => stopAudio())
  const listen = button('Play sound', async () => {
    stopAudio()
    const { sound } = api
    const [key, value] = soundChoice.value.split(':')
    const musicTime = { early: 10, middle: 190, north: 365, endless: 570 }
    const isField = Object.hasOwn(musicTime,key) || key === 'region'
    const seconds = key === 'region' ? Number(value) * 30 + 15 : musicTime[key]
    const scene = isField || key === 'bird' ? 'running' : ['title','lodge','kennel'].includes(key) ? key : 'studio'
    sound.selectScene(scene, { gesture: true, restart: isField, quietMusic: key === 'region' || key === 'bird' })
    const tasks = new Set()
    let playing = true
    stopAudio = () => {
      playing = false
      tasks.forEach(clearTimeout)
      tasks.clear()
      sound.suspend()
      stopButton.hidden = true
    }
    stopButton.hidden = false
    const later = (fn, time) => {
      const handle = setTimeout(() => {
        tasks.delete(handle)
        if (playing) fn()
      }, time)
      tasks.add(handle)
    }
    if (isField) {
      for (let tick = 0; tick < 54; tick++) later(() =>
        sound.ambience({ wind: .7, rain: 0 }, seconds + tick * .20, true, false), tick * 200)
    }
    if (key === 'paw') {
      for (let step = 0; step < 9; step++) later(() => sound.footstep(value), 170 + step * 275)
    }
    if (key === 'bird') {
      await sound.prepareWildlife(value)
      if (!playing) return
      later(() => sound.bird(value, { distance: 8, x: -3.5, wings: value === 'pheasant' }), 250)
    }
    if (key === 'cue') later(() => sound.play(value), 350)
    later(stopAudio, 11000)
  })
  stopButton.hidden = true
  if (flags.get('view') === 'audio') queueMicrotask(() => listen.scrollIntoView({ block:'nearest' }))
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio() })

  const tiers = ['Hunting Shack','Retriever’s Cabin','Waterfowl Lodge','Flyway Estate','Master Hunter’s Lodge']
  const requested = Math.min(5,Math.max(1,Math.floor(Number(flags.get('tier'))) || 1))
  const tier = select('Lodge tier',tiers.map((name,index) => [String(index+1),name]),String(requested),() => {})
  const rooms = { overview:'Cabin', collection:'Trophies', migration:'Great Migration', history:'Career timeline',
    records:'Lifetime records', career:'Ranks and Boyd', journal:'Field Journal' }
  const destination = flags.get('view') === 'journal' ? 'journal' : flags.get('view') === 'map' ? 'migration' :
    Object.hasOwn(rooms,flags.get('room')) ? flags.get('room') : 'overview'
  const room = select('Lodge room',Object.entries(rooms),destination,() => {})
  function preview(trigger) {
    const synthetic = createLegacyPreview(Number(tier.value))
    api.lodge(trigger,room.value,flags.get('exhibit') ?? undefined,synthetic)
  }
  const legacy = button('Open Lodge preview',event => preview(event.currentTarget))
  if (flags.get('view') === 'lodge' || flags.get('view') === 'journal' || flags.get('view') === 'map') queueMicrotask(() => preview(legacy))
  if (['endless','effects','recap'].includes(flags.get('view'))) details.open = true
  const minutes = [5,10,15,20,30]
  const minute = Number(flags.get('minute'))
  select('Practice minute', [['', 'Territory start'], ...minutes.map(value => [value,value + ' min'])],
    minutes.includes(minute) ? String(minute) : '', value => {
      saved.searchParams.set('view','endless')
      load('minute',value)
    })
  if (minutes.includes(minute)) {
    const seconds = minute * 60
    const demand = endlessPressure(seconds)
    const readout = document.createElement('output')
    readout.textContent = speedAtTime(seconds,masteryDirector).toFixed(2) + ' m/s · ' +
      (seconds >= 450 ? demand.stringLength + ' decisions per sequence · ' + demand.relief.toFixed(2) + ' s recovery addition'
        : 'Great Migration')
    form.append(readout)
  }
  const effects = select('Feedback preview', [['pickup','Treat'],['combo','Retrieve combo'],['near','Near miss'],
    ['clean','Clean obstacle run'],['water','Water splash'],['mud','Mud']],flags.get('effect') ?? 'pickup',() => {})
  const feedback = button('Show feedback', () => api.feedback(effects.value))
  if (flags.get('view') === 'effects') queueMicrotask(() => feedback.scrollIntoView({block:'nearest'}))
  const fieldNotes = document.createElement('p')
  fieldNotes.textContent = 'Use Canopy and Shoreline to study the remaster. Run isolated practice to see this territory’s chapter and progress ribbon in motion.'
  form.append(fieldNotes)
  button('Run isolated practice', api.practice)
  const fixtures = ['ordinary','record','partial','level','multi','rank','equipment','trophy','lodge','rare','migration','master']
  const requestedResult = fixtures.includes(flags.get('result')) ? flags.get('result') : 'multi'
  const outcome = select('Hunt Over example', fixtures.map(key => [key,key]), requestedResult, () => {})
  const report = button('See example results', () => {
    const key = outcome.value
    const xp = {
      ordinary:[20,65], partial:[35,82], level:[91,xpAt(2)],
      multi:[83,xpAt(4)+125], rank:[xpAt(11)-30,xpAt(11)+525],
      equipment:[57,140], trophy:[58,136], lodge:[xpAt(11)-52,xpAt(11)+728],
      rare:[0,80], migration:[xpAt(9)-13,xpAt(9)+252], master:[xpAt(100)-700,xpAt(100)+129],
    }[key] ?? [37,84]
    const demoHonor = honorById.get('mallard-retrieve-1')
    const gear = kennelItems.find(item => item.id === 'blaze-vest')
    api.report({
      nickname: 'Example hunt · Art Studio', duration: key === 'migration' ? 452 : 105.8,
      distance: key === 'migration' ? 11532 : 2140, retrieves: 7, score: key === 'record' ? 10273 : 3249,
      territory: key === 'migration' ? 15 : 4, hazard: 'rock', treats: 71,
      logs: 8, slidesCleared: 7, geese: 1, improved: key === 'record' ? ['score','retrieves'] : [],
      earned: [], placements: {}, newWildlife: key === 'rare' ? ['crane','moose'] : [],
      newHonors: key === 'trophy' ? [demoHonor] : [], gear: key === 'equipment' && gear ? [gear] : [],
      lodge: { upgrades: [], tier: key === 'lodge' ? lodgeTiers[1] : null }, boyd: key === 'master',
      career: { before: careerStanding({xp:xp[0]}), after: careerStanding({xp:xp[1]}), earned: xp[1]-xp[0] },
      presentation: { previousRecords:{score:9000,retrieves:6}, migrationCompleted:key === 'migration',
        achievements: [{name:demoHonor.name,from:0,to:key === 'trophy' ? 1 : 0,target:1,completed:key === 'trophy'}] },
      preview: true,
    })
  })
  if (flags.get('view') === 'report') queueMicrotask(() => report.click())
  if (flags.get('view') === 'endless') state.moving = true
  const stats = document.createElement('output')
  stats.hidden = true
  form.append(stats)
  game.append(details)
  return state
}
