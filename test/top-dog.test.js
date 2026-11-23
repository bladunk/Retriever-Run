import assert from 'node:assert/strict'
import test from 'node:test'
import { restoreEnrollment } from '../src/camp-onboarding.js'
import { applyRunXP, careerStanding, dogRanks, normalizeCareer, runXP, xpAt } from '../src/career.js'
import { firstContact } from '../src/collision.js'
import { createRunStatistics } from '../src/field-stats.js'
import { fieldHonors, hallOfShame } from '../src/honors.js'
import { classicGear, kennelItems } from '../src/kennel-catalog.js'
import { fitKennelMaterial, gearAppearance } from '../src/kennel-material.js'
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
  const expected = 25 + 40 + 10 + 15 + 15 + 24 + 60 + 75 + 50
  assert.equal(runXP(fixture(), ['score', 'distance', 'duration'], earned), expected)
  assert.equal(runXP(fixture({ distance: 500 }), ['score'], earned), expected + 10)
  assert.equal(runXP(fixture({ duration: 1.999 }), ['score'], earned), 0)
  assert.equal(runXP(fixture({ jumpClears: 0, slidesCleared: 0, jumps: 900, slides: 400 }), ['score'], earned), expected - 25)
})

test('the XP curve reaches every rank and stays continuous beyond level fifty', () => {
  for (const rank of dogRanks) {
    assert.equal(careerStanding(xpAt(rank.level)).rank, rank)
    if (rank.level > 1) assert.equal(careerStanding(xpAt(rank.level) - 1).level, rank.level - 1)
    if (rank.reward) assert.equal(kennelItems.find(item => item.id === rank.reward).level, rank.level)
  }
  for (const level of [2, 5, 13, 50, 115, 1_000, 100_000]) {
    assert.equal(careerStanding(xpAt(level)).level, level)
    assert.equal(careerStanding(xpAt(level + 1) - 1).level, level)
  }
  assert.equal(careerStanding(NaN).level, 1)
  const career = normalizeCareer({ xp: xpAt(6) - 2 })
  const change = applyRunXP(career, 42, fixture({ distance: 600_000 }), [], [])
  assert.ok(change.after.level >= 35)
  assert.deepEqual(career.promotions, ['junior', 'seasoned', 'master', 'legend'])
  assert.equal(applyRunXP(career, 42, fixture(), [], []), null)
  assert.equal(applyRunXP(career, 41, fixture(), [], []), null)
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
  const storage = disk({ [saveKey]: { version: 2, players: [{ id: 1, enrollment: 'guest',
    career: { xp: xpAt(6) - 10 } }] } })
  let lodge = open(storage)
  const player = lodge.current()
  const tracker = lodge.beginRun()
  tracker.pickup('treat')
  const report = lodge.finalize(player.id, tracker, finalRun, 'stream')
  assert.equal(report.career.earned, 162)
  assert.equal(report.career.after.rank.id, 'junior')
  assert.ok(report.gear.some(item => item.id === 'junior-collar'))
  assert.equal(lodge.finalize(player.id, tracker, finalRun, 'stream'), null)

  lodge = open(storage)
  assert.equal(lodge.finalize(player.id, createRunStatistics(report.id), finalRun, 'stream'), null)
  assert.equal(lodge.current().stats.runs, 1)
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

test('a fitted vest and coat switch shader uniforms in one existing material without replacing resources', () => {
  const material = new MeshStandardMaterial()
  const dress = fitKennelMaterial(material)
  const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>', fragmentShader: '#include <color_fragment>' }
  material.onBeforeCompile(shader)
  assert.match(shader.vertexShader, /position.xzy/)
  assert.match(shader.fragmentShader, /kennelVest/)
  let disposals = 0
  material.addEventListener('dispose', () => disposals++)
  const gear = gearAppearance({ collar: 'brass-collar', coat: 'chocolate', vest: 'blaze-vest' })
  assert.ok(gear.collar.buckle)
  dress(gear)
  assert.equal(material.color.getHex(), gear.coat.color)
  assert.equal(shader.uniforms.kennelVest.value, 1)
  assert.equal(shader.uniforms.kennelFabric.value.getHex(), gear.vest.color)
  dress(gearAppearance({ collar: 'unused', coat: 'cream', vest: 'unused' }))
  assert.equal(shader.uniforms.kennelVest.value, 0)
  assert.ok(shader.uniforms.kennelCream.value > 0)
  assert.equal(disposals, 0)
})
