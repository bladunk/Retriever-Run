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
const { createCourse } = await fromSource('runner')
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
  const portrait = args.includes('small') ? { width: 320, height: 568 } : { width: 390, height: 844 }
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: portrait, deviceScaleFactor: .70 })
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
  await page.addInitScript(quality => {
    localStorage.setItem('retriever-run.record.practice', JSON.stringify({ quality, masterVolume: 0 }))
    Object.defineProperty(document, 'hidden', { get: () => false })
    const native = window.requestAnimationFrame.bind(window)
    let stamp, index = 0, sent = false, nextSwipe = 0
    const qa = window.phaseThreeQA = { limit: -1, rows: [], elapsed: [], rendered: 0 }
    const press = key => window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
    window.requestAnimationFrame = callback => native(ms => {
      const state = window.retrieverDebug
      if (stamp === undefined) stamp = ms
      if (state?.mode !== 'running') stamp += 40
      else if (state.distance < qa.limit) {
        if (qa.rows[index] && state.distance > (qa.rows[index].end ?? qa.rows[index].at) + 1.58) {
          index++
          sent = false
        }
        const row = qa.rows[index]
        if (row && state.lane !== row.lane && state.elapsed >= nextSwipe) {
          press(state.lane < row.lane ? 'ArrowRight' : 'ArrowLeft')
          nextSwipe = state.elapsed + .17
        }
        if (row?.gate && !sent && row.at - state.distance <= state.speed * (row.gate.duration / 2 + .019)) {
          press(row.action === 'slide' ? 'ArrowDown' : 'ArrowUp')
          sent = true
        }
        stamp += 25
      } else if (qa.limit < 0) stamp += .64
      const start = performance.now()
      callback(stamp)
      if (state?.mode === 'running' && qa.rendered < 180) {
        qa.elapsed.push({ timestamp: ms, cpu: performance.now() - start })
        qa.rendered++
      }
    })
  }, quality)

  async function runAt(distance, seed, rows = []) {
    await page.goto(origin + prefix + '?perf=1&debug=collision&volumes=off&scenery=on&seed=' + seed + '&at=' + distance,
      { waitUntil: 'domcontentloaded' })
    if (await page.locator('#content-screen').isVisible()) {
      if (args.includes('offline')) {
        await page.locator('#content-download').tap({ timeout: 40_000 })
      } else await page.locator('#content-online').tap({ timeout: 40_000 })
    }
    await page.waitForFunction(() => !document.querySelector('#game').hidden && !document.querySelector('#primary').disabled,
      null, { timeout: 60_000 })
    await page.addStyleTag({ content: '#collision-debug, #game[data-practice] .practice-status { display: none }' })
    await page.evaluate(rows => { window.phaseThreeQA.rows = rows }, rows)
    await page.locator('#primary').tap()
    await page.waitForFunction(() => window.retrieverDebug?.mode === 'running', null, { timeout: 40_000 })
    if (args.includes('offline')) await context.setOffline(true)
    await settle(distance)
    if (!isPhaseThree) await page.waitForTimeout(730)
  }

  async function settle(distance) {
    await page.waitForFunction(({ distance, isPhaseThree, quality }) => {
      const s = window.retrieverDebug
      if (!s || s.mode !== 'running') return false
      if (!isPhaseThree) return s.tiles === 7 && s.drawCalls >= 36
      const count = quality === 'low' ? 4 : 5
      const center = Math.floor(distance / 30)
      return Array.from({ length: count }, (_, i) => center + i).every(i => s.world?.some(t => t.index === i))
    }, { distance, isPhaseThree, quality }, { timeout: 35_000 })
  }

  async function stepTo(distance) {
    await page.evaluate(distance => { window.phaseThreeQA.limit = distance }, distance)
    await page.waitForFunction(distance => {
      const s = window.retrieverDebug
      return s?.mode === 'over' || s?.distance >= distance
    }, distance, { timeout: 75_000 }).catch(async error => {
      console.error(await page.evaluate(() => ({ state: window.retrieverDebug,
        input: { limit: window.phaseThreeQA.limit, rows: window.phaseThreeQA.rows.length },
        mode: document.querySelector('#game')?.dataset.mode })))
      throw error
    })
    const state = await page.evaluate(() => window.retrieverDebug)
    assert.equal(state.mode, 'running', JSON.stringify(state.contact))
    return state
  }

  async function capture(label, extra = {}) {
    await page.screenshot({ path: resolve(output, label + '.png'), scale: 'css', timeout: 45_000 })
    results.push(await page.evaluate(({ label, extra }) => ({
      label, ...extra, ...window.retrieverDebug, perf: window.retrieverPerformance(),
      weather: document.querySelector('#weather')?.textContent,
      hud: document.querySelector('#habitat')?.textContent,
      stageLabel: document.querySelector('#difficulty-stage')?.textContent,
    }), { label, extra }))
    console.log(engine.name() + ' captured ' + label)
  }

  if (args.includes('timber')) {
    const targets = isPhaseThree ? ['branch','leaning-tree','fallen','drift','snowmobile'] : ['branch','leaning-tree','fallen','drift']
    for (const type of targets) {
      if (args.some(arg => arg.startsWith('only=')) && !args.includes('only=' + type)) continue
      const samples = []
      for (let seed = 1; seed <= 13; seed++) {
        const rows = rowsFor(seed, type === 'snowmobile' ? 465 : 62)
        for (const row of rows) {
          if (type !== 'snowmobile' && (row.time < 33 || row.time > 58.9)) continue
          const item = row.entities.find(item => item.type === type && item.hazard && (type !== 'branch' || item.lane === 0))
          if (item) samples.push({ seed, item })
        }
      }
      samples.sort((a, b) => Math.abs(a.item.distance - 851) - Math.abs(b.item.distance - 851))
      const { seed, item } = samples[0]
      await runAt(item.distance - 9.5, seed)
      await capture('obstacle-' + type, { seed, target: item.distance, lane: item.lane })
    }
  } else if (args.includes('transitions')) {
    const seed = 7
    const duration = courseStages.length * 15
    const rows = rowsFor(seed, duration + 30)
    const boundaries = [...expeditionRegions.slice(1).map(region => region.seconds), duration]
    for (const seconds of boundaries) {
      const key = seconds === duration ? 'endless' : expeditionRegions[seconds / 30].key
      if (args.some(arg => arg.startsWith('only=')) && !args.includes('only=' + key)) continue
      const start = distanceAtTime(seconds - 1.45)
      const guide = rows.filter(row => (row.end ?? row.at) + 1.35 > start && row.time < seconds + 8)
        .map(({ lane, at, end, gate, entities }) => ({ lane, at, end, gate, action: gate?.action ?? (entities[0]?.type === 'branch' ? 'slide' : 'jump') }))
      await runAt(start, seed, guide)
      await stepTo(distanceAtTime(seconds - .30))
      await capture('transition-' + key + '-before', { seconds })
      await stepTo(distanceAtTime(seconds + .49))
      await capture('transition-' + key + '-after', { seconds, expectedStage: stageAt(seconds).level })
      assert.equal(results.at(-1).stageLabel, stageAt(seconds).level + ' / ' + courseStages.length)
      assert.equal(results.at(-1).hud, expeditionRegions[Math.min(expeditionRegions.length - 1, seconds / 30)].name)
    }
  } else {
    const seed = 7
    for (const region of expeditionRegions) {
      if (args.some(arg => arg.startsWith('only=')) && !args.includes('only=' + region.key)) continue
      const start = region.seconds === 0 ? 3 : distanceAtTime(region.seconds + 6)
      await runAt(start, seed)
      await capture(region.key + '-approach', { region: region.name, seed })
      if (!isPhaseThree || args.includes('approaches')) continue
      const low = Math.ceil(region.marker / 30)
      const lookahead = Math.ceil(distanceAtTime(region.seconds + 26) / 30)
      let marker
      for (let i = low; i <= lookahead && !marker; i++) marker = buildTile(i, i < 3 ? 0 : seed).landmark
      assert.ok(marker, region.key + ' landmark placement')
      await runAt(Math.max(region.marker + 2, marker.distance - (region.key === 'gulf' || region.key === 'farm' ? 8 : 13)), seed)
      assert.ok(await page.evaluate(role => window.retrieverDebug.world.some(t => t.landmark?.role === role), marker.role))
      await capture(region.key + '-landmark', { region: region.name, marker, seed })
    }
  }
  assert.deepEqual(errors, [])
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ engine: engine.name(), viewport: portrait, quality, offline: args.includes('offline'), results }, null, 2) + '\n')
} finally {
  await browser.close()
  await new Promise(done => server.close(done))
}
