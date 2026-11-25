export const stageSeconds = 15
const groups = ['Rookie', 'Field Dog', 'Seasoned Hunter', 'Veteran', 'Northern Expedition', 'Wilderness Legend']

// Pace, base gap, two-lane chance, wide action, paired action, dodge follow-up,
// optional retrieve route, flood, and preferred flock interval (seconds).
const progression = [
  [2.00, 1.55, .14, .09, .00, .00, .00, .00, 24],
  [3.40, 1.48, .23, .16, .06, .00, .00, .00, 23],
  [5.10, 1.40, .31, .21, .12, .05, .00, .00, 22],
  [5.64, 1.34, .40, .26, .20, .09, .01, .00, 21],
  [6.16, 1.28, .48, .30, .27, .13, .03, .00, 20],
  [6.55, 1.23, .55, .34, .34, .18, .04, .00, 19],
  [6.91, 1.18, .62, .37, .40, .23, .06, .00, 18],
  [7.25, 1.14, .68, .40, .45, .28, .08, .00, 17],
  [7.57, 1.10, .73, .43, .49, .32, .10, .00, 16],
  [7.85, 1.07, .78, .46, .53, .36, .12, .00, 15],
  [8.10, 1.04, .82, .49, .58, .41, .14, .035, 14],
  [8.34, 1.01, .86, .52, .62, .45, .16, .040, 13],
  [8.55,  .98, .89, .55, .66, .49, .18, .045, 12],
  [8.74,  .95, .92, .58, .70, .53, .20, .050, 11],
  [8.91,  .92, .94, .61, .74, .57, .22, .055, 10.5],
  [9.06,  .90, .96, .64, .78, .61, .24, .060, 10],
  [9.20,  .88, .98, .67, .82, .65, .26, .065, 9.6],
  [9.33,  .86, .99, .70, .86, .69, .28, .070, 9.2],
  [9.45,  .84, 1.0, .73, .90, .73, .30, .075, 8.8],
  [9.57,  .82, 1.0, .77, .94, .77, .32, .080, 8.4],
  [9.578, .82, 1.0, .74, .91, .79, .33, .092, 8.2],
  [9.585, .81, 1.0, .76, .92, .80, .34, .094, 8.0],
  [9.591, .81, 1.0, .78, .93, .82, .36, .089, 7.9],
  [9.597, .80, 1.0, .80, .94, .84, .37, .090, 7.8],
  [9.603, .79, 1.0, .82, .94, .86, .39, .084, 7.7],
  [9.609, .78, 1.0, .83, .95, .88, .40, .089, 7.6],
  [9.616, .77, 1.0, .85, .96, .90, .41, .055, 7.5],
  [9.621, .76, 1.0, .86, .96, .92, .42, .060, 7.3],
  [9.623, .75, 1.0, .88, .97, .94, .43, .053, 7.2],
  [9.625, .74, 1.0, .91, .98, .96, .45, .060, 7.0],
]

export function defineStages(entries, stagesPerTerritory = 2) {
  return entries.map(([pace, gap, blocks, action, chain, follow, reward, flood, flock], index) => {
    const challenge = Math.min(1, index / Math.max(1, entries.length - 1))
    return {
      level: index + 1, start: index * stageSeconds, territory: Math.floor(index / stagesPerTerritory),
      group: groups[Math.min(groups.length - 1, entries.length === 20 ? (index < 16 ? Math.floor(index / 4) : 4 + Math.floor((index - 16) / 2)) : Math.floor(index / Math.max(1, entries.length / groups.length)))],
      pace, gap, blocks, action, chain, follow, reward, flood, flock, challenge,
    }
  })
}

// Increase decision density in the latter migration while keeping the
// same speed integral, territory boundaries and measured clearance windows.
export const courseStages = defineStages(progression).map(stage => {
  const pressure = Math.max(0, Math.ceil(stage.level / 6) - 1)
  if (!pressure) return stage
  return {
    ...stage,
    // The highest speeds require enough travel time to offer genuine next-
    // lane choices. Compressing those gaps further removes valid switches.
    gap: stage.gap - .024 * Math.min(3, pressure) + (stage.level >= 25 ? .060 : 0),
    action: Math.min(.97, stage.action + .022 * pressure),
    follow: Math.min(.985, stage.follow + .025 * pressure),
    reward: stage.reward + (stage.level >= 25 ? .12 : 0),
    flock: stage.flock - .24 * pressure,
  }
})
export const primaryDuration = courseStages.length * stageSeconds
export const difficultyCurve = courseStages.map(({ start, pace }) => [start, pace])

export function stageAt(seconds, stages = courseStages) {
  return stages[Math.min(stages.length - 1, Math.floor(Math.max(0, seconds) / stageSeconds))]
}

export const director = {
  curve: difficultyCurve,
  stages: courseStages,
  startingSpeed: 11,
  speedGain: 2.36,
  openingTime: 1.64,
  openingGap: 1.63,
  earlyGap: 1.55,
  lateGap: .94,
  spacingVariation: .14,
  pairAfter: 29,
  pairGap: 1.49,
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
