import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createContentManifest, installation, resolveAssets } from '../src/content-manifest.js'
import { cachePrefix, createContentStore, digestKey } from '../src/content-store.js'
import { createFieldNotes, fieldNotes } from '../src/field-notes.js'
import { openLodge, saveKey } from '../src/lodge-save.js'
import { createWakeLock } from '../src/mobile-lifecycle.js'
import { createResourcePool } from '../src/resource-pool.js'
import { createPerformanceProbe } from '../src/performance-probe.js'

const groups = { shell: { label: 'Shell' }, trail: { label: 'Trail' } }
const scope = new URL('https://example.test/Retriever-Run/')
function fixture(id, path, body, extra = {}) {
  return { id, path, group: id === 'shell' ? 'shell' : 'trail', required: true, cache: id === 'shell' ? 'release' : 'immutable',
    bytes: Buffer.byteLength(body), sha256: createHash('sha256').update(body).digest('hex'), dependencies: [],
    variant: 'universal', license: 'original', ...extra }
}
const shell = fixture('shell', 'index.html', 'launch')
const textures = fixture('textures', 'assets/ground-123.bin', 'smooth marsh')
const engine = fixture('engine', 'assets/engine-123.js', 'const game = 1', { dependencies: ['textures'] })
const edition = (assets, version = 'ab'.repeat(10)) => ({ schema: 1, version, groups, assets })

function memoryCaches() {
  const names = new Map()
  return {
    async open(name) {
      if (!names.has(name)) {
        const files = new Map()
        names.set(name, {
          async match(key) { return files.get(String(key))?.clone() },
          async put(key, value) { files.set(String(key), value.clone()) },
          async delete(key) { return files.delete(key) },
        })
      }
      return names.get(name)
    },
    async match(key) {
      for (const store of names.values()) {
        const item = await store.match(key)
        if (item) return item
      }
    },
  }
}

test('content dependencies are ordered and unsafe manifests cannot escape the Pages scope', () => {
  const manifest = createContentManifest(edition([shell, engine, textures, { ...textures, id: 'optional', path: 'optional.bin', required: false }]))
  assert.deepEqual(installation(manifest).map(asset => asset.id), ['shell', 'textures', 'engine'])
  assert.deepEqual(resolveAssets(manifest, ['engine', 'textures']).map(asset => asset.id), ['textures', 'engine'])
  assert.throws(() => createContentManifest(edition([shell, engine])), /dependency/)
  assert.throws(() => createContentManifest(edition([shell, { ...engine, dependencies: ['engine'] }])), /dependency/)
  assert.throws(() => createContentManifest(edition([shell, { ...textures, path: 'assets/../api' }])), /asset/)
  assert.throws(() => createContentManifest(edition([shell, { ...textures, path: 'https://elsewhere.test/data' }])), /asset/)
  assert.throws(() => createContentManifest(edition([shell, shell])), /asset/)
})

test('partial transfers reuse verified files, repair corrupt bytes and reuse identical bytes across content editions', async () => {
  const storage = memoryCaches()
  const calls = []
  const backoff = []
  let interrupted = true
  const jobs = new Map([[shell.path, 'launch'], [textures.path, 'smooth marsh'], [engine.path, 'const game = 1']])
  const store = createContentStore(scope, { storage, wait: async ms => backoff.push(ms),
    request: async url => {
      const file = url.pathname.slice(scope.pathname.length)
      calls.push(file)
      if (file === textures.path && interrupted) return new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('smooth'))
          controller.close()
        },
      }))
      return new Response(jobs.get(file), { headers: { 'Content-Type': 'text/javascript' } })
    },
  })
  const manifest = createContentManifest(edition([shell, engine, textures]))
  const progress = []
  await assert.rejects(store.prepare(manifest, event => progress.push(event)), { code: 'integrity' })
  assert.equal((await store.inspect(manifest)).cached, shell.bytes)
  assert.deepEqual(backoff, [320, 850])
  assert.ok(progress.some(event => event.received > 0 && event.complete === shell.bytes))
  interrupted = false
  const ready = await store.prepare(manifest)
  assert.equal(ready.cached, ready.total)
  assert.equal(calls.filter(path => path === shell.path).length, 1)
  const next = createContentManifest(edition([shell, engine, { ...textures, path: 'assets/ground-456.bin' }], 'cd'.repeat(10)))
  assert.equal((await store.inspect(next)).missing.length, 0)
  const cache = await storage.open(cachePrefix(scope))
  await cache.put(digestKey(scope, textures.sha256), new Response('corrupt data'))
  assert.deepEqual((await store.inspect(manifest)).missing.map(asset => asset.id), ['textures'])
  await store.prepare(manifest)
  assert.equal((await store.inspect(manifest)).cached, ready.total)
})

test('verified legacy files promote without a transfer and storage failures surface as recoverable', async () => {
  const storage = memoryCaches()
  const legacy = await storage.open('retriever-run:legacy')
  await legacy.put(new URL(shell.path, scope), new Response('launch'))
  const store = createContentStore(scope, { storage, request() { throw Error('unexpected request') } })
  assert.equal((await store.inspect(createContentManifest(edition([shell])))).missing.length, 0)
  const assetStore = await storage.open(cachePrefix(scope))
  assetStore.put = async () => { throw new DOMException('Full', 'QuotaExceededError') }
  const limited = createContentStore(scope, { storage, request: async () => new Response('smooth marsh') })
  await assert.rejects(limited.prepare(createContentManifest(edition([shell, textures]))), { code: 'storage' })
})

test('manifest identity and authored icon sizes stay stable on the GitHub Pages subpath', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'))
  assert.equal(manifest.name, 'Retriever Run')
  assert.equal(manifest.short_name, manifest.name)
  assert.equal(new URL(manifest.start_url, new URL('manifest.webmanifest', scope)).href, scope.href)
  assert.equal(new URL(manifest.scope, new URL('manifest.webmanifest', scope)).href, scope.href)
  assert.equal(new URL(manifest.id, new URL('manifest.webmanifest', scope)).href, scope.href)
  assert.equal(manifest.display, 'standalone')
  for (const item of [...manifest.icons, { src: 'icons/apple-touch-icon.png', sizes: '180x180' }]) {
    const image = await readFile(new URL('../public/' + item.src, import.meta.url))
    assert.equal(image.toString('ascii', 1, 4), 'PNG')
    assert.equal(image.readUInt32BE(16) + 'x' + image.readUInt32BE(20), item.sizes)
  }
})

test('an interrupted save write can recover the previous validated snapshot without overwriting a newer schema', () => {
  const data = new Map([[saveKey, JSON.stringify({ best: 561, quality: 'high' })]])
  const storage = () => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) })
  const lodge = openLodge(storage)
  lodge.rename('Gulf Runner')
  lodge.current().profile.masterVolume = .24
  lodge.commit()
  data.set(saveKey, '{bad')
  const recovered = openLodge(storage)
  assert.equal(recovered.localRecovery, 'backup')
  assert.equal(recovered.current().profile.best, 561)
  assert.equal(recovered.current().nickname, 'Gulf Runner')
  recovered.commit()
  assert.equal(openLodge(storage).localRecovery, 'normal')
  const future = JSON.stringify({ version: 99, extra: 'retained' })
  data.set(saveKey, future)
  assert.equal(openLodge(storage).commit(), false)
  assert.equal(data.get(saveKey), future)
  assert.equal(lodge.commit(), false)
})

test('resource retirement disposes the decoded pack, including one still loading on release', async () => {
  const disposed = []
  let finish
  const pool = createResourcePool(key => key === 'slow' ? new Promise(resolve => { finish = resolve }) : { key },
    value => disposed.push(value.key))
  const shared = pool.request('trees')
  assert.equal(shared, pool.request('trees'))
  await shared
  assert.equal(pool.get('trees').key, 'trees')
  const stillLoading = pool.request('slow')
  await Promise.resolve()
  pool.release('slow')
  finish({ key: 'slow' })
  assert.equal(await stillLoading, null)
  pool.release('trees')
  assert.deepEqual(disposed.sort(), ['slow', 'trees'])
  assert.equal(pool.count(), 0)
  assert.equal((await pool.request('trees')).key, 'trees')
})

test('a wake request completing after backgrounding releases its lock and can be acquired on resume', async () => {
  let visible = true
  let finish
  let releases = 0
  const sentinel = () => ({ release: async () => { releases++ } })
  const wake = createWakeLock(() => new Promise(resolve => { finish = resolve }), () => visible)
  const pending = wake.set(true)
  await Promise.resolve()
  visible = false
  await wake.set(false)
  finish(sentinel())
  await pending
  assert.equal(releases, 1)
  visible = true
  const second = wake.set(true)
  await Promise.resolve()
  finish(sentinel())
  await second
  await wake.set(false)
  assert.equal(releases, 2)
})

test('field notes are sourced, filter by tag when available and avoid their last three entries', () => {
  assert.equal(new Set(fieldNotes.map(note => note.id)).size, fieldNotes.length)
  assert.ok(fieldNotes.every(note => new URL(note.source.url).protocol === 'https:' && note.text.length <= 180))
  const notes = createFieldNotes(() => 0)
  assert.equal(notes.next(['mallard']).id, 'mallard-dabble')
  const previous = ['mallard-dabble']
  for (let i = 0; i < 19; i++) {
    const next = notes.next()
    assert.ok(!previous.includes(next.id))
    previous.push(next.id)
    if (previous.length > 3) previous.shift()
  }
})

test('diagnostics exclude suspended frames and bound frame and transition history', () => {
  let now = 0
  const probe = createPerformanceProbe(() => ++now)
  probe.ready()
  probe.restart()
  const renderer = { render: { calls: 40, triangles: 998 }, memory: { textures: 9, geometries: 40 } }
  for (let frame = 0; frame < 800; frame++) probe.frame(frame === 7 ? 900 : 16, 3, renderer, String(frame))
  const observed = probe.read()
  assert.equal(observed.framesMs.samples, 720)
  assert.equal(observed.framesMs.p95, 16)
  assert.equal(observed.discarded, 1)
  assert.equal(observed.transitions.length, 20)
  assert.equal(observed.draws, 40)
})

test('slow-frame history retains resource and operation context while hunt totals reset independently', () => {
  let at = 100
  const probe = createPerformanceProbe(() => at)
  const renderer = { render: { calls: 60, triangles: 2000 }, memory: { textures: 8, geometries: 81 }, programs: [{}] }
  probe.restart()
  probe.graphics('auto', 1)
  probe.frame(16, 3, renderer, 'gulf')
  at += 17
  probe.frame(17, 4, renderer, 'gulf')
  at += 28
  probe.operation('wildlife-load-ready', 'mallard', at - 12)
  at += 35
  renderer.memory.textures += 2
  renderer.programs.push({})
  probe.frame(63, 24, renderer, 'cypress', at, 18)
  at += 10
  probe.operation('audio-decode-ready', 'mallard')
  probe.pause()
  at += 5000
  probe.frame(5010, 2, renderer, 'cypress')
  let report = probe.read()
  assert.equal(report.hunt.presentation.samples, 2)
  assert.equal(report.hunt.presentation.over50, 1)
  assert.equal(report.hunt.cpu.samples, 4)
  assert.equal(report.hunt.peakTextures, 10)
  assert.equal(report.hunt.discarded, 1)
  assert.deepEqual(report.slowFrames[0].operations.map(entry => entry.name),
    ['territory', 'wildlife-load-ready', 'territory', 'audio-decode-ready'])
  assert.equal(report.slowFrames[0].textureDelta, 2)
  assert.equal(report.slowFrames[0].programDelta, 1)
  assert.equal(report.slowFrames[0].renderMs, 18)
  probe.restart()
  for (let n = 0; n < 800; n++) {
    at += 52
    probe.operation('terrain-ready', n)
    probe.frame(52, 20, renderer, 'gulf')
  }
  report = probe.read()
  assert.equal(report.hunt.id, 2)
  assert.equal(report.hunt.cpu.samples, 800)
  assert.equal(report.session.cpu.samples, 804)
  assert.equal(report.session.presentation.over50, 800)
  assert.equal(report.presentationMs.samples, 720)
  assert.equal(report.previousHunts[0].id, 1)
  assert.equal(report.slowFrames.length, 48)
  assert.equal(report.operations.length, 48)
})
