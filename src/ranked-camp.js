import { campNickname, runIdPattern } from './camp-rules.js'
import { honorById } from './field-honors.js'
import { rankedCourse, rankedVersion, validRankedTrace } from './ranked-replay.js'

export const rankedMetrics = Object.freeze({
  score: 'Highest Score', distance: 'Longest Distance', duration: 'Longest Hunt', retrieves: 'Most Retrieves', combo: 'Longest Combo',
})
export const verifiedHonorIds = new Set(['camp-first-hunt', 'camp-all-boards', 'camp-private-camp',
  ...['score', 'distance', 'retrieves'].flatMap(metric => [1, 2, 3, 4].map(tier => 'camp-' + metric + '-' + tier))])
export const verifiedHonorNames = ids => ids.map(id => honorById.get(id)?.name).filter(Boolean)
export const verifiedHonorRequirements = {
  'camp-first-hunt': 'Complete a replay-verified ranked hunt.',
  'camp-all-boards': 'Place on the verified score, distance and retrieves boards.',
  'camp-private-camp': 'Join a private Camp with a valid invitation.',
  ...Object.fromEntries(Object.entries({ score: [2500, 10000, 25000, 50000], distance: [500, 2000, 5000, 10000],
    retrieves: [1, 5, 10, 25] }).flatMap(([metric, targets]) => targets.map((goal, index) => [
    'camp-' + metric + '-' + (index + 1), 'Reach ' + goal.toLocaleString('en-US') + ' ' +
      { score: 'points', distance: 'meters', retrieves: 'retrieves' }[metric] + ' in one verified hunt.',
  ]))),
}
const cacheTime = 60_000
const pageLimit = 25
const queueLimit = 3
const validRow = row => Number.isSafeInteger(row?.rank) && row.rank > 0 && Number.isSafeInteger(row.value) && row.value > 0 &&
  campNickname(row.nickname) === row.nickname && row.nickname && Number.isFinite(Date.parse(row.recorded_at))
const keepHonors = ids => Array.isArray(ids) ? [...new Set(ids.filter(id => verifiedHonorIds.has(id)))] : []
const retryable = ['pending', 'unavailable', 'rate_limited', 'closed', 'reconnect', 'auth_required', 'verifier_missing', 'schema_missing']
const diagnosticStates = new Set(['ok', 'duplicate', 'closed', 'offline', 'unavailable', 'profile_required', 'queue_full',
  'auth_unavailable', 'auth_required', 'reconnect', 'schema_missing', 'verifier_missing', 'wrong_course', 'wrong_version',
  'pending', 'invalid_run', 'invalid_ticket', 'expired', 'rate_limited'])

export function createRankedCamp(transport, legacy, { store = () => globalThis.localStorage,
  online = () => globalThis.navigator?.onLine !== false, now = Date.now, safe = () => true, onStatus } = {}) {
  const prefix = 'retriever-run.camp.v2.' + transport?.namespace + '.'
  const pending = new Map()
  const boards = new Map()
  const reading = new Map()
  const awards = new Map()
  const member = legacy.member
  let syncing
  let boardEpoch = 0

  function invalidateBoards() {
    boardEpoch++
    boards.clear()
  }

  function note(operation, result) {
    if (onStatus) onStatus(operation, diagnosticStates.has(result.status) ? result.status : 'unavailable')
    return result
  }

  function restore() {
    if (!transport) return
    try {
      const saved = store()
      const entries = []
      for (let index = 0; index < saved.length; index++) {
        const key = saved.key(index)
        if (key?.startsWith(prefix + 'hunt.')) entries.push(key)
      }
      for (const key of entries) {
        let item
        try { item = JSON.parse(saved.getItem(key)) } catch { /* Treat a corrupt item separately. */ }
        if (item && validRankedTrace(item.body) && key === prefix + 'hunt.' + item.body.ticket &&
            runIdPattern.test(item.body.ticket) && item.body.course === rankedCourse && item.body.season === rankedVersion &&
            member(item.profile)?.identity === item.owner && item.expires > now()) pending.set(item.body.ticket, item)
        else saved.removeItem(key)
      }
    } catch { /* This device may forbid persistent storage. */ }
  }

  function forget(ticket) {
    pending.delete(ticket)
    try { store().removeItem(prefix + 'hunt.' + ticket) } catch { /* Still removed from the live queue. */ }
  }

  function count(profile) {
    return [...pending.values()].filter(item => item.profile === profile && item.owner === member(profile)?.identity && item.expires > now()).length
  }

  function remember(profile, owner, ids, complete = false) {
    const known = complete ? [] : honors(profile)
    const earned = keepHonors([...known, ...keepHonors(ids)])
    awards.set(owner, earned)
    try { store().setItem(prefix + 'honors.' + owner, JSON.stringify(earned)) } catch { /* Session-only. */ }
  }

  function honors(profile) {
    const identity = member(profile)?.identity
    if (!identity) return []
    if (!awards.has(identity)) {
      try { awards.set(identity, keepHonors(JSON.parse(store().getItem(prefix + 'honors.' + identity)))) }
      catch { awards.set(identity, []) }
    }
    return awards.get(identity)
  }

  async function send(picks) {
    let result = { status: 'none' }
    for (const item of picks) {
      if (item.expires <= now() || member(item.profile)?.identity !== item.owner) {
        forget(item.body.ticket)
        continue
      }
      if (!online() || !safe() || item.retryAt > now()) return { status: 'pending' }
      try { result = await transport.rankedVerify(item.profile, item.owner, item.body) }
      catch { result = { status: 'unavailable' } }
      note('verify', result)
      if (member(item.profile)?.identity !== item.owner) continue
      if (retryable.includes(result.status)) {
        item.retryAt = now() + cacheTime
        break
      }
      if (result.status === 'ok' || result.status === 'duplicate') {
        remember(item.profile, item.owner, result.honors)
        invalidateBoards()
      }
      forget(item.body.ticket)
    }
    return result
  }

  function flush(profile, specific) {
    if (!transport || !online() || !safe()) return Promise.resolve({ status: 'pending' })
    if (syncing) {
      if (!specific) return syncing
      return syncing.then(() => flush(profile, specific))
    }
    const picks = [...pending.values()].filter(item => (!profile || item.profile === profile) &&
      (!specific || item.body.ticket === specific)).slice(0, queueLimit)
    const attempt = send(picks).finally(() => { syncing = undefined })
    syncing = attempt
    return attempt
  }

  async function board(profile, metric, scope = 'worldwide', camp = null, offset = 0, refresh = false) {
    if (!transport?.rankedBoard) return note('board', { status: 'schema_missing' })
    const owner = member(profile)?.identity
    const key = JSON.stringify([owner, metric, scope, camp, offset])
    const saved = boards.get(key)
    if (!online()) {
      note('board', { status: 'offline' })
      return saved ? { ...saved.data, stale: true, staleReason: 'offline' } : { status: 'offline' }
    }
    if (!refresh && saved && now() - saved.at < cacheTime) return saved.data
    const epoch = boardEpoch
    const readKey = epoch + '/' + key
    if (reading.has(readKey)) return reading.get(readKey)
    const promise = (async () => {
      try {
        const data = await transport.rankedBoard(profile, owner, { p_metric: metric, p_offset: offset, p_scope: scope, p_camp: camp })
        if (owner !== member(profile)?.identity) return note('board', { status: 'reconnect' })
        if (epoch !== boardEpoch) return board(profile, metric, scope, camp, offset, true)
        if (data.status !== 'ok') return note('board', data)
        if (data.season !== rankedVersion || data.course !== rankedCourse) return note('board', { status: 'wrong_version' })
        const clean = { ...data, rows: data.rows.filter(validRow).slice(0, pageLimit),
          mine: validRow(data.mine) ? data.mine : null, rivals: data.rivals.filter(validRow).slice(0, 2) }
        if (boards.size >= 24) boards.delete(boards.keys().next().value)
        boards.set(key, { at: now(), data: clean })
        note('board', { status: clean.authStatus ?? (clean.open ? 'ok' : 'closed') })
        return clean
      } catch {
        note('board', { status: 'unavailable' })
        return saved ? { ...saved.data, stale: true, staleReason: 'unavailable' } : { status: 'unavailable' }
      }
    })().finally(() => reading.delete(readKey))
    reading.set(readKey, promise)
    return promise
  }

  restore()

  return {
    available: Boolean(transport),
    member,
    pending: count,
    honors,
    flush,
    async ticket(profile) {
      const owner = member(profile)?.identity
      if (!owner || !online()) return { status: owner ? 'offline' : 'profile_required' }
      if (count(profile) >= queueLimit) return { status: 'queue_full' }
      try {
        const ticket = await transport.rankedTicket(profile, owner, rankedCourse)
        if (ticket.status !== 'ok') return note('ticket', ticket)
        if (ticket.season !== rankedVersion || ticket.course !== rankedCourse) return note('ticket', { status: 'wrong_version' })
        if (!runIdPattern.test(ticket.id) ||
          !Number.isInteger(ticket.seed) || ticket.seed < 0 || ticket.seed > 0xffffffff ||
          !(Date.parse(ticket.expires) > now())) return note('ticket', { status: 'unavailable' })
        return note('ticket', { ...ticket, owner, profile })
      } catch { return note('ticket', { status: 'unavailable' }) }
    },
    finish(permit, trace) {
      if (!permit || !validRankedTrace(trace)) return { status: 'invalid_run' }
      if (member(permit.profile)?.identity !== permit.owner || Date.parse(permit.expires) <= now())
        return { status: 'expired' }
      if (count(permit.profile) >= queueLimit) return { status: 'queue_full' }
      const id = permit.id
      const item = { profile: permit.profile, owner: permit.owner, expires: Date.parse(permit.expires),
        body: { ticket: id, season: rankedVersion, course: rankedCourse, ...trace } }
      pending.set(id, item)
      try { store().setItem(prefix + 'hunt.' + id, JSON.stringify(item)) } catch { /* Keep the in-session submission. */ }
      return { status: 'pending', done: flush(permit.profile, id) }
    },
    board,
    async publicProfile(nickname) {
      if (!transport || !online()) return { status: 'offline' }
      try { return await transport.rankedProfile(nickname) } catch { return { status: 'unavailable' } }
    },
    async social(profile, action, options) {
      const owner = member(profile)?.identity
      if (!owner) return { status: 'profile_required' }
      if (!online()) return { status: 'offline' }
      try {
        const data = await transport.social(profile, owner, action, options)
        if (owner !== member(profile)?.identity) return { status: 'reconnect' }
        if (data.status === 'ok') {
          if (action === 'profile') remember(profile, owner, data.honors, true)
          else if (/^(camp|friend)_/.test(action) && action !== 'camp_detail') invalidateBoards()
        }
        return data
      } catch { return { status: 'unavailable' } }
    },
    async erase(profile, confirm) {
      const owner = member(profile)?.identity
      if (!owner) return { status: 'profile_required' }
      if (!online()) return { status: 'offline' }
      try {
        const result = await transport.erase(profile, owner, confirm)
        if (result.status === 'ok' && owner === member(profile)?.identity) {
          for (const item of pending.values()) if (item.owner === owner) forget(item.body.ticket)
          remember(profile, owner, [], true)
          legacy.forget(profile, owner)
          invalidateBoards()
        }
        return result
      } catch { return { status: 'unavailable' } }
    },
  }
}
