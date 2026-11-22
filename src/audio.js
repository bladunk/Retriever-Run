export function createSound() {
  let context
  let output
  let enabled = true

  function unlock() {
    if (!enabled) return
    const Audio = window.AudioContext ?? window.webkitAudioContext
    if (!Audio) return
    try {
      if (!context) {
        context = new Audio()
        output = context.createGain()
        output.connect(context.destination)
      }
      if (context.state !== 'running') context.resume().catch(() => {})
    } catch {
      // The game is playable on devices that disable audio.
    }
  }

  function note(hz, delay, length, gain = .08, wave = 'sine', end = hz) {
    if (!enabled || context?.state !== 'running') return
    const start = context.currentTime + delay
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    oscillator.type = wave
    oscillator.frequency.setValueAtTime(hz, start)
    oscillator.frequency.exponentialRampToValueAtTime(end, start + length)
    envelope.gain.setValueAtTime(.001, start)
    envelope.gain.exponentialRampToValueAtTime(gain, start + .014)
    envelope.gain.exponentialRampToValueAtTime(.001, start + length)
    oscillator.connect(envelope).connect(output)
    oscillator.start(start)
    oscillator.stop(start + length + .02)
    oscillator.onended = () => {
      oscillator.disconnect()
      envelope.disconnect()
    }
  }

  return {
    unlock,
    setEnabled(value) {
      enabled = value
      if (enabled) unlock()
      if (output) output.gain.value = Number(enabled)
    },
    play(effect) {
      if (effect === 'treat') {
        note(740, 0, .11)
        note(1110, .04, .13, .045)
      } else if (effect === 'bonus' || effect === 'power' || effect === 'start') {
        const notes = effect === 'power' ? [523, 659, 784, 1047] : [523, 659, 784]
        notes.forEach((hz, i) => note(hz, i * .065, .21, .075, 'triangle'))
      } else if (effect === 'hit') {
        note(175, 0, .32, .14, 'triangle', 48)
      } else if (effect === 'jump') {
        note(300, 0, .14, .045, 'sine', 580)
      } else if (effect === 'slide') {
        note(160, 0, .16, .046, 'triangle', 68)
      }
    },
  }
}
