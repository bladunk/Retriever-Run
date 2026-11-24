import { segmentLength } from './trail.js'

export const signInterval = 3
export const signOffset = 13

export function signAnchor(tile, height) {
  if (tile < 0 || tile % signInterval !== 0) return null
  const distance = tile * segmentLength + signOffset
  const side = Math.floor(tile / signInterval) % 4 < 2 ? -1 : 1
  const width = side * 4.62
  return { tile, distance, width, y: height(distance, width) }
}
