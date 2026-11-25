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
export function createWildlifeModels(probe) {
  const decoded = new Map()
  let waiting
  let wanted = []
  const failed = new Set()
  let loadMs = 0
  let releasedBoneTextures = 0

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
    waiting = id
    const desc = livingModels[id]
    const start = performance.now()
    probe?.operation('wildlife-load-start', id)
    loader.loadAsync(desc.url).then(({ scene, animations }) => {
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
      probe?.operation('wildlife-rig-setup', id, setup)
      if (wanted.includes(id)) decoded.set(id, model)
      else release(id, model)
      loadMs = performance.now() - start
    }).catch(() => { failed.add(id) }).finally(() => {
      waiting = undefined
      prepare()
    })
  }

  return {
    retain(ids) {
      wanted = ids
      for (const [id, model] of decoded) if (!wanted.includes(id)) {
        release(id, model)
        decoded.delete(id)
      }
      prepare()
    },
    get: id => decoded.get(id),
    metrics() {
      const models = []
      for (const [id, { root }] of decoded) {
        const textures = new Set(), bones = new Set()
        root.traverse(node => {
          if (!node.isMesh) return
          if (node.skeleton?.boneTexture) bones.add(node.skeleton.boneTexture)
          for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
            for (const value of Object.values(material)) if (value?.isTexture) textures.add(value)
          }
        })
        models.push({ id, materialTextures: textures.size, boneTextures: bones.size })
      }
      return { resident: decoded.size, preparing: waiting ?? null, loadMs, releasedBoneTextures, models }
    },
  }
}
