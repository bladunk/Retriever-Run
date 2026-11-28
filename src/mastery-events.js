import { laneWidth, traceContact } from './collision.js'
import { getHeight, pickupElevation, touchesPickup } from './runner.js'
import { slideDepth } from './collision.js'

// Intersect the same fixed step that drives the dog and the bobbing treat.
// Interpolate vertical pose in the overlap instead of requiring a rendered sample.
export function sweptPickup(previous, current, item) {
  if (item.hazard) return false
  if (item.type !== 'treat') return touchesPickup(current, item)
  let begin = 0
  let end = 1
  for (const [from, to, center, half] of [
    [previous.distance, current.distance, item.distance, .54],
    [previous.x, current.x, item.lane * laneWidth, .66],
  ]) {
    const movement = to - from
    if (!movement) {
      if (Math.abs(from - center) >= half) return false
      continue
    }
    const a = (center - half - from) / movement
    const b = (center + half - from) / movement
    begin = Math.max(begin, Math.min(a, b))
    end = Math.min(end, Math.max(a, b))
    if (begin >= end) return false
  }
  for (const fraction of [begin, (begin + end) * .5, end]) {
    const jump = previous.jump + (current.jump - previous.jump) * fraction
    const slide = previous.slide + (current.slide - previous.slide) * fraction
    const elapsed = previous.elapsed + (current.elapsed - previous.elapsed) * fraction
    const height = getHeight({ jump })
    const pickup = pickupElevation(item, elapsed)
    if (pickup > height - .22 && pickup < height + 1.36 - .38 * slideDepth(slide)) return true
  }
  return false
}

export function collectMastery(run, item, collect) {
  const result = collect(run, item.type)
  const milestone = item.type === 'treat' && [5, 10, 15, 25, 40].includes(run.streak)
  const extra = milestone ? Math.min(50, run.streak * 2) : 0
  run.scoreBonus += extra
  return { ...result, milestone, points: result.points + extra }
}

export function createSkillTracker() {
  const pending = new Map()
  const before = {}
  const after = {}
  let decided = -1
  return (previous, run, entities, earned = () => {}) => {
    for (const item of entities) {
      const { rowId, distance } = item
      if (!item.hazard || rowId <= decided || item.type === 'goose' || item.type === 'washout' ||
          distance - run.distance > 2.7 || previous.distance - distance > 3.3) continue
      let row = pending.get(rowId)
      if (!row) {
        row = { distance, clear: false, near: false }
        pending.set(rowId, row)
      }
      if (run.jump || run.slide || previous.jump || previous.slide) {
        Object.assign(before, previous, { jump: 0, slide: 0 })
        Object.assign(after, run, { jump: 0, slide: 0 })
        row.clear ||= Boolean(traceContact(before, after, item))
      }
      if (!item.wide && run.elapsed - run.lastLaneAt <= 1.15 && run.lastLaneFrom === item.lane) {
        Object.assign(before, previous, { x: item.lane * laneWidth, lane: item.lane })
        Object.assign(after, run, { x: before.x, lane: item.lane })
        row.clear ||= Boolean(traceContact(before, after, item))
        if (!row.near) {
          const offset = Math.sign(item.lane * laneWidth - run.x) * .18
          Object.assign(before, previous, { x: previous.x + offset })
          Object.assign(after, run, { x: run.x + offset })
          row.near = Boolean(offset && traceContact(before, after, item))
        }
      }
    }
    for (const [id, row] of pending) {
      if (run.distance - row.distance <= 3.15) break
      pending.delete(id)
      decided = id
      run.cleanStreak = row.clear || row.near ? run.cleanStreak + 1 : 0
      run.bestCleanStreak = Math.max(run.bestCleanStreak, run.cleanStreak)
      if (row.near) {
        run.nearMisses++
        run.scoreBonus += 24
        earned('near', 24)
      }
      if (run.cleanStreak && run.cleanStreak % 6 === 0) {
        const points = 30 + Math.min(18, run.cleanStreak)
        run.scoreBonus += points
        earned('clean', points)
      }
    }
  }
}
