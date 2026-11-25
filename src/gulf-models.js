import meshes from './assets/environment/gulf-meshes.js'
import { packedGeometry } from './packed-geometry.js'

const resident = new Map()

// The immutable source meshes are shared by the tile worker and the
// renderer. Callers clone only when a tile needs its own transformed vertices.
export function gulfGeometry(name) {
  if (!resident.has(name)) resident.set(name, packedGeometry(meshes[name]))
  return resident.get(name)
}
