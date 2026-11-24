import { Vector3 } from 'three'
import { ConvexHull } from 'three/addons/math/ConvexHull.js'
import { seededRandom } from './trail.js'

// Full width, height and depth in metres. Cluster offsets are local to the lane.
const stone = (width, height, depth, shoulder, crown, lean, roundness, x = 0, z = 0) =>
  ({ width, height, depth, shoulder, crown, lean, roundness, x, z })

export const rocks = [
  { name: 'Mudbank stone', size: 'small', color: 0x766951, cover: 'mud', parts: [stone(1.46, .39, .86, .74, .47, -.18, .61)] },
  { name: 'Cypress mossstone', size: 'small', color: 0x5a6152, cover: 'moss', parts: [stone(1.27, .55, 1.01, .66, .53, .21, .42)] },
  { name: 'River cobble', size: 'small', color: 0x827e70, cover: 'river', parts: [stone(1.25, .46, 1.20, .58, .57, .11, .90)] },
  { name: 'Prairie erratic', size: 'small', color: 0x87816e, cover: 'dry', parts: [stone(1.21, .64, .88, .69, .34, -.35, .39)] },
  { name: 'Flooded slate', size: 'medium', color: 0x58615d, cover: 'river', parts: [stone(1.60, .88, 1.14, .74, .54, .30, .16)] },
  { name: 'Glacial granite', size: 'medium', color: 0x88847e, cover: 'dry', parts: [stone(1.65, 1.08, 1.31, .59, .43, -.24, .42)] },
  { name: 'Rimed granite', size: 'medium', color: 0x7b8082, cover: 'frost', parts: [stone(1.62, 1.47, 1.29, .66, .52, .18, .20)] },
  { name: 'Glacial dropstone', size: 'large', color: 0x77766b, cover: 'dry', parts: [stone(2.39, 2.01, 1.86, .54, .53, .16, .56)] },
  { name: 'Boreal moss boulder', size: 'large', color: 0x676d62, cover: 'moss', parts: [stone(2.30, 2.04, 1.95, .64, .55, -.16, .50)] },
  { name: 'Fractured alpine block', size: 'large', color: 0x737e85, cover: 'snow', parts: [stone(2.21, 2.24, 1.90, .71, .53, .12, .10)] },
  { name: 'Fieldstone pile', size: 'cluster', color: 0x7f755d, cover: 'dry', parts: [
    stone(1.67, 1.96, 1.48, .62, .59, .14, .48, -.24, -.21),
    stone(.96, .66, .82, .70, .54, -.32, .55, .43, .45),
    stone(.64, .38, .67, .70, .40, .22, .50, -.39, .68),
  ] },
  { name: 'Alpine scree', size: 'cluster', color: 0x80898a, cover: 'snow', parts: [
    stone(1.65, 2.13, 1.53, .65, .62, .10, .11, -.22, -.19),
    stone(.93, .85, .90, .73, .52, .22, .12, .47, .31),
    stone(.70, .43, .66, .69, .53, -.29, .10, -.38, .70),
  ] },
]

const belts = [
  [0, 0, 0, 2], [1, 1, 0, 4], [2, 2, 0, 4], [4, 4, 1, 5],
  [10, 10, 3, 5], [3, 3, 5, 10, 7], [7, 7, 5, 3, 10],
  [6, 6, 5, 7, 8], [8, 8, 1, 5, 6], [9, 9, 11, 11, 6, 8],
]

export function chooseRock(territory, random, previous) {
  const choices = belts[territory].filter(variant => variant !== previous)
  return choices[Math.floor(random() * choices.length)]
}

export const rockTurns = [-.57, .16, .91]
const shapes = new Map()

export function rockShape(variant, turn = 1) {
  const key = variant * rockTurns.length + turn
  if (!shapes.has(key)) {
    const profile = rocks[variant]
    shapes.set(key, profile.parts.map((part, index) => sculpt(part, variant, index, rockTurns[turn])))
  }
  return shapes.get(key)
}

function sculpt(part, variant, index, turn) {
  const { width, height, depth, shoulder, crown, lean, roundness, x, z } = part
  const random = seededRandom(0x68ba98c7 ^ Math.imul(variant * 7 + index + 1, 0x93fa87))
  const points = []
  const cos = Math.cos(turn), sin = Math.sin(turn)
  const lobes = Array.from({ length: 10 }, () => .83 + random() * .21)
  const tiers = [
    [.69, -.13, 0], [1, height * .24, .08],
    [shoulder + .21, height * .70, .25], [crown, height * .94, .07],
  ]
  for (const [radius, y, offset] of tiers) {
    for (const [i, lobe] of lobes.entries()) {
      const angle = i * Math.PI / 5 + offset + (random() - .5) * .16
      const bias = .89 + .12 * Math.sin(angle * 3 + variant)
      const px = Math.cos(angle) * radius * lobe * width * .5 + lean * Math.max(0, y)
      const pz = Math.sin(angle) * radius * bias * depth * .5 - lean * .35 * Math.max(0, y)
      const crownTilt = height > 1.7 && y > height * .4 ?
        y * (.10 * Math.cos(angle + variant * 1.05) + .04 * Math.sin(angle * 2.6 - variant)) : 0
      const surface = Math.min(height, y + crownTilt + (random() - .5) * height * (.10 + .10 * (1 - roundness)))
      points.push(new Vector3((x + px) * cos + (z + pz) * sin, surface, (z + pz) * cos - (x + px) * sin))
    }
  }
  const hull = new ConvexHull().setFromPoints(points)
  const planes = hull.faces.map(({ normal, constant }) => ({ x: normal.x, y: normal.y, z: normal.z, limit: constant }))
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity]
  for (const point of points) for (let axis = 0; axis < 3; axis++) {
    min[axis] = Math.min(min[axis], point.getComponent(axis))
    max[axis] = Math.max(max[axis], point.getComponent(axis))
  }
  const [cx, cy, cz] = min.map((value, axis) => (value + max[axis]) / 2)
  const [hx, hy, hz] = max.map((value, axis) => (value - min[axis]) / 2)
  const name = index ? 'outlying stone ' + index : rocks[variant].name.toLowerCase()
  return { name, x: cx, y: cy, z: cz, hx, hy, hz, hull, planes, roundness }
}
