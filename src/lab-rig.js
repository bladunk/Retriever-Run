import * as T from 'three'
import { createPawPlanting } from './paw-planting.js'

const oneTurn = Math.PI * 2
const up = new T.Vector3(0, 1, 0)

const pitchAxis = new T.Vector3(1, 0, 0)

export function createLabradorRig(gltf) {
  const root = gltf.scene
  root.updateMatrixWorld(true)
  const bounds = new T.Box3().setFromObject(root, true)
  const floor = bounds.min.y
  const scale = 1.51 / (bounds.max.y - floor)

  const meshes = []
  root.traverse((node) => {
    if (!node.isSkinnedMesh) return
    node.frustumCulled = false
    node.material.roughness = .9
    node.material.metalness = 0
    meshes.push(node)
  })
  const planting = createPawPlanting(root, meshes)
  const mixer = new T.AnimationMixer(root)
  root.scale.setScalar(scale)
  root.rotation.y = Math.PI
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

  const body = root.getObjectByName('Body')
  let air = 0
  let idle = 1
  let groundCorrection = 0
  let compression = 0
  const lean = new T.Quaternion()
  const headPose = head.quaternion.clone()
  const bodyPose = body.quaternion.clone()
  const bodyPosition = body.position.clone()
  const restingFloor = Math.max(0, -floor * scale)
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
      air = groundCorrection = compression = 0
      idle = 0
    },
    pose({ dt, time, stride, airborne, jumpPhase, sliding, idle: resting, turn, landing, ground }) {
      const blend = -Math.expm1(-15 * dt)
      idle += (Number(resting) - idle) * blend
      air += (Number(airborne) - air) * -Math.expm1(-34 * dt)
      const low = sliding
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
      // Restore the blended layer before applying the next procedural adjustment.
      planting.restore()
      head.quaternion.copy(headPose)
      body.quaternion.copy(bodyPose)
      body.position.copy(bodyPosition)
      mixer.update(0)
      planting.remember()
      headPose.copy(head.quaternion)
      bodyPose.copy(body.quaternion)
      bodyPosition.copy(body.position)

      // The outer player group stays at terrain plus jump height. Only skeletal
      // joints lower into the crouch, and the rig child may receive upward support.
      body.position.y -= low * .88 + compression * .065
      body.quaternion.premultiply(lean.setFromAxisAngle(pitchAxis, low * .105))
      head.quaternion.multiply(lean.setFromAxisAngle(up, -turn * .08 + (resting ? .07 * Math.sin(time * .8) : 0)))
      root.position.y = restingFloor
      root.updateMatrixWorld(true)
      if (low > .001) planting.solve(low, ground)
      const correction = planting.support(ground + (low > .001 ? .030 : .014))
      groundCorrection = Math.max(correction, groundCorrection * Math.exp(-25 * dt))
      root.position.y += groundCorrection
    },
  }
}
