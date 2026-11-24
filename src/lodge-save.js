import { completeRun, normalizeProfile } from './profile.js'
import { causes, counters, createRunStatistics } from './field-stats.js'
import { awardPatches, patches } from './honors.js'
import { applyRunXP, careerStanding, legacyLevel, normalizeCareer, serviceCredit } from './career.js'
import { journalIssues, reviewSavedRank } from './career-integrity.js'
import { expeditionRegions, migrationSecondsByTerritory, regionAt, territorySeconds } from './expedition.js'
import { classicGear, kennelCatalog, legacyGear, newGear, normalizeKennel, unlocked } from './kennel-catalog.js'

export const saveKey = 'retriever-run.record'
export const saveVersion = 3
export const practiceSaveKey = saveKey + '.practice'
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

function normalizePlayer(raw, id, schema) {
  const legacy = schema === 1
  const base = raw?.stats ?? {}
  const player = {
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
  const migrationDuration = player.stats.runs ? Math.min(measure(raw?.migration?.duration), player.records.duration) : 0
  player.migration = {
    duration: migrationDuration,
    farthest: migrationDuration > 0 ? regionAt(migrationDuration).index + 1 : 0,
    seconds: expeditionRegions.map((region, index) => Math.min(measure(raw?.migration?.seconds?.[index]),
      player.stats.playtime, index < expeditionRegions.length - 1 ? player.stats.runs * territorySeconds : Infinity)),
  }
  player.enrollment = ['guest', 'worldwide', 'returning'].includes(raw?.enrollment)
    ? raw.enrollment : legacy ? 'returning' : null
  const priorLevel = schema === 2 ? legacyLevel(raw?.career?.xp) : undefined
  player.career = normalizeCareer(raw?.career, legacy ? serviceCredit(player.stats) : 0, priorLevel)
  reviewSavedRank(player)
  player.kennel = normalizeKennel(legacy ? raw?.kennel ?? legacyGear(player.profile) : raw?.kennel,
    careerStanding(player.career), priorLevel)
  return player
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
    .filter(player => count(player?.id) > 0).map(player => normalizePlayer(player, player.id, raw.version)) : []
  const unique = [...new Map(players.map(player => [player.id, player])).values()]
  if (!unique.length) unique.push(normalizePlayer({ profile: raw?.version == null ? raw : null }, 1,
    raw && raw.version == null && typeof raw === 'object' ? 1 : undefined))
  const known = new Set(unique.map(player => player.id))
  const active = known.has(raw?.active) ? raw.active : unique[0].id
  const entries = new Map()
  for (const item of Array.isArray(raw?.entries) ? raw.entries : []) {
    if (!count(item?.id) || !known.has(item.player) || !validDate(item.date)) continue
    const fields = Object.fromEntries([...metrics, 'duration', ...counters].map(key => [key, measure(item[key])]))
    if (count(item.territory) === regionAt(fields.duration).index + 1) fields.territory = item.territory
    entries.set(item.id, { id: item.id, player: item.player, date: item.date, ...fields })
  }
  const nextPlayer = Math.max(count(raw?.nextPlayer), Math.max(...known) + 1)
  return {
    version: saveVersion, active, players: unique, entries: retainedEntries([...entries.values()]),
    nextPlayer,
    nextRun: Math.max(1, count(raw?.nextRun), ...[...entries.keys()].map(id => id + 1),
      ...unique.map(player => player.career.lastRun + 1)),
  }
}

function readSave(serialized) {
  try {
    const raw = JSON.parse(serialized)
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
    if (raw.version == null || raw.version > saveVersion) return raw
    if (![1, 2, 3].includes(raw.version) || !Array.isArray(raw.players) ||
        !raw.players.some(player => count(player?.id) > 0)) return null
    return raw
  } catch { return null }
}

export function openLodge(storage = () => globalThis.localStorage, now = () => new Date(), { practice = false } = {}) {
  const key = practice ? practiceSaveKey : saveKey
  const backup = key + '.backup'
  let raw
  let recovered = false
  try {
    const disk = storage()
    raw = readSave(disk.getItem(key))
    if (!raw) {
      raw = readSave(disk.getItem(backup))
      recovered = Boolean(raw)
    }
    if (!raw && practice) {
      const opening = readSave(disk.getItem(saveKey))
      const settings = opening?.players?.find(player => player.id === opening.active)?.profile ?? opening
      const { quality, comfort, haptics, swipe, masterVolume, musicVolume, wildlifeVolume, ambientVolume, effectsVolume } = settings ?? {}
      raw = { quality, comfort, haptics, swipe, masterVolume, musicVolume, wildlifeVolume, ambientVolume, effectsVolume }
    }
  } catch { /* Use an in-memory save. */ }
  const futureSave = Number.isInteger(raw?.version) && raw.version > saveVersion
  const save = normalizeSave(futureSave ? null : raw)
  const commit = () => {
    if (futureSave) return false
    try {
      const disk = storage()
      const previous = disk.getItem(key)
      const prior = readSave(previous)
      if (prior?.version > saveVersion) return false
      const next = JSON.stringify(save)
      if (previous === next) return true
      // Write a last-known-good copy before replacing the single-key snapshot.
      if (prior) {
        try { disk.setItem(backup, previous) } catch { /* The current snapshot remains the priority under quota pressure. */ }
      }
      disk.setItem(key, next)
      return true
    } catch { return false }
  }
  const current = () => save.players.find(player => player.id === save.active)
  return {
    current,
    localRecovery: recovered ? 'backup' : futureSave ? 'newer-version' : 'normal',
    commit,
    players: () => save.players,
    nameFor: id => save.players.find(player => player.id === id)?.nickname ?? 'Marsh Runner',
    board: metric => rankRuns(save.entries, metric),
    beginRun: onSkill => createRunStatistics(save.nextRun++, onSkill),
    enroll(id, name, enrollment) {
      const player = save.players.find(player => player.id === id)
      if (!player) return false
      player.enrollment = enrollment
      player.nickname = nickname(name, player.nickname)
      return commit()
    },
    equip(category, itemId) {
      const player = current()
      const item = kennelCatalog[category]?.find(entry => entry.id === itemId)
      if (!unlocked(item, careerStanding(player.career), player.kennel.inherited)) return false
      player.kennel.equipment[category] = itemId
      commit()
      return true
    },
    resetGear() {
      current().kennel.equipment = { ...classicGear }
      commit()
    },
    acknowledgePromotion(id) {
      const promotions = current().career.promotions
      if (promotions[0] !== id) return
      promotions.shift()
      commit()
    },
    select(id) {
      if (!save.players.some(player => player.id === id)) return
      save.active = id
      commit()
    },
    newPlayer(name) {
      const player = normalizePlayer({ nickname: name, enrollment: 'guest' }, save.nextPlayer++)
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
      const runId = tracker.runId ?? save.nextRun
      if (!player || !count(runId) || runId <= player.career.lastRun ||
          save.entries.some(entry => entry.id === runId)) return null
      const result = player && tracker.finish(run, hazard)
      if (!result) return null
      save.nextRun = Math.max(save.nextRun, runId + 1)
      const date = now().toISOString()
      const statistics = player.stats
      statistics.runs++
      statistics.deaths++
      statistics.failureStreak++
      statistics.distance += result.distance
      statistics.playtime += result.duration
      if (!practice) {
        player.migration.duration = Math.max(player.migration.duration, result.duration)
        player.migration.farthest = Math.max(player.migration.farthest, result.territory)
        for (const [index, seconds] of migrationSecondsByTerritory(result.duration).entries()) {
          player.migration.seconds[index] += seconds
        }
      }
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
      const plausible = !journalIssues(player).length
      const earned = plausible || practice ? awardPatches(player, date) : []
      const career = practice ? null : applyRunXP(player.career, runId, result, improved, earned, player, plausible)
      const gear = career ? newGear(career.before, career.after, player.kennel.inherited) : []
      const entry = { ...result, id: runId, player: id, date }
      save.entries = retainedEntries([...save.entries, entry])
      const placements = emptyCounts(metrics)
      for (const metric of metrics) placements[metric] = rankRuns(save.entries, metric).findIndex(run => run.id === entry.id) + 1
      commit()
      return { ...result, id: entry.id, nickname: player.nickname, date, improved, earned, placements, career, gear, practice }
    },
  }
}
