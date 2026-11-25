import { Raycaster, Vector3 } from 'three'

// Local QA only. Project a representative body span, then check terrain,
// opaque structures and visible vegetation between the camera and the animal.
export function createWildlifeSightProbe(terrain, height) {
  const ray = new Raycaster()
  const center = new Vector3()
  const projected = new Vector3()
  const depthPoint = new Vector3()
  const origin = new Vector3()
  const hits = []
  const animals = new Map()
  const occluders = []
  let sampleAt = -Infinity
  let sampling = false

  return {
    begin(time, running) {
      sampling = running && (time < sampleAt || time - sampleAt >= .20)
      if (!sampling) return
      sampleAt = time
      animals.clear()
      terrain.sightMeshes(occluders)
    },
    sample(event, animal, position, pose, camera) {
      if (!sampling) return
      center.copy(position)
      center.y += animal.family === 'deer' || animal.family === 'moose' ? animal.size * .59 : animal.size * .14
      const depth = -depthPoint.copy(center).applyMatrix4(camera.matrixWorldInverse).z
      if (depth <= 0) return
      projected.copy(center).project(camera)
      // Wingspan is the readable silhouette for a bird in flight. Use a
      // conservative projected fraction of its modeled wing span.
      const inFlight = pose.rig === 'Fly' || pose.rig === 'Glide'
      const span = animal.size * (inFlight ? (animal.family === 'goose' || animal.family === 'crane' ? 1.48 : 1.27) : 1)
      const pixels = height() * camera.projectionMatrix.elements[5] * span / (2 * depth)
      const inFrame = Math.abs(projected.x) <= .92 && Math.abs(projected.y) <= .90 && Math.abs(projected.z) <= 1
      const sizeable = pixels >= 10
      let clear = false
      if (inFrame && sizeable) {
        origin.setFromMatrixPosition(camera.matrixWorld)
        for (const offset of [0, .22]) {
          center.y += offset * animal.size
          ray.far = origin.distanceTo(center) - .13
          ray.set(origin, depthPoint.copy(center).sub(origin).normalize())
          hits.length = 0
          ray.intersectObjects(occluders, false, hits)
          if (!hits.length) { clear = true; break }
        }
      }
      const previous = animals.get(event.id)
      if (!previous || (clear && !previous.clear) || (clear === previous.clear && inFrame && pixels > previous.pixels)) {
        animals.set(event.id, { id: event.id, species: animal.id, rarity: event.rarity, pixels, inFrame, sizeable, clear })
      }
    },
    stamp() { return { t: sampleAt, animals: [...animals.values()] } },
  }
}
