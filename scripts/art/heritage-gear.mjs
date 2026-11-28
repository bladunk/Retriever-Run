import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium } from 'playwright'
import { kennelCatalog } from '../../src/kennel-catalog.js'

const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'public/gear')
await mkdir(output,{recursive:true})
const types = { '.css':'text/css','.js':'text/javascript','.html':'text/html','.json':'application/json',
  '.woff2':'font/woff2','.mp3':'audio/mpeg','.webp':'image/webp','.png':'image/png' }
const server = createServer(async (request,response) => {
  const path = new URL(request.url,'http://localhost').pathname
  const file = resolve(root,path.slice(1) || 'index.html')
  if (!file.startsWith(root+sep)) { response.writeHead(404).end(); return }
  const bytes = await readFile(file).catch(() => null)
  if (!bytes) { response.writeHead(404).end(); return }
  response.writeHead(200,{ 'Content-Type':types[extname(file)] ?? 'application/octet-stream' }).end(bytes)
})
await new Promise(done => server.listen(0,'127.0.0.1',done))
const browser=await chromium.launch({ executablePath:process.env.FIELD_CHROMIUM ?? '/usr/bin/chromium',
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] })
try {
  const address='http://127.0.0.1:'+server.address().port
  for (const breed of ['lab','boyd']) {
    const context=await browser.newContext({viewport:{width:430,height:932},deviceScaleFactor:1})
    try {
      await context.route('**/*',route => route.request().url().startsWith(address) ? route.continue() : route.abort())
      const page=await context.newPage()
      page.on('pageerror',error => console.error(error.message))
      await page.goto(address+'/?debug=collision&inspect=kennel&gear-shots=1&volumes=off&breed='+breed+'&kit=studio')
      await page.waitForFunction(() => window.retrieverInspectDog?.ready() && document.querySelector('.kennel-stage canvas'),null,{timeout:60_000})
      for (const [slot,items] of Object.entries(kennelCatalog)) {
        for (const item of items.filter(entry => (entry.breed ?? 'lab') === breed)) {
          const image=await page.evaluate(({slot,id}) => window.retrieverGearShot(slot,id),{slot,id:item.id})
          if (!image?.startsWith('data:image/webp;base64,')) throw Error('Missing WebP for '+item.id)
          await writeFile(resolve(output,item.id+'.webp'),Buffer.from(image.split(',')[1],'base64'))
        }
        console.log(breed,slot,'rendered')
      }
    } finally { await context.close() }
  }
} finally {
  await browser.close()
  server.close()
}
