import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'

const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/raptor')
const roots = new Map([
  ['before', resolve(process.env.FIELD_BASELINE ?? 'baseline')],
  ['after', resolve(process.env.FIELD_BUILD ?? 'dist')],
  ['studio', resolve(process.env.FIELD_STUDIO ?? 'dist-studio')],
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

async function inspect(version, viewport, test) {
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport, deviceScaleFactor:1 })
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
  for (const viewport of [{width:320,height:568},{width:430,height:932}]) {
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
  if (!process.argv.includes('titles')) {
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
      await page.getByLabel('Yaw').fill('2')
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
