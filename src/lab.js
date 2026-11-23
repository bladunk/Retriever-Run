import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { createLabradorRig } from './lab-rig.js'
import labUrl from './assets/labrador.glb?url'

export async function loadLabrador() {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(labUrl)
  return createLabradorRig(gltf)
}
