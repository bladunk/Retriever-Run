const patch = (id, name, emblem, description, measure, ...goals) =>
  ({ id, name, emblem, description, measure, goals })

export const careerFieldHonors = [
  patch('first-fetch', 'First Fetch', 'paw', 'Complete your first run.', (s) => s.runs, 1),
  patch('timber-jumper', 'Timber Jumper', 'timber', 'Jump fallen timber without a collision.', (s) => s.logs, 100, 250, 500),
  patch('low-rider', 'Low Rider', 'branch', 'Slide under overhead branches.', (s) => s.slidesCleared, 50, 125, 250),
  patch('goose-whisperer', 'Goose Whisperer', 'bird', 'Evade diving geese on the trail.', (s) => s.geese, 25, 60, 125),
  patch('marathon', 'Marathon Retriever', 'trail', 'Cover 10,000 m across completed runs.', (s) => s.distance, 10_000),
  patch('clean-paws', 'Clean Paws', 'paw', 'Survive two minutes on one run.', (s, p, r) => Math.max(p.duration, r?.duration ?? 0), 120),
  patch('top-dog', 'Top Dog', 'star', 'Earn 50,000 points in a single run.', (s, p, r) => Math.max(p.score, r?.score ?? 0), 50_000),
  patch('marsh-legend', 'Marsh Legend', 'reeds', 'Cover 50,000 m across completed runs.', (s) => s.distance, 50_000, 100_000, 200_000),
]
export const fieldHonors = [...careerFieldHonors,
  patch('flyway-traveler', 'Flyway Traveler', 'trail',
    'Reach Arkansas Flooded Timber, Dakota Wetlands, and Canadian Mountain Wilderness.',
    (s, p, r) => Math.max(p.territory ?? 0, r?.territory ?? 0), 4, 7, 10),
]
export const hallOfShame = [
  patch('swamp-thing', 'Swamp Thing', 'water', 'Fall into water 25 times.', (s) => s.deathsBy.water, 25, 50, 100),
  patch('bark-inspector', 'Bark Inspector', 'timber', 'Run into 10 logs.', (s) => s.deathsBy.logs, 10, 25, 50),
  patch('goose-magnet', 'Goose Magnet', 'bird', 'Get hit by 10 diving geese.', (s) => s.deathsBy.geese, 10, 25, 50),
  patch('short-leash', 'Short Leash', 'trail', 'Lose a run before 10 seconds.', (s) => s.shortRuns, 1),
  patch('didnt-learn', 'Didn’t Learn', 'branch', 'Hit the same type of hazard five runs in a row.', (s) => s.longestSameHazard, 5),
  patch('rough-morning', 'Rough Morning', 'reeds', 'Lose three runs in a row before 20 seconds.', (s) => s.longestEarlyStreak, 3),
]
export const patches = [...fieldHonors, ...hallOfShame]
export const medals = ['Bronze', 'Silver', 'Gold']

export function honorProgress(patch, player) {
  const earned = player.patches[patch.id] ?? []
  const goal = patch.goals[Math.min(earned.length, patch.goals.length - 1)]
  const records = { ...player.records, score: player.profile.best, territory: Math.max(player.migration?.farthest ?? 0, player.legacyMigration?.farthest ?? 0) }
  return { earned, goal, value: Math.min(goal, patch.measure(player.stats, records)) }
}

export function awardPatches(player, date) {
  const earned = []
  const records = { ...player.records, score: player.profile.best, territory: Math.max(player.migration?.farthest ?? 0, player.legacyMigration?.farthest ?? 0) }
  for (const patch of patches) {
    const value = patch.measure(player.stats, records)
    const dates = player.patches[patch.id] ?? []
    for (let level = dates.length; level < patch.goals.length && value >= patch.goals[level]; level++) {
      dates.push(date)
      earned.push({ patch, level, date })
    }
    if (dates.length) player.patches[patch.id] = dates
  }
  return earned
}

export function pendingPatches(player, snapshot, seen) {
  const projected = { ...player.stats }
  for (const key of ['distance', 'logs', 'slidesCleared', 'geese']) projected[key] += snapshot[key]
  const pending = []
  for (const patch of fieldHonors) {
    const level = Math.max(player.patches[patch.id]?.length ?? 0, seen.get(patch.id) ?? 0)
    const value = patch.measure(projected,
      { ...player.records, score: player.profile.best, territory: Math.max(player.migration?.farthest ?? 0, player.legacyMigration?.farthest ?? 0) }, snapshot)
    if (level < patch.goals.length && value >= patch.goals[level]) {
      seen.set(patch.id, level + 1)
      pending.push({ patch, level })
    }
  }
  return pending
}
