import { careerStanding, dogRanks, levelFromXP } from './career.js'
import { expeditionRegions, migrationDuration } from './expedition.js'
import { honorById, localHonors, waterfowlSpecies } from './field-honors.js'
import { kennelItems, ownedGear } from './kennel-catalog.js'
import { gearRarity } from './collection-gear.js'
import { fieldSpecies, habitatEncounters } from './wildlife-catalog.js'

export const lodgeTiers = Object.freeze([
  { id: 'shack', numeral: 'I', level: 1, name: 'The Hunting Shack',
    description: 'A lantern, a workbench and a dry place to come in from the marsh.' },
  { id: 'cabin', numeral: 'II', level: 11, name: 'The Retriever’s Cabin',
    description: 'Warm up at the wood stove and make room for the first finds from the flyway.' },
  { id: 'waterfowl', numeral: 'III', level: 26, name: 'The Waterfowl Lodge',
    description: 'A fieldstone hearth, a display cabinet and a wall for the route you have run.' },
  { id: 'estate', numeral: 'IV', level: 51, name: 'The Flyway Estate',
    description: 'A wider timber hall with room for regional finds and a growing collection.' },
  { id: 'legendary', numeral: 'V', level: 76, name: 'The Legendary Lodge',
    description: 'A grand hearth and a gallery for the best work of a lifetime in the field.' },
])

export function lodgeTier(level) {
  return lodgeTiers.findLast(tier => tier.level <= level) ?? lodgeTiers[0]
}

export const lodgeUpgrades = Object.freeze([
  ['greenhead-decoy','Carved Mallard',1,'decoy','honor','mallard-retrieve-1'],
  ['first-field-study','First Field Study',1,'observation','species',1],
  ['coastal-survey','Marsh Survey',1,'map','honor','gulf-traversal'],
  ['bench-ledger','Bench Ledger',4,'journal','hunts',20],
  ['brass-hook-board','Brass Hook Board',7,'equipment','honors',15],
  ['cypress-chart','Cypress Chart',11,'map','honor','cypress-traversal'],
  ['cabin-field-album','Cabin Field Album',13,'observation','species',5],
  ['rooster-carving','Pheasant Carving',15,'pheasant','honor','pheasant-retrieve-1'],
  ['stove-mantel-plaque','Stove Mantel Plaque',18,'record','honor','skill-chain-2'],
  ['canvas-rail','Canvas Equipment Rail',22,'equipment','gear',15],
  ['ten-species-cabinet','Waterfowl Study Cabinet',26,'observation','waterfowl',10],
  ['upriver-map','Upriver Survey',29,'map','honor','platte-traversal'],
  ['hundred-hunts-ledger','Hundred Hunts Ledger',32,'journal','hunts',100],
  ['brass-honor-frame','Brass Honor Frame',38,'medal','honors',100],
  ['long-run-plaque','Long Run Plaque',45,'record','honor','skill-distance-4'],
  ['northwind-map','Northwind Chart',51,'map','honor','manitoba-arrival'],
  ['white-wing-display','White Wing Display',55,'decoy','waterfowl',15],
  ['rare-field-folio','Rare Field Folio',59,'observation','honor','rare-journal-2'],
  ['expedition-rack','Expedition Equipment Rack',64,'equipment','gear',70],
  ['flyway-field-plaque','Flyway Field Plaque',70,'medal','honors',200],
  ['migration-memorial','Great Migration Memorial',76,'map','honor','legend-whole-course'],
  ['all-waters-display','All Waters Display',82,'decoy','honor','legend-all-waterfowl'],
  ['wilderness-gallery','Wilderness Gallery',88,'record','honor','legend-beyond-the-map'],
  ['guide-notebook-case','Guide’s Notebook Case',94,'journal','honor','legend-perfect-notebook'],
  ['master-hunter-tribute','Master Hunter Tribute',100,'legend','boyd',true],
].map(([id, name, level, art, kind, target]) => ({ id, name, level, art, kind, target })))

const hasHonor = (player, id) => Object.hasOwn(player.progression.honors, id)
const seen = (player, id) => player.wildlife.species[id]?.seen ?? 0
const lookup = new Map(kennelItems.map(item => [item.id, item]))
const hallOfShame = 'Hall of Shame'

export function lodgeRequirements(upgrade) {
  const { kind, target, level } = upgrade
  const goals = { species: 'wildlife species observed', waterfowl: 'waterfowl species observed',
    hunts: 'completed hunts', honors: 'qualifying Honors', gear: 'owned wardrobe options' }
  const task = kind === 'honor' ? honorById.get(target).name
    : kind === 'boyd' ? 'Full Master Hunter qualification' : target + ' ' + goals[kind]
  return level > 1 ? 'Level ' + level + ' · ' + task : task
}

export function lodgeProgress(player, standing = careerStanding(player.career), gear = ownedGear(player, standing)) {
  const tier = lodgeTier(standing.level)
  const qualifies = Boolean(player.progression.boyd) && !player.progression.paused
  if (player.progression.paused) return { tier, upgrades: [] }
  const counts = {
    species: Object.values(player.wildlife.species).filter(species => species.seen).length,
    waterfowl: waterfowlSpecies.filter(species => seen(player, species.id)).length,
    hunts: player.stats.runs,
    honors: Object.keys(player.progression.honors).filter(id => honorById.get(id)?.qualifies).length,
    gear: gear.length,
  }
  const upgrades = lodgeUpgrades.filter(upgrade => standing.level >= upgrade.level &&
    (upgrade.kind === 'honor' ? hasHonor(player, upgrade.target)
      : upgrade.kind === 'boyd' ? qualifies : counts[upgrade.kind] >= upgrade.target))
  return { tier, upgrades }
}

export function lodgeChanges(before, after) {
  const existing = new Set(before.upgrades.map(upgrade => upgrade.id))
  return { tier: after.tier.level > before.tier.level ? after.tier : null,
    upgrades: after.upgrades.filter(upgrade => !existing.has(upgrade.id)) }
}

export function trophyFor(player, key) {
  if (typeof key !== 'string') return null
  const separator = key.indexOf(':')
  const kind = key.slice(0, separator)
  const id = key.slice(separator + 1)
  if (kind === 'honor') {
    const honor = honorById.get(id)
    if (!honor || honor.pending || !hasHonor(player, id)) return null
    const category = honor.category === hallOfShame ? 'hall' : honor.category === 'Legendary' ? 'legend' : 'honors'
    return { key, category, name: honor.name, art: category === 'hall' ? 'shame' : category === 'legend' ? 'legend' : 'medal',
      date: player.progression.honors[id], badge: honor.tier, checks: honor.checks }
  }
  if (kind === 'observe' || kind === 'retrieve') {
    const row = player.wildlife.species[id]
    if (!Object.hasOwn(fieldSpecies, id) || !row || !(kind === 'observe' ? row.seen : row.retrieves)) return null
    const watched = kind === 'observe'
    return { key, category: watched ? 'wildlife' : 'retrieves', name: fieldSpecies[id].name,
      art: watched ? 'observation' : id === 'pheasant' ? 'pheasant' : 'decoy', species: watched ? id : undefined,
      badge: watched ? 'Field observation' : 'Retrieve display', date: watched ? row.first : null,
      description: (watched ? row.seen + ' field sightings' : row.retrieves + ' recorded retrieves') }
  }
  if (kind === 'region') {
    const region = expeditionRegions.find(place => place.key === id)
    if (!region || player.migration.farthest <= region.index) return null
    return { key, category: 'regional', name: region.name, art: 'map', badge: 'Territory reached',
      description: 'Reached this stop on the Great Migration route.' }
  }
  if (kind === 'rank') {
    const rank = dogRanks.find(item => item.id === id)
    if (!rank || rank.level === 1 || rank.level > levelFromXP(player.career.xp) ||
      (rank.id === 'master-hunter' && (!player.progression.boyd || player.progression.paused))) return null
    return { key, category: 'career', name: rank.name, art: 'record', badge: 'Career milestone',
      description: rank.id === 'master-hunter' ? 'Earned full Master Hunter qualification.' : 'Reached Career Level ' + rank.level + '.' }
  }
  return null
}

export function earnedTrophies(player) {
  const keys = [...Object.keys(player.progression.honors).map(id => 'honor:' + id),
    ...Object.keys(player.wildlife.species).flatMap(id => ['observe:' + id, 'retrieve:' + id]),
    ...expeditionRegions.map(region => 'region:' + region.key), ...dogRanks.map(rank => 'rank:' + rank.id)]
  return keys.map(key => trophyFor(player, key)).filter(Boolean)
}

export const trophyLimit = 3
export const recentGearLimit = 6
export const lodgeDisplayVersion = 1
const bounded = (list, eligible, limit) => Array.isArray(list) ? [...new Set(list.filter(eligible))].slice(0, limit) : []

export function normalizeLodgeDisplay(raw, player, practice = false) {
  const source = !practice && raw?.version === lodgeDisplayVersion ? raw : {}
  const available = Array.isArray(source.recentGear) && source.recentGear.length
    ? new Set(ownedGear(player, careerStanding(player.career)).map(item => item.id)) : null
  return { version: lodgeDisplayVersion,
    pins: bounded(source.pins, key => Boolean(trophyFor(player, key)), trophyLimit),
    recentGear: available ? bounded(source.recentGear, id => available.has(id), recentGearLimit) : [] }
}

export function recordLodgeGear(display, gear) {
  display.recentGear = [...new Set([...gear.map(item => item.id), ...display.recentGear])].slice(0, recentGearLimit)
}

export function displayEquipment(player) {
  const owned = ownedGear(player, careerStanding(player.career))
  const available = new Set(owned.map(item => item.id))
  const group = ids => ids.filter(id => available.has(id)).map(id => lookup.get(id))
  return { total: kennelItems.length, owned: owned.length, recent: group(player.lodgeDisplay.recentGear),
    favorites: group(player.kennel.favorites).slice(0, 6),
    distinguished: owned.filter(item => gearRarity.indexOf(item.rarity) >= gearRarity.indexOf('Rare'))
      .sort((a, b) => gearRarity.indexOf(b.rarity) - gearRarity.indexOf(a.rarity)).slice(0, 6),
    outfits: Object.entries({ ...player.kennel.outfits, [player.kennel.breed]: player.kennel.equipment })
      .map(([breed, slots]) => ({ breed, items: group(Object.values(slots)).filter(item => item.id !== 'no-vest' &&
        (breed !== 'boyd' || item.id !== slots.coat)) })) }
}

export function completeMigrations(player) {
  return Math.max(player.progression.migrations, Number(player.migration.duration >= migrationDuration))
}

export function migrationStop(player, index) {
  const region = expeditionRegions[index]
  const capacity = new Set(habitatEncounters[region.key].flat()).size
  const observed = Object.entries(player.wildlife.species).filter(([, row]) => row.regions?.[region.key]).map(([id]) => fieldSpecies[id])
  const end = expeditionRegions[index + 1]?.seconds ?? migrationDuration
  return { region, reached: player.migration.farthest > index, traversed: player.migration.duration >= end, capacity, observed,
    metres: player.progression.metres[index], seconds: player.migration.seconds[index],
    honors: localHonors.filter(honor => ['Exploration', 'Regional'].includes(honor.category) &&
      honor.checks.some(check => check.key.endsWith(':' + region.key)) && hasHonor(player, honor.id)),
  }
}
