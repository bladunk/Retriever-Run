import { seededRandom } from './trail.js'
import { director, distanceAtTime, speedAtTime, stageAt } from './difficulty.js'
import { chooseRock, rocks, rockTurns } from './rocks.js'
export { difficultyAt, difficultyCurve, director, distanceAtTime, speedAt, speedAtTime } from './difficulty.js'

import { jumpDuration, jumpHeight, laneWidth, obstacleVolumes, slideDuration, traceContact,
  washoutSegments, washoutSpacing } from './collision.js'
export { jumpDuration, laneWidth, obstacleOffset, slideDuration } from './collision.js'

export const powerDuration = 6
export const laneResponse = 17
export const reactionWindow = .42
export const gateGrace = .050
const lanes = [-1, 0, 1]
const types = ['log', 'root', 'puddle', 'branch', 'fence', 'tree', 'drift', 'fallen', 'tractor', 'rock']
const weights = [
  [2.6, 1.9, 1.8, .65, 1.5, .68, .45, .32, 0, 1.45],
  [2.2, 2.7, 1.9, .90, .61, 1.2, .58, .55, 0, 1.76],
  [2.1, 1.4, 2.4, .60, 1.1, .68, 1.4, .75, 0, 1.95],
  [1.8, 2.5, 1.8, 1.1, .62, 1.5, 1.1, 1.65, 0, 1.95],
  [1.7, 1.7, 1.3, .55, 2.0, .80, .45, 1.10, 2.4, 2.23],
  [2.2, 1.65, 1.8, .55, 1.57, .62, .69, 1.7, 0, 2.30],
  [1.8, 1.8, 1.75, .65, 1.4, .80, 1.1, 1.8, 0, 2.4],
  [2.0, 1.8, 1.3, .92, 1.0, 1.63, .95, 2.2, 0, 2.6],
  [2.25, 1.85, .85, 1.15, .72, 1.70, .95, 2.3, 0, 2.45],
  [1.9, 1.7, 1.0, .86, .56, 1.30, .78, 2.0, 0, 3.0],
]
const lowHazards = new Set(['log', 'root', 'puddle', 'drift'])
const bonuses = ['mallard', 'pheasant', 'call', 'decoy']

export const pickupNames = {
  mallard: 'Mallard retrieve', pheasant: 'Pheasant retrieve', call: 'Duck call', decoy: 'Duck decoy',
}

export function newRun(rules = director) {
  return { distance: 0, elapsed: 0, scoreBonus: 0, lane: 0, x: 0, jump: 0, slide: 0, power: 0,
    meter: 0, speed: rules.startingSpeed, streak: 0, bestStreak: 0, retrieves: 0 }
}

export function act(run, move) {
  if (move === 'left' || move === 'right') {
    const previous = run.lane
    run.lane = Math.max(-1, Math.min(1, run.lane + (move === 'left' ? -1 : 1)))
    return run.lane !== previous
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
  return jumpHeight(run.jump)
}

export function advance(run, dt, rules = director) {
  const previous = run.distance
  const speed = run.speed
  const elapsed = run.elapsed + dt
  const second = Math.round(elapsed)
  // Exact fixed-step anniversaries should stay exact after thousands of sums.
  run.elapsed = Math.abs(elapsed - second) < 1e-9 ? second : elapsed
  run.speed = speedAtTime(run.elapsed, rules)
  run.distance += (speed + run.speed) * .5 * dt
  run.x += (run.lane * laneWidth - run.x) * (1 - Math.exp(-laneResponse * dt))
  run.jump = Math.max(0, run.jump - dt)
  run.slide = Math.max(0, run.slide - dt)
  run.power = Math.max(0, run.power - dt)
  return previous
}

export function touchesPickup(run, entity) {
  return !entity.hazard && Math.abs(entity.distance - run.distance) < 1 &&
    Math.abs(run.x - entity.lane * laneWidth) < .88 && getHeight(run) < 1.45
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

function laneReachable(previous, at, lane, maxSpeed) {
  const travel = Math.abs(previous.lane - lane)
  const settle = travel ? .16 * travel + Math.log(travel * laneWidth / .30) / laneResponse : 0
  return (at - (previous.end ?? previous.at) - 3.10) / maxSpeed >= reactionWindow + settle
}

// The guaranteed route follows the clear lane and centers any timed jump or slide.
export function validateRow(previous, row, maxSpeed, minSpeed = 11) {
  if (row.at <= previous.at || maxSpeed < minSpeed || !laneReachable(previous, row.at, row.lane, maxSpeed)) return false
  let lastGate = previous.gate
  const sample = { ...newRun(), lane: row.lane, x: row.lane * laneWidth }
  for (const item of row.entities) {
    if (!item.hazard) continue
    const bounds = obstacleVolumes(item)
    if (!bounds) return false
    if (item.type === 'goose') {
      if (item.lane === row.lane) return false
      for (let offset = -2.25; offset <= 2.25; offset += .125) {
        sample.distance = item.distance + offset
        if (traceContact(sample, sample, item)) return false
      }
      continue
    }
    const buffer = item.type === 'drift' ? .69 : 0
    const width = Math.max(...bounds.map((part) => Math.abs(part.x) + part.hx))
    if (!item.wide && Math.abs(item.lane - row.lane) * laneWidth > width + buffer + .32 + .12) continue
    if (!item.wide) return false
    const duration = item.type === 'branch' ? slideDuration : jumpDuration
    if (lastGate && (item.distance - lastGate.distance) / maxSpeed < (duration + lastGate.duration) / 2 + reactionWindow) return false
    for (const timing of [-gateGrace, gateGrace]) {
      for (let offset = -1.85; offset <= 1.85; offset += .105) {
        sample.distance = item.distance + offset
        const remaining = duration / 2 - offset / minSpeed + timing
        sample.jump = item.type === 'branch' ? 0 : remaining
        sample.slide = item.type === 'branch' ? remaining : 0
        if (traceContact(sample, sample, item)) return false
      }
    }
    lastGate = { distance: item.distance, duration }
  }
  return true
}

export function createCourse(seed = 1, rules = director) {
  const random = typeof seed === 'function' ? seed : seededRandom(seed)
  const pick = (items) => items[Math.floor(random() * items.length)]
  const between = ([min, max]) => min + random() * (max - min)
  let index = 0
  let time = rules.openingTime
  let previous = { at: 0, lane: 0 }
  let nextGoose = between(rules.firstGoose)
  let nextPair = rules.pairAfter
  let pairPending
  let requiredLane = false
  let followAction = false
  let previousGateType
  let priorTypes = []
  let lastRock = -Infinity
  let lastVariant

  function selectBlock(territory, row) {
    const values = weights[territory].map((weight, i) => {
      const type = types[i]
      if ((type === 'rock' && index - lastRock < 3) || row.entities.some(item => item.type === type)) return 0
      return weight * (priorTypes.includes(type) ? .23 : 1)
    })
    let ball = random() * values.reduce((total, weight) => total + weight, 0)
    for (const [i, value] of values.entries()) {
      ball -= value
      if (ball < 0) return types[i]
    }
    return 'log'
  }

  return function nextRow() {
    const at = distanceAtTime(time, rules)
    const stage = stageAt(time)
    const territory = stage.territory
    const progress = (stage.level - 1) / 19
    const maximum = speedAtTime(time + .35, rules)
    const reachable = lanes.filter((slot) => laneReachable(previous, at, slot, maximum))
    const goose = time >= nextGoose
    const washout = !goose && !pairPending && stage.flood && nextGoose - time > 3.4 && random() < stage.flood
    const gate = !goose && !washout && (index === 1 || pairPending ||
      index > 6 && !requiredLane && nextGoose - time > 1.45 && (followAction || random() < stage.action))
    const nextLanes = requiredLane ? reachable.filter(slot => slot !== previous.lane) : reachable
    const lane = index < 2 || gate ? previous.lane : pick(nextLanes.length ? nextLanes : reachable.length ? reachable : [previous.lane])
    const row = { at, time, lane, entities: [] }
    const add = (type, slot, distance, hazard = false, wide = false) => {
      row.entities.push({ type, lane: slot, distance, hazard, wide })
    }
    const blocked = lanes.filter((slot) => slot !== lane)
    if (random() < .5) blocked.reverse()
    let heavyBlock = false

    if (index === 0) {
      for (let i = -2; i <= 2; i++) add('treat', 0, at + i * 1.7)
    } else if (goose) {
      const count = time >= rules.doubleGooseAfter ? 2 : 1
      for (let i = 0; i < count; i++) {
        const birdTime = time + (time >= rules.coordinatedGooseAfter ? .24 : .15) * i
        row.entities.push({
          type: 'goose', lane: blocked[i], distance: distanceAtTime(birdTime, rules), hazard: true, wide: false,
          flightSpeed: speedAtTime(birdTime, rules), direction: i === 0 ? (blocked[0] === 1 ? -1 : 1) : row.entities[0].direction,
          lead: i === 0, safeLane: lane,
        })
      }
      row.end = row.entities.at(-1).distance
      add('treat', lane, at)
    } else if (gate) {
      const overhead = previousGateType === 'branch' ? .22 : .34 + territory * .019
      const type = pairPending || (index > 5 && random() < overhead ? 'branch' : 'stream')
      add(type, 0, at, true, true)
      row.gate = { distance: at, duration: type === 'branch' ? slideDuration : jumpDuration }
      add('treat', lane, at + 3.6)
      add('treat', lane, at + 5.6)
    } else if (washout) {
      for (let segment = 0; segment < washoutSegments; segment++) {
        row.entities.push({ type: 'washout', lane: blocked[0], distance: at + segment * washoutSpacing,
          hazard: true, span: segment === Math.floor(washoutSegments / 2) ? (washoutSegments - 1) * washoutSpacing : 0 })
      }
      row.end = row.entities.at(-1).distance
      add('fallen', blocked[1], at, true)
      add('treat', lane, at)
      add('treat', lane, at + 5.4)
    } else {
      const count = requiredLane && row.lane !== previous.lane || random() < stage.blocks ? 2 : 1
      for (let i = 0; i < count; i++) {
        const type = selectBlock(territory, row)
        add(type, blocked[i], at, true)
        if (type === 'rock') {
          const variant = chooseRock(territory, random, lastVariant)
          Object.assign(row.entities.at(-1), { variant, turn: Math.floor(random() * rockTurns.length) })
          heavyBlock ||= ['large', 'cluster'].includes(rocks[variant].size)
        }
        heavyBlock ||= type === 'fallen' || type === 'tractor'
      }
      const alternate = row.entities.find(item => lowHazards.has(item.type) ||
        item.type === 'rock' && rocks[item.variant].size === 'small')
      const risky = alternate && stage.reward && random() < stage.reward
      for (let i = -1; i <= 1; i++) {
        add(i === 0 && (index === 4 || !risky && random() < .12) ? pick(bonuses) : 'treat', lane, at + i * 1.72)
      }
      if (risky) add(pick(bonuses), alternate.lane, at + 6.1)
    }

    let gap = index === 0 ? rules.openingGap : stage.gap +
      (rules.earlyGap - director.earlyGap) * (1 - progress) + (rules.lateGap - director.lateGap) * progress +
      random() * rules.spacingVariation * (1 - progress * .38)
    const wasPaired = Boolean(pairPending)
    pairPending = undefined
    requiredLane = false
    followAction = false
    if (!validateRow(previous, row, maximum, speedAtTime(Math.max(0, time - .5), rules))) {
      row.lane = previous.lane
      row.entities = [{ type: 'treat', lane: row.lane, distance: at, hazard: false, wide: false }]
      row.gate = undefined
      row.end = undefined
    } else if (goose) {
      const preferred = rules.gooseInterval === director.gooseInterval ? stage.flock - 24 : 0
      nextGoose = time + between(rules.gooseInterval) + preferred
      gap = Math.max(gap, 1.22)
    } else if (washout) {
      gap = (row.end - row.at) / speedAtTime(time, rules) + 1.25
      followAction = random() < stage.follow
    } else if (!wasPaired && row.gate && time >= nextPair && nextGoose - time > 2.9 &&
      random() < Math.max(rules.pairChance * Number(row.entities[0].type === 'stream'), stage.chain)) {
      const type = row.entities[0].type
      pairPending = territory >= 2 && random() < .85 ? (type === 'stream' ? 'branch' : 'stream') : type
      nextPair = time + Math.max(3.9, 15 - stage.level * .55)
      gap = Math.max(gap, territory >= 5 ? 1.37 : rules.pairGap)
    } else if (row.gate) {
      requiredLane = territory >= 2 && (territory >= 4 || random() < stage.follow)
      gap = Math.max(gap, requiredLane ? (territory >= 6 ? 1.02 : 1.14) : 1.05)
    } else if (heavyBlock && nextGoose - time > 2.4 && random() < stage.follow) {
      followAction = true
      gap = Math.max(gap, .93)
    }
    if (row.gate) previousGateType = row.entities[0].type
    const rock = row.entities.find(item => item.type === 'rock')
    if (rock) {
      lastRock = index
      lastVariant = rock.variant
    }
    priorTypes = row.entities.filter(item => item.hazard).map(item => item.type)
    previous = { at, lane: row.lane, end: row.end, gate: row.gate ?? previous.gate }
    time += gap
    index++
    return row
  }
}
