import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, IcosahedronGeometry } from 'three'
import { segmentLength } from './trail.js'
import { gulfGeometry } from './gulf-models.js'

const plank = new BoxGeometry()
const gable = new BufferGeometry()
gable.setAttribute('position', new Float32BufferAttribute([
  -.5,0,.5, .5,0,.5, 0,1,.5, .5,0,-.5, -.5,0,-.5, 0,1,-.5,
], 3))
gable.setAttribute('uv', new Float32BufferAttribute([0,0, 2,0, 1,1, 0,0, 2,0, 1,1], 2))
gable.computeVertexNormals()
const hewnLog = new CylinderGeometry(.47,.5,1,8)

const rock = new IcosahedronGeometry(1, 0)
const pole = new CylinderGeometry(.41, .5, 1, 9)
const tank = new CylinderGeometry(.5, .5, 1, 14)
const fillPad = new CylinderGeometry(.43, .56, 1, 12)
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
  const openingCamp = role === 'fish-shack' && ordinal === 3
  if (ordinal < 0 || ordinal % period !== lead && !openingCamp) return null
  const x = (openingCamp ? 6.78 : x0) + (random() - .5) * 1.65
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
    if (y - earth(-pz, px) > .78) {
      for (const side of [-1, 1]) {
        const h = Math.max(.32, y - earth(-pz + depth * .37, px + side * width * .41))
        branch(0x584637, px + side * width * .41, y - h * .78, pz - depth * .38,
          px + side * width * .41, y - .13, pz + depth * .39, .16)
      }
    }
    put(oak, px, y, pz, width, .17, depth)
    for (let k = 0; k < 10; k++) {
      put(k % 2 ? trim : oak, px + width * (k / 10 - .45), y + .084, pz, width * .095, .04, depth)
    }
  }

  function lodge(width, depth, height, paint, roof, code = 'dry') {
    const standing = code === 'bank' || code === 'raised'
    const logs = ['snag', 'forestry-cabin', 'cairn', 'aspen-cabin'].includes(role)
    const barn = ['farm', 'pothole-farm', 'grain-elevator'].includes(role)
    const gallery = role === 'swamp-cabin' || role === 'river-camp'
    const lift = code === 'raised' ? 1.36 : standing ? .82 : .38
    const base = Math.max(waterline + lift, ground + .29)
    pier(x, z, width * 1.12, depth * 1.15, base - .14)
    if (!standing) {
      const plinth = Math.max(.59, base - ground + .18)
      put(0x746b59, x, base - plinth * .5, z, width * .98, plinth, depth * .96, 0, 6)
    }
    put(paint, x, base + height / 2, z, width, height, depth)
    if (logs) {
      for (let row = 0; row < 9; row++) {
        const y = base + height * (row + .5) / 9
        for (const side of [-1, 1]) {
          const change = height / 8.4
          add(hewnLog, row % 4 ? paint : 0x82705c, x, y, z + side * depth * .494,
            change, width + .39 + row % 2 * .22, change, 0, 0, Math.PI / 2, false, 4)
          add(hewnLog, paint, x + side * width * .494, y + .05, z,
            change, depth + .39 + (row + 1) % 2 * .22, change, Math.PI / 2, 0, 0, false, 4)
        }
      }
    } else {
      const battens = barn ? 16 : 10
      for (const side of [-1, 1]) {
        for (let line = 0; line < battens; line++) {
          const xx = x + width * ((line + .5) / battens - .5)
          put(line % 3 !== 1 ? paint : trim, xx, base + height * .5, z + side * depth * .505, .047, height, .045)
        }
        for (let line = 0; line < 9; line++) {
          const long = z + depth * ((line + .5) / 9 - .5)
          put(line % 3 ? paint : oak, x + side * width * .507, base + height * .5, long, .058, height, .044)
        }
      }
    }
    const spring = base + height
    const rise = width * (role === 'grain-elevator' ? .21 : role === 'delta-shed' || role === 'pothole-farm' ? .18 : logs ? .38 : barn ? .31 : .228)
    const half = width * .54
    const pitch = Math.atan2(rise, half)
    const run = Math.hypot(half, rise)
    add(gable, paint, x, spring - .015, z, width, rise + .03, depth, 0, 0, 0, false, 2)
    for (const side of [-1, 1]) {
      put(roof, x + side * half * .49, spring + rise * .5, z, run + .24, .115, depth + .74, -side * pitch, 5)
      for (const end of [-1, 1]) {
        put(trim, x + side * half * .49, spring + rise * .5, z + end * (depth * .5 + .36),
          run + .28, .13, .10, -side * pitch, 2)
        put(trim, x + side * width * .483, base + height * .5, z + end * depth * .516, .12, height, .14)
      }
      for (let seam = 0; seam < 8; seam++) {
        const back = z + (depth + .51) * ((seam + .5) / 8 - .5)
        put(roof, x + side * half * .49, spring + rise * .5 + .074, back, run + .19, .036, .045, -side * pitch, 5)
      }
    }
    put(roof, x, spring + rise + .063, z, .26, .09, depth + .76, 0, 5)
    const face = z + depth * .5
    const door = barn ? width * .46 : Math.min(.86, width * .27)
    const doorX = x - (barn ? 0 : width * .17)
    const doorY = base + height * .37
    put(trim, doorX, doorY + .04, face + .057, door + .18, height * .80, .13)
    put(0x47372a, doorX, doorY, face + .125, door, height * .74, .09)
    put(0x574637, doorX, doorY, face + .181, .043, height * .74, .045)
    if (barn || role === 'delta-shed') {
      put(0x9b886e, doorX, doorY, face + .189, Math.hypot(door, height * .67), .085, .07,
        Math.atan2(height * .65, door))
    } else {
      const paneX = x + width * .26, paneY = base + height * .63
      put(trim, paneX, paneY, face + .12, width * .26, height * .32, .12)
      put(0x34424b, paneX, paneY, face + .187, width * .21, height * .25, .08)
      put(0x988d75, paneX, paneY, face + .24, .044, height * .25, .036)
      put(0x988d75, paneX, paneY, face + .24, width * .21, .046, .036)
      put(0x685748, paneX, paneY - height * .155, face + .24, width * .31, .075, .20)
    }
    if (gallery || role === 'marsh-dock') {
      const porchWidth = gallery ? width * .98 : width * .64
      const porchZ = face + .78
      pier(x, porchZ, porchWidth, 1.57, base - .10)
      for (const side of [-1, 1]) {
        const px = x + side * porchWidth * .44
        put(0x74644e, px, base + .52, porchZ + .63, .13, 1.15, .13)
        put(0x89745a, px, base + .91, porchZ + .14, .115, .11, 1.17)
        if (gallery) put(0x645742, px, base + height * .50, porchZ + .51, .14, height + .16, .14)
      }
      if (gallery) put(roof, x, spring - .06, porchZ, porchWidth + .27, .11, 1.88, 0, 5)
      for (let step = 0; step < 5; step++) {
        const bz = porchZ + .72 + step * .28
        const floor = earth(-bz, doorX)
        const y = base - .18 - step * .15
        if (y > floor) put(oak, doorX, y, bz, .91, .13, .34)
      }
    }
    if (logs || role === 'swamp-cabin') {
      const flue = Math.max(.67, rise * .85)
      put(0x807469, x + width * .28, spring + rise * .91, z - depth * .22, .38, flue, .41, 0, logs ? 6 : 5)
      put(0x534d43, x + width * .28, spring + rise * .91 + flue * .53, z - depth * .22, .48, .11, .52, 0, 5)
    }
  }

  if (role === 'fish-shack') {
    const deck = Math.max(waterline + .31, ground + .08)
    for (const name of ['CampWood', 'CampRoof', 'CampRecess']) {
      const geometry = gulfGeometry(name)
      add(geometry, null, x, deck, z, 1, 1, 1, 0, -.29, 0, false, geometry.userData.surface)
    }
    if (openingCamp) {
      const jetty = z + 3.35
      pier(x + .46, jetty, 1.46, 2.94, Math.max(waterline+.36,earth(-jetty,x+.46)+.13))
    }
  } else if (role === 'windmill') {
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
        .62 + i % 4 * .27, .07, i * 1.6, 0, false, 6)
    }
    pier(side * 6.6, z + 4.0, 2.3, 2.8, Math.max(waterline + .23, earth(-z - 4, side * 6.6)))
  } else if (role === 'grain-elevator') {
    const pad = Math.max(waterline + .14, ground)
    add(fillPad, 0x777566, x - 2.2, pad - .48, z, 13.0, .96, 6.8, 0, 0, 0, false, 6)
    lodge(4.50, 4.05, 3.2, 0x878173, 0x555b53, 'grain')
    for (let n = 0; n < 2; n++) {
      const sx = x - 3.0 - n * 2.4
      const sy = Math.max(pad, earth(-z, sx))
      add(tank, 0x94978e, sx, sy + 1.78, z, 2.13, 3.6, 2.13, 0, 0, 0, false, 5)
      add(pole, 0x6a706b, sx, sy + 3.87, z, 2.18, .61, 2.18)
      for (let rib = 0; rib < 7; rib++) add(tank, 0x7b8079, sx, sy + .24 + rib * .47, z, 2.15, .039, 2.15)
    }
  } else if (role === 'blind') {
    const y = Math.max(waterline + 1.15, ground + .55)
    pier(x, z, 2.6, 2.2, y - .28)
    put(0x5a5040, x,y + .20,z,2.4,1.10,1.95)
    put(0x544d39, x,y + 1.07,z,2.74,.16,2.23)
    put(0x201f18, x,y + .58,z + 1.01,2.12,.28,.069)
  } else if (role === 'swamp-cabin') {
    lodge(4.2, 3.35, 2.22, 0x82745c, 0x475449, 'raised')
    const jetty = z + 3.35
    const bank = x + 2.45
    pier(bank, jetty, 1.5, 3.2, Math.max(waterline + .33, earth(-jetty, bank) + .16))
  } else {
    const palette = {
      'delta-shed': [5.18, 3.46, 1.94, 0x8b6d56, 0x73736b],
      'river-camp': [3.48, 2.65, 1.80, 0x7b7b66, 0x555f56, 'bank'],
      farm: [5.0, 4.3, 3.35, 0x817a6a, 0x515853],
      'pothole-farm': [4.86, 3.56, 1.97, 0x876a53, 0x635648],
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
