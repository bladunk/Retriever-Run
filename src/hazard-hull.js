import { Box3, Vector3 } from 'three'
import { ConvexHull } from 'three/addons/math/ConvexHull.js'

export function hazardHull(name, points) {
  const hull = new ConvexHull().setFromPoints(points)
  const box = new Box3().setFromPoints(points)
  const { x, y, z } = box.getCenter(new Vector3())
  const { x: hx, y: hy, z: hz } = box.getSize(new Vector3()).multiplyScalar(.5)
  const planes = hull.faces.map(({ normal, constant }) =>
    ({ x: normal.x, y: normal.y, z: normal.z, limit: constant }))
  return { name, x, y, z, hx, hy, hz, hull, planes }
}
