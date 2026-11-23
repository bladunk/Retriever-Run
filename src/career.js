import { fieldHonors } from './honors.js'

const obstacleHonors = ['timber-jumper', 'low-rider', 'goose-whisperer']

export const dogRanks = [
  { id: 'pup', name: 'Pup', level: 1, emblem: 'paw' },
  { id: 'junior', name: 'Junior Retriever', level: 10, emblem: 'trail', reward: 'junior-collar',
    honors: 3 },
  { id: 'seasoned', name: 'Seasoned Gun Dog', level: 25, emblem: 'bird', reward: 'seasoned-vest',
    honors: 6, survival: 'clean-paws' },
  { id: 'master', name: 'Master Retriever', level: 50, emblem: 'star', reward: 'master-buckle',
    honors: 8, silver: 2, obstacleSilver: 1 },
  { id: 'legend', name: 'Marsh Legend', level: 100, emblem: 'reeds', reward: 'legend-vest',
    honors: 8, silver: 3, obstacleGold: 2, lifetime: 'marsh-legend', longestRun: 300, retrieves: 100 },
]

export const xpRates = { run: 15, distance: 8, jump: 5, slide: 5, goose: 15, treat: 1, retrieve: 18, best: 50, honor: 45 }
const maxXP = 1_000_000_000_000
const careerCount = value => Number.isSafeInteger(value) && value >= 0 ? value : 0
const validXP = value => Math.min(maxXP, careerCount(value))
const rankOrder = new Map(dogRanks.map((rank, index) => [rank.id, index]))
export const rankIndex = id => rankOrder.get(id) ?? 0
const award = (player, id) => player?.patches?.[id]?.length ?? 0

export function xpAt(level) {
  // Keep the original first milestone so existing level-two dogs do not return to level one.
  if (level === 2) return 110
  const steps = level - 1
  return steps * (165 + 28 * (steps - 1))
}

export function legacyLevel(xp) {
  return 1 + Math.floor((Math.sqrt(84 ** 2 + 104 * validXP(xp)) - 84) / 52)
}

export function levelFromXP(rawXP) {
  const xp = validXP(rawXP)
  let level = 1 + Math.floor((Math.sqrt(137 ** 2 + 112 * xp) - 137) / 56)
  if (xpAt(level + 1) <= xp) level++
  if (xpAt(level) > xp) level--
  return level
}

export function careerStanding(career) {
  const xp = validXP(career.xp)
  const level = levelFromXP(xp)
  const index = rankIndex(career.rank)
  return { xp, level, rank: dogRanks[index], nextRank: dogRanks[index + 1],
    within: xp - xpAt(level), span: xpAt(level + 1) - xpAt(level) }
}

export function normalizeCareer(raw, welcomeCredit = 0, priorLevel) {
  const xp = validXP(raw?.xp ?? welcomeCredit)
  // In schema 2 rank was derived from XP. Keep it and any ceremonies awaiting acknowledgment.
  const legacy = [1, 6, 13, 21, 31].findLastIndex(level => level <= (priorLevel ?? 0))
  const index = legacy < 0 ? rankIndex(raw?.rank) : legacy
  const legacyIndex = legacy < 0 ? Math.min(index, rankIndex(raw?.legacyRank)) : legacy
  const pending = new Set(Array.isArray(raw?.promotions) ? raw.promotions : [])
  return {
    xp,
    rank: dogRanks[index].id,
    legacyRank: dogRanks[legacyIndex].id,
    legacyLevel: priorLevel ?? careerCount(raw?.legacyLevel),
    lastRun: careerCount(raw?.lastRun),
    reviewRank: dogRanks[rankIndex(raw?.reviewRank)].id,
    promotions: dogRanks.filter((rank, i) => i > 0 && i <= index && pending.has(rank.id)).map(rank => rank.id),
  }
}

export function promotionRequirements(rank, player, level) {
  const requirements = []
  const add = (label, current, target, candidates = []) => requirements.push({
    label, current: Math.min(target, current), target, met: current >= target, candidates,
  })
  const withTier = (choices, tier) => choices.filter(id => award(player, id) >= tier).length
  const namesBelow = (choices, tier) => fieldHonors
    .filter(patch => choices.includes(patch.id) && award(player, patch.id) < tier)
    .map(patch => patch.name)
  const allHonors = fieldHonors.map(patch => patch.id)
  const tiered = fieldHonors.filter(patch => patch.goals.length >= 2).map(patch => patch.id)
  add('Career level', level, rank.level)
  if (rank.honors) add('Different Field Honors', withTier(allHonors, 1), rank.honors, namesBelow(allHonors, 1))
  if (rank.survival) add('Clean Paws · one 2-minute run', award(player, rank.survival), 1)
  if (rank.silver) add('Different Silver-tier Field Honors', withTier(tiered, 2), rank.silver, namesBelow(tiered, 2))
  if (rank.obstacleSilver) add('Silver obstacle honors', withTier(obstacleHonors, 2), rank.obstacleSilver, namesBelow(obstacleHonors, 2))
  if (rank.obstacleGold) add('Gold obstacle honors', withTier(obstacleHonors, 3), rank.obstacleGold, namesBelow(obstacleHonors, 3))
  if (rank.lifetime) add('Gold Marsh Legend Field Honor · 200 km', award(player, rank.lifetime), 3)
  if (rank.longestRun) add('Longest run · seconds', Math.floor(player?.records?.duration ?? 0), rank.longestRun)
  if (rank.retrieves) add('Lifetime duck and pheasant retrieves',
    (player?.stats?.ducks ?? 0) + (player?.stats?.pheasants ?? 0), rank.retrieves)
  return requirements
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

export function applyRunXP(career, id, result, improved, earned, player, promotionAllowed = true) {
  if (id <= career.lastRun) return null
  const before = careerStanding(career)
  career.xp = validXP(career.xp + runXP(result, improved, earned))
  career.lastRun = id
  const { level } = careerStanding(career)
  if (result.duration >= 2 && promotionAllowed) {
    for (const rank of dogRanks.slice(rankIndex(career.rank) + 1)) {
      if (!promotionRequirements(rank, player, level).every(requirement => requirement.met)) break
      career.rank = rank.id
      career.promotions.push(rank.id)
    }
  }
  if (rankIndex(career.reviewRank) <= rankIndex(career.rank)) delete career.reviewRank
  const after = careerStanding(career)
  return { earned: after.xp - before.xp, before, after }
}
