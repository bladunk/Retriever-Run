import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { createResourcePool } from './resource-pool.js'

const descriptors = {
  trees: {
    model: new URL('./assets/environment/landscape-tree-cards.glb', import.meta.url).href,
    atlas: new URL('./assets/environment/landscape-tree-atlas.webp', import.meta.url).href,
    names: ['tree2', 'TreeSmall'], alpha: .45,
  },
  grass: {
    model: new URL('./assets/environment/landscape-grass.glb', import.meta.url).href,
    atlas: new URL('./assets/environment/landscape-grass-atlas.webp', import.meta.url).href,
    names: ['dryTuft', 'marshTuft'], alpha: .40,
  },
}

export const createEnvironmentCache = createResourcePool

const fernUrl = new URL('./assets/wildlife/living-fern.glb', import.meta.url).href
export const fernTerritories = new Set(['cypress','timber','ozark','parklands','boreal','foothills'])

async function loadPack(key) {
  if (key === 'ferns') {
    const { scene } = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(fernUrl)
    scene.updateMatrixWorld(true)
    let source
    scene.traverse(mesh => { if (mesh.isMesh) source = mesh })
    if (!source) throw new Error('Fern pack is empty')
    const mesh = source.geometry
    mesh.applyMatrix4(source.matrixWorld)
    mesh.computeBoundingBox()
    const center = mesh.boundingBox.getCenter(new T.Vector3())
    mesh.translate(-center.x, -mesh.boundingBox.min.y, -center.z)
    return { models: [mesh], material: source.material }
  }
  const descriptor = descriptors[key]
  const [model, atlas] = await Promise.allSettled([
    new GLTFLoader().loadAsync(descriptor.model), new T.TextureLoader().loadAsync(descriptor.atlas),
  ])
  const geometries = new Map()
  if (model.status === 'fulfilled') {
    model.value.scene.traverse(mesh => {
      if (!mesh.isMesh) return
      mesh.material.dispose()
      if (descriptor.names.includes(mesh.name)) geometries.set(mesh.name, mesh.geometry)
      else mesh.geometry.dispose()
    })
  }
  if (atlas.status !== 'fulfilled' || geometries.size !== descriptor.names.length) {
    if (atlas.status === 'fulfilled') atlas.value.dispose()
    for (const geometry of geometries.values()) geometry.dispose()
    throw new Error('Incomplete environment asset pack')
  }
  const texture = atlas.value
  texture.flipY = false
  texture.colorSpace = T.SRGBColorSpace
  texture.anisotropy = 2
  texture.needsUpdate = true
  const material = new T.MeshLambertMaterial({ map: texture, alphaTest: descriptor.alpha, side: T.DoubleSide })
  return { models: descriptor.names.map(name => geometries.get(name)), material }
}

export const environmentAssets = createEnvironmentCache(loadPack, pack => {
  for (const model of pack.models) model.dispose()
  const textures = new Set(Object.values(pack.material).filter(value => value?.isTexture))
  for (const texture of textures) {
    texture.dispose()
    texture.image?.close?.()
  }
  pack.material.dispose()
})
