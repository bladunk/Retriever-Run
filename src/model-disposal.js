export function disposeModel(model) {
  model.root.removeFromParent()
  model.mix?.stopAllAction()
  model.mix?.uncacheRoot(model.root)
  const geometry = new Set()
  const texture = new Set()
  const materials = new Set()
  const skeletons = new Set()
  model.root.traverse(node => {
    if (!node.isMesh) return
    if (node.isInstancedMesh) node.dispose()
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
