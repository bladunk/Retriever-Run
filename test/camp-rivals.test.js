import assert from 'node:assert/strict'
import test from 'node:test'
import { confirmedRival, rivalGap } from '../src/camp-rivals.js'
import { createCampTransport } from '../src/camp-transport.js'
import { createWorldwideCamp } from '../src/worldwide-camp.js'

const when = '2026-11-20T18:00:00Z'
const row = (rank, nickname, score) => ({ rank, nickname, score, distance: 35, retrieves: 0, recorded_at: when })
const before = { status: 'ok', mine: row(3, 'Marsh Scout', 50), rival: row(2, 'Timber Scout', 60), passed: null }
const after = { status: 'ok', mine: row(2, 'Marsh Scout', 95), rival: row(1, 'Moss Scout', 122), passed: true }
const fixture = { id: 6, score: 95, distance: 35.6, retrieves: 0, duration: 3.16 }

function harness() {
  const records = new Map()
  const storage = { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) }
  const options = { storage: () => storage, online: () => state.online, now: () => state.now }
  const requests = []
  const state = { online: true, now: 50_000, view: before, owner: 'id-1', failure: false, posting: 'ok' }
  const transport = {
    namespace: 'fixture',
    async nickname(profile, nickname) { return { status: 'ok', nickname, identity: state.owner + '/' + profile } },
    async rival(profile, owner, metric, target) {
      requests.push({ profile, owner, metric, target })
      if (state.failure) throw Error('permission denied')
      return state.view
    },
    async submit() { return { status: state.posting, score: 95, distance: 35, retrieves: 0 } },
  }
  const reload = () => createWorldwideCamp(transport, options)
  return { state, requests, camp: reload(), reload, storage }
}

test('rival reads coalesce and cache per member and metric, then reload the last known view offline', async () => {
  const { camp, requests, state, reload } = harness()
  assert.equal((await camp.rival(1, 'score')).status, 'unjoined')
  assert.equal(requests.length, 0)
  await camp.join(1, 'Marsh Scout')
  const first = camp.rival(1, 'score')
  assert.equal(camp.rival(1, 'score'), first)
  assert.equal((await first).rival.nickname, 'Timber Scout')
  assert.equal((await camp.rival(1, 'score')).mine.rank, 3)
  assert.equal(requests.length, 1)
  assert.equal((await camp.rival(1, 'distance')).mine.rank, 3)
  assert.equal(requests.length, 2)
  state.now += 61_000
  state.failure = true
  assert.equal((await camp.rival(1, 'score')).stale, true)
  assert.equal(requests.length, 3)
  state.online = false
  const offline = reload()
  assert.equal((await offline.rival(1, 'score')).offline, true)
  assert.equal((await offline.rival(1, 'score')).rival.nickname, 'Timber Scout')
  assert.equal((await offline.rival(1, 'retrieves')).status, 'offline')
  assert.equal(requests.length, 3)
  assert.equal((await offline.rival(2, 'score')).status, 'unjoined')
})

test('only accepted records with a verified target, real rank gain and matching result confirm an overtake', async () => {
  const { camp, requests, state } = harness()
  await camp.join(1, 'Marsh Scout')
  const initial = await camp.rival(1, 'score')
  assert.equal(rivalGap(initial.mine.score, initial.rival.score), 11)
  assert.equal(rivalGap(60, 60), 1)
  state.posting = 'rate_limited'
  assert.equal(await camp.record(1, fixture).done, 'pending')
  assert.equal(camp.pending(1), 1)
  assert.equal(confirmedRival(initial, initial, 'score', 95), false)
  state.now += 61_000
  state.posting = 'ok'
  state.view = after
  assert.equal(await camp.sync(1), 'sent')
  const result = await camp.rival(1, 'score', initial.rival)
  assert.deepEqual(requests.at(-1).target, initial.rival)
  assert.equal(result.rival.nickname, 'Moss Scout')
  assert.equal(confirmedRival(initial, result, 'score', 95), true)
  assert.equal(confirmedRival(initial, result, 'score', 94), false)
  assert.equal(confirmedRival(initial, { ...result, stale: true }, 'score', 95), false)
  assert.equal(confirmedRival(initial, { ...result, passed: null }, 'score', 95), false)
})

test('invalid results and changed identities cannot supply fabricated or cross-profile rivals', async () => {
  const { camp, requests, state } = harness()
  await camp.join(1, 'Marsh Scout')
  state.view = { ...before, rival: row(1, 'Wrong Rank', 65) }
  assert.equal((await camp.rival(1, 'score')).status, 'unavailable')
  state.view = { status: 'ok', mine: null, rival: null }
  assert.equal((await camp.rival(1, 'score')).rival, null)
  state.view = { status: 'ok', mine: row(1, 'Marsh Scout', 95), rival: null }
  state.now += 61_000
  assert.equal((await camp.rival(1, 'score')).mine.rank, 1)
  state.owner = 'changed'
  await camp.join(1, 'Moss Scout')
  state.online = false
  assert.equal((await camp.rival(1, 'score')).status, 'offline')
  assert.equal(requests.length, 3)
})

test('the rival transport never creates or uses a different anonymous session', async () => {
  let active = 'owner'
  let failedRefresh = false
  let signups = 0
  let reads = 0
  const transport = createCampTransport({ url: 'https://example.invalid', key: 'test' }, { loadSdk: async () => ({
    createClient: () => ({
      auth: {
        getSession: async () => failedRefresh ? { error: { code: 'network_error' } }
          : { data: { session: active && { user: { id: active } } } },
        signInAnonymously: async () => { signups++ },
      },
      rpc: async (name, args) => {
        reads++
        assert.equal(name, 'rr_camp_rival')
        assert.deepEqual(args, { p_metric: 'score', p_compare_name: 'Timber Scout', p_compare_at: when })
        return { data: after }
      },
    }),
  }) })
  assert.equal((await transport.rival(1, 'owner', 'score', before.rival)).status, 'ok')
  active = null
  assert.equal((await transport.rival(1, 'owner', 'score')).status, 'reconnect')
  active = 'unrelated'
  assert.equal((await transport.rival(1, 'owner', 'score')).status, 'reconnect')
  failedRefresh = true
  await assert.rejects(transport.rival(1, 'owner', 'score'))
  await assert.rejects(transport.nickname(1, 'Marsh Scout'))
  assert.equal(signups, 0)
  assert.equal(reads, 1)
})
