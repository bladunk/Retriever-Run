import { fieldHonors } from './honors.js'

export const dogRanks = [
  { id: 'pup', name: 'Pup', level: 1, emblem: 'paw' },
  { id: 'junior', name: 'Junior Retriever', level: 6, emblem: 'trail', reward: 'junior-collar' },
  { id: 'seasoned', name: 'Seasoned Gun Dog', level: 13, emblem: 'bird', reward: 'seasoned-vest' },
  { id: 'master', name: 'Master Retriever', level: 21, emblem: 'star', reward: 'master-buckle' },
  { id: 'legend', name: 'Marsh Legend', level: 31, emblem: 'reeds', reward: 'legend-vest' },
]

export const xpRates = { run: 25, distance: 10, jump: 5, slide: 5, goose: 15, treat: 2, retrieve: 20, best: 75, honor: 50 }
const maxXP = 1_000_000_000_000
const careerCount = value => Number.isSafeInteger(value) && value >= 0 ? value : 0
const validXP = value => Math.min(maxXP, careerCount(value))

export function xpAt(level) {
  const steps = level - 1
  return steps * (110 + 26 * (steps - 1))
}

export function careerStanding(rawXP) {
  const xp = validXP(rawXP)
  const level = 1 + Math.floor((Math.sqrt(84 ** 2 + 104 * xp) - 84) / 52)
  const index = dogRanks.findLastIndex(rank => rank.level <= level)
  const rank = dogRanks[index]
  return { xp, level, rank, nextRank: dogRanks[index + 1], within: xp - xpAt(level), span: xpAt(level + 1) - xpAt(level) }
}

export function normalizeCareer(raw, welcomeCredit = 0) {
  const xp = validXP(raw?.xp ?? welcomeCredit)
  const { level } = careerStanding(xp)
  const pending = new Set(Array.isArray(raw?.promotions) ? raw.promotions : [])
  return {
    xp,
    lastRun: careerCount(raw?.lastRun),
    promotions: dogRanks.filter(rank => rank.reward && rank.level <= level && pending.has(rank.id)).map(rank => rank.id),
  }
}

export function serviceCredit(stats) {
  // A capped service credit uses established totals without reconstructing old events.
  return Math.min(1_000, stats.runs * 15 + Math.floor(stats.distance / 100) * 5)
}

export function runXP(result, improved, earned) {
  if (result.duration < 2) return 0
  return validXP(xpRates.run + Math.floor(result.distance / 100) * xpRates.distance +
    result.jumpClears * xpRates.jump + result.slidesCleared * xpRates.slide +
    result.geese * xpRates.goose + result.treats * xpRates.treat +
    (result.ducks + result.pheasants) * xpRates.retrieve +
    Number(improved.includes('score') || improved.includes('distance')) * xpRates.best +
    earned.filter(({ patch, level }) => level === 0 && fieldHonors.includes(patch)).length * xpRates.honor)
}

export function applyRunXP(career, id, result, improved, earned) {
  if (id <= career.lastRun) return null
  const before = careerStanding(career.xp)
  const xp = validXP(career.xp + runXP(result, improved, earned))
  const after = careerStanding(xp)
  const promotions = dogRanks.filter(rank => rank.level > before.level && rank.level <= after.level)
  career.xp = xp
  career.lastRun = id
  career.promotions.push(...promotions.map(rank => rank.id))
  return { earned: xp - before.xp, before, after }
}
