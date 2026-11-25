import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { createLabradorRig } from './lab-rig.js'
import pointerUrl from './assets/pointer.glb?url'
import labUrl from './assets/labrador.glb?url'

export async function loadLabrador(breed = 'lab') {
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(breed === 'pointer' ? pointerUrl : labUrl)
  return createLabradorRig(gltf, breed)
}
