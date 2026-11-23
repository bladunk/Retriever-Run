import assert from 'node:assert/strict'
import test from 'node:test'
import { restoreEnrollment } from '../src/camp-onboarding.js'
import { applyRunXP, careerStanding, dogRanks, levelFromXP, normalizeCareer, promotionRequirements, runXP, xpAt } from '../src/career.js'
import { firstContact } from '../src/collision.js'
import { createRunStatistics } from '../src/field-stats.js'
import { fieldHonors, hallOfShame } from '../src/honors.js'
import { classicGear, kennelItems } from '../src/kennel-catalog.js'
import { tintLabradorCoat, gearAppearance } from '../src/kennel-material.js'
import { openLodge, practiceSaveKey, saveKey, saveVersion } from '../src/lodge-save.js'
import { act, advance, createCourse, newRun } from '../src/runner.js'
import { MeshStandardMaterial } from 'three'

function disk(initial) {
  const records = new Map(Object.entries(initial ?? {}).map(([key, data]) => [key, JSON.stringify(data)]))
  return { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value) }
}

const open = storage => openLodge(() => storage)
const fixture = (extras = {}) => ({
  duration: 38, distance: 499.9, jumpClears: 2, slidesCleared: 3, geese: 1,
  treats: 12, ducks: 2, pheasants: 1, ...extras,
})

test('career rewards crossed distance bands and validated events, with one best and one first honor', () => {
  const earned = [{ patch: fieldHonors[0], level: 0 }, { patch: fieldHonors[1], level: 1 },
    { patch: hallOfShame[0], level: 0 }]
  const expected = 15 + 32 + 10 + 15 + 15 + 12 + 54 + 50 + 45
  assert.equal(runXP(fixture(), ['score', 'distance', 'duration'], earned), expected)
  assert.equal(runXP(fixture({ distance: 500 }), ['score'], earned), expected + 8)
  assert.equal(runXP(fixture({ duration: 1.999 }), ['score'], earned), 0)
  assert.equal(runXP(fixture({ jumpClears: 0, slidesCleared: 0, jumps: 900, slides: 400 }), ['score'], earned), expected - 25)
})

const date = '2026-11-20T08:00:00Z'
const allHonors = () => Object.fromEntries(fieldHonors.map(patch => [patch.id, patch.goals.map(() => date)]))
const fullRecord = () => ({ patches: allHonors(), records: { duration: 300 }, stats: { ducks: 55, pheasants: 45 } })

test('thresholds and gear gates assign every major rank and preserve continuous levels beyond 100', () => {
  assert.deepEqual(dogRanks.map(rank => rank.level), [1, 10, 25, 50, 100])
  for (let i = 1; i < dogRanks.length; i++) {
    const rank = dogRanks[i]
    assert.equal(levelFromXP(xpAt(rank.level) - 1), rank.level - 1)
    assert.equal(kennelItems.find(item => item.id === rank.reward).rank, rank.id)
    const career = normalizeCareer({ xp: xpAt(rank.level) - 16, rank: dogRanks[i - 1].id })
    const clear = fixture({ distance: 12, jumpClears: 0, slidesCleared: 0, geese: 0, treats: 0, ducks: 0, pheasants: 0 })
    assert.equal(applyRunXP(career, 1, clear, [], [], fullRecord()).after.rank, dogRanks[i - 1])
    assert.equal(applyRunXP(career, 2, clear, [], [], fullRecord()).after.rank, rank)
    assert.deepEqual(career.promotions, [rank.id])
  }
  for (const level of [2, 5, 13, 50, 115, 1_000, 100_000]) {
    assert.equal(levelFromXP(xpAt(level)), level)
    assert.equal(levelFromXP(xpAt(level + 1) - 1), level)
  }
  assert.equal(levelFromXP(NaN), 1)
})

test('experience keeps accumulating while honors block promotion, then ranks award in order once', () => {
  const career = normalizeCareer({ xp: xpAt(100) })
  const player = fullRecord()
  delete player.patches['clean-paws']
  player.patches['timber-jumper'] = [date]
  player.patches['low-rider'] = [date, date]
  player.stats.pheasants--
  player.records.duration--
  let change = applyRunXP(career, 1, fixture(), [], [], player)
  assert.ok(change.after.xp > change.before.xp && change.after.level >= 100)
  assert.deepEqual(career.promotions, ['junior'])
  assert.deepEqual(promotionRequirements(dogRanks[2], player, change.after.level)
    .filter(requirement => !requirement.met).map(requirement => requirement.label), ['Clean Paws · one 2-minute run'])
  player.patches['clean-paws'] = [date]
  change = applyRunXP(career, 2, fixture(), [], [], player)
  assert.equal(change.after.rank.id, 'master')
  assert.deepEqual(career.promotions, ['junior', 'seasoned', 'master'])
  assert.deepEqual(promotionRequirements(dogRanks[4], player, change.after.level)
    .filter(requirement => !requirement.met).map(requirement => requirement.label),
  ['Gold obstacle honors', 'Longest run · seconds', 'Lifetime duck and pheasant retrieves'])
  const zero = applyRunXP(career, 3, fixture({ duration: 1 }), [], [], fullRecord())
  assert.equal(zero.earned, 0)
  assert.equal(zero.after.rank.id, 'master')
  assert.equal(applyRunXP(career, 4, fixture(), [], [], fullRecord()).after.rank.id, 'legend')
  assert.equal(applyRunXP(career, 4, fixture(), [], [], fullRecord()), null)
  assert.equal(applyRunXP(career, 3, fixture(), [], [], fullRecord()), null)
  assert.deepEqual(normalizeCareer(career).promotions, ['junior', 'seasoned', 'master', 'legend'])

  const fresh = normalizeCareer({ xp: xpAt(100) })
  assert.equal(applyRunXP(fresh, 1, fixture(), [], [], fullRecord()).after.rank.id, 'legend')
  assert.deepEqual(fresh.promotions, ['junior', 'seasoned', 'master', 'legend'])
})

test('the first creek pays XP for a swept jump clearance once, including if the detector is called twice', () => {
  const course = createCourse(5)
  course()
  const creek = course().entities.find(item => item.type === 'stream')
  const ramp = newRun()
  const stats = createRunStatistics()
  let jumped = false
  while (ramp.distance < creek.distance + 5) {
    if (!jumped && creek.distance - ramp.distance <= ramp.speed * .46) {
      assert.ok(act(ramp, 'jump'))
      jumped = true
    }
    const before = { ...ramp }
    advance(ramp, 1 / 120)
    assert.equal(firstContact(before, ramp, [creek], {}), undefined)
    if (stats.passed(before, ramp, creek)) assert.equal(stats.passed(before, ramp, creek), false)
  }
  assert.equal(stats.preview(ramp).jumpClears, 1)
  assert.equal(stats.preview(ramp).logs, 0)
})

const finalRun = { ...newRun(), elapsed: 9, distance: 100, scoreBonus: 10 }
test('run IDs keep stats, XP, and promotion grants together through duplicate finish and reload', () => {
  const storage = disk({ [saveKey]: { version: saveVersion, players: [{ id: 1, enrollment: 'guest',
    patches: { 'marathon': [date], 'clean-paws': [date] },
    stats: { runs: 1, distance: 10_000, playtime: 600 }, records: { duration: 120 },
    career: { xp: xpAt(10) - 10 } }] } })
  let lodge = open(storage)
  const player = lodge.current()
  const tracker = lodge.beginRun()
  tracker.pickup('treat')
  const report = lodge.finalize(player.id, tracker, finalRun, 'stream')
  assert.equal(report.career.earned, 119)
  assert.equal(report.career.after.rank.id, 'junior')
  assert.ok(report.gear.some(item => item.id === 'junior-collar'))
  assert.equal(lodge.finalize(player.id, tracker, finalRun, 'stream'), null)

  lodge = open(storage)
  assert.equal(lodge.finalize(player.id, createRunStatistics(report.id), finalRun, 'stream'), null)
  assert.equal(lodge.current().stats.runs, 2)
  assert.deepEqual(lodge.current().career.promotions, ['junior'])
  assert.ok(lodge.equip('collar', 'junior-collar'))
  lodge.acknowledgePromotion('junior')
  const incomplete = lodge.beginRun()
  const committed = lodge.current().career.xp
  lodge = open(storage)
  assert.equal(lodge.current().career.xp, committed)
  assert.equal(lodge.current().kennel.equipment.collar, 'junior-collar')
  assert.deepEqual(lodge.current().career.promotions, [])
  assert.ok(incomplete.runId > report.id)
})

test('storage errors keep the run idempotent in memory and practice uses its own save', () => {
  const storage = disk()
  const draft = openLodge(() => ({ getItem: storage.getItem, setItem() { throw Error('quota') } }))
  const tracker = draft.beginRun()
  assert.ok(draft.finalize(1, tracker, finalRun, 'stream').career.earned)
  assert.equal(draft.finalize(1, createRunStatistics(tracker.runId), finalRun, 'stream'), null)
  assert.equal(open(storage).current().career.xp, 0)

  const practice = openLodge(() => storage, undefined, { practice: true })
  assert.equal(practice.finalize(1, practice.beginRun(), finalRun, 'stream').career, null)
  assert.equal(JSON.parse(storage.getItem(practiceSaveKey)).players[0].stats.runs, 1)
  assert.equal(JSON.parse(storage.getItem(practiceSaveKey)).players[0].career.xp, 0)
  assert.equal(storage.getItem(saveKey), null)
})

test('4.2 migration preserves profiles and earned gear, credits reliable totals once, and rejects malformed cosmetics', () => {
  const storage = disk({ [saveKey]: { version: 1, active: 3, nextRun: 22, nextPlayer: 4, players: [
    { id: 3, nickname: 'Old Moss', profile: { best: 9200, farthest: 2000, retrieves: 4, outfit: 'marsh', musicVolume: .15 },
      stats: { runs: 25, distance: 28000, jumps: 9999 }, patches: { 'first-fetch': ['2026-11-19T08:00:00Z'] } },
    { id: 1, nickname: 'Birch Creek', profile: { best: 99 } },
  ] } })
  let lodge = open(storage)
  let player = lodge.current()
  assert.equal(player.enrollment, 'returning')
  assert.equal(player.nickname, 'Old Moss')
  assert.equal(player.profile.best, 9200)
  assert.equal(player.profile.musicVolume, .15)
  assert.equal(player.stats.jumps, 9999)
  assert.equal(player.patches['first-fetch'].length, 1)
  assert.equal(player.career.xp, 1000)
  assert.equal(player.kennel.equipment.collar, 'marsh-bandana')
  assert.ok(lodge.equip('coat', 'fox-red'))
  assert.ok(lodge.equip('vest', 'canvas-vest'))
  assert.equal(lodge.equip('coat', 'chocolate'), false)
  assert.equal(lodge.equip('missing', 'item'), false)
  const migrated = JSON.parse(storage.getItem(saveKey))
  assert.equal(migrated.version, saveVersion)
  migrated.players[0].kennel.equipment.vest = 'missing asset'
  storage.setItem(saveKey, JSON.stringify(migrated))
  lodge = open(storage)
  player = lodge.current()
  assert.equal(player.career.xp, 1000)
  assert.deepEqual(player.kennel.equipment, { collar: 'marsh-bandana', coat: 'fox-red', vest: 'no-vest' })
  assert.equal(lodge.players().find(profile => profile.id === 1).nickname, 'Birch Creek')
  lodge.resetGear()
  assert.deepEqual(player.kennel.equipment, classicGear)
  assert.ok(player.kennel.inherited.includes('marsh-bandana'))
})

test('4.3 migration keeps ranks, queues, gear, identities, receipts and ranked entries across commits', () => {
  const campStorage = 'retriever-run.worldwide.v1.test'
  const xp = 34 * (110 + 26 * 33)
  const storage = disk({ [campStorage]: { members: { 5: { identity: 'old-mallard' } },
    queue: [{ profile: 5, owner: 'old-mallard', id: 'fixture-receipt', score: 20_000 }] },
    [saveKey]: { version: 2, active: 5, nextRun: 89, players: [
      { id: 2, nickname: 'Willow Ace', career: { xp: 1070 }, enrollment: 'guest' },
      { id: 3, nickname: 'River Pup', career: { xp: 110 }, enrollment: 'guest' },
      { id: 5, nickname: 'Old Mallard', enrollment: 'worldwide', career: { xp, lastRun: 88, promotions: ['legend'] },
        stats: { runs: 88, distance: 250_000, ducks: 10 }, records: { duration: 195 }, profile: { best: 20_000 },
        patches: { 'first-fetch': [date] },
        kennel: { equipment: { collar: 'master-collar', vest: 'legend-vest', coat: 'chocolate' } } },
    ], entries: [{ id: 88, player: 5, date, score: 20_000, distance: 5000, retrieves: 2 }] } })
  const receipts = storage.getItem(campStorage)
  let lodge = open(storage)
  for (let i = 0; i < 2; i++) {
    const player = lodge.current()
    assert.equal(player.id, 5)
    assert.equal(player.nickname, 'Old Mallard')
    assert.equal(player.enrollment, 'worldwide')
    assert.equal(player.stats.runs, 88)
    assert.equal(player.profile.best, 20_000)
    assert.equal(player.records.duration, 195)
    assert.deepEqual(player.patches['first-fetch'], [date])
    assert.deepEqual(player.kennel.equipment, { collar: 'master-collar', vest: 'legend-vest', coat: 'chocolate' })
    assert.ok(player.kennel.inherited.includes('marsh-vest'))
    assert.ok(player.kennel.inherited.includes('master-vest'))
    assert.equal(player.career.xp, xp)
    assert.equal(player.career.rank, 'legend')
    assert.equal(player.career.legacyRank, 'legend')
    assert.equal(player.career.legacyLevel, 35)
    assert.deepEqual(player.career.promotions, ['legend'])
    assert.ok(careerStanding(player.career).level < 35)
    assert.equal(lodge.board('score')[0].id, 88)
    assert.equal(lodge.players().find(item => item.id === 2).career.rank, 'junior')
    const early = lodge.players().find(item => item.id === 3).career
    assert.equal(early.legacyLevel, 2)
    assert.equal(careerStanding(early).level, 2)
    assert.equal(storage.getItem(campStorage), receipts)
    assert.equal(lodge.beginRun().runId, 89 + i)
    lodge.commit()
    lodge = open(storage)
  }
  lodge.acknowledgePromotion('legend')
  const report = lodge.finalize(5, lodge.beginRun(), finalRun, 'stream')
  assert.equal(report.career.after.rank.id, 'legend')
  assert.deepEqual(open(storage).current().career.promotions, [])
})

test('enrollment resumes an already saved anonymous claim and upgrades a guest without touching progress', () => {
  const storage = disk()
  const lodge = open(storage)
  assert.equal(lodge.current().enrollment, null)
  lodge.enroll(1, 'Guest Reed', 'guest')
  lodge.finalize(1, lodge.beginRun(), finalRun, 'stream')
  const xp = lodge.current().career.xp
  restoreEnrollment(lodge, { member: () => ({ identity: 'persisted-identity', nickname: 'Tidal Reed' }) })
  const player = open(storage).current()
  assert.equal(player.nickname, 'Tidal Reed')
  assert.equal(player.enrollment, 'worldwide')
  assert.equal(player.career.xp, xp)
  assert.equal(player.stats.runs, 1)
  const legacy = open(disk({ [saveKey]: { version: 1, players: [{ id: 1, nickname: 'Offline Player' }] } }))
  restoreEnrollment(legacy, { member: () => ({ identity: 'same-old-id', nickname: 'Different public name' }) })
  assert.equal(legacy.current().nickname, 'Offline Player')
})

test('the Labrador coat changes independently of fitted vest equipment', () => {
  const material = new MeshStandardMaterial()
  const tint = tintLabradorCoat(material)
  const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>',
    fragmentShader: '#include <map_fragment>\n#include <roughnessmap_fragment>' }
  material.onBeforeCompile(shader)
  assert.match(shader.fragmentShader, /naturalCoat/)
  const gear = gearAppearance({ collar: 'brass-collar', coat: 'chocolate', vest: 'blaze-vest' })
  assert.ok(gear.collar.buckle)
  tint(gear.coat)
  assert.equal(material.color.getHex(), gear.coat.color)
  assert.equal(shader.uniforms.coatCream.value, 0)
  tint(gearAppearance({ coat: 'cream' }).coat)
  assert.ok(shader.uniforms.coatCream.value > 0)
})


test('an unsupported Marsh Legend field cannot promote or unlock gear, and practice never inherits its journal', () => {
  const xp = xpAt(102)
  const storage = disk({ [saveKey]: { version: 3, active: 1, players: [{ id: 1,
    profile: { best: 2215, quality: 'low' }, career: { xp, rank: 'legend', promotions: ['legend'] },
    stats: { runs: 1, playtime: 4, distance: 20_000, pheasants: 300 }, records: { duration: 300 },
  }] } })
  const lodge = open(storage)
  const player = lodge.current()
  assert.equal(player.career.rank, 'pup')
  assert.equal(player.career.reviewRank, 'legend')
  assert.equal(player.career.xp, xp)
  assert.equal(player.stats.pheasants, 300)
  assert.equal(player.profile.best, 2215)
  assert.deepEqual(player.career.promotions, [])
  assert.equal(lodge.equip('vest', 'legend-vest'), false)
  const report = lodge.finalize(1, lodge.beginRun(), finalRun, 'stream')
  assert.deepEqual(report.earned, [])
  assert.equal(report.career.after.rank.id, 'pup')
  const live = storage.getItem(saveKey)
  const practice = openLodge(() => storage, undefined, { practice: true })
  assert.equal(practice.current().profile.quality, 'low')
  assert.equal(practice.current().profile.best, 0)
  assert.equal(practice.current().career.xp, 0)
  assert.equal(practice.finalize(1, practice.beginRun(), finalRun, 'stream').practice, true)
  assert.equal(storage.getItem(saveKey), live)
})
