import * as T from 'three'
import { placeOnTrail } from './trail.js'
import { fieldSpecies } from './wildlife-catalog.js'
import { encounterVisible } from './wildlife-encounters.js'
import { createEncounterArt } from './wildlife-art.js'
import { createWildlifeModels, livingModels } from './wildlife-models.js'

const flightFamily = new Set(['crane','goose','raptor'])
const approaches = {
  deer: [64, 56], pheasant: [62, 42], goose: [78, 88], duck: [52, 36],
  crane: [70, 56], raptor: [67, 50],
}
const defaultApproach = [47, 12]
export const encounterApproach = species => approaches[fieldSpecies[species]?.family] ?? defaultApproach

export function encounterPose(event, animal, ahead, elapsed, unit, out) {
  const side = Math.sign(event.lateral)
  const phase = elapsed * 1.35 + event.seed * .078 + unit * 2.117
  const flight = flightFamily.has(animal.family) || event.kind === 'flyover'
  const group = unit > 0 ? Math.ceil(unit / 2) : 0
  const formation = unit % 2 ? 1 : -1
  out.offset = unit ? formation * group * (animal.family === 'crane' ? 1.87 : .80) : 0
  out.along = group * (flight ? -1.48 : .88)
  out.height = event.height
  out.lateral = event.lateral + out.offset
  out.yaw = side * -.71
  out.roll = 0
  out.pitch = 0
  out.wing = 0
  out.rig = 'Idle'
  out.draw = true
  if (animal.family === 'pheasant') {
    const flush = Math.max(0, 43 - ahead)
    out.draw = flush > 0
    out.along += flush * .68
    out.height += Math.min(5.3, flush ** 1.35 * .030)
    out.lateral += side * (Math.min(1.8, flush * .030) + Math.max(0, flush - 56) * .61)
    out.yaw = -side * (1.37 - Math.min(.42, flush * .013))
    out.pitch = Math.max(0,.44-flush*.015)
    out.wing = .63 + .35*Math.sin(phase*6.4)
    out.rig = 'Fly'
  } else if (flight) {
    const crossing = 49 - ahead
    const forward = Math.max(0, crossing)
    out.along += forward * .70
    out.lateral += side * (Math.max(-1.3, crossing * .045) + Math.max(0, forward - 80) * .47)
    out.height += Math.sin(phase * .47) * .27 + .016 * crossing
    if (animal.family === 'crane' || animal.family === 'raptor') out.height += 3.05
    out.roll = side * .082 * Math.sin(crossing*.16)
    out.pitch = .05 * Math.sin(phase*.65)
    out.yaw = -side * .87
    out.wing = (animal.family === 'raptor' ? .34 : .51) * (.72 + .28*Math.sin(phase*.46)) * Math.sin(phase*4.8)
    out.rig = animal.family === 'raptor' && Math.sin(phase*.45) > -.31 ? 'Glide' : 'Fly'
  } else if (animal.family === 'deer') {
    const run = Math.max(0, 37 - ahead)
    out.lateral += side * (Math.min(1.1, run * .021) + Math.max(0, run - 62) * .50)
    out.along += run * .72
    out.yaw = -side * (run > 0 ? .99 : .51)
    out.rig = run > 0 ? 'Gallop' : 'Eating'
    out.height += Math.max(0, Math.sin(phase*5.0)) * Math.min(.11, run * .033)
  } else if (animal.family === 'moose' || animal.family === 'alligator') {
    out.lateral += side * (.15 + .18 * Math.sin(phase * .27))
    out.along += (-ahead + 25) * .026
    out.rig = animal.family === 'moose' ? 'Walk' : 'Idle'
  } else {
    out.lateral += side * Math.sin(phase * .42) * .33
    out.along += Math.sin(phase * .55) * .35
    out.height += animal.family === 'wader' ? .13 : Math.sin(phase * 1.5) * .028 + .078
    if (animal.id === 'mallard' && ahead < 23 - group) {
      const takeoff = 23 - group - ahead
      out.height += Math.min(5.0, .105 * takeoff ** 1.26)
      out.lateral += side * (takeoff * .031 + Math.max(0, takeoff - 24) * .26)
      out.along += takeoff * .63
      out.pitch = .22 - Math.min(.20, takeoff * .013)
      out.wing = .48 + .42 * Math.sin(phase * 6.4)
      out.rig = 'Fly'
    }
  }
  // The whole local flock stays outside the edge of the playable trail.
  out.lateral = side * Math.max(4.82, side * out.lateral)
  return out
}

export function createLivingWilderness(scene, call, prewarmSound, probe) {
  const models = createWildlifeModels(probe)
  const transform = new T.Object3D()
  const limb = new T.Object3D()
  const matrix = new T.Matrix4()
  const position = new T.Vector3()
  const projected = new T.Vector3()
  const pose = {}
  const keys = []
  let active
  let prepared
  let previousTime = -1
  let lastVoice = -Infinity
  let count = 0
  let nextSound
  let leaderInFrame = false

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

  function update(time, distance, detail, running, events, camera, observation) {
    const dt = Math.max(0, Math.min(.2, time - previousTime))
    if (time < previousTime) {
      retire(active)
      retire(prepared)
      active = prepared = undefined
      lastVoice = -Infinity
    }
    previousTime = time
    let upcoming
    let nearest = Infinity
    for (const event of events) {
      const ahead = event.distance - distance
      if (event.id !== active?.event.id && ahead >= -3 && ahead < nearest && ahead < 110) { upcoming = event; nearest = ahead }
    }
    if (active && active.event.distance - distance < -encounterApproach(active.event.species)[1]) {
      retire(active)
      active = undefined
    }
    // Once an encounter is shown, keep the selected model until behind the
    // camera. Only prefetch the next reachable appearance.
    keys.length = 0
    if (active?.model) keys.push(active.event.species)
    if (detail > 0 && upcoming && livingModels[upcoming.species] && !keys.includes(upcoming.species)) keys.push(upcoming.species)
    models.retain(keys)
    if (running && upcoming?.species && upcoming.species !== nextSound) {
      nextSound = upcoming.species
      prewarmSound(nextSound)
    }
    if (!active && upcoming) {
      if (prepared?.event.id !== upcoming.id) {
        retire(prepared)
        prepared = prepare(upcoming)
      }
      const model = detail > 0 ? models.get(upcoming.species) : undefined
      const warm = model?.warmup
      const preparingRig = !warm || warm.pending || warm.geometry < warm.geometries.length
      const waitingForModel = detail > 0 && livingModels[upcoming.species] && preparingRig && nearest > 35
      if (running && nearest < encounterApproach(upcoming.species)[0] && !waitingForModel) {
        active = prepared
        prepared = undefined
        active.model = model
        probe?.operation('wildlife-visible', upcoming.species)
        scene.add(active.art.root)
        if (active.model) scene.add(active.model.root)
      }
    }
    count = 0
    leaderInFrame = false
    if (!active) return
    const { event, art, model } = active
    const animal = fieldSpecies[event.species]
    const ahead = event.distance - distance
    const individuals = Math.min(event.count, detail === 0 ? (animal.family === 'crane' ? 4 : 2) : detail === 1 ? 7 : 9)
    let bodies = 0, limbs = 0
    for (let n = 0; n < individuals; n++) {
      encounterPose(event, animal, ahead, time, n, pose)
      if (!pose.draw) continue
      placeOnTrail(position, event.distance + pose.along, pose.lateral, distance)
      position.y = pose.height
      transform.position.copy(position)
      transform.rotation.set(pose.pitch, pose.yaw, pose.roll)
      transform.scale.setScalar(animal.size)
      transform.updateMatrix()
      if (n === 0) {
        projected.copy(position)
        projected.y += art.legs ? animal.size * .35 : .13
        projected.project(camera)
        const visible = encounterVisible(ahead + pose.along, projected.x, projected.y, projected.z, running)
        leaderInFrame = visible
        active.seen = visible ? active.seen + dt : Math.max(0, active.seen - dt)
        if (!active.recorded && active.seen >= .22) {
          observation(event)
          active.recorded = true
        }
        if (!active.sounded && visible && time - lastVoice > 3.8) {
          active.sounded = true
          lastVoice = time
          call(event.species, { distance: Math.hypot(ahead, pose.lateral), x: position.x,
            movement: Math.sign(event.lateral), wings: pose.rig === 'Fly', volume: .75 })
        }
        if (model) {
          model.root.position.copy(position)
          model.root.rotation.copy(transform.rotation)
          model.root.scale.setScalar(animal.size / model.scale)
          const wanted = model.actions[pose.rig] ?? model.actions.Idle
          if (wanted && active.action !== wanted) {
            wanted.reset().play()
            if (active.action) wanted.crossFadeFrom(active.action, .22, false)
            active.action = wanted
          }
          if (ahead < 30 || detail > 1 || Math.floor(time * 15) !== Math.floor((time - dt) * 15)) model.mix.update(ahead < 30 || detail > 1 ? dt : 1 / 15)
          model.root.visible = true
          count++
          continue
        }
      }
      art.bodyMesh.setMatrixAt(bodies++, transform.matrix)
      count++
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
    if (model && !count) model.root.visible = false
    art.bodyMesh.count = bodies
    art.appendageMesh.count = limbs
    art.bodyMesh.instanceMatrix.needsUpdate = Boolean(bodies)
    art.appendageMesh.instanceMatrix.needsUpdate = Boolean(limbs)
  }
  update.warm = (renderer, camera) => models.warm(renderer, camera, scene, active?.model)
  update.active = () => count
  update.metrics = models.metrics
  update.stamp = () => active ? { ...active.event, drawn: count, model: Boolean(active.model),
    seen: active.seen, leaderInFrame } : null
  return update
}
