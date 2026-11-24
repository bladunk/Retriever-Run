import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium, devices, webkit } from 'playwright'

const args = process.argv.slice(2)
const engine = args.includes('webkit') ? webkit : chromium
const source = process.env.FIELD_SOURCE ?? '.'
const fromSource = name => import(pathToFileURL(resolve(source, 'src', name + '.js')).href)
const { expeditionRegions } = await fromSource('expedition')
const { distanceAtTime, speedAtTime, courseStages, stageAt } = await fromSource('difficulty')
const { advance, createCourse, newRun } = await fromSource('runner')
const { firstContact } = await fromSource('collision')
const { tickSeconds } = await fromSource('timing')
const { buildTile } = await fromSource('terrain-geometry')
const isPhaseThree = expeditionRegions.length === 15
const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/phase-three')
const prefix = '/Retriever-Run/'
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.webp': 'image/webp' }
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const file = resolve(root, path.slice(prefix.length) || 'index.html')
  if (!path.startsWith(prefix) || !file.startsWith(root + sep)) return response.writeHead(404).end()
  try { response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file)) }
  catch { response.writeHead(404).end() }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
await mkdir(output, { recursive: true })
const origin = 'http://127.0.0.1:' + server.address().port
const browser = await engine.launch(engine === chromium ? {
  executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
} : {})
const quality = args.find(arg => ['low','high','balanced','auto'].includes(arg)) ?? 'balanced'
const results = []

function rowsFor(seed, stop) {
  const next = createCourse(seed)
  const rows = []
  for (let row = next(); row.time < stop; row = next()) rows.push(row)
  return rows
}

try {
  const viewport = args.includes('wide') ? { width: 844, height: 470 }
    : args.includes('small') ? { width: 320, height: 568 } : { width: 390, height: 844 }
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport, deviceScaleFactor: args.includes('retina') ? 2 : .70,
    ...(args.includes('video') ? { recordVideo: { dir: output, size: viewport } } : {}) })
  // Block the external APIs, while letting the same-origin app worker serve
  // an actually verified content pack for the full set of offline checkpoints.
  await context.route(/.*/, route => {
    const url = route.request().url()
    return url.startsWith(origin) || url.startsWith('blob:') || url.startsWith('data:') ? route.continue() : route.abort()
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', msg => { if (msg.type() === 'error' && /shader error|THREE.WebGLProgram/i.test(msg.text())) errors.push(msg.text()) })
  await page.addInitScript(initial => {
    const quality = new URLSearchParams(location.search).get('qaview') || initial
    localStorage.setItem('retriever-run.record.practice', JSON.stringify({ quality, masterVolume: 0 }))
    Object.defineProperty(document, 'hidden', { get: () => false })
    const native = window.requestAnimationFrame.bind(window)
    let stamp
    const qa = window.phaseThreeQA = { limit: -1, elapsed: [], rendered: 0 }
    qa.landmarkFrames = []
    window.requestAnimationFrame = callback => native(ms => {
      const state = window.retrieverDebug
      if (stamp === undefined) stamp = ms
      if (state?.mode !== 'running') stamp += 40
      else if (state.distance < qa.limit) stamp += 25
      else if (qa.limit < 0 && quality === 'low') stamp += .10
      const start = performance.now()
      callback(stamp)
      if (qa.inspectLandmark && window.retrieverDebug?.mode === 'running') {
        const frame = window.retrieverDebug
        const tile = frame.world?.find(t => t.index === qa.inspectLandmark)
        qa.landmarkFrames.push({ distance: frame.distance, id: tile?.landmark?.id,
          geometry: tile?.solid, opaque: tile?.solidOpaque })
      }
      if (state?.mode === 'running' && qa.rendered < 180) {
        qa.elapsed.push({ timestamp: ms, cpu: performance.now() - start })
        qa.rendered++
      }
    })
  }, quality)

  async function runAt(distance, seed, sceneQuality = quality) {
    await page.goto(origin + prefix + '?perf=1&debug=collision&volumes=off&scenery=on&seed=' + seed + '&at=' + distance + '&qaview=' + sceneQuality,
      { waitUntil: 'domcontentloaded' })
    if (await page.locator('#content-screen').isVisible()) {
      if (args.includes('offline')) {
        await page.locator('#content-download').tap({ timeout: 40_000 })
      } else await page.locator('#content-online').tap({ timeout: 40_000 })
    }
    await page.waitForFunction(() => !document.querySelector('#game').hidden && !document.querySelector('#primary').disabled,
      null, { timeout: 60_000 })
    await page.addStyleTag({ content: '#collision-debug, #game[data-practice] .practice-status, #callout { display: none }' })
    await page.locator('#primary').tap()
    await page.waitForFunction(() => window.retrieverDebug?.mode === 'running', null, { timeout: 40_000 })
    if (args.includes('offline')) await context.setOffline(true)
    await settle(distance, sceneQuality)
    await page.waitForFunction(quality => {
      const surfaces = window.retrieverPerformance()?.surfaces
      return !surfaces || surfaces.active === (quality === 'low' ? 'compact' : 'full')
    }, sceneQuality, { timeout: 40_000 })
    if (!isPhaseThree) await page.waitForTimeout(730)
  }

  async function settle(distance, sceneQuality) {
    await page.waitForFunction(({ distance, isPhaseThree, quality }) => {
      const s = window.retrieverDebug
      if (!s || s.mode !== 'running') return false
      if (!isPhaseThree) return s.tiles === 7 && s.drawCalls >= 36
      const count = quality === 'low' ? 4 : 5
      const center = Math.floor(distance / 30)
      return Array.from({ length: count }, (_, i) => center + i).every(i => s.world?.some(t => t.index === i))
    }, { distance, isPhaseThree, quality: sceneQuality }, { timeout: 35_000 })
  }

  async function stepTo(distance) {
    await page.evaluate(distance => { window.phaseThreeQA.limit = distance + .9 }, distance)
    await page.waitForFunction(distance => {
      const s = window.retrieverDebug
      return s?.mode === 'over' || s?.distance >= distance - .76
    }, distance, { timeout: 75_000 }).catch(async error => {
      console.error(await page.evaluate(() => ({ state: window.retrieverDebug,
        limit: window.phaseThreeQA.limit,
        mode: document.querySelector('#game')?.dataset.mode })))
      throw error
    })
    const state = await page.evaluate(() => {
      window.phaseThreeQA.limit = window.retrieverDebug.distance
      return window.retrieverDebug
    })
    assert.equal(state.mode, 'running', JSON.stringify(state.contact))
    return state
  }

  async function capture(label, extra = {}) {
    assert.equal(await page.locator('#game').getAttribute('data-mode'), 'running')
    await page.screenshot({ path: resolve(output, label + '.png'), scale: args.includes('retina') ? 'device' : 'css', timeout: 45_000 })
    results.push(await page.evaluate(({ label, extra }) => ({
      label, ...extra, ...window.retrieverDebug, perf: window.retrieverPerformance(),
      weather: document.querySelector('#weather')?.textContent,
      hud: document.querySelector('#habitat')?.textContent,
      stageLabel: document.querySelector('#difficulty-stage')?.textContent,
    }), { label, extra }))
    assert.equal(results.at(-1).mode, 'running', label)
    console.log(engine.name() + ' captured ' + label)
  }

  if (args.includes('landmark-pass')) {
    const keys = args.filter(a => a.startsWith('only=')).map(a => a.slice(5))
    const selected = expeditionRegions.filter(r => keys.length ? keys.includes(r.key) : ['gulf','cypress','farm'].includes(r.key))
    for (const region of selected) {
      const first = Math.ceil(region.marker / 30)
      let pair
      for (let seed = 1; seed <= 96 && !pair; seed++) {
        const rows = rowsFor(seed, region.seconds + 32)
        const hazards = rows.flatMap(row => row.entities).filter(item => item.hazard)
        for (let i = first; i < first + 16; i++) {
          const tile = buildTile(i, i < 3 ? 0 : seed)
          if (tile.territory !== region.key || !tile.landmark) continue
          const marker = tile.landmark.distance
          const start = marker - 77
          if (start < region.marker + 1) continue
          const finish = (i + 2) * 30 + 3
          const localHazards = hazards.filter(item => item.distance > start - 35 && item.distance < finish + 10)
          const run = { ...newRun(), distance: start }
          // Match practice seek's elapsed time so the goose trajectory is also checked.
          let lo = region.seconds, hi = region.seconds + 33
          for (let iteration = 0; iteration < 32; iteration++) {
            const half = (lo + hi) * .5
            if (distanceAtTime(half) < start) lo = half
            else hi = half
          }
          run.elapsed = hi
          run.speed = speedAtTime(hi)
          let hit
          while (run.distance < finish && !hit) {
            const previous = { ...run }
            advance(run, tickSeconds)
            hit = firstContact(previous, run, localHazards, {})
          }
          if (!hit) { pair = { seed, tile, start, finish }; break }
        }
      }
      assert.ok(pair, 'No clear center-lane coast through ' + region.key)
      const { seed, tile, start, finish } = pair
      const at = tile.landmark.distance
      await runAt(start, seed)
      await page.evaluate(index => { window.phaseThreeQA.inspectLandmark = index }, tile.index)
      for (const [label, distance] of [['approach',at - 56],['handoff',at - 46],['near',at - 26],['pass',at - 4],
        ['depart',at + 11],['recycled',finish]]) {
        await stepTo(distance)
        await capture(region.key + '-' + label, { landmark: tile.landmark, seed, index: tile.index })
      }
      const check = await page.evaluate(() => {
        const qa = window.phaseThreeQA
        qa.inspectLandmark = undefined
        return qa.landmarkFrames
      })
      await writeFile(resolve(output, region.key + '-lifetime.json'), JSON.stringify(check))
      if (tile.landmark.id && await page.evaluate(() => Boolean(window.retrieverPerformance()?.surfaces))) {
        const active = check.filter(frame => frame.distance < (tile.index + 2) * 30 - 1)
        assert.ok(active.length > 16, region.key)
        assert.equal(new Set(active.map(frame => frame.geometry)).size, 1, 'geometry replaced in view')
        assert.ok(active.every(frame => frame.id === tile.landmark.id && frame.opaque), 'landmark split or hidden in view')
        assert.ok(check.some(frame => frame.distance > (tile.index + 2) * 30 && !frame.id), 'tile never left the render window')
      }
    }
  } else if (args.includes('presets-fresh')) {
    for (const selected of ['balanced','high','low']) {
      await runAt(distanceAtTime(36), 7, selected)
      await capture(selected + '-cypress', { seed: 7, selected })
    }
  } else if (args.includes('presets')) {
    await runAt(distanceAtTime(36), 7)
    await capture('balanced-cypress')
    for (const selected of ['high', 'low', 'auto']) {
      await page.locator('#settings').tap()
      await page.locator('#quality').selectOption(selected)
      await page.locator('#close-settings').tap()
      await page.evaluate(() => { window.phaseThreeQA.limit = window.retrieverDebug.distance + 1.25 })
      await page.locator('#primary').tap()
      await page.waitForFunction(() => window.retrieverDebug?.mode === 'running')
      await page.waitForFunction(selected => {
        const surfaces = window.retrieverPerformance()?.surfaces
        if (!surfaces || selected === 'auto' && !surfaces.pending ||
          surfaces.active === (selected === 'low' ? 'compact' : 'full')) return true
        // Battery Saver can skip draws once the fixture stops the game clock.
        // Request a normal redraw so an async decode updates its live metrics.
        window.dispatchEvent(new Event('resize'))
        return false
      }, selected, { polling: 300, timeout: 40_000 }).catch(async error => {
        console.error(await page.evaluate(() => ({ render: window.retrieverPerformance()?.surfaces,
          mode: document.querySelector('#game')?.dataset.mode, quality: document.querySelector('#quality')?.value,
          distance: window.retrieverDebug?.distance, limit: window.phaseThreeQA.limit,
          assets: performance.getEntriesByType('resource').filter(x => x.name.includes('field-atlas')).map(x => x.name.split('/').at(-1)) })))
        throw error
      })
      await capture(selected + '-cypress')
    }
  } else if (args.includes('equipment')) {
    for (const [type, from, to] of [['tractor', 150, 180], ['snowmobile', 392, 449], ['log', 40, 58]]) {
      const selected = args.find(arg => arg.startsWith('only='))
      if (selected && selected !== 'only=' + type) continue
      let example
      for (let seed = 1; seed <= 24 && !example; seed++) {
        for (const row of rowsFor(seed, to)) {
          if (row.time < from) continue
          const item = row.entities.find(entity => entity.hazard && entity.type === type && entity.lane !== 0)
          if (!item) continue
          const distance = item.distance - (type === 'log' ? 5 : 6.75)
          const pose = { ...newRun(), distance }
          const hazards = rowsFor(seed, to).flatMap(row => row.entities).filter(entity => entity.hazard &&
            Math.abs(entity.distance - distance) < 44)
          if (firstContact(pose, pose, hazards, {})) continue
          example = { seed, item, distance }
          break
        }
      }
      assert.ok(example, type)
      await runAt(example.distance, example.seed)
      await capture('view-' + type, { seed: example.seed, target: example.item.distance, lane: example.item.lane })
    }
  } else if (args.includes('timber')) {
    const targets = isPhaseThree ? ['branch','leaning-tree','fallen','drift','snowmobile'] : ['branch','leaning-tree','fallen','drift']
    for (const type of targets) {
      if (args.some(arg => arg.startsWith('only=')) && !args.includes('only=' + type)) continue
      const samples = []
      for (let seed = 1; seed <= 13; seed++) {
        const rows = rowsFor(seed, type === 'snowmobile' ? 465 : 62)
        for (const row of rows) {
          if (type !== 'snowmobile' && (row.time < 33 || row.time > 58.9)) continue
          const item = row.entities.find(item => item.type === type && item.hazard && (type !== 'branch' || item.lane === 0) &&
            (type !== 'snowmobile' || item.lane !== 0))
          if (item) samples.push({ seed, item })
        }
      }
      samples.sort((a, b) => Math.abs(a.item.distance - 851) - Math.abs(b.item.distance - 851))
      const { seed, item } = samples[0]
      await runAt(item.distance - (type === 'snowmobile' ? 5.9 : 9.5), seed)
      await capture('obstacle-' + type, { seed, target: item.distance, lane: item.lane })
    }
  } else if (args.includes('transitions')) {
    const duration = courseStages.length * 15
    const courses = new Map()
    const boundaries = [...expeditionRegions.slice(1).map(region => region.seconds), duration]

    // Select a center-lane coast with the actual collision solver. This
    // isolates each visual seam. The stress suite tests timed actions
    // and lane changes over the same boundaries in separate runs.
    function crossingSeed(seconds) {
      const elapsed = seconds - .55
      const distance = distanceAtTime(elapsed)
      const end = distanceAtTime(seconds + .63)
      for (let seed = 1; seed <= 128; seed++) {
        if (!courses.has(seed)) courses.set(seed, rowsFor(seed, duration + 30))
        const hazards = courses.get(seed).flatMap(row => row.entities)
          .filter(item => item.hazard && item.distance >= distance - 3 && item.distance <= end + 3)
        const run = { ...newRun(), elapsed, distance, speed: speedAtTime(elapsed) }
        const previous = {}
        let hit
        while (run.distance < end && !hit) {
          Object.assign(previous, run)
          advance(run, tickSeconds)
          hit = firstContact(previous, run, hazards, {})
        }
        if (!hit) return seed
      }
      throw new Error('No center-lane coast around ' + seconds + ' s')
    }

    for (const seconds of boundaries) {
      const key = seconds === duration ? 'endless' : expeditionRegions[seconds / 30].key
      if (args.some(arg => arg.startsWith('only=')) && !args.includes('only=' + key)) continue
      const start = distanceAtTime(seconds - .55)
      const seed = crossingSeed(seconds)
      await runAt(start, seed)
      await stepTo(distanceAtTime(seconds - .28))
      await capture('transition-' + key + '-before', { seconds, seed })
      await stepTo(distanceAtTime(seconds + .46))
      await capture('transition-' + key + '-after', { seconds, seed, expectedStage: stageAt(seconds).level })
      assert.equal(results.at(-1).stageLabel, stageAt(seconds).level + ' / ' + courseStages.length)
      assert.equal(results.at(-1).hud, expeditionRegions[Math.min(expeditionRegions.length - 1, seconds / 30)].name)
    }
  } else {
    const seed = 7
    const end = courseStages.length * 15 + 10
    const hazards = rowsFor(seed, end).flatMap(row => row.entities).filter(item => item.hazard)
    const safeView = (desired, minimum) => {
      for (const offset of [0, 1.75, -1.75, 3.5, -3.5, 5.25, -5.25, 7.0, -7.0, 10]) {
        if (desired + offset < minimum) continue
        const pose = { ...newRun(), distance: desired + offset }
        if (!firstContact(pose, pose, hazards, {})) return pose.distance
      }
      throw new Error('No clear approach view near ' + desired)
    }
    for (const region of expeditionRegions) {
      if (args.some(arg => arg.startsWith('only=')) && !args.includes('only=' + region.key)) continue
      if (!args.includes('landmarks-only')) {
        const start = region.seconds === 0 ? 3 : distanceAtTime(region.seconds + 6)
        await runAt(safeView(start, region.marker), seed)
        await capture(region.key + '-approach', { region: region.name, seed })
      }
      if (!isPhaseThree || args.includes('approaches')) continue
      const low = Math.ceil(region.marker / 30)
      const lookahead = Math.ceil(distanceAtTime(region.seconds + 26) / 30)
      let marker
      for (let i = low; i <= lookahead && !marker; i++) marker = buildTile(i, i < 3 ? 0 : seed).landmark
      assert.ok(marker, region.key + ' landmark placement')
      const view = Math.max(region.marker + 2, marker.distance - (region.key === 'gulf' || region.key === 'farm' ? 8 : 13))
      await runAt(safeView(view, region.marker + 1), seed)
      assert.ok(await page.evaluate(role => window.retrieverDebug.world.some(t => t.landmark?.role === role), marker.role))
      await capture(region.key + '-landmark', { region: region.name, marker, seed })
    }
  }
  assert.deepEqual(errors, [])
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ engine: engine.name(), viewport, quality, offline: args.includes('offline'), results }, null, 2) + '\n')
  await context.close()
} finally {
  await browser.close()
  await new Promise(done => server.close(done))
}
