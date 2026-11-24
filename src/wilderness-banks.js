import * as T from 'three'
import { seededRandom } from './trail.js'

const box = new T.BoxGeometry()
const rock = new T.IcosahedronGeometry(1, 0)
const timber = new T.CylinderGeometry(.60, 1, 1, 6)
const bale = new T.CylinderGeometry(1, 1, 1, 15, 1).rotateZ(Math.PI / 2)
const disc = new T.CircleGeometry(1, 9).rotateX(-Math.PI / 2)
const rope = new T.TorusGeometry(1, .037, 4, 15).rotateY(Math.PI / 2)
const triangle = new T.ConeGeometry(1, 1, 4)
const up = new T.Vector3(0, 1, 0)
const point = new T.Vector3()
const rotate = new T.Quaternion()

export function dressWildBanks({ add, earth, region, index, waterline }) {
  const random = seededRandom(Math.imul(index + 918, 1779033703))
  const range = (min, max) => min + random() * (max - min)
  const side = index % 2 ? -1 : 1
  const z = -range(10, 20)

  const wood = (shape, color, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) =>
    add(shape, color, x, y, z, w, h, d, rx, ry, rz, false, 2)
  const beam = (color, a, b, thick) => {
    point.set(b[0] - a[0], b[1] - a[1], b[2] - a[2])
    const length = point.length()
    rotate.setFromUnitVectors(up, point.multiplyScalar(1 / length))
    add(timber, color, (a[0] + b[0]) * .5, (a[1] + b[1]) * .5, (a[2] + b[2]) * .5,
      thick, length, thick, 0, 0, 0, false, 2, rotate)
  }
  const ribbon = (color, x, at, y, w, d) => add(disc, color, x, y, at, w, 1, d)
  const stone = (color, x, at, y, size, lean) =>
    add(rock, color, x, y, at, size, size * .61, size * .76, .16, lean, -.09)

  if (region.kind === 'swamp' || region.key === 'gulf') {
    const cypress = region.key === 'cypress'
    const woodTone = cypress ? 0x514c36 : 0x5b5544
    const x = side * range(5.6, 7.7)
    const ground = earth(-z, x)
    if (region.kind === 'swamp' && index % 3 !== 1) {
      const base = Math.min(waterline - .02, ground)
      const height = cypress ? range(.37, .69) : range(.23, .46)
      for (let n = 0; n < (cypress ? 6 : 4); n++) {
        const kneeX = x + side * range(-.46, 1.8)
        const at = z + range(-1.7, 1.7)
        wood(timber, woodTone, kneeX, base + height * .29, at, range(.08, .19), height, .13, .13, n, .08)
        if (n % 2 === 0) beam(woodTone, [kneeX, base + height * .31, at],
          [x + side * 1.35, waterline - .02, z + .61], .056)
      }
    }
    for (let flake = 0; flake < 13; flake++) {
      const px = side * range(4.13, 6.25)
      const at = z + range(-5, 5)
      const level = earth(-at, px)
      if (level < waterline + .03) continue
      add(triangle, flake % 2 ? 0x786c43 : 0x9a693c, px, level + .036, at,
        .11, .032, .079, .06, flake * 1.74, .22)
    }
  } else if (region.key === 'farm') {
    if (index % 4 === 2 || index % 7 === 4) {
      const x = 8.4
      for (let i = 0; i < 3; i++) {
        const px = x + i * 2.44
        const at = z + i * 1.28
        const level = earth(-at, px)
        if (level < waterline + .06) continue
        ribbon(0x675936, px, at, level + .026, 1.04, .95)
        add(bale, i % 2 ? 0xa77940 : 0xbc8c4a, px, level + .68, at, 1.4, .69, .71, 0, .20)
        for (const edge of [-.47, .47]) add(rope, 0x745d3c, px + edge, level + .68, at,
          .52, .697, .714, 0, .20)
      }
    }
    if (index % 8 === 2) {
      const x = 15.6
      const at = -19.2
      const level = earth(-at, x)
      const tower = level + 5.7
      for (const corner of [-1, 1]) {
        beam(0x575d55, [x + corner * 1.23, level, at + .52], [x + corner * .21, tower, at], .072)
        beam(0x737264, [x + corner * 1.01, level + .95, at + .45], [x - corner * .63, level + 3.25, at + .26], .044)
      }
      wood(box, 0x807968, x, tower, at, .4, .33, .35)
      for (let blade = 0; blade < 10; blade++) {
        const angle = blade * Math.PI * .2
        add(box, blade % 3 ? 0x9f9a89 : 0x786049, x + Math.sin(angle) * .94, tower + Math.cos(angle) * .94, at + .24,
          .14, .85, .05, 0, .08, -angle)
      }
      add(box, 0x907a57, x + .64, tower - .09, at - .43, .12, .38, .60, 0, .6)
    }
  } else if (region.kind === 'channel' || region.kind === 'pothole' || region.kind === 'slough') {
    const x = side * (region.kind === 'channel' ? 8.6 : 6.7)
    for (let n = 0; n < 7; n++) {
      const at = z + range(-6, 6)
      const dx = x + range(-1, 2)
      const ground = earth(-at, dx)
      if (ground < waterline - .23) continue
      const shade = region.kind === 'channel' ? 0xb5a383 : region.kind === 'slough' ? 0x7f8371 : 0x9d8b53
      stone(shade, dx, at, ground + .03, range(.18, .42), n)
      if (n % 3 === 0 && ground > waterline + .02) {
        const bands = region.kind === 'slough' ? 0x897e57 : 0xa59864
        for (let i = 0; i < 5; i++) add(triangle, bands, dx + range(-.26, .26), ground + .19, at + range(-.2, .2),
          .045, range(.29, .53), .038, .17, i * 2.1, -.19)
      }
    }
  } else {
    const alpine = region.kind === 'alpine'
    const x = side * range(5.2, 7.1)
    for (let i = 0; i < 5; i++) {
      const dx = x + side * range(-.75, 3.1)
      const at = z + range(-5.6, 5.6)
      const ground = earth(-at, dx)
      if (ground < waterline - .15) continue
      const size = range(.26, alpine ? 1.05 : .83)
      const upper = alpine ? 0xc9d9dd : region.key === 'boreal' ? 0x78866c : 0xacada0
      ribbon(0x575d54, dx, at, ground + .04, size * .82, size * .64)
      stone(0x657278, dx, at, ground + size * .18, size, i)
      add(rock, upper, dx + .03, ground + size * .53, at + .04, size * .77, size * .22, size * .61, .16, i, -.09)
    }
    if (region.key === 'border' && index % 2 === 1) {
      const x = -8.2
      for (let n = 0; n < 5; n++) {
        const at = z + n * 1.28
        const dx = x - Math.sin(n * 1.4) * 1.47
        const ground = earth(-at, dx)
        const h = range(1.70, 3.55)
        wood(timber, 0xc5beaa, dx, ground + h / 2, at, .10, h, .11, .03, n, -.075)
        for (let notch = 1; notch < 4; notch++) {
          add(box, 0x524941, dx + notch * .015, ground + h * notch * .21, at + .103,
            .098, .030, .014, .13, n * .13)
        }
      }
    }
  }
}
