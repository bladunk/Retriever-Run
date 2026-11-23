import * as T from 'three'
import { fieldMaterials } from './materials.js'
import { buildTile, createReedClump, reedCount } from './terrain-geometry.js'
import { centerAt, segmentLength } from './trail.js'

const blades = createReedClump()
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


function unpack(data) {
  const geometry = new T.BufferGeometry()
  for (const [name, { values, itemSize, normalized }] of Object.entries(data.buffers)) {
    geometry.setAttribute(name, new T.BufferAttribute(values, itemSize, normalized))
  }
  if (data.index) geometry.setIndex(new T.BufferAttribute(data.index, 1))
  geometry.computeBoundingSphere()
  return geometry
}

export function createTerrain(scene) {
  const tint = new T.Color()
  const tiles = Array.from({ length: 7 }, () => {
    const root = new T.Group()
    const ground = new T.Mesh(new T.BufferGeometry(), terrainMaterial)
    const water = new T.Mesh(new T.BufferGeometry(), waterMaterial)
    const reeds = new T.InstancedMesh(blades, reedMaterial, reedCount)
    reeds.instanceMatrix.setUsage(T.DynamicDrawUsage)
    reeds.frustumCulled = false
    reeds.count = 0
    root.visible = false
    root.add(ground, water, reeds)
    scene.add(root)
    return { root, ground, water, reeds, reedData: null, index: null, wanted: null, dirty: true }
  })
  const slot = (index) => tiles[((index % tiles.length) + tiles.length) % tiles.length]
  const order = [0, 1, 2, -1, 3, 4, 5]
  const nearCount = [23, 43, 63]
  const farCount = [9, 17, 25]
  let lastWindFrame = -1
  let lastDetail = -1
  let building = false
  let worker
  let center = 0

  function load(packet) {
    const tile = slot(packet.index)
    if (tile.wanted !== packet.index) return
    tile.ground.geometry.dispose()
    tile.water.geometry.dispose()
    tile.ground.geometry = unpack(packet.ground)
    tile.water.geometry = packet.water ? unpack(packet.water) : new T.BufferGeometry()
    tile.water.visible = Boolean(packet.water)
    tile.reedData = packet.reeds
    for (let n = 0; n < reedCount; n++) tile.reeds.setColorAt(n, tint.fromArray(packet.reeds, n * 6 + 3))
    tile.reeds.instanceColor.needsUpdate = true
    tile.index = packet.index
    tile.dirty = true
  }

  function pump() {
    if (building) return
    for (const offset of order) {
      const index = center + offset
      const tile = slot(index)
      if (tile.wanted !== index || tile.index === index) continue
      building = true
      if (worker) worker.postMessage(index)
      else setTimeout(() => { load(buildTile(index)); building = false; pump() }, 0)
      break
    }
  }
  try {
    worker = new Worker(new URL('./terrain-worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => { load(data); building = false; pump() }
    worker.onerror = () => {
      worker.terminate()
      worker = undefined
      building = false
      pump()
    }
  } catch { /* The fallback builds one pending tile at a time. */ }
  // Both sides of the spawn seam must exist before the title camera looks across it.
  for (const index of [-1, 0]) {
    slot(index).wanted = index
    load(buildTile(index))
  }

  return {
    count() { return tiles.reduce((count, tile) => count + Number(tile.index !== null), 0) },
    update(distance, time, weather, detail) {
      center = Math.floor(distance / segmentLength)
      const offset = centerAt(distance)
      const { wind, wet, sky } = weather
      const windFrame = Math.floor(time * (detail === 0 ? 10 : 18))
      waterClock.value = time
      waterWeather.value = wet
      waterSky.value.copy(sky)
      field.fieldWet.value = wet
      field.fieldDetail.value = detail
      for (let i = center - 1; i < center + 6; i++) {
        const tile = slot(i)
        tile.wanted = i
        tile.root.visible = tile.index === i
        if (!tile.root.visible) continue
        tile.root.position.set(centerAt(i * segmentLength) - offset, 0, distance - i * segmentLength)
        if (tile.dirty || windFrame !== lastWindFrame || detail !== lastDetail) {
          const near = i - center < 2
          const count = near ? nearCount[detail] : farCount[detail]
          tile.reeds.count = count
          for (let n = 0; n < count; n++) {
            dummy.position.fromArray(tile.reedData, n * 6)
            dummy.rotation.set(.13, n * .57, Math.sin(time * 2.7 + n * .7) * (.18 + wind * .47))
            dummy.scale.set(.34 + n % 3 * .105, .63 + n % 8 * .10, .40)
            dummy.updateMatrix()
            tile.reeds.setMatrixAt(n, dummy.matrix)
          }
          tile.reeds.instanceMatrix.needsUpdate = true
          tile.dirty = false
        }
      }
      pump()
      lastWindFrame = windFrame
      lastDetail = detail
    },
  }
}
