const defaults = { score: 0, distance: 0, best: 0, farthest: 0, retrieves: 0, streak: 0,
  outfit: 'field', quality: 'auto', sfx: true, soundtrack: false }

export const outfits = [
  { id: 'field', name: 'Field collar', hint: 'Standard issue', available: () => true },
  { id: 'blaze', name: 'Blaze collar', hint: 'Run 150 m', available: (profile) => profile.farthest >= 150 },
  { id: 'marsh', name: 'Marsh bandana', hint: 'Make 3 retrieves', available: (profile) => profile.retrieves >= 3 },
  { id: 'copper', name: 'Fox red coat', hint: 'Run 600 m', available: (profile) => profile.farthest >= 600 },
]

export function normalizeProfile(raw) {
  const profile = { ...defaults }
  if (!raw || typeof raw !== 'object') return profile
  for (const key of ['score', 'distance', 'best', 'farthest', 'retrieves', 'streak']) {
    if (Number.isSafeInteger(raw[key]) && raw[key] >= 0) profile[key] = raw[key]
  }
  profile.best = Math.max(profile.best, profile.score)
  profile.farthest = Math.max(profile.farthest, profile.distance)
  for (const key of ['sfx', 'soundtrack']) {
    if (typeof raw[key] === 'boolean') profile[key] = raw[key]
  }
  if (['auto', 'low', 'high'].includes(raw.quality)) profile.quality = raw.quality
  if (outfits.some((outfit) => outfit.id === raw.outfit && outfit.available(profile))) profile.outfit = raw.outfit
  return profile
}

export function completeRun(profile, run, score) {
  const distance = Math.floor(run.distance)
  return {
    ...profile, distance, score, best: Math.max(profile.best, score), farthest: Math.max(profile.farthest, distance),
    retrieves: profile.retrieves + run.retrieves, streak: Math.max(profile.streak, run.bestStreak),
  }
}
