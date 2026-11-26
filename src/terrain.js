import * as T from 'three'
import { createChimneySmoke, updateChimneySmoke } from './chimney-smoke.js'
import { gulfGeometry } from './gulf-models.js'
import { cypressModel } from './cypress-models.js'
import { prepareGulfSurfaces, regionalSurfaceResidency } from './gulf-surfaces.js'
import { cornModel } from './corn.js'
import { environmentAssets, fernTerritories } from './environment-assets.js'
import { landscapeProfiles } from './migration-landscapes.js'
import { expeditionRegions, regionAtDistance } from './expedition.js'
import { fieldAtlasShader } from './field-atlas-shader.js'
import { landscapeMap, landscapeReady, updateLandscapeQuality, landscapeResidency } from './landscape-atlas.js'
import { fieldMaterials } from './materials.js'
import { assignForestGeometry, forestModel, forestProfileAt, forestSurface } from './forest-models.js'
import { buildTile, createDistantTree, gulfGrassCount, reedCount, treeCount } from './terrain-geometry.js'
import { createBankPlant } from './marsh-plants.js'
import { marshWater, updateMarshWater } from './marsh-water.js'
import { planEncounter } from './wildlife-encounters.js'
import { replaceTileGeometry } from './tile-mesh.js'
import { createInstancedPreparation } from './gpu-preparation.js'
import { centerAt, segmentLength } from './trail.js'

const vegetation = Array.from({ length: 3 }, (_, type) => [createBankPlant(type, true), createBankPlant(type)])
const distantTrees = Array.from({ length: 5 }, (_, style) => createDistantTree(style))
const treeMaterial = new T.MeshLambertMaterial({ vertexColors: true })
const forestMaterial = forestSurface()
const cropMaterial = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide })
const fieldTints = [0xf6e4c9, 0xfff5de, 0xe0dfc3]
const coverTypes = new Set(landscapeProfiles.filter(region => region.licensedGrass).map(region => region.key))
const cropGeometries = [cornModel(), cornModel(false, true), cornModel(true)]
const cropFarMaterial = cropMaterial.clone()
const cardsReady = new WeakSet()
const dummy = new T.Object3D()

const { material: terrainMaterial, gulfTerrain, uniforms: field } = fieldMaterials
const detailMaterial = terrainMaterial.clone()
const landmarkMaterial = terrainMaterial.clone()
const lodRanges = [[43, 57, 71, 87], [69, 86, 99, 117], [69, 86, 126, 145]]
const lodRange = { value: new T.Vector4() }

// Canopies keep one solid depth-tested silhouette for the lifetime of a tile.
// Only their distant color blends into the existing horizon haze.
function settleTreeHaze(material, wind = false) {
  material.customProgramCacheKey = () => wind ? 'terrain-tree-wind' : 'terrain-tree-haze'
  material.onBeforeCompile = shader => {
    if (wind && shader.vertexShader) {
      shader.uniforms.landscapeMap = landscapeMap
      shader.uniforms.landscapeReady = landscapeReady
      shader.uniforms.forestQuality = field.fieldDetail
      shader.uniforms.windClock = windClock
      shader.uniforms.windStrength = windStrength
      shader.vertexShader = 'uniform float windClock, windStrength; varying vec3 barkPoint; varying float solidWood;\n' + shader.vertexShader
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          barkPoint = position;
          solidWood = 1. - step(.055,uv.x);
          #ifdef USE_INSTANCING
            float crown = smoothstep(.39, .98, position.y);
            float gust = sin(windClock * 1.13 + instanceMatrix[3].x * .46 + instanceMatrix[3].z * .52);
            transformed.x += crown * (gust * .008 + windStrength * (.011 + gust * .009));
            transformed.z += crown * sin(windClock * .81 + instanceMatrix[3].x) * .007;
          #endif
        `)
      shader.fragmentShader = fieldAtlasShader + `
        uniform float forestQuality;
        varying vec3 barkPoint;
        varying float solidWood;
      ` + shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        if (landscapeReady > .5 && solidWood > .5 && forestQuality > .0) {
          vec2 barkUV = vec2((barkPoint.x + barkPoint.z * .83) * 2.8, barkPoint.y * 2.4);
          vec2 dx = dFdx(barkUV), dy = dFdy(barkUV);
          float near = 1. - smoothstep(.062, .22, max(length(dx), length(dy)));
          if (near > .005) diffuseColor.rgb *= mix(vec3(1.), .56 + 1.12 * scannedSurface(15.,barkUV,dx,dy), near);
        }
      `)
    }
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
landmarkMaterial.name = 'Opaque landmarks'
landmarkMaterial.customProgramCacheKey = () => 'field-solid-landmarks'
landmarkMaterial.onBeforeCompile = shader => {
  terrainMaterial.onBeforeCompile(shader)
  shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', `
    #include <fog_fragment>
    #ifdef USE_FOG
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(86., 136., vFogDepth));
    #endif
  `)
}
settleTreeHaze(treeMaterial)
settleTreeHaze(forestMaterial, true)
function cropWind(shader) {
  shader.uniforms.windClock = windClock
  shader.uniforms.windStrength = windStrength
  shader.vertexShader = 'uniform float windClock, windStrength;\n' + shader.vertexShader
    .replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float stalk = max(0., position.y);
      float sway = sin(windClock*1.7 + instanceMatrix[3].x*.64 + instanceMatrix[3].z*.67);
      transformed.x += stalk*stalk*(.032 + windStrength*.11)*sway;
      #endif
    `)
}
softenLOD(cropMaterial, false, cropWind)
softenLOD(cropFarMaterial, true, cropWind)

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

export function createTerrain(scene, showSign, probe) {
  const tint = new T.Color()
  const tiles = Array.from({ length: 7 }, () => {
    const root = new T.Group()
    const ground = new T.Mesh(new T.BufferGeometry(), terrainMaterial)
    const water = new T.Mesh(new T.BufferGeometry(), marshWater)
    const detail = new T.Mesh(new T.BufferGeometry(), detailMaterial)
    const solid = new T.Mesh(new T.BufferGeometry(), landmarkMaterial)
    solid.name = 'Solid scenery'
    const trees = batch(distantTrees[0], treeMaterial, treeCount)
    const forest = [batch(distantTrees[0], forestMaterial, treeCount), batch(distantTrees[0], forestMaterial, treeCount)]
    trees.name = 'Outer bank trees'
    for (const grove of forest) grove.name = 'Canopy instances'
    const crops = [batch(cropGeometries[0], cropMaterial, 112), batch(cropGeometries[1], cropFarMaterial, 112)]
    const tufts = batch(vegetation[0][0], reedMaterial, gulfGrassCount)
    const ferns = batch(vegetation[0][0], reedMaterial, 4)
    const reeds = batch(vegetation[0][0], reedMaterial, reedCount)
    const smoke = createChimneySmoke()
    root.visible = false
    root.add(ground, water, reeds, detail, solid, trees, ...forest, ...crops, tufts, ferns, smoke)
    scene.add(root)
    return { root, ground, water, detail, solid, trees, forest, crops, tufts, ferns, reeds, smoke, hasChimney: false,
      plantType: 0, index: null, wanted: null }
  })
  const slot = (index) => tiles[((index % tiles.length) + tiles.length) % tiles.length]
  const order = [0, -1, 1, 2, 3, 4, 5]
  const nearCount = [14, 27, 40]
  const farCount = [7, 12, 17]
  let building = false
  let integration
  const current = (tile, packet) => tile.wanted === packet.index && (packet.seed ?? 0) === seedAt(packet.index)
  let worker
  let workerDeadline
  let center = 0
  let terrainSeed = 0
  const seedAt = index => index < 3 ? 0 : terrainSeed
  let requestedEnvironment = false
  let requestedFerns = false
  let keepOpeningFerns = false
  const fernGPU = createInstancedPreparation(scene, 'Habitat / Fern 02', probe)
  let lastAtlas = landscapeMap.value
  let compactAtlas
  const openingTiles = new Map()
  let openingHits = 0
  const activeEncounters = []

  function requestPack(key) {
    const start = probe?.stamp()
    probe?.operation('habitat-request', key)
    const pending = environmentAssets.request(key)
    if (probe) pending.then(pack => {
      if (pack) {
        for (const model of pack.models) probe.geometry(model, 'Habitat / ' + key)
        probe.material(pack.material, 'Habitat / ' + key)
      }
      probe.operation(pack ? 'habitat-ready' : 'habitat-unavailable', key, start)
    })
  }

  function* integrate(tile, packet) {
    tile.installing = true
    // Old buffers have been replaced after the first slice. Keep a partial
    // tile out of both rendering and the readyAt contract until commit.
    tile.index = null
    try {
      yield* installParts(tile, packet)
    } finally {
      tile.installing = false
    }
  }

  function* installParts(tile, packet) {
    // These four packets always use seed zero. A restart can reuse their
    // immutable typed arrays after the tile slots have streamed elsewhere.
    if (packet.index >= -1 && packet.index < 3) openingTiles.set(packet.index, packet)

    for (const key of ['ground', 'water', 'detail', 'solid']) {
      replaceTileGeometry(tile[key], packet[key])
      if (packet[key]) probe?.geometry(tile[key].geometry, packet.territory + ' / ' + key + ' / ' + packet.index)
    }
    tile.ground.material = packet.index * segmentLength < expeditionRegions[1].fadeTo ? gulfTerrain : terrainMaterial
    tile.solid.visible = Boolean(packet.solid)
    tile.hasWater = Boolean(packet.water)
    yield
    const variants = forestProfileAt(packet.territory, packet.index)
    const cards = coverTypes.has(packet.territory) ? environmentAssets.get('trees') : null
    const grasses = coverTypes.has(packet.territory) ? environmentAssets.get('grass') : null
    tile.usesEnvironmentPack = Boolean(cards || grasses)
    if (cards && !cardsReady.has(cards)) {
      settleTreeHaze(cards.material)
      cardsReady.add(cards)
    }
    const variant = Math.abs(packet.index) % 2
    tile.trees.geometry = cards?.models[variant] ?? distantTrees[packet.treeStyle]
    tile.trees.material = cards?.material ?? treeMaterial
    tile.trees.count = 0
    const swamp = packet.territory === 'cypress'
    tile.swamp = swamp
    for (const [index, mesh] of tile.forest.entries()) {
      assignForestGeometry(mesh, swamp ? cypressModel(index > 0 ? 2 : variant)
        : forestModel(variants[index], field.fieldDetail.value < 2, Math.abs(packet.index + index) % 2))
      mesh.count = 0
    }
    for (let n = 0; n < packet.trees.length / 7; n++) {
      const at = n * 7
      dummy.position.fromArray(packet.trees, at)
      dummy.rotation.set(0, packet.trees[at + 4], 0)
      const height = packet.trees[at + 3]
      const width = height * (.80 + n % 5 * .087)
      // Outer-bank trees use a single lighter silhouette at every distance.
      // They never share a pivot or fade against a near-bank tree.
      const outer = !swamp && Math.abs(packet.trees[at]) > 26
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
    yield
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
    tile.tufts.geometry = vegetation[packet.plantType][0]
    tile.tufts.material = reedMaterial
    const gulf = packet.territory === 'gulf'
    if (gulf || swamp) {
      tile.tufts.geometry = gulf ? gulfGeometry('CordgrassLOD1') : cypressModel(3)
      tile.tufts.count = packet.shoreGrass.length / 4
      for (let n = 0; n < tile.tufts.count; n++) {
        const offset = n * 4
        dummy.position.fromArray(packet.shoreGrass, offset)
        dummy.rotation.set(.035 * (n % 3), n * 2.39996, .04)
        dummy.scale.setScalar(packet.shoreGrass[offset + 3])
        dummy.updateMatrix()
        tile.tufts.setMatrixAt(n, dummy.matrix)
        tile.tufts.setColorAt(n, tint.setHex(0xe5e6c6).multiplyScalar(.75 + .065 * (n % 5)))
      }
      updateBatch(tile.tufts)
    } else if (grasses) {
      tile.tufts.geometry = grasses.models[packet.territory === 'farm' || packet.territory === 'prairie' ? 0 : 1]
      tile.tufts.material = grasses.material
      tile.tufts.count = Math.min(16, Math.floor(packet.reeds.length / 24))
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
    yield
    const fern = fernTerritories.has(packet.territory) ? environmentAssets.get('ferns') : null
    tile.ferns.geometry = fern?.models[0] ?? vegetation[0][0]
    tile.ferns.material = fern?.material ?? reedMaterial
    tile.ferns.count = 0
    if (fern) for (let n = 1; n < packet.reeds.length / 6 && tile.ferns.count < 4; n += 3) {
      const index = n * 6
      if (packet.reeds[index + 1] < -.42 || Math.abs(packet.reeds[index]) < 4) continue
      dummy.position.fromArray(packet.reeds,index)
      dummy.rotation.set(0,n * 2.37,0)
      dummy.scale.setScalar(.84 + (n % 5) * .10)
      dummy.updateMatrix()
      tile.ferns.setMatrixAt(tile.ferns.count, dummy.matrix)
      tile.ferns.setColorAt(tile.ferns.count++, tint.setHex(0xe1e0c4))
    }
    updateBatch(tile.ferns)
    tile.usesFernPack = Boolean(fern)
    tile.plantType = packet.plantType
    tile.gulf = gulf
    tile.reedTotal = packet.reeds.length / 6
    for (let n = 0; n < tile.reedTotal; n++) {
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
    tile.reeds.count = tile.reedTotal
    tile.reeds.computeBoundingSphere()
    tile.reeds.boundingSphere.radius += .65
    tile.hasChimney = Boolean(packet.chimney)
    if (packet.chimney) tile.smoke.position.fromArray(packet.chimney)
    tile.sign = packet.sign
    tile.index = packet.index
    tile.seed = packet.seed ?? 0
    tile.landmark = packet.landmark
    tile.habitats = packet.habitats
    tile.fauna = { index: packet.index, territory: packet.territory, anchors: packet.anchors }
    tile.encounter = planEncounter(tile.fauna, terrainSeed)
  }

  function queue(packet) {
    const tile = slot(packet.index)
    if (integration || !current(tile, packet)) return
    integration = { tile, packet, work: integrate(tile, packet), total: 0, max: 0 }
  }

  function integrateFrame() {
    if (!integration) return
    const job = integration
    if (!current(job.tile, job.packet)) {
      job.work.return()
      integration = null
      return
    }
    const start = performance.now()
    const { done } = job.work.next()
    const duration = performance.now() - start
    job.total += duration
    job.max = Math.max(job.max, duration)
    if (done) {
      job.tile.preparation = { buildMs: job.packet.buildMs, unpackMs: job.total, integrationPeakMs: job.max }
      probe?.operation('terrain-ready', job.packet.index, start)
      integration = null
    } else if (probe && duration > 4) probe.operation('terrain-slice', job.packet.index, start)
  }

  function pump() {
    if (integration) return
    for (const offset of order) {
      const index = center + offset
      const tile = slot(index)
      if (tile.wanted !== index || tile.index === index && tile.seed === seedAt(index)) continue
      const cached = openingTiles.get(index)
      if (cached) {
        openingHits++
        queue(cached)
        break
      }
      if (building) return
      building = true
      if (worker) {
        workerDeadline = setTimeout(useFallback, 4500)
        try { worker.postMessage(seedAt(index) ? { index, seed: seedAt(index) } : index) } catch { useFallback() }
      }
      else setTimeout(() => {
        if (tile.wanted === index) {
          const start = performance.now()
          const packet = buildTile(index, seedAt(index))
          packet.buildMs = performance.now() - start
          probe?.operation('terrain-main-thread-build', index, start)
          queue(packet)
        }
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
    probe?.operation('terrain-worker-fallback', center)
    pump()
  }

  try {
    worker = new Worker(new URL('./terrain-worker.js', import.meta.url), { type: 'module' })
    worker.onmessage = ({ data }) => {
      if (!worker) return
      clearTimeout(workerDeadline)
      queue(data)
      building = false
      pump()
    }
    worker.onerror = worker.onmessageerror = useFallback
  } catch { /* The fallback builds one pending tile at a time. */ }
  // Warm the spawn seam on the worker before enabling Start.
  for (const index of order) slot(index).wanted = index
  pump()

  return {
    packCount: environmentAssets.count,
    openingMetrics: () => ({ packets: openingTiles.size, reused: openingHits }),
    landscapeResidency: () => ({ ...landscapeResidency(), ...regionalSurfaceResidency() }),
    sightMeshes(target) {
      target.length = 0
      for (const tile of tiles) {
        if (!tile.root.visible) continue
        tile.root.updateMatrixWorld(true)
        for (const mesh of [tile.ground, tile.solid, tile.detail, tile.trees, ...tile.forest, ...tile.crops]) {
          if (mesh.visible) target.push(mesh)
        }
      }
    },
    measurements() {
      return tiles.filter(tile => tile.root.visible).map(tile => ({ index: tile.index, ...tile.preparation }))
    },
    setSeed(value) {
      terrainSeed = value >>> 0
      for (const tile of tiles) if (tile.index !== null && tile.index < 3 && tile.fauna) tile.encounter = planEncounter(tile.fauna, terrainSeed)
    },
    encounters() {
      activeEncounters.length = 0
      for (const tile of tiles) {
        if (tile.index !== null && tile.seed === seedAt(tile.index) && tile.encounter) activeEncounters.push(tile.encounter)
      }
      return activeEncounters
    },
    stamps() { return tiles.filter(tile => tile.root.visible).map(tile => ({
      index: tile.index, landmark: tile.landmark, solid: tile.solid.visible ? tile.solid.geometry.id : null,
      solidOpaque: tile.solid.visible && !tile.solid.material.transparent && tile.solid.material.opacity === 1, habitats: tile.habitats?.length ?? 0,
    })) },
    count() { return tiles.reduce((count, tile) => count + Number(tile.index !== null), 0) },
    prepareFerns(renderer, camera, prime, detail, distance) {
      if (prime && detail > 0 && distance < 120 && !requestedFerns) {
        keepOpeningFerns = true
        requestedFerns = true
        requestPack('ferns')
        return true
      }
      if (detail > 0 && requestedFerns) return fernGPU.step(renderer, camera, environmentAssets.get('ferns'))
    },
    invalidateGPU: fernGPU.clear,
    readyAt(distance) {
      const index = Math.floor(distance / segmentLength)
      return slot(index).index === index && slot(index).seed === seedAt(index)
    },
    update(distance, time, weather, detail) {
      const usesHabitatPack = coverTypes.has(regionAtDistance(distance).key) ||
        coverTypes.has(regionAtDistance(distance + 320).key)
      if (!requestedEnvironment && usesHabitatPack) {
        requestedEnvironment = true
        requestPack('trees')
        requestPack('grass')
      }
      const wantsFern = detail > 0 && ((keepOpeningFerns && distance < expeditionRegions[1].marker) ||
        fernTerritories.has(regionAtDistance(distance).key) ||
        fernTerritories.has(regionAtDistance(distance + 380).key))
      if (wantsFern && !requestedFerns) {
        requestedFerns = true
        requestPack('ferns')
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
      if (probe && compactAtlas !== (detail === 0)) {
        compactAtlas = detail === 0
        probe.operation('atlas-selection', compactAtlas ? 'compact' : 'full')
      }
      updateLandscapeQuality(detail)
      prepareGulfSurfaces(distance < expeditionRegions[1].marker + 44, probe)
      if (probe && lastAtlas !== landscapeMap.value) {
        lastAtlas = landscapeMap.value
        probe.texture(lastAtlas, 'Terrain / landscape atlas')
        probe.operation('atlas-swap', landscapeResidency().active)
      }
      for (let i = center - 1; i < center + 6; i++) slot(i).wanted = i
      integrateFrame()
      const range = lodRanges[detail]
      lodRange.value.fromArray(range)
      for (let i = center - 1; i < center + 6; i++) {
        const tile = slot(i)
        const insideDrawDistance = i - center < (detail === 0 ? 4 : detail === 1 ? 5 : 6)
        tile.root.visible = !tile.installing && tile.index === i && tile.seed === seedAt(i)
        if (!tile.root.visible) continue
        tile.ground.visible = insideDrawDistance
        tile.water.visible = tile.hasWater && insideDrawDistance
        tile.reeds.visible = insideDrawDistance
        tile.detail.visible = insideDrawDistance
        if (tile.sign) showSign?.(tile.sign, distance)
        tile.root.position.set(centerAt(i * segmentLength) - offset, 0, distance - i * segmentLength)
        const tileStart = i * segmentLength - distance
        // Include a margin for outer tree crowns that reach across tile edges.
        tile.detail.visible = insideDrawDistance && tileStart < range[1] + 8
        const chimneyZ = tile.root.position.z + tile.smoke.position.z
        tile.smoke.visible = tile.hasChimney && detail > 0 && chimneyZ > -65 && chimneyZ < -6
        tile.trees.visible = tile.trees.count > 0 && tileStart < 113
        for (const [index, grove] of tile.forest.entries()) {
          const range = detail === 0 ? 64 : detail === 1 ? 86 : 106
          grove.visible = grove.count > 0 && tileStart < range + (tile.swamp ? index === 1 ? 19 : -9 : 0)
        }
        tile.crops[0].visible = tile.crops[0].count > 0 && tileStart < range[1] + 2
        tile.crops[1].visible = tile.crops[1].count > 0 &&
          tileStart + segmentLength + 2 > range[0] && tileStart < range[3] + 2
        tile.ferns.visible = detail > 0 && fernGPU.ready() && tile.ferns.count > 0 && tileStart < 49
        tile.tufts.visible = tile.tufts.count > 0 && (tile.gulf || tile.swamp ? tileStart < (detail > 0 ? 44 : 18)
          : detail > 0 && tileStart < 38)
        if (tile.gulf) tile.tufts.geometry = gulfGeometry(detail > 1 && tileStart < 15 ? 'CordgrassLOD0' : 'CordgrassLOD1')
        const richPlants = i - center <= (detail === 0 ? 0 : 1) ? 1 : 0
        tile.reeds.geometry = tile.gulf
          ? gulfGeometry(richPlants && detail > 0 ? 'CattailLOD0' : 'CattailLOD1')
          : vegetation[tile.plantType][richPlants]
        tile.reeds.count = Math.min(tile.reedTotal, i - center < 2 ? nearCount[detail] : farCount[detail])
      }
      if (requestedEnvironment && !usesHabitatPack && tiles.every(tile => !tile.usesEnvironmentPack)) {
        const started = probe?.stamp()
        environmentAssets.release('trees')
        environmentAssets.release('grass')
        probe?.operation('habitat-release', 'trees and grass', started)
        requestedEnvironment = false
      }
      if (requestedFerns && !wantsFern && !fernGPU.busy() && tiles.every(tile => !tile.usesFernPack)) {
        const started = probe?.stamp()
        fernGPU.clear()
        environmentAssets.release('ferns')
        probe?.operation('habitat-release', 'ferns', started)
        requestedFerns = false
        keepOpeningFerns = false
      }
      pump()
    },
  }
}
