import * as T from 'three'
import { createDog } from './dog.js'
import { gearAppearance } from './kennel-material.js'

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

export function createPlayer(scene) {
  const fallback = createDog(scene)
  const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({
    map: shadowMap, transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
  }))
  shadow.rotation.order = 'YXZ'
  scene.add(shadow)
  const root = new T.Group()
  scene.add(root)
  let rig
  let gear = gearAppearance()
  import('./lab.js').then(({ loadLabrador }) => loadLabrador()).then((loaded) => {
    rig = loaded
    rig.root.visible = false
    rig.appearance(gear)
    root.add(rig.root)
  }).catch(() => {
    // The original model is available if the static asset cannot be loaded.
  })

  return {
    reset() { fallback.reset(); rig?.reset() },
    moveTo(target) { target.add(root, shadow, fallback.root) },
    appearance(value) {
      gear = gearAppearance(value)
      fallback.appearance(gear)
      rig?.appearance(gear)
    },
    pose(pose) {
      const height = pose.height
      shadow.position.set(pose.x, pose.ground + .039, pose.z)
      shadow.rotation.set(-Math.PI / 2, pose.heading, 0)
      shadow.scale.set(1.63 + height * .32, 2.86 + height * .29, 1)
      shadow.material.opacity = .68 / (1 + height * 1.8)
      if (!rig) {
        fallback.pose(pose)
        return
      }
      fallback.root.visible = false
      rig.root.visible = true
      root.position.set(pose.x, pose.ground + height, pose.z)
      root.rotation.y = pose.heading
      root.updateWorldMatrix(true, false)
      rig.pose(pose)
    },
  }
}
