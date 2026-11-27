import { BufferAttribute, Mesh, PlaneGeometry, Vector3 } from 'three'
import { hazardFrame, obstacleOffset, obstacleVolumes } from './collision.js'
import { headingAt, placeOnTrail, trailHeight } from './trail.js'

const volumes = obstacleVolumes({ type: 'puddle' })
export const puddleWidths = new Vector3(...volumes.map(part => part.hx))
export const puddleLengths = new Vector3(...volumes.map(part => part.hz))
export const puddleMargin = .16

export function createPuddleSurface(material) {
  const geometry = new PlaneGeometry((puddleWidths.x + puddleMargin)*2, (puddleLengths.z + puddleMargin)*2, 8, 8)
    .rotateX(-Math.PI / 2)
  geometry.setAttribute('marshDepth', new BufferAttribute(new Float32Array(81).fill(3), 1))
  geometry.name = 'Conforming trail puddle'
  const mesh = new Mesh(geometry, material)
  mesh.name = 'Trail puddle'
  return mesh
}

export function preparePuddle(surface, entity) {
  const points = surface.geometry.attributes.position
  const pose = hazardFrame({}, entity, entity.distance, entity.distance)
  const sample = {}
  const cos = Math.cos(pose.angle), sin = Math.sin(pose.angle)
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i), z = points.getZ(i)
    const worldX = pose.x + cos*x + sin*z, worldZ = pose.z - sin*x + cos*z
    // Invert the same curved lane transform used by the terrain lattice.
    let at = entity.distance - worldZ, lateral = obstacleOffset(entity) + x
    for (let j = 0; j < 4; j++) {
      const heading = headingAt(at)
      placeOnTrail(sample, at, 0, entity.distance)
      lateral = (worldX - sample.x) / Math.cos(heading)
      at = entity.distance - worldZ - Math.sin(heading)*lateral
    }
    points.setY(i, trailHeight(at, lateral) - pose.y + .036)
  }
  points.needsUpdate = true
  surface.geometry.computeBoundingSphere()
}
