import { dogRanks } from './career.js'
import { migrationDuration } from './expedition.js'
import { completeMigrations, earnedTrophies, lodgeTiers } from './lodge-progress.js'
import { kennelItems } from './kennel-catalog.js'

const milestones = new Map([
  ['first-hunt', 'First hunt'],
  ['migration', 'First Great Migration'],
  ...dogRanks.slice(1).map(rank => ['rank:' + rank.id, rank.name]),
  ...lodgeTiers.slice(1).map(tier => ['lodge:' + tier.id, tier.name]),
])
const timestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value))

export function normalizeLegacyHistory(source) {
  return {
    version: 1,
    milestones: Object.fromEntries([...milestones.keys()].flatMap(key => {
      const value = source?.milestones?.[key]
      return source?.version === 1 && timestamp(value) ? [[key, new Date(value).toISOString()]] : []
    })),
  }
}

export function recordLegacyMilestones(player, before, after, changes, firstHunt, firstMigration, boyd, date) {
  const events = player.legacyHistory.milestones
  if (firstHunt) events['first-hunt'] ??= date
  if (firstMigration) events.migration ??= date
  for (const rank of dogRanks.slice(1, -1)) {
    if (rank.level > before.level && rank.level <= after.level) events['rank:' + rank.id] ??= date
  }
  if (boyd) events['rank:master-hunter'] ??= date
  if (changes?.tier) {
    for (const tier of lodgeTiers) {
      if (tier.level > before.level && tier.level <= after.level) events['lodge:' + tier.id] ??= date
    }
  }
}

export function legacyTimeline(player, standing, retained) {
  const recorded = new Map()
  const untimed = []
  function add(id, name, date, kind, detail) {
    const entry = { id, name, date: timestamp(date) ? date : undefined, kind, detail }
    if (entry.date) recorded.set(id, entry)
    else untimed.push(entry)
  }
  const saved = player.legacyHistory.milestones
  const first = retained.find(run => run.id === 1)
  if (player.stats.runs || player.profile.best || player.profile.farthest)
    add('first-hunt', !saved['first-hunt'] && first?.date ? 'First retained hunt' : milestones.get('first-hunt'),
      saved['first-hunt'] ?? first?.date, 'Career')
  // A retained complete run proves a completion. Without a saved first
  // milestone it cannot prove this was the player's first completion.
  if (completeMigrations(player)) {
    add('migration', saved.migration ? milestones.get('migration') : 'Great Migration completed',
      saved.migration, 'Migration', 'All 15 territories')
    const archived = retained.filter(run => run.duration >= migrationDuration && run.territory === 15)
      .sort((a,b) => a.id - b.id)[0]
    if (!saved.migration && archived)
      add('archived-crossing', 'Recorded Great Migration crossing', archived.date, 'Field record')
  }
  for (const rank of dogRanks.slice(1)) {
    if (rank.level > standing.level || rank.id === 'master-hunter' && !player.progression.boyd) continue
    const id = 'rank:' + rank.id
    add(id, rank.name, saved[id] ?? (rank.id === 'master-hunter' ? player.progression.boyd : undefined), 'Rank')
  }
  for (const tier of lodgeTiers.slice(1).filter(item => item.level <= standing.level)) {
    const id = 'lodge:' + tier.id
    add(id, tier.name, saved[id], 'Lodge')
  }
  const trophies = earnedTrophies(player)
  for (const item of trophies) {
    if (item.category === 'discovery' || item.category === 'legend' || item.badge === 'Platinum')
      add(item.key, item.name, item.date, item.category === 'discovery' ? 'Discovery' : 'Field Honor', item.badge)
  }
  // The recent equipment receipt lists do not historically contain dates.
  for (const id of player.lodgeDisplay.recentGear) {
    const gear = kennelItems.find(item => item.id === id)
    if (gear) add('gear:' + id, gear.name, undefined, 'Equipment earned')
  }
  const record = retained.find(run => run.score === player.profile.best && player.profile.best > 0)
  if (player.profile.best > 0) add('score', 'Personal best score', record?.date, 'Field record', player.profile.best)
  const wildlife = Object.entries(player.wildlife.species)
    .filter(([, observation]) => observation.rare)
    .map(([id]) => trophies.find(item => item.key === 'observe:' + id))
    .filter(Boolean)
  for (const item of wildlife) {
    add('rare:' + item.key, item.name, undefined, 'Rare sightings', item.description)
  }
  return { dated: [...recorded.values()].sort((a,b) => Date.parse(b.date) - Date.parse(a.date) || a.name.localeCompare(b.name)), undated: untimed }
}
