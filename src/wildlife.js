import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { regionAt } from './expedition.js'
import { centerAt } from './trail.js'
import { diveAge, diveApproach, diveExit, diveFrame, diveScale } from './dive.js'

const species = [
  { name: 'goose', body: 0x827464, crown: 0x27251e, wing: 0x534a3e, cheek: 0xc8c3ab, size: .80, span: 1.48, length: .66, count: 7 },
  { name: 'mallard', body: 0x807a6e, crown: 0x244a39, wing: 0x59606c, cheek: 0xc2bc9e, size: .57, span: 1.18, length: .57, count: 5 },
  { name: 'teal', body: 0x847c69, crown: 0x63402f, wing: 0x496056, cheek: 0x24756c, size: .42, span: 1.05, length: .51, count: 8 },
  { name: 'pheasant', body: 0x904d31, crown: 0x474c36, wing: 0x9d7149, cheek: 0x9e4730, size: .58, span: 1.0, length: 1.0, count: 3 },
]

const ellipsoid = new T.SphereGeometry(1, 9, 6)
const billShape = new T.SphereGeometry(1, 6, 3)
const plumage = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide })
const flockGeometry = new Map()

function buildBird(info) {
  const goose = info.name === 'goose'
  const mallard = info.name === 'mallard'
  const pheasant = info.name === 'pheasant'
  const body = []
  const paint = new T.Color()
  function part(geometry, color, x, y, z, sx, sy, sz, tilt = 0) {
    const mesh = geometry.toNonIndexed()
    mesh.scale(sx, sy, sz).rotateX(tilt).translate(x, y, z)
    const colors = new Float32Array(mesh.attributes.position.count * 3)
    paint.setHex(color)
    for (let i = 0; i < colors.length; i += 3) paint.toArray(colors, i)
    mesh.setAttribute('color', new T.BufferAttribute(colors, 3))
    body.push(mesh)
  }

  part(ellipsoid, info.body, 0, 0, .03, .223, .185, info.length * .54)
  part(ellipsoid, goose ? 0xaea89b : mallard ? 0x865444 : info.body, 0, -.050, -.098, .193, .141, .19)
  part(ellipsoid, info.crown, 0, goose ? .103 : .087, goose ? -.323 : -.204,
    goose ? .072 : .093, goose ? .246 : .151, .085, goose ? -1.14 : -.62)
  part(ellipsoid, info.crown, 0, goose ? .193 : .137, goose ? -.528 : -.323,
    .083, goose ? .097 : .090, .125)
  if (mallard) part(ellipsoid, 0xd7d0ba, 0, .081, -.246, .103, .033, .081, -.59)
  for (const side of [-1, 1]) {
    if (goose) part(ellipsoid, info.cheek, side * .067, .165, -.494, .024, .036, .072, -.14)
    else if (!mallard) part(billShape, info.cheek, side * .070, .151, -.327, .021, .043, .064)
    part(billShape, 0x201d17, side * .073, goose ? .22 : .170, goose ? -.571 : -.367, .022, .018, .021)
  }
  part(billShape, goose ? 0x262b28 : 0xb19442, 0, goose ? .177 : .115, goose ? -.657 : -.448,
    .051, .032, goose ? .077 : .096)
  part(billShape, info.wing, 0, .026, info.length * .48, pheasant ? .095 : .128, .033,
    pheasant ? .42 : .177, .17)
  if (goose) part(billShape, 0xd2c6a9, 0, -.053, .273, .141, .054, .137)
  const mesh = mergeGeometries(body)
  for (const piece of body) piece.dispose()
  return mesh
}

function featherPanel(base, outer) {
  const positions = [], colors = []
  const shade = new T.Color(base)
  const baseTone = shade.clone()
  function vertex(point, tone) {
    positions.push(...point)
    shade.copy(baseTone).multiplyScalar(tone).toArray(colors, colors.length)
  }
  function tri(a, b, c, tone) {
    vertex(a, tone)
    vertex(b, tone * 1.04)
    vertex(c, tone * .93)
  }
  const count = outer ? 7 : 6
  for (let i = 0; i < count; i++) {
    const start = i / count
    const end = (i + 1) / count
    const step = outer ? .35 : .60
    const reach = outer ? .22 : .11
    const root = [start * step, Math.sin(start * 1.7) * .042, outer ? -.16 + .10 * start : -.143 - .07 * start]
    const next = [end * step, Math.sin(end * 1.7) * .042, outer ? -.16 + .10 * end : -.143 - .07 * end]
    const outline = [start * step + reach, outer ? -.032 : -.018, (outer ? .218 : .25) - start * start * .20]
    const shoulder = [(start + .36) * step, root[1] + .037, .040]
    tri(root, next, shoulder, 1.10 - start * .20)
    tri(next, outline, shoulder, .92 - start * .11)
    tri(root, shoulder, outline, .77 - start * .10)
  }
  const mesh = new T.BufferGeometry()
  mesh.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  mesh.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  mesh.computeVertexNormals()
  return mesh
}

function flockBatch(scene, info, capacity = info.count) {
  if (!flockGeometry.has(info.name)) flockGeometry.set(info.name, {
    body: buildBird(info), inner: featherPanel(info.wing, false), outer: featherPanel(info.wing, true),
  })
  const geometry = flockGeometry.get(info.name)
  function instances(mesh, count) {
    const batch = new T.InstancedMesh(mesh, plumage, count)
    batch.frustumCulled = false
    batch.instanceMatrix.setUsage(T.DynamicDrawUsage)
    batch.visible = false
    scene.add(batch)
    return batch
  }
  return {
    info, bodies: instances(geometry.body, capacity), wings: instances(geometry.inner, capacity * 2),
    tips: instances(geometry.outer, capacity * 2),
  }
}

function showFlock({ bodies, wings, tips }, count) {
  bodies.visible = wings.visible = tips.visible = count > 0
  if (!count) return
  bodies.count = count
  wings.count = tips.count = count * 2
  for (const batch of [bodies, wings, tips]) batch.instanceMatrix.needsUpdate = true
}

function animateBird() {
  const body = new T.Object3D()
  const wing = new T.Object3D()
  const tip = new T.Object3D()
  const wingMatrix = new T.Matrix4()
  const tipMatrix = new T.Matrix4()
  return function write(flock, n, x, y, z, pitch, angle, roll, scale, time, wingCycle = n) {
    const { info, bodies, wings, tips } = flock
    const goose = info.name === 'goose'
    body.position.set(x, y, z)
    body.rotation.set(pitch, angle, roll)
    body.scale.setScalar(scale)
    body.updateMatrix()
    bodies.setMatrixAt(n, body.matrix)
    const phase = time * (goose ? 13.5 : 23.0) + wingCycle * .71
    const inGlide = goose ? T.MathUtils.smoothstep(Math.sin(time * .74 + wingCycle * .06), .58, .89) * .83 : .06
    const flap = Math.sin(phase) * (1 - inGlide) * (goose ? .60 : .83)
    for (const side of [-1, 1]) {
      const index = n * 2 + Number(side > 0)
      wing.position.set(.12 * side, .051, .009)
      wing.rotation.set(-.08, side * .042 * Math.cos(phase), side * (flap + .071) + (side < 0 ? Math.PI : 0))
      wing.scale.set(info.span, 1, 1.09)
      wing.updateMatrix()
      wingMatrix.multiplyMatrices(body.matrix, wing.matrix)
      wings.setMatrixAt(index, wingMatrix)
      tip.position.set(.49, .018, -.043)
      tip.rotation.set(0, -.12, side * (.24 * Math.sin(phase - .94) * (1 - inGlide) - .053))
      tip.updateMatrix()
      tipMatrix.multiplyMatrices(wingMatrix, tip.matrix)
      tips.setMatrixAt(index, tipMatrix)
    }
  }
}

export function createWildlife(scene, call) {
  const flocks = species.map((info) => flockBatch(scene, info))
  const write = animateBird()
  let lastEvent = -1
  let lastFlyby = -1
  let lastTime = 0
  return function update(time, distance, lowQuality, audible) {
    if (time < lastTime) lastEvent = lastFlyby = -1
    lastTime = time
    const clock = time + 3
    const event = Math.floor(clock / 14)
    const progress = (clock % 14) / 10
    const region = regionAt(distance).key
    const group = event % flocks.length
    const preferred = region === 'snow' ? group % 2 : region === 'river' && group === 3 ? 0 : group
    const bird = flocks[preferred].info.name
    const direction = event % 2 === 0 ? 1 : -1
    const landscapeOffset = centerAt(distance + 27) - centerAt(distance)
    const x = (-23 + progress * 48) * direction + landscapeOffset
    const isWaterfowl = bird === 'goose' || bird === 'mallard'
    if (audible && isWaterfowl && event !== lastEvent && progress > .21 && progress < .48) {
      call(bird, { x, distance: Math.hypot(x, 31 - progress * 6), movement: direction })
      lastEvent = event
    }
    if (audible && bird === 'mallard' && event !== lastFlyby && progress > .50 && progress < .59) {
      call(bird, { x, distance: Math.hypot(x, 31 - progress * 6), movement: direction, wings: true, vocal: false })
      lastFlyby = event
    }
    for (const [index, flock] of flocks.entries()) {
      const { info } = flock
      const visible = preferred === index && progress < 1
      const count = visible ? (lowQuality ? Math.max(3, info.count - 3) : info.count) : 0
      showFlock(flock, count)
      if (!visible) continue
      const pheasant = info.name === 'pheasant'
      const goose = info.name === 'goose'
      const height = goose ? 8 : info.name === 'mallard' ? 4.6 : pheasant ? .2 : 1.4
      for (let n = 0; n < count; n++) {
        const line = Math.ceil(n / 2)
        const side = n % 2 ? -1 : 1
        const z = goose ? line * side * 2.0 : Math.sin(n * 2.7) * 2.2
        const x = (-23 + progress * 48 - line * (goose ? 2.2 : 1.7)) * direction
        const climb = pheasant ? Math.sin(Math.min(1, progress * 1.55) * Math.PI * .74) * 5.7 : Math.sin(progress * Math.PI) * 1.9
        write(flock, n, x + landscapeOffset, height + climb + Math.sin(n * .8 + time * 2) * .19,
          -31 + z + progress * 6, -.08, -direction * 1.34, direction * Math.sin(progress * 5) * .13, info.size, time)
      }
    }
  }
}

export function createDivingFlocks(scene) {
  const capacity = 6
  const batch = flockBatch(scene, species[0], capacity)
  const write = animateBird()
  const pose = {}
  return function draw(entities, distance, time, lowQuality) {
    let slot = 0
    let flockLeader
    for (const entity of entities) {
      if (entity.type !== 'goose' || slot >= capacity) continue
      const age = diveAge(entity, distance)
      if (age < -diveApproach || age > diveExit) continue
      diveFrame(pose, entity, distance, distance)
      write(batch, slot++, pose.x, pose.y, pose.z, pose.pitch, pose.angle, pose.roll, diveScale, time, entity.lead ? 0 : 2)
      if (entity.lead) flockLeader = entity
    }
    if (flockLeader) {
      const companions = lowQuality ? 2 : 4
      for (let n = 1; n <= companions && slot < capacity; n++) {
        diveFrame(pose, flockLeader, distance, distance, n)
        write(batch, slot++, pose.x, pose.y, pose.z, pose.pitch, pose.angle, pose.roll, .80, time, n + 3)
      }
    }
    showFlock(batch, slot)
  }
}
