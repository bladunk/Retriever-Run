import * as T from 'three'
import { seededRandom } from './trail.js'

export const forestProfiles = {
  gulf: ['cypress', 'tupelo'], cypress: ['cypress', 'cypress'], flyway: ['cottonwood', 'oak'],
  timber: ['oak', 'snag'], farm: ['maple', 'oak'], prairie: ['cottonwood', 'aspen'],
  dakota: ['aspen', 'birch'], border: ['birch', 'spruce'], boreal: ['spruce', 'fir'],
  mountain: ['fir', 'snowPine'],
}

const shapes = {
  cypress: [.25, .29, .89, 0x69614b, [0x647549, 0x717845, 0x82804a]],
  tupelo: [.30, .20, .90, 0x615347, [0x587044, 0x71794a, 0x8b8149]],
  cottonwood: [.37, .21, .87, 0x696452, [0x8a8c50, 0xa49850, 0xb59a50]],
  oak: [.43, .40, .86, 0x66513f, [0x976843, 0xaf7444, 0x786f45]],
  maple: [.31, .37, .90, 0x6a5848, [0xa96a46, 0xbc8245, 0x864d35]],
  aspen: [.21, .17, .91, 0x9b9581, [0xc19850, 0xb69b55, 0x918b4d]],
  birch: [.23, .18, .92, 0xc4bc9f, [0xa2a163, 0x92965d, 0xaf9b61]],
  snag: [.25, .27, .79, 0x6e6151, []],
  spruce: [.29, .17, .98, 0x5e5749, [0x496758, 0x587568, 0x425f53]],
  fir: [.24, .23, .97, 0x6c6355, [0x537468, 0x47685b, 0x728481]],
  snowPine: [.28, .21, .98, 0x635d51, [0x718b8c, 0xa3b5b7, 0x59776c]],
}

const cache = new Map()
const conifers = new Set(['spruce', 'fir', 'snowPine'])
const up = new T.Vector3(0, 1, 0)

export function forestSurface() {
  const atlas = new T.TextureLoader().load(new URL('./assets/environment/forest-needles.webp', import.meta.url).href)
  atlas.colorSpace = T.SRGBColorSpace
  atlas.anisotropy = 2
  return new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide, map: atlas, alphaTest: .39 })
}

export function forestModel(kind, compact = false) {
  const [spread, trunkRatio, top, bark, foliage] = shapes[kind]
  const conifer = conifers.has(kind)
  const mobile = conifer && compact
  const cacheKey = mobile ? kind + ':mobile' : kind
  if (cache.has(cacheKey)) return cache.get(cacheKey)
  const random = seededRandom([...kind].reduce((key, char) => key * 31 + char.charCodeAt(0), 917))
  const positions = [], colors = [], indices = [], uv = []
  const color = new T.Color()
  const rotate = new T.Quaternion()
  const stem = new T.Vector3(), point = new T.Vector3()

  function vertex(x, y, z, tint, value, u = .022, v = .978) {
    const index = positions.length / 3
    positions.push(x, y, z)
    uv.push(u, v)
    color.setHex(tint).multiplyScalar(value).toArray(colors, colors.length)
    return index
  }

  function wood(a, b, base, tip, tint = bark, sides = 6) {
    stem.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]).normalize()
    rotate.setFromUnitVectors(up, stem)
    const first = positions.length / 3
    for (const [at, radius] of [[a, base], [b, tip]]) {
      for (let n = 0; n < sides; n++) {
        const angle = n * Math.PI * 2 / sides
        point.set(radius * Math.sin(angle), 0, radius * Math.cos(angle)).applyQuaternion(rotate)
        vertex(at[0] + point.x, at[1] + point.y, at[2] + point.z,
          (kind === 'birch' || kind === 'aspen') && n % 5 === 0 ? 0x796e60 : tint, .83 + random() * .27)
      }
    }
    for (let n = 0; n < sides; n++) {
      const i = first + n, next = first + (n + 1) % sides
      indices.push(i, next, i + sides, next, next + sides, i + sides)
    }
  }

  // Irregular foliage sprays fan from the ends of branches, with staggered margins.
  function spray(x, y, z, length, width, angle, rise, tint, points = 8, roll = .25) {
    const uCenter = conifer ? .75 : .247
    const index = vertex(x, y + width * .16, z, tint, 1.05, uCenter, .492)
    const sin = Math.sin(angle), cos = Math.cos(angle)
    for (let n = 0; n < points; n++) {
      const phase = n / points * Math.PI * 2
      const scale = (.77 + random() * .32)
      const u = Math.cos(phase) * length * scale, v = Math.sin(phase) * width * scale
      vertex(x + cos * u - sin * v, y + u * rise + v * roll + (random() - .5) * width * .35,
        z + sin * u + cos * v, tint, .75 + random() * .33,
        uCenter + Math.cos(phase) * .212, .492 + Math.sin(phase) * .212)
      indices.push(index, index + n + 1, index + (n + 1) % points + 1)
    }
  }

  const foot = [0, -.025, 0]
  const crotch = [trunkRatio * .10, .48, -.025]
  const crown = [trunkRatio * .16, .79, -.019]
  const tip = [trunkRatio * .20, top, .006]
  const diameter = kind === 'oak' || kind === 'cypress' ? .044 : kind === 'birch' ? .021 : .033
  const root = [0, .125, 0]
  wood(foot, root, kind === 'cypress' ? diameter * 2.03 : diameter * 1.37, diameter)
  wood(root, crotch, diameter, diameter * .69)
  wood(crotch, crown, diameter * .69, diameter * .41)
  wood(crown, tip, diameter * .41, .005)

  if (kind === 'cypress' || kind === 'oak') {
    for (let n = 0; n < 5; n++) {
      const angle = n * 2.4
      const reach = .069 + random() * .077
      const x = Math.cos(angle) * reach, z = Math.sin(angle) * reach
      wood(root, [x, .006, z], diameter * .37, .008, bark, 5)
      if (kind === 'cypress' && n % 2 === 0) wood([x * 1.14, -.023, z * 1.14],
        [x * 1.14, .025 + random() * .045, z * 1.14], .017, .006, bark, 5)
    }
  }
  const branches = conifer ? (mobile ? 15 : 21) : kind === 'snag' ? 8 : 12
  for (let n = 0; n < branches; n++) {
    const t = n / branches
    const angle = n * 2.39996 + random() * .45
    const x = Math.cos(angle), z = Math.sin(angle)
    const roundCrown = !conifer && !['cypress', 'snag'].includes(kind)
    const y = conifer ? .20 + t * .70 : roundCrown
      ? .52 + Math.sin(n * 1.69) * .14 + random() * .19 : trunkRatio + t * (.89 - trunkRatio)
    const h = conifer ? -.025 + .055 * t : .080 + random() * .089
    const radius = spread * (conifer ? 1 - t * .87 : roundCrown
      ? Math.sqrt(Math.max(.14, 1 - ((y + h - .73) / .36) ** 2)) : .71 + Math.sin(t * Math.PI) * .29) *
      (.71 + random() * .35)
    const fork = [x * radius * .63, y + h * .55, z * radius * .63]
    const twig = [x * radius, y + h, z * radius]
    wood([trunkRatio * .09, y, -.017], fork, .013 * (1 - t) + .004, .007, bark, 5)
    wood(fork, twig, .008, .0022, bark, 4)
    if (!foliage.length) {
      wood(fork, [twig[0] * .87 - z * .055, twig[1] + .067, twig[2] * .87 + x * .055], .006, .0018, bark, 4)
      continue
    }
    const tint = foliage[n % foliage.length]
    const width = (conifer ? .100 : spread * .52) * (1 - (conifer ? t * .68 : t * .30))
    for (let j = 0; j < (conifer ? (mobile ? 3 : 4) : 5); j++) {
      const along = .52 + j * (conifer ? .175 : .111)
      const bend = (j % 2 ? 1 : -1) * width * (.56 + random() * .34)
      const lift = (conifer ? .002 : .017) + j * .018 + random() * .018
      spray(twig[0] * along + z * bend, twig[1] + lift, twig[2] * along - x * bend,
        width * (conifer ? 1.32 : 1.19), width * (.53 + random() * .31), angle + j * 1.05,
        .26 - .14 * j, tint, conifer ? 7 : 9, roundCrown ? (j % 2 ? .87 : -.65) : .25)
      if (kind === 'snowPine' && j === 1 && n % 3 !== 0) {
        spray(twig[0] * along + z * bend, twig[1] + lift + .03, twig[2] * along - x * bend,
          width * 1.10, width * .47, angle + .9, .22, 0xb8cbcc, 7)
      }
    }
    if (kind === 'cypress' && n % 3 === 0) {
      for (let tuft = 0; tuft < 5; tuft++) {
        const mx = twig[0] + (random() - .5) * .1, mz = twig[2] + (random() - .5) * .06
        const a = vertex(mx, twig[1] + .02, mz, 0x939787, .80)
        const b = vertex(mx + .009, twig[1], mz + .008, 0x939787, .91)
        const c = vertex(mx + .026, twig[1] - .10 - random() * .058, mz + .02, 0x7d8877, .72)
        indices.push(a, b, c)
      }
    }
  }

  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  cache.set(cacheKey, geometry)
  return geometry
}
