export const laneWidth = 2.3
export const powerDuration = 6
const jumpDuration = .92
const slideDuration = .87
const types = ['log', 'fence', 'puddle', 'branch']
const bonuses = ['mallard', 'pheasant', 'call', 'decoy']

export const pickupNames = {
  mallard: 'Mallard duck', pheasant: 'Pheasant', call: 'Duck call', decoy: 'Duck decoy',
}

export function newRun() {
  return { distance: 0, scoreBonus: 0, lane: 0, x: 0, jump: 0, slide: 0, power: 0, meter: 0, speed: 11 }
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
  run.speed = Math.min(24, 11 + run.distance * .021)
  run.distance += run.speed * dt
  run.x += (run.lane * laneWidth - run.x) * (1 - Math.exp(-17 * dt))
  run.jump = Math.max(0, run.jump - dt)
  run.slide = Math.max(0, run.slide - dt)
  run.power = Math.max(0, run.power - dt)
  return previous
}

export function collides(run, entity) {
  if (run.power) return false
  if (entity.type !== 'stream' && Math.abs(run.x - entity.lane * laneWidth) > 1.15) return false
  if (entity.type === 'branch') return !run.slide
  const clearance = { fence: .99, log: .57, stream: .73, puddle: .44 }
  return getHeight(run) < clearance[entity.type]
}

export function collect(run, type) {
  const treat = type === 'treat'
  const points = (treat ? 10 : 75) * (run.power ? 2 : 1)
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

export function createCourse(random = Math.random) {
  let row = 0
  let next = 19
  const pick = (items) => items[Math.floor(random() * items.length)]
  return function nextRow() {
    const at = next
    const lanes = [-1, 0, 1]
    const safe = row < 2 ? 0 : pick(lanes)
    const entities = []
    const add = (type, lane, distance, hazard = false) => entities.push({ type, lane, distance, hazard })
    if (row === 0) {
      for (let i = -2; i <= 2; i++) add('treat', 0, at + i * 1.7)
    } else if (row === 1 || (row >= 7 && random() < .15)) {
      add('stream', 0, at, true)
      add('treat', safe, at + 3.3)
      add('treat', safe, at + 5)
    } else {
      const blocked = lanes.filter((lane) => lane !== safe)
      const count = row > 4 && random() < .54 ? 2 : 1
      if (random() < .5) blocked.reverse()
      for (let i = 0; i < count; i++) add(pick(types), blocked[i], at, true)
      for (let i = -1; i <= 1; i++) {
        add(i === 0 && (row === 4 || random() < .16) ? pick(bonuses) : 'treat', safe, at + i * 1.7)
      }
    }
    row++
    next += Math.max(15, Math.min(24, 11 + at * .018)) + random() * 4
    return { at, entities }
  }
}
