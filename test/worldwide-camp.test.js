import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { publicCampConfig } from '../build/camp-config.js'
import { campNickname, canPostRun } from '../src/camp-rules.js'
import { createCampTransport, fetchForCamp } from '../src/camp-transport.js'
import { distanceAtTime } from '../src/difficulty.js'
import { createRunStatistics } from '../src/field-stats.js'
import { openLodge } from '../src/lodge-save.js'
import { newRun } from '../src/runner.js'
import { createWorldwideCamp } from '../src/worldwide-camp.js'

const fixture = { id: 7, score: 335, distance: 45.1, retrieves: 1, duration: 4 }

function memory() {
  const values = new Map()
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key) }
}

function fakeWorld() {
  const requests = { names: [], submissions: [], boards: [] }
  const best = new Map()
  const owners = new Map()
  const flags = { offline: false, failAfterAccept: false, throttle: false }
  return { requests, flags, transport: {
    namespace: 'test',
    async nickname(profile, nickname) {
      requests.names.push([profile, nickname])
      return { status: 'ok', nickname, identity: 'test-identity-' + profile }
    },
    async submit(profile, identity, run) {
      requests.submissions.push({ profile, identity, ...run })
      if (flags.offline) throw Error('Offline')
      if (flags.throttle) return { status: 'rate_limited' }
      const existing = best.get(profile) ?? { score: 0, distance: 0, retrieves: 0 }
      if (owners.has(run.id)) return { status: 'duplicate', ...existing }
      const next = Object.fromEntries(Object.entries(existing).map(([key, value]) => [key, Math.max(value, run[key])]))
      owners.set(run.id, identity)
      best.set(profile, next)
      if (flags.failAfterAccept) throw Error('Response lost')
      return { status: 'ok', ...next }
    },
    async board(profile, identity, metric, offset, limit) {
      requests.boards.push({ profile, identity, metric, offset, limit })
      if (flags.offline) throw Error('Offline')
      return { status: 'ok', rows: [], has_more: false, mine: null }
    },
  } }
}

test('configuration only emits an HTTPS project URL and a publishable key', () => {
  assert.equal(publicCampConfig({}), null)
  const key = 'sb_publishable_xxxxxxxxxxxxxxxxxxxxx'
  assert.deepEqual(publicCampConfig({ SUPABASE_URL: 'https://example.supabase.co/', SUPABASE_PUBLISHABLE_KEY: key }),
    { url: 'https://example.supabase.co', key })
  assert.throws(() => publicCampConfig({ SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_secret_xxxxxxxxxxxxxxxxxxx' }), /publishable key/)
  assert.throws(() => publicCampConfig({ SUPABASE_URL: 'http://example.supabase.co', SUPABASE_PUBLISHABLE_KEY: key }), /HTTPS/)
  assert.throws(() => publicCampConfig({ SUPABASE_URL: 'https://user:secret@example.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: key }), /bare/)
})

test('nickname policy and run envelope accept normal play and reject malformed submissions', () => {
  assert.equal(campNickname('  Avery   Pup-3 '), 'Avery Pup-3')
  for (const input of ['admin', 'G1tHub', 'f-u-c-k', 'A<script>', 'Åvery', '-Moss', 'ab', 'abc'.repeat(7), null]) {
    assert.equal(campNickname(input), null, String(input))
  }
  for (const seconds of [2.6, 3.25, 4, 5, 9, 15, 30, 61, 120, 900, 3600, 14400]) {
    const distance = Math.floor(distanceAtTime(seconds))
    assert.equal(canPostRun({ score: distance + 50, distance, durationMs: Math.round(seconds * 1000), retrieves: 0 }), true, String(seconds))
  }
  assert.equal(canPostRun({ score: 90, distance: 90, durationMs: 2500, retrieves: 0 }), false)
  assert.equal(canPostRun({ score: 346, distance: 45, durationMs: 4000, retrieves: 0 }), false)
  assert.equal(canPostRun({ score: 1000, distance: 45, durationMs: 4000, retrieves: 90 }), false)
})

test('local saves are finalized once and posting only happens for explicitly joined profiles', async () => {
  const disk = memory()
  const lodge = openLodge(() => disk)
  const { requests, transport } = fakeWorld()
  const camp = createWorldwideCamp(transport, { storage: () => disk })
  const player = lodge.current()
  const tracker = createRunStatistics()
  const finalized = lodge.finalize(player.id, tracker,
    { ...newRun(), distance: 45.2, elapsed: 4, scoreBonus: 50 }, 'stream')
  assert.equal(lodge.finalize(player.id, tracker, newRun(), 'stream'), null)
  assert.equal(camp.record(player.id, finalized), null)
  assert.equal(requests.submissions.length, 0)
  assert.equal((await camp.join(player.id, 'Moss Runner')).status, 'ok')
  const second = lodge.newPlayer('Pond Scout')
  assert.equal(camp.record(second.id, fixture), null)
  const result = camp.record(player.id, finalized)
  assert.equal(await result.done, 'sent')
  assert.equal(camp.record(player.id, finalized), null)
  assert.equal(requests.submissions[0].score, finalized.score)
  assert.equal(requests.submissions[0].distance, 45)
  assert.equal(requests.submissions[0].identity, 'test-identity-1')
  const restored = openLodge(() => disk)
  assert.equal(restored.players()[0].stats.runs, 1)
  assert.equal(restored.board('score')[0].score, finalized.score)
})

test('the persisted outbox uses the same run UUID after a lost response and browser refresh', async () => {
  const disk = memory()
  const { flags, requests, transport } = fakeWorld()
  let camp = createWorldwideCamp(transport, { storage: () => disk })
  await camp.join(1, 'Field Dog')
  flags.failAfterAccept = true
  assert.equal(await camp.record(1, fixture).done, 'pending')
  assert.equal(camp.pending(1), 1)
  camp = createWorldwideCamp(transport, { storage: () => disk })
  flags.failAfterAccept = false
  assert.equal(await camp.sync(1), 'sent')
  assert.equal(camp.pending(1), 0)
  assert.equal(requests.submissions.length, 2)
  assert.equal(requests.submissions[0].id, requests.submissions[1].id)
  assert.equal(camp.record(1, fixture), null)
  assert.equal(camp.record(1, { ...fixture, id: 8 }), null)
})

test('offline play queues only metric contenders, coalesces sends and applies retry backoff', async () => {
  let connected = true
  let clock = 1
  const { flags, requests, transport } = fakeWorld()
  const camp = createWorldwideCamp(transport, { storage: memory, online: () => connected, now: () => clock })
  await camp.join(1, 'Field Dog')
  await camp.join(2, 'Pond Scout')
  connected = false
  assert.equal(await camp.record(1, fixture).done, 'pending')
  assert.equal(await camp.record(1, { ...fixture, id: 8, score: 650 }).done, 'pending')
  assert.equal(await camp.record(1, { ...fixture, id: 9, score: 249, distance: 119, duration: 10 }).done, 'pending')
  assert.equal(await camp.record(2, fixture).done, 'pending')
  assert.equal(camp.pending(1), 2)
  assert.equal(requests.submissions.length, 0)
  assert.equal((await camp.board(1, 'score')).status, 'offline')
  connected = true
  flags.throttle = true
  const a = camp.sync(1)
  const b = camp.sync(1)
  assert.equal(a, b)
  assert.equal(await a, 'pending')
  flags.throttle = false
  assert.equal(await camp.sync(1), 'pending')
  assert.equal(requests.submissions.length, 1)
  clock += 60_001
  assert.equal(await camp.sync(1), 'sent')
  assert.equal(await camp.sync(2), 'sent')
  assert.equal(requests.submissions.at(-1).identity, 'test-identity-2')
  assert.ok(!requests.submissions.some(item => item.profile === 1 && item.score === fixture.score))
})

test('rankings cache bounded pages and handle empty, offline and failed responses', async () => {
  let connected = true
  let clock = 1
  const { flags, requests, transport } = fakeWorld()
  const camp = createWorldwideCamp(transport, { online: () => connected, now: () => clock })
  const result = await camp.board(1, 'score')
  assert.deepEqual(result.rows, [])
  await camp.board(2, 'score')
  assert.equal(requests.boards.length, 1)
  await camp.board(1, 'score', 25)
  assert.equal(requests.boards[1].limit, 25)
  assert.equal(requests.boards[1].offset, 25)
  assert.equal((await camp.board(1, 'score', 100)).status, 'invalid_metric')
  connected = false
  const saved = await camp.board(1, 'score')
  assert.equal(saved.stale && saved.offline, true)
  connected = true
  clock += 61000
  flags.offline = true
  assert.equal((await camp.board(1, 'score')).stale, true)
  assert.equal((await camp.board(1, 'distance')).status, 'unavailable')
})

test('the Supabase adapter isolates anonymous sessions and never submits for a changed identity', async () => {
  const logs = { sdk: 0, requests: [], clients: [], signups: 0 }
  const sessions = new Map()
  const transport = createCampTransport({ url: 'https://fixture.supabase.co', key: 'sb_publishable_fixturefixture' }, {
    loadSdk: async () => {
      logs.sdk++
      return { createClient(_url, _key, { auth }) {
        const key = auth.storageKey
        logs.clients.push(key)
        return {
          auth: {
            async getSession() { return { data: { session: sessions.get(key) } } },
            async signInAnonymously() {
              const session = { user: { id: randomUUID() } }
              sessions.set(key, session)
              logs.signups++
              return { data: { session } }
            },
          },
          async rpc(name, args) {
            logs.requests.push({ key, name, args })
            return { data: { status: 'ok', nickname: args.p_nickname, rows: [] } }
          },
        }
      } }
    },
  })
  await transport.board(1, undefined, 'distance', 0, 25)
  assert.equal(logs.signups, 0)
  const a = await transport.nickname(1, 'Field Dog')
  const b = await transport.nickname(2, 'Pond Scout')
  assert.notEqual(a.identity, b.identity)
  assert.equal((await transport.nickname(1, 'Wetland Dog')).identity, a.identity)
  assert.equal(logs.signups, 2)
  assert.equal(new Set(logs.clients).size, 3)
  assert.equal((await transport.submit(2, a.identity, fixture)).status, 'reconnect')
  assert.ok(!logs.requests.some(request => request.name === 'rr_camp_submit'))
  await transport.submit(1, a.identity, { id: randomUUID(), score: 335, distance: 45, durationMs: 4000, retrieves: 1 })
  assert.equal(logs.requests.at(-1).name, 'rr_camp_submit')
  assert.ok(!Object.values(logs.requests.at(-1).args).includes(a.identity))
})

test('requests time out and unavailable storage leaves both the game and online UI usable', async () => {
  const hanging = (_request, { signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  })
  await assert.rejects(fetchForCamp(hanging, 12)('https://fixture.supabase.co'), { name: 'AbortError' })
  const storage = () => { throw Error('Disabled') }
  const { flags, transport } = fakeWorld()
  flags.offline = true
  const camp = createWorldwideCamp(transport, { storage })
  assert.equal((await camp.join(1, 'Field Dog')).status, 'ok')
  assert.equal(await camp.record(1, fixture).done, 'pending')
  const lodge = openLodge(storage)
  assert.ok(lodge.finalize(1, createRunStatistics(), { ...newRun(), duration: 4 }, 'stream'))
  assert.equal((await createWorldwideCamp(null).board(1, 'score')).status, 'unavailable')
})

test('reopening the nickname form during an anonymous signup does not create a second session', async () => {
  let release
  const gate = new Promise(resolve => { release = resolve })
  const { requests, transport } = fakeWorld()
  const original = transport.nickname
  transport.nickname = async (profile, name) => {
    await gate
    return original(profile, name)
  }
  const camp = createWorldwideCamp(transport)
  const first = camp.join(1, 'Moss Pup')
  const duplicate = camp.join(1, 'Moss Pup')
  const competing = camp.join(1, 'Pond Scout')
  release()
  assert.equal((await first).status, 'ok')
  assert.equal((await duplicate).status, 'ok')
  assert.equal((await competing).status, 'busy')
  assert.deepEqual(requests.names, [[1, 'Moss Pup']])
  assert.equal(camp.member(1).nickname, 'Moss Pup')
})

test('repeated online events drain pending local profiles without concurrent background requests', async () => {
  let connected = true
  let peak = 0
  let inFlight = 0
  const { requests, transport } = fakeWorld()
  const submit = transport.submit
  transport.submit = async (...args) => {
    inFlight++
    peak = Math.max(peak, inFlight)
    await new Promise(resolve => setImmediate(resolve))
    try { return await submit(...args) }
    finally { inFlight-- }
  }
  const camp = createWorldwideCamp(transport, { online: () => connected })
  for (let profile = 1; profile <= 10; profile++) await camp.join(profile, 'Runner ' + profile)
  connected = false
  for (let profile = 1; profile <= 10; profile++) await camp.record(profile, fixture).done
  connected = true
  const a = camp.syncPending()
  const b = camp.syncPending()
  assert.equal(a, b)
  await Promise.all([a, b])
  assert.equal(peak, 1)
  assert.equal(requests.submissions.length, 10)
  assert.equal(camp.pending(10), 0)
})

test('an existing 4.1 offline receipt retries with its saved identity and UUID after the update', async () => {
  const disk = memory()
  const { requests, flags, transport } = fakeWorld()
  const id = randomUUID()
  disk.setItem('retriever-run.worldwide.v1.test', JSON.stringify({
    members: { 1: { identity: 'test-identity-1', nickname: 'Moss Pup',
      best: { score: 165, distance: 40, retrieves: 0 }, lastRun: 7 } },
    queue: [{ profile: 1, owner: 'test-identity-1', id, score: 335, distance: 45, retrieves: 1, durationMs: 4000 }],
  }))
  const camp = createWorldwideCamp(transport, { storage: () => disk })
  assert.equal(camp.member(1).lastRun, 7)
  assert.equal(camp.pending(1), 1)
  flags.offline = true
  assert.equal(await camp.sync(1), 'pending')
  assert.equal(camp.pending(1), 1)
  flags.offline = false
  await camp.syncPending()
  assert.equal(camp.pending(1), 0)
  assert.equal(requests.names.length, 0)
  assert.ok(requests.submissions.every(item => item.id === id && item.identity === 'test-identity-1'))
  assert.equal(camp.record(1, fixture), null)
})

test('Season One keeps the anonymous profile, resets bests, and only queues a ticket issued at the start', async () => {
  const storage = memory()
  const id = 'ee9d3178-869a-4f33-a53d-739001dcd331'
  const old = 'e47f6521-6ed3-4b98-8ca5-b5f2d7cdff44'
  const key = 'retriever-run.worldwide.v1.season-test'
  const summary = { score: 335, distance: 45, retrieves: 1, duration: 4 }
  const season = { season: 'season-one', generation: 1 }
  const sent = []
  storage.setItem(key, JSON.stringify({
    members: { 1: { nickname: 'Marsh Scout', identity: 'existing-identity',
      lastRun: 12, best: { score: 89999, distance: 10500, retrieves: 9 } } },
    queue: [{ profile: 1, owner: 'existing-identity', id: old, score: 335, distance: 45, retrieves: 1, durationMs: 4000 }],
  }))
  let connected = true
  const transport = {
    namespace: 'season-test',
    async startRun(profile, owner) {
      assert.equal(owner, 'existing-identity')
      return { status: 'ok', ...season, run_id: id }
    },
    async submit(profile, owner, run) {
      sent.push(run.id)
      return { status: 'ok', ...season, score: run.score, distance: run.distance, retrieves: run.retrieves }
    },
  }
  const options = { storage: () => storage, online: () => connected, uuid: () => { throw Error('not a server ticket') } }
  let camp = createWorldwideCamp(transport, options)
  assert.equal(camp.pending(1), 1)
  assert.equal((await camp.beginRun(1)).run_id, id)
  assert.equal(camp.member(1).best, null)
  assert.equal(camp.pending(1), 0)
  assert.equal(camp.member(1).identity, 'existing-identity')

  const permit = camp.beginRun(1)
  connected = false
  assert.equal(camp.record(1, { ...summary, id: 13, practice: true }, permit), null)
  assert.equal(await camp.record(1, { ...summary, id: 13 }, permit).done, 'pending')
  assert.equal(await camp.record(1, { ...summary, id: 14 }, camp.beginRun(1)).done, 'unranked')
  camp = createWorldwideCamp(transport, options)
  assert.equal(camp.season(), 'season-one')
  connected = true
  assert.equal(await camp.sync(1), 'sent')
  assert.deepEqual(sent, [id])
  assert.equal(camp.member(1).best.score, 335)
})
