export function swipeDirection(dx, dy, width, finished = false) {
  const threshold = Math.max(12, Math.min(19, width * .039))
  const x = Math.abs(dx)
  const y = Math.abs(dy)
  if (Math.max(x, y) < threshold) return null
  if (!finished && Math.min(x, y) * 1.18 > Math.max(x, y)) return null
  return x > y ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'jump' : 'slide'
}
