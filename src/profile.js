export const audioDefaults = { masterVolume: .9, musicVolume: .55, wildlifeVolume: .8, ambientVolume: .8, effectsVolume: .85 }

const defaults = { score: 0, distance: 0, best: 0, farthest: 0, retrieves: 0, streak: 0,
  outfit: 'field', quality: 'auto', comfort: true, haptics: false, musicRestore: audioDefaults.musicVolume, ...audioDefaults }

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
  if (typeof raw.comfort === 'boolean') profile.comfort = raw.comfort
  if (typeof raw.haptics === 'boolean') profile.haptics = raw.haptics
  if (raw.sfx === false) profile.wildlifeVolume = profile.ambientVolume = profile.effectsVolume = 0
  if (!Number.isFinite(raw.ambientVolume) && Number.isFinite(raw.wildlifeVolume))
    profile.ambientVolume = Math.min(1, Math.max(0, raw.wildlifeVolume))
  if (raw.soundtrack === false) profile.musicVolume = 0
  for (const key of Object.keys(audioDefaults)) {
    if (Number.isFinite(raw[key])) profile[key] = Math.min(1, Math.max(0, raw[key]))
  }
  profile.musicRestore = Number.isFinite(raw.musicRestore) && raw.musicRestore > 0
    ? Math.min(1, raw.musicRestore) : profile.musicVolume || audioDefaults.musicVolume
  if (['auto', 'low', 'balanced', 'high'].includes(raw.quality)) profile.quality = raw.quality
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
