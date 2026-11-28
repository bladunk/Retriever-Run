import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { chromium, devices, webkit } from 'playwright'

const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/connected')
const prefix = '/Retriever-Run/'
const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.webmanifest':'application/manifest+json','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp',
  '.jpg':'image/jpeg','.mp3':'audio/mpeg','.glb':'model/gltf-binary' }
const server = createServer(async (request,response) => {
  const path = new URL(request.url,'http://localhost').pathname
  if (!path.startsWith(prefix)) return response.writeHead(404).end()
  const file = resolve(root,path.slice(prefix.length) || 'index.html')
  if (!file.startsWith(root+sep)) return response.writeHead(404).end()
  const data = await readFile(file).catch(() => null)
  if (!data) return response.writeHead(404).end()
  response.writeHead(200,{ 'Content-Type':mime[extname(file)] ?? 'application/octet-stream' }).end(data)
})
await new Promise(done => server.listen(0,'127.0.0.1',done))
await mkdir(output,{recursive:true})
const origin='http://127.0.0.1:'+server.address().port
const url=origin+prefix
const safari=process.argv.includes('webkit')
const viewport=safari ? { width:430,height:932 } : { width:320,height:568 }
const browser=await (safari ? webkit : chromium).launch(safari ? {} : {
  executablePath:process.env.FIELD_CHROMIUM ?? '/usr/bin/chromium',
  args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'],
})
const context=await browser.newContext({ ...devices['iPhone 13'],viewport,deviceScaleFactor:1,acceptDownloads:true })
const page=await context.newPage()
page.setDefaultTimeout(45000)
const errors=[]
const shots=[]
page.on('pageerror',error=>errors.push(error.message))
const identity='a0000000-0000-4000-8000-100000000001'
const invite='c0000000-0000-4000-8000-100000000001'
const camp='d0000000-0000-4000-8000-100000000001'
const ticket='e0000000-0000-4000-8000-100000000001'
const names=['Bayou Runner','Cedar Scout','Delta Guide','Willow Dog','Pine Scout','Prairie Hunter']
const rows=names.map((nickname,i) => ({rank:i+1,nickname,value:3600-i*350,recorded_at:'2026-11-27T18:00:00Z',
  bests:{score:3600-i*350,distance:1800-i*130,duration:100200-i*5500,retrieves:14-i,combo:24-i}}))
const season='one-more-hunt-1', course='migration-30-mastery-1'
const requests=[]
let scenario='closed', published=false
await context.route('https://**/*',async route => {
  const request=route.request()
  const path=new URL(request.url()).pathname
  const cors={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':
    'authorization, apikey, content-type, x-client-info, x-supabase-api-version, accept-profile, content-profile, prefer','Access-Control-Allow-Methods':'POST,GET,OPTIONS'}
  const reply=(json,status=200)=>route.fulfill({json,status,headers:cors})
  if (request.method()==='OPTIONS') return route.fulfill({status:204,headers:cors})
  const account={id:identity,is_anonymous:true}
  if (path.endsWith('/signup')) return reply({access_token:'fixture-authentication',refresh_token:'fixture-refresh',
    token_type:'bearer',expires_in:3600,user:account})
  if (path.endsWith('/rr_camp_nickname')) return reply({ status:'ok',nickname:'Cedar Scout' })
  const input=request.postDataJSON()
  if (path.endsWith('/rr_connected_standings')) {
    if (scenario==='outage') return reply({code:'QA_UNAVAILABLE'},503)
    const scope=input.p_scope
    const legacy=input.p_season!==season
    const entries=legacy || scenario==='closed' ? [] : scope==='worldwide' ? rows : rows.slice(1,3)
    return reply({status:'ok',season:input.p_season,course:legacy ? 'migration-30-phase-05' : course,open:scenario!=='closed' && !legacy,
      as_of:'2026-11-27T18:00:00Z',rows:entries,mine:entries.length ? rows[1] : null,rivals:[],has_more:false,
      percentile:entries.length>2 ? 80 : 0,total_ranked:entries.length})
  }
  if (path.endsWith('/rr_connected_profile')) return reply({status:'ok',nickname:input.p_nickname,
    records:rows.find(row=>row.nickname===input.p_nickname)?.bests ?? {},career:{level:24,migration_complete:true}})
  if (path.endsWith('/rr_connected_visibility')) {
    published=input.p_publish
    return reply({status:'ok'})
  }
  if (path.endsWith('/rr_camp_social')) {
    if (input.p_action==='friends') return reply({status:'ok',code:invite,rows:[
      {nickname:'Delta Guide',state:'friend',key:camp},{nickname:'Bayou Runner',state:'incoming',key:ticket},
    ]})
    if (input.p_action==='camps') return reply({status:'ok',rows:[{id:camp,name:'Wetland Friends',owner:true}]})
    if (input.p_action==='camp_detail') return reply({status:'ok',id:camp,name:'Wetland Friends',owner:true,invite,
      rows:[{nickname:'Cedar Scout',owner:true,self:true},{nickname:'Delta Guide',key:ticket}]})
    return reply({status:'ok',records:{},honors:[]})
  }
  if (path.endsWith('/rr_mastery_ticket')) return reply({status:'ok',id:ticket,seed:7,course,season,
    expires:new Date(Date.now()+7200000).toISOString()})
  if (path.endsWith('/verify-hunt')) { requests.push(input); return reply({status:'pending'}) }
  return reply({code:'PGRST202'},404)
})
await page.addInitScript(() => {
  Math.random=()=>7/0x100000000
  const key='retriever-run.record'
  if (!localStorage.getItem(key)) localStorage.setItem(key,JSON.stringify({
    version:6,active:1,players:[
      {id:1,nickname:'Cedar Scout',career:{xp:41000},kennel:{name:'Alder',equipment:{coat:'cream',vest:'marsh-vest',collar:'marsh-bandana'}},profile:{quality:'low',masterVolume:0}},
      {id:2,nickname:'Keep Safe',profile:{best:1703}},
    ],
  }))
  const original=URL.revokeObjectURL.bind(URL)
  window.fixtureRevoked=[]
  URL.revokeObjectURL=href=>{window.fixtureRevoked.push(href);original(href)}
  window.fixtureShareCalls=0
  Object.defineProperties(navigator,{
    share:{configurable:true,value:async()=>{window.fixtureShareCalls++;throw new DOMException('Cancelled','AbortError')}},
    canShare:{configurable:true,value:({files}={})=>Boolean(files?.length)},
  })
  document.addEventListener('DOMContentLoaded',()=>{
    const label=document.createElement('div')
    label.textContent='REVIEW FIXTURE'
    label.style.cssText='position:fixed;right:4px;bottom:4px;pointer-events:none;z-index:99;color:#f7e3b8;background:#14251e;padding:3px 6px;font:10px system-ui'
    document.body.append(label)
  },{once:true})
})
const byName = (name, root=page) => root.getByRole('button',{name,exact:true})
const room=page.locator('#lodge')
const modal=page.locator('.connected-share[open]')
const openWorldwide=()=>page.locator('#open-worldwide').click()
const back=()=>page.locator('#close-lodge').click()
async function shot(name) {
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),viewport.width)
  const ranked = await page.locator('#lodge[open] .lodge-scroll').evaluateAll(items =>
    items.filter(item=>item.querySelector('.ranked-camp')).map(item=>[item.scrollWidth,item.clientWidth,item.scrollLeft]))
  for (const [scroll,client,inset] of ranked) assert.ok(scroll <= client+2 && inset===0,JSON.stringify(ranked))
  await page.screenshot({path:resolve(output,name+'.jpg'),quality:86})
  shots.push(name)
  console.log(name)
}
async function preview(label,name,{ square=false, native=false }={}) {
  const launch=byName(label)
  await launch.click()
  await modal.waitFor()
  await modal.getByRole('link',{name:'Save image'}).waitFor()
  if (square) {
    await byName('Use square',modal).click()
    await modal.getByRole('link',{name:'Save image'}).waitFor()
  }
  const dimensions=await modal.locator('img').evaluate(async image=>{
    await image.decode()
    return [image.naturalWidth,image.naturalHeight]
  })
  assert.deepEqual(dimensions,[960,square ? 960 : 1280])
  const href=await modal.locator('img').getAttribute('src')
  const bytes=await page.evaluate(path=>fetch(path).then(r=>r.arrayBuffer()).then(b=>[...new Uint8Array(b)]),href)
  assert.ok(bytes.length>40000)
  await writeFile(resolve(output,name+'-export.jpg'),Buffer.from(bytes))
  await shot(name)
  if (native) {
    await byName('Share image',modal).click()
    await page.waitForFunction(()=>window.fixtureShareCalls===1)
    assert.equal(await modal.getByRole('link',{name:'Save image'}).isVisible(),true)
  }
  await byName('Close',modal).click()
  await page.waitForFunction(path=>window.fixtureRevoked.includes(path),href)
}
try {
  await page.goto(url+'?perf=1')
  await page.locator('#content-download').click()
  await page.locator('#primary:enabled').waitFor({timeout:100000})
  await openWorldwide()
  await page.getByText('Official Worldwide competition is closed.',{exact:false}).first().waitFor()
  await shot('closed')
  if (safari) {
    // This run exercises WebKit's real offline cache and canvas. The
    // complete authenticated, mocked lifecycle runs in Chromium.
    await back()
    await context.setOffline(true)
    await page.locator('#primary').click()
    await page.locator('#run-again').waitFor({timeout:140000})
    await shot('offline-hunt-result')
  } else {
    await byName('Competitive profile',room).click()
    await room.getByLabel('Public nickname',{exact:true}).fill('Cedar Scout')
    await byName('Save or join',room).click()
    await page.getByText('Nickname saved.',{exact:true}).waitFor()
    await byName('Publish career snapshot',room).click()
    await byName('Confirm',room).click()
    await page.getByText('Local career snapshot published.',{exact:true}).waitFor()
    assert.equal(published,true)
    await back()
    scenario='open'
    await openWorldwide()
    await room.getByRole('button',{name:'Refresh rankings'}).click()
    await page.getByText('Your rank #2',{exact:true}).waitFor()
    await page.getByText(/Scored above 80%/).waitFor()
    await shot('populated')
    await room.getByRole('table').scrollIntoViewIfNeeded()
    await shot('leaderboard-rows')
    await byName('Delta Guide',room).click()
    await page.getByText(/Shared local career.*Unverified/).waitFor()
    await shot('public-profile')
    await byName('Close competitive profile',room).click()
    await byName('Friends',room).click()
    await room.getByLabel('Your friend code').waitFor()
    await page.getByText('Incoming request',{exact:true}).waitFor()
    await shot('friend-invitation')
    await room.getByText('Friends standings',{exact:true}).waitFor()
    await room.getByRole('table').waitFor()
    await room.getByRole('table').scrollIntoViewIfNeeded()
    await shot('friends-standings')
    await byName('Delta Guide',room).click()
    await room.getByText('Your verified bests',{exact:true}).waitFor()
    await shot('friend-comparison')
    await page.locator('#lodge-room').selectOption('private-camps')
    await byName('Wetland Friends',room).click()
    await room.getByRole('table').waitFor()
    await shot('private-camp')
    await back()

    await openWorldwide()
    await room.getByRole('table').waitFor()
    await context.setOffline(true)
    await room.getByRole('button',{name:'Refresh rankings'}).click()
    await page.getByText('Offline. Showing the last downloaded standings.',{exact:true}).waitFor()
    await shot('offline-standings')
    await context.setOffline(false)
    scenario='outage'
    await room.getByRole('button',{name:'Refresh rankings'}).click()
    await page.getByText('Refresh failed. Showing the last downloaded standings.',{exact:true}).waitFor()
    await shot('outage')
    scenario='open'
    await room.getByRole('button',{name:'Refresh rankings'}).click()
    await byName('Prepare a ranked hunt',room).click()
    await byName('Start ranked hunt',room).click()
    await page.locator('#run-again').waitFor({timeout:140000})
    await page.getByText('Worldwide verification pending',{exact:true}).first().waitFor()
    assert.equal(requests[0]?.course,course)
    assert.equal(requests[0]?.season,season)
    await shot('verification-pending')
  }
  await preview('Share hunt result','hunt-share',{ native:true })
  await byName('Report an unfair death').click()
  await page.getByLabel('Include technical details about this game session').check()
  await shot('feedback')
  await page.locator('.support-panel[open]').getByRole('button',{name:'Close',exact:true}).click()
  await page.locator('#report-lodge').click()
  await preview('Share Lodge','lodge-share',{ square:true })
  await page.locator('#tab-kennel').click()
  await page.locator('.kennel-stage canvas').waitFor()
  for (const selector of ['#tab-kennel','.kennel-categories']) assert.equal(await page.locator(selector).isVisible(),true)
  const order=await page.locator('.gear-option small').allTextContents()
  assert.deepEqual(order,order.slice().sort((a,b)=>['Equipped','Owned','Locked'].indexOf(a)-['Equipped','Owned','Locked'].indexOf(b)))
  assert.ok(order.includes('Equipped') && order.includes('Locked'))
  await page.locator('.kennel-items').scrollIntoViewIfNeeded()
  await shot('owned-first')
  await preview('Share portrait','labrador-share',{ square:true })
  await back()
  const save=await page.evaluate(()=>JSON.parse(localStorage.getItem('retriever-run.record')))
  assert.equal(save.players[1].profile.best,1703)
  await page.locator('#run-again').click()
  await page.locator('#hud').waitFor()
  await shot('immediate-replay')
  assert.deepEqual(errors,[])
  await writeFile(resolve(output,'browser.json'),JSON.stringify({ engine:browser.browserType().name(),viewport,
    shots, verifiedPublicWrites:'synthetic fixture only', offlineImages:safari, secondProfilePreserved:true,
    nativeShare:'cancelled using browser fixture', submittedRuns:requests.length },null,2)+'\n')
} catch (error) {
  await shot('failure').catch(()=>{})
  if (errors.length) console.error(errors)
  throw error
} finally {
  await browser.close()
  server.close()
}
