import assert from 'node:assert/strict'
import test from 'node:test'
import { laneWidth, traceContact } from '../src/collision.js'
import { createRunStatistics } from '../src/field-stats.js'
import { pendingPatches } from '../src/honors.js'
import { boardLimit, openLodge, rankRuns, saveKey, saveVersion } from '../src/lodge-save.js'
import { act, advance, newRun, speedAtTime } from '../src/runner.js'

function memory(initial) {
  let json = initial === undefined ? null : JSON.stringify(initial)
  return {
    getItem(key) { assert.equal(key, saveKey); return json },
    setItem(key, value) { assert.equal(key, saveKey); json = value },
  }
}

const date = () => new Date('2026-11-20T16:12:00Z')

function finish(lodge, props = {}, hazard = 'stream', pickups = [], tracker = createRunStatistics()) {
  const run = { ...newRun(), distance: 110, elapsed: 8, ...props }
  for (const pickup of pickups) tracker.pickup(pickup)
  run.retrieves = tracker.stats.ducks + tracker.stats.pheasants
  return lodge.finalize(lodge.current().id, tracker, run, hazard)
}

test('a 3.3 save keeps historic records, retrieves, outfit and mute settings without inventing runs', () => {
  const legacy = { score: 530, best: 1700, distance: 612, farthest: 1198, streak: 19,
    retrieves: 6, outfit: 'marsh', quality: 'high', comfort: false, musicVolume: 0, wildlifeVolume: .47 }
  const disk = memory(legacy)
  const lodge = openLodge(() => disk, date)
  const { profile, stats, patches } = lodge.current()
  for (const [key, value] of Object.entries(legacy)) assert.equal(profile[key], value)
  assert.equal(stats.runs, 0)
  assert.equal(stats.distance, 0)
  assert.equal(stats.playtime, 0)
  assert.equal(stats.ducks + stats.pheasants, 0)
  assert.deepEqual(patches, {})
  assert.deepEqual(lodge.board('score'), [])
  lodge.commit()
  assert.equal(JSON.parse(disk.getItem(saveKey)).version, saveVersion)
})

test('a completed run stores exact outcomes and unlocks its patches once across reload', () => {
  const disk = memory()
  let lodge = openLodge(() => disk, date)
  const tracker = createRunStatistics()
  tracker.action('jump')
  tracker.action('slide')
  const result = finish(lodge, { distance: 83.34, scoreBonus: 108, elapsed: 9.75, bestStreak: 4 },
    'goose', ['treat', 'mallard', 'pheasant'], tracker)
  assert.equal(result.score, 191)
  assert.equal(result.distance, 83.34)
  assert.equal(result.duration, 9.75)
  assert.equal(result.cause, 'geese')
  assert.equal(result.hazard, 'goose')
  assert.equal(result.treats, 1)
  assert.equal(result.retrieves, 2)
  assert.equal(result.placements.retrieves, 1)
  assert.deepEqual(result.earned.map(({ patch }) => patch.id), ['first-fetch', 'short-leash'])
  assert.equal(finish(lodge, {}, 'goose', [], tracker), null)
  lodge = openLodge(() => disk, date)
  const player = lodge.current()
  assert.equal(player.stats.runs, 1)
  assert.equal(player.stats.deaths, 1)
  assert.equal(player.stats.points, 191)
  assert.equal(player.stats.distance, 83.34)
  assert.equal(player.stats.playtime, 9.75)
  assert.equal(player.stats.ducks, 1)
  assert.equal(player.stats.pheasants, 1)
  assert.equal(player.stats.jumps, 1)
  assert.equal(player.stats.slides, 1)
  assert.deepEqual(player.stats.deathsBy, { water: 0, logs: 0, geese: 1, other: 0 })
  assert.equal(player.profile.retrieves, 2)
  assert.equal(player.profile.streak, 4)
  assert.equal(player.patches['first-fetch'][0], date().toISOString())
  assert.equal(lodge.board('score').length, 1)
})

test('bad patches use exact hazard and early-death streaks, and advanced patches keep tier dates', () => {
  const lodge = openLodge(() => memory(), date)
  for (const hazard of ['stream', 'puddle', 'stream', 'stream']) finish(lodge, {}, hazard)
  assert.equal(lodge.current().stats.sameHazardStreak, 2)
  assert.equal(lodge.current().patches['didnt-learn'], undefined)
  assert.equal(lodge.current().patches['rough-morning'].length, 1)
  finish(lodge, { elapsed: 20 }, 'stream')
  assert.equal(lodge.current().stats.earlyStreak, 0)
  finish(lodge, {}, 'stream')
  finish(lodge, {}, 'stream')
  assert.equal(lodge.current().patches['didnt-learn'].length, 1)
  for (let i = 0; i < 42; i++) finish(lodge, {}, i % 2 ? 'puddle' : 'stream')
  assert.equal(lodge.current().patches['swamp-thing'].length, 1)
  finish(lodge)
  assert.equal(lodge.current().patches['swamp-thing'].length, 2)
  const player = lodge.current()
  const preview = { distance: 70_000, score: 51_000, duration: 121, logs: 0, slidesCleared: 0, geese: 0 }
  const seen = new Map()
  const available = pendingPatches(player, preview, seen).map(({ patch }) => patch.id)
  for (const id of ['marathon', 'clean-paws', 'top-dog', 'marsh-legend']) assert.ok(available.includes(id))
  assert.deepEqual(pendingPatches(player, preview, seen), [])
  assert.equal(player.patches['clean-paws'], undefined)
  const result = finish(lodge, { distance: 70_000, elapsed: 3_200 }, 'fence')
  assert.ok(result.earned.some(({ patch }) => patch.id === 'clean-paws'))
})

function simulate(entity, { lane = 0, start = 95, elapsed = 0, command } = {}) {
  const tracker = createRunStatistics()
  const run = { ...newRun(), distance: start, elapsed, speed: speedAtTime(elapsed), x: lane * laneWidth, lane }
  let dead = false
  let used = false
  while (run.distance < entity.distance + 5) {
    if (!used && command && run.distance >= command[0]) {
      if (act(run, command[1])) tracker.action(command[1])
      used = true
    }
    const before = { ...run }
    advance(run, 1 / 120)
    if (traceContact(before, run, entity)) {
      dead = true
      break
    }
    const credit = tracker.passed(before, run, entity)
    if (credit) assert.equal(tracker.passed(before, run, entity), false)
  }
  return { dead, ...tracker.stats }
}

test('only genuine timed jumps and slides get clearance credit', () => {
  const log = { type: 'log', distance: 100, lane: 0, hazard: true }
  const branch = { type: 'branch', distance: 100, lane: 0, hazard: true, wide: true }
  const jumped = simulate(log, { command: [95, 'jump'] })
  assert.equal(jumped.dead, false)
  assert.equal(jumped.logs, 1)
  assert.equal(jumped.jumps, 1)
  assert.equal(simulate(log, { lane: -1, command: [95, 'jump'] }).logs, 0)
  assert.equal(simulate(log, { command: [99.4, 'jump'] }).logs, 0)
  assert.ok(simulate(log, { command: [95, 'slide'] }).dead)
  assert.equal(simulate(branch, { command: [95, 'slide'] }).slidesCleared, 1)
  assert.equal(simulate({ ...branch, wide: false }, { lane: -1, command: [95, 'slide'] }).slidesCleared, 0)
  const highSpeed = simulate({ ...branch, distance: 609 }, { start: 590, elapsed: 120, command: [598, 'slide'] })
  assert.equal(highSpeed.dead, false)
  assert.equal(highSpeed.slidesCleared, 1)
})

test('diving geese count a duck or lane dodge after clearing the collision window', () => {
  const entity = { type: 'goose', distance: 890, lane: 0, hazard: true, lead: true, safeLane: 1,
    flightSpeed: 22, direction: 1 }
  const opts = { start: 826, elapsed: 58 }
  assert.ok(simulate(entity, opts).dead)
  assert.equal(simulate(entity, { ...opts, lane: 1 }).geese, 0)
  assert.equal(simulate(entity, { ...opts, command: [872, 'right'] }).geese, 1)
  assert.equal(simulate(entity, { ...opts, command: [880, 'slide'] }).geese, 1)
})

test('board ranking is stable, includes distinct category leaders, and follows nickname edits', () => {
  const disk = memory()
  let lodge = openLodge(() => disk, date)
  const first = lodge.current().id
  lodge.rename('Avery')
  const second = lodge.newPlayer('Scout').id
  for (let n = 0; n < 25; n++) finish(lodge, { distance: 110 + n, scoreBonus: 900 })
  lodge.select(first)
  finish(lodge, { distance: 200 }, 'tree', ['mallard', 'pheasant'])
  const report = finish(lodge, { distance: 280 }, 'fence')
  assert.equal(report.placements.score, 0)
  assert.equal(report.placements.distance, 1)
  assert.equal(lodge.board('score').length, boardLimit)
  assert.equal(lodge.board('distance')[0].player, first)
  assert.equal(lodge.board('retrieves')[0].player, first)
  assert.equal(lodge.board('score')[0].player, second)
  lodge.rename('  New name  ')
  lodge = openLodge(() => disk, date)
  assert.equal(lodge.current().nickname, 'New name')
  assert.equal(lodge.nameFor(lodge.board('distance')[0].player), 'New name')
  assert.equal(lodge.current().stats.runs, 2)
  assert.equal(lodge.players().find(player => player.id === second).stats.runs, 25)
  const tie = ids => ids.map(id => ({ id, score: 740, distance: 430.6, retrieves: 1 }))
  assert.deepEqual(rankRuns(tie([7, 1, 2, 5]), 'score').map(entry => entry.id), [1, 2, 5, 7])
})

test('storage errors, fresh reloads and unknown future formats leave the game usable', () => {
  const denied = () => { throw Error('Unavailable') }
  const temporary = openLodge(denied, date)
  const tracker = createRunStatistics()
  tracker.pickup('treat')
  assert.equal(temporary.current().stats.runs, 0)
  assert.equal(finish(temporary).placements.score, 1)
  assert.equal(temporary.current().stats.runs, 1)
  assert.equal(openLodge(denied, date).current().stats.runs, 0)
  const future = memory({ version: saveVersion + 1, data: 'untouched' })
  finish(openLodge(() => future, date))
  assert.equal(JSON.parse(future.getItem(saveKey)).data, 'untouched')
  const full = { getItem() { return null }, setItem() { throw Error('Quota exceeded') } }
  assert.equal(finish(openLodge(() => full, date)).earned.length, 2)
})
