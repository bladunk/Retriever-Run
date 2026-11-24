const scope = new URL(self.registration.scope)
const releasePrefix = 'retriever-run-release:' + scope.href + ':'
const releaseCache = releasePrefix + release.version
const assetCache = 'retriever-run-content:' + scope.href
const manifestURL = new URL('content-manifest.json', scope).href
const shellURL = new URL('index.html', scope).href
const files = new Map(release.assets.map(asset => [new URL(asset.path, scope).href, asset]))
const digestKey = hash => new URL('__rr_content__/' + hash, scope).href

async function verified(response, asset) {
  if (!response?.ok) return false
  const bytes = await response.arrayBuffer()
  if (bytes.byteLength !== asset.bytes) return false
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('') === asset.sha256
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const assets = await caches.open(assetCache)
    // Install only the small launch shell. The player controls full content preparation.
    for (const asset of release.assets.filter(asset => asset.cache === 'release')) {
      const key = digestKey(asset.sha256)
      const saved = await assets.match(key)
      if (await verified(saved, asset)) continue
      const url = new URL(asset.path, scope).href
      const legacy = await caches.match(url)
      const response = legacy && await verified(legacy.clone(), asset) ? legacy :
        await fetch(url, { credentials: 'omit', cache: 'reload', redirect: 'error' })
      if (!await verified(response.clone(), asset)) throw new Error('Shell integrity failure: ' + asset.id)
      await assets.put(key, response)
    }
    const cache = await caches.open(releaseCache)
    await cache.put(manifestURL, new Response(JSON.stringify(release), { headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'X-Retriever-Installed': String(Date.now()),
    } }))
  })())
})

async function pruneReleases() {
  const names = (await caches.keys()).filter(name => name.startsWith(releasePrefix))
  const snapshots = await Promise.all(names.map(async name => {
    const response = await (await caches.open(name)).match(manifestURL)
    if (!response) return null
    return { name, time: +response.headers.get('X-Retriever-Installed'), manifest: await response.json() }
  }))
  // An interrupted install may still be writing a snapshot. Leave it alone.
  if (snapshots.some(snapshot => !snapshot || !Array.isArray(snapshot.manifest.assets))) return
  const others = snapshots.filter(item => item.name !== releaseCache).sort((a, b) => b.time - a.time)
  const retained = [release, ...others.slice(0, 1).map(item => item.manifest)]
  const keep = new Set(retained.flatMap(manifest => manifest.assets.map(asset => digestKey(asset.sha256))))
  const old = others.slice(1)
  if (!old.length) return
  const obsolete = new Set(old.flatMap(item => item.manifest.assets.map(asset => digestKey(asset.sha256))))
  const cache = await caches.open(assetCache)
  for (const key of obsolete) if (!keep.has(key)) await cache.delete(key)
  for (const item of old) await caches.delete(item.name)
}

self.addEventListener('activate', event => {
  event.waitUntil(pruneReleases().catch(() => {}).then(() => self.clients.claim()))
})

function eligible(request, url) {
  return request.method === 'GET' && !request.headers.has('authorization') && !request.headers.has('apikey') &&
    !request.headers.has('range') && url.origin === scope.origin && url.pathname.startsWith(scope.pathname)
}

self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)
  if (!eligible(request, url)) return
  const navigation = request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === new URL(shellURL).pathname)
  if (url.href === manifestURL) {
    event.respondWith(caches.open(releaseCache).then(cache => cache.match(manifestURL))
      .then(response => response ?? new Response(JSON.stringify(release), { headers: { 'Content-Type': 'application/json' } })))
    return
  }
  const asset = navigation ? files.get(shellURL) : files.get(url.href)
  if (!asset) return
  event.respondWith(caches.open(assetCache).then(cache => cache.match(digestKey(asset.sha256))).catch(() => null)
    .then(response => response ?? fetch(request)))
})

function safeToUpdate(client) {
  return new Promise(resolve => {
    const channel = new MessageChannel()
    const done = safe => {
      clearTimeout(timer)
      channel.port1.close()
      resolve(safe)
    }
    const timer = setTimeout(() => done(false), 1800)
    channel.port1.onmessage = event => done(event.data === true)
    client.postMessage({ type: 'retriever:prepare-switch', revision: release.version }, [channel.port2])
  })
}

let activating
async function activateWhenSafe() {
  const cache = await caches.open(assetCache)
  for (const asset of release.assets) {
    if (asset.required && !await cache.match(digestKey(asset.sha256))) return 'missing'
  }
  const windows = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter(client => {
    const url = new URL(client.url)
    return url.origin === scope.origin && (url.pathname === scope.pathname || url.pathname === new URL(shellURL).pathname)
  })
  const votes = await Promise.all(windows.map(safeToUpdate))
  if (votes.some(safe => !safe)) {
    windows.forEach(client => client.postMessage({ type: 'retriever:cancel-switch', revision: release.version }))
    return 'busy'
  }
  await self.skipWaiting()
  return 'activating'
}

self.addEventListener('message', event => {
  const client = event.source
  const response = event.ports[0]
  if (!client?.url?.startsWith(scope.href) || !response) return
  if (event.data?.type === 'retriever:manifest') response.postMessage(release)
  if (event.data?.type === 'retriever:activate') {
    activating ??= activateWhenSafe().catch(() => 'failed').finally(() => { activating = undefined })
    event.waitUntil(activating.then(result => response.postMessage(result)))
  }
})
