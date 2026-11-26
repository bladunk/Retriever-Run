import { centerAt, headingAt, seededRandom, segmentLength } from './trail.js'

export function cypressStand(index, seed, earth, landmark, sign) {
  const start = index * segmentLength
  const origin = centerAt(start)
  const random = seededRandom(Math.imul(index + 291, 0x12da221) ^ seed)
  const trees = []
  // A broken near-bank line frames the trail. The inner bay is deliberately
  // open at some bends, with overlapping distant trees beyond the water.
  for (const side of [-1, 1]) {
    const openBay = (index + Number(side === 1) * 2) % 5 < 2
    for (let i = 0; i < 13; i++) {
      const near = i < 5
      const row = near ? i : (i - 5) % 4
      const at = start + 2.1 + row * (near ? 5.55 : 7.07) + random() * 3.7
      const edge = near ? 5.85 + random() * (openBay ? 5.9 : 2.75) : i < 9 ? 12.3 + random() * 9.3 : 23.9 + random() * 15
      const lateral = side * edge
      const ground = earth(at, lateral)
      const height = (near ? 14.7 : 9.2) + random() * (near ? 7.4 : 10.5)
      const rotate = random() * Math.PI * 2
      if (landmark && Math.abs(at - landmark.distance) < 7.8 && Math.abs(lateral - landmark.x) < 4.2) continue
      if (sign && Math.abs(at - sign.distance) < 3.9 && Math.sign(sign.width) === side && edge < 9.1) continue
      if (near && (openBay ? i === 1 || i === 2 : (index + i + Number(side === 1) * 3) % 8 === 1)) continue
      const heading = headingAt(at)
      trees.push(centerAt(at) - origin + Math.cos(heading) * lateral, ground, start - at - Math.sin(heading) * lateral,
        height, rotate, i % 3, near ? 0 : 1)
    }
  }
  return trees
}
