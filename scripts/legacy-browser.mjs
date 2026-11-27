import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { createLegacyPreview } from '../src/legacy-preview.js'

const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/legacy')
const mode = process.argv.includes('chromium') ? chromium : webkit
const studioOnly = process.argv.includes('studio')
const small = process.argv.includes('small')
const viewport = small ? { width:320,height:568 } : { width:390,height:844 }
const roots = new Map([
  ['before',resolve(process.env.FIELD_BASELINE ?? 'baseline')],
  ['after',resolve(process.env.FIELD_BUILD ?? 'dist')],
  ['studio',resolve(process.env.FIELD_STUDIO ?? 'dist-studio')],
])
const types = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.png':'image/png','.webp':'image/webp','.glb':'model/gltf-binary','.mp3':'audio/mpeg','.webmanifest':'application/manifest+json' }
const host = createServer(async (req,res) => {
  const [,edition,...parts] = new URL(req.url,'http://localhost').pathname.split('/')
  const root = roots.get(edition)
  if (!root) return res.writeHead(404).end()
  const file = resolve(root,parts.join('/') || 'index.html')
  if (!file.startsWith(root + sep)) return res.writeHead(404).end()
  const content = await readFile(file).catch(() => null)
  if (!content) return res.writeHead(404).end()
  res.writeHead(200,{'Content-Type':types[extname(file)] ?? 'application/octet-stream'}).end(content)
})
await new Promise(done => host.listen(0,'127.0.0.1',done))
await mkdir(output,{recursive:true})
const origin = 'http://127.0.0.1:' + host.address().port
const browser = await mode.launch(mode === chromium ? { executablePath:process.env.FIELD_CHROMIUM,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] } : {})
const captures = []
const qa = {}
try {
  for (const edition of studioOnly ? ['studio'] : ['before','after']) {
    const context = await browser.newContext({ ...devices['iPhone 13'], viewport, deviceScaleFactor:1,
      ...(process.argv.includes('video') && edition === 'after' ? {recordVideo:{dir:resolve(output,'video'),size:viewport}} : {}) })
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    const profiles = studioOnly ? [] : Array.from({length:5},(_,i) => createLegacyPreview(i+1).exportSave())
    await page.addInitScript(profiles => {
      const tier = Number(new URLSearchParams(location.search).get('fixture'))
      const key = 'retriever-run.record'
      if (!profiles.length) {
        localStorage.setItem(key,'{"legacySentinel":true}')
      } else if (profiles[tier-1] && sessionStorage.getItem('qa-applied') !== String(tier)) {
        localStorage.setItem(key,profiles[tier-1])
        sessionStorage.setItem('qa-applied',String(tier))
      }
    },profiles)
    async function enter(tier) {
      await page.goto(origin + '/' + edition + '/?perf=1&' + (studioOnly
        ? 'studio=1&view=lodge&tier=' + tier
        : 'fixture=' + tier),{waitUntil:'domcontentloaded'})
      await page.waitForFunction(() => {
        const gate = document.querySelector('#content-screen')
        const download = document.querySelector('#content-download')
        return gate?.open && !download.disabled || !document.querySelector('#game').hidden && !gate?.open
      },null,{timeout:60_000})
      if (await page.locator('#content-screen').isVisible()) await page.locator('#content-download').tap()
      if (!studioOnly) {
        await page.locator('#open-lodge').tap()
      }
      const stage = page.locator('[data-tier]').first()
      await stage.waitFor({timeout:45_000})
      const art = stage.locator(edition === 'before' ? '.lodge-interior-art' : '.legacy-interior-art')
      await art.evaluate(image => image.decode())
      const overflow = await page.locator('#lodge-panel').evaluate(el => el.scrollWidth > el.clientWidth+3)
      assert.equal(overflow,false)
      return stage
    }
    async function image(name, target = page) {
      await target.screenshot({path:resolve(output,edition+'-'+name+'.jpg'),type:'jpeg',quality:86,scale:'css'})
      captures.push(edition+'-'+name+'.jpg')
    }
    if (studioOnly) {
      await enter(5)
      await image('qualified')
      assert.match(await page.locator('.legacy-cabin-title').textContent(),/Master Hunter’s Lodge/)
      assert.ok(await page.locator('.legacy-boyd-frame').isVisible())
      const mockName = await page.locator('.legacy-dog-tag').textContent()
      assert.equal(mockName,'Willow')
      await page.getByText('Display styling',{exact:true}).tap()
      await page.locator('[data-fabric=slate]').tap()
      assert.equal(await page.locator('.legacy-cabin').getAttribute('data-finish'),'slate')
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('retriever-run.record')).legacySentinel),true)
      qa.studio = { qualified:true, isolated:true }
      assert.deepEqual(errors,[])
      continue
    }
    for (let tier=1; tier<=5; tier++) {
      const stage = await enter(tier)
      const shot = edition === 'after' ? stage.locator('.legacy-interior') : stage.locator('.lodge-interior-art')
      await image('tier-'+tier,shot)
      if (tier === 1 || tier === 5) await image('cabin-'+tier)
      await page.locator('#close-lodge').tap()
    }
    if (edition === 'before') {
      const stage = await enter(3)
      await stage.waitFor()
      await page.locator('#lodge-room').selectOption('collection')
      await page.locator('.lodge-trophy').first().waitFor()
      await image('trophies')
      assert.deepEqual(errors,[])
      continue
    }
    await enter(5)
    const first = await page.evaluate(() => window.retrieverPerformance())
    await page.locator('.legacy-boyd-frame').tap()
    await page.locator('.legacy-tribute-detail').scrollIntoViewIfNeeded()
    await image('boyd',page.locator('.legacy-inspection'))
    await page.locator('.legacy-inspection').getByRole('button',{name:'Close'}).tap()
    await page.locator('[data-exhibit]').first().tap()
    await image('inspection',page.locator('.legacy-inspection'))
    await page.locator('.legacy-inspection').getByRole('button',{name:'Manage display'}).tap()
    const current = page.locator('.lodge-trophy[open]')
    await current.waitFor()
    const key = await current.getAttribute('data-trophy')
    await current.getByRole('button',{name:'Pin trophy',exact:true}).tap()
    assert.match(await current.locator('summary').textContent(),/Pinned display/)
    await image('pin',current)
    await page.locator('[data-lodge-room=collection]').tap()
    await page.getByRole('button',{name:'Field finds',exact:true}).tap()
    await page.locator('.lodge-trophy').first().waitFor()
    await image('trophies')
    await page.locator('[data-lodge-room=migration]').tap()
    assert.equal(await page.locator('.legacy-route-wall').getAttribute('data-complete'),'true')
    await page.locator('.legacy-route-wall').scrollIntoViewIfNeeded()
    await image('migration')
    await page.locator('[data-lodge-room=history]').tap()
    await page.locator('.legacy-timeline').first().waitFor()
    await image('timeline')
    await page.locator('[data-lodge-room=records]').tap()
    await page.locator('.legacy-records').waitFor()
    await image('records')
    await page.locator('[data-lodge-room=overview]').tap()
    await page.getByText('Display styling',{exact:true}).tap()
    await page.locator('[data-fabric=slate]').tap()
    assert.equal(await page.locator('.legacy-cabin').getAttribute('data-finish'),'slate')
    await image('decor',page.locator('.legacy-decor'))
    await page.locator('#close-lodge').tap()
    await context.setOffline(true)
    await enter(5)
    assert.equal(await page.locator('.legacy-cabin').getAttribute('data-finish'),'slate')
    assert.ok(await page.locator('[data-exhibit="'+key+'"]').isVisible())
    const allocations = []
    for (let pass=0; pass<6; pass++) {
      await page.locator('[data-lodge-room=collection]').tap()
      await page.locator('[data-lodge-room=overview]').tap()
      allocations.push(await page.evaluate(() => {
        const p = window.retrieverPerformance()
        return {draws:p.draws, textures:p.textures, geometries:p.geometries, programs:p.programs}
      }))
    }
    assert.deepEqual(allocations[0],allocations.at(-1))
    if (process.argv.includes('video')) {
      await page.locator('.legacy-hunt').tap()
      await page.waitForFunction(() => document.querySelector('#game').dataset.mode === 'running')
      await page.waitForTimeout(1700)
    }
    qa[edition] = { viewport, offlinePins:true, offlineFinish:true, allocations, beforeNavigation:first.build, errors }
    assert.deepEqual(errors,[])
    await context.close()
  }
  await writeFile(resolve(output,'report.json'),JSON.stringify({engine:mode.name(),captures,qa},null,2)+'\n')
  console.log(mode.name(),captures.length,'screenshots verified')
} finally {
  await browser.close()
  host.close()
}
