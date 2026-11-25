import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { hazardHull } from './hazard-hull.js'
import { seededRandom } from './trail.js'

export const fallenTimbers = [
  { name: 'Cypress washout', bark: 0x967554, wood: 0xd4ac76, earth: 0x645039, moss: 0x727746, side: 1, lift: 2.24, rake: .23 },
  { name: 'Split bank cottonwood', bark: 0x998274, wood: 0xdfbb86, earth: 0x795e4c, moss: 0x62744f, side: -1, lift: 2.13, rake: .33 },
  { name: 'Storm-tipped pine', bark: 0x826349, wood: 0xe5be7f, earth: 0x6b5643, moss: 0x79845b, side: 1, lift: 2.15, rake: .40 },
]
const cache = new Map()
const vertical = new T.Vector3(0, 1, 0)
const forward = new T.Vector3(0, 0, 1)

export function fallenVariant(distance, lane) {
  return ((Math.imul(Math.round(distance * 32), 31) >>> 0) + lane + 1) % fallenTimbers.length
}

function textureGeometry(positions, uvs, colors, layers, indices) {
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('fieldLayer', new T.Float32BufferAttribute(layers, 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function curvedWood(guide, tint, endColor, random, fractured, bothEnds = false, collision, light = false) {
  const curve = new T.CatmullRomCurve3(guide.map(point => new T.Vector3(point[0], point[1], point[2])))
  const curveSteps = fractured ? 11 : light ? 3 : 6
  const sides = fractured ? 12 : light ? 5 : 7
  const values = [], uvs = [], colors = [], layers = [], indices = []
  const tangent = new T.Vector3(), normal = new T.Vector3(), binormal = new T.Vector3()
  const shade = new T.Color()
  const scratches = Array.from({ length: sides }, () => .74 + random() * .36)
  const breakLine = Array.from({ length: sides }, () => random() ** 4 * (fractured ? .25 : .08))
  function point(position, color, bright, u, v, layer) {
    values.push(position.x, Math.max(-.028, position.y), position.z)
    uvs.push(u, v)
    shade.setHex(color).multiplyScalar(bright).toArray(colors, colors.length)
    layers.push(layer === 2 ? 4 : layer)
    return layers.length - 1
  }

  let rim
  let firstRim
  let previousRim
  for (let segment = 0; segment <= curveSteps; segment++) {
    const t = segment / curveSteps
    const at = curve.getPoint(t)
    curve.getTangent(t, tangent)
    normal.crossVectors(tangent, Math.abs(tangent.y) < .84 ? vertical : forward).normalize()
    binormal.crossVectors(tangent, normal).normalize()
    const span = t * (guide.length - 1)
    const lower = Math.min(guide.length - 2, Math.floor(span))
    const radius = T.MathUtils.lerp(guide[lower][3], guide[lower + 1][3], span - lower)
    rim = []
    for (let j = 0; j <= sides; j++) {
      const n = j % sides
      const phi = n / sides * Math.PI * 2
      const rib = scratches[n] * (.98 + .10 * Math.sin(phi * 3 + segment * .7))
      const offset = normal.clone().multiplyScalar(Math.cos(phi) * radius * rib)
        .addScaledVector(binormal, Math.sin(phi) * radius * rib * .88)
      const outline = at.clone().add(offset)
      if (segment === curveSteps) outline.addScaledVector(tangent, breakLine[n])
      const ring = point(outline, tint, (.71 + .38 * rib) * (1 + .15 * Math.sin(phi)), j / sides * 1.25, t * 1.4, 2)
      outline.y = Math.max(-.028, outline.y)
      rim.push(outline)
      if (segment && j) {
        const stride = sides + 1
        indices.push(ring - stride - 1, ring - stride, ring - 1, ring - 1, ring - stride, ring)
      }
    }
    if (!segment) firstRim = rim
    if (collision && previousRim) {
      collision.push(hazardHull('solid wood', [...previousRim.slice(0, sides), ...rim.slice(0, sides)]))
    }
    previousRim = rim
  }

  function endGrain(ringPoints, endpoint) {
    const end = curve.getPoint(endpoint)
    const middle = point(end, endColor, .86, .46, .53, 3)
    for (let j = 0; j <= sides; j++) {
      const angle = j * Math.PI * 2 / sides
      const ring = point(ringPoints[j], endColor, .86 + .16 * Math.sin(angle * 3 + .8), .46 + .47 * Math.cos(angle),
        .53 + .42 * Math.sin(angle), 3)
      if (j) indices.push(middle, endpoint ? ring - 1 : ring, endpoint ? ring : ring - 1)
    }
  }
  endGrain(rim, 1)
  if (bothEnds) endGrain(firstRim, 0)
  return textureGeometry(values, uvs, colors, layers, indices)
}

// The tipped soil wedge spreads out from the root collar. Individual exposed
// roots follow the folds of the plate, then pick up thinner broken branches.
function rootFan(palette, random, volumes) {
  const positions = [], colors = [], uvs = [], layers = [], indices = []
  const shadow = new T.Color(palette.earth).multiplyScalar(.58)
  const earth = new T.Color(palette.earth)
  const moss = new T.Color(palette.moss)
  const shade = new T.Color()
  const rows = 6, columns = 18
  const rim = Array.from({ length: columns + 1 }, (_, i) =>
    .72 + .16 * Math.sin(i * 1.68 + palette.rake * 11) + random() * .19)
  const crown = Math.max(...rim.map((leaf, index) => Math.sin(Math.PI * index / columns) * leaf))
  const outline = []
  for (let row = 0; row <= rows; row++) {
    const r = row / rows
    for (let column = 0; column <= columns; column++) {
      const theta = Math.PI * (column / columns)
      const leaf = rim[column]
      const flare = Math.sin(theta) * r * leaf / crown
      const x = palette.side * (-.38 + (.71 * Math.cos(theta) * r * leaf) + .36 * flare)
      const y = Math.max(.015, .17 * (1 - r) + flare * palette.lift + .08 * Math.cos(theta * 3) * r)
      const z = .41 + Math.cos(theta) * .20 * r - palette.rake * y + .07 * Math.sin(theta * 9 + r * 7) * r
      if (row === rows) outline.push([x, y, z])
      shade.copy(shadow).lerp(earth, .36 + leaf * .38 + random() * .16)
      if (column % 4 === 1) shade.lerp(moss, r * .39)
      for (const back of [false, true]) {
        positions.push(x, y, z + (back ? -.21 + r * .10 : 0))
        uvs.push(x * 1.7, y * 1.4)
        shade.toArray(colors, colors.length)
        layers.push(1)
      }
      if (row && column) {
        const at = positions.length / 3 - 2
        const prior = at - (columns + 1) * 2
        const front = [at, prior, at - 2, prior, prior - 2, at - 2]
        const back = [at + 1, at - 1, prior + 1, prior + 1, at - 1, prior - 1]
        indices.push(...(palette.side === 1 ? front : front.reverse()), ...(palette.side === 1 ? back : back.reverse()))
      }
    }
  }
  const plate = textureGeometry(positions, uvs, colors, layers, indices)
  for (let i = 0; i < columns; i += 3) {
    const points = [new T.Vector3(-palette.side * .38, .17, .40), new T.Vector3(-palette.side * .38, .17, .19)]
    for (const [x,y,z] of outline.slice(i, i + 4)) {
      points.push(new T.Vector3(x,y,z), new T.Vector3(x,y,z-.13))
    }
    volumes.push(hazardHull('root fan', points))
  }
  return { plate, outline }
}

export function fallenTimber(variant = 0) {
  const type = ((variant % fallenTimbers.length) + fallenTimbers.length) % fallenTimbers.length
  if (cache.has(type)) return cache.get(type)
  const palette = fallenTimbers[type]
  const random = seededRandom(84082 + type * 59)
  const volumes = []
  const turn = (x, y, z, width) => [palette.side*x, y, z, width]
  const { plate, outline } = rootFan(palette, random, volumes)
  const parts = [plate, curvedWood([
    turn(-.62,.60,.26,.29), turn(-.45,.56,.12,.38),
    turn(.03,.44,-.18,.33), turn(.42,.32,-.47,.28),
    turn(.84,.29,-.73,.21),
  ], palette.bark, palette.wood, random, true, false, volumes)]
  for (let n = 1; n < outline.length - 1; n += 2) {
    const [x, y, z] = outline[n]
    const start = [-palette.side * .42,.57,.39,.113 + random() * .047]
    const mid = [(x + start[0])*.52,(y+.65)*.49,z+.20,.081]
    parts.push(curvedWood([start, mid, [x*.93,y*.83,z+.085,.048], [x,y,z,.017]],
      palette.bark, palette.wood, random, false, false, undefined, true))
    if (n % 4 === 1) parts.push(curvedWood([mid, [x-.08,y*.69,z+.11,.03],
      [x+.13,y*.54,z+.07,.012]], palette.bark, palette.wood, random, false, false, undefined, true))
  }
  for (const [side, y, offset] of [[-1,.58,-.24],[1,.43,-.47]]) {
    parts.push(curvedWood([turn(.14,.42,offset,.115), turn(.39,y,offset+side*.17,.072),
      turn(.62,y+.09,offset+side*.27,.025)], palette.bark, palette.wood, random, false))
  }
  const geometry = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  geometry.name = palette.name
  geometry.computeBoundingBox()
  const timber = { geometry, volumes }
  cache.set(type, timber)
  return timber
}

export const fallenTimberModel = variant => fallenTimber(variant).geometry
