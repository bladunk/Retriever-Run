import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

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

export function createEnvironmentCache(load) {
  const pending = new Map()
  const ready = new Map()
  return {
    request(key) {
      if (!pending.has(key)) {
        pending.set(key, Promise.resolve().then(() => load(key)).then(value => {
          ready.set(key, value)
          return value
        }, () => null))
      }
      return pending.get(key)
    },
    get(key) { return ready.get(key) ?? null },
  }
}

async function loadPack(key) {
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

export const environmentAssets = createEnvironmentCache(loadPack)
