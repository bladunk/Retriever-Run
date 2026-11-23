import { centerAt } from './trail.js'

const radians = Math.PI / 180

export function cameraLayout(aspect) {
  const portrait = aspect < 1
  const fov = portrait ? 64 : 50
  const back = portrait ? Math.max(9.15, 2.85 / (Math.tan(fov * radians / 2) * Math.max(.3, aspect))) : 6.5
  return { portrait, fov, back, height: portrait ? 4.54 + (back - 9.15) * .22 : 3.30,
    pitch: (portrait ? 6.85 : 10.2) * radians }
}

export function newCameraState() {
  return { heading: null, offset: 0, x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0 }
}

export function updateFollow(camera, layout, distance, laneOffset, dt, comfort) {
  const near = distance - 8
  const far = distance + (comfort ? 29 : 23)
  const desired = -Math.atan((centerAt(far) - centerAt(near)) / (far - near))
  if (camera.heading === null) camera.heading = desired
  const turn = (desired - camera.heading) * -Math.expm1(-(comfort ? 2.45 : 3.55) * dt)
  const turnLimit = (comfort ? .31 : .47) * dt
  camera.heading += Math.max(-turnLimit, Math.min(turnLimit, turn))
  const laneTarget = laneOffset * (comfort ? .09 : .24)
  camera.offset += (laneTarget - camera.offset) * -Math.expm1(-(comfort ? 2.8 : 4.5) * dt)

  const x = Math.sin(camera.heading)
  const z = Math.cos(camera.heading)
  camera.x = x * layout.back + z * camera.offset
  camera.z = z * layout.back - x * camera.offset
  camera.y = layout.height
  camera.tx = camera.x - x * 24
  camera.tz = camera.z - z * 24
  camera.ty = camera.y - Math.tan(layout.pitch) * 24
}
