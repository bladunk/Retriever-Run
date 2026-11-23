import * as T from 'three'
import { placeOnTrail } from './trail.js'

export function createFootSpray(scene) {
  const particles = Array.from({ length: 32 }, () => ({ distance: 0, lane: 0, start: -1, phase: 0, water: false }))
  const spots = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0),
    new T.MeshBasicMaterial({ transparent: true, opacity: .57, depthWrite: false }), particles.length)
  spots.instanceMatrix.setUsage(T.DynamicDrawUsage)
  spots.frustumCulled = false
  spots.count = 0
  scene.add(spots)
  const dummy = new T.Object3D()
  const mud = new T.Color(0x7d6b53)
  const water = new T.Color(0xa0bcc1)
  let head = 0

  return {
    reset() {
      for (const particle of particles) particle.start = -1
      spots.count = 0
      head = 0
    },
    step(distance, lane, time, wet, detail) {
      const count = detail === 0 ? 3 : 5
      for (let i = 0; i < count; i++) {
        const particle = particles[head]
        head = (head + 1) % particles.length
        particle.distance = distance - .45 + .36 * Math.cos(head * 14.3)
        particle.lane = lane + .24 * Math.sin(head * 2.12)
        particle.start = time
        particle.phase = head * 2.39996
        particle.water = wet
      }
    },
    update(distance, time) {
      let count = 0
      for (const particle of particles) {
        if (particle.start < 0) continue
        const age = time - particle.start
        if (age > .40) {
          particle.start = -1
          continue
        }
        const spread = age * .98 * Math.sin(particle.phase)
        placeOnTrail(dummy.position, particle.distance - age * 1.4, particle.lane + spread, distance)
        const h = (.20 + .09 * Math.cos(particle.phase)) * Math.sin(Math.PI * age / .40)
        dummy.position.y = .04 + h
        dummy.scale.setScalar((particle.water ? .047 : .032) * (1 - age / .44))
        dummy.updateMatrix()
        spots.setMatrixAt(count, dummy.matrix)
        spots.setColorAt(count, particle.water ? water : mud)
        count++
      }
      spots.count = count
      if (count) {
        spots.instanceMatrix.needsUpdate = true
        spots.instanceColor.needsUpdate = true
      }
    },
  }
}
