export const expeditionRegions = [
  { key: 'timber', name: 'Southern Flooded Timber', marker: 0, soil: 0x8f785e, bank: 0x636d48,
    grass: 0x9c9353, trees: 0x7b733e, water: -.99, sky: 0x557383, horizon: 0xceb192, sun: 0xffd09b, fog: .012 },
  { key: 'prairie', name: 'Prairie Pothole Country', marker: 240, soil: 0xad8c62, bank: 0xa49052,
    grass: 0xb7a466, trees: 0x85784a, water: -.74, sky: 0x5b91a5, horizon: 0xd9c39c, sun: 0xffdfab, fog: .0105 },
  { key: 'river', name: 'Northern River Wilderness', marker: 540, soil: 0x89817a, bank: 0x626857,
    grass: 0x758764, trees: 0x526e60, water: -.93, sky: 0x577c92, horizon: 0xaeccc8, sun: 0xffddb7, fog: .012 },
  { key: 'snow', name: 'Snowy Northern Wetlands', marker: 900, soil: 0x989892, bank: 0xc9d9dd,
    grass: 0x9da9a0, trees: 0x526c6a, water: -.88, sky: 0x527b9a, horizon: 0xb2cfdc, sun: 0xffd7ad, fog: .012 },
]

export function regionAt(distance) {
  return expeditionRegions.findLast(region => distance >= region.marker) ?? expeditionRegions[0]
}

// Smooth height, color and light across a bank wider than two worker tiles.
export function expeditionBlend(distance) {
  const boundary = expeditionRegions.findIndex((region, index) => index > 0 && Math.abs(distance - region.marker) < 45)
  if (boundary === -1) {
    const region = regionAt(distance)
    return { from: region, to: region, blend: 0 }
  }
  const u = (distance - expeditionRegions[boundary].marker + 45) / 90
  return { from: expeditionRegions[boundary - 1], to: expeditionRegions[boundary], blend: u * u * (3 - 2 * u) }
}

export function blendProperty(zone, key, property = zone.blend) {
  return zone.from[key] + (zone.to[key] - zone.from[key]) * property
}

export function northLevel(zone) {
  const from = zone.from.key === 'river' || zone.from.key === 'snow'
  const to = zone.to.key === 'river' || zone.to.key === 'snow'
  return Number(from) * (1 - zone.blend) + Number(to) * zone.blend
}

export function snowLevel(zone) {
  return Number(zone.from.key === 'snow') * (1 - zone.blend) + Number(zone.to.key === 'snow') * zone.blend
}
