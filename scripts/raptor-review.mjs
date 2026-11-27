import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { distanceAtTime } from '../src/difficulty.js'

const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/raptor')
const roots = new Map([
  ['before', resolve(process.env.FIELD_BASELINE ?? 'baseline')],
  ['after', resolve(process.env.FIELD_BUILD ?? 'dist')],
  ['studio', resolve(process.env.FIELD_STUDIO ?? 'dist-studio')],
  ['studio-before', resolve(process.env.FIELD_BASELINE_STUDIO ?? 'baseline-studio')],
])
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.webmanifest':'application/manifest+json', '.webp':'image/webp', '.png':'image/png', '.glb':'model/gltf-binary',
  '.mp3':'audio/mpeg' }
const server = createServer(async (request, response) => {
  const parts = new URL(request.url, 'http://127.0.0.1').pathname.split('/')
  const root = roots.get(parts[1])
  if (!root || parts[2] !== 'Retriever-Run') return response.writeHead(404).end()
  const file = resolve(root, parts.slice(3).join('/') || 'index.html')
  if (!file.startsWith(root + sep)) return response.writeHead(404).end()
  const data = await readFile(file).catch(() => null)
  if (!data) return response.writeHead(404).end()
  response.writeHead(200, { 'Content-Type':types[extname(file)] ?? 'application/octet-stream' }).end(data)
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
await mkdir(output, { recursive:true })
const origin = 'http://127.0.0.1:' + server.address().port
const engine = process.argv.includes('webkit') ? webkit : chromium
const browser = await engine.launch(engine === chromium ? { executablePath: process.env.FIELD_CHROMIUM,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] } : {})
const samples = []

async function inspect(version, viewport, test, scale = 1) {
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport, deviceScaleFactor:scale })
  try {
    const errors = []
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
    const prefix = origin + '/' + version + '/Retriever-Run/'
    await test(page, prefix)
    assert.deepEqual(errors,[])
  } finally {
    await context.close()
  }
}

async function open(page, url) {
  await page.goto(url, { waitUntil:'domcontentloaded' })
  await page.locator('#content-download').click({ timeout:40_000 })
}

try {
  if (process.argv.includes('clarity-startup')) for (const version of ['before','after']) {
    await inspect(version,{width:320,height:568},async (page,prefix) => {
      const read = () => page.evaluate(() => window.retrieverPerformance())
      const startHunt = async launch => {
        await page.waitForFunction(() => !document.querySelector('#primary').disabled,null,{timeout:65000})
        const before = await read()
        await page.locator('#primary').click()
        await page.waitForFunction(() => window.retrieverPerformance().restartTrace?.nextAnimationCallbackMs >= 0,
          null,{timeout:65000})
        const after = await read()
        samples.push({ version, launch, build:after.build, startup:after.startupPhases, restart:after.restartTrace,
          drawingBuffer:after.drawingBuffer, capabilities:after.capabilities, ready:before.ready,
          observations:after.slowFrames.filter(frame=>frame.hunt === 1).slice(0,2) })
      }
      await page.addInitScript(() => {
        let state = 7
        Math.random = () => ((state = Math.imul(state,1664525) + 1013904223 | 0) >>> 0) / 0x100000000
      })
      await open(page,prefix+'?perf=1&resources=1')
      await startHunt('fresh installation')
      await page.context().setOffline(true)
      await page.reload({waitUntil:'domcontentloaded'})
      await startHunt('cached offline launch')
    },2)
  }
  else if (process.argv.includes('southern-studio')) for (const version of ['studio-before','studio']) {
    const keys = ['gulf','cypress','flyway','timber','ozark']
    for (let index = 0; index < keys.length; index++) {
      await inspect(version,{width:320,height:568},async (page,prefix) => {
        await page.addInitScript(() => localStorage.setItem('retriever-run.record.practice',JSON.stringify({quality:'high',masterVolume:0})))
        await open(page,prefix+'?studio=1&perf=1&seed=7&offset=15&territory='+(index+1))
        await page.waitForFunction(region => document.querySelector('#game').dataset.mode === 'studio' &&
          window.retrieverPerformance().territory === region && window.retrieverPerformance().residentTiles >= 5,
        keys[index],{timeout:75_000})
        const original = await page.evaluate(() => localStorage.getItem('retriever-run.record'))
        await page.screenshot({path:resolve(output,version+'-'+keys[index]+'.png')})
        if (version === 'studio') {
          await page.locator('#art-studio summary').click()
          await page.getByLabel('Camera preset').selectOption('shore')
          await page.getByLabel('Lighting').selectOption('dawn')
          if (index === 0 || index === 4) await page.getByRole('button',{name:'Play camera'}).click()
          await page.locator('#art-studio summary').click()
          await page.screenshot({path:resolve(output,'shore-'+keys[index]+'.png')})
        }
        assert.equal(await page.evaluate(() => localStorage.getItem('retriever-run.record')),original)
        samples.push({version,region:keys[index],seed:7,offset:15,isolated:true,
          build:await page.evaluate(() => window.retrieverPerformance().build)})
      })
    }
  }
  else if (process.argv.includes('heartland-studio')) await inspect('studio',{width:320,height:568},async (page,prefix) => {
    const center = Math.floor(distanceAtTime(195) / 30)
    const terrainReady = (atlas) => page.waitForFunction(({ center, atlas }) => {
      const perf = window.retrieverPerformance?.()
      return document.querySelector('#game').dataset.mode === 'studio' && perf?.territory === 'platte' &&
        perf.surfaces?.active === atlas && [center,center+1,center+2].every(index => perf.foliage.some(tile=>tile.index===index))
    },{center,atlas},{timeout:65000})
    await page.addInitScript(() => localStorage.setItem('retriever-run.record','{"fixture":"preserve normal save"}'))
    await open(page,prefix+'?studio=1&perf=1&territory=7&seed=7&offset=15&hazard=puddle&light=rain&quality=low')
    await terrainReady('compact')
    await page.screenshot({path:resolve(output,'puddle-rain-low.png')})
    await page.locator('#art-studio summary').click()
    assert.equal(await page.getByLabel('Trail hazard').inputValue(),'puddle')
    await page.getByLabel('Hazard lane').selectOption('1')
    await page.getByLabel('Graphics', { exact:true }).selectOption('high')
    await terrainReady('full')
    await page.locator('#art-studio summary').click()
    await page.screenshot({path:resolve(output,'puddle-rain-high.png')})
    await page.locator('#art-studio summary').click()
    await page.getByRole('button',{name:'Play camera'}).click()
    await page.getByRole('button',{name:'Stop camera'}).waitFor()
    assert.equal(await page.evaluate(() => localStorage.getItem('retriever-run.record')),'{"fixture":"preserve normal save"}')
    samples.push({ territory:'platte', weather:'heavy rain', seed:7, isolated:true,
      build:await page.evaluate(() => window.retrieverPerformance().build) })
  },2)
  else if (process.argv.includes('northern-studio')) for (const [territory,offset,region,event,quality] of [
    [11,1,'manitoba','','balanced'],
    [12,15,'parklands','','high'],
    [13,15,'boreal','','low'],
    [14,15,'foothills','sunbreak','balanced'],
    [15,16,'mountain','aurora','low'],
    [15,16,'mountain','aurora','high'],
  ]) await inspect('studio',{width:320,height:568},async (page,prefix) => {
    const original = '{"fixture":"preserve normal save"}'
    const shaderErrors = []
    page.on('console', message => {
      if (/THREE\.WebGLProgram|Shader Error/.test(message.text())) shaderErrors.push(message.text())
    })
    await page.addInitScript(value => localStorage.setItem('retriever-run.record',value),original)
    await open(page,prefix+'?studio=1&perf=1&seed=7&territory='+territory+'&offset='+offset+
      '&quality='+quality+(event ? '&nature='+event : '')+(event === 'aurora' ? '&hazard=puddle' : ''))
    await page.waitForFunction(({ region,quality }) => {
      const perf = window.retrieverPerformance?.()
      return document.querySelector('#game').dataset.mode === 'studio' && perf?.territory === region &&
        perf.residentTiles >= 6 && perf.surfaces.active === (quality === 'low' ? 'compact' : 'full')
    },{region,quality},{timeout:75000})
    await page.screenshot({path:resolve(output,(event || region)+'-'+quality+'.jpg'),type:'jpeg',quality:86})
    await page.locator('#art-studio summary').click()
    assert.equal(await page.getByLabel('Environmental event').inputValue(),event)
    if (event === 'aurora') assert.equal(await page.getByLabel('Trail hazard').inputValue(),'puddle')
    if (event) {
      await page.getByRole('button',{name:'Play camera'}).click()
      await page.getByRole('button',{name:'Stop camera'}).waitFor()
    }
    assert.deepEqual(shaderErrors,[])
    assert.equal(await page.evaluate(() => localStorage.getItem('retriever-run.record')),original)
    const perf = await page.evaluate(() => window.retrieverPerformance())
    samples.push({region,event,quality,build:perf.build,isolated:true,
      drawingBuffer:perf.drawingBuffer,textures:perf.textures,geometries:perf.geometries,programs:perf.programs})
  },2)
  else if (process.argv.includes('living-studio')) for (const [territory, offset, species, motion, model] of [
    [6,10,'pheasant','Action','auto'],
    [6,10,'pheasant','Action','fallback'],
    [1,12,'mallard','Action','auto'],
    [7,12,'crane','Flock','auto'],
    [13,16,'moose','Action','auto'],
    [14,14,'eagle','Glide','auto'],
    [15,13,'goldeneye','Flight','auto'],
  ]) await inspect('studio',{width:320,height:568},async (page,prefix) => {
    const before = '{"fixture":"living world practice leaves the ordinary profile alone"}'
    await page.addInitScript(value=>localStorage.setItem('retriever-run.record',value),before)
    await open(page,prefix+'?studio=1&perf=1&seed=6&quality=high&view=wildlife&territory='+territory+
      '&offset='+offset+'&species='+species+'&motion='+motion+'&model='+model)
    await page.waitForFunction(mode=>{
      const p = window.retrieverPerformance?.()
      return document.querySelector('#game').dataset.mode === 'studio' && p?.residentTiles >= 5 &&
        (mode === 'Flock' ? p.migrationFlight?.drawn === 39 : p.wildlife > 0)
    },motion,{timeout:75000})
    await page.screenshot({path:resolve(output,species+'-'+model+'.jpg'),type:'jpeg',quality:85})
    await page.locator('#art-studio summary').click()
    assert.equal(await page.getByLabel('Wildlife motion').inputValue(),motion)
    await page.getByLabel('Wildlife framing').selectOption('trail')
    await page.getByRole('button',{name:'Play camera'}).click()
    await page.getByRole('button',{name:'Stop camera'}).waitFor()
    assert.equal(await page.evaluate(()=>localStorage.getItem('retriever-run.record')),before)
    const perf = await page.evaluate(()=>window.retrieverPerformance())
    samples.push({species,motion,model,territory,build:perf.build,isolated:true,draws:perf.draws,
      triangles:perf.triangles,textures:perf.textures,geometries:perf.geometries,migration:perf.migrationFlight,
      rig:perf.wildlifeModels.models.map(({id})=>id)})
  },2)
  else if (process.argv.includes('worldwide')) for (const combine of [true, false]) {
    await inspect('after',{width:320,height:568},async (page,prefix) => {
      const calls = []
      // No live calls. Read the public test stack's previously verified reviews.
      await page.route(/\/rest\/v1\/rpc\/rr_(?:worldwide_standings|ranked_board)$/, async route => {
        const request = route.request()
        const name = new URL(request.url()).pathname.split('/').at(-1)
        calls.push(name)
        if (!combine && name === 'rr_worldwide_standings') {
          return route.fulfill({ status:404, json:{ code:'PGRST202' } })
        }
        const response = await fetch('http://127.0.0.1:55672/rpc/' + name, {
          method:'POST', headers:{ 'Content-Type':'application/json' }, body:request.postData(),
        })
        assert.ok(response.ok)
        await route.fulfill({ status:200, json:await response.json() })
      })
      await open(page,prefix)
      await page.locator('#open-worldwide').click()
      await page.getByText('Worldwide top 100 · 3 ranked').waitFor({ timeout:60_000 })
      const rows = page.locator('.worldwide-table tbody tr')
      assert.deepEqual(await rows.locator('td:nth-child(3)').allTextContents(),['95','75','35'])
      const message = combine ? 'Each column shows a separate personal best.' : 'The other verified bests are temporarily unavailable.'
      await page.getByText(message, { exact:false }).waitFor()
      assert.deepEqual(calls,combine ? ['rr_worldwide_standings'] : ['rr_worldwide_standings','rr_ranked_board'])
      await page.screenshot({path:resolve(output,combine ? 'combined.png' : 'score-compatibility.png')})
      samples.push({ combine, calls, scores:3, data:'isolated test database' })
    })
  }
  else if (process.argv.includes('idle')) for (const version of ['before','after']) {
    await inspect(version,{width:320,height:568},async (page,prefix) => {
      await page.addInitScript(() => {
        window.rrTitleDraws = 0
        for (const name of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced']) {
          const original = WebGL2RenderingContext.prototype[name]
          WebGL2RenderingContext.prototype[name] = function (...args) {
            window.rrTitleDraws++
            return original.apply(this,args)
          }
        }
      })
      await open(page,prefix+'?perf=1')
      await page.locator('#settings').click()
      await page.locator('#quality').selectOption('low')
      await page.locator('#close-settings').click()
      await page.waitForFunction(() => !document.querySelector('#primary').disabled)
      // Let the title's single redraw after changing preset settle.
      const draws = await page.evaluate(async () => {
        const after = delay => new Promise(done => setTimeout(done,delay))
        await after(1000)
        const before = window.rrTitleDraws
        const start = performance.now()
        await after(2000)
        return { calls:window.rrTitleDraws-before, observedMs:performance.now()-start }
      })
      assert.ok(version === 'before' ? draws.calls > 0 : draws.calls === 0)
      samples.push({ version, build:await page.evaluate(() => window.retrieverPerformance().build), ...draws })
    })
  }
  else if (process.argv.includes('resources')) await inspect('after',{width:320,height:568},async (page,prefix) => {
    await open(page,prefix+'?perf=1&resources=1')
    await page.waitForFunction(() => !document.querySelector('#primary').disabled, null, { timeout:60_000 })
    await page.locator('#settings').click()
    await page.locator('#quality').selectOption('high')
    await page.locator('#close-settings').click()
    const trace = async () => page.evaluate(() => window.retrieverPerformance())
    await page.waitForFunction(() => window.retrieverPerformance().operations.some(event =>
      event.name === 'shader-preparation-ready' && event.detail === 'Habitat / Fern 02'),null,{timeout:60_000})
    const warm = await trace()
    assert.equal(warm.operations.filter(event => event.name === 'texture-preparation' &&
      event.detail.startsWith('Habitat / Fern 02')).length,3)
    assert.equal(warm.operations.filter(event => event.name === 'geometry-preparation' &&
      event.detail === 'Habitat / Fern 02').length,1)
    await page.locator('#primary').click()
    await page.waitForFunction(() => window.retrieverPerformance().restartTrace?.firstPresentationIntervalMs > 0)
    const run = await trace()
    samples.push({ build:run.build, startup:run.startupPhases, restart:run.restartTrace,
      capabilities:run.capabilities, fernEvents:warm.operations.filter(event => /fern/i.test(String(event.detail))),
      firstFrames:run.hunt })
    const formats = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2')
      return ['WEBGL_compressed_texture_astc','WEBGL_compressed_texture_etc','WEBGL_compressed_texture_s3tc']
        .filter(name => gl?.getExtension(name))
    })
    samples.push({ compressedFormats:formats })
  })
  else for (const viewport of [{width:320,height:568},{width:430,height:932}]) {
    for (const version of ['before','after']) {
      await inspect(version, viewport, async (page, prefix) => {
        await open(page,prefix+'?perf=1&studio=1&territory=13')
        await page.waitForFunction(() => !document.querySelector('#primary').disabled, null, { timeout:60_000 })
        assert.equal(await page.locator('#art-studio').count(),0)
        const settings = await page.locator('#settings').boundingBox()
        const hunt = await page.locator('#primary').boundingBox()
        assert.ok(settings && settings.height >= 44 && hunt && hunt.y + hunt.height < viewport.height)
        if (version === 'after') assert.ok(settings.y >= hunt.y + hunt.height)
        await page.screenshot({path:resolve(output,version+'-title-'+viewport.width+'.png')})
        samples.push({ version,viewport,settings,hunt,build:await page.evaluate(() => window.retrieverPerformance().build) })
      })
    }
  }
  if (!process.argv.some(arg => ['titles','resources','worldwide','idle','southern-studio','heartland-studio','northern-studio','living-studio','clarity-startup'].includes(arg))) {
    await inspect('studio',{width:390,height:844},async (page,prefix) => {
      await open(page,prefix+'?studio=1&perf=1&territory=13&seed=7&breed=boyd')
      await page.waitForFunction(() => document.querySelector('#game').dataset.mode === 'studio')
      await page.waitForFunction(() => window.retrieverPerformance().residentTiles >= 4 &&
        window.retrieverPerformance().dogBreed === 'boyd',null,{timeout:60_000})
      await page.screenshot({path:resolve(output,'boreal-studio.png')})
      const initial = await page.evaluate(() => localStorage.getItem('retriever-run.record'))
      await page.locator('#art-studio summary').click()
      await page.getByLabel('View',{ exact:true }).selectOption('Wildlife')
      await page.getByLabel('Wildlife species').selectOption('deer')
      await page.getByLabel('Wildlife motion').selectOption('Action')
      await page.getByLabel('Wildlife model').selectOption('fallback')
      await page.getByRole('button',{name:'Play camera'}).click()
      await page.locator('#art-studio summary').click()
      await page.waitForFunction(() => window.retrieverPerformance().wildlife >= 1)
      await page.screenshot({path:resolve(output,'deer-studio.png')})
      await page.locator('#art-studio summary').click()
      await page.getByLabel('View',{exact:true}).selectOption('Dog')
      await page.getByLabel('Dog animation').selectOption('Run')
      await page.getByLabel('Yaw').press('ArrowRight')
      await page.locator('#art-studio summary').click()
      await page.screenshot({path:resolve(output,'boyd-studio.png')})
      assert.equal(await page.evaluate(() => localStorage.getItem('retriever-run.record')),initial)
      assert.equal(await page.locator('#field-report').isHidden(),true)
      samples.push({ studio:true,previewIsolated:true,breed:'boyd',territory:13 })
    })
  }
  await writeFile(resolve(output,'review.json'),JSON.stringify({engine:engine.name(),samples},null,2)+'\n')
  console.log(engine.name() + ' verified ' + samples.length + ' review cases')
} finally {
  await browser.close()
  await new Promise(done=>server.close(done))
}
