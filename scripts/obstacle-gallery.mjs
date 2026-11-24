import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, webkit } from 'playwright'
import { createServer } from 'vite'

const args = process.argv.slice(2)
const baseline = args.includes('baseline')
const engine = args.includes('webkit') ? webkit : chromium
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output')
const server = await createServer({ root: process.env.FIELD_STUDIO_SOURCE ?? '.', server: { host: '127.0.0.1', port: 0, hmr: false } })
await server.listen()
const url = 'http://127.0.0.1:' + server.httpServer.address().port + '/scripts/fixtures/obstacle-gallery.html'
const browser = await engine.launch(engine === chromium ? {
  executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
} : {})
const forms = [
  ['log', 11], ['root', 40], ['drift', 72], ['tree', 95], ['fence', 124], ['branch', 134],
  ['branch-wide', 226], ['tractor', 125], ['puddle', 141], ['stream', 155], ['washout', 254], ['goose', 249],
  ['fallen', 249, 0], ['fallen', 249, 1], ['fallen', 249, 2],
]
const selected = new Set(args.filter(arg => forms.some(([type]) => type === arg)))
try {
  await mkdir(output, { recursive: true })
  const page = await browser.newPage({ viewport: { width: 732, height: 426 }, deviceScaleFactor: .64 })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()) })
  await page.goto(url + (baseline ? '?baseline' : ''))
  await page.waitForFunction(() => typeof captureTerrainForm === 'function', null, { timeout: 60_000 })
  for (const [type, elapsed, variety] of baseline ? [['fallen', 249, 0]] : forms) {
    if (args.includes('scenery-only') || args.includes('character-only')) break
    if (selected.size && !selected.has(type)) continue
    if (args.includes('timber-only') && type !== 'fallen') continue
    if (args.includes('hazards-only') && type === 'fallen') continue
    for (const shot of ['approach', 'close']) {
      const capture = await page.evaluate(options => captureTerrainForm(options), { type, elapsed, shot, variety })
      const stem = type + (type === 'fallen' ? '-' + variety : '')
      await page.screenshot({ path: resolve(output, stem + '-' + shot + '.png'), scale: 'css', timeout: 70_000 })
      assert.ok(capture.triangles > 0)
      console.log(JSON.stringify(capture))
    }
  }
  if (args.includes('character-only')) {
    await page.evaluate(() => captureTerrainForm({ shot: 'character', elapsed: 129, type: 'terrain' }))
    await page.screenshot({ path: resolve(output, 'labrador-vest.png'), scale: 'css', timeout: 70_000 })
  } else if (!selected.size && !args.includes('timber-only') && !args.includes('hazards-only')) {
    for (const [key, elapsed] of [['boreal', 248], ['mountain', 288], ['sunbreak', 318]]) {
      await page.evaluate(options => captureTerrainForm(options), { shot: 'panorama', elapsed, type: 'terrain' })
      await page.screenshot({ path: resolve(output, key + '-panorama.png'), scale: 'css', timeout: 70_000 })
    }
    for (const [key, elapsed] of [['boreal', 248], ['mountain', 288]]) {
      await page.evaluate(options => captureTerrainForm(options), { shot: 'trees', elapsed, type: 'terrain' })
      await page.screenshot({ path: resolve(output, key + '-conifer.png'), scale: 'css', timeout: 70_000 })
    }
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
  await server.close()
}
