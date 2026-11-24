import * as T from 'three'

function unpack(data) {
  const geometry = new T.BufferGeometry()
  for (const [name, { values, itemSize, normalized }] of Object.entries(data.buffers)) {
    geometry.setAttribute(name, new T.BufferAttribute(values, itemSize, normalized))
  }
  if (data.index) geometry.setIndex(new T.BufferAttribute(data.index, 1))
  geometry.computeBoundingSphere()
  return geometry
}

// Packet geometry belongs to a single tile. Its material and the instanced
// model geometries belong to shared registries and survive tile replacement.
export function replaceTileGeometry(mesh, data) {
  const previous = mesh.geometry
  mesh.geometry = data ? unpack(data) : new T.BufferGeometry()
  previous.dispose()
}
