import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { expeditionRegions } from '../src/expedition.js'
import { createCourse } from '../src/runner.js'

const engine = process.argv.includes('webkit') ? webkit : chromium
const argv = process.argv.slice(2)
const quality = argv.find(arg => ['low', 'balanced', 'high', 'auto'].includes(arg)) ?? 'balanced'
const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp',
  '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' }
const prefix = '/Retriever-Run/'
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const file = resolve(root, path.slice(prefix.length) || 'index.html')
  if (!path.startsWith(prefix) || !file.startsWith(root + sep)) return response.writeHead(404).end()
  try {
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file))
  } catch { response.writeHead(404).end() }
})

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
await mkdir(output, { recursive: true })
const origin = 'http://127.0.0.1:' + server.address().port
const localAsset = url => url.startsWith(origin + '/') || url.startsWith('blob:' + origin + '/') || url.startsWith('data:')
const browser = await engine.launch(engine === chromium ? {
  executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
} : {})
const course = createCourse(7)
const courseRows = []
for (let row = course(); row.time < 390; row = course()) courseRows.push(row)
const checkpoint = time => courseRows.find(row => row.time >= time).time + .28
const portraits = expeditionRegions.map(region => ({
  key: region.key, start: checkpoint(region.seconds + 9), region: region.index,
}))
const captures = [...portraits,
  { key: 'alpine-entry', start: 268.55, stop: 271.74, region: 8 },
  { key: 'endgame', start: checkpoint(321), region: 9 },
  { key: 'visibility', start: checkpoint(28.2), stop: 29.92, region: 0 },
  { key: 'preview-loss', start: 0, stop: 4.8, region: 0 },
]
const selected = captures.filter(({ key }) => argv.includes(key))
const scenes = selected.length ? selected : captures
const results = {}

try {
  const width = argv.includes('small') ? 375 : 390
  const height = argv.includes('small') ? 667 : 844
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width, height },
    deviceScaleFactor: .75, serviceWorkers: 'block' })
  await context.route('**/*', route => localAsset(route.request().url()) ? route.continue() : route.abort())

  if (argv.includes('production')) {
    const page = await context.newPage()
    await page.goto(origin + prefix + '?preview=10')
    await page.waitForFunction(() => !document.querySelector('#primary').disabled)
    assert.equal(await page.locator('#game').getAttribute('data-practice'), null)
    assert.equal(await page.evaluate(() => 'retrieverDebug' in window), false)
    console.log(JSON.stringify({ productionPreviewDisabled: true, engine: engine.name() }))
  }

  for (const scene of argv.includes('production') ? [] : scenes) {
    const { key, start, region, stop = start + .36 } = scene
    const page = await context.newPage()
    const errors = []
    const offsite = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('request', request => { if (!localAsset(request.url())) offsite.push(request.url()) })
    const rows = courseRows.filter(row => key !== 'preview-loss' && row.time >= start - .35 && row.time < stop + 3)
      .map(({ at, time, lane, end, gate, entities }) => ({ at, time, lane, end, gate, action: entities[0]?.type === 'branch' ? 'slide' : 'jump' }))
    await page.addInitScript(({ quality, stop, rows }) => {
      const original = JSON.stringify({ quality, masterVolume: 0, best: 987, farthest: 654 })
      localStorage.setItem('retriever-run.record', original)
      localStorage.removeItem('retriever-run.record.practice')
      const qa = window.migrationQA = { frames: [], ready: 0, skin: false, stop, original, hidden: false }
      Object.defineProperty(document, 'hidden', { get: () => qa.hidden })
      qa.suspend = () => {
        qa.hidden = true
        document.dispatchEvent(new Event('visibilitychange'))
      }
      let draws = 0, triangles = 0, bytes = 0, uploaded = 0
      const bindings = new Map(), allocations = new Map()
      const gl = WebGL2RenderingContext.prototype
      function wrap(name, observe) {
        const original = gl[name]
        gl[name] = function (...args) {
          observe.apply(this, args)
          return original.apply(this, args)
        }
      }
      wrap('shaderSource', (_, code) => { if (code.includes('#define USE_SKINNING')) qa.skin = true })
      wrap('bindBuffer', (target, buffer) => bindings.set(target, buffer))
      wrap('bufferData', (target, data, usage, offset, count) => {
        const buffer = bindings.get(target)
        if (!buffer) return
        const size = typeof data === 'number' ? data : count ? count * data.BYTES_PER_ELEMENT : data?.byteLength ?? 0
        bytes += size - (allocations.get(buffer) ?? 0)
        uploaded += size
        allocations.set(buffer, size)
      })
      wrap('deleteBuffer', buffer => { bytes -= allocations.get(buffer) ?? 0; allocations.delete(buffer) })
      function count(mode, vertices, instances = 1) {
        draws++
        if (mode === 4) triangles += vertices * instances / 3
        if (mode === 5 || mode === 6) triangles += Math.max(0, vertices - 2) * instances
      }
      wrap('drawElements', (mode, vertices) => count(mode, vertices))
      wrap('drawArrays', (mode, first, vertices) => count(mode, vertices))
      wrap('drawElementsInstanced', (mode, vertices, type, offset, copies) => count(mode, vertices, copies))
      wrap('drawArraysInstanced', (mode, first, vertices, copies) => count(mode, vertices, copies))
      const native = window.requestAnimationFrame
      let virtual, previousWall
      let index = 0, nextSwipe = 0, sent
      function press(key) { window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })) }
      window.requestAnimationFrame = callback => native(ms => {
        const wall = previousWall === undefined ? 0 : ms - previousWall
        previousWall = ms
        const debug = window.retrieverDebug
        if (virtual === undefined) virtual = ms
        else if (debug?.mode !== 'running') virtual += Math.min(wall, 76)
        else if (debug.elapsed < qa.stop && !qa.hidden) {
          const next = rows[index]
          if (next && debug.distance > (next.end ?? next.at) + 1.65) { index++; sent = false }
          const row = rows[index]
          if (row) {
            if (debug.lane !== row.lane && debug.elapsed >= nextSwipe) {
              press(debug.lane < row.lane ? 'ArrowRight' : 'ArrowLeft')
              nextSwipe = debug.elapsed + .16
            }
            if (row.gate && !sent && row.at - debug.distance <= debug.speed * (row.gate.duration / 2 + .022)) {
              press(row.action === 'slide' ? 'ArrowDown' : 'ArrowUp')
              sent = true
            }
          }
          virtual += 1000 / 24
        }
        draws = triangles = uploaded = 0
        const start = performance.now()
        callback(virtual)
        if (draws && qa.skin && !qa.ready && document.querySelector('#primary')?.disabled === false) qa.ready = performance.now()
        const state = window.retrieverDebug
        if (draws && state?.mode === 'running' && qa.frames.length < 280) {
          qa.frames.push({ elapsed: state.elapsed, distance: state.distance, draws, triangles, bytes, uploaded,
            wall, cpu: performance.now() - start, tiles: state.tiles, geometries: state.geometries })
        }
      })
    }, { quality, stop, rows })
    const offset = (start - region * 30).toFixed(6)
    await page.goto(origin + prefix + '?preview=' + (region + 1) + '&offset=' + offset + '&debug=collision&volumes=off&seed=7')
    await page.waitForFunction(() => migrationQA.ready && window.retrieverDebug, null, { timeout: 65_000 })
    await page.addStyleTag({ content: '#collision-debug { display: none }' })
    await page.locator('#primary').tap()

    async function checkAt(seconds) {
      await page.waitForFunction(time => retrieverDebug.elapsed >= time - .009 || retrieverDebug.mode === 'over', seconds,
        { timeout: 130_000, polling: 125 })
      assert.equal(await page.locator('#game').getAttribute('data-mode'), 'running', JSON.stringify(await page.evaluate(() => retrieverDebug)))
    }

    if (key === 'alpine-entry') {
      for (const [part, at] of [['before', 269.15], ['entry', 270.36], ['after', stop]]) {
        await page.evaluate(value => { migrationQA.stop = value }, at)
        await checkAt(at)
        await page.screenshot({ path: resolve(output, quality + '-' + key + '-' + part + '.png'), scale: 'css' })
      }
    } else if (key === 'preview-loss') {
      await page.locator('#field-report').waitFor({ timeout: 130_000 })
      assert.equal(await page.locator('#report-nickname').textContent(), 'Territory preview')
      assert.equal(await page.locator('#report-career').isVisible(), false)
      assert.equal(await page.locator('#report-highlights').textContent(), '')
    } else {
      await checkAt(stop)
      await page.screenshot({ path: resolve(output, quality + '-' + key + '.png'), scale: 'css' })
    }

    if (key === 'visibility') {
      assert.equal(await page.locator('#habitat').textContent(), 'Gulf Coast Marsh')
      const held = await page.evaluate(() => retrieverDebug.elapsed)
      await page.locator('#pause').tap()
      assert.equal(await page.locator('#game').getAttribute('data-mode'), 'paused')
      await page.waitForTimeout(240)
      assert.equal(await page.evaluate(() => retrieverDebug.elapsed), held)
      await page.locator('#primary').tap()
      await page.evaluate(() => migrationQA.suspend())
      assert.equal(await page.locator('#game').getAttribute('data-mode'), 'paused')
      await page.waitForTimeout(260)
      assert.equal(await page.evaluate(() => retrieverDebug.elapsed), held)
      await page.evaluate(() => { migrationQA.hidden = false; migrationQA.stop = 30.22 })
      await page.locator('#primary').tap()
      await checkAt(30.22)
      assert.equal(await page.locator('#habitat').textContent(), 'Southern Cypress Swamp')
    } else if (key !== 'preview-loss') {
      const expected = expeditionRegions[key === 'alpine-entry' ? 9 : region].name
      assert.equal(await page.locator('#habitat').textContent(), expected)
    }
    const observed = await page.evaluate(() => ({
      frames: migrationQA.frames, ready: migrationQA.ready, end: retrieverDebug.elapsed,
      genuine: localStorage.getItem('retriever-run.record') === migrationQA.original,
      practice: localStorage.getItem('retriever-run.record.practice'),
    }))
    assert.ok(observed.genuine && observed.practice === null)
    assert.deepEqual(errors, [])
    assert.deepEqual(offsite, [])
    results[key] = observed
    await writeFile(resolve(output, quality + '-measurements.json'), JSON.stringify(results, null, 2))
    console.log(JSON.stringify({ key, quality, engine: engine.name(), frames: observed.frames.length, end: observed.end }))
    await page.close()
  }
} finally {
  await browser.close()
  server.close()
}
