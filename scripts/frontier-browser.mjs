import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { xpAt } from '../src/career.js'

const engine = process.argv.includes('webkit') ? webkit : chromium
const baseline = process.argv.includes('baseline')
const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output')
const prefix = '/Retriever-Run/'
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp',
  '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' }
const sizes = baseline ? [[320, 640]] : [[320, 640], [375, 667], [390, 844], [393, 852], [430, 932]]
const localKey = 'retriever-run.record'
const gear = {
  collar: ['classic-leather', 'marsh-bandana'],
  vest: ['no-vest', 'legend-vest'],
  coat: ['classic-yellow', 'chocolate'],
}

const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const file = resolve(root, path.slice(prefix.length) || 'index.html')
  if (!path.startsWith(prefix) || !file.startsWith(root + sep)) return response.writeHead(404).end()
  try {
    const bytes = await readFile(file)
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' }).end(bytes)
  } catch { response.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
await mkdir(output, { recursive: true })
const browser = await engine.launch(engine === chromium ? {
  executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
} : {})
try {
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 320, height: 640 },
    deviceScaleFactor: .68, reducedMotion: 'reduce', serviceWorkers: 'block' })
  const page = await context.newPage()
  page.setDefaultTimeout(45_000)
  const errors = new Set()
  page.on('pageerror', error => errors.add(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.add(message.text()) })
  await page.addInitScript(({ key, xp }) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify({
      version: 2, active: 1, players: [{ id: 1, nickname: 'Cypress Scout', enrollment: 'guest',
        career: { xp }, kennel: { inherited: ['marsh-bandana'] }, profile: { quality: 'low', masterVolume: 0 } }],
    }))
    const draw = WebGL2RenderingContext.prototype.drawElements
    window.frontier = { preview: 0, skin: false }
    const shaderSource = WebGL2RenderingContext.prototype.shaderSource
    WebGL2RenderingContext.prototype.shaderSource = function (shader, source) {
      if (source.includes('#define USE_SKINNING')) frontier.skin = true
      return shaderSource.call(this, shader, source)
    }
    WebGL2RenderingContext.prototype.drawElements = function (...args) {
      if (this.canvas.parentElement?.classList.contains('kennel-stage')) frontier.preview++
      return draw.apply(this, args)
    }
  }, { key: localKey, xp: xpAt(61) })
  await page.goto('http://127.0.0.1:' + server.address().port + prefix)
  const ready = () => page.waitForFunction(() => !document.querySelector('#primary').disabled && frontier.skin)
  await ready()
  const lodge = page.locator('#lodge')
  const stage = page.locator('.kennel-stage')
  const scroller = baseline ? lodge : page.locator('.lodge-scroll')
  const selection = page.locator('.kennel-selection')
  const category = name => page.locator('[data-category="' + name + '"]')
  const card = id => page.locator('[data-gear="' + id + '"]')
  const record = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), localKey)
  const screenshot = name => page.screenshot({ path: resolve(output, engine.name() + '-' + name + '.png'),
    animations: 'disabled', scale: 'css' })
  const rendered = async () => {
    const previous = await page.evaluate(() => frontier.preview)
    await page.waitForFunction(previous => frontier.preview > previous + 2, previous)
  }
  const geometry = () => page.evaluate(() => {
    const frame = document.querySelector('#lodge')
    const grid = document.querySelector('.kennel-items')
    const panel = document.querySelector('.lodge-panel')
    return {
      viewport: [innerWidth, innerHeight], dialogHeight: frame.clientHeight, dialogScroll: frame.scrollHeight,
      gridHeight: grid.clientHeight, gridScroll: grid.scrollHeight, gridOverflow: getComputedStyle(grid).overflowY,
      panelHeight: panel.clientHeight, panelScroll: panel.scrollHeight, panelOverflow: getComputedStyle(panel).overflowY,
      panelVisibleGrid: Math.round(Math.max(0, panel.getBoundingClientRect().bottom - grid.getBoundingClientRect().top)),
    }
  })
  const open = async () => {
    await page.locator('#open-lodge').tap()
    await page.locator('#tab-kennel').tap()
    await stage.waitFor()
  }
  const close = async () => {
    await page.locator('#close-lodge').tap()
    await stage.locator('canvas').waitFor({ state: 'detached' })
  }
  await open()
  await category('vest').tap()
  await card('canvas-vest').tap()
  await rendered()
  if (baseline) {
    console.log(JSON.stringify(await geometry()))
    await screenshot('baseline-320-vest')
    assert.deepEqual([...errors], [])
  } else {
    const gesture = engine === chromium ? await context.newCDPSession(page) : null
    async function scrollFrom(x, y, pixels) {
      if (gesture) {
        const end = y - pixels
        await gesture.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
        for (let i = 1; i <= 8; i++) await gesture.send('Input.dispatchTouchEvent', {
          type: 'touchMove', touchPoints: [{ x, y: Math.round(y + (end - y) * i / 8) }],
        })
        await gesture.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      } else {
        await page.locator('#lodge-panel').evaluate(panel => panel.focus({ preventScroll: true }))
        await page.keyboard.press('PageDown')
      }
    }
    await close()
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height })
      await open()
      const dimensions = await geometry()
      assert.notEqual(dimensions.gridOverflow, 'auto', 'the option grid must use the dialog scroll')
      assert.equal(dimensions.panelOverflow, 'visible')
      assert.ok(dimensions.dialogHeight < height && dimensions.viewport[0] === width)
      for (const [name, [first, last]] of Object.entries(gear)) {
        await category(name).tap()
        await card(first).tap()
        assert.equal(await card(first).getAttribute('aria-pressed'), 'true')
        if (name === 'vest') {
          await card('canvas-vest').tap()
          await rendered()
          await scroller.evaluate(dialog => { dialog.scrollTop = 0 })
          if (width === 320) await screenshot('320-top')
          const before = await scroller.evaluate(dialog => dialog.scrollTop)
          const start = await lodge.evaluate(dialog => Math.floor(Math.min(dialog.getBoundingClientRect().bottom, innerHeight) - 29))
          await scrollFrom(Math.floor(width / 2), start, 180)
          await page.waitForFunction(before => document.querySelector('.lodge-scroll').scrollTop > before, before)
          if (width === 320) await screenshot('320-middle')
        }
        await card(last).tap()
        assert.equal(await card(last).getAttribute('aria-pressed'), 'true')
        const reachable = await card(last).evaluate(button => {
          const bounds = button.getBoundingClientRect()
          const top = button.closest('dialog').getBoundingClientRect()
          const target = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
          return bounds.y >= top.y && bounds.bottom <= top.bottom && button.contains(target)
        })
        assert.ok(reachable, `${width}×${height} ${name} last item reachable`)
        await selection.getByRole('button', { name: 'Equip', exact: true }).tap()
        assert.equal((await record()).players[0].kennel.equipment[name], last)
        if (width === 320 && name === 'vest') {
          await scroller.evaluate(dialog => { dialog.scrollTop = dialog.scrollHeight })
          await screenshot('320-bottom')
        }
      }
      for (const [room, row] of [['journal', '.field-list dd'], ['career', '.career-rewards li']]) {
        await page.locator('#tab-' + room).tap()
        const last = page.locator('#lodge-panel ' + row).last()
        await last.scrollIntoViewIfNeeded()
        const visible = await last.evaluate(element => {
          const view = element.closest('.lodge-scroll').getBoundingClientRect()
          const box = element.getBoundingClientRect()
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
          return box.top >= view.top - 1 && box.bottom <= view.bottom + 1 && element.contains(hit)
        })
        assert.ok(visible, `${width}×${height} ${room} final row reachable`)
      }
      await close()
      assert.equal(await stage.locator('canvas').count(), 0)
      await open()
      await category('vest').tap()
      assert.equal(await card('legend-vest').getAttribute('aria-pressed'), 'true')
      await selection.getByRole('button', { name: 'Reset to Classic' }).tap()
      assert.equal((await record()).players[0].kennel.equipment.vest, 'no-vest')
      await card('canvas-vest').tap()
      await selection.getByRole('button', { name: 'Equip', exact: true }).tap()
      await close()
      console.log(JSON.stringify({ engine: engine.name(), size: [width, height], allCategories: true, journalAndCareer: true, resizeAndReopen: true }))
    }
    // Exercise a toolbar/keyboard-sized visual viewport with the editable profile open.
    await open()
    await page.locator('#active-nickname').tap()
    await page.locator('#nickname').focus()
    await page.setViewportSize({ width: 390, height: 463 })
    await page.waitForFunction(() => document.querySelector('#lodge').getBoundingClientRect().bottom <= innerHeight)
    await page.locator('#nickname').scrollIntoViewIfNeeded()
    const input = await page.locator('#nickname').boundingBox()
    assert.ok(input.y >= 0 && input.y + input.height <= 463)
    await close()
    await page.setViewportSize({ width: 390, height: 844 })

    await page.locator('#settings').tap()
    const quality = page.locator('#quality')
    await quality.selectOption({ label: 'Balanced' })
    await quality.selectOption({ label: 'Battery Saver' })
    await page.locator('#close-settings').tap()
    await page.reload()
    await ready()
    const saved = (await record()).players[0]
    assert.equal(saved.kennel.equipment.vest, 'canvas-vest')
    assert.equal(saved.profile.quality, 'low')
    await page.locator('#primary').tap()
    await page.waitForFunction(() => ['running', 'over'].includes(document.querySelector('#game').dataset.mode))
    assert.deepEqual([...errors], [])
  }
} finally {
  await browser.close()
  server.close()
}
