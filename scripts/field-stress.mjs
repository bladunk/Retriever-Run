import assert from 'node:assert/strict'
import { createCourse, newRun, advance, collect, reactionWindow, score, touchesPickup } from '../src/runner.js'
import { firstContact, obstacleVolumes, playerVolumes } from '../src/collision.js'
import { diveAge, diveExit } from '../src/dive.js'
import { createFixedClock, samplePose } from '../src/timing.js'
import { seededRandom } from '../src/trail.js'
import { createRunControls } from '../src/run-controls.js'
import { createRunStatistics } from '../src/field-stats.js'
import { runXP, xpAt } from '../src/career.js'

const wallPatterns = [
  [1 / 60],
  [1 / 120, 1 / 30, 1 / 90, 1 / 54],
  [1 / 12, .24, 1 / 59, .87, 1 / 44, .045],
]
const estimateCareer = process.argv.includes('career')
const samples = { exploratory: [], guided: [], endurance: [] }
const moves = ['left', 'right', 'jump', 'slide']
const hazardKinds = new Set()
const deaths = {}
const totals = { sessions: 0, guided: 0, freePlay: 0, deaths: 0, survived: 0, ticks: 0, pickups: 0,
  jumps: 0, slides: 0, pauses: 0, longest: [] }

function session(seed, duration, guided, policy, weather, pauseInterval) {
  const rng = seededRandom(seed ^ 0xaffb320a)
  const course = createCourse(seed)
  const run = newRun()
  const clock = createFixedClock()
  const controls = createRunControls()
  const statistics = createRunStatistics()
  const rows = []
  const active = []
  const picked = new WeakSet()
  const previous = {}
  const hit = {}
  let upcoming = course()
  let released = -1
  let laneReady = 0
  let usedGate = false
  let nextInput = rng() * 2.65
  let nextPause = pauseInterval || Infinity
  let killer
  let points = 0
  let retrieves = 0
  let longestAlive = 0

  function performed(action) {
    statistics.action(action)
    if (action === 'jump') totals.jumps++
    if (action === 'slide') totals.slides++
  }

  function populate() {
    while (upcoming.at < run.distance + 102) {
      rows.push(upcoming)
      active.push(...upcoming.entities)
      upcoming = course()
    }
  }

  function tick(dt) {
    if (run.elapsed >= duration) return false
    if (guided) {
      const next = rows[0]
      if (next) {
        if (run.elapsed - released >= reactionWindow && run.lane !== next.lane && run.elapsed >= laneReady) {
          controls.enqueue(run.lane < next.lane ? 'right' : 'left')
          laneReady = run.elapsed + .16
        }
        if (!usedGate && next.gate && next.at - run.distance <= run.speed * (next.gate.duration / 2 - policy)) {
          usedGate = true
          controls.enqueue(next.entities[0].type === 'branch' ? 'slide' : 'jump')
        }
      }
    } else if (run.elapsed >= nextInput) {
      // Idle, repeated, alternating and slightly diagonal touch inputs come
      // from the seeded policy. Browser gesture events are tested separately.
      const action = moves[Math.floor(rng() * moves.length)]
      if (policy !== 0) controls.enqueue(action)
      if (policy > 1 && rng() < .28) {
        controls.enqueue(action)
        controls.enqueue(moves[Math.floor(rng() * moves.length)])
      }
      nextInput += .05 + rng() * .85
    }
    controls.apply(run, performed)
    samplePose(previous, run, run, 1)
    advance(run, dt)
    totals.ticks++
    for (const item of active) {
      if (item.hazard && item.distance >= previous.distance - 3 && item.distance <= run.distance + 3) hazardKinds.add(item.type)
    }
    killer = firstContact(previous, run, active, hit)
    if (killer) {
      assert.ok(hit.fraction >= 0 && hit.fraction <= 1)
      assert.ok(obstacleVolumes(killer).some(part => part.name === hit.solid))
      assert.ok(playerVolumes(killer.type === 'stream' || killer.type === 'puddle').some(part => part.name === hit.part))
      samplePose(run, previous, run, hit.fraction)
      assert.equal(run.distance, hit.distance)
      assert.equal(hit.type, killer.type)
      return false
    }

    for (let index = active.length - 1; index >= 0; index--) {
      const item = active[index]
      const ahead = item.distance - run.distance
      if (estimateCareer && item.hazard) statistics.passed(previous, run, item)
      if (item.type === 'goose') {
        if (diveAge(item, run.distance) > diveExit) active.splice(index, 1)
        continue
      }
      if (touchesPickup(run, item)) {
        assert.equal(picked.has(item), false)
        picked.add(item)
        const pickup = collect(run, item.type)
        statistics.pickup(item.type)
        points += pickup.points
        retrieves += Number(item.type === 'mallard' || item.type === 'pheasant')
        totals.pickups++
        active.splice(index, 1)
      } else if (ahead < (item.type === 'treat' ? -1 : -8)) {
        if (item.type === 'treat') run.streak = 0
        active.splice(index, 1)
      }
    }

    const next = rows[0]
    if (next && run.distance > (next.end ?? next.at) + 1.58) {
      rows.shift()
      released = run.elapsed
      usedGate = false
    }
    if (run.elapsed >= longestAlive + 30) {
      longestAlive = run.elapsed
      assert.ok(active.length < 108)
      assert.ok(run.speed < 29 && run.distance >= 0)
    }
  }

  let frame = 0
  while (!killer && run.elapsed < duration) {
    if (run.elapsed >= nextPause) {
      const frozen = { ...run }
      clock.reset()
      controls.reset()
      clock.advance(0, () => assert.fail('pause replayed a gameplay tick'))
      assert.deepEqual(run, frozen)
      totals.pauses++
      nextPause += pauseInterval
    }
    populate()
    clock.advance(weather[frame++ % weather.length], tick)
  }
  assert.equal(score(run), Math.floor(run.distance) + points)
  assert.equal(run.retrieves, retrieves)
  assert.ok(Number.isSafeInteger(score(run)) && score(run) >= 0)
  totals.sessions++
  totals[guided ? 'guided' : 'freePlay']++
  if (killer) {
    const finalized = statistics.finish(run, killer.type)
    assert.equal(finalized.score, score(run))
    assert.equal(finalized.retrieves, retrieves)
    assert.equal(statistics.finish(run, killer.type), null)
    totals.deaths++
    deaths[killer.type] = (deaths[killer.type] ?? 0) + 1
  } else totals.survived++
  if (estimateCareer) {
    const group = !guided ? 'exploratory' : duration >= 300 ? 'endurance' : 'guided'
    const result = statistics.preview(run)
    samples[group].push({ ...result, xp: runXP(result, [], []) })
  }
  return { elapsed: run.elapsed, distance: run.distance, killer: killer ? { ...hit } : null }
}

const count = Number(process.argv[2] ?? 10000)
const fromSeed = Number(process.argv[3] ?? 0)
assert.ok(Number.isSafeInteger(count) && count >= 4)
assert.ok(Number.isSafeInteger(fromSeed))
const time = performance.now()
for (let i = 0; i < count; i++) {
  const seed = (i + fromSeed) >>> 0
  const long = i < 4 ? [300, 600, 1200, 1800][i] : 0
  const guided = Boolean(long || i % 5 < 3)
  const duration = long || (guided ? 21 + seed % 41 : 17 + seed % 44)
  const wind = wallPatterns[i % wallPatterns.length]
  const policy = guided ? (i % 7 - 3) * .013 : i % 3
  const result = session(seed, duration, guided, policy, wind, i % 5 === 0 ? 2.6 : 0)
  if (guided && result.killer) {
    throw new Error('Safe route died at seed ' + seed + ' after ' + result.elapsed.toFixed(3) + 's ' + JSON.stringify(result.killer))
  }
  if (long) totals.longest.push({ seed, seconds: long, distance: Math.floor(result.distance) })
  if ((i + 1) % 1000 === 0) console.log('completed ' + (i + 1) + ' seeded sessions')
}
console.log(JSON.stringify({ ...totals, fromSeed, hazards: [...hazardKinds].sort(), deathsBy: deaths,
  wallSeconds: +((performance.now() - time) / 1000).toFixed(2) }, null, 2))

if (estimateCareer) {
  const round = value => Math.round(value * 10) / 10
  const average = (runs, key) => runs.reduce((total, run) => total + run[key], 0) / (runs.length || 1)
  const short = Object.entries(samples).filter(([group]) => group !== 'endurance').map(([group, runs]) => {
    const duration = average(runs, 'duration')
    const xp = average(runs, 'xp')
    const xpPerHour = 3600 * xp / (duration + 4)
    return { group, runs: runs.length, duration: round(duration), distance: round(average(runs, 'distance')),
      xp: round(xp), xpPerHour: round(xpPerHour),
      hours: Object.fromEntries([10, 25, 50, 100].map(level => [level, round(xpAt(level) / xpPerHour)])) }
  })
  console.log(JSON.stringify({ repeatableXP: short, enduranceChecks: samples.endurance.map(run => ({
    seconds: round(run.duration), score: run.score, retrieves: run.retrieves, jumpsCleared: run.jumpClears,
    slidesCleared: run.slidesCleared, gooseDodges: run.geese, xp: run.xp,
  })) }, null, 2))
}
