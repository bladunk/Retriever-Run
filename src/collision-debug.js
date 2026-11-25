import * as T from 'three'
import { distanceAtTime, primaryDuration, speedAtTime } from './difficulty.js'
import { centerAt, laneWidth } from './trail.js'
import { diveAge, diveWarning } from './dive.js'
import { hazardFrame, isWaterHazard, obstacleVolumes, playerFrame, playerVolumes, volumeY } from './collision.js'

export function collisionDebug(scene) {
  const flags = new URLSearchParams(location.search)
  if (flags.get('debug') !== 'collision') return null
  const seed = Number(flags.get('seed'))
  const requested = Number(flags.get('at'))
  const at = flags.has('at') && Number.isFinite(requested) ? Math.min(distanceAtTime(primaryDuration + 32), Math.max(0, requested)) : 0
  const showVolumes = flags.get('volumes') !== 'off'
  const inspectScenery = flags.get('scenery') === 'on'
  const panel = document.createElement('pre')
  panel.id = 'collision-debug'
  panel.setAttribute('aria-label', 'Collision diagnostics')
  panel.style.cssText = 'position:absolute;bottom:70px;left:9px;z-index:12;max-width:calc(100% - 18px);margin:0;padding:7px;color:#e5f8e5;background:#101510e8;white-space:pre-wrap;pointer-events:none;font:11px/1.35 monospace;'
  document.querySelector('#game').append(panel)
  const geometry = new T.EdgesGeometry(new T.BoxGeometry(2, 2, 2))
  const materials = {
    dog: new T.LineBasicMaterial({ color: 0x92f195, depthTest: false }),
    solid: new T.LineBasicMaterial({ color: 0xf1c064, depthTest: false }),
    hit: new T.LineBasicMaterial({ color: 0xff543d, depthTest: false }),
    water: new T.LineBasicMaterial({ color: 0x7ac9fd, depthTest: false }),
  }
  const lines = []
  const transform = {}
  let count = 0
  const skillEvents = []
  let death
  let last = ''
  const corner = new T.Vector3()
  const hullEdges = new WeakMap()
  const marker = new T.Mesh(new T.SphereGeometry(.10, 8, 6), new T.MeshBasicMaterial({ color: 0xff543d, depthTest: false }))
  marker.renderOrder = 16
  marker.visible = false
  scene.add(marker)

  function wireHull(part) {
    if (!hullEdges.has(part)) {
      const points = []
      for (const face of part.hull.faces) {
        const first = face.edge
        let edge = first
        do {
          for (const vertex of [edge.head(), edge.tail()]) {
            const { x, y, z } = vertex.point
            points.push(x, y, z)
          }
          edge = edge.next
        } while (edge !== first)
      }
      hullEdges.set(part, new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(points, 3)))
    }
    return hullEdges.get(part)
  }
  const absoluteHull = { x: 0, y: 0, z: 0, hx: 1, hy: 1, hz: 1 }
  const rockBounds = new T.Box3()

  function screen(camera) {
    corner.project(camera)
    return [(corner.x + 1) * .5, (.5 - corner.y * .5)]
  }

  function inspectSign(face, camera) {
    face.updateWorldMatrix(true, false)
    const corners = [[-.5, .5], [.5, .5], [.5, -.5], [-.5, -.5]].map(([x, y]) => {
      corner.set(x, y, 0).applyMatrix4(face.matrixWorld)
      return screen(camera)
    })
    return { ...face.parent.userData.notice, corners }
  }

  function inspectRock({ model, distance, lane, variant, turn }, camera) {
    model.updateWorldMatrix(true, true)
    const { min, max } = rockBounds.setFromObject(model, true)
    const points = []
    for (const x of [min.x, max.x]) for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) {
      corner.set(x, y, z)
      points.push(screen(camera))
    }
    return { distance, lane, variant, turn, points }
  }

  function draw(part, frame, kind, crouch = 0, meshGeometry = geometry) {
    if (!showVolumes) return
    let line = lines[count]
    if (!line) {
      line = new T.LineSegments(geometry, materials[kind])
      line.renderOrder = 15
      scene.add(line)
      lines.push(line)
    }
    count++
    line.geometry = meshGeometry
    const cos = Math.cos(frame.angle)
    const sin = Math.sin(frame.angle)
    line.material = materials[kind]
    line.position.set(frame.x + part.x * cos + part.z * sin, frame.y + volumeY(part, crouch),
      frame.z - part.x * sin + part.z * cos)
    line.scale.set(part.hx, part.hy * (1 - crouch * .42), part.hz)
    line.rotation.y = frame.angle
    line.visible = true
  }
  return {
    seed: flags.has('seed') && Number.isSafeInteger(seed) ? seed >>> 0 : null,
    reset() { death = undefined; skillEvents.length = 0 },
    skill(event) {
      skillEvents.push(event)
      if (skillEvents.length > 16) skillEvents.shift()
    },
    depart(run) {
      if (!at) return
      let low = 0, high = at / 10
      for (let i = 0; i < 24; i++) {
        const mid = (low + high) * .5
        if (distanceAtTime(mid) < at) low = mid
        else high = mid
      }
      run.distance = at
      run.elapsed = high
      run.speed = speedAtTime(high)
    },
    hit(details) {
      death = { ...details }
      console.info('Retriever Run impact', death)
    },
    draw(run, entities, mode, timings, camera, signs) {
      count = 0
      marker.visible = showVolumes && Boolean(death)
      if (marker.visible) marker.position.set(death.contactX + centerAt(death.origin) - centerAt(run.distance), death.contactY, death.contactZ + run.distance - death.origin)
      playerFrame(transform, run, run.distance)
      for (const part of playerVolumes()) draw(part, transform, death?.part === part.name ? 'hit' : 'dog', transform.depth)
      for (const part of playerVolumes(true)) draw(part, transform, death?.part === part.name ? 'hit' : 'water', transform.depth)
      let closest = null
      let flight = null
      for (const entity of entities) {
        if (entity.type === 'goose' && entity.lead && entity.distance >= run.distance - 2 && !flight) {
          flight = { lane: entity.lane, distance: entity.distance, safeLane: entity.safeLane,
            age: diveAge(entity, run.distance), warning: diveWarning(entity, run.distance) }
        }
        if (!entity.hazard || entity.distance < run.distance - 2 || entity.distance > run.distance + 24) continue
        const parts = obstacleVolumes(entity)
        if (!parts) continue
        if (!closest || entity.distance < closest.distance) closest = entity
        hazardFrame(transform, entity, run.distance, run.distance)
        const wet = isWaterHazard(entity.type)
        const hit = death?.obstacleDistance === entity.distance && death?.obstacleLane === entity.lane && death?.type === entity.type
        if (showVolumes) for (const part of parts) {
          const kind = hit && death.solid === part.name ? 'hit' : wet ? 'water' : 'solid'
          if (part.hull) draw(absoluteHull, transform, kind, 0, wireHull(part))
          else draw(part, transform, kind)
        }
      }
      for (let i = count; i < lines.length; i++) lines[i].visible = false
      const status = run.jump > 0 ? 'jump' : run.slide > 0 ? 'slide' : 'run'
      const text = [
        'Collision debug · ' + mode + ' · ' + status + ' · lane ' + (Math.round(run.x / laneWidth) + 2) + ' → ' + (run.lane + 2),
        's ' + run.distance.toFixed(2) + ' m · x ' + run.x.toFixed(2) + ' m · ' + timings.drawCalls + ' draws',
        death ? 'Impact at ' + death.distance.toFixed(3) + ' m · ' + death.part + ' → ' + death.type + ' ' + death.solid
          : closest ? closest.type + ' · ' + (closest.distance - run.distance).toFixed(2) + ' m ahead (center)' : 'No nearby hazard',
        flight ? 'Swoop in ' + (-flight.age).toFixed(2) + ' s · ' + (flight.warning ?? 'watch flock') : '',
        'Jump ' + run.jump.toFixed(2) + ' s · slide ' + run.slide.toFixed(2) + ' s',
        'Tiles ' + timings.tiles + ' · geometries ' + timings.geometries,
      ].join('\n')
      if (text !== last) { panel.textContent = text; last = text }
      // Exposed only when the diagnostics query is enabled.
      window.retrieverDebug = { mode, elapsed: run.elapsed, distance: run.distance, lateral: run.x, lane: run.lane, jump: run.jump, slide: run.slide,
        height: run.jump > 0 ? transformPlayerHeight(run) : 0, ticks: timings.ticks, contact: death, power: run.power, flight, speed: run.speed, tiles: timings.tiles,
        drawCalls: timings.drawCalls, geometries: timings.geometries, entities: entities.length }
      if (inspectScenery) {
        window.retrieverDebug.skill = [...skillEvents]
        window.retrieverDebug.upcoming = closest?.pattern
        window.retrieverDebug.hazards = entities.filter(item => item.hazard && item.distance > run.distance - 1 && item.distance < run.distance + 38)
          .map(({ type, lane, distance }) => ({ type, lane, distance }))
        window.retrieverDebug.world = timings.world?.()
        window.retrieverDebug.wildlife = timings.wildlife?.()
        camera.updateMatrixWorld()
        window.retrieverDebug.signs = signs.visible().map(face => inspectSign(face, camera))
        window.retrieverDebug.rocks = entities.filter(item => item.type === 'rock' && item.model?.visible &&
          item.distance > run.distance - 3 && item.distance < run.distance + 26).map(item => inspectRock(item, camera))
        window.retrieverDebug.inLaneSigns = entities.filter(item => item.hazard && item.model)
          .some(item => item.model.getObjectByName('Trail notice') || item.model.getObjectByName('Obstacle sign face'))
      }
    },
  }
}

const player = {}
function transformPlayerHeight(run) {
  return playerFrame(player, run, run.distance).y
}
