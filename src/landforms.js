const saturate = value => Math.min(1, Math.max(0, value))
const dome = value => Math.exp(-value * value)

export function shoreHeight(region, distance, x) {
  const edge = Math.abs(x)
  const side = x < 0 ? 1.2 : 4.7
  const ripple = .10 * Math.sin(distance * .29 + x * .53) + .08 * Math.sin(distance * .11 - x * .51)
  const low = region.water + ripple
  const width = 1.94 + .68 * Math.sin(distance * .061 + side)
  const reach = edge - 5
  const bend = Math.sin(distance * .059 + side + x * .027)
  const outer = saturate((edge - 14) / 45)
  switch (region.kind) {
    case 'tidal': {
      const channels = Math.sin(edge * .65 + 1.55 * Math.sin(distance * .069 + side))
      const marsh = .32 * Math.sin(edge * .193 - distance * .031) + .21 * Math.cos(distance * .110 + side)
      return [low + channels * .31 + marsh * .62 + .42, width * .94]
    }
    case 'swamp': {
      const hummock = dome((edge - 12 - bend * 5) / 3.6) * (1 + .18 * bend)
      return [low + hummock * .70 + outer * .65 + .08 * Math.sin(x * .48 + distance * .205), width * .78]
    }
    case 'levee': {
      const top = 1.12 * dome((edge - 8 - bend * 1.9) / 2.5)
      const bar = .71 * dome((edge - 27 + 6 * bend) / (5.8 + .8 * bend))
      return [low + top + bar + outer * 1.24, width * 1.5]
    }
    case 'hardwood': {
      const roots = .24 * Math.sin(edge * .38 + bend) * Math.cos(distance * .048 - side)
      const bank = .62 * dome((edge - 17 - 3.7 * bend) / 6.7)
      return [low + roots + bank + outer * .24 + .19, width * 1.04]
    }
    case 'limestone': {
      const slope = 3.1 * saturate((edge - 11) / 15) * (1.12 + .43 * bend)
      const shelf = Math.floor(slope * 2.2) / 2.2
      return [low + slope * .47 + shelf * .53 + outer * (2.4 + 1.40 * bend), width * 1.15]
    }
    case 'field': {
      const drainage = .66 * dome((edge - 6.2 - bend * .45) / 1.18)
      return [.19 + .15 * bend + .052 * reach - drainage - .36 * dome((edge - 16) / 4), width * 1.12]
    }
    case 'braids': {
      const meander = 4.2 * Math.sin(distance * .044 + side)
      const channel = Math.sin((edge + meander) * .39 + .42 * Math.sin(distance * .076))
      const bar = .63 * dome((edge - 28 + 1.3 * meander) / 8.6)
      return [low + .43 + Math.sign(channel) * Math.abs(channel) ** 1.4 * .50 + bar + outer * .11, width * .83]
    }
    case 'dunes': {
      const dune = Math.sin(edge * .176 + side + distance * .034) + .63 * Math.cos(edge * .29 - distance * .027)
      const grassRidge = 1.78 * Math.max(-.46, dune) * saturate(reach / 12)
      const meadow = 1.40 * dome((edge - 13 + bend * 6) / 8) * Math.max(0, bend + .23)
      return [.24 + grassRidge + outer * (.94 + .94 * Math.sin(distance * .019 + side)) - meadow, width * 1.65]
    }
    case 'pothole': {
      const basins = Math.cos(distance * .096 + side) * Math.sin(edge * .220 - distance * .037)
      const prairie = .51 + .64 * Math.sin(edge * .123 + distance * .041 + side) + outer * 1.22
      return [prairie + ripple - Math.max(0, basins) ** 1.25 * 1.54, width * 1.23]
    }
    case 'slough': {
      const glacial = .48 * Math.sin(edge * .178 + distance * .036 + side)
      return [low + .24 + glacial + outer * (1.82 + bend * .63), width * 1.2]
    }
    case 'lacustrine':
      return [low + .53 * dome((edge - 12 - bend * 3) / 3.8) + .27 * Math.sin(edge * .20 + distance * .04) + outer * .52, width]
    case 'parkland': {
      const mosaic = .97 * Math.sin(edge * .145 + side + distance * .068) * Math.cos(distance * .039)
      return [.16 + mosaic + ripple + outer * 1.3 - .86 * dome((edge - 19 - bend * 6) / 6.8), width * 1.2]
    }
    case 'boreal':
      return [low + outer * (2.75 + bend) + .56 * Math.sin(edge * .39 - distance * .069) + .34, width * 1.11]
    case 'foothills': {
      const slope = outer ** .74 * (10.4 + 4.6 * bend + 1.2 * Math.sin(distance * .12))
      return [low + slope + .58 * Math.sin(edge * .39 - distance * .069) + .41, width]
    }
    default: {
      const cliff = outer ** .78 * (7.0 + 5.9 * bend + 2.2 * Math.cos(distance * .079 + side))
      return [low + cliff + .58 * Math.sin(edge * .34 + distance * .061) + .19, width]
    }
  }
}

export function vegetationPocket(kind, distance, x) {
  const side = Math.sign(x)
  const seed = side < 0 ? .73 : 3.6
  const patch = .55 * Math.sin(distance * .085 + x * .021 + seed) + .38 * Math.cos(distance * .047 - x * .27)
  const grove = ['swamp', 'hardwood', 'parkland', 'boreal', 'foothills', 'alpine'].includes(kind)
  return grove ? patch + .20 : patch
}
