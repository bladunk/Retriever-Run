import * as T from 'three'
import { placeOnTrail } from './trail.js'
import { fieldSpecies } from './wildlife-catalog.js'
import { encounterVisible } from './wildlife-encounters.js'
import { createEncounterArt } from './wildlife-art.js'
import { createWildlifeModels, livingModels } from './wildlife-models.js'

import { encounterApproach, encounterPose } from './wildlife-motion.js'
export { encounterApproach, encounterPose } from './wildlife-motion.js'

export function createLivingWilderness(scene, call, prewarmSound, probe, sightProbe, canPrepare) {
  const models = createWildlifeModels(probe, undefined, canPrepare)
  const transform = new T.Object3D()
  const limb = new T.Object3D()
  const matrix = new T.Matrix4()
  const position = new T.Vector3()
  const projected = new T.Vector3()
  const pose = {}
  const keys = []
  let active
  let departing
  let prepared
  let previousTime = -1
  let lastVoice = -Infinity
  let count = 0
  let nextSound
  let missedRig
  let rigEncounters = 0
  let fallbackEncounters = 0

  function retire(slot) {
    if (!slot) return
    slot.art.dispose()
    if (slot.model) {
      slot.model.root.removeFromParent()
      slot.model.mix.stopAllAction()
    }
  }
  function prepare(event) {
    const start = probe?.stamp()
    const art = createEncounterArt(fieldSpecies[event.species])
    probe?.operation('wildlife-art', event.species, start)
    return { event, art, seen: 0, recorded: false, sounded: false }
  }

  function update(time, distance, detail, mode, events, camera, observation) {
    const running = mode === 'running'
    const inspecting = mode === 'studio'
    const dt = Math.max(0, Math.min(.2, time - previousTime))
    if (time < previousTime || inspecting && active && !events.some(event => event.id === active.event.id)) {
      retire(active)
      retire(departing)
      retire(prepared)
      active = departing = prepared = undefined
      lastVoice = -Infinity
    }
    previousTime = time
    let upcoming
    let nearest = Infinity
    for (const event of events) {
      const ahead = event.distance - distance
      if (event.id !== active?.event.id && event.id !== departing?.event.id && ahead >= -3 && ahead < nearest && ahead < 110) { upcoming = event; nearest = ahead }
    }
    if (active && active.event.distance - distance < -encounterApproach(active.event.species)[1]) {
      retire(active)
      active = undefined
    }
    if (departing && departing.event.distance - distance < -encounterApproach(departing.event.species)[1]) {
      retire(departing)
      departing = undefined
    }
    // An open-water goose flock continues alongside the next anchored animal
    // for the rest of its flyby. Only one such flock can linger at a time.
    if (active && !departing && fieldSpecies[active.event.species].family === 'goose' && upcoming &&
        nearest < encounterApproach(upcoming.species)[0]) {
      departing = active
      active = undefined
    }
    if (running && upcoming?.species && upcoming.species !== nextSound) {
      nextSound = upcoming.species
      prewarmSound(nextSound)
    }
    if (!active && upcoming) {
      if (prepared?.event.id !== upcoming.id) {
        retire(prepared)
        prepared = prepare(upcoming)
      }
      if ((running || inspecting) && nearest < encounterApproach(upcoming.species)[0]) {
        active = prepared
        prepared = undefined
        active.model = detail > 0 ? models.ready(upcoming.species) : undefined
        if (livingModels[upcoming.species]) {
          if (active.model) rigEncounters++
          else {
            fallbackEncounters++
            if (upcoming.species !== 'mallard' && detail > 0) missedRig = upcoming.species
          }
        }
        probe?.operation('wildlife-visible', upcoming.species)
        scene.add(active.art.root)
        if (active.model) scene.add(active.model.root)
      }
    }
    count = 0
    sightProbe?.begin(time, running)
    if (departing) draw(departing, time, distance, detail, running, camera, observation, dt)
    if (active) {
      if (inspecting && detail > 0 && !active.model) {
        active.model = models.ready(active.event.species)
        if (active.model) scene.add(active.model.root)
      }
      draw(active, time, distance, detail, running, camera, observation, dt)
    }
  }

  function draw(slot, time, distance, detail, running, camera, observation, dt) {
    const { event, art, model } = slot
    slot.leaderInFrame = false
    slot.drawn = 0
    const animal = fieldSpecies[event.species]
    const ahead = event.distance - distance
    const individuals = Math.min(event.count, detail === 0 ? (animal.family === 'crane' ? 4 : 2) : detail === 1 ? 7 : 9)
    let bodies = 0, limbs = 0
    for (let n = 0; n < individuals; n++) {
      encounterPose(event, animal, ahead, time, n, pose)
      if (!pose.draw) continue
      placeOnTrail(position, event.distance + pose.along, pose.lateral, distance)
      position.y = pose.height
      sightProbe?.sample(event, animal, position, pose, camera)
      transform.position.copy(position)
      transform.rotation.set(pose.pitch, pose.yaw, pose.roll)
      transform.scale.setScalar(animal.size)
      transform.updateMatrix()
      if (n === 0) {
        projected.copy(position)
        projected.y += art.legs ? animal.size * .35 : .13
        projected.project(camera)
        const visible = encounterVisible(ahead + pose.along, projected.x, projected.y, projected.z, running)
        slot.leaderInFrame = visible
        slot.seen = visible ? slot.seen + dt : Math.max(0, slot.seen - dt)
        if (!slot.recorded && slot.seen >= .22) {
          observation(event)
          slot.recorded = true
        }
        if (!slot.sounded && visible && time - lastVoice > 3.8) {
          slot.sounded = true
          lastVoice = time
          call(event.species, { distance: Math.hypot(ahead, pose.lateral), x: position.x,
            movement: Math.sign(event.lateral), wings: pose.rig === 'Fly', volume: .75 })
        }
        if (model) {
          model.root.position.copy(position)
          model.root.rotation.copy(transform.rotation)
          model.root.scale.setScalar(animal.size / model.scale)
          const wanted = model.actions[pose.rig] ?? model.actions.Idle
          if (wanted && slot.action !== wanted) {
            wanted.reset().play()
            if (slot.action) wanted.crossFadeFrom(slot.action, .22, false)
            slot.action = wanted
          }
          slot.animationDebt = (slot.animationDebt ?? 0) + dt
          if (ahead < 30 || detail > 1 || slot.animationDebt >= 1 / 15) {
            model.mix.update(slot.animationDebt)
            slot.animationDebt = 0
          }
          model.root.visible = true
          slot.drawn++
          continue
        }
      }
      art.bodyMesh.setMatrixAt(bodies++, transform.matrix)
      slot.drawn++
      if (art.legs) {
        for (const side of [-1,1]) for (const end of [-1,1]) {
          limb.position.set(side*.105, animal.family === 'alligator' ? .137 : .345,end*.212)
          limb.rotation.set(Math.sin(time * 7.2 + (side === end ? 0 : Math.PI)) * (animal.family === 'alligator' ? .09 : .32),0,side*.12)
          limb.updateMatrix()
          art.appendageMesh.setMatrixAt(limbs++, matrix.multiplyMatrices(transform.matrix,limb.matrix))
        }
      } else if (pose.wing !== 0 || pose.rig === 'Glide') {
        for (const side of [-1,1]) {
          limb.position.set(side*.128,.046,.003)
          limb.rotation.set(0,side*.063,side*pose.wing)
          limb.scale.set(side,1,1)
          limb.updateMatrix()
          art.appendageMesh.setMatrixAt(limbs++, matrix.multiplyMatrices(transform.matrix,limb.matrix))
          limb.scale.setScalar(1)
        }
      }
    }
    if (model && !slot.drawn) model.root.visible = false
    art.bodyMesh.count = bodies
    art.appendageMesh.count = limbs
    art.bodyMesh.instanceMatrix.needsUpdate = Boolean(bodies)
    art.appendageMesh.instanceMatrix.needsUpdate = Boolean(limbs)
    count += slot.drawn
  }
  update.warmBreak = (renderer, camera, mode, detail, distance, events) => {
    if (detail === 0 || mode === 'running') return
    keys.length = 0
    if (active?.model) keys.push(active.event.species)
    if (mode === 'studio' && events[0] && livingModels[events[0].species] && !keys.includes(events[0].species))
      keys.push(events[0].species)
    if (mode === 'paused') {
      let nearest
      for (const event of events) {
        if (event.distance <= distance || event.id === active?.event.id || !livingModels[event.species]) continue
        if (!nearest || event.distance < nearest.distance) nearest = event
      }
      if (nearest && !keys.includes(nearest.species)) keys.push(nearest.species)
    }
    for (const species of ['mallard', missedRig, 'deer']) {
      if (species && keys.length < 2 && !keys.includes(species)) keys.push(species)
    }
    models.retain(keys)
    models.warm(renderer, camera, scene, active?.model)
  }
  update.invalidateGPU = models.invalidateGPU
  update.active = () => count
  update.metrics = () => ({ ...models.metrics(), rigEncounters, fallbackEncounters })
  update.stamp = () => active ? { ...active.event, drawn: active.drawn, model: Boolean(active.model),
    seen: active.seen, leaderInFrame: active.leaderInFrame } : null
  return update
}
