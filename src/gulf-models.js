import * as T from 'three'
import meshes from './assets/environment/gulf-meshes.js'

const resident = new Map()
const bytes = base64 => Uint8Array.from(atob(base64), char => char.charCodeAt(0))
const unpack = (base64, scale) => Float32Array.from(new Int16Array(bytes(base64).buffer), value => value / scale)

// The immutable source meshes are shared by the tile worker and the
// renderer. Callers clone only when a tile needs its own transformed vertices.
export function gulfGeometry(name) {
  if (resident.has(name)) return resident.get(name)
  const source = meshes[name]
  const mesh = new T.BufferGeometry()
  mesh.setAttribute('position', new T.BufferAttribute(unpack(source.position, 3072), 3))
  mesh.setAttribute('uv', new T.BufferAttribute(unpack(source.uv, 4096), 2))
  mesh.setAttribute('normal', new T.BufferAttribute(unpack(source.normal, 32767), 3))
  mesh.setAttribute('color', new T.BufferAttribute(Float32Array.from(bytes(source.color), value => value / 255), 3))
  mesh.setIndex(new T.BufferAttribute(new Uint16Array(bytes(source.index).buffer), 1))
  mesh.computeBoundingSphere()
  mesh.userData.surface = source.layer
  resident.set(name, mesh)
  return mesh
}
