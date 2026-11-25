import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { buildLabel } from '../src/build-info.js'
import { saveKey } from '../src/lodge-save.js'
import { lodgeFixture } from './lodge-fixtures.mjs'

const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/phase-07')
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
  const baselineProbe = process.argv.includes('startup')
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  await context.addInitScript(({ key, fixture }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(fixture))
    Math.random = () => 7 / 0x100000000
  }, { key: saveKey, fixture: lodgeFixture() })
  const page = await context.newPage()
  page.setDefaultTimeout(50_000)
  const errors = []
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message) })
  const trace = step => { if (process.env.FIELD_QA_TRACE) console.error(step) }
  const ready = () => page.waitForFunction(() => !document.querySelector('#game').hidden && !document.querySelector('#primary').disabled)
  const runtimeResources = () => page.evaluate(() => performance.getEntriesByType('resource')
    .filter(asset => /\/lodge\/|\/lodge-gallery-/.test(asset.name) && asset.initiatorType !== 'fetch')
    .map(asset => asset.name))
  const capture = name => page.screenshot({ path: resolve(output, name + '.png'), animations: 'disabled' })
  const tab = room => page.locator('#tab-' + room).tap()
  const scroll = locator => locator.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }))
  const save = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey)
  const build = () => page.locator('#running-version').textContent()
  const enter = () => page.locator('#open-lodge').tap()
  const leave = () => page.locator('#close-lodge').tap()
  const panel = page.locator('#lodge-panel')
  const switchPlayer = async (id, tier) => {
    const profile = page.locator('#camp-profile')
    if (await profile.getAttribute('open') === null) await profile.locator('summary').tap()
    await profile.locator('#local-player').selectOption(String(id))
    await profile.locator('summary').tap()
    await tab('overview')
    await panel.locator('.lodge-interior[data-tier="' + tier + '"]').waitFor()
  }
  const fit = () => page.evaluate(() => document.querySelector('.lodge-scroll').scrollWidth <=
    document.querySelector('.lodge-scroll').clientWidth + 1 && document.documentElement.scrollWidth === innerWidth)
  const finish = async () => {
    await page.locator('#primary').tap()
    await page.waitForFunction(() => document.querySelector('#game').dataset.mode === 'running')
    await page.locator('#field-report').waitFor({ timeout: 95_000 })
  }

  await page.goto(url + '?perf=1')
  await page.locator('#content-download').tap()
  await ready()
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  assert.equal(await build(),buildLabel(release.app))
  assert.deepEqual(await runtimeResources(),[],'no parsed Lodge room or decoded display artwork on title')
  await context.setOffline(true)
  if (baselineProbe) {
    const samples = []
    for (let i = 0; i < 4; i++) {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await ready()
      const timing = await page.evaluate(() => ({ observed: Math.round(performance.now()),
        readyMarker: Math.round(window.retrieverPerformance().ready) }))
      if (i > 0) samples.push(timing)
    }
    console.log(JSON.stringify({ app: release.app, engine: safari ? 'webkit' : 'chromium', viewport, samples,
      lazy: (await runtimeResources()).length === 0 }))
  } else {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await ready()
    assert.equal(await build(),buildLabel(release.app))
    await enter()
    const interior = panel.locator('.lodge-interior-art')
    await interior.waitFor()
    await interior.evaluate(image => image.decode())
    assert.ok((await runtimeResources()).some(path => path.endsWith('tier-1.webp')))
    assert.ok(await fit())
    await capture('small-screen-navigation')
    await scroll(panel.locator('.lodge-interior'))
    await capture('tier-1')
    trace('Starter Shack loaded offline')

    await switchPlayer(2,'shack')
    await panel.getByRole('button',{ name: /Carved Mallard/ }).waitFor()
    await scroll(panel.locator('.lodge-interior'))
    await capture('same-level-retriever')
    await switchPlayer(3,'shack')
    await panel.getByRole('button',{ name: /First Field Study/ }).waitFor()
    assert.equal(await panel.getByRole('button',{ name: /Carved Mallard/ }).count(),0)
    await scroll(panel.locator('.lodge-interior'))
    await capture('same-level-observer')

    await switchPlayer(4,'cabin')
    await interior.evaluate(image => image.decode())
    await scroll(panel.locator('.lodge-interior'))
    await capture('tier-2')
    await switchPlayer(5,'waterfowl')
    await interior.evaluate(image => image.decode())
    await scroll(panel.locator('.lodge-interior'))
    await capture('tier-3')
    await switchPlayer(6,'estate')
    await interior.evaluate(image => image.decode())
    await scroll(panel.locator('.lodge-interior'))
    await capture('tier-4')
    await switchPlayer(7,'legendary')
    await interior.evaluate(image => image.decode())
    await scroll(panel.locator('.lodge-interior'))
    await capture('tier-5')
    const tribute = panel.getByRole('region', { name: 'Master Hunter tribute' })
    assert.equal(await tribute.getAttribute('data-qualified'),'false')
    assert.equal(await tribute.locator('img').count(),0)
    await scroll(tribute)
    await capture('tribute-locked-level-100')

    await switchPlayer(5,'waterfowl')
    await tab('collection')
    await panel.getByLabel('Trophy category').selectOption('wildlife')
    const crane = panel.locator('[data-trophy="observe:crane"]')
    await crane.locator('summary').tap()
    await crane.getByRole('button',{ name: 'Pin trophy', exact: true }).tap()
    assert.deepEqual((await save()).players.find(player => player.id === 5).lodgeDisplay.pins,['observe:crane'])
    await panel.getByLabel('Trophy category').selectOption('pinned')
    await panel.locator('[data-trophy="observe:crane"]').locator('summary').tap()
    await scroll(panel.locator('.lodge-display-room'))
    await capture('trophy-room')
    await tab('overview')
    await panel.getByRole('region',{ name: 'Trophy shelf' }).getByRole('button',{ name: /Sandhill Crane/ }).waitFor()

    await tab('migration')
    await panel.getByLabel('Migration territory').selectOption({ index: 6 })
    const platte = panel.locator('[data-region="platte"]')
    assert.equal(await platte.getAttribute('data-status'),'traversed')
    assert.match(await platte.textContent(), /Best retained finishing score9,091/)
    const mapRegion = panel.locator('.lodge-map-room')
    await scroll(mapRegion)
    await capture('migration-wall')
    await scroll(platte)
    await capture('migration-record')
    await panel.getByLabel('Migration territory').selectOption({ index: 14 })
    assert.equal(await panel.locator('[data-region="mountain"]').getAttribute('data-status'),'unreached')

    await tab('records')
    await panel.getByText('Earlier Great Migration · retained records',{ exact: true }).tap()
    await scroll(panel.locator('.gallery-heading'))
    await capture('personal-records')
    await tab('equipment')
    await panel.locator('[data-item="brass-collar"]').first().waitFor()
    await scroll(panel.locator('.equipment-room'))
    await capture('equipment')
    await tab('trophies')
    await panel.getByLabel('Field Honor category').selectOption('Legendary')
    await panel.locator('[data-honor=legend-whole-course] summary').tap()
    await scroll(panel.locator('.patch-section').first())
    await capture('field-honors')
    await tab('shame')
    await panel.getByRole('region',{ name: 'Hall of Shame displays' }).waitFor()
    await scroll(panel.locator('.lodge-hall'))
    await capture('hall-of-shame')

    await tab('kennel')
    const last = panel.locator('.kennel-items button').last()
    await last.scrollIntoViewIfNeeded()
    await last.tap()
    assert.ok(await panel.locator('.kennel-selection').isVisible())
    assert.ok(await fit())
    await capture('last-kennel-card')
    await leave()
    await page.waitForFunction(() => document.querySelector('#lodge-panel').childElementCount === 0)
    assert.equal(await panel.locator('canvas,img').count(),0)
    trace('All rooms, pinning and canvas cleanup verified')

    await enter()
    await switchPlayer(8,'legendary')
    assert.equal(await tribute.getAttribute('data-qualified'),'false')
    await leave()
    await finish()
    const qualified = (await save()).players.find(player => player.id === 8)
    assert.ok(qualified.progression.boyd)
    await page.getByText('Master Hunter Tribute added to the Lodge',{ exact: true }).waitFor()
    await page.getByRole('button',{ name: 'See the Lodge', exact: true }).tap()
    assert.equal(await tribute.getAttribute('data-qualified'),'true')
    await scroll(tribute)
    await tribute.locator('.tribute-portrait').evaluate(image => image.decode())
    await capture('tribute-earned')

    await switchPlayer(9,'shack')
    await leave()
    const menu = page.locator('#main-menu')
    await menu.tap()
    await finish()
    const tierReward = page.locator('.report-lodge-award')
    assert.match(await tierReward.textContent(),/Lodge upgraded · The Retriever’s Cabin/)
    await scroll(tierReward)
    await capture('lodge-upgrade-hunt-over')
    const replay = page.locator('#run-again')
    const bounds = await replay.boundingBox()
    assert.ok(bounds.y + bounds.height <= viewport.height)
    const started = Date.now()
    await replay.tap()
    await page.waitForFunction(() => document.querySelector('#game').dataset.mode === 'running')
    const replayMs = Date.now() - started
    await page.locator('#field-report').waitFor({ timeout:95_000 })
    assert.equal(await page.locator('.report-lodge-award').count(),0)
    const snapshot = await save()
    assert.equal(snapshot.players.find(player => player.id === 9).stats.runs,2)
    assert.ok(snapshot.players.find(player => player.id === 8).progression.boyd)
    assert.equal(snapshot.version,6)
    assert.deepEqual(errors,[])
    const result = { app:release.app, engine:safari?'webkit':'chromium', viewport, offline:true, replayMs,
      tiers:5, sameLevelVariants:2, trophyPinned:true, qualificationGranted:true, upgradeGrantedOnce:true,
      releasedLodgeDOM:true, lastKennelCard:true, errors }
    await writeFile(resolve(output,'browser.json'),JSON.stringify(result,null,2)+'\n')
    console.log(JSON.stringify(result))
  }
} finally {
  await browser.close()
  await new Promise(done => server.close(done))
}
