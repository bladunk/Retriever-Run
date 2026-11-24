import * as T from 'three'
import { obstacleSignLine } from './trail-signs.js'
import { seededRandom } from './trail.js'

export const obstacleSignFace = 'Obstacle sign face'
const width = 512
const height = 224
const padding = 31
const font = 'Arial, sans-serif'
const plane = new T.PlaneGeometry(1, 1)
const bare = new T.MeshBasicMaterial({ visible: false })

export function addObstacleSignFace(model, wide) {
  // Use the actual baked timber's forward extent, including its rough bark.
  // Three's PlaneGeometry has +Z normals and upright UVs.
  const timber = model.children[0].geometry
  if (!timber.boundingBox) timber.computeBoundingBox()
  const face = new T.Mesh(plane, bare)
  face.name = obstacleSignFace
  face.scale.set(wide ? 2.65 : 2.03, .89, 1)
  face.position.set(0, 1.72, timber.boundingBox.max.z + .006)
  face.visible = false
  model.add(face)
}

export function fitObstacleLettering(message, measure) {
  const words = message.split(' ')
  let best
  let bestScore = -Infinity

  function consider(lines) {
    const sizes = lines.map(measure)
    const longest = Math.max(...sizes)
    const size = Math.floor(Math.min((width - padding * 2) / longest * 100 / .82,
      (height - 30) / (lines.length * 1.06), 111))
    const scale = Math.min(1, (width - padding * 2) / (longest * size / 100))
    const imbalance = (longest - Math.min(...sizes)) / longest
    const score = size - (lines.length - 1) * 4 - imbalance * 5 - (1 - scale) * 16
    if (score > bestScore) {
      best = { lines, size, lineHeight: size * 1.06, scale }
      bestScore = score
    }
  }

  consider([message])
  for (let a = 1; a < words.length; a++) {
    const first = words.slice(0, a).join(' ')
    consider([first, words.slice(a).join(' ')])
    for (let b = a + 1; b < words.length; b++) {
      consider([first, words.slice(a, b).join(' '), words.slice(b).join(' ')])
    }
  }
  return best
}

function paint(canvas, message, seed) {
  const context = canvas.getContext('2d')
  const grain = seededRandom(seed)
  context.fillStyle = '#33231c'
  context.fillRect(0, 0, width, height)
  const stain = context.createLinearGradient(0, 0, 0, height)
  stain.addColorStop(0, '#4c3528')
  stain.addColorStop(.44, '#37251d')
  stain.addColorStop(.47, '#483124')
  stain.addColorStop(1, '#35251d')
  context.fillStyle = stain
  context.fillRect(4, 4, width - 8, height - 8)
  for (let n = 0; n < 31; n++) {
    const y = Math.round(grain() * height)
    const x = grain() * width - 30
    context.strokeStyle = n % 3 ? '#271a14' : '#70503b'
    context.lineWidth = 1 + grain() * 3
    context.beginPath()
    context.moveTo(x, y)
    context.bezierCurveTo(x + 57, y - 7, x + 123, y + 4, x + 160 + grain() * 95, y)
    context.stroke()
  }
  context.strokeStyle = '#ac8050'
  context.lineWidth = 3
  context.strokeRect(8, 8, width - 16, height - 16)
  for (const x of [17, width - 17]) for (const y of [20, height - 20]) {
    context.fillStyle = '#b1946c'
    context.beginPath()
    context.arc(x, y, 3.4, 0, Math.PI * 2)
    context.fill()
  }

  context.font = '800 100px ' + font
  const { lines, size, lineHeight, scale } = fitObstacleLettering(message, line => context.measureText(line).width)
  context.font = '800 ' + size + 'px ' + font
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.strokeStyle = '#241910'
  context.lineWidth = Math.max(2, size * .043)
  context.lineJoin = 'round'
  context.fillStyle = '#fff2d8'
  context.save()
  context.translate(width * .5, 0)
  context.scale(scale, 1)
  for (const [index, line] of lines.entries()) {
    const y = height * .51 + (index - (lines.length - 1) * .5) * lineHeight
    context.strokeText(line, 0, y)
    context.fillText(line, 0, y)
  }
  context.restore()
  return { lines, size }
}

export function createObstacleSigns(makeCanvas = () => document.createElement('canvas')) {
  const free = []
  const attached = new Map()
  const recent = []
  let capacity = 0
  let paints = 0

  function allocate() {
    const canvas = makeCanvas()
    canvas.width = width
    canvas.height = height
    const map = new T.CanvasTexture(canvas)
    map.colorSpace = T.SRGBColorSpace
    map.anisotropy = 2
    const material = new T.MeshBasicMaterial({ map, toneMapped: false })
    capacity++
    return { canvas, material }
  }

  return {
    bind(model, entity, seed) {
      const face = model.getObjectByName(obstacleSignFace)
      if (!face || attached.has(face)) return
      const paintSeed = (seed ^ Math.imul(Math.round(entity.distance * 32), 73856093) ^
        Math.imul(entity.lane + 2, 19349663)) >>> 0
      const message = obstacleSignLine(entity.distance, seededRandom(paintSeed), recent)
      const slot = free.pop() ?? allocate()
      if (slot.message !== message) {
        slot.layout = paint(slot.canvas, message, paintSeed)
        slot.material.map.needsUpdate = true
        slot.message = message
        paints++
      }
      recent.push(message)
      if (recent.length > 24) recent.shift()
      face.material = slot.material
      face.visible = true
      face.userData.lettering = { message, ...slot.layout }
      attached.set(face, slot)
    },
    release(model) {
      const face = model.getObjectByName(obstacleSignFace)
      const slot = attached.get(face)
      if (!slot) return
      attached.delete(face)
      face.visible = false
      face.material = bare
      delete face.userData.lettering
      free.push(slot)
    },
    stats() { return { capacity, active: attached.size, paints } },
  }
}
