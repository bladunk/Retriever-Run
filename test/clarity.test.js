import assert from 'node:assert/strict'
import test from 'node:test'
import { adaptiveQuality, graphics, pixelRatio } from '../src/quality.js'
import { forestModel } from '../src/forest-models.js'
import { southernModel } from '../src/southern-banks.js'
import { createPerformanceProbe } from '../src/performance-probe.js'
import { createWildlifeModels } from '../src/wildlife-models.js'

test('a 324 ms opener and intermittent long frames preserve the sustainable Auto preset', () => {
  const decisions = []
  const observe = adaptiveQuality(decision => decisions.push(decision))
  observe.stabilize('hunt start')
  assert.equal(observe(.324),'balanced')
  assert.equal(observe.read().stabilizing,true)
  for (let i=0; i<430; i++) observe(i%60 === 55 ? .049 : 1/60)
  assert.equal(observe.read().level,'high')
  assert.deepEqual(decisions.map(decision => decision.to),['high'])
  assert.ok(decisions[0].samples > 55)
  assert.equal(decisions[0].reason,'consistent frame headroom')
})

test('Auto steps down under sustained strain and recovers from Low with isolated stalls', () => {
  const decisions = []
  const observe = adaptiveQuality(decision => decisions.push(decision))
  for (let i=0; i<145; i++) observe(1/30)
  assert.equal(observe.read().level,'low')
  assert.ok(decisions[0].late / decisions[0].samples >= .30)
  observe.stabilize('resume')
  assert.equal(observe(.21),'low')
  for (let i=0; i<710; i++) observe(i%60 === 59 ? .042 : 1/60)
  assert.deepEqual(decisions.map(decision => decision.to),['low','balanced','high'])
  assert.equal(observe.read().resetReason,'resume')
  assert.ok(pixelRatio(402,714,3,graphics.low) >= 1)
  assert.ok(pixelRatio(402,714,3,graphics.high) > pixelRatio(402,714,3,graphics.balanced))
})

test('Delta and timber crown triangles have vertical thickness at all foliage detail levels', () => {
  const delta = ['willow','cottonwood'].flatMap(kind => [true,false].map(compact => forestModel(kind,compact)))
  const timber = ['BottomlandOak','WillowOak','BottomlandOakLOD','WillowOakLOD'].map(southernModel)
  for (const geometry of [...delta,...timber]) {
    const { position, uv } = geometry.attributes
    const faces = geometry.index.array
    let crownFaces = 0
    let vertical = 0
    for (let i=0; i<faces.length; i+=3) {
      const a=faces[i], b=faces[i+1], c=faces[i+2]
      if (uv.getX(a)>=0 || uv.getX(b)>=0 || uv.getX(c)>=0) continue
      crownFaces++
      const axis = [position.getY(a),position.getY(b),position.getY(c)]
      vertical += Number(Math.max(...axis)-Math.min(...axis) > .015)
    }
    assert.ok(crownFaces>120)
    assert.ok(vertical>crownFaces*.45)
  }
})

test('diagnostic frame deltas use actual pre-draw resource counts and retain cold stalls', () => {
  let now = 20
  const probe = createPerformanceProbe(() => now,true)
  probe.restart(19,{memory:{geometries:52,textures:24},programs:[{},{},{}]})
  now=350
  probe.frame(16.7,324,{memory:{geometries:54,textures:27},programs:[{},{},{},{}],render:{calls:66,triangles:45000}},
    'gulf',now,318,{geometries:52,textures:24,programs:3})
  const report = probe.read()
  assert.equal(report.hunt.cpu.maxMs,324)
  assert.deepEqual([report.slowFrames[0].geometryDelta,report.slowFrames[0].textureDelta,report.slowFrames[0].programDelta],[2,3,1])
  assert.equal(report.restartTrace.firstRenderMs,318)
  assert.equal(report.capabilities.gpuExecutionTime,null)
})

test('wildlife data distinguishes absent rigs from models waiting outside the bounded resident pool', () => {
  const wildlife = createWildlifeModels()
  assert.equal(wildlife.fallbackReason('mallard'),'outside resident pool')
  assert.equal(wildlife.fallbackReason('moose'),'no authored rig')
  assert.equal(wildlife.metrics().limit,2)
})
