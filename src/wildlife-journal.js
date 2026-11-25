import { fieldSpecies } from './wildlife-catalog.js'
import { expeditionRegions } from './expedition.js'

export const wildlifeJournalVersion = 1
const regions = new Set(expeditionRegions.map(region => region.key))
const count = number => Number.isSafeInteger(number) && number > 0 ? number : 0

export function normalizeWildlife(raw, legacy) {
  const known = raw?.version === wildlifeJournalVersion ? raw.species : {}
  const species = {}
  for (const [id, oldRetrieves] of [['mallard', legacy?.ducks], ['pheasant', legacy?.pheasants]]) {
    const retrieves = count(oldRetrieves)
    if (!known?.[id] && retrieves) species[id] = { seen: 0, rare: 0, retrieves, first: null, territory: null }
  }
  for (const id of Object.keys(fieldSpecies)) {
    const entry = known?.[id]
    if (!entry || typeof entry !== 'object') continue
    const seen = count(entry.seen)
    const retrieves = count(entry.retrieves)
    if (!seen && !retrieves) continue
    const first = seen && typeof entry.first === 'string' && Number.isFinite(Date.parse(entry.first)) ? entry.first : null
    species[id] = { seen, retrieves, first, territory: first && regions.has(entry.territory) ? entry.territory : null,
      rare: Math.min(seen, count(entry.rare)) }
  }
  return { version: wildlifeJournalVersion, lastRun: count(raw?.lastRun), species }
}

export function commitWildlife(journal, report, runId, date) {
  if (runId <= journal.lastRun) return []
  journal.lastRun = runId
  const discoveries = []
  for (const [id, totals] of Object.entries(report.wildlife ?? {})) {
    if (!Object.hasOwn(fieldSpecies,id)) continue
    const seen = count(totals.seen), retrieves = count(totals.retrieves)
    if (!seen && !retrieves) continue
    const entry = journal.species[id] ??= { seen: 0, rare: 0, retrieves: 0, first: null, territory: null }
    if (seen && !entry.seen) {
      entry.first = date
      entry.territory = regions.has(totals.territory) ? totals.territory : null
      discoveries.push(id)
    }
    entry.seen += seen
    entry.rare += Math.min(seen,count(totals.rare))
    entry.retrieves += retrieves
  }
  return discoveries
}
