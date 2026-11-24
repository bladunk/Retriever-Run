import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { curvedWood } from './fallen-timber.js'
import { seededRandom } from './trail.js'

let model

export function leaningTree() {
  if (model) return model
  const random = seededRandom(0x95ac)
  const volumes = []
  const bark = 0x9c7d5f
  const cut = 0xf1c78f
  const pieces = [
    // The rise is across the trail. The root end is grounded on the left and
    // the upper stem lodges in the substantial fork beyond the right lane.
    [[-3.60, .20, .14, .36], [-2.45, .44, .02, .32], [-1.06, 1.14, -.02, .28],
      [.07, 1.55, .02, .25], [1.28, 1.87, .05, .23], [2.48, 2.03, .07, .22],
      [3.81, 2.49, .16, .18], [4.48, 2.67, .23, .11]],
    [[3.77, -.30, .37, .58], [3.83, .57, .36, .48], [3.93, 1.70, .38, .38],
      [3.97, 2.48, .42, .33], [4.16, 3.48, .57, .28], [4.22, 4.55, .68, .21],
      [4.10, 5.42, .59, .14], [4.46, 6.36, .51, .07]],
    [[4.00, 1.78, .41, .26], [3.65, 2.40, .17, .23], [3.45, 3.14, -.19, .16],
      [3.36, 3.78, -.38, .11], [3.11, 4.38, -.54, .044]],
    [[-3.31, .26, .19, .17], [-3.60, .55, .35, .13], [-3.99, .53, .60, .08], [-4.32, .12, .76, .03]],
    [[-3.53, .25, .07, .17], [-3.89, .30, -.23, .12], [-4.08, .13, -.59, .08], [-4.43, .01, -.72, .018]],
    [[-3.27, .24, .19, .15], [-3.17, .18, .48, .12], [-3.30, .10, .79, .068], [-3.51, .01, 1.09, .02]],
    [[3.80, .40, .37, .24], [3.73, .22, .82, .19], [3.61, .04, 1.11, .07]],
    [[3.80, .37, .36, .23], [4.04, .24, -.02, .17], [4.38, .02, -.43, .07]],
    [[-1.34, 1.03, .02, .12], [-1.32, 1.01, .15, .088], [-1.62, 1.15, .20, .032]],
    [[1.26, 1.85, .07, .105], [1.37, 2.05, .16, .063], [1.56, 2.19, .26, .029]],
    [[4.13, 3.32, .57, .16], [4.61, 3.95, .52, .09], [5.08, 4.23, .31, .02]],
    [[4.20, 4.49, .65, .12], [4.07, 4.89, 1.14, .076], [3.79, 5.31, 1.59, .026]],
  ]
  const parts = pieces.map((guide, i) => curvedWood(guide, i === 1 || i === 2 ? 0x7e6f59 : bark,
    cut, random, i < 3, i === 0, i < 3 || i === 8 || i === 9 ? volumes : undefined))
  const geometry = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  geometry.computeBoundingBox()
  geometry.name = 'Fork-supported fallen tree'
  model = { geometry, volumes }
  return model
}
