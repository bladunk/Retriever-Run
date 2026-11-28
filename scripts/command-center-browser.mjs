import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices } from 'playwright'

const roots = { before:resolve(process.env.FIELD_BASELINE ?? 'baseline'),
  after:resolve(process.env.FIELD_BUILD ?? 'dist'), studio:resolve(process.env.FIELD_STUDIO ?? 'dist-studio') }
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/command-center')
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.webmanifest':'application/manifest+json', '.woff2':'font/woff2', '.jpg':'image/jpeg', '.png':'image/png',
  '.webp':'image/webp', '.svg':'image/svg', '.mp3':'audio/mpeg', '.glb':'model/gltf-binary' }
const server = createServer(async (request,response) => {
  const [version, game, ...parts] = new URL(request.url,'http://localhost').pathname.split('/').slice(1)
  const root = roots[version]
  if (!root || game !== 'Retriever-Run') return response.writeHead(404).end()
  const path = resolve(root,parts.join('/') || 'index.html')
  if (!path.startsWith(root + sep)) return response.writeHead(404).end()
  const data = await readFile(path).catch(() => null)
  if (!data) return response.writeHead(404).end()
  response.writeHead(200,{ 'Content-Type':mime[extname(path)] ?? 'application/octet-stream' }).end(data)
})
await new Promise(done => server.listen(0,'127.0.0.1',done))
await mkdir(output,{ recursive:true })
const origin = 'http://127.0.0.1:' + server.address().port
const browser = await chromium.launch({ executablePath:process.env.FIELD_CHROMIUM,
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] })
const results = []
const worldwide = {status:'ok',open:false,season:'great-migration-1',course:'migration-30-phase-05',rows:[],
  rivals:[],mine:null,total_ranked:0,has_more:false}
const identity = 'a0000000-0000-4000-8000-100000000001'
const session = { access_token:'fixture-scope-only', refresh_token:'fixture-refresh',
  token_type:'bearer', expires_in:3600, user:{id:identity,is_anonymous:true} }

async function review(version, callback, { large = false, record = false } = {}) {
  const viewport = large ? {width:430,height:932} : {width:320,height:568}
  const options = { ...devices['iPhone 13'], viewport, deviceScaleFactor:1, serviceWorkers:'block' }
  if (record) options.recordVideo = {dir:output,size:viewport}
  const context = await browser.newContext(options)
  const page = await context.newPage()
  page.setDefaultTimeout(40_000)
  const errors = []
  const reports = []
  let failWorld = false
  page.on('pageerror',error => errors.push(error.message))
  await context.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin === origin) return route.continue()
    const cors = { 'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':
      'authorization, apikey, content-type, x-client-info, x-supabase-api-version, accept-profile, content-profile, prefer','Access-Control-Allow-Methods':'POST, GET, OPTIONS' }
    if (request.method() === 'OPTIONS') return route.fulfill({ status:204,headers:cors })
    const reply = (json,status = 200) => route.fulfill({ json,status,headers:cors })
    if (url.pathname.endsWith('/rr_connected_standings') && !failWorld) {
      const season = request.postDataJSON().p_season
      return reply({ ...worldwide, season, total_ranked:0,
        course: season === 'one-more-hunt-1' ? 'migration-30-mastery-1' : worldwide.course })
    }
    if (/rr_worldwide_standings|rr_ranked_board|rr_connected_standings/.test(url.pathname)) return reply(failWorld ?
      { code:'QA_UNAVAILABLE',message:'Simulated downtime' } : worldwide, failWorld ? 503 : 200)
    if (url.pathname.endsWith('/rr_support_status')) return reply({ status:'ok' })
    if (url.pathname.endsWith('/auth/v1/signup')) return reply(session)
    if (url.pathname.endsWith('/rr_support_submit')) {
      reports.push(request.postDataJSON().p_record)
      return reply({ status:'ok', reference:'QA-011' })
    }
    if (url.pathname.endsWith('/rr_support_receipt')) {
      const { p_id, p_secret, p_action } = request.postDataJSON()
      const matched = reports.find(item => item.id === p_id && item.secret === p_secret)
      return reply({ status:matched?.updates && p_action === 'status' ? 'verified' : 'unknown' })
    }
    if (url.pathname.endsWith('/rr_support_inbox')) return reply({code:'42501',message:'permission denied'},401)
    return route.abort()
  })
  const url = origin+'/'+version+'/Retriever-Run/'
  const shot = async name => {
    await page.evaluate(() => document.fonts.ready.then(() => true))
    const layout = await page.evaluate(() => ({width:innerWidth, documentWidth:document.documentElement.scrollWidth,
      dialogs:[...document.querySelectorAll('dialog[open], .command-center')].map(row => [row.clientWidth,row.scrollWidth])}))
    assert.equal(layout.documentWidth, layout.width, JSON.stringify(layout))
    for (const [client, scroll] of layout.dialogs) assert.ok(scroll <= client+2, JSON.stringify(layout))
    await page.screenshot({path:resolve(output,name+'.jpg'),quality:85})
    results.push({version,name,layout})
    console.log('Captured ' + name)
  }
  try {
    await callback({ page,url,shot,context,reports, outage:() => { failWorld = true } })
    assert.deepEqual(errors,[])
  } finally {
    const video = page.video()
    await context.close()
    if (video) {
      await video.saveAs(resolve(output,'review-motion.webm'))
      await video.delete()
    }
  }
}

async function title(page,url) {
  await page.goto(url+'?perf=1')
  const online = page.locator('#content-online')
  const hunt = page.locator('#primary:enabled')
  await page.locator('#content-online:visible, #primary:enabled:visible').first().waitFor()
  if (await online.isVisible()) await online.click()
  await hunt.waitFor()
}

try {
  await review('before',async ({page,url,shot}) => {
    await title(page,url)
    await page.locator('#open-worldwide').click()
    await page.getByText(/^(?:No verified worldwide scores yet\.|No eligible verified scores are available for this season\.)$/).waitFor()
    await shot('worldwide-before')
  })
  await review('after',async ({page,url,shot,context,reports,outage}) => {
    await title(page,url)
    await page.locator('#settings').click()
    await page.locator('#open-feedback').click()
    const dialog = page.locator('.support-panel[open]')
    await shot('feedback')
    await dialog.getByRole('button',{name:'Report a bug'}).click()
    await dialog.getByLabel('Short description').fill('A synthetic browser report')
    await shot('report-bug')
    await dialog.getByRole('button',{name:'Send report'}).click()
    await dialog.getByText('Reference QA-011').waitFor()
    await shot('receipt')
    assert.equal(reports.length,1)
    assert.equal(reports[0].diagnostics,undefined)
    assert.equal(reports[0].screenshot,undefined)
    await dialog.getByRole('button',{name:'Close',exact:true}).click()

    await page.locator('#open-feedback').click()
    await dialog.getByRole('button',{name:'Suggest an improvement'}).click()
    await dialog.getByLabel('Short description').fill('Show tomorrow’s weather')
    await shot('suggestion')
    await context.setOffline(true)
    await dialog.getByRole('button',{name:'Send report'}).click()
    await dialog.getByRole('button',{name:'Save for later'}).click()
    await dialog.getByText('Saved for delivery').waitFor()
    await shot('offline-queue')
    await dialog.getByRole('button',{name:'Cancel pending report'}).click()
    assert.equal(await dialog.getByText('Saved for delivery').count(),0)
    await context.setOffline(false)
    assert.equal(reports.length,1)

    await dialog.getByRole('button',{name:'Send a note'}).click()
    await shot('developer-note')
    await dialog.getByLabel('Short description').fill('Queue and retry test')
    await dialog.getByLabel('Include technical details').check()
    await dialog.getByLabel('Let me check for a verified fix').check()
    await context.setOffline(true)
    await dialog.getByRole('button',{name:'Send report'}).click()
    await dialog.getByRole('button',{name:'Save for later'}).click()
    await dialog.getByText('Saved for delivery').waitFor()
    await context.setOffline(false)
    await page.waitForFunction(() => localStorage.getItem('retriever-run.feedback.pending.v1') === '[]')
    assert.equal(reports.length,2)
    assert.equal(typeof reports[1].diagnostics.graphics,'string')
    assert.equal(reports[1].diagnostics.incident,undefined)
    assert.equal(reports[1].diagnostics.performance?.operations,undefined)
    assert.equal(reports[1].updates,true)
    assert.equal(reports[1].screenshot,undefined)
    await dialog.getByRole('button',{name:'Close',exact:true}).click()
    await page.locator('#open-feedback').click()
    await dialog.getByRole('button',{name:'Check for a fix'}).click()
    await dialog.getByText(/A fix for report QA-011 was verified/).waitFor()
    await shot('verified-fix-receipt')
    await dialog.getByRole('button',{name:'Close',exact:true}).click()
    await page.locator('#open-release-notes').click()
    await page.getByText('Known issues',{exact:true}).waitFor()
    await shot('release-notes')
    await dialog.getByRole('button',{name:'Close',exact:true}).click()
    await page.locator('#close-settings').click()
    await page.locator('#open-worldwide').click()
    await page.getByText('No eligible verified scores are available for this season.',{exact:true}).waitFor()
    await shot('worldwide-after')
    outage()
    await title(page,url)
    await page.locator('#open-worldwide').click()
    await page.getByText(/Showing the last downloaded standings|Standings are unavailable|rankings are unavailable|Could not connect|Camp is temporarily unavailable/i).first().waitFor()
    await shot('worldwide-unavailable')
    await page.goto(url+'?command=1')
    await page.getByLabel('Developer email').waitFor()
    await shot('private-login')
  })
  await review('studio',async ({page,url,shot,reports}) => {
    await page.goto(url+'?command=preview')
    await page.getByRole('button',{name:'Inbox',exact:true}).waitFor()
    await shot('overview')
    await page.getByRole('button',{name:'Inbox',exact:true}).tap()
    const row = page.getByRole('button',{name:/Late obstacle/})
    await row.waitFor().catch(async error => {
      console.error((await page.locator('.command-center').innerText()).slice(0,1700))
      throw error
    })
    await shot('inbox')
    await page.getByRole('button',{name:/Late obstacle/}).click()
    await page.getByRole('button',{name:'Check recorded collision'}).click()
    await page.getByText(/Collision matches on this review build/).waitFor()
    await page.getByRole('button',{name:'Copy private Codex package'}).click()
    await shot('incident')
    await page.getByRole('button',{name:'Evidence',exact:true}).click()
    await page.getByText('insufficient sample',{exact:false}).waitFor()
    await shot('evidence')
    await page.getByRole('button',{name:'Release health',exact:true}).click()
    await shot('release-health')
    await page.getByRole('button',{name:'Worldwide',exact:true}).click()
    await page.getByRole('button',{name:'Check Worldwide'}).click()
    await page.getByText(/Competition closed · great-migration-1/).waitFor()
    await shot('worldwide-health')
    await page.getByRole('button',{name:'Player previews'}).click()
    await page.getByRole('button',{name:'Report an unfair death'}).click()
    const dialog = page.locator('.support-panel[open]')
    await dialog.getByLabel('What seemed unfair').selectOption({label:'Game stuttered'})
    await dialog.getByLabel('Include technical details').check()
    await shot('unfair-consent')
    await dialog.locator('input[type=file]').setInputFiles({ name:'field.jpg', mimeType:'image/jpeg',
      buffer:await readFile(resolve(output,'worldwide-after.jpg')) })
    await dialog.getByAltText('Selected screenshot preview').waitFor()
    await shot('screenshot-preview')
    await dialog.getByRole('button',{name:'Remove screenshot'}).click()
    await dialog.getByRole('button',{name:'Send report'}).click()
    await dialog.getByText('Reference DEMO-011').waitFor()
    assert.equal(reports.length,0)
  }, {large:true,record:process.argv.includes('video')})
  await writeFile(resolve(output,'browser.json'),JSON.stringify({ tests:results, externalServices:'isolated browser fixtures' },null,2)+'\n')
} finally {
  await browser.close()
  server.close()
}
