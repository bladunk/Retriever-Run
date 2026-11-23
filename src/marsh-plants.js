import * as T from 'three'
import { seededRandom } from './trail.js'

export function bankPlantType(habitat) {
  if (habitat === 'Cattail Marsh' || habitat === 'Muddy Creek') return 0
  if (habitat === 'Flooded Timber') return 1
  return 2
}

export function createBankPlant(type, simple = false) {
  const random = seededRandom(2631 + type * 73)
  const positions = [], colors = []
  const color = new T.Color()
  function face(a, b, c, hex, shade = 1) {
    positions.push(...a, ...b, ...c)
    color.setHex(hex).multiplyScalar(shade)
    for (let i = 0; i < 3; i++) color.toArray(colors, colors.length)
  }
  // Fold each taper around a central vein. Cattails are upright, sedges
  // droop over the bank, and the flooded-timber rushes have fine stems.
  const leafCount = simple ? 5 : [10, 11, 13][type]
  for (let i = 0; i < leafCount; i++) {
    const a = i * 2.39996 + random() * .36
    const dx = Math.cos(a), dz = Math.sin(a)
    const height = [.85, .7, .56][type] * (.6 + random() * .76)
    const arc = [.49, .23, .58][type] * (.52 + random() * .79)
    const width = [.030, .013, .024][type] * (.68 + random() * .61)
    const x = dx * random() * .17
    const z = dz * random() * .17
    const hue = i % 5 === 0 ? 0xb0985e : i % 3 === 0 ? 0x88854e : 0x626d42
    const tip = [1, [1, .96, .61][type], 0]
    const sections = simple ? [[0, 0, .65], [.49, .76, .86], tip]
      : [[0, 0, .64], [.26, .45, .96], [.62, .87, .62], tip]
    let previous
    for (const [reach, rise, taper] of sections) {
      const cx = x + dx * reach * arc, cz = z + dz * reach * arc, y = rise * height
      const w = taper * width
      const row = [[cx - dz * w, y, cz + dx * w], [cx, y + w * .24, cz],
        [cx + dz * w, y, cz - dx * w]]
      if (previous) {
        const light = .59 + rise * .39
        face(previous[0], previous[1], row[1], hue, light * 1.12)
        face(previous[1], previous[2], row[1], hue, light * .80)
        if (taper > 0) {
          face(previous[0], row[1], row[0], hue, light * 1.12)
          face(previous[2], row[2], row[1], hue, light * .80)
        }
      }
      previous = row
    }
  }

  if (type !== 2) {
    for (let i = 0; i < (simple ? (type === 0 ? 2 : 1) : (type === 0 ? 4 : 3)); i++) {
      const angle = i * 2.4
      const x = Math.cos(angle) * (.09 + random() * .22)
      const z = Math.sin(angle) * (.09 + random() * .19)
      const lean = (random() - .5) * .23
      const height = (type === 0 ? 1.19 : .90) * (.79 + random() * .43)
      const head = [height - .17, type === 0 ? .029 : .021]
      const sections = simple ? [[0, .014], [height - .20, .009], head, [height, .004]]
        : [[0, .014], [.52, .010], [height - .20, .009], head, [height - .025, type === 0 ? .026 : .012], [height, .003]]
      const sides = simple ? 3 : 4
      for (let row = 1; row < sections.length; row++) {
        const [bottom, lower] = sections[row - 1]
        const [top, upper] = sections[row]
        const point = (step, radius, y) => [x + y * lean + Math.cos(step * 2 * Math.PI / sides) * radius,
          y, z + Math.sin(step * 2 * Math.PI / sides) * radius]
        for (let side = 0; side < sides; side++) {
          const a = point(side, lower, bottom), b = point(side + 1, lower, bottom)
          const c = point(side, upper, top), d = point(side + 1, upper, top)
          const hex = row >= sections.length - 2 ? (type === 0 ? 0x594030 : 0x8f6940) : 0x7a8453
          face(a, c, b, hex, .79 + side * .08)
          face(b, c, d, hex, .79 + side * .08)
        }
      }
    }
  }

  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

export function createLeafSpray(willow) {
  const random = seededRandom(willow ? 49623 : 41898)
  const vertices = []
  const append = (...points) => { for (const point of points) vertices.push(...point) }
  for (let branch = 0; branch < 7; branch++) {
    const a = branch * 2.39996
    const dx = Math.cos(a), dz = Math.sin(a)
    const length = .62 + random() * .45
    const spread = .36 + random() * .42
    const startY = (random() - .38) * .73
    const drop = willow ? -.70 - random() * .62 : (random() - .34) * .53
    for (let leaflet = 0; leaflet < 7; leaflet++) {
      const fraction = .28 + leaflet * .12
      const x = dx * fraction * length
      const z = dz * fraction * length
      const y = startY + drop * fraction * fraction
      const side = leaflet % 2 ? -1 : 1
      const angle = a + side * spread * 1.8
      const tip = [x + Math.cos(angle) * .25, y + (willow ? -.34 : .11), z + Math.sin(angle) * .25]
      const vx = tip[0] - x, vz = tip[2] - z
      const width = willow ? .26 : .49
      const root = [x, y, z]
      const left = [x + vx * .54 - vz * width, y + (tip[1] - y) * .45, z + vz * .54 + vx * width]
      const right = [x + vx * .54 + vz * width, left[1] - .045, z + vz * .54 - vx * width]
      append(root, left, tip, root, tip, right, root, tip, left, root, right, tip)
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(vertices, 3))
  geometry.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(vertices.length / 3 * 2), 2))
  geometry.computeVertexNormals()
  return geometry
}
