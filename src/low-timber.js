import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { curvedWood } from './fallen-timber.js'
import { seededRandom } from './trail.js'

let model

// One old storm-bent tree. The trunk rises at the right edge of the lane,
// forks overhead, and sweeps across the lane in one continuous piece.
export function lowTimber() {
  if (model) return model
  const random = seededRandom(841)
  const bark = 0x897059
  const cut = 0xe1b178
  const volumes = []
  const pieces = [
    [[.94,-.10,.14,.29],[.99,.42,.12,.24],[.95,1.14,.09,.205],[.79,1.83,.06,.19],
      [.55,2.29,-.06,.16],[.53,2.87,-.18,.08],[.68,3.19,-.26,.033]],
    [[.96,1.47,.065,.195],[.63,1.42,.032,.20],[.24,1.39,0,.21],
      [-.20,1.39,-.015,.208],[-.62,1.44,-.038,.166],[-1.04,1.55,-.065,.107]],
    [[.29,1.41,.02,.11],[.18,1.77,.025,.092],[.03,2.07,.01,.047],[-.11,2.17,-.015,.023]],
    [[.48,2.31,-.07,.083],[.15,2.52,-.15,.059],[-.24,2.60,-.22,.018]],
    [[.98,.27,.14,.156],[.80,.12,.33,.115],[.64,.015,.52,.048]],
    [[1.06,.23,.16,.141],[1.21,.08,-.06,.086],[1.31,.01,-.24,.034]],
    [[.94,.23,.20,.147],[.98,.075,.53,.099],[.94,.026,.69,.041]],
  ]
  const parts = pieces.map((guide, index) => curvedWood(guide, bark, cut, random, index < 3, false,
    index < 4 ? volumes : undefined))
  const geometry = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  geometry.computeBoundingBox()
  geometry.name = 'Rooted storm-bent timber'
  model = { geometry, volumes }
  return model
}
