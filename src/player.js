import * as T from 'three'
import { createDog } from './dog.js'

const size = 64
const opacity = new Uint8Array(size * size * 4)
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const r = Math.hypot((x + .5) * 2 / size - 1, (y + .5) * 2 / size - 1)
    const i = (y * size + x) * 4
    opacity.set([14, 18, 14, Math.round(Math.max(0, 1 - r * r) ** 2.8 * 220)], i)
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
  let outfit = 'field'
  import('./lab.js').then(({ loadLabrador }) => loadLabrador()).then((loaded) => {
    rig = loaded
    rig.root.visible = false
    rig.appearance(outfit)
    root.add(rig.root)
  }).catch(() => {
    // The original model is available if the static asset cannot be loaded.
  })

  return {
    reset() { fallback.reset(); rig?.reset() },
    appearance(value) {
      outfit = value
      fallback.appearance(value)
      rig?.appearance(value)
    },
    pose(pose) {
      const height = pose.height
      shadow.position.set(pose.x, pose.ground + .039, pose.z)
      shadow.rotation.set(-Math.PI / 2, pose.heading, 0)
      shadow.scale.set(1.52 + height * .31, 2.83 + height * .28, 1)
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
