import { laneWidth, placeOnTrail, trailHeight } from './trail.js'
import { diveFrame, diveScale } from './dive.js'
import { lowTimber } from './low-timber.js'
import { snowmobileVolumes } from './snowmobile.js'
import { leaningTree } from './leaning-tree.js'
import { timberProfile } from './trail-timber.js'
import { fallenTimber, fallenVariant } from './fallen-timber.js'
import { rockShape } from './rocks.js'

export { laneWidth } from './trail.js'
export const jumpDuration = .92
export const slideDuration = .87
export const washoutSegments = 13
export const washoutSpacing = 2.25

const volume = (name, x, y, z, hx, hy, hz) => ({ name, x, y, z, hx, hy, hz })
const post = (x) => volume('upright', x, .58, 0, .076, .58, .089)
const solids = {
  goose: [
    volume('goose body', 0, 0, 0, .211 * diveScale, .166 * diveScale, .285 * diveScale),
    volume('goose neck', 0, .147 * diveScale, -.326 * diveScale, .071 * diveScale, .162 * diveScale, .143 * diveScale),
    volume('goose head', 0, .22 * diveScale, -.46 * diveScale, .086 * diveScale, .095 * diveScale, .127 * diveScale),
  ],
  tractor: [
    volume('engine and frame', 0, .94, 0, .63, .46, .98),
    volume('cab', 0, 1.83, .35, .56, .60, .56),
    volume('left wheel', -.72, .51, .37, .23, .52, .59),
    volume('right wheel', .72, .51, .37, .23, .52, .59),
  ],

  fence: [
    post(-.85), post(.85),
    volume('upper rail', 0, .81, 0, .987, .08, .074),
    volume('lower rail', 0, .38, 0, .987, .08, .074),
  ],
  snowmobile: snowmobileVolumes,
}
const water = {
  stream: [volume('wet channel', 0, .008, 0, 3.54, .095, .73)],
  washout: [volume('flooded lane', 0, .018, 0, .83, .09, washoutSpacing * .55)],
  puddle: [
    volume('puddle center', 0, .002, 0, .83, .092, .44),
    volume('puddle middle', 0, .002, 0, .61, .086, .64),
    volume('puddle ends', 0, .002, 0, .36, .074, .73),
  ],
}
const body = [
  volume('chest', 0, .88, -.31, .247, .295, .40),
  volume('hindquarters', 0, .77, .41, .244, .262, .33),
  volume('head', 0, 1.235, -.74, .218, .192, .286),
  volume('forelegs', 0, .28, -.45, .213, .232, .193),
  volume('hind legs', 0, .27, .54, .205, .226, .188),
]
const paws = [
  volume('front paws', 0, .063, -.49, .190, .048, .160),
  volume('rear paws', 0, .063, .56, .188, .048, .155),
]

export function obstacleVolumes(entity) {
  if (entity.type === 'rock') return rockShape(entity.variant, entity.turn)
  if (entity.type === 'branch' && !entity.wide) return lowTimber().volumes
  if (entity.type === 'leaning-tree') return leaningTree().volumes
  if (entity.type === 'fallen') return fallenTimber(fallenVariant(entity.distance, entity.lane)).volumes
  const timber = timberProfile(entity.type)
  if (timber) return timber.volumes
  return water[entity.type] ?? solids[entity.wide ? entity.type + '-wide' : entity.type]
}

export const isWaterHazard = type => Object.hasOwn(water, type)

export function obstacleOffset(entity) {
  return entity.lane * laneWidth
}

export function jumpHeight(jump) {
  const phase = jump / jumpDuration
  return 6.7 * phase * (1 - phase)
}

export function slideDepth(slide) {
  const edge = Math.min(1, slide / .13, (slideDuration - slide) / .13)
  return edge * edge * (3 - 2 * edge)
}

export function playerFrame(frame, run, origin = 0) {
  const angle = placeOnTrail(frame, run.distance, run.x, origin) - (run.lane * laneWidth - run.x) * .080
  frame.angle = angle
  frame.y = trailHeight(run.distance, run.x) + jumpHeight(run.jump)
  frame.depth = slideDepth(run.slide)
  return frame
}

export function hazardFrame(frame, entity, distance, origin = 0) {
  if (entity.type === 'goose') return diveFrame(frame, entity, distance, origin)
  const offset = obstacleOffset(entity)
  frame.angle = placeOnTrail(frame, entity.distance, offset, origin)
  frame.y = trailHeight(entity.distance, offset)
  return frame
}

export function playerVolumes(wet = false) {
  return wet ? paws : body
}

export function volumeY(part, depth) {
  // The crouched head and neck sit higher than a uniformly scaled running pose.
  return part.y * (1 - depth * .42) + (part.name === 'head' ? depth * .143 : 0)
}

const dogStart = {}
const dogEnd = {}
const hazardStart = {}
const hazardEnd = {}
const from = {}
const to = {}
const interval = { enter: 0, exit: 1 }
const edge = .010

function relative(target, dog, hazard, part) {
  const cos = Math.cos(hazard.angle)
  const sin = Math.sin(hazard.angle)
  const yaw = dog.angle - hazard.angle
  target.yaw = yaw
  const x = dog.x - hazard.x
  const z = dog.z - hazard.z
  target.x = x * cos - z * sin + Math.sin(yaw) * part.z
  target.z = x * sin + z * cos + Math.cos(yaw) * part.z
  target.y = dog.y - hazard.y + volumeY(part, dog.depth)
  target.rx = Math.abs(Math.cos(yaw)) * part.hx + Math.abs(Math.sin(yaw)) * part.hz
  target.rz = Math.abs(Math.sin(yaw)) * part.hx + Math.abs(Math.cos(yaw)) * part.hz
  target.ry = part.hy * (1 - dog.depth * .42)
}

function constrain(a, b, halfA, halfB) {
  for (let sign = -1; sign <= 1; sign += 2) {
    const start = sign * a - halfA
    const change = sign * b - halfB - start
    if (Math.abs(change) < 1e-9) {
      if (start >= 0) return false
    } else if (change < 0) {
      interval.enter = Math.max(interval.enter, -start / change)
    } else {
      interval.exit = Math.min(interval.exit, -start / change)
    }
    if (interval.enter > interval.exit) return false
  }
  return true
}

function sweptBox(a, b, solid, dog, maxTime) {
  interval.enter = 0
  interval.exit = maxTime
  const x = a.x - solid.x
  const z = a.z - solid.z
  const toX = b.x - solid.x
  const toZ = b.z - solid.z
  const hx = solid.hx - edge
  const hy = solid.hy - edge
  const hz = solid.hz - edge
  if (!constrain(x, toX, hx + a.rx, hx + b.rx)
    || !constrain(z, toZ, hz + a.rz, hz + b.rz)
    || !constrain(a.y - solid.y, b.y - solid.y, hy + a.ry, hy + b.ry)) return Infinity

  // Check the dog's axes too, so a rotated body cannot hit on an empty broadphase corner.
  const yaw = (a.yaw + b.yaw) * .5
  const cos = Math.cos(yaw)
  const sin = Math.sin(yaw)
  const dogX = dog.hx + Math.abs(cos) * solid.hx + Math.abs(sin) * solid.hz - edge
  const dogZ = dog.hz + Math.abs(sin) * solid.hx + Math.abs(cos) * solid.hz - edge
  if (!constrain(x * cos - z * sin, toX * cos - toZ * sin, dogX, dogX)
    || !constrain(x * sin + z * cos, toX * sin + toZ * cos, dogZ, dogZ)) return Infinity
  return interval.enter
}

function sweptHull(a, b, solid, startTime, maxTime) {
  interval.enter = startTime
  interval.exit = maxTime
  // The renderer and solver use the same convex faces. Expand each plane by
  // the support of the dog's current body volume and clip the moving center.
  for (const normal of solid.planes) {
    const { x, y, z, limit } = normal
    const nx = Math.abs(x), ny = Math.abs(y), nz = Math.abs(z)
    const start = a.x * x + a.y * y + a.z * z - (a.rx * nx + a.ry * ny + a.rz * nz) - limit + edge
    const end = b.x * x + b.y * y + b.z * z - (b.rx * nx + b.ry * ny + b.rz * nz) - limit + edge
    const change = end - start
    if (Math.abs(change) < 1e-9) {
      if (start >= 0) return Infinity
    } else if (change < 0) interval.enter = Math.max(interval.enter, -start / change)
    else interval.exit = Math.min(interval.exit, -start / change)
    if (interval.enter > interval.exit) return Infinity
  }
  return interval.enter
}

// Sweep endpoint poses relative to the same visible obstacle. Only playable hazards have volumes.
// The fixed step keeps the endpoint sweep local, including when a goose moves toward the dog.
export function traceContact(previous, current, entity, witness) {
  if (!entity.hazard || entity.distance < previous.distance - 3 || entity.distance > current.distance + 3) return false
  const bounds = obstacleVolumes(entity)
  if (!bounds) return false
  playerFrame(dogStart, previous, previous.distance)
  playerFrame(dogEnd, current, previous.distance)
  hazardFrame(hazardStart, entity, previous.distance, previous.distance)
  hazardFrame(hazardEnd, entity, current.distance, previous.distance)

  let time = Infinity
  let hitPart
  let hitSolid
  let contactX, contactY, contactZ
  for (const part of playerVolumes(Boolean(water[entity.type]))) {
    relative(from, dogStart, hazardStart, part)
    relative(to, dogEnd, hazardEnd, part)
    for (const solid of bounds) {
      const until = Math.min(1, time)
      let sample = sweptBox(from, to, solid, part, until)
      if (solid.planes && sample < Infinity) sample = sweptHull(from, to, solid, sample, interval.exit)
      if (sample < time) {
        time = sample
        hitPart = part
        hitSolid = solid
        if (witness) {
          contactX = from.x + (to.x - from.x) * time
          contactY = from.y + (to.y - from.y) * time
          contactZ = from.z + (to.z - from.z) * time
        }
      }
    }
  }
  if (!Number.isFinite(time)) return false
  if (witness) {
    witness.fraction = time
    witness.type = entity.type
    witness.part = hitPart.name
    witness.solid = hitSolid.name
    witness.obstacleDistance = entity.distance
    witness.obstacleLane = entity.lane
    witness.distance = previous.distance + (current.distance - previous.distance) * time
    witness.lateral = previous.x + (current.x - previous.x) * time
    witness.targetLane = current.lane
    witness.lane = Math.max(-1, Math.min(1, Math.round(witness.lateral / laneWidth)))
    witness.jumpRemaining = previous.jump + (current.jump - previous.jump) * time
    witness.slideRemaining = previous.slide + (current.slide - previous.slide) * time
    witness.action = witness.jumpRemaining > 0 ? 'jump' : witness.slideRemaining > 0 ? 'slide' : 'run'
    witness.elapsed = previous.elapsed + (current.elapsed - previous.elapsed) * time
    witness.pattern = entity.pattern
    witness.origin = previous.distance
    const yaw = hazardStart.angle + (hazardEnd.angle - hazardStart.angle) * time
    const cos = Math.cos(yaw), sin = Math.sin(yaw)
    witness.contactX = hazardStart.x + (hazardEnd.x - hazardStart.x) * time + contactX * cos + contactZ * sin
    witness.contactY = hazardStart.y + (hazardEnd.y - hazardStart.y) * time + contactY
    witness.contactZ = hazardStart.z + (hazardEnd.z - hazardStart.z) * time - contactX * sin + contactZ * cos
    witness.height = jumpHeight(previous.jump + (current.jump - previous.jump) * time)
  }
  return true
}

const candidate = {}

export function firstContact(previous, current, entities, witness) {
  let fraction = Infinity
  let impacted
  for (const entity of entities) {
    if (!entity.hazard || entity.distance < previous.distance - 3 || entity.distance > current.distance + 3) continue
    if (traceContact(previous, current, entity, candidate) && candidate.fraction < fraction) {
      fraction = candidate.fraction
      impacted = entity
      Object.assign(witness, candidate)
    }
  }
  return impacted
}
