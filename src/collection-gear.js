import { masterHunter } from './master-hunter.js'

export const gearRarity = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Master Hunter']
const [common, uncommon, rare, epic, legendary, master] = gearRarity
// Field palettes pair practical cloth and hardware with earned milestones.
const themes = [
  ['salt-marsh', 'Salt Marsh', 0x867d59, 0x504d38, 0xb9a274, 'gulf-traversal', 4],
  ['cypress', 'Cypress Brake', 0x455744, 0x282e25, 0x7d7353, 'cypress-fieldwork-1', 8],
  ['delta', 'Delta Silt', 0x806445, 0x473d2d, 0xb5a173, 'flyway-footing-1', 14],
  ['greenhead', 'Greenhead Woodland', 0x465b35, 0x293627, 0x8b7550, 'mallard-retrieve-2', 16],
  ['wood-duck', 'Wood Duck Heritage', 0x23483e, 0x4e3036, 0xa7835b, 'watch-wood-duck-2', 21],
  ['rooster', 'Rooster Blaze', 0xd46a29, 0x4d4934, 0xdda056, 'pheasant-retrieve-2', 22],
  ['prairie', 'Prairie Stubble', 0x9b865d, 0x5e5136, 0xba9a5c, 'prairie-traversal', 35],
  ['snow-goose', 'Snow Goose', 0xb5b9ae, 0x3b4244, 0x848b80, 'watch-snow-goose-1', 40],
  ['northwoods', 'Northwoods', 0x3c5150, 0x2a3633, 0x859486, 'manitoba-fieldwork-2', 54],
  ['alpine', 'Alpine Outfitter', 0x596268, 0x2c353b, 0xa4aaa2, 'foothills-traversal', 69],
]
const vests = [
  ['canvas', 'Field Canvas', 'plain', .89], ['water', 'Neoprene', 'seam', .72],
  ['cover', 'Brush Camo', 'brush', .87], ['heritage', 'Waxed Canvas', 'stripe', .65],
]
const collars = [
  ['web', 'Webbing Collar', 'stripe', false], ['buckle', 'Brass Collar', 'plain', true],
  ['trail', 'Trail Collar', 'seam', true],
]
const scarves = [
  ['plain', 'Field Bandana', 'plain'], ['plaid', 'Plaid Bandana', 'plaid'],
  ['border', 'Border Bandana', 'border'], ['brush', 'Brush Bandana', 'brush'], ['stripe', 'Rail Stripe Bandana', 'stripe'],
]

const vest = [], collar = []
for (const [id, name, color, binding, panel, honor, level] of themes) {
  vests.forEach(([fit, label, pattern, rough], i) => vest.push({
    id: id + '-' + fit + '-vest', name: name + ' ' + label, color: i === 1 ? binding : color,
    binding, panel, pattern, rough, honor, level: level + i * 3, rarity: [uncommon, rare, rare, epic][i],
  }))
  collars.forEach(([type, label, pattern, buckle], i) => collar.push({
    id: id + '-' + type + '-collar', name: name + ' ' + label, color: [color, binding, panel][i],
    panel, pattern, buckle, honor, level: Math.max(2, level - 2 + i * 4), rarity: [common, uncommon, rare][i],
  }))
  scarves.forEach(([type, label, pattern], i) => collar.push({
    id: id + '-' + type + '-bandana', name: name + ' ' + label, color: [panel, color, binding, color, panel][i],
    panel: i === 2 ? panel : binding, pattern, bandana: true, honor, level: Math.max(2, level - 3 + 2 * i),
    rarity: [common, uncommon, uncommon, rare, epic][i],
  }))
}
vest.push(
  { id: 'waterfowl-master-vest', name: 'Waterfowl Master Vest', color: 0x525c3d, binding: 0x38392b, panel: 0x9b8d62, pattern: 'brush', honor: 'legend-all-waterfowl', rarity: legendary },
  { id: 'expedition-vest', name: 'Legendary Expedition Vest', color: 0x32433e, binding: 0x1e2e29, panel: 0x7b816c, pattern: 'seam', honor: 'legend-all-species', rarity: legendary },
  { id: masterHunter.vest, name: 'Master Hunter Vest', color: 0x48523d, binding: 0x30352e, panel: 0x586047, rough: .88, breed: 'boyd', rarity: master },
)
collar.push(
  { id: 'migration-collar', name: 'Great Migration Collar', color: 0x554c37, panel: 0x9b8156, buckle: true, pattern: 'stripe', honor: 'legend-whole-course', rarity: legendary },
  { id: 'whitetail-collar', name: 'Whitetail Heritage Leather', color: 0x603e2b, panel: 0x9c7458, buckle: true, honor: 'watch-deer-2', rarity: rare },
  { id: masterHunter.signature, name: 'Boyd’s Signature Collar', color: 0x262c28, buckle: true, breed: 'boyd', rarity: master },
  { id: masterHunter.bandana, name: 'Master Hunter Bandana', color: 0x512c2e, panel: 0x8d6454, bandana: true, pattern: 'border', breed: 'boyd', rarity: master },
)
export const collectionGear = { vest, collar }
