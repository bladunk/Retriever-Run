export const segmentLength = 30

// The lane grid is measured along the cross-section of a continuous trail.
export function centerAt(distance) {
  return 17 * Math.sin(distance / 43) + 9 * Math.sin(distance / 74) + 2.6 * Math.sin(distance / 26)
}

export function slopeAt(distance) {
  return 17 / 43 * Math.cos(distance / 43) + 9 / 74 * Math.cos(distance / 74) + 2.6 / 26 * Math.cos(distance / 26)
}

export function headingAt(distance) {
  return -Math.atan(slopeAt(distance))
}

export function placeOnTrail(target, distance, laneOffset, origin) {
  const angle = headingAt(distance)
  target.x = centerAt(distance) - centerAt(origin) + Math.cos(angle) * laneOffset
  target.z = origin - distance - Math.sin(angle) * laneOffset
  return angle
}

const habitats = ['Cattail Marsh', 'Flooded Timber', 'Prairie Potholes', 'Autumn Woodland', 'Muddy Creek']

export function habitatAt(distance) {
  return habitats[Math.floor(Math.max(0, distance) / 180) % habitats.length]
}

export function surfaceAt(distance) {
  const habitat = habitatAt(distance)
  if (habitat === 'Cattail Marsh' || habitat === 'Flooded Timber' || habitat === 'Muddy Creek') return 'mud'
  return 'dirt'
}

export function seededRandom(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

export function trailHeight(distance, lateral) {
  return .042 * Math.sin(distance * .089) + .027 * Math.sin(distance * .245 + lateral * .42)
}
