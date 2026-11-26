import meshes from './assets/environment/southern-flyway-meshes.js'
import { packedGeometry } from './packed-geometry.js'
import { seededRandom, segmentLength } from './trail.js'

const shapes = new Map()

export function southernModel(name) {
  if (!shapes.has(name)) shapes.set(name, packedGeometry(meshes[name]))
  return shapes.get(name)
}

export function dressSouthernBank({ key, index, seed, earth, landmark, sign, add }) {
  if (!['gulf','cypress','flyway','timber','ozark'].includes(key)) return
  const random = seededRandom(Math.imul(index + 143, 0x61a924d) ^ seed)
  const start = index * segmentLength
  const range = (min, max) => min + random() * (max - min)
  const shore = (name, x, at, size, yaw, { sink = 0, width = 1, height = 1 } = {}) => {
    if (Math.abs(x) < 4.8 || at < 2 || at > segmentLength - 2 ||
        landmark && Math.abs(x - landmark.x) < 4.2 && Math.abs(start + at - landmark.distance) < 6 ||
        sign && Math.sign(x) === Math.sign(sign.width) && Math.abs(start + at - sign.distance) < 3.8) return
    const mesh = southernModel(name)
    add(mesh, null, x, earth(start + at, x) - sink, -at, size*width, size*height, size,
      0, yaw, 0, false, mesh.userData.surface)
  }

  for (const side of [-1, 1]) {
    if (key === 'gulf') {
      // Long grass shelves grow along the dispersed mid-water islands. Keep
      // the nearest creek open so incoming wildlife and pickups have space.
      for (let bed = 0; bed < 4; bed++) {
        const at = 4.4 + bed*6.25 + range(-1.4,1.4)
        const edge = bed === 3 ? 37 : 16.7 + 3.4*Math.sin((start + at)*.061 + side)
        for (let clump = 0; clump < 3; clump++) {
          const x = side*(edge + range(-2.57,2.34))
          const depth = earth(start + at, x)
          if (depth > -.74) shore('SaltFlatGrass',x,at+range(-1.4,1.4),range(1.49,2.47),range(0,6.28),
            {sink:.055,width:1.38,height:.64})
        }
      }
      continue
    }
    if (key === 'flyway') {
      // Harvest rows are broken by flooded corners and low levees.
      const heading = .20 + Math.sin(start*.020)*.24
      for (let row = 0; row < 5; row++) {
        for (let stem = 0; stem < 6; stem++) {
          const at = 4 + stem*4.0 + range(-.61,.67)
          const x = side*(6.54 + row*2.24 + (at-15)*Math.sin(heading)*.64 + range(-.32,.31))
          if (earth(start + at, x) < -.66 || (row + index)%4 === 2 && stem < 3) continue
          shore('RiceStubble',x,at,range(.82,1.33),heading,{width:1.2,height:.84})
        }
      }
      continue
    }
    if (key === 'ozark') {
      const bendSide = Math.sin((start + 10)*.039) > 0 ? 1 : -1
      for (let shelf = 0; shelf < (side === bendSide ? 5 : 2); shelf++) {
        const at = 5 + shelf*4.7 + range(-1.5,1.5)
        const x = side*(shelf > 2 ? range(21,29) : range(10.9,17.8))
        const y = earth(start + at, x)
        if (y < -.85) continue
        shore('LimestoneLedge',x,at,range(.65,1.22),side*(1.2 + range(-.24,.25)),{sink:.25,width:1.13})
      }
      continue
    }
    const at = range(7,23)
    const x = side*range(6.0,10.7)
    const height = earth(start + at,x)
    if (height > -1.32 && height < -.12 && (index + Number(side > 0))%3 !== 0)
      shore('FloodedRootwood',x,at,range(.85,1.74),range(-1.5,1.5),{sink:-.25})
  }
}
