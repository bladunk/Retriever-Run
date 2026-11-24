import assert from 'node:assert/strict'
import { test } from 'node:test'
import { campfireLines } from '../src/campfire-lines.js'
import { createCampfire, heckleHistoryKey, recentHeckleLimit } from '../src/campfire.js'
import { fieldHonors, honorProgress } from '../src/honors.js'
import { createRunControls } from '../src/run-controls.js'
import { act, advance, jumpDuration, newRun } from '../src/runner.js'
import { seededRandom } from '../src/trail.js'

const familiar = { duration: 41, priorRuns: 12, score: 300, previousBest: 540, bestStreak: 0 }

test('every original heckle is distinct and reachable in its intended context', () => {
  const all = Object.values(campfireLines).flat()
  const distinct = new Set(all.map(line => line.toLowerCase().replace(/[^a-z0-9]/g, '')))
  assert.equal(all.length, 205)
  assert.equal(distinct.size, all.length)
  assert.ok(all.every(line => line.length <= 110))
  const contexts = {
    tree: { hazard: 'fallen' }, log: { hazard: 'root' }, water: { hazard: 'washout' },
    tractor: { hazard: 'tractor' }, goose: { hazard: 'goose' }, jump: { jump: true },
    slide: { slide: true }, lane: { changingLane: true }, short: { duration: 3 },
    rookie: { priorRuns: 0 }, long: { duration: 180 }, best: { score: 500 },
    rival: { rivalGap: .08 }, combo: { bestStreak: 22 }, camp: {},
    legend: { duration: 296 }, arrivedNorth: { duration: 243 }, nearNorth: { duration: 237 },
    postedTimber: { postedTimber: true }, downedTimber: { hazard: 'fallen' },
    treatDetour: { recentTreat: true }, freshStage: { duration: 61 }, slowFinish: { hazard: 'root', duration: 171 },
  }
  for (const [category, context] of Object.entries(contexts)) {
    const campfire = createCampfire(() => null, seededRandom(5862))
    const seen = new Set()
    for (let run = 0; run < 120; run++) {
      const joke = campfire.choose({ ...familiar, ...context })
      if (joke.category === category) seen.add(joke.line)
    }
    assert.deepEqual(seen, new Set(campfireLines[category]))
  }
})

test('bounded heckle recency survives reloads and failed or corrupted storage', () => {
  const storage = new Map()
  const disk = () => ({ getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) })
  const context = { ...familiar, hazard: 'stream', duration: 4, priorRuns: 1, jump: true }
  const service = createCampfire(disk, seededRandom(827))
  const first = Array.from({ length: recentHeckleLimit }, () => service.choose(context).id)
  assert.equal(new Set(first).size, first.length)
  const second = createCampfire(disk, seededRandom(827)).choose(context).id
  assert.ok(!first.includes(second))
  const history = JSON.parse(storage.get(heckleHistoryKey))
  assert.equal(history.length, recentHeckleLimit)
  assert.equal(history[0], second)
  storage.set(heckleHistoryKey, '{"corrupt"')
  assert.ok(createCampfire(disk).choose(context).line)
  const denied = createCampfire(() => { throw new Error('disk denied') }, () => 0)
  assert.notEqual(denied.choose(context).id, denied.choose(context).id)
})

test('a late jump buffer survives lane steering and fires once on recovery', () => {
  const run = { ...newRun(), slide: .15 }
  const controls = createRunControls()
  const actions = []
  const record = action => actions.push(action)
  controls.enqueue('jump')
  controls.enqueue('right')
  controls.apply(run, record)
  assert.deepEqual(actions, ['right'])
  assert.equal(run.lane, 1)
  assert.equal(act(run, 'right'), false)
  for (let i = 0; i < 20; i++) {
    advance(run, 1 / 120)
    controls.apply(run, record)
  }
  assert.deepEqual(actions, ['right', 'jump'])
  assert.ok(run.jump > jumpDuration - .03)
  controls.enqueue('slide')
  controls.reset()
  controls.apply(run, record)
  assert.deepEqual(actions, ['right', 'jump'])
})

test('Flyway Traveler includes the saved territory when showing progress to its next tier', () => {
  const patch = fieldHonors.find(item => item.id === 'flyway-traveler')
  const player = { stats: {}, records: {}, profile: { best: 14 }, migration: { farthest: 5 },
    patches: { 'flyway-traveler': ['2026-11-23T00:00:00.000Z'] } }
  assert.deepEqual(honorProgress(patch, player), { earned: player.patches[patch.id], goal: 7, value: 5 })
})
