import { rankIndex } from './legacy-career.js'
import { collectionGear } from './collection-gear.js'
import { honorById } from './field-honors.js'
import { masterHunter } from './master-hunter.js'

const rankLevels = { junior: 11, seasoned: 31, master: 61, legend: 81 }
const item = (id, name, legacyLevel, color, detail = {}) => ({
  id, name, color, legacyLevel, rarity: detail.rank ? 'Rare' : 'Common',
  level: detail.rank ? rankLevels[detail.rank] : detail.level ?? legacyLevel, ...detail,
})

export const kennelCatalog = {
  collar: [
    item('classic-leather', 'Classic Leather Collar', 1, 0x594333),
    item('forest-collar', 'Forest Green Collar', 3, 0x435639),
    item('junior-collar', 'Junior Field Collar', 6, 0x836346, { rank: 'junior', buckle: true }),
    item('blaze-collar', 'Blaze Orange Collar', 7, 0xdd792d),
    item('brass-collar', 'Brass Buckle Collar', 15, 0x564335, { buckle: true }),
    item('master-buckle', 'Master’s Leather Collar', 21, 0x3b2821, { rank: 'master', buckle: true }),
    item('master-collar', 'Master Retriever Collar', 25, 0x343231, { rank: 'master', buckle: true }),
    item('marsh-bandana', 'Marsh Bandana', null, 0x616946, { bandana: true, level: 5 }),
    ...collectionGear.collar,
  ],
  vest: [
    item('no-vest', 'No Vest', 1, null),
    item('canvas-vest', 'Canvas Training Vest', 5, 0x957d54, { binding: 0x57462e, panel: 0x7d684b, rough: .93 }),
    item('marsh-vest', 'Marsh Green Field Vest', 12, 0x566137, { level: 15, binding: 0x323825, panel: 0x454e30, rough: .83 }),
    item('seasoned-vest', 'Seasoned Waxed Vest', 13, 0x69543a, { rank: 'seasoned', binding: 0x392d24, panel: 0x514131, rough: .69 }),
    item('blaze-vest', 'Blaze Orange Field Vest', 20, 0xe47735, { binding: 0x513627, panel: 0x955630, rough: .84 }),
    item('master-vest', 'Master Gun Dog Vest', 30, 0x3f5045, { rank: 'master', binding: 0x29302b, panel: 0x323d36, rough: .68 }),
    item('legend-vest', 'Marsh Legend Vest', 31, 0x3c392d, { rank: 'legend', binding: 0x64593d, panel: 0x302d25, rough: .74 }),
    ...collectionGear.vest,
  ],
  coat: [
    item('classic-yellow', 'Classic Yellow Labrador', 1, 0xffffff),
    item('cream', 'Light Cream Labrador', 8, 0xffeed6, { light: .22 }),
    item('golden', 'Golden Labrador', 16, 0xe5b76d),
    item('fox-red', 'Fox Red Labrador', 24, 0xbb8053, { level: 30 }),
    item('chocolate', 'Dark Chocolate Labrador', 35, 0x695449, { level: 60, rarity: 'Rare' }),
    item('ivory', 'Ivory Cream Labrador', null, 0xfff7e8, { level: 22, light: .46 }),
    item('pale-yellow', 'Pale Yellow Labrador', null, 0xffe3bb, { level: 12, light: .17 }),
    item('wheat', 'Wheat Yellow Labrador', null, 0xf0cf95, { level: 27, light: .08 }),
    item('harvest', 'Harvest Yellow Labrador', null, 0xd7a35b, { level: 39 }),
    item('dark-fox-red', 'Dark Fox Red Labrador', null, 0x9e5136, { level: 55, rarity: 'Rare' }),
    item('milk-chocolate', 'Milk Chocolate Labrador', null, 0x906e62, { level: 48, rarity: 'Uncommon' }),
    item('black', 'Black Labrador', null, 0x41424b, { level: 72, rarity: 'Epic' }),

  ],
}

export const kennelItems = Object.values(kennelCatalog).flat()
export const classicGear = Object.fromEntries(Object.entries(kennelCatalog).map(([category, [first]]) => [category, first.id]))
export const defaultGear = breed => breed === 'boyd'
  ? { ...classicGear, collar: masterHunter.signature, vest: masterHunter.vest } : { ...classicGear }
export function unlocked(item, standing, kennel, progress) {
  if (!item || item.breed && (!progress?.boyd || kennel.breed !== item.breed)) return false
  if (kennel.inherited.includes(item.id)) return true
  if (progress?.paused && item.level !== 1) return false
  return (item.level !== undefined && item.level !== null || item.honor || item.breed) &&
    (item.level == null || standing.level >= item.level) &&
    (!item.honor || Object.hasOwn(progress?.honors ?? {}, item.honor))
}

export function gearRequirement(item) {
  const parts = []
  if (item.breed) parts.push('Qualify and equip Boyd')
  if (item.level) parts.push('Level ' + item.level)
  if (item.honor) parts.push(honorById.get(item.honor).name)
  return parts.join(' · ') || 'Legacy reward'
}

export function legacyGear(profile) {
  const inherited = []
  if (profile.farthest >= 150) inherited.push('blaze-collar')
  if (profile.retrieves >= 3) inherited.push('marsh-bandana')
  if (profile.farthest >= 600) inherited.push('fox-red')
  const equipment = { ...classicGear }
  if (profile.outfit === 'blaze') equipment.collar = 'blaze-collar'
  if (profile.outfit === 'marsh') equipment.collar = 'marsh-bandana'
  if (profile.outfit === 'copper') equipment.coat = 'fox-red'
  return { equipment, inherited }
}

export function normalizeKennel(source, standing, progress, legacyStanding, priorLevel) {
  const previous = new Set(Array.isArray(source?.inherited) ? source.inherited : [])
  const legacyLevels = { 'marsh-bandana': null, 'marsh-vest': 15, 'fox-red': 30, chocolate: 60 }
  const inherited = kennelItems.filter(item => {
    if (item.breed) return false
    if (previous.has(item.id)) return true
    if (priorLevel !== undefined && item.legacyLevel > 1 && item.legacyLevel <= priorLevel) return true
    if (!legacyStanding || !Object.hasOwn(item, 'legacyLevel')) return false
    if (item.rank) return rankIndex(legacyStanding.rank.id) >= rankIndex(item.rank)
    const level = Object.hasOwn(legacyLevels, item.id) ? legacyLevels[item.id] : item.legacyLevel
    return level > 1 && legacyStanding.level >= level
  }).map(item => item.id)
  const breed = source?.breed === 'boyd' && progress.boyd ? 'boyd' : 'lab'
  const favorites = new Set(Array.isArray(source?.favorites) ? source.favorites : [])
  const kennel = { breed, inherited, equipment: defaultGear(breed), outfits: {},
    favorites: kennelItems.filter(item => favorites.has(item.id)).map(item => item.id) }
  for (const dog of progress.boyd ? ['lab', 'boyd'] : ['lab']) {
    const outfit = dog === breed ? source?.equipment : source?.outfits?.[dog]
    const equipment = defaultGear(dog)
    for (const [category, items] of Object.entries(kennelCatalog)) {
      const selected = items.find(gear => gear.id === outfit?.[category])
      if (unlocked(selected, standing, { breed: dog, inherited }, progress)) equipment[category] = selected.id
    }
    if (dog === breed) kennel.equipment = equipment
    else kennel.outfits[dog] = equipment
  }
  return kennel
}

export function ownedGear(player, standing) {
  return kennelItems.filter(item => item.breed ? Boolean(player.progression.boyd)
    : unlocked(item, standing, player.kennel, player.progression))
}
