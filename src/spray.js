import * as T from 'three'
import { placeOnTrail, trailHeight } from './trail.js'

export function createFootSpray(scene) {
  const particles = Array.from({ length: 32 }, () => ({ distance: 0, lane: 0, start: -1, phase: 0, surface: 'mud' }))
  const spots = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0),
    new T.MeshBasicMaterial({ transparent: true, opacity: .57, depthWrite: false }), particles.length)
  spots.instanceMatrix.setUsage(T.DynamicDrawUsage)
  spots.frustumCulled = false
  spots.count = 0
  scene.add(spots)
  const dummy = new T.Object3D()
  const colors = Object.fromEntries(Object.entries({
    mud:0x7d6b53, splash:0xa0bcc1, gravel:0xb0a084, sand:0xc2a77a,
    dirt:0x95755a, grass:0x88794b, snow:0xc8d6d8, frost:0xb5bfb5, pickup:0xf4c77c,
  }).map(([name, color]) => [name, new T.Color(color)]))
  let head = 0

  return {
    reset() {
      for (const particle of particles) particle.start = -1
      spots.count = 0
      head = 0
    },
    pickup(distance, lane, time) {
      for (let i = 0; i < 3; i++) {
        const particle = particles[head]
        head = (head + 1) % particles.length
        Object.assign(particle, { distance, lane, start: time, phase: head * 2.39996, surface: 'pickup' })
      }
    },
    step(distance, lane, time, wet, detail, surface = 'mud') {
      const count = detail === 0 ? 3 : 5
      for (let i = 0; i < count; i++) {
        const particle = particles[head]
        head = (head + 1) % particles.length
        particle.distance = distance - .45 + .36 * Math.cos(head * 14.3)
        particle.lane = lane + .24 * Math.sin(head * 2.12)
        particle.start = time
        particle.phase = head * 2.39996
        particle.surface = wet ? 'splash' : surface
      }
    },
    update(distance, time) {
      let count = 0
      for (const particle of particles) {
        if (particle.start < 0) continue
        const age = time - particle.start
        if (age < 0) continue
        if (age > .40) {
          particle.start = -1
          continue
        }
        const spread = age * .98 * Math.sin(particle.phase)
        const at = particle.distance - age * 1.4
        const lateral = particle.lane + spread
        placeOnTrail(dummy.position, at, lateral, distance)
        const h = (.20 + .09 * Math.cos(particle.phase)) * Math.sin(Math.PI * age / .40)
        dummy.position.y = trailHeight(at, lateral) + .024 + h + (particle.surface === 'pickup' ? .55 : 0)
        dummy.scale.setScalar((particle.surface === 'splash' ? .047 : .032) * (1 - age / .44))
        dummy.updateMatrix()
        spots.setMatrixAt(count, dummy.matrix)
        spots.setColorAt(count, colors[particle.surface] ?? colors.mud)
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
