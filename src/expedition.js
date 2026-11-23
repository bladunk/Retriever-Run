import { distanceAtTime } from './difficulty.js'

export const territorySeconds = 30
export const transitionSeconds = 3.5

// Ground families share geometry and material budgets. Each territory also
// carries its own bank profile, canopy density, landmarks and wildlife.
const territories = [
  { key: 'gulf', name: 'Gulf Coast Marsh', kind: 'tidal', landmark: 'piling', birds: ['teal', 'mallard'],
    plant: 0, treesPerSide: 3, treeScale: .73, soil: 0x91805e, bank: 0x72804e, grass: 0xa7a367,
    trees: 0x74784c, water: -.89, sky: 0x618ba0, horizon: 0xe6c6a1, sun: 0xffd3a2, fog: .012 },
  { key: 'cypress', name: 'Southern Cypress Swamp', kind: 'swamp', landmark: 'cypress',
    birds: ['mallard', 'teal'], plant: 0, treesPerSide: 7, treeScale: 1.15, soil: 0x827058, bank: 0x536443,
    grass: 0x748855, trees: 0x69784a, water: -1.02, sky: 0x53716e, horizon: 0xb6aa8c, sun: 0xffdaac, fog: .013 },
  { key: 'flyway', name: 'Mississippi Flyway', kind: 'channel', landmark: 'sandbar',
    birds: ['goose', 'mallard'], plant: 1, treesPerSide: 4, treeScale: .96, soil: 0x99816a, bank: 0x857452,
    grass: 0xa18f54, trees: 0x8d7a4a, water: -1.03, sky: 0x5d8ca9, horizon: 0xbfc0a9, sun: 0xffdcb5, fog: .010 },
  { key: 'timber', name: 'Arkansas Flooded Timber', kind: 'swamp', landmark: 'blind',
    birds: ['mallard', 'teal'], plant: 0, treesPerSide: 7, treeScale: 1, soil: 0x8f785e, bank: 0x636d48,
    grass: 0x9c9353, trees: 0x7b733e, water: -.99, sky: 0x557383, horizon: 0xceb192, sun: 0xffd09b, fog: .012 },
  { key: 'farm', name: 'Midwest Farm Country', kind: 'field', landmark: 'farm',
    birds: ['pheasant', 'goose'], plant: 2, treesPerSide: 2, treeScale: 1.13, soil: 0xa78c61, bank: 0x888053,
    grass: 0xbda35a, trees: 0x86744a, water: -.57, sky: 0x648daa, horizon: 0xd9be94, sun: 0xffdfae, fog: .009 },
  { key: 'prairie', name: 'Prairie Potholes', kind: 'pothole', landmark: 'blind',
    birds: ['mallard', 'goose'], plant: 2, treesPerSide: 2, treeScale: .83, soil: 0xad8c62, bank: 0x8a904d,
    grass: 0xb7a466, trees: 0x837349, water: -.74, sky: 0x5b91a5, horizon: 0xd9c39c, sun: 0xffdfab, fog: .0105 },
  { key: 'dakota', name: 'Dakota Wetlands', kind: 'slough', landmark: 'slough',
    birds: ['teal', 'goose'], plant: 0, treesPerSide: 2, treeScale: .88, soil: 0x9c9170, bank: 0x69766b,
    grass: 0x93844f, trees: 0x887655, water: -.91, sky: 0x6f92a0, horizon: 0xb8c7bf, sun: 0xffd3ad, fog: .011 },
  { key: 'border', name: 'Northern Borderlands', kind: 'river', landmark: 'camp',
    birds: ['goose', 'mallard'], plant: 1, treesPerSide: 5, treeScale: .94, conifers: .53, relief: .34, snow: .10,
    soil: 0x89817a, bank: 0x626857, grass: 0x758764, trees: 0x526e60, water: -.93,
    sky: 0x577c92, horizon: 0xaeccc8, sun: 0xffddb7, fog: .012 },
  { key: 'boreal', name: 'Canadian Boreal Forest', kind: 'river', landmark: 'snag',
    birds: ['mallard', 'teal'], plant: 1, treesPerSide: 8, treeScale: 1.09, conifers: .91, relief: .54, snow: .39,
    soil: 0x898980, bank: 0x66786b, grass: 0x728170, trees: 0x45635c, water: -.83,
    sky: 0x647d98, horizon: 0xb0c9cb, sun: 0xffdfc3, fog: .013 },
  { key: 'mountain', name: 'Canadian Mountain Wilderness', kind: 'alpine', landmark: 'cairn',
    birds: ['goose', 'teal'], plant: 2, treesPerSide: 6, treeScale: 1.02, conifers: 1, relief: 1, snow: .97,
    soil: 0x989892, bank: 0xc9d9dd, grass: 0x9da9a0, trees: 0x526c6a, water: -.88,
    sky: 0x527b9a, horizon: 0xb2cfdc, sun: 0xffd7ad, fog: .012 },
]

export const expeditionRegions = territories.map((region, index) => {
  const seconds = index * territorySeconds
  return { snow: 0, relief: 0, conifers: 0, ...region, index, seconds, marker: distanceAtTime(seconds),
    fadeFrom: distanceAtTime(seconds - transitionSeconds), fadeTo: distanceAtTime(seconds + transitionSeconds) }
})

export function regionAt(seconds) {
  const index = Math.floor(Math.max(0, seconds) / territorySeconds)
  return expeditionRegions[Math.min(index, expeditionRegions.length - 1)]
}

export function regionAtDistance(distance) {
  return expeditionRegions.findLast(region => distance >= region.marker) ?? expeditionRegions[0]
}

function blending(from, to, fraction) {
  return { from, to, blend: fraction * fraction * (3 - 2 * fraction) }
}

export function expeditionBlend(distance) {
  const next = expeditionRegions.find(region => region.index && distance >= region.fadeFrom && distance < region.fadeTo)
  if (next) return blending(expeditionRegions[next.index - 1], next, (distance - next.fadeFrom) / (next.fadeTo - next.fadeFrom))
  const region = regionAtDistance(distance)
  return blending(region, region, 0)
}

export function atmosphereBlend(seconds) {
  const region = regionAt(seconds)
  const next = expeditionRegions[region.index + Number(seconds >= region.seconds + transitionSeconds)]
  if (next?.index && Math.abs(seconds - next.seconds) < transitionSeconds) {
    return blending(expeditionRegions[next.index - 1], next, (seconds - next.seconds + transitionSeconds) / (2 * transitionSeconds))
  }
  return blending(region, region, 0)
}

export function blendProperty(zone, key) {
  return zone.from[key] + (zone.to[key] - zone.from[key]) * zone.blend
}

export const northLevel = zone => blendProperty(zone, 'relief')
export const snowLevel = zone => blendProperty(zone, 'snow')

export function migrationSecondsByTerritory(seconds) {
  return expeditionRegions.map((region, index) => Math.max(0,
    Math.min(seconds, expeditionRegions[index + 1]?.seconds ?? Infinity) - region.seconds))
}
