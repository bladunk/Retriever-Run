import { isWaterHazard, laneWidth, traceContact } from './collision.js'
import { diveWarningLead } from './dive.js'
import { score } from './runner.js'
import { regionAt } from './expedition.js'
import { obstacles } from './obstacles.js'
import { rocks } from './rocks.js'

export const counters = ['treats', 'logs', 'slidesCleared', 'geese', 'ducks', 'pheasants', 'jumps', 'slides']
export const causes = ['water', 'logs', 'geese', 'other']
const logTypes = ['log', 'drift']
const jumpTypes = new Set([...logTypes, 'stream', 'puddle', 'root', 'fence'])

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
  const recoveredRoutes = new Map()
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
    },
    pickup(type, entity) {
      if (finalized) return
      if (type === 'treat') stats.treats++
      if (type === 'mallard') stats.ducks++
      if (type === 'pheasant') stats.pheasants++
      if (entity?.riskRoute && Number.isSafeInteger(entity.rowId)) {
        const key = entity.rowId * 3 + entity.lane + 1
        const count = (recoveredRoutes.get(key) ?? 0) + 1
        recoveredRoutes.set(key, count)
        // Only a small tail of rows is relevant. Entity removal performs the
        // primary idempotency check. The route exit can emit only once.
        if (recoveredRoutes.size > 12) recoveredRoutes.delete(recoveredRoutes.keys().next().value)
        if (entity.riskExit && count === 3) onSkill({ kind: 'risk-route', rowId: entity.rowId, pattern: entity.pattern, lane: entity.lane })
      }
    },
    passed(before, after, entity) {
      if (finalized) return false
      const { type, distance } = entity
      const goose = type === 'goose'
      const rockSize = type === 'rock' ? rocks[entity.variant].size : null
      const jumping = jumpTypes.has(type) || rockSize === 'small' || rockSize === 'medium'
      const signature = type === 'leaning-tree'
      const key = goose ? 'geese' : type === 'branch' || signature ? 'slidesCleared' : jumping ? 'jumpClears' : null
      if (!key || !entity.hazard) return false
      let state = hazards.get(entity)
      if (!state && goose && distance - after.distance <= entity.flightSpeed * diveWarningLead &&
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
          (goose && state && (before.lane !== state.lane || after.lane !== state.lane ||
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
      onSkill({ kind: 'obstacle-clear', obstacle: type, action: state.action ?? 'dodge', rowId: entity.rowId, pattern: entity.pattern })
      if (jumping || (signature && state.action === 'jump')) {
        jumpClears++
        if (logTypes.includes(type)) stats.logs++
      } else stats[key]++
      return true
    },
    preview(run) {
      return { ...stats, jumpClears, distance: run.distance, duration: run.elapsed, score: score(run),
        retrieves: run.retrieves, territory: regionAt(run.elapsed).index + 1 }
    },
    finish(run, hazard) {
      if (finalized) return null
      finalized = true
      return { ...this.preview(run), cause: deathCause(hazard), hazard, bestStreak: run.bestStreak }
    },
  }
}
