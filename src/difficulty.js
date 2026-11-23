export const difficultyCurve = [[0, 2], [15, 3.4], [30, 5.1], [60, 7.1], [90, 8.6], [120, 9.5]]

export const director = {
  curve: difficultyCurve,
  startingSpeed: 11,
  speedGain: 2.36,
  openingTime: 1.64,
  openingGap: 1.63,
  earlyGap: 1.43,
  lateGap: .91,
  spacingVariation: .19,
  pairAfter: 35,
  pairGap: 1.52,
  pairChance: .30,
  firstGoose: [49, 54],
  gooseInterval: [20, 30],
  doubleGooseAfter: 90,
  coordinatedGooseAfter: 120,
}

export function difficultyAt(seconds, curve = difficultyCurve) {
  for (let i = 1; i < curve.length; i++) {
    const [end, high] = curve[i]
    if (seconds <= end) {
      const [start, low] = curve[i - 1]
      return low + (high - low) * Math.max(0, (seconds - start) / (end - start))
    }
  }
  return curve.at(-1)[1]
}

export function speedAt(difficulty, rules = director) {
  return rules.startingSpeed + (difficulty - rules.curve[0][1]) * rules.speedGain
}

export function speedAtTime(seconds, rules = director) {
  return speedAt(difficultyAt(seconds, rules.curve), rules)
}

// Course rows use the integral of the pace curve, so a timed event's distance
// means the same thing to the generator and the simulation.
export function distanceAtTime(seconds, rules = director) {
  let distance = 0
  for (let i = 1; i < rules.curve.length; i++) {
    const [start, low] = rules.curve[i - 1]
    const [end, high] = rules.curve[i]
    const duration = Math.max(0, Math.min(seconds, end) - start)
    const from = speedAt(low, rules)
    const rate = (speedAt(high, rules) - from) / (end - start)
    distance += duration * (from + .5 * duration * rate)
    if (seconds <= end) return distance
  }
  const [end, value] = rules.curve.at(-1)
  return distance + (seconds - end) * speedAt(value, rules)
}
