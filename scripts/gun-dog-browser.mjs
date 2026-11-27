import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'

const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/gun-dog')
const roots = {
  before: resolve(process.env.FIELD_BASELINE ?? 'baseline'),
  after: resolve(process.env.FIELD_BUILD ?? 'dist'),
}
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.png':'image/png', '.webp':'image/webp', '.glb':'model/gltf-binary', '.mp3':'audio/mpeg' }
const server = createServer(async (request, response) => {
  const [, build, ...path] = new URL(request.url, 'http://localhost').pathname.split('/')
  const root = roots[build]
  if (!root) return response.writeHead(404).end()
  const file = resolve(root, path.join('/') || 'index.html')
  if (!file.startsWith(root + sep)) return response.writeHead(404).end()
  const bytes = await readFile(file).catch(() => null)
  if (!bytes) return response.writeHead(404).end()
  response.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream' }).end(bytes)
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const origin = 'http://127.0.0.1:' + server.address().port
const engine = process.argv.includes('chromium') ? chromium : webkit
const browser = await engine.launch(engine === chromium ? {
  executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
} : {})
const viewport = process.argv.includes('modern') ? { width:390,height:844 } : { width:320,height:568 }
const frames = process.argv.includes('frames')
await mkdir(output,{recursive:true})
const gear = [
  ['vest','salt-marsh-water-vest','neoprene',1.24], ['vest','seasoned-vest','waxed',1.15],
  ['vest','salt-marsh-cover-vest','marsh',1.23], ['vest','blaze-vest','blaze',1.32],
  ['bandana','delta-border-bandana','border',.37], ['bandana','greenhead-plaid-bandana','plaid',.31],
  ['bandana','rooster-stripe-bandana','stripe',.39], ['collar','brass-collar','brass',.52],
]
const shots = [
  ['front',.24,1.12,.76,4.08], ['side',1.57,1.28,.77,4.13], ['rear',2.79,1.35,.79,4.12], ['face',.38,1.18,1.12,2.52],
]
const results = {}
try {
  for (const version of ['before','after']) {
    const context = await browser.newContext({ ...devices['iPhone 13'], viewport, deviceScaleFactor:2 })
    const errors = []
    await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort())
    const page = await context.newPage()
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', msg => {
      if (msg.type() === 'error' && /shader error|THREE.WebGLProgram/i.test(msg.text())) errors.push(msg.text())
    })
    async function open(query) {
      await page.goto(origin + '/' + version + '/' + query, { waitUntil:'domcontentloaded' })
      if (await page.locator('#content-screen').isVisible()) await page.locator('#content-online').tap()
      await page.locator('.kennel-stage canvas').waitFor()
      await page.waitForFunction(() => window.retrieverInspectDog?.ready(), null, { timeout:45000 })
    }
    function image(id, target = page) {
      return target.screenshot({ path:resolve(output,version+'-'+id+'.jpg'),type:'jpeg',quality:87,scale:'css' })
    }
    async function frame(yaw,height,focus,distance,lateral = 0) {
      await page.evaluate(view => window.retrieverInspectDog.orbit(view), { yaw,height,focus,distance,lateral })
      await page.waitForTimeout(165)
    }
    const stage = page.locator('.kennel-stage')
    await page.addInitScript(() => {
      const key = 'retriever-run.record.practice'
      if (!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify({ version:4,active:1,
        players:[{ id:1,kennel:{ inherited:['canvas-vest'] } }] }))
    })
    await open('?debug=collision&inspect=kennel&perf=1&seed=7')
    const clean = await page.evaluate(() => localStorage.getItem('retriever-run.record'))
    for (const [id,...view] of shots) {
      await frame(...view)
      await image(id,stage)
    }
    for (const [category,id,label,yaw] of gear) {
      await page.locator('[data-category="'+category+'"]').tap()
      await page.locator('[data-gear="'+id+'"]').tap()
      await page.locator('.kennel-selection').getByRole('button',{name:'View preview'}).tap()
      await frame(yaw,1.22,.84,3.88)
      await image(label,stage)
      assert.match(await page.locator('.kennel-preview-status').textContent(), /Previewing/)
      assert.ok(await page.getByRole('button',{name:'Locked',exact:true}).filter({hasText:'Locked'}).count())
    }
    const start = await page.evaluate(() => window.retrieverInspectDog.resources())
    const switches = []
    for (let round = 0; round < 4; round++) {
      for (const [,id] of gear.slice(0,4)) {
        await page.locator('[data-category="vest"]').tap()
        await page.locator('[data-gear="'+id+'"]').tap()
      }
      await page.waitForTimeout(180)
      switches.push(await page.evaluate(() => window.retrieverInspectDog.resources()))
    }
    assert.deepEqual(switches.at(-1),switches[0], 'equipment changes should reuse resident resources')
    await page.locator('[data-category="vest"]').tap()
    await page.locator('[data-gear="canvas-vest"]').tap()
    await page.locator('.kennel-selection').getByRole('button',{name:'Equip',exact:true}).tap()
    await page.locator('[data-category="bandana"]').tap()
    await page.locator('[data-gear="rooster-stripe-bandana"]').tap()
    await page.locator('.kennel-selection').getByRole('button',{name:'View preview'}).tap()
    await frame(.68,1.18,.77,4.03)
    await image('layer',stage)
    if (version === 'after') {
      await page.getByRole('button',{name:'Sit',exact:true}).tap()
      await page.waitForTimeout(1400)
      await image('sitting',stage)
      await page.getByRole('button',{name:'Stand',exact:true}).tap()
    }
    if (frames) for (let index = 0; index < 14; index++) {
      await image('idle-'+String(index).padStart(2,'0'),stage)
      await page.waitForTimeout(70)
    }
    await page.locator('[data-category="vest"]').tap()
    await page.locator('.kennel-selection').getByRole('button',{name:'View preview'}).tap()
    await image('kennel')
    assert.equal(await page.evaluate(() => localStorage.getItem('retriever-run.record')),clean)
    const noOverflow = await page.evaluate(() => {
      const panel = document.querySelector('.lodge-panel')
      return panel.scrollWidth <= panel.clientWidth + 2
    })
    assert.ok(noOverflow, 'Portrait Kennel overflow')
    if (version === 'after') {
      await page.goto(origin + '/after/?perf=1',{waitUntil:'domcontentloaded'})
      if (await page.locator('#content-screen').isVisible()) await page.locator('#content-download').tap()
      await page.locator('#open-lodge').tap()
      await page.locator('#tab-kennel').tap()
      await page.getByText('Name your dog',{exact:true}).tap()
      const field = page.getByRole('textbox',{name:'Dog name'})
      await field.fill('<Scout>')
      await page.getByRole('button',{name:'Save name'}).tap()
      assert.match(await page.locator('.kennel-name [role="status"]').textContent(), /Enter up to 20/)
      await field.fill('Scout')
      await page.getByRole('button',{name:'Save name'}).tap()
      assert.match(await page.locator('.kennel-identity h3').textContent(), /Scout/)
      await image('naming')
      await context.setOffline(true)
      await page.reload({waitUntil:'domcontentloaded'})
      await page.locator('#open-lodge').tap()
      await page.locator('#tab-kennel').tap()
      assert.match(await page.locator('.kennel-identity h3').textContent(), /Scout/)
      await page.getByRole('group',{name:'Equipment ownership filter'}).getByRole('button',{name:'Owned'}).tap()
      assert.ok(await page.locator('.gear-option[data-gear="no-vest"]').isVisible())
      assert.equal(await page.locator('.gear-option[data-gear="blaze-vest"]').count(),0)
    }
    assert.deepEqual(errors,[])
    results[version] = { resources:start, switches, noOverflow, practiceSaveUnchanged:true, viewport, engine:engine.name() }
    console.log(version, JSON.stringify(results[version]))
    await context.close()
  }
  await writeFile(resolve(output,'kennel-metrics.json'),JSON.stringify(results,null,2)+'\n')
} finally {
  await browser.close()
  server.close()
}
