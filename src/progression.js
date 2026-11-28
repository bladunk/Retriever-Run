import { careerStanding } from './career.js'
import { expeditionRegions, migrationDuration } from './expedition.js'
import { honorById, honorMetrics, localHonors, waterfowlSpecies } from './field-honors.js'
import { obstacles } from './obstacles.js'

export const progressionVersion = 1
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0
const amount = value => Number.isFinite(value) && value >= 0 ? value : 0
const isDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value))
const bestKeys = ['chain','diversity','jumpClears','slidesCleared','geese','routeCount']

export function normalizeProgression(raw) {
  const valid = raw?.version === progressionVersion ? raw : {}
  const honors = {}
  for (const [id, value] of Object.entries(valid.honors ?? {}))
    if (honorById.has(id) && !honorById.get(id).pending && (value === null || isDate(value))) honors[id] = value
  const fields = source => Object.fromEntries(Object.keys(obstacles).map(key => [key, count(source?.[key])]))
  return { version: progressionVersion, honors,
    shifts: count(valid.shifts), routes: count(valid.routes), migrations: count(valid.migrations),
    clears: fields(valid.clears), impacts: fields(valid.impacts),
    best: Object.fromEntries(bestKeys.map(key => [key, count(valid.best?.[key])])),
    metres: expeditionRegions.map(region => amount(valid.metres?.[region.index])),
    boyd: isDate(valid.boyd) ? valid.boyd : null }
}

export function progressionMetrics(player, result) {
  const p = player.progression
  const rows = player.wildlife.species
  const stats = player.stats
  const report = result?.field
  const values = new Map()
  const set = (key, val) => values.set(key, amount(val))
  const discoveries = Object.values(rows).filter(row => row.seen)
  for (const [id, row] of Object.entries(rows)) {
    set('seen:' + id, row.seen)
    set('retrieve:' + id, row.retrieves)
  }
  set('species-count', discoveries.length)
  set('waterfowl-count', waterfowlSpecies.filter(animal => rows[animal.id]?.seen).length)
  set('rare-count', discoveries.reduce((sum, row) => sum + row.rare, 0))
  for (const region of expeditionRegions) {
    const last = expeditionRegions[region.index + 1]?.seconds ?? migrationDuration
    set('reach:' + region.key, Number(player.migration.farthest > region.index))
    set('traverse:' + region.key, Number(player.migration.duration >= last))
    set('metres:' + region.key, p.metres[region.index])
    set('seconds:' + region.key, player.migration.seconds[region.index])
    set('local-species:' + region.key, discoveries.filter(row => row.regions?.[region.key]).length)
  }
  for (const id of Object.keys(obstacles)) {
    set('clear:' + id, p.clears[id])
    set('impact:' + id, p.impacts[id])
    set('hunt-clear:' + id, report?.clears?.[id])
  }
  for (const [key, value] of Object.entries(stats)) set('total:' + key, value)
  set('total:retrieves', stats.ducks + stats.pheasants)
  set('total:shifts', p.shifts)
  set('total:routes', p.routes)
  set('migration-count', Math.max(p.migrations, Number(player.migration.duration >= migrationDuration)))
  set('families', Object.values(p.clears).filter(Boolean).length)
  for (const [key, value] of Object.entries(stats.deathsBy)) set('death:' + key, value)
  set('early', stats.shortRuns)
  for (const [key, value] of Object.entries({ ...p.best, ...player.records, score: Math.max(player.profile.best, player.masteryBest ?? 0),
    distance: player.profile.farthest, streak: player.profile.streak })) set('best:' + key, value)
  if (result) {
    for (const [key, value] of Object.entries({ time: result.duration, bag: result.retrieves, goose: result.geese,
      jump: result.jumpClears, slide: result.slidesCleared, route: report?.routes, treat: result.treats,
      chain: report?.chain, notes: Object.values(result.wildlife ?? {}).filter(row => row.seen).length })) set('run:' + key, value)
  }
  return values
}

export function advanceFieldwork(p, result) {
  p.shifts += count(result.field?.shifts)
  p.routes += count(result.field?.routes)
  p.migrations += Number(result.duration >= migrationDuration)
  for (const [id, clears] of Object.entries(result.field?.clears ?? {}))
    if (Object.hasOwn(obstacles, id)) p.clears[id] += count(clears)
  if (Object.hasOwn(obstacles, result.hazard)) p.impacts[result.hazard]++
  const best = { chain: result.field?.chain, diversity: Object.keys(result.field?.clears ?? {}).length,
    jumpClears: result.jumpClears, slidesCleared: result.slidesCleared, geese: result.geese, routeCount: result.field?.routes }
  for (const key of bestKeys) p.best[key] = Math.max(p.best[key], count(best[key]))
  for (const region of expeditionRegions) {
    const end = expeditionRegions[region.index + 1]?.marker ?? Infinity
    p.metres[region.index] += Math.max(0, Math.min(result.distance, end) - region.marker)
  }
}

export function awardFieldHonors(player, date = null, result) {
  const values = progressionMetrics(player, result)
  const receipts = player.progression.honors
  const earned = []
  for (const honor of localHonors) {
    if (Object.hasOwn(receipts, honor.id)) continue
    if (!honor.checks.every(({ key, target }) => (result || honorMetrics.get(key).scope !== 'hunt') &&
      (values.get(key) ?? 0) >= target)) continue
    receipts[honor.id] = date
    earned.push(honor)
  }
  return earned
}

const legendaryChoices = ['legend-beyond-the-map','legend-three-migrations','legend-double-bag','legend-never-rattled']

export function masterHunterChecks(player) {
  const values = progressionMetrics(player)
  const earned = player.progression.honors
  const qualifying = Object.keys(earned).filter(id => honorById.get(id)?.qualifies).length
  const verifiedClears = Object.values(player.progression.clears).reduce((sum, clears) => sum + clears, 0)
  const checklist = [
    ['Career level', careerStanding(player.career).level, 100],
    ['Qualifying Field Honors', qualifying, 250],
    ['Territories reached', player.migration.farthest, 15],
    ['Complete Great Migration', Number(player.migration.duration >= migrationDuration), 1],
    ['Verified obstacle clears', verifiedClears, 500],
    ['Different obstacle types cleared', values.get('families'), 10],
    ['Waterfowl species observed', values.get('waterfowl-count'), 10],
    ['Wildlife species observed', values.get('species-count'), 14],
    ['Mallards retrieved', values.get('retrieve:mallard'), 200],
    ['Pheasants retrieved', values.get('retrieve:pheasant'), 60],
    ['Lifetime distance · km', Math.floor(player.stats.distance / 1000), 2000],
    ['Legendary trials', legendaryChoices.filter(id => Object.hasOwn(earned, id)).length, 2],
  ]
  return checklist.map(([label, value, target]) => ({ label, value: value ?? 0, target, met: (value ?? 0) >= target }))
}

export const masterHunterTrials = legendaryChoices.map(id => honorById.get(id).name)

export function qualifyBoyd(player, date) {
  if (player.progression.boyd || !masterHunterChecks(player).every(requirement => requirement.met)) return false
  player.progression.boyd = date
  return true
}
