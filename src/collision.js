import { placeOnTrail, trailHeight } from './trail.js'

export const laneWidth = 2.3
export const jumpDuration = .92
export const slideDuration = .87

const volume = (name, x, y, z, hx, hy, hz) => ({ name, x, y, z, hx, hy, hz })
const post = (x) => volume('upright', x, .58, 0, .076, .58, .089)
const beam = (width) => volume('overhead timber', 0, 1.17, 0, width, .091, .095)
const log = (scale = 1) => [
  volume('log core', 0, .32 * scale, 0, .96, .23 * scale, .255),
  volume('log crown', 0, .561 * scale, 0, .96, .083 * scale, .162),
  volume('log base', 0, .088 * scale, 0, .92, .069 * scale, .165),
]

const solids = {
  fence: [
    post(-.85), post(.85),
    volume('upper rail', 0, .81, 0, .987, .08, .074),
    volume('lower rail', 0, .38, 0, .987, .08, .074),
  ],
  branch: [beam(1.055), post(1.01)],
  'branch-wide': [beam(3.62), post(-3.56), post(3.56)],
  log: log(),
  root: log(.7).concat(volume('outlying root', -.41, .13, -.31, .28, .08, .13)),
  drift: log().concat(volume('caught timber', -.31, .39, .064, .245, .055, .26)),
}
const water = {
  stream: [volume('wet channel', 0, .008, 0, 3.54, .095, .73)],
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
  return water[entity.type] ?? solids[entity.wide ? entity.type + '-wide' : entity.type]
}

export function obstacleOffset(entity, distance) {
  const sweep = entity.type === 'drift' ? (entity.sweep ?? 1) * .69 * Math.sin((distance - entity.distance) * .32) : 0
  return entity.lane * laneWidth + sweep
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
  const offset = obstacleOffset(entity, distance)
  frame.angle = placeOnTrail(frame, entity.distance, offset, origin)
  frame.y = trailHeight(entity.distance, offset)
  return frame
}

export function playerVolumes(wet = false) {
  return wet ? paws : body
}

export function volumeY(part, depth) {
  const scale = 1 - depth * .42
  return part.y * scale
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

function sweptBox(a, b, solid, dog, minTime, maxTime) {
  interval.enter = minTime
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

// Sweep endpoint poses relative to the same visible obstacle. Only playable hazards have volumes.
// The in-tick bound is 0.23 m at maximum speed, so a linear sweep is conservative within one tick.
export function traceContact(previous, current, entity, witness) {
  const bounds = obstacleVolumes(entity)
  if (!entity.hazard || !bounds || entity.distance < previous.distance - 3 || entity.distance > current.distance + 3) return false
  if (previous.power > 0 && current.power > 0) return false
  const dt = current.elapsed - previous.elapsed
  const minTime = previous.power > 0 && dt > 0 ? Math.min(1, previous.power / dt) : 0
  playerFrame(dogStart, previous, previous.distance)
  playerFrame(dogEnd, current, previous.distance)
  hazardFrame(hazardStart, entity, previous.distance, previous.distance)
  hazardFrame(hazardEnd, entity, current.distance, previous.distance)

  let time = Infinity
  let hitPart
  let hitSolid
  for (const part of playerVolumes(Boolean(water[entity.type]))) {
    relative(from, dogStart, hazardStart, part)
    relative(to, dogEnd, hazardEnd, part)
    for (const solid of bounds) {
      const sample = sweptBox(from, to, solid, part, minTime, Math.min(1, time))
      if (sample < time) {
        time = sample
        hitPart = part
        hitSolid = solid
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
    witness.height = jumpHeight(previous.jump + (current.jump - previous.jump) * time)
  }
  return true
}
