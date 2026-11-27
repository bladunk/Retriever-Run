import { disposeModel as disposeWildlifeModel } from './model-disposal.js'
import * as T from 'three'
import { clearGeometryUploader, uploadGeometry } from './gpu-preparation.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

export const livingModels = {
  mallard: { url: new URL('./assets/wildlife/living-mallard.glb', import.meta.url).href, face: Math.PI, scaleAxis: 'z' },
  eagle: { url: new URL('./assets/wildlife/living-eagle.glb', import.meta.url).href, face: Math.PI, scaleAxis: 'z' },
  deer: { url: new URL('./assets/wildlife/living-deer.glb', import.meta.url).href, face: Math.PI, scaleAxis: 'z' },
}

export { disposeWildlifeModel }

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
export function createWildlifeModels(probe, loadModel = url => loader.loadAsync(url), canPrepare = () => true) {
  const decoded = new Map()
  let waiting
  let loaded
  let wanted = []
  const failed = new Set()
  let loadMs = 0
  let releasedBoneTextures = 0
  let hits = 0
  let misses = 0
  let evictions = 0
  let lastRequested = ''
  const limit = 2

  function preparation(model) {
    const textures = new Set()
    const skeletons = new Set()
    const shades = []
    const geometries = new Set()
    model.root.traverse(node => {
      if (!node.isMesh) return
      shades.push(node)
      geometries.add(node.geometry)
      if (node.isSkinnedMesh) skeletons.add(node.skeleton)
      for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
        for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
      }
    })
    return { textures: [...textures], skeletons: [...skeletons], geometries: [...geometries], shades,
      texture: 0, skeleton: 0, geometry: 0, shade: 0, pending: false }
  }

  function release(id, model) {
    const started = probe?.stamp()
    const released = disposeWildlifeModel(model)
    releasedBoneTextures += released
    if (probe) probe.operation('wildlife-release', `${id} · ${released} bone textures`, started)
  }

  function prepare() {
    if (!canPrepare() || waiting) return
    if (loaded) {
      const { id, scene, animations, desc } = loaded
      loaded = undefined
      const setup = probe?.stamp()
      const bounds = new T.Box3().setFromObject(scene)
      const scale = Math.max(.001, bounds.max[desc.scaleAxis] - bounds.min[desc.scaleAxis])
      const root = new T.Group()
      scene.position.set(0, -bounds.min.y, 0)
      scene.rotation.y = desc.face
      root.add(scene)
      const mix = new T.AnimationMixer(root)
      // The encounter path supplies translation. Keep vertical rig motion
      // while preventing authored clips from also pulling along the ground.
      for (const clip of animations) for (const track of clip.tracks) {
        if (track.name !== (id === 'deer' ? 'Main.position' : 'Root.position')) continue
        for (let key=3; key<track.values.length; key+=3) {
          track.values[key] = track.values[0]
          track.values[key+2] = track.values[2]
        }
      }
      const actions = Object.fromEntries(animations.map(clip => [clip.name, mix.clipAction(clip)]))
      const model = { root, mix, scale, actions }
      model.warmup = preparation(model)
      if (probe) for (const mesh of model.warmup.shades) {
        probe.geometry(mesh.geometry, 'Wildlife / ' + id + ' / ' + mesh.name)
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material])
          probe.material(material, 'Wildlife / ' + id)
      }
      probe?.operation('wildlife-rig-setup', id, setup)
      if (wanted.includes(id)) decoded.set(id, model)
      else release(id, model)
      // A fresh assembly and a GPU step get separate frames.
      return true
    }
    const id = wanted.find(key => !decoded.has(key) && !failed.has(key))
    if (!id) return
    if (decoded.size >= limit) {
      const stale = [...decoded].find(([key, model]) => !wanted.includes(key) && !model.warmup.pending)?.[0]
      if (!stale) return
      release(stale, decoded.get(stale))
      decoded.delete(stale)
      evictions++
      probe?.operation('wildlife-evict', stale)
    }
    waiting = id
    const desc = livingModels[id]
    const start = performance.now()
    probe?.operation('wildlife-load-start', id)
    loadModel(desc.url).then(({ scene, animations }) => {
      probe?.operation('wildlife-load-ready', id, start)
      loadMs = performance.now() - start
      loaded = { id, scene, animations, desc }
    }).catch(() => { failed.add(id) }).finally(() => {
      waiting = undefined
    })
  }

  return {
    retain(ids) {
      wanted = ids
      const enquiry = ids.join(',')
      if (enquiry !== lastRequested) {
        lastRequested = enquiry
        for (const id of ids) {
          const model = decoded.get(id)
          if (model) {
            hits++
            decoded.delete(id)
            decoded.set(id, model)
          } else misses++
        }
      }
    },
    get: id => decoded.get(id),
    fallbackReason(id) {
      if (!livingModels[id]) return 'no authored rig'
      if (failed.has(id)) return 'load failed'
      if (decoded.get(id)?.warmup.shaderFailed) return 'preparation failed'
      if (waiting === id || loaded?.id === id) return 'loading'
      if (decoded.has(id)) return 'preparing'
      return 'outside resident pool'
    },
    ready(id) {
      const model = decoded.get(id)
      const work = model?.warmup
      if (work && !work.pending && !work.shaderFailed && work.geometry === work.geometries.length) return model
    },
    invalidateGPU(renderer) {
      clearGeometryUploader(renderer)
      for (const model of decoded.values()) model.warmup = preparation(model)
    },
    warm(renderer, camera, scene, activeModel) {
      if (!canPrepare() || prepare()) return
      for (const id of wanted) {
        const model = decoded.get(id)
        if (!model || model === activeModel) continue
        const work = model.warmup
        if (work.pending) return
        const started = probe?.stamp()
        if (work.texture < work.textures.length) {
          renderer.initTexture(work.textures[work.texture++])
          probe?.operation('wildlife-warm-texture', id, started)
          return
        }
        if (work.skeleton < work.skeletons.length) {
          const skeleton = work.skeletons[work.skeleton++]
          if (!skeleton.boneTexture) skeleton.computeBoneTexture()
          probe?.texture(skeleton.boneTexture, 'Wildlife / ' + id + ' / bones')
          renderer.initTexture(skeleton.boneTexture)
          probe?.operation('wildlife-warm-skeleton', id, started)
          return
        }
        if (work.shade < work.shades.length) {
          work.pending = true
          renderer.compileAsync(work.shades[work.shade++], camera, scene)
            .catch(() => { work.shaderFailed = true }).finally(() => { work.pending = false })
          probe?.operation('wildlife-warm-shader', id, started)
          return
        }
        if (work.geometry < work.geometries.length) {
          uploadGeometry(renderer, work.geometries[work.geometry++])
          probe?.operation('wildlife-warm-geometry', id, started)
          return
        }
      }
    },
    metrics() {
      const models = []
      for (const [id, { root, warmup }] of decoded) {
        const textures = new Set(), bones = new Set()
        root.traverse(node => {
          if (!node.isMesh) return
          if (node.skeleton?.boneTexture) bones.add(node.skeleton.boneTexture)
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
            for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
          }
        })
        models.push({ id, materialTextures: textures.size, boneTextures: bones.size,
          prepared: { textures: warmup.texture, skeletons: warmup.skeleton,
            shaders: warmup.shade - Number(warmup.pending), geometries: warmup.geometry,
            geometryTotal: warmup.geometries.length } })
      }
      return { resident: decoded.size, preparing: waiting ?? loaded?.id ?? null, loadMs, releasedBoneTextures, hits, misses, evictions, limit, models }
    },
  }
}
