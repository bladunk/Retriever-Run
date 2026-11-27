import { buildLabel } from './build-info.js'
import { createContentManifest } from './content-manifest.js'
import { createContentStore, loadContentManifest } from './content-store.js'
import { createFieldNotes } from './field-notes.js'
import { productionSession } from './production-session.js'
import './production.css'

const screen = document.querySelector('#content-screen')
const game = document.querySelector('#game')
const select = id => document.getElementById(id)
for (const id of ['running-version', 'settings-version']) select(id).textContent = buildLabel()
const title = select('content-title')
const description = select('content-description')
const size = select('content-size')
const download = select('content-download')
const online = select('content-online')
const back = select('content-close')
const status = select('content-status')
const notes = createFieldNotes()
const scope = new URL('./', location.href)
const store = createContentStore(scope)
const worker = navigator.serviceWorker
const traceStartup = new URLSearchParams(location.search).get('perf') === '1'
function startupMark(phase) {
  if (traceStartup) performance.mark('retriever-' + phase)
}
startupMark('shell')
let manifest
let waiting
let updateManifest
let inspected
let task
let launch
let registration
let pendingPrompt
let lockTimer

function format(bytes) {
  const [amount, name] = bytes >= 1_000_000 ? [bytes / 1_000_000, ' MB'] : [bytes / 1000, ' KB']
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount) + name
}

function note() {
  const sample = notes.next()
  select('content-note-category').textContent = 'Field Notes · ' + sample.category
  select('content-note-copy').textContent = sample.text
  const source = select('content-note-source')
  source.href = sample.source.url
  source.textContent = sample.source.name
  select('content-note').hidden = false
}

function paintProgress({ complete, received, total, group, retrying }) {
  select('content-progress').hidden = false
  const meter = select('content-meter')
  meter.max = total
  meter.value = complete + received
  select('content-count').textContent = format(complete + received) + ' of ' + format(total) +
    (received ? ' · ' + format(complete) + ' verified' : ' · verified')
  select('content-step').textContent = retrying ? 'Retrying ' + group.toLowerCase() + '…' : group
}

function networkUI() {
  online.disabled = !navigator.onLine || Boolean(task)
  const hint = select('local-status')
  hint.hidden = navigator.onLine && (productionSession.prepared() || !import.meta.env.PROD)
  hint.textContent = !navigator.onLine ? 'Offline · Solo hunts and career progress are available.'
    : 'Prepare the game files to enter ranked hunts.'
}

function openScreen() {
  if (!screen.open) screen.showModal()
  online.hidden = !game.hidden
  back.hidden = game.hidden
  select('content-note').hidden = true
}

function closeScreen() {
  if (screen.open) screen.close()
}

async function startGame() {
  closeScreen()
  game.hidden = false
  if (!launch) startupMark('module-request')
  launch ??= import('./main.js')
  try { await launch } catch (error) {
    if (import.meta.env.DEV || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) console.error(error)
    launch = undefined
    game.hidden = true
    openScreen()
    status.textContent = 'The game could not start. Reopen the page when connected, or retry the download.'
  }
}

function message(target, type) {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel()
    const finish = (error, value) => {
      clearTimeout(timer)
      channel.port1.close()
      if (error) reject(error)
      else resolve(value)
    }
    const timer = setTimeout(() => finish(new Error('Update did not respond')), 8_000)
    channel.port1.onmessage = event => finish(null, event.data)
    try { target.postMessage({ type }, [channel.port2]) } catch (error) { finish(error) }
  })
}

function menuIsSafe() {
  return !['running', 'paused'].includes(game.dataset.mode) &&
    !document.querySelector('#onboarding[open], #preferences[open], #tutorial[open], #lodge[open]')
}

async function examine({ autoStart = false, update = false } = {}) {
  select('content-progress').hidden = true
  download.disabled = true
  status.textContent = ''
  size.textContent = ''
  const target = update ? updateManifest : manifest
  if (!target) return
  title.textContent = update ? 'A new trail update' : 'Download the trail'
  select('pending-version').hidden = !update
  if (update) select('pending-version').textContent = 'Pending · ' + (target.app ? buildLabel(target.app) : target.version.slice(0, 7))
  description.textContent = update ? 'Prepare changed files and apply the update between hunts.'
    : 'Save the terrain, Labrador and sounds on this device so you can hunt offline.'
  if (!update) startupMark('verification-start')
  inspected = await store.inspect(target)
  if (!update) startupMark(inspected.missing.length ? 'verification-missing' : 'verification-ready')
  if (!update) productionSession.setPrepared(!inspected.missing.length && Boolean(worker.controller))
  networkUI()
  if (!update && !inspected.missing.length) {
    title.textContent = 'Trail ready'
    size.textContent = format(inspected.total) + ' verified on this device'
    status.textContent = 'The signed-in Camp still needs a connection.'
    if (autoStart) await startGame()
    return
  }
  const missing = inspected.total - inspected.cached
  size.textContent = format(missing) + ' to download · ' + format(inspected.total) + ' total'
  if (missing >= 25_000_000) description.textContent += ' Wi-Fi may save mobile data.'
  if (inspected.cached) paintProgress({ complete: inspected.cached, received: 0, total: inspected.total, group: 'Files ready' })
  download.textContent = update ? (missing ? 'Download update' : 'Apply update') : 'Download & play'
  download.disabled = false
}

function explain(error) {
  if (!navigator.onLine) return 'Connection interrupted. Reconnect and retry to resume from your verified files.'
  if (error.code === 'storage') return 'This device could not save more files. Free browser storage or choose Play online.'
  if (error.code === 'integrity') return 'A file did not match this release. Retry to retrieve a fresh copy.'
  if (error.code === 'missing') return 'A file is unavailable. Retry when the connection or deployment has settled.'
  return 'The download stopped. Retry to resume from your verified files.'
}

async function prepare() {
  const update = Boolean(updateManifest && waiting)
  const target = update ? updateManifest : manifest
  if (!target || task) return
  if (!navigator.onLine && inspected?.missing.length) {
    status.textContent = 'Reconnect to download the remaining files.'
    return
  }
  download.disabled = back.disabled = true
  online.disabled = true
  status.textContent = ''
  note()
  task = (async () => {
    try {
      const estimate = await navigator.storage?.estimate?.().catch(() => null)
      const missing = inspected ? inspected.total - inspected.cached : 0
      if (estimate?.quota && estimate.quota - estimate.usage < missing) throw Object.assign(new Error(), { code: 'storage' })
      const result = await store.prepare(target, paintProgress, inspected)
      inspected = result
      if (update) {
        const state = await message(waiting, 'retriever:activate')
        if (state !== 'activating') {
          status.textContent = state === 'busy' ? 'Finish or leave any open hunt, then apply the update again.' :
            'The update could not start. Retry from camp.'
          download.textContent = 'Apply update'
        } else status.textContent = 'Opening the updated trail…'
      } else {
        productionSession.setPrepared(Boolean(worker.controller))
        if (game.hidden) await startGame()
        else {
          status.textContent = 'Trail files are saved and ready for offline play.'
          download.hidden = true
        }
        // Only an explicit content download requests storage persistence.
        navigator.storage?.persist?.().catch(() => {})
      }
    } catch (error) {
      inspected = await store.inspect(target).catch(() => inspected)
      if (inspected) paintProgress({ complete: inspected.cached, received: 0, total: inspected.total, group: 'Verified files' })
      status.textContent = explain(error)
      download.textContent = 'Retry download'
    } finally {
      task = undefined
      download.disabled = back.disabled = false
      networkUI()
    }
  })()
}

async function noticeUpdate() {
  if (!registration?.waiting || registration.waiting === waiting) return
  waiting = registration.waiting
  try {
    updateManifest = createContentManifest(await message(waiting, 'retriever:manifest'))
    if (updateManifest.version === manifest?.version) updateManifest = undefined
    select('content-open').textContent = updateManifest ? 'Game update available' : 'Game downloads'
  } catch {
    waiting = undefined
    updateManifest = undefined
  }
}

function watchUpdates() {
  registration.addEventListener('updatefound', () => {
    registration.installing?.addEventListener('statechange', () => {
      if (registration.installing?.state === 'installed' || registration.waiting) noticeUpdate()
    })
  })
  noticeUpdate()
}

download.addEventListener('click', prepare)
online.addEventListener('click', startGame)
back.addEventListener('click', closeScreen)
screen.addEventListener('cancel', event => {
  if (game.hidden || task || productionSession.locked()) event.preventDefault()
})
select('content-open').addEventListener('click', async () => {
  select('preferences').close()
  openScreen()
  download.hidden = false
  await noticeUpdate()
  try { await examine({ update: Boolean(updateManifest && waiting) }) } catch (error) { status.textContent = explain(error) }
})

worker?.addEventListener('message', event => {
  if (event.data?.type === 'retriever:cancel-switch') {
    productionSession.lock(false)
    return
  }
  if (event.data?.type !== 'retriever:prepare-switch' || !event.ports[0]) return
  const safe = menuIsSafe()
  if (safe) {
    productionSession.lock(true)
    clearTimeout(lockTimer)
    lockTimer = setTimeout(() => productionSession.lock(false), 12_000)
  }
  event.ports[0].postMessage(safe)
})
worker?.addEventListener('controllerchange', () => {
  if (productionSession.locked()) location.reload()
  else if (manifest) store.inspect(manifest).then(value => {
    productionSession.setPrepared(!value.missing.length && Boolean(worker.controller))
    networkUI()
  }).catch(() => {})
})

const install = select('install-app')
const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
if (!installed && ios) install.hidden = false
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault()
  pendingPrompt = event
  if (!installed) install.hidden = false
})
install.addEventListener('click', async () => {
  if (!pendingPrompt) {
    select('install-help').hidden = !select('install-help').hidden
    return
  }
  const prompt = pendingPrompt
  pendingPrompt = undefined
  install.hidden = !ios
  try { await prompt.prompt() } catch { /* This browser can decline an installation request. */ }
})
window.addEventListener('appinstalled', () => { install.hidden = true })
const fullScreen = select('full-screen')
fullScreen.hidden = installed || !document.fullscreenEnabled
fullScreen.addEventListener('click', () => {
  const result = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()
  result.catch(() => {})
})
document.addEventListener('fullscreenchange', () => {
  fullScreen.textContent = document.fullscreenElement ? 'Exit full screen' : 'Full screen'
})

let checkedAt = 0
function checkUpdate() {
  if (!registration || !navigator.onLine || Date.now() - checkedAt < 900_000) return
  checkedAt = Date.now()
  registration.update().then(noticeUpdate).catch(() => {})
}
window.addEventListener('online', () => { networkUI(); checkUpdate() })
window.addEventListener('offline', networkUI)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkUpdate()
})

async function boot() {
  if (import.meta.env.DEV || import.meta.env.MODE === 'migration-qa' ||
      new URLSearchParams(location.search).get('debug') === 'collision' || !worker || !globalThis.caches || !crypto.subtle) {
    await startGame()
    return
  }
  networkUI()
  try {
    startupMark('worker-request')
    registration = await worker.getRegistration(scope.href) ??
      await worker.register(new URL('offline-sw.js', scope), { updateViaCache: 'none' })
    startupMark('worker-ready')
    startupMark(worker.controller ? 'controlled-launch' : 'uncontrolled-launch')
    manifest = await loadContentManifest(scope)
    startupMark('manifest-ready')
    select('content-open').hidden = false
    watchUpdates()
    checkUpdate()
    await examine({ autoStart: true })
  } catch (error) {
    if (import.meta.env.DEV || /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) console.error(error)
    if (navigator.onLine && !worker.controller) await startGame()
    else if (navigator.onLine) status.textContent = 'Stored files could not be checked. Reload to retry, or play online.'
    else status.textContent = 'Reconnect once to save the trail. Downloaded files may have been removed by this browser.'
  }
}
void boot()
