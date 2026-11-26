import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { createCampTransport } from '../src/camp-transport.js'
import { createRankedCamp } from '../src/ranked-camp.js'
import { createWorldwideCamp } from '../src/worldwide-camp.js'
import { rankedCourse, rankedVersion, verifyRankedReplay } from '../src/ranked-replay.js'
import { huntHandler } from '../supabase/functions/verify-hunt/handler.js'

// Test-only gateway. All three ports are confined to the disposable loopback stack.
const origin = 'http://127.0.0.1:55673'
const auth = 'http://127.0.0.1:55671'
const rest = 'http://127.0.0.1:55672'
const anon = process.env.RR_TEST_ANON
const service = process.env.RR_TEST_SERVICE
assert.ok(anon && service, 'Use JWTs from the disposable stack only.')
const root = process.env.FIELD_BUILD ? resolve(process.env.FIELD_BUILD) : null
const prefix = '/Retriever-Run/'
const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
  '.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.mp3':'audio/mpeg' }

const handler = huntHandler({ origin, publishable:anon, service })
const server = createServer(async (request,response) => {
  try {
    const url = new URL(request.url,origin)
    if (root && url.pathname === '/local-review-session') {
      return response.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><title>Isolated review session</title>')
    }
    if (root && url.pathname.startsWith(prefix)) {
      const file = resolve(root,url.pathname.slice(prefix.length) || 'index.html')
      if (!file.startsWith(root+sep)) return response.writeHead(404).end()
      const content = await readFile(file).catch(() => null)
      if (!content) return response.writeHead(404).end()
      return response.writeHead(200,{'Content-Type':mime[extname(file)] ?? 'application/octet-stream','Cache-Control':'no-store'}).end(content)
    }
    const parts = []
    for await (const part of request) parts.push(part)
    const init = { method:request.method, headers:{ 'Content-Type':request.headers['content-type'] ?? 'application/json',
      ...(request.headers.authorization ? { Authorization:request.headers.authorization } : {}) },
    body:parts.length ? Buffer.concat(parts) : undefined }
    let result
    if (url.pathname.startsWith('/auth/v1/')) result = await fetch(auth+url.pathname.slice(8)+url.search,init)
    else if (url.pathname.startsWith('/rest/v1/')) result = await fetch(rest+url.pathname.slice(8)+url.search,init)
    else if (url.pathname === '/functions/v1/verify-hunt') result = await handler(new Request(origin+url.pathname,init))
    else return response.writeHead(404).end()
    response.writeHead(result.status,{'Content-Type':'application/json'}).end(Buffer.from(await result.arrayBuffer()))
  } catch {
    response.writeHead(503,{'Content-Type':'application/json'}).end('{"status":"unavailable"}')
  }
})
await new Promise(done => server.listen(55673,'127.0.0.1',done))
function sql(statement) {
  return execFileSync('docker',['exec','rr09-worldwide-db','psql','-Atq','-U','postgres','-v','ON_ERROR_STOP=1','-c',statement],
    {encoding:'utf8'}).trim()
}

function openActor(map = new Map()) {
  const store = { get length() { return map.size }, key:index => [...map.keys()][index],
    getItem:key => map.get(key) ?? null, setItem:(key,value) => map.set(key,value), removeItem:key => map.delete(key) }
  const transport = createCampTransport({ url:origin,key:anon },{storage:() => store})
  const connection = { online:true }
  const legacy = createWorldwideCamp(transport,{ storage:() => store,online:() => connection.online })
  const camp = createRankedCamp(transport,legacy,{store:() => store,online:() => connection.online})
  return { connection,map,transport,legacy,camp }
}

async function mint(actor) {
  const ticket = await actor.camp.ticket(1)
  assert.equal(ticket.status,'ok')
  // Only the seed of an isolated ticket is fixed. Every score still comes from replay.
  assert.match(ticket.id,/^[\da-f-]{36}$/)
  sql("update retriever_camp.ranked_tickets set seed=0 where id='" + ticket.id + "'")
  return { ...ticket,seed:0 }
}

const weak = {ticks:380,actions:[502]}
const lowest = {ticks:379,actions:[160]}
const midway = {ticks:380,actions:[762]}
const improvement = {ticks:380,actions:[]}
const worse = {ticks:379,actions:[600]}
const declared = (permit,trace) => ({ticket:permit.id,course:rankedCourse,season:rankedVersion,...trace})
const waitForClock = () => new Promise(done => setTimeout(done,1500))
const refresh = actor => actor.camp.board(1,'score','worldwide',null,0,true)
const ranking = result => result.rows.map(row => [row.nickname,row.value])
const owner = actor => actor.legacy.member(1).identity

try {
  assert.equal(sql('select count(*) from retriever_camp.ranked_bests'),'0','Start with a clean disposable database.')
  assert.equal((await refresh(openActor())).open,false)
  sql("update retriever_camp.ranked_control set active=true where season='great-migration-1'")
  const actors = []
  for (const nickname of ['QA Marsh Dog','QA Cedar Dog','QA Delta Dog']) {
    const actor = {...openActor(),nickname}
    assert.equal((await actor.legacy.join(1,nickname)).status,'ok')
    actors.push(actor)
  }
  assert.equal(new Set(actors.map(owner)).size,3)
  const [one,two,three] = actors
  const tickets = await Promise.all(actors.map(mint))
  await waitForClock()
  const stolen = await two.transport.rankedVerify(1,owner(two),declared(tickets[0],weak))
  assert.equal(stolen.status,'invalid_ticket')

  const traces = [weak,lowest,midway]
  for (let i=0;i<actors.length;i++) {
    const receipt = await actors[i].camp.finish(tickets[i],traces[i]).done
    assert.equal(receipt.status,'ok')
    assert.ok(receipt.honors.includes('camp-first-hunt'))
  }
  const first = await refresh(one)
  assert.deepEqual(ranking(first),[[three.nickname,75],[one.nickname,55],[two.nickname,35]])
  assert.equal(first.mine.rank,2)
  assert.equal(first.total_ranked,3)
  assert.equal(first.percentile,50)
  assert.deepEqual(first.rivals.map(row => row.nickname),[three.nickname,two.nickname])

  const second = await mint(one)
  const third = await mint(one)
  const invalidTicket = await mint(two)
  await waitForClock()
  one.connection.online = false
  assert.equal((await one.camp.finish(second,improvement).done).status,'pending')
  assert.equal((await one.camp.board(1,'score')).staleReason,'offline')
  const reopened = openActor(one.map)
  assert.equal(owner(reopened),owner(one))
  assert.equal(reopened.camp.pending(1),1)
  assert.ok((await reopened.camp.flush()).improved.includes('score'))
  const latest = await refresh(reopened)
  assert.deepEqual(ranking(latest),[[one.nickname,95],[three.nickname,75],[two.nickname,35]])
  assert.equal(latest.mine.rank,1)
  assert.equal(latest.percentile,100)
  assert.equal(latest.total_ranked,3)
  assert.equal(latest.rivals[0].nickname,three.nickname)
  const lower = await reopened.camp.finish(third,worse).done
  assert.equal(lower.status,'ok')
  assert.ok(!lower.improved.includes('score'))
  assert.deepEqual((await refresh(reopened)).rows,latest.rows)

  const duplicate = await reopened.transport.rankedVerify(1,owner(reopened),declared(second,improvement))
  assert.equal(duplicate.status,'duplicate')
  const invalid = await two.transport.rankedVerify(1,owner(two),{...declared(invalidTicket,lowest),course:'practice'})
  assert.equal(invalid.status,'invalid_run')
  const invalidVersion = await two.transport.rankedVerify(1,owner(two),{...declared(invalidTicket,lowest),season:'preseason'})
  assert.equal(invalidVersion.status,'invalid_run')
  assert.equal((await two.transport.rankedVerify(1,owner(two),declared(invalidTicket,{ticks:390,actions:[]}))).status,'invalid_run')

  const session = JSON.parse(one.map.get(reopened.transport.namespace+'.1'))
  const refused = await fetch(rest+'/rpc/rr_ranked_commit',{method:'POST',
    headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},
    body:JSON.stringify({p_player:owner(two),p_ticket:second.id,p_lease:second.id,p_metrics:{score:999999}})})
  assert.ok(!refused.ok)
  assert.equal(sql("select count(*) from retriever_camp.ranked_bests where metric='score'"),'3')

  const proof = {stack:'GoTrue v2.185.0, PostgREST v13.0.7 and PostgreSQL 17 in local containers',
    seed:0,canonical:traces.map(trace=>verifyRankedReplay(0,trace)),initial:ranking(first),refreshed:ranking(latest),
    mine:{rank:latest.mine.rank,value:latest.mine.value,percentile:latest.percentile,total:latest.total_ranked},
    staleOffline:true,syncedAfterReopen:true,sameIdentity:true,worseKeptBest:true,duplicateStatus:duplicate.status,
    wrongCourse:invalid.status,wrongVersion:invalidVersion.status,crossIdentity:stolen.status,directWriteHttp:refused.status}
  if (root) proof.browser = await reviewBrowser(one)
  if (process.env.FIELD_QA_OUTPUT) await writeFile(process.env.FIELD_QA_OUTPUT,JSON.stringify(proof,null,2)+'\n')
  console.log(JSON.stringify(proof))
} finally {
  await new Promise(done => server.close(done))
}

async function reviewBrowser(actor) {
  const { chromium, devices } = await import('playwright')
  const browser = await chromium.launch({ executablePath:process.env.FIELD_CHROMIUM,
    args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] })
  try {
    const context = await browser.newContext({ ...devices['iPhone 13'],viewport:{width:320,height:568},deviceScaleFactor:1 })
    const fakeHost = 'phase09-fixture.supabase.co'
    const snapshot = [...actor.map.entries()].map(([key,value])=>[key.replace('127.0.0.1:55673',fakeHost),value])
    await context.addInitScript(fakeHost => {
      const real = globalThis.fetch.bind(globalThis)
      globalThis.fetch = (input,options) => {
        const url = new URL(input instanceof Request ? input.url : input,location.href)
        return url.hostname === fakeHost ? real(location.origin+url.pathname+url.search,options) : real(input,options)
      }
    },fakeHost)
    const review = async page => {
      await page.goto(origin+prefix+'?perf=1')
      await page.waitForFunction(() => !document.querySelector('#game').hidden && !document.querySelector('#primary').disabled)
    }
    const page = await context.newPage()
    // Seed the already authenticated test identity once. Subsequent pages must
    // reopen with the actual saved session, without any fixture restoring it.
    await page.goto(origin+'/local-review-session')
    await page.evaluate(entries => {
      for (const [key,value] of entries) localStorage.setItem(key,value)
    },snapshot)
    await page.goto(origin+prefix+'?perf=1')
    await page.locator('#content-download').tap()
    await page.waitForFunction(() => !document.querySelector('#primary').disabled)
    const output = resolve(process.env.FIELD_QA_OUTPUT,'..')
    const shot = name => page.screenshot({path:resolve(output,name+'.png')})
    await shot('six-destinations')
    const primary = page.getByRole('navigation',{name:'Primary destinations'}).first().getByRole('button')
    assert.deepEqual((await primary.allTextContents()).map(text=>text.replace('🏆','').trim()),
      ['Hunt','Lodge','Kennel','Journal','Worldwide','Camp'])
    for (const item of await primary.all()) {
      const b = await item.boundingBox()
      assert.ok(b.x >= 0 && b.x + b.width <= 320 && b.height >= 44 && b.y + b.height <= 568)
    }
    await page.locator('#open-worldwide').tap()
    await page.getByText('Your rank #1',{exact:true}).waitFor()
    await page.getByText('Worldwide top 100 · 3 ranked',{exact:true}).waitFor()
    await page.locator('.your-run').getByText(actor.nickname).waitFor({state:'attached'})
    await shot('dedicated-worldwide')
    await page.getByRole('heading',{name:'Nearby rivals'}).scrollIntoViewIfNeeded()
    await shot('worldwide-rivals')
    await page.locator('#tab-board').tap()
    assert.deepEqual(await page.locator('#lodge-room option').allTextContents(),['Local records','Friends','Private Camps'])
    await shot('social-camp')
    await page.close()
    const reopened = await context.newPage()
    await review(reopened)
    await reopened.locator('#open-worldwide').tap()
    await reopened.getByText('Your rank #1',{exact:true}).waitFor()
    await reopened.getByRole('button',{name:'Prepare a ranked hunt'}).tap()
    await reopened.getByRole('button',{name:'Start ranked hunt'}).tap()
    await reopened.locator('#report-ranked').filter({ hasText:/New Worldwide personal best|Worldwide hunt verified/ })
      .waitFor({timeout:60_000})
    assert.ok(await reopened.locator('#run-again').isEnabled())
    await reopened.screenshot({path:resolve(output,'actual-hunt-receipt.png')})
    const build = JSON.parse(await readFile(resolve(root,'content-manifest.json'),'utf8')).app
    return { build,viewport:'320 × 568',directWorldwide:true,afterClosingAndReopening:true,
      browserHuntReceipt:await reopened.locator('#report-ranked').textContent() }
  } finally { await browser.close() }
}
