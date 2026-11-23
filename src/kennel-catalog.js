import { dogRanks, rankIndex } from './career.js'

const item = (id, name, legacyLevel, color, detail = {}) => ({
  id, name, color, legacyLevel, level: detail.rank ? null : detail.level ?? legacyLevel, ...detail,
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
    item('marsh-bandana', 'Marsh Bandana', null, 0x616946, { bandana: true }),
  ],
  vest: [
    item('no-vest', 'No Vest', 1, null),
    item('canvas-vest', 'Canvas Training Vest', 5, 0x957d54, { binding: 0x57462e, panel: 0x7d684b, rough: .93 }),
    item('marsh-vest', 'Marsh Green Field Vest', 12, 0x566137, { level: 15, binding: 0x323825, panel: 0x454e30, rough: .83 }),
    item('seasoned-vest', 'Seasoned Waxed Vest', 13, 0x69543a, { rank: 'seasoned', binding: 0x392d24, panel: 0x514131, rough: .69 }),
    item('blaze-vest', 'Blaze Orange Field Vest', 20, 0xe47735, { binding: 0x513627, panel: 0x955630, rough: .84 }),
    item('master-vest', 'Master Gun Dog Vest', 30, 0x3f5045, { rank: 'master', binding: 0x29302b, panel: 0x323d36, rough: .68 }),
    item('legend-vest', 'Marsh Legend Vest', 31, 0x3c392d, { rank: 'legend', binding: 0x64593d, panel: 0x302d25, rough: .74 }),
  ],
  coat: [
    item('classic-yellow', 'Classic Yellow Labrador', 1, 0xffffff),
    item('cream', 'Light Cream Labrador', 8, 0xffeed6, { light: .22 }),
    item('golden', 'Golden Labrador', 16, 0xe5b76d),
    item('fox-red', 'Fox Red Labrador', 24, 0xbb8053, { level: 30 }),
    item('chocolate', 'Dark Chocolate Labrador', 35, 0x695449, { level: 60 }),
  ],
}

export const kennelItems = Object.values(kennelCatalog).flat()
export const classicGear = Object.fromEntries(Object.entries(kennelCatalog).map(([category, [first]]) => [category, first.id]))
export const unlocked = (item, standing, inherited) => Boolean(item && (
  inherited.includes(item.id) || (item.rank ? rankIndex(standing.rank.id) >= rankIndex(item.rank)
    : item.level !== null && item.level <= standing.level)))

export function gearRequirement(item) {
  if (item.rank) return 'Earn ' + dogRanks[rankIndex(item.rank)].name
  return item.level === null ? 'Legacy reward' : 'Level ' + item.level
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

export function normalizeKennel(source, standing, priorLevel) {
  const unlockedBefore = new Set(Array.isArray(source?.inherited) ? source.inherited : [])
  const inherited = kennelItems.filter(item => unlockedBefore.has(item.id) ||
    (priorLevel !== undefined && item.legacyLevel > 1 && item.legacyLevel <= priorLevel)).map(item => item.id)
  const equipment = Object.fromEntries(Object.entries(kennelCatalog).map(([category, items]) => {
    const selected = items.find(gear => gear.id === source?.equipment?.[category])
    return [category, unlocked(selected, standing, inherited) ? selected.id : classicGear[category]]
  }))
  return { inherited, equipment }
}

export function newGear(before, after, inherited) {
  return kennelItems.filter(item => !unlocked(item, before, inherited) && unlocked(item, after, inherited))
}
