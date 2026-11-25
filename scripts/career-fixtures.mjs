// Isolated QA data. The production build never imports this fixture.
import { xpAt } from '../src/career.js'
import { expeditionRegions } from '../src/expedition.js'
import { saveVersion } from '../src/lodge-save.js'
import { obstacles } from '../src/obstacles.js'
import { fieldSpecies, habitatEncounters } from '../src/wildlife-catalog.js'

export const fixtureDate = '2026-11-20T08:00:00Z'

export function nearMasterHunter() {
  const species = Object.fromEntries(Object.keys(fieldSpecies).map(id => {
    const entries = Object.entries(habitatEncounters).filter(([, tiers]) => tiers.some(tier => tier.includes(id)))
    return [id, { seen: entries.length * 10, rare: 0, first: fixtureDate, territory: entries[0][0],
      regions: Object.fromEntries(entries.map(([key]) => [key, 10])),
      retrieves: id === 'mallard' ? 340 : id === 'pheasant' ? 150 : 0 }]
  }))
  return { version: saveVersion, nextRun: 4301, active: 1, players: [{
    id: 1, enrollment: 'guest', nickname: 'Willow Guide', career: { xp: xpAt(100) - 3, lastRun: 4300 },
    profile: { best: 70000, farthest: 12000, streak: 68, quality: 'low' },
    stats: { runs: 4300, distance: 8_400_000, playtime: 540000, points: 11_000_000, treats: 310000,
      jumps: 8000, slides: 4200, slidesCleared: 1120, logs: 890, geese: 605, ducks: 340, pheasants: 150 },
    records: { duration: 506, treats: 620, retrieves: 10, geese: 11 },
    migration: { duration: 506, seconds: expeditionRegions.map(() => 3600) },
    wildlife: { version: 2, lastRun: 4300, species },
    progression: { version: 1, migrations: 6, shifts: 17000, routes: 157,
      metres: expeditionRegions.map(() => 27000), clears: Object.fromEntries(Object.keys(obstacles).map(id => [id, 136])),
      best: { chain: 9, diversity: 11, jumpClears: 30, slidesCleared: 15, geese: 9, routeCount: 7 } },
  }] }
}
