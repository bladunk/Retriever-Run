import { laneWidth, traceContact } from './collision.js'
import { diveWarningLead } from './dive.js'
import { score } from './runner.js'
import { regionAt } from './expedition.js'

export const counters = ['treats', 'logs', 'slidesCleared', 'geese', 'ducks', 'pheasants', 'jumps', 'slides']
export const causes = ['water', 'logs', 'geese', 'other']
const logTypes = ['log', 'drift']
const jumpTypes = new Set([...logTypes, 'stream', 'puddle', 'root', 'fence'])

export const causeNames = { water: 'Water', logs: 'Timber', geese: 'Diving geese', other: 'Other hazards' }
const hazardNames = {
  stream: 'Creek crossing', puddle: 'Puddle', log: 'Fallen log', drift: 'Driftwood',
  goose: 'Diving goose', fence: 'Fence', branch: 'Overhead branch', root: 'Exposed root', tree: 'Tree trunk',
}

export function deathCause(hazard) {
  if (hazard === 'stream' || hazard === 'puddle') return 'water'
  if (logTypes.includes(hazard)) return 'logs'
  if (hazard === 'goose') return 'geese'
  return 'other'
}

export const hazardName = hazard => hazardNames[hazard] ?? 'Trail hazard'

export function createRunStatistics(runId) {
  const stats = Object.fromEntries(counters.map(key => [key, 0]))
  const hazards = new WeakMap()
  const standingBefore = {}
  const standingAfter = {}
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
    pickup(type) {
      if (finalized) return
      if (type === 'treat') stats.treats++
      if (type === 'mallard') stats.ducks++
      if (type === 'pheasant') stats.pheasants++
    },
    passed(before, after, entity) {
      if (finalized) return false
      const { type, distance } = entity
      const goose = type === 'goose'
      const jumping = jumpTypes.has(type)
      const key = goose ? 'geese' : type === 'branch' ? 'slidesCleared' : jumping ? 'jumpClears' : null
      if (!key || !entity.hazard) return false
      let state = hazards.get(entity)
      if (!state && goose && distance - after.distance <= entity.flightSpeed * diveWarningLead &&
        after.distance < distance - 3) {
        state = { lane: before.lane, avoided: false, cleared: false }
        hazards.set(entity, state)
      }
      if (state?.cleared || after.distance < distance - 3 || before.distance > distance + 3) return false
      if (!state?.avoided) {
        const action = goose ? before.jump || after.jump || before.slide || after.slide
          : jumping ? before.jump || after.jump : before.slide || after.slide
        // Compare the accepted pose to the existing solver in the absence of the
        // action. For a goose, also check the lane held when the flock approached.
        const avoided = Boolean(action && wouldHit(before, after, entity)) ||
          (goose && state && (before.lane !== state.lane || after.lane !== state.lane ||
            Math.abs(after.x - state.lane * laneWidth) > .25) && wouldHit(before, after, entity, state.lane))
        if (avoided) {
          state ??= { cleared: false }
          state.avoided = true
          hazards.set(entity, state)
        }
      }
      if (!state?.avoided || after.distance <= distance + 3) return false
      state.cleared = true
      if (jumping) {
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
