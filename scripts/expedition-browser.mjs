import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'

const engine = process.argv.includes('webkit') ? webkit : chromium
const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output')
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp',
  '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' }
const scenes = [
  ['timber', 0, 24], ['prairie', 254, 262], ['blind', 278, 289], ['river', 589, 597], ['snow', 970, 980],
  ['snow-transition', 888, 920],
]

const server = createServer(async (request, response) => {
  const prefix = '/Retriever-Run/'
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
  const frames = {}
  const quality = process.argv.includes('low') ? 'low' : 'balanced'
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 },
    deviceScaleFactor: .75, serviceWorkers: 'block' })
  for (const [region, at, stop] of scenes.filter(([name]) => !process.argv.includes('quick') || ['snow', 'snow-transition'].includes(name))) {
    const page = await context.newPage()
    if (region === 'blind') await page.setViewportSize({ width: 844, height: 480 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.addInitScript(({ stop, quality, at }) => {
      localStorage.setItem('retriever-run.record', JSON.stringify({ quality, masterVolume: 0 }))
      localStorage.removeItem('retriever-run.record.practice')
      const world = window.expeditionEvidence = { frames: [], ready: 0, skin: false }
      let draws = 0, triangles = 0, bytes = 0, uploaded = 0
      const bindings = new Map()
      const allocations = new Map()
      const gl = WebGL2RenderingContext.prototype
      function wrap(name, observe) {
        const original = gl[name]
        gl[name] = function (...args) {
          observe.apply(this, args)
          return original.apply(this, args)
        }
      }
      wrap('shaderSource', (_, text) => { if (text.includes('#define USE_SKINNING')) world.skin = true })
      wrap('bindBuffer', (target, buffer) => bindings.set(target, buffer))
      wrap('bufferData', (target, data, usage, offset, length) => {
        const bound = bindings.get(target)
        if (!bound) return
        const size = typeof data === 'number' ? data : length ? length * data.BYTES_PER_ELEMENT : data?.byteLength ?? 0
        bytes += size - (allocations.get(bound) ?? 0)
        allocations.set(bound, size)
        uploaded += size
      })
      wrap('deleteBuffer', buffer => {
        bytes -= allocations.get(buffer) ?? 0
        allocations.delete(buffer)
      })
      const drawing = (mode, count, instances = 1) => {
        draws++
        if (mode === 4) triangles += count * instances / 3
        else if (mode === 5 || mode === 6) triangles += Math.max(0, count - 2) * instances
      }
      wrap('drawElements', (mode, count) => drawing(mode, count))
      wrap('drawArrays', (mode, first, count) => drawing(mode, count))
      wrap('drawElementsInstanced', (mode, count, type, offset, instances) => drawing(mode, count, instances))
      wrap('drawArraysInstanced', (mode, first, count, instances) => drawing(mode, count, instances))
      const native = window.requestAnimationFrame
      let previous, virtual, move = false
      window.requestAnimationFrame = callback => native(timestamp => {
        const debug = window.retrieverDebug
        const wall = previous === undefined ? 0 : timestamp - previous
        if (at === 888 && !move && debug?.mode === 'running' && debug.distance >= 894) {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
          move = true
        }
        if (virtual === undefined) virtual = timestamp
        else if (debug?.mode !== 'running' || debug.distance < stop) virtual += debug?.mode === 'running' ? 62 : Math.min(wall, 76)
        previous = timestamp
        draws = triangles = uploaded = 0
        const start = performance.now()
        callback(virtual)
        if (!world.ready && world.skin && draws && document.querySelector('#primary')?.disabled === false) world.ready = performance.now()
        if (draws && debug?.mode === 'running' && world.frames.length < 800) world.frames.push({
          distance: debug.distance, draws, triangles, bytes, uploaded, wall, main: performance.now() - start,
          region: document.querySelector('#habitat')?.textContent,
        })
      })
    }, { stop, quality, at })
    const url = 'http://127.0.0.1:' + server.address().port + '/Retriever-Run/?debug=collision&seed=7&volumes=off&at=' + at
    await page.goto(url)
    await page.waitForFunction(() => expeditionEvidence.ready && window.retrieverDebug, null, { timeout: 65_000 })
    await page.addStyleTag({ content: '#collision-debug { display: none }' })
    await page.locator('#primary').tap()
    await page.waitForFunction(stop => retrieverDebug.distance >= stop || retrieverDebug.mode === 'over', stop,
      { timeout: 125_000, polling: 175 })
    assert.equal(await page.locator('#game').getAttribute('data-mode'), 'running',
      JSON.stringify(await page.evaluate(() => retrieverDebug)))
    await page.screenshot({ path: resolve(output, quality + '-' + region + '.png'), scale: 'css' })
    frames[region] = await page.evaluate((at) => ({
      ready: expeditionEvidence.ready, at, last: retrieverDebug.distance,
      viewport: [innerWidth, innerHeight],
      samples: expeditionEvidence.frames.filter(sample => sample.distance >= at + .5),
      assets: performance.getEntriesByType('resource').filter(entry => /\.(webp|glb)$/.test(entry.name))
        .map(({ encodedBodySize }) => encodedBodySize),
    }), at)
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ region, quality, ready: Math.round(frames[region].ready),
      frames: frames[region].samples.length, last: frames[region].last }))
    await page.close()
  }
  await writeFile(resolve(output, quality + '-measurements.json'), JSON.stringify(frames, null, 2))
} finally {
  await browser.close()
  server.close()
}
