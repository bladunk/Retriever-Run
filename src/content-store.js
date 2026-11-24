import { createContentManifest, installation, manifestPath } from './content-manifest.js'

export const cachePrefix = scope => 'retriever-run-content:' + scope.href
export const digestKey = (scope, sha256) => new URL('__rr_content__/' + sha256, scope).href
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const totalBytes = assets => assets.reduce((total, asset) => total + asset.bytes, 0)

async function checksum(bytes) {
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function isValid(response, asset) {
  if (!response?.ok) return false
  try {
    const bytes = await response.arrayBuffer()
    return bytes.byteLength === asset.bytes && await checksum(bytes) === asset.sha256
  } catch { return false }
}

export class ContentError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

export async function loadContentManifest(scope) {
  const response = await fetch(new URL(manifestPath, scope), { cache: 'no-cache', credentials: 'omit' })
  if (!response.ok) throw new ContentError('manifest')
  return createContentManifest(await response.json())
}

export function createContentStore(scope, { storage = globalThis.caches, request = fetch, wait = delay } = {}) {
  const open = () => storage.open(cachePrefix(scope))
  const lookup = asset => digestKey(scope, asset.sha256)

  async function inspect(manifest) {
    const cache = await open()
    const assets = installation(manifest)
    const missing = []
    for (const asset of assets) {
      const key = lookup(asset)
      const cached = await cache.match(key)
      if (await isValid(cached, asset)) continue
      if (cached) await cache.delete(key)
      // Promote files from the previous Pages worker only after verification.
      const legacy = await storage.match(new URL(asset.path, scope).href)
      if (legacy && await isValid(legacy.clone(), asset)) await cache.put(key, legacy)
      else missing.push(asset)
    }
    const total = totalBytes(assets)
    return { total, cached: total - totalBytes(missing), missing }
  }

  async function transfer(asset, onBytes) {
    const control = new AbortController()
    let deadline
    const extend = () => {
      clearTimeout(deadline)
      deadline = setTimeout(() => control.abort(), 45_000)
    }
    extend()
    try {
      const response = await request(new URL(asset.path, scope), {
        credentials: 'omit', cache: 'reload', signal: control.signal, redirect: 'error',
      })
      if (!response.ok) throw new ContentError(response.status === 404 ? 'missing' : 'network')
      const reader = response.body?.getReader()
      let bytes
      if (reader) {
        bytes = new Uint8Array(asset.bytes)
        let seen = 0
        try {
          for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
            extend()
            if (seen + chunk.value.length > bytes.length) throw new ContentError('integrity')
            bytes.set(chunk.value, seen)
            seen += chunk.value.length
            onBytes(seen)
          }
        } finally { reader.cancel().catch(() => {}) }
        if (seen !== bytes.length) throw new ContentError('integrity')
      } else {
        bytes = new Uint8Array(await response.arrayBuffer())
        onBytes(bytes.length)
      }
      if (bytes.length !== asset.bytes || await checksum(bytes) !== asset.sha256) throw new ContentError('integrity')
      return new Response(bytes, { headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
      } })
    } finally { clearTimeout(deadline) }
  }

  async function prepare(manifest, progress = () => {}, initial) {
    const cache = await open()
    const status = initial ?? await inspect(manifest)
    let complete = status.cached
    for (const asset of status.missing) {
      const key = lookup(asset)
      const report = (received, retrying = false) =>
        progress({ complete, received, total: status.total, group: manifest.groups[asset.group].label, retrying })
      report(0)
      // Another installation tab may already have completed this asset.
      if (!await isValid(await cache.match(key), asset)) {
        let body
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            body = await transfer(asset, report)
            break
          } catch (error) {
            if (attempt === 2 || error.code === 'missing' || globalThis.navigator?.onLine === false)
              throw error instanceof ContentError ? error : new ContentError('network')
            report(0, true)
            await wait(attempt ? 850 : 320)
          }
        }
        try { await cache.put(key, body) } catch { throw new ContentError('storage') }
      }
      complete += asset.bytes
      report(0)
    }
    return { total: status.total, cached: complete, missing: [] }
  }

  return { inspect, prepare }
}
