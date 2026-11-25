import { fieldSpecies, habitatEncounters } from './wildlife-catalog.js'
import { expeditionRegions } from './expedition.js'

export const wildlifeJournalVersion = 2
const regions = new Set(expeditionRegions.map(region => region.key))
const count = number => Number.isSafeInteger(number) && number > 0 ? number : 0

export function normalizeWildlife(raw, legacy) {
  const known = raw?.version === 1 || raw?.version === wildlifeJournalVersion ? raw.species : {}
  const species = {}
  for (const [id, oldRetrieves] of [['mallard', legacy?.ducks], ['pheasant', legacy?.pheasants]]) {
    const retrieves = count(oldRetrieves)
    if (!known?.[id] && retrieves) species[id] = { seen: 0, rare: 0, retrieves, first: null, territory: null, regions: {} }
  }
  for (const id of Object.keys(fieldSpecies)) {
    const entry = known?.[id]
    if (!entry || typeof entry !== 'object') continue
    const seen = count(entry.seen)
    const retrieves = id === 'mallard' || id === 'pheasant' ? count(entry.retrieves) : 0
    if (!seen && !retrieves) continue
    const first = seen && typeof entry.first === 'string' && Number.isFinite(Date.parse(entry.first)) ? entry.first : null
    const territory = first && regions.has(entry.territory) ? entry.territory : null
    const recorded = {}
    let remaining = seen
    for (const region of regions) {
      const sightings = Math.min(remaining, count(entry.regions?.[region]))
      if (!sightings || !habitatEncounters[region].some(tier => tier.includes(id))) continue
      recorded[region] = sightings
      remaining -= sightings
    }
    if (raw.version === 1 && territory && seen && habitatEncounters[territory].some(tier => tier.includes(id))) {
      recorded[territory] = 1
    }
    species[id] = { seen, retrieves, first, territory, rare: Math.min(seen, count(entry.rare)), regions: recorded }
  }
  return { version: wildlifeJournalVersion, lastRun: count(raw?.lastRun), species }
}

export function commitWildlife(journal, report, runId, date) {
  if (runId <= journal.lastRun) return []
  journal.lastRun = runId
  const discoveries = []
  for (const [id, totals] of Object.entries(report.wildlife ?? {})) {
    if (!Object.hasOwn(fieldSpecies,id)) continue
    const seen = count(totals.seen), retrieves = id === 'mallard' || id === 'pheasant' ? count(totals.retrieves) : 0
    if (!seen && !retrieves) continue
    const entry = journal.species[id] ??= { seen: 0, rare: 0, retrieves: 0, first: null, territory: null, regions: {} }
    if (seen && !entry.seen) {
      entry.first = date
      entry.territory = regions.has(totals.territory) ? totals.territory : null
      discoveries.push(id)
    }
    entry.seen += seen
    entry.rare += Math.min(seen,count(totals.rare))
    entry.retrieves += retrieves
    let remaining = seen
    for (const [region, rawCount] of Object.entries(totals.regions ?? {})) {
      if (!regions.has(region) || !habitatEncounters[region].some(tier => tier.includes(id))) continue
      const observed = Math.min(remaining, count(rawCount))
      if (!observed) continue
      entry.regions[region] = (entry.regions[region] ?? 0) + observed
      remaining -= observed
    }
  }
  return discoveries
}
