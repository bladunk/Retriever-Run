import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, webkit, devices } from 'playwright'
import { createCourse } from '../src/runner.js'
import { hazardName } from '../src/field-stats.js'

const safari = process.argv.includes('webkit')
const engine = safari ? webkit : chromium
const soak = process.argv.includes('soak')
const replays = process.argv.includes('replays')
const slow = process.argv.includes('slow')
const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output')
const prefix = '/Retriever-Run/'
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.mp3': 'audio/mpeg',
  '.webp': 'image/webp', '.glb': 'model/gltf-binary' }
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  if (!path.startsWith(prefix)) return response.writeHead(404).end()
  const file = resolve(root, path.slice(prefix.length) || 'index.html')
  if (!file.startsWith(root + sep)) return response.writeHead(404).end()
  try {
    const content = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(content)
  } catch { response.writeHead(404).end() }
})

function safeRoute() {
  const course = createCourse(7)
  const actions = []
  let lane = 0
  let dove = false
  while (true) {
    const row = course()
    if (row.time > 145) return actions
    const lead = row.entities.find(entity => entity.type === 'goose' && entity.lead)
    const duck = lead && !dove
    const target = duck ? lead.lane : row.lane
    while (lane !== target) {
      const right = target > lane
      actions.push([row.time - .69, right ? 'ArrowRight' : 'ArrowLeft'])
      lane += right ? 1 : -1
    }
    if (row.gate) actions.push([row.time - .49, row.entities[0].type === 'branch' ? 'ArrowDown' : 'ArrowUp'])
    if (duck) {
      dove = true
      actions.push([row.time - .51, 'ArrowDown'])
    }
  }
}

const chromiumArgs = ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
const browser = await engine.launch(safari ? {} : {
  executablePath: process.env.FIELD_CHROMIUM || undefined, args: chromiumArgs,
})
await mkdir(output, { recursive: true })
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))

try {
  const context = await browser.newContext({
    ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, locale: 'en-US',
    deviceScaleFactor: soak || replays || slow ? .58 : 1,
  })
  const page = await context.newPage()
  const errors = new Set()
  page.on('pageerror', error => errors.add(error.message))
  page.on('console', log => { if (log.type() === 'error') errors.add(log.text()) })
  page.on('requestfailed', request => { if (!/aborted|cancelled/i.test(request.failure()?.errorText)) errors.add(request.url()) })
  page.on('response', response => { if (response.status() >= 400) errors.add(response.url()) })
  await page.addInitScript(({ soak, replays, actions }) => {
    const qa = window.fieldQA = {
      contexts: 0, sources: 0, peakSources: 0, notes: 0, foley: 0, wildlife: 0, goose: 0, mallard: 0,
      rig: false, rows: [], frames: [], pointers: [], scale: replays ? 16 : soak ? 6 : .13,
    }
    if (!soak && !replays) {
      for (const type of ['pointerdown', 'pointerup', 'pointercancel']) {
        window.addEventListener(type, event => {
          if (event.target.closest('#game')) qa.pointers.push([type, event.target.id, event.clientX, event.clientY])
        }, true)
      }
    }
    if (soak || replays) localStorage.setItem('retriever-run.record', JSON.stringify({ quality: 'low' }))
    const Audio = window.AudioContext ?? window.webkitAudioContext
    window.AudioContext = class extends Audio {
      constructor() { super(); qa.contexts++; qa.audio = this }
    }
    const start = AudioBufferSourceNode.prototype.start
    AudioBufferSourceNode.prototype.start = function (time, offset) {
      const result = start.apply(this, arguments)
      const seconds = this.buffer?.duration
      qa.sources++
      qa.peakSources = Math.max(qa.peakSources, qa.sources)
      this.addEventListener('ended', () => qa.sources--, { once: true })
      if (seconds > 30) qa.notes++
      if (seconds === 2 && offset !== undefined) qa.foley++
      if (seconds > 3 && seconds < 3.65) {
        qa.wildlife++
        if (seconds < 3.2) qa.goose++
        else qa.mallard++
      }
      return result
    }
    const connect = AudioNode.prototype.connect
    AudioNode.prototype.connect = function (destination) {
      const result = connect.apply(this, arguments)
      if (destination === this.context.destination && this instanceof GainNode && !qa.analyser) {
        qa.analyser = this.context.createAnalyser()
        connect.call(this, qa.analyser)
      }
      return result
    }
    qa.peak = () => {
      if (!qa.analyser) return 0
      const data = new Float32Array(qa.analyser.fftSize)
      qa.analyser.getFloatTimeDomainData(data)
      return Math.max(...data.map(sample => Math.abs(sample)))
    }
    const shaderSource = WebGL2RenderingContext.prototype.shaderSource
    WebGL2RenderingContext.prototype.shaderSource = function (shader, source) {
      if (source.includes('#define USE_SKINNING')) qa.rig = true
      return shaderSource.apply(this, arguments)
    }
    if (replays) {
      // This mode stresses lifecycle and allocations instead of GPU throughput.
      for (const name of ['drawArrays', 'drawArraysInstanced', 'drawElements', 'drawElementsInstanced']) {
        WebGL2RenderingContext.prototype[name] = () => {}
      }
    }
    const originalFrame = requestAnimationFrame
    let last
    let visual
    window.requestAnimationFrame = callback => originalFrame(timestamp => {
      if (last === undefined) visual = timestamp
      else if (timestamp > last) {
        if (window.retrieverDebug?.mode === 'running' && qa.frames.length < 18_000) {
          qa.frames.push(timestamp - last)
        }
        visual += Math.min(230, (timestamp - last) * qa.scale)
      }
      last = timestamp
      callback(visual)
    })
    let next = 0
    let lastReport
    let lastRunning
    function drive() {
      const run = window.retrieverDebug
      if (soak && run?.mode === 'running') {
        while (next < actions.length && run.elapsed >= actions[next][0]) {
          dispatchEvent(new KeyboardEvent('keydown', { key: actions[next++][1], bubbles: true }))
        }
      }
      if (replays && run?.mode === 'over' && run !== lastReport && qa.rows.length < 200) {
        lastReport = run
        qa.rows.push({ type: run.contact?.type, geometry: run.geometries, tiles: run.tiles, entities: run.entities })
        if (qa.rows.length < 200) document.querySelector('#run-again').click()
      }
      if (run?.mode === 'running' && run.elapsed > 1) lastRunning = run
      qa.lastRunning = lastRunning
      requestAnimationFrame(drive)
    }
    requestAnimationFrame(drive)
  }, { soak, replays, actions: soak ? safeRoute() : [] })

  const port = server.address().port
  const url = 'http://127.0.0.1:' + port + prefix + '?debug=collision&volumes=off&seed=' + (soak ? 7 : 5)
  const cdp = safari ? null : await context.newCDPSession(page)
  if (slow && cdp) {
    await cdp.send('Network.enable')
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 150, downloadThroughput: 250_000, uploadThroughput: 100_000,
    })
  }
  const ready = () => page.waitForFunction(() => window.retrieverDebug?.tiles >= 2 &&
    !document.querySelector('#primary').disabled && fieldQA.rig, null, { timeout: 50_000 })
  const state = () => page.evaluate(() => window.retrieverDebug)
  const title = () => page.locator('#game').getAttribute('data-mode')
  const layout = () => page.evaluate(() => {
    const panel = document.querySelector('#lodge')
    return document.documentElement.scrollWidth === innerWidth && (!panel.open || panel.scrollWidth <= panel.clientWidth + 1)
  })
  const capture = name => page.screenshot({ path: resolve(output, engine.name() + '-' + name + '.png') })

  await page.goto(url)
  await ready()
  const startupMs = await page.evaluate(() => Math.round(performance.now()))
  // Use diagnostics for assertions while capturing the same layout players see.
  await page.addStyleTag({ content: '#collision-debug { visibility: hidden; }' })
  assert.equal(await page.evaluate(() => fieldQA.contexts), 0)
  if (replays || soak) {
    let before
    if (cdp) {
      await cdp.send('HeapProfiler.collectGarbage')
      before = (await cdp.send('Runtime.getHeapUsage')).usedSize
    }
    const started = Date.now()
    await page.locator('#primary').tap()
    if (replays) {
      await page.waitForFunction(() => fieldQA.rows.length === 200, null, { timeout: 240_000, polling: 250 })
      const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('retriever-run.record')))
      assert.equal(saved.players[0].stats.runs, 200)
      assert.equal(saved.players[0].stats.deathsBy.water, 200)
    } else {
      await page.waitForFunction(() => window.retrieverDebug?.elapsed >= 125 || window.retrieverDebug?.mode === 'over',
        null, { timeout: 270_000, polling: 250 }).catch(async cause => {
        throw new Error('Soak stalled at ' + JSON.stringify(await state()), { cause })
      })
      assert.equal((await state()).mode, 'running', JSON.stringify(await state()))
      await capture('sustained-run')
    }
    let after
    if (cdp) {
      await cdp.send('HeapProfiler.collectGarbage')
      after = (await cdp.send('Runtime.getHeapUsage')).usedSize
    }
    const metrics = await page.evaluate(() => {
      const { rows, frames, contexts, peakSources, notes, foley, wildlife, goose, mallard } = fieldQA
      const samples = [...frames].sort((a, b) => a - b)
      const range = (items, key) => items.length ? [Math.min(...items.map(item => item[key])), Math.max(...items.map(item => item[key]))] : null
      const percentile = share => Number(samples[Math.floor(samples.length * share)]?.toFixed(1))
      return { restarts: rows.length, geometryRange: range(rows, 'geometry'), tileRange: range(rows, 'tiles'),
        entityRange: range(rows, 'entities'), frames: samples.length, p50Ms: percentile(.5), p95Ms: percentile(.95),
        contexts, peakSources, notes, foley, wildlife, goose, mallard, run: fieldQA.lastRunning }
    })
    assert.equal(metrics.contexts, 1)
    assert.ok(metrics.peakSources <= 43)
    assert.ok(metrics.notes > 20)
    assert.ok(metrics.foley > 20)
    if (replays) assert.equal(metrics.tileRange[1], 7)
    else {
      assert.ok(metrics.goose > 0 && metrics.mallard > 0)
      assert.ok(metrics.run.elapsed >= 120)
    }
    assert.deepEqual([...errors], [])
    console.log(JSON.stringify({ engine: engine.name(), mode: soak ? 'rendered soak' : 'restart stress',
      startupMs, wallSeconds: Math.round((Date.now() - started) / 1000), heapBefore: before, heapAfter: after, ...metrics }))
  } else {
    await capture('title')
    assert.equal(await layout(), true)
    await page.locator('#primary').tap()
    await page.waitForFunction(() => window.retrieverDebug?.mode === 'running' && fieldQA.notes > 0 && fieldQA.peak() > .001)
    const swipe = async (dx, dy) => {
      const x = 192, y = 500
      if (cdp) {
        const send = (type, touchPoints = []) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints })
        await send('touchStart', [{ x, y }])
        for (const ratio of [.28, .64, 1]) {
          await send('touchMove', [{ x: x + dx * ratio, y: y + dy * ratio }])
        }
        await send('touchEnd')
      } else {
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.mouse.move(x + dx, y + dy, { steps: 3 })
        await page.mouse.up()
      }
    }
    await swipe(-68, 0)
    await page.waitForFunction(() => retrieverDebug.lane === -1)
    await swipe(66, 0)
    await page.waitForFunction(() => retrieverDebug.lane === 0)
    await swipe(0, -68)
    await page.waitForFunction(() => retrieverDebug.height > .12 || retrieverDebug.mode === 'over')
    assert.ok((await state()).height > .12, JSON.stringify(await page.evaluate(() => ({ run: retrieverDebug, pointers: fieldQA.pointers }))))
    await capture('jump')
    await page.evaluate(() => dispatchEvent(new Event('blur')))
    await page.waitForFunction(() => fieldQA.audio.state === 'suspended')
    assert.equal(await title(), 'paused')
    const before = await state()
    await page.waitForTimeout(230)
    assert.equal((await state()).ticks, before.ticks)
    await page.locator('#primary').tap()
    await page.waitForFunction(() => retrieverDebug.mode === 'running' && retrieverDebug.height === 0)
    await swipe(0, 65)
    await page.waitForFunction(() => document.querySelector('#collision-debug').textContent.includes('· slide ·'))
    await page.evaluate(() => dispatchEvent(new Event('pagehide')))
    assert.equal(await title(), 'paused')
    await page.waitForFunction(() => fieldQA.audio.state === 'suspended')
    await page.evaluate(() => dispatchEvent(new Event('pageshow')))
    await page.evaluate(() => { fieldQA.scale = 1 })
    await page.locator('#primary').tap()
    await page.locator('#field-report').waitFor({ timeout: 30_000 })
    const contact = (await state()).contact
    assert.ok(['stream', 'fence'].includes(contact?.type), JSON.stringify(contact))
    assert.equal(await page.locator('#report-tallies dd').first().textContent(), hazardName(contact.type))
    assert.match(await page.locator('#report-highlights').textContent(), /First Fetch/)
    await capture('field-report')
    await page.locator('#report-lodge').tap()
    await page.getByRole('tab', { name: 'Field Journal' }).tap()
    assert.match(await page.locator('#lodge-panel').textContent(), /1Completed runs/)
    assert.equal(await layout(), true)
    await capture('field-journal')
    await page.getByRole('tab', { name: 'Camp Leaderboard', exact: true }).tap()
    assert.equal(await page.locator('.camp-board li').count(), 1)
    await page.locator('#close-lodge').tap()
    await page.evaluate(() => { fieldQA.scale = .13 })
    await page.locator('#run-again').tap()
    await page.waitForFunction(() => window.retrieverDebug?.mode === 'running')
    if (cdp) {
      await page.evaluate(() => {
        fieldQA.loss = document.querySelector('#trail').getContext('webgl2').getExtension('WEBGL_lose_context')
        fieldQA.loss.loseContext()
      })
      await page.waitForFunction(() => document.querySelector('#primary').disabled && fieldQA.audio.state === 'suspended')
      assert.equal(await title(), 'paused')
      await page.keyboard.press('p')
      await page.locator('#pause').evaluate(button => button.click())
      assert.equal(await title(), 'paused')
      await page.evaluate(() => fieldQA.loss.restoreContext())
      await page.waitForFunction(() => !document.querySelector('#primary').disabled)
      assert.equal(await title(), 'paused')
      await page.locator('#primary').tap()
    }
    await page.locator('#controls button[data-move="right"]').tap()
    await page.waitForFunction(() => retrieverDebug.lane === 1)
    await page.evaluate(() => { fieldQA.scale = 1 })
    await page.locator('#field-report').waitFor({ timeout: 30_000 })
    assert.equal((await state()).contact?.type, 'stream')
    await page.locator('#main-menu').tap()
    assert.equal(await title(), 'title')
    await page.getByRole('button', { name: 'Mute music' }).tap()
    await page.waitForFunction(() => fieldQA.peak() < .0001)
    await page.getByRole('button', { name: 'Unmute music' }).tap()
    await page.waitForFunction(() => fieldQA.peak() > .001)
    await page.locator('#settings').tap()
    await page.locator('#musicVolume').evaluate(input => {
      input.value = '33'
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await page.locator('#close-settings').tap()
    await page.locator('#primary').tap()
    await page.waitForFunction(() => retrieverDebug?.mode === 'running')
    await page.reload()
    await ready()
    assert.equal(await title(), 'title')
    const saved = JSON.parse(await page.evaluate(() => localStorage.getItem('retriever-run.record')))
    assert.equal(saved.players[0].stats.runs, 2)
    assert.equal(saved.players[0].profile.musicVolume, .33)
    assert.deepEqual([...errors], [])
    console.log(JSON.stringify({ engine: engine.name(), viewport: '390x844', mode: slow ? 'throttled smoke' : 'smoke',
      gestures: safari ? 'trusted pointer drags' : 'native CDP touch events', startupMs }))
  }
} finally {
  await browser.close()
  server.close()
}
