import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { createServer } from 'vite'
import { matchesCollection, primaryRoom, recentlyEarned, roomGroups } from '../src/collection-browser.js'
import { expeditionRegions } from '../src/expedition.js'
import { ambienceMix, soundscapes } from '../src/field-soundscapes.js'
import { hapticFeedback, rewardGroups } from '../src/hunt-presentation.js'
import { normalizeProfile } from '../src/profile.js'
import { speciesArtwork, speciesPhotoFiles } from '../src/species-artwork.js'
import { fieldSpecies } from '../src/wildlife-catalog.js'
import { wildlifePortrait } from '../src/wildlife-portrait.js'

test('all twenty-nine species have durable unique artwork keys and correct group routing', async () => {
  assert.deepEqual(Object.keys(speciesArtwork), Object.keys(fieldSpecies))
  assert.equal(Object.keys(speciesArtwork).length, 29)
  assert.equal(new Set(Object.values(speciesArtwork).map(art => art.id)).size, 29)
  for (const [species, artwork] of Object.entries(speciesArtwork)) {
    assert.equal(artwork.width / artwork.height, 10 / 7)
    assert.match(wildlifePortrait(fieldSpecies[species], false), /^data:image\/svg\+xml/)
    const { path, detail, author, license, terms, source } = artwork.photo
    assert.ok(author && /^(CC BY(-SA)? [\d.]+|CC0|Public domain)$/.test(license) && terms.startsWith('https://'))
    assert.ok(source.startsWith('https://commons.wikimedia.org/wiki/File:'))
    assert.equal(wildlifePortrait(fieldSpecies[species], true), './' + path)
    for (const file of [path, detail]) {
      const bytes = await readFile(new URL('../public/' + file, import.meta.url))
      assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
    }
  }
  assert.equal(new Set(speciesPhotoFiles).size, 58)
  assert.equal(speciesArtwork.alligator.group, 'reptiles')
  assert.equal(speciesArtwork.deer.group, 'mammals')
  assert.equal(speciesArtwork.pheasant.group, 'upland')
  assert.match(decodeURIComponent(wildlifePortrait(fieldSpecies.alligator, false)), /M7 42Q21 53/)
  assert.doesNotMatch(decodeURIComponent(wildlifePortrait(fieldSpecies.deer, false)), /M7 42Q21 53/)
})

test('large collections support word search, date sorting and a distinct primary route per room', () => {
  assert.equal(matchesCollection('Étang CRANE', 'Sandhill crane', 'Étang du Nord'), true)
  assert.equal(matchesCollection('goose crane', 'Sandhill crane'), false)
  assert.equal(matchesCollection('  ', 'Sandhill crane'), true)
  const rooms = Object.entries(roomGroups).flatMap(([root, routes]) => routes.map(route => [route, root]))
  assert.equal(new Set(rooms.map(([route]) => route)).size, rooms.length)
  for (const [route, root] of rooms) assert.equal(primaryRoom(route), root)
  assert.equal(primaryRoom('unused-room'), 'overview')
  assert.deepEqual(['', '2026-07-21', '2026-08-21'].sort(recentlyEarned), ['2026-08-21', '2026-07-21', ''])
})

test('post-hunt groups count each earned item once and gate the Master Hunter reveal on the receipt', () => {
  const rank = id => ({ rank: { id, name: id } })
  const career = { before: rank('legendary'), after: rank('master-hunter') }
  assert.deepEqual(rewardGroups({ career }), [])
  assert.deepEqual(rewardGroups({}), [])
  const groups = rewardGroups({ career, boyd: true, gear: [{}, {}], newWildlife: [{}],
    newHonors: [{ category: 'Legendary', tier: 'Platinum' }, { category: 'Regional', tier: 'Platinum' }, {}],
    lodge: { tier: {}, upgrades: [{}, {}] } })
  assert.deepEqual(groups.map(group => [group.type, group.count]), [
    ['prestige', 1], ['legendary', 1], ['platinum', 1], ['honor', 1], ['gear', 2], ['species', 1], ['lodge', 3],
  ])
})

test('optional haptics and persisted presentation settings degrade without browser capabilities', () => {
  const requested = []
  const device = { vibrate: pattern => Boolean(requested.push(pattern)) }
  assert.equal(hapticFeedback({}, true, 'retrieve'), false)
  assert.equal(hapticFeedback(device, false, 'retrieve'), false)
  assert.equal(hapticFeedback(device, true, 'running'), false)
  assert.equal(hapticFeedback(device, true, 'retrieve'), true)
  assert.deepEqual(requested, [[20]])
  assert.equal(hapticFeedback({ vibrate() { throw Error() } }, true, 'collision'), false)
  const profile = normalizeProfile(JSON.parse(JSON.stringify({ best: 100, motion: true, keepAwake: false,
    masterVolume: .6, ambientVolume: .3, musicVolume: 0, wildlifeVolume: .7, effectsVolume: .9, haptics: true })))
  assert.deepEqual([profile.best, profile.motion, profile.keepAwake, profile.haptics], [100, true, false, true])
  assert.deepEqual([profile.masterVolume, profile.ambientVolume, profile.musicVolume, profile.wildlifeVolume,
    profile.effectsVolume], [.6, .3, 0, .7, .9])
})

test('all fifteen territories have distinct sound profiles with continuous regional transitions', () => {
  assert.deepEqual(Object.keys(soundscapes), expeditionRegions.map(region => region.key))
  assert.equal(new Set(Object.values(soundscapes).map(String)).size, 15)
  for (let index = 0; index < 15; index++) {
    const seconds = 30 * index
    const before = ambienceMix(seconds - .0001)
    const after = ambienceMix(seconds + .0001)
    assert.equal(before.length, 5)
    assert.ok(before.every((value, layer) => value >= 0 && value <= 1 && Math.abs(value - after[layer]) < .01))
  }
  assert.deepEqual(ambienceMix(600), soundscapes.mountain)
})

test('audio waits for a gesture, decodes one recording at a time and suspends when hidden', async t => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, watch: null }, appType: 'custom' })
  t.after(() => vite.close())
  const { createSound } = await vite.ssrLoadModule('/src/audio.js')
  const contexts = []
  const page = { hidden: false }
  const parameter = () => ({ cancelScheduledValues() {}, setTargetAtTime() {}, setValueAtTime() {}, linearRampToValueAtTime() {} })
  const output = () => ({ gain: parameter(), frequency: parameter(), playbackRate: {}, connect: output, start() {} })
  let activeDecodes = 0
  let peakDecodes = 0
  let decoded = 0
  class AudioContext extends EventTarget {
    constructor() {
      super()
      contexts.push(this)
      this.destination = output()
      this.state = 'suspended'
      this.currentTime = 0
      this.sampleRate = 8000
    }
    createGain() { return output() }
    createBufferSource() { return output() }
    createBuffer() { return { getChannelData: () => new Float32Array(16) } }
    createBiquadFilter() { return output() }
    createDynamicsCompressor() {
      return Object.assign(output(), { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {} })
    }
    async resume() { this.state = 'running'; this.dispatchEvent(new Event('statechange')) }
    async suspend() { this.state = 'suspended'; this.dispatchEvent(new Event('statechange')) }
    decodeAudioData(_buffer, finish) {
      peakDecodes = Math.max(peakDecodes, ++activeDecodes)
      setImmediate(() => { activeDecodes--; decoded++; finish({ duration: 1 }) })
    }
  }
  t.mock.method(globalThis, 'fetch', async () => ({ ok: true, arrayBuffer: () => new ArrayBuffer(4) }))
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
  const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { AudioContext } })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: page })
  const sound = createSound()
  t.after(() => {
    sound.suspend()
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor)
    else delete globalThis.window
    if (documentDescriptor) Object.defineProperty(globalThis, 'document', documentDescriptor)
    else delete globalThis.document
  })
  sound.selectScene('title')
  assert.equal(contexts.length, 0)
  sound.selectScene('running', { gesture: true })
  for (let i = 0; i < 5; i++) await new Promise(setImmediate)
  assert.equal(contexts.length, 1)
  assert.equal(contexts[0].state, 'running')
  assert.equal(decoded, 4)
  assert.equal(peakDecodes, 1)
  page.hidden = true
  sound.selectScene('paused', { immediate: true })
  assert.equal(contexts[0].state, 'suspended')
  page.hidden = false
  sound.selectScene('running')
  assert.equal(contexts[0].state, 'suspended')
  sound.selectScene('running', { gesture: true })
  assert.equal(contexts[0].state, 'running')
})

test('Opening Day exports the complete local save without touching online credentials or practice data', async () => {
  const { openLodge, saveKey, saveVersion } = await import('../src/lodge-save.js')
  const online = 'sb-isolated-auth-token'
  const data = new Map([[online,'never exported'],[saveKey,JSON.stringify({
    version: saveVersion, active: 2, players: [{ id: 1, nickname:'North Camp' },{ id: 2, nickname:'South Camp' }],
  })]])
  const store = () => ({ getItem: key => data.get(key) ?? null, setItem: (key,value) => data.set(key,value) })
  const lodge = openLodge(store)
  const exported = JSON.parse(lodge.exportSave())
  assert.deepEqual(exported.players.map(player => player.nickname),['North Camp','South Camp'])
  assert.equal(exported.active,2)
  assert.equal(exported.version,saveVersion)
  assert.ok(!lodge.exportSave().includes(data.get(online)))
  assert.equal(openLodge(store, undefined, { practice:true }).exportSave(),null)
  data.set(saveKey,JSON.stringify({ version:saveVersion+1 }))
  assert.equal(openLodge(store).exportSave(),null)
})
