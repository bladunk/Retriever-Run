import meshes from './assets/environment/northern-frontier-meshes.js'
import { packedGeometry } from './packed-geometry.js'
import { seededRandom, segmentLength } from './trail.js'

const templates = new Map()

export function northernBankModel(name) {
  if (!templates.has(name)) templates.set(name,packedGeometry(meshes[name]))
  return templates.get(name)
}

export function dressNorthernScenery({ region, index, seed, earth, waterline, landmark, sign, add }) {
  if (!['boreal','foothills','mountain'].includes(region.key)) return
  const shield = region.key === 'boreal'
  const model = northernBankModel(shield ? 'ShieldLichen' : 'RockyMountainTalus')
  const sample = seededRandom(Math.imul(index+207,0x662961) ^ seed)
  const start = index*segmentLength
  for (const side of [-1,1]) {
    for (let n=0; n<4; n++) {
      const at = 4.5+n*6.5+sample()*1.7
      const x = side*(7.8+(n%2)*10.5+sample()*4.1)
      const floor = earth(start+at,x)
      if (floor < waterline-.22 ||
        landmark && Math.abs(landmark.distance-start-at)<5 && Math.abs(landmark.x-x)<4.2 ||
        sign && Math.abs(sign.distance-start-at)<4 && Math.sign(sign.width)===side) continue
      const spread = .48 + sample()*.86
      add(model,null,x,floor-.22,-at,spread*(1.1+.42*n),spread*.73,spread,
        0,side*(.38+.42*sample()),0,false,6)
    }
  }
}
