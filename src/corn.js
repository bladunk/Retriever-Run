import * as T from 'three'
import { seededRandom } from './trail.js'

export function cornModel(stubble = false, distant = false) {
  const positions = [], colors = [], indices = []
  const paint = new T.Color()
  const random = seededRandom(stubble ? 9741 : 5246)
  function vertex(x, y, z, tint, brightness = 1) {
    const index = positions.length / 3
    positions.push(x, y, z)
    paint.setHex(tint).multiplyScalar(brightness).toArray(colors, colors.length)
    return index
  }

  const stalk = stubble ? .22 : 1.65
  for (let side = 0; side < 3; side++) {
    const angle = side * Math.PI * 2 / 3
    const x = Math.cos(angle) * .022, z = Math.sin(angle) * .022
    const a = vertex(x, 0, z, 0x9b7443)
    const b = vertex(x * .61 + .09 * Number(!stubble), stalk, z * .61, 0xc5a66b)
    const next = ((side + 1) % 3) * 2
    indices.push(a, next, b, next, next + 1, b)
  }
  if (!stubble) {
    const leafCount = distant ? 3 : 7
    for (let leaf = 0; leaf < leafCount; leaf++) {
      const base = .22 + leaf * .17
      const angle = leaf * 2.39
      const length = (.60 - leaf * .052) * (.83 + random() * .36)
      const tint = [0xb69050, 0xc7a366, 0xaa8449, 0xbba677][leaf % 4]
      const first = positions.length / 3
      for (let segment = 0; segment < 5; segment++) {
        const t = segment * .25
        const side = (Math.sin(t * Math.PI) * .062 + .005) * (1 - leaf * .043)
        const reach = t * length
        const y = base + Math.sin(t * 3.1) * .158 - .21 * t ** 2
        for (const k of [-1, 0, 1]) {
          vertex(Math.cos(angle) * reach - Math.sin(angle) * side * k + .054 * base,
            y - Math.abs(k) * .035 - k * t * .032,
            Math.sin(angle) * reach + Math.cos(angle) * side * k, tint, k ? .84 : 1.06)
        }
        if (segment) for (let col = 0; col < 2; col++) {
          const a = first + (segment - 1) * 3 + col
          indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4)
        }
      }
    }
    for (let tassel = 0; tassel < (distant ? 1 : 4); tassel++) {
      const angle = tassel * 2.4
      const a = vertex(.085, 1.52, 0, 0xa77d48)
      const b = vertex(.074 + Math.cos(angle) * .058, 1.80, Math.sin(angle) * .063, 0xc2a572)
      const c = vertex(.09 + Math.cos(angle) * .109, 1.73, Math.sin(angle) * .103, 0xbda26c)
      indices.push(a, b, c)
    }
    for (let ear = 0; ear < (distant ? 0 : 2); ear++) {
      const sign = ear ? -1 : 1, y = .68 + ear * .27
      const a = vertex(.045, y, 0, 0x947443)
      const b = vertex(.052 + sign * .19, y + .14, -.04, 0xbd9658)
      const c = vertex(.052 + sign * .19, y + .13, .05, 0xc5a46b)
      const d = vertex(.051 + sign * .32, y + .28, 0, 0xc6ab72)
      indices.push(a, b, c, b, d, c)
    }
  }
  const model = new T.BufferGeometry()
  model.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  model.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  model.setIndex(indices)
  model.computeVertexNormals()
  return model
}
