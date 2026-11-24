import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { expeditionRegions } from '../src/expedition.js'
import { createCourse } from '../src/runner.js'

const args = process.argv.slice(2)
const engine = args.includes('webkit') ? webkit : chromium
const baseline = args.includes('baseline')
const memory = args.includes('memory')
const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const directory = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output')
const base = '/Retriever-Run/'
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary' }
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const file = resolve(root, path.slice(base.length) || 'index.html')
  if (!path.startsWith(base) || !file.startsWith(root + sep)) return response.writeHead(404).end()
  try {
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file))
  } catch { response.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
await mkdir(directory, { recursive: true })
const url = 'http://127.0.0.1:' + server.address().port + base
const gulf = { label: 'gulf-377-wide', seed: 188, start: 376.82, stop: 377.01, quality: 'balanced',
  region: expeditionRegions[0], board: { distance: 386.37, lane: 0, wide: true }, portrait: true }
const narrow = { ...gulf, label: 'gulf-377-single', seed: 56, quality: 'high',
  board: { distance: 386.23, lane: 0, wide: false } }

function scenario(region, number, far = false, minTime = region.seconds + 8) {
  const wantsWide = (region.index + number) % 2 === 0
  const ahead = far ? 16 : 9.3
  const gap = far ? 21 : 14
  for (let trial = 0; trial < 220; trial++) {
    const seed = 527 + number * 1097 + region.index * 211 + trial * 67
    const next = createCourse(seed)
    let previous
    for (let row = next(); row.time < region.seconds + 25; row = next()) {
      if (row.time >= minTime && (previous?.end ?? previous?.at ?? 0) < row.at - gap) {
        const board = row.entities.find(entity => entity.type === 'branch' && entity.wide === wantsWide)
        if (board) return { label: region.key + '-' + number, region, seed, board,
          start: row.at - ahead - .6, stop: row.at - ahead,
          quality: ['balanced', 'high', 'low'][(region.index + number) % 3],
          portrait: region.index % 3 === number % 3 }
      }
      previous = row
    }
  }
  throw new Error('No real authored row for ' + region.name)
}

const browser = await engine.launch(engine === chromium ? {
  executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
} : {})

try {
  const context = await browser.newContext({
    ...devices['iPhone 13'], viewport: { width: 390, height: 844 },
    deviceScaleFactor: memory ? .34 : .89, serviceWorkers: 'block',
  })
  await context.route('**/*', route => route.request().url().startsWith(url) ||
    route.request().url().startsWith('blob:') ? route.continue() : route.abort())
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()) })

  async function approach(fixture) {
    const { quality, stop, seed, start, portrait } = fixture
    await page.setViewportSize(portrait ? { width: 390, height: 844 } : { width: 844, height: 480 })
    const params = new URLSearchParams({ debug: 'collision', volumes: 'off', signs: 'on',
      seed, at: start.toFixed(5), qaStop: stop })
    await page.goto(url + '?' + params)
    await page.waitForFunction(() => window.retrieverDebug?.tiles >= 2 &&
      !document.querySelector('#primary').disabled && window.signProbe.skin, null, { timeout: 70_000 })
    await page.addStyleTag({ content: '#collision-debug { display:none }' })
    await page.locator('#settings').tap()
    await page.locator('#quality').selectOption(memory ? 'low' : quality)
    await page.locator('#masterVolume').fill('0')
    await page.locator('#close-settings').tap()
    await page.locator('#primary').tap()
    if (!memory) await page.waitForFunction(() => window.retrieverDebug.mode === 'running' &&
      window.retrieverDebug.distance >= signProbe.stop && window.retrieverDebug.ticks > 0 && signProbe.painted,
    null, { timeout: 60_000, polling: 100 })
  }

  await page.addInitScript(({ memory }) => {
    const query = new URLSearchParams(location.search)
    if (!query.has('qaStop')) return
    const probe = window.signProbe = { stop: +query.get('qaStop'), painted: false, skin: false,
      created: 0, deleted: 0, losses: 0, samples: [], limit: 0 }
    const gl = WebGL2RenderingContext.prototype
    const shader = gl.shaderSource
    gl.shaderSource = function (program, source) {
      if (source.includes('#define USE_SKINNING')) probe.skin = true
      return shader.call(this, program, source)
    }
    const texture = gl.createTexture
    gl.createTexture = function () {
      probe.created++
      return texture.call(this)
    }
    const dispose = gl.deleteTexture
    gl.deleteTexture = function (value) {
      probe.deleted++
      return dispose.call(this, value)
    }
    const native = requestAnimationFrame.bind(window)
    let virtual, last
    let lastLoss
    window.requestAnimationFrame = callback => native(time => {
      const before = window.retrieverDebug
      if (virtual === undefined) virtual = time
      else if (before?.mode !== 'running') virtual += Math.min(65, time - last)
      else if (memory || before.distance < probe.stop) virtual += memory ? 218 : 16.667
      last = time
      callback(virtual)
      const run = window.retrieverDebug
      if (run?.mode === 'running' && run.distance >= probe.stop && run.ticks > 0) probe.painted = true
      if (memory && run?.mode === 'over' && document.querySelector('#run-again') &&
          probe.limit && probe.losses < probe.limit) {
        const report = document.querySelector('#field-report')
        if (lastLoss !== report.querySelector('#report-message').textContent || before?.mode === 'running') {
          lastLoss = report.querySelector('#report-message').textContent
          probe.losses++
          probe.samples.push({ ...run.signCache, textures: probe.created - probe.deleted, impact: run.contact?.type })
          if (probe.losses < probe.limit) document.querySelector('#run-again').click()
        }
      }
    })
  }, { memory })

  if (memory) {
    assert.equal(engine, chromium, 'heap sampling requires Chromium CDP')
    await approach({ ...gulf, start: 383.25 })
    const cdp = await context.newCDPSession(page)
    const until = limit => page.waitForFunction(n => signProbe.losses >= n, limit, { polling: 200, timeout: 260_000 })
    const heap = async () => {
      await cdp.send('HeapProfiler.collectGarbage')
      return (await cdp.send('Runtime.getHeapUsage')).usedSize
    }
    await page.evaluate(() => { signProbe.limit = 22 })
    await until(22)
    const warmHeap = await heap()
    console.log('Warmed sign texture pool over 22 completed runs')
    await page.evaluate(() => {
      signProbe.limit = 120
      document.querySelector('#run-again').click()
    })
    await until(120)
    const endHeap = await heap()
    const samples = await page.evaluate(() => signProbe.samples)
    const steady = samples.slice(21)
    const capacity = Math.max(...steady.map(sample => sample.capacity))
    assert.equal(capacity, steady[0].capacity)
    assert.ok(steady.every(sample => sample.textures <= steady[0].textures + 1))
    assert.ok(steady.every(sample => sample.active <= sample.capacity))
    assert.ok(samples.every(sample => sample.impact === 'branch'))
    assert.ok(endHeap - warmHeap < 1_500_000, 'post-GC heap grew beyond the test allowance')
    const result = { completedRuns: samples.length, capacity, warmHeap, endHeap,
      minTextures: Math.min(...steady.map(sample => sample.textures)),
      maxTextures: Math.max(...steady.map(sample => sample.textures)), paints: samples.at(-1).paints }
    console.log(JSON.stringify(result))
    await writeFile(resolve(directory, 'restart-measurements.json'), JSON.stringify(result, null, 2))
  } else {
    const number = engine === chromium ? 1 : 2
    const cases = baseline ? [gulf, narrow] : args.includes('distance') ?
      [{ ...scenario(expeditionRegions[1], number + 2, true, 48), weather: 'Overcast' },
        ...[2, 4, 7, 9].map(index => scenario(expeditionRegions[index], number + 2, true))] :
      [gulf, narrow, ...expeditionRegions.map(region => scenario(region, number))]
    const selected = cases.filter(fixture => args.includes(fixture.label))
    const results = []
    for (const fixture of selected.length ? selected : cases) {
      await approach(fixture)
      const frame = await page.evaluate(() => ({
        ...retrieverDebug, territory: document.querySelector('#habitat').textContent,
        weather: document.querySelector('#weather').textContent, quality: document.querySelector('#quality').value,
      }))
      assert.equal(frame.mode, 'running')
      assert.ok(frame.ticks > 0)
      assert.equal(frame.territory, fixture.region.name)
      assert.equal(frame.quality, fixture.quality)
      if (fixture.weather) assert.equal(frame.weather, fixture.weather)
      if (fixture.label.includes('377')) assert.equal(Math.floor(frame.distance), 377)
      const size = fixture.portrait ? 'portrait' : 'landscape'
      const path = resolve(directory, fixture.label + '.png')
      const picture = await page.screenshot({ path, scale: 'css', timeout: 60_000 })
      if (baseline) {
        results.push({ label: fixture.label, board: fixture.board, weather: frame.weather, distance: frame.distance, size })
      } else {
        assert.ok(frame.signs.length > 0 && frame.signs.every(sign => sign.face), JSON.stringify(frame.signs))
        const sign = frame.signs.find(item => item.lane === fixture.board.lane && item.wide === fixture.board.wide &&
          Math.abs(item.distance - fixture.board.distance) < .02)
        assert.ok(sign, JSON.stringify(frame.signs))
        assert.ok(sign.lines.join(' ') === sign.message && sign.lines.length <= 3 && sign.size >= 43)
        const pixels = await page.evaluate(async ({ image, corners }) => {
          const screenshot = new Image()
          screenshot.src = 'data:image/png;base64,' + image
          await screenshot.decode()
          const sample = document.createElement('canvas')
          sample.width = screenshot.width
          sample.height = screenshot.height
          const context = sample.getContext('2d', { willReadFrequently: true })
          context.drawImage(screenshot, 0, 0)
          const { data } = context.getImageData(0, 0, sample.width, sample.height)
          let cream = 0, dark = 0, total = 0
          for (let y = 0; y < 40; y++) for (let x = 0; x < 80; x++) {
            const u = .085 + x / 80 * .83
            const v = .085 + y / 40 * .83
            const position = corners[0].map((start, axis) => (1 - v) *
              (start * (1 - u) + corners[1][axis] * u) + v * (corners[3][axis] * (1 - u) + corners[2][axis] * u))
            const [px, py] = position.map((value, axis) => Math.floor(value * (axis ? sample.height : sample.width)))
            if (px < 0 || py < 0 || px >= sample.width || py >= sample.height) continue
            const i = (py * sample.width + px) * 4
            const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
            if (r > 187 && g > 165 && r > b + 10) cream++
            if (r < 145 && g < 124 && b < 111) dark++
            total++
          }
          return { cream, dark, total, width: Math.round(sample.width * Math.abs(corners[1][0] - corners[0][0])) }
        }, { image: picture.toString('base64'), corners: sign.corners })
        assert.ok(pixels.width > 38 && pixels.cream / pixels.total > .045 && pixels.dark / pixels.total > .28,
          JSON.stringify({ message: sign.message, pixels, sign }))
        results.push({ label: fixture.label, seed: fixture.seed, territory: frame.territory, weather: frame.weather,
          quality: frame.quality, distance: frame.distance, ticks: frame.ticks, size, sign, pixels,
          loadedFaces: frame.signs.length })
      }
      await writeFile(resolve(directory, 'captures.json'), JSON.stringify(results, null, 2))
      console.log(JSON.stringify(results.at(-1)))
    }
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
  server.close()
}
