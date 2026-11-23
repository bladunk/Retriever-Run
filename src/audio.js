export function createSound() {
  let context
  let effects
  let music
  let wind
  let rainfall
  let sample
  let effectsOn = true
  let musicOn = false
  let nextNote = 0
  let beat = 0

  function gain(value, destination) {
    const node = context.createGain()
    node.gain.value = value
    node.connect(destination)
    return node
  }

  function filteredNoise(destination, filterType, frequency, level, loop = false, duration = 0) {
    const start = context.currentTime
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const envelope = gain(loop ? level : .001, destination)
    filter.type = filterType
    filter.frequency.value = frequency
    source.buffer = sample
    source.loop = loop
    source.connect(filter).connect(envelope)
    if (loop) {
      source.start()
    } else {
      envelope.gain.exponentialRampToValueAtTime(level, start + .024)
      envelope.gain.exponentialRampToValueAtTime(.001, start + duration)
      source.start(start, Math.random() * 1.4, duration + .025)
      source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect() }
    }
    return envelope.gain
  }

  function unlock() {
    if (!effectsOn && !musicOn) return
    const Audio = window.AudioContext ?? window.webkitAudioContext
    if (!Audio) return
    try {
      if (!context) {
        context = new Audio()
        effects = gain(Number(effectsOn), context.destination)
        music = gain(Number(musicOn), context.destination)
        sample = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
        const data = sample.getChannelData(0)
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
        wind = filteredNoise(effects, 'lowpass', 425, 0, true)
        rainfall = filteredNoise(effects, 'highpass', 1350, 0, true)
      }
      if (context.state !== 'running') context.resume().catch(() => {})
    } catch {
      // Audio and play remain independent on devices that disable Web Audio.
    }
  }

  function note(destination, hz, delay, length, level = .08, wave = 'sine', end = hz, attack = .014) {
    if (!destination || context?.state !== 'running' || !destination.gain.value) return
    const start = context.currentTime + delay
    const oscillator = context.createOscillator()
    const envelope = gain(.001, destination)
    oscillator.type = wave
    oscillator.frequency.setValueAtTime(hz, start)
    oscillator.frequency.exponentialRampToValueAtTime(end, start + length)
    envelope.gain.setValueAtTime(.001, start)
    envelope.gain.exponentialRampToValueAtTime(level, start + attack)
    envelope.gain.exponentialRampToValueAtTime(.001, start + length)
    oscillator.connect(envelope)
    oscillator.start(start)
    oscillator.stop(start + length + .02)
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect() }
  }

  return {
    unlock,
    settings({ sfx, soundtrack }) {
      effectsOn = sfx
      musicOn = soundtrack
      if (effects) effects.gain.value = Number(effectsOn)
      if (music) music.gain.value = Number(musicOn)
    },
    ambience({ wind: breeze, rain }, active) {
      if (context?.state !== 'running') return
      wind.setTargetAtTime(active ? .03 + breeze * .16 : 0, context.currentTime, .30)
      rainfall.setTargetAtTime(active ? rain * .10 : 0, context.currentTime, .34)
      if (!active || !musicOn || context.currentTime < nextNote) return
      const melody = [146.83, 220, 174.61, 261.63, 196, 293.66, 220, 174.61]
      nextNote = context.currentTime + .72
      note(music, melody[beat % melody.length], 0, 1.45, .043, 'triangle', melody[beat % melody.length], .13)
      if (beat % 4 === 0) note(music, melody[beat % melody.length] / 2, 0, 2.75, .046, 'sine', melody[beat % melody.length] / 2, .24)
      beat++
    },
    footstep(surface, heavy = false) {
      if (!effectsOn || context?.state !== 'running') return
      const wood = surface === 'wood'
      const wet = surface === 'mud' || surface === 'splash'
      filteredNoise(effects, wet ? 'bandpass' : 'lowpass', wet ? 1120 : wood ? 580 : 290,
        (heavy ? .13 : .068) * (wet ? 1.45 : 1), wet ? .19 : .09)
      if (wood) note(effects, heavy ? 124 : 163, 0, .08, .035, 'triangle', 79)
    },
    bird(type) {
      if (!effectsOn || context?.state !== 'running') return
      const hz = { goose: 390, mallard: 520, teal: 1130, pheasant: 720 }[type]
      note(effects, hz, .02, .16, .026, 'triangle', hz * .76)
      note(effects, hz * 1.15, .21, .18, .021, 'triangle', hz * .84)
      filteredNoise(effects, 'bandpass', 820, .038, .34)
    },
    approachingGeese() {
      if (!effectsOn || context?.state !== 'running') return
      for (const [delay, pitch] of [[0, 365], [.24, 421]]) {
        note(effects, pitch, delay, .20, .076, 'triangle', pitch * .78, .031)
        note(effects, pitch * 2, delay, .13, .024, 'triangle', pitch * 1.56, .024)
      }
      filteredNoise(effects, 'bandpass', 960, .034, .37)
    },
    play(effect) {
      if (effect === 'treat') {
        note(effects, 690, 0, .11)
        note(effects, 1040, .045, .13, .042)
      } else if (['bonus', 'retrieve', 'power', 'start', 'milestone'].includes(effect)) {
        const notes = effect === 'power' || effect === 'retrieve' ? [440, 554, 659, 880] : [392, 494, 587]
        notes.forEach((hz, i) => note(effects, hz, i * .072, .26, .056, 'triangle'))
      } else if (effect === 'hit') {
        note(effects, 139, 0, .32, .13, 'triangle', 48)
      } else if (effect === 'jump') {
        note(effects, 275, 0, .12, .035, 'sine', 455)
      } else if (effect === 'slide') {
        if (effectsOn && context?.state === 'running') filteredNoise(effects, 'bandpass', 560, .075, .24)
      }
    },
  }
}
