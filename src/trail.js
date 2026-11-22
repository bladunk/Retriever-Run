export const segmentLength = 30

// The lane grid is measured along the cross-section of a continuous trail.
export function centerAt(distance) {
  return 9 * Math.sin(distance / 23) + 6 * Math.sin(distance / 53) - 3.3 * Math.sin(distance / 8.6)
}

export function slopeAt(distance) {
  return 9 / 23 * Math.cos(distance / 23) + 6 / 53 * Math.cos(distance / 53) - 3.3 / 8.6 * Math.cos(distance / 8.6)
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
  const segment = Math.floor(distance / segmentLength)
  if (segment % 6 === 3 || segment % 6 === 4) return 'wood'
  if (habitatAt(distance) === 'Muddy Creek') return 'mud'
  return 'dirt'
}

export function seededRandom(seed) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0
    return seed / 4294967296
  }
}
