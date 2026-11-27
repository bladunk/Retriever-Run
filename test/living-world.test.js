import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import { director, distanceAtTime, localDirector, speedAtTime } from '../src/difficulty.js'
import { normalizeDiscoveries, recordDiscoveries } from '../src/environment-discoveries.js'
import { expeditionRegions } from '../src/expedition.js'
import { terrainElevation } from '../src/landforms.js'
import { createCourse } from '../src/runner.js'
import { signDistance } from '../src/sign-placement.js'
import { fitSignLettering } from '../src/sign-lettering.js'
import { trailSign } from '../src/trail-signs.js'
import { placeOnTrail } from '../src/trail.js'
import { createEncounterArt } from '../src/wildlife-art.js'
import { fieldSpecies } from '../src/wildlife-catalog.js'
import { planWildlifeDiscovery } from '../src/wildlife-encounters.js'
import { encounterPose } from '../src/wildlife-motion.js'

const farm = { distance:distanceAtTime(163), kind:'cover', lateral:6, height:.21, seed:18 }
const pose = (id, event, ahead, elapsed = 163, individual = 0) =>
  encounterPose(event,fieldSpecies[id],ahead,elapsed,individual,{})

test('pheasant stands on the bank, accelerates into a powered flush and tucks in flight', () => {
  const runSpeed = speedAtTime(163)
  const at = time => pose('pheasant',farm,40-time*runSpeed)
  assert.ok(Math.abs(at(-.35).height - terrainElevation(farm.distance,farm.lateral)-fieldSpecies.pheasant.size*.25)<.001)
  assert.equal(at(-.35).fold,1)
  assert.equal(at(.12).state,'takeoff')
  assert.ok(at(.12).pitch > .3)
  assert.ok(at(.4).height - at(-.35).height > 1.35)
  assert.ok(at(.55).along - at(.4).along > at(.15).along - at(0).along)
  assert.ok(at(.65).gait > .9)
  assert.equal(at(1.38).state,'glide')
  assert.ok(at(1.38).along > at(1.18).along)
  const a = at(.58), b = at(.60), first={}, second={}
  placeOnTrail(first,farm.distance+a.along,a.lateral,farm.distance)
  placeOnTrail(second,farm.distance+b.along,b.lateral,farm.distance)
  const measuredHeading = Math.atan2(first.x-second.x,first.z-second.z)
  assert.ok(Math.cos(measuredHeading-a.yaw)>.99)
  assert.equal(at(3.5).draw,false)
  for (const compact of [true,false]) {
    const art = createEncounterArt(fieldSpecies.pheasant,1,compact)
    assert.ok(art.bodyMesh.geometry.attributes.position.count>1000)
    assert.equal(art.tipMesh.count,2)
    assert.ok(art.legMesh)
    art.dispose()
  }
})

test('water takeoff keeps swimming birds wet and species vary their wingbeats', () => {
  const water = { ...farm, kind:'water', lateral:-8, height:-.41 }
  assert.equal(pose('mallard',water,35).state,'swim')
  assert.ok(Math.abs(pose('mallard',water,35).height-water.height)<.14)
  const inFlight = pose('mallard',water,7)
  assert.equal(inFlight.state,'powered')
  assert.ok(inFlight.gait > .95)
  assert.ok(inFlight.height-water.height>1.45)
  assert.ok(pose('green-teal',water,7).cadence>inFlight.cadence*1.3)
  const airborne = { ...water,kind:'open', height:4.4 }
  assert.notEqual(pose('canada-goose',airborne,25,163,0).wing,pose('canada-goose',airborne,25,163,1).wing)
  const states=Array.from({length:23},(_,i)=>pose('eagle',airborne,70-i*6.1).state)
  assert.ok(states.includes('glide') && states.includes('powered'))
  const moose=pose('moose',{ ...farm,distance:distanceAtTime(378) },40,378)
  assert.ok(moose.along>0 && moose.lateral>4.8)
  assert.ok(Number.isFinite(moose.yaw))
})

test('Platte passage has spaced groups, per-seed eligibility and a stable saved discovery key', () => {
  const seeds=Array.from({length:100},(_,i)=>i+1)
  const encounters=seeds.map(planWildlifeDiscovery).filter(Boolean)
  assert.ok(encounters.length>12 && encounters.length<47)
  for (const event of encounters) {
    assert.deepEqual(planWildlifeDiscovery(event.seed),event)
    assert.equal(event.territory,'platte')
    assert.ok(event.distance>=distanceAtTime(192) && event.distance<=distanceAtTime(197))
    const flock=Array.from({length:event.count},(_,i)=>pose('crane',event,60,196,i))
    assert.ok(flock.every(bird=>bird.height>7.5 && Number.isFinite(bird.yaw)))
    assert.ok(flock[13].height>flock[0].height+2 && flock[26].height>flock[13].height+2)
    assert.ok(flock.some((bird,i)=>i>0 && Math.abs(bird.wing-flock[0].wing)>.2))
    for (const [i,a] of flock.entries()) for (const b of flock.slice(i+1))
      assert.ok(Math.hypot(a.lateral-b.lateral,a.height-b.height,a.along-b.along)>.78)
  }
  const first = '2026-11-27T00:00:00.000Z'
  const saved = normalizeDiscoveries({version:1,entries:{'divide-aurora':first}})
  recordDiscoveries(saved,[encounters[0].discovery,encounters[0].discovery],first)
  recordDiscoveries(saved,[encounters[0].discovery],'2026-11-28T00:00:00.000Z')
  assert.deepEqual(normalizeDiscoveries(JSON.parse(JSON.stringify(saved))).entries,
    {'divide-aurora':first,'platte-crane-passage':first})
})

test('Canadian Rocky Mountain Foothills preserves the territory key and fits the entrance sign', () => {
  const region = expeditionRegions[13]
  assert.equal(region.key,'foothills')
  assert.equal(region.name,'Canadian Rocky Mountain Foothills')
  let ordinal = 0
  while (signDistance(ordinal)<region.marker) ordinal++
  const sign = trailSign({ ordinal,distance:signDistance(ordinal) },7)
  assert.equal(sign.line,region.name.toUpperCase())
  const width = line => line.length*57
  const fit = fitSignLettering(sign.line,width,sign.maxLines)
  assert.ok(fit.size>=43)
  assert.equal(fit.lines.join(' '),sign.line)
})

test('signed and tuned course rows match fingerprints captured from the merged RC.5 source', () => {
  const seeds = [0,7,18,109,229,983,65535,0xffffffff]
  for (const [rule, before] of [
    [director,'6dfd50d3c1ffdd8242c30687a054601671e45b547e91641016ac053b6d42daa7'],
    [localDirector,'af3ec14c894223729700897278ad93a41447ff91402b2c6b77655c47775e573f'],
  ]) {
    const hash = createHash('sha256')
    for (const seed of seeds) {
      const next = createCourse(seed,rule)
      for (let row = next(); row.time<487; row = next()) {
        planWildlifeDiscovery(seed)
        hash.update(JSON.stringify(row))
      }
    }
    assert.equal(hash.digest('hex'),before)
  }
})
