import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { seededRandom } from './trail.js'

export const fallenTimbers = [
  {
    name: 'Peat root plate', bark: 0xa1815f, wood: 0xe0b786, earth: 0x78614d, moss: 0x778153,
    mass: [[-.22, .87, -.015, .67, .90, .38], [-.37, 1.66, -.115, .43, .62, .31], [.10, 1.20, -.06, .40, .48, .30]],
    trunk: [[-.65, .94, -.05, .37], [-.20, .78, .06, .40], [.32, .61, .16, .33], [.87, .59, .32, .28]],
    roots: [
      [[-.31, 1.98, .23, .097], [-.53, 1.69, .32, .10], [-.55, 1.39, .375, .082], [-.79, 1.03, .30, .03]],
      [[-.51, 1.44, .25, .13], [-.32, 1.17, .36, .10], [-.43, .75, .425, .057], [-.32, .21, .41, .019]],
      [[-.08, 1.63, .25, .14], [.27, 1.45, .34, .097], [.30, 1.12, .34, .06], [.51, .75, .34, .018]],
      [[.21, 1.27, .31, .067], [.03, .96, .40, .069], [.09, .60, .435, .045], [-.07, .15, .36, .019]],
      [[-.56, .82, .27, .11], [-.76, .60, .355, .072], [-.68, .24, .405, .055], [-.93, .045, .46, .024]],
      [[.28, .66, .18, .10], [.52, .71, .13, .083], [.69, .89, -.055, .032], [.76, 1.07, -.07, .018]],
    ],
  },
  {
    name: 'Silt-split roots', bark: 0x9c826a, wood: 0xe4bf97, earth: 0x7c6b5c, moss: 0x727c56,
    mass: [[-.27, 1.01, .005, .56, .95, .35], [-.40, 1.72, .005, .37, .47, .27], [.12, 1.30, .02, .29, .49, .23]],
    trunk: [[-.70, .78, .025, .33], [-.16, .71, .13, .37], [.28, .66, .18, .35], [.84, .57, .36, .22]],
    roots: [
      [[-.48, 2.10, .045, .072], [-.65, 1.78, .16, .10], [-.75, 1.48, .245, .073], [-.57, 1.06, .30, .035]],
      [[-.54, 1.52, .23, .12], [-.36, 1.19, .38, .092], [-.17, .75, .38, .044], [-.42, .37, .415, .019]],
      [[-.21, 1.80, .245, .093], [-.05, 1.55, .355, .087], [.25, 1.37, .31, .061], [.31, .97, .35, .019]],
      [[.20, 1.49, .18, .078], [.32, 1.21, .26, .068], [.16, .96, .35, .053], [.23, .74, .37, .015]],
      [[-.35, .79, .31, .091], [-.54, .52, .38, .057], [-.72, .36, .38, .045], [-.67, .10, .42, .017]],
      [[.38, .75, .195, .11], [.55, .91, .107, .081], [.59, 1.13, -.055, .038], [.52, 1.29, -.10, .014]],
    ],
  },
  {
    name: 'Mossbound crown', bark: 0x917d59, wood: 0xd4b688, earth: 0x72644f, moss: 0x899456,
    mass: [[-.20, .98, .026, .64, .96, .38], [-.08, 1.72, -.065, .42, .53, .33], [-.55, 1.42, .01, .30, .46, .25]],
    trunk: [[-.65, .92, -.02, .36], [-.16, .75, -.08, .39], [.26, .55, -.05, .31], [.84, .47, .18, .24]],
    roots: [
      [[-.18, 2.23, -.09, .072], [-.26, 1.91, .23, .11], [-.51, 1.67, .34, .10], [-.51, 1.29, .395, .025]],
      [[-.50, 1.80, .205, .096], [-.65, 1.50, .34, .078], [-.73, 1.08, .36, .071], [-.66, .63, .425, .024]],
      [[.20, 1.66, .24, .10], [.09, 1.39, .41, .093], [.20, .99, .425, .072], [.38, .68, .39, .019]],
      [[-.39, 1.23, .375, .11], [-.22, .96, .46, .087], [-.25, .49, .438, .058], [-.47, .06, .47, .021]],
      [[-.11, .70, .37, .11], [-.11, .45, .47, .069], [.07, .22, .44, .038], [.37, .07, .32, .017]],
      [[.07, .64, -.12, .102], [.41, .72, -.22, .086], [.57, .93, -.35, .035], [.53, 1.11, -.38, .012]],
    ],
  },
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

function sculptedEarth(mass, palette, random, detail, tone = palette.earth) {
  const [x, y, z, width, height, depth] = mass
  const shape = new T.IcosahedronGeometry(1, detail)
  const pos = shape.attributes.position
  const points = [], color = new T.Color(), mossColor = new T.Color(palette.moss)
  const roughness = random() * 6
  for (let i = 0; i < pos.count; i++) {
    const a = pos.getX(i), b = pos.getY(i), c = pos.getZ(i)
    const ripple = 1 + .17 * Math.sin(a * 8.1 + c * 5.3 + roughness) * Math.cos(b * 11.4)
    const crumb = .96 + .11 * Math.cos(c * 13.6 - b * 10.1 + a * 4.8)
    const px = x + width * (a * ripple - b * .11 + a * b * .13)
    pos.setXYZ(i, px, Math.max(.015, y + height * b * crumb), z + depth * c * ripple - b * .08)
    const moss = Math.max(0, (b + .46 - Math.abs(a + .19)) * (.35 + .31 * Math.cos(a * 8.6 + c * 14)))
    color.setHex(tone).lerp(mossColor, moss)
      .multiplyScalar((.93 + .14 * crumb + .15 * Math.sin(a * 12 + c * 19)) * (.94 + b * .13)).toArray(points, points.length)
  }
  shape.setAttribute('color', new T.Float32BufferAttribute(points, 3))
  shape.setAttribute('fieldLayer', new T.Float32BufferAttribute(new Float32Array(pos.count).fill(detail ? 1 : 0), 1))
  shape.setIndex(Array.from({ length: pos.count }, (_, index) => index))
  shape.computeVertexNormals()
  if (detail) {
    const normals = shape.attributes.normal
    const wells = new Map()
    const keys = []
    for (let i = 0; i < pos.count; i++) {
      const key = [pos.getX(i), pos.getY(i), pos.getZ(i)].map(value => Math.round(value * 10_000)).join(',')
      if (!wells.has(key)) wells.set(key, new T.Vector3())
      const sum = wells.get(key)
      sum.x += normals.getX(i)
      sum.y += normals.getY(i)
      sum.z += normals.getZ(i)
      keys.push(key)
    }
    for (const sum of wells.values()) sum.normalize()
    for (const [index, key] of keys.entries()) {
      const normal = wells.get(key)
      normals.setXYZ(index, normal.x, normal.y, normal.z)
    }
  }
  return shape
}

export function curvedWood(guide, tint, endColor, random, fractured, bothEnds = false) {
  const curve = new T.CatmullRomCurve3(guide.map(point => new T.Vector3(point[0], point[1], point[2])))
  const curveSteps = fractured ? 11 : 6
  const sides = fractured ? 12 : 7
  const values = [], uvs = [], colors = [], layers = [], indices = []
  const tangent = new T.Vector3(), normal = new T.Vector3(), binormal = new T.Vector3()
  const shade = new T.Color()
  const scratches = Array.from({ length: sides }, () => .74 + random() * .36)
  const breakLine = Array.from({ length: sides }, () => random() ** 4 * (fractured ? .25 : .08))
  function point(position, color, bright, u, v, layer) {
    values.push(position.x, Math.max(-.028, position.y), position.z)
    uvs.push(u, v)
    shade.setHex(color).multiplyScalar(bright).toArray(colors, colors.length)
    layers.push(layer)
    return layers.length - 1
  }

  let rim
  let firstRim
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
      rim.push(outline)
      if (segment && j) {
        const stride = sides + 1
        indices.push(ring - stride - 1, ring - stride, ring - 1, ring - 1, ring - stride, ring)
      }
    }
    if (!segment) firstRim = rim
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

export function fallenTimberModel(variant = 0) {
  const type = ((variant % fallenTimbers.length) + fallenTimbers.length) % fallenTimbers.length
  if (cache.has(type)) return cache.get(type)
  const palette = fallenTimbers[type]
  const random = seededRandom(71282 + type * 3779)
  const parts = palette.mass.map((mass, index) => sculptedEarth(mass, palette, random, index === 0 ? 2 : 1))
  // Soil and pale mineral inclusions ride with a plate of broken ground.
  for (let n = 0; n < 7; n++) {
    const x = -.62 + random() * .77
    const y = .38 + random() * 1.28
    const z = .28 + random() * .09
    const size = .027 + random() * .037
    parts.push(sculptedEarth([x, y, z, size, size * 1.4, size * .51], palette, random, 0, n % 2 ? 0x7d7567 : 0x53483c))
  }
  parts.push(curvedWood(palette.trunk, palette.bark, palette.wood, random, true))
  for (const [index, root] of palette.roots.entries()) {
    const bark = index % 3 === 1 ? palette.bark : type === 2 ? 0x9c8664 : 0xaf8a68
    parts.push(curvedWood(root, bark, palette.wood, random, false))
    if (index % 2 === 0) {
      const joint = root[2]
      const tip = root[3]
      const fork = [joint, [joint[0] + .09, joint[1] - .10, joint[2] + .023, .033],
        [tip[0] + .17, Math.max(.05, tip[1] - .11), tip[2] - .07, .010]]
      parts.push(curvedWood(fork, bark, palette.wood, random, false))
    }
  }
  const geometry = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  geometry.name = palette.name
  geometry.computeBoundingBox()
  cache.set(type, geometry)
  return geometry
}
