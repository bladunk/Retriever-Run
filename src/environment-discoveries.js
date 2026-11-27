import { seededRandom } from './trail.js'

export const discoveryVersion = 1

export const environmentalDiscoveries = {
  'reedwatch-landing': {
    name: 'Reedwatch Landing', territory: 'manitoba',
    note: 'A weathered marsh shelter and a loon carved into the landing rail.',
  },
  'foothills-sunbreak': {
    name: 'Sunbreak on the Eastern Slopes', territory: 'foothills', effect: 'sunbreak',
    note: 'Low sun caught the river and exposed rock below a breaking cloud bank.',
  },
  'divide-aurora': {
    name: 'Aurora over the Divide', territory: 'mountain', effect: 'aurora',
    note: 'Green curtains crossed the snowy skyline after the last light faded.',
  },
}

export function planDiscoveries(seed) {
  // A route seed can be shared without sharing the course generator's state.
  const random = seededRandom((Math.imul(seed >>> 0, 0x71998af1) ^ 0x5d4c2f67 ^ discoveryVersion) >>> 0)
  const sunbreak = random()
  const aurora = random()
  const shift = Math.floor(random()*3)
  return [
    ...(sunbreak < .23 ? [{ id:'foothills-sunbreak', effect:'sunbreak', start:395+shift, end:414+shift }] : []),
    ...(aurora < .18 ? [{ id:'divide-aurora', effect:'aurora', start:427+shift, end:452+shift }] : []),
  ]
}

export function skyDiscovery(schedule, seconds) {
  return schedule.find(event => seconds >= event.start && seconds < event.end)
}

function ease(value) {
  const t = Math.min(1, Math.max(0,value))
  return t*t*(3-2*t)
}

export function discoveryStrength(event, seconds) {
  if (!event) return 0
  return ease((seconds-event.start)/5) * ease((event.end-seconds)/5)
}

export function normalizeDiscoveries(raw) {
  const entries = {}
  if (raw?.version === discoveryVersion) {
    for (const id of Object.keys(environmentalDiscoveries)) {
      const first = raw.entries?.[id]
      if (typeof first === 'string' && Number.isFinite(Date.parse(first))) entries[id] = new Date(first).toISOString()
    }
  }
  return { version:discoveryVersion, entries }
}

export function recordDiscoveries(progress, observed = [], date) {
  for (const id of observed) {
    if (Object.hasOwn(environmentalDiscoveries,id) && !Object.hasOwn(progress.entries,id)) progress.entries[id] = date
  }
}
