import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { distanceAtTime, speedAtTime } from '../src/difficulty.js'
import { regionAtDistance } from '../src/expedition.js'
import { rocks } from '../src/rocks.js'
import { createCourse } from '../src/runner.js'
import { signDistance } from '../src/sign-placement.js'

const args = process.argv.slice(2)
const engine = args.includes('webkit') ? webkit : chromium
const base = '/Retriever-Run/'
const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.mp3': 'audio/mpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary' }
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const file = resolve(root, path.slice(base.length) || 'index.html')
  if (!path.startsWith(base) || !file.startsWith(root + sep)) return response.writeHead(404).end()
  try {
    const data = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(data)
  } catch { response.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
await mkdir(output, { recursive: true })
const url = 'http://127.0.0.1:' + server.address().port + base

const rockTerritory = [0, 1, 2, 5, 3, 6, 7, 6, 8, 9, 4, 9]
function rockCase(variant, move) {
  const territory = rockTerritory[variant]
  for (let trial = 0; trial < 380; trial++) {
    const seed = (Math.imul(trial + 1, 19069) + variant * 137) >>> 0
    const next = createCourse(seed)
    let previous
    for (let row = next(); row.time < territory * 30 + 29.8; row = next()) {
      const placement = move ? 0 : variant % 2 === 0 ? -1 : 1
      const item = row.entities.find(entity => entity.type === 'rock' && entity.variant === variant && entity.lane === placement)
      const lead = move ? Math.max(10, speedAtTime(row.time) * (move === 'repeat' ? .79 : .64)) : 7.2
      if (item && row.time > 30 * territory + 2.1 &&
          (previous?.end ?? previous?.at ?? 0) < row.at - lead - 3.3) {
        return { label: 'rock-' + variant + (move ? '-' + move : ''), seed, start: row.at - lead,
          stop: move ? row.at + 2.45 : row.at - 6.5, target: row.at, variant, move, lane: row.lane,
          territory, portrait: variant % 3 !== 0, quality: ['balanced', 'high', 'low'][variant % 3] }
      }
      previous = row
    }
  }
  throw new Error('Could not find a real row for ' + rocks[variant].name + ' / ' + move)
}

function signCase(ordinal, pass = false) {
  const target = signDistance(ordinal)
  // The capture starts with room to reach the board's sightline.
  for (let index = 0; index < 160; index++) {
    const seed = (ordinal + 1) * 2431 + index * 383
    const next = createCourse(seed)
    let safe = true
    for (let row = next(); row.at < target + (pass ? 6 : 0); row = next()) {
      if ((row.end ?? row.at) > target - 17 &&
          row.entities.some(item => item.hazard && (item.wide || item.lane === 0))) safe = false
    }
    if (safe) return { label: 'notice-' + ordinal + (pass ? '-pass' : ''), seed, ordinal, target, start: target - 14.3,
      stop: target + (pass ? 3 : -13.6), pass, territory: regionAtDistance(target).index, portrait: ordinal % 3 === 1,
      quality: ['high', 'balanced', 'low'][ordinal % 3] }
  }
  throw new Error('No clear sign approach for notice ' + ordinal)
}

const variants = engine === chromium ? [0, 2, 4, 6, 8, 10] : [1, 3, 5, 7, 9, 11]
const notices = engine === chromium ? [0, 5, 11] : [1, 6, 12]
const controls = args.includes('controls')
const cases = controls ?
  (engine === chromium ? [rockCase(0, 'jump'), rockCase(4, 'slide'), rockCase(9, 'repeat'), rockCase(9, 'dodge'), signCase(0, true)] :
    [rockCase(1, 'jump'), rockCase(7, 'repeat'), rockCase(7, 'dodge')]) :
  [...variants.map(variant => rockCase(variant)), ...notices.map(ordinal => signCase(ordinal))]
const selected = cases.filter(fixture => args.includes(fixture.label))
const browser = await engine.launch(engine === chromium ? {
  executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
} : {})
try {
  const context = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: controls ? .48 : .95,
    serviceWorkers: 'block' })
  await context.route('**/*', route => route.request().url().startsWith(url) ||
    route.request().url().startsWith('blob:') ? route.continue() : route.abort())
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() !== 'error') return
    errors.push(message.text())
    console.error(message.text())
  })
  await page.addInitScript(() => {
    const config = JSON.parse(new URLSearchParams(location.search).get('case'))
    const probe = window.rockProbe = { skin: false, moved: 0 }
    const webgl = WebGL2RenderingContext.prototype
    const shader = webgl.shaderSource
    webgl.shaderSource = function (program, source) {
      if (source.includes('#define USE_SKINNING')) probe.skin = true
      return shader.call(this, program, source)
    }
    const native = requestAnimationFrame.bind(window)
    let virtual, prior
    window.requestAnimationFrame = callback => native(time => {
      const run = window.retrieverDebug
      if (virtual === undefined) virtual = time
      else if (run?.mode !== 'running') virtual += Math.min(65, time - prior)
      else if (run.distance < config.stop || (config.ordinal !== undefined && !config.pass &&
        !run.signs?.some(sign => sign.ordinal === config.ordinal))) {
        if (config.move) {
          const offset = config.target - run.distance
          let key
          if (config.move === 'repeat') key = 'ArrowUp'
          else if (!probe.moved && config.move === 'dodge' && offset < run.speed * .53) {
            key = config.lane === -1 ? 'ArrowLeft' : 'ArrowRight'
          } else if (!probe.moved && offset < run.speed * .46) {
            key = config.move === 'jump' ? 'ArrowUp' : config.move === 'slide' ? 'ArrowDown' : undefined
          }
          if (key) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
            probe.moved++
          }
        }
        virtual += config.move || config.pass ? 50 : 16.667
      }
      prior = time
      callback(virtual)
    })
  })

  const results = []
  for (const fixture of selected.length ? selected : cases) {
    await page.setViewportSize(fixture.portrait ? { width: 412, height: 862 } : { width: 900, height: 540 })
    const params = new URLSearchParams({ debug: 'collision', volumes: 'off', scenery: 'on',
      seed: fixture.seed, at: fixture.start, case: JSON.stringify(fixture) })
    await page.goto(url + '?' + params)
    await page.waitForFunction(() => window.retrieverDebug?.tiles >= 2 && window.rockProbe.skin &&
      !document.querySelector('#primary').disabled, null, { timeout: 80_000 })
    await page.addStyleTag({ content: '#collision-debug, #patch-toast { display:none }' })
    await page.locator('#settings').tap()
    await page.locator('#quality').selectOption(fixture.quality)
    await page.locator('#masterVolume').fill('0')
    await page.locator('#close-settings').tap()
    await page.locator('#primary').tap()
    await page.waitForFunction(({ stop, ordinal, pass }) => {
      const run = window.retrieverDebug
      return run.mode === 'over' || (run.mode === 'running' && run.ticks > 0 && run.distance >= stop &&
        (ordinal === undefined || pass || run.signs.some(sign => sign.ordinal === ordinal)))
    }, fixture, { timeout: 150_000, polling: 120 }).catch(async error => {
      console.error(await page.evaluate(() => ({ run: retrieverDebug, inputs: rockProbe.moved, hidden: document.hidden })))
      throw error
    })
    const frame = await page.evaluate(() => ({
      ...retrieverDebug, moved: rockProbe.moved, habitat: document.querySelector('#habitat').textContent,
      weather: document.querySelector('#weather').textContent, quality: document.querySelector('#quality').value,
    }))
    assert.deepEqual(errors, [])
    assert.equal(frame.inLaneSigns, false)
    assert.equal(frame.quality, fixture.quality)
    assert.equal(frame.habitat, regionAtDistance(fixture.target).name)
    assert.ok(frame.ticks > 0)
    const hit = fixture.move === 'repeat' || fixture.move === 'slide'
    assert.equal(frame.mode, hit ? 'over' : 'running', JSON.stringify(frame.contact))
    if (fixture.move) {
      assert.ok(frame.moved > (fixture.move === 'repeat' ? 4 : 0))
      if (hit) {
        assert.equal(frame.contact.type, 'rock')
        assert.ok(Math.abs(frame.contact.obstacleDistance - fixture.target) < .02)
      } else if (fixture.move === 'dodge') assert.equal(frame.lane, fixture.lane)
    }
    const rock = frame.rocks.find(item => item.variant === fixture.variant && Math.abs(item.distance - fixture.target) < .02)
    const sign = frame.signs.find(item => item.ordinal === fixture.ordinal)
    if (!fixture.move && !fixture.pass) assert.ok(rock || sign, JSON.stringify({ fixture, rocks: frame.rocks, signs: frame.signs }))
    if (sign) assert.ok(Math.abs(sign.width) > 4.7)
    if (rock) assert.ok(!fixture.move || rock.lane === 0)
    const shot = await page.screenshot({ path: resolve(output, fixture.label + '.png'), scale: 'css', timeout: 60_000 })
    const lettering = sign && !fixture.pass ? await inspectLettering(page, shot, sign.corners) : undefined
    results.push({ ...fixture, rock, sign, ticks: frame.ticks, distance: frame.distance, weather: frame.weather,
      habitat: frame.habitat, status: frame.mode, contact: frame.contact, inputs: frame.moved, lettering })
    await writeFile(resolve(output, 'captures.json'), JSON.stringify(results, null, 2))
    console.log(JSON.stringify(results.at(-1)))
  }
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
  server.close()
}

async function inspectLettering(page, image, corners) {
  const pixels = await page.evaluate(async ({ png, corners }) => {
    const picture = new Image()
    picture.src = 'data:image/png;base64,' + png
    await picture.decode()
    const canvas = document.createElement('canvas')
    canvas.width = picture.width
    canvas.height = picture.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(picture, 0, 0)
    const { width, height } = canvas
    const { data } = ctx.getImageData(0, 0, width, height)
    let cream = 0, dark = 0, samples = 0
    for (let j = 0; j < 28; j++) for (let i = 0; i < 56; i++) {
      const u = .09 + i / 55 * .82, v = .095 + j / 27 * .81
      const [x, y] = corners[0].map((a, axis) => (1 - v) * (a * (1 - u) + corners[1][axis] * u) +
        v * (corners[3][axis] * (1 - u) + corners[2][axis] * u))
      const sx = Math.floor(x * width), sy = Math.floor(y * height)
      if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue
      const index = (sy * width + sx) * 4
      const r = data[index], g = data[index + 1], b = data[index + 2]
      if (r > 182 && g > 166 && r > b + 10) cream++
      if (r < 136 && g < 118 && b < 106) dark++
      samples++
    }
    return { cream, dark, samples, width: Math.round(width * Math.abs(corners[1][0] - corners[0][0])) }
  }, { png: image.toString('base64'), corners })
  assert.ok(pixels.width > 30 && pixels.samples > 1000 && pixels.cream / pixels.samples > .045 &&
    pixels.dark / pixels.samples > .20, JSON.stringify(pixels))
  return pixels
}
