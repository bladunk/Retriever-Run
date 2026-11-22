import * as T from 'three'
import { centerAt } from './trail.js'

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

export function createWildlife(scene, call) {
  const body = new T.Object3D()
  const part = new T.Object3D()
  const matrix = new T.Matrix4()
  const flocks = species.map((info) => {
    function instances(geometry, color, count) {
      const batch = new T.InstancedMesh(geometry, new T.MeshLambertMaterial({ color, side: T.DoubleSide }), count)
      batch.frustumCulled = false
      batch.instanceMatrix.setUsage(T.DynamicDrawUsage)
      scene.add(batch)
      return batch
    }
    return {
      info, bodies: instances(round, info.body, info.count), heads: instances(round, info.crown, info.count),
      wings: instances(wingGeo, info.wing, info.count * 2), marks: instances(round, info.cheek, info.count),
      tails: instances(wingGeo, info.wing, info.count), bills: instances(round, info.name === 'goose' ? 0x211f1b : 0xa6874b, info.count),
    }
  })

  function detail(batch, index, x, y, z, sx, sy, sz, rx = 0, rz = 0, ry = 0) {
    part.position.set(x, y, z)
    part.scale.set(sx, sy, sz)
    part.rotation.set(rx, ry, rz)
    part.updateMatrix()
    matrix.multiplyMatrices(body.matrix, part.matrix)
    batch.setMatrixAt(index, matrix)
  }

  let lastEvent = -1
  return function update(time, distance, lowQuality, audible) {
    const clock = time + 3
    const event = Math.floor(clock / 14)
    const progress = (clock % 14) / 10
    const preferred = event % flocks.length
    if (audible && event !== lastEvent && progress > .21 && progress < .48) {
      call(flocks[preferred].info.name)
      lastEvent = event
    }
    for (const [index, flock] of flocks.entries()) {
      const { info, bodies, heads, wings, marks, tails, bills } = flock
      const visible = preferred === index && progress < 1
      bodies.visible = heads.visible = wings.visible = marks.visible = tails.visible = bills.visible = visible
      if (!visible) continue
      const count = lowQuality ? Math.max(3, info.count - 3) : info.count
      bodies.count = heads.count = marks.count = tails.count = bills.count = count
      wings.count = count * 2
      const pheasant = info.name === 'pheasant'
      const goose = info.name === 'goose'
      const height = goose ? 8 : info.name === 'mallard' ? 4.6 : pheasant ? .2 : 1.4
      const direction = event % 2 === 0 ? 1 : -1
      const landscapeOffset = centerAt(distance + 27) - centerAt(distance)
      for (let n = 0; n < count; n++) {
        const line = Math.ceil(n / 2)
        const side = n % 2 ? -1 : 1
        const z = goose ? line * side * 2.0 : Math.sin(n * 2.7) * 2.2
        const x = (-23 + progress * 48 - line * (goose ? 2.2 : 1.7)) * direction
        const climb = pheasant ? Math.sin(Math.min(1, progress * 1.55) * Math.PI * .74) * 5.7 : Math.sin(progress * Math.PI) * 1.9
        body.position.set(x + landscapeOffset, height + climb + Math.sin(n * .8 + time * 2) * .19, -31 + z + progress * 6)
        body.rotation.set(-.08, -direction * 1.34, direction * Math.sin(progress * 5) * .13)
        body.scale.setScalar(info.size)
        body.updateMatrix()
        detail(bodies, n, 0, 0, 0, .23, .18, info.length * .44)
        detail(heads, n, 0, goose ? .22 : .125, goose ? -.46 : -.30,
          .096, goose ? .115 : .093, .143)
        detail(marks, n, 0, goose ? .16 : .061, goose ? -.33 : -.253,
          .080, goose ? .21 : .093, goose ? .18 : .089, -.76)
        detail(bills, n, 0, goose ? .21 : .117, goose ? -.605 : -.428, .062, .037, .087)
        detail(tails, n, 0, .015, info.length * .29, pheasant ? .77 : .28, .6, .37, .22, 0, Math.PI * -.5)
        const flap = Math.sin(time * (goose ? 14 : 25) + n * .71) * (goose ? .66 : .87)
        for (const sign of [-1, 1]) {
          detail(wings, n * 2 + Number(sign === 1), sign * .105, .04, .02, info.span, 1, 1.08, -.08, sign * flap + (sign < 0 ? Math.PI : 0))
        }
      }
      for (const batch of [bodies, heads, wings, marks, tails, bills]) batch.instanceMatrix.needsUpdate = true
    }
  }
}
