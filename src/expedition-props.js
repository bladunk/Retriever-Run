import * as T from 'three'

const board = new T.BoxGeometry()
const round = new T.SphereGeometry(1, 7, 4)
const roof = new T.CylinderGeometry(1, 1, 1, 3, 1)
const silo = new T.CylinderGeometry(.98, .98, 1, 9)
roof.rotateX(Math.PI / 2)
const gable = new T.BufferGeometry()
gable.setAttribute('position', new T.Float32BufferAttribute([
  -.5, 0, .5, .5, 0, .5, 0, 1, .5, -.5, 0, -.5, .5, 0, -.5, 0, 1, -.5,
], 3))
gable.setAttribute('uv', new T.Float32BufferAttribute([0, 0, 2, 0, 1, 1, 0, 0, 2, 0, 1, 1], 2))
gable.setIndex([0, 1, 2, 3, 5, 4])
gable.computeVertexNormals()
const canoe = boatHull(false)
const jonBoat = boatHull(true)

function boatHull(flatBow) {
  const vertices = [], uv = [], indices = []
  const ring = [[-1, .13], [-.88, -.12], [-.45, -.33], [.45, -.33], [.88, -.12], [1, .13]]
  const stations = [-1, -.83, -.45, 0, .53, .84, 1]
  for (const inside of [false, true]) {
    const offset = vertices.length / 3
    for (const z of stations) {
      const taper = flatBow ? 1 - .26 * Math.max(0, z) ** 4 : Math.max(.035, (1 - Math.abs(z)) ** .40)
      for (const [x, y] of ring) {
        vertices.push(x * taper * (inside ? .94 : 1),
          y * (.72 + taper * .28) + (flatBow ? .08 * Math.max(0, z) ** 2 : .21 * z * z) + (inside ? .026 : 0), z)
        uv.push(.5 + x * .5, z + .5)
      }
    }
    for (let r = 0; r < stations.length - 1; r++) {
      for (let u = 0; u < ring.length - 1; u++) {
        const a = offset + r * ring.length + u, b = a + ring.length
        if (inside) indices.push(a, b, a + 1, a + 1, b, b + 1)
        else indices.push(a + 1, b, a, b + 1, b, a + 1)
      }
    }
  }
  const shape = new T.BufferGeometry()
  shape.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
  shape.setAttribute('uv', new T.Float32BufferAttribute(uv, 2))
  shape.setIndex(indices)
  shape.computeVertexNormals()
  return shape
}

export function dressNorthernBank({ add, region, index, earth, waterline, random }) {
  const put = (color, x, y, z, w, h, d, yaw = 0) => add(board, color, x, y, z, w, h, d, 0, yaw, 0, false, 2)
  let chimney = null
  const feature = region.landmark

  if (feature === 'farm' && index % 4 === 2) {
    const x = -12.6, z = -19.4, y = earth(-z, x)
    const red = 0x933e2d, cream = 0xc8b79a
    put(0x73705d, x, y - .025, z, 5.9, .55, 4.18)
    put(red, x, y + 1.61, z, 5.7, 3.05, 4)
    add(gable, red, x, y + 3.13, z, 5.71, 1.37, 4, 0, 0, 0, false, 2)
    for (const side of [-1, 1]) {
      add(board, 0x504a40, x + side * 1.50, y + 3.83, z, 3.51, .14, 4.6, 0, 0, -side * .44, false, 2)
      put(cream, x + side * 2.78, y + 1.67, z + 2.045, .14, 2.88, .12)
      put(cream, x + side * .99, y + 1.16, z + 2.075, .086, 2.10, .10)
      put(0x4d3229, x + side * 1.88, y + 2.19, z + 2.047, .63, .72, .070)
      put(0x8c8e79, x + side * 1.88, y + 2.19, z + 2.085, .51, .57, .045)
      add(board, 0x887059, x + side * .44, y + 1.11, z + 2.135, 1.25, .089, .07, 0, 0, side * -.70, false, 2)
    }
    put(0x50332b, x, y + 1.10, z + 2.08, 1.91, 2.03, .092)
    put(cream, x, y + 2.22, z + 2.08, 2.09, .095, .115)
    put(0x504235, x, y + 3.51, z + 2.041, .55, .56, .061)
    for (let plank = 0; plank < 11; plank++) {
      const xx = x + (plank - 5) * .48
      put(plank % 2 ? 0x754031 : 0xa25339, xx, y + 1.63, z + 2.006, .045, 2.98, .026)
    }
    const siloBase = earth(-z, x - 5)
    add(silo, 0xb4aea0, x - 5, siloBase + 2.55, z, 1, 5.1, 1)
    add(round, 0xa6a196, x - 5, siloBase + 5.04, z, 1.02, .73, 1.02)
    for (let fence = 0; fence < 7; fence++) {
      const fx = -8 - fence * 2.05
      const fy = earth(13, fx)
      put(0x766850, fx, fy + .40, -13, .17, .81, .19)
      if (fence < 6) put(0x8f8060, fx - 1.02, fy + .59, -13, 2.3, .10, .10)
    }
  }

  if (feature === 'piling' && index % 4 === 0) {
    for (let pile = 0; pile < 6; pile++) {
      const x = 7.7 + pile * .79, z = -16 - pile * .36
      put(0x77634c, x, waterline + .24, z, .19, 1.36 - pile * .09, .20)
      if (pile < 4) put(0x9d8766, x + .20, waterline + .50, z, .51, .09, .88, -.43)
    }
    put(0xa49b7e, 7.7, waterline + .99, -16, .27, .12, .28)
  }

  if (feature === 'sandbar' && index % 3 !== 1) {
    const side = index % 2 ? -1 : 1
    for (let strip = 0; strip < 6; strip++) {
      const x = side * (9.4 + strip * 1.33), z = -10 - strip * 1.82
      add(round, strip % 2 ? 0xaf9569 : 0xbea67e, x, Math.max(waterline - .06, earth(-z, x)), z,
        2.7, .18, 2.4 - strip * .18, 0, .55)
    }
    put(0x605140, side * 11, waterline + .19, -15.2, .26, .24, 3.1, -.76)
  }

  if (feature === 'slough' && index % 3 === 0) {
    const x = index % 2 ? 9.5 : -9.5
    for (let mound = 0; mound < 4; mound++) {
      const z = -7 - mound * 4.7
      add(round, mound % 2 ? 0x70613d : 0x827650, x + Math.sin(mound) * .65, waterline, z,
        .75 + mound * .14, .35 + mound * .045, .65 + mound * .17, .14, mound)
    }
  }

  if (feature === 'snag' && index % 4 === 0) {
    const x = -9.8, z = -17, y = earth(-z, x)
    put(0x938f76, x, y + .28, z, .31, .42, 4.4, .72)
    for (let stem = 0; stem < 7; stem++) {
      const dx = x - 2 + stem * .63, dz = z + Math.sin(stem) * 2.7, ground = earth(-dz, dx)
      const h = 2.3 + stem % 3
      put(0xb8b4a0, dx, ground + h * .5, dz, .085, h, .095, stem)
      for (let knot = 0; knot < 3; knot++)
        put(0x625b4d, dx, ground + .64 + knot * .61, dz + .047, .087, .069, .016, stem)
    }
  }

  if ((feature === 'camp' || feature === 'cairn') && index % 10 === 0) {
    const x = 9.8, z = -17.8, y = Math.max(-.32, earth(-z, x))
    const winter = feature === 'cairn'
    for (const dx of [-1.84, 1.84]) for (const dz of [-1.23, 1.23]) {
      const height = y - earth(-z - dz, x + dx) + .2
      if (height > .19) put(0x50473d, x + dx, y - height * .5 + .06, z + dz, .25, height, .26)
    }
    put(0x655349, x, y + .92, z, 4.5, 1.84, 3)
    for (let course = 0; course < 7; course++) {
      put(course % 2 ? 0x594a3e : 0x745d4c, x, y + .17 + course * .25, z + 1.53, 4.55, .23, .19)
    }
    add(roof, winter ? 0xc4d3d7 : 0x675d50, x, y + 2.15, z, 3.04, .94, 1.80)
    put(0x403b35, x - .73, y + .75, z + 1.65, .92, 1.50, .10)
    put(0x372f29, x + 1.36, y + 1.15, z + 1.65, .73, .61, .10)
    put(0xe1b16c, x + 1.36, y + 1.15, z + 1.72, .52, .41, .04)
    put(0x766353, x + 1.52, y + 2.65, z - .42, .51, 1.25, .60)
    put(0x564c42, x + 1.52, y + 3.25, z - .42, .67, .13, .72)
    chimney = [x + 1.52, y + 3.31, z - .42]
    put(0x5b4b37, x - 2.80, y + .24, z + 1.94, .66, .48, .59, -.12)
    put(0x8d7250, x - 3.06, y + .12, z + .95, .44, .27, .60, .23)
    put(0xb18451, x - 2.66, y + .56, z + 1.97, .15, .22, .16)
    put(0xf1b765, x - 2.66, y + .55, z + 2.062, .092, .105, .022)
    put(0x4b4435, x - 2.66, y + .69, z + 1.97, .162, .043, .17)
    const deck = Math.max(waterline + .40, earth(9, 6.5) + .10)
    for (let step = 0; step < 12; step++) put(0x79644d, 6.4 + step * .32, deck, -8.2, .29, .09, 1.60)
    for (const post of [6.4, 9.4]) for (const edge of [-.65, .65]) {
      put(0x554a3d, post, deck - .34, -8.2 + edge, .14, .82, .14)
    }
    if (!winter) {
      const boatX = 9.1, boatZ = -6.25
      add(canoe, 0x5b6957, boatX, waterline + .15, boatZ, .58, .86, 1.80, 0, -.18)
      for (const seat of [-.74, .05, .77]) put(0xb1926a, boatX + seat * -.18,
        waterline + .26, boatZ + seat, .87, .075, .20, -.18)
      const jonX = 7.8, jonZ = -11.3
      add(jonBoat, 0x645e4b, jonX, waterline + .19, jonZ, .74, .87, 1.65)
      add(board, 0x77715a, jonX, waterline + .10, jonZ - 1.64, 1.36, .43, .065)
      add(board, 0x77715a, jonX, waterline + .16, jonZ + 1.64, 1.04, .43, .065)
      for (const seat of [-.91, .12, .92]) add(board, 0x807b64, jonX, waterline + .27, jonZ + seat, 1.25, .10, .38)
      add(board, 0x464a3d, jonX, waterline + .39, jonZ - 1.69, .30, .24, .33)
    }
  }

  if (feature === 'cairn' && index % 3 === 0) {
    // Rotate exposed channel rocks and compact cairns throughout the endgame.
    const exposed = Math.floor(index / 9) % 3
    for (let n = 0; n < 7 + exposed; n++) {
      const x = (n % 2 ? 1 : -1) * (4.3 + random() * 6.7)
      const at = 2 + random() * 25, y = earth(at, x)
      if (y < waterline + .12) continue
      const size = .34 + random() * .62
      add(round, 0x68777d, x, y, -at, size, size * .54, size * .68, 0, n)
      add(round, 0xc4d8df, x - .02, y + size * .29, -at + .02, size * .83, size * .29, size * .58, 0, n)
    }
    if (exposed === 1) {
      const x = 5.8, z = -11, base = earth(-z, x)
      for (let level = 0; level < 4; level++) {
        const size = .44 - level * .078
        add(round, level % 2 ? 0x819294 : 0x9cafb4, x, base + .12 + level * .17, z,
          size, .14, size * .71, 0, level)
      }
    }
  }
  return chimney
}
