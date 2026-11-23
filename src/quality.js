export const graphics = {
  low: { dpr: .86, pixels: 515000, detail: 0, weather: .36 },
  balanced: { dpr: 1.22, pixels: 960000, detail: 1, weather: .68 },
  high: { dpr: 1.57, pixels: 1550000, detail: 2, weather: .95 },
}
const levels = Object.keys(graphics)

export function pixelRatio(width, height, native, preset) {
  return Math.min(native || 1, preset.dpr, Math.sqrt(preset.pixels / Math.max(1, width * height)))
}

export function adaptiveQuality() {
  let level = 1
  let average = 1 / 60
  let slow = 0
  let fast = 0
  let hold = 0
  return (frame) => {
    if (frame > 0 && frame < .35) {
      average += (frame - average) * -Math.expm1(-frame * 1.7)
      hold = Math.max(0, hold - frame)
      slow = average > .0205 ? slow + frame : Math.max(0, slow - frame * 2)
      fast = average < .0175 ? fast + frame : 0
      if (!hold && ((slow > 1.15 && level > 0) || (fast > 12 && level < levels.length - 1))) {
        level += slow > 1.15 ? -1 : 1
        fast = slow = 0
        hold = 4
      }
    }
    return levels[level]
  }
}

// Release cadence is separate from the fixed-step clock. After a sustained
// drop at Low, skip presentation work when the display is ready before 30 Hz.
export function adaptivePresentation() {
  let slowFor = 0
  let fallback = false
  let deadline
  return (ms, wall, autoLow, batterySaver = false) => {
    if (!autoLow && !batterySaver) {
      slowFor = 0
      fallback = false
      deadline = undefined
      return true
    }
    if (batterySaver) fallback = true
    if (!fallback && wall > 0 && wall < .15) {
      slowFor = wall > .021 ? slowFor + wall : Math.max(0, slowFor - wall * 2)
      fallback = slowFor > 2
    }
    if (!fallback) return true
    if (deadline !== undefined && ms < deadline - 1) return false
    const interval = 1000 / 30
    deadline = deadline === undefined || ms - deadline >= interval ? ms + interval : deadline + interval
    return true
  }
}
