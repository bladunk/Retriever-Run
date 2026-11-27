import * as T from 'three'
import { headingAt, placeOnTrail, seededRandom } from './trail.js'
import { signSlots, trailSign } from './trail-signs.js'
import { fitSignLettering, signTextureWidth as width, signTextureHeight as height } from './sign-lettering.js'

const shades = {
  plank: ['#60462f', '#8e6942', '#f9e5b4', '#c59a64'],
  direction: ['#345345', '#466859', '#fff1c7', '#e0bb7c'],
  posted: ['#693e32', '#824b3b', '#ffe8ab', '#e0ad77'],
  farm: ['#664a34', '#876648', '#fff1ce', '#cda474'],
  crossing: ['#624a2f', '#785b37', '#fff4ce', '#d1a565'],
  north: ['#344a4c', '#3f6063', '#e9f1dd', '#b8d5cb'],
  oldPaint: ['#5c503c', '#78654c', '#fff2d0', '#d6b887'],
}

function paint(ctx, sign, seed) {
  ctx.save()
  ctx.scale(2, 2)
  const [shadow, wood, letter, trim] = shades[sign.style]
  const random = seededRandom(seed)
  ctx.clearRect(0, 0, width, height)
  ctx.fillStyle = shadow
  ctx.fillRect(0, 0, width, height)
  const wash = ctx.createLinearGradient(0, 0, 0, height)
  wash.addColorStop(0, wood)
  wash.addColorStop(.54, wood)
  wash.addColorStop(1, shadow)
  ctx.fillStyle = wash
  ctx.fillRect(4, 4, width - 8, height - 8)
  for (let grain = 0; grain < 44; grain++) {
    const y = Math.floor(random() * height)
    const x = (random() - .05) * width
    ctx.strokeStyle = grain % 3 ? '#0d0b07' : '#ffdc97'
    ctx.globalAlpha = .045 + random() * .095
    ctx.lineWidth = 1 + random() * 2.4
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.bezierCurveTo(x + 35, y - 7, x + 87, y + 6, x + 98 + random() * 130, y)
    ctx.stroke()
  }
  ctx.globalAlpha = .70
  ctx.strokeStyle = trim
  ctx.lineWidth = sign.style === 'posted' ? 4 : 2
  ctx.strokeRect(10, 10, width - 20, height - 20)
  ctx.globalAlpha = .26
  ctx.lineWidth = 1
  ctx.strokeRect(15, 15, width - 30, height - 30)
  ctx.globalAlpha = 1
  for (const x of [19, width - 19]) for (const y of [21, height - 21]) {
    ctx.fillStyle = '#302820'
    ctx.beginPath()
    ctx.arc(x, y, 4.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#a49877'
    ctx.fillRect(x - 1, y - 2, 3, 2)
  }
  const font = '800 '
  ctx.font = font + '100px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const { lines, size, lineHeight, scale } = fitSignLettering(sign.line, line => ctx.measureText(line).width, sign.maxLines)
  ctx.font = font + size + 'px Arial, sans-serif'
  ctx.strokeStyle = '#261e14'
  ctx.lineWidth = Math.max(2.4, size * .054)
  ctx.lineJoin = 'round'
  ctx.fillStyle = letter
  ctx.save()
  ctx.translate(width / 2, 0)
  ctx.scale(scale, 1)
  for (const [index, line] of lines.entries()) {
    const y = height * .51 + (index - (lines.length - 1) * .5) * lineHeight
    ctx.strokeText(line, 0, y)
    ctx.fillText(line, 0, y)
  }
  ctx.restore()
  ctx.restore()
}

export function createTrailSigns(scene, makeCanvas = () => document.createElement('canvas'), probe) {
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
    probe?.texture(texture, 'Trail notice lettering')
    scene.add(root)
    return { root, canvas, context: null, texture, plate, backing, supports, key: '', seen: false }
  })

  return {
    begin() {
      for (const slot of slots) slot.seen = false
    },
    show(anchor, distance, seed) {
      if (!anchor || anchor.distance - distance > 104 || distance - anchor.distance > 7) return
      const slot = slots[anchor.ordinal % slots.length]
      const key = anchor.ordinal + ':' + seed
      if (slot.key !== key) {
        const started = probe?.stamp()
        const sign = trailSign(anchor, seed)
        slot.context ??= slot.canvas.getContext('2d')
        paint(slot.context, sign, anchor.tile * 5137 + seed)
        slot.texture.needsUpdate = true
        const frame = sign.style === 'north' ? [3.10, 1.39, 2.16] : [3.26, 1.47, 2.22]
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
        slot.root.userData.notice = { ...sign, ...anchor }
        probe?.operation('sign-paint', anchor.ordinal, started)
      }
      // Prepare the canvas before it can be submitted for the first upload.
      if (anchor.distance - distance > 64) return
      placeOnTrail(slot.root.position, anchor.distance, anchor.width, distance)
      slot.root.position.y = anchor.y
      slot.root.rotation.y = headingAt(anchor.distance) - Math.sign(anchor.width) * .24
      slot.seen = true
    },
    finish() {
      for (const slot of slots) slot.root.visible = slot.seen
    },
    visible() { return slots.filter(slot => slot.root.visible).map(slot => slot.plate) },
    clarity() { return { width:slots[0].canvas.width, height:slots[0].canvas.height,
      filtering:'trilinear mipmaps', requestedAnisotropy:slots[0].texture.anisotropy,
      visible:slots.filter(slot => slot.root.visible).map(slot => slot.root.userData.notice.ordinal) } },
  }
}

function noticePlate(face, makeCanvas) {
  const canvas = makeCanvas()
  canvas.width = width * 2
  canvas.height = height * 2
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  texture.anisotropy = 8
  texture.minFilter = T.LinearMipmapLinearFilter
  texture.magFilter = T.LinearFilter
  const plate = new T.Mesh(face, new T.MeshBasicMaterial({ map: texture, toneMapped: false }))
  return { canvas, texture, plate }
}
