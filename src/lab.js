import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import labUrl from './assets/labrador.glb?url'

const oneTurn = Math.PI * 2
const up = new T.Vector3(0, 1, 0)

export async function loadLabrador() {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(labUrl)
  const root = gltf.scene
  const model = root.children[0]
  root.updateMatrixWorld(true)
  const bounds = new T.Box3().setFromObject(root, true)
  const floor = bounds.min.y
  const scale = 1.51 / (bounds.max.y - floor)
  root.scale.setScalar(scale)
  root.rotation.y = Math.PI

  const meshes = []
  model.traverse((node) => {
    if (!node.isSkinnedMesh) return
    node.frustumCulled = false
    node.material.roughness = .9
    node.material.metalness = 0
    meshes.push(node)
  })
  const mixer = new T.AnimationMixer(root)
  const animations = {}
  for (const clip of gltf.animations) {
    const action = mixer.clipAction(clip)
    action.play()
    action.paused = true
    animations[clip.name] = action
  }
  const head = root.getObjectByName('Head')
  const neck = root.getObjectByName('Neck1')
  const collarMaterial = new T.MeshStandardMaterial({ color: 0x61442d, roughness: .70 })
  const collar = new T.Mesh(new T.TorusGeometry(.399, .025, 7, 32), collarMaterial)
  collar.position.set(0, .20, .002)
  collar.scale.y = 1.065
  collar.rotation.x = Math.PI / 2
  neck.add(collar)
  const tag = new T.Mesh(new T.CylinderGeometry(.097, .097, .027, 10),
    new T.MeshStandardMaterial({ color: 0xbb9755, roughness: .48, metalness: .45 }))
  tag.rotation.x = Math.PI / 2
  tag.position.set(.34, .13, .252)
  neck.add(tag)
  const bandana = new T.Mesh(new T.ConeGeometry(.40, .51, 3), collarMaterial)
  bandana.rotation.z = Math.PI
  bandana.position.set(0, .04, .36)
  neck.add(bandana)

  const feet = ['FFL', 'FFR', 'FFBL', 'FFBR'].map((name) => root.getObjectByName(name)).filter(Boolean)
  const body = root.getObjectByName('Body')
  let air = 0
  let low = 0
  let idle = 1
  let groundCorrection = 0
  let compression = 0
  const lean = new T.Quaternion()
  const weights = [1, 0, 0, 0]
  function action(clip, phase, weight) {
    clip.time = clip.getClip().duration * Math.min(.9995, Math.max(0, phase))
    clip.setEffectiveWeight(weight)
  }

  return {
    root,
    appearance(outfit) {
      const palette = { field: 0x594333, blaze: 0xdd792d, marsh: 0x616946, copper: 0x75452d }
      collarMaterial.color.setHex(palette[outfit] ?? palette.field)
      bandana.visible = outfit === 'marsh'
      for (const mesh of meshes) mesh.material.color.setHex(outfit === 'copper' ? 0xbb8053 : 0xffffff)
    },
    reset() {
      air = low = groundCorrection = compression = 0
      idle = 0
    },
    pose({ dt, time, stride, airborne, jumpPhase, sliding, idle: resting, turn, landing }) {
      const blend = -Math.expm1(-15 * dt)
      idle += (Number(resting) - idle) * blend
      air += (Number(airborne) - air) * -Math.expm1(-34 * dt)
      low = sliding
      root.scale.y = scale * (1 - .32 * low)
      compression = Math.max(landing, compression * Math.exp(-18 * dt))
      const grounded = (1 - idle) * (1 - air)
      weights[0] = idle
      weights[1] = grounded * (1 - low)
      weights[2] = (1 - idle) * air
      weights[3] = grounded * low

      action(animations.Idle, time / animations.Idle.getClip().duration % 1, weights[0])
      action(animations.Gallop, stride / oneTurn % 1, weights[1])
      action(animations.Jump, jumpPhase, weights[2])
      action(animations.Low, .58, weights[3])
      mixer.update(0)

      // The simulation supplies world travel and jump height. Animation contributes posture.
      body.position.y -= low * .27 + compression * .08
      head.quaternion.multiply(lean.setFromAxisAngle(up, -turn * .08 + (resting ? .07 * Math.sin(time * .8) : 0)))
      root.position.y = -floor * scale
      root.updateMatrixWorld(true)
      const baseHeight = root.parent.matrixWorld.elements[13]
      let lowest = Infinity
      for (const foot of feet) lowest = Math.min(lowest, foot.matrixWorld.elements[13] - baseHeight)
      const correction = airborne || !Number.isFinite(lowest) ? 0 : Math.max(0, .049 - lowest)
      groundCorrection += (correction - groundCorrection) * -Math.expm1(-22 * dt)
      root.position.y += Math.min(.18, groundCorrection)
    },
  }
}
