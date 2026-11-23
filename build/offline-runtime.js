const scope = new URL(self.registration.scope)
const prefix = 'retriever-run:' + scope.href + ':'
const cacheName = prefix + revision
const files = new Set(gameFiles.map(file => new URL(file, scope).href))
const shell = new URL('index.html', scope).href

self.addEventListener('install', event => {
  event.waitUntil(caches.open(cacheName).then(cache =>
    cache.addAll([...files].map(url => new Request(url, { cache: url === shell ? 'reload' : 'default' })))))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith(prefix) && key !== cacheName)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  const { request } = event
  if (request.method !== 'GET' || request.headers.has('authorization')) return
  const url = new URL(request.url)
  if (url.origin !== scope.origin) return
  if (request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === new URL(shell).pathname)) {
    // Keep a coherent shell and asset set until the next build finishes caching.
    event.respondWith(caches.open(cacheName).then(cache => cache.match(shell)).then(response => response ?? fetch(request)))
  } else if (files.has(url.href)) {
    event.respondWith(caches.open(cacheName).then(cache => cache.match(request)).then(response => response ?? fetch(request)))
  }
})
