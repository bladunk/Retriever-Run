// QA-only saves. These are loaded by tests, never by the application bundle.
import { xpAt } from '../src/career.js'
import { expeditionRegions } from '../src/expedition.js'
import { courseRuleset, legacyMigrationRuleset } from '../src/ruleset.js'
import { fixtureDate, nearMasterHunter } from './career-fixtures.mjs'

const sighting = (territory, seen = 1, rare = 0) => ({
  seen, rare, first: fixtureDate, territory, regions: { [territory]: seen },
})
const journal = species => ({ version: 2, species })
const career = level => ({ xp: xpAt(level), lastRun: 0, legacyXP: 750, legacyLevel: 4, legacyRank: 'Pup' })
const player = (id, nickname, level, data = {}) =>
  ({ id, enrollment: 'guest', nickname, career: career(level), profile: { quality: 'low' }, ...data })

export function lodgeFixture() {
  const prestige = nearMasterHunter().players[0]
  const rows = [
    player(1, 'New to the marsh', 1),
    player(2, 'Shore Fetcher', 7, {
      stats: { runs: 11, playtime: 1100, distance: 15000, ducks: 4 },
      wildlife: journal({ mallard: { retrieves: 4 } }),
      records: { duration: 92, retrieves: 2 },
      migration: { duration: 92, seconds: [285,210,162,20] },
      profile: { quality: 'low', best: 4250, farthest: 1400, retrieves: 4 },
    }),
    player(3, 'Marsh Observer', 7, {
      stats: { runs: 11, playtime: 1100, distance: 14000, deathsBy: { logs: 9, water: 1 } },
      wildlife: journal({ egret: sighting('gulf',3), 'wood-duck': sighting('cypress',2), alligator: sighting('gulf',1,1) }),
    }),
    player(4, 'Cypress Scout', 17, {
        wildlife: journal({ mallard: { ...sighting('gulf',11), retrieves: 9 }, egret: sighting('gulf',8),
          'wood-duck': sighting('cypress',5), heron: sighting('cypress',4), 'green-teal': sighting('gulf',3) }),
        records: { duration: 93, retrieves: 2 }, stats: { runs: 80, playtime: 4400, distance: 62000, ducks: 9 },
        migration: { duration: 93, seconds: [1400,500,230,10] },
        profile: { quality: 'low', best: 6100, farthest: 1410, retrieves: 9 },
    }),
    player(5, 'Platte Guide', 34, {
      stats: { runs: 410, playtime: 40_000, distance: 610_000, ducks: 85, pheasants: 31,
        deathsBy: { logs: 75, geese: 19, water: 65, other: 11 } },
      records: { duration: 223, retrieves: 6, treats: 190 },
      migration: { duration: 223, seconds: [10_500,5600,4100,3150,2800,1930,1270,543] },
      wildlife: journal({ 'canada-goose': sighting('platte',11), crane: sighting('platte',1,1), mallard: { ...sighting('platte',17), retrieves: 85 },
        'wood-duck': sighting('cypress',12), deer: sighting('farm',28), pheasant: { ...sighting('farm',19), retrieves:31 } }),
      profile: { quality: 'low', best: 19842, farthest: 3821, streak: 31, retrieves: 116 },
      progression: { version: 1, metres: [260000,122000,93000,49000,68000,24750,13100,5220], best: { chain: 6 }, impacts: { log: 17 } },
      kennel: { equipment: { collar: 'brass-collar', vest: 'canvas-vest', coat: 'cream' }, favorites: ['brass-collar','master-hunter-vest'] },
    }),
    player(6, 'Northwind Keeper', 68, {
      ...prestige, id: 6, nickname: 'Northwind Keeper', career: career(68),
      records: { ...prestige.records, duration: 391 }, migration: { duration: 391, seconds: expeditionRegions.map((_,i) => i < 14 ? 4300 : 0) },
      progression: { ...prestige.progression, migrations: 0 },
    }),
    player(7, 'Timber Companion', 100, {
      stats: { runs: 4800, playtime: 539000, distance: 7_800_000, ducks: 550, pheasants: 160 },
      records: { duration: 294, retrieves: 7 }, migration: { duration: 294 },
      profile: { quality: 'low', best: 27350, farthest: 6983, retrieves: 710 },
    }),
    player(8, 'Willow Guide', 99, { ...prestige, id: 8 }),
    player(9, 'Lantern Scout', 10, { career: { xp: xpAt(11) - 3, lastRun: 0 } }),
  ]
  return { version: 5, nextRun: 4301, active: 1, players: rows, entries: [
    { id: 70, player: 5, date: fixtureDate, score: 19842, distance: 3821, retrieves: 6, duration: 221, territory: 8, course: courseRuleset },
    { id: 71, player: 5, date: fixtureDate, score: 9091, distance: 2944, retrieves: 2, duration: 197, territory: 7, course: courseRuleset },
    { id: 72, player: 5, date: fixtureDate, score: 23191, distance: 3122, retrieves: 4, duration: 197, territory: 7, course: legacyMigrationRuleset },
  ] }
}
