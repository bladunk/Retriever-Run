import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { createLeafSpray } from './marsh-plants.js'
import { expeditionBlend, regionAt, snowLevel } from './expedition.js'
import { dressNorthernBank } from './expedition-props.js'
import { centerAt, headingAt, seededRandom, segmentLength, trailHeight } from './trail.js'

const box = new T.BoxGeometry()
const stone = new T.IcosahedronGeometry(1, 0)
const canopy = leafCrown()
const sprays = [createLeafSpray(false), createLeafSpray(true)]
const oval = new T.SphereGeometry(1, 7, 4)
const twig = new T.CylinderGeometry(.47, 1, 1, 5, 1, true)
const strip = new T.ConeGeometry(1, 1, 3)
const bankPatch = weatheredBank()
const worldUp = new T.Vector3(0, 1, 0)
const branchVector = new T.Vector3()
const branchRotation = new T.Quaternion()

export const reedCount = 70
export const treeCount = 20

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
  const geom = new T.IcosahedronGeometry(1, 1)
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
const needles = spruceWhorl()
const snowTint = new T.Color(0xe7e5d7)
const otherTint = new T.Color()
const waterline = -.55

function spruceWhorl() {
  const xyz = [], uv = [], indices = []
  const tips = 18
  for (let row = 0; row < 3; row++) {
    for (let n = 0; n < tips; n++) {
      const angle = n * Math.PI * 2 / tips
      const pointed = n % 2 === 0
      const radius = row === 0 ? .16 : row === 1 ? (pointed ? 1 : .58) : .42
      const y = row === 0 ? .80 : row === 1 ? -.11 + Math.sin(angle * 3) * .13 : -.28
      xyz.push(Math.cos(angle) * radius, y + (pointed ? -.08 : .03), Math.sin(angle) * radius)
      uv.push(.5 + Math.cos(angle) * radius * .5, .5 + Math.sin(angle) * radius * .5)
      if (row > 0) {
        const next = (n + 1) % tips
        const a = (row - 1) * tips, b = row * tips
        indices.push(a + n, a + next, b + n, a + next, b + next, b + n)
      }
    }
  }
  const mesh = new T.BufferGeometry()
  mesh.setAttribute('position', new T.Float32BufferAttribute(xyz, 3))
  mesh.setAttribute('uv', new T.Float32BufferAttribute(uv, 2))
  mesh.setIndex(indices)
  mesh.computeVertexNormals()
  return mesh
}

function shoreHeight(region, distance, x) {
  const edge = Math.abs(x)
  const cross = x < 0 ? 1 : 4
  const ripple = .13 * Math.sin(distance * .29 + x * .53) + .12 * Math.sin(distance * .11 - x * .51)
  const wet = region.water + ripple
  const width = 2.43 + Math.sin(distance * .061 + cross) * .88
  if (region.key === 'timber') return [wet, width]
  const bank = Math.sin(distance * .076 + cross + x * .098)
  if (region.key === 'prairie') {
    const pothole = Math.cos(distance * .048 + cross) * .57 + Math.sin(edge * .29 + distance * .046) * .53
    const blindTile = Math.round((distance - 14) / 150)
    const pondSide = blindTile * 5 % 14 === 0 ? 1 : -1
    const pond = Math.max(0, 1 - Math.hypot((x - pondSide * 12) / 8, (distance - blindTile * 150 - 16) / 20))
    const basin = region.water + .82 * pothole + ripple - .78 * pond
    const ridge = Math.max(0, (edge - 16) / 35) * (1.56 + .53 * Math.sin(distance * .043 + cross))
    return [basin + ridge, width + .44 + .43 * bank]
  }
  const bar = .58 * Math.sin(edge * .43 - .65 + bank * .88)
  const upland = Math.min(1, Math.max(0, (edge - 12) / 30))
  return [wet + bar * .72 + upland * (region.key === 'river' ? 1.55 : .88), width + .31 * bank]
}

export function buildTile(index) {
  const start = index * segmentLength
  const colors = regionAt(start + segmentLength * .5)
  const { key } = colors
  const north = key === 'river' || key === 'snow'
  const winter = key === 'snow'
  const random = seededRandom((index + 77) * 4871)
  const between = (min, max) => min + random() * (max - min)
  const tint = new T.Color()
  const list = []
  const trees = []
  const plantType = key === 'timber' ? 0 : key === 'river' ? 1 : 2
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
    const geometry = shape.clone()
    if (!geometry.index) geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (_, i) => i))
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
      if (shape === canopy || sprays.includes(shape)) {
        const n = i / 3
        const flake = .88 + .17 * Math.sin(vertex.getX(n) * 6.1 + vertex.getZ(n) * 8.7)
          + .14 * (vertex.getY(n) - y) / sy
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
  function earth(distance, x, zone = expeditionBlend(distance)) {
    const edge = Math.abs(x)
    const floor = trailHeight(distance, x) - .008
    if (edge <= 3.08) return floor
    const [from, fromWidth] = shoreHeight(zone.from, distance, x)
    const [to, toWidth] = shoreHeight(zone.to, distance, x)
    const basin = T.MathUtils.lerp(from, to, zone.blend)
    const width = T.MathUtils.lerp(fromWidth, toWidth, zone.blend)
    const amount = T.MathUtils.smoothstep(edge, 3.08, 3.08 + width)
    return floor + (basin - floor) * amount
  }
  const soil = new T.Color()
  const olive = new T.Color()
  const vegetationTint = new T.Color(colors.grass)

  // Longitudinal grid samples the same boundary coordinates on both neighboring tiles.
  const positions = []
  const values = []
  const uvs = []
  const indices = []
  const offsets = [-51, -35, -23, -15, -10, -8, -6, -5.2, -4.3, -3.6, -3.2, -2.45, -1.6, -.8, 0,
    .8, 1.6, 2.45, 3.2, 3.6, 4.3, 5.2, 6, 8, 10, 15, 23, 35, 51]
  for (let row = 0; row <= segmentLength * 2; row++) {
    const z = -row / 2
    const distance = start - z
    const zone = expeditionBlend(distance)
    const snow = snowLevel(zone)
    soil.setHex(zone.from.soil).lerp(otherTint.setHex(zone.to.soil), zone.blend)
    olive.setHex(zone.from.bank).lerp(otherTint.setHex(zone.to.bank), zone.blend)
    for (let col = 0; col < offsets.length; col++) {
      const x = offsets[col]
      const edge = Math.abs(x)
      const y = earth(distance, x, zone)
      const edgeFade = Math.min(1, Math.max(0, (edge - trailEdge(distance, x) + .44) / .88))
      uvs.push(x / 2.5, -distance / 2.5)
      positions.push(x, y, z)
      const rut = Math.sin(x * 5.5 + Math.sin(distance * .42) * .9) * .032
      const drift = Math.cos(distance * .18 + x * .63) * .058
      tint.copy(soil).lerp(olive, edgeFade)
      const drifts = .5 + .5 * Math.sin(distance * .34 + x * 1.9)
      tint.lerp(snowTint, snow * (.12 + .68 * edgeFade + .17 * drifts))
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

  let water = null
  if (colors.water) {
    const plane = new T.PlaneGeometry(99, segmentLength, 28, 30)
    plane.rotateX(-Math.PI / 2)
    plane.translate(0, -.55, -segmentLength / 2)
    const points = plane.attributes.position
    const depth = new Float32Array(points.count)
    for (let i = 0; i < depth.length; i++) {
      const x = offsets[i % offsets.length]
      points.setX(i, x)
      depth[i] = Math.max(0, -.55 - earth(start - points.getZ(i), x))
    }
    warp(points.array)
    plane.setAttribute('marshDepth', new T.BufferAttribute(depth, 1))
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
    for (let i = 0; i < 10; i++) {
      const x = side * between(4.4, 12)
      const z = between(-29.6, -.4)
      const y = earth(start - z, x)
      if (i < 5) {
        add(bankPatch, colors.bank, x, y - .06, z, between(.42, 1.62), between(.19, .33),
          between(.67, 1.5), 0, between(0, 4), 0, false, 1)
      } else {
        const width = between(.23, .68)
        branch(i % 2 ? 0x7b6550 : 0x63573f, x, y + .02, z, x + side * width, y + .12, z - width, .043)
        if (i % 3 === 0) branch(0x6b5d43, x + side * .19, y + .07, z - .20, x + side * width,
          y + .29, z - width * .36, .027)
      }
    }

    for (let i = 0; i < 9; i++) {
      add(stone, i % 3 ? 0x655345 : 0x9a6638, side * between(.2, 3.03), -.005,
        between(-29.6, -.4), between(.035, .085), .014, between(.043, .10), 0, i)
    }
    const totalTrees = key === 'prairie' ? 2 : north ? 7 : 6 + (side === 1 ? 2 : 0)
    for (let i = 0; i < totalTrees; i++) {
      const z = between(-29.1, -.8)
      const willow = !north && key === 'timber' && i % 4 === 1
      const dead = key === 'timber' && i > 0 && (i % 3 === 0 || random() < .13)
      // Interleave closer landmark trees with an offset, broken treeline.
      const x = side * (i === 0 ? between(7, 9.9) : between(10 + i * .57, 38))
      const h = key === 'prairie' ? between(1.9, 4.3) : willow ? between(3.9, 6.9)
        : dead ? between(4.3, 10.2) : between(4.4, 9.4)
      const ground = earth(start - z, x)
      const bark = dead ? 0x6b6254 : willow ? 0x655a46 : 0x76533d
      const at = start - z
      const heading = headingAt(at)
      {
        trees.push(centerAt(at) - base + Math.cos(heading) * x, ground, z - Math.sin(heading) * x, h,
          i * 2.4 + side, i % 3)
      }
      if (north) {
        branch(0x5d4f43, x, ground, z, x + .14, ground + h, z - .16, h * .030)
        for (let whorl = 0; whorl < 6; whorl++) {
          const t = whorl / 6
          const bough = h * (.238 - t * .205) * between(.86, 1.10)
          const level = ground + h * (.24 + t * .70)
          const tint = winter ? (whorl % 3 ? 0x91b1b4 : 0xbacfd5) : (whorl % 3 ? 0x375449 : 0x58756a)
          add(needles, tint, x + .1 * t, level, z, bough, h * .18, bough * .88,
            .09 - t * .08, i * 1.3 + whorl * .92, -.08)
          if (winter && whorl < 5) {
            add(needles, whorl % 3 ? 0x4b6865 : 0x597676, x + .07, level - h * .068, z,
              bough * .91, h * .142, bough * .83, .08, i * 1.3 + whorl * .92)
          }
        }
        continue
      }
      const bend = between(-h * .16, h * .16)
      const rake = between(-h * .21, h * .21)
      if (i % 2 === 0) {
        for (let root = 0; root < 3; root++) {
          const a = i * .74 + root * 2.1
          branch(bark, x, ground + .56, z, x + Math.cos(a) * .96, ground + .045, z + Math.sin(a) * .95, h * .023)
        }
      }
      branch(bark, x, ground - .045, z, x + bend * .42, h * .53, z + rake * .45, h * .046)
      branch(bark, x + bend * .42, h * .53, z + rake * .45, x + bend, h * .94, z + rake, h * .022)
      const orientation = between(0, Math.PI * 2)
      for (let j = 0; j < (dead ? 5 : 4); j++) {
        const angle = orientation + j * 2.4
        const reach = h * (willow ? between(.24, .45) : between(.17, .32))
        const baseY = h * (.40 + j * .068)
        const top = baseY + h * between(.22, .38)
        const tipX = x + bend + Math.cos(angle) * reach
        const tipZ = z + rake + Math.sin(angle) * reach
        const midX = x + bend * .69 + (tipX - x) * .53
        const midZ = z + rake * .63 + (tipZ - z) * .53
        branch(bark, x + bend * .53, baseY, z + rake * .52, midX, (baseY + top) * .52, midZ, h * .018)
        branch(bark, midX, (baseY + top) * .52, midZ, tipX, top, tipZ, h * .009)
        if (dead) {
          branch(bark, midX, (baseY + top) * .52, midZ, tipX + Math.cos(angle + 1.2) * h * .12,
            top - .17, tipZ + Math.sin(angle + 1.2) * h * .12, h * .005)
        } else {
          const fall = key === 'timber' && i % 4 !== 2
          const leaves = willow ? [0x929452, 0x737e4b, 0xa88749, 0x7a8148][j]
            : fall ? [0x9a653c, 0xbc8847, 0xa7673d, 0x867e48][j] : colors.trees
          const crown = h * (willow ? .16 : .12)
          add(canopy, leaves, tipX, top, tipZ, crown, crown * (willow ? .38 : .71), crown * .86, .25, angle, .17)
          add(sprays[Number(willow)], leaves, tipX, top + crown * .18, tipZ,
            crown * 1.63, crown * (willow ? 1.42 : 1.04), crown * 1.49, .16, angle, .15)
        }
      }
    }
  }

  // Weathered blinds and floating decoys sit outside the playable lanes.
  if ((key === 'timber' && index % 5 === 0) || (key === 'prairie' && index % 5 === 0)) {
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
    for (let brush = 0; brush < 7; brush++) {
      add(sprays[1], brush % 3 ? 0x776d46 : 0x969071, x + between(-1.17, 1.17), between(.82, 1.58),
        z + between(.58, .83), .54, .44, .23, -.41, brush * 1.9, .23)
    }
    for (let stalk = 0; stalk < 32; stalk++) {
      const sx = x + between(-1.60, 1.66)
      const sz = z + between(-1.01, 1.13)
      add(strip, stalk % 2 ? 0x7d7856 : 0x5e6547, sx, .24 + between(0, .42), sz,
        between(.071, .14), between(.64, 1.39), .072, .13, stalk, between(-.48, .42))
    }
    for (let i = 0; i < (key === 'prairie' ? 13 : 8); i++) {
      const d = x + side * between(1.0, 5.7)
      const waterZ = z + between(-12, -3.8)
      if (earth(start - waterZ, d) > -.60) continue
      const angle = between(-2.6, 2.6)
      const nx = Math.sin(angle)
      const nz = Math.cos(angle)
      const drake = i % 3 !== 0
      const goose = key === 'prairie' && i % 4 === 0
      add(oval, goose ? 0x827c6c : drake ? 0x6b6c61 : 0x514939, d, -.511, waterZ, goose ? .252 : .162, .075, goose ? .36 : .270, 0, angle)
      add(oval, 0x5b5247, d + nx * .108, -.468, waterZ + nz * .108, .122, .081, .105, 0, angle)
      add(oval, drake ? 0x304535 : 0x5e5140, d + nx * .153, -.409, waterZ + nz * .153, .073, .082, .085, 0, angle)
      if (drake) add(oval, 0xa39b83, d + nx * .139, -.451, waterZ + nz * .139, .065, .017, .058, 0, angle)
      add(oval, 0x9d8654, d + nx * .226, -.421, waterZ + nz * .226, .046, .020, .067, 0, angle)
    }
  }

  if (key === 'prairie' && index % 3 !== 1) {
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

  const chimney = dressNorthernBank({ add, region: colors, index, earth: (meters, x) => earth(start + meters, x), waterline, random })
  if (chimney) {
    const at = start - chimney[2]
    const heading = headingAt(at)
    const lateral = chimney[0]
    chimney[0] = centerAt(at) - base + Math.cos(heading) * lateral
    chimney[2] -= Math.sin(heading) * lateral
  }

  const landPoints = land.attributes.position
  const landColors = land.attributes.color
  for (let i = 0; i < landPoints.count; i++) {
    const x = landPoints.getX(i), z = landPoints.getZ(i)
    let shade = 0
    for (let at = 0; at < trees.length; at += 6) {
      const dx = x - trees[at], dz = z - trees[at + 2]
      const length = trees[at + 3] * 1.22
      const along = dx * .58 + dz * .82
      const across = dx * .82 - dz * .58
      const root = Math.max(0, 1 - Math.hypot(dx, dz) / 1.45)
      const canopyShadow = Math.max(0, 1 - Math.abs(along - length * .43) / length) * Math.max(0, 1 - Math.abs(across) / 1.08)
      shade = Math.max(shade, root * .24 + canopyShadow * .15)
    }
    landColors.setXYZ(i, landColors.getX(i) * (1 - shade), landColors.getY(i) * (1 - shade * .87),
      landColors.getZ(i) * (1 - shade * .70))
  }

  const merged = mergeGeometries(list)
  for (const geometry of list) geometry.dispose()
  const reeds = new Float32Array(reedCount * 6)
  const bankBias = random() < .5 ? -1 : 1
  for (let i = 0; i < reedCount; i++) {
    const side = i % 3 === 0 ? -bankBias : bankBias
    const patch = Math.floor(i / 2) * 5.381
    const at = start + .55 + ((patch + between(.06, 1.63)) % (segmentLength - 1.1))
    const shore = .5 + .5 * Math.sin(at * .17 + side)
    const x = side * (3.51 + (i % 4 ? random() ** 1.4 * 1.85 : between(1.8, 5.2)) + shore * .38)
    const heading = headingAt(at)
    const n = i * 6
    reeds[n] = centerAt(at) - base + Math.cos(heading) * x
    reeds[n + 1] = Math.max(earth(at, x) - .045, -.83)
    reeds[n + 2] = start - at - Math.sin(heading) * x
    tint.setHex(0xf4e6c3).lerp(vegetationTint, .28 + random() * .33).toArray(reeds, n + 3)
  }
  return { index, ground: pack(land), detail: pack(merged), water: water ? pack(water) : null, reeds,
    plantType, trees: new Float32Array(trees), treeStyle: winter ? 3 : north ? 2 : key === 'timber' ? 1 : 0, chimney }
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

// Shared distant silhouettes use solid color and a few shaped branches. No alpha
// overdraw or tile-specific buffers are needed for their mesh data.
export function createDistantTree(style) {
  const pieces = []
  function piece(shape, color, x, y, z, sx, sy, sz, lean = 0) {
    const geometry = shape.index ? shape.toNonIndexed() : shape.clone()
    geometry.scale(sx, sy, sz)
    geometry.rotateZ(lean)
    geometry.translate(x, y, z)
    const colors = new Float32Array(geometry.attributes.position.count * 3)
    const tint = new T.Color(color)
    for (let i = 0; i < colors.length; i += 3) tint.toArray(colors, i)
    geometry.setAttribute('color', new T.BufferAttribute(colors, 3))
    pieces.push(geometry)
  }
  if (style >= 2) {
    piece(twig, 0x605647, 0, .42, 0, .029, .87, .029)
    for (let tier = 0; tier < 4; tier++) {
      const w = .23 - tier * .043
      piece(strip, style === 3 ? 0x91a9af : 0x4c756a,
        0, .30 + tier * .17, 0, w, .55, w, .055 * tier)
    }
    const result = mergeGeometries(pieces)
    for (const geometry of pieces) geometry.dispose()
    return result
  }
  const bark = style === 1 ? 0x756254 : 0x5c4b36
  piece(twig, bark, 0, .44, 0, .052, .89, .043, .05)
  piece(twig, bark, .118, .66, .028, .027, .49, .025, -.53)
  piece(twig, bark, -.119, .72, -.041, .025, .47, .026, .47)
  if (style !== 1) {
    piece(stone, 0xb3a17c, -.12, .81, -.04, .22, .16, .21, .21)
    piece(stone, 0xa8936f, .15, .77, .052, .23, .14, .20, -.17)
    piece(stone, 0xc4b791, .015, .93, 0, .20, .15, .17, .09)
  }
  const result = mergeGeometries(pieces)
  for (const geometry of pieces) geometry.dispose()
  return result
}
