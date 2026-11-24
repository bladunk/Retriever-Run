import * as T from 'three'
import { headingAt, placeOnTrail, seededRandom } from './trail.js'
import { signSlots, signTextRows, trailSign } from './trail-signs.js'
import { signInterval } from './sign-placement.js'

const shades = {
  plank: ['#60462f', '#8e6942', '#f9e5b4', '#c59a64'],
  direction: ['#345345', '#466859', '#fff1c7', '#e0bb7c'],
  posted: ['#693e32', '#824b3b', '#ffe8ab', '#e0ad77'],
  farm: ['#664a34', '#876648', '#fff1ce', '#cda474'],
  crossing: ['#876b3e', '#aa854c', '#fff4ce', '#f4d581'],
  north: ['#344a4c', '#3f6063', '#e9f1dd', '#b8d5cb'],
  oldPaint: ['#76644a', '#8b785a', '#fff2d0', '#d6b887'],
}
const width = 384
const height = 192

function paint(ctx, sign, seed) {
  const [shadow, wood, letter, trim] = shades[sign.style]
  const random = seededRandom(seed)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = shadow
  ctx.fillRect(0, 0, width, height)
  const wash = ctx.createLinearGradient(0, 0, 0, height)
  wash.addColorStop(0, wood)
  wash.addColorStop(.48, shadow)
  wash.addColorStop(.51, wood)
  wash.addColorStop(1, shadow)
  ctx.fillStyle = wash
  ctx.fillRect(4, 4, width - 8, height - 8)
  for (let grain = 0; grain < 44; grain++) {
    const y = Math.floor(random() * height)
    const x = (random() - .05) * width
    ctx.strokeStyle = grain % 3 ? '#0d0b07' : '#ffdc97'
    ctx.globalAlpha = .08 + random() * .17
    ctx.lineWidth = 1 + random() * 2.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.bezierCurveTo(x + 35, y - 7, x + 87, y + 6, x + 98 + random() * 130, y)
    ctx.stroke()
  }
  ctx.globalAlpha = .79
  ctx.strokeStyle = trim
  ctx.lineWidth = sign.style === 'posted' ? 4 : 2
  ctx.strokeRect(10, 10, width - 20, height - 20)
  ctx.globalAlpha = 1
  for (const x of [19, width - 19]) for (const y of [21, height - 21]) {
    ctx.fillStyle = '#302820'
    ctx.beginPath()
    ctx.arc(x, y, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#a49877'
    ctx.fillRect(x - 1, y - 2, 3, 2)
  }
  const point = sign.style === 'direction' ? '›' : sign.style === 'crossing' ? '◆' :
    sign.style === 'north' ? '▲' : sign.style === 'farm' ? '◇' : '—'
  ctx.fillStyle = trim
  ctx.font = 'bold 16px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(point, width / 2, 25)
  let rows
  let size = 44
  for (; size >= 22; size -= 2) {
    ctx.font = 'bold ' + size + 'px ' + (sign.style === 'plank' || sign.style === 'farm' ? 'Georgia, serif' : 'Arial, sans-serif')
    rows = signTextRows(sign.line, line => ctx.measureText(line).width, width - 53)
    if (rows.every(line => ctx.measureText(line).width <= width - 53)) break
  }
  ctx.shadowColor = '#24160f'
  ctx.shadowOffsetY = 2
  ctx.shadowBlur = 1.8
  ctx.fillStyle = letter
  for (const [index, line] of rows.entries()) {
    ctx.fillText(line, width / 2, 101 + (index - (rows.length - 1) / 2) * (size + 8), width - 50)
  }
  ctx.shadowColor = 'transparent'
}

export function createTrailSigns(scene, makeCanvas = () => document.createElement('canvas')) {
  const board = new T.BoxGeometry(1, 1, .098)
  const face = new T.PlaneGeometry(1, 1)
  const posts = new T.BoxGeometry(.102, 1, .12)
  const wood = new T.MeshLambertMaterial({ color: 0x6f5238 })
  const slots = Array.from({ length: signSlots }, () => {
    const root = new T.Group()
    const { canvas, texture, plate } = noticePlate(face, makeCanvas)
    plate.position.z = .055
    const backing = new T.Mesh(board, wood)
    const supports = [-1, 1].map(() => new T.Mesh(posts, wood))
    for (const post of supports) post.position.z = -.07
    root.name = 'Trail notice'
    root.visible = false
    root.add(...supports, backing, plate)
    scene.add(root)
    return { root, canvas, texture, plate, backing, supports, key: '', seen: false }
  })

  return {
    begin() {
      for (const slot of slots) slot.seen = false
    },
    show(anchor, distance, seed) {
      if (!anchor || anchor.distance - distance > 64 || distance - anchor.distance > 7) return
      const slot = slots[Math.floor(anchor.tile / signInterval) % slots.length]
      const key = anchor.tile + ':' + seed
      if (slot.key !== key) {
        const sign = trailSign(anchor.tile, seed)
        paint(slot.canvas.getContext('2d'), sign, anchor.tile * 5137 + seed)
        slot.texture.needsUpdate = true
        const frame = sign.style === 'north' ? [2.87, 1.35, 2.48] : [3.06, 1.37, 2.25]
        const [w, h, y] = frame
        slot.backing.scale.set(w, h, 1)
        slot.plate.scale.set(w - .026, h - .026, 1)
        slot.backing.position.y = slot.plate.position.y = y
        const twoPosts = sign.style === 'posted' || sign.style === 'farm' || sign.style === 'plank'
        for (const [n, post] of slot.supports.entries()) {
          post.visible = n === 0 || twoPosts
          post.position.x = twoPosts ? (n ? .74 : -.74) : 0
          post.scale.y = y
          post.position.y = y / 2 - .035
        }
        slot.key = key
        slot.root.userData.notice = sign
      }
      placeOnTrail(slot.root.position, anchor.distance, anchor.width, distance)
      slot.root.position.y = anchor.y
      slot.root.rotation.y = headingAt(anchor.distance) + Math.sign(anchor.width) * .24
      slot.seen = true
    },
    finish() {
      for (const slot of slots) slot.root.visible = slot.seen
    },
  }
}

function noticePlate(face, makeCanvas) {
  const canvas = makeCanvas()
  canvas.width = width
  canvas.height = height
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  texture.anisotropy = 2
  const plate = new T.Mesh(face, new T.MeshBasicMaterial({ map: texture }))
  return { canvas, texture, plate }
}
