import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { Quaternion, Vector3 } from 'three'

const [sources, tools, breed = 'lab'] = process.argv.slice(2)
if (!sources || !tools || !['lab', 'pointer', 'boyd'].includes(breed)) {
  throw new Error('Usage: node scripts/prepare-working-dog.mjs <source directory> <gltf tool directory> [lab|pointer|boyd]')
}
const require = createRequire(resolve(tools, 'package.json'))
const { NodeIO } = require('@gltf-transform/core')
const { EXTMeshoptCompression, KHRMeshQuantization } = require('@gltf-transform/extensions')
const { dedup, meshopt, prune, quantize, simplify, weld } = require('@gltf-transform/functions')
const { MeshoptEncoder, MeshoptSimplifier } = await import(require.resolve('meshoptimizer'))
const sharp = require('sharp')


await MeshoptEncoder.ready
const io = new NodeIO().registerExtensions([KHRMeshQuantization, EXTMeshoptCompression])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
const art = await io.read(resolve(sources, 'pets-lab.glb'))
const motion = await io.read(resolve(sources, 'pets-motion.glb'))
const names = new Map()
const root = art.getRoot()
const buffer = root.listBuffers()[0]
for (const node of root.listNodes()) {
  const name = node.getName().replace(/_\d+$/, '')
  node.setName(name)
  names.set(name, node)
}
const joints = root.listSkins()[0].listJoints().map((node) => node.getName())
const primitive = root.listMeshes()[0].listPrimitives()[0]
const positions = primitive.getAttribute('POSITION').getArray()
const bindJoints = primitive.getAttribute('JOINTS_0').getArray()
const neutral = joints.indexOf('neutral_bone')
for (let i = 0; i < positions.length / 3; i++) {
  const x = positions[i * 3]
  const y = positions[i * 3 + 1]
  const z = positions[i * 3 + 2]
  if (y > .41 || z > -.58 || Math.abs(x) < .14) continue
  for (let j = 0; j < 4; j++) if (bindJoints[i * 4 + j] === neutral) {
    bindJoints[i * 4 + j] = joints.indexOf(x > 0 ? 'FFB.L' : 'FFB.R')
  }
}

// Sculpt in the bind pose so the existing skeleton and UV layout stay intact.
const smoothstep = (lo, hi, value) => {
  const t = Math.max(0, Math.min(1, (value - lo) / (hi - lo)))
  return t * t * (3 - 2 * t)
}
for (let i = 0; i < positions.length; i += 3) {
  const x = positions[i]
  const y = positions[i + 1]
  const z = positions[i + 2]
  const pointer = breed === 'pointer'
  const loin = Math.exp(-(((z + .38) / .63) ** 2))
  const ribs = Math.exp(-(((z - .70) / .60) ** 2))
  const barrel = smoothstep(.74, 1.04, y) * (1 - smoothstep(1.7, 2.30, y))
  const belly = smoothstep(.68, 1.06, y) * (1 - smoothstep(1.18, 1.67, y))
  const muzzle = smoothstep(1.9, 2.7, z)
  const ear = smoothstep(.23, .52, Math.abs(x)) * smoothstep(1.64, 1.95, z) * (1 - smoothstep(2.2, 2.58, z))
  const tail = 1 - smoothstep(-2.26, -1.52, z)
  positions[i] = x * (1 - loin * barrel * (pointer ? .39 : .30) +
    ribs * barrel * (pointer ? -.07 : .055) - muzzle * (pointer ? .25 : .05))
  positions[i + 1] = y + loin * belly * (pointer ? .41 : .29) -
    ribs * belly * .055 + (pointer ? .23 * smoothstep(.22, 1.63, y) - ear * .148 : 0)
  positions[i + 2] = z + muzzle * (pointer ? .23 : -.015)
  if (pointer && z < -1.54) positions[i + 2] += (-1.54 - z) * .71 * tail
  else if (!pointer && z < -1.56) positions[i] *= 1 + .17 * tail
  if (breed === 'boyd') {
    // Fit the narrower working head, rounded stop, folded ears and lean flank
    // in bind coordinates. Preserve the joint positions and the stride clips.
    const head = smoothstep(1.53, 1.94, z) * smoothstep(1.95, 2.27, y)
    const brow = Math.exp(-(((z - 2.00) / .30) ** 2)) * smoothstep(2.27, 2.62, y)
    const jaw = muzzle * (1 - smoothstep(2.23, 2.47, y))
    const lowerLip = smoothstep(2.08, 2.36, z) * smoothstep(1.94, 2.04, y) * (1 - smoothstep(2.10, 2.19, y))
    const eye = Math.exp(-(((z - 2.04) / .16) ** 2)) * Math.exp(-(((y - 2.46) / .095) ** 2))
    const earTip = ear * (1 - smoothstep(2.34, 2.61, y))
    const flank = barrel * Math.exp(-(((z + .60) / .72) ** 2))
    const hock = (1 - smoothstep(.23, .64, y)) * smoothstep(.16, .69, -z)
    positions[i] *= 1 - .088 * head - .05 * jaw + .036 * eye - .062 * flank - .045 * hock + .035 * earTip
    positions[i + 1] += .052 * brow + .058 * jaw + .044 * lowerLip + .105 * belly * loin - .094 * earTip + .14 * tail
    positions[i + 2] += .101 * muzzle - .096 * earTip + .12 * tail
  }
}

// Average neighboring face normals across texture seams to keep the coat continuous.
const triangles = primitive.getIndices().getArray()
const accumulated = new Map()
const smooth = new Float32Array(positions.length)
const a = new Vector3(), b = new Vector3(), c = new Vector3()
const face = new Vector3()
function key(i) {
  return [0,1,2].map(n => Math.round(positions[i * 3 + n] * 100000)).join(',')
}
const keys = Array.from({ length: positions.length / 3 }, (_, i) => key(i))
for (let i = 0; i < triangles.length; i += 3) {
  a.fromArray(positions, triangles[i] * 3)
  b.fromArray(positions, triangles[i + 1] * 3).sub(a)
  c.fromArray(positions, triangles[i + 2] * 3).sub(a)
  face.crossVectors(b, c)
  for (let k = 0; k < 3; k++) {
    const id = keys[triangles[i + k]]
    if (!accumulated.has(id)) accumulated.set(id, new Vector3())
    accumulated.get(id).add(face)
  }
}
for (let i = 0; i < keys.length; i++) a.copy(accumulated.get(keys[i])).normalize().toArray(smooth, i * 3)
primitive.setAttribute('NORMAL', art.createAccessor('Smoothed coat normals', buffer).setType('VEC3').setArray(smooth))

for (const texture of root.listTextures()) {
  const size = breed === 'boyd' ? 2048 : 1536
  texture.setImage(await sharp(texture.getImage()).resize(size, size)
    .jpeg({ quality: breed === 'boyd' ? 92 : 91, mozjpeg: true }).toBuffer())
}

const selected = new Map([['Idle', 'Idle'], ['Gallop', 'Gallop'], ['Gallop_Jump', 'Jump'], ['Idle_2_HeadLow', 'Low'], ['Idle_2', 'Alert'], ['Walk', 'Walk'],
  ['Jump_ToIdle', 'Land'], ['Idle_HitReact_Left', 'Fail']])
const moveBones = new Set(['Body', 'IKFrontLeg.L', 'IKFrontLeg.R', 'IKBackLeg.L', 'IKBackLeg.R'])
for (const source of motion.getRoot().listAnimations()) {
  if (!selected.has(source.getName())) continue
  const clip = art.createAnimation(selected.get(source.getName()))
  const times = new Map()
  for (const channel of source.listChannels()) {
    const from = channel.getTargetNode()
    const name = from.getName()
    const target = names.get(name)
    const path = channel.getTargetPath()
    if (!target || (path !== 'rotation' && (path !== 'translation' || !moveBones.has(name)))) continue
    if (/PoleTarget|^FF/.test(name)) continue
    const sampler = channel.getSampler()
    const values = new Float32Array(sampler.getOutput().getArray())
    if (path === 'rotation') {
      const correction = new Quaternion().fromArray(target.getRotation()).multiply(new Quaternion().fromArray(from.getRotation()).invert())
      const frame = new Quaternion()
      for (let i = 0; i < values.length; i += 4) frame.fromArray(values, i).premultiply(correction).normalize().toArray(values, i)
    } else {
      const fromRest = new Vector3().fromArray(from.getTranslation())
      const toRest = new Vector3().fromArray(target.getTranslation())
      const parent = from.getParentNode()
      const moving = new Quaternion().fromArray(parent.getWorldRotation())
      const targetSpace = new Quaternion().fromArray(target.getParentNode().getWorldRotation()).invert()
      const scale = parent.getWorldScale()[0] / target.getParentNode().getWorldScale()[0]
      for (let i = 0; i < values.length; i += 3) {
        a.fromArray(values, i).sub(fromRest).applyQuaternion(moving).multiplyScalar(scale).applyQuaternion(targetSpace)
        if (name === 'Body') {
          a.x *= .37
          a.z = 0
          a.y = Math.max(-.19, Math.min(.23, a.y)) * (source.getName() === 'Gallop_Jump' ? .50 : 1)
        }
        a.add(toRest).toArray(values, i)
      }
    }
    const input = sampler.getInput()
    if (!times.has(input)) times.set(input, art.createAccessor('', buffer).setType('SCALAR').setArray(input.getArray().slice()))
    const keyframes = art.createAccessor('', buffer).setType(path === 'rotation' ? 'VEC4' : 'VEC3').setArray(values)
    const retargeted = art.createAnimationSampler().setInput(times.get(input)).setOutput(keyframes).setInterpolation('LINEAR')
    clip.addSampler(retargeted).addChannel(art.createAnimationChannel().setTargetNode(target).setTargetPath(path).setSampler(retargeted))
  }
}
await MeshoptSimplifier.ready
await art.transform(dedup(), weld(), simplify({ simplifier: MeshoptSimplifier, ratio: breed === 'boyd' ? .65 : .43, error: .012 }),
  prune(), quantize({ quantizePosition: 14, quantizeNormal: 10, quantizeTexcoord: 13, quantizeWeight: 8 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }))
console.log('triangles', root.listMeshes()[0].listPrimitives()[0].getIndices().getCount() / 3)
await io.write('src/assets/' + (breed === 'lab' ? 'labrador' : breed) + '.glb', art)
