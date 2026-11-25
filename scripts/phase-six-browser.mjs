import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { buildLabel } from '../src/build-info.js'
import { openLodge, saveKey } from '../src/lodge-save.js'
import { masterHunter } from '../src/master-hunter.js'
import { masterHunterChecks } from '../src/progression.js'
import { nearMasterHunter } from './career-fixtures.mjs'

const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/phase-06')
const safari = process.argv.includes('webkit')
const viewport = { width: 320, height: 568 }
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
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  await context.addInitScript(({ key, fixture }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture))
    Math.random = () => 7 / 0x100000000
  }, { key: saveKey, fixture: nearMasterHunter() })
  const page = await context.newPage()
  page.setDefaultTimeout(45_000)
  const errors = []
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message) })
  const ready = () => page.waitForFunction(() => !document.querySelector('#game').hidden && !document.querySelector('#primary').disabled)
  const save = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)).players[0], saveKey)
  const capture = name => page.screenshot({ path: resolve(output, name + '.png'), animations: 'disabled' })
  const tab = room => page.locator('#tab-' + room).tap()
  const tapText = text => page.getByText(text, { exact: true }).tap()
  const scroll = locator => locator.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }))
  const fail = message => assert.fail(message)
  await page.goto(url + '?perf=1')
  await page.locator('#content-download').tap()
  await ready()
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  assert.equal(await page.locator('#running-version').textContent(), buildLabel(release.app))
  assert.equal(await page.locator('#game').getAttribute('data-practice'), null)
  await page.locator('#open-lodge').tap()
  await tab('career')
  await page.locator('#lodge-panel').getByText('Legendary Retriever · Level 99', { exact: true }).waitFor()
  await capture('career-overview')
  await tapText('All ten ranks')
  const ranks = page.locator('.career-patch')
  assert.equal(await ranks.count(), 10)
  await scroll(page.getByText('All ten ranks', { exact: true }))
  await capture('ranks')
  const checklist = page.locator('.master-qualification')
  assert.equal(await checklist.locator('li[data-met=false]').count(), 1)
  await scroll(checklist)
  await capture('qualification')
  await tab('trophies')
  await capture('field-honors')
  await page.getByLabel('Field Honor category').selectOption('Legendary')
  await page.locator('[data-honor="legend-whole-course"] summary').tap()
  await page.getByText('Survive through Canadian Mountain Wilderness · 1').waitFor()
  await scroll(page.locator('[data-honor="legend-whole-course"]'))
  await capture('honor-detail')
  await page.getByLabel('Field Honor category').selectOption('Worldwide Camp')
  await page.locator('[data-honor="camp-placement-1"] summary').tap()
  await page.locator('[data-honor=camp-placement-1]').getByText('Pending · verified Camp play').waitFor()
  await tab('journal')
  await capture('field-journal')
  await tapText('Regional wildlife collections')
  await scroll(page.getByText('Regional wildlife collections', { exact: true }))
  await capture('regional-collection')
  await tab('kennel')
  const canvas = page.locator('.kennel-stage canvas')
  await canvas.waitFor()
  await page.waitForFunction(() => window.retrieverPerformance().dogBreed === 'lab')
  await capture('kennel')
  const beforeDrag = await canvas.screenshot()
  const stageBounds = await canvas.boundingBox()
  await page.mouse.move(stageBounds.x + stageBounds.width * .35, stageBounds.y + stageBounds.height * .5)
  await page.mouse.down()
  await page.mouse.move(stageBounds.x + stageBounds.width * .65, stageBounds.y + stageBounds.height * .5, { steps: 4 })
  await page.mouse.up()
  await page.waitForTimeout(250)
  assert.ok(!beforeDrag.equals(await canvas.screenshot()), 'dragging rotates the real Kennel stage')
  const ownedBefore = (await save()).kennel?.equipment
  const last = page.locator('.kennel-items button').last()
  await last.scrollIntoViewIfNeeded()
  await last.tap()
  assert.equal(await last.getAttribute('data-gear'), masterHunter.signature)
  assert.ok(await page.getByRole('button', { name: 'Locked', exact: true }).isDisabled())
  assert.deepEqual((await save()).kennel?.equipment, ownedBefore)
  await capture('locked-equipment')
  await tapText('Working dogs')
  assert.equal(await page.getByRole('button', { name: 'Equip Boyd', exact: true }).count(), 0)
  await page.locator('#close-lodge').tap()
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await ready()
  assert.equal(await page.locator('#running-version').textContent(), buildLabel(release.app))
  await page.locator('#primary').tap()
  await page.waitForFunction(() => document.querySelector('#game').dataset.mode === 'running')
  await page.locator('#field-report').waitFor({ timeout: 95_000 })
  const saved = await save()
  assert.equal(saved.stats.runs, 4301)
  if (!saved.progression.boyd) {
    const data = await page.evaluate(key => localStorage.getItem(key), saveKey)
    const lodge = openLodge(() => ({ getItem: key => key === saveKey ? data : null }))
    assert.fail('Boyd qualification after the fixture hunt: ' + JSON.stringify({ career: saved.career,
      pending: masterHunterChecks(lodge.current()).filter(check => !check.met), report: await page.locator('#report-career').textContent() }))
  }
  assert.match(await page.locator('#report-career').textContent(), /Career XP.*Level 100.*Master Hunter kit earned/s)
  assert.deepEqual(await page.evaluate(() => window.retrieverPerformance().build), release.app)
  await capture('hunt-over')
  await scroll(page.locator('#report-career'))
  await capture('hunt-rewards')
  const replay = page.locator('#run-again')
  const actionBounds = await replay.boundingBox()
  assert.ok(actionBounds.y >= 0 && actionBounds.y + actionBounds.height <= viewport.height)
  await page.locator('#report-lodge').tap()
  await tab('kennel')
  await tapText('Working dogs')
  await page.getByRole('button', { name: 'Equip Boyd', exact: true }).tap()
  assert.equal((await save()).kennel.breed, 'boyd')
  assert.equal((await save()).kennel.equipment.collar, masterHunter.signature)
  await scroll(page.locator('.kennel-master-hunter'))
  await capture('boyd-earned')
  await scroll(page.locator('.kennel-stage'))
  await page.waitForFunction(() => window.retrieverPerformance().dogBreed === 'boyd')
  await page.waitForTimeout(800)
  await capture('boyd-portrait')
  const currentResources = () => page.evaluate(() => {
    const snapshot = window.retrieverPerformance()
    return { textures: snapshot.textures, geometries: snapshot.geometries, breed: snapshot.dogBreed }
  })
  const firstFit = await currentResources()
  for (const [name, breed] of [['Use Labrador', 'lab'], ['Equip Boyd', 'boyd']]) {
    await page.getByRole('button', { name, exact: true }).tap()
    await page.waitForFunction(expected => window.retrieverPerformance().dogBreed === expected, breed)
  }
  const secondFit = await currentResources()
  await page.locator('#close-lodge').tap()
  const replayStart = Date.now()
  await replay.tap()
  await page.waitForFunction(() => document.querySelector('#game').dataset.mode === 'running')
  const replayMs = Date.now() - replayStart
  await page.waitForTimeout(800)
  await capture('offline-replay')
  await page.locator('#field-report').waitFor({ timeout: 95_000 })
  assert.equal((await save()).stats.runs, 4302)
  assert.equal((await save()).progression.boyd, saved.progression.boyd)
  if (errors.length) fail(errors.join('\n'))
  const result = { browser: safari ? 'webkit' : 'chromium', app: release.app, viewport, replayMs,
    xp: saved.career.xp, honors: Object.keys(saved.progression.honors).length,
    sameBuildOffline: true, firstBoydAward: true, offlineHunts: 2, firstFit, secondFit, errors }
  await writeFile(resolve(output, 'browser.json'), JSON.stringify(result, null, 2) + '\n')
  console.log(JSON.stringify(result))
} finally {
  await browser.close()
  await new Promise(done => server.close(done))
}
