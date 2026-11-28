import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices } from 'playwright'
import { createLegacyPreview } from '../src/legacy-preview.js'
import { saveKey } from '../src/lodge-save.js'

const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/masterpiece')
const roots = {
  before: resolve(process.env.FIELD_BASELINE ?? 'baseline'),
  after: resolve(process.env.FIELD_BUILD ?? 'dist'),
  studio: resolve(process.env.FIELD_STUDIO ?? 'dist-studio'),
}
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.mp3':'audio/mpeg', '.webmanifest':'application/manifest+json', '.woff2':'font/woff2',
  '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg', '.glb':'model/gltf-binary' }
const server = createServer(async (request,response) => {
  const [version, game, ...parts] = new URL(request.url, 'http://localhost').pathname.split('/').slice(1)
  const root = roots[version]
  if (!root || game !== 'Retriever-Run') return response.writeHead(404).end()
  const file = resolve(root,parts.join('/') || 'index.html')
  if (!file.startsWith(root+sep)) return response.writeHead(404).end()
  const data = await readFile(file).catch(() => null)
  if (!data) return response.writeHead(404).end()
  response.writeHead(200,{ 'Content-Type':mime[extname(file)] ?? 'application/octet-stream' }).end(data)
})
await new Promise(done => server.listen(0,'127.0.0.1',done))
await mkdir(output,{ recursive:true })
const origin = 'http://127.0.0.1:' + server.address().port
const browser = await chromium.launch({ executablePath: process.env.FIELD_CHROMIUM,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] })
const results = []
const modern = process.argv.includes('large')
async function review(version, callback) {
  const viewport = modern ? {width:430,height:932} : {width:320,height:568}
  const options = { ...devices['iPhone 13'], viewport, deviceScaleFactor: 1 }
  if (version !== 'before' && process.argv.includes('video')) options.recordVideo = { dir:output, size:viewport }
  const context = await browser.newContext(options)
  const page = await context.newPage()
  page.setDefaultTimeout(50000)
  const errors = []
  page.on('pageerror',error => errors.push(error.message))
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
  const url = origin+'/'+version+'/Retriever-Run/'
  const shot = async name => {
    await page.evaluate(async () => { await document.fonts.ready })
    await page.screenshot({ path:resolve(output,version+'-'+name+'.jpg'), quality:84,scale:'css' })
    const layout = await page.evaluate(() => ({
      width:innerWidth, documentWidth:document.documentElement.scrollWidth,
      lodgeWidth:document.querySelector('#lodge[open] .lodge-scroll')?.scrollWidth,
      lodgeClient:document.querySelector('#lodge[open] .lodge-scroll')?.clientWidth,
    }))
    assert.equal(layout.width,layout.documentWidth)
    if (layout.lodgeClient) assert.ok(layout.lodgeWidth <= layout.lodgeClient + 1,JSON.stringify(layout))
    results.push({version,name,layout})
  }
  try {
    await callback({page,url,shot,context})
    assert.deepEqual(errors,[])
  } finally {
    await context.close()
  }
}
async function startFixture(page, url, distance) {
  await page.goto(url+'?perf=1&debug=collision&volumes=off&scenery=on&seed=7&at='+distance+'&qaview=low&course=raptor')
  const online = page.locator('#content-online')
  await online.or(page.locator('#primary')).first().waitFor({state:'attached'})
  if (await online.isVisible()) await online.click()
  await page.waitForFunction(() => !document.querySelector('#primary').disabled)
}

function watchAudio(page) {
  return page.addInitScript(() => {
    const connect = AudioNode.prototype.connect
    AudioNode.prototype.connect = function(target,...args) {
      const output = connect.call(this,target,...args)
      if (target === this.context.destination && !window.fieldAudioCapture) {
        const stream = this.context.createMediaStreamDestination()
        connect.call(this,stream)
        window.fieldAudioCapture = stream.stream
      }
      return output
    }
  })
}

function recordAudio(page, milliseconds) {
  return page.evaluate(async milliseconds => {
    const recorder = new MediaRecorder(window.fieldAudioCapture,{mimeType:'audio/webm;codecs=opus'})
    const data = new Promise(resolve => { recorder.ondataavailable = event => resolve(event.data) })
    recorder.start()
    await new Promise(resolve => setTimeout(resolve,milliseconds))
    recorder.stop()
    return Array.from(new Uint8Array(await (await data).arrayBuffer()))
    }, milliseconds)
}

try {
  const audition = ['audio-only','studio-only','gameplay-audio','mastery-hunt','mastery-fixtures','mastery-endless','heritage-arrival'].some(mode => process.argv.includes(mode))
  const editions = process.argv.includes('after-only') ? ['after'] : ['before','after']
  for (const version of audition ? [] : editions) await review(version, async ({page,url,shot,context}) => {
    if (process.argv.includes('report-only')) {
      await startFixture(page,url,32)
      await page.locator('#primary').click()
      await page.locator('#run-again').waitFor({timeout:100000})
      await shot('hunt-over')
      return
    }
    const save = JSON.parse(createLegacyPreview(5).exportSave())
    save.players[0].profile.quality = 'low'
    await page.addInitScript(({key,save}) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify(save))
    },{key:saveKey,save})
    await page.goto(url+'?perf=1',{waitUntil:'domcontentloaded'})
    const download = page.locator('#content-download')
    await download.waitFor()
    await page.waitForFunction(() => !document.querySelector('#content-download').disabled)
    await shot('install')
    await download.click()
    await page.waitForFunction(() => !document.querySelector('#primary').disabled)
    await shot('title')
    await page.locator('#settings').click()
    await shot('settings')
    await page.locator('#close-settings').click()
    await page.locator('#open-lodge').click()
    await page.locator('.lodge-interior img').first().evaluate(image => image.decode())
    await shot('lodge')
    for (const name of ['migration','records','trophies']) {
      const destination = page.locator('[data-lodge-room="'+name+'"]')
      const parent = { records:'career', trophies:'collection' }[name]
      if (parent && !await destination.isVisible()) await page.locator('[data-lodge-room="'+parent+'"]').click()
      await destination.click()
      await shot(name)
    }
    await page.locator('#tab-journal').click()
    await page.locator('.wildlife-card img').first().evaluate(image => image.decode())
    await shot('journal')
    await page.locator('[data-species="mallard"] summary').click()
    await page.waitForFunction(() => document.querySelector('[data-species="mallard"] .journal-photo-detail')?.complete)
    await shot('journal-entry')
    await page.locator('#tab-worldwide').click()
    await shot('worldwide')
    await page.locator('#tab-kennel').click()
    await page.locator('.kennel-stage canvas').waitFor()
    await shot('kennel')
    const gear = page.locator('.kennel-items .gear-illustration').first()
    if (await gear.count()) {
      await gear.scrollIntoViewIfNeeded()
      await gear.evaluate(image => image.decode())
      await shot('kennel-gear')
    }
    await page.locator('#close-lodge').click()
    if (process.argv.includes('menus-only')) return
    await context.setOffline(true)
    await page.locator('#primary').click()
    await page.waitForFunction(() => parseInt(document.querySelector('#distance').textContent) >= 7)
    await shot('hud')
    await page.locator('#pause').click()
    await shot('paused')
    await page.goto(url+'?perf=1&debug=collision&volumes=off&seed=7&at=32&qaview=low&course=raptor')
    await page.waitForFunction(() => !document.querySelector('#primary').disabled)
    await page.locator('#primary').click()
    await page.locator('#run-again').waitFor({timeout:100000})
    await shot('hunt-over')
    if (version === 'after') {
      assert.ok(await page.evaluate(async () => (await document.fonts.load('600 20px "Field Serif"'))
        .some(font => font.status === 'loaded')))
      const resources = await page.evaluate(() => window.retrieverPerformance().audio)
      assert.equal(resources.beds, 7)
      assert.ok(resources.buffers > 0 && resources.voices <= 40)
    }
  })
  if (process.argv.includes('gameplay-audio')) await review('after',async ({page,url,shot}) => {
    await watchAudio(page)
    await startFixture(page,url,0)
    await page.locator('#primary').click()
    await page.waitForFunction(() => Boolean(window.fieldAudioCapture))
    const clip = await recordAudio(page, 9500)
    assert.ok(clip.length > 800)
    await writeFile(resolve(output,'gameplay.webm'),Buffer.from(clip))
    await shot('gameplay')
  })
  if (process.argv.includes('mastery-hunt')) await review('after',async ({page,url,context,shot}) => {
    await page.addInitScript(() => {
      Math.random = () => 7 / 0x100000000
      const key = 'retriever-run.record'
      if (!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify({version:6,active:1,players:[
        {id:1,nickname:'Field Test',career:{xp:108},profile:{quality:'low',masterVolume:0}},
        {id:2,nickname:'Archive',profile:{best:1703}},
      ]}))
    })
    await page.goto(url+'?perf=1')
    await page.locator('#content-download').click()
    await page.waitForFunction(() => !document.querySelector('#primary').disabled)
    await context.setOffline(true)
    await page.locator('#primary').click()
    await page.locator('#run-again').waitFor({timeout:150000})
    const watch = page.locator('#report-watch')
    const saved = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey)
    const initial = await saved()
    assert.equal(initial.players[0].stats.runs,1)
    assert.equal(initial.players[1].profile.best,1703)
    assert.ok(initial.players[0].career.xp > 110)
    assert.ok(initial.players[0].masteryBest > 0)
    assert.equal(await page.locator('.result-career progress').evaluate(meter => {
      const visible = meter.closest('.report-scroll').getBoundingClientRect()
      return meter.getBoundingClientRect().bottom <= visible.bottom
    }),true,'Career XP meter should be visible on the initial results view')
    await shot('ordinary-result')
    await watch.click()
    await page.locator('#replay-exit').waitFor()
    await shot('watch-final-moments')
    await page.locator('#replay-exit').click()
    assert.deepEqual(await saved(),initial)
    await page.locator('#run-again').click()
    await page.locator('#hud').waitFor()
    await page.locator('#run-again').waitFor({timeout:150000})
    // Take the primary action while the results transition is still available.
    await page.locator('#run-again').click()
    await page.locator('#hud').waitFor()
    const current = await saved()
    assert.equal(current.players[0].stats.runs,2)
    assert.equal(current.players[1].stats.runs,0)
    assert.equal(current.players[1].profile.best,1703)
    await page.waitForFunction(() => window.retrieverPerformance().restartTrace?.firstPresentationIntervalMs > 0)
    results.push({version:'after',offline:true,completed:2,retainedProfiles:2,
      replay:await page.evaluate(() => window.retrieverPerformance().restartTrace)})
  })
  if (process.argv.includes('mastery-endless')) await review('studio',async ({page,url,shot}) => {
    for (const minute of [5,10,15,20,30]) {
      await page.goto(url+'?studio=1&view=endless&minute='+minute+'&seed=7&quality=low&perf=1')
      if (minute === 5) await page.locator('#content-download').click()
      await page.locator('#art-studio').waitFor()
      await page.locator('#art-studio summary').click()
      await page.waitForFunction(t => {
        const live = window.retrieverPerformance?.()
        return live?.fairness?.elapsed >= t * 60 + .6 && live?.residentTiles >= 6
      }, minute,{timeout:55000})
      await shot('minute-'+minute)
    }
  })
  if (process.argv.includes('heritage-arrival')) await review('studio',async ({page,url,shot}) => {
    await page.goto(url+'?studio=1&territory=11&offset=0.15&arrival=first&quality=low&seed=7')
    await page.locator('#content-download').click()
    await page.locator('#art-studio summary').click()
    const before = await page.evaluate(key => localStorage.getItem(key),saveKey)
    await page.waitForFunction(() => !document.querySelector('#primary').disabled)
    await page.getByRole('button',{name:'Run isolated practice',exact:true}).click()
    await page.waitForFunction(() => document.querySelector('#game').dataset.mode === 'running')
    await page.getByText('First arrival in Canada',{exact:true}).waitFor()
    await shot('first-arrival-in-canada')
    assert.equal(await page.evaluate(key => localStorage.getItem(key),saveKey),before)
  })
  if (process.argv.includes('mastery-fixtures')) await review('studio',async ({page,url,context,shot}) => {
    await page.addInitScript(() => {
      if (new URLSearchParams(location.search).get('result') !== 'multi') return
      const request = requestAnimationFrame.bind(window)
      window.requestAnimationFrame = callback => callback.name === 'tick' ? 0 : request(callback)
    })
    const cases = ['ordinary','record','partial','level','multi','rank','equipment','trophy','lodge','rare','migration','master']
    const build = key => url+'?studio=1&view=report&quality=low&result='+key
    await page.goto(build(cases[0]))
    await page.locator('#content-download').click()
    const saved = await page.evaluate(key => localStorage.getItem(key),saveKey)
    for (const key of cases) {
      if (key !== cases[0]) await page.goto(build(key))
      await page.getByRole('button',{name:'Back to Art Studio',exact:true}).waitFor()
      await page.locator('.result-career progress').waitFor()
      if (key === 'multi' && await page.locator('#report-skip').isVisible()) {
        await page.locator('#report-skip').evaluate(button => button.click())
        assert.match(await page.locator('.result-level').textContent(),/Level 4/)
        const expected = await page.locator('.result-career progress').evaluate(node => node.value)
        assert.equal(expected,125)
      }
      await page.waitForFunction(() => document.querySelector('#report-skip').hidden)
      if (['equipment','trophy','lodge','rare','migration','master'].includes(key)) {
        const card = page.locator('.earned-card').first()
        await card.locator('summary').click()
        await card.scrollIntoViewIfNeeded()
      }
      await shot(key)
      assert.equal(await page.evaluate(key => localStorage.getItem(key),saveKey),saved)
    }
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(build('multi'))
    await page.locator('.result-career progress').waitFor()
    assert.equal(await page.locator('#report-skip').isHidden(),true)
    assert.equal(await page.locator('.result-career progress').evaluate(node => node.value),125)
  })
  if (process.argv.includes('studio-only')) await review('studio',async ({page,url,shot}) => {
    await page.goto(url+'?studio=1&view=report&quality=low')
    await page.locator('#content-download').click()
    const done = page.getByRole('button',{name:'Back to Art Studio',exact:true})
    await done.waitFor()
    const save = await page.evaluate(key => localStorage.getItem(key), saveKey)
    await shot('report-example')
    await page.locator('#report-details-toggle').click()
    await page.locator('#report-details').waitFor()
    await done.click()
    await page.locator('#art-studio').waitFor()
    await page.locator('#field-report').waitFor({state:'hidden'})
    assert.equal(await page.evaluate(key => localStorage.getItem(key), saveKey),save)
  })
  if (process.argv.includes('audio-only')) await review('studio',async ({page,url,context}) => {
    await watchAudio(page)
    await page.goto(url+'?studio=1&view=audio&quality=low&perf=1')
    await page.locator('#content-download').click()
    const selection = page.getByLabel('Sound preview')
    const start = page.getByRole('button',{name:'Play sound', exact:true})
    const stop = page.getByRole('button',{name:'Stop sound', exact:true})
    await selection.waitFor()
    const save = await page.evaluate(key => localStorage.getItem(key), saveKey)
    await context.setOffline(true)
    for (const value of ['title','early','middle','north','endless','region:1','region:6','region:14',
      'paw:gravel','paw:mud','paw:sand','paw:snow','bird:crane','bird:pheasant','bird:goose','bird:mallard',
      'lodge','kennel','cue:interface','cue:retrieve']) {
      if (process.argv.includes('mix-only') && !value.startsWith('region:')) continue
      if (process.argv.includes('effects-only') && !/^(bird:|cue:|lodge$|kennel$)/.test(value)) continue
      await selection.selectOption(value)
      await start.click()
      await page.waitForFunction(() => Boolean(window.fieldAudioCapture))
      const clip = await recordAudio(page, value.includes(':') ? 4200 : 6000)
      assert.ok(clip.length > 800)
      await writeFile(resolve(output,value.replace(':','-')+'.webm'),Buffer.from(clip))
      if (await stop.isVisible()) await stop.click({timeout:2000}).catch(() => {})
    }
    const after = await page.evaluate(key => localStorage.getItem(key), saveKey)
    assert.equal(after,save)
    results.push(await page.evaluate(() => window.retrieverPerformance().audio))
  })
  await writeFile(resolve(output,'layout.json'),JSON.stringify(results,null,2))
} finally {
  await browser.close()
  server.close()
}
