import { seededRandom } from './trail.js'
import { distanceAtTime, localDirector, masteryDirector, speedAtTime } from './difficulty.js'
import { endlessPressure, masteryStart } from './mastery-pace.js'
import { createCourse, gateGrace, jumpDuration, reactionWindow, slideDuration, validateRow } from './runner.js'

const lanes = [-1, 0, 1]
const blockers = ['root', 'log', 'tree', 'drift', 'puddle', 'snowmobile']
const gateDuration = { stream: jumpDuration, branch: slideDuration }
const rotation = { stream: 'branch', branch: 'stream' }

function lead(type) {
  return gateDuration[type] ? gateDuration[type] * .5 + gateGrace : .12
}

export function createMasteryCourse(seed) {
  const migration = createCourse(seed, localDirector)
  const random = seededRandom((seed ^ 0x96ba2187) >>> 0)
  const pick = items => items[Math.floor(random() * items.length)]
  let previous
  let index = 0
  let transitionTime
  let tail = 'lane'
  let length = 0
  let firstGate = false
  let lastBird = masteryStart
  let direction = 1

  function generate() {
    const provisionalTime = transitionTime ?? previous.time
    const demand = endlessPressure(provisionalTime)
    const recovery = length >= demand.stringLength
    if (recovery) length = 0
    else length++

    // Reserve an isolated opening for an occasional hostile flyway encounter.
    const bird = recovery && provisionalTime - lastBird > 45
    const paired = !recovery && firstGate && random() < demand.secondGateChance
    const action = paired ? rotation[tail] : !recovery && tail === 'lane' && random() < .28
      ? pick(['branch', 'stream']) : 'lane'
    const available = lanes.filter(lane => lane !== previous.lane)
    const follow = available.find(lane => lane === previous.lane + direction)
    const lane = action === 'stream' || bird ? previous.lane :
      follow !== undefined && random() < demand.repeatChangeChance ? follow : pick(available)
    if (lane !== previous.lane) direction = Math.sign(lane - previous.lane)
    const lanesToCross = Math.max(...previous.exits.map(slot => Math.abs(slot - lane)))
    const laneTime = lanesToCross ? .29 + (lanesToCross - 1) * .16 : 0
    const gate = Boolean(gateDuration[action])
    const room = lead(tail) + reactionWindow + Math.max(laneTime, lead(action))
    const gap = Math.max(room, gate ? demand.gateGap : demand.decisionGap) + random() * .075 +
      (recovery ? demand.relief : 0)
    const time = provisionalTime + (bird ? Math.max(3.1, gap) : gap)
    const at = distanceAtTime(time, masteryDirector)
    const row = { at, time, lane, id: index++, pattern: 'endless-switch',
      exits: action === 'stream' ? [...lanes] : [lane], entities: [],
      sequence: length, recovery, decisionGap: time - previous.time }
    const add = (type, slot, distance, hazard, wide = false) => row.entities.push({
      type, lane: slot, distance, hazard, wide,
    })
    const blocked = lanes.filter(slot => slot !== lane)

    if (bird) {
      const side = pick(blocked)
      add('goose', side, at, true)
      Object.assign(row.entities[0], { flightSpeed: speedAtTime(time, masteryDirector), direction: side === 1 ? -1 : 1,
        lead: true, safeLane: lane })
      row.pattern = 'endless-goose'
      lastBird = time
    } else if (gate) {
      add(action, action === 'stream' ? 0 : lane, at, true, action === 'stream')
      if (action === 'branch') for (const slot of blocked) add('tree', slot, at, true)
      row.gate = { distance: at, duration: gateDuration[action], action: action === 'stream' ? 'jump' : 'slide' }
      row.pattern = 'endless-' + action
    } else {
      const first = pick(blockers)
      for (const slot of blocked) add(slot === blocked[0] ? first : first === 'tree' ? 'root' : 'tree', slot, at, true)
    }

    const minSpeed = speedAtTime(time - .55, masteryDirector)
    const maxSpeed = speedAtTime(time + .55, masteryDirector)
    if (!validateRow(previous, row, maxSpeed, minSpeed)) {
      row.gate = undefined
      row.pattern = 'endless-recovery'
      row.exits = [...lanes]
      row.entities.length = 0
    }
    add('treat', lane, at + (row.gate ? 5.5 : 0), false)
    if (!row.gate && !bird) {
      add('treat', lane, at + 1.65, false)
      if (random() < .17) add('mallard', lane, at + 3.3, false)
    }
    row.entities.sort((a, b) => a.distance - b.distance)
    for (const entity of row.entities) {
      entity.rowId = row.id
      entity.pattern = row.pattern
      if (!entity.hazard && row.exits.length > 1) entity.comboOptional = true
    }
    transitionTime = row.pattern === 'endless-goose' ? time + 3.7 : undefined
    firstGate = Boolean(row.gate && !paired)
    tail = row.gate ? action : 'lane'
    previous = row
    return row
  }

  return () => {
    if (previous?.time >= masteryStart) return generate()
    const row = migration()
    if (row.time < masteryStart) {
      previous = row
      index = row.id + 1
      return row
    }
    transitionTime = Math.max(masteryStart, previous.time + 1.9 +
      ((previous.end ?? previous.at) - previous.at) / speedAtTime(masteryStart, masteryDirector))
    return generate()
  }
}
