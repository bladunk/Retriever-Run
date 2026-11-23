import * as T from 'three'

const board = new T.BoxGeometry()
const round = new T.SphereGeometry(1, 7, 4)
const roof = new T.CylinderGeometry(1, 1, 1, 3, 1)
roof.rotateX(Math.PI / 2)
const hull = skiffHull()

function skiffHull() {
  const vertices = [], uv = [], indices = []
  const ring = [[-1, .13], [-.88, -.12], [-.45, -.33], [.45, -.33], [.88, -.12], [1, .13]]
  const stations = [-1, -.83, -.45, 0, .53, .84, 1]
  for (const z of stations) {
    const taper = Math.max(.035, Math.pow(1 - Math.abs(z), .40))
    for (const [x, y] of ring) {
      vertices.push(x * taper, y * (.72 + taper * .28) + .21 * z * z, z)
      uv.push(.5 + x * .5, z + .5)
    }
  }
  for (let r = 0; r < stations.length - 1; r++) {
    for (let u = 0; u < ring.length - 1; u++) {
      const a = r * ring.length + u, b = a + ring.length
      indices.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b, a, b + 1, b, a + 1)
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

  if (region.key === 'prairie' && index % 7 === 2) {
    const x = -20, z = -20, y = earth(-z, x)
    put(0x694638, x, y + 1.55, z, 5.6, 3.1, 4)
    add(roof, 0x706859, x, y + 3.35, z, 3.72, 1.28, 2.23)
    put(0x43382c, x, y + .87, z + 2.02, 1.55, 1.74, .11)
    put(0xbba57a, x - 1.97, y + 1.88, z + 2.07, .68, .71, .08)
    for (let fence = 0; fence < 7; fence++) {
      const fx = -8 - fence * 2.05
      const fy = earth(13, fx)
      put(0x766850, fx, fy + .40, -13, .17, .81, .19)
      if (fence < 6) put(0x8f8060, fx - 1.02, fy + .59, -13, 2.3, .10, .10)
    }
  }

  if ((region.key === 'river' || region.key === 'snow') && index % 10 === 0) {
    const x = 9.8, z = -17.8, y = Math.max(-.32, earth(-z, x))
    const winter = region.key === 'snow'
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
      add(hull, 0x5b6957, boatX, waterline + .15, boatZ, .58, .86, 1.80, 0, -.18)
      for (const seat of [-.74, .05, .77]) put(0xb1926a, boatX + seat * -.18,
        waterline + .26, boatZ + seat, .87, .075, .20, -.18)
    }
  }

  if (region.key === 'snow' && index % 3 === 0) {
    for (let n = 0; n < 9; n++) {
      const x = (n % 2 ? 1 : -1) * (4.3 + random() * 6.7)
      const at = 2 + random() * 25, y = earth(at, x)
      if (y < waterline + .12) continue
      const size = .34 + random() * .62
      add(round, 0x68777d, x, y, -at, size, size * .54, size * .68, 0, n)
      add(round, 0xc4d8df, x - .02, y + size * .29, -at + .02, size * .83, size * .29, size * .58, 0, n)
    }
  }
}
