import assert from 'node:assert/strict'
import test from 'node:test'
import { distanceAtTime, director, localDirector } from '../src/difficulty.js'
import { discoveryStrength, normalizeDiscoveries, planDiscoveries, skyDiscovery } from '../src/environment-discoveries.js'
import { expeditionRegions } from '../src/expedition.js'
import { forestModel } from '../src/forest-models.js'
import { shoreHeight } from '../src/landforms.js'
import { openLodge, practiceSaveKey, saveKey, saveVersion } from '../src/lodge-save.js'
import { northernBankModel } from '../src/northern-bank-art.js'
import { createCourse, newRun } from '../src/runner.js'
import { buildTile } from '../src/terrain-geometry.js'

test('Northern landforms retain distinct wet basins and meaningful off-route relief', () => {
  const minimumRelief = [1,4,4,18,18]
  for (const [index,region] of expeditionRegions.slice(10).entries()) {
    const heights = []
    for (let at=0;at<410;at+=11) {
      for (let x=6;x<68;x+=3) heights.push(shoreHeight(region,region.marker+at,x)[0])
    }
    assert.ok(Math.min(...heights)<-.58,region.key)
    assert.ok(Math.max(...heights)-Math.min(...heights)>minimumRelief[index],region.key)
  }
})

test('Northern scenery assets are bounded and solid branches support compact spruce texture sprays', () => {
  for (const name of ['ShieldLichen','RockyMountainTalus']) {
    const geometry=northernBankModel(name)
    assert.equal(northernBankModel(name),geometry)
    assert.ok(geometry.index.count<650)
    assert.ok(geometry.attributes.position.array.every(Number.isFinite))
  }
  for(const quality of [true,false]){
    const geometry=forestModel('blackSpruce',quality)
    assert.ok(geometry.attributes.uv.array.some((value,index)=>index%2===0&&value<0))
    assert.ok(geometry.attributes.position.array.every(Number.isFinite))
    assert.ok(geometry.index.count<=4600)
  }
  const manitoba=expeditionRegions[10]
  const landing=buildTile(Math.ceil(manitoba.marker/30)+1,7).landmark
  assert.equal(landing.discovery,'reedwatch-landing')
  assert.ok(Math.abs(landing.x)>6)
})

test('weather scheduling is repeatable and leaves both course generators on identical rows', () => {
  assert.deepEqual(planDiscoveries(7),[])
  assert.equal(skyDiscovery(planDiscoveries(6),437)?.effect,'aurora')
  assert.equal(skyDiscovery(planDiscoveries(9),405)?.effect,'sunbreak')
  assert.equal(skyDiscovery(planDiscoveries(6),397),undefined)
  for (const rule of [director,localDirector]) {
    for (const seed of [6,7,9,4138]) {
      const before=createCourse(seed,rule), after=createCourse(seed,rule)
      for (let index=0;index<390;index++) {
        const events=planDiscoveries(seed)
        assert.deepEqual(events,planDiscoveries(seed))
        assert.deepEqual(after(),before())
        for (const event of events) {
          assert.equal(discoveryStrength(event,event.start),0)
          assert.equal(discoveryStrength(event,event.start+7),1)
          assert.equal(discoveryStrength(event,event.end),0)
        }
      }
    }
  }
})

test('discoveries save once offline per profile without scoring changes or practice writes', () => {
  const old={version:saveVersion,active:1,players:[{id:1,nickname:'Hannah',profile:{best:84,quality:'high'}}],entries:[]}
  const disk=new Map([[saveKey,JSON.stringify(old)]])
  const storage={getItem:key=>disk.get(key)??null,setItem:(key,value)=>disk.set(key,value)}
  let now=new Date('2026-11-27T00:00:00Z')
  let lodge=openLodge(()=>storage,()=>now)
  assert.deepEqual(lodge.current().discoveries.entries,{})
  assert.equal(lodge.current().profile.best,84)
  const run={...newRun(),elapsed:438,distance:distanceAtTime(438)}
  const tracker=lodge.beginRun()
  const original=tracker.preview(run)
  tracker.observeEnvironment('divide-aurora')
  tracker.observeEnvironment('divide-aurora')
  tracker.observeEnvironment('__proto__')
  assert.deepEqual(tracker.preview(run),original)
  assert.deepEqual(lodge.finalize(1,tracker,run,'puddle').environment,['divide-aurora'])
  assert.equal(lodge.finalize(1,tracker,run,'puddle'),null)
  lodge=openLodge(()=>storage,()=>now)
  const date=now.toISOString()
  assert.deepEqual(lodge.current().discoveries.entries,{'divide-aurora':date})
  now=new Date('2026-11-28T00:00:00Z')
  const repeat=lodge.beginRun()
  repeat.observeEnvironment('divide-aurora')
  lodge.finalize(1,repeat,run,'puddle')
  assert.deepEqual(lodge.current().discoveries.entries,{'divide-aurora':date})
  const another=lodge.newPlayer('Second profile')
  assert.deepEqual(another.discoveries.entries,{})
  lodge.select(1)
  const normal=disk.get(saveKey)
  const studio=openLodge(()=>storage,()=>now,{practice:true})
  const preview=studio.beginRun()
  preview.observeEnvironment('foothills-sunbreak')
  studio.finalize(studio.current().id,preview,run,'puddle')
  assert.equal(disk.get(saveKey),normal)
  assert.deepEqual(JSON.parse(disk.get(practiceSaveKey)).players[0].discoveries.entries,{})
  assert.deepEqual(normalizeDiscoveries({version:1,entries:{'divide-aurora':'invalid','unknown':date}}).entries,{})
})
