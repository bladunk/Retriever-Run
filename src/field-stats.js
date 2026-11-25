import { isWaterHazard, laneWidth, traceContact } from './collision.js'
import { diveWarningLead } from './dive.js'
import { courseRuleset } from './ruleset.js'
import { score } from './runner.js'
import { expeditionRegions, regionAt } from './expedition.js'
import { obstacles } from './obstacles.js'
import { fieldSpecies, retrieveSpecies } from './wildlife-catalog.js'
import { rocks } from './rocks.js'

export const counters = ['treats', 'logs', 'slidesCleared', 'geese', 'ducks', 'pheasants', 'jumps', 'slides']
export const causes = ['water', 'logs', 'geese', 'other']
const logTypes = ['log', 'drift']
const jumpTypes = new Set([...logTypes, 'stream', 'puddle', 'root', 'fence'])
const expeditionKeys = new Set(expeditionRegions.map(region => region.key))

export const causeNames = { water: 'Water', logs: 'Timber', geese: 'Diving geese', other: 'Other hazards' }
export function deathCause(hazard) {
  if (isWaterHazard(hazard)) return 'water'
  if (hazard === 'fallen' || hazard === 'leaning-tree') return 'logs'
  if (logTypes.includes(hazard)) return 'logs'
  if (hazard === 'goose') return 'geese'
  return 'other'
}

export const hazardName = hazard => obstacles[hazard]?.name ?? 'Trail hazard'

export function createRunStatistics(runId, onSkill = () => {}) {
  const stats = Object.fromEntries(counters.map(key => [key, 0]))
  const hazards = new WeakMap()
  const standingBefore = {}
  const standingAfter = {}
  const discovered = new Set()
  const recoveredRoutes = new Map()
  const observed = new Set()
  const wildlife = {}
  const field = { clears: {}, shifts: 0, routes: 0, chain: 0 }
  let chain = 0
  let lastClear = -Infinity
  let finalized = false
  let jumpClears = 0

  function wouldHit(before, after, entity, originalLane) {
    Object.assign(standingBefore, before, { jump: 0, slide: 0 })
    Object.assign(standingAfter, after, { jump: 0, slide: 0 })
    if (originalLane !== undefined) {
      standingBefore.lane = standingAfter.lane = originalLane
      standingBefore.x = standingAfter.x = originalLane * laneWidth
    }
    return traceContact(standingBefore, standingAfter, entity)
  }

  return {
    runId,
    stats,
    action(move) {
      if (!finalized && move === 'jump') stats.jumps++
      if (!finalized && move === 'slide') stats.slides++
      if (!finalized && (move === 'left' || move === 'right')) field.shifts++
    },
    discover(region, elapsed) {
      if (finalized || discovered.has(region.key)) return
      discovered.add(region.key)
      onSkill({ kind: 'territory', territory: region.key, elapsed })
    },
    observe(event) {
      if (finalized || observed.has(event.id) || !Object.hasOwn(fieldSpecies, event.species)) return
      observed.add(event.id)
      const row = wildlife[event.species] ??= { seen: 0, retrieves: 0, rare: 0, territory: null }
      row.seen++
      row.rare += Number(event.rarity === 'rare' || event.rarity === 'exceptional')
      row.territory ??= event.territory
      if (expeditionKeys.has(event.territory)) {
        const regions = row.regions ??= {}
        regions[event.territory] = (regions[event.territory] ?? 0) + 1
      }
      onSkill({ kind: 'wildlife-observed', species: event.species, territory: event.territory, rarity: event.rarity })
    },
    pickup(type, entity) {
      if (finalized) return
      if (type === 'treat') stats.treats++
      if (type === 'mallard') stats.ducks++
      if (type === 'pheasant') stats.pheasants++
      if (Object.hasOwn(retrieveSpecies,type)) {
        const row = wildlife[retrieveSpecies[type]] ??= { seen: 0, retrieves: 0, rare: 0, territory: null }
        row.retrieves++
      }
      if (entity?.riskRoute && Number.isSafeInteger(entity.rowId)) {
        const key = entity.rowId * 3 + entity.lane + 1
        const count = (recoveredRoutes.get(key) ?? 0) + 1
        recoveredRoutes.set(key, count)
        // Only a small tail of rows is relevant. Entity removal performs the
        // primary idempotency check. The route exit can emit only once.
        if (recoveredRoutes.size > 12) recoveredRoutes.delete(recoveredRoutes.keys().next().value)
        if (entity.riskExit && count === 3) {
          field.routes++
          onSkill({ kind: 'risk-route', rowId: entity.rowId, pattern: entity.pattern, lane: entity.lane })
        }
      }
    },
    passed(before, after, entity) {
      if (finalized) return false
      const { type, distance } = entity
      const goose = type === 'goose'
      const rockSize = type === 'rock' ? rocks[entity.variant].size : null
      const jumping = jumpTypes.has(type) || rockSize === 'small' || rockSize === 'medium'
      const signature = type === 'leaning-tree'
      const lateral = obstacles[type]?.route === 'dodge' && !goose || type === 'rock' && !jumping
      const key = goose ? 'geese' : type === 'branch' || signature ? 'slidesCleared' : jumping ? 'jumpClears' : lateral ? 'dodge' : null
      if (!key || !entity.hazard) return false
      let state = hazards.get(entity)
      if (!state && (goose || lateral) && distance - after.distance <= (goose ? entity.flightSpeed * diveWarningLead : 18) &&
        after.distance < distance - 3) {
        state = { lane: before.lane, avoided: false, cleared: false }
        hazards.set(entity, state)
      }
      if (state?.cleared || after.distance < distance - 3 || before.distance > distance + 3) return false
      if (!state?.avoided) {
        const vertical = before.jump || after.jump ? 'jump' : before.slide || after.slide ? 'slide' : null
        const action = goose || signature ? vertical
          : jumping ? before.jump || after.jump : before.slide || after.slide
        // Compare the accepted pose to the existing solver in the absence of the
        // action. For a goose, also check the lane held when the flock approached.
        const avoided = Boolean(action && wouldHit(before, after, entity)) ||
          ((goose || lateral) && state && (before.lane !== state.lane || after.lane !== state.lane ||
            Math.abs(after.x - state.lane * laneWidth) > .25) && wouldHit(before, after, entity, state.lane))
        if (avoided) {
          state ??= { cleared: false }
          state.avoided = true
          state.action = vertical
          hazards.set(entity, state)
        }
      }
      if (!state?.avoided || after.distance <= distance + 3) return false
      state.cleared = true
      field.clears[type] = (field.clears[type] ?? 0) + 1
      chain = after.elapsed - lastClear <= 8 ? chain + 1 : 1
      lastClear = after.elapsed
      field.chain = Math.max(field.chain, chain)
      onSkill({ kind: 'obstacle-clear', obstacle: type, action: state.action ?? 'dodge', rowId: entity.rowId, pattern: entity.pattern })
      if (jumping || (signature && state.action === 'jump')) {
        jumpClears++
        if (logTypes.includes(type)) stats.logs++
      } else if (key !== 'dodge') stats[key]++
      return true
    },
    preview(run) {
      const territory = regionAt(run.elapsed)
      return { ...stats, jumpClears, course: courseRuleset, territoryKey: territory.key, distance: run.distance, duration: run.elapsed, score: score(run),
        retrieves: run.retrieves, territory: territory.index + 1 }
    },
    finish(run, hazard) {
      if (finalized) return null
      finalized = true
      return { ...this.preview(run), wildlife, field, cause: deathCause(hazard), hazard, bestStreak: run.bestStreak }
    },
  }
}
