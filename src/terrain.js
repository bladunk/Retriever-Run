import * as T from 'three'
import { createChimneySmoke, updateChimneySmoke } from './chimney-smoke.js'
import { fieldMaterials } from './materials.js'
import { buildTile, createDistantTree, reedCount, treeCount } from './terrain-geometry.js'
import { createBankPlant } from './marsh-plants.js'
import { marshWater, updateMarshWater } from './marsh-water.js'
import { centerAt, segmentLength } from './trail.js'

const vegetation = Array.from({ length: 3 }, (_, type) => [createBankPlant(type, true), createBankPlant(type)])
const distantTrees = Array.from({ length: 5 }, (_, style) => createDistantTree(style))
const treeMaterial = new T.MeshLambertMaterial({ vertexColors: true })
const treeTints = [0x9c8a74, 0xb49968, 0x87936c]
const dummy = new T.Object3D()

const { material: terrainMaterial, uniforms: field } = fieldMaterials
const detailMaterial = terrainMaterial.clone()
const lodRanges = [[43, 57, 71, 87], [69, 86, 99, 117], [69, 86, 126, 145]]
const lodRange = { value: new T.Vector4() }

function softenLOD(material, distant, baseShader) {
  material.customProgramCacheKey = () => distant ? 'field-tree-lod' : 'field-detail-lod'
  material.onBeforeCompile = shader => {
    baseShader?.(shader)
    shader.uniforms.lodRange = lodRange
    shader.vertexShader = 'varying float vTrailDepth;\n' + shader.vertexShader.replace('#include <fog_vertex>', `
      #include <fog_vertex>
      vec4 lodPosition = vec4(transformed, 1.);
      #ifdef USE_INSTANCING
        lodPosition = instanceMatrix * lodPosition;
      #endif
      vTrailDepth = -(modelMatrix * lodPosition).z;
    `)
    shader.fragmentShader = 'uniform vec4 lodRange; varying float vTrailDepth;\n' +
      shader.fragmentShader.replace('#include <clipping_planes_fragment>', `
      #include <clipping_planes_fragment>
      float handoff = smoothstep(lodRange.x, lodRange.y, vTrailDepth);
      float keep = ${distant ? 'handoff * (1. - smoothstep(lodRange.z, lodRange.w, vTrailDepth))' : '1. - handoff'};
      if (keep < 1.) {
        float screen = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(.06711056,.00583715))));
        if (${distant ? '1. - screen' : 'screen'} >= keep) discard;
      }
    `)
  }
}
softenLOD(detailMaterial, false, terrainMaterial.onBeforeCompile)
softenLOD(treeMaterial, true)

const reedMaterial = new T.MeshLambertMaterial({ color: 0xffffff, side: T.DoubleSide, vertexColors: true })
const windClock = { value: 0 }
const windStrength = { value: 0 }
reedMaterial.onBeforeCompile = shader => {
  shader.uniforms.windClock = windClock
  shader.uniforms.windStrength = windStrength
  shader.vertexShader = 'uniform float windClock, windStrength;\n' + shader.vertexShader
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      vec3 plantRoot = instanceMatrix[3].xyz;
      float lean = sin(windClock * 1.9 + plantRoot.x * .56 + plantRoot.z * .67);
      transformed.x += position.y * position.y * (lean * (.056 + windStrength * .24) + windStrength * .18);
      transformed.z += position.y * .13 * lean * windStrength;
    `)
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
    const water = new T.Mesh(new T.BufferGeometry(), marshWater)
    const detail = new T.Mesh(new T.BufferGeometry(), detailMaterial)
    const trees = new T.InstancedMesh(distantTrees[0], treeMaterial, treeCount)
    trees.count = 0
    const reeds = new T.InstancedMesh(vegetation[0][0], reedMaterial, reedCount)
    reeds.count = 0
    const smoke = createChimneySmoke()
    root.visible = false
    root.add(ground, water, reeds, detail, trees, smoke)
    scene.add(root)
    return { root, ground, water, detail, trees, reeds, smoke, hasChimney: false, plantType: 0, index: null, wanted: null }
  })
  const slot = (index) => tiles[((index % tiles.length) + tiles.length) % tiles.length]
  const order = [0, -1, 1, 2, 3, 4, 5]
  const nearCount = [14, 27, 40]
  const farCount = [7, 12, 17]
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
    tile.trees.geometry = distantTrees[packet.treeStyle]
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
    tile.plantType = packet.plantType
    for (let n = 0; n < reedCount; n++) {
      const at = n * 6
      dummy.position.fromArray(packet.reeds, at)
      dummy.rotation.set(.06, n * 2.39996, 0)
      dummy.scale.set(.72 + n % 5 * .13, .73 + n % 7 * .095, .77 + n % 3 * .19)
      dummy.updateMatrix()
      tile.reeds.setMatrixAt(n, dummy.matrix)
      tile.reeds.setColorAt(n, tint.fromArray(packet.reeds, at + 3))
    }
    tile.reeds.instanceMatrix.needsUpdate = true
    tile.reeds.instanceColor.needsUpdate = true
    tile.reeds.geometry = vegetation[tile.plantType][1]
    tile.reeds.count = reedCount
    tile.reeds.computeBoundingSphere()
    tile.reeds.boundingSphere.radius += .65
    tile.hasChimney = Boolean(packet.chimney)
    if (packet.chimney) tile.smoke.position.fromArray(packet.chimney)
    tile.index = packet.index
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
      updateMarshWater(time, offset, distance, weather, detail)
      updateChimneySmoke(time, weather.wind)
      windClock.value = time
      windStrength.value = weather.wind
      field.fieldWet.value = weather.wet
      field.fieldFrost.value = weather.frost ?? 0
      field.fieldDetail.value = detail
      const range = lodRanges[detail]
      lodRange.value.fromArray(range)
      for (let i = center - 1; i < center + 6; i++) {
        const tile = slot(i)
        tile.wanted = i
        const insideDrawDistance = i - center < (detail === 0 ? 4 : detail === 1 ? 5 : 6)
        tile.root.visible = tile.index === i && insideDrawDistance
        if (!tile.root.visible) continue
        tile.root.position.set(centerAt(i * segmentLength) - offset, 0, distance - i * segmentLength)
        const tileStart = i * segmentLength - distance
        // Include a margin for outer tree crowns that reach across tile edges.
        tile.detail.visible = tileStart < range[1] + 8
        const chimneyZ = tile.root.position.z + tile.smoke.position.z
        tile.smoke.visible = tile.hasChimney && detail > 0 && chimneyZ > -65 && chimneyZ < -6
        tile.trees.visible = tile.trees.count > 0 &&
          tileStart + segmentLength + 8 > range[0] && tileStart < range[3] + 8
        const richPlants = i - center <= (detail === 0 ? 0 : 1) ? 1 : 0
        tile.reeds.geometry = vegetation[tile.plantType][richPlants]
        tile.reeds.count = i - center < 2 ? nearCount[detail] : farCount[detail]
      }
      pump()
    },
  }
}
