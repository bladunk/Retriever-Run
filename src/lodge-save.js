import { completeRun, normalizeProfile } from './profile.js'
import { causes, counters, createRunStatistics } from './field-stats.js'
import { awardPatches, patches } from './honors.js'
import { applyRunXP, careerStanding, normalizeCareer, xpAt } from './career.js'
import { careerStanding as oldStanding, legacyLevel, normalizeCareer as normalizeLegacyCareer, serviceCredit } from './legacy-career.js'
import { journalIssues, reviewSavedRank } from './career-integrity.js'
import { expeditionRegions, migrationSecondsByTerritory, regionAt, territorySeconds } from './expedition.js'
import { commitWildlife, normalizeWildlife } from './wildlife-journal.js'
import { courseRuleset, legacyMigrationRuleset } from './ruleset.js'
import { defaultGear, kennelCatalog, legacyGear, ownedGear, normalizeKennel, unlocked } from './kennel-catalog.js'
import { advanceFieldwork, awardFieldHonors, masterHunterChecks, normalizeProgression, qualifyBoyd } from './progression.js'

export const saveKey = 'retriever-run.record'
export const saveVersion = 5

export const legacyTerritoryNames = ['Gulf Coast Marsh', 'Southern Cypress Swamp', 'Mississippi Flyway',
  'Arkansas Flooded Timber', 'Midwest Farm Country', 'Prairie Potholes', 'Dakota Wetlands',
  'Northern Borderlands', 'Canadian Boreal Forest', 'Canadian Mountain Wilderness']
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

function normalizePlayer(raw, id, schema, practice) {
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
  const oldMigration = schema === 3 ? raw?.migration : raw?.legacyMigration
  const playtime = player.stats.playtime
  const total = player.stats.runs * territorySeconds
  const trackedDuration = progress => player.stats.runs ?
    Math.min(measure(progress?.duration), player.records.duration) : 0
  if (oldMigration && trackedDuration(oldMigration) > 0) {
    const duration = trackedDuration(oldMigration)
    player.legacyMigration = { duration, farthest: Math.min(10, Math.floor(duration / territorySeconds) + 1),
      seconds: legacyTerritoryNames.map((_, index) => Math.min(measure(oldMigration.seconds?.[index]),
        playtime, index < 9 ? total : Infinity)) }
  }
  const progress = schema >= 4 ? raw?.migration : null
  const migrationDuration = trackedDuration(progress)
  player.migration = {
    duration: migrationDuration,
    farthest: migrationDuration > 0 ? regionAt(migrationDuration).index + 1 : 0,
    seconds: expeditionRegions.map((region, index) => Math.min(measure(progress?.seconds?.[index]),
      playtime, index < expeditionRegions.length - 1 ? total : Infinity)),
  }
  player.wildlife = normalizeWildlife(raw?.wildlife, player.stats)
  player.enrollment = ['guest', 'worldwide', 'returning'].includes(raw?.enrollment)
    ? raw.enrollment : legacy ? 'returning' : null
  const priorLevel = schema === 2 ? legacyLevel(raw?.career?.xp) : undefined
  let previousStanding
  if (schema < saveVersion) {
    player.career = normalizeLegacyCareer(raw?.career, legacy ? serviceCredit(player.stats) : 0, priorLevel)
    reviewSavedRank(player)
    previousStanding = oldStanding(player.career)
    const previousLevel = priorLevel ?? previousStanding.level
    player.career = normalizeCareer({ lastRun: player.career.lastRun,
      xp: raw?.career ? Math.max(previousStanding.xp, xpAt(previousLevel)) : previousStanding.xp,
      legacyXP: previousStanding.xp, legacyLevel: raw?.career ? previousLevel : 0,
      legacyRank: previousStanding.rank.name })
  } else player.career = normalizeCareer(raw?.career)
  player.progression = normalizeProgression(practice ? null : raw?.progression)
  player.progression.paused = Boolean(journalIssues(player).length)
  if (!practice && !player.progression.paused) {
    awardFieldHonors(player)
  }
  if (player.progression.boyd && (player.progression.paused || !masterHunterChecks(player).every(requirement => requirement.met)))
    player.progression.boyd = null
  player.kennel = normalizeKennel(legacy ? raw?.kennel ?? legacyGear(player.profile) : raw?.kennel,
    careerStanding(player.career), player.progression, previousStanding, priorLevel)
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
  const courses = new Map()
  for (const entry of entries) {
    const course = entry.course ?? 'legacy-10'
    const group = courses.get(course) ?? []
    group.push(entry)
    courses.set(course, group)
  }
  for (const group of courses.values()) {
    for (const metric of metrics) {
      for (const entry of rankRuns(group, metric)) byId.set(entry.id, entry)
    }
  }
  return [...byId.values()].sort((a, b) => a.id - b.id)
}

function normalizeSave(raw, practice) {
  const players = Array.isArray(raw?.players) ? raw.players
    .filter(player => count(player?.id) > 0).map(player => normalizePlayer(player, player.id, raw.version, practice)) : []
  const unique = [...new Map(players.map(player => [player.id, player])).values()]
  if (!unique.length) unique.push(normalizePlayer({ profile: raw?.version == null ? raw : null }, 1,
    raw && raw.version == null && typeof raw === 'object' ? 1 : undefined, practice))
  const known = new Set(unique.map(player => player.id))
  const active = known.has(raw?.active) ? raw.active : unique[0].id
  const entries = new Map()
  for (const item of Array.isArray(raw?.entries) ? raw.entries : []) {
    if (!count(item?.id) || !known.has(item.player) || !validDate(item.date)) continue
    const fields = Object.fromEntries([...metrics, 'duration', ...counters].map(key => [key, measure(item[key])]))
    const current = item.course === courseRuleset || item.course === legacyMigrationRuleset
    const place = current ? regionAt(fields.duration).index + 1 : Math.min(10, Math.floor(fields.duration / territorySeconds) + 1)
    if (count(item.territory) === place) {
      fields.territory = place
      fields.course = current ? item.course : 'legacy-10'
      fields.territoryKey = current ? regionAt(fields.duration).key : undefined
    }
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
    if (![1, 2, 3, 4, saveVersion].includes(raw.version) || !Array.isArray(raw.players) ||
        !raw.players.some(player => count(player?.id) > 0)) return null
    return raw
  } catch { return null }
}

export function openLodge(storage = () => globalThis.localStorage, now = () => new Date(), { practice = false } = {}) {
  const key = practice ? practiceSaveKey : saveKey
  const backup = key + '.backup'
  let raw
  let recovered = false
  let lastRead
  try {
    const disk = storage()
    lastRead = disk.getItem(key)
    raw = readSave(lastRead)
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
  let save = normalizeSave(futureSave ? null : raw, practice)
  let unsavedProgress = false
  const liveTrackers = new WeakSet()
  const refresh = () => {
    try {
      if (unsavedProgress) return false
      const serialized = storage().getItem(key)
      if (serialized === lastRead) return false
      const newer = readSave(serialized)
      if (!newer || newer.version > saveVersion) return false
      save = normalizeSave(newer, practice)
      lastRead = serialized
      return true
    } catch { return false }
  }
  const commit = () => {
    if (futureSave) return false
    try {
      const disk = storage()
      const previous = disk.getItem(key)
      const prior = readSave(previous)
      if (prior?.version > saveVersion) return false
      if (lastRead !== undefined && previous !== lastRead) return false
      const next = JSON.stringify(save)
      if (previous === next) return true
      // Write a last-known-good copy before replacing the single-key snapshot.
      if (prior) {
        try { disk.setItem(backup, previous) } catch { /* The current snapshot remains the priority under quota pressure. */ }
      }
      disk.setItem(key, next)
      lastRead = next
      unsavedProgress = false
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
    board: (metric, course) => rankRuns(course ? save.entries.filter(run => (run.course ?? 'legacy-10') === course) : save.entries, metric),
    beginRun(onSkill) {
      const tracker = createRunStatistics(save.nextRun++, onSkill)
      liveTrackers.add(tracker)
      return tracker
    },
    enroll(id, name, enrollment) {
      const player = save.players.find(player => player.id === id)
      if (!player) return false
      player.enrollment = enrollment
      player.nickname = nickname(name, player.nickname)
      return commit()
    },
    equip(category, itemId) {
      const player = current()
      if (category === 'coat' && player.kennel.breed === 'boyd') return false
      const item = kennelCatalog[category]?.find(entry => entry.id === itemId)
      if (!unlocked(item, careerStanding(player.career), player.kennel, player.progression)) return false
      player.kennel.equipment[category] = itemId
      commit()
      return true
    },
    favorite(itemId) {
      if (!Object.values(kennelCatalog).some(items => items.some(item => item.id === itemId))) return false
      const favorites = current().kennel.favorites
      const index = favorites.indexOf(itemId)
      if (index < 0) favorites.push(itemId)
      else favorites.splice(index, 1)
      return commit()
    },
    resetGear() {
      const kennel = current().kennel
      kennel.equipment = defaultGear(kennel.breed)
      commit()
    },
    selectBreed(breed) {
      const player = current()
      if (practice || !['lab', 'boyd'].includes(breed) || breed === 'boyd' && !player.progression.boyd) return false
      if (player.kennel.breed === breed) return true
      const kennel = player.kennel
      kennel.outfits[kennel.breed] = kennel.equipment
      kennel.breed = breed
      kennel.equipment = kennel.outfits[breed] ?? defaultGear(breed)
      delete kennel.outfits[breed]
      commit()
      return true
    },
    select(id) {
      if (!save.players.some(player => player.id === id)) return
      save.active = id
      commit()
    },
    newPlayer(name) {
      const player = normalizePlayer({ nickname: name, enrollment: 'guest' }, save.nextPlayer++, saveVersion, practice)
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
      const live = liveTrackers.delete(tracker)
      const rebased = !futureSave && refresh()
      const player = save.players.find(player => player.id === id)
      const runId = live && rebased ? Math.max(tracker.runId, save.nextRun) : tracker.runId ?? save.nextRun
      if (!player || !count(runId) || runId <= player.career.lastRun ||
          save.entries.some(entry => entry.id === runId)) return null
      const result = player && tracker.finish(run, hazard)
      if (!result) return null
      save.nextRun = Math.max(save.nextRun, runId + 1)
      const date = now().toISOString()
      const previousBest = player.profile.best
      const oldGear = practice ? [] : ownedGear(player, careerStanding(player.career))
      const newWildlife = practice ? [] : commitWildlife(player.wildlife, result, runId, date)
      const statistics = player.stats
      statistics.runs++
      statistics.deaths++
      statistics.failureStreak++
      statistics.distance += result.distance
      statistics.playtime += result.duration
      if (!practice) {
        if (!player.progression.migrations && player.migration.duration >= expeditionRegions.length * territorySeconds)
          player.progression.migrations = 1
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
      player.progression.paused = !plausible
      const earned = plausible || practice ? awardPatches(player, date) : []
      if (!practice && plausible) advanceFieldwork(player.progression, result)
      const newHonors = !practice && plausible ? awardFieldHonors(player, date, result) : []
      const career = practice ? null : applyRunXP(player.career, runId, result, improved, newHonors.filter(honor => honor.qualifies).length)
      const boyd = !practice && plausible && qualifyBoyd(player, date)
      const previous = new Set(oldGear.map(item => item.id))
      const gear = career ? ownedGear(player, career.after).filter(item => !previous.has(item.id)) : []
      const entry = { ...result, id: runId, player: id, date }
      delete entry.wildlife
      delete entry.field
      save.entries = retainedEntries([...save.entries, entry])
      const placements = emptyCounts(metrics)
      const courseEntries = save.entries.filter(run => run.course === entry.course)
      for (const metric of metrics) placements[metric] = rankRuns(courseEntries, metric).findIndex(run => run.id === entry.id) + 1
      const saved = commit()
      if (!saved) unsavedProgress = true
      return { ...result, id: entry.id, nickname: player.nickname, date, improved, earned, placements,
        career, gear, practice, newWildlife, newHonors, boyd, saved, previousBest }
    },
  }
}
