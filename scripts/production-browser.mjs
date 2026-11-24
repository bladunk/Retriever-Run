import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'

const args = process.argv.slice(2)
const safari = args.includes('webkit')
const baseline = args.includes('baseline')
const legacy = args.includes('legacy')
const phaseTwo = args.includes('from-phase-two')
const upgrade = phaseTwo || args.includes('from-phase-one')
const engine = safari ? webkit : chromium
const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const original = upgrade ? resolve(phaseTwo ? process.env.FIELD_PHASE_TWO_BUILD ?? 'qa-output/phase-two' :
  process.env.FIELD_PHASE_ONE_BUILD ?? 'qa-output/phase-one') :
  legacy ? resolve(process.env.FIELD_LEGACY_BUILD ?? 'qa-output/baseline') : root
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output')
const prefix = '/Retriever-Run/'
const types = { '.html': 'text/html', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json',
  '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary',
  '.png': 'image/png' }
const hits = new Map()
const manifest = baseline ? null : JSON.parse(await readFile(resolve(root, 'content-manifest.json'), 'utf8'))
const openingManifest = upgrade ? JSON.parse(await readFile(resolve(original, 'content-manifest.json'), 'utf8')) : manifest
const next = manifest && !upgrade && structuredClone(manifest)
const replacements = new Map()
if (next) {
  const index = (await readFile(resolve(root, 'index.html'), 'utf8')).replace('</head>', '<meta name="qa-release" content="second"></head>')
  const entry = next.assets.find(item => item.path === 'index.html')
  entry.bytes = Buffer.byteLength(index)
  entry.sha256 = createHash('sha256').update(index).digest('hex')
  next.version = createHash('sha256').update(JSON.stringify(next)).digest('hex').slice(0, 20)
  const worker = await readFile(resolve(root, 'offline-sw.js'), 'utf8')
  replacements.set('index.html', index)
  replacements.set('offline-sw.js', 'const release = ' + JSON.stringify(next) + '\n' + worker.slice(worker.indexOf('\n') + 1))
  replacements.set('content-manifest.json', JSON.stringify(next))
}
let newRelease = false
let legacyActive = legacy
let blocked = baseline || legacy ? null : openingManifest.assets.find(item => item.id === 'labrador.glb')?.path
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  if (legacy && path === '/qa-worker-boundary') return response.writeHead(200, { 'Content-Type': 'text/html' }).end('Worker boundary')
  if (!path.startsWith(prefix)) return response.writeHead(404).end()
  const name = path.slice(prefix.length) || 'index.html'
  const serving = legacyActive || (upgrade && !newRelease) ? original : root
  const file = resolve(serving, name)
  if (!file.startsWith(serving + sep)) return response.writeHead(404).end()
  hits.set(name, (hits.get(name) ?? 0) + 1)
  if (name === blocked) return response.writeHead(503).end()
  try {
    const body = newRelease && replacements.has(name) ? replacements.get(name) : await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store' }).end(body)
  } catch { response.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
await mkdir(output, { recursive: true })
const url = 'http://127.0.0.1:' + server.address().port + prefix
const browser = await engine.launch(safari ? {} : { executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })

try {
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 },
    deviceScaleFactor: .58 })
  await context.addInitScript(() => {
    let forceHidden = false
    Object.defineProperty(document, 'hidden', { get: () => forceHidden })
    Object.defineProperty(navigator, 'standalone', { get: () => sessionStorage.getItem('qa.standalone') === '1' })
    window.qaBackground = value => {
      forceHidden = value
      document.dispatchEvent(new Event('visibilitychange'))
    }
    const native = requestAnimationFrame.bind(window)
    let stamp, prior
    window.qaPace = false
    window.qaFrame = null
    window.qaIntervals = []
    window.requestAnimationFrame = callback => native(time => {
      const running = document.querySelector('#game')?.dataset.mode === 'running'
      const elapsed = prior === undefined ? 0 : time - prior
      stamp = stamp === undefined ? time : stamp + (running && window.qaPace ? 130 : Math.min(95, elapsed))
      prior = time
      callback(stamp)
      if (running && !window.qaFrame) window.qaFrame = performance.now()
      if (running && !window.qaPace && elapsed && window.qaIntervals.length < 120) window.qaIntervals.push(elapsed)
    })
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message) })
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()) })
  const log = { engine: safari ? 'webkit' : 'chromium', baseline, upgrade: phaseTwo ? 'phase-two' : upgrade ? 'phase-one' : false }
  const ready = async (tab = page) => {
    await tab.waitForFunction(() => !document.querySelector('#game').hidden && !document.querySelector('#primary').disabled,
      null, { timeout: 35_000 }).catch(async error => {
      console.error(await tab.evaluate(() => ({ content: document.querySelector('#content-status')?.textContent,
        step: document.querySelector('#content-step')?.textContent, visible: !document.querySelector('#game').hidden,
        button: document.querySelector('#primary')?.textContent, controlled: Boolean(navigator.serviceWorker?.controller) })))
      throw error
    })
    return tab.evaluate(() => performance.now())
  }
  const play = async tab => {
    if (await tab.locator('#onboarding').isVisible()) {
      await tab.locator('#camp-name').fill('Marsh Scout')
      await tab.locator('#camp-guest').tap()
      if (await tab.locator('#camp-run').isVisible()) await tab.locator('#camp-run').tap()
    }
    const mode = await tab.locator('#game').getAttribute('data-mode')
    if (mode === 'title' || mode === 'paused') await tab.locator('#primary').tap()
    if (mode === 'over') await tab.locator('#run-again').tap()
    await tab.waitForFunction(() => document.querySelector('#game').dataset.mode === 'running')
  }
  const finish = async tab => {
    if (await tab.locator('#game').getAttribute('data-mode') === 'paused') await tab.locator('#primary').tap()
    await tab.evaluate(() => { window.qaPace = true })
    await tab.locator('#field-report').waitFor({ timeout: 95_000 })
    await tab.evaluate(() => { window.qaPace = false })
    if (await tab.locator('#promotion').isVisible()) await tab.locator('#promotion-continue').tap()
  }
  const restart = async tab => {
    await tab.evaluate(() => { window.qaFrame = null; window.qaIntervals.length = 0; window.qaRestart = performance.now() })
    await tab.locator('#run-again').tap()
    await tab.waitForFunction(() => window.qaFrame !== null)
    return tab.evaluate(() => Math.round(window.qaFrame - window.qaRestart))
  }
  const realFrameIntervals = tab => tab.evaluate(() => {
    const distribution = [...window.qaIntervals].sort((a, b) => a - b)
    return { observations: distribution.length, median: distribution[Math.floor(distribution.length / 2)],
      p95: distribution[Math.floor(distribution.length * .95)], slow: distribution.filter(time => time > 33.4).length }
  })
  await page.goto(url + '?perf=1')
  if (legacy) {
    await ready()
    await page.waitForFunction(() => navigator.serviceWorker.controller)
    await play(page)
    await finish(page)
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('retriever-run.record')).players[0].stats.runs)
    const audio = manifest.assets.find(item => item.id === 'instruments.mp3').path
    const transfers = hits.get(audio)
    legacyActive = false
    await page.evaluate(async () => (await navigator.serviceWorker.ready).update())
    await page.waitForFunction(async () => Boolean((await navigator.serviceWorker.getRegistration())?.waiting))
    await page.goto(new URL('/qa-worker-boundary', url).href)
    await page.waitForFunction(async scope => {
      const registration = await navigator.serviceWorker.getRegistration(scope)
      return registration?.active?.state === 'activated' && !registration.waiting && !registration.installing
    }, url)
    await page.goto(url + '?perf=1')
    await page.locator('#content-download').waitFor()
    await page.locator('#content-download').tap()
    await ready()
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('retriever-run.record')).players[0].stats.runs), before)
    assert.equal(hits.get(audio), transfers)
    log.legacyUpgrade = { preservedRuns: before, unchangedAudioRequests: transfers }
  } else if (baseline) {
    log.coldReadyMs = Math.round(await ready())
    await play(page)
    await finish(page)
    log.restartMs = await restart(page)
    await page.waitForTimeout(650)
    log.wallFrameIntervals = await realFrameIntervals(page)
  } else {
    await page.locator('#content-download').filter({ hasText: 'Download & play' }).waitFor()
    await page.waitForFunction(() => !document.querySelector('#content-download').disabled)
    assert.equal(await page.locator('#game').isHidden(), true)
    assert.equal([...hits].some(([path]) => path.startsWith('assets/main-') && path.endsWith('.js')), false)
    log.disclosure = await page.locator('#content-size').textContent()
    await page.screenshot({ path: resolve(output, 'first-download.png'), scale: 'css' })
    await page.locator('#content-download').tap()
    await page.getByRole('button', { name: 'Retry download' }).waitFor({ timeout: 35_000 })
    const previouslyVerified = openingManifest.assets.filter(item => item.group === 'audio').find(item => hits.has(item.path))
    assert.ok(previouslyVerified)
    const audioHits = hits.get(previouslyVerified.path)
    log.interruption = await page.locator('#content-status').textContent()
    await page.screenshot({ path: resolve(output, 'interrupted.png'), scale: 'css' })
    blocked = null
    await page.getByRole('button', { name: 'Retry download' }).tap()
    log.coldReadyMsIncludingRetry = Math.round(await ready())
    assert.equal(hits.get(previouslyVerified.path), audioHits)
    await play(page)
    await finish(page)
    log.restartMs = await restart(page)
    await page.waitForTimeout(650)
    log.wallFrameIntervals = await realFrameIntervals(page)
    log.renderer = await page.evaluate(() => window.retrieverPerformance?.())
    await page.screenshot({ path: resolve(output, 'running.png'), scale: 'css' })
    await finish(page)
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('retriever-run.record')).players[0].stats.runs)
    await page.waitForFunction(() => navigator.serviceWorker.controller)
    if (args.includes('repair')) {
      const corrupt = openingManifest.assets.find(asset => asset.id === 'mallard.mp3')
      await page.evaluate(async hash => {
        const path = new URL('./', location.href)
        const cache = await caches.open('retriever-run-content:' + path.href)
        const key = new URL('__rr_content__/' + hash, path)
        await cache.put(key, new Response('invalid media'))
        if (await (await cache.match(key)).text() !== 'invalid media') throw new Error('Could not set the corrupt cache fixture')
      }, corrupt.sha256)
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForFunction(() => !document.querySelector('#content-download').disabled)
      assert.equal(await page.locator('#game').isHidden(), true)
      const oldRequests = hits.get(corrupt.path)
      await page.locator('#content-download').tap()
      await ready()
      assert.equal(hits.get(corrupt.path), oldRequests + 1)
      assert.equal(hits.get(previouslyVerified.path), audioHits)
      log.corruptFileRepaired = true
    }
    await page.evaluate(() => sessionStorage.setItem('qa.standalone', '1'))
    await context.setOffline(true)
    await page.reload({ waitUntil: 'domcontentloaded' })
    log.offlineReadyMs = Math.round(await ready())
    await page.screenshot({ path: resolve(output, 'offline-camp.png'), scale: 'css' })
    await page.locator('#settings').tap()
    assert.equal(await page.locator('#install-app').isHidden(), true)
    await page.locator('#close-settings').tap()
    await play(page)
    await page.evaluate(() => window.qaBackground(true))
    await page.waitForFunction(() => document.querySelector('#game').dataset.mode === 'paused')
    const paused = await page.locator('#menu-copy').textContent()
    await page.waitForTimeout(260)
    assert.equal(await page.locator('#menu-copy').textContent(), paused)
    await page.evaluate(() => window.qaBackground(false))
    await page.locator('#primary').tap()
    await finish(page)
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('retriever-run.record')).players[0].stats.runs), before + 1)
    await page.locator('#report-lodge').tap()
    await page.locator('#tab-kennel').tap()
    const bottom = page.locator('.kennel-items button').last()
    await bottom.scrollIntoViewIfNeeded()
    await bottom.tap()
    assert.ok(await page.locator('.kennel-selection').isVisible())
    await page.locator('#close-lodge').tap()
    await context.setOffline(false)
    if (!args.includes('offline-only')) {
      const idle = await context.newPage()
      await idle.goto(url + '?perf=1')
      await ready(idle)
      await play(page)
      await page.evaluate(() => window.qaBackground(true))
      await page.waitForFunction(() => document.querySelector('#game').dataset.mode === 'paused')
      newRelease = true
      await idle.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready
        await registration.update()
      })
      await idle.locator('#content-open').filter({ hasText: 'Game update available' }).waitFor({ state: 'attached', timeout: 35_000 })
      await idle.locator('#settings').tap()
      await idle.getByRole('button', { name: 'Game update available' }).tap()
      const preparation = idle.getByRole('button', { name: /^(Download|Apply) update$/ })
      await preparation.tap()
      await idle.getByText('Finish or leave any open hunt').waitFor({ timeout: 60_000 })
      const releaseMarker = phaseTwo ? 'meta[name="course-ruleset"]' : upgrade ? '#swipe' : 'meta[name="qa-release"]'
      assert.equal(await page.locator(releaseMarker).count(), 0)
      assert.equal(await page.locator('#game').getAttribute('data-mode'), 'paused')
      await page.evaluate(() => window.qaBackground(false))
      await finish(page)
      await idle.getByRole('button', { name: 'Apply update' }).tap()
      await idle.locator(releaseMarker).waitFor({ state: 'attached', timeout: 35_000 })
      await ready(idle)
      await page.locator(releaseMarker).waitFor({ state: 'attached', timeout: 35_000 })
      const after = await idle.evaluate(() => JSON.parse(localStorage.getItem('retriever-run.record')).players[0].stats.runs)
      assert.equal(after, before + 2)
      assert.equal(hits.get(previouslyVerified.path), audioHits)
      if (upgrade) {
        await idle.locator('#settings').tap()
        assert.equal(await idle.locator('#swipe').inputValue(), 'standard')
        await idle.locator('#swipe').selectOption('deliberate')
        await idle.reload({ waitUntil: 'domcontentloaded' })
        await ready(idle)
        await idle.locator('#settings').tap()
        assert.equal(await idle.locator('#swipe').inputValue(), 'deliberate')
        log.updateVersions = [openingManifest.version, manifest.version]
      }
      log.update = { busyHuntProtected: true, preservedRuns: after, unchangedAudioRequests: audioHits }
    }
  }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify(log))
  await writeFile(resolve(output, 'production-test.json'), JSON.stringify(log, null, 2))
} finally {
  await browser.close()
  server.close()
}
