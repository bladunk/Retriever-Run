import { completeRun, normalizeProfile } from './profile.js'
import { causes, counters } from './field-stats.js'
import { awardPatches, patches } from './honors.js'

export const saveKey = 'retriever-run.record'
export const saveVersion = 1
export const boardLimit = 20
export const categories = { score: 'Highest Score', distance: 'Longest Distance', retrieves: 'Most Retrieves' }
const metrics = Object.keys(categories)
const records = { duration: 'Time survived', treats: 'Treats in one run', retrieves: 'Retrieves in one run',
  logs: 'Logs jumped in one run', slidesCleared: 'Slides cleared in one run', geese: 'Geese dodged in one run' }
export const personalRecordLabels = { score: 'Highest score', distance: 'Longest run', ...records }

const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0
const measure = value => Number.isFinite(value) && value >= 0 ? value : 0
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const nickname = (value, fallback) => (typeof value === 'string' ? value.trim().slice(0, 24) : '') || fallback
const emptyCounts = keys => Object.fromEntries(keys.map(key => [key, 0]))

function normalizePlayer(raw, id) {
  const base = raw?.stats ?? {}
  return {
    id,
    nickname: nickname(raw?.nickname, id === 1 ? 'Marsh Runner' : 'Runner ' + id),
    profile: normalizeProfile(raw?.profile),
    stats: {
      ...Object.fromEntries(counters.map(key => [key, count(base[key])])),
      runs: count(base.runs), distance: measure(base.distance), playtime: measure(base.playtime),
      points: count(base.points), deaths: count(base.deaths), shortRuns: count(base.shortRuns),
      deathsBy: Object.fromEntries(causes.map(cause => [cause, count(base.deathsBy?.[cause])])),
      lastHazard: typeof base.lastHazard === 'string' ? base.lastHazard : '',
      failureStreak: count(base.failureStreak), sameHazardStreak: count(base.sameHazardStreak),
      earlyStreak: count(base.earlyStreak), longestSameHazard: count(base.longestSameHazard),
      longestEarlyStreak: count(base.longestEarlyStreak),
    },
    records: Object.fromEntries(Object.keys(records).map(key => [key, measure(raw?.records?.[key])])),
    patches: Object.fromEntries(patches.flatMap(patch => {
      const dates = raw?.patches?.[patch.id]
      return Array.isArray(dates) ? [[patch.id, dates.filter(validDate).slice(0, patch.goals.length)]] : []
    })),
  }
}

export function rankRuns(entries, metric) {
  const priorities = [metric, ...metrics.filter(key => key !== metric)]
  return [...entries].sort((a, b) => {
    for (const key of priorities) {
      if (a[key] !== b[key]) return b[key] - a[key]
    }
    return a.id - b.id
  }).slice(0, boardLimit)
}

function retainedEntries(entries) {
  const byId = new Map()
  for (const metric of metrics) {
    for (const entry of rankRuns(entries, metric)) byId.set(entry.id, entry)
  }
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

function normalizeSave(raw) {
  const players = Array.isArray(raw?.players) ? raw.players
    .filter(player => count(player?.id) > 0).map(player => normalizePlayer(player, player.id)) : []
  const unique = [...new Map(players.map(player => [player.id, player])).values()]
  if (!unique.length) unique.push(normalizePlayer({ profile: raw?.version == null ? raw : null }, 1))
  const known = new Set(unique.map(player => player.id))
  const active = known.has(raw?.active) ? raw.active : unique[0].id
  const entries = new Map()
  for (const item of Array.isArray(raw?.entries) ? raw.entries : []) {
    if (!count(item?.id) || !known.has(item.player) || !validDate(item.date)) continue
    const fields = Object.fromEntries([...metrics, 'duration', ...counters].map(key => [key, measure(item[key])]))
    entries.set(item.id, { id: item.id, player: item.player, date: item.date, ...fields })
  }
  const nextPlayer = Math.max(count(raw?.nextPlayer), Math.max(...known) + 1)
  return {
    version: saveVersion, active, players: unique, entries: retainedEntries([...entries.values()]),
    nextPlayer,
    nextRun: Math.max(1, count(raw?.nextRun), ...[...entries.keys()].map(id => id + 1)),
  }
}

export function openLodge(storage = () => globalThis.localStorage, now = () => new Date()) {
  let raw
  try { raw = JSON.parse(storage().getItem(saveKey)) } catch { /* Use an in-memory save. */ }
  const futureSave = Number.isInteger(raw?.version) && raw.version > saveVersion
  const save = normalizeSave(futureSave ? null : raw)
  const commit = () => {
    if (futureSave) return
    try { storage().setItem(saveKey, JSON.stringify(save)) } catch { /* Play can continue in memory. */ }
  }
  const current = () => save.players.find(player => player.id === save.active)
  return {
    current,
    commit,
    players: () => save.players,
    nameFor: id => save.players.find(player => player.id === id)?.nickname ?? 'Marsh Runner',
    board: metric => rankRuns(save.entries, metric),
    select(id) {
      if (!save.players.some(player => player.id === id)) return
      save.active = id
      commit()
    },
    newPlayer(name) {
      const player = normalizePlayer({ nickname: name }, save.nextPlayer++)
      save.players.push(player)
      save.active = player.id
      commit()
      return player
    },
    rename(name) {
      const player = current()
      player.nickname = nickname(name, player.nickname)
      commit()
    },
    finalize(id, tracker, run, hazard) {
      const player = save.players.find(player => player.id === id)
      const result = player && tracker.finish(run, hazard)
      if (!result) return null
      const date = now().toISOString()
      const statistics = player.stats
      statistics.runs++
      statistics.deaths++
      statistics.failureStreak++
      statistics.distance += result.distance
      statistics.playtime += result.duration
      statistics.points += result.score
      statistics.deathsBy[result.cause]++
      for (const key of counters) statistics[key] += result[key]
      statistics.sameHazardStreak = statistics.lastHazard === hazard ? statistics.sameHazardStreak + 1 : 1
      statistics.lastHazard = hazard
      statistics.earlyStreak = result.duration < 20 ? statistics.earlyStreak + 1 : 0
      if (result.duration < 10) statistics.shortRuns++
      statistics.longestSameHazard = Math.max(statistics.longestSameHazard, statistics.sameHazardStreak)
      statistics.longestEarlyStreak = Math.max(statistics.longestEarlyStreak, statistics.earlyStreak)

      const improved = []
      if (result.score > player.profile.best) improved.push('score')
      if (Math.floor(result.distance) > player.profile.farthest) improved.push('distance')
      for (const key of Object.keys(records)) {
        if (result[key] <= player.records[key]) continue
        player.records[key] = result[key]
        improved.push(key)
      }
      player.profile = completeRun(player.profile, { ...result, elapsed: result.duration }, result.score)
      const earned = awardPatches(player, date)
      const entry = { ...result, id: save.nextRun++, player: id, date }
      save.entries = retainedEntries([...save.entries, entry])
      const placements = emptyCounts(metrics)
      for (const metric of metrics) placements[metric] = rankRuns(save.entries, metric).findIndex(run => run.id === entry.id) + 1
      commit()
      return { ...result, id: entry.id, nickname: player.nickname, date, improved, earned, placements }
    },
  }
}
