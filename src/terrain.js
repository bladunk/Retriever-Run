import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { fieldMaterials } from './materials.js'
import { centerAt, habitatAt, headingAt, seededRandom, segmentLength, surfaceAt } from './trail.js'

const box = new T.BoxGeometry()
const stone = new T.IcosahedronGeometry(1, 1)
const canopy = leafCrown()
const oval = new T.SphereGeometry(1, 7, 4)
const twig = new T.CylinderGeometry(.47, 1, 1, 6)
const strip = new T.ConeGeometry(1, 1, 3)
const blades = createReedClump()
const bankPatch = weatheredBank()
const worldUp = new T.Vector3(0, 1, 0)
const branchVector = new T.Vector3()
const branchRotation = new T.Quaternion()

function createReedClump() {
  const random = seededRandom(77913)
  const vertices = []
  const shade = []
  for (let i = 0; i < 9; i++) {
    const angle = i * 2.39996
    const reach = .2 + random() * .45
    const h = .48 + random() * .58
    const x = Math.cos(angle) * reach
    const z = Math.sin(angle) * reach
    const w = .022 + random() * .033
    const dx = Math.sin(angle) * w
    const dz = -Math.cos(angle) * w
    vertices.push(x * .12 - dx, 0, z * .12 - dz, x * .12 + dx, 0, z * .12 + dz,
      x * .42 + dx * .66, .56 * h, z * .42 + dz * .66,
      x * .12 - dx, 0, z * .12 - dz, x * .42 + dx * .66, .56 * h, z * .42 + dz * .66,
      x * .42 - dx * .7, .56 * h, z * .42 - dz * .7,
      x * .42 - dx * .7, .56 * h, z * .42 - dz * .7, x * .42 + dx * .66, .56 * h, z * .42 + dz * .66, x, h, z)
    for (const value of [.48, .51, .77, .48, .77, .75, .75, .77, 1]) shade.push(value, value * .94, value * .83)
  }
  const geom = new T.BufferGeometry()
  geom.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
  geom.setAttribute('color', new T.Float32BufferAttribute(shade, 3))
  geom.computeVertexNormals()
  return geom
}

function leafCrown() {
  const geom = new T.IcosahedronGeometry(1, 1)
  const points = geom.attributes.position
  for (let i = 0; i < points.count; i++) {
    const x = points.getX(i)
    const y = points.getY(i)
    const z = points.getZ(i)
    const scatter = .95 + Math.sin(x * 7.4 + y * 4.9 + z * 5.3) * .16 + Math.cos(y * 10.4 - z * 13) * .07
    points.setXYZ(i, x * scatter, y * scatter, z * scatter)
  }
  return geom
}

function weatheredBank() {
  const geom = new T.IcosahedronGeometry(1, 2)
  const position = geom.attributes.position
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const rough = 1 + Math.sin(x * 8 + z * 6) * .10 + Math.cos(z * 12 - x * 7) * .05
    position.setXYZ(i, x * rough, y > 0 ? y * (.75 + Math.sin(z * 6 + x * 12) * .18) : y, z * rough)
  }
  geom.computeVertexNormals()
  return geom
}
const dummy = new T.Object3D()

const { material: terrainMaterial, uniforms: field } = fieldMaterials
const reedMaterial = new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide, vertexColors: true })
const waterMaterial = new T.MeshStandardMaterial({ color: 0x47645f, roughness: .38, metalness: .18, vertexColors: true })
const waterClock = { value: 0 }
const waterWeather = { value: 0 }
const waterSky = { value: new T.Color(0xd5b082) }

waterMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.marshTime = waterClock
  shader.uniforms.marshWeather = waterWeather
  shader.uniforms.marshSky = waterSky
  shader.vertexShader = 'varying vec3 vMarsh;\n' + shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvMarsh = (modelMatrix * vec4(position, 1.)).xyz;')
  shader.fragmentShader = 'uniform float marshTime, marshWeather; uniform vec3 marshSky; varying vec3 vMarsh;\n' + shader.fragmentShader.replace('#include <color_fragment>',
    `#include <color_fragment>
    vec3 eye = normalize(cameraPosition - vMarsh);
    vec2 Q = vMarsh.xz;
    float r1 = sin(dot(Q, vec2(1.43, 3.7)) + marshTime * 1.94);
    float r2 = sin(dot(Q, vec2(-2.63, 4.8)) - marshTime * 2.45 + r1);
    float r3 = sin(dot(Q, vec2(.71, 1.18)) - marshTime * .91);
    vec3 waterNormal = normalize(vec3((r1 + r3) * .036, 1., (r2 - r3) * (.063 + marshWeather * .034)));
    float fresnel = pow(1. - clamp(dot(eye, waterNormal), 0., 1.), 4.);
    float skyGlint = max(0., dot(reflect(-eye, waterNormal), normalize(vec3(-.37,.23,-1.))));
    diffuseColor.rgb = mix(diffuseColor.rgb * (.78 + r1 * .06 + r3 * .07),
      diffuseColor.rgb * .52 + marshSky * (vec3(.19,.21,.23) + pow(skyGlint, 22.) * .19), fresnel * .85);
    diffuseColor.rgb += marshSky * pow(skyGlint, 45.) * .024;`)
}

const palette = {
  'Cattail Marsh': { soil: 0x908476, bank: 0x6b714f, trees: 0x4c552f, grass: 0x858057, water: true },
  'Flooded Timber': { soil: 0x827666, bank: 0x5a624e, trees: 0x554638, grass: 0x5f6243, water: true },
  'Prairie Potholes': { soil: 0x9a8b71, bank: 0x777854, trees: 0x626440, grass: 0x9b8a56, water: true },
  'Autumn Woodland': { soil: 0x9c826d, bank: 0x6f603d, trees: 0x8b572b, grass: 0x715e3b, water: false },
  'Muddy Creek': { soil: 0x827265, bank: 0x6f6554, trees: 0x695c36, grass: 0x7f6f49, water: true },
}

function buildTile(tile, index) {
  const start = index * segmentLength
  const habitat = habitatAt(start)
  const colors = palette[habitat]
  const wood = surfaceAt(start) === 'wood'
  const random = seededRandom((index + 77) * 4871)
  const between = (min, max) => min + random() * (max - min)
  const tint = new T.Color()
  const list = []
  const banks = wood ? 4.5 : 3.6
  const base = centerAt(start)

  function warp(array) {
    let previousZ
    let offset
    let sin
    let cos
    for (let i = 0; i < array.length; i += 3) {
      const z = array[i + 2]
      if (previousZ !== z) {
        previousZ = z
        const at = start - z
        const heading = headingAt(at)
        offset = centerAt(at) - base
        sin = Math.sin(heading)
        cos = Math.cos(heading)
      }
      const x = array[i]
      const lateral = Math.max(-5.5, Math.min(5.5, x))
      array[i] = offset + lateral * cos + (x - lateral)
      array[i + 2] = z - lateral * sin
    }
  }

  function add(shape, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, conform = false, layer = 0, rotation = null) {
    const geometry = shape.index ? shape.toNonIndexed() : shape.clone()
    geometry.scale(sx, sy, sz)
    geometry.rotateX(rx)
    geometry.rotateY(ry)
    geometry.rotateZ(rz)
    if (rotation) geometry.applyQuaternion(rotation)
    if (conform) {
      const uv = geometry.attributes.uv
      const points = geometry.attributes.position
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (points.getX(i) + x) * .40, (points.getZ(i) + z) * .39)
      geometry.translate(x, y, z)
      warp(geometry.attributes.position.array)
      geometry.computeVertexNormals()
    } else {
      const at = start - z
      const angle = headingAt(at)
      geometry.rotateY(angle)
      geometry.translate(centerAt(at) - base + Math.cos(angle) * x, y, z - Math.sin(angle) * x)
    }
    const count = geometry.attributes.position.count
    const data = new Float32Array(count * 3)
    tint.setHex(color).multiplyScalar(between(.84, 1.13))
    const vertex = geometry.attributes.position
    for (let i = 0; i < data.length; i += 3) {
      tint.toArray(data, i)
      if (shape === canopy) {
        const n = i / 3
        const flake = .77 + .13 * Math.sin(vertex.getX(n) * 9 + vertex.getZ(n) * 6) + .19 * (vertex.getY(n) - y) / sy
        for (let k = 0; k < 3; k++) data[i + k] *= flake
      }
    }
    geometry.setAttribute('color', new T.BufferAttribute(data, 3))
    geometry.setAttribute('fieldLayer', new T.BufferAttribute(new Float32Array(count).fill(layer), 1))
    list.push(geometry)
  }

  function branch(color, x, y, z, tx, ty, tz, thickness) {
    branchVector.set(tx - x, ty - y, tz - z)
    const length = branchVector.length()
    branchRotation.setFromUnitVectors(worldUp, branchVector.multiplyScalar(1 / length))
    add(twig, color, (x + tx) * .5, (y + ty) * .5, (z + tz) * .5,
      thickness, length, thickness * .94, 0, 0, 0, false, 2, branchRotation)
  }

  // Longitudinal grid samples the same boundary coordinates on both neighboring tiles.
  const positions = []
  const values = []
  const uvs = []
  const indices = []
  const offsets = [-51, -35, -19, -10, -6, -4.8, -3.65, -3.3, -2.45, -1.6, -.8, 0,
    .8, 1.6, 2.45, 3.3, 3.65, 4.8, 6, 10, 19, 35, 51]
  for (let row = 0; row <= segmentLength * 2; row++) {
    const z = -row / 2
    for (let col = 0; col < offsets.length; col++) {
      const x = offsets[col]
      const edge = Math.abs(x)
      const track = edge <= 3.65
      const distance = start - z
      const current = colors.water ? -.91 : -.10
      const before = palette[habitatAt(start - 1)].water ? -.91 : -.10
      const after = palette[habitatAt(start + segmentLength)].water ? -.91 : -.10
      const nearStart = Math.max(0, 1 + z / 4) * .5
      const nearEnd = Math.max(0, 1 - (segmentLength + z) / 4) * .5
      const basin = current + (before - current) * nearStart + (after - current) * nearEnd
      const inland = Math.sin(distance * .31 + x * .49) * .17 + Math.sin(distance * .12 - x * .46) * .09
      const shore = .10 * Math.sin(distance * .43 + x) + .07 * Math.cos(distance * .19 - x * .8)
      const y = track ? -.014 + Math.sin(distance * .63 + x * .95) * .013 : edge < 5 ? -.27 + shore : basin + inland
      uvs.push(x / 2.5, z / 2.5)
      const soil = edge > 3.1 ? colors.bank : colors.soil
      positions.push(x, y, z)
      const rut = Math.sin(x * 5.5 + Math.sin(distance * .42) * .9) * .022
      const drift = Math.cos(distance * .18 + x * .63) * .047
      tint.setHex(soil).multiplyScalar(track ? .94 + drift + rut : .91 + shore * .6).toArray(values, values.length)
      if (row && col) {
        const a = row * offsets.length + col
        indices.push(a, a - 1, a - offsets.length, a - 1, a - offsets.length - 1, a - offsets.length)
      }
    }
  }
  warp(positions)
  const land = new T.BufferGeometry()
  land.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  land.setAttribute('color', new T.Float32BufferAttribute(values, 3))
  land.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2))
  land.setAttribute('fieldLayer', new T.BufferAttribute(new Float32Array(positions.length / 3).fill(1), 1))
  land.setIndex(indices)
  land.computeVertexNormals()
  const landTriangles = land.toNonIndexed()
  list.push(landTriangles)
  land.dispose()

  tile.water.geometry.dispose()
  if (colors.water) {
    const water = new T.PlaneGeometry(99, segmentLength, 18, 45)
    water.rotateX(-Math.PI / 2)
    water.translate(0, -.55, -segmentLength / 2)
    const points = water.attributes.position
    warp(points.array)
    const data = new Float32Array(points.count * 3)
    for (let i = 0; i < data.length; i += 3) tint.setHex(0xa8bab7).multiplyScalar(between(.89, 1.1)).toArray(data, i)
    water.setAttribute('color', new T.BufferAttribute(data, 3))
    tile.water.geometry = water
  } else {
    tile.water.geometry = new T.BufferGeometry()
  }
  tile.water.visible = colors.water

  if (wood) {
    for (let z = -.29; z > -segmentLength; z -= .56) {
      add(box, [0x84705a, 0x705e4c, 0x937d64, 0x615243][Math.floor(random() * 4)],
        0, -.003, z, 7.25, .09, .536, 0, 0, 0, true, 2)
      if (Math.floor((-z + .29) / .56) % 5 === 0) {
        for (const side of [-1, 1]) add(box, 0x665541, side * 3.68, .26, z, .16, 1.04, .17, 0, 0, 0, false, 2)
      }
    }
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 38; i++) {
      const x = side * between(2.87, 5.96)
      const y = Math.abs(x) < 3.65 ? 0 : Math.abs(x) < 5 ? -.26 : colors.water ? -.57 : -.09
      const z = between(-29.7, -.3)
      add(stone, i % 2 ? colors.bank : 0x6d6454, x, y, z, between(.035, .24), between(.018, .19), between(.08, .32))
      if (i % 2 === 0) {
        for (let blade = 0; blade < 4; blade++) {
          add(strip, colors.grass, x + between(-.17, .17), y + .11, z + between(-.18, .18),
            .049, between(.19, .47), .04, .19, between(0, 6), between(-.55, .55))
        }
      }
    }
    for (let i = 0; i < 15; i++) {
      const x = side * between(banks, 20)
      const z = between(-29.6, -.4)
      if (Math.abs(x) > 5.3) {
        add(bankPatch, colors.bank, x, colors.water ? -.66 : -.08, z, between(.65, 3.25), between(.22, .41), between(.9, 3.4), 0, between(0, 4), 0, false, 1)
      }
      if (i < 9 && colors.water) {
        const height = between(.75, 1.68)
        add(twig, 0x77704a, x, height / 2 - .46, z, .013, height, .014)
        add(oval, 0x4c3525, x, height - .49, z, .048, .168, .052)
      }
    }

    for (let i = 0; i < 9; i++) {
      add(stone, i % 3 ? 0x655345 : 0x9a6638, side * between(.2, 3.03), -.005,
        between(-29.6, -.4), between(.035, .085), .014, between(.043, .10), 0, i)
    }
    const totalTrees = habitat === 'Prairie Potholes' ? 4 : habitat === 'Autumn Woodland' ? 13 : 8
    for (let i = 0; i < totalTrees; i++) {
      const x = side * between(6, 43)
      const z = between(-29.6, -.4)
      const h = between(2.6, 6.5)
      const dead = habitat === 'Flooded Timber' || (colors.water && random() < .20)
      const bark = dead ? 0x5b5348 : 0x594437
      const bend = between(-h * .12, h * .12)
      const rake = between(-h * .17, h * .17)
      add(bankPatch, colors.bank, x, -.65, z, between(1.15, 1.8), .34, between(.87, 1.59), 0, 0, 0, false, 1)
      branch(bark, x, -.49, z, x + bend * .42, h * .53, z + rake * .45, h * .046)
      branch(bark, x + bend * .42, h * .53, z + rake * .45, x + bend, h * .94, z + rake, h * .022)
      const orientation = between(0, Math.PI * 2)
      for (let j = 0; j < (dead ? 6 : 5); j++) {
        const angle = orientation + j * 2.4
        const reach = h * between(.18, .36)
        const baseY = h * (.40 + j * .068)
        const top = baseY + h * between(.22, .38)
        const tipX = x + bend + Math.cos(angle) * reach
        const tipZ = z + rake + Math.sin(angle) * reach
        const midX = x + bend * .69 + (tipX - x) * .53
        const midZ = z + rake * .63 + (tipZ - z) * .53
        branch(bark, x + bend * .53, baseY, z + rake * .52, midX, (baseY + top) * .52, midZ, h * .018)
        branch(bark, midX, (baseY + top) * .52, midZ, tipX, top, tipZ, h * .009)
        if (!dead) {
          const fall = habitat === 'Autumn Woodland' || i % 4 === 0
          const leaves = fall ? [0x82482c, 0x967038, 0x93582f, 0x756236, 0x6a5530][j] : colors.trees
          add(canopy, leaves, tipX, top, tipZ, h * .25, h * .145, h * .26, .36, angle, .23)
          add(canopy, leaves, (tipX + midX) * .50, top + h * .093, (tipZ + midZ) * .50,
            h * .178, h * .14, h * .19, -.3, angle, .11)
        }
      }
    }
  }

  // Weathered blinds and floating decoys sit outside the playable lanes.
  if (colors.water && index % 6 === 0) {
    const side = index % 12 === 0 ? 1 : -1
    const x = side * 8.3
    const z = -16
    add(stone, colors.bank, x, -.52, z, 3.2, .6, 2.8)
    for (const dx of [-1.06, 1.06]) {
      for (const dz of [-.64, .64]) add(box, 0x514330, x + dx, .36, z + dz, .16, 1.65, .17, 0, 0, 0, false, 2)
    }
    for (let i = 0; i < 7; i++) {
      add(box, i % 2 ? 0x695743 : 0x554a38, x + (i - 3) * .33, .53, z + .70, .31, .97, .08, 0, 0, 0, false, 2)
    }
    add(box, 0x655b3d, x, 1.58, z, 2.6, .17, 1.69, .13, 0, 0, false, 2)
    add(box, 0x362f24, x, 1.15, z + .66, 2.15, .34, .10)
    for (let i = 0; i < 21; i++) {
      add(strip, colors.grass, x + between(-1.25, 1.25), 1.58, z + between(-.84, .82), .15, .53, .13, .38, i, -.38)
    }
    for (let i = 0; i < 9; i++) {
      const d = x + side * between(-.35, 5.5)
      const waterZ = z + between(-10, -3)
      add(oval, 0x666354, d, -.49, waterZ, .19, .095, .31, 0, .25)
      add(oval, i % 3 ? 0x354139 : 0x6d5540, d - .05, -.39, waterZ - .12, .078, .09, .076)
      add(oval, 0xa68853, d - .06, -.406, waterZ - .19, .049, .022, .068)
    }
  }

  const merged = mergeGeometries(list)
  for (const geometry of list) geometry.dispose()
  tile.ground.geometry.dispose()
  tile.ground.geometry = merged

  for (let i = 0; i < tile.reedPositions.length; i++) {
    const side = i % 2 === 0 ? 1 : -1
    const at = start + between(.6, segmentLength - .6)
    const x = side * between(3.52, 8.9)
    const heading = headingAt(at)
    const placement = tile.reedPositions[i]
    placement.set(centerAt(at) - base + Math.cos(heading) * x, Math.abs(x) < 4.6 ? between(-.15, .01) : between(-.38, -.19), start - at - Math.sin(heading) * x)
    tile.reeds.setColorAt(i, tint.setHex(colors.grass).multiplyScalar(between(.72, 1.2)))
  }
  tile.reeds.instanceColor.needsUpdate = true
  tile.index = index
}

export function createTerrain(scene) {
  const tiles = Array.from({ length: 7 }, () => {
    const root = new T.Group()
    const ground = new T.Mesh(new T.BufferGeometry(), terrainMaterial)
    const water = new T.Mesh(new T.BufferGeometry(), waterMaterial)
    const reeds = new T.InstancedMesh(blades, reedMaterial, 70)
    reeds.frustumCulled = false
    root.add(ground, water, reeds)
    scene.add(root)
    return { root, ground, water, reeds, reedPositions: Array.from({ length: reeds.count }, () => new T.Vector3()), index: null }
  })
  let lastWindFrame = -1
  return {
    update(distance, time, weather, detail) {
      const containing = Math.floor(distance / segmentLength)
      const offset = centerAt(distance)
      const { wind, wet, sky } = weather
      const windFrame = Math.floor(time * (detail === 0 ? 11 : 20))
      waterClock.value = time
      waterWeather.value = wet
      waterSky.value.copy(sky)
      field.fieldWet.value = wet
      field.fieldDetail.value = detail
      for (let i = containing - 1; i < containing + 6; i++) {
        const tile = tiles[(i + tiles.length) % tiles.length]
        const rebuild = tile.index !== i
        if (rebuild) buildTile(tile, i)
        tile.root.position.set(centerAt(i * segmentLength) - offset, 0, distance - i * segmentLength)
        if (rebuild || windFrame !== lastWindFrame) {
          const near = i - containing < 2
          const count = near ? [26, 47, 70][detail] : [13, 22, 33][detail]
          tile.reeds.count = count
          for (let n = 0; n < count; n++) {
            dummy.position.copy(tile.reedPositions[n])
            dummy.rotation.set(.13, n * .57, Math.sin(time * 2.7 + n * .7) * (.18 + wind * .47))
            dummy.scale.set(.36 + n % 3 * .11, .48 + n % 8 * .084, .39)
            dummy.updateMatrix()
            tile.reeds.setMatrixAt(n, dummy.matrix)
          }
          tile.reeds.instanceMatrix.needsUpdate = true
        }
      }
      lastWindFrame = windFrame
    },
  }
}
