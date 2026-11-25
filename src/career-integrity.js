import { dogRanks, legacyLevel, levelFromXP, promotionRequirements, rankIndex } from './legacy-career.js'

export function journalIssues(player) {
  const { runs, distance, playtime, jumps, slides, ducks, pheasants } = player.stats
  const issues = []
  if (!runs && (distance > 0 || playtime > 0)) issues.push('Lifetime totals exist without a completed run.')
  if (playtime > 0) {
    if (distance > 31 * playtime + 2 * runs) issues.push('Lifetime distance exceeds the recorded running time.')
    if (jumps + slides > 8 * playtime + 4 * runs || ducks + pheasants > 2 * playtime + 2 * runs) {
      issues.push('Lifetime action or retrieve counts exceed the recorded running time.')
    }
    if (player.records.duration > playtime + .01) issues.push('The longest run exceeds the recorded lifetime running time.')
  }
  return issues
}

export function reviewSavedRank(player) {
  const { career } = player
  const legacyThresholds = [1, 6, 13, 21, 31]
  const documentedLegacy = career.legacyLevel <= legacyLevel(career.xp)
    ? legacyThresholds.findLastIndex(level => level <= career.legacyLevel) : 0
  const legacy = Math.max(0, Math.min(documentedLegacy, rankIndex(career.legacyRank)))
  career.legacyRank = dogRanks[legacy].id
  const claimed = rankIndex(career.rank)
  const level = levelFromXP(career.xp)
  let verified = legacy
  if (!journalIssues(player).length) {
    for (let index = legacy + 1; index <= claimed; index++) {
      if (!promotionRequirements(dogRanks[index], player, level).every(check => check.met)) break
      verified = index
    }
  }
  career.rank = dogRanks[verified].id
  career.promotions = career.promotions.filter(rank => rankIndex(rank) <= verified)
  const review = Math.max(claimed, rankIndex(career.reviewRank))
  if (review > verified) career.reviewRank = dogRanks[review].id
  else delete career.reviewRank
}
