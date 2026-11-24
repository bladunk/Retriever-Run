import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

const size = 64
const opacity = new Uint8Array(size * size * 4)
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const dx = (x + .5) * 2 / size - 1
    const dy = (y + .5) * 2 / size - 1
    const contact = Math.max(0, 1 - (dx * 1.12) ** 2 - (dy * .96) ** 2) ** 3.2
    const penumbra = Math.max(0, 1 - ((dx - .20) * 1.35) ** 2 - (dy * 1.13) ** 2) ** 2.5
    const i = (y * size + x) * 4
    opacity.set([16, 20, 14, Math.round(contact * 172 + penumbra * 61)], i)
  }
}
const shadowMap = new T.DataTexture(opacity, size, size)
shadowMap.magFilter = T.LinearFilter
shadowMap.minFilter = T.LinearFilter
shadowMap.needsUpdate = true

const plane = new T.PlaneGeometry(1, 1)
const timberMaterial = new T.MeshBasicMaterial({ map: shadowMap, transparent: true,
  opacity: .62, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 })
const stamps = new Map()

export function contactShadow(kind = 'dog') {
  if (kind === 'dog') return new T.Mesh(plane, timberMaterial.clone())
  if (!stamps.has(kind)) {
    const patches = kind === 'leaning-tree' ? [[-3.16, 1.75, 1.19], [3.66, 1.54, 1.57]]
      : kind === 'branch' ? [[.91, 1.48, 1.28]] : kind === 'snowmobile' ? [[0, 1.65, 3.05]] : [[0, 2.26, 1.19]]
    const pieces = patches.map(([x, width, depth]) => plane.clone()
      .rotateX(-Math.PI / 2).scale(width, 1, depth).translate(x, .029, 0))
    stamps.set(kind, mergeGeometries(pieces))
    for (const part of pieces) part.dispose()
  }
  return new T.Mesh(stamps.get(kind), timberMaterial)
}
