import { seededRandom } from './trail.js'

export const laneWidth = 2.3
export const powerDuration = 6
export const jumpDuration = .92
export const slideDuration = .87
export const laneResponse = 17
export const reactionWindow = .38
export const difficultyCurve = [[0, 2], [30, 3.5], [60, 5], [90, 6.5], [120, 8], [180, 9.5]]
const lanes = [-1, 0, 1]
const types = ['log', 'fence', 'puddle', 'branch', 'root']
const bonuses = ['mallard', 'pheasant', 'call', 'decoy']
const clearance = { fence: .99, log: .57, stream: .73, puddle: .44, root: .42, drift: .55 }

export const pickupNames = {
  mallard: 'Mallard retrieve', pheasant: 'Pheasant retrieve', call: 'Duck call', decoy: 'Duck decoy',
}

export function difficultyAt(seconds, curve = difficultyCurve) {
  for (let i = 1; i < curve.length; i++) {
    const [end, high] = curve[i]
    if (seconds <= end) {
      const [start, low] = curve[i - 1]
      return low + (high - low) * Math.max(0, (seconds - start) / (end - start))
    }
  }
  return curve.at(-1)[1]
}

export function speedAt(difficulty) {
  return 11 + (difficulty - 2) * 2.12
}

export function newRun() {
  return { distance: 0, elapsed: 0, scoreBonus: 0, lane: 0, x: 0, jump: 0, slide: 0, power: 0,
    meter: 0, speed: 11, streak: 0, bestStreak: 0, retrieves: 0 }
}

export function act(run, move) {
  if (move === 'left' || move === 'right') {
    run.lane = Math.max(-1, Math.min(1, run.lane + (move === 'left' ? -1 : 1)))
  } else if (move === 'jump' && !run.jump && !run.slide) {
    run.jump = jumpDuration
    return true
  } else if (move === 'slide' && !run.jump && !run.slide) {
    run.slide = slideDuration
    return true
  }
  return false
}

export function getHeight(run) {
  const progress = run.jump / jumpDuration
  return 6.7 * progress * (1 - progress)
}

export function advance(run, dt) {
  const previous = run.distance
  run.elapsed += dt
  run.speed = speedAt(difficultyAt(run.elapsed))
  run.distance += run.speed * dt
  run.x += (run.lane * laneWidth - run.x) * (1 - Math.exp(-laneResponse * dt))
  run.jump = Math.max(0, run.jump - dt)
  run.slide = Math.max(0, run.slide - dt)
  run.power = Math.max(0, run.power - dt)
  return previous
}

export function obstacleOffset(entity, distance) {
  const sweep = entity.type === 'drift' ? (entity.sweep ?? 1) * .69 * Math.sin((distance - entity.distance) * .32) : 0
  return entity.lane * laneWidth + sweep
}

export function collides(run, entity) {
  if (run.power) return false
  if (!entity.wide && entity.type !== 'stream' && Math.abs(run.x - obstacleOffset(entity, run.distance)) > 1.15) return false
  if (entity.type === 'branch') return !run.slide
  return getHeight(run) < clearance[entity.type]
}

export function crossing(previous, distance, entity) {
  const half = entity.type === 'stream' ? .78 : .37
  return previous <= entity.distance + half && distance >= entity.distance - half
}

export function multiplier(streak) {
  return Math.min(4, 1 + Math.floor(streak / 5))
}

export function collect(run, type) {
  const treat = type === 'treat'
  if (treat) {
    run.streak++
    run.bestStreak = Math.max(run.bestStreak, run.streak)
  }
  if (type === 'mallard' || type === 'pheasant') run.retrieves++
  const points = (treat ? 10 * multiplier(run.streak) : 75) * (run.power ? 2 : 1)
  run.scoreBonus += points
  if (run.power) return { points, activated: false }
  run.meter += treat ? 10 : 35
  if (run.meter < 100) return { points, activated: false }
  run.meter = 0
  run.power = powerDuration
  return { points, activated: true }
}

export function score(run) {
  return Math.floor(run.distance) + run.scoreBonus
}

// Certify a center-of-lane route. A timed gate uses the middle of the jump or slide.
// Extra frame margin lets the same route survive a slow render frame.
export function validateRow(previous, row, maxSpeed, minSpeed = 11) {
  if (row.at <= previous.at || maxSpeed < minSpeed) return false
  const gap = (row.at - previous.at - 1.56) / maxSpeed
  const travel = Math.abs(previous.lane - row.lane)
  const settle = travel ? .16 * travel + Math.log(travel * laneWidth / .30) / laneResponse : 0
  if (gap < reactionWindow + settle) return false

  const gates = row.entities.filter((item) => item.hazard).sort((a, b) => a.distance - b.distance)
  let lastGate = previous.gate
  for (const item of gates) {
    // A moving obstacle has a bounded sweep. The guaranteed lane stays outside it.
    const buffer = item.type === 'drift' ? .69 : 0
    if (!item.wide && item.type !== 'stream' && Math.abs(item.lane - row.lane) * laneWidth > 1.15 + buffer + .30) continue
    if (!item.wide && item.type !== 'stream') return false
    const duration = item.type === 'branch' ? slideDuration : jumpDuration
    const before = item.type === 'branch' ? .37 : .78
    const margin = before / minSpeed + .045
    if (lastGate && (item.distance - lastGate.distance) / maxSpeed < (duration + lastGate.duration) / 2 + reactionWindow) return false
    const sample = { ...newRun(), x: row.lane * laneWidth, distance: item.distance,
      jump: item.type === 'branch' ? 0 : duration / 2 - margin,
      slide: item.type === 'branch' ? duration / 2 - margin : 0 }
    if (collides(sample, item)) return false
    lastGate = { distance: item.distance, duration }
  }
  return true
}

export function createCourse(seed = 1) {
  const random = typeof seed === 'function' ? seed : seededRandom(seed)
  const pick = (items) => items[Math.floor(random() * items.length)]
  let index = 0
  let at = 19
  let plannedTime = 0
  let previous = { at: 0, lane: 0 }

  return function nextRow() {
    const difficulty = difficultyAt(plannedTime)
    // At least 11 m/s implies a crossing time no later than distance / 11.
    const maximum = speedAt(difficultyAt((at + 1) / 11))
    const spacingSpeed = speedAt(difficultyAt(plannedTime + 16))
    const level = (difficulty - 2) / 7.5
    const lane = index < 2 ? 0 : pick(lanes)
    const row = { at, lane, entities: [] }
    const add = (type, slot, distance, hazard = false, wide = false) => {
      row.entities.push({ type, lane: slot, distance, hazard, wide })
    }

    if (index === 0) {
      for (let i = -2; i <= 2; i++) add('treat', 0, at + i * 1.7)
    } else if (index === 1 || (index > 8 && random() < .11 + level * .10)) {
      const type = index > 8 && random() < .32 + level * .2 ? 'branch' : 'stream'
      add(type, 0, at, true, true)
      row.gate = { distance: at, duration: type === 'branch' ? slideDuration : jumpDuration }
      add('treat', lane, at + 3.6)
      add('treat', lane, at + 5.6)
    } else {
      const blocked = lanes.filter((slot) => slot !== lane)
      if (random() < .5) blocked.reverse()
      const count = random() < .18 + level * .78 ? 2 : 1
      for (let i = 0; i < count; i++) add(index > 7 && random() < level * .53 ? 'drift' : pick(types), blocked[i], at, true)
      for (let i = -1; i <= 1; i++) {
        add(i === 0 && (index === 4 || random() < .13) ? pick(bonuses) : 'treat', lane, at + i * 1.72)
      }
    }

    // A rest row is the fallback when consecutive maneuvers overlap.
    if (!validateRow(previous, row, maximum)) {
      row.lane = previous.lane
      row.entities = [{ type: 'treat', lane: row.lane, distance: at, hazard: false }]
      row.gate = undefined
    }
    previous = { ...row, gate: row.gate ?? previous.gate }
    const spacingSeconds = 1.48 - level * .46 + random() * .21
    at += Math.max(index < 2 ? 15 : 12, spacingSpeed * spacingSeconds)
    plannedTime += spacingSeconds
    index++
    return row
  }
}
