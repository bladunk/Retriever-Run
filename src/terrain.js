import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { centerAt, habitatAt, headingAt, seededRandom, segmentLength, surfaceAt } from './trail.js'

const box = new T.BoxGeometry()
const stone = new T.IcosahedronGeometry(1, 1)
const canopy = new T.IcosahedronGeometry(1, 1)
const oval = new T.SphereGeometry(1, 7, 4)
const twig = new T.CylinderGeometry(.47, 1, 1, 6)
const strip = new T.ConeGeometry(1, 1, 3)
const dummy = new T.Object3D()

const terrainMaterial = new T.MeshStandardMaterial({ vertexColors: true, roughness: .95, flatShading: true })
const reedMaterial = new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide })
const waterMaterial = new T.MeshStandardMaterial({ color: 0x47645f, roughness: .38, metalness: .18, vertexColors: true })
const waterClock = { value: 0 }

waterMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.marshTime = waterClock
  shader.vertexShader = 'varying vec3 vMarsh;\n' + shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvMarsh = (modelMatrix * vec4(position, 1.)).xyz;')
  shader.fragmentShader = 'uniform float marshTime; varying vec3 vMarsh;\n' + shader.fragmentShader.replace('#include <color_fragment>',
    `#include <color_fragment>
    vec3 eye = normalize(cameraPosition - vMarsh);
    float reflection = pow(1. - clamp(eye.y, 0., 1.), 3.);
    float wave = sin(vMarsh.z * 5.1 + vMarsh.x * .78 + marshTime * 1.65);
    wave *= sin(vMarsh.x * .99 - vMarsh.z * 1.21 + marshTime * .79);
    float shimmer = smoothstep(.75, .985, wave) * .21;
    diffuseColor.rgb *= 1. + wave * .075;
    diffuseColor.rgb += mix(vec3(.018, .042, .047), vec3(.16, .15, .107), reflection);
    diffuseColor.rgb += vec3(1., .72, .44) * shimmer * reflection * .40;`)
}

const palette = {
  'Cattail Marsh': { soil: 0x766044, bank: 0x4f5232, trees: 0x4c552f, grass: 0x858057, water: true },
  'Flooded Timber': { soil: 0x675746, bank: 0x414636, trees: 0x554638, grass: 0x5f6243, water: true },
  'Prairie Potholes': { soil: 0x847053, bank: 0x747245, trees: 0x626440, grass: 0x9b8a56, water: true },
  'Autumn Woodland': { soil: 0x5a4837, bank: 0x5f5533, trees: 0x8b572b, grass: 0x715e3b, water: false },
  'Muddy Creek': { soil: 0x54483d, bank: 0x544b36, trees: 0x695c36, grass: 0x7f6f49, water: true },
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

  function add(shape, color, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, conform = false) {
    const geometry = shape.index ? shape.toNonIndexed() : shape.clone()
    geometry.scale(sx, sy, sz)
    geometry.rotateX(rx)
    geometry.rotateY(ry)
    geometry.rotateZ(rz)
    if (conform) {
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
    for (let i = 0; i < data.length; i += 3) tint.toArray(data, i)
    geometry.setAttribute('color', new T.BufferAttribute(data, 3))
    list.push(geometry)
  }

  // Longitudinal grid samples the same boundary coordinates on both neighboring tiles.
  const positions = []
  const values = []
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
      const inland = Math.sin((start - z) * .41 + x * .8) * .16
      const y = track ? -.012 : edge < 5 ? -.24 : basin + inland
      const soil = edge > 3.1 ? colors.bank : colors.soil
      positions.push(x, y, z)
      const rut = Math.sin(x * 5.5 + Math.sin(distance * .42) * .9) * .055
      tint.setHex(soil).multiplyScalar(track ? between(.94, 1.07) + rut : between(.83, 1.12)).toArray(values, values.length)
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
  land.setIndex(indices)
  land.computeVertexNormals()
  const landTriangles = land.toNonIndexed()
  landTriangles.setAttribute('uv', new T.BufferAttribute(new Float32Array(landTriangles.attributes.position.count * 2), 2))
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
        0, -.003, z, 7.25, .09, .536, 0, 0, 0, true)
      if (Math.floor((-z + .29) / .56) % 5 === 0) {
        for (const side of [-1, 1]) add(box, 0x665541, side * 3.68, .26, z, .16, 1.04, .17)
      }
    }
  }

  for (const side of [-1, 1]) {
    for (let i = 0; i < 64; i++) {
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
        add(stone, colors.bank, x, colors.water ? -.62 : -.03, z, between(.75, 3.7), .29, between(.9, 3.5))
      }
      if (i < 9 && colors.water) {
        const height = between(.75, 1.68)
        add(twig, 0x77704a, x, height / 2 - .46, z, .026, height, .026)
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
      add(stone, colors.bank, x, -.6, z, 1.9, .43, 1.7)
      add(twig, bark, x, h / 2 - .52, z, h * .052, h, h * .047, between(-.15, .15), 0, between(-.14, .14))
      for (let j = 0; j < 4; j++) {
        const direction = j % 2 ? 1 : -1
        const tip = x + direction * h * .19
        const top = h * (.62 + j * .085)
        add(twig, bark, x + direction * h * .11, top, z, h * .021, h * .49, h * .022, between(-.2, .2), 0, direction * -.66)
        if (!dead) {
          const fall = habitat === 'Autumn Woodland' || i % 4 === 0
          const leaves = fall ? [0x91492a, 0xa67a35, 0xa35c2b, 0x665a34][j] : colors.trees
          add(canopy, leaves, tip, top + h * .29, z + between(-.45, .45), h * .31, h * .27, h * .29, .1, j * 2)
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
      for (const dz of [-.64, .64]) add(box, 0x514330, x + dx, .36, z + dz, .16, 1.65, .17)
    }
    for (let i = 0; i < 7; i++) {
      add(box, i % 2 ? 0x695743 : 0x554a38, x + (i - 3) * .33, .53, z + .70, .31, .97, .08)
    }
    add(box, 0x655b3d, x, 1.58, z, 2.6, .17, 1.69, .13)
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
    const x = side * between(4.2, 8.9)
    const heading = headingAt(at)
    const placement = tile.reedPositions[i]
    placement.set(centerAt(at) - base + Math.cos(heading) * x, between(-.32, -.04), start - at - Math.sin(heading) * x)
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
    const reeds = new T.InstancedMesh(strip, reedMaterial, 52)
    reeds.frustumCulled = false
    root.add(ground, water, reeds)
    scene.add(root)
    return { root, ground, water, reeds, reedPositions: Array.from({ length: reeds.count }, () => new T.Vector3()), index: null }
  })
  let lastWindFrame = -1
  return {
    update(distance, time, wind, wet, lowQuality) {
      const containing = Math.floor(distance / segmentLength)
      const offset = centerAt(distance)
      const windFrame = Math.floor(time * (lowQuality ? 12 : 24))
      waterClock.value = time
      terrainMaterial.roughness = .95 - wet * .38
      for (let i = containing - 1; i < containing + 6; i++) {
        const tile = tiles[(i + tiles.length) % tiles.length]
        const rebuild = tile.index !== i
        if (rebuild) buildTile(tile, i)
        tile.root.position.set(centerAt(i * segmentLength) - offset, 0, distance - i * segmentLength)
        if (rebuild || windFrame !== lastWindFrame) {
          const count = lowQuality ? 24 : 52
          tile.reeds.count = count
          for (let n = 0; n < count; n++) {
            dummy.position.copy(tile.reedPositions[n])
            dummy.rotation.set(.13, n * .57, Math.sin(time * 2.7 + n * .7) * (.18 + wind * .47))
            dummy.scale.set(.06 + n % 3 * .018, .47 + n % 8 * .087, .056)
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
