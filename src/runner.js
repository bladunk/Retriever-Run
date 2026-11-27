import { seededRandom } from './trail.js'
import { director, distanceAtTime, speedAtTime, stageAt, stageSeconds } from './difficulty.js'
import { fallTreeRoutes, obstacles, obstaclePool } from './obstacles.js'
import { tickSeconds } from './timing.js'
import { chooseRock, rocks, rockTurns } from './rocks.js'
export { difficultyAt, difficultyCurve, director, distanceAtTime, speedAt, speedAtTime } from './difficulty.js'

import { jumpDuration, jumpHeight, laneWidth, obstacleVolumes, slideDepth, slideDuration, traceContact,
  washoutSegments, washoutSpacing } from './collision.js'
export { jumpDuration, laneWidth, obstacleOffset, slideDuration } from './collision.js'

export const powerDuration = 6
export const laneResponse = 27
export const reactionWindow = .42
export const gateGrace = .050
const lanes = [-1, 0, 1]
const lowHazards = new Set(['log', 'root', 'puddle', 'drift'])
export { courseRuleset } from './ruleset.js'
const bonuses = ['mallard', 'pheasant', 'call', 'decoy']

export const pickupNames = {
  mallard: 'Mallard retrieve', pheasant: 'Pheasant retrieve', call: 'Duck call', decoy: 'Duck decoy',
}

export function newRun(rules = director) {
  const mastery = rules.endless ? { mastery: true, lastLaneAt: -Infinity, lastLaneFrom: 0,
    nearMisses: 0, cleanStreak: 0, bestCleanStreak: 0 } : {}
  return { ...mastery, distance: 0, elapsed: 0, scoreBonus: 0, lane: 0, x: 0, lateralSpeed: 0, jump: 0, slide: 0, power: 0,
    meter: 0, speed: rules.startingSpeed, streak: 0, bestStreak: 0, retrieves: 0 }
}

export function act(run, move) {
  if (move === 'left' || move === 'right') {
    if (run.mastery && run.elapsed - run.lastLaneAt < .09 - 1e-9) return false
    const previous = run.lane
    run.lane = Math.max(-1, Math.min(1, run.lane + (move === 'left' ? -1 : 1)))
    if (run.mastery && run.lane !== previous) {
      run.lastLaneAt = run.elapsed
      run.lastLaneFrom = previous
    }
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

function steer(run, dt) {
  const target = run.lane * laneWidth
  const displacement = run.x - target
  const carry = (run.lateralSpeed ?? 0) + laneResponse * displacement
  const decay = Math.exp(-laneResponse * dt)
  run.x = target + (displacement + carry * dt) * decay
  run.lateralSpeed = (carry - laneResponse * (displacement + carry * dt)) * decay
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
  steer(run, dt)
  run.jump = Math.max(0, run.jump - dt)
  run.slide = Math.max(0, run.slide - dt)
  run.power = Math.max(0, run.power - dt)
  return previous
}

export function pickupElevation(entity, time) {
  return .58 + (entity.pickupLift ?? 0) + Math.sin(time * 5 + entity.distance * .27) * .11
}

export function touchesPickup(run, entity) {
  if (entity.hazard || Math.abs(entity.distance - run.distance) >= .91 ||
    Math.abs(run.x - entity.lane * laneWidth) >= .70) return false
  const height = getHeight(run)
  const pickup = pickupElevation(entity, run.elapsed)
  return pickup > height - .22 && pickup < height + 1.36 - .38 * slideDepth(run.slide)
}

function markRiskPickups(entities, start, at, action, pace) {
  for (let i = start; i < entities.length; i++) {
    const item = entities[i]
    item.riskRoute = true
    if (action !== 'jump') continue
    const jump = Math.min(jumpDuration, Math.max(0, jumpDuration / 2 - (item.distance - at) / pace))
    item.pickupLift = jumpHeight(jump)
  }
  entities.at(-1).riskExit = true
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
  const base = run.mastery
    ? treat ? 6 + 2 * (multiplier(run.streak) - 1) : 48
    : treat ? 10 * multiplier(run.streak) : 75
  const points = base * (run.power ? 2 : 1)
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

export const laneSwipeInterval = .16

function minimumLaneSetup(swipes) {
  const state = newRun()
  const stepBudget = Math.ceil(laneSwipeInterval / tickSeconds)
  state.lane = -1
  state.x = -laneWidth
  for (let swipe = 0; swipe < swipes; swipe++) {
    act(state, 'right')
    for (let i = 0; i < stepBudget; i++) steer(state, tickSeconds)
  }
  let ticks = swipes * stepBudget
  while (Math.abs(state.x - state.lane * laneWidth) > .20) {
    steer(state, tickSeconds)
    ticks++
  }
  return ticks * tickSeconds
}

const laneSetup = [0, minimumLaneSetup(1), minimumLaneSetup(2)]

function laneReachable(previous, at, lane, maxSpeed) {
  const travel = Math.max(...(previous.exits ?? [previous.lane]).map(slot => Math.abs(slot - lane)))
  return (at - (previous.end ?? previous.at) - 3.10) / maxSpeed >= reactionWindow + laneSetup[travel]
}

const evaluatedWidths = new WeakMap()

function lateralExtent(bounds) {
  if (!evaluatedWidths.has(bounds)) {
    evaluatedWidths.set(bounds, Math.max(...bounds.map(part => Math.abs(part.x) + part.hx)))
  }
  return evaluatedWidths.get(bounds)
}

const sampleBefore = {}
const sampleAfter = {}
const actionSkews = [-gateGrace, gateGrace]
const standingSkew = [0]

// Check timed clearance with the live swept collider at both edges of the
// execution window. A slower speed keeps every part of the dog in the hazard
// for longer. Passage samples use the same fixed tick as live simulation.
export function clearsHazard(lane, item, action, pace, grace = gateGrace) {
  const duration = action === 'jump' ? jumpDuration : slideDuration
  const distanceStep = pace * tickSeconds
  for (const skew of action === 'run' ? standingSkew : grace === gateGrace ? actionSkews : [-grace, grace]) {
    for (let offset = -2.28; offset < 2.28; offset += distanceStep) {
      sampleBefore.lane = lane
      sampleBefore.x = lane * laneWidth
      sampleBefore.distance = item.distance + offset
      const remaining = Math.min(duration, Math.max(0, duration / 2 - offset / pace + skew))
      sampleBefore.jump = action === 'jump' ? remaining : 0
      sampleBefore.slide = action === 'slide' ? remaining : 0
      sampleAfter.lane = lane
      sampleAfter.x = sampleBefore.x
      sampleAfter.distance = sampleBefore.distance + distanceStep
      sampleAfter.jump = Math.max(0, sampleBefore.jump - tickSeconds)
      sampleAfter.slide = Math.max(0, sampleBefore.slide - tickSeconds)
      if (traceContact(sampleBefore, sampleAfter, item)) return false
    }
  }
  return true
}

export function validateRow(previous, row, maxSpeed, minSpeed = 11) {
  if (row.at <= previous.at || maxSpeed < minSpeed || !laneReachable(previous, row.at, row.lane, maxSpeed)) return false
  let lastGate = previous.gate
  for (const item of row.entities) {
    if (!item.hazard) continue
    const bounds = obstacleVolumes(item)
    if (!bounds) return false
    if (item.type === 'goose') {
      if (item.lane === row.lane || !clearsHazard(row.lane, item, 'run', minSpeed)) return false
      continue
    }
    if (!item.wide && Math.abs(item.lane - row.lane) * laneWidth > lateralExtent(bounds) + .44) continue
    if (item.type === 'leaning-tree') {
      if (!clearsHazard(row.lane, item, 'run', minSpeed)) return false
      continue
    }
    const action = item.type === 'branch' ? 'slide' : item.type === 'stream' ? 'jump' : null
    if (!action || (!item.wide && item.lane !== row.lane)) return false
    const duration = action === 'jump' ? jumpDuration : slideDuration
    if (lastGate && (item.distance - lastGate.distance) / maxSpeed < (duration + lastGate.duration) / 2 + reactionWindow) return false
    if (!clearsHazard(row.lane, item, action, minSpeed)) return false
    lastGate = { distance: item.distance, duration }
  }
  return true
}

const territoryWeight = (definition, territory) => definition.weights[territory] ?? definition.weights.at(-1)
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
  const priorTypes = []
  let lastTree = -Infinity
  let lastRock = -Infinity
  let lastVariant

  function selectBlock(territory, row, stage) {
    const values = obstaclePool.map(type => {
      if (stage < (obstacles[type].minimumStage ?? 1)) return 0
      if ((type === 'rock' && index - lastRock < 3) || row.entities.some(item => item.type === type)) return 0
      const last = priorTypes.findIndex(types => types.includes(type))
      return territoryWeight(obstacles[type], territory) * (last === 0 ? .20 : last < 0 ? 1 : .64)
    })
    let ball = random() * values.reduce((total, weight) => total + weight, 0)
    for (const [i, value] of values.entries()) {
      ball -= value
      if (ball < 0) return obstaclePool[i]
    }
    return 'log'
  }

  return function nextRow() {
    const at = distanceAtTime(time, rules)
    const stage = stageAt(time, rules.stages)
    const territory = stage.territory
    const progress = stage.challenge
    const maximum = speedAtTime(time + .35, rules)
    const reachable = lanes.filter((slot) => laneReachable(previous, at, slot, maximum))
    const goose = time >= nextGoose
    const washout = !goose && !pairPending && stage.flood && nextGoose - time > 3.4 && random() < stage.flood
    const signature = !goose && !washout && !pairPending && !requiredLane && reachable.includes(1) &&
      !previous.gateAhead && (index === 8 || (time - lastTree >= 28 && nextGoose - time > 1.8 && index > 9 &&
        random() < .09 * territoryWeight(obstacles['leaning-tree'], territory)))
    const gate = !signature && !goose && !washout && (index === 1 || pairPending ||
      index > 6 && !requiredLane && nextGoose - time > 1.45 && (followAction || random() < stage.action))
    const overhead = previousGateType === 'branch' ? .24 : .43 + Math.min(10, territory) * .024
    const gateType = gate ? pairPending || (index > 5 && random() < overhead ? 'branch' : 'stream') : null
    const adjacent = reachable.filter(slot => Math.abs(slot - previous.lane) === 1)
    const crossingSlide = stage.level >= 19 && pairPending === 'branch' && gateType === 'branch' && previous.gateAhead
    const farChute = crossingSlide && stage.level >= 25 && previous.lane !== 0 && reachable.includes(-previous.lane)
    const chuteSwitch = gateType === 'branch' && index > 10 && adjacent.length &&
      (crossingSlide || random() < Math.min(.96, .80 * progress + Math.max(0, stage.level - 20) * .015))
    const nextLanes = requiredLane ? reachable.filter(slot => slot !== previous.lane) : reachable
    const lane = signature ? 1 : farChute ? -previous.lane : chuteSwitch ? pick(adjacent) : index < 2 || gate ? previous.lane :
      pick(nextLanes.length ? nextLanes : reachable.length ? reachable : [previous.lane])
    const row = { at, time, lane, id: index, pattern: 'single', exits: [lane], entities: [] }
    const add = (type, slot, distance, hazard = false, wide = false) => {
      row.entities.push({ type, lane: slot, distance, hazard, wide })
    }
    const blocked = lanes.filter((slot) => slot !== lane)
    if (random() < .5) blocked.reverse()
    let heavyBlock = false

    if (index === 0) {
      row.pattern = 'opening'
      for (let i = -2; i <= 2; i++) add('treat', 0, at + i * 1.7)
    } else if (goose) {
      row.pattern = 'swoop'
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
    } else if (signature) {
      row.pattern = 'forked-timber'
      add('leaning-tree', 0, at, true, true)
      add('treat', 1, at)
      for (const slot of [-1, 0]) {
        const action = fallTreeRoutes[slot + 1]
        if (!laneReachable(previous, at, slot, maximum) ||
          !clearsHazard(slot, row.entities[0], action, speedAtTime(time - .3, rules))) continue
        row.exits.push(slot)
        const start = row.entities.length
        add('treat', slot, at - 2.7)
        add('treat', slot, at + 2.7)
        add('treat', slot, at + 4.4)
        markRiskPickups(row.entities, start, at, action, speedAtTime(time, rules))
      }
    } else if (gate) {
      const type = gateType
      row.pattern = type === 'branch' ? chuteSwitch ? 'switch-and-slide' : 'timber-chute' : 'creek-crossing'
      if (farChute) row.pattern = 'cross-trail-slide-followup'
      else if (pairPending) row.pattern += '-followup'
      const action = type === 'branch' ? 'slide' : 'jump'
      const duration = action === 'slide' ? slideDuration : jumpDuration
      add(type, type === 'stream' ? 0 : lane, at, true, type === 'stream')
      if (type === 'branch') for (const slot of blocked) add(pick(['fallen', 'tree']), slot, at, true)
      row.gate = { distance: at, duration, action }
      add('treat', lane, at + 2.7)
      add('treat', lane, at + 4.4)
    } else if (washout) {
      row.pattern = 'flooded-bypass'
      for (let segment = 0; segment < washoutSegments; segment++) {
        row.entities.push({ type: 'washout', lane: blocked[0], distance: at + segment * washoutSpacing,
          hazard: true, span: segment === Math.floor(washoutSegments / 2) ? (washoutSegments - 1) * washoutSpacing : 0 })
      }
      row.end = row.entities.at(-1).distance
      add('fallen', blocked[1], at, true)
      add('treat', lane, at)
      add('treat', lane, at + 5.4)
    } else {
      const count = requiredLane && row.lane !== previous.lane || random() < Math.min(1, stage.blocks + progress * .23) ? 2 : 1
      row.pattern = count === 2 ? requiredLane ? 'committed-switch' : 'two-lane-block' : 'single'
      for (let i = 0; i < count; i++) {
        const type = selectBlock(territory, row, stage.level)
        add(type, blocked[i], at, true)
        if (type === 'rock') {
          const variant = chooseRock(territory, random, lastVariant)
          Object.assign(row.entities.at(-1), { variant, turn: Math.floor(random() * rockTurns.length) })
          heavyBlock ||= ['large', 'cluster'].includes(rocks[variant].size)
        }
        heavyBlock ||= type === 'fallen' || type === 'tractor' || type === 'snowmobile'
      }
      const alternate = row.entities.find(item => lowHazards.has(item.type) ||
        item.type === 'rock' && rocks[item.variant].size === 'small')
      const risky = alternate && laneReachable(previous, at, alternate.lane, maximum)
        && random() < stage.reward * .73
        && clearsHazard(alternate.lane, alternate, 'jump', speedAtTime(time - .3, rules))
      for (let i = -1; i <= 1; i++) {
        if (risky && i !== 0) continue
        add(i === 0 && (index === 4 || !risky && random() < .12) ? pick(bonuses) : 'treat', lane, at + i * 1.72)
      }
      if (risky) {
        row.exits.push(alternate.lane)
        row.pattern += '-retrieve-choice'
        const start = row.entities.length
        add('treat', alternate.lane, at - 2.7)
        add('treat', alternate.lane, at + 2.8)
        add('treat', alternate.lane, at + 4.5)
        markRiskPickups(row.entities, start, at, 'jump', speedAtTime(time, rules))
      }
    }

    let gap = index === 0 ? rules.openingGap : stage.gap +
      (rules.earlyGap - director.earlyGap) * (1 - progress) + (rules.lateGap - director.lateGap) * progress +
      random() * rules.spacingVariation * (1 - progress * .38)
    if (!row.gate && row.exits.length === 1) gap -= .04 * progress
    const overtime = Math.max(0, time - rules.stages.length * stageSeconds)
    gap -= .095 * (1 - Math.exp(-overtime / 95))
    const wasPaired = Boolean(pairPending)
    pairPending = undefined
    requiredLane = false
    followAction = false
    if (!validateRow(previous, row, maximum, speedAtTime(Math.max(0, time - .5), rules))) {
      row.pattern = 'recovery'
      row.lane = previous.lane
      row.entities = [{ type: 'treat', lane: row.lane, distance: at, hazard: false, wide: false }]
      row.gate = undefined
      row.end = undefined
      row.exits = [row.lane]
    } else if (goose) {
      const preferred = rules.gooseInterval === director.gooseInterval ? stage.flock - 24 : 0
      const spacing = between(rules.gooseInterval)
      nextGoose = rules.hostileGooseSpacing
        ? time + Math.max(rules.hostileGooseCooldown, (spacing + preferred) * rules.hostileGooseSpacing)
        : time + spacing + preferred
      gap = Math.max(gap, 1.22)
    } else if (signature) {
      lastTree = time
      gap = Math.max(gap, 1.65)
    } else if (washout) {
      gap = (row.end - row.at) / speedAtTime(time, rules) + 1.25
      followAction = random() < stage.follow
    } else if (!wasPaired && row.gate && time >= nextPair && nextGoose - time > 2.9 &&
      random() < Math.max(rules.pairChance * Number(row.entities[0].type === 'stream'), stage.chain)) {
      const type = row.entities[0].type
      pairPending = territory >= 2 && random() < .85 ? (type === 'stream' ? 'branch' : 'stream') : type
      const cooldown = stage.level <= 6 ? Math.max(2.9, 14 - stage.level * .65)
        : stage.level < 25 ? Math.max(2.7, 14 - stage.level * .69) : 2.03
      nextPair = time + cooldown
      gap = Math.max(gap, territory >= 5 ? 1.37 : rules.pairGap)
      if (stage.level >= 25 && pairPending === 'branch') gap = Math.max(gap, 1.48)
    } else if (row.gate) {
      requiredLane = territory >= 2 && (territory >= 4 || random() < stage.follow)
      gap = Math.max(gap, requiredLane ? (territory >= 6 ? 1.02 : 1.14) : 1.05)
    } else if (stage.level >= 19 && row.exits.length === 1 && row.pattern === 'two-lane-block' &&
      nextGoose - time > 2.15 && random() < (stage.level >= 25 ? .76 : .31)) {
      // A late blocker can lead directly into a second lane commitment.
      // Keep enough time for validated lateral reach even at endless pace.
      requiredLane = true
      gap = Math.max(gap, 1.10)
    } else if (heavyBlock && nextGoose - time > 2.4 && random() < stage.follow) {
      followAction = true
      gap = Math.max(gap, .93)
    }
    if (row.exits.length > 1) {
      // Return the dog to an actionable course from any advertised exit after
      // collecting the last reward, including two-lane recovery.
      gap = Math.max(gap, 1.24 + 4.5 / speedAtTime(time, rules))
    }
    if (row.gate) previousGateType = row.entities[0].type
    const rock = row.entities.find(item => item.type === 'rock')
    if (rock) {
      lastRock = index
      lastVariant = rock.variant
    }
    priorTypes.unshift(row.entities.filter(item => item.hazard).map(item => item.type))
    if (priorTypes.length > 3) priorTypes.pop()
    row.entities.sort((a, b) => a.distance - b.distance)
    for (const entity of row.entities) {
      entity.pattern = row.pattern
      entity.rowId = row.id
      if (!entity.hazard && row.exits.length > 1) entity.comboOptional = true
    }
    previous = { at, lane: row.lane, end: row.exits.length > 1 ? at + 4.5 : row.end,
      exits: row.exits, gate: row.gate ?? previous.gate, gateAhead: Boolean(row.gate) }
    time += gap
    index++
    return row
  }
}
