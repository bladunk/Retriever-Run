import { expeditionRegions, regionAtDistance } from './expedition.js'
import { signMessages } from './sign-lines.js'
import { signDistance } from './sign-placement.js'

export const signSlots = 2
const plans = [
  ['marsh', 'rookie', 'labrador', 'marsh', 'ducks', 'trail', 'property', 'camp', 'weather'],
  ['marsh', 'warning', 'ducks', 'marsh', 'property', 'camp', 'labrador', 'weather', 'ducks'],
  ['ducks', 'geese', 'trail', 'marsh', 'ducks', 'camp', 'warning', 'labrador', 'geese'],
  ['warning', 'ducks', 'veteran', 'warning', 'marsh', 'labrador', 'property', 'camp', 'ducks'],
  ['farm', 'property', 'camp', 'farm', 'farm', 'labrador', 'trail', 'weather', 'veteran'],
  ['geese', 'ducks', 'farm', 'weather', 'geese', 'warning', 'camp', 'trail', 'veteran'],
  ['weather', 'geese', 'warning', 'ducks', 'trail', 'weather', 'north', 'property', 'veteran'],
  ['north', 'camp', 'warning', 'veteran', 'weather', 'north', 'canada', 'trail', 'labrador'],
  ['canada', 'north', 'weather', 'veteran', 'canada', 'ducks', 'north', 'warning', 'camp'],
  ['canada', 'north', 'veteran', 'weather', 'canada', 'warning', 'north', 'trail', 'labrador'],
]
let ordinal = 0
const starts = expeditionRegions.map(region => {
  while (signDistance(ordinal) < region.marker) ordinal++
  return ordinal
})
export const shortSignMessages = Object.fromEntries(Object.entries(signMessages).map(([key, lines]) =>
  [key, lines.filter(line => line.split(' ').length <= 7 && line.length <= 31)]))

const surfaces = {
  marsh: 'plank', property: 'posted', ducks: 'crossing', geese: 'crossing', labrador: 'oldPaint',
  camp: 'direction', farm: 'farm', warning: 'posted', north: 'north', canada: 'north',
  veteran: 'plank', rookie: 'oldPaint', weather: 'oldPaint', trail: 'direction',
}

function signRoll(seed) {
  seed = Math.imul(seed ^ (seed >>> 16), 0x21f0aaad)
  seed = Math.imul(seed ^ (seed >>> 15), 0x735a2d97)
  return ((seed ^ (seed >>> 15)) >>> 0) / 4294967296
}

function regionalPhase(region, seed) {
  return Math.floor(signRoll(seed ^ Math.imul(region + 1, 0x53a64ee3)) * plans[region].length)
}

function occurrencesOf(category, plan, phase, length) {
  let matches = Math.floor(length / plan.length) * plan.filter(group => group === category).length
  for (let j = 0; j < length % plan.length; j++) {
    if (plan[(j + phase) % plan.length] === category) matches++
  }
  return matches
}

export function trailSign(anchor, seed, messages = shortSignMessages) {
  const region = regionAtDistance(anchor.distance).index
  const plan = plans[region]
  const local = anchor.ordinal - starts[region]
  const phase = regionalPhase(region, seed)
  const category = plan[(local + phase) % plan.length]
  let occurrences = occurrencesOf(category, plan, phase, local)
  for (let i = 0; i < region; i++) {
    occurrences += occurrencesOf(category, plans[i], regionalPhase(i, seed), starts[i + 1] - starts[i])
  }
  // A coprime stride visits the whole category before repeating. Tile
  // rebuilds, reversals and territory seams need no mutable message history.
  const lines = messages[category]
  const salt = signRoll((seed ^ 0x4c71571) + category.charCodeAt(0) * 8191 + category.length)
  const stride = lines.length % 7 ? 7 : lines.length - 1
  const index = (occurrences * stride + Math.floor(salt * lines.length)) % lines.length
  return { line: lines[index], category, style: surfaces[category], region }
}
