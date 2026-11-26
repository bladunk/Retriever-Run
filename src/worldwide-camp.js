import { boardCap, boardPageSize, campMetrics, campNickname, canPostRun, runIdPattern, validCampRank } from './camp-rules.js'
import { createCampRivals } from './camp-rivals.js'

const preseason = { season: 'preseason', generation: 0 }
const seasonToken = value => ['preseason', 'season-one'].includes(value?.season) &&
  Number.isSafeInteger(value.generation) && value.generation >= 0
  ? { season: value.season, generation: value.generation } : null
const sameSeason = (a, b) => a.season === b.season && a.generation === b.generation
const cacheMs = 60_000
const metrics = value => Object.fromEntries(campMetrics.map(key => [key,
  Number.isSafeInteger(value?.[key]) && value[key] >= 0 ? value[key] : 0]))
const improves = (result, best) => campMetrics.some(key => result[key] > best[key])
const belongsTo = (item, profile, member) => item.profile === profile && item.owner === member.identity
const validIdentity = value => typeof value === 'string' && Boolean(value.trim()) && value.length <= 128

export function createWorldwideCamp(transport, {
  storage = () => globalThis.localStorage,
  online = () => globalThis.navigator?.onLine !== false,
  now = Date.now,
  uuid = () => globalThis.crypto.randomUUID(),
} = {}) {
  const key = 'retriever-run.worldwide.v1.' + (transport?.namespace ?? '')
  const members = new Map()
  const cache = new Map()
  const reading = new Map()
  const sending = new Map()
  const joining = new Map()
  const retryAt = new Map()
  let queue = []
  let active = preseason
  let cacheVersion = 0
  let draining

  if (transport) {
    try {
      const saved = JSON.parse(storage().getItem(key))
      active = seasonToken(saved?.active) ?? preseason
      for (const [profile, raw] of Object.entries(saved?.members ?? {})) {
        const nickname = campNickname(raw?.nickname)
        if (!nickname || !/^\d+$/.test(profile) || !validIdentity(raw.identity)) continue
        members.set(Number(profile), {
          nickname, identity: raw.identity, best: raw.best ? metrics(raw.best) : null,
          lastRun: Number.isSafeInteger(raw.lastRun) ? raw.lastRun : 0,
        })
      }
      if (Array.isArray(saved?.queue)) queue = saved.queue.map(run => ({ ...run, ...(seasonToken(run) ?? preseason) })).filter(run => {
        const member = members.get(run?.profile)
        return member && sameSeason(run, active) && belongsTo(run, run.profile, member) && runIdPattern.test(run.id) && canPostRun(run)
      })
    } catch { /* Local gameplay has its own save and stays available. */ }
  }

  const rivals = createCampRivals(transport, { storage, online, now, member: profile => members.get(profile), season: () => active, acceptSeason })

  function persist() {
    try { storage().setItem(key, JSON.stringify({ active, members: Object.fromEntries(members), queue })) }
    catch { /* An in-session sync is still possible. */ }
  }

  function expireBoard() {
    cache.clear()
    cacheVersion++
    rivals.invalidate()
  }

  function acceptSeason(response) {
    const announced = seasonToken(response)
    if (!announced) return sameSeason(active, preseason)
    if (announced.generation < active.generation ||
        (announced.generation === active.generation && !sameSeason(active, announced))) return false
    if (!sameSeason(active, announced)) {
      active = announced
      queue = queue.filter(item => sameSeason(item, active))
      for (const member of members.values()) member.best = null
      retryAt.clear()
      expireBoard()
      persist()
    }
    return true
  }

  function candidates(profile) {
    const member = members.get(profile)
    return member ? queue.filter(item => belongsTo(item, profile, member)) : []
  }

  function keepContenders(profile) {
    const pending = candidates(profile)
    const entries = pending.filter(entry => !pending.some(other =>
      campMetrics.every(metric => other[metric] >= entry[metric]) && improves(other, entry)))
    const winners = new Set()
    for (const metric of campMetrics) {
      let leader
      for (const entry of entries) if (!leader || entry[metric] > leader[metric]) leader = entry
      if (leader) winners.add(leader.id)
    }
    queue = queue.filter(entry => entry.profile !== profile || winners.has(entry.id))
  }

  async function deliver(profile) {
    let status = 'none'
    for (let attempts = 0; attempts < campMetrics.length; attempts++) {
      const member = members.get(profile)
      const run = candidates(profile)[0]
      if (!run) break
      if (!online() || (retryAt.get(profile) ?? 0) > now()) return 'pending'
      let result
      try { result = await transport.submit(profile, member.identity, run) }
      catch { return 'pending' }
      if (members.get(profile) !== member) return 'pending'
      if (seasonToken(result) && !acceptSeason(result)) return 'pending'
      if (result.status === 'season_changed' || !sameSeason(run, active)) {
        queue = queue.filter(item => item.id !== run.id)
        persist()
        status = 'season_changed'
        continue
      }
      if (result.status === 'rate_limited') {
        retryAt.set(profile, now() + cacheMs)
        return 'pending'
      }
      if (['auth_required', 'profile_required', 'reconnect'].includes(result.status)) return 'reconnect'
      if (!['ok', 'duplicate', 'invalid_run'].includes(result.status)) return 'pending'
      if (result.status !== 'invalid_run') {
        member.best = metrics(result)
        expireBoard()
        status = 'sent'
      } else if (status === 'none') status = 'ineligible'
      queue = queue.filter(item => item.id !== run.id &&
        !(belongsTo(item, profile, member) && member.best && !improves(item, member.best)))
      persist()
    }
    return candidates(profile).length ? 'pending' : status
  }

  function sync(profile) {
    if (!transport || !candidates(profile).length) return Promise.resolve('none')
    if (!sending.has(profile)) sending.set(profile, deliver(profile).finally(() => sending.delete(profile)))
    return sending.get(profile)
  }

  async function drainQueue() {
    for (const profile of new Set(queue.map(run => run.profile))) {
      if (!online()) break
      await sync(profile)
    }
  }

  async function claim(profile, nickname) {
    try {
      const result = await transport.nickname(profile, nickname)
      if (result.status !== 'ok') return { status: result.status }
      const claimed = campNickname(result.nickname)
      if (!claimed || claimed !== result.nickname || !validIdentity(result.identity)) return { status: 'unavailable' }
      const previous = members.get(profile)
      const replaced = previous && previous.identity !== result.identity
      if (!previous || replaced) {
        members.set(profile, { identity: result.identity, nickname: result.nickname, best: null, lastRun: 0 })
        queue = queue.filter(item => item.profile !== profile)
        retryAt.delete(profile)
      } else previous.nickname = result.nickname
      persist()
      expireBoard()
      if (!replaced) void sync(profile)
      return { status: 'ok', replaced: Boolean(replaced) }
    } catch { return { status: 'unavailable' } }
  }

  function enqueue(profile, member, report, run, permit) {
    if (members.get(profile) !== member || report.id <= member.lastRun) return null
    if (!acceptSeason(permit) || !sameSeason(seasonToken(permit) ?? preseason, active)) return { status: 'season_changed' }
    if (permit.owner && permit.owner !== member.identity) return { status: 'reconnect' }
    if (permit.status !== 'ok') return { status: permit.status }
    const prior = candidates(profile)
    const best = { ...member.best }
    for (const key of campMetrics) best[key] = Math.max(best[key] ?? -1, ...prior.map(item => item[key]))
    if (!improves(run, best)) return null
    try { run.id = active.season === 'season-one' ? permit.run_id : uuid() } catch { return null }
    if (!runIdPattern.test(run.id)) return { status: 'unranked' }
    Object.assign(run, active)
    member.lastRun = report.id
    queue.push(run)
    keepContenders(profile)
    persist()
    return { status: 'queued', done: sync(profile) }
  }

  return {
    available: Boolean(transport),
    online,
    season: () => active.season,
    member: profile => members.get(profile),
    forget(profile, owner) {
      if (members.get(profile)?.identity !== owner) return
      members.delete(profile)
      queue = queue.filter(run => run.profile !== profile)
      retryAt.delete(profile)
      expireBoard()
      persist()
    },
    pending: profile => candidates(profile).length,
    rival: rivals.read,
    peekRival: rivals.peek,
    sync,
    syncPending() {
      draining ??= drainQueue().finally(() => { draining = undefined })
      return draining
    },
    async join(profile, name) {
      const nickname = campNickname(name)
      if (!nickname) return { status: 'invalid_name' }
      if (!transport) return { status: 'unavailable' }
      if (!online()) return { status: 'offline' }
      const outstanding = joining.get(profile)
      if (outstanding) return outstanding.nickname === nickname ? outstanding.promise : { status: 'busy' }
      const promise = claim(profile, nickname).finally(() => { joining.delete(profile) })
      joining.set(profile, { nickname, promise })
      return promise
    },
    beginRun(profile) {
      const member = members.get(profile)
      if (!member || !transport?.startRun) return null
      if (!online()) return Promise.resolve({ ...active, owner: member.identity, status: active.season === 'preseason' ? 'ok' : 'unranked' })
      return transport.startRun(profile, member.identity).then(permit => {
        if (seasonToken(permit) && !acceptSeason(permit)) return { ...active, status: 'season_changed' }
        return { ...active, ...permit, owner: member.identity }
      }).catch(() => ({ ...active, status: 'unranked' }))
    },
    record(profile, report, permit) {
      const member = members.get(profile)
      if (!transport || !member || report.practice || !Number.isSafeInteger(report.id) || report.id <= member.lastRun) return null
      const run = { profile, owner: member.identity, score: report.score, distance: Math.floor(report.distance),
        retrieves: report.retrieves, durationMs: Math.round(report.duration * 1000) }
      if (!canPostRun(run)) return { status: 'ineligible' }
      if (permit) return {
        status: 'queued',
        done: permit.then(ticket => {
          const result = enqueue(profile, member, report, run, ticket)
          return result?.done ?? result?.status ?? 'none'
        }),
      }
      if (transport.startRun) return { status: 'unranked' }
      return enqueue(profile, member, report, run, { ...preseason, status: 'ok' })
    },
    board(profile, metric, offset = 0) {
      if (!transport) return Promise.resolve({ status: 'unavailable' })
      if (!campMetrics.includes(metric) || !Number.isInteger(offset) || offset < 0 || offset >= boardCap) {
        return Promise.resolve({ status: 'invalid_metric' })
      }
      const owner = members.get(profile)?.identity
      const cacheKey = [owner ?? 'public', metric, offset].join('/')
      const saved = cache.get(cacheKey)
      if (!online()) return Promise.resolve(saved ? { ...saved.result, stale: true, offline: true } : { status: 'offline' })
      if (saved && now() - saved.at < cacheMs) return Promise.resolve(saved.result)
      if (!reading.has(cacheKey)) {
        const version = cacheVersion
        const pending = transport.board(profile, owner, metric, offset, boardPageSize).then(result => {
          if (result.status !== 'ok' || !Array.isArray(result.rows) || !acceptSeason(result)) return { status: 'unavailable' }
          const page = {
            ...result,
            rows: result.rows.filter(validCampRank).slice(0, boardPageSize),
            mine: validCampRank(result.mine) ? result.mine : null,
          }
          if (version === cacheVersion) cache.set(cacheKey, { at: now(), result: page })
          return page
        }).catch(() => saved ? { ...saved.result, stale: true } : { status: 'unavailable' })
          .finally(() => reading.delete(cacheKey))
        reading.set(cacheKey, pending)
      }
      return reading.get(cacheKey)
    },
  }
}
