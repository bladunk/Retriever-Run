import * as T from 'three'

export function createKennelView() {
  const room = new T.Scene()
  room.background = new T.Color(0x283831)
  room.fog = new T.FogExp2(0x283831, .10)
  const sky = new T.HemisphereLight(0xd8e6e2, 0x80654a, 1.90)
  const key = new T.DirectionalLight(0xffe2ca, 2.55)
  key.position.set(2.6, 3.8, -4.2)
  const rim = new T.DirectionalLight(0xcce7e0, 1.53)
  rim.position.set(-2.3, 2.6, 3.4)
  const floorMaterial = new T.MeshStandardMaterial({ color: 0x4d4232, roughness: .96 })
  floorMaterial.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec2 stagePoint;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nstagePoint = position.xy;')
    shader.fragmentShader = 'varying vec2 stagePoint;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float ambient = 1. - smoothstep(1.2,6.2,length(stagePoint * vec2(.70,1.)));
        float grain = 1. + sin(stagePoint.y*5.3 + .27*sin(stagePoint.x*12.6))*.055;
        diffuseColor.rgb *= (.61 + ambient*.42) * grain;
      `)
  }
  const floor = new T.Mesh(new T.PlaneGeometry(60, 60), floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -.01
  room.add(sky, key, rim, floor)
  const orbit = new T.PerspectiveCamera(32, 1, .1, 25)
  const pose = { x: 0, z: 0, height: 0, ground: 0, heading: 0, turn: 0, stride: 0, sliding: 0,
    airborne: false, jumpPhase: 1, idle: true, landing: 0, time: 0, dt: 0 }
  let previous = -Infinity
  let angle = 1.06
  let targetAngle = angle
  let pointer
  let touchX
  let stage

  function rotate(event) {
    if (event.pointerId !== pointer) return
    targetAngle -= (event.clientX - touchX) * .016
    touchX = event.clientX
  }
  function start(event) {
    if (!event.isPrimary || event.button !== 0) return
    pointer = event.pointerId
    touchX = event.clientX
    stage.setPointerCapture(pointer)
  }
  function stop() { pointer = undefined }
  function onKey(event) {
    if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return
    event.preventDefault()
    targetAngle += (event.key === 'ArrowRight' ? 1 : -1) * Math.PI / 6
  }

  function bind(target, method) {
    for (const [name, listener] of [['pointerdown', start], ['pointermove', rotate], ['pointerup', stop],
      ['pointercancel', stop], ['lostpointercapture', stop], ['keydown', onKey]]) target[method](name, listener)
  }

  return {
    room,
    attach(target) {
      if (stage) bind(stage, 'removeEventListener')
      stop()
      stage = target
      if (stage) bind(stage, 'addEventListener')
    },
    resize(renderer, width, height) {
      orbit.aspect = width / Math.max(1, height)
      orbit.updateProjectionMatrix()
      renderer.setDrawingBufferSize(width, height, Math.min(devicePixelRatio, 1.35))
      previous = -Infinity
    },
    render(renderer, dog, ms, reduced) {
      const wall = ms - previous
      if (wall < 46) return
      const dt = Math.min(.085, wall / 1000)
      previous = ms
      pose.time += reduced ? 0 : dt
      pose.dt = dt
      angle += (targetAngle - angle) * (reduced ? 1 : -Math.expm1(-13 * dt))
      const radius = Math.max(3.5, 6.05 / Math.max(.81, orbit.aspect))
      orbit.position.set(Math.sin(angle) * radius, 1.51, -Math.cos(angle) * radius)
      orbit.lookAt(0, .78, -.11)
      dog.pose(pose)
      renderer.render(room, orbit)
    },
  }
}
