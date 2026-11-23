import * as T from 'three'
import { fieldMaterials } from './materials.js'
import { buildTile, createDistantTree, createReedClump, reedCount, treeCount } from './terrain-geometry.js'
import { centerAt, segmentLength } from './trail.js'

const blades = createReedClump()
const distantTrees = [createDistantTree(false), createDistantTree(true)]
const treeMaterial = new T.MeshLambertMaterial({ vertexColors: true })
const treeTints = [0x9c8a74, 0xb49968, 0x87936c]
const dummy = new T.Object3D()

const { material: terrainMaterial, uniforms: field } = fieldMaterials
const reedMaterial = new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide, vertexColors: true })
const waterMaterial = new T.MeshStandardMaterial({ color: 0xffffff, roughness: .61, metalness: .026 })
const waterClock = { value: 0 }
const waterWeather = { value: 0 }
const waterSky = { value: new T.Color(0xd5b082) }

waterMaterial.onBeforeCompile = (shader) => {
  shader.uniforms.marshTime = waterClock
  shader.uniforms.marshWeather = waterWeather
  shader.uniforms.marshSky = waterSky
  shader.vertexShader = 'attribute float marshDepth; varying vec3 vMarsh; varying float vDepth;\n' + shader.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\nvMarsh = (modelMatrix * vec4(position, 1.)).xyz; vDepth = marshDepth;')
  shader.fragmentShader = 'uniform float marshTime, marshWeather; uniform vec3 marshSky; varying vec3 vMarsh; varying float vDepth;\n' + shader.fragmentShader.replace('#include <color_fragment>',
    `#include <color_fragment>
    vec3 eye = normalize(cameraPosition - vMarsh);
    vec2 Q = vMarsh.xz;
    float r1 = sin(dot(Q, vec2(1.43, 3.7)) + marshTime * 1.94);
    float r2 = sin(dot(Q, vec2(-2.63, 4.8)) - marshTime * 2.45 + r1);
    float r3 = sin(dot(Q, vec2(.71, 1.18)) - marshTime * .91);
    vec3 waterNormal = normalize(vec3((r1 + r3) * .036, 1., (r2 - r3) * (.063 + marshWeather * .034)));
    float fresnel = pow(1. - clamp(dot(eye, waterNormal), 0., 1.), 4.);
    float skyGlint = max(0., dot(reflect(-eye, waterNormal), normalize(vec3(-.37,.23,-1.))));
    float deep = smoothstep(.02, .55, vDepth + .018 * r3);
    vec3 bed = mix(vec3(.154,.122,.066), vec3(.038,.083,.076), deep);
    bed *= .91 + .047 * r1 + .035 * r3;
    float stripe = smoothstep(.018, .054, vDepth) * (1. - smoothstep(.058, .10, vDepth));
    bed += vec3(.035,.037,.019) * stripe * (.75 + .25 * r2);
    vec3 skyReflection = marshSky * (vec3(.34,.39,.45) + pow(skyGlint, 18.) * .49);
    diffuseColor.rgb = mix(bed, skyReflection, fresnel * .84);
    diffuseColor.rgb += marshSky * pow(skyGlint, 34.) * (.115 - .068 * marshWeather);`)
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
    const detail = new T.Mesh(new T.BufferGeometry(), terrainMaterial)
    const trees = new T.InstancedMesh(distantTrees[0], treeMaterial, treeCount)
    trees.count = 0
    const reeds = new T.InstancedMesh(blades, reedMaterial, reedCount)
    reeds.instanceMatrix.setUsage(T.DynamicDrawUsage)
    reeds.frustumCulled = false
    reeds.count = 0
    root.visible = false
    root.add(ground, water, reeds, detail, trees)
    scene.add(root)
    return { root, ground, water, detail, trees, reeds, reedData: null, index: null, wanted: null, dirty: true }
  })
  const slot = (index) => tiles[((index % tiles.length) + tiles.length) % tiles.length]
  const order = [0, -1, 1, 2, 3, 4, 5]
  const nearCount = [23, 43, 63]
  const farCount = [9, 17, 25]
  let lastWindFrame = -1
  let lastDetail = -1
  let building = false
  let worker
  let workerDeadline
  let center = 0

  function load(packet) {
    const tile = slot(packet.index)
    if (tile.wanted !== packet.index) return
    tile.ground.geometry.dispose()
    tile.water.geometry.dispose()
    tile.detail.geometry.dispose()
    tile.ground.geometry = unpack(packet.ground)
    tile.water.geometry = packet.water ? unpack(packet.water) : new T.BufferGeometry()
    tile.detail.geometry = unpack(packet.detail)
    tile.water.visible = Boolean(packet.water)
    tile.trees.geometry = distantTrees[Number(packet.flooded)]
    tile.trees.count = packet.trees.length / 6
    for (let n = 0; n < tile.trees.count; n++) {
      const at = n * 6
      dummy.position.fromArray(packet.trees, at)
      dummy.rotation.set(0, packet.trees[at + 4], 0)
      const height = packet.trees[at + 3]
      dummy.scale.set(height, height, height)
      dummy.updateMatrix()
      tile.trees.setMatrixAt(n, dummy.matrix)
      tile.trees.setColorAt(n, tint.setHex(treeTints[packet.trees[at + 5]]))
    }
    tile.trees.instanceMatrix.needsUpdate = true
    if (tile.trees.instanceColor) tile.trees.instanceColor.needsUpdate = true
    tile.trees.computeBoundingSphere()
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
      if (worker) {
        workerDeadline = setTimeout(useFallback, 4500)
        try { worker.postMessage(index) } catch { useFallback() }
      }
      else setTimeout(() => {
        if (tile.wanted === index) load(buildTile(index))
        building = false
        pump()
      }, 0)
      break
    }
  }
  function useFallback() {
    if (!worker) return
    clearTimeout(workerDeadline)
    worker.terminate()
    worker = undefined
    building = false
    pump()
  }

  try {
    worker = new Worker(new URL('./terrain-worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => {
      if (!worker) return
      clearTimeout(workerDeadline)
      load(data)
      building = false
      pump()
    }
    worker.onerror = worker.onmessageerror = useFallback
  } catch { /* The fallback builds one pending tile at a time. */ }
  // Warm the spawn seam on the worker before enabling Start.
  for (const index of order) slot(index).wanted = index
  pump()

  return {
    count() { return tiles.reduce((count, tile) => count + Number(tile.index !== null), 0) },
    readyAt(distance) {
      const index = Math.floor(distance / segmentLength)
      return slot(index).index === index
    },
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
        const near = i - center < (detail === 0 ? 2 : 3)
        tile.detail.visible = near
        tile.trees.visible = !near && tile.trees.count > 0
        if (tile.dirty || windFrame !== lastWindFrame || detail !== lastDetail) {
          const count = i - center < 2 ? nearCount[detail] : farCount[detail]
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
