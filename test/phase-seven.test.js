import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { lodgeFixture } from '../scripts/lodge-fixtures.mjs'
import { fixtureDate, nearMasterHunter } from '../scripts/career-fixtures.mjs'
import { careerStanding, xpAt } from '../src/career.js'
import { careerLine } from '../src/career-ui.js'
import { expeditionRegions } from '../src/expedition.js'
import { honorById, localHonors } from '../src/field-honors.js'
import { completeMigrations, displayEquipment, earnedTrophies, lodgeProgress, lodgeRequirements, lodgeTier, lodgeTiers, lodgeUpgrades,
  migrationStop, normalizeLodgeDisplay, trophyFor } from '../src/lodge-progress.js'
import { openLodge, practiceSaveKey, saveKey, saveVersion } from '../src/lodge-save.js'
import { masterHunter } from '../src/master-hunter.js'
import { newRun, score } from '../src/runner.js'
import { courseRuleset, legacyMigrationRuleset } from '../src/ruleset.js'

function disk(raw = lodgeFixture()) {
  const data = new Map([[saveKey, JSON.stringify(raw)]])
  return { getItem: key => data.get(key) ?? null, setItem: (key,value) => data.set(key,value) }
}
const open = disk => openLodge(() => disk, () => new Date(fixtureDate))
const hunt = () => ({ ...newRun(), elapsed: 3, distance: 35, scoreBonus: 40 })

test('the five Lodge tiers cover all 100 levels and use the exact approved boundaries', () => {
  const ends = [10, 25, 50, 75, 100]
  assert.deepEqual(lodgeTiers.map(tier => tier.level), [1,11,26,51,76])
  lodgeTiers.forEach((tier,index) => {
    for (let level = tier.level; level <= ends[index]; level++) assert.equal(lodgeTier(level),tier)
  })
})

test('each intermediate addition has a unique ID, registered artwork and a valid requirement', async () => {
  assert.equal(new Set(lodgeUpgrades.map(upgrade => upgrade.id)).size, lodgeUpgrades.length)
  assert.equal(lodgeUpgrades.length,25)
  for (const tier of lodgeTiers) assert.ok(lodgeUpgrades.filter(up => lodgeTier(up.level) === tier).length >= 5)
  for (const up of lodgeUpgrades) {
    assert.ok(lodgeRequirements(up).length > 0)
    if (up.kind === 'honor') assert.equal(honorById.get(up.target)?.pending,false)
    const art = await readFile(new URL('../public/lodge/' + up.art + '.webp',import.meta.url))
    assert.equal(art.subarray(8,12).toString(),'WEBP')
  }
})

test('Phase 06 v5 records give retroactive displays and same-level players personalize independently', () => {
  const db = disk()
  const lodge = open(db)
  const a = lodge.players().find(item => item.id === 2)
  const b = lodge.players().find(item => item.id === 3)
  assert.equal(a.career.xp,xpAt(7))
  assert.equal(a.career.legacyRank,'Pup')
  assert.equal(a.career.legacyXP,750)
  assert.equal(lodgeProgress(a).tier,lodgeProgress(b).tier)
  const additions = player => lodgeProgress(player).upgrades.map(up => up.id)
  assert.ok(additions(a).includes('greenhead-decoy'))
  assert.ok(!additions(a).includes('first-field-study'))
  assert.ok(additions(b).includes('first-field-study'))
  assert.ok(!additions(b).includes('greenhead-decoy'))
  assert.equal(trophyFor(a,'observe:mallard'),null)
  assert.equal(trophyFor(a,'retrieve:mallard').badge,'Retrieve display')
  assert.equal(trophyFor(b,'retrieve:alligator'),null)
  assert.equal(trophyFor(b,'observe:alligator').badge,'Field observation')
  assert.ok(earnedTrophies(b).some(trophy => trophy.category === 'hall'))
  assert.equal(trophyFor(b,'honor:camp-first-hunt'),null)
  assert.equal(JSON.parse(db.getItem(saveKey)).version,5)
  assert.ok(lodge.commit())
  assert.equal(JSON.parse(db.getItem(saveKey)).version,saveVersion)
  assert.equal(open(db).players().find(item => item.id === 2).profile.best,4250)
})

test('only earned trophies can be pinned, preferences persist per player and invalid pins are trimmed', () => {
  const db = disk()
  const lodge = open(db)
  assert.equal(lodge.toggleTrophy(2,'observe:moose'),false)
  assert.ok(lodge.toggleTrophy(2,'retrieve:mallard'))
  assert.ok(lodge.toggleTrophy(2,'region:gulf'))
  assert.ok(lodge.toggleTrophy(2,'region:cypress'))
  assert.equal(lodge.toggleTrophy(2,'region:flyway'),false)
  const reloaded = open(db)
  assert.deepEqual(reloaded.players().find(item => item.id === 2).lodgeDisplay.pins,
    ['retrieve:mallard','region:gulf','region:cypress'])
  assert.deepEqual(reloaded.players().find(item => item.id === 3).lodgeDisplay.pins,[])
  assert.ok(reloaded.toggleTrophy(2,'region:gulf'))
  assert.ok(reloaded.toggleTrophy(2,'region:flyway'))
  assert.deepEqual(normalizeLodgeDisplay({ version: 1, pins: ['region:gulf','region:gulf','observe:moose'] },
    reloaded.players().find(item => item.id === 2)).pins,['region:gulf'])
})

test('migration retains reached, traversed, observations and historical score scopes separately', () => {
  const lodge = open(disk())
  const player = lodge.players().find(item => item.id === 5)
  const platte = migrationStop(player,6)
  assert.equal(platte.region.key,'platte')
  assert.ok(platte.reached && platte.traversed)
  assert.deepEqual(platte.observed.map(row => row.id).sort(),['canada-goose','crane','mallard'])
  assert.ok(platte.honors.some(honor => honor.id === 'platte-traversal'))
  assert.equal(migrationStop(player,7).traversed,false)
  const mountain = migrationStop(player,14)
  assert.equal(mountain.reached,false)
  assert.equal(mountain.metres,0)
  assert.equal(mountain.observed.length,0)
  assert.equal(completeMigrations(player),0)
  const records = lodge.personalEntries(5)
  assert.equal(records.filter(entry => entry.territoryKey === 'platte' && entry.course === courseRuleset)[0].score,9091)
  assert.equal(records.filter(entry => entry.territoryKey === 'platte' && entry.course === legacyMigrationRuleset)[0].score,23191)
  const full = lodge.players().find(item => item.id === 8)
  assert.equal(full.migration.farthest,expeditionRegions.length)
  assert.equal(completeMigrations(full),6)
  const almost = { ...full, migration: { ...full.migration, duration: 449.9 }, progression: { ...full.progression, migrations: 0 } }
  assert.equal(migrationStop(almost,14).reached,true)
  assert.equal(migrationStop(almost,14).traversed,false)
  assert.equal(completeMigrations(almost),0)
})

test('equipment room uses real ownership, preserves outfits and ignores locked favorites', () => {
  const lodge = open(disk())
  const equipment = displayEquipment(lodge.players().find(item => item.id === 5))
  assert.equal(equipment.total,154)
  assert.deepEqual(equipment.favorites.map(item => item.id),['brass-collar'])
  assert.equal(equipment.recent.length,0)
  assert.equal(equipment.outfits.length,1)
  assert.ok(equipment.outfits[0].items.some(item => item.id === 'canvas-vest'))
})

test('a qualifying hunt upgrades the building once, never changes scored results, and records only earned gear', () => {
  const db = disk()
  const lodge = open(db)
  const tracker = lodge.beginRun()
  const run = hunt()
  const result = lodge.finalize(9,tracker,run,'stream')
  assert.equal(result.lodge.tier,lodgeTiers[1])
  assert.equal(result.score,score(run))
  assert.equal(lodge.finalize(9,tracker,run,'stream'),null)
  const reloaded = open(db)
  const player = reloaded.players().find(item => item.id === 9)
  assert.equal(careerStanding(player.career).level,11)
  assert.deepEqual(player.lodgeDisplay.recentGear,result.gear.map(item => item.id).slice(0,6))
  assert.equal(reloaded.finalize(9,reloaded.beginRun(),run,'stream').lodge.tier,null)
})

test('the Master Hunter tribute requires the Phase 06 receipt, is awarded once and remains locked in practice', () => {
  const db = disk(nearMasterHunter())
  const lodge = open(db)
  const tierV = lodge.current()
  assert.equal(lodgeProgress(tierV).tier.id,'legendary')
  assert.ok(!lodgeProgress(tierV).upgrades.some(up => up.id === 'master-hunter-tribute'))
  const report = lodge.finalize(1,lodge.beginRun(),hunt(),'stream')
  assert.ok(report.boyd)
  assert.ok(report.lodge.upgrades.some(up => up.id === 'master-hunter-tribute'))
  const saved = open(db)
  assert.ok(displayEquipment(saved.current()).recent.some(item => item.id === masterHunter.signature))
  assert.equal(careerLine(saved.current()), 'Master Hunter · Level 100')
  assert.ok(lodgeProgress(saved.current()).upgrades.some(up => up.id === 'master-hunter-tribute'))
  assert.equal(trophyFor(saved.current(),'rank:master-hunter').badge,'Career milestone')
  assert.equal(saved.finalize(1,saved.beginRun(),hunt(),'stream').lodge.upgrades.length,0)

  const production = db.getItem(saveKey)
  const practice = openLodge(() => db, undefined, { practice: true })
  assert.equal(lodgeProgress(practice.current()).tier.id,'shack')
  assert.equal(practice.toggleTrophy(1,'region:gulf'),false)
  assert.equal(practice.finalize(1,practice.beginRun(),hunt(),'stream').lodge,null)
  assert.equal(db.getItem(saveKey),production)
  assert.deepEqual(JSON.parse(db.getItem(practiceSaveKey)).players[0].lodgeDisplay.pins,[])

  const unqualified = open(disk()).players().find(item => item.id === 7)
  assert.equal(careerStanding(unqualified.career).level,100)
  assert.equal(careerLine(unqualified), 'Level 100 · qualification pending')
  assert.ok(!lodgeProgress(unqualified).upgrades.some(up => up.kind === 'boyd'))
  assert.equal(trophyFor(unqualified,'rank:master-hunter'),null)
  assert.ok(localHonors.length > 600)
})
