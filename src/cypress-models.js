import forms from './assets/environment/cypress-meshes.js'
import { packedGeometry } from './packed-geometry.js'

const names = ['CypressSpire', 'CypressFloodplain', 'CypressDistance', 'SwampPalmetto']
const templates = []

export function cypressModel(form) {
  return templates[form] ??= packedGeometry(forms[names[form]])
}
