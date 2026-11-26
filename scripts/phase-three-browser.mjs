import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium, devices, webkit } from 'playwright'

const args = process.argv.slice(2)

function checkTextureReplays(samples, reuse) {
  const first = samples[0].retired
  const last = samples.at(-1).retired
  const boneTextures = snapshot => snapshot.wildlifeModels.models.reduce((sum, model) => sum + model.boneTextures, 0)
  for (const { retired } of samples) {
    assert.ok(retired.wildlifeModels.resident <= (reuse ? 2 : 0), 'wildlife residency exceeded its limit')
    if (reuse) {
      assert.ok(retired.wildlifeModels.models.every(model => model.boneTextures <= 1), 'duplicate skeleton texture')
      assert.equal(retired.wildlifeModels.misses, first.wildlifeModels.misses, 'resident rig loaded again')
      assert.equal(retired.wildlifeModels.evictions, first.wildlifeModels.evictions, 'resident rig was evicted')
    }
    // The second resident rig may finish warming between the first two hunts.
    const warmed = reuse ? boneTextures(retired) - boneTextures(first) : 0
    assert.ok(retired.textures <= first.textures + warmed, 'replay retained unexplained textures')
  }
  if (reuse) assert.equal(last.wildlifeModels.rigEncounters - first.wildlifeModels.rigEncounters, samples.length - 1)
  assert.equal(last.hunt.id, 5)
}

const recordedTextures = args.find(argument => argument.startsWith('recheck-textures='))
if (recordedTextures) {
  const samples = JSON.parse(await readFile(recordedTextures.slice('recheck-textures='.length), 'utf8'))
  checkTextureReplays(samples, args.includes('reuse'))
  console.log(`Verified ${samples.length} recorded texture replays`)
  process.exit(0)
}

const engine = args.includes('webkit') ? webkit : chromium
const source = process.env.FIELD_SOURCE ?? '.'
const fromSource = name => import(pathToFileURL(resolve(source, 'src', name + '.js')).href)
const { expeditionRegions } = await fromSource('expedition')
const { distanceAtTime, speedAtTime, courseStages, stageAt, localDirector } = await fromSource('difficulty')
const { advance, createCourse, newRun, reactionWindow } = await fromSource('runner')
const { firstContact } = await fromSource('collision')
const { tickSeconds } = await fromSource('timing')
const { createRunControls } = await fromSource('run-controls')
const { buildTile } = await fromSource('terrain-geometry')
const isPhaseThree = expeditionRegions.length === 15
const root = resolve(process.env.FIELD_BUILD ?? 'dist')
const output = resolve(process.env.FIELD_QA_OUTPUT ?? 'qa-output/phase-three')
const prefix = '/Retriever-Run/'
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.glb': 'model/gltf-binary',
  '.png': 'image/png', '.webp': 'image/webp' }
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname
  const file = resolve(root, path.slice(prefix.length) || 'index.html')
  if (!path.startsWith(prefix) || !file.startsWith(root + sep)) return response.writeHead(404).end()
  try {
    const body = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body)
  }
  catch { response.writeHead(404).end() }
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
await mkdir(output, { recursive: true })
const origin = 'http://127.0.0.1:' + server.address().port
const browser = await engine.launch(engine === chromium ? {
  executablePath: process.env.FIELD_CHROMIUM || undefined,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
} : {})
const quality = args.find(arg => ['low','high','balanced','auto'].includes(arg)) ?? 'balanced'
const results = []

function rowsFor(seed, stop) {
  const next = createCourse(seed, args.includes('raptor') ? localDirector : undefined)
  const rows = []
  for (let row = next(); row.time < stop; row = next()) rows.push(row)
  return rows
}


// Drive the same guided route used in collision stress checks. Store the
// resulting keyboard inputs so the browser still owns movement and contacts.
function guidedInputs(seed, duration, start = 0) {
  const run = newRun()
  let low = 0, high = duration
  for (let i = 0; i < 45; i++) {
    const mid = (low + high) / 2
    if (distanceAtTime(mid) < start) low = mid
    else high = mid
  }
  if (start) Object.assign(run, { distance: start, elapsed: high, speed: speedAtTime(high) })
  const controls = createRunControls()
  const course = createCourse(seed, args.includes('raptor') ? localDirector : undefined)
  const inputs = []
  const rows = []
  const hazards = []
  const arrows = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', slide: 'ArrowDown' }
  const enqueue = action => {
    controls.enqueue(action)
    inputs.push({ at: run.elapsed, key: arrows[action] })
  }
  let next = course(), released = -1, laneReady = 0, usedGate = false
  while ((next.end ?? next.at) < start - 2) next = course()
  while (run.elapsed < duration) {
    while (next.at < run.distance + 102) {
      rows.push(next)
      hazards.push(...next.entities.filter(item => item.hazard))
      next = course()
    }
    const row = rows[0]
    if (row && run.elapsed - released >= reactionWindow && run.lane !== row.lane && run.elapsed >= laneReady) {
      enqueue(run.lane < row.lane ? 'right' : 'left')
      laneReady = run.elapsed + .16
    }
    if (!usedGate && row?.gate && row.at - run.distance <= run.speed * row.gate.duration / 2) {
      enqueue(row.gate.action)
      usedGate = true
    }
    controls.apply(run, () => {})
    const previous = { ...run }
    advance(run, tickSeconds)
    assert.ok(!firstContact(previous, run, hazards, {}), 'guided fixture contact at ' + run.elapsed)
    if (row && run.distance > (row.end ?? row.at) + 1.58) {
      rows.shift()
      released = run.elapsed
      usedGate = false
    }
  }
  return inputs
}

try {
  const viewport = args.includes('wide') ? { width: 844, height: 470 }
    : args.includes('small') ? { width: 320, height: 568 } : { width: 390, height: 844 }
  const context = await browser.newContext({ ...devices['iPhone 13'], viewport, deviceScaleFactor: args.includes('retina') ? 2 : args.includes('fast') ? .32 : .70,
    ...(args.includes('video') ? { recordVideo: { dir: output, size: viewport } } : {}) })
  // Block the external APIs, while letting the same-origin app worker serve
  // an actually verified content pack for the full set of offline checkpoints.
  await context.route(/.*/, route => {
    const url = route.request().url()
    return url.startsWith(origin) || url.startsWith('blob:') || url.startsWith('data:') ? route.continue() : route.abort()
  })
  const page = await context.newPage()
  const recordingStarted = performance.now()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', msg => { if (msg.type() === 'error' && /shader error|THREE.WebGLProgram/i.test(msg.text())) errors.push(msg.text()) })
  page.on('console', msg => {
    if (args.includes('wildlife-breaks') && msg.type() === 'error' && /Couldn't load texture/.test(msg.text())) console.error(msg.text())
  })
  await page.addInitScript(initial => {
    const quality = new URLSearchParams(location.search).get('qaview') || initial.quality
    const profile = { quality, masterVolume: 0 }
    const save = initial.vest ? { version: 4, active: 1, players: [{ id: 1, profile,
      kennel: { equipment: { vest: 'blaze-vest' }, inherited: ['blaze-vest'] } }] } : profile
    localStorage.setItem('retriever-run.record.practice', JSON.stringify(save))
    let hidden = false
    Object.defineProperty(document, 'hidden', { get: () => hidden })
    const native = window.requestAnimationFrame.bind(window)
    let stamp
    const qa = window.phaseThreeQA = { limit: -1, elapsed: [], rendered: 0 }
    qa.setBackground = value => {
      hidden = value
      document.dispatchEvent(new Event('visibilitychange'))
    }
    qa.landmarkFrames = []
    window.requestAnimationFrame = callback => native(ms => {
      const state = window.retrieverDebug
      if (stamp === undefined) stamp = ms
      if (qa.natural) {
        const take = qa.natural
        while (state?.mode === 'running' && take.inputs[take.next]?.at <= state.elapsed + .022) {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: take.inputs[take.next++].key }))
        }
        stamp = ms
      } else if (state?.mode !== 'running') stamp += 40
      else if (qa.soak && state.elapsed < qa.soak.duration) {
        const replay = qa.soak
        if (replay.precise) {
          // Deliver the scripted input on its original simulation tick.
          // The number of ticks between frames can vary while tiles stream.
          const nextTick = () => replay.next < replay.inputs.length ? Math.round(replay.inputs[replay.next].at * 120) : Infinity
          while (nextTick() <= state.ticks) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: replay.inputs[replay.next++].key }))
          }
          stamp += Math.min(15, nextTick() - state.ticks) * (1000 / 120)
        } else {
          while (replay.inputs[replay.next]?.at <= state.elapsed + .025) {
            window.dispatchEvent(new KeyboardEvent('keydown', { key: replay.inputs[replay.next++].key }))
          }
          const toNext = (replay.inputs[replay.next]?.at - state.elapsed) * 1000
          stamp += replay.fast && toNext > 0 ? Math.max(16, Math.min(124, toNext)) : replay.fast ? 124 : 1000 / 30
        }
      } else if (state.distance < qa.limit) stamp += qa.advanceBy ?? 25
      else if (qa.limit < 0 && quality === 'low') stamp += .10
      const start = performance.now()
      callback(stamp)
      const frame = window.retrieverDebug
      if (qa.natural && frame?.mode === 'running' && frame.elapsed !== state?.elapsed) {
        qa.natural.samples.push({ t: frame.elapsed, ms, distance: frame.distance, jump: frame.jump,
          slide: frame.slide, lane: frame.lane, wildlife: frame.wildlife, cpu: performance.now() - start })
        const sight = window.retrieverSightings?.()
        if (sight && sight.t !== qa.natural.sights.at(-1)?.t) qa.natural.sights.push(sight)
      }
      if (qa.inspectLandmark && window.retrieverDebug?.mode === 'running') {
        const frame = window.retrieverDebug
        const tile = frame.world?.find(t => t.index === qa.inspectLandmark)
        qa.landmarkFrames.push({ distance: frame.distance, id: tile?.landmark?.id,
          geometry: tile?.solid, opaque: tile?.solidOpaque })
      }
      if (qa.soak && state?.mode === 'running' && state.elapsed >= qa.soak.nextSample) {
        const sample = window.retrieverPerformance()
        qa.soak.samples.push({ elapsed: state.elapsed, distance: state.distance,
          draws: sample.draws, triangles: sample.triangles, geometries: sample.geometries,
          textures: sample.textures, tiles: sample.residentTiles, packs: sample.residentPacks,
          tileSliceMs: Math.max(0, ...(sample.tileTimings ?? []).map(tile => tile.integrationPeakMs ?? tile.unpackMs ?? 0)) })
        qa.soak.nextSample += .5
      }
      if (state?.mode === 'running' && qa.rendered < 180) {
        qa.elapsed.push({ timestamp: ms, cpu: performance.now() - start })
        qa.rendered++
      }
    })
  }, { quality, vest: args.includes('vest') })

  async function openAt(distance, seed, sceneQuality = quality) {
    const breed = args.includes('boyd') ? 'boyd' : args.includes('pointer') ? 'pointer' : 'lab'
    await page.goto(origin + prefix + '?perf=1&debug=collision&volumes=off&scenery=on&seed=' + seed + '&at=' + distance + '&qaview=' + sceneQuality + '&course=' + (args.includes('raptor') ? 'raptor' : 'phase05') + '&breed=' + breed + (args.includes('sight') ? '&sight=1' : '') + (args.includes('resources') ? '&resources=1' : ''),
      { waitUntil: 'domcontentloaded' })
    if (await page.locator('#content-screen').isVisible()) {
      if (args.includes('offline')) {
        await page.locator('#content-download').tap({ timeout: 40_000 })
      } else await page.locator('#content-online').tap({ timeout: 40_000 })
    }
    await page.waitForFunction(() => !document.querySelector('#game').hidden && !document.querySelector('#primary').disabled,
      null, { timeout: 60_000 })
    await page.addStyleTag({ content: '#collision-debug, #game[data-practice] .practice-status, #callout, #patch-toast { display: none }' })
  }

  async function runAt(distance, seed, sceneQuality = quality) {
    await openAt(distance, seed, sceneQuality)
    if (args.includes('wait-for-warmup')) {
      await page.waitForFunction(() => window.retrieverPerformance().wildlifeModels.models.some(model =>
        model.id === 'mallard' && model.prepared.geometries === model.prepared.geometryTotal), null, { timeout: 65_000 })
    }
    await page.locator('#primary').tap()
    await page.waitForFunction(() => window.retrieverDebug?.mode === 'running', null, { timeout: 40_000 })
    if (args.includes('offline')) await context.setOffline(true)
    await settle(distance, sceneQuality)
    await page.waitForFunction(quality => {
      const surfaces = window.retrieverPerformance()?.surfaces
      return !surfaces || surfaces.active === (quality === 'low' ? 'compact' : 'full')
    }, sceneQuality, { timeout: 40_000 })
    if (!isPhaseThree) await page.waitForTimeout(730)
  }

  async function settle(distance, sceneQuality) {
    await page.waitForFunction(({ distance, isPhaseThree, quality, small }) => {
      const s = window.retrieverDebug
      if (!s || s.mode !== 'running') return false
      if (!isPhaseThree) return s.tiles === 7 && s.drawCalls >= 36
      const count = quality === 'low' || small ? 4 : 5
      const center = Math.floor(distance / 30)
      const ready = Array.from({ length: count }, (_, i) => center + i).every(i => s.world?.some(t => t.index === i))
      // The fixture freezes the simulation clock at a view. A Low-presets
      // capture still needs a redraw to let staged terrain finish attaching.
      if (!ready && quality === 'low') window.dispatchEvent(new Event('resize'))
      return ready
    }, { distance, isPhaseThree, quality: sceneQuality, small: args.includes('small') }, { polling: 300, timeout: 60_000 }).catch(async error => {
      console.error(await page.evaluate(() => ({ state: window.retrieverDebug, perf: window.retrieverPerformance?.() })))
      throw error
    })
  }

  async function stepTo(distance) {
    await page.evaluate(distance => { window.phaseThreeQA.limit = distance + .9 }, distance)
    await page.waitForFunction(distance => {
      const s = window.retrieverDebug
      return s?.mode === 'over' || s?.distance >= distance - .76
    }, distance, { timeout: 150_000 }).catch(async error => {
      console.error(await page.evaluate(() => ({ state: window.retrieverDebug,
        limit: window.phaseThreeQA.limit,
        mode: document.querySelector('#game')?.dataset.mode })))
      throw error
    })
    const state = await page.evaluate(() => {
      window.phaseThreeQA.limit = window.retrieverDebug.distance
      return window.retrieverDebug
    })
    assert.equal(state.mode, 'running', JSON.stringify(state.contact))
    return state
  }

  async function capture(label, extra = {}) {
    assert.equal(await page.locator('#game').getAttribute('data-mode'), 'running')
    await page.screenshot({ path: resolve(output, label + '.png'), scale: args.includes('retina') ? 'device' : 'css', timeout: 45_000 })
    if (args.includes('video')) extra.recordingSeconds = (performance.now() - recordingStarted) / 1000
    results.push(await page.evaluate(({ label, extra }) => ({
      label, ...extra, ...window.retrieverDebug, perf: window.retrieverPerformance(),
      weather: document.querySelector('#weather')?.textContent,
      hud: document.querySelector('#habitat')?.textContent,
      stageLabel: document.querySelector('#difficulty-stage')?.textContent,
    }), { label, extra }))
    assert.equal(results.at(-1).mode, 'running', label)
    console.log(engine.name() + ' captured ' + label)
  }

  if (args.includes('cypress-showcase')) {
    const seed = 7
    const hazards = rowsFor(seed, 61).flatMap(row => row.entities).filter(item => item.hazard)
    const camp = buildTile(16, seed).landmark
    assert.equal(camp?.role, 'swamp-cabin')
    const frames = [['swamp-entry', 481], ['hunting-camp', camp.distance - 24],
      ['flooded-grove', 669], ['moss-corridor', 845]]
    for (const [view, wanted] of frames) {
      if (args.some(arg => arg.startsWith('view=')) && !args.includes('view=' + view)) continue
      const at = [0, -1, 1, -2, 2, -3, 3, -4, 4].map(offset => wanted + offset).find(distance => {
        const pose = { ...newRun(), distance }
        return !firstContact(pose, pose, hazards, {})
      })
      assert.ok(at !== undefined, view)
      await runAt(at, seed)
      await capture(view, { seed, at })
    }
  } else if (args.includes('gulf-slice')) {
    const seed = 7
    const hazards = rowsFor(seed, 29).flatMap(row => row.entities).filter(item => item.hazard)
    const crossing = hazards.find(item => item.type === 'stream')
    assert.ok(crossing, 'Missing Gulf crossing fixture')
    const frames = [
      ['opening', 3], ['raised-shelter', 170], ['creek-bank', crossing.distance - 10],
      ['decoy-water', 34], ['cordgrass-shore', 79], ['marsh-horizon', 149],
    ].filter(([view]) => !args.some(arg => arg.startsWith('view=')) || args.includes('view=' + view))
    for (const [view, wanted] of frames) {
      const at = [0,-1,1,-2,2,-3,3,4,5].map(offset => wanted + offset).find(distance => {
        const pose = { ...newRun(), distance }
        return distance >= 0 && !firstContact(pose, pose, hazards, {})
      })
      assert.ok(at !== undefined, view)
      await runAt(at, seed)
      await page.waitForFunction(() => !window.retrieverPerformance()?.surfaces?.gulfAtlasPending,
        null, { timeout: 35_000 })
      await page.waitForTimeout(200)
      await capture(view, { seed, at })
    }
  } else if (args.includes('gulf-lifecycle')) {
    const ready = wanted => page.waitForFunction(value => {
      const surfaces = window.retrieverPerformance()?.surfaces
      return window.retrieverDebug?.mode === 'over' || surfaces?.gulfAtlas === value && !surfaces.gulfAtlasPending
    }, wanted, { timeout: 180_000 }).catch(async error => {
      console.error(await page.evaluate(() => {
        const { mode, distance, elapsed, contact } = window.retrieverDebug
        return { mode, distance, elapsed, contact, surfaces: window.retrieverPerformance()?.surfaces }
      }))
      throw error
    })
    const inputs = guidedInputs(7, 38)
    await runAt(0, 7)
    await ready(true)
    const marsh = await page.evaluate(() => window.retrieverPerformance())
    await page.evaluate(inputs => {
      window.phaseThreeQA.soak = { inputs, duration: 38, fast: true, next: 0, nextSample: 0, samples: [] }
    }, inputs)
    await ready(false)
    const state = await page.evaluate(() => window.retrieverDebug)
    assert.equal(state.mode, 'running', JSON.stringify(state.contact))
    const cypress = await page.evaluate(() => window.retrieverPerformance())
    assert.equal(cypress.territory, 'cypress')
    assert.equal(cypress.operations.filter(event => event.name === 'gulf-atlas-release').length, 1)
    await capture('cypress-release', { seed: 7 })
    await runAt(3, 7, 'high')
    await ready(true)
    const returned = await page.evaluate(() => window.retrieverPerformance())
    assert.ok([marsh, cypress, returned].every(report => report.residentTiles <= 7))
    await writeFile(resolve(output, 'gulf-lifecycle.json'), JSON.stringify({ marsh, cypress, returned }, null, 2) + '\n')
  } else if (args.includes('boyd-review')) {
    const release = JSON.parse(await readFile(resolve(root, 'content-manifest.json'), 'utf8'))
    const runtimeModel = release.assets.find(asset => asset.id === 'boyd.glb').path
    const standardModel = release.assets.find(asset => asset.id === 'labrador.glb').path
    const visitor = await browser.newContext({ ...devices['iPhone 13'], viewport, deviceScaleFactor: .70 })
    await visitor.route(/.*/, route => route.request().url().startsWith(origin) ? route.continue() : route.abort())
    const ordinary = await visitor.newPage()
    const ordinaryRequests = []
    ordinary.on('request', request => ordinaryRequests.push(new URL(request.url()).pathname))
    await ordinary.goto(origin + prefix + '?breed=boyd&perf=1')
    await Promise.all([
      ordinary.waitForRequest(request => new URL(request.url()).pathname.endsWith('/' + standardModel)),
      ordinary.locator('#content-online').tap(),
    ])
    await ordinary.waitForFunction(() => Boolean(window.retrieverPerformance?.()?.build))
    assert.equal(await ordinary.evaluate(() => window.retrieverInspectDog), undefined)
    assert.equal(await ordinary.locator('#game[data-practice]').count(), 0)
    assert.ok(!ordinaryRequests.some(path => path.endsWith('/' + runtimeModel)))
    await visitor.close()

    const startUrl = origin + prefix + '?perf=1&debug=collision&volumes=off&breed=boyd&kit=signature'
    await page.goto(origin + prefix + '?perf=1')
    await page.locator('.content-art').evaluate(image => image.decode())
    await page.screenshot({ path: resolve(output, 'install.png'), scale: 'css' })
    await page.locator('#content-download').tap()
    await page.waitForFunction(() => navigator.serviceWorker.controller &&
      !document.querySelector('#game').hidden && !document.querySelector('#primary').disabled,
      null, { timeout: 65_000 })
    // Allow the initial game document to finish opening its worker and audio
    // before changing the browser's network state.
    await page.waitForTimeout(700)
    await context.setOffline(true)
    await page.goto(startUrl)
    await page.waitForFunction(() => window.retrieverInspectDog?.ready(), null, { timeout: 65_000 })
    for (const asset of release.assets.filter(asset => /^(icons|branding)\//.test(asset.path) ||
      asset.id === 'terrain-worker.js' || asset.id === 'instruments.mp3')) {
      assert.ok(await page.evaluate(async path => (await fetch(new URL(path, document.baseURI))).ok, asset.path), asset.id)
    }
    await page.addStyleTag({ content: '#collision-debug, .practice-status { display: none }' })
    await page.waitForFunction(() => !document.getElementById('primary').disabled)
    await page.locator('#running-version').filter({ hasText: release.app.id }).waitFor()
    await page.locator('#running-version').evaluate(footer => {
      const box = footer.getBoundingClientRect()
      if (box.top < 0 || box.bottom > innerHeight) throw new Error('Clipped footer')
    })
    await page.screenshot({ path: resolve(output, 'title.png'), scale: 'css' })
    await page.goto(startUrl + '&inspect=kennel')
    await page.locator('.kennel-breeds > summary').tap()
    const prestige = page.locator('.kennel-master-hunter')
    await prestige.getByText('Locked · Level 100 and Master Hunter qualification').waitFor()
    await prestige.locator('img').first().evaluate(image => image.decode())
    await prestige.screenshot({ path: resolve(output, 'master-hunter.png'), scale: 'css' })
    const last = page.locator('.kennel-items button').last()
    await last.scrollIntoViewIfNeeded()
    await last.tap()
    assert.ok(await page.locator('.kennel-selection').isVisible())
    const stage = page.locator('.kennel-stage')
    const counts = []
    const full = { distance: 6.05, height: 1.28, focus: .78 }
    const view = async (name, yaw, framing = full) => {
      // Give the selected view a larger inspected stage without changing the
      // shipping small-screen Kennel or its equipment controls.
      await page.addStyleTag({ content: '.kennel-stage { height: 278px }' })
      await stage.scrollIntoViewIfNeeded()
      await page.evaluate(framing => window.retrieverInspectDog.orbit(framing), { ...framing, yaw })
      await page.waitForTimeout(450)
      await stage.screenshot({ path: resolve(output, name + '.png'), scale: 'css' })
    }
    for (const [name, yaw] of [
      ['front', 0], ['left', Math.PI / 2], ['right', -Math.PI / 2], ['rear', Math.PI],
      ['front-quarter', .62], ['rear-quarter', 2.38],
    ]) await view('boyd-' + name, yaw)
    await view('boyd-face', .18, { distance: 2.60, height: 1.40, focus: 1.21, lateral: -.97 })
    await view('boyd-collar', .65, { distance: 2.65, height: 1.06, focus: .99, lateral: -.63 })
    counts.push(await page.evaluate(() => window.retrieverInspectDog.resources()))
    for (const [label, breed, name] of [
      ['Labrador', 'lab', 'lab-front-quarter'], ['Pointer', 'pointer', 'pointer-front-quarter'],
      ['Boyd + vest', 'boyd', 'boyd-vest'], ['Master Hunter bandana', 'boyd', 'boyd-bandana'],
    ]) {
      if (await page.locator('.kennel-breeds').getAttribute('open') === null) await page.locator('.kennel-breeds > summary').tap()
      await Promise.all([page.waitForNavigation(), page.getByRole('link', { name: label, exact: true }).tap()])
      await page.waitForFunction(breed => window.retrieverInspectDog?.breed === breed && window.retrieverInspectDog.ready(),
        breed, { timeout: 65_000 })
      await view(name, .66)
      counts.push(await page.evaluate(() => window.retrieverInspectDog.resources()))
    }
    assert.ok(counts.every(sample => sample.geometries < 120 && sample.textures < 32))
    await writeFile(resolve(output, 'boyd-review.json'), JSON.stringify({ build: release.app, offline: true, counts }, null, 2))
    console.log(engine.name() + ' verified locked Boyd, offline branding and Labrador → Pointer → Boyd inspection')
  } else if (args.includes('wildlife-breaks')) {
    const seed = 14
    const inputs = guidedInputs(seed, 16)
    const replay = () => page.evaluate(inputs => {
      window.phaseThreeQA.natural = { inputs, next: 0, samples: [], sights: [] }
    }, inputs)
    const elapsed = time => page.waitForFunction(time =>
      window.retrieverDebug?.mode === 'running' && window.retrieverDebug.elapsed >= time, time, { timeout: 60_000 })
    const snapshot = () => page.evaluate(() => ({ perf: window.retrieverPerformance(),
      state: window.retrieverDebug, takenAt: performance.now() }))
    const noWarmup = (from, to) => assert.ok(!to.perf.operations.some(event =>
      event.at >= from.takenAt && /^wildlife-(warm|rig-setup)/.test(event.name)),
    'wildlife ran rig or GPU preparation on the active clock')
    const activate = async id => {
      await page.evaluate(id => document.getElementById(id).addEventListener('click', () => {
        window.phaseThreeQA.startedAt = performance.now()
      }, { once: true, capture: true }), id)
      await page.locator('#' + id).tap()
      return { takenAt: await page.evaluate(() => window.phaseThreeQA.startedAt) }
    }
    await openAt(0, seed)
    if (args.includes('offline')) await context.setOffline(true)
    await replay()
    const coldStart = await activate('primary')
    await elapsed(1)
    const quick = await snapshot()
    await page.evaluate(() => window.phaseThreeQA.setBackground(true))
    await page.locator('#game[data-mode="paused"]').waitFor()
    const backgrounded = await snapshot()
    console.log(engine.name() + ' paused a cold hunt with the clock stopped')
    await page.waitForTimeout(400)
    assert.equal((await snapshot()).state.elapsed, backgrounded.state.elapsed)
    await page.evaluate(() => window.phaseThreeQA.setBackground(false))
    await page.locator('#settings').tap()
    await page.locator('#quality').selectOption('low')
    await page.locator('#quality').selectOption('balanced')
    await page.locator('#close-settings').tap()
    await page.waitForFunction(() => window.retrieverPerformance().wildlifeModels.models.some(model =>
      model.id === 'mallard' && model.prepared.geometries === model.prepared.geometryTotal), null, { timeout: 60_000 }).catch(async error => {
      const { perf, state } = await snapshot()
      console.error(JSON.stringify({ mode: state.mode, preset: perf.preset, models: perf.wildlifeModels,
        last: perf.operations.slice(-8),
        blocked: await page.evaluate(() => ({ hidden: document.hidden, dialogs: [...document.querySelectorAll('dialog[open]')].map(d => d.id) })) }))
      throw error
    })
    console.log(engine.name() + ' prepared a mallard during the pause')
    const paused = await snapshot()
    const resumeStart = await activate('primary')
    await elapsed(15)
    const resumed = await snapshot()
    noWarmup(coldStart, backgrounded)
    noWarmup(resumeStart, resumed)
    assert.ok(resumed.perf.wildlifeModels.rigEncounters > quick.perf.wildlifeModels.rigEncounters)
    // The player misses a later hazard and starts another hunt from Hunt Over.
    await page.evaluate(() => { window.phaseThreeQA.natural.inputs = [] })
    await page.locator('#run-again').waitFor({ timeout: 45_000 })
    const over = await snapshot()
    await replay()
    const restartStart = await activate('run-again')
    await elapsed(13)
    const restarted = await snapshot()
    noWarmup(restartStart, restarted)
    for (const { perf } of [quick, backgrounded, paused, resumed, over, restarted]) {
      assert.ok(perf.wildlifeModels.resident <= 2)
    }
    assert.ok(restarted.perf.wildlifeModels.rigEncounters > resumed.perf.wildlifeModels.rigEncounters)
    await writeFile(resolve(output, 'wildlife-breaks.json'), JSON.stringify({ quick, backgrounded, paused, resumed, over, restarted }))
    console.log(engine.name() + ' passed wildlife preparation and replay across safe breaks')
  } else if (args.includes('natural-review')) {
    const seed = Number(args.find(a => a.startsWith('seed='))?.slice(5) ?? 7)
    const requested = Number(args.find(a => a.startsWith('from='))?.slice(5) ?? 0)
    const duration = Number(args.find(a => a.startsWith('seconds='))?.slice(8) ?? 22)
    const dwell = Number(args.find(a => a.startsWith('menu='))?.slice(5) ?? 0)
    const finish = requested + duration
    let from = requested
    let inputs, lastError
    for (let shift = 0; shift <= (from ? 4 : 0) && !inputs; shift += .125) {
      try {
        from = Math.max(0, requested - shift)
        inputs = guidedInputs(seed, finish + 1, distanceAtTime(from))
      } catch (error) { lastError = error }
    }
    if (!inputs) throw lastError
    const distance = distanceAtTime(from)
    await openAt(distance, seed)
    await page.evaluate(inputs => { window.phaseThreeQA.natural = { inputs, next: 0, samples: [], sights: [] } }, inputs)
    if (args.includes('version-proof')) {
      const footer = page.locator('#running-version')
      assert.ok(await footer.evaluate(element => {
        const box = element.getBoundingClientRect()
        return box.top >= 0 && box.bottom <= innerHeight && box.height > 0
      }))
      await page.screenshot({ path: resolve(output, 'version-footer.png'), scale: 'css' })
    }
    // Ordinary title dwell models a player looking at the menu before starting.
    // The run always advances on the real browser frame clock.
    if (dwell) await page.waitForTimeout(dwell)
    const begin = (performance.now() - recordingStarted) / 1000
    const before = await page.evaluate(() => window.retrieverPerformance())
    await page.locator('#primary').tap()
    await page.waitForFunction(finish => window.retrieverDebug?.mode === 'over' || window.retrieverDebug?.elapsed >= finish,
      finish, { timeout: (duration * 3 + 30) * 1000 })
    const after = await page.evaluate(() => ({ state: window.retrieverDebug, perf: window.retrieverPerformance(),
      samples: window.phaseThreeQA.natural.samples, sights: window.phaseThreeQA.natural.sights }))
    await writeFile(resolve(output, 'natural.json'), JSON.stringify({ seed, from, finish, begin, before, ...after }))
    assert.equal(after.state.mode, 'running', JSON.stringify(after.state.contact))
    await capture('natural-end', { seed })
  } else if (args.includes('working-dogs')) {
    const breed = args.includes('pointer') ? 'pointer' : 'lab'
    await openAt(0, 7)
    await page.screenshot({ path: resolve(output, 'title.png'), scale: 'css' })
    await page.locator('#open-lodge').tap()
    await page.locator('#tab-kennel').tap()
    const stage = page.locator('.kennel-stage')
    await stage.locator('canvas').waitFor()
    if (args.includes('touch-orbit') && engine === chromium) {
      const box = await stage.boundingBox()
      const cdp = await context.newCDPSession(page)
      const x = Math.round(box.x + box.width * .25)
      const y = Math.round(box.y + box.height * .52)
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 65, y }] })
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await page.waitForTimeout(450)
      await stage.screenshot({ path: resolve(output, 'touch-rotation.png'), scale: 'css' })
      await cdp.detach()
      await page.locator('#close-lodge').tap()
      await page.locator('#open-lodge').tap()
      await page.locator('#tab-kennel').tap()
    }
    await stage.focus()
    for (const [angle, presses, key] of [['three-quarter', 0, 'ArrowRight'], ['front', 2, 'ArrowLeft'],
      ['side', 3, 'ArrowRight'], ['rear', 3, 'ArrowRight']]) {
      if (args.includes('baseline-dog') && angle !== 'three-quarter') break
      for (let step = 0; step < presses; step++) await page.keyboard.press(key)
      await page.waitForTimeout(500)
      await stage.screenshot({ path: resolve(output, angle + '.png'), scale: 'css' })
    }
    await page.locator('[data-category="vest"]').tap()
    await page.locator('[data-gear="blaze-vest"]').tap()
    await page.locator('.kennel-selection').getByRole('button', { name: 'View preview' }).tap()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(450)
    await stage.screenshot({ path: resolve(output, 'vest.png'), scale: 'css' })
    await page.locator('[data-category="coat"]').tap()
    const coats = page.locator('.kennel-items button')
    const coatCount = await coats.count()
    for (let index = 0; index < coatCount; index++) {
      const card = coats.nth(index)
      const id = await card.getAttribute('data-gear')
      await card.tap()
      await page.locator('.kennel-selection').getByRole('button', { name: 'View preview' }).tap()
      await page.waitForTimeout(120)
      if (breed === 'lab') await stage.screenshot({ path: resolve(output, 'coat-' + id + '.png'), scale: 'css' })
    }
    await page.locator('#close-lodge').tap()
    await page.locator('#primary').tap()
    await settle(0, quality)
    await capture('gameplay', { breed })
    console.log(`Rendered ${breed} at four angles, ${coatCount} coat cards and gameplay`)
  } else if (args.includes('texture-replays')) {
    const { planEncounter } = await fromSource('wildlife-encounters')
    const seed = args.includes('reuse') ? 23 : 1
    const encounter = planEncounter(buildTile(12, seed), seed)
    assert.equal(encounter.species, 'mallard')
    // Start far enough away to give the existing prefetch window time to
    // resolve the skinned rig on every replay, including on software WebGL.
    const reuse = args.includes('reuse')
    const start = encounter.distance - (reuse ? 58 : 42)
    await runAt(start, seed)
    const samples = []
    for (let hunt = 0; hunt < 5; hunt++) {
      await page.evaluate(distance => { window.phaseThreeQA.limit = distance }, start + (reuse ? 25 : 8))
      await page.waitForFunction(() => window.retrieverDebug?.wildlife?.model && window.retrieverDebug.wildlife.drawn > 0,
        null, { timeout: 40_000 }).catch(async error => {
        console.error(await page.evaluate(() => ({ mode: document.querySelector('#game').dataset.mode,
          distance: window.retrieverDebug.distance, wildlife: window.retrieverDebug.wildlife,
          assets: window.retrieverPerformance().wildlifeModels })))
        throw error
      })
      const active = await page.evaluate(() => window.retrieverPerformance())
      await stepTo(encounter.distance + (reuse ? 53 : 10))
      await page.waitForFunction(() => window.retrieverDebug?.wildlife == null)
      const retired = await page.evaluate(() => window.retrieverPerformance())
      samples.push({ hunt: hunt + 1, active, retired })
      console.log(`Hunt ${hunt + 1}: ${active.textures} textures with mallard, ${retired.textures} after retirement`)
      await page.evaluate(({ distance, reuse }) => {
        window.phaseThreeQA.limit = distance + (reuse ? 150 : 65)
        if (reuse) window.phaseThreeQA.advanceBy = 116
      }, { distance: encounter.distance, reuse })
      await page.locator('#run-again').waitFor({ timeout: 120_000 })
      await page.evaluate(() => { window.phaseThreeQA.advanceBy = undefined })
      if (hunt < 4) {
        await page.locator('#run-again').tap()
      }
    }
    await writeFile(resolve(output, 'texture-replays.json'), JSON.stringify(samples, null, 2) + '\n')
    if (args.includes('expect-bounded')) checkTextureReplays(samples, reuse)
  } else if (args.includes('restart-cycle')) {
    const cycles = Number(args.find(argument => argument.startsWith('cycles='))?.slice(7) ?? 60)
    assert.ok(Number.isInteger(cycles) && cycles >= 1 && cycles <= 100)
    await openAt(0, 7)
    if (args.includes('offline')) await context.setOffline(true)
    const before = await page.evaluate(() => localStorage.getItem('retriever-run.record'))
    const samples = []
    for (let cycle = 0; cycle < cycles; cycle++) {
      await page.evaluate(() => {
        window.phaseThreeQA.soak = { inputs: [], duration: 12, fast: true, precise: true, next: 0, nextSample: 0, samples: [] }
      })
      await page.locator(cycle ? '#run-again' : '#primary').click()
      await page.locator('#field-report').waitFor({ timeout: 120_000 }).catch(async error => {
        console.error(await page.evaluate(() => ({ mode:window.retrieverDebug?.mode, elapsed:window.retrieverDebug?.elapsed,
          hunt:window.retrieverPerformance()?.hunt, errors:document.querySelector('#content-screen')?.open })))
        throw error
      })
      const result = await page.evaluate(() => {
        const p = window.retrieverPerformance()
        return { hunt: p.hunt, restart: p.restart, restartTrace: p.restartTrace,
          final: { geometries:p.geometries, textures:p.textures, programs:p.programs, tiles:p.residentTiles,
            wildlife:p.wildlifeModels.resident, pool:p.trailPool },
          contact:window.retrieverDebug.impact ?? window.retrieverDebug.contact }
      })
      samples.push(result)
      if ((cycle + 1) % 10 === 0) console.log('Completed ' + (cycle + 1) + ' restart cycles')
    }
    assert.equal(await page.evaluate(() => localStorage.getItem('retriever-run.record')),before)
    assert.equal(samples.at(-1).hunt.id,cycles)
    assert.ok(samples.every(sample => sample.final.tiles <= 7 && sample.final.wildlife <= 2))
    await writeFile(resolve(output, 'restart-cycles.json'), JSON.stringify({ seed:7, quality, cycles, samples }, null, 2))
  } else if (args.includes('soak')) {
    const duration = Number(args.find(arg => arg.startsWith('seconds='))?.slice(8) ?? 45)
    assert.ok(Number.isInteger(duration) && duration >= 15 && duration <= 480)
    const seed = 7
    const inputs = guidedInputs(seed, duration)
    const precise = args.includes('precise')
    if (precise) await openAt(0, seed)
    else await runAt(0, seed)
    await page.evaluate(({ inputs, duration, fast, precise }) => {
      window.phaseThreeQA.soak = { inputs, duration, fast, precise, next: 0, nextSample: 0, samples: [] }
    }, { inputs, duration, fast: args.includes('fast'), precise })
    if (precise) {
      if (args.includes('offline')) await context.setOffline(true)
      await page.locator('#primary').tap()
    }
    for (let checkpoint = Math.min(15, duration);; checkpoint = Math.min(checkpoint + 15, duration)) {
      await page.waitForFunction(value => ['over', 'paused'].includes(window.retrieverDebug?.mode) ||
        window.retrieverDebug?.elapsed >= value, checkpoint, { timeout: 240_000 })
      const state = await page.evaluate(() => window.retrieverDebug)
      console.log(`Rendered ${state.elapsed.toFixed(2)} seconds (${state.mode})`)
      await writeFile(resolve(output, 'soak-checkpoint.json'), JSON.stringify({ elapsed: state.elapsed, stage: stageAt(state.elapsed).level,
        quality, acceleratedClock: args.includes('fast'), offline: args.includes('offline') }) + '\n')
      if (args.includes('territory-evidence') && state.mode === 'running' && checkpoint % 30 === 15) {
        const region = expeditionRegions[Math.floor(checkpoint / 30)]
        if (region) await capture('journey-' + region.key, { sampledAfter: checkpoint })
      }
      if (checkpoint === duration || state.mode !== 'running') break
    }
    const soak = await page.evaluate(() => ({ ...window.phaseThreeQA.soak, state: window.retrieverDebug }))
    const endPerformance = await page.evaluate(() => window.retrieverPerformance())
    await writeFile(resolve(output, 'soak.json'), JSON.stringify({ engine: engine.name(), seed, duration,
      offline: args.includes('offline'), quality, executed: soak.next, samples: soak.samples, elapsed: soak.state.elapsed,
      renderedEnd: endPerformance }, null, 2) + '\n')
    assert.equal(soak.state.mode, 'running', JSON.stringify(soak.state))
    assert.ok(soak.samples.length >= duration, 'insufficient rendered samples')
    const living = 'wildlife' in soak.state
    // The precise route can start before lookahead fills, while the
    // playable initial tiles are already ready. From two seconds onward
    // retain the same lower bound as the settled route.
    // Phase 09 software reached 122 geometries, so use the current budget.
    assert.ok(soak.samples.every(({ elapsed, tiles, packs, textures, geometries }) =>
      tiles <= 7 && tiles >= (living ? (elapsed < 2 ? 3 : 5) : 7) && packs <= (living ? 3 : 2) &&
      textures <= (living ? 34 : 18) && geometries <= (living ? 130 : 90)), 'unexpected scene resource growth')
    await capture('soak-finish', { seed, duration, executed: soak.next })
  } else if (args.includes('landmark-pass')) {
    const keys = args.filter(a => a.startsWith('only=')).map(a => a.slice(5))
    const selected = expeditionRegions.filter(r => keys.length ? keys.includes(r.key) : ['gulf','cypress','farm'].includes(r.key))
    for (const region of selected) {
      const first = Math.ceil(region.marker / 30)
      let pair
      for (let seed = 1; seed <= 96 && !pair; seed++) {
        const rows = rowsFor(seed, region.seconds + 32)
        const hazards = rows.flatMap(row => row.entities).filter(item => item.hazard)
        for (let i = first; i < first + 16; i++) {
          const tile = buildTile(i, i < 3 ? 0 : seed)
          if (tile.territory !== region.key || !tile.landmark) continue
          const marker = tile.landmark.distance
          const start = marker - 77
          if (start < region.marker + 1) continue
          const finish = (i + 2) * 30 + 3
          const localHazards = hazards.filter(item => item.distance > start - 35 && item.distance < finish + 10)
          const run = { ...newRun(), distance: start }
          // Match practice seek's elapsed time so the goose trajectory is also checked.
          let lo = region.seconds, hi = region.seconds + 33
          for (let iteration = 0; iteration < 32; iteration++) {
            const half = (lo + hi) * .5
            if (distanceAtTime(half) < start) lo = half
            else hi = half
          }
          run.elapsed = hi
          run.speed = speedAtTime(hi)
          let hit
          while (run.distance < finish && !hit) {
            const previous = { ...run }
            advance(run, tickSeconds)
            hit = firstContact(previous, run, localHazards, {})
          }
          if (!hit) { pair = { seed, tile, start, finish }; break }
        }
      }
      assert.ok(pair, 'No clear center-lane coast through ' + region.key)
      const { seed, tile, start, finish } = pair
      const at = tile.landmark.distance
      await runAt(start, seed)
      await page.evaluate(index => { window.phaseThreeQA.inspectLandmark = index }, tile.index)
      for (const [label, distance] of [['approach',at - 56],['handoff',at - 46],['near',at - 26],['pass',at - 4],
        ['depart',at + 11],['recycled',finish]]) {
        await stepTo(distance)
        await capture(region.key + '-' + label, { landmark: tile.landmark, seed, index: tile.index })
      }
      const check = await page.evaluate(() => {
        const qa = window.phaseThreeQA
        qa.inspectLandmark = undefined
        return qa.landmarkFrames
      })
      await writeFile(resolve(output, region.key + '-lifetime.json'), JSON.stringify(check))
      if (tile.landmark.id && await page.evaluate(() => Boolean(window.retrieverPerformance()?.surfaces))) {
        const active = check.filter(frame => frame.distance < (tile.index + 2) * 30 - 1)
        assert.ok(active.length > 16, region.key)
        assert.equal(new Set(active.map(frame => frame.geometry)).size, 1, 'geometry replaced in view')
        assert.ok(active.every(frame => frame.id === tile.landmark.id && frame.opaque), 'landmark split or hidden in view')
        assert.ok(check.some(frame => frame.distance > (tile.index + 2) * 30 && !frame.id), 'tile never left the render window')
      }
    }
  } else if (args.includes('presets-fresh')) {
    for (const selected of ['balanced','high','low']) {
      await runAt(distanceAtTime(36), 7, selected)
      await capture(selected + '-cypress', { seed: 7, selected })
    }
  } else if (args.includes('presets')) {
    const region = args.includes('gulf') ? 'gulf' : 'cypress'
    await runAt(region === 'gulf' ? 79 : distanceAtTime(36), 7)
    await capture('balanced-' + region)
    for (const selected of ['high', 'low', 'auto']) {
      await page.locator('#settings').tap()
      await page.locator('#quality').selectOption(selected)
      await page.locator('#close-settings').tap()
      await page.evaluate(() => { window.phaseThreeQA.limit = window.retrieverDebug.distance })
      await page.bringToFront()
      await page.locator('#game[data-mode="paused"] #primary').click()
      await page.waitForFunction(() => {
        const mode = document.querySelector('#game')?.dataset.mode
        return mode === 'over' || window.retrieverDebug?.mode === 'running'
      }, null, { polling: 250, timeout: 45_000 })
      assert.equal(await page.locator('#game').getAttribute('data-mode'), 'running',
        JSON.stringify(await page.evaluate(() => window.retrieverDebug)))
      await page.waitForFunction(({ selected, region }) => {
        const surfaces = window.retrieverPerformance()?.surfaces
        if (region === 'gulf' && !surfaces?.gulfAtlas) return false
        if (!surfaces || selected === 'auto' && !surfaces.pending ||
          surfaces.active === (selected === 'low' ? 'compact' : 'full')) return true
        // Battery Saver can skip draws once the fixture stops the game clock.
        // Request a normal redraw so an async decode updates its live metrics.
        window.dispatchEvent(new Event('resize'))
        return false
      }, { selected, region }, { polling: 300, timeout: 40_000 }).catch(async error => {
        console.error(await page.evaluate(() => ({ render: window.retrieverPerformance()?.surfaces,
          mode: document.querySelector('#game')?.dataset.mode, quality: document.querySelector('#quality')?.value,
          distance: window.retrieverDebug?.distance, limit: window.phaseThreeQA.limit,
          assets: performance.getEntriesByType('resource').filter(x => x.name.includes('field-atlas')).map(x => x.name.split('/').at(-1)) })))
        throw error
      })
      await capture(selected + '-' + region)
    }
  } else if (args.includes('living')) {
    const { planEncounter } = await fromSource('wildlife-encounters')
    const defaults = [['mallard','gulf'],['pheasant','farm'],['deer','farm'],['crane','platte'],
      ['canada-goose','sandhills'],['moose','boreal'],['eagle','foothills'],['alligator','cypress']]
    const selected = args.filter(arg => arg.startsWith('only=')).map(arg => arg.slice(5))
    for (const [id, territory] of defaults) {
      if (selected.length && !selected.includes(id)) continue
      const region = expeditionRegions.find(row => row.key === territory)
      const first = Math.max(4, Math.ceil(region.marker / 120) * 4)
      const last = Math.floor(distanceAtTime(region.seconds + 29) / 30)
      let fixture
      for (let tile = first; tile <= last && !fixture; tile += 4) {
        const sample = buildTile(tile, 7)
        for (let seed = 1; seed < 900 && !fixture; seed++) {
          if (planEncounter(sample, seed)?.species !== id) continue
          const event = planEncounter(buildTile(tile, tile < 3 ? 0 : seed), seed)
          if (event?.species !== id || event.distance < region.marker + 45) continue
          const start = Math.max(0, event.distance - 43)
          const end = event.distance - (id === 'pheasant' ? 16 : 21)
          let left = 0, right = region.seconds + 35
          for (let n = 0; n < 30; n++) {
            const middle = (left + right) * .5
            if (distanceAtTime(middle) < start) left = middle
            else right = middle
          }
          const run = { ...newRun(), elapsed: right, distance: start, speed: speedAtTime(right) }
          const hazards = rowsFor(seed,region.seconds+40).flatMap(row => row.entities)
            .filter(item => item.hazard && item.distance >= start - 30 && item.distance <= end + 30)
          let hit
          while (run.distance < end + 2 && !hit) {
            const prior = { ...run }
            advance(run,tickSeconds)
            hit = firstContact(prior,run,hazards,{})
          }
          if (!hit) fixture = { seed, event, start, end }
        }
      }
      assert.ok(fixture,id)
      const { seed, event, start, end } = fixture
      await runAt(start,seed)
      await stepTo(Math.max(start+1, event.distance-27))
      await capture(id+'-approach',{ seed, planned: event })
      await stepTo(end)
      await capture(id+'-animal',{ seed, planned: event })
      assert.equal(results.at(-1).wildlife?.species,id)
      assert.ok(results.at(-1).wildlife.drawn > 0,id)
    }
  } else if (args.includes('sign-run')) {
    let fixture
    for (let index = 4; index < 48 && !fixture; index++) {
      const { sign } = buildTile(index, 1)
      if (!sign) continue
      for (let seed = 1; seed <= 12 && !fixture; seed++) {
        const start = sign.distance - 26
        const end = sign.distance - 12
        const hazards = rowsFor(seed, 84).flatMap(row => row.entities).filter(item => item.hazard)
        let clear = true
        for (let distance = start; distance < end && clear; distance += .5) {
          const pose = { ...newRun(), distance }
          clear = !firstContact(pose, pose, hazards, {})
        }
        if (clear) fixture = { seed, start, end, sign }
      }
    }
    assert.ok(fixture)
    await runAt(fixture.start, fixture.seed)
    await capture('sign-approach', fixture)
    await stepTo(fixture.end)
    await capture('sign-near', fixture)
    assert.ok(results.at(-1).signs.some(sign => sign.distance === fixture.sign.distance))
  } else if (args.includes('dog-actions')) {
    await runAt(5, 7)
    await stepTo(6.5)
    await capture('gallop')
    await page.keyboard.press('ArrowUp')
    await stepTo(10.5)
    await capture('jump')
    await stepTo(18)
    await page.keyboard.press('ArrowDown')
    await stepTo(21)
    await capture('slide')
  } else if (args.includes('grain-shed')) {
    const seed = 7
    const marker = buildTile(234, seed).landmark
    assert.equal(marker.role, 'grain-elevator')
    await runAt(6986, seed)
    await capture('dakota-grain-approach', { seed, marker })
    await runAt(7007, seed)
    await capture('dakota-grain-7007m', { seed, marker })
  } else if (args.includes('neighbor-timber')) {
    const seed = 73
    const target = rowsFor(seed, 59).find(row => row.at > 960 && row.at < 978 && row.entities.filter(entity => entity.type === 'fallen').length === 2)
    assert.ok(target)
    await runAt(target.at - 23, seed)
    await capture('paired-approach', { seed, target: target.at })
    await stepTo(target.at - 11)
    await capture('paired-955m', { seed, target: target.at })
    await stepTo(target.at - 5)
    await capture('paired-close', { seed, target: target.at })
  } else if (args.includes('water-crossings') || args.includes('root-plate')) {
    const candidates = args.includes('root-plate') ? ['cypress','flyway','parklands'] : ['gulf','cypress','platte','mountain']
    const type = args.includes('root-plate') ? 'fallen' : 'stream'
    for (const key of candidates) {
      if (args.some(arg => arg.startsWith('only=')) && !args.includes('only=' + key)) continue
      const region = expeditionRegions.find(item => item.key === key)
      let fixture
      for (let seed=1; seed<21 && !fixture; seed++) {
        const rows = rowsFor(seed,region.seconds+29)
        const candidates = rows.filter(row=>row.time >= region.seconds+1)
          .flatMap(row=>row.entities).filter(item=>item.hazard && item.type===type)
        const hazards = rows.flatMap(row=>row.entities).filter(item=>item.hazard)
        for (const item of candidates) {
          const start = item.distance - (type === 'fallen' ? 18 : 15)
          const end = item.distance - (type === 'fallen' ? 6 : 7.5)
          let clear = true
          for (let distance=start; distance<=end && clear; distance+=.4) {
            const pose = { ...newRun(), distance }
            clear = !firstContact(pose,pose,hazards,{})
          }
          if (clear) { fixture = { seed, item, start, end }; break }
        }
      }
      assert.ok(fixture,key)
      const { seed, item, start, end } = fixture
      await runAt(start,seed)
      await capture(key+'-approach',{ seed, target: item.distance })
      await stepTo(end)
      await capture(key+'-close',{ seed, target: item.distance })
    }
  } else if (args.includes('equipment')) {
    for (const [type, from, to] of [['tractor', 150, 180], ['snowmobile', 392, 449], ['log', 40, 58]]) {
      const selected = args.find(arg => arg.startsWith('only='))
      if (selected && selected !== 'only=' + type) continue
      let example
      for (let seed = 1; seed <= 24 && !example; seed++) {
        for (const row of rowsFor(seed, to)) {
          if (row.time < from) continue
          const item = row.entities.find(entity => entity.hazard && entity.type === type && entity.lane !== 0)
          if (!item) continue
          const distance = item.distance - (type === 'log' ? 5 : 6.75)
          const pose = { ...newRun(), distance }
          const hazards = rowsFor(seed, to).flatMap(row => row.entities).filter(entity => entity.hazard &&
            Math.abs(entity.distance - distance) < 44)
          if (firstContact(pose, pose, hazards, {})) continue
          example = { seed, item, distance }
          break
        }
      }
      assert.ok(example, type)
      await runAt(example.distance, example.seed)
      await capture('view-' + type, { seed: example.seed, target: example.item.distance, lane: example.item.lane })
    }
  } else if (args.includes('timber')) {
    const targets = isPhaseThree ? ['branch','leaning-tree','fallen','drift','snowmobile'] : ['branch','leaning-tree','fallen','drift']
    for (const type of targets) {
      if (args.some(arg => arg.startsWith('only=')) && !args.includes('only=' + type)) continue
      const samples = []
      for (let seed = 1; seed <= 13; seed++) {
        const rows = rowsFor(seed, type === 'snowmobile' ? 465 : 62)
        for (const row of rows) {
          if (type !== 'snowmobile' && (row.time < 33 || row.time > 58.9)) continue
          const item = row.entities.find(item => item.type === type && item.hazard && (type !== 'branch' || item.lane === 0) &&
            (type !== 'snowmobile' || item.lane !== 0))
          if (item) samples.push({ seed, item })
        }
      }
      samples.sort((a, b) => Math.abs(a.item.distance - 851) - Math.abs(b.item.distance - 851))
      const { seed, item } = samples[0]
      await runAt(item.distance - (type === 'snowmobile' ? 5.9 : 9.5), seed)
      await capture('obstacle-' + type, { seed, target: item.distance, lane: item.lane })
    }
  } else if (args.includes('transitions')) {
    const duration = courseStages.length * 15
    const courses = new Map()
    const boundaries = [...expeditionRegions.slice(1).map(region => region.seconds), duration]

    // Select a center-lane coast with the actual collision solver. This
    // isolates each visual seam. The stress suite tests timed actions
    // and lane changes over the same boundaries in separate runs.
    function crossingSeed(seconds) {
      const elapsed = seconds - .55
      const distance = distanceAtTime(elapsed)
      const end = distanceAtTime(seconds + .63)
      for (let seed = 1; seed <= 128; seed++) {
        if (!courses.has(seed)) courses.set(seed, rowsFor(seed, duration + 30))
        const hazards = courses.get(seed).flatMap(row => row.entities)
          .filter(item => item.hazard && item.distance >= distance - 3 && item.distance <= end + 3)
        const run = { ...newRun(), elapsed, distance, speed: speedAtTime(elapsed) }
        const previous = {}
        let hit
        while (run.distance < end && !hit) {
          Object.assign(previous, run)
          advance(run, tickSeconds)
          hit = firstContact(previous, run, hazards, {})
        }
        if (!hit) return seed
      }
      throw new Error('No center-lane coast around ' + seconds + ' s')
    }

    for (const seconds of boundaries) {
      const key = seconds === duration ? 'endless' : expeditionRegions[seconds / 30].key
      if (args.some(arg => arg.startsWith('only=')) && !args.includes('only=' + key)) continue
      const start = distanceAtTime(seconds - .55)
      const seed = crossingSeed(seconds)
      await runAt(start, seed)
      await stepTo(distanceAtTime(seconds - .28))
      await capture('transition-' + key + '-before', { seconds, seed })
      await stepTo(distanceAtTime(seconds + .46))
      await capture('transition-' + key + '-after', { seconds, seed, expectedStage: stageAt(seconds).level })
      assert.equal(results.at(-1).stageLabel, stageAt(seconds).level + ' / ' + courseStages.length)
      assert.equal(results.at(-1).hud, expeditionRegions[Math.min(expeditionRegions.length - 1, seconds / 30)].name)
    }
  } else {
    const seed = 7
    const end = courseStages.length * 15 + 10
    const hazards = rowsFor(seed, end).flatMap(row => row.entities).filter(item => item.hazard)
    const safeView = (desired, minimum) => {
      for (const offset of [0, 1.75, -1.75, 3.5, -3.5, 5.25, -5.25, 7.0, -7.0, 10]) {
        if (desired + offset < minimum) continue
        const pose = { ...newRun(), distance: desired + offset }
        if (!firstContact(pose, pose, hazards, {})) return pose.distance
      }
      throw new Error('No clear approach view near ' + desired)
    }
    for (const region of expeditionRegions) {
      if (args.some(arg => arg.startsWith('only=')) && !args.includes('only=' + region.key)) continue
      if (!args.includes('landmarks-only')) {
        const start = region.seconds === 0 ? 3 : distanceAtTime(region.seconds + 6)
        await runAt(safeView(start, region.marker), seed)
        await capture(region.key + '-approach', { region: region.name, seed })
      }
      if (!isPhaseThree || args.includes('approaches')) continue
      const low = Math.ceil(region.marker / 30)
      const lookahead = Math.ceil(distanceAtTime(region.seconds + 26) / 30)
      let marker
      for (let i = low; i <= lookahead && !marker; i++) marker = buildTile(i, i < 3 ? 0 : seed).landmark
      assert.ok(marker, region.key + ' landmark placement')
      const view = Math.max(region.marker + 2, marker.distance - (region.key === 'gulf' || region.key === 'farm' ? 8 : 13))
      await runAt(safeView(view, region.marker + 1), seed)
      assert.ok(await page.evaluate(role => window.retrieverDebug.world.some(t => t.landmark?.role === role), marker.role))
      await capture(region.key + '-landmark', { region: region.name, marker, seed })
    }
  }
  assert.deepEqual(errors, [])
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ engine: engine.name(), viewport, quality, offline: args.includes('offline'), results }, null, 2) + '\n')
  await context.close()
} finally {
  await browser.close()
  await new Promise(done => server.close(done))
}
