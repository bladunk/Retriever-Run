import test from 'node:test'
import assert from 'node:assert/strict'
import { BufferAttribute, BufferGeometry, MeshBasicMaterial, Texture } from 'three'
import { difficultyAt, director, distanceAtTime, localDirector, speedAt } from '../src/difficulty.js'
import { createCourse } from '../src/runner.js'
import { encounterPose } from '../src/wildlife-motion.js'
import { placeOnTrail } from '../src/trail.js'
import { fieldSpecies } from '../src/wildlife-catalog.js'
import { createPerformanceProbe } from '../src/performance-probe.js'
import { createCampTransport } from '../src/camp-transport.js'
import { createRunStatistics } from '../src/field-stats.js'
import { openLodge, saveKey } from '../src/lodge-save.js'
import { courseRuleset, localCourseRuleset } from '../src/ruleset.js'

test('constant-time shipped pace matches the old interval scan on all fixed ticks and boundaries', () => {
  const originalCurve = director.curve.map(point => point.slice())
  const original = { ...director, curve: originalCurve }
  for (let tick = -120; tick < 108000; tick++) {
    const seconds = tick / 120
    assert.equal(difficultyAt(seconds), difficultyAt(seconds, originalCurve))
    assert.equal(distanceAtTime(seconds), distanceAtTime(seconds, original))
    assert.equal(distanceAtTime(seconds, localDirector), distanceAtTime(seconds, original))
  }
  assert.equal(speedAt(director.curve[0][1]), director.startingSpeed)
})

test('hostile swerves retain an eight-second local cooldown with original archives separate', () => {
  const encounters = rules => {
    const times = []
    const next = createCourse(71, rules)
    for (let row = next(); row.time < 900; row = next()) {
      if (row.pattern === 'swoop') times.push(row.time)
    }
    return times
  }
  const tuned = encounters(localDirector)
  assert.ok(tuned.length >= 12)
  assert.ok(tuned.length < .72 * encounters(director).length)
  assert.ok(tuned.every((time, index) => index === 0 || time - tuned[index - 1] >= 8))
})

test('new and Phase 05 results are kept under their original course keys on local save reload', () => {
  const data = new Map()
  const store = () => ({ getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key,value) })
  const lodge = openLodge(store)
  const run = { distance: 35, elapsed: 3.16, scoreBonus: 40, retrieves: 0 }
  for (const course of [courseRuleset, localCourseRuleset]) {
    const tracker = lodge.beginRun(undefined,course)
    assert.equal(tracker.preview(run).course, course)
    lodge.finalize(1,tracker,run,'log')
  }
  assert.ok(data.get(saveKey))
  const reopened = openLodge(store)
  for (const course of [courseRuleset, localCourseRuleset]) assert.equal(reopened.board('score',course)[0].course,course)
  assert.equal(createRunStatistics(9).preview(run).course,courseRuleset)
})

test('deer nose follows the fixed-world path across both banks including the curved exit', () => {
  for (const distance of [0,44,834,2460]) for (const side of [-1,1]) {
    const event = { distance, lateral:side*7.3, height:0, seed:5, kind:'cover' }
    for (const ahead of [39,27,5,-12,-68,-78,-85]) {
      const pose = encounterPose(event, fieldSpecies.deer, ahead, 0, 0, {})
      const next = encounterPose(event, fieldSpecies.deer, ahead-.2, 0, 0, {})
      const a = {}, b = {}
      placeOnTrail(a,distance+pose.along,pose.lateral,distance)
      placeOnTrail(b,distance+next.along,next.lateral,distance)
      assert.equal(pose.rig,'Gallop')
      const delta = Math.hypot(b.x-a.x,b.z-a.z)
      const aligned = (-(b.x-a.x)*Math.sin(pose.yaw)-(b.z-a.z)*Math.cos(pose.yaw))/delta
      assert.ok(aligned > .99999, 'deer local -Z must align with its world path')
    }
  }
})

test('a missing combined board falls back only to the authoritative score RPC', async () => {
  const calls = []
  const transport = createCampTransport({ url:'https://test.example', key:'fixture' }, {
    loadSdk: async () => ({ createClient: () => ({ rpc: async (name, args) => {
      calls.push([name,args])
      return name === 'rr_worldwide_standings' ? { error:{code:'PGRST202'} } :
        { data:{ status:'ok',open:false,total_ranked:0,rows:[] } }
    } }) }),
  })
  const args = { p_scope:'worldwide',p_metric:'score',p_offset:25,p_camp:null }
  const result = await transport.rankedBoard(1,null,args)
  assert.equal(result.scoresOnly,true)
  assert.equal(result.open,false)
  assert.deepEqual(calls,[['rr_worldwide_standings',{p_offset:25}],['rr_ranked_board',args]])
})

test('startup, restart and named submissions retain the previous diagnostic fields', () => {
  let now = 10
  const probe = createPerformanceProbe(() => now, true)
  probe.stage('rendererReadyMs')
  const geometry = new BufferGeometry()
  geometry.setAttribute('position',new BufferAttribute(new Float32Array(9),3))
  const material = new MeshBasicMaterial({ map:new Texture() })
  const existingKey = material.customProgramCacheKey()
  probe.geometry(geometry,'Terrain / marsh')
  probe.material(material,'Habitat / fern')
  assert.equal(material.customProgramCacheKey(),existingKey)
  geometry.getAttribute('position').onUploadCallback()
  material.map.onUpdate()
  material.onBeforeCompile()
  geometry.dispose()
  now = 20
  probe.ready()
  const before = { memory: { geometries:1,textures:3 }, programs:[{}] }
  probe.restart(18,before)
  now = 59
  const renderer = { render:{calls:3,triangles:5}, memory:{geometries:2,textures:4}, programs:[] }
  probe.frame(16.7,19,renderer,'gulf',now,17)
  now = 77
  probe.animationCallback(now)
  probe.frame(18,2,renderer,'gulf',now)
  const report = probe.read()
  assert.equal(report.restart,39)
  assert.equal(report.restartTrace.firstFrameSubmittedMs,41)
  assert.equal(report.restartTrace.nextAnimationCallbackMs,59)
  assert.equal(report.restartTrace.firstPresentationIntervalMs,18)
  assert.deepEqual(report.restartTrace.before,{ geometries:1,textures:3,programs:1 })
  assert.equal(report.startupPhases.readyMs,20)
  assert.equal(report.capabilities.gpuExecutionTime,null)
  assert.deepEqual(report.operations.slice(0,4).map(event => event.name),
    ['geometry-upload','texture-upload','shader-initialize','geometry-dispose'])
})
