import * as T from 'three'
import { createChimneySmoke, updateChimneySmoke } from './chimney-smoke.js'
import { cornModel } from './corn.js'
import { environmentAssets } from './environment-assets.js'
import { expeditionRegions } from './expedition.js'
import { fieldMaterials } from './materials.js'
import { forestModel, forestProfiles, forestSurface } from './forest-models.js'
import { buildTile, createDistantTree, reedCount, treeCount } from './terrain-geometry.js'
import { createBankPlant } from './marsh-plants.js'
import { marshWater, updateMarshWater } from './marsh-water.js'
import { centerAt, segmentLength } from './trail.js'

const vegetation = Array.from({ length: 3 }, (_, type) => [createBankPlant(type, true), createBankPlant(type)])
const distantTrees = Array.from({ length: 5 }, (_, style) => createDistantTree(style))
const treeMaterial = new T.MeshLambertMaterial({ vertexColors: true })
const forestMaterial = forestSurface()
const cropMaterial = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide })
const fieldTints = [0xf6e4c9, 0xfff5de, 0xe0dfc3]
const coverTypes = new Set(['flyway', 'timber', 'farm', 'prairie', 'dakota'])
const cropGeometries = [cornModel(), cornModel(false, true), cornModel(true)]
const cropFarMaterial = cropMaterial.clone()
const cardsReady = new WeakSet()
const dummy = new T.Object3D()

const { material: terrainMaterial, uniforms: field } = fieldMaterials
const detailMaterial = terrainMaterial.clone()
const lodRanges = [[43, 57, 71, 87], [69, 86, 99, 117], [69, 86, 126, 145]]
const lodRange = { value: new T.Vector4() }

// Canopies keep one solid depth-tested silhouette for the lifetime of a tile.
// Only their distant color blends into the existing horizon haze.
function settleTreeHaze(material) {
  material.customProgramCacheKey = () => 'terrain-tree-haze'
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', `
      #include <fog_fragment>
      #ifdef USE_FOG
        gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, .94 * smoothstep(73., 119., vFogDepth));
      #endif
    `)
  }
}

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
settleTreeHaze(treeMaterial)
settleTreeHaze(forestMaterial)
softenLOD(cropMaterial, false)
softenLOD(cropFarMaterial, true)

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

function batch(geometry, material, capacity) {
  const mesh = new T.InstancedMesh(geometry, material, capacity)
  mesh.count = 0
  return mesh
}

function updateBatch(mesh) {
  if (!mesh.count) return
  mesh.instanceMatrix.needsUpdate = true
  mesh.instanceColor.needsUpdate = true
  mesh.computeBoundingSphere()
}

export function createTerrain(scene) {
  const tint = new T.Color()
  const tiles = Array.from({ length: 7 }, () => {
    const root = new T.Group()
    const ground = new T.Mesh(new T.BufferGeometry(), terrainMaterial)
    const water = new T.Mesh(new T.BufferGeometry(), marshWater)
    const detail = new T.Mesh(new T.BufferGeometry(), detailMaterial)
    const trees = batch(distantTrees[0], treeMaterial, treeCount)
    const forest = [batch(distantTrees[0], forestMaterial, treeCount), batch(distantTrees[0], forestMaterial, treeCount)]
    trees.name = 'Outer bank trees'
    for (const grove of forest) grove.name = 'Canopy instances'
    const crops = [batch(cropGeometries[0], cropMaterial, 112), batch(cropGeometries[1], cropFarMaterial, 112)]
    const tufts = batch(vegetation[0][0], reedMaterial, 16)
    const reeds = batch(vegetation[0][0], reedMaterial, reedCount)
    const smoke = createChimneySmoke()
    root.visible = false
    root.add(ground, water, reeds, detail, trees, ...forest, ...crops, tufts, smoke)
    scene.add(root)
    return { root, ground, water, detail, trees, forest, crops, tufts, reeds, smoke, hasChimney: false,
      plantType: 0, index: null, wanted: null }
  })
  const slot = (index) => tiles[((index % tiles.length) + tiles.length) % tiles.length]
  const order = [0, -1, 1, 2, 3, 4, 5]
  const nearCount = [14, 27, 40]
  const farCount = [7, 12, 17]
  let building = false
  let worker
  let workerDeadline
  let center = 0
  let requestedEnvironment = false
  const openingTiles = new Map()

  function load(packet) {
    const tile = slot(packet.index)
    if (tile.wanted !== packet.index) return
    if (packet.index === 0 || packet.index === -1) openingTiles.set(packet.index, packet)
    tile.ground.geometry.dispose()
    tile.water.geometry.dispose()
    tile.detail.geometry.dispose()
    tile.ground.geometry = unpack(packet.ground)
    tile.water.geometry = packet.water ? unpack(packet.water) : new T.BufferGeometry()
    tile.detail.geometry = unpack(packet.detail)
    tile.water.visible = Boolean(packet.water)
    const variants = forestProfiles[packet.territory]
    const cards = coverTypes.has(packet.territory) ? environmentAssets.get('trees') : null
    const grasses = coverTypes.has(packet.territory) ? environmentAssets.get('grass') : null
    if (cards && !cardsReady.has(cards)) {
      settleTreeHaze(cards.material)
      cardsReady.add(cards)
    }
    const variant = Math.abs(packet.index) % 2
    tile.trees.geometry = cards?.models[variant] ?? distantTrees[packet.treeStyle]
    tile.trees.material = cards?.material ?? treeMaterial
    tile.trees.count = 0
    for (const [index, mesh] of tile.forest.entries()) {
      mesh.geometry = forestModel(variants[index], true)
      mesh.count = 0
    }
    for (let n = 0; n < packet.trees.length / 7; n++) {
      const at = n * 7
      dummy.position.fromArray(packet.trees, at)
      dummy.rotation.set(0, packet.trees[at + 4], 0)
      const height = packet.trees[at + 3]
      const width = height * (.86 + n % 5 * .072)
      // Outer-bank trees use a single lighter silhouette at every distance.
      // They never share a pivot or fade against a near-bank tree.
      const outer = Math.abs(packet.trees[at]) > 23 && n % 3 !== 0
      const batch = outer ? tile.trees : tile.forest[variants[0] === variants[1] ? 0 : packet.trees[at + 6]]
      dummy.scale.set(width, height, width)
      if (outer && cards) {
        const unit = variant ? 4.8 : 6.2
        dummy.scale.set(width / unit, height / unit, width / unit)
      }
      dummy.updateMatrix()
      batch.setMatrixAt(batch.count, dummy.matrix)
      batch.setColorAt(batch.count++, tint.setHex(fieldTints[packet.trees[at + 5]]).multiplyScalar(outer ? .83 : 1))
    }
    for (const mesh of [tile.trees, ...tile.forest]) updateBatch(mesh)
    for (const [index, mesh] of tile.crops.entries()) {
      mesh.geometry = cropGeometries[packet.harvested ? 2 : index]
      mesh.count = packet.crops.length / 6
      for (let n = 0; n < mesh.count; n++) {
        const at = n * 6
        dummy.position.fromArray(packet.crops, at)
        dummy.rotation.set(.03 * (n % 4), packet.crops[at + 4], .035 * (n % 3))
        const size = packet.crops[at + 3]
        dummy.scale.set(size, size, size)
        dummy.updateMatrix()
        mesh.setMatrixAt(n, dummy.matrix)
        mesh.setColorAt(n, tint.setHex(fieldTints[packet.crops[at + 5]]))
      }
      updateBatch(mesh)
    }
    tile.tufts.count = 0
    if (grasses) {
      tile.tufts.geometry = grasses.models[packet.territory === 'farm' || packet.territory === 'prairie' ? 0 : 1]
      tile.tufts.material = grasses.material
      tile.tufts.count = 16
      for (let n = 0; n < tile.tufts.count; n++) {
        dummy.position.fromArray(packet.reeds, (n * 4 + 2) * 6)
        dummy.rotation.set(0, n * 2.39996, 0)
        dummy.scale.setScalar(1.43 + .21 * (n % 6))
        dummy.updateMatrix()
        tile.tufts.setMatrixAt(n, dummy.matrix)
        tile.tufts.setColorAt(n, tint.setHex(fieldTints[n % 3]))
      }
      updateBatch(tile.tufts)
    }
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
      if (!requestedEnvironment && distance >= expeditionRegions[2].marker - 320 && distance <= expeditionRegions[7].marker + 120) {
        requestedEnvironment = true
        environmentAssets.request('trees')
        environmentAssets.request('grass')
      }
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
        if (tile.index !== i && openingTiles.has(i)) load(openingTiles.get(i))
        const insideDrawDistance = i - center < (detail === 0 ? 4 : detail === 1 ? 5 : 6)
        tile.root.visible = tile.index === i && insideDrawDistance
        if (!tile.root.visible) continue
        tile.root.position.set(centerAt(i * segmentLength) - offset, 0, distance - i * segmentLength)
        const tileStart = i * segmentLength - distance
        // Include a margin for outer tree crowns that reach across tile edges.
        tile.detail.visible = tileStart < range[1] + 8
        const chimneyZ = tile.root.position.z + tile.smoke.position.z
        tile.smoke.visible = tile.hasChimney && detail > 0 && chimneyZ > -65 && chimneyZ < -6
        tile.trees.visible = tile.trees.count > 0 && tileStart < 113
        for (const grove of tile.forest) grove.visible = grove.count > 0 && tileStart < 103
        tile.crops[0].visible = tile.crops[0].count > 0 && tileStart < range[1] + 2
        tile.crops[1].visible = tile.crops[1].count > 0 &&
          tileStart + segmentLength + 2 > range[0] && tileStart < range[3] + 2
        tile.tufts.visible = detail > 0 && tile.tufts.count > 0 && tileStart < 38
        const richPlants = i - center <= (detail === 0 ? 0 : 1) ? 1 : 0
        tile.reeds.geometry = vegetation[tile.plantType][richPlants]
        tile.reeds.count = i - center < 2 ? nearCount[detail] : farCount[detail]
      }
      pump()
    },
  }
}
