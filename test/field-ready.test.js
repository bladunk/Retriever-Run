import assert from 'node:assert/strict'
import test from 'node:test'
import { Color, Scene, Texture, TextureLoader } from 'three'
import { firstContact, traceContact } from '../src/collision.js'
import { createRunStatistics } from '../src/field-stats.js'
import { openLodge, saveKey } from '../src/lodge-save.js'
import { createRunControls } from '../src/run-controls.js'
import { advance, newRun, speedAtTime } from '../src/runner.js'
import { createServer } from 'vite'
import { reedCount } from '../src/terrain-geometry.js'
import { createFixedClock, samplePose, tickSeconds } from '../src/timing.js'

const hazard = (type, distance, props) => ({ type, distance, lane: 0, hazard: true, ...props })
const pace = speedAtTime(120)

test('rapid inputs buffer one landing transition in either direction and pause clears it', () => {
  for (const [first, next] of [['jump', 'slide'], ['slide', 'jump']]) {
    const controls = createRunControls()
    const run = newRun()
    const actions = []
    controls.enqueue(first)
    controls.apply(run, move => actions.push(move))
    while (run[first] > .11) advance(run, tickSeconds)
    for (let n = 0; n < 24; n++) assert.equal(controls.enqueue(next), n < 16)
    for (let n = 0; n < 20; n++) {
      controls.apply(run, move => actions.push(move))
      advance(run, tickSeconds)
    }
    assert.deepEqual(actions, [first, next])
    assert.equal(run[first], 0)
    assert.ok(run[next] > .55)
  }
  const controls = createRunControls()
  const run = { ...newRun(), jump: .08 }
  controls.enqueue('slide')
  controls.apply(run, () => assert.fail('cannot slide in midair'))
  controls.reset()
  advance(run, .09)
  controls.apply(run, () => assert.fail('pause must clear an old gesture'))
  assert.equal(run.slide, 0)
})

test('overlapping hazards choose the earliest actual contact in either entity order', () => {
  const before = { ...newRun(), distance: 98.2 }
  const after = { ...before, distance: 100.3 }
  const timber = hazard('log', 100)
  const water = hazard('stream', 100, { wide: true })
  const left = {}
  const right = {}
  assert.equal(traceContact(before, after, timber, left), true)
  assert.equal(traceContact(before, after, water, right), true)
  assert.notEqual(left.fraction, right.fraction)
  const first = left.fraction < right.fraction ? timber : water
  for (const entities of [[timber, water], [water, timber]]) {
    const witness = {}
    assert.equal(firstContact(before, after, entities, witness), first)
    assert.equal(witness.distance, samplePose({}, before, after, witness.fraction).distance)
    assert.deepEqual(witness, first === timber ? left : right)
  }
})

test('at full speed the last valid jump clears the log and the next simulation tick hits it', () => {
  const log = hazard('log', 100)
  const attempt = jumpAt => {
    const run = { ...newRun(), distance: 88, elapsed: 120, speed: pace }
    const controls = createRunControls()
    const before = {}
    const witness = {}
    for (let tick = 0; tick < 75; tick++) {
      if (tick === jumpAt) controls.enqueue('jump')
      controls.apply(run, () => {})
      samplePose(before, run, run, 1)
      advance(run, tickSeconds)
      if (firstContact(before, run, [log], witness)) return witness
    }
    return null
  }
  const candidates = Array.from({ length: 60 }, (_, tick) => tick).filter(tick => !attempt(tick))
  const last = candidates.at(-1)
  assert.ok(last > 10 && last < 50)
  assert.equal(attempt(last), null)
  assert.equal(attempt(last + 1).type, 'log')
})

test('300 immediate replays finalize exactly once and preserve profile history through a reload', () => {
  const disk = new Map([[saveKey, JSON.stringify({ best: 9876, farthest: 897, retrieves: 9, outfit: 'marsh', sfx: false })]])
  const storage = () => ({ getItem: key => disk.get(key), setItem: (key, value) => disk.set(key, value) })
  let lodge = openLodge(storage)
  const clock = createFixedClock()
  const controls = createRunControls()
  const stream = hazard('stream', 1.63, { wide: true })
  for (let attempt = 0; attempt < 300; attempt++) {
    clock.reset()
    controls.reset()
    const run = newRun()
    const previous = {}
    const stats = createRunStatistics()
    const witness = {}
    const step = dt => {
      samplePose(previous, run, run, 1)
      advance(run, dt)
      if (!firstContact(previous, run, [stream], witness)) return
      samplePose(run, previous, run, witness.fraction)
      assert.ok(lodge.finalize(1, stats, run, witness.type))
      assert.equal(lodge.finalize(1, stats, run, witness.type), null)
      return false
    }
    for (let frame = 0; frame < 60 && !witness.type; frame++) clock.advance(.0167, step)
    assert.equal(witness.type, 'stream')
    if (attempt % 24 === 0) lodge = openLodge(storage)
  }
  assert.equal(lodge.current().stats.runs, 300)
  assert.equal(lodge.current().stats.deathsBy.water, 300)
  assert.equal(lodge.current().profile.best, 9876)
  assert.equal(lodge.current().profile.retrieves, 9)
  assert.equal(lodge.current().profile.outfit, 'marsh')
  assert.equal(lodge.current().profile.effectsVolume, 0)
  assert.equal(lodge.board('score').length, 20)
  assert.equal(new Set(lodge.board('score').map(entry => entry.id)).size, 20)
})

test('spawn terrain is streamed off the main thread and obsolete packets cannot replace the current tile', async () => {
  const vite = await createServer({
    configFile: false, server: { middlewareMode: true, hmr: false }, optimizeDeps: { noDiscovery: true },
    appType: 'custom',
  })
  const originalWorker = globalThis.Worker
  const loadTexture = TextureLoader.prototype.load
  TextureLoader.prototype.load = () => new Texture()
  const sent = []
  let worker
  globalThis.Worker = class {
    constructor() { worker = this }
    postMessage(index) { sent.push(index) }
    terminate() {}
  }
  const geometry = { buffers: { position: { values: new Float32Array(9), itemSize: 3 } } }
  const packet = index => ({ index, water: null, reeds: new Float32Array(reedCount * 6),
    ground: geometry, plantType: 0, trees: new Float32Array(0), detail: geometry, treeStyle: 0 })
  try {
    const { createTerrain } = await vite.ssrLoadModule('/src/terrain.js')
    const scene = new Scene()
    const terrain = createTerrain(scene)
    const weather = { wind: 0, wet: 0, sky: new Color() }
    assert.equal(scene.children.length, 7)
    assert.equal(terrain.count(), 0)
    assert.equal(terrain.readyAt(0), false)
    assert.deepEqual(sent, [0])
    worker.onmessage({ data: packet(0) })
    assert.equal(terrain.readyAt(0), true)
    assert.deepEqual(sent, [0, -1])
    worker.onmessage({ data: packet(-1) })
    assert.equal(terrain.readyAt(-1), true)
    assert.deepEqual(sent, [0, -1, 1])
    terrain.update(300, 1, weather, 1)
    worker.onmessage({ data: packet(1) })
    assert.equal(terrain.readyAt(30), false)
    assert.equal(sent.at(-1), 10)
    const target = scene.children[10 % 7].children[0]
    let disposed = 0
    target.geometry.addEventListener('dispose', () => disposed++)
    worker.onmessage({ data: packet(10) })
    assert.equal(disposed, 1)
    assert.equal(terrain.readyAt(300), true)
    assert.equal(scene.children.length, 7)
    const firstRemaining = sent.length - 1
    for (let index = firstRemaining; index < sent.length; index++) worker.onmessage({ data: packet(sent[index]) })
  } finally {
    TextureLoader.prototype.load = loadTexture
    if (originalWorker === undefined) delete globalThis.Worker
    else globalThis.Worker = originalWorker
    await vite.close()
  }
})

test('a 4.0 versioned Lodge save retains achievements, leaderboard entries and individual settings', () => {
  const data = {
    version: 1, active: 2, nextPlayer: 3, nextRun: 19,
    players: [
      { id: 1, nickname: 'Cedar', profile: { best: 1412, farthest: 420, retrieves: 7, outfit: 'marsh' } },
      { id: 2, nickname: 'Pond Scout', profile: { best: 1733, farthest: 621, retrieves: 8, outfit: 'copper',
        quality: 'low', masterVolume: .27, musicVolume: 0, musicRestore: .38, effectsVolume: .65 },
      stats: { runs: 15, logs: 4, geese: 7, deaths: 15, deathsBy: { geese: 4 } },
      patches: { 'first-fetch': ['2026-11-18T16:14:00Z'] }, records: { treats: 57, duration: 91 } },
    ],
    entries: [{ id: 18, player: 2, date: '2026-11-18T16:14:00Z', score: 1733, distance: 621, retrieves: 3 }],
  }
  let saved = JSON.stringify(data)
  const disk = () => ({ getItem: () => saved, setItem: (_key, next) => { saved = next } })
  let lodge = openLodge(disk)
  lodge.commit()
  lodge = openLodge(disk)
  const player = lodge.current()
  assert.equal(player.nickname, 'Pond Scout')
  assert.equal(player.profile.best, 1733)
  assert.equal(player.profile.musicVolume, 0)
  assert.equal(player.profile.musicRestore, .38)
  assert.equal(player.profile.masterVolume, .27)
  assert.equal(player.profile.outfit, 'copper')
  assert.equal(player.stats.runs, 15)
  assert.equal(player.stats.deathsBy.geese, 4)
  assert.equal(player.records.treats, 57)
  assert.deepEqual(player.patches['first-fetch'], data.players[1].patches['first-fetch'])
  assert.equal(lodge.board('score')[0].id, 18)
  assert.equal(lodge.players()[0].profile.best, 1412)
})
