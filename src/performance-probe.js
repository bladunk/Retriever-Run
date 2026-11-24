export function createPerformanceProbe(now = () => performance.now()) {
  const limit = 720
  const wallTimes = new Float32Array(limit)
  const cpuTimes = new Float32Array(limit)
  const record = { ready: null, restart: null, frames: 0, discarded: 0, draws: 0, triangles: 0,
    textures: 0, geometries: 0, residentTiles: 0, residentPacks: 0, territory: null, transitions: [] }
  let start
  let region
  function distribution(values) {
    const samples = Array.from(values.subarray(0, Math.min(record.frames, limit))).sort((a, b) => a - b)
    const n = samples.length
    if (!n) return null
    const pick = part => Math.round(samples[Math.ceil(n * part) - 1] * 100) / 100
    return { samples: n, median: pick(.5), p95: pick(.95), p99: pick(.99), max: pick(1),
      slow: samples.filter(ms => ms > 33.4).length,
      average: +(samples.reduce((total, ms) => total + ms, 0) / n).toFixed(2) }
  }
  return {
    ready() { record.ready ??= now() },
    restart() { start = now() },
    frame(wall, cpu, renderer, tileCount, territory, packCount = 0) {
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
      if (territory !== region) {
        region = record.territory = territory
        record.transitions.push({ territory, wall, at: now() })
        if (record.transitions.length > 20) record.transitions.shift()
      }
    },
    read() { return { ...record, transitions: [...record.transitions], framesMs: distribution(wallTimes), cpuMs: distribution(cpuTimes) } },
  }
}
