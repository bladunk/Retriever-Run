import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'

const safari = process.argv.includes('webkit')
const engine = safari ? webkit : chromium
const repeat = process.argv.includes('repeat')
const failure = process.argv.includes('failure')
const phone = process.argv.includes('phone')
const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' }
const prefix = '/Retriever-Run/'
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const file = resolve(root, path.slice(prefix.length) || 'index.html')
  if (!path.startsWith(prefix) || !file.startsWith(root + sep)) return response.writeHead(404).end()
  try {
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file))
  } catch { response.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
await mkdir(output, { recursive: true })
const address = 'http://127.0.0.1:' + server.address().port + prefix
const browser = await engine.launch(safari ? {} : {
  executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})

try {
  const dimensions = repeat || failure ? [[390, 844]] : phone ? [[320, 568]] : [[320, 568], [375, 667], [430, 932], [844, 390], [1366, 768]]
  for (const [width, height] of dimensions) {
    const mobile = width < 1000
    const context = await browser.newContext({
      ...(mobile ? devices['iPhone 13'] : devices['Desktop Chrome']),
      viewport: { width, height }, deviceScaleFactor: .62,
      serviceWorkers: failure ? 'allow' : 'block',
    })
    const page = await context.newPage()
    const issues = []
    const external = []
    let workers = 0
    page.on('pageerror', error => issues.push(error.message))
    page.on('request', req => {
      if (req.url().includes('terrain-worker-')) workers++
      if (!req.url().startsWith(address) && !req.url().startsWith('blob:') && !req.url().startsWith('data:')) external.push(req.url())
    })
    if (failure) await page.route('**/terrain-worker-*.js', route => route.abort())
    await page.addInitScript(({ failure, guest }) => {
      if (!sessionStorage.masterSet) {
        sessionStorage.masterSet = '1'
        if (failure) {
          localStorage.setItem('retriever-run.record', '{invalid')
          localStorage.setItem('retriever-run.heckles', '[1,{}, "unknown"]')
        } else if (guest) {
          localStorage.setItem('retriever-run.record', JSON.stringify({ version: 3, active: 1, players: [
            { id: 1, nickname: 'Creek Scout', enrollment: 'guest', profile: { quality: 'low', masterVolume: 0 } },
          ] }))
        }
      }
      window.huntQA = { frames: 0, contexts: 0 }
      const audio = window.AudioContext ?? window.webkitAudioContext
      if (audio) {
        const wrapped = new Proxy(audio, {
          construct(target, args) {
            huntQA.contexts++
            return new target(...args)
          },
        })
        if (window.AudioContext) window.AudioContext = wrapped
        else window.webkitAudioContext = wrapped
      }
      const native = requestAnimationFrame
      let virtual, last
      window.requestAnimationFrame = callback => native(time => {
        if (virtual === undefined) virtual = time
        else virtual += document.querySelector('#game')?.dataset.mode === 'running' ? 218 : Math.min(80, time - last)
        last = time
        huntQA.frames++
        callback(virtual)
      })
    }, { failure, guest: width !== 320 })
    await page.goto(address)
    const game = page.locator('#game')
    const report = page.locator('#field-report')
    const play = page.locator('#run-again')
    const title = report.getByRole('heading', { name: 'HUNT OVER', exact: true })
    const scroll = page.locator('#report-scroll')
    const ready = () => page.waitForFunction(() => !document.querySelector('#primary').disabled, null, { timeout: 90000 })
    const press = locator => mobile ? locator.tap() : locator.click()
    await ready()
    if (width === 320 || failure) {
      const name = page.locator('#camp-name')
      await name.fill('Creek Scout')
      await press(page.locator('#camp-guest'))
      const go = page.locator('#camp-run')
      if (await go.isVisible()) await press(go)
    }
    if (await game.getAttribute('data-mode') === 'title') await press(page.locator('#primary'))

    const numberOfRuns = repeat ? 14 : 2
    const heard = new Set()
    for (let run = 0; run < numberOfRuns; run++) {
      await title.waitFor({ timeout: 90000 })
      assert.equal(await game.getAttribute('data-mode'), 'over')
      assert.equal(await game.getAttribute('inert'), '')
      assert.match(await report.locator('#report-headline').textContent(), /Score.*Distance.*Personal best/)
      assert.match(await report.locator('#report-career').textContent(), /Career XP/)
      assert.match(await report.locator('#report-next-honor').textContent(), /Next Field Honor/)
      assert.match(await report.locator('#report-tallies').textContent(), /Difficulty reachedStage 1 · Rookie/)
      const line = await report.locator('#report-message').textContent()
      assert.ok(line.length >= 16 && !heard.has(line))
      heard.add(line)
      const actions = await report.evaluate(element => {
        return [...element.querySelectorAll('.report-actions button')].every(button => {
          const rectangle = button.getBoundingClientRect()
          return rectangle.bottom <= innerHeight + 1 && rectangle.top >= 0 && rectangle.height >= 42
            && button.contains(document.elementFromPoint(rectangle.x + rectangle.width / 2, rectangle.y + rectangle.height / 2))
        })
      })
      assert.ok(actions, width + '×' + height + ' report actions are on screen')
      if (run === 0) {
        await page.screenshot({ path: resolve(output, engine.name() + '-' + width + 'x' + height + '.png'), scale: 'css', timeout: 90000 })
        await scroll.evaluate(element => { element.scrollTop = element.scrollHeight })
        const end = await report.locator('#report-highlights').evaluate(element => element.getBoundingClientRect().bottom)
        const viewport = await scroll.evaluate(element => element.getBoundingClientRect().bottom)
        assert.ok(end <= viewport + 1)
        await press(page.locator('#report-lodge'))
        await page.locator('#lodge').waitFor()
        await press(page.locator('#tab-trophies'))
        assert.match(await page.locator('#lodge-panel').textContent(), /Field Honors/)
        await press(page.locator('#tab-kennel'))
        await page.locator('.kennel-stage canvas').waitFor()
        await press(page.locator('#tab-board'))
        await page.locator('.camp-board').waitFor()
        await press(page.locator('#close-lodge'))
      }
      if (run + 1 < numberOfRuns) {
        await press(play)
        await page.waitForFunction(() => document.querySelector('#game').dataset.mode === 'running')
        assert.equal(await report.isVisible(), false)
      }
    }
    const before = await page.evaluate(() => ({
      save: JSON.parse(localStorage.getItem('retriever-run.record')),
      history: JSON.parse(localStorage.getItem('retriever-run.heckles')),
      contexts: huntQA.contexts,
    }))
    assert.equal(before.save.players[0].stats.runs, numberOfRuns)
    assert.equal(before.history.length, numberOfRuns)
    assert.equal(new Set(before.history).size, numberOfRuns)
    assert.ok(before.contexts <= 1)
    assert.deepEqual(issues, [])
    assert.deepEqual(external, [])
    if (failure) {
      assert.ok(workers > 0)
      await page.waitForFunction(() => navigator.serviceWorker.controller, null, { timeout: 60000 })
      await context.setOffline(true)
      await page.reload()
      await ready()
      assert.equal(await game.getAttribute('data-mode'), 'title')
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('retriever-run.record')).players[0].stats.runs), 2)
      await press(page.locator('#primary'))
      await title.waitFor({ timeout: 90000 })
      assert.ok(!heard.has(await report.locator('#report-message').textContent()))
    }
    console.log(JSON.stringify({ engine: engine.name(), width, height, runs: numberOfRuns, audioContexts: before.contexts,
      failureRecovery: failure, rosterAndKennel: true }))
    await context.close()
  }
} finally {
  await browser.close()
  server.close()
}
