import * as T from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

export const livingModels = {
  pheasant: { url: new URL('./assets/wildlife/living-pheasant.glb', import.meta.url).href, face: 0, scaleAxis: 'z' },
  mallard: { url: new URL('./assets/wildlife/living-mallard.glb', import.meta.url).href, face: Math.PI, scaleAxis: 'z' },
  eagle: { url: new URL('./assets/wildlife/living-eagle.glb', import.meta.url).href, face: Math.PI, scaleAxis: 'z' },
  deer: { url: new URL('./assets/wildlife/living-deer.glb', import.meta.url).href, face: Math.PI, scaleAxis: 'z' },
}

export function disposeWildlifeModel(model) {
  model.root.removeFromParent()
  model.mix?.stopAllAction()
  model.mix?.uncacheRoot(model.root)
  const geometry = new Set()
  const texture = new Set()
  const materials = new Set()
  const skeletons = new Set()
  model.root.traverse(node => {
    if (!node.isMesh) return
    geometry.add(node.geometry)
    if (node.isSkinnedMesh) skeletons.add(node.skeleton)
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (materials.has(material)) continue
      materials.add(material)
      for (const value of Object.values(material)) if (value?.isTexture) texture.add(value)
    }
  })
  for (const item of geometry) item.dispose()
  for (const item of materials) item.dispose()
  // Three uploads a bone DataTexture on the first skinned draw. Material
  // disposal cannot release it because the skeleton owns it.
  let boneTextures = 0
  for (const skeleton of skeletons) {
    if (skeleton.boneTexture) boneTextures++
    skeleton.dispose()
  }
  const images = new Set()
  for (const item of texture) {
    item.dispose()
    if (item.image?.close) images.add(item.image)
  }
  for (const image of images) image.close()
  return boneTextures
}

const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
export function createWildlifeModels(probe, loadModel = url => loader.loadAsync(url)) {
  const decoded = new Map()
  let waiting
  let wanted = []
  const failed = new Set()
  let loadMs = 0
  let releasedBoneTextures = 0
  let hits = 0
  let misses = 0
  let evictions = 0
  let lastRequested = ''
  const limit = 2
  let upload

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
    if (waiting) return
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
      const setup = probe?.stamp()
      const bounds = new T.Box3().setFromObject(scene)
      const scale = Math.max(.001, bounds.max[desc.scaleAxis] - bounds.min[desc.scaleAxis])
      const root = new T.Group()
      scene.position.set(0, -bounds.min.y, 0)
      scene.rotation.y = desc.face
      root.add(scene)
      const mix = new T.AnimationMixer(root)
      const actions = Object.fromEntries(animations.map(clip => [clip.name, mix.clipAction(clip)]))
      if (id === 'pheasant') actions.Fly = actions['Take 001']
      const model = { root, mix, scale, actions }
      model.warmup = preparation(model)
      probe?.operation('wildlife-rig-setup', id, setup)
      if (wanted.includes(id)) decoded.set(id, model)
      else release(id, model)
      loadMs = performance.now() - start
    }).catch(() => { failed.add(id) }).finally(() => {
      waiting = undefined
      prepare()
    })
  }

  function uploadGeometry(renderer, geometry) {
    // A real indexed draw uploads the geometry through Three's resource
    // manager. Share one tiny target and omit the wildlife material and rig.
    if (!upload) {
      const target = new T.WebGLRenderTarget(1, 1, { depthBuffer: false })
      const scene = new T.Scene()
      const camera = new T.Camera()
      const mesh = new T.Mesh(undefined, new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false }))
      mesh.frustumCulled = false
      scene.add(mesh)
      upload = { target, scene, camera, mesh }
    }
    const { mesh, scene, camera, target } = upload
    const previousTarget = renderer.getRenderTarget()
    const { start, count } = geometry.drawRange
    geometry.setDrawRange(start, Math.min(3, count))
    mesh.geometry = geometry
    try {
      renderer.setRenderTarget(target)
      renderer.render(scene, camera)
    } finally {
      renderer.setRenderTarget(previousTarget)
      mesh.geometry = null
      geometry.setDrawRange(start, count)
    }
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
      prepare()
    },
    get: id => decoded.get(id),
    warm(renderer, camera, scene, activeModel) {
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
          renderer.initTexture(skeleton.boneTexture)
          probe?.operation('wildlife-warm-skeleton', id, started)
          return
        }
        if (work.shade < work.shades.length) {
          work.pending = true
          renderer.compileAsync(work.shades[work.shade++], camera, scene)
            .catch(() => {}).finally(() => { work.pending = false; prepare() })
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
      return { resident: decoded.size, preparing: waiting ?? null, loadMs, releasedBoneTextures, hits, misses, evictions, limit, models }
    },
  }
}
