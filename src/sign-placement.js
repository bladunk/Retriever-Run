import { courseStages, distanceAtTime, speedAtTime } from './difficulty.js'
import { seededRandom, segmentLength } from './trail.js'

const firstNotice = 15
const typicalGap = 22
const capTime = courseStages.at(-1).start
const capMeters = distanceAtTime(capTime)
const capSpeed = speedAtTime(capTime)

// A stable 0–7 s offset keeps the gaps irregular and bounded to 15–29 s.
// The terrain worker can find its own notice without depending on packet order.
export function signDistance(ordinal) {
  const jitter = seededRandom(Math.imul(ordinal + 1, 0x79870b9d))()
  return distanceAtTime(firstNotice + ordinal * typicalGap + jitter * 7)
}

function timeAt(distance) {
  if (distance >= capMeters) return capTime + (distance - capMeters) / capSpeed
  let low = 0, high = capTime
  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2
    if (distanceAtTime(mid) < distance) low = mid
    else high = mid
  }
  return (low + high) / 2
}

export function signAnchor(tile, height) {
  if (tile < 0) return null
  const start = tile * segmentLength
  const first = Math.max(0, Math.floor((timeAt(start) - firstNotice - 7) / typicalGap))
  for (let ordinal = first; ordinal < first + 3; ordinal++) {
    const distance = signDistance(ordinal)
    if (distance >= start + segmentLength) break
    if (distance < start) continue
    const random = seededRandom(Math.imul(ordinal + 29, 0x69f393b))
    const side = random() < .5 ? -1 : 1
    const width = side * (4.72 + random() * .30)
    return { tile, ordinal, distance, width, y: height(distance, width) }
  }
  return null
}
