import meshes from './assets/environment/opening-day-meshes.js'
import { packedGeometry } from './packed-geometry.js'
import { seededRandom, segmentLength } from './trail.js'

// Model families, occurrence density, and placement band in metres from
// the trail center. Each layer leaves openings for shelters and wildlife.
const margins = {
  gulf: ['Saltmeadow', 'Buttonbush', 11, 3.91, 5.65],
  cypress: ['Buttonbush', 'Saltmeadow', 4, 4.75, 9.4],
  flyway: ['WillowScrub', 'Saltmeadow', 6, 4.2, 8.4],
  timber: ['Buttonbush', 'WillowScrub', 5, 4.35, 8.6],
  ozark: ['RiverShelf', 'WillowScrub', 6, 4.6, 9.0],
  farm: ['PrairieBunch', 'WillowScrub', 4, 4.45, 6.8],
  platte: ['PrairieBunch', 'RiverShelf', 4, 4.6, 8.4],
  sandhills: ['PrairieBunch', 'WillowScrub', 6, 4.4, 8.6],
  prairie: ['Saltmeadow', 'PrairieBunch', 6, 4.2, 8.3],
  dakota: ['Saltmeadow', 'WillowScrub', 6, 4.3, 9.0],
  manitoba: ['Saltmeadow', 'Buttonbush', 7, 4.15, 9.3],
  parklands: ['WillowScrub', 'PrairieBunch', 6, 4.5, 8.1],
  boreal: ['RiverShelf', 'SnowTalus', 5, 4.25, 8.5],
  foothills: ['RiverShelf', 'SnowTalus', 6, 4.25, 9.5],
  mountain: ['SnowTalus', 'RiverShelf', 7, 4.20, 9.1],
}
const resident = new Map()

function model(name) {
  if (!resident.has(name)) resident.set(name, packedGeometry(meshes[name]))
  return resident.get(name)
}

export function dressFieldEdge({ key, index, seed, earth, waterline, landmark, sign, add }) {
  const [plant, accent, count, near, far] = margins[key]
  const random = seededRandom(Math.imul(index + 917, 0x98d67d) ^ seed)
  const start = index * segmentLength
  const coast = key === 'gulf'
  for (const side of [-1, 1]) {
    const spacing = segmentLength / count
    for (let n = 0; n < count; n++) {
      const at = start + (n + .2 + random() * .6) * spacing
      const x = side * (near + (far - near) * (.27 + .70 * Math.sin(at * .16 + side) ** 2))
      const y = earth(at, x)
      const name = n % 3 === 2 ? accent : plant
      const rocky = name === 'RiverShelf' || name === 'SnowTalus'
      const wet = name === 'Saltmeadow'
      if (y < waterline + (wet ? -.29 : -.025) ||
          landmark && Math.abs(x - landmark.x) < 3.7 && Math.abs(at - landmark.distance) < 5.0 ||
          sign && Math.sign(sign.width) === side && Math.abs(at - sign.distance) < 3.3) continue
      const scale = coast && wet ? .88 + .56 * random() : .68 + .43 * random()
      const yaw = random() * Math.PI * 2
      const geometry = model(name)
      add(geometry, null, x, y - (rocky ? .07 : .025), start - at,
        scale * (wet && coast ? 1.29 : 1.05), scale, scale, 0, yaw, 0, false, geometry.userData.surface)
    }
    if (!coast) continue
    // Separate patches on the far edge of the channel give the marsh
    // a middle distance while leaving clean stretches of open water.
    const grasses = model('Saltmeadow')
    for (let bed = 0; bed < 3; bed++) {
      const center = start + 4 + bed * 9.25 + random() * 2
      const edge = 8.4 + random() * 5.3
      for (let clump = 0; clump < 4; clump++) {
        const at = center + (clump - 1.5) * (1.12 + random() * .62)
        const x = side * (edge + (random() - .45) * 1.4)
        const y = earth(at, x)
        if (y < waterline - .47 || landmark && Math.abs(at - landmark.distance) < 4.5 &&
            Math.abs(x - landmark.x) < 4.2) continue
        const size = .93 + random() * .54
        add(grasses, null, x, y, start - at, size * 1.25, size, size * 1.34, 0,
          random() * Math.PI * 2, 0, false, grasses.userData.surface)
      }
    }
  }
}
