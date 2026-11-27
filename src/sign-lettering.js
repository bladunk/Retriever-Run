export const signTextureWidth = 512
export const signTextureHeight = 224
const width = signTextureWidth
const height = signTextureHeight
const padding = 31

export function fitSignLettering(message, measure, maxLines = 2) {
  const words = message.split(' ')
  let best
  let bestScore = -Infinity

  function consider(lines) {
    const sizes = lines.map(measure)
    const longest = Math.max(...sizes)
    const size = Math.floor(Math.min((width - padding * 2) / longest * 100 / .82,
      (height - 30) / (lines.length * 1.06), 119))
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
    if (maxLines < 3) continue
    for (let b = a + 1; b < words.length; b++) {
      consider([first, words.slice(a, b).join(' '), words.slice(b).join(' ')])
    }
  }
  return best
}
