import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { hazardHull } from './hazard-hull.js'
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

// Form the exposed soil as one torn, tapered plate. Cross-sections cover
// the existing soil footprint, with the lower edge buried into the trail.
function rootPlate(palette, random, variant) {
  const rings = 11
  const sides = 20
  const positions = [], colors = [], uvs = [], layers = [], indices = []
  const shade = new T.Color()
  const moss = new T.Color(palette.moss)
  const earth = new T.Color(palette.earth).multiplyScalar(.62)
  const top = Math.max(...palette.mass.map(([, y, , , ry]) => y + ry))
  for (let row = 0; row <= rings; row++) {
    const y = top * row / rings
    const active = palette.mass.map(([x, cy, z, rx, ry, rz]) => {
      const section = Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2))
      return { x, z, width: rx * section, depth: rz * section }
    }).filter(section => section.width > .003)
    const left = active.length ? Math.min(...active.map(({ x, width }) => x - width)) : -.36
    const right = active.length ? Math.max(...active.map(({ x, width }) => x + width)) : -.35
    const depth = active.length ? Math.max(...active.map(({ depth }) => depth)) : .012
    for (let n = 0; n <= sides; n++) {
      const angle = n / sides * Math.PI * 2
      const ridge = Math.sin(angle * 4 + y * 5 + variant * .8) * .081 + Math.sin(angle * 9 - y * 6) * .055
      const curl = Math.cos(y * 4 + variant) * .031
      const x = (right + left) / 2 + Math.cos(angle) * Math.max(.011,(right - left) * .475) * (1 + ridge)
      const z = -y * .035 + Math.sin(angle) * depth * (1 + ridge * 1.81) + curl
      const vertical = Math.max(-.035, y + ridge * .29 * Math.sin(row / rings * Math.PI))
      positions.push(x, vertical, z)
      uvs.push(x * 1.41 + Math.cos(angle) * .13, vertical * 1.22 + z * .21)
      const earthLine = Math.sin(x * 18 + y * 17) * Math.sin(y * 21 - z * 7)
      shade.copy(earth).lerp(moss, Math.max(0, (.31 + .54 * y / top) * earthLine) * .42)
        .multiplyScalar(.75 + random() * .44 + earthLine * .14).toArray(colors, colors.length)
      layers.push(1)
      if (row && n) {
        const here = row * (sides + 1) + n
        const back = here - sides - 1
        indices.push(here, back, here - 1, here - 1, back, back - 1)
      }
    }
  }
  return textureGeometry(positions, uvs, colors, layers, indices)
}

export function fallenTimber(variant = 0) {
  const type = ((variant % fallenTimbers.length) + fallenTimbers.length) % fallenTimbers.length
  if (cache.has(type)) return cache.get(type)
  const palette = fallenTimbers[type]
  const collisionSeed = seededRandom(71282 + type * 3779)
  // The Phase 03B swept envelopes still drive collision. Keep the original
  // sample sequence so neither timing nor route clearance changes.
  const volumes = palette.mass.map((mass, index) => {
    const part = sculptedEarth(mass, palette, collisionSeed, index === 0 ? 2 : 1)
    const position = part.attributes.position
    const volume = hazardHull('soil and roots',
      Array.from({ length: position.count }, (_, i) => new T.Vector3().fromBufferAttribute(position, i)))
    part.dispose()
    return volume
  })
  for (let n = 0; n < 7; n++) for (let k = 0; k < 5; k++) collisionSeed()
  const trunk = curvedWood(palette.trunk, palette.bark, palette.wood, collisionSeed, true, false, volumes)
  const random = seededRandom(84082 + type * 59)
  const parts = [rootPlate(palette, random, type), trunk]
  // Forks start in the trunk shoulder and push through dirt in irregular
  // bundles. The ends are narrow, broken and partially buried.
  const flank = [[-.88,.16,.23],[-.81,1.29,.24],[-.57,1.88,.15],[-.15,2.04,.11],
    [.23,1.58,.29],[.34,.74,.37],[-.16,.12,.32],[-.53,.27,-.24]]
  for (const [index, tip] of flank.entries()) {
    const x = tip[0] + (random() - .5) * .12
    const y = tip[1] - type * .053 + random() * .09
    const depth = tip[2]
    const back = index === 7 ? -1 : 1
    const stem = [[-.21,.77,.08,.12 + (index % 3) * .036],
      [-.22 + (x + .22) * .33,.81+(y-.81)*.34,depth * .85,.086],
      [x + (index % 2 ? -.12 : .14), y * .86 + .09, depth + .015 * back,.049],
      [x,y,depth,.023 + random() * .018]]
    parts.push(curvedWood(stem, palette.bark, palette.wood, random, false))
    if (index % 2 === 0) {
      const [sx, sy, sz] = stem[2]
      parts.push(curvedWood([[sx,sy,sz,.037],[sx+.094,sy-.10,sz+.018,.027],
        [sx+.17,Math.max(.02,sy-.21),sz * .91,.012]], 0x79654c, palette.wood, random, false, false, undefined, true))
    }
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
