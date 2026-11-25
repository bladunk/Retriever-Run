const windowSize = 720
const eventLimit = 48
const contextMs = 120

function timing() {
  return { samples: 0, totalMs: 0, maxMs: 0, over20: 0, over33_3: 0, over50: 0 }
}

function totals(id) {
  return { id, presentation: timing(), cpu: timing(), discarded: 0, peakTextures: 0, peakGeometries: 0 }
}

function tally(stats, ms) {
  stats.samples++
  stats.totalMs += ms
  stats.maxMs = Math.max(stats.maxMs, ms)
  stats.over20 += Number(ms > 20)
  stats.over33_3 += Number(ms > 33.3)
  stats.over50 += Number(ms > 50)
}

function summary({ presentation, cpu, ...rest }) {
  const show = ({ totalMs, ...stats }) => ({ ...stats, averageMs: stats.samples ? round(totalMs / stats.samples) : null })
  return { ...rest, presentation: show(presentation), cpu: show(cpu),
    averageFPS: presentation.samples ? +(1000 * presentation.samples / presentation.totalMs).toFixed(1) : null }
}

const round = value => +value.toFixed(2)

function append(list, entry, limit = eventLimit) {
  if (list.length === limit) list.shift()
  list.push(entry)
}

function distribution(values, count) {
  const samples = Array.from(values.subarray(0, Math.min(count, windowSize))).sort((a, b) => a - b)
  const n = samples.length
  if (!n) return null
  const pick = part => round(samples[Math.ceil(n * part) - 1])
  return { samples: n, median: pick(.5), p95: pick(.95), p99: pick(.99), max: pick(1),
    over16_7: samples.filter(ms => ms > 16.7).length,
    over20: samples.filter(ms => ms > 20).length,
    over33_3: samples.filter(ms => ms > 33.3).length,
    over50: samples.filter(ms => ms > 50).length,
    slow: samples.filter(ms => ms > 33.4).length,
    average: round(samples.reduce((sum, ms) => sum + ms, 0) / n) }
}

export function createPerformanceProbe(now = () => performance.now()) {
  const wallTimes = new Float32Array(windowSize)
  const cpuTimes = new Float32Array(windowSize)
  const presented = new Float32Array(windowSize)
  const record = { ready: null, restart: null, frames: 0, discarded: 0, draws: 0, triangles: 0,
    textures: 0, geometries: 0, programs: 0, territory: null, transitions: [], adaptiveChanges: 0 }
  const session = totals(null)
  const previousHunts = []
  const operations = []
  const slowFrames = []
  const longTasks = []
  let hunt
  let start
  let lastPresentation
  let details
  let longTasksSupported = false
  try {
    if (globalThis.PerformanceObserver?.supportedEntryTypes?.includes('longtask')) {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) append(longTasks, { at: entry.startTime, duration: entry.duration }, 32)
      })
      observer.observe({ type: 'longtask' })
      longTasksSupported = true
    }
  } catch { /* Safari can provide frame intervals without Long Tasks. */ }

  function operation(name, detail, startedAt) {
    const at = now()
    const entry = { at, hunt: hunt?.id ?? null, name, detail }
    if (startedAt !== undefined) entry.durationMs = round(at - startedAt)
    append(operations, entry)
    // Async completions just after a spike can be relevant to that same frame.
    for (let index = slowFrames.length - 1; index >= 0; index--) {
      const frame = slowFrames[index]
      if (at - frame.at > contextMs) break
      if (frame.hunt === entry.hunt) append(frame.operations, entry, 12)
    }
  }

  return {
    stamp: now,
    operation,
    watch(read) { details = read },
    ready() { record.ready ??= now() },
    restart() {
      if (hunt) append(previousHunts, summary(hunt), 5)
      hunt = totals((hunt?.id ?? 0) + 1)
      start = now()
      lastPresentation = undefined
    },
    pause() { lastPresentation = undefined },
    graphics(preset, detail) {
      if (record.detail !== undefined && record.detail !== detail && preset === 'auto') record.adaptiveChanges++
      record.preset = preset
      record.detail = detail
    },
    frame(wall, cpu, renderer, territory, at = now(), renderMs = 0) {
      if (start !== undefined) { record.restart = at - start; start = undefined }
      const interval = at - (lastPresentation ?? at)
      lastPresentation = at
      if (interval > 0) {
        presented[session.presentation.samples % windowSize] = interval
        tally(session.presentation, interval)
        if (hunt) tally(hunt.presentation, interval)
      }
      if (wall > 0 && wall <= 350) {
        wallTimes[record.frames++ % windowSize] = wall
      } else if (wall > 350) {
        record.discarded++
        session.discarded++
        if (hunt) hunt.discarded++
      }
      cpuTimes[session.cpu.samples % windowSize] = cpu
      tally(session.cpu, cpu)
      if (hunt) tally(hunt.cpu, cpu)
      record.draws = renderer.render.calls
      record.triangles = renderer.render.triangles
      const { textures, geometries } = renderer.memory
      const textureDelta = textures - record.textures
      const geometryDelta = geometries - record.geometries
      const programs = renderer.programs?.length ?? 0
      const programDelta = programs - record.programs
      record.textures = textures
      record.geometries = geometries
      record.programs = programs
      session.peakTextures = Math.max(session.peakTextures, textures)
      session.peakGeometries = Math.max(session.peakGeometries, geometries)
      if (hunt) {
        hunt.peakTextures = Math.max(hunt.peakTextures, textures)
        hunt.peakGeometries = Math.max(hunt.peakGeometries, geometries)
      }
      if (territory !== record.territory) {
        record.territory = territory
        append(record.transitions, { territory, wall, at }, 20)
        operation('territory', territory)
      }
      if (interval > 50 || cpu > 16.7) {
        const since = at - Math.max(contextMs, interval, cpu)
        append(slowFrames, { at, hunt: hunt?.id ?? null, territory, preset: record.preset, detail: record.detail,
          presentationMs: interval > 0 ? round(interval) : null, cpuMs: round(cpu), renderMs: round(renderMs),
          draws: record.draws, triangles: record.triangles, textures, geometries, programs,
          textureDelta, geometryDelta, programDelta,
          operations: operations.filter(entry => entry.at >= since && entry.hunt === (hunt?.id ?? null)).slice(-12) })
      }
    },
    read() {
      const presentationMs = distribution(presented, session.presentation.samples)
      return { ...record, ...details?.(), transitions: [...record.transitions], framesMs: distribution(wallTimes, record.frames),
        cpuMs: distribution(cpuTimes, session.cpu.samples), presentationMs,
        averageFPS: presentationMs?.average ? +(1000 / presentationMs.average).toFixed(1) : null,
        hunt: hunt ? summary(hunt) : null, session: summary(session), previousHunts: [...previousHunts],
        slowFrames: slowFrames.map(frame => ({ ...frame, operations: [...frame.operations] })), operations: [...operations],
        longTasksSupported, longTasks: [...longTasks] }
    },
  }
}
