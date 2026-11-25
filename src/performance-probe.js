export function createPerformanceProbe(now = () => performance.now()) {
  const limit = 720
  const wallTimes = new Float32Array(limit)
  const presented = new Float32Array(limit)
  let presentationCount = 0
  let lastPresentation
  const longTasks = []
  let longTasksSupported = false
  try {
    if (globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          longTasks.push({ at: entry.startTime, duration: entry.duration })
          if (longTasks.length > 32) longTasks.shift()
        }
      })
      observer.observe({ type: 'longtask' })
      longTasksSupported = true
    }
  } catch { /* Safari can provide frame intervals without Long Tasks. */ }
  const cpuTimes = new Float32Array(limit)
  const record = { ready: null, restart: null, frames: 0, discarded: 0, draws: 0, triangles: 0,
    textures: 0, geometries: 0, residentTiles: 0, residentPacks: 0, territory: null, transitions: [] }
  let start
  let region
  function distribution(values, count = record.frames) {
    const samples = Array.from(values.subarray(0, Math.min(count, limit))).sort((a, b) => a - b)
    const n = samples.length
    if (!n) return null
    const pick = part => Math.round(samples[Math.ceil(n * part) - 1] * 100) / 100
    return { samples: n, median: pick(.5), p95: pick(.95), p99: pick(.99), max: pick(1),
      over16_7: samples.filter(ms => ms > 16.7).length,
      over33_3: samples.filter(ms => ms > 33.3).length,
      over50: samples.filter(ms => ms > 50).length,
      slow: samples.filter(ms => ms > 33.4).length,
      average: +(samples.reduce((total, ms) => total + ms, 0) / n).toFixed(2) }
  }
  return {
    ready() { record.ready ??= now() },
    restart() { start = now(); lastPresentation = undefined },
    pause() { lastPresentation = undefined },
    presented(stamp) {
      const interval = stamp - (lastPresentation ?? stamp)
      lastPresentation = stamp
      if (interval > 0) presented[presentationCount++ % limit] = interval
    },
    graphics(preset, detail, wildlife, wildlifeModels) {
      if (record.detail !== undefined && record.detail !== detail) record.adaptiveChanges = (record.adaptiveChanges ?? 0) + Number(preset === 'auto')
      record.preset = preset
      record.detail = detail
      record.wildlife = wildlife
      record.wildlifeModels = wildlifeModels
    },
    frame(wall, cpu, renderer, tileCount, territory, packCount = 0, surfaces = null, tileTimings = null) {
      if (start !== undefined) { record.restart = now() - start; start = undefined }
      if (wall > 0 && wall <= 350) {
        const at = record.frames++ % limit
        wallTimes[at] = wall
        cpuTimes[at] = cpu
      } else if (wall > 350) record.discarded++
      record.draws = renderer.render.calls
      record.triangles = renderer.render.triangles
      record.textures = renderer.memory.textures
      record.geometries = renderer.memory.geometries
      record.residentTiles = tileCount
      record.residentPacks = packCount
      if (surfaces) record.surfaces = surfaces
      if (tileTimings) record.tileTimings = tileTimings
      if (territory !== region) {
        region = record.territory = territory
        record.transitions.push({ territory, wall, at: now() })
        if (record.transitions.length > 20) record.transitions.shift()
      }
    },
    read() {
      const presentationMs = distribution(presented, presentationCount)
      return { ...record, transitions: [...record.transitions], framesMs: distribution(wallTimes), cpuMs: distribution(cpuTimes),
        presentationMs, averageFPS: presentationMs?.average ? +(1000 / presentationMs.average).toFixed(1) : null,
        longTasksSupported, longTasks: [...longTasks] }
    },
  }
}
