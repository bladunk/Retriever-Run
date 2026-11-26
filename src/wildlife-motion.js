import * as T from 'three'
import { placeOnTrail } from './trail.js'
import { fieldSpecies } from './wildlife-catalog.js'

const flightFamily = new Set(['crane','goose','raptor'])
const approaches = {
  deer: [61, 89], pheasant: [58, 72], goose: [72, 183], duck: [54, 51],
  crane: [69, 89], raptor: [67, 68],
}
const defaultApproach = [47, 12]
export const encounterApproach = species => approaches[fieldSpecies[species]?.family] ?? defaultApproach

// Both the normalized rig and the fallback use local -Z as their nose.
// Evaluate positions against a fixed origin so camera re-centering is excluded.
const before = {}
const after = {}

function motionYaw(distance, lateral, ahead, nextLateral) {
  placeOnTrail(before, distance, lateral, distance)
  placeOnTrail(after, distance + ahead, nextLateral, distance)
  return Math.atan2(before.x - after.x, before.z - after.z)
}

function deerLateral(anchor, side, run) {
  return T.MathUtils.lerp(anchor, side * 5.35, T.MathUtils.smoothstep(run, 0, 32)) +
    side * (.28 * Math.sin(run * .051) + Math.max(0, run - 105) * .32)
}

function flockLateral(side, lateral, offset, crossing, goose) {
  const forward = Math.max(0, crossing)
  const target = goose ? T.MathUtils.lerp(lateral, side * (5.3 + offset * side),
    T.MathUtils.smoothstep(forward, 0, 118)) : lateral
  return target + side * (.69 * Math.sin(crossing * .037) + Math.max(0, forward - (goose ? 202 : 109)) * .32)
}

const bankLimit = (side, lateral) => side * Math.max(4.82, side * lateral)
const pheasantOffset = flush => -.67 * Math.sin(flush * .038) + Math.max(0, flush - 88) * .36
const mallardOffset = takeoff => .39 * Math.sin(takeoff * .070) + Math.max(0, takeoff - 65) * .25

export function encounterPose(event, animal, ahead, elapsed, unit, out) {
  const side = Math.sign(event.lateral)
  const phase = elapsed * 1.35 + event.seed * .078 + unit * 2.117
  const flight = flightFamily.has(animal.family) || event.kind === 'flyover'
  const group = unit > 0 ? Math.ceil(unit / 2) : 0
  const formation = unit % 2 ? 1 : -1
  out.offset = unit ? formation * group * (animal.family === 'crane' ? 1.87 : .80) : 0
  out.along = group * (flight ? -1.48 : .88)
  out.height = event.height
  out.lateral = event.lateral + out.offset
  out.yaw = side * -.71
  out.roll = 0
  out.pitch = 0
  out.wing = 0
  out.rig = 'Idle'
  out.draw = true
  if (animal.family === 'pheasant') {
    const flush = Math.max(0, 31 - ahead)
    out.draw = flush > 0
    out.along += flush * .84
    out.height += Math.min(3.4, flush ** 1.30 * .032)
    const anchor = out.lateral
    out.lateral += side * pheasantOffset(flush)
    if (flush > 0) out.yaw = motionYaw(event.distance + out.along, bankLimit(side, out.lateral), .168,
      bankLimit(side, anchor + side * pheasantOffset(flush + .20)))
    out.pitch = Math.max(0,.44-flush*.015)
    out.wing = .63 + .35*Math.sin(phase*6.4)
    out.rig = 'Fly'
  } else if (flight) {
    const crossing = 40 - ahead
    const forward = Math.max(0, crossing)
    const goose = animal.family === 'goose'
    out.along += forward * (goose ? .94 : .82)
    const anchor = out.lateral
    out.lateral = flockLateral(side, anchor, out.offset, crossing, goose)
    out.height += Math.sin(phase * .47) * .27 + .004 * crossing
    if (animal.family === 'crane' || animal.family === 'raptor') out.height += 3.05
    out.roll = side * .082 * Math.sin(crossing*.16)
    out.pitch = .05 * Math.sin(phase*.65)
    if (crossing > 0) {
      // Sample the planned arc by distance, including the real trail curve.
      out.yaw = motionYaw(event.distance + out.along, bankLimit(side, out.lateral),
        .20 * (goose ? .94 : .82), bankLimit(side, flockLateral(side, anchor, out.offset, crossing + .20, goose)))
    } else out.yaw = -side * .87
    out.wing = (animal.family === 'raptor' ? .34 : .51) * (.72 + .28*Math.sin(phase*.46)) * Math.sin(phase*4.8)
    out.rig = animal.family === 'raptor' && Math.sin(phase*.45) > -.31 ? 'Glide' : 'Fly'
  } else if (animal.family === 'deer') {
    const run = Math.max(0, 41 - ahead)
    out.lateral = deerLateral(event.lateral, side, run)
    out.along += run * .87
    out.yaw = motionYaw(event.distance + out.along, bankLimit(side, out.lateral), .174,
      bankLimit(side, deerLateral(event.lateral, side, run + .20)))
    out.rig = run > 0 ? 'Gallop' : 'Eating'
    out.height += Math.max(0, Math.sin(phase*5.0)) * Math.min(.11, run * .033)
  } else if (animal.family === 'moose' || animal.family === 'alligator') {
    out.lateral += side * (.15 + .18 * Math.sin(phase * .27))
    out.along += (-ahead + 25) * .026
    out.rig = animal.family === 'moose' ? 'Walk' : 'Idle'
  } else {
    out.lateral += side * Math.sin(phase * .42) * .33
    out.along += Math.sin(phase * .55) * .35
    out.height += animal.family === 'wader' ? .13 : Math.sin(phase * 1.5) * .028 + .078
    if (animal.id === 'mallard' && ahead < 27 - group) {
      const takeoff = 27 - group - ahead
      out.height += Math.min(2.8, .064 * takeoff ** 1.26)
      const anchor = out.lateral
      out.lateral += side * mallardOffset(takeoff)
      out.along += takeoff * .82
      out.yaw = motionYaw(event.distance + out.along, bankLimit(side, out.lateral), .164,
        bankLimit(side, anchor + side * mallardOffset(takeoff + .20)))
      out.pitch = .22 - Math.min(.20, takeoff * .013)
      out.wing = .48 + .42 * Math.sin(phase * 6.4)
      out.rig = 'Fly'
    }
  }
  // The whole local flock stays outside the edge of the playable trail.
  out.lateral = bankLimit(side, out.lateral)
  return out
}
