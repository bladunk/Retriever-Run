import * as T from 'three'

const uploaders = new WeakMap()

// Three uploads geometry buffers through a draw, including when the shape
// is shared by an instanced or skinned mesh. One tiny target per renderer.
export function uploadGeometry(renderer, geometry) {
  if (!uploaders.has(renderer)) {
    const target = new T.WebGLRenderTarget(1, 1, { depthBuffer: false })
    const scene = new T.Scene()
    const camera = new T.Camera()
    const mesh = new T.Mesh(undefined, new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false }))
    mesh.frustumCulled = false
    scene.add(mesh)
    uploaders.set(renderer, { target, scene, camera, mesh })
  }
  const { mesh, scene, camera, target } = uploaders.get(renderer)
  const previous = renderer.getRenderTarget()
  const { start, count } = geometry.drawRange
  geometry.setDrawRange(start, Math.min(3, count))
  mesh.geometry = geometry
  try {
    renderer.setRenderTarget(target)
    renderer.render(scene, camera)
  } finally {
    renderer.setRenderTarget(previous)
    mesh.geometry = null
    geometry.setDrawRange(start, count)
  }
}

export function clearGeometryUploader(renderer) {
  const uploader = uploaders.get(renderer)
  if (!uploader) return
  uploader.target.dispose()
  uploader.mesh.material.dispose()
  uploaders.delete(renderer)
}

// One texture, geometry or program initiation per preparation step. Enter
// with the actual instancing layout so the program key matches the trail.
export function createInstancedPreparation(scene, owner, probe) {
  let work
  return {
    busy: () => Boolean(work?.pending),
    ready: () => Boolean(work?.ready),
    clear() { work = undefined },
    step(renderer, camera, pack) {
      if (!pack || work?.pending || work?.ready) return
      if (work?.pack !== pack) {
        const textures = [...new Set(Object.values(pack.material).filter(value => value?.isTexture))]
        work = { pack, textures, index: 0, uploaded: false, ready: false, pending: false }
      }
      const task = work
      const started = probe?.stamp()
      if (task.index < task.textures.length) {
        const texture = task.textures[task.index++]
        renderer.initTexture(texture)
        probe?.operation('texture-preparation', owner + ' / ' + (texture.name || 'material map'), started)
      } else if (!task.uploaded) {
        uploadGeometry(renderer, pack.models[0])
        task.uploaded = true
        probe?.operation('geometry-preparation', owner, started)
      } else {
        task.pending = true
        const mesh = new T.InstancedMesh(pack.models[0], pack.material, 1)
        mesh.setColorAt(0, new T.Color(0xffffff))
        renderer.compileAsync(mesh, camera, scene).then(() => {
          probe?.operation('shader-preparation-ready', owner, started)
        }, () => {
          // Leave the ordinary draw path available on implementations where
          // explicit compile fails. Emit the outcome to the trace.
          probe?.operation('shader-preparation-unavailable', owner, started)
        }).finally(() => {
          mesh.dispose()
          task.pending = false
          task.ready = true
        })
      }
      return true
    },
  }
}
