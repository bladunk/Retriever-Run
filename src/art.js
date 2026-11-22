import * as T from 'three'

const sphere = new T.SphereGeometry(1, 12, 8)
const box = new T.BoxGeometry(1, 1, 1)
const cylinder = new T.CylinderGeometry(1, 1, 1, 9)
const cone = new T.ConeGeometry(1, 1, 5)
const leaf = new T.IcosahedronGeometry(1, 0)
const colors = new Map()
const landscape = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true })

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
    mesh(object, cylinder, bark, .94, .78, .15, .13, 1.62, .14).rotation.z = -.18
    mesh(object, cylinder, bark, -.08, 1.22, 0, .13, 2.16, .15).rotation.z = Math.PI / 2
    mesh(object, leaf, 0x789049, -.78, 1.45, -.04, .51, .34, .44)
    mesh(object, leaf, 0x8d9d53, -.37, 1.54, -.11, .41, .39, .43)
    if (wide) object.scale.x = 3.72
  } else if (type === 'log' || type === 'root' || type === 'drift') {
    mesh(object, cylinder, bark, 0, .33, 0, .34, 1.97, .34).rotation.z = Math.PI / 2
    for (const side of [-1, 1]) {
      mesh(object, cylinder, cut, side * .994, .33, 0, .27, .025, .27).rotation.z = Math.PI / 2
    }
    mesh(object, cylinder, bark, .42, .58, -.04, .09, .34, .09).rotation.z = -.39
    if (type === 'root') {
      object.scale.y = .7
      mesh(object, cylinder, bark, -.40, .18, -.27, .07, .92, .07).rotation.set(.63, 0, -.99)
    }
    if (type === 'drift') {
      mesh(object, sphere, 0x504842, 0, .036, 0, 1.13, .022, .50)
      mesh(object, box, 0x8c7b58, -.31, .39, .064, .57, .12, .54).rotation.y = .21
    }
  } else {
    const stream = type === 'stream'
    const width = stream ? 3.66 : .92
    const depth = stream ? 1.06 : .82
    const shape = stream ? box : sphere
    mesh(object, shape, 0x746646, 0, .025, 0, stream ? 7.4 : width + .12, .046, stream ? 2.25 : depth + .12)
    mesh(object, shape, 0x3f6264, 0, .060, 0, stream ? 7.24 : width, .046, stream ? depth * 2 : depth)
    for (const i of [-1, 0, 1]) {
      mesh(object, sphere, 0x99a8a3, i * width * .57, .112, i * .33, width * .17, .012, .035)
    }
  }
  return object
}

export function createPickup(parent, type, x = 0, z = 0) {
  const object = group(parent, x, .63, z)
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
  return object
}
