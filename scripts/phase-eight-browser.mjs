import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { buildLabel } from '../src/build-info.js'
import { saveKey } from '../src/lodge-save.js'
import { lodgeFixture } from './lodge-fixtures.mjs'

const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/phase-08')
const safari = process.argv.includes('webkit')
const viewport = process.argv.includes('large') ? { width: 430, height: 932 } : { width: 320, height: 568 }
const prefix = '/Retriever-Run/'
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary' }
const release = JSON.parse(await readFile(resolve(root, 'content-manifest.json'), 'utf8'))
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  if (!path.startsWith(prefix)) return response.writeHead(404).end()
  const file = resolve(root, path.slice(prefix.length) || 'index.html')
  if (!file.startsWith(root + sep)) return response.writeHead(404).end()
  try {
    const body = await readFile(file)
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
      'Content-Length': body.length, 'Cache-Control': 'no-store' }).end(body)
  } catch { response.writeHead(404).end() }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
await mkdir(output, { recursive: true })
const url = 'http://127.0.0.1:' + server.address().port + prefix
const browser = await (safari ? webkit.launch() : chromium.launch({
  executablePath: process.env.FIELD_CHROMIUM,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
}))
try {
  const baseline = process.argv.includes('baseline')
  const startup = process.argv.includes('startup')
  const fixture = lodgeFixture()
  if (!baseline && !startup) fixture.players[0].enrollment = null
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport, deviceScaleFactor: 1 })
  await context.addInitScript(({ key, initial }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(initial))
    Math.random = () => 7 / 0x100000000
    const isHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden').get
    let override
    Object.defineProperty(document, 'hidden', { get: () => override ?? isHidden.call(document) })
    window.qaHide = hidden => {
      override = hidden
      document.dispatchEvent(new Event('visibilitychange'))
    }
  }, { key: saveKey, initial: fixture })
  const page = await context.newPage()
  page.setDefaultTimeout(35_000)
  const errors = []
  page.on('pageerror', error => { errors.push(error.message); console.error(error.stack) })
  const outputFile = name => resolve(output, name + '.png')
  const shot = name => page.screenshot({ path: outputFile(name), animations: 'disabled' })
  const panel = page.locator('#lodge-panel')
  const rooms = page.locator('#lodge-room')
  const room = value => rooms.selectOption(value)
  const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey)
  const ready = () => page.waitForFunction(() => !document.querySelector('#game').hidden && !document.querySelector('#primary').disabled)
  const state = wanted => page.waitForFunction(value => document.querySelector('#game').dataset.mode === value, wanted)
  const close = () => page.locator('#close-lodge').tap()
  const over = () => page.locator('#field-report').waitFor({ timeout: 60_000 })
  const report = page.locator('#field-report')
  const choosePlayer = async id => {
    const profile = page.locator('#camp-profile')
    if (await profile.getAttribute('open') === null) await profile.locator('summary').tap()
    await page.locator('#local-player').selectOption(String(id))
    if (await profile.getAttribute('open') !== null) await profile.locator('summary').tap()
  }
  const measureReady = () => page.evaluate(() => ({
    wall: Math.round(performance.now()),
    ready: Math.round(window.retrieverPerformance().ready),
    collectionRequests: performance.getEntriesByType('resource').filter(asset =>
      /\/species\/|\/lodge\/|\/lodge-gallery-/.test(asset.name) && asset.initiatorType !== 'fetch').length,
  }))
  await page.goto(url + '?perf=1')
  await page.locator('#content-download').tap()
  await ready()
  const cold = await measureReady()
  assert.equal(cold.collectionRequests, 0)
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  await context.setOffline(true)
  await page.reload({ waitUntil:'domcontentloaded' })
  await ready()
  assert.equal(await page.locator('#running-version').textContent(), buildLabel(release.app))
  assert.deepEqual(await page.evaluate(() => window.retrieverPerformance().build), release.app)
  const warm = await measureReady()
  assert.equal(warm.collectionRequests, 0)
  if (startup) {
    const samples = [warm]
    for (let i = 0; i < 2; i++) {
      await page.reload({ waitUntil:'domcontentloaded' })
      await ready()
      samples.push(await measureReady())
    }
    console.log(JSON.stringify({ app: release.app, viewport, cold, warm: samples, errors }))
  } else if (baseline) {
    await shot('before-main-menu')
    await page.locator('#open-lodge').tap()
    await panel.locator('.lodge-interior').waitFor()
    await shot('before-lodge-navigation')
    await close()
    await page.locator('#primary').tap()
    await over()
    await shot('before-hunt-over')
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ app: release.app, viewport, cold, warm, errors }))
  } else {
    assert.equal(await page.locator('#onboarding').evaluate(el => el.open), false)
    assert.equal((await saved()).players[0].enrollment, null)
    await shot('main-menu')
    await page.locator('#tutorial-entry').tap()
    await page.getByRole('dialog', { name: 'How to hunt' }).waitFor()
    const guideTitle = await page.locator('#tutorial-title').boundingBox()
    const guide = await page.locator('#tutorial').boundingBox()
    assert.ok(guideTitle.y >= guide.y && guideTitle.y + guideTitle.height <= guide.y + guide.height)
    assert.equal(await page.locator('#tutorial').evaluate(el => el.scrollTop), 0)
    await shot('first-time-guide')
    await page.locator('#tutorial-close').tap()
    assert.equal((await saved()).players[0].stats?.runs ?? 0,0)
    assert.equal((await saved()).players[0].enrollment,null)

    await page.locator('#primary').tap()
    await state('running')
    await shot('active-hud')
    await page.evaluate(() => window.qaHide(true))
    await state('paused')
    await shot('pause')
    const held = await page.locator('#menu-copy').textContent()
    await page.waitForTimeout(200)
    assert.equal(await page.locator('#menu-copy').textContent(), held)
    await page.evaluate(() => window.qaHide(false))
    await page.locator('#primary').tap()
    await state('running')
    await over()
    assert.equal(await report.locator('#report-details').isHidden(),true)
    assert.equal((await saved()).players[0].stats.runs,1)
    assert.equal((await saved()).players[0].enrollment,'guest')
    await shot('hunt-over')
    const replay = report.locator('#run-again')
    let bounds = await replay.boundingBox()
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height)
    await page.locator('#report-details-toggle').tap()
    await report.getByRole('heading', { name:'Full Field Report' }).waitFor()
    await shot('full-field-report')
    bounds = await replay.boundingBox()
    assert.ok(bounds.y + bounds.height <= viewport.height)
    const tapped = Date.now()
    await replay.tap()
    await state('running')
    const replayMs = Date.now() - tapped
    await over()
    assert.equal(await report.locator('#report-details').isHidden(),true)
    await page.locator('#main-menu').tap()

    await page.locator('#settings').tap()
    if (await page.locator('#motion').isEnabled()) await page.locator('#motion').check()
    assert.equal(await page.locator('html').evaluate(el => el.hasAttribute('data-reduce-motion')), true)
    await page.locator('#quality').selectOption('low')
    await page.locator('#masterVolume').fill('61')
    await page.locator('#masterVolume').dispatchEvent('input')
    if (!await page.evaluate(() => typeof navigator.vibrate === 'function'))
      assert.equal(await page.locator('#haptics').isHidden(), true)
    await shot('settings')
    await page.locator('#close-settings').tap()
    await page.reload({ waitUntil:'domcontentloaded' })
    await ready()
    assert.equal((await saved()).players[0].profile.masterVolume,.61)
    assert.equal((await saved()).players[0].profile.quality,'low')

    await page.locator('#open-lodge').tap()
    await choosePlayer(8)
    await panel.locator('.lodge-interior').waitFor()
    assert.equal(await page.locator('.lodge-tabs button').count(),5)
    await shot('lodge-navigation')
    await room('collection')
    const retained = await panel.locator('.gallery-heading').textContent()
    assert.ok(Number(retained.match(/(\d+) earned/)[1]) > 239, retained)
    await shot('trophy-room')
    const search = panel.getByRole('searchbox', {name:'Search trophies'})
    await search.fill('cranE')
    assert.ok(await panel.locator('.lodge-trophy-list [data-trophy="observe:crane"]').count())
    assert.ok(await panel.locator('.lodge-trophy').count() <= 10)
    await panel.getByLabel('Trophy category').selectOption('wildlife')
    await shot('collection-search')
    await page.locator('#tab-journal').tap()
    await panel.getByLabel('Wildlife group').selectOption('reptiles')
    const reptile = panel.locator('[data-species="alligator"]')
    assert.equal(await reptile.locator('img').getAttribute('src'), './species/alligator.webp')
    await reptile.locator('img').evaluate(img => img.decode())
    await shot('reptile-journal')
    await panel.getByLabel('Wildlife group').selectOption('waterfowl')
    await panel.getByRole('searchbox', {name:'Search wildlife'}).fill('wood duck')
    await panel.locator('[data-species="wood-duck"] img').evaluate(img => img.decode())
    await shot('field-journal')
    await page.locator('#tab-overview').tap()
    await room('collection')
    assert.equal(await panel.getByRole('searchbox', {name:'Search trophies'}).inputValue(),'cranE')
    await room('trophies')
    await panel.getByRole('searchbox', { name:'Search Field Honors' }).fill('migration')
    await panel.getByLabel('Honor rarity').selectOption('Platinum')
    assert.ok(await panel.locator('[data-honor]').count() <= 16)
    await shot('field-honors')
    await page.locator('#tab-kennel').tap()
    const tail = panel.locator('.kennel-items button').last()
    await tail.scrollIntoViewIfNeeded()
    await tail.tap()
    await shot('last-kennel-card')
    await close()
    await page.waitForFunction(() => document.querySelector('#lodge-panel').childElementCount === 0)

    await page.locator('#primary').tap()
    await over()
    await report.locator('[data-reward="prestige"]').waitFor()
    assert.ok(await report.locator('.reward-summary li').count() > 1)
    assert.ok((await saved()).players.find(p => p.id === 8).progression.boyd)
    await shot('legendary-reward')
    await replay.tap()
    await over()
    assert.equal(await report.locator('[data-reward="prestige"]').count(),0)
    assert.deepEqual(errors,[])
    const result = { app: release.app, engine:safari?'webkit':'chromium', viewport, cold, warm, replayMs, offline:true,
      trophyCollection:retained, initialHuntOneTap:true, preservedSearch:true, qualifiedThroughHunt:true, errors }
    await writeFile(resolve(output,'browser.json'),JSON.stringify(result,null,2)+'\n')
    console.log(JSON.stringify(result))
  }
} finally {
  await browser.close()
  await new Promise(done => server.close(done))
}
