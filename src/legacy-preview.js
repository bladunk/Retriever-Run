// Only imported by the guarded Art Studio entry point. Preview saves are
// confined to an in-memory store and are discarded on closing the Lodge.
import { lodgeFixture } from '../scripts/lodge-fixtures.mjs'
import { nearMasterHunter, fixtureDate } from '../scripts/career-fixtures.mjs'
import { openLodge, saveKey } from './lodge-save.js'
import { xpAt } from './career.js'

export function createLegacyPreview(tier) {
  const source = lodgeFixture()
  const representative = source.players[[0,3,4,5,7][tier - 1]] ?? source.players[0]
  if (tier >= 3) {
    representative.discoveries = { version:1, entries:{ 'platte-crane-passage':fixtureDate } }
    if (tier >= 4) representative.discoveries.entries['reedwatch-landing'] = fixtureDate
  }
  if (tier === 5) {
    const earned = nearMasterHunter().players[0]
    Object.assign(representative,earned,{ id:8, nickname:'Willow Guide',
      career:{ ...earned.career, xp:xpAt(100) }, kennel:{ name:'Willow' },
      progression:{ ...earned.progression, boyd:fixtureDate },
      discoveries:{ version:1, entries:{ ...representative.discoveries.entries, 'divide-aurora':fixtureDate } },
      legacyHistory:{ version:1, milestones:{ migration:fixtureDate, 'rank:master-hunter':fixtureDate } },
    })
  } else {
    representative.kennel = { ...representative.kennel, name:'Willow' }
  }
  const memory = new Map([[saveKey,JSON.stringify({ ...source, active:representative.id, players:[representative] })]])
  const store = openLodge(() => ({
    getItem:key => memory.get(key) ?? null,
    setItem:(key,value) => { memory.set(key,value) },
  }))
  return { ...store, preview:true }
}
