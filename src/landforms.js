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
      const creek = 9.8 + 3.7 * Math.sin(distance * .026 + side) + 1.25 * Math.sin(distance * .089 - side)
      const backwater = 28 + 6.5 * Math.sin(distance * .036 + side * 1.51)
      const flat = -.32 + ripple * .81 + .19 * Math.sin(x * .36 + distance * .052)
      const fingers = dome((edge - 19 - 4.1 * bend) / 6.6) * (.34 + .26 * Math.sin(distance * .033 - side))
      return [flat + fingers - .96 * dome((edge - creek) / 3.5) - .68 * dome((edge - backwater) / 5.5), width * .84]
    }
    case 'swamp': {
      const hummock = dome((edge - 12 - bend * 5) / 3.6) * (1 + .18 * bend)
      const bay = dome((edge - 24 - bend * 7.1) / 8.5)
      return [low + hummock * .82 - bay * .19 + outer * .76 + .17 * Math.sin(x * .48 + distance * .205), width * .78]
    }
    case 'levee': {
      const levee = 1.33 * dome((edge - 6.9 - bend * 1.1) / 2.12)
      const drainage = .83 * dome((edge - 13.3 - bend * 2) / 2.9)
      const contour = edge + 2.0 * Math.sin(distance * .019 + side) + .94 * Math.sin(distance * .079)
      const bunds = .39 * Math.max(0, Math.cos(contour * .39)) ** 5
      const dry = .25 + .39 * Math.sin(distance * .028 + side)
      return [-.57 + dry + levee - drainage + bunds + ripple * .44 + outer * .50, width * 1.18]
    }
    case 'hardwood': {
      const roots = .25 * Math.sin(edge * .38 + bend) * Math.cos(distance * .048 - side)
      const bank = .73 * dome((edge - 15 - 4.3 * bend) / 6.2)
      return [low + roots + bank + outer * .39 + .11, width * 1.02]
    }
    case 'limestone': {
      const inside = .5 + .5 * Math.sin(distance * .039 + (x < 0 ? 0 : Math.PI))
      const run = 9.4 + 4.2 * inside + 1.3 * bend
      const bendWater = .73 * dome((edge - run) / (3.7 + 1.14 * inside))
      const shelf = .83 * dome((edge - 18 + bend * 2.7) / 6)
      const ridge = saturate((edge - 17 - inside * 6) / 33) ** .86
      const spans = 7.6 + 4.1 * Math.cos(distance * .057 + side) + 2.2 * bend
      return [-.64 + ripple * .64 - bendWater + shelf + ridge * spans, width * (1.07 + inside * .36)]
    }
    case 'field': {
      const wide = saturate((edge-8)/23)
      const shoulder = .42 + 1.3*wide + wide*(1.14*Math.sin(distance*.021+x*.087) + .70*bend)
      const ditch = 1.19*dome((edge-6.7-bend*1.17)/1.41)
      const farmPond = 2.33*dome((edge - 27 - 4*bend)/7.1)*dome(Math.sin(distance*.014+side)*1.85)
      return [shoulder - ditch - farmPond + .34*outer, width * 1.26]
    }
    case 'braids': {
      const bendRun = Math.sin(distance*.018+side)
      const channel = 11.3 + 4.6*bendRun + 1.61*Math.sin(distance*.048-side)
      const branch = 26.4 + 6.8*Math.sin(distance*.014+side*.52)
      const banks = .86*saturate((edge-32)/33) + .52*dome((edge-5.5)/2.5)
      const mainWidth = 4.4 + 1.6*Math.sin(distance*.015+side)
      const braid = .69*dome((edge-channel)/mainWidth) + .58*dome((edge-branch)/6.4)
      const midbar = .36*dome((edge-(channel+branch)*.5)/5.6)*(.65+.35*Math.sin(distance*.063+side))
      const slip = .41*dome((edge-channel-1.37)/2.37)*dome(1.48*Math.sin(distance*.024+side))
      const bar = midbar + slip
      return [-.42 + banks - braid + bar + ripple*.48, width * .91]
    }
    case 'dunes': {
      const crest = .5+.5*Math.sin(edge*.107+side+distance*.018+.53*Math.sin(distance*.037))
      const farCrest = .5+.5*Math.cos(x*.059-distance*.013+1.32*bend)
      const grassRidge = 7.8*crest**1.65*saturate((edge-7)/21) + 7.4*outer*farCrest
      const wetMeadow = 1.52*dome((edge-12.2+5.5*bend)/5.7) * (.65+.35*Math.sin(distance*.034+side))
      return [.27 + grassRidge + outer*1.2 - wetMeadow + ripple*.45, width * 1.86]
    }
    case 'pothole': {
      const nearer = dome((edge-12.1-2.8*bend)/5.9)*dome(1.26*Math.sin(distance*.028+side))
      const farther = dome((edge-32-6.1*Math.sin(distance*.019+side))/9.9)*dome(1.39*Math.sin(distance*.021-side))
      const prairie = .37+.52*bend + outer*(2.42+.86*Math.sin(x*.106-distance*.024))
      return [prairie+ripple-2.05*nearer-2.48*farther, width * 1.31]
    }
    case 'slough': {
      const ribbon = 15.5+5.8*Math.sin(distance*.014+side)
      const open = dome((edge-ribbon)/10.2)
      const spit = .56*dome((edge-18.9-5.1*bend)/3.3)*dome(Math.sin(distance*.043)*1.83)
      return [.04 + ripple*.65 - 1.26*open + spit + outer*(2.40+.89*bend), width * 1.34]
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
