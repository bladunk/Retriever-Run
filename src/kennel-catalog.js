const item = (id, name, level, color, detail) => ({ id, name, level, color, ...detail })

export const kennelCatalog = {
  collar: [
    item('classic-leather', 'Classic Leather Collar', 1, 0x594333),
    item('forest-collar', 'Forest Green Collar', 3, 0x435639),
    item('junior-collar', 'Junior Field Collar', 6, 0x836346, { buckle: true }),
    item('blaze-collar', 'Blaze Orange Collar', 7, 0xdd792d),
    item('brass-collar', 'Brass Buckle Collar', 15, 0x564335, { buckle: true }),
    item('master-buckle', 'Master’s Leather Collar', 21, 0x3b2821, { buckle: true }),
    item('master-collar', 'Master Retriever Collar', 25, 0x343231, { buckle: true }),
    item('marsh-bandana', 'Marsh Bandana', null, 0x616946, { bandana: true }),
  ],
  vest: [
    item('no-vest', 'No Vest', 1, null),
    item('canvas-vest', 'Canvas Training Vest', 5, 0x8b7350),
    item('marsh-vest', 'Marsh Green Field Vest', 12, 0x4e5738),
    item('seasoned-vest', 'Seasoned Waxed Vest', 13, 0x534436),
    item('blaze-vest', 'Blaze Orange Field Vest', 20, 0xc76a2f),
    item('master-vest', 'Master Gun Dog Vest', 30, 0x394039),
    item('legend-vest', 'Marsh Legend Vest', 31, 0x33342a),
  ],
  coat: [
    item('classic-yellow', 'Classic Yellow Labrador', 1, 0xffffff),
    item('cream', 'Light Cream Labrador', 8, 0xffeed6, { light: .22 }),
    item('golden', 'Golden Labrador', 16, 0xe5b76d),
    item('fox-red', 'Fox Red Labrador', 24, 0xbb8053),
    item('chocolate', 'Dark Chocolate Labrador', 35, 0x695449),
  ],
}

export const kennelItems = Object.values(kennelCatalog).flat()
export const classicGear = Object.fromEntries(Object.entries(kennelCatalog).map(([category, [first]]) => [category, first.id]))
export const unlocked = (item, level, inherited) => Boolean(item && (item.level !== null && item.level <= level || inherited.includes(item.id)))

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

export function normalizeKennel(raw, level, legacy) {
  const source = legacy ?? raw
  const inherited = ['blaze-collar', 'marsh-bandana', 'fox-red'].filter(id =>
    Array.isArray(source?.inherited) && source.inherited.includes(id))
  const equipment = Object.fromEntries(Object.entries(kennelCatalog).map(([category, items]) => {
    const selected = items.find(gear => gear.id === source?.equipment?.[category])
    return [category, unlocked(selected, level, inherited) ? selected.id : classicGear[category]]
  }))
  return { inherited, equipment }
}

export function newGear(before, after, inherited) {
  return kennelItems.filter(item => !unlocked(item, before, inherited) && unlocked(item, after, inherited))
}
