import * as T from 'three'

const sphere = new T.SphereGeometry(1, 20, 12)
const textureSize = 64

function coatTexture() {
  const bytes = new Uint8Array(textureSize * textureSize * 4)
  for (let i = 0; i < bytes.length / 4; i++) {
    const grain = 216 + ((Math.imul(i + 17, 1103515245) >>> 17) % 39)
    bytes.set([grain, grain, grain, 255], i * 4)
  }
  const map = new T.DataTexture(bytes, textureSize, textureSize)
  map.magFilter = T.LinearFilter
  map.minFilter = T.LinearMipmapLinearFilter
  map.generateMipmaps = true
  map.needsUpdate = true
  return map
}

function pivot(parent, x = 0, y = 0, z = 0) {
  const group = new T.Group()
  group.position.set(x, y, z)
  parent.add(group)
  return group
}

function oval(parent, material, x, y, z, sx, sy, sz) {
  const part = new T.Mesh(sphere, material)
  part.position.set(x, y, z)
  part.scale.set(sx, sy, sz)
  parent.add(part)
  return part
}

// Elliptical cross sections leave room for the withers and the rising tuck at the loin.
function sculpt(sections, material) {
  const positions = []
  const uvs = []
  const indices = []
  const sides = 24
  const spline = new T.CatmullRomCurve3(sections.map(([z, y, width]) => new T.Vector3(z, y, width)))
  const heights = new T.CatmullRomCurve3(sections.map(([, , , h], i) => new T.Vector3(i, h, 0)))
  for (let ring = 0; ring <= 36; ring++) {
    const u = ring / 36
    const { x: z, y, z: width } = spline.getPoint(u)
    const { y: height } = heights.getPoint(u)
    for (let edge = 0; edge <= sides; edge++) {
      const v = edge / sides
      positions.push(Math.cos(v * Math.PI * 2) * width, y + Math.sin(v * Math.PI * 2) * height, z)
      uvs.push(u, v)
      if (ring && edge) {
        const a = ring * (sides + 1) + edge
        indices.push(a, a - 1, a - sides - 2, a, a - sides - 2, a - sides - 1)
      }
    }
  }
  const geo = new T.BufferGeometry()
  geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return new T.Mesh(geo, material)
}

export function createDog(scene) {
  const root = pivot(scene)
  const body = pivot(root)
  const grain = coatTexture()
  const rough = { roughness: .91, map: grain }
  const coat = new T.MeshStandardMaterial({ color: 0xb98541, ...rough })
  const cream = new T.MeshStandardMaterial({ color: 0xcba26a, ...rough })
  const earCoat = new T.MeshStandardMaterial({ color: 0x9b6738, ...rough })
  const nose = new T.MeshStandardMaterial({ color: 0x251b17, roughness: .47 })
  const eye = new T.MeshStandardMaterial({ color: 0x39251b, roughness: .28 })
  const collarMat = new T.MeshStandardMaterial({ color: 0x553829, roughness: .87 })
  const brass = new T.MeshStandardMaterial({ color: 0xbc9556, metalness: .45, roughness: .6 })

  body.add(sculpt([
    [-.76, .92, .015, .035], [-.61, .89, .22, .26], [-.40, .79, .33, .36],
    [-.12, .80, .31, .31], [.22, .83, .25, .245], [.52, .81, .275, .25],
    [.69, .81, .17, .18], [.78, .81, .015, .015],
  ], coat))
  oval(body, coat, 0, .99, -.52, .244, .34, .31).rotation.x = -.49
  const head = pivot(body, 0, 1.15, -.72)
  oval(head, coat, 0, .055, -.035, .255, .233, .27)
  oval(head, cream, 0, -.063, -.253, .173, .125, .228).rotation.x = -.12
  oval(head, earCoat, 0, -.119, -.225, .138, .048, .175)
  oval(head, nose, 0, -.027, -.43, .104, .064, .057)
  const ears = []
  for (const side of [-1, 1]) {
    oval(head, eye, side * .166, .08, -.205, .037, .029, .031)
    const ear = pivot(head, side * .210, .115, .038)
    oval(ear, earCoat, side * .025, -.145, .017, .071, .186, .118).rotation.z = side * -.16
    ears.push(ear)
  }
  const collar = new T.Mesh(new T.TorusGeometry(.225, .031, 6, 28), collarMat)
  collar.position.set(0, 1.01, -.58)
  collar.rotation.x = Math.PI * .29
  collar.scale.y = 1.10
  body.add(collar)
  oval(body, brass, .19, .935, -.645, .045, .059, .021)
  const bandana = new T.Mesh(new T.ConeGeometry(.22, .32, 3), collarMat)
  bandana.position.set(0, .84, -.65)
  bandana.rotation.z = Math.PI
  body.add(bandana)

  const tail = pivot(body, 0, .94, .63)
  tail.add(sculpt([
    [-.09, 0, .048, .048], [.07, .026, .105, .095], [.25, .062, .092, .071],
    [.46, .093, .064, .052], [.66, .09, .04, .031], [.75, .08, .012, .012],
  ], coat))
  const legs = []
  for (const rear of [false, true]) {
    for (const side of [-1, 1]) {
      const hip = pivot(body, side * (rear ? .198 : .237), rear ? .76 : .81, rear ? .47 : -.38)
      const knee = pivot(hip)
      const foot = pivot(knee)
      const upper = rear ? .381 : .386
      const lower = rear ? .331 : .377
      oval(hip, coat, 0, -.092, 0, rear ? .148 : .119, rear ? .275 : .259, rear ? .19 : .148)
      oval(knee, cream, 0, -.124, .006, rear ? .062 : .071, lower * .64, .071)
      oval(foot, cream, 0, -.016, -.028, .083, .053, .106)
      knee.position.y = -upper
      foot.position.y = -lower
      legs.push({ hip, knee, foot, upper, lower, rear, side })
    }
  }
  let crouch = 0
  let landing = 0
  let oldHeight = 0
  return {
    root,
    reset() { crouch = 0; landing = 0; oldHeight = 0 },
    appearance(outfit) {
      collarMat.color.setHex({ field: 0x553829, blaze: 0xc05828, marsh: 0x494f36, copper: 0x793f2a }[outfit] ?? 0x553829)
      coat.color.setHex(outfit === 'copper' ? 0x93592f : 0xb98541)
      cream.color.setHex(outfit === 'copper' ? 0xbb8755 : 0xcba26a)
      earCoat.color.setHex(outfit === 'copper' ? 0x73452b : 0x9b6738)
      bandana.visible = outfit === 'marsh'
    },
    pose({ x, z, height, ground, sliding, stride, time, heading = 0, turn = 0, dt, idle = false }) {
      if (oldHeight > .02 && height <= .02) landing = 1
      oldHeight = height
      landing *= Math.exp(-11 * dt)
      crouch = sliding
      root.position.set(x, ground + height, z)
      root.rotation.y = heading
      body.position.y = -crouch * .37 - landing * .072
        + (idle ? Math.sin(time * 2.4) * .012 : height > .03 ? 0 : Math.sin(stride * 2) * .038)
      body.rotation.x = crouch * .12 + (height > .03 ? Math.cos(stride * .46) * .18 : Math.sin(stride * 2) * .044)
      body.rotation.z = -turn * .26
      head.rotation.x = -body.rotation.x * .61 + (idle ? Math.sin(time * 1.7) * .035 : Math.sin(stride * 2 - .4) * .044)
      head.rotation.y = idle ? -.17 + Math.sin(time) * .11 : turn * .48
      for (let i = 0; i < ears.length; i++) {
        ears[i].rotation.x = (idle ? 0 : Math.sin(stride * 2 - .7 + i * .6) * .125) + landing * .15
        ears[i].rotation.z = (i ? 1 : -1) * (crouch * .18 + Math.abs(turn) * .12)
      }
      tail.rotation.y = turn * -.44 + Math.sin(idle ? time * 4 : stride + .45) * (idle ? .21 : .16)
      tail.rotation.x = -.14 + crouch * .32 + Math.sin(stride - .5) * .08
      for (const { hip, knee, foot, upper, lower, rear, side } of legs) {
        const phase = ((stride / (2 * Math.PI) + (rear ? .48 : 0) + (side < 0 ? .18 : 0)) % 1 + 1) % 1
        const contact = phase < .46
        const air = (phase - .46) / .54
        const swing = idle ? 0 : contact ? -.33 + phase / .46 * .66 : .33 - air * .66
        const lift = idle || contact ? 0 : Math.sin(air * Math.PI) * .27
        const airborne = height > .04
        const dz = airborne ? (rear ? .23 : -.26) : swing * (1 - crouch) + (rear ? .22 : -.30) * crouch
        const dy = airborne ? .28 + (rear ? .015 : .10) : hip.position.y + body.position.y - .053 - lift * (1 - crouch)
        const length = Math.min(upper + lower - .006, Math.max(.17, Math.hypot(dz, dy)))
        const bend = rear ? -1 : 1
        const lowerAngle = bend * (Math.PI - Math.acos((upper ** 2 + lower ** 2 - length ** 2) / (2 * upper * lower)))
        const upperAngle = Math.atan2(-dz, dy) - Math.atan2(lower * Math.sin(lowerAngle), upper + lower * Math.cos(lowerAngle))
        hip.rotation.x = upperAngle
        knee.rotation.x = lowerAngle
        foot.rotation.x = -(upperAngle + lowerAngle) * .84
      }
    },
  }
}
