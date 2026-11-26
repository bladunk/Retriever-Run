import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'
import { huntHandler } from '../supabase/functions/verify-hunt/handler.js'
import { isolatedCamp, reviewPlayers } from './camp-isolated-db.mjs'
import { saveKey } from '../src/lodge-save.js'

const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/phase-09')
const prefix = '/Retriever-Run/'
const host = 'https://phase09-fixture.supabase.co'
const fixturePath = prefix + '__camp_fixture'
const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg' }
const release = JSON.parse(await readFile(resolve(root, 'content-manifest.json'),'utf8'))
const serve = createServer(async (request,response) => {
  const path = new URL(request.url,'http://localhost').pathname
  if (path.startsWith(fixturePath + '/')) {
    try { await handleFixtureApi(request,response,path.slice(fixturePath.length)) }
    catch (error) { console.error(error.message); response.writeHead(500).end() }
    return
  }
  if (!path.startsWith(prefix)) return response.writeHead(404).end()
  const file = resolve(root,path.slice(prefix.length) || 'index.html')
  if (!file.startsWith(root+sep)) return response.writeHead(404).end()
  try {
    const bytes = await readFile(file)
    response.writeHead(200,{ 'Content-Type':mime[extname(file)] ?? 'application/octet-stream','Cache-Control':'no-store' }).end(bytes)
  } catch { response.writeHead(404).end() }
})
await new Promise(done => serve.listen(0,'127.0.0.1',done))
await mkdir(output,{ recursive:true })
const env = await isolatedCamp()
const { one, two, three } = reviewPlayers
await env.name(two,'Cedar Scout')
await env.name(three,'Delta Guide')
await env.as(null,null,"update retriever_camp.ranked_control set active=true")
await env.as(null,null,`insert into retriever_camp.ranked_bests(season,player_id,metric,value,recorded_at) values
  ('great-migration-1',$1,'score',500,now()),
  ('great-migration-1',$1,'distance',350,now()),
  ('great-migration-1',$2,'score',60,now())`,[two,three])

const token = 'isolated-Phase09-browser-review-token'
let verifiedInput
let verifiedReceipt
let verifiedResponses = 0
let releaseVerification
const verificationGate = new Promise(done => { releaseVerification = done })
const apiUses = []
const handler = huntHandler({ origin:host,publishable:'fixture-only',service:'fixture-role',async fetcher(url,options) {
  if (url.endsWith('/user')) return Response.json({ id:one,is_anonymous:true })
  const body = JSON.parse(options.body)
  if (url.endsWith('/rr_ranked_claim')) return Response.json(await env.claim(body.p_player,body.p_ticket,body.p_ticks))
  return Response.json(await env.commit(body.p_player,body.p_ticket,body.p_lease,body.p_metrics))
} })
const now = Math.floor(Date.now()/1000)
const authFixture = { access_token:token, refresh_token:'isolated-phase09-refresh-fixture', token_type:'bearer',expires_at:now+3600,
  expires_in:3600,user:{ id:one,aud:'authenticated',role:'authenticated',is_anonymous:true,
    created_at:new Date().toISOString(),app_metadata:{ provider:'anonymous' },user_metadata:{} } }
async function handleFixtureApi(request,response,path) {
  const reply = (value,status=200) => response.writeHead(status,{'Content-Type':'application/json'}).end(JSON.stringify(value))
  apiUses.push(path)
  if (process.env.FIELD_QA_TRACE) console.error(request.method,path)
  if (path === '/auth/v1/signup') return reply(authFixture)
  const actor = request.headers.authorization === 'Bearer '+ token ? one : null
  const parts = []
  for await (const piece of request) parts.push(piece)
  const body = parts.length ? JSON.parse(Buffer.concat(parts).toString()) : {}
  if (path === '/rest/v1/rpc/rr_worldwide_standings') return reply(await env.result(actor ? 'authenticated' : 'anon',actor,
    'select public.rr_worldwide_standings($1) as result',[body.p_offset]))
  if (path === '/rest/v1/rpc/rr_ranked_board') return reply(await env.board(actor,body.p_metric,body.p_offset,body.p_scope,body.p_camp))
  if (path === '/rest/v1/rpc/rr_ranked_profile') return reply(await env.result('anon',null,
    'select public.rr_ranked_profile($1) as result',[body.p_nickname]))
  if (!actor) return reply({message:'fixture denied'},401)
  if (path === '/rest/v1/rpc/rr_camp_nickname') return reply(await env.name(actor,body.p_nickname))
  if (path === '/rest/v1/rpc/rr_camp_social') return reply(await env.social(actor,body.p_action,body.p_camp,body.p_value,body.p_target))
  if (path === '/rest/v1/rpc/rr_ranked_ticket') {
    const result = await env.permit(actor,body.p_course)
    if (result.status === 'ok') {
      await env.as(null,null,"update retriever_camp.ranked_tickets set seed=0 where id=$1",[result.id])
      result.seed = 0
    }
    return reply(result)
  }
  if (path === '/functions/v1/verify-hunt') {
    verifiedInput = body
    await verificationGate
    const response = await handler(new Request(host+path,{ method:'POST',headers:request.headers,body:JSON.stringify(body) }))
    verifiedReceipt = await response.json()
    verifiedResponses++
    return reply(verifiedReceipt,response.status)
  }
  return reply({ message:'unexpected fixture request' },404)
}
const safari = process.argv.includes('webkit')
const browser = await (safari ? webkit.launch() : chromium.launch({ executablePath:process.env.FIELD_CHROMIUM,args:
  ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] }))
try {
  const viewport = { width:320,height:568 }
  const context = await browser.newContext({ ...devices['iPhone 13'],viewport,deviceScaleFactor:1 })
  // Avoid shipping review traffic to a real host. WebKit handles synthetic
  // cross-origin preflights differently, so use a loopback relay for both engines.
  await context.addInitScript(({ endpoint, path }) => {
    const request = globalThis.fetch.bind(globalThis)
    globalThis.fetch = (input, options) => {
      const url = new URL(input instanceof Request ? input.url : input, location.href)
      if (url.origin !== endpoint) return request(input, options)
      return request(new URL(path + url.pathname + url.search, location.origin), input instanceof Request ? new Request(input, options) : options)
    }
  }, { endpoint:host,path:fixturePath })
  const page = await context.newPage()
  page.setDefaultTimeout(35_000)
  const errors = []
  page.on('pageerror',error => { errors.push(error.message); console.error(error.stack) })
  page.on('requestfailed', request => {
    if (request.url().startsWith(host) && process.env.FIELD_QA_TRACE) console.error(new URL(request.url()).pathname, request.failure()?.errorText)
  })
  await context.route(host + '/**',route => route.abort())
  await page.goto('http://127.0.0.1:'+serve.address().port+prefix+'?perf=1')
  await page.locator('#content-download').tap()
  await page.waitForFunction(() => !document.querySelector('#game').hidden && !document.querySelector('#primary').disabled)
  assert.equal(apiUses.length,0)
  const panel = page.locator('#lodge-panel')
  const shot = name => page.screenshot({ path:resolve(output,name+'.png'),animations:'disabled',
    mask:[page.getByRole('textbox',{name:'Your friend code'}),page.getByRole('textbox',{name:'Camp invitation code'})], maskColor:'#304239' })
  const room = name => page.locator('#lodge-room').selectOption(name)
  const openWorld = () => page.locator('#open-worldwide').tap()
  const waitText = text => panel.getByText(text,{ exact:false }).first().waitFor()

  await shot('six-destinations')
  await openWorld()
  assert.equal(await page.locator('#lodge-title').textContent(),'Worldwide')
  assert.equal(await page.locator('#tab-worldwide').getAttribute('aria-current'),'page')
  await panel.getByRole('button',{name:'Competitive profile',exact:true}).tap()
  await panel.getByLabel('Public nickname').fill('Marsh Runner')
  await panel.getByRole('button',{name:'Save or join'}).tap()
  try { await waitText('Nickname saved') }
  catch (error) { console.error(await panel.innerText()); throw error }
  await room('worldwide')
  await waitText('Cedar Scout')
  await shot('worldwide')
  await panel.locator('.worldwide-table').getByText('350 m', { exact:true }).waitFor()
  await panel.getByRole('button',{name:'Cedar Scout'}).tap()
  await waitText('Replay-verified personal bests')
  await shot('public-profile')
  await page.locator('#tab-board').tap()
  await room('friends')
  const friendCode = panel.getByRole('textbox',{name:'Your friend code'})
  await friendCode.waitFor()
  assert.equal((await env.social(two,'friend_request',null,await friendCode.inputValue())).status,'ok')
  await room('board')
  await room('friends')
  await panel.getByRole('button',{name:'Accept',exact:true}).tap()
  await waitText('Cedar Scout')
  await panel.getByRole('button',{name:'Remove',exact:true}).waitFor()
  await panel.getByRole('button',{name:'Cedar Scout'}).waitFor()
  await shot('friends')

  await room('private-camps')
  await panel.getByRole('textbox',{name:'Camp name'}).fill('Cattail Club')
  await shot('create-camp')
  await panel.getByRole('button',{name:'Create Camp',exact:true}).tap()
  const invite = panel.getByRole('textbox',{name:'Camp invitation code'})
  await invite.waitFor()
  assert.equal((await env.social(two,'camp_join',null,await invite.inputValue())).status,'ok')
  await invite.scrollIntoViewIfNeeded()
  await shot('invitation')
  await panel.getByRole('button',{name:'Cattail Club',exact:true}).tap()
  await panel.getByRole('button',{name:'Refresh rankings'}).tap()
  await panel.getByRole('button',{name:'Cedar Scout'}).waitFor()
  await shot('private-standings')

  await page.locator('#tab-worldwide').tap()
  await panel.getByRole('button',{name:'Prepare a ranked hunt'}).tap()
  await panel.getByRole('button',{name:'Start ranked hunt'}).tap()
  const state = wanted => page.waitForFunction(mode => document.querySelector('#game').dataset.mode === mode,wanted)
  await state('running')
  await page.locator('#field-report').waitFor({ timeout:60_000 })
  await page.locator('#report-ranked').filter({ hasText:'Worldwide verification pending' }).waitFor()
  await shot('pending-result')
  releaseVerification()
  try { await page.getByText('New Worldwide personal best',{ exact:false }).first().waitFor() }
  catch (error) {
    console.error(JSON.stringify({ receipt:verifiedReceipt?.status, ticks:verifiedInput?.ticks,
      label:await page.locator('#report-ranked').textContent() }))
    throw error
  }
  assert.equal(verifiedReceipt.status,'ok')
  assert.deepEqual(verifiedReceipt.honors,['camp-first-hunt'])
  const self = await env.board(one)
  assert.equal(self.mine.value,95)
  assert.equal(self.mine.rank,2)
  assert.equal(verifiedInput.ticks,380)
  assert.ok(!Object.hasOwn(verifiedInput,'score'))
  const firstVerified = { score:self.mine.value,rank:self.mine.rank,ticks:verifiedInput.ticks,honors:verifiedReceipt.honors }
  await shot('verified-result')
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).players[0],saveKey)
  assert.equal(saved.stats.runs,1)
  assert.equal(Object.hasOwn(saved.progression.honors,'camp-first-hunt'),false)
  const previous = apiUses.length
  const at = Date.now()
  await page.locator('#run-again').tap()
  await state('running')
  const replayMs = Date.now()-at
  assert.equal(apiUses.length,previous)
  await page.locator('#field-report').waitFor({ timeout:60_000 })
  await page.locator('#main-menu').tap()
  await openWorld()
  await waitText('Nearby rivals')
  await panel.getByRole('heading',{name:'Nearby rivals'}).scrollIntoViewIfNeeded()
  await waitText('Worldwide top 100 · 3 ranked')
  await waitText('Ahead of 50% of other ranked players')
  await waitText('406 more to pass')
  await shot('rivals')

  await panel.getByRole('button',{name:'Prepare a ranked hunt'}).tap()
  await panel.getByRole('button',{name:'Start ranked hunt'}).tap()
  await state('running')
  await context.setOffline(true)
  await page.locator('#field-report').waitFor({ timeout:60_000 })
  await page.locator('#report-ranked').filter({ hasText:'Worldwide verification pending' }).waitFor()
  assert.equal(verifiedResponses,1)
  await context.setOffline(false)
  await delayUntil(() => verifiedResponses === 2)
  assert.equal(verifiedReceipt.status,'ok')
  assert.deepEqual(verifiedReceipt.honors,[])
  assert.deepEqual(verifiedReceipt.improved,[])
  await page.locator('#main-menu').tap()
  await openWorld()
  await waitText('Nearby rivals')
  await page.locator('#tab-overview').tap()
  await room('trophies')
  await panel.getByLabel('Field Honor category').selectOption('Worldwide Camp')
  await panel.getByRole('searchbox',{name:'Search Field Honors'}).fill('First Verified Hunt')
  await panel.getByText('First Verified Hunt',{exact:true}).tap()
  await waitText('Verified · Gold')
  await shot('competitive-honors')
  await room('collection')
  await panel.getByLabel('Trophy category').selectOption('competitive')
  await waitText('First Verified Hunt')
  await shot('competitive-trophy')
  await context.setOffline(true)
  await page.locator('#tab-worldwide').tap()
  await waitText('Showing the last downloaded standings')
  await shot('offline-camp')
  assert.deepEqual(errors,[])
  const result = { build:release.app,manifest:release.version,viewport,engine:safari?'webkit':'chromium', isolated:true,
    verified:firstVerified, replayMs,offline:true,verifiedAfterReconnect:true,localCareerIsolation:true,errors }
  await writeFile(resolve(output,'browser.json'),JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify(result))
} finally {
  releaseVerification()
  await browser.close()
  await env.db.close()
  serve.close()
}

async function delayUntil(predicate) {
  const deadline = Date.now() + 15_000
  while (!predicate() && Date.now() < deadline) await new Promise(done => setTimeout(done,100))
  assert.ok(predicate(), 'pending verification did not resume after reconnection')
}
