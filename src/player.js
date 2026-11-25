import * as T from 'three'
import { contactShadow } from './contact-shadow.js'
import { createDog } from './dog.js'
import { gearAppearance } from './kennel-material.js'

export function createPlayer(scene, breed = 'lab') {
  const fallback = createDog(scene)
  const shadow = contactShadow()
  shadow.rotation.order = 'YXZ'
  scene.add(shadow)
  const root = new T.Group()
  scene.add(root)
  let rig
  let gear = gearAppearance()
  import('./lab.js').then(({ loadLabrador }) => loadLabrador(breed)).then((loaded) => {
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
