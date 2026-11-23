import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { createServer } from 'vite'

const engine = process.argv.includes('webkit') ? webkit : chromium
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } })
await server.listen()
const origin = 'http://127.0.0.1:' + server.httpServer.address().port
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output')
const browser = await engine.launch(engine === chromium ? {
  executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
} : {})

try {
  await mkdir(output, { recursive: true })
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 },
    deviceScaleFactor: .8 })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.goto(origin + '/environment-gallery.html')
  await page.locator('#scene canvas').waitFor()
  for (const [key, expected] of [
    ['trees', 'EFX'], ['grass', 'Nicholas-3D'], ['south', 'bald cypress'],
    ['north', 'paper birch'], ['corn', 'mature autumn corn'],
  ]) {
    await page.locator(`[data-view="${key}"]`).tap()
    await page.waitForFunction(text => document.querySelector('#caption').textContent.includes(text), expected)
    await page.screenshot({ path: resolve(output, engine.name() + '-' + key + '.png'),
      timeout: 90_000, fullPage: true, scale: 'css' })
  }
  assert.deepEqual(errors, [])
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), true)
  const missing = await context.newPage()
  await missing.route('**/landscape-grass-atlas*', route => route.abort())
  await missing.goto(origin + '/environment-gallery.html')
  await missing.locator('[data-view="grass"]').tap()
  await missing.waitForFunction(() => document.querySelector('#caption').textContent.includes('This optional pack is missing.'))
  console.log(JSON.stringify({ browser: engine.name(), width: 390, assets: 5, missingAtlasFallback: true }))
} finally {
  await browser.close()
  await server.close()
}
