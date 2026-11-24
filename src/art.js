import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { contactShadow } from './contact-shadow.js'
import { fieldMaterials } from './materials.js'
import { fallenTimberModel } from './fallen-timber.js'
import { leaningTree } from './leaning-tree.js'
import { trailTimber } from './trail-timber.js'
import { rockMesh } from './rock-art.js'
import { marshWater } from './marsh-water.js'
import { laneWidth, placeOnTrail, trailHeight } from './trail.js'

const sphere = new T.SphereGeometry(1, 12, 8)
const box = new T.BoxGeometry(1, 1, 1)
const cylinder = new T.CylinderGeometry(1, 1, 1, 9)
const cone = new T.ConeGeometry(1, 1, 5)
const leaf = new T.IcosahedronGeometry(1, 0)
const colors = new Map()
const pickupMaterial = new T.MeshLambertMaterial({ vertexColors: true })
const baked = new Map()
const hardwood = new Set([0x514033, 0xb18354, 0xb67c45, 0x8c7b58])
const crossingSurface = streamRibbon()
const soakedGround = new T.CircleGeometry(1, 22).rotateX(-Math.PI / 2)
const wetShapes = [pondSheet(), depthGeometry(crossingSurface.clone(), true)]
const bankMaterial = new T.MeshLambertMaterial({ color: 0x645847 })
const wheel = new T.CylinderGeometry(1, 1, 1, 12).rotateZ(Math.PI / 2)

function hangingLimb(width, radius, depth, lift, phase) {
  const geometry = new T.CylinderGeometry(1, 1, 1, 10, 12)
  const points = geometry.attributes.position
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), z = points.getZ(i)
    const t = points.getY(i) + .5
    const angle = Math.atan2(z, x)
    const taper = .78 + .33 * (1 - t) + .14 * Math.sin(t * 17.1 + angle * 3 + phase)
    const bend = Math.sin(t * 9.7 + phase) * .069 + (t - .5) * lift
    points.setXYZ(i, (t - .5) * width, bend - x * radius * taper,
      z * depth * taper + Math.sin(t * 14 + phase) * .048)
  }
  geometry.computeVertexNormals()
  return geometry
}

function depthGeometry(geometry, ribbon) {
  const uv = geometry.attributes.uv
  const depths = new Float32Array(uv.count)
  for (let n = 0; n < depths.length; n++) {
    const x = uv.getX(n) * 2 - 1, y = uv.getY(n) * 2 - 1
    depths[n] = 1 + Math.max(0, 1 - (ribbon ? Math.abs(y) : Math.hypot(x, y))) * .74
  }
  geometry.setAttribute('marshDepth', new T.BufferAttribute(depths, 1))
  return geometry
}

function pondSheet() {
  const patch = soakedGround.clone()
  const pos = patch.attributes.position
  for (let n = 1; n < pos.count; n++) {
    const angle = Math.atan2(pos.getZ(n), pos.getX(n))
    const irregular = .93 + .11 * Math.cos(angle * 3) + .045 * Math.sin(angle * 5)
    pos.setX(n, pos.getX(n) * irregular)
    pos.setZ(n, pos.getZ(n) * irregular)
  }
  return depthGeometry(patch, false)
}

function fitWaterHazard(object, stream) {
  const bed = new T.Mesh(stream ? crossingSurface : soakedGround, bankMaterial)
  bed.scale.set(stream ? 7.41 : 1.0, 1, stream ? 2.23 : .90)
  bed.position.y = .022
  const mesh = new T.Mesh(wetShapes[Number(stream)], marshWater)
  mesh.scale.set(stream ? 7.24 : .92, 1, stream ? 2.12 : .82)
  mesh.position.y = .060
  object.add(bed, mesh)
  return object
}

export function prepareWashout(object, entity) {
  let surface = object.children[0]
  if (!surface) {
    const ribbon = new T.PlaneGeometry(1, 1, 4, 28)
    ribbon.setAttribute('marshDepth', new T.BufferAttribute(new Float32Array(ribbon.attributes.position.count).fill(1.38), 1))
    object.add(surface = new T.Mesh(ribbon, marshWater))
  }
  const position = surface.geometry.attributes.position
  const lane = entity.lane * laneWidth
  const center = {}, sample = {}
  const yaw = placeOnTrail(center, entity.distance, lane, entity.distance)
  const cos = Math.cos(yaw), sin = Math.sin(yaw)
  const floor = trailHeight(entity.distance, lane)
  for (let row = 0; row <= 28; row++) {
    const at = entity.distance + (.5 - row / 28) * (entity.span + 2.55)
    for (let col = 0; col <= 4; col++) {
      const bank = (col / 4 - .5) * (1.86 + .17 * Math.sin(row * .79))
      placeOnTrail(sample, at, lane + bank, entity.distance)
      const x = sample.x - center.x
      const z = sample.z - center.z
      position.setXYZ(row * 5 + col, x * cos - z * sin,
        trailHeight(at, lane + bank) - floor + .048, x * sin + z * cos)
    }
  }
  position.needsUpdate = true
  surface.geometry.computeBoundingSphere()
}

function streamRibbon() {
  const width = 22
  const geometry = new T.PlaneGeometry(1, 1, width, 3)
  geometry.rotateX(-Math.PI / 2)
  const positions = geometry.attributes.position
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i)
    const z = positions.getZ(i)
    positions.setZ(i, z * (.89 + .15 * Math.cos(x * 19)) + .10 * Math.sin(x * 8.6))
  }
  geometry.computeVertexNormals()
  return geometry
}

function compact(object, key, hazard) {
  const parts = object.children.map((part) => {
    part.updateMatrix()
    const geo = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone()
    geo.applyMatrix4(part.matrix)
    const n = geo.attributes.position.count
    const color = part.material.color
    const colors = new Float32Array(n * 3)
    const timber = hazard && hardwood.has(color.getHex())
    const endGrain = color.getHex() === 0xb18354 && part.geometry === cylinder
    for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i)
    geo.setAttribute('color', new T.BufferAttribute(colors, 3))
    geo.setAttribute('fieldLayer', new T.BufferAttribute(new Float32Array(n).fill(endGrain ? 3 : timber ? 2 : 0), 1))
    return geo
  })
  const geometry = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  object.clear()
  baked.set(key, geometry)
  object.add(new T.Mesh(geometry, hazard ? fieldMaterials.material : pickupMaterial))
  return object
}

function mesh(parent, shape, tint, x, y, z, sx, sy, sz) {
  if (!colors.has(tint)) colors.set(tint, new T.MeshLambertMaterial({ color: tint }))
  const part = new T.Mesh(shape, colors.get(tint))
  part.position.set(x, y, z)
  part.scale.set(sx, sy, sz)
  parent.add(part)
  return part
}

function group(parent, x = 0, y = 0, z = 0) {
  const object = new T.Group()
  object.position.set(x, y, z)
  parent.add(object)
  return object
}

export function createHazard(parent, type, x = 0, z = 0, wide = false, variant = 0, turn = 1) {
  const object = group(parent, x, 0, z)
  const key = 'hazard-' + type + (wide ? '-wide' : '')
  if (type === 'puddle' || type === 'stream') return fitWaterHazard(object, type === 'stream')
  if (type === 'washout') return object
  if (type === 'rock') {
    object.add(rockMesh(variant, turn))
    return object
  }
  if (type === 'leaning-tree') {
    object.add(new T.Mesh(leaningTree().geometry, fieldMaterials.material), contactShadow(type))
    return object
  }
  if (type === 'fallen') {
    object.add(new T.Mesh(fallenTimberModel(variant), fieldMaterials.material))
    return object
  }
  const timber = trailTimber(type)
  if (timber) {
    object.add(new T.Mesh(timber, fieldMaterials.material))
    if (type === 'log' || type === 'drift') object.add(contactShadow('log'))
    return object
  }
  if (baked.has(key)) {
    object.add(new T.Mesh(baked.get(key), fieldMaterials.material))
    return object
  }
  const bark = 0x514033
  const cut = 0xb18354
  if (type === 'fence') {
    for (const side of [-1, 1]) {
      mesh(object, box, bark, side * .85, .59, 0, .17, 1.18, .2)
      mesh(object, cone, cut, side * .85, 1.23, 0, .135, .15, .135).rotation.y = Math.PI / 4
    }
    for (const y of [.38, .81]) mesh(object, box, 0xb67c45, 0, y, 0, 2, .18, .17)
    mesh(object, box, cut, 0, .62, .1, .81, .17, .06).rotation.z = -.32
  } else if (type === 'branch') {
    const width = 2.14
    const branchBark = 0x8c7b58
    mesh(object, cylinder, branchBark, 1.01, .60, -.035, .112, 1.39, .122).rotation.z = .13
    const limbs = [hangingLimb(width, .34, .205, .13, .6), hangingLimb(width * .96, .087, .080, -.073, 2.2),
      hangingLimb(width * .90, .095, .096, .26, -1.3)]
    mesh(object, limbs[0], branchBark, 0, 1.65, .012, 1, 1, 1)
    mesh(object, limbs[1], bark, 0, 1.17, -.032, 1, 1, 1)
    mesh(object, limbs[2], branchBark, -.075, 2.03, -.044, 1, 1, 1)
    for (const t of [-.38, -.16, .23, .39]) {
      const twig = mesh(object, cylinder, bark, t * width, 1.94 + t * .3, -.11, .042, .52, .045)
      twig.rotation.set(.38, 0, -1.06 + t * .64)
      mesh(object, leaf, 0x777451, t * width + .12, 2.02 + t * .4, -.24, .34, .14, .22)
    }
    compact(object, key, true)
    for (const limb of limbs) limb.dispose()
    return object
  } else if (type === 'tractor') {
    mesh(object, box, 0x665b47, 0, .69, -.03, 1.26, .32, 1.90)
    mesh(object, box, 0x8b4534, 0, 1.02, -.47, 1.06, .62, 1.03)
    mesh(object, box, 0x433b2e, 0, 1.0, -.997, .83, .48, .046)
    for (let slat = -2; slat <= 2; slat++) {
      mesh(object, box, 0x766753, slat * .136, .99, -1.025, .062, .38, .036)
    }
    for (const side of [-1, 1]) {
      mesh(object, wheel, 0x33312b, side * .72, .51, .37, .46, 1.04, 1.12)
      mesh(object, wheel, 0x927455, side * .958, .51, .37, .031, .48, .52)
      mesh(object, wheel, 0x33312b, side * .62, .31, -.67, .31, .62, .62)
      for (const z of [-.19, .89]) mesh(object, box, 0x82715a, side * .52, 1.83, z, .10, 1.15, .10)
    }
    mesh(object, box, 0x744336, 0, 2.42, .35, 1.13, .13, 1.15)
    mesh(object, box, 0x58716a, 0, 1.88, -.16, .92, .84, .065)
    mesh(object, cylinder, 0x41362e, .37, 1.51, -.64, .072, .66, .072)
  }
  return compact(object, key, true)
}

export function createPickup(parent, type, x = 0, z = 0) {
  const object = group(parent, x, .63, z)
  if (baked.has(type)) {
    object.add(new T.Mesh(baked.get(type), pickupMaterial))
    return object
  }
  if (type === 'treat') {
    mesh(object, box, 0xffce59, 0, 0, 0, .48, .17, .15)
    for (const x of [-.22, .22]) {
      for (const y of [-.085, .085]) mesh(object, sphere, 0xffd56b, x, y, 0, .115, .115, .095)
    }
  } else if (type === 'call') {
    mesh(object, cylinder, 0x169c84, 0, 0, 0, .105, .57, .105).rotation.z = -.85
    mesh(object, cylinder, 0xffdf74, 0, 0, 0, .119, .11, .119).rotation.z = -.85
  } else {
    const pheasant = type === 'pheasant'
    const decoy = type === 'decoy'
    const body = pheasant ? 0xb75d39 : decoy ? 0xe0aa70 : 0xacae93
    mesh(object, sphere, body, 0, 0, 0, .34, .19, .23)
    mesh(object, sphere, decoy ? 0xb8824e : pheasant ? 0x842a37 : 0x267852, .24, .17, 0, .15, .15, .14)
    mesh(object, sphere, 0xffcf62, .39, .13, 0, .16, .051, .071)
    mesh(object, leaf, body, -.33, .05, 0, pheasant ? .52 : .21, .075, .13).rotation.z = -.23
    if (pheasant) mesh(object, sphere, 0xffebbe, .19, .09, 0, .12, .051, .13)
    if (decoy) mesh(object, box, 0x8b5e3c, 0, -.19, 0, .6, .08, .27)
  }
  return compact(object, type, false)
}
