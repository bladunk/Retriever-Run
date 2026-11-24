import * as T from 'three'
import { createPawPlanting } from './paw-planting.js'
import { collarBuckle, tintLabradorCoat } from './kennel-material.js'
import { createWorkingVest } from './working-vest.js'

const oneTurn = Math.PI * 2
const up = new T.Vector3(0, 1, 0)

const pitchAxis = new T.Vector3(1, 0, 0)
const bankAxis = new T.Vector3(0, 0, 1)

export function createLabradorRig(gltf) {
  const root = gltf.scene
  root.updateMatrixWorld(true)
  const bounds = new T.Box3().setFromObject(root, true)
  const floor = bounds.min.y
  const scale = 1.51 / (bounds.max.y - floor)

  const meshes = []
  const dressMesh = []
  root.traverse((node) => {
    if (!node.isSkinnedMesh) return
    node.frustumCulled = false
    meshes.push(node)
    dressMesh.push(tintLabradorCoat(node.material))
  })
  const dressVest = meshes.map(createWorkingVest)
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
  const secondaryMotion = ['Ear2L', 'Ear2R', 'Tail4'].map(name => {
    const bone = root.getObjectByName(name)
    return { bone, base: bone.quaternion.clone() }
  })
  const collarMaterial = new T.MeshStandardMaterial({ color: 0x61442d, roughness: .70 })
  const collar = new T.Mesh(new T.TorusGeometry(.399, .025, 7, 32), collarMaterial)
  collar.position.set(0, .20, .002)
  collar.scale.y = 1.065
  collar.rotation.x = Math.PI / 2
  neck.add(collar)
  const brass = new T.MeshStandardMaterial({ color: 0xbb9755, roughness: .48, metalness: .45 })
  const tag = new T.Mesh(new T.CylinderGeometry(.097, .097, .027, 10), brass)
  tag.rotation.x = Math.PI / 2
  tag.position.set(.34, .13, .252)
  neck.add(tag)
  const buckle = collarBuckle(brass)
  neck.add(buckle)
  const bandana = new T.Mesh(new T.ConeGeometry(.40, .51, 3), collarMaterial)
  bandana.rotation.z = Math.PI
  bandana.position.set(0, .04, .36)
  neck.add(bandana)

  const body = root.getObjectByName('Body')
  let air = 0
  let idle = 1
  let groundCorrection = 0
  let compression = 0
  let earFollow = 0
  let banking = 0
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
    appearance(gear) {
      collarMaterial.color.setHex(gear.collar.color)
      bandana.visible = Boolean(gear.collar.bandana)
      buckle.visible = Boolean(gear.collar.buckle)
      tag.visible = !buckle.visible
      for (const dress of dressMesh) dress(gear.coat)
      for (const dress of dressVest) dress(gear.vest)
    },
    reset() {
      air = groundCorrection = compression = earFollow = banking = 0
      idle = 0
    },
    pose({ dt, time, stride, airborne, jumpPhase, sliding, idle: resting, turn, landing, ground, wet = 0 }) {
      const blend = -Math.expm1(-15 * dt)
      idle += (Number(resting) - idle) * blend
      air += (Number(airborne) - air) * -Math.expm1(-34 * dt)
      const low = sliding
      compression = Math.max(landing, compression * Math.exp(-18 * dt))
      const grounded = (1 - idle) * (1 - air)
      banking += (T.MathUtils.clamp(turn * .054, -.097, .097) * (1 - .40 * low) - banking) * blend
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
      for (const { bone, base } of secondaryMotion) bone.quaternion.copy(base)
      mixer.update(0)
      for (const { bone, base } of secondaryMotion) base.copy(bone.quaternion)
      planting.remember()
      headPose.copy(head.quaternion)
      bodyPose.copy(body.quaternion)
      bodyPosition.copy(body.position)

      // The outer player group stays at terrain plus jump height. Only skeletal
      // joints lower into the crouch, and the rig child may receive upward support.
      body.position.y -= low * .88 + compression * .065
      body.quaternion.premultiply(lean.setFromAxisAngle(pitchAxis, low * .105))
      body.quaternion.premultiply(lean.setFromAxisAngle(bankAxis, banking))
      head.quaternion.multiply(lean.setFromAxisAngle(up, -turn * .08 + (resting ? .07 * Math.sin(time * .8) : 0)))
      head.quaternion.multiply(lean.setFromAxisAngle(pitchAxis, compression * .040 - .026 * air * Math.sin(jumpPhase * Math.PI)))
      const activeEars = (1 - idle) * (1 - .82 * low)
      const earRoll = activeEars * (.096 * Math.sin(stride * 2 - .79) + .041 * air + compression * .047)
      earFollow += (earRoll - earFollow) * -Math.expm1(-23 * dt)
      secondaryMotion[0].bone.quaternion.multiply(lean.setFromAxisAngle(pitchAxis, earFollow + idle * .021 * Math.sin(time * 2.1)))
      secondaryMotion[1].bone.quaternion.multiply(lean.setFromAxisAngle(pitchAxis, earFollow - idle * .022 * Math.sin(time * 1.6)))
      const tailSway = idle * .045 * Math.sin(time * 2.6) + grounded * (1 - low) * .032 * Math.sin(stride - .7)
      secondaryMotion[2].bone.quaternion.multiply(lean.setFromAxisAngle(up, tailSway))
      root.position.y = restingFloor
      root.updateMatrixWorld(true)
      if (low > .001) planting.solve(low, ground)
      const correction = planting.support(ground + (low > .001 ? .030 : .014))
      groundCorrection = Math.max(correction, groundCorrection * Math.exp(-25 * dt))
      root.position.y += groundCorrection
      for (const mesh of meshes) mesh.material.roughness = .91 - wet * .19
    },
  }
}
