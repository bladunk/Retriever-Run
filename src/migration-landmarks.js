import { BoxGeometry, CylinderGeometry, IcosahedronGeometry } from 'three'
import { segmentLength } from './trail.js'

const plank = new BoxGeometry()
const rock = new IcosahedronGeometry(1, 0)
const pole = new CylinderGeometry(.41, .5, 1, 9)
const tank = new CylinderGeometry(.5, .5, 1, 14)
const steel = 0x656962
const oak = 0x816b55
const trim = 0x9d8e72

const siting = {
  'fish-shack': [8.4, 6, 0], 'swamp-cabin': [-9.7, 9, 1], 'delta-shed': [-11.8, 9, 1],
  blind: [8.3, 7, 1], 'limestone-crossing': [-8.6, 7, 1], farm: [12.8, 9, 0],
  'river-camp': [9.4, 8, 1], windmill: [-8.6, 8, 1], 'pothole-farm': [15.3, 10, 1],
  'grain-elevator': [-12.6, 10, 1], 'marsh-dock': [-8.2, 7, 1],
  'aspen-cabin': [9.1, 9, 1], snag: [-9.9, 9, 1],
  'forestry-cabin': [11.1, 8, 1], cairn: [-8.9, 10, 1],
}

export function dressMigrationLandmark({ add, region, index, earth, waterline, random, branch }) {
  const role = region.landmark
  const [x0, period, lead] = siting[role]
  const ordinal = index - Math.ceil(region.marker / segmentLength)
  if (ordinal < 0 || ordinal % period !== lead) return null
  const x = x0 + (random() - .5) * 1.65
  const z = -16.0 + (random() - .5) * 5.2
  const ground = earth(-z, x)
  const put = (color, px, y, pz, w, h, d, roll = 0, layer = 2) =>
    add(plank, color, px, y, pz, w, h, d, 0, 0, roll, false, layer)

  function pier(px, pz, width, depth, y) {
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      const a = px + side * width * .45
      const b = pz + end * depth * .44
      const floor = earth(-b, a) - .22
      const post = Math.max(.22, y - floor)
      add(pole, 0x584535, a, y - post * .5, b, .27, post, .25, 0, 0, .036, false, 2)
    }
    put(oak, px, y, pz, width, .17, depth)
    for (let k = 0; k < 10; k++) {
      put(k % 2 ? trim : oak, px + width * (k / 10 - .45), y + .084, pz, width * .095, .04, depth)
    }
  }

  function lodge(width, depth, height, paint, roof, code = 'dry') {
    const standing = ['bank', 'raised'].includes(code)
    const lift = code === 'raised' ? 1.36 : standing ? .82 : .38
    const base = Math.max(waterline + lift, ground + .29)
    pier(x, z, width * 1.12, depth * 1.15, base - .14)
    // Dark foundation skirts sit below the main sill on drier banks.
    if (!standing) put(0x5b5445, x, base - .32, z, width * .98, .61, depth * .96, 0, 1)
    put(paint, x, base + height / 2, z, width, height, depth)
    for (let line = 0; line < 8; line++) {
      const y = base + height * (line + .58) / 8
      put(line % 3 ? paint : oak, x, y, z + depth * .506, width, .057, .053)
    }
    const ridge = base + height
    const pitch = role === 'cairn' || role === 'forestry-cabin' ? .55 : .43
    for (const side of [-1, 1]) {
      put(roof, x + side * width * .26, ridge + width * .135, z, width * .61, .115, depth + .46, -side * pitch)
      put(trim, x + side * width * .483, base + height * .5, z + depth * .514, .12, height, .14)
    }
    for (let band = 0; band < 5; band++) {
      const w = width * (1 - band * .186)
      put(paint, x, ridge + width * (.032 + band * .052), z + depth * .493, w, width * .067, .21)
    }
    const door = Math.min(.86, width * .27)
    put(0x42382b, x - .21, base + height * .36, z + depth * .52, door, height * .73, .09)
    put(trim, x - .21, base + height * .745, z + depth * .54, door + .10, .09, .13)
    put(0x344952, x + width * .27, base + height * .63, z + depth * .519, width * .21, height * .24, .08)
    put(trim, x + width * .27, base + height * .492, z + depth * .54, width * .25, .075, .14)
    if (role === 'swamp-cabin' || role === 'fish-shack' || role === 'marsh-dock') {
      pier(x * .74, z + 2.3, 2.0, 1.38, base - .12)
    }
  }

  if (role === 'windmill') {
    const y = ground
    const cap = y + 5.3
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      const foot = x + side * .90
      const back = z + end * .77
      branch(steel, foot, earth(-back, foot), back, x + side * .20, cap, z + end * .20, .073)
      branch(steel, foot, y + .33, back, x - side * .45, y + 2.29, back - end * .24, .037)
      branch(steel, x + side * .57, y + 2.26, back - end * .24, x - side * .22, cap, z + end * .20, .035)
    }
    const axle = z + .45
    const diameter = 1.26
    for (let blade = 0; blade < 12; blade++) {
      const angle = blade * Math.PI / 6
      const sin = Math.sin(angle), cos = Math.cos(angle)
      put(0x80785e, x + sin * diameter * .69, cap + cos * diameter * .69, axle, .23, .68, .064, -angle + .23, 0)
      branch(steel, x, cap, axle, x + sin * diameter, cap + cos * diameter, axle, .032)
    }
    put(steel, x, cap, axle, .29, .25, .31, 0, 0)
    put(0x665f4c, x, cap + .06, z - .72, .13, .52, 1.13, 0, 0)
    put(0x756048, x + 1.35, y + .19, z + 1.48, 1.75, .39, .72, 0, 0)
  } else if (role === 'limestone-crossing') {
    const side = Math.sign(x)
    for (let i = 0; i < 19; i++) {
      const px = x + side * (i % 4) * 1.24
      const pz = z - i * .46
      const y = earth(-pz, px)
      add(rock, i % 3 ? 0x989183 : 0x786e61, px, y + .20, pz, 1.0 + i % 3 * .34, .36 + i % 4 * .23,
        .62 + i % 4 * .27, .07, i * 1.6, 0, false, 1)
    }
    pier(side * 6.6, z + 4.0, 2.3, 2.8, Math.max(waterline + .23, earth(-z - 4, side * 6.6)))
  } else if (role === 'grain-elevator') {
    lodge(3.25, 3.5, 4.7, 0x878173, 0x555b53)
    for (let n = 0; n < 2; n++) {
      const sx = x - 3.0 - n * 2.4
      const sy = earth(-z, sx)
      add(tank, 0x94978e, sx, sy + 1.78, z, 2.13, 3.6, 2.13)
      add(pole, 0x6a706b, sx, sy + 3.87, z, 2.18, .61, 2.18)
      for (let rib = 0; rib < 7; rib++) add(tank, 0x7b8079, sx, sy + .24 + rib * .47, z, 2.15, .039, 2.15)
    }
  } else if (role === 'blind') {
    const y = Math.max(waterline + 1.15, ground + .55)
    pier(x, z, 2.6, 2.2, y - .28)
    put(0x5a5040, x,y + .20,z,2.4,1.10,1.95)
    put(0x544d39, x,y + 1.07,z,2.74,.16,2.23)
    put(0x201f18, x,y + .58,z + 1.01,2.12,.28,.069)
  } else if (role === 'fish-shack') {
    lodge(3.8, 3.1, 1.95, 0x88775c, 0x676c61, 'raised')
    for (let i = 0; i < 5; i++) {
      const px = x + 2.3 + i * .38
      const pz = z - .76 - i * .42
      add(pole, 0x5b5848, px, waterline + .15, pz, .25, 1.32, .25, 0, 0, -.10, false, 2)
    }
  } else {
    const palette = {
      'swamp-cabin': [4.2, 3.15, 2.3, 0x66604c, 0x46544b, 'raised'],
      'delta-shed': [4.35, 3.45, 2.32, 0x8b6d56, 0x73736b],
      'river-camp': [3.48, 2.65, 1.80, 0x7b7b66, 0x555f56, 'bank'],
      farm: [5.0, 4.3, 3.35, 0x817a6a, 0x515853],
      'pothole-farm': [4.12, 3.4, 2.22, 0x876a53, 0x635648],
      'marsh-dock': [3.28, 2.60, 1.66, 0x5b6c62, 0x525d5b, 'bank'],
      'aspen-cabin': [3.64, 2.85, 2.06, 0x8b7357, 0x66594b],
      snag: [3.82, 2.94, 1.89, 0x655640, 0x4c5757],
      'forestry-cabin': [3.48, 2.60, 1.78, 0x6d614d, 0x929c9b],
      cairn: [3.42, 2.87, 1.89, 0x5f554d, 0xaebfc4],
    }
    lodge(...palette[role])
  }
  return { role, distance: index * segmentLength - z, x, ground }
}
