// Gain, center/cutoff frequency, length, filter, and optional texture detail.
export const pawSounds = Object.freeze({
  dirt:   [.034, 420, .083, 'lowpass', 990, .006],
  gravel: [.039, 845, .102, 'bandpass', 1910, .020],
  grass:  [.027, 678, .095, 'lowpass', 1410, .011],
  mud:    [.046, 290, .133, 'lowpass', 722, .010],
  splash: [.039, 980, .166, 'bandpass', 1540, .026],
  sand:   [.028, 584, .104, 'lowpass', 1240, .012],
  snow:   [.031, 1180,.113, 'bandpass', 1650, .010],
  frost:  [.033, 1160,.078, 'bandpass', 2210, .014],
  wood:   [.034, 590, .091, 'lowpass', 920, .005],
})

const surfaces = Object.freeze({ tidal:'mud', swamp:'mud', levee:'dirt', hardwood:'mud',
    limestone:'gravel', field:'gravel', braids:'gravel', dunes:'sand', pothole:'grass',
    slough:'grass', lacustrine:'mud', parkland:'grass', boreal:'dirt',
    foothills:'gravel', alpine:'gravel' })

export function pawSurface(region, wet = 0, frost = 0, splash = false) {
  if (splash) return 'splash'
  if (Math.max(region.snow, frost) > .66) return 'snow'
  if (frost > .18) return 'frost'
  if (wet > .64) return 'mud'

  return surfaces[region.kind] ?? 'dirt'
}
