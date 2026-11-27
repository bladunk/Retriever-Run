const paths = {
  vest: 'M15 43L22 26Q36 19 62 22L90 25 95 31 82 55 66 58Q65 40 57 39 48 38 40 55L26 57Z',
  collar: 'M16 42C17 22 91 22 95 41L94 48C90 66 18 66 16 49ZM25 42C32 52 80 52 87 42 78 34 34 34 25 42Z',
  bandana: 'M23 24Q49 34 83 24L90 30Q72 51 53 69 34 52 21 34Z',
  coat: 'M29 33Q25 28 34 21 43 13 59 19 70 17 74 25L88 32 93 39 87 46 69 47 65 54 69 65 40 66 42 53Q30 55 28 47Z',
}
const hex = color => '#' + color.toString(16).padStart(6, '0')

export function gearIllustration(item, category) {
  const canvas = document.createElement('canvas')
  canvas.width = 112
  canvas.height = 82
  canvas.setAttribute('aria-hidden', 'true')
  canvas.className = 'gear-illustration'
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const shape = new Path2D(paths[category])
  const swatch = item.id === 'classic-yellow' ? 0xc8a06b : item.color ?? 0x455549
  const fill = hex(swatch)
  const accent = hex(item.panel ?? item.binding ?? swatch)
  ctx.lineJoin = 'round'
  const backdrop = ctx.createRadialGradient(55, 28, 5, 55, 38, 67)
  backdrop.addColorStop(0, '#455344')
  backdrop.addColorStop(1, '#212e27')
  ctx.fillStyle = backdrop
  ctx.fillRect(0, 0, 112, 82)
  if (item.color === null) {
    ctx.setLineDash([3, 3])
    ctx.strokeStyle = '#c3b28f'
    ctx.stroke(shape)
    return canvas
  }
  ctx.save()
  ctx.clip(shape, 'evenodd')
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, 112, 82)
  if (item.pattern === 'brush' || item.pattern === 'stripe' || item.pattern === 'plaid') {
    ctx.strokeStyle = accent
    for (let n = -4; n < 25; n++) {
      const x = n * 7
      ctx.beginPath()
      ctx.moveTo(x, 73)
      ctx.quadraticCurveTo(x + 16, 43, x + 29 + 3 * (n % 5), 15)
      ctx.lineWidth = item.pattern === 'brush' ? 2 + .92 * Math.abs(n % 5) : n % 3 === 0 ? 3 : 1
      ctx.stroke()
      if (item.pattern === 'plaid') {
        ctx.fillStyle = accent
        ctx.fillRect(18, (n + 3) * 7, 75, n % 3 === 0 ? 3 : 1)
      }
    }
  }
  const shade = ctx.createLinearGradient(30, 22, 65, 69)
  shade.addColorStop(0, '#ffeecc57')
  shade.addColorStop(.48, '#24261c00')
  shade.addColorStop(1, '#142017a6')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, 112, 82)
  ctx.strokeStyle = item.pattern === 'border' ? accent : '#302c24'
  ctx.lineWidth = item.pattern === 'border' ? 11 : 5
  ctx.stroke(shape)
  ctx.strokeStyle = '#e8d3a487'
  ctx.lineWidth = .8
  ctx.setLineDash([2, 2])
  if (category !== 'coat') ctx.stroke(shape)
  ctx.restore()

  ctx.strokeStyle = '#d7bb87'
  ctx.lineWidth = 1.5
  if (category === 'vest') {
    ctx.stroke(new Path2D('M24 30Q55 22 88 29 M31 49Q44 32 62 44L71 51'))
    ctx.fillStyle = '#c8aa69'
    ctx.fillRect(68, 27, 7, 2)
  } else if (category === 'collar') {
    ctx.strokeRect(54, 47, 17, 10)
    ctx.stroke(new Path2D('M62 56L61 65'))
    ctx.beginPath()
    ctx.ellipse(61, 67, 3, 2, 0, 0, Math.PI * 2)
    ctx.stroke()
  } else if (category === 'coat') {
    ctx.fillStyle = '#27241f'
    ctx.fill(new Path2D('M92 34Q87 32 87 35L91 39Z M69 28a2 1.5 0 1 0 .1 0Z'))
    ctx.strokeStyle = '#5d493884'
    ctx.stroke(new Path2D('M51 23Q40 27 41 46 48 52 57 43L60 31'))
  }
  return canvas
}
