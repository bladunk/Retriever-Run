import assert from 'node:assert/strict'
import test from 'node:test'
import { nearMasterHunter, fixtureDate } from '../scripts/career-fixtures.mjs'
import { surveyCareers } from '../scripts/career-survey.mjs'
import { applyRunXP, careerStanding, dogRanks, levelFromXP, normalizeCareer, runXP, xpAt } from '../src/career.js'
import { firstContact } from '../src/collision.js'
import { honorById, honorMetrics, honors, localHonors } from '../src/field-honors.js'
import { createRunStatistics } from '../src/field-stats.js'
import { gearRequirement, kennelItems, ownedGear, unlocked } from '../src/kennel-catalog.js'
import { openLodge, saveKey, saveVersion } from '../src/lodge-save.js'
import { masterHunter } from '../src/master-hunter.js'
import { disposeModel } from '../src/model-disposal.js'
import { awardFieldHonors, masterHunterChecks, progressionMetrics } from '../src/progression.js'
import { act, advance, newRun, score } from '../src/runner.js'
import { courseRuleset } from '../src/ruleset.js'
import { fieldSpecies, habitatEncounters } from '../src/wildlife-catalog.js'
import { normalizeWildlife } from '../src/wildlife-journal.js'
import { BoxGeometry, Group, InstancedMesh, Mesh, MeshBasicMaterial, Texture } from 'three'

function disk(fixture) {
  const values = new Map(fixture ? [[saveKey, JSON.stringify(fixture)]] : [])
  return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}

const open = storage => openLodge(() => storage, () => new Date(fixtureDate))
const shortHunt = { ...newRun(), elapsed: 9, distance: 113, scoreBonus: 11 }
const empty = () => open(disk()).current()

test('all 100 thresholds are strictly increasing and assign the ten ranks exactly', () => {
  assert.equal(xpAt(1), 0)
  assert.equal(levelFromXP(NaN), 1)
  assert.equal(levelFromXP(xpAt(100) * 3), 100)
  for (let level = 1; level <= 100; level++) {
    if (level > 1) assert.equal(levelFromXP(xpAt(level) - 1), level - 1)
    assert.equal(levelFromXP(xpAt(level)), level)
    assert.equal(careerStanding({ xp: xpAt(level) }).rank, dogRanks.findLast(rank => rank.level <= level))
  }
  assert.deepEqual(dogRanks.map(rank => rank.level), [1, 11, 21, 31, 41, 51, 61, 71, 81, 100])
})

test('sustained skilled hunts beat short-run farming across the seeded XP survey', () => {
  const normal = runXP({ duration: 120, distance: 1800, score: 4500, ducks: 2, jumpClears: 7, slidesCleared: 3 })
  const reset = 30 * runXP({ duration: 4, distance: 48, score: 120 }, ['score'], 5)
  assert.ok(normal > reset)
  assert.equal(runXP({ duration: 1.9, score: 99_999 }, ['score'], 100), 0)
  const career = normalizeCareer({})
  assert.equal(applyRunXP(career, 22, { duration: 4 }).earned, 3)
  assert.equal(applyRunXP(career, 22, { duration: 400 }), null)
  assert.equal(applyRunXP(career, 21, { duration: 400 }), null)
  const [novice, casual, skilled, exceptional] = surveyCareers()
  assert.ok(casual.levels[100].hours >= 145 && casual.levels[100].hours < 165)
  assert.ok(novice.levels[100].hours > casual.levels[100].hours)
  assert.ok(casual.levels[100].hours > skilled.levels[100].hours)
  assert.ok(skilled.levels[100].hours > exceptional.levels[100].hours)
  assert.ok(exceptional.migrations > skilled.migrations && skilled.migrations > 0)
})

test('every operational Honor points to an implemented counter with valid medal, tier and scope', () => {
  assert.ok(localHonors.length >= 500)
  assert.equal(honors.length - localHonors.length, 25)
  assert.equal(new Set(honors.map(honor => honor.id)).size, honors.length)
  assert.equal(new Set(honors.map(honor => honor.name)).size, honors.length)
  const player = open(disk(nearMasterHunter())).current()
  const metrics = progressionMetrics(player, createRunStatistics().preview(shortHunt))
  for (const honor of honors) {
    assert.equal(honor.reward.medal, honor.tier)
    if (honor.pending) {
      assert.equal(honor.qualifies, false)
      assert.deepEqual(honor.checks, [])
      assert.ok(!Object.hasOwn(player.progression.honors, honor.id))
      continue
    }
    assert.ok(honor.checks.length)
    for (const { key, target } of honor.checks) {
      assert.ok(honorMetrics.has(key), key)
      assert.ok(metrics.has(key), key)
      assert.ok(Number.isFinite(target) && target > 0, honor.id)
    }
    if (/-[234]$/.test(honor.id)) {
      const previous = honorById.get(honor.id.replace(/\d$/, n => Number(n) - 1))
      if (!previous) continue
      for (const [i, check] of honor.checks.entries()) {
        assert.equal(check.key, previous.checks[i].key, honor.id)
        assert.ok(check.target > previous.checks[i].target, honor.id)
      }
    }
  }
})

test('both conditions for a secret must occur in one hunt and completed honors are counted once', () => {
  const player = empty()
  const id = 'secret-under-and-over-1'
  assert.ok(!awardFieldHonors(player, fixtureDate, { jumpClears: 2 }).some(h => h.id === id))
  assert.ok(!awardFieldHonors(player, fixtureDate, { slidesCleared: 1 }).some(h => h.id === id))
  const report = { jumpClears: 2, slidesCleared: 1 }
  assert.ok(awardFieldHonors(player, fixtureDate, report).some(h => h.id === id))
  assert.ok(!awardFieldHonors(player, fixtureDate, report).some(h => h.id === id))
  assert.equal(player.progression.honors[id], fixtureDate)
})

test('wardrobe rewards use real achievements and previewing a locked item changes no ownership', () => {
  assert.equal(new Set(kennelItems.map(item => item.id)).size, kennelItems.length)
  assert.ok(kennelItems.length - 3 >= 125)
  for (const item of kennelItems.filter(gear => gear.honor)) {
    assert.equal(honorById.get(item.honor)?.pending, false, item.id)
    assert.ok(gearRequirement(item).includes(honorById.get(item.honor).name))
  }
  const storage = disk()
  const lodge = open(storage)
  const player = lodge.current()
  const collar = kennelItems.find(item => item.id === 'migration-collar')
  assert.ok(collar)
  const standing = careerStanding(player.career)
  const before = JSON.stringify(player.kennel.equipment)
  assert.equal(unlocked(collar, standing, player.kennel, player.progression), false)
  assert.equal(lodge.equip('collar', collar.id), false)
  assert.equal(lodge.favorite(collar.id), true)
  assert.deepEqual(open(storage).current().kennel.favorites, [collar.id])
  assert.equal(JSON.stringify(player.kennel.equipment), before)
  assert.ok(!ownedGear(player, standing).includes(collar))
})

test('historical discovery credits its evidenced region once without conflating retrieve counts', () => {
  const local = normalizeWildlife({ version: 1, species: {
    mallard: { first: fixtureDate, territory: 'gulf', seen: 4, rare: 50, retrieves: 2 },
    moose: { first: fixtureDate, territory: 'gulf', seen: 2, retrieves: 8 },
  } }, { pheasants: 3 })
  assert.deepEqual(local.species.mallard.regions, { gulf: 1 })
  assert.equal(local.species.mallard.rare, 4)
  assert.deepEqual(local.species.moose.regions, {})
  assert.equal(local.species.moose.retrieves, 0)
  assert.equal(local.species.pheasant.seen, 0)
  assert.equal(local.species.pheasant.retrieves, 3)

  const storage = disk()
  const lodge = open(storage)
  const run = lodge.beginRun()
  for (const [id, species] of habitatEncounters.gulf.flat().entries()) {
    run.observe({ id, species, territory: 'gulf', rarity: 'common' })
    run.observe({ id, species, territory: 'gulf', rarity: 'common' })
  }
  run.pickup('mallard')
  const report = lodge.finalize(1, run, shortHunt, 'stream')
  const player = open(storage).current()
  assert.equal(player.wildlife.species.mallard.seen, 1)
  assert.equal(player.wildlife.species.mallard.retrieves, 1)
  assert.equal(player.wildlife.species.mallard.regions.gulf, 1)
  assert.equal(player.progression.honors['gulf-journal-3'], report.date)
  assert.equal(report.score, score(shortHunt))
  assert.equal(report.course, courseRuleset)
  assert.ok(report.newWildlife.every(id => Object.hasOwn(fieldSpecies, id)))
})

test('Boyd and his kit arrive only at the legitimate qualification crossing and outfits survive switching', () => {
  const storage = disk(nearMasterHunter())
  const lodge = open(storage)
  const player = lodge.current()
  assert.deepEqual(masterHunterChecks(player).filter(check => !check.met).map(check => check.label), ['Career level'])
  assert.equal(lodge.selectBreed('boyd'), false)
  assert.ok(lodge.equip('collar', 'brass-collar'))
  const tracker = lodge.beginRun()
  const report = lodge.finalize(1, tracker, shortHunt, 'stream')
  assert.equal(report.saved, true)
  assert.equal(report.boyd, true)
  assert.equal(report.career.after.level, 100)
  assert.equal(lodge.finalize(1, tracker, shortHunt, 'stream'), null)
  assert.ok(report.gear.some(item => item.id === masterHunter.signature))
  assert.ok(lodge.selectBreed('boyd'))
  assert.equal(player.kennel.equipment.collar, masterHunter.signature)
  assert.equal(lodge.equip('coat', 'cream'), false)
  assert.equal(lodge.equip('collar', masterHunter.bandana), true)
  let reopened = open(storage)
  assert.equal(reopened.current().kennel.breed, 'boyd')
  assert.ok(reopened.selectBreed('lab'))
  assert.equal(reopened.current().kennel.equipment.collar, 'brass-collar')
  assert.ok(reopened.selectBreed('boyd'))
  assert.equal(reopened.current().kennel.equipment.collar, masterHunter.bandana)
  assert.equal(reopened.finalize(1, reopened.beginRun(), shortHunt, 'stream').boyd, false)
  const practice = openLodge(() => storage, undefined, { practice: true })
  const sandbox = practice.finalize(1, practice.beginRun(), shortHunt, 'stream')
  assert.equal(sandbox.career, null)
  assert.deepEqual(sandbox.newHonors, [])
  assert.equal(practice.selectBreed('boyd'), false)
  assert.equal(open(storage).current().progression.boyd, report.date)
})

test('unqualified saved Boyd claims and pending Camp receipts are rejected', () => {
  const lodge = open(disk({ version: saveVersion, players: [{ id: 1,
    career: { xp: xpAt(100) }, kennel: { breed: 'boyd' }, progression: {
      version: 1, boyd: fixtureDate, honors: { 'camp-first-hunt': fixtureDate, 'missing-id': fixtureDate },
    },
  }] }))
  assert.equal(lodge.current().progression.boyd, null)
  assert.deepEqual(lodge.current().progression.honors, {})
  assert.equal(lodge.current().kennel.breed, 'lab')
  assert.equal(lodge.selectBreed('boyd'), false)
})

test('two open tabs finishing sequentially rebase two genuine hunts without duplicating receipts', () => {
  const storage = disk()
  const first = open(storage), second = open(storage)
  const a = first.beginRun(), b = second.beginRun()
  assert.equal(a.runId, b.runId)
  assert.equal(first.finalize(1, a, shortHunt, 'stream').saved, true)
  const report = second.finalize(1, b, shortHunt, 'stream')
  assert.equal(report.saved, true)
  assert.equal(report.id, a.runId + 1)
  assert.equal(second.finalize(1, b, shortHunt, 'stream'), null)
  const player = open(storage).current()
  assert.equal(player.stats.runs, 2)
  assert.equal(player.career.lastRun, report.id)
  assert.equal(player.progression.impacts.stream, 2)
})

test('static dodge credit requires leaving a threatening lane and a confirmed hazard pass', () => {
  const obstacle = { type: 'tree', lane: 0, distance: 55, hazard: true }
  function approach(moveAt) {
    const run = newRun()
    const stats = createRunStatistics()
    let moved = false
    while (run.distance < 61) {
      if (!moved && run.distance >= moveAt) {
        moved = act(run, 'right')
        if (moved) stats.action('right')
      }
      const before = { ...run }
      advance(run, 1 / 120)
      if (firstContact(before, run, [obstacle], {})) break
      stats.passed(before, run, obstacle)
    }
    return stats.finish(run, 'stream').field
  }
  assert.deepEqual(approach(2).clears, {})
  assert.deepEqual(approach(Infinity).clears, {})
  assert.deepEqual(approach(42).clears, { tree: 1 })
})

test('retired dog gear releases its owned instance buffer and each shared resource once', () => {
  const scene = new Group(), root = new Group()
  const mesh = new BoxGeometry()
  const texture = new Texture()
  const material = new MeshBasicMaterial({ map: texture })
  const hardware = new InstancedMesh(mesh, material, 4)
  root.add(hardware, new Mesh(mesh, material))
  scene.add(root)
  const released = new Map()
  for (const resource of [hardware, mesh, material, texture])
    resource.addEventListener('dispose', () => released.set(resource, (released.get(resource) ?? 0) + 1))
  assert.equal(disposeModel({ root }), 0)
  assert.equal(scene.children.length, 0)
  assert.deepEqual([...released.values()], [1, 1, 1, 1])
})
