import { landscapeProfiles } from './migration-landscapes.js'
import { distanceAtTime } from './difficulty.js'

export const territorySeconds = 30
export const transitionSeconds = 3.5
export const migrationDuration = landscapeProfiles.length * territorySeconds

export const expeditionRegions = landscapeProfiles.map((region, index) => {
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

export const northLevel = zone => blendProperty(zone, 'ridge')
export const snowLevel = zone => blendProperty(zone, 'snow')

export function migrationSecondsByTerritory(seconds) {
  return expeditionRegions.map((region, index) => Math.max(0,
    Math.min(seconds, expeditionRegions[index + 1]?.seconds ?? Infinity) - region.seconds))
}
