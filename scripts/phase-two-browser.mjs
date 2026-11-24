import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { signDistance } from '../src/sign-placement.js'
import { createCourse, speedAtTime } from '../src/runner.js'

const args = process.argv.slice(2)
const engine = args.includes('webkit') ? webkit : chromium
const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/phase-two')
const prefix = '/Retriever-Run/'
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary', '.png': 'image/png', '.webp': 'image/webp' }
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const file = resolve(root, path.slice(prefix.length) || 'index.html')
  if (!path.startsWith(prefix) || !file.startsWith(root + sep)) return response.writeHead(404).end()
  try {
    response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file))
  } catch { response.writeHead(404).end() }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
await mkdir(output, { recursive: true })
const origin = 'http://127.0.0.1:' + server.address().port
const browser = await engine.launch(engine === chromium ? {
  executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
} : {})
const next = createCourse(7)
const rows = []
for (let row = next(); row.time < 330; row = next()) rows.push(row)
const first = predicate => rows.find(predicate)
const typeIn = type => row => row.entities.some(item => item.type === type)
const tree = first(typeIn('leaning-tree'))
const results = []

try {
  const context = await browser.newContext({ ...devices['iPhone 13'],
    viewport: args.includes('small') ? { width: 320, height: 568 } : { width: 390, height: 844 }, deviceScaleFactor: 1 })
  await context.route(/.*/, route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
  await context.addInitScript(() => {
    let previous
    const native = window.requestAnimationFrame.bind(window)
    const qa = window.playback = { limit: -1, advance: 35 }
    window.requestAnimationFrame = callback => native(time => {
      const debug = window.retrieverDebug
      if (previous === undefined) previous = time
      if (debug?.mode !== 'running' || debug.distance < qa.limit) previous += qa.advance
      callback(previous)
    })
  })
  const page = await context.newPage()
  const errors = []
  const cdp = engine === chromium ? await context.newCDPSession(page) : null

  async function swipe(direction) {
    const motions = { left: [-67, 0], right: [67, 0], jump: [0, -83], slide: [0, 83] }
    const keys = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', slide: 'ArrowDown' }
    if (!cdp) return page.keyboard.press(keys[direction])
    const [dx, dy] = motions[direction]
    const { width, height } = page.viewportSize()
    const x = Math.round(width / 2)
    const y = Math.round(height * .56)
    const send = (type, touchPoints) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints })
    await send('touchStart', [{ x, y }])
    await send('touchMove', [{ x: x + dx, y: y + dy }])
    await send('touchEnd', [])
  }
  page.on('pageerror', error => errors.push(error.message))
  let startedAt
  async function launch(distance, volumes = false, quality = 'balanced') {
    await page.addInitScript(({ quality }) => {
      localStorage.setItem('retriever-run.record.practice', JSON.stringify({ quality, masterVolume: 0 }))
    }, { quality })
    await page.goto(origin + prefix + '?debug=collision&scenery=on&seed=7&perf=1&at=' +
      distance + '&volumes=' + (volumes ? 'on' : 'off'))
    if (await page.locator('#content-screen').isVisible()) {
      await page.locator('#content-online').click()
    }
    await page.waitForFunction(() => !document.querySelector('#game').hidden && !document.querySelector('#primary').disabled)
    if (!volumes) await page.addStyleTag({ content: '#collision-debug, #game[data-practice] .practice-status { display: none }' })
    await page.locator('#primary').tap()
    await page.waitForFunction(() => window.retrieverDebug?.mode === 'running')
    startedAt = await page.evaluate(() => window.retrieverDebug.distance)
  }

  async function advanceTo(distance) {
    await page.evaluate(distance => { window.playback.limit = distance }, distance)
    await page.waitForFunction(distance => {
      const game = window.retrieverDebug
      return game?.mode === 'over' || game?.distance >= distance
    }, distance, { timeout: 40_000 })
    return page.evaluate(() => window.retrieverDebug)
  }

  async function snapshot(name) {
    await page.screenshot({ path: resolve(output, name + '.png'), scale: 'css' })
    results.push(await page.evaluate(name =>
      ({ name, ...window.retrieverDebug, performance: window.retrieverPerformance() }), name))
  }

  if (args.includes('restarts')) {
    await launch(0)
    for (let i = 0; i < 8; i++) {
      await page.evaluate(() => { window.playback.advance = 125 })
      assert.equal((await advanceTo(85)).mode, 'over')
      await page.evaluate(() => { window.playback.limit = -1 })
      await page.locator('#run-again').tap()
      await page.waitForFunction(() => window.retrieverDebug?.mode === 'running')
      const state = await advanceTo(12)
      assert.equal(state.mode, 'running')
      results.push(await page.evaluate(i => ({ name: 'restart-' + (i + 1), performance: window.retrieverPerformance() }), i))
    }
  }

  if (!args.includes('scenery') && !args.includes('restarts') && !args.includes('notice') && !args.includes('weather')) {
    const cases = [
      ['approach', 0, null], ['left-jump', -1, 'jump'], ['middle-slide', 0, 'slide'],
      ['right-run', 1, null], ['mistimed', 0, null], ['bounds', 0, 'slide'],
    ]
    for (const [name, lane, action] of cases) {
      await launch(tree.at - 13, name === 'bounds' || name === 'mistimed', args.includes('low') ? 'low' : 'balanced')
      assert.ok(Math.abs(startedAt - (tree.at - 13)) < .4)
      if (lane) await swipe(lane === -1 ? 'left' : 'right')
      const isApproach = name === 'approach'
      if (action) {
        await advanceTo(tree.at - speedAtTime(tree.time) * (lane === -1 ? .455 : .43))
        await swipe(action)
      }
      const resultAtTree = await advanceTo(tree.at - (isApproach ? 8 : .05))
      if (name === 'left-jump') assert.ok(resultAtTree.jump > .25)
      if (name === 'middle-slide') assert.ok(resultAtTree.slide > .25)
      if (name === 'right-run') assert.ok(!resultAtTree.slide && !resultAtTree.jump)
      await snapshot(name)
      if (isApproach) continue
      const result = await advanceTo(tree.at + 3)
      if (name === 'mistimed') {
        assert.equal(result.mode, 'over')
        assert.equal(result.contact?.type, 'leaning-tree')
        assert.equal(result.contact?.pattern, 'forked-timber')
        assert.equal(result.contact?.lane, 0)
        await snapshot('confirmed-impact')
      } else {
        assert.equal(result.mode, 'running', JSON.stringify(result.contact))
        assert.equal(result.lane, lane)
      }
    }
  }

  if (!args.includes('tree') && !args.includes('restarts')) {
    const scenery = [['ground-log', typeIn('log')], ['root-plate', typeIn('fallen')],
      ['farm-tractor', typeIn('tractor')], ['small-rock', row => row.entities.some(it => it.type === 'rock' && it.variant < 4)],
      ['large-rock', row => row.entities.some(it => it.type === 'rock' && [7, 8, 9, 10, 11].includes(it.variant))],
      ['risk-retrieve', row => row.pattern?.endsWith('retrieve-choice')],
      ['late-compound', row => row.time > 280 && row.pattern?.endsWith('and-slide-followup')]]
    const conditions = [
      ['overcast', 47, 66], ['fog', 81, 100], ['rain', 147, 166], ['snow', 219, 236],
    ].map(([name, start, stop]) => [name, row => row.time >= start && row.time < stop && typeIn('log')(row)])
    const selected = args.includes('notice') ? [] : args.includes('weather') ? conditions : scenery
    for (const [name, match] of selected) {
      const target = first(match)
      if (!target) continue
      await launch(target.at - 8, false, args.includes('weather') ? 'high' : 'balanced')
      const result = await advanceTo(target.at - 5)
      assert.equal(result.mode, 'running', JSON.stringify(result.contact))
      // A diagnostic seek changes the entire tile window in one step. Let
      // the actual streamed ground arrive before recording the scenery.
      await page.waitForFunction(() => window.retrieverDebug?.tiles === 7, null, { timeout: 25_000 })
      await page.waitForTimeout(450)
      await snapshot(name)
    }
    if (!args.includes('weather')) {
      const notice = signDistance(0)
      await launch(notice - 26)
      assert.equal((await advanceTo(notice - 18)).mode, 'running')
      await page.waitForFunction(() => window.retrieverDebug?.tiles === 7 && window.retrieverDebug.signs.length)
      const current = await page.evaluate(() => window.retrieverDebug)
      assert.equal(current.inLaneSigns, false)
      assert.ok(current.signs[0].corners.every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1))
      await snapshot('trail-notice')
    }
  }
  assert.deepEqual(errors, [])
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ engine: engine.name(), results }, null, 2) + '\n')
  console.log(JSON.stringify({ engine: engine.name(), input: cdp ? 'chromium-touch' : 'keyboard', scenes: results.map(row => row.name), errors }))
} finally {
  await browser.close()
  await new Promise(done => server.close(done))
}
