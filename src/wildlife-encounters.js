import { fieldSpecies, encounterTiers, habitatEncounters } from './wildlife-catalog.js'
import { seededRandom, segmentLength } from './trail.js'

const groundFamilies = new Set(['deer','moose','alligator','pheasant'])
const flightFamilies = new Set(['raptor','crane','goose'])
const habitatFor = animal => groundFamilies.has(animal.family) ? animal.family === 'moose' || animal.family === 'alligator' ? 'bank' : 'cover'
  : flightFamilies.has(animal.family) ? 'open' : 'water'

export function encounterRarity(draw) {
  return draw < .65 ? 'common' : draw < .89 ? 'uncommon' : draw < .98 ? 'rare' : 'exceptional'
}

export function planEncounter(packet, seed) {
  const { index, territory, anchors = [] } = packet
  const tables = habitatEncounters[territory]
  if (index < 0 || !tables || !anchors.length || index % 4 !== 0) return null
  let hash = Math.imul(index + 77, 0x215131bd) ^ seed ^ 0x639ca511
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d)
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b)
  const roll = seededRandom(hash ^ (hash >>> 16))
  const rarity = index === 0 ? 'common' : encounterRarity(roll())
  const group = tables[encounterTiers.indexOf(rarity)]
  const start = index === 0 && territory === 'gulf' ? 0 : Math.floor(roll() * group.length)
  for (let offset = 0; offset < group.length; offset++) {
    const animal = fieldSpecies[group[(start + offset) % group.length]]
    const preferred = habitatFor(animal)
    let candidates = anchors.filter(anchor => anchor.kind === preferred)
    if (!candidates.length && preferred === 'water') candidates = anchors.filter(anchor => anchor.kind === 'flyover')
    if (!candidates.length) continue
    // Prefer near-bank habitat so a normal portrait camera has time to see
    // the leader before its trajectory takes it out of the frame.
    const closeRange = preferred === 'cover' ? 7.1 : 8.6
    const near = candidates.filter(anchor => Math.abs(anchor.lateral) < closeRange)
    if (near.length) candidates = near
    const anchor = candidates[Math.floor(roll() * candidates.length)]
    const count = animal.family === 'crane' ? 9 : animal.family === 'goose' ? 5 :
      ['duck','teal','diver','crest','crest-diver','spoon','pintail','merganser'].includes(animal.family) ? 3 : 1
    return { id: territory + ':' + index + ':' + animal.id, species: animal.id, rarity, territory,
      seed: Math.floor(roll() * 65536), count, ...anchor }
  }
  return null
}

export function encounterVisible(ahead, projectedX, projectedY, projectedDepth, rendered) {
  return rendered && ahead >= 5 && ahead <= 42 && Math.abs(projectedX) <= .88 &&
    Math.abs(projectedY) <= .88 && Math.abs(projectedDepth) <= 1
}

export const encounterWindow = segmentLength * 4
