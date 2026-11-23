import { campMetrics, validCampRank } from './camp-rules.js'

const freshFor = 60_000

function publicRow(row) {
  return { rank: row.rank, nickname: row.nickname, recorded_at: row.recorded_at,
    ...Object.fromEntries(campMetrics.map(metric => [metric, row[metric]])) }
}

function snapshot(raw, metric) {
  if (raw?.status !== 'ok') return null
  if (raw.mine === null && raw.rival === null) return { status: 'ok', mine: null, rival: null }
  if (!validCampRank(raw.mine)) return null
  const mine = publicRow(raw.mine)
  if (mine.rank === 1 && raw.rival === null) return { status: 'ok', mine, rival: null }
  if (!validCampRank(raw.rival) || raw.rival.rank !== mine.rank - 1 ||
      raw.rival[metric] < mine[metric] || raw.rival.nickname.toLowerCase() === mine.nickname.toLowerCase()) return null
  return { status: 'ok', mine, rival: publicRow(raw.rival) }
}

export function createCampRivals(transport, { storage, online, now, member,
  season = () => ({ season: 'preseason', generation: 0 }), acceptSeason = () => true }) {
  const storageKey = 'retriever-run.rivals.v1.' + transport?.namespace
  const entries = new Map()
  const requests = new Map()
  let generation = 0

  if (transport) {
    try {
      const raw = JSON.parse(storage().getItem(storageKey))
      for (const [key, value] of Object.entries(raw ?? {})) {
        const [profile, metric] = key.split('/')
        const result = campMetrics.includes(metric) && snapshot(value?.result, metric)
        if (result && member(Number(profile))?.identity === value.owner &&
            Number.isFinite(value.at) && Number.isFinite(new Date(value.at).getTime())) {
          entries.set(key, { ...value, result, generation: -1 })
        }
      }
    } catch { /* Rankings can still be requested online. */ }
  }

  function savedFor(profile, metric) {
    const saved = entries.get(profile + '/' + metric)
    const active = season()
    return saved && member(profile)?.identity === saved.owner && (saved.season ?? 'preseason') === active.season &&
      (saved.seasonGeneration ?? 0) === active.generation ? saved : undefined
  }

  function persist() {
    try { storage().setItem(storageKey, JSON.stringify(Object.fromEntries(entries))) }
    catch { /* The current page still has its last snapshot. */ }
  }

  const withSeason = saved => ({ ...saved.result, season: saved.season ?? 'preseason',
    generation: saved.seasonGeneration ?? 0, at: saved.at })

  return {
    invalidate() { generation++ },
    peek(profile, metric) {
      const saved = savedFor(profile, metric)
      return saved ? { ...withSeason(saved), stale: true } : null
    },
    read(profile, metric, target) {
      const owner = member(profile)?.identity
      if (!campMetrics.includes(metric)) return Promise.resolve({ status: 'invalid_metric' })
      if (!owner) return Promise.resolve({ status: 'unjoined' })
      const saved = savedFor(profile, metric)
      const stale = () => {
        const last = savedFor(profile, metric)
        return last ? { ...withSeason(last), stale: true, offline: !online() }
          : { status: online() ? 'unavailable' : 'offline' }
      }
      if (!online() || typeof transport?.rival !== 'function') return Promise.resolve(stale())
      const fresh = saved?.generation === generation && now() - saved.at < freshFor
      if (fresh && !target) return Promise.resolve(withSeason(saved))

      const revision = generation
      const seat = profile + '/' + metric
      const key = JSON.stringify([owner, seat, revision, target?.nickname, target?.recorded_at])
      if (!requests.has(key)) {
        const task = Promise.resolve().then(() => transport.rival(profile, owner, metric, target)).then(raw => {
          if (member(profile)?.identity !== owner) return { status: 'reconnect' }
          if (revision !== generation) return stale()
          if (raw.status === 'reconnect') return { status: 'reconnect' }
          if (!acceptSeason(raw)) return stale()
          const active = season()
          const result = snapshot(raw, metric)
          if (!result) return stale()
          const at = now()
          const saved = { owner, result, at, generation, season: active.season, seasonGeneration: active.generation }
          entries.set(seat, saved)
          persist()
          return { ...withSeason(saved), passed: target && typeof raw.passed === 'boolean' ? raw.passed : null }
        }).catch(stale).finally(() => requests.delete(key))
        requests.set(key, task)
      }
      return requests.get(key)
    },
  }
}

export function rivalGap(mine, rival) {
  // A later equal result cannot pass an existing record.
  return Math.max(0, rival - mine + 1)
}

export function confirmedRival(before, after, metric, result) {
  return Boolean(!after?.stale && (before?.season ?? 'preseason') === (after?.season ?? 'preseason') &&
    (before?.generation ?? 0) === (after?.generation ?? 0) && before?.mine && before?.rival && after?.mine &&
    after.mine.rank < before.mine.rank && after.mine[metric] === result &&
    result >= before.rival[metric] && after.passed === true)
}
