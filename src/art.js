import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { fieldMaterials } from './materials.js'
import { marshWater } from './marsh-water.js'

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
const barkCylinder = new T.CylinderGeometry(1, 1, 1, 11, 3)
const timberPoints = barkCylinder.attributes.position
for (let i = 0; i < timberPoints.count; i++) {
  const x = timberPoints.getX(i), y = timberPoints.getY(i), z = timberPoints.getZ(i)
  const rough = .98 + .047 * Math.sin(Math.atan2(z, x) * 7) + .042 * Math.sin(y * 10 + x * 5)
  timberPoints.setXYZ(i, x * rough, y, z * rough)
}
barkCylinder.computeVertexNormals()

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

export function createHazard(parent, type, x = 0, z = 0, wide = false) {
  const object = group(parent, x, 0, z)
  const key = 'hazard-' + type + (wide ? '-wide' : '')
  if (type === 'puddle' || type === 'stream') return fitWaterHazard(object, type === 'stream')
  if (type === 'root') object.scale.y = .7
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
    const width = wide ? 7.28 : 2.14
    for (const x of wide ? [-3.56, 3.56] : [1.01]) {
      mesh(object, cylinder, bark, x, .58, 0, .096, 1.17, .105)
    }
    mesh(object, cylinder, bark, 0, 1.17, 0, .110, width, .110).rotation.z = Math.PI / 2
    mesh(object, leaf, 0x776f46, -.79, 1.31, -.04, .41, .20, .35)
    mesh(object, leaf, 0x6a6544, -.38, 1.34, -.10, .32, .20, .32)
  } else if (type === 'tree') {
    // A standing snag in a playable lane. Habitat trees remain decorative.
    mesh(object, barkCylinder, bark, 0, .625, 0, .292, 1.25, .292)
    mesh(object, cylinder, cut, 0, 1.254, 0, .276, .036, .274)
    mesh(object, cylinder, bark, .14, 1.226, .075, .068, .34, .062).rotation.z = -.27
    mesh(object, sphere, bark, -.16, .09, .077, .28, .11, .186).rotation.y = -.63
  } else if (type === 'log' || type === 'root' || type === 'drift') {
    mesh(object, barkCylinder, bark, 0, .33, 0, .34, 1.97, .34).rotation.z = Math.PI / 2
    for (const side of [-1, 1]) {
      mesh(object, cylinder, cut, side * .994, .33, 0, .27, .025, .27).rotation.z = Math.PI / 2
    }
    mesh(object, cylinder, bark, .42, .58, -.04, .09, .34, .09).rotation.z = -.39
    mesh(object, leaf, 0x59603a, -.37, .606, .105, .36, .044, .103).rotation.y = .11
    mesh(object, leaf, 0x737046, -.76, .569, .173, .17, .038, .118).rotation.y = -.34
    if (type === 'root') {
      mesh(object, cylinder, bark, -.40, .18, -.27, .07, .92, .07).rotation.set(.63, 0, -.99)
    }
    if (type === 'drift') {
      mesh(object, sphere, 0x504842, 0, .036, 0, 1.13, .022, .50)
      mesh(object, box, 0x8c7b58, -.31, .39, .064, .57, .12, .54).rotation.y = .21
    }
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
