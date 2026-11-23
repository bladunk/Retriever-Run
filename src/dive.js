import { laneWidth, placeOnTrail, slopeAt, trailHeight } from './trail.js'

export const diveApproach = 3.45
export const diveExit = 1.80
export const diveWarningLead = 2.35
export const diveDuckLead = .46
export const diveScale = .90
const forwardSpeed = 8.8
const lateralSpeed = 4.55

export function diveAge(entity, runnerDistance) {
  return (runnerDistance - entity.distance) / entity.flightSpeed
}

export function diveWarning(entity, runnerDistance) {
  const age = diveAge(entity, runnerDistance)
  if (!entity.lead || age >= .31) return null
  if (age >= -diveDuckLead) return 'duck'
  return age >= -diveWarningLead ? 'approach' : null
}

export function diveFrame(out, entity, runnerDistance, origin, companion = 0) {
  const age = diveAge(entity, runnerDistance)
  const side = entity.direction
  const line = Math.ceil(companion / 2)
  const wing = companion % 2 ? -1 : 1
  const separation = Math.min(1, Math.max(0, (age + 2.55) / 1.50))
  const peel = separation * separation * (3 - 2 * separation)
  const distance = entity.distance - age * forwardSpeed + line * 1.60
  const offset = entity.lane * laneWidth + side * age * lateralSpeed + wing * line * (1.46 + peel * .58)
  const heading = placeOnTrail(out, distance, offset, origin)
  const departure = 1 - Math.exp(-((age * age) / 1.13))
  out.y = trailHeight(entity.distance, entity.lane * laneWidth)
    + 1.237 + departure * 5.40 + (companion ? .28 * line + peel * 4.7 : 0)
  // The course is a curved coordinate frame. Use both flight velocity components
  // to set the nose direction while keeping the trajectory independent of the dog.
  const forward = Math.hypot(1, slopeAt(distance)) * forwardSpeed
  out.angle = heading + Math.atan2(-side * lateralSpeed, -forward)
  out.pitch = Math.max(-.23, Math.min(.23, age * Math.exp(-age * age) * .43))
  out.roll = side * (companion ? .05 : -.16) * Math.sin(peel * Math.PI)
  return out
}
