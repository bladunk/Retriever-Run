import { expeditionRegions } from './expedition.js'

// A schematic of the North American route. Coordinates are layout points,
// chosen for legibility and in the same order as the expedition stages.
const stops = [[255,302],[235,285],[259,269],[229,248],[218,229],
  [239,204],[200,190],[172,169],[194,147],[176,124],[195,100],[161,82],[183,59],[124,65],[101,38]]
const shores = [[28,8],[329,8],[345,27],[325,55],[321,83],[344,95],[331,119],
  [312,132],[301,160],[284,181],[305,197],[343,196],[336,222],[307,248],[298,268],
  [301,297],[288,311],[274,285],[251,273],[228,282],[199,292],[186,320],[203,345],
  [187,346],[168,327],[150,321],[142,295],[119,274],[105,290],[86,256],[67,231],
  [59,195],[53,165],[54,127],[44,100],[46,74],[24,52],[35,32]]
const lakes = [[223,104,15,6,-.20],[253,130,18,6,-.22],[264,147,4,11,.27],
  [282,147,10,5,.38],[306,152,7,3,-.37]]
const width = 362
const height = 352

export function migrationMap(scale = 2) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  canvas.setAttribute('aria-hidden', 'true')
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  return { canvas, draw(player, selected) {
    const fill = ctx.createLinearGradient(0, 0, width, height)
    fill.addColorStop(0, '#f0e2c5')
    fill.addColorStop(1, '#bfa888')
    ctx.fillStyle = fill
    ctx.fillRect(0, 0, width, height)
    const land = ctx.createLinearGradient(0, 0, width, height)
    land.addColorStop(0, '#8d9b82')
    land.addColorStop(1, '#d3be92')
    ctx.fillStyle = land
    ctx.strokeStyle = '#796447'
    ctx.lineWidth = 1
    ctx.beginPath()
    shores.forEach(([x,y], i) => i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y))
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.save()
    ctx.clip()
    ctx.strokeStyle = '#493f3824'
    for (let y = 40; y < 350; y += 29) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.quadraticCurveTo(165, y - 40, width, y + 16)
      ctx.stroke()
    }
    for (let x = 26; x < width; x += 45) {
      ctx.beginPath()
      ctx.moveTo(x - 48, 0)
      ctx.quadraticCurveTo(x + 13, 167, x + 31, height)
      ctx.stroke()
    }
    ctx.restore()
    ctx.fillStyle = '#e5d3ab'
    for (const [x,y,rw,rh,angle] of lakes) {
      ctx.beginPath()
      ctx.ellipse(x,y,rw,rh,angle,0,Math.PI*2)
      ctx.fill()
    }
    ctx.fillStyle = '#514835'
    ctx.font = '10px Georgia'
    ctx.fillText('CANADIAN ROCKIES', 129, 24)
    ctx.fillText('GULF OF MEXICO', 229, 329)
    ctx.fillText('N', 22, 133)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(26,160)
    ctx.lineTo(26,138)
    ctx.lineTo(23,145)
    ctx.moveTo(26,138)
    ctx.lineTo(29,145)
    ctx.stroke()
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const strokeRoute = (count, color, dash) => {
      ctx.beginPath()
      ctx.setLineDash(dash)
      ctx.strokeStyle = color
      stops.slice(0,count).forEach(([x,y], i) => i === 0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y))
      ctx.stroke()
    }
    strokeRoute(stops.length, '#6a594a80', [4,7])
    const reached = player.migration.farthest
    const complete = expeditionRegions.filter((_, index) =>
      player.migration.duration >= (expeditionRegions[index + 1]?.seconds ?? expeditionRegions.length * 30)).length
    strokeRoute(reached, '#8a6644', [])
    strokeRoute(complete, '#344c36', [])
    stops.forEach(([x,y], i) => {
      const next = expeditionRegions[i+1]?.seconds ?? expeditionRegions.length * 30
      ctx.beginPath()
      ctx.strokeStyle = i === selected ? '#783922' : '#4f543a'
      ctx.lineWidth = i === selected ? 3 : 1.3
      ctx.fillStyle = i < reached ? player.migration.duration >= next ? '#3f5b42' : '#92653c' : '#e6c68f'
      ctx.arc(x,y,i === selected ? 9 : 6,0,Math.PI*2)
      ctx.fill()
      ctx.stroke()
      if (i === selected || i === 0 || i === stops.length - 1) {
        ctx.fillStyle = i < reached ? '#fff4d7' : '#362b20'
        ctx.font = 'bold 8px Georgia'
        ctx.textAlign = 'center'
        ctx.fillText(String(i+1), x, y+3)
        ctx.textAlign = 'start'
      }
    })
  } }
}
