import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

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

export function createDog(scene) {
  const root = group(scene)
  const body = group(root)
  const gold = 0xeaa73b
  const cream = 0xffcd6b
  const ear = 0xba7427
  mesh(body, sphere, gold, 0, .79, .05, .41, .42, .69)
  mesh(body, sphere, cream, 0, .85, -.37, .35, .45, .38)
  const head = group(body, 0, 1.17, -.54)
  mesh(head, sphere, 0xf2b64d, 0, .06, 0, .36, .34, .37)
  mesh(head, sphere, cream, 0, -.055, -.30, .25, .19, .29)
  mesh(head, sphere, 0x362c23, 0, -.005, -.53, .149, .095, .085)
  for (const side of [-1, 1]) {
    mesh(head, sphere, 0x32271d, side * .24, .115, -.21, .054, .066, .052)
    mesh(head, sphere, 0xffefd2, side * .252, .134, -.244, .016, .016, .014)
    mesh(head, sphere, ear, side * .322, -.04, .035, .125, .26, .175).rotation.z = side * .27
  }
  mesh(body, cylinder, 0x207064, 0, .99, -.45, .315, .12, .315).rotation.x = -.34
  mesh(body, sphere, 0xffdb6c, .24, .93, -.61, .071, .093, .038)

  const legs = []
  for (const z of [-.35, .45]) {
    for (const x of [-.245, .245]) {
      const leg = group(body, x, .69, z)
      mesh(leg, sphere, gold, 0, -.222, 0, .128, .32, .133)
      mesh(leg, sphere, cream, 0, -.546, -.058, .13, .115, .165)
      legs.push(leg)
    }
  }
  const tail = group(body, 0, .88, .59)
  mesh(tail, sphere, gold, 0, .16, .28, .115, .105, .40).rotation.x = -.53
  const shadow = mesh(scene, sphere, 0x817052, 0, .016, 0, .56, .014, .84)

  return {
    root,
    pose({ x, height, sliding, stride, time, heading = 0, idle = false }) {
      root.position.set(x, height, 0)
      root.rotation.y = heading
      shadow.position.x = x
      shadow.scale.x = .56 + height * .06
      body.position.y = sliding ? -.17 : height ? 0 : Math.abs(Math.sin(stride)) * .09
      body.scale.y = sliding ? .51 : 1
      body.rotation.x = height ? Math.cos(stride) * .16 : 0
      head.rotation.y = idle ? -.27 + Math.sin(time * 1.3) * .12 : 0
      tail.rotation.y = Math.sin(time * (idle ? 5 : 12)) * .37
      for (const [index, leg] of legs.entries()) {
        leg.rotation.x = sliding ? (index < 2 ? -.77 : .76)
          : height ? (index < 2 ? -.75 : .65)
          : idle ? 0 : Math.sin(stride + [0, 2.5, 3.3, .75][index]) * .87
      }
    },
  }
}

export const segmentLength = 26

function bake(geometryList, shape, tint, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  const geometry = shape.index ? shape.toNonIndexed() : shape.clone()
  geometry.scale(sx, sy, sz)
  geometry.rotateX(rx)
  geometry.rotateY(ry)
  geometry.rotateZ(rz)
  geometry.translate(x, y, z)
  const color = new T.Color(tint)
  const values = new Float32Array(geometry.attributes.position.count * 3)
  for (let i = 0; i < values.length; i += 3) color.toArray(values, i)
  geometry.setAttribute('color', new T.BufferAttribute(values, 3))
  geometryList.push(geometry)
}

export function createSegment(scene, boardwalk, variant) {
  let seed = (variant + 1) * 5683
  const rand = () => {
    seed = (1664525 * seed + 1013904223) >>> 0
    return seed / 4294967296
  }
  const parts = []
  function add(...args) { bake(parts, ...args) }

  add(box, 0x598e83, 0, -.49, 0, 98, .15, segmentLength)
  add(box, boardwalk ? 0x6b4931 : 0x966641, 0, -.16, 0, 7.4, .28, segmentLength)
  if (boardwalk) {
    for (let z = -12.7; z < 13; z += .57) {
      add(box, [0xc79058, 0xb17d4d, 0xd3a468][Math.floor(rand() * 3)], 0, -.04, z, 7.35, .08, .52)
    }
  } else {
    add(box, 0xc6955d, 0, -.042, 0, 7.05, .08, segmentLength)
    for (let i = 0; i < 45; i++) {
      add(leaf, rand() < .5 ? 0xbd8952 : 0xd8a96d, (rand() - .5) * 6.8, -.005,
        (rand() - .5) * 25.8, .1 + rand() * .36, .012, .16 + rand() * .54)
    }
  }
  for (const side of [-1, 1]) {
    add(box, boardwalk ? 0xe2b67b : 0x8b7648, side * 3.59, -.002, 0, .14, .084, segmentLength)
    for (let i = 0; i < 24; i++) {
      const x = side * (3.95 + rand() * 10)
      const z = (rand() - .5) * 25
      const tint = [0x7e9547, 0x566840, 0xa2a253][i % 3]
      if (rand() < .67) add(leaf, 0x74854b, x, -.37, z, .5 + rand() * 1.5, .35, .65 + rand() * 1.6)
      for (let blade = -1; blade <= 1; blade++) {
        const height = .33 + rand() * .65
        add(cone, tint, x + blade * .10, -.18 + height / 2, z, .076, height, .07, 0, 0, blade * -.32)
      }
      if (i % 4 === 0) {
        add(cylinder, 0x677442, x, .49, z, .029, 1.56, .029)
        add(sphere, 0x73482f, x, 1.22, z, .071, .209, .071)
      }
      if (i % 6 === 0) add(leaf, 0x96b991, side * (4.1 + rand() * 16), -.397, z, .72, .011, .135)
    }
    for (let i = 0; i < 6; i++) {
      const x = side * (8.5 + rand() * 29)
      const z = (rand() - .5) * 25
      const h = 1.4 + rand() * 2.5
      add(leaf, 0x798a4c, x, -.34, z, 2.3, .37, 2.2)
      add(cylinder, 0x755941, x, h / 2 - .1, z, .17, h, .17, 0, 0, .10)
      for (let j = 0; j < 3; j++) {
        add(leaf, [0x5f7848, 0x81904d, 0x9ea35b][j],
          x + (j - 1) * .8, h + j * .43, z + (j % 2) * .8, 1.65, 1.14 + rand(), 1.59, 0, rand() * 4)
      }
    }
  }
  const geometry = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  const tile = new T.Mesh(geometry, landscape)
  scene.add(tile)
  return tile
}

export function createHazard(parent, type, x, z) {
  const object = group(parent, x, 0, z)
  const bark = 0x6c412a
  const cut = 0xe6ae6f
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
  } else if (type === 'log') {
    mesh(object, cylinder, bark, 0, .33, 0, .34, 1.97, .34).rotation.z = Math.PI / 2
    for (const side of [-1, 1]) {
      mesh(object, cylinder, cut, side * .994, .33, 0, .27, .025, .27).rotation.z = Math.PI / 2
    }
    mesh(object, cylinder, bark, .42, .58, -.04, .09, .34, .09).rotation.z = -.39
  } else {
    const stream = type === 'stream'
    const width = stream ? 3.66 : .92
    const depth = stream ? 1.06 : .82
    const shape = stream ? box : sphere
    mesh(object, shape, 0x746646, 0, .025, 0, stream ? 7.4 : width + .12, .046, stream ? 2.25 : depth + .12)
    mesh(object, shape, 0x3b858a, 0, .060, 0, stream ? 7.24 : width, .046, stream ? depth * 2 : depth)
    for (const i of [-1, 0, 1]) {
      mesh(object, sphere, 0x9ad8bd, i * width * .57, .112, i * .33, width * .17, .012, .035)
    }
  }
  return object
}

export function createPickup(parent, type, x, z) {
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

export function createSky(scene) {
  scene.background = new T.Color(0xf2d69d)
  scene.fog = new T.FogExp2(0xf0d9a8, .019)
  scene.add(new T.HemisphereLight(0xffe9bb, 0xb0c5a0, 2.18))
  const sun = new T.DirectionalLight(0xffe3ac, 2.15)
  sun.position.set(-12, 16, 7)
  scene.add(sun)
  const sunDisc = new T.Mesh(sphere, new T.MeshBasicMaterial({ color: 0xfff0be, fog: false }))
  sunDisc.position.set(35, 15, -120)
  sunDisc.scale.setScalar(7)
  scene.add(sunDisc)
  const cloud = new T.MeshBasicMaterial({ color: 0xffe8bf, fog: false })
  for (let i = 0; i < 7; i++) {
    const wisp = new T.Mesh(sphere, cloud)
    wisp.position.set(i * 22 - 72, 17 + Math.sin(i * 1.82) * 7, -140)
    wisp.scale.set(8 + (i % 3) * 3, .58 + (i % 2) * .53, 1)
    scene.add(wisp)
  }
}
