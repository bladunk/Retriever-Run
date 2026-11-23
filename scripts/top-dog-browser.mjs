import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { createServer as createSecureServer } from 'node:https'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { extname, join, resolve, sep } from 'node:path'
import { chromium, webkit, devices } from 'playwright'
import { xpAt } from '../src/career.js'

const browserKind = process.argv.includes('webkit') ? webkit : chromium
const viewport = process.argv.includes('small') ? { width: 320, height: 640 } : { width: 390, height: 844 }
const base = '/Retriever-Run/'
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output')
const scratch = await mkdtemp(join(tmpdir(), 'retriever-top-dog-'))
const build = join(scratch, 'site')
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.webp': 'image/webp' }
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const saveKey = 'retriever-run.record'
const fixedDate = '2026-11-20T08:00:00Z'
const metrics = ['score', 'distance', 'retrieves']
const sessions = new Map()
const players = new Map([
  ['timber', { nickname: 'Timber Scout', score: 80, distance: 33, retrieves: 0, recorded_at: fixedDate }],
  ['sage', { nickname: 'Sage Runner', score: 500, distance: 50, retrieves: 1, recorded_at: fixedDate }],
])
const receipts = new Set()
const calls = { signup: 0, nickname: 0, rival: 0, submit: 0 }
const tokenPart = value => Buffer.from(JSON.stringify(value)).toString('base64url')

const site = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const file = resolve(build, path.slice(base.length) || 'index.html')
  if (!path.startsWith(base) || !file.startsWith(build + sep)) return response.writeHead(404).end()
  try {
    const content = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' })
      .end(content)
  } catch { response.writeHead(404).end() }
})
let backend
let browser

try {
  await mkdir(output, { recursive: true })
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
    '-subj', '/CN=127.0.0.1', '-keyout', join(scratch, 'key'), '-out', join(scratch, 'cert')], { stdio: 'ignore' })
  await listen(site)
  const origin = 'http://127.0.0.1:' + site.address().port
  const url = origin + base
  backend = createSecureServer({ key: await readFile(join(scratch, 'key')), cert: await readFile(join(scratch, 'cert')) },
    async (request, response) => {
      const headers = {
        'access-control-allow-origin': origin, 'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': request.headers['access-control-request-headers'] ?? '*',
        'access-control-allow-credentials': 'true', 'content-type': 'application/json',
      }
      const send = (value, code = 200) => response.writeHead(code, headers).end(JSON.stringify(value))
      if (request.method === 'OPTIONS') return response.writeHead(204, headers).end()
      let body = ''
      for await (const chunk of request) body += chunk
      const args = body ? JSON.parse(body) : {}
      const owner = sessions.get(request.headers.authorization?.slice(7))
      const endpoint = new URL(request.url, 'https://localhost').pathname.split('/').at(-1)

      if (endpoint === 'signup') {
        calls.signup++
        await delay(300)
        const user = { id: randomUUID(), aud: 'authenticated', role: 'authenticated', is_anonymous: true,
          created_at: fixedDate, app_metadata: {}, user_metadata: {} }
        const payload = { sub: user.id, exp: Math.floor(Date.now() / 1000 + 3600),
          role: 'authenticated', is_anonymous: true, aal: 'aal1', session_id: randomUUID() }
        const access = tokenPart({ alg: 'HS256', typ: 'JWT' }) + '.' + tokenPart(payload) + '.qa'
        sessions.set(access, user.id)
        return send({ access_token: access, refresh_token: randomUUID(), expires_in: 3600, token_type: 'bearer', user })
      }
      if (endpoint === 'rr_camp_nickname') {
        if (!owner) return send({ status: 'auth_required' })
        calls.nickname++
        const nickname = args.p_nickname
        if ([...players].some(([id, row]) => id !== owner && row.nickname.toLowerCase() === nickname.toLowerCase())) {
          return send({ status: 'name_taken' })
        }
        players.set(owner, { ...players.get(owner), nickname })
        return send({ status: 'ok', nickname })
      }
      if (endpoint === 'rr_camp_start_run') {
        return send(owner ? { status: 'ok', season: 'preseason', generation: 0 } : { status: 'auth_required' })
      }
      if (endpoint === 'rr_camp_submit') {
        if (!owner || !players.has(owner)) return send({ status: 'auth_required' })
        calls.submit++
        const row = players.get(owner)
        if (receipts.has(args.p_run_id)) return send({ status: 'duplicate', ...row })
        receipts.add(args.p_run_id)
        for (const metric of metrics) row[metric] = Math.max(row[metric] ?? 0, args['p_' + metric])
        row.recorded_at = '2026-11-21T08:00:00Z'
        return send({ status: 'ok', ...row })
      }
      if (endpoint === 'rr_camp_board' || endpoint === 'rr_camp_rival') {
        const ranked = [...players].filter(([, row]) => row.recorded_at)
          .sort(([a, left], [b, right]) => right[args.p_metric] - left[args.p_metric] ||
            left.recorded_at.localeCompare(right.recorded_at) || a.localeCompare(b))
        const rows = ranked.map(([, row], index) => ({ ...row, rank: index + 1 }))
        const own = ranked.findIndex(([id]) => id === owner)
        const mine = rows[own] ?? null
        if (endpoint === 'rr_camp_board') {
          return send({ status: 'ok', mine, rows: rows.slice(args.p_offset, args.p_offset + args.p_limit), has_more: false })
        }
        if (!owner) return send({ status: 'auth_required' })
        calls.rival++
        const target = rows.find(row => row.nickname === args.p_compare_name && row.recorded_at === args.p_compare_at)
        return send({ status: 'ok', mine, rival: own > 0 ? rows[own - 1] : null, passed: target ? own + 1 < target.rank : null })
      }
      return send({ status: 'unavailable' }, 404)
    })
  await listen(backend)
  execFileSync('npm', ['run', 'build', '--', '--outDir', build], { stdio: 'pipe', env: { ...process.env,
    SUPABASE_URL: 'https://127.0.0.1:' + backend.address().port,
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture_key_for_local_qa',
  } })
  browser = await browserKind.launch(browserKind === chromium ? {
    executablePath: process.env.FIELD_CHROMIUM || undefined,
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  } : {})
  const errors = new Set()
  const attach = page => {
    page.on('console', message => { if (message.type() === 'error') errors.add(message.text()) })
    page.on('pageerror', error => errors.add(error.message))
    page.on('response', item => { if (item.status() >= 400) errors.add(item.status() + ' ' + item.url()) })
    page.on('requestfailed', item => {
      if (!/cancel|aborted|offline/i.test(item.failure()?.errorText ?? '')) errors.add(item.url())
    })
  }
  const options = { ...devices['iPhone 13'], viewport, deviceScaleFactor: .72, ignoreHTTPSErrors: true }
  const context = await browser.newContext(options)
  const page = await context.newPage()
  attach(page)
  const read = tab => tab.evaluate(key => JSON.parse(localStorage.getItem(key)), saveKey)
  const mode = tab => tab.locator('#game').getAttribute('data-mode')
  const screenshot = name => page.screenshot({ animations: 'disabled',
    path: join(output, '4.5-' + browserKind.name() + '-' + viewport.width + '-' + name + '.png') })
  const open = async room => {
    if (!await page.locator('#lodge').evaluate(dialog => dialog.open)) await page.locator('#open-lodge').tap()
    await page.locator('#tab-' + room).tap()
  }
  const ready = () => page.waitForFunction(() => !document.querySelector('#primary').disabled, null, { timeout: 55_000 })
  const noOverflow = () => page.evaluate(() => {
    const visible = [...document.querySelectorAll('dialog[open], #lodge-panel')].filter(element => element.clientWidth)
    return document.documentElement.scrollWidth === innerWidth && visible.every(element => element.scrollWidth <= element.clientWidth + 1)
  })
  const report = () => page.locator('#field-report').waitFor({ timeout: 95_000 })

  await page.goto(url)
  await page.locator('#onboarding').waitFor()
  await page.waitForFunction(() => performance.getEntriesByType('resource').some(entry => entry.name.endsWith('.glb')))
  await screenshot('welcome')
  assert.equal(await noOverflow(), true)
  await page.locator('#camp-name').fill('X!')
  await page.locator('#camp-join').tap()
  assert.match(await page.locator('#onboarding-status').textContent(), /3–20/)
  assert.equal(calls.signup, 0)

  await page.locator('#camp-name').fill('timber scout')
  await page.locator('#camp-join').tap()
  await page.locator('#onboarding-form').evaluate(form => {
    for (let i = 0; i < 5; i++) form.dispatchEvent(new Event('submit', { cancelable: true }))
  })
  await page.getByText('That nickname is already taken.').waitFor()
  assert.equal(calls.signup, 1)
  assert.equal(calls.nickname, 1)

  await page.locator('#camp-name').fill('  Reed   Scout ')
  await page.locator('#camp-join').tap()
  await page.locator('#camp-welcome').waitFor()
  assert.equal(calls.signup, 1)
  assert.equal((await read(page)).players[0].nickname, 'Reed Scout')
  await page.locator('#camp-menu').tap()
  assert.match(await page.locator('#title-rank').textContent(), /Pup · Level 1/)
  await open('worldwide')
  await page.getByText('Post a completed run to see your next rival.').waitFor()

  const joined = [...players].find(([, row]) => row.nickname === 'Reed Scout')[1]
  Object.assign(joined, { score: 60, distance: 31, retrieves: 0, recorded_at: fixedDate })
  await page.reload()
  await ready()
  assert.equal(await page.locator('#onboarding').evaluate(dialog => dialog.open), false)
  assert.equal(calls.signup, 1)
  await open('worldwide')
  const rival = page.locator('.rival-card')
  await rival.getByRole('heading', { name: 'Timber Scout' }).waitFor()
  assert.match(await rival.textContent(), /21 pts to pass/)
  await screenshot('rival')
  assert.equal(await noOverflow(), true)
  const rivalReads = calls.rival
  await rival.getByRole('button', { name: 'Start a run' }).tap()
  assert.equal(await mode(page), 'running')
  await report()
  await page.getByRole('heading', { name: 'Rival overtaken' }).waitFor()
  assert.match(await page.locator('#report-rival').textContent(), /Worldwide confirmed · #3 to #2 · Next rival Sage Runner/)
  assert.equal(calls.rival, rivalReads + 1)
  assert.equal(calls.submit, 1)
  assert.equal(receipts.size, 1)
  assert.equal((await read(page)).players[0].stats.runs, 1)
  assert.ok((await read(page)).players[0].career.xp >= 100)
  await screenshot('field-report')

  await page.evaluate(({ key, xp, date }) => {
    const save = JSON.parse(localStorage.getItem(key))
    const player = save.players[0]
    player.career.xp = xp
    player.patches.marathon = [date]
    player.patches['clean-paws'] = [date]
    player.stats.distance = 10_100
    player.stats.playtime = 600
    player.records.duration = 120
    localStorage.setItem(key, JSON.stringify(save))
  }, { key: saveKey, xp: xpAt(10) - 15, date: fixedDate })
  await page.reload()
  await ready()
  await page.locator('#primary').tap()
  await report()
  await page.locator('#promotion[open]').waitFor()
  assert.match(await page.locator('#promotion').textContent(), /Junior Retriever.*Junior Field Collar/s)
  await screenshot('promotion')
  await page.locator('#promotion-continue').tap()
  await page.getByRole('button', { name: 'View in Kennel' }).tap()
  assert.equal(await page.locator('.kennel-stage canvas').count(), 1)
  await page.locator('[data-gear="junior-collar"]').tap()
  await page.getByRole('button', { name: 'Equip', exact: true }).tap()
  await page.locator('[data-category="vest"]').tap()
  await page.locator('[data-gear="canvas-vest"]').tap()
  await page.getByRole('button', { name: 'Equip', exact: true }).tap()
  await page.locator('[data-category="coat"]').tap()
  await page.locator('[data-gear="chocolate"]').tap()
  assert.equal(await page.getByRole('button', { name: 'Level 60', exact: true }).isDisabled(), true)
  await screenshot('kennel-preview')
  assert.equal(await noOverflow(), true)
  await page.locator('#tab-career').tap()
  assert.equal(await page.locator('.kennel-stage canvas').count(), 0)
  assert.match(await page.locator('.career-ledger').textContent(), /Junior Retriever/)
  assert.equal(await page.locator('.career-patch').count(), 5)
  assert.match(await page.locator('.career-requirements').textContent(), /Different Field Honors.*3 \/ 6.*Clean Paws.*Complete/s)
  await screenshot('career')
  await page.reload()
  await ready()
  const saved = (await read(page)).players[0]
  assert.deepEqual(saved.kennel.equipment, { collar: 'junior-collar', vest: 'canvas-vest', coat: 'classic-yellow' })
  assert.equal(saved.career.promotions.length, 0)

  await page.waitForFunction(async () => {
    if (!navigator.serviceWorker.controller) return false
    const names = await caches.keys()
    return names.some(name => name.startsWith('retriever-run:'))
  })
  await context.setOffline(true)
  await page.reload()
  await ready()
  await open('worldwide')
  await rival.getByRole('heading', { name: 'Sage Runner' }).waitFor()
  assert.match(await rival.textContent(), /Offline · Last checked/)
  await page.locator('#close-lodge').tap()
  await page.locator('#primary').tap()
  await report()
  assert.equal((await read(page)).players[0].stats.runs, 3)
  await context.setOffline(false)
  await context.close()

  const guest = await browser.newContext(options)
  const guestPage = await guest.newPage()
  attach(guestPage)
  await guestPage.addInitScript(() => {
    const browserStatus = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine').get
    Object.defineProperty(Navigator.prototype, 'onLine', {
      configurable: true, get: () => !window.qaOffline && browserStatus.call(navigator),
    })
    window.qaOffline = !localStorage.getItem('retriever-run.record')
  })
  await guestPage.goto(url)
  await guestPage.locator('#onboarding').waitFor()
  assert.equal(await guestPage.locator('#camp-join').isDisabled(), true)
  await guestPage.locator('#camp-name').fill('Guest Reed')
  await guestPage.locator('#camp-guest').tap()
  await guestPage.locator('#camp-run').tap()
  await guestPage.locator('#field-report').waitFor({ timeout: 95_000 })
  const guestSaved = (await read(guestPage)).players[0]
  assert.equal(guestSaved.enrollment, 'guest')
  const xp = guestSaved.career.xp
  assert.ok(xp > 0)
  await guestPage.evaluate(() => { window.qaOffline = false; dispatchEvent(new Event('online')) })
  await guestPage.locator('#report-lodge').tap()
  await guestPage.locator('#tab-worldwide').tap()
  await guestPage.locator('.worldwide-profile summary').tap()
  await guestPage.getByRole('button', { name: 'Join Worldwide Camp', exact: true }).tap()
  await guestPage.getByText('Nickname saved. Your next qualifying run can post worldwide.').waitFor()
  const upgraded = (await read(guestPage)).players[0]
  assert.equal(upgraded.enrollment, 'worldwide')
  assert.equal(upgraded.career.xp, xp)
  assert.equal(upgraded.stats.runs, 1)
  assert.equal(calls.signup, 2)
  await guestPage.evaluate(key => {
    const ledger = JSON.parse(localStorage.getItem(key))
    ledger.version = 1
    for (const player of ledger.players) {
      delete player.career
      delete player.kennel
      delete player.enrollment
    }
    localStorage.setItem(key, JSON.stringify(ledger))
  }, saveKey)
  await guestPage.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  await guest.setOffline(true)
  await guestPage.reload()
  await guestPage.waitForFunction(() => !document.querySelector('#primary').disabled)
  assert.equal(await guestPage.evaluate(() => navigator.onLine), false)
  assert.equal(await guestPage.locator('#onboarding').evaluate(dialog => dialog.open), false)
  assert.match(await guestPage.locator('#current-runner').textContent(), /Guest Reed/)
  assert.match(await guestPage.locator('#record').textContent(), /Best 95/)
  assert.equal(calls.signup, 2)
  await guest.close()

  assert.deepEqual([...errors], [])
  console.log(JSON.stringify({ browser: browserKind.name(), viewport, cases: 'first-launch, guest, rival, career, promotion, kennel, recovery, offline', calls }))
} finally {
  await browser?.close()
  site.close()
  backend?.close()
  await rm(scratch, { recursive: true, force: true })
}
