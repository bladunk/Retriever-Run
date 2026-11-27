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
  const tip = new T.Object3D()
  const wingTransform = new T.Matrix4()
  const matrix = new T.Matrix4()
  const position = new T.Vector3()
  const projected = new T.Vector3()
  const pose = {}
  const keys = []
  let active
  let departing
  let prepared
  let migration
  let previousTime = -1
  let lastVoice = -Infinity
  let count = 0
  let nextSound
  let missedRig
  let rigEncounters = 0
  let fallbackEncounters = 0
  let proceduralEncounters = 0
  const fallbackReasons = {}

  function retire(slot) {
    if (!slot) return
    slot.art.dispose()
    if (slot.model) {
      slot.model.root.removeFromParent()
      slot.model.mix.stopAllAction()
    }
  }
  function prepare(event, detail) {
    const start = probe?.stamp()
    const art = createEncounterArt(fieldSpecies[event.species],event.count,detail === 0)
    probe?.operation('wildlife-art', event.species, start)
    return { event, art, seen: 0, recorded: false, sounded: false }
  }

  function update(time, distance, detail, mode, events, camera, observation, allowRigs = detail > 0, migrationEvent) {
    const running = mode === 'running'
    const inspecting = mode === 'studio'
    const dt = Math.max(0, Math.min(.2, time - previousTime))
    if (time < previousTime || inspecting && active && !events.some(event => event.id === active.event.id)) {
      retire(active)
      retire(departing)
      retire(prepared)
      retire(migration)
      active = departing = prepared = migration = undefined
      lastVoice = -Infinity
    }
    previousTime = time
    if (migration && (migrationEvent?.id !== migration.event.id || migration.event.distance-distance < -100)) {
      retire(migration)
      migration = undefined
    }
    if (!migration && (running || inspecting) && migrationEvent) {
      const ahead = migrationEvent.distance-distance
      if (ahead < 112 && ahead >= -3) {
        migration = prepare(migrationEvent,detail)
        if (running) prewarmSound(migrationEvent.species)
        scene.add(migration.art.root)
      }
    }
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
        prepared = prepare(upcoming,detail)
      }
      if ((running || inspecting) && nearest < encounterApproach(upcoming.species)[0]) {
        active = prepared
        prepared = undefined
        active.model = allowRigs ? models.ready(upcoming.species) : undefined
        if (livingModels[upcoming.species]) {
          if (active.model) rigEncounters++
          else {
            fallbackEncounters++
            const reason = allowRigs ? models.fallbackReason(upcoming.species) : 'battery saver'
            fallbackReasons[reason] = (fallbackReasons[reason] ?? 0) + 1
            active.fallbackReason = reason
            probe?.operation('wildlife-fallback', { species:upcoming.species, reason })
            if (upcoming.species !== 'mallard' && allowRigs) missedRig = upcoming.species
          }
        } else proceduralEncounters++
        probe?.operation('wildlife-visible', upcoming.species)
        scene.add(active.art.root)
        if (active.model) scene.add(active.model.root)
      }
    }
    count = 0
    sightProbe?.begin(time, running)
    if (migration) draw(migration, time, distance, detail, running, camera, observation, dt)
    if (departing) draw(departing, time, distance, detail, running, camera, observation, dt)
    if (active) {
      if (inspecting && allowRigs && !active.model) {
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
    const limit = event.migration ? [26,33,39][detail] : detail === 0 ? (animal.family === 'crane' ? 4 : 2) : detail === 1 ? 7 : 9
    const individuals = Math.min(event.count,limit)
    let bodies = 0, legs = 0, wings = 0
    for (let n = 0; n < individuals; n++) {
      encounterPose(event, animal, ahead, time, n, pose)
      if (!pose.draw) continue
      placeOnTrail(position, event.distance + pose.along, pose.lateral, distance)
      position.y = pose.height
      sightProbe?.sample(event, animal, position, pose, camera)
      transform.position.copy(position)
      transform.rotation.set(pose.pitch, pose.yaw, pose.roll, 'YXZ')
      transform.scale.setScalar(animal.size)
      transform.updateMatrix()
      if (n === 0 || event.migration && !slot.leaderInFrame && n%13 === 0) {
        projected.copy(position)
        projected.y += art.legs ? animal.size * .35 : .13
        projected.project(camera)
        const visible = encounterVisible(ahead + pose.along, projected.x, projected.y, projected.z, running, event.migration)
        slot.leaderInFrame = visible
        slot.seen = visible ? slot.seen + dt : Math.max(0, slot.seen - dt)
        if (!slot.recorded && slot.seen >= (event.migration ? .55 : .22)) {
          observation(event)
          slot.recorded = true
        }
        if (!slot.sounded && visible && (animal.family !== 'pheasant' || pose.state === 'takeoff' || pose.state === 'powered') &&
          (event.migration || time - lastVoice > 3.8)) {
          slot.sounded = true
          lastVoice = time
          call(event.species, { x: position.x,
            movement: Math.sign(event.lateral), wings: pose.rig === 'Fly' && !event.migration,
            distance: event.migration ? Math.min(54, Math.hypot(ahead,pose.lateral)) : Math.hypot(ahead,pose.lateral),
            near: animal.family === 'pheasant', volume: event.migration ? 1.08 : .79 })
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
          if (wanted && pose.rig === 'Fly') wanted.setEffectiveTimeScale(pose.cadence* wanted.getClip().duration)
          if (wanted && pose.rig === 'Gallop') wanted.setEffectiveTimeScale(.68 + pose.gait*.87)
          slot.animationDebt = (slot.animationDebt ?? 0) + dt
          if (ahead < 30 || detail > 1 || slot.animationDebt >= 1 / 15) {
            model.mix.update(slot.animationDebt)
            if (wanted && pose.rig === 'Fly') wanted.setEffectiveTimeScale(pose.cadence* wanted.getClip().duration)
          if (wanted && pose.rig === 'Gallop') wanted.setEffectiveTimeScale(.68 + pose.gait*.87)
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
        const moose = animal.family === 'moose'
        const alligator = animal.family === 'alligator'
        for (const side of [-1,1]) for (const end of [-1,1]) {
          const phase = (pose.stride + (moose ? (side > 0 ? .5 : 0) + (end > 0 ? .24 : 0)
            : (side > 0 ? .075 : 0) + (end > 0 ? .48 : 0)))%1
          const swing = phase > .60 ? Math.sin((phase-.60)*Math.PI/.4) : 0
          const angle = pose.gait*(alligator ? .16 : moose ? .43 : .67)*Math.cos(phase*2*Math.PI)
          const base = alligator ? .137 : moose ? .555 : .345
          limb.position.set(side*(moose ? .123 : .105),base*Math.cos(angle)+swing*pose.gait*(moose ? .097 : .113),end*.212)
          limb.rotation.set(angle,0,side*.055)
          limb.updateMatrix()
          art.legMesh.setMatrixAt(legs++,matrix.multiplyMatrices(transform.matrix,limb.matrix))
        }
      } else {
        if (art.legMesh) for (const side of [-1,1]) {
          if (pose.state === 'swim') break
          limb.position.set(side*.070,-.075,.043+pose.gait*.12)
          limb.rotation.set(-pose.gait*.94,0,side*.035)
          limb.updateMatrix()
          art.legMesh.setMatrixAt(legs++,matrix.multiplyMatrices(transform.matrix,limb.matrix))
        }
        if (pose.fold < .98) for (const side of [-1,1]) {
          limb.position.set(side*.124,.040,.009)
          limb.rotation.set(-.075,side*(.065+pose.fold*1.44),side*(pose.wing-pose.fold*.36))
          limb.scale.set(side,1,1)
          limb.updateMatrix()
          wingTransform.multiplyMatrices(transform.matrix,limb.matrix)
          art.wingMesh.setMatrixAt(wings,wingTransform)
          limb.scale.setScalar(1)
          tip.position.set(art.hinge,0,.004)
          tip.rotation.set(0,-pose.fold*.71,pose.tip)
          tip.updateMatrix()
          art.tipMesh.setMatrixAt(wings++,matrix.multiplyMatrices(wingTransform,tip.matrix))
        }
      }
    }
    if (model && !slot.drawn) model.root.visible = false
    for (const [mesh,amount] of [[art.bodyMesh,bodies],[art.legMesh,legs],[art.wingMesh,wings],[art.tipMesh,wings]]) {
      if (!mesh) continue
      mesh.count = amount
      mesh.visible = amount > 0
      mesh.instanceMatrix.needsUpdate = Boolean(amount)
    }
    count += slot.drawn
  }
  update.warmBreak = (renderer, camera, mode, detail, distance, events, allowRigs = detail > 0) => {
    if (!allowRigs || mode === 'running') return
    keys.length = 0
    if (active?.model) keys.push(active.event.species)
    if (departing?.model && keys.length < 2 && !keys.includes(departing.event.species)) keys.push(departing.event.species)
    if (mode === 'studio' && keys.length < 2 && events[0] && livingModels[events[0].species] && !keys.includes(events[0].species))
      keys.push(events[0].species)
    if (mode === 'paused') {
      let nearest
      for (const event of events) {
        if (event.distance <= distance || event.id === active?.event.id || !livingModels[event.species]) continue
        if (!nearest || event.distance < nearest.distance) nearest = event
      }
      if (nearest && keys.length < 2 && !keys.includes(nearest.species)) keys.push(nearest.species)
    }
    for (const species of ['mallard', missedRig, 'deer']) {
      if (species && keys.length < 2 && !keys.includes(species)) keys.push(species)
    }
    models.retain(keys)
    models.warm(renderer, camera, scene, active?.model)
  }
  update.invalidateGPU = models.invalidateGPU
  update.active = () => count
  update.migration = () => migration ? { drawn:migration.drawn, visible:migration.leaderInFrame, recorded:migration.recorded } : null
  update.metrics = () => ({ ...models.metrics(), rigEncounters, fallbackEncounters, proceduralEncounters, fallbackReasons:{ ...fallbackReasons } })
  update.stamp = () => active ? { ...active.event, drawn: active.drawn, model: Boolean(active.model),
    seen: active.seen, leaderInFrame: active.leaderInFrame, fallbackReason:active.model ? null : active.fallbackReason ?? 'no authored rig' } : null
  return update
}
