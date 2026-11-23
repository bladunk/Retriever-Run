import { instrumentSample, sampleUrls } from './audio-samples.js'
import { beatSeconds, musicMix } from './marshland.js'
import { createMusicTransport } from './music-transport.js'
import { audioDefaults } from './profile.js'

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))
const vary = (low, high) => low + Math.random() * (high - low)
const footsteps = {
  mud: [370, .037, .124, 'lowpass'],
  grass: [610, .027, .083, 'lowpass'],
  dirt: [310, .032, .077, 'lowpass'],
  wood: [590, .035, .073, 'lowpass'],
  splash: [1090, .048, .169, 'bandpass'],
}

const rewards = {
  treat: [62, 69],
  combo: [62, 66, 74],
  bonus: [57, 62, 66],
  retrieve: [54, 62, 69],
  power: [50, 57, 62, 66],
  milestone: [57, 62, 66],
  promotion: [50, 57, 66, 69, 74],
}

export function createSound(onInterruption) {
  let context
  let buses
  let trail
  let musicBed
  let flightGate
  let layers
  let noise
  let wind
  let water
  let rain
  let levels = { ...audioDefaults }
  let playing = false
  let scheduler
  let transitionTimer
  let scene = 'title'
  let flight
  let elapsed = 0
  let intensity
  const transport = createMusicTransport()
  let lastEnvironment = -Infinity
  let nextDistant
  let nextBreath
  const buffers = new Map()
  const pending = new Set()
  const downloads = new Map()
  const voices = new Set()

  function gain(value, destination) {
    const bus = context.createGain()
    bus.gain.value = value
    bus.connect(destination)
    return bus
  }

  function ramp(param, value, seconds = .09) {
    const now = context.currentTime
    param.cancelScheduledValues(now)
    param.setTargetAtTime(value, now, seconds)
  }

  function noiseBed(frequency, type) {
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const volume = gain(0, trail)
    filter.type = type
    filter.frequency.value = frequency
    source.buffer = noise
    source.loop = true
    source.connect(filter).connect(volume)
    source.start()
    return volume.gain
  }

  function initialize(Audio) {
    // Safari can honor the hardware silent switch for ambient audio.
    try { if (navigator.audioSession) navigator.audioSession.type = 'ambient' } catch { /* Optional. */ }
    context = new Audio()
    const master = gain(levels.masterVolume, context.destination)
    const limit = context.createDynamicsCompressor()
    limit.threshold.value = -13
    limit.knee.value = 16
    limit.ratio.value = 3
    limit.attack.value = .006
    limit.release.value = .19
    limit.connect(master)
    buses = {
      masterVolume: master,
      musicVolume: gain(levels.musicVolume * .78, limit),
      wildlifeVolume: gain(levels.wildlifeVolume, limit),
      effectsVolume: gain(levels.effectsVolume, limit),
    }
    trail = gain(.001, buses.wildlifeVolume)
    flightGate = gain(1, buses.musicVolume)
    musicBed = gain(0, flightGate)
    layers = musicMix(scene, elapsed).map(level => gain(level, musicBed))
    noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = vary(-1, 1)
    wind = noiseBed(710, 'lowpass')
    water = noiseBed(960, 'bandpass')
    rain = noiseBed(1810, 'highpass')
    context.addEventListener('statechange', () => {
      if (!playing) return
      if (context.state === 'running') {
        if (document.hidden) suspend()
        else beginScheduling()
      } else {
        clearInterval(scheduler)
        scheduler = undefined
        if (context.state === 'interrupted') onInterruption?.()
      }
    })
  }

  function download(name) {
    if (!downloads.has(name)) {
      downloads.set(name, fetch(sampleUrls[name]).then(response => response.ok ? response.arrayBuffer() : null)
        .catch(() => null))
    }
    return downloads.get(name)
  }

  async function load(name) {
    if (buffers.has(name) || pending.has(name)) return
    pending.add(name)
    try {
      const buffer = await download(name)
      if (!buffer) return
      // The callback form also works in Safari versions with a prefixed context.
      const decoded = await new Promise((resolve, reject) => context.decodeAudioData(buffer, resolve, reject))
      buffers.set(name, decoded)
    } catch {
      // The game and procedural foley can still run if an audio download fails.
    } finally {
      pending.delete(name)
      downloads.delete(name)
    }
  }

  function canPlay(bus) {
    return playing && context?.state === 'running' && levels.masterVolume > 0 && levels[bus] > 0
  }

  function voice({ buffer, destination, start, duration, volume, offset = 0, speed = 1, pan = 0,
    panTo = pan, filter, frequency, attack = .009, release = .055, music = false }) {
    if (!buffer || voices.size >= (music ? 30 : 40)) return
    duration = Math.min(duration, (buffer.duration - offset) / speed)
    if (duration < .025) return
    const source = context.createBufferSource()
    source.buffer = buffer
    source.playbackRate.value = speed
    const envelope = gain(.0001, destination)
    envelope.gain.setValueAtTime(.0001, start)
    envelope.gain.linearRampToValueAtTime(volume, start + Math.min(attack, duration * .32))
    envelope.gain.setValueAtTime(volume, start + Math.max(duration * .38, duration - release))
    envelope.gain.linearRampToValueAtTime(.0001, start + duration)
    let output = source
    let eq
    let stereo
    if (filter) {
      eq = context.createBiquadFilter()
      eq.type = filter
      eq.frequency.value = frequency
      output = output.connect(eq)
    }
    if ((pan || panTo) && context.createStereoPanner) {
      stereo = context.createStereoPanner()
      stereo.pan.setValueAtTime(pan, start)
      stereo.pan.linearRampToValueAtTime(panTo, start + duration)
      output = output.connect(stereo)
    }
    output.connect(envelope)
    voices.add(source)
    source.onended = () => {
      voices.delete(source)
      source.disconnect()
      envelope.disconnect()
      eq?.disconnect()
      stereo?.disconnect()
    }
    source.start(start, offset, duration * speed)
  }

  function instrument(name, pitch, start, duration, volume, pan, destination, music = false) {
    const sheet = buffers.get('instruments')
    if (!sheet) return
    const { speed, offset, length } = instrumentSample(name, pitch)
    voice({ buffer: sheet, destination, start, offset, speed, duration: Math.min(duration, length / speed),
      volume, pan, music, release: .083 })
  }

  function pump() {
    if (!playing || context?.state !== 'running' || !buffers.has('instruments')) return
    const audible = canPlay('musicVolume')
    const mix = intensity ?? musicMix(scene, elapsed)
    transport(context.currentTime, (note, at) => {
      if (audible && mix[note.layer] > 0) instrument(note.instrument, note.pitch, at,
        note.length * beatSeconds, note.volume, note.pan, layers[note.layer], true)
    })
  }

  function beginScheduling() {
    if (scheduler === undefined) scheduler = setInterval(pump, 65)
    pump()
  }

  function updateMix() {
    const mix = musicMix(scene, elapsed)
    if (!layers || mix === intensity) return
    intensity = mix
    layers.forEach((layer, index) => ramp(layer.gain, mix[index], .58))
  }

  function suspend() {
    playing = false
    clearTimeout(transitionTimer)
    clearInterval(scheduler)
    scheduler = undefined
    if (context && context.state !== 'suspended') context.suspend().catch(() => {})
  }

  function accent(record) {
    if (!canPlay('musicVolume')) return
    const chord = record ? [[62, 0], [66, .067], [69, .12], [74, .21]]
      : [[57, 0], [64, .041], [62, .18], [50, .22]]
    for (const [note, delay] of chord) {
      instrument('guitar', note, context.currentTime + delay + .065, .62,
        record ? .117 : .091, .05, buses.musicVolume)
    }
  }

  function selectScene(value, { gesture = false, restart = false, record = false, immediate = false } = {}) {
    const previousScene = scene
    scene = value
    clearTimeout(transitionTimer)
    if (restart) {
      elapsed = 0
      lastEnvironment = -Infinity
      nextDistant = vary(10, 17)
      nextBreath = vary(9, 14)
    }
    if (immediate || document.hidden) {
      suspend()
      return
    }
    if (scene === 'paused') {
      if (context?.state === 'running') {
        ramp(musicBed.gain, 0, .062)
        ramp(trail.gain, 0, .065)
        transitionTimer = setTimeout(suspend, 245)
      } else suspend()
      return
    }
    const Audio = window.AudioContext ?? window.webkitAudioContext
    if (!Audio || (!gesture && !playing)) return
    try {
      if (!context) initialize(Audio)
      playing = true
      updateMix()
      ramp(flightGate.gain, 1, .21)
      flight = undefined
      ramp(trail.gain, scene === 'running' ? 1 : 0, .15)
      const arrivingAtReport = scene === 'over' && previousScene === 'running'
      const bed = scene === 'running' ? 1 : scene === 'title' ? .69 : scene === 'lodge' ? .54 : .46
      ramp(musicBed.gain, arrivingAtReport ? .15 : bed, scene === 'running' ? .16 : .21)
      if (arrivingAtReport) {
        accent(record)
        transitionTimer = setTimeout(() => ramp(musicBed.gain, bed, .42), 420)
      }
      if (context.state === 'running') beginScheduling()
      else if (gesture) {
        // Resume on the gesture before asynchronous work so iPhone Safari can play.
        context.resume().then(() => {
          if (!playing || document.hidden) suspend()
          else beginScheduling()
        }).catch(() => {})
      }
      void load('instruments')
      if (scene === 'running') {
        void load('goose')
        void load('mallard')
      }
    } catch {
      // Audio availability is independent of play.
    }
  }

  function rustle(destination, filter, frequency, volume, duration, delay = 0, pan = 0, panTo = pan, attack = .015) {
    voice({ buffer: noise, destination, start: context.currentTime + delay, offset: vary(.03, 1.05),
      filter, frequency, volume, duration, pan, panTo, attack, release: duration * .62 })
  }

  function bird(type, { distance, x, movement = 0, near = false, wings = false, vocal = true, volume = 1 }) {
    if (!canPlay('wildlifeVolume') || (type !== 'goose' && type !== 'mallard')) return
    const attenuation = 1 / (1 + (distance / (near ? 12 : 19)) ** 1.45)
    const pan = clamp(x / Math.max(5, distance * .55), -.84, .84)
    const panTo = clamp(pan + movement * .35, -.90, .90)
    const buffer = buffers.get(type)
    const offset = near && type === 'goose' ? vary(.92, 1.15) : vary(.012, .060)
    if (vocal) {
      voice({ buffer, destination: trail, start: context.currentTime + (near ? .004 : vary(.04, .29)),
        offset, duration: near ? 1.18 : (type === 'goose' ? 2.70 : 2.95),
        volume: (near ? .29 : type === 'goose' ? .27 : .23) * volume * attenuation,
        speed: vary(.967, 1.033), pan, panTo, filter: 'lowpass',
        frequency: clamp(5500 - distance * 78, 850, 5450), attack: .032, release: .13 })
    }
    if (wings) {
      for (let beat = 0; beat < (near ? 3 : 2); beat++) {
        rustle(trail, 'bandpass', vary(780, 1280), .083 * attenuation, .15,
          .026 + beat * (type === 'goose' ? .158 : .109), pan, panTo, .032)
      }
    }
  }

  return {
    selectScene,
    suspend,
    preload() {
      if (!buffers.has('instruments')) void download('instruments').then(bytes => {
        if (!bytes && !pending.has('instruments')) downloads.delete('instruments')
      })
    },
    flight(phase) {
      if (flight === phase) return
      flight = phase
      if (flightGate) ramp(flightGate.gain, phase === 'duck' ? .69 : phase === 'approach' ? .76 : 1,
        phase ? .085 : .34)
    },
    bird,
    settings(profile) {
      for (const key of Object.keys(levels)) {
        levels[key] = profile[key]
        if (buses) ramp(buses[key].gain, levels[key] * (key === 'musicVolume' ? .78 : 1), .025)
      }
    },
    ambience(weather, seconds, wetland, runningOnGround) {
      elapsed = seconds
      if (!playing || context?.state !== 'running') return
      updateMix()
      if (elapsed - lastEnvironment < .15) return
      lastEnvironment = elapsed
      const breeze = .77 + .23 * Math.sin(elapsed * .66)
      ramp(wind, (.020 + weather.wind * .073) * breeze, .34)
      ramp(water, wetland ? (.011 + .006 * Math.sin(elapsed * 1.1)) : .002, .36)
      ramp(rain, weather.rain * .053, .34)
      if (elapsed >= nextDistant) {
        nextDistant = elapsed + vary(19, 36)
        bird(Math.random() > .42 ? 'mallard' : 'goose', {
          distance: vary(40, 61), x: vary(17, 29) * (Math.random() < .5 ? -1 : 1), volume: .82,
        })
      }
      if (elapsed >= nextBreath && runningOnGround && canPlay('effectsVolume')) {
        nextBreath = elapsed + vary(7, 16)
        rustle(buses.effectsVolume, 'bandpass', 840, .017, .18, 0, -.08, 0, .052)
        rustle(buses.effectsVolume, 'bandpass', 750, .013, .16, .31, -.06, 0, .042)
      }
    },
    footstep(surface, landing = false) {
      if (!canPlay('effectsVolume')) return
      const [frequency, level, length, kind] = footsteps[surface] ?? footsteps.dirt
      const bus = buses.effectsVolume
      rustle(bus, kind, frequency * vary(.83, 1.15), level * vary(.77, 1.19) * (landing ? 1.50 : 1),
        length * vary(.82, 1.2), 0, vary(-.10, .10), 0, .008)
      if (surface === 'wood') instrument('wood', 0, context.currentTime + .004, .10, level * .56, 0, bus)
      if (surface === 'splash') rustle(bus, 'bandpass', 1690, .024, .14, .035, .09)
    },
    play(effect, surface = 'dirt') {
      if (!canPlay('effectsVolume')) return
      const bus = buses.effectsVolume
      if (effect === 'jump') rustle(bus, 'lowpass', 450, .027, .081)
      if (effect === 'slide') {
        rustle(bus, 'bandpass', surface === 'mud' ? 485 : 720, .049, .36, 0, -.08, .07, .044)
        rustle(bus, 'lowpass', 360, .024, .39, .08, -.04, .12, .036)
      }
      if (effect === 'hit') {
        instrument('drum', 0, context.currentTime + .005, .18, .105, 0, bus)
        if (surface === 'splash') rustle(bus, 'bandpass', 1090, .061, .22, .006)
        else rustle(bus, 'lowpass', 365, .062, .15)
      }
      const notes = rewards[effect]
      if (notes) {
        if (!buffers.has('instruments')) rustle(bus, 'bandpass', effect === 'combo' ? 950 : 780, .039, .090)
        notes.forEach((pitch, index) => instrument('guitar', pitch,
          context.currentTime + .007 + index * (effect === 'promotion' ? .102 : .048),
          .32, (effect === 'treat' ? .093 : .13) / (1 + index * .18), index * .06, bus))
      }
    },
  }
}
