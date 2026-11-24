import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { curvedWood } from './fallen-timber.js'
import { seededRandom } from './trail.js'

const profiles = {
  log: {
    bark: 0x9a7651, cut: 0xe0b771, seed: 21,
    stem: [[-.96, .29, .015, .235], [-.45, .34, .030, .305], [.25, .35, -.025, .285], [.87, .291, -.045, .23]],
    shoots: [
      [[.27, .43, .12, .09], [.19, .55, .225, .055], [.28, .65, .27, .026]],
    ],
  },
  root: {
    bark: 0x8d7658, cut: 0xc3a177, seed: 605,
    stem: [[-.93, .095, -.086, .085], [-.53, .21, -.10, .175], [-.19, .27, .075, .208], [.37, .18, .15, .132], [.92, .11, .04, .065]],
    shoots: [
      [[-.48, .18, -.10, .102], [-.50, .21, -.21, .085], [-.57, .09, -.37, .057], [-.70, .042, -.45, .019]],
      [[-.27, .20, .12, .080], [-.39, .14, .27, .057], [-.14, .052, .39, .012]],
    ],
  },
  drift: {
    bark: 0xa28b6d, cut: 0xd6bc8b, seed: 801,
    stem: [[-.97, .25, .18, .22], [-.56, .33, .094, .28], [-.09, .33, -.029, .26], [.45, .28, -.112, .22],
      [.86, .26, -.18, .145]],
    shoots: [
      [[-.51, .31, .11, .12], [-.39, .46, .25, .077], [-.26, .52, .39, .037], [-.10, .44, .44, .017]],
      [[.39, .27, -.12, .10], [.45, .20, -.31, .063], [.59, .133, -.40, .028]],
    ],
  },
  tree: {
    bark: 0x8c7358, cut: 0xe3bf8d, seed: 903,
    stem: [[0, -.035, .009, .325], [-.035, .25, .012, .273], [.021, .75, -.022, .247], [.065, 1.16, .025, .208]],
    shoots: [
      [[-.13, .20, .055, .13], [-.25, .068, .13, .09], [-.35, .023, .16, .032]],
      [[.02, .22, .038, .085], [.171, .066, .167, .061], [.244, .019, .205, .023]],
    ],
  },
}
const cache = new Map()

export function trailTimber(kind) {
  const profile = profiles[kind]
  if (!profile) return undefined
  if (cache.has(kind)) return cache.get(kind)
  const { bark, cut, stem, shoots } = profile
  const random = seededRandom(profile.seed)
  const parts = [curvedWood(stem, bark, cut, random, true, kind === 'log' || kind === 'drift')]
  for (const shoot of shoots) parts.push(curvedWood(shoot, bark, cut, random, false))
  const geometry = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  geometry.name = kind
  geometry.computeBoundingBox()
  cache.set(kind, geometry)
  return geometry
}
