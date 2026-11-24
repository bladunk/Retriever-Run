import { expeditionRegions, regionAtDistance } from './expedition.js'
import { seededRandom, segmentLength } from './trail.js'
import { signMessages } from './sign-lines.js'
import { signInterval, signOffset } from './sign-placement.js'

export const signSlots = 3
const intervalMeters = signInterval * segmentLength
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
const starts = expeditionRegions.map(region => Math.max(0, Math.ceil((region.marker - signOffset) / intervalMeters)))
const countsAtStart = plans.map((_, territory) => {
  const counts = {}
  for (let earlier = 0; earlier < territory; earlier++) {
    const plan = plans[earlier]
    for (let n = starts[earlier]; n < starts[earlier + 1]; n++) {
      const key = plan[(n - starts[earlier]) % plan.length]
      counts[key] = (counts[key] ?? 0) + 1
    }
  }
  return counts
})
const surfaces = {
  marsh: 'plank', property: 'posted', ducks: 'crossing', geese: 'crossing', labrador: 'oldPaint',
  camp: 'direction', farm: 'farm', warning: 'posted', north: 'north', canada: 'north',
  veteran: 'plank', rookie: 'oldPaint', weather: 'oldPaint', trail: 'direction',
}

export function trailSign(tile, seed) {
  const ordinal = tile / signInterval
  const region = regionAtDistance(ordinal * intervalMeters + signOffset).index
  const plan = plans[region]
  const local = ordinal - starts[region]
  const position = local % plan.length
  const category = plan[position]
  const occurrences = (countsAtStart[region][category] ?? 0)
    + Math.floor(local / plan.length) * plan.filter(group => group === category).length
    + plan.slice(0, position).filter(group => group === category).length
  // A coprime stride visits the entire category before repeating, even when a
  // terrain packet arrives out of order or the route crosses a territory.
  const lines = signMessages[category]
  const salt = seededRandom((seed ^ 0x4c71571) + category.charCodeAt(0) * 8191 + category.length)()
  const index = (occurrences * 7 + Math.floor(salt * lines.length)) % lines.length
  return { line: lines[index], category, style: surfaces[category], region }
}

export function signTextRows(message, measure, limit) {
  const words = message.split(' ')
  let best = [message]
  let cost = measure(message) <= limit ? measure(message) : Infinity
  for (let split = 1; split < words.length; split++) {
    const lines = [words.slice(0, split).join(' '), words.slice(split).join(' ')]
    const lengths = lines.map(measure)
    if (Math.max(...lengths) > limit) continue
    const candidate = Math.max(...lengths) + Math.abs(lengths[0] - lengths[1]) * .22 + 30
    if (candidate < cost) {
      best = lines
      cost = candidate
    }
  }
  return best
}
