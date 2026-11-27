import assert from 'node:assert/strict'
import test from 'node:test'
import { lodgeFixture } from '../scripts/lodge-fixtures.mjs'
import { careerStanding } from '../src/career.js'
import { createLegacyPreview } from '../src/legacy-preview.js'
import { legacyTimeline, normalizeLegacyHistory } from '../src/legacy-history.js'
import { earnedTrophies, honorDisplay, lodgeProgress, lodgeTiers, trophyFor } from '../src/lodge-progress.js'
import { openLodge, saveKey } from '../src/lodge-save.js'
import { honorById, localHonors } from '../src/field-honors.js'
import { newRun } from '../src/runner.js'

const date = '2026-11-27T16:00:00.000Z'
function open(seed = lodgeFixture()) {
  const state = new Map([[saveKey,JSON.stringify(seed)]])
  const disk = () => ({ getItem:key => state.get(key) ?? null, setItem:(key,value) => state.set(key,value) })
  return { disk, load:options => openLodge(disk,() => new Date(date),options) }
}

test('the five preview profiles use real Lodge gates with a qualified Master Hunter only at Tier V', () => {
  for (const [index,tier] of lodgeTiers.entries()) {
    const store = createLegacyPreview(index + 1)
    const player = store.current()
    assert.equal(lodgeProgress(player).tier,tier)
    assert.equal(Boolean(player.progression.boyd),index === 4)
    assert.equal(Boolean(trophyFor(player,'rank:master-hunter')),index === 4)
  }
  assert.equal(createLegacyPreview(5).current().lodgeDisplay.finish,undefined)
})

test('the existing local catalog has visually meaningful families and environmental items are only derived from earned records', () => {
  const distinct = new Set(localHonors.map(honor => honorDisplay(honor).art))
  assert.ok(distinct.size >= 7)
  assert.equal(honorDisplay(honorById.get('legend-whole-course')).art,'migration')
  const player = createLegacyPreview(5).current()
  assert.equal(trophyFor(player,'discovery:divide-aurora').art,'aurora-frame')
  assert.equal(trophyFor(player,'discovery:platte-crane-passage').art,'bronze-flight')
  assert.equal(trophyFor(player,'migration:complete').category,'legend')
  const beginner = createLegacyPreview(1).current()
  assert.equal(trophyFor(beginner,'migration:complete'),null)
  assert.equal(trophyFor(beginner,'discovery:divide-aurora'),null)
})

test('finish and shelf changes persist locally with ownership, a bounded display and separate profiles', () => {
  const { load } = open()
  const store = load()
  const fresh = store.current()
  assert.equal(store.setLodgeFinish(fresh.id,'heritage'),false)
  store.select(5)
  const player = store.current()
  const earned = earnedTrophies(player).slice(0,4)
  for (const item of earned.slice(0,3)) assert.equal(store.toggleTrophy(player.id,item.key),true)
  assert.equal(store.toggleTrophy(player.id,earned[3].key),false)
  assert.equal(store.toggleTrophy(player.id,earned[3].key,'discovery:divide-aurora'),false)
  assert.equal(store.toggleTrophy(player.id,earned[3].key,earned[1].key),true)
  assert.equal(store.setLodgeFinish(player.id,'willow'),true)
  const reload = load()
  assert.deepEqual(reload.current().lodgeDisplay.pins,[earned[0].key,earned[3].key,earned[2].key])
  assert.equal(reload.current().lodgeDisplay.finish,'willow')
  assert.equal(earnedTrophies(reload.current()).some(item => item.key === earned[1].key),true)
  reload.select(fresh.id)
  assert.equal(reload.current().lodgeDisplay.finish,undefined)
  assert.equal(reload.current().lodgeDisplay.pins.length,0)
  assert.equal(load({practice:true}).setLodgeFinish(1,'camp'),false)
})

test('rank and cabin dates are recorded at the real threshold once and retained saves show undated milestones honestly', () => {
  const { load } = open()
  const game = load()
  game.select(9)
  const id = game.current().id
  const tracker = game.beginRun()
  const run = { ...newRun(), elapsed:12, distance:152 }
  const result = game.finalize(id,tracker,run,'log')
  assert.ok(result)
  assert.equal(result.lodge.tier.id,'cabin')
  assert.equal(game.finalize(id,tracker,run,'log'),null)
  const next = load()
  const player = next.current()
  const timeline = legacyTimeline(player,careerStanding(player.career),next.personalEntries(id))
  for (const milestone of ['first-hunt','rank:rookie','lodge:cabin'])
    assert.equal(timeline.dated.find(event => event.id === milestone).date,date)
  next.select(5)
  const historical = next.current()
  const archive = legacyTimeline(historical,careerStanding(historical.career),next.personalEntries(5))
  assert.ok(archive.undated.some(event => event.id === 'lodge:cabin'))
  assert.ok(archive.undated.some(event => event.id === 'first-hunt'))
  assert.equal(archive.dated.find(event => event.id === 'first-hunt'),undefined)
  assert.deepEqual(normalizeLegacyHistory({version:1,milestones:{ migration:'invalid', 'not-a-milestone': date }}).milestones,{})
})
