import * as T from 'three'
import { centerAt } from './trail.js'
import { diveAge, diveApproach, diveExit, diveFrame, diveScale } from './dive.js'

const species = [
  { name: 'goose', body: 0x827464, crown: 0x27251e, wing: 0x534a3e, cheek: 0xc8c3ab, size: .80, span: 1.48, length: .66, count: 7 },
  { name: 'mallard', body: 0x807a6e, crown: 0x244a39, wing: 0x59606c, cheek: 0xc2bc9e, size: .57, span: 1.18, length: .57, count: 5 },
  { name: 'teal', body: 0x847c69, crown: 0x63402f, wing: 0x496056, cheek: 0x24756c, size: .42, span: 1.05, length: .51, count: 8 },
  { name: 'pheasant', body: 0x904d31, crown: 0x474c36, wing: 0x9d7149, cheek: 0x9e4730, size: .58, span: 1.0, length: 1.0, count: 3 },
]

const round = new T.SphereGeometry(1, 8, 5)
const wingGeo = new T.BufferGeometry()
wingGeo.setAttribute('position', new T.Float32BufferAttribute([
  0, 0, -.18, .46, .09, -.33, 1, 0, -.13, .86, -.045, .02, .50, -.065, .28, 0, 0, .22,
], 3))
wingGeo.setIndex([0, 1, 2, 0, 2, 5, 2, 3, 4, 2, 4, 5])
wingGeo.computeVertexNormals()

function flockBatch(scene, info, capacity = info.count) {
  function instances(geometry, color, count) {
    const batch = new T.InstancedMesh(geometry, new T.MeshLambertMaterial({ color, side: T.DoubleSide }), count)
    batch.frustumCulled = false
    batch.instanceMatrix.setUsage(T.DynamicDrawUsage)
    batch.visible = false
    scene.add(batch)
    return batch
  }
  return {
    info, bodies: instances(round, info.body, capacity), heads: instances(round, info.crown, capacity),
    wings: instances(wingGeo, info.wing, capacity * 2), marks: instances(round, info.cheek, capacity),
    tails: instances(wingGeo, info.wing, capacity), bills: instances(round, info.name === 'goose' ? 0x211f1b : 0xa6874b, capacity),
  }
}

function showFlock(flock, count) {
  const { bodies, heads, wings, marks, tails, bills } = flock
  bodies.visible = heads.visible = wings.visible = marks.visible = tails.visible = bills.visible = count > 0
  if (!count) return
  bodies.count = heads.count = marks.count = tails.count = bills.count = count
  wings.count = count * 2
  for (const batch of [bodies, heads, wings, marks, tails, bills]) batch.instanceMatrix.needsUpdate = true
}

function animateBird() {
  const body = new T.Object3D()
  const part = new T.Object3D()
  const matrix = new T.Matrix4()

  function detail(batch, index, x, y, z, sx, sy, sz, rx = 0, rz = 0, ry = 0) {
    part.position.set(x, y, z)
    part.scale.set(sx, sy, sz)
    part.rotation.set(rx, ry, rz)
    part.updateMatrix()
    matrix.multiplyMatrices(body.matrix, part.matrix)
    batch.setMatrixAt(index, matrix)
  }

  return function write(flock, n, x, y, z, pitch, angle, roll, scale, time, wingCycle = n) {
    const { info, bodies, heads, wings, marks, tails, bills } = flock
    const goose = info.name === 'goose'
    const pheasant = info.name === 'pheasant'
    body.position.set(x, y, z)
    body.rotation.set(pitch, angle, roll)
    body.scale.setScalar(scale)
    body.updateMatrix()
    detail(bodies, n, 0, 0, 0, .23, .18, info.length * .44)
    detail(heads, n, 0, goose ? .22 : .125, goose ? -.46 : -.30, .096, goose ? .115 : .093, .143)
    detail(marks, n, 0, goose ? .16 : .061, goose ? -.33 : -.253,
      .080, goose ? .21 : .093, goose ? .18 : .089, -.76)
    detail(bills, n, 0, goose ? .21 : .117, goose ? -.605 : -.428, .062, .037, .087)
    detail(tails, n, 0, .015, info.length * .29, pheasant ? .77 : .28, .6, .37, .22, 0, Math.PI * -.5)
    const flap = Math.sin(time * (goose ? 14 : 25) + wingCycle * .71) * (goose ? .66 : .87)
    for (const sign of [-1, 1]) {
      detail(wings, n * 2 + Number(sign === 1), sign * .105, .04, .02, info.span, 1, 1.08, -.08, sign * flap + (sign < 0 ? Math.PI : 0))
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
    const preferred = event % flocks.length
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
