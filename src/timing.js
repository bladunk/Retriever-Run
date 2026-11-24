export const tickSeconds = 1 / 120

export function createFixedClock() {
  let debt = 0
  return {
    reset() { debt = 0 },
    advance(wall, step) {
      // An interrupted tab cannot create a backlog of unseen gameplay.
      debt += Math.min(.24, Math.max(0, wall))
      while (debt + 1e-9 >= tickSeconds) {
        debt -= tickSeconds
        if (step(tickSeconds) === false) {
          debt = 0
          return 1
        }
      }
      return Math.max(0, debt / tickSeconds)
    },
  }
}

const fields = ['distance', 'elapsed', 'x', 'lateralSpeed', 'jump', 'slide', 'power', 'speed']
export function samplePose(out, previous, current, fraction) {
  for (const key of fields) out[key] = previous[key] + (current[key] - previous[key]) * fraction
  out.lane = current.lane
  return out
}
