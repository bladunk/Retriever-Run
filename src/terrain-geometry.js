import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { centerAt, habitatAt, headingAt, seededRandom, segmentLength, trailHeight } from './trail.js'

const box = new T.BoxGeometry()
const stone = new T.IcosahedronGeometry(1, 1)
const canopy = leafCrown()
const oval = new T.SphereGeometry(1, 7, 4)
const twig = new T.CylinderGeometry(.47, 1, 1, 6)
const strip = new T.ConeGeometry(1, 1, 3)
const bankPatch = weatheredBank()
const worldUp = new T.Vector3(0, 1, 0)
const branchVector = new T.Vector3()
const branchRotation = new T.Quaternion()

export const reedCount = 70

export function createReedClump() {
  const random = seededRandom(77913)
  const vertices = []
  const shade = []
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.39996
    const reach = .2 + random() * .45
    const h = .48 + random() * .58
    const x = Math.cos(angle) * reach
    const z = Math.sin(angle) * reach
    const w = .022 + random() * .033
    const dx = Math.sin(angle) * w
    const dz = -Math.cos(angle) * w
    vertices.push(x * .12 - dx, 0, z * .12 - dz, x * .12 + dx, 0, z * .12 + dz,
      x * .42 + dx * .66, .56 * h, z * .42 + dz * .66,
      x * .12 - dx, 0, z * .12 - dz, x * .42 + dx * .66, .56 * h, z * .42 + dz * .66,
      x * .42 - dx * .7, .56 * h, z * .42 - dz * .7,
      x * .42 - dx * .7, .56 * h, z * .42 - dz * .7, x * .42 + dx * .66, .56 * h, z * .42 + dz * .66, x, h, z)
    for (const value of [.48, .51, .77, .48, .77, .75, .75, .77, 1]) shade.push(value, value * .94, value * .83)
  }
  const geom = new T.BufferGeometry()
  geom.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
  geom.setAttribute('color', new T.Float32BufferAttribute(shade, 3))
  geom.computeVertexNormals()
  return geom
}

function leafCrown() {
  const geom = new T.IcosahedronGeometry(1, 1)
  const points = geom.attributes.position
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i)
    const y = points.getY(i)
    const z = points.getZ(i)
    const scatter = .95 + Math.sin(x * 7.4 + y * 4.9 + z * 5.3) * .16 + Math.cos(y * 10.4 - z * 13) * .07
    points.setXYZ(i, x * scatter, y * scatter, z * scatter)
  }
  return geom
}

function weatheredBank() {
  const geom = new T.IcosahedronGeometry(1, 2)
  const position = geom.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const rough = 1 + Math.sin(x * 8 + z * 6) * .10 + Math.cos(z * 12 - x * 7) * .05
    position.setXYZ(i, x * rough, y > 0 ? y * (.75 + Math.sin(z * 6 + x * 12) * .18) : y, z * rough)
  }
  geom.computeVertexNormals()
  return geom
}
const palette = {
  'Cattail Marsh': { soil: 0x908476, bank: 0x6b714f, trees: 0x4c552f, grass: 0x858057, water: true },
  'Flooded Timber': { soil: 0x827666, bank: 0x5a624e, trees: 0x554638, grass: 0x5f6243, water: true },
  'Prairie Potholes': { soil: 0x9a8b71, bank: 0x777854, trees: 0x626440, grass: 0x9b8a56, water: true },
  'Autumn Woodland': { soil: 0x9c826d, bank: 0x6f603d, trees: 0x8b572b, grass: 0x715e3b, water: false },
  'Muddy Creek': { soil: 0x827265, bank: 0x6f6554, trees: 0x695c36, grass: 0x7f6f49, water: true },
}

export function buildTile(index) {
  const start = index * segmentLength
  const habitat = habitatAt(start)
  const colors = palette[habitat]
  const random = seededRandom((index + 77) * 4871)
  const between = (min, max) => min + random() * (max - min)
  const tint = new T.Color()
  const list = []
  const banks = 3.3
  const base = centerAt(start)

  function warp(array) {
    let previousZ
    let offset
    let sin
    let cos
    for (let i = 0; i < array.length; i += 3) {
      const z = array[i + 2]
      if (previousZ !== z) {
        previousZ = z
        const at = start - z
        const heading = headingAt(at)
        offset = centerAt(at) - base
        sin = Math.sin(heading)
        cos = Math.cos(heading)
      }
      const x = array[i]
      const lateral = Math.max(-5.5, Math.min(5.5, x))
      array[i] = offset + lateral * cos + (x - lateral)
      array[i + 2] = z - lateral * sin
    }
  }

  function add(shape, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, conform = false, layer = 0, rotation = null) {
    const geometry = shape.index ? shape.toNonIndexed() : shape.clone()
    geometry.scale(sx, sy, sz)
    geometry.rotateX(rx)
    geometry.rotateY(ry)
    geometry.rotateZ(rz)
    if (rotation) geometry.applyQuaternion(rotation)
    if (conform) {
      const uv = geometry.attributes.uv
      const points = geometry.attributes.position
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (points.getX(i) + x) * .40, (points.getZ(i) + z) * .39)
      geometry.translate(x, y, z)
      warp(geometry.attributes.position.array)
      geometry.computeVertexNormals()
    } else {
      const at = start - z
      const angle = headingAt(at)
      geometry.rotateY(angle)
      geometry.translate(centerAt(at) - base + Math.cos(angle) * x, y, z - Math.sin(angle) * x)
    }
    const count = geometry.attributes.position.count
    const data = new Float32Array(count * 3)
    tint.setHex(color).multiplyScalar(between(.84, 1.13))
    const vertex = geometry.attributes.position
    for (let i = 0; i < data.length; i += 3) {
      tint.toArray(data, i)
      if (shape === canopy) {
        const n = i / 3
        const flake = .77 + .13 * Math.sin(vertex.getX(n) * 9 + vertex.getZ(n) * 6) + .19 * (vertex.getY(n) - y) / sy
        for (let k = 0; k < 3; k++) data[i + k] *= flake
      }
    }
    geometry.setAttribute('color', new T.BufferAttribute(data, 3))
    geometry.setAttribute('fieldLayer', new T.BufferAttribute(new Float32Array(count).fill(layer), 1))
    list.push(geometry)
  }

  function branch(color, x, y, z, tx, ty, tz, thickness) {
    branchVector.set(tx - x, ty - y, tz - z)
    const length = branchVector.length()
    branchRotation.setFromUnitVectors(worldUp, branchVector.multiplyScalar(1 / length))
    add(twig, color, (x + tx) * .5, (y + ty) * .5, (z + tz) * .5,
      thickness, length, thickness * .94, 0, 0, 0, false, 2, branchRotation)
  }

  function trailEdge(distance, x) {
    return 3.23 + .23 * Math.sin(distance * .12 + (x < 0 ? .4 : 2.9)) + .09 * Math.sin(distance * .36 + x * .81)
  }
  function earth(distance, x) {
    const edge = Math.abs(x)
    const floor = trailHeight(distance, x) - .008
    if (edge <= 3.08) return floor
    const s = distance - start
    const current = colors.water ? -1.06 : -.11
    const before = palette[habitatAt(start - 1)].water ? -1.06 : -.11
    const after = palette[habitatAt(start + segmentLength)].water ? -1.06 : -.11
    const basin = current + (before - current) * Math.max(0, 1 - s / 7) * .5
      + (after - current) * Math.max(0, 1 - (segmentLength - s) / 7) * .5
    const shore = .23 * Math.sin(distance * .31 + x * .49) + .17 * Math.sin(distance * .111 - x * .41)
    const width = 2.80 + Math.sin(distance * .081 + (x < 0 ? 1 : 4)) * 1.12
    const u = Math.min(1, Math.max(0, (edge - 3.08) / width))
    return floor + (basin + shore - floor) * u * u * (3 - 2 * u)
  }
  const olive = new T.Color(colors.bank)

  // Longitudinal grid samples the same boundary coordinates on both neighboring tiles.
  const positions = []
  const values = []
  const uvs = []
  const indices = []
  const offsets = [-51, -35, -23, -15, -10, -8, -6, -5.2, -4.3, -3.6, -3.2, -2.45, -1.6, -.8, 0,
    .8, 1.6, 2.45, 3.2, 3.6, 4.3, 5.2, 6, 8, 10, 15, 23, 35, 51]
  for (let row = 0; row <= segmentLength * 2; row++) {
    const z = -row / 2
    for (let col = 0; col < offsets.length; col++) {
      const x = offsets[col]
      const edge = Math.abs(x)
      const distance = start - z
      const y = earth(distance, x)
      const edgeFade = Math.min(1, Math.max(0, (edge - trailEdge(distance, x) + .44) / .88))
      uvs.push(x / 2.5, z / 2.5)
      positions.push(x, y, z)
      const rut = Math.sin(x * 5.5 + Math.sin(distance * .42) * .9) * .032
      const drift = Math.cos(distance * .18 + x * .63) * .058
      tint.setHex(colors.soil).lerp(olive, edgeFade)
      tint.multiplyScalar(.91 + drift + rut).toArray(values, values.length)
      if (row && col) {
        const a = row * offsets.length + col
        indices.push(a, a - 1, a - offsets.length, a - 1, a - offsets.length - 1, a - offsets.length)
      }
    }
  }
  warp(positions)
  const land = new T.BufferGeometry()
  land.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  land.setAttribute('color', new T.Float32BufferAttribute(values, 3))
  land.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2))
  land.setAttribute('fieldLayer', new T.BufferAttribute(new Float32Array(positions.length / 3).fill(1), 1))
  land.setIndex(indices)
  land.computeVertexNormals()
  const landTriangles = land.toNonIndexed()
  list.push(landTriangles)
  land.dispose()

  let water = null
  if (colors.water) {
    const plane = new T.PlaneGeometry(99, segmentLength, 14, 30)
    plane.rotateX(-Math.PI / 2)
    plane.translate(0, -.55, -segmentLength / 2)
    const points = plane.attributes.position
    warp(points.array)
    const data = new Float32Array(points.count * 3)
    for (let i = 0; i < data.length; i += 3) tint.setHex(0xa8bab7).multiplyScalar(between(.93, 1.06)).toArray(data, i)
    plane.setAttribute('color', new T.BufferAttribute(data, 3))
    water = plane
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 29; i++) {
      const x = side * between(3.06, 6.2)
      const z = between(-29.7, -.3)
      const y = earth(start - z, x)
      add(stone, i % 2 ? colors.bank : 0x6d6454, x, y, z, between(.035, .24), between(.018, .19), between(.08, .32))
      if (i % 2 === 0) {
        for (let blade = 0; blade < 4; blade++) {
          add(strip, colors.grass, x + between(-.17, .17), y + .11, z + between(-.18, .18),
            .049, between(.19, .47), .04, .19, between(0, 6), between(-.55, .55))
        }
      }
    }
    for (let i = 0; i < 15; i++) {
      const x = side * between(banks, 20)
      const z = between(-29.6, -.4)
      if (Math.abs(x) > 5.3) {
        add(bankPatch, colors.bank, x, colors.water ? -.66 : -.08, z, between(.65, 3.25), between(.22, .41), between(.9, 3.4), 0, between(0, 4), 0, false, 1)
      }
      if (i < 9 && colors.water) {
        for (let n = 0; n < 3; n++) {
          const offset = between(-.58, .58)
          const h = between(.83, 1.68)
          const ground = earth(start - z, x + offset)
          add(twig, 0x77704a, x + offset, ground + h * .5, z - n * .27, .013, h, .014, .06, 0, offset * .10)
          add(oval, 0x4c3525, x + offset - offset * .045, ground + h - .067, z - n * .27 + h * .03, .046, .156, .047)
        }
      }
    }

    for (let i = 0; i < 9; i++) {
      add(stone, i % 3 ? 0x655345 : 0x9a6638, side * between(.2, 3.03), -.005,
        between(-29.6, -.4), between(.035, .085), .014, between(.043, .10), 0, i)
    }
    const totalTrees = habitat === 'Prairie Potholes' ? 3 : habitat === 'Autumn Woodland' ? 10 : 5 + (side === 1 ? 2 : 0)
    for (let i = 0; i < totalTrees; i++) {
      const x = side * between(6.8, 40)
      const z = between(-29.6, -.4)
      const h = between(2.9, 7.5)
      const ground = earth(start - z, x)
      const willow = i % 4 === 1
      const dead = habitat === 'Flooded Timber' || (colors.water && random() < .20)
      const bark = dead ? 0x5b5348 : 0x594437
      const bend = between(-h * .12, h * .12)
      const rake = between(-h * .17, h * .17)
      if (habitat === 'Flooded Timber' && i % 2 === 0) {
        for (let root = 0; root < 3; root++) {
          const a = i * .74 + root * 2.1
          branch(bark, x, -.36, z, x + Math.cos(a) * .94, ground + .27, z + Math.sin(a) * .95, h * .026)
        }
      }
      branch(bark, x, ground - .045, z, x + bend * .42, h * .53, z + rake * .45, h * .046)
      branch(bark, x + bend * .42, h * .53, z + rake * .45, x + bend, h * .94, z + rake, h * .022)
      const orientation = between(0, Math.PI * 2)
      for (let j = 0; j < (dead ? 6 : 5); j++) {
        const angle = orientation + j * 2.4
        const reach = h * between(.18, .36)
        const baseY = h * (.40 + j * .068)
        const top = baseY + h * between(.22, .38)
        const tipX = x + bend + Math.cos(angle) * reach
        const tipZ = z + rake + Math.sin(angle) * reach
        const midX = x + bend * .69 + (tipX - x) * .53
        const midZ = z + rake * .63 + (tipZ - z) * .53
        branch(bark, x + bend * .53, baseY, z + rake * .52, midX, (baseY + top) * .52, midZ, h * .018)
        branch(bark, midX, (baseY + top) * .52, midZ, tipX, top, tipZ, h * .009)
        if (!dead) {
          const fall = habitat === 'Autumn Woodland' || i % 4 === 0
          const leaves = fall ? [0x82482c, 0x967038, 0x93582f, 0x756236, 0x6a5530][j] : colors.trees
          add(canopy, leaves, tipX, top - (willow ? h * .071 : 0), tipZ, h * (willow ? .30 : .23), h * (willow ? .11 : .19), h * .24, .36, angle, .23)
          add(canopy, leaves, (tipX + midX) * .50, top + h * .093, (tipZ + midZ) * .50,
            h * .178, h * .14, h * .19, -.3, angle, .11)
        }
      }
    }
  }

  // Weathered blinds and floating decoys sit outside the playable lanes.
  if (colors.water && index % 7 === 0) {
    const side = index % 14 === 0 ? 1 : -1
    const x = side * 7.1
    const z = -13.5
    add(stone, colors.bank, x, -.52, z, 3.2, .6, 2.8)
    for (const dx of [-1.06, 1.06]) {
      for (const dz of [-.64, .64]) add(box, 0x514330, x + dx, .36, z + dz, .16, 1.65, .17, 0, 0, 0, false, 2)
    }
    for (let i = 0; i < 7; i++) {
      add(box, i % 2 ? 0x695743 : 0x554a38, x + (i - 3) * .33, .53, z + .70, .31, .97, .08, 0, 0, 0, false, 2)
    }
    add(box, 0x655b3d, x, 1.58, z, 2.6, .17, 1.69, .13, 0, 0, false, 2)
    add(box, 0x362f24, x, 1.15, z + .66, 2.15, .34, .10)
    for (let i = 0; i < 21; i++) {
      add(strip, colors.grass, x + between(-1.25, 1.25), 1.58, z + between(-.84, .82), .15, .53, .13, .38, i, -.38)
    }
    for (let stalk = 0; stalk < 32; stalk++) {
      const sx = x + between(-1.60, 1.66)
      const sz = z + between(-1.01, 1.13)
      add(strip, stalk % 2 ? 0x7d7856 : 0x5e6547, sx, .24 + between(0, .42), sz,
        between(.071, .14), between(.64, 1.39), .072, .13, stalk, between(-.48, .42))
    }
    for (let i = 0; i < 8; i++) {
      const d = x + side * between(1.0, 5.7)
      const waterZ = z + between(-12, -3.8)
      if (earth(start - waterZ, d) > -.60) continue
      const angle = between(-2.6, 2.6)
      const nx = Math.sin(angle)
      const nz = Math.cos(angle)
      const drake = i % 3 !== 0
      add(oval, drake ? 0x6b6c61 : 0x514939, d, -.511, waterZ, .162, .075, .270, 0, angle)
      add(oval, 0x5b5247, d + nx * .108, -.468, waterZ + nz * .108, .122, .081, .105, 0, angle)
      add(oval, drake ? 0x304535 : 0x5e5140, d + nx * .153, -.409, waterZ + nz * .153, .073, .082, .085, 0, angle)
      if (drake) add(oval, 0xa39b83, d + nx * .139, -.451, waterZ + nz * .139, .065, .017, .058, 0, angle)
      add(oval, 0x9d8654, d + nx * .226, -.421, waterZ + nz * .226, .046, .020, .067, 0, angle)
    }
  }

  if (habitat === 'Prairie Potholes' && index % 3 !== 1) {
    const side = index % 2 ? 1 : -1
    const x = side * between(7, 8.6)
    add(bankPatch, 0x665840, x, -.61, -11.2, 3.5, .41, 8.1, 0, .1, 0, false, 1)
    for (let i = 0; i < 45; i++) {
      const px = x + between(-2.6, 2.6)
      const z = -11.2 + between(-5.2, 5.2)
      const h = between(.19, .43)
      add(twig, i % 3 ? 0x927b45 : 0x6e5d42, px, -.44 + h * .5, z, .020, h, .023, .03, i, between(-.20, .23))
      if (i % 3 === 0) add(strip, 0x907949, px + .092, -.42 + h * .42, z, .031, .25, .015, .23, i, -.90)
    }
  }

  const merged = mergeGeometries(list)
  for (const geometry of list) geometry.dispose()
  const reeds = new Float32Array(reedCount * 6)
  const bankBias = random() < .5 ? -1 : 1
  for (let i = 0; i < reedCount; i++) {
    const side = random() < .67 ? bankBias : -bankBias
    const at = start + between(.42, segmentLength - .42)
    const x = side * (3.30 + random() ** 2 * 4.5)
    const heading = headingAt(at)
    const n = i * 6
    reeds[n] = centerAt(at) - base + Math.cos(heading) * x
    reeds[n + 1] = earth(at, x) - .022
    reeds[n + 2] = start - at - Math.sin(heading) * x
    tint.setHex(colors.grass).multiplyScalar(between(.72, 1.12)).toArray(reeds, n + 3)
  }
  return { index, ground: pack(merged), water: water ? pack(water) : null, reeds }
}

function pack(geometry) {
  const buffers = {}
  for (const [name, attr] of Object.entries(geometry.attributes)) {
    const count = attr.array.length
    let values = attr.array
    let normalized = false
    if (name === 'normal') {
      normalized = true
      values = new Int16Array(count)
      for (let i = 0; i < count; i++) values[i] = Math.round(attr.array[i] * 32767)
    } else if (name === 'color') {
      normalized = true
      values = new Uint8Array(count)
      for (let i = 0; i < count; i++) values[i] = Math.round(Math.min(1, attr.array[i]) * 255)
    } else if (name === 'fieldLayer') {
      values = new Uint8Array(attr.array)
    }
    buffers[name] = { values, itemSize: attr.itemSize, normalized }
  }
  const packet = { buffers, index: geometry.index?.array ?? null }
  geometry.dispose()
  return packet
}
