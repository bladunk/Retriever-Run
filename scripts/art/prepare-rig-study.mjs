import { createRequire } from 'node:module'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'

const [study, tools] = process.argv.slice(2)
if (!study || !tools) throw new Error('Usage: node scripts/art/prepare-rig-study.mjs <study directory> <glTF tooling directory>')
const require = createRequire(resolve(tools, 'package.json'))
const { NodeIO } = require('@gltf-transform/core')
const { EXTMeshoptCompression, KHRMeshQuantization } = require('@gltf-transform/extensions')
const { dequantize } = require('@gltf-transform/functions')
const { MeshoptDecoder } = await import(require.resolve('meshoptimizer'))
await MeshoptDecoder.ready
const io = new NodeIO().registerExtensions([EXTMeshoptCompression, KHRMeshQuantization])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })

await mkdir(study, { recursive: true })
for (const name of ['labrador', 'boyd']) {
  const source = await io.read('src/assets/' + name + '.glb')
  const root = source.getRoot()
  console.log(JSON.stringify({ name, joints: root.listSkins()[0].listJoints().length,
    clips: root.listAnimations().map(animation => animation.getName()) }))
  root.listExtensionsUsed().find(extension => extension.extensionName === EXTMeshoptCompression.EXTENSION_NAME)?.dispose()
  await source.transform(dequantize())
  await io.write(resolve(study, name + '-study.glb'), source)
}
