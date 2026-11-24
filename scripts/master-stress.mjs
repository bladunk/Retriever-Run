import assert from 'node:assert/strict'
import { firstContact, laneWidth, obstacleVolumes } from '../src/collision.js'
import { courseStages, distanceAtTime, speedAtTime, stageAt, stageSeconds } from '../src/difficulty.js'
import { expeditionRegions } from '../src/expedition.js'
import { createRunControls } from '../src/run-controls.js'
import { advance, createCourse, newRun, reactionWindow } from '../src/runner.js'
import { tickSeconds } from '../src/timing.js'

const seeds = Number(process.argv[2] ?? 5000)
assert.ok(Number.isSafeInteger(seeds) && seeds > 0)
const stageStats = courseStages.map(stage => ({ level: stage.level, territory: expeditionRegions[stage.territory].name,
  scenarios: 0, generated: 0, transitions: 0 }))
const reactions = [.32, .38, reactionWindow, .45, .47]
const types = new Set()
let ticks = 0
const started = performance.now()

function timeAt(distance, from, until) {
  for (let lap = 0; lap < 18; lap++) {
    const point = (from + until) * .5
    if (distanceAtTime(point) < distance) from = point
    else until = point
  }
  return (from + until) * .5
}

function replay(rows, pivot, seed, stage) {
  const last = rows[pivot - 1]
  const from = rows[pivot]
  const distance = last ? (last.end ?? last.at) + 1.62 : 0
  const elapsed = last ? timeAt(distance, last.time, from.time) : 0
  const lane = last?.lane ?? 0
  const run = { ...newRun(), lane, x: lane * laneWidth, distance, elapsed, speed: speedAtTime(elapsed) }
  if (last?.gate) {
    const move = last.gate.action
    run[move] = Math.max(0, last.gate.duration / 2 - (elapsed - last.time))
  }
  const previous = {}
  const hit = {}
  const releaseTest = reactions[seed % reactions.length]
  const timingError = (Math.floor(seed / 11) % 5 - 2) * .023
  const horizon = from.time + 4.25 + seed % 4 * .25
  const hazards = []
  for (let i = Math.max(0, pivot - 1); i < rows.length && rows[i].time <= horizon + 2; i++) {
    for (const entity of rows[i].entities) if (entity.hazard) hazards.push(entity)
  }
  const controls = createRunControls()
  let index = pivot
  let released = elapsed
  let nextInput = elapsed
  let usedGate = false
  while (run.elapsed < horizon) {
    const row = rows[index]
    if (row && run.lane !== row.lane && run.elapsed >= Math.max(nextInput, released + releaseTest)) {
      controls.enqueue(run.lane < row.lane ? 'right' : 'left')
      nextInput = run.elapsed + .16
    }
    if (row?.gate && !usedGate && row.gate.distance - run.distance <= run.speed * (row.gate.duration / 2 + timingError)) {
      controls.enqueue(row.gate.action)
      usedGate = true
    }
    controls.apply(run, () => {})
    Object.assign(previous, run)
    advance(run, tickSeconds)
    if (firstContact(previous, run, hazards, hit)) {
      assert.fail('seed ' + seed + ', stage ' + (stage + 1) + ', active ' + run.elapsed.toFixed(4) + ' s ' + JSON.stringify(hit))
    }
    if (row && run.distance > (row.end ?? row.at) + 1.58) {
      index++
      released = run.elapsed
      usedGate = false
    }
    ticks++
  }
  stageStats[stage].scenarios++
  if (stageAt(elapsed) !== stageAt(horizon)) stageStats[stage].transitions++
}

for (let trial = 0; trial < seeds; trial++) {
  const seed = Math.imul(trial + 1, 0x53d72d91) >>> 0
  const generate = createCourse(seed)
  const rows = []
  for (let row = generate(); row.time < 330; row = generate()) {
    assert.ok(row.at > (rows.at(-1)?.at ?? 0) && row.lane >= -1 && row.lane <= 1)
    assert.ok(speedAtTime(row.time) < 29)
    const stage = stageAt(row.time).level - 1
    stageStats[stage].generated++
    for (const item of row.entities) if (item.hazard) {
      assert.ok(obstacleVolumes(item)?.length, item.type)
      assert.ok(item.wide || item.lane !== row.lane || (row.gate?.action === 'slide' && item.type === 'branch'))
      types.add(item.type)
    }
    rows.push(row)
  }
  for (let stage = 0; stage < courseStages.length; stage++) {
    const afterCap = stage === courseStages.length - 1 && trial % 4 === 0
    const offset = afterCap ? 17 + trial % 12 : trial % 5 === 0 ? 11.2 : (Math.imul(trial + 3, 911 + 70 * stage) >>> 0) % 1050 / 100
    const target = stage * stageSeconds + offset
    const pivot = rows.findIndex(row => row.time >= target)
    assert.ok(pivot >= 0)
    replay(rows, pivot, seed, stage)
  }
  if ((trial + 1) % 500 === 0) console.log((trial + 1) * courseStages.length + ' verified windows')
}
console.log(JSON.stringify({ scenarios: seeds * courseStages.length, seeds, ticks, reactions,
  stageStats, types: [...types].sort(), wallSeconds: Number(((performance.now() - started) / 1000).toFixed(2)) }, null, 2))
