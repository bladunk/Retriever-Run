export const difficultyCurve = [[0, 2], [15, 3.4], [30, 5.1], [60, 6.1], [90, 6.8],
  [120, 7.4], [150, 8], [180, 8.5], [210, 8.9], [240, 9.25], [270, 9.5]]

export const director = {
  curve: difficultyCurve,
  startingSpeed: 11,
  speedGain: 2.36,
  openingTime: 1.64,
  openingGap: 1.63,
  earlyGap: 1.55,
  lateGap: .94,
  spacingVariation: .14,
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

export const courseStages = [
  // Gap, second blocked lane, full-width action, and following action.
  [1.55, .14, .09, 0], [1.40, .27, .16, .08], [1.32, .39, .20, .12],
  [1.24, .50, .25, .19], [1.18, .63, .28, .22], [1.13, .73, .31, .26],
  [1.08, .80, .33, .30], [1.04, .90, .37, .39], [1.00, .94, .41, .48], [.94, 1, .44, .55],
]
