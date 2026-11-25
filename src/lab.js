import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { createLabradorRig } from './lab-rig.js'
import pointerUrl from './assets/pointer.glb?url'
import labUrl from './assets/labrador.glb?url'
import boydUrl from './assets/boyd.glb?url'

export async function loadLabrador(breed = 'lab', createPickup) {
  const url = breed === 'boyd' ? boydUrl : breed === 'pointer' ? pointerUrl : labUrl
  const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url)
  return createLabradorRig(gltf, breed, createPickup)
}
