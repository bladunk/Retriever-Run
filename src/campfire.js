import { campfireLines } from './campfire-lines.js'

export const heckleHistoryKey = 'retriever-run.heckles'
export const recentHeckleLimit = 24
const byHazard = {
  tree: 'tree', 'leaning-tree': 'tree', fallen: 'tree', log: 'log', root: 'log', drift: 'log',
  fence: 'fence', rock: 'rock', snowmobile: 'sled',
  stream: 'water', puddle: 'water', washout: 'water', tractor: 'tractor', goose: 'goose', branch: 'slide',
}
const catalog = Object.fromEntries(Object.entries(campfireLines).map(([category, lines]) =>
  [category, lines.map((line, index) => ({ id: category + '-' + index, category, line }))]))
const known = new Set(Object.values(catalog).flat().map(joke => joke.id))

function weights({ hazard, duration, score, previousBest, priorRuns, bestStreak, jump, slide, changingLane, rivalGap,
  postedTimber, recentTreat, territory, retrieves, rankedUp, notable, repeated }) {
  const result = { camp: 3, tree: 0, log: 0, water: 0, tractor: 0, goose: 0, jump: 0, slide: 0,
    lane: 0, short: 0, rookie: 0, long: 0, best: 0, rival: 0, combo: 0 }
  if (byHazard[hazard]) result[byHazard[hazard]] = 7
  if (jump) result.jump += 6
  if (slide) result.slide += 6
  if (changingLane) result.lane = 7
  if (duration < 8) result.short = 7
  if (priorRuns < 3) result.rookie = 5
  if (duration >= 120) result.long = 6
  if (previousBest > 0 && score < previousBest && score >= previousBest * .88) result.best = 9
  if (rivalGap > 0 && rivalGap <= .14) result.rival = 9
  if (bestStreak >= 15) result.combo = 8
  if (duration >= 285) result.legend = 13
  if (duration >= 240 && duration < 248) result.arrivedNorth = 14
  if (duration >= 232 && duration < 240) result.nearNorth = 14
  if (postedTimber) result.postedTimber = 13
  if (hazard === 'fallen') result.downedTimber = 11
  if (recentTreat) result.treatDetour = 9
  if (retrieves > 0) result.bag = 8
  if (rankedUp) result.rank = 13
  if (notable) result.careerLegend = 15
  if (territory >= 6 && territory <= 10) result.plains = 5
  if (territory === 2 || territory === 4) result.timberCountry = 5
  if (territory >= 14) result.highCountry = 7
  if (repeated) result.repeat = 9
  if (duration >= 15 && duration < 288 && duration % 15 < 3) result.freshStage = 8
  if (duration >= 150 && ['puddle', 'root', 'log', 'fence', 'tree', 'branch'].includes(hazard)) result.slowFinish = 9
  return result
}

export function createCampfire(storage = () => globalThis.localStorage, random = Math.random) {
  let recent = []
  try {
    const saved = JSON.parse(storage()?.getItem(heckleHistoryKey))
    if (Array.isArray(saved)) recent = [...new Set(saved.filter(id => known.has(id)))].slice(0, recentHeckleLimit)
  } catch { /* History is presentation only. */ }

  function draw(options, total) {
    let point = random() * total
    for (const [choices, weight] of options) {
      point -= weight
      if (point < 0) return choices[Math.floor(random() * choices.length)]
    }
    return options.at(-1)[0][0]
  }

  return {
    choose(context) {
      const mix = weights(context)
      // Repeated identical outcomes can exhaust a context. Relax the oldest
      // exclusion first so the last several lines always stay out of rotation.
      let options = []
      for (let count = recent.length; count >= 0 && !options.length; count--) {
        const avoid = new Set(recent.slice(0, count))
        options = Object.entries(mix).filter(([, weight]) => weight > 0)
          .map(([category, weight]) => [catalog[category].filter(joke => !avoid.has(joke.id)), weight])
          .filter(([choices]) => choices.length)
      }
      const joke = draw(options, options.reduce((total, [, value]) => total + value, 0))
      recent = [joke.id, ...recent.filter(id => id !== joke.id)].slice(0, recentHeckleLimit)
      try { storage()?.setItem(heckleHistoryKey, JSON.stringify(recent)) }
      catch { /* Continue rotating in memory. */ }
      return joke
    },
  }
}
