export const swipeThreshold = { light: .83, standard: 1, deliberate: 1.24 }

export function swipeDirection(dx, dy, width, finished = false, sensitivity = 'standard') {
  const threshold = Math.max(12, Math.min(19, width * .039)) * (swipeThreshold[sensitivity] ?? 1)
  const x = Math.abs(dx)
  const y = Math.abs(dy)
  if (Math.max(x, y) < threshold) return null
  // A diagonal waits for the dominant axis even when the finger is lifted.
  // The slightly wider final cone accommodates short, quickly released swipes.
  if (Math.min(x, y) * (finished ? 1.10 : 1.22) > Math.max(x, y)) return null
  return x > y ? dx < 0 ? 'left' : 'right' : dy < 0 ? 'jump' : 'slide'
}

export function masterySwipe(dx, dy, width, finished, sensitivity) {
  return swipeDirection(dx, dy, width * .86, finished, sensitivity)
}
