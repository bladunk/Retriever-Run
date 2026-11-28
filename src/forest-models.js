import { landscapeProfiles } from './migration-landscapes.js'
import * as T from 'three'
import { seededRandom } from './trail.js'

export const forestProfiles = Object.fromEntries(landscapeProfiles.map(region => [region.key, region.species]))

const northernStands = {
  timber: [['bottomlandOak','willowOak'],['willowOak','bottomlandOak'],['bottomlandOak','tupelo']],
  parklands: [['aspen','birch'],['aspen','aspen'],['birch','aspen'],['aspen','snag']],
  boreal: [['blackSpruce','jackPine'],['fir','blackSpruce'],['blackSpruce','snag'],['spruce','blackSpruce'],['jackPine','tamarack']],
  foothills: [['jackPine','fir'],['fir','aspen'],['spruce','fir'],['jackPine','snag'],['fir','spruce']],
  mountain: [['fir', 'snowPine'], ['snowPine', 'spruce'], ['snowPine', 'snag'], ['fir', 'snowPine'], ['spruce', 'jackPine']],
}

export function forestProfileAt(territory, tile) {
  const stands = northernStands[territory]
  return stands?.[Math.abs(tile) % stands.length] ?? forestProfiles[territory]
}

const shapes = {
  willow: [.38, .28, .86, 0x645e4b, [0x788755, 0x6a8050, 0x929b5a]],
  cypress: [.25, .29, .89, 0x69614b, [0x647549, 0x717845, 0x82804a]],
  tupelo: [.30, .20, .90, 0x615347, [0x587044, 0x71794a, 0x8b8149]],
  cottonwood: [.37, .21, .87, 0x696452, [0x8a8c50, 0xa49850, 0xb59a50]],
  bottomlandOak: [.46, .44, .91, 0x514535, [0x84915b, 0x6e8050, 0x9c9259]],
  willowOak: [.39, .37, .96, 0x625440, [0x8d9454, 0xa39253, 0x728352]],
  oak: [.43, .40, .86, 0x66513f, [0x976843, 0xaf7444, 0x786f45]],
  maple: [.31, .37, .90, 0x6a5848, [0xa96a46, 0xbc8245, 0x864d35]],
  aspen: [.23, .27, .96, 0xc8c3a7, [0xc19850, 0xb69b55, 0x918b4d]],
  birch: [.23, .18, .92, 0xc4bc9f, [0xa2a163, 0x92965d, 0xaf9b61]],
  snag: [.25, .27, .79, 0x6e6151, []],
  spruce: [.29, .17, .98, 0x5e5749, [0x496758, 0x587568, 0x425f53]],
  blackSpruce: [.209, .25, .995, 0x615a4c, [0x3e5d4c,0x526956,0x637668]],
  fir: [.24, .23, .97, 0x6c6355, [0x537468, 0x47685b, 0x728481]],
  jackPine: [.30, .34, .99, 0x7c6f5d, [0x546b52, 0x637b54, 0x546451]],
  tamarack: [.25, .20, .95, 0x756955, [0x9d9253, 0xadb16a, 0x77834d]],
  snowPine: [.28, .21, .98, 0x635d51, [0x718b8c, 0xa3b5b7, 0x59776c]],
}

const cache = new Map()
const residents = new Map()
const conifers = new Set(['spruce', 'blackSpruce', 'fir', 'jackPine', 'snowPine', 'tamarack'])
const up = new T.Vector3(0, 1, 0)

export function assignForestGeometry(mesh, geometry) {
  const previous = mesh.geometry
  if (previous === geometry) return
  const remaining = residents.get(previous)
  mesh.geometry = geometry
  residents.set(geometry, (residents.get(geometry) ?? 0) + 1)
  if (remaining === 1) {
    residents.delete(previous)
    // Keep the CPU template for replay. Three can upload it again if a later
    // territory requests the same form.
    previous.dispose()
  } else if (remaining > 1) residents.set(previous, remaining - 1)
}

export function forestSurface() {
  const atlas = new T.TextureLoader().load(new URL('./assets/environment/forest-needles.webp', import.meta.url).href)
  atlas.colorSpace = T.SRGBColorSpace
  atlas.anisotropy = 2
  return new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide, map: atlas, alphaTest: .32,
    transparent: false, depthWrite: true })
}

export function forestModel(kind, compact = false, form = 0) {
  const [baseSpread, trunkRatio, top, bark, foliage] = shapes[kind]
  const spread = baseSpread * (form ? 1.12 : .97)
  const conifer = conifers.has(kind)
  const mobile = compact
  const cacheKey = kind + ':' + Number(mobile) + ':' + form
  if (cache.has(cacheKey)) return cache.get(cacheKey)
  const random = seededRandom([...kind].reduce((key, char) => key * 31 + char.charCodeAt(0), 917 + form * 671))
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
          (kind === 'birch' || kind === 'aspen') && n % 5 === 0 ? 0x796e60 : tint,
          conifer ? .71 + .29 * ((n * 5) % sides) / sides + random() * .17 : .83 + random() * .27)
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

  // A closed, irregular crown cluster at the tip of a woody branch. Leaf
  // volume samples its baked pigment, while the shared atlas still supplies
  // the bark and the fine sprays on conifers.
  function crownCluster(x, y, z, length, width, height, angle, tint) {
    const sides = mobile ? 5 : 7
    const first = positions.length / 3
    const sin = Math.sin(angle), cos = Math.cos(angle)
    for (let ring = 0; ring < 2; ring++) for (let n = 0; n < sides; n++) {
      const phase = (n + ring*.20) * Math.PI*2/sides
      const contour = .76 + random()*.44
      const u = Math.cos(phase)*length*contour*(ring ? .82 : 1)
      const v = Math.sin(phase)*width*contour
      vertex(x+cos*u-sin*v, y+height*((ring ? .47 : -.30)+(random()-.5)*.27), z+sin*u+cos*v,
        tint, (ring ? .96 : .73)+random()*.31, -.12, .5)
    }
    const sole = vertex(x+length*.12,y-height*.78,z,tint,.75,-.12,.5)
    const top = vertex(x-length*.15,y+height*.85,z,tint,1.08,-.12,.5)
    for (let n = 0; n < sides; n++) {
      const a = first+n, b = first+(n+1)%sides
      indices.push(a,a+sides,b, b,a+sides,b+sides, sole,a,b, top,b+sides,a+sides)
    }
  }

  const foot = [0, -.025, 0]
  const crotch = [trunkRatio * (form ? .22 : .10), .48, -.025]
  const crown = [trunkRatio * .16, .79, -.019]
  const tip = [trunkRatio * .20, top, .006]
  const oak = ['oak','bottomlandOak','willowOak'].includes(kind)
  const pale = kind === 'birch' || kind === 'aspen'
  const diameter = kind === 'bottomlandOak' ? .061 : oak || kind === 'cypress' ? .044 : pale ? .021 : .033
  const root = [0, .125, 0]
  wood(foot, root, kind === 'cypress' ? diameter * 2.49 : kind === 'tupelo' ? diameter * 1.92 : diameter * 1.37, diameter)
  wood(root, crotch, diameter, diameter * .69)
  wood(crotch, crown, diameter * .69, diameter * .41)
  wood(crown, tip, diameter * .41, .005)

  if (kind === 'cypress' || oak || kind === 'tupelo') {
    for (let n = 0; n < 5; n++) {
      const angle = n * 2.4
      const reach = .069 + random() * (kind === 'cypress' ? .131 : .077)
      const x = Math.cos(angle) * reach, z = Math.sin(angle) * reach
      wood(root, [x, .006, z], diameter * .37, .008, bark, 5)
      if (kind === 'cypress' && n % 2 === 0) wood([x * 1.14, -.023, z * 1.14],
        [x * 1.14, .025 + random() * .045, z * 1.14], .017, .006, bark, 5)
    }
  }
  const stemLine = [root,crotch,crown,tip]
  function branchBase(y) {
    const upper = stemLine.findIndex(at => at[1]>=y)
    if (upper < 1) return upper < 0 ? tip : [0,y,0]
    const a=stemLine[upper-1], b=stemLine[upper]
    const t=(y-a[1])/(b[1]-a[1])
    return [a[0]+(b[0]-a[0])*t,y,a[2]+(b[2]-a[2])*t]
  }
  const branches = conifer ? (mobile ? 15 : 21) : kind === 'snag' ? 8 : mobile ? 10 : 12
  for (let n = 0; n < branches; n++) {
    const t = n / branches
    const angle = n * 2.39996 + random() * (conifer ? .63 : .45)
    const x = Math.cos(angle), z = Math.sin(angle)
    const willow = kind === 'willow'
    const roundCrown = !conifer && !['cypress', 'snag'].includes(kind)
    const y = conifer ? trunkRatio + t * (.935 - trunkRatio) + Math.sin(n * 2.7) * .025 : roundCrown
      ? (oak ? .49 : kind === 'willow' ? .38 : .54) + t*.29 + Math.sin(n*1.69)*.08
      : trunkRatio + t * (.89 - trunkRatio)
    const h = willow ? .045 - t * .082 : conifer ? (kind === 'blackSpruce' ? -.084 : kind === 'spruce' ? -.063 : kind === 'jackPine' ? .018 : -.029) * (1 - t)
      + .067 * t : .080 + random() * .089
    const radius = spread * (conifer ? (1 - t) ** (kind === 'fir' ? 1.05 : .78) + .10 : roundCrown
      ? Math.sqrt(Math.max(.14, 1 - ((y + h - .73) / .36) ** 2)) : .71 + Math.sin(t * Math.PI) * .29) *
      (.71 + random() * .35)
    const fork = [x * radius * .63, y + h * .55 - (conifer ? .019 * (1 - t) : 0), z * radius * .63]
    const twig = [x * radius, y + h, z * radius]
    wood(branchBase(y),fork,(oak ? .027 : .014)*(1-t)+.004,oak ? .009 : .006,bark,5)
    wood(fork, twig, .008, .0022, bark, 4)
    if (!foliage.length) {
      wood(fork, [twig[0] * .87 - z * .055, twig[1] + .067, twig[2] * .87 + x * .055], .006, .0018, bark, 4)
      continue
    }
    const tint = foliage[n % foliage.length]
    const width = conifer ? radius * .47 + .025 : spread * .52 * (1 - t * .30)
    if (roundCrown) {
      // Interleaved sprigs trace real forks. Their ragged cutout edges and
      // differing planes supply the canopy shape at running-camera height.
      const clusters = mobile ? 3 : 4
      for (let j = 0; j < clusters; j++) {
        const along = .52 + j * .18
        const offset = (j % 2 ? 1 : -1)*width*(.24 + random()*.52)
        const end = [twig[0]*along+z*offset, y+h*(.69+j*.18)+(willow ? -.032*j : .026*j), twig[2]*along-x*offset]
        wood(fork,end,(oak ? .0068 : .0048),.0017,bark,4)
        const w=width*(.78+random()*.35)
        const leaf=foliage[(n+j)%foliage.length]
        const yaw=angle+(j%2 ? .70 : -.57)
        spray(...end,w*1.41,w*.91,yaw,willow ? -.57 : .30,leaf,8,j%2 ? .65 : -.48)
        spray(end[0],end[1]-.012,end[2],w*1.14,w*.84,yaw+1.2,j%2 ? .86 : -.74,
          foliage[(n+j+1)%foliage.length],7,j%2 ? -.40 : .58)
      }
      continue
    }
    if (conifer) {
      // Overlapping inner boughs sheath the leader. Outer sprays break up the
      // outline and hang differently on spruce, fir and the higher-crowned pine.
      spray(x * radius * .31, y + h * .33 + .019, z * radius * .31, width * 1.02, width * .71,
        angle + .46, .43, foliage[(n + 1) % foliage.length], 7, -.28)
      if (n % 3 === 0) crownCluster(fork[0],fork[1]+.009,fork[2],width*.83,width*.56,width*.28,
        angle,foliage[(n+1)%foliage.length])
    }
    for (let j = 0; j < (mobile ? 4 : 5); j++) {
      const along = .52 + j * (conifer ? .175 : .111)
      const bend = (j % 2 ? 1 : -1) * width * (conifer ? .46 + random() * .31 : .56 + random() * .34)
      const lift = willow ? -.021 * j : conifer ? -.015 + j * .016 + random() * .021 : .017 + j * .018 + random() * .018
      const stem = conifer ? Math.min(1.02, along) : along
      spray(twig[0] * stem + z * bend, twig[1] + lift, twig[2] * stem - x * bend,
        width * (conifer ? 1.43 : 1.19), width * (.53 + random() * .31), angle + (conifer ? (j % 2 ? .8 : -.5) + j * .16 : j * 1.05),
        conifer ? .23 - .105 * j : .26 - .14 * j, tint, conifer ? 6 : mobile ? 7 : 9,
        conifer ? (j % 2 ? .56 : -.46) : roundCrown ? (j % 2 ? .87 : -.65) : .25)
      if ((kind === 'snowPine' || kind === 'fir' && t > .62) && j === 1 && n % 3 !== 0) {
        spray(twig[0] * along + z * bend, twig[1] + lift + .03, twig[2] * along - x * bend,
          width * 1.10, width * .47, angle + .9, .22, kind === 'snowPine' ? 0xc3d0cb : 0x9cae9c, 7)
      }
    }
    if (kind === 'cypress' && n % 3 === 0) {
      for (let tuft = 0; tuft < 5; tuft++) {
        const mx = twig[0] + (random() - .5) * .1, mz = twig[2] + (random() - .5) * .06
        const a = vertex(mx, twig[1] + .02, mz, 0x939787, .80)
        const b = vertex(mx + .009, twig[1], mz + .008, 0x939787, .91)
        const c = vertex(mx + .026, twig[1] - .14 - random() * .077, mz + .02, 0x7d8877, .72)
        indices.push(a, b, c)
      }
    }
  }

  const geometry = new T.BufferGeometry()
  geometry.name = kind + (compact ? ' / compact' : ' / detailed')
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  cache.set(cacheKey, geometry)
  return geometry
}
