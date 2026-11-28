export const maxLevel = 100
export const dogRanks = [
  { id: 'pup', name: 'Kennel Pup', level: 1, emblem: 'paw' },
  { id: 'rookie', name: 'Rookie Retriever', level: 11, emblem: 'trail' },
  { id: 'marsh-runner', name: 'Marsh Runner', level: 21, emblem: 'reeds' },
  { id: 'working', name: 'Working Dog', level: 31, emblem: 'bird' },
  { id: 'seasoned-retriever', name: 'Seasoned Retriever', level: 41, emblem: 'timber' },
  { id: 'veteran', name: 'Waterfowl Veteran', level: 51, emblem: 'bird' },
  { id: 'champion', name: 'Flyway Champion', level: 61, emblem: 'trail' },
  { id: 'elite', name: 'Elite Gundog', level: 71, emblem: 'branch' },
  { id: 'legendary', name: 'Legendary Retriever', level: 81, emblem: 'star' },
  { id: 'master-hunter', name: 'Master Hunter', level: 100, emblem: 'star' },
]
const milestones = [[1, 0], [2, 110], [10, 9_000], [20, 22_500], [30, 45_000],
  [40, 90_000], [50, 157_500], [60, 225_000], [70, 355_000], [80, 470_000],
  [99, 731_000], [100, 750_000]]
const thresholds = [0]
for (let i = 1; i < milestones.length; i++) {
  const [start, low] = milestones[i - 1]
  const [end, high] = milestones[i]
  for (let level = start + 1; level <= end; level++)
    thresholds.push(Math.round(low + (high - low) * (level - start) / (end - start)))
}
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0
const cleanXP = value => Math.min(1e12, count(value))
const positive = value => Number.isFinite(value) && value > 0 ? value : 0

export function xpAt(level) {
  return thresholds[Math.min(maxLevel, Math.max(1, Math.floor(level || 1))) - 1]
}

export function levelFromXP(value) {
  const xp = cleanXP(value)
  return thresholds.findLastIndex(threshold => threshold <= xp) + 1
}

export function careerStanding(career) {
  const xp = cleanXP(career?.xp)
  const level = levelFromXP(xp)
  const index = dogRanks.findLastIndex(rank => rank.level <= level)
  const maxed = level === maxLevel
  const span = maxed ? 1 : xpAt(level + 1) - xpAt(level)
  return { xp, level, rank: dogRanks[index], nextRank: dogRanks[index + 1],
    within: maxed ? span : xp - xpAt(level), span, maxed }
}

export function normalizeCareer(raw) {
  return { xp: cleanXP(raw?.xp), lastRun: count(raw?.lastRun),
    legacyXP: cleanXP(raw?.legacyXP), legacyLevel: count(raw?.legacyLevel),
    legacyRank: typeof raw?.legacyRank === 'string' ? raw.legacyRank.slice(0, 80) : '' }
}

export function runXP(result, improved = [], newHonors = 0) {
  const time = positive(result.duration)
  if (time < 2) return 0
  const pace = Math.min(time * .09, positive(positive(result.distance) - time * 12) * .025)
  const score = Math.min(time * .10, positive(positive(result.score) - positive(result.distance)) / 240)
  const maneuvers = positive(result.jumpClears) + positive(result.slidesCleared) + positive(result.geese)
  const execution = Math.min(time * .20, 2 * maneuvers + 8 * (positive(result.ducks) + positive(result.pheasants)) +
    3 * positive(result.field?.routes))
  const milestone = Math.min(time * .12, (improved.includes('score') || improved.includes('distance') ? 12 : 0) +
    4 * positive(newHonors))
  return Math.floor(.95 * time + .15 * Math.max(0, time - 45) + pace + score + execution + milestone)
}

export function applyRunXP(career, id, result, improved, newHonors) {
  if (id <= career.lastRun) return null
  const before = careerStanding(career)
  career.xp = cleanXP(career.xp + runXP(result, improved, newHonors))
  career.lastRun = id
  const after = careerStanding(career)
  return { before, after, earned: after.xp - before.xp }
}

export function xpTransitions(before, after) {
  const legs = []
  for (let level = before.level; level <= after.level; level++) {
    const from = level === before.level ? before.within : 0
    const max = level === maxLevel ? 1 : xpAt(level + 1) - xpAt(level)
    const to = level === after.level ? after.within : max
    legs.push({ level, from, to, max })
  }
  return legs
}
