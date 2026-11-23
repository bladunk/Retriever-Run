import * as T from 'three'

export function createKennelView() {
  const room = new T.Scene()
  room.background = new T.Color(0x29382f)
  room.fog = new T.Fog(0x29382f, 5.5, 13)
  const sky = new T.HemisphereLight(0xd9e5df, 0x827055, 1.80)
  const key = new T.DirectionalLight(0xffdec1, 2.5)
  key.position.set(2, 4, -3)
  const rim = new T.DirectionalLight(0xcbdde5, 1.28)
  rim.position.set(-2, 2, 3)
  const floor = new T.Mesh(new T.PlaneGeometry(60, 60), new T.MeshStandardMaterial({ color: 0x494635, roughness: 1 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -.01
  room.add(sky, key, rim, floor)
  const orbit = new T.PerspectiveCamera(32, 1, .1, 25)
  const pose = { x: 0, z: 0, height: 0, ground: 0, heading: 0, turn: 0, stride: 0, sliding: 0,
    airborne: false, jumpPhase: 1, idle: true, landing: 0, time: 0, dt: 0 }
  let previous = -Infinity

  return {
    room,
    resize(renderer, width, height) {
      orbit.aspect = width / Math.max(1, height)
      orbit.updateProjectionMatrix()
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.15))
      renderer.setSize(width, height, false)
      previous = -Infinity
    },
    render(renderer, dog, ms, reduced) {
      const wall = ms - previous
      if (wall < 46) return
      const dt = Math.min(.085, wall / 1000)
      previous = ms
      pose.time += reduced ? 0 : dt
      pose.dt = dt
      const angle = 1.20 + (reduced ? 0 : .19 * Math.sin(pose.time * .37))
      const radius = Math.max(3.65, 6.3 / Math.max(.75, orbit.aspect))
      orbit.position.set(Math.sin(angle) * radius, 1.43, -Math.cos(angle) * radius)
      orbit.lookAt(0, .76, -.085)
      dog.pose(pose)
      renderer.render(room, orbit)
    },
  }
}
