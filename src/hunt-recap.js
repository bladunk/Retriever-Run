const maxPoses = 84
const maxHazards = 96

export function createHuntRecap() {
  const poses = new Array(maxPoses)
  const hazards = []
  let count = 0
  let next = 0

  return {
    reset() {
      count = 0
      next = 0
      hazards.length = 0
    },
    record(run, stride) {
      const pose = poses[next] ?? (poses[next] = {})
      for (const key of ['distance','elapsed','x','lane','lateralSpeed','jump','slide','power','speed'])
        pose[key] = run[key]
      pose.stride = stride
      next = (next + 1) % maxPoses
      count = Math.min(maxPoses, count + 1)
    },
    hazard(item, distance) {
      while (hazards.length && (hazards[0].distance < distance - 90 || hazards.length >= maxHazards)) hazards.shift()
      const { type, lane, distance: at, wide, variant, turn, span, flightSpeed, direction, lead, safeLane } = item
      hazards.push({ type, lane, distance: at, wide, variant, turn, span, flightSpeed, direction, lead, safeLane, hazard: true })
    },
    canWatch: () => count > 9,
    snapshot() {
      const history = Array.from({ length: count }, (_, i) => poses[(next + maxPoses - count + i) % maxPoses])
      return { history, hazards: hazards.map(item => ({ ...item })) }
    },
  }
}
