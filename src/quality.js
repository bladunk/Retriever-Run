export const graphics = {
  low: { dpr: 1.05, pixels: 560000, detail: 0, weather: .36 },
  balanced: { dpr: 1.30, pixels: 960000, detail: 1, weather: .68 },
  high: { dpr: 1.57, pixels: 1550000, detail: 2, weather: .95 },
}
const levels = Object.keys(graphics)

export function pixelRatio(width, height, native, preset) {
  return Math.min(native || 1, preset.dpr, Math.sqrt(preset.pixels / Math.max(1, width * height)))
}

export function adaptiveQuality(onChange) {
  const stabilization = 1.2
  const decisionWindow = 1.2
  let level = 1
  let warmup = stabilization, cooldown = 0
  let resetReason = 'startup'
  let pressure = 0, headroom = 0
  let elapsed = 0, total = 0, samples = 0, late = 0, longest = 0
  let lastWindow, lastDecision

  function clearWindow() {
    elapsed = total = samples = late = longest = 0
  }

  const observe = frame => {
    if (!(frame > 0 && frame < 2)) return levels[level]
    // An isolated resource stall contributes one late sample. It cannot fill a
    // window or bias an exponential average for several subsequent seconds.
    const time = Math.min(frame, .12)
    if (warmup > 0) {
      warmup -= time
      return levels[level]
    }
    cooldown = Math.max(0, cooldown - time)
    elapsed += time
    total += Math.min(frame, .050)
    samples++
    late += Number(frame >= .022)
    longest = Math.max(longest, frame)
    if (elapsed < decisionWindow || samples < 12) return levels[level]

    const mean = total / samples
    const fraction = late / samples
    pressure = mean > .021 && fraction >= .30 ? pressure + 1 : 0
    headroom = mean < .0187 && fraction <= .12 ? headroom + 1 : 0
    lastWindow = { samples, late, meanMs:+(mean*1000).toFixed(2), maxMs:+(longest*1000).toFixed(2),
      seconds:+elapsed.toFixed(2), pressureWindows:pressure, headroomWindows:headroom }
    clearWindow()

    const direction = pressure >= 2 && level > 0 ? -1 : headroom >= (level === 0 ? 3 : 4) && level < 2 ? 1 : 0
    if (direction && !cooldown) {
      const from = levels[level]
      level += direction
      cooldown = 2.4
      pressure = headroom = 0
      lastDecision = { from, to:levels[level], reason:direction < 0 ? 'sustained frame pressure' : 'consistent frame headroom', ...lastWindow }
      onChange?.(lastDecision)
    }
    return levels[level]
  }
  observe.stabilize = (reason, initial = false) => {
    if (initial) level = 1
    warmup = stabilization
    resetReason = reason
    pressure = headroom = 0
    clearWindow()
  }
  observe.read = () => ({ level:levels[level], resetReason, stabilizing:warmup > 0,
    stabilizationRemainingMs:Math.round(Math.max(0,warmup)*1000), cooldownRemainingMs:Math.round(cooldown*1000),
    recoveryWindows:headroom, recoveryTarget:level === 0 ? 3 : level === 1 ? 4 : null,
    window:{ samples, late, seconds:elapsed }, lastWindow, lastDecision })
  return observe
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
