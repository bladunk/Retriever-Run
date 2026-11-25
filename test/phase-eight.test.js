import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { matchesCollection, primaryRoom, recentlyEarned, roomGroups } from '../src/collection-browser.js'
import { expeditionRegions } from '../src/expedition.js'
import { ambienceMix, soundscapes } from '../src/field-soundscapes.js'
import { hapticFeedback, rewardGroups } from '../src/hunt-presentation.js'
import { normalizeProfile } from '../src/profile.js'
import { speciesArtwork, speciesPhotoFiles } from '../src/species-artwork.js'
import { fieldSpecies } from '../src/wildlife-catalog.js'
import { wildlifePortrait } from '../src/wildlife-portrait.js'

test('all twenty-nine species have durable unique artwork keys and correct group routing', async () => {
  assert.deepEqual(Object.keys(speciesArtwork), Object.keys(fieldSpecies))
  assert.equal(Object.keys(speciesArtwork).length, 29)
  assert.equal(new Set(Object.values(speciesArtwork).map(art => art.id)).size, 29)
  for (const [species, artwork] of Object.entries(speciesArtwork)) {
    assert.equal(artwork.width / artwork.height, 10 / 7)
    assert.match(wildlifePortrait(fieldSpecies[species], false), /^data:image\/svg\+xml/)
    if (!artwork.photo) continue
    const { path, author, license, terms, source } = artwork.photo
    assert.ok(author && license.startsWith('CC BY') && terms.startsWith('https://creativecommons.org/licenses/'))
    assert.ok(source.startsWith('https://commons.wikimedia.org/wiki/File:'))
    assert.equal(wildlifePortrait(fieldSpecies[species], true), './' + path)
    const bytes = await readFile(new URL('../public/' + path, import.meta.url))
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP')
  }
  assert.equal(speciesPhotoFiles.length, 3)
  assert.equal(speciesArtwork.alligator.group, 'reptiles')
  assert.equal(speciesArtwork.deer.group, 'mammals')
  assert.equal(speciesArtwork.pheasant.group, 'upland')
  assert.match(decodeURIComponent(wildlifePortrait(fieldSpecies.alligator, false)), /M7 42Q21 53/)
  assert.doesNotMatch(decodeURIComponent(wildlifePortrait(fieldSpecies.deer, false)), /M7 42Q21 53/)
})

test('large collections support word search, date sorting and a distinct primary route per room', () => {
  assert.equal(matchesCollection('Étang CRANE', 'Sandhill crane', 'Étang du Nord'), true)
  assert.equal(matchesCollection('goose crane', 'Sandhill crane'), false)
  assert.equal(matchesCollection('  ', 'Sandhill crane'), true)
  const rooms = Object.entries(roomGroups).flatMap(([root, routes]) => routes.map(route => [route, root]))
  assert.equal(new Set(rooms.map(([route]) => route)).size, rooms.length)
  for (const [route, root] of rooms) assert.equal(primaryRoom(route), root)
  assert.equal(primaryRoom('unused-room'), 'overview')
  assert.deepEqual(['', '2026-07-21', '2026-08-21'].sort(recentlyEarned), ['2026-08-21', '2026-07-21', ''])
})

test('post-hunt groups count each earned item once and gate the Master Hunter reveal on the receipt', () => {
  const rank = id => ({ rank: { id, name: id } })
  const career = { before: rank('legendary'), after: rank('master-hunter') }
  assert.deepEqual(rewardGroups({ career }), [])
  assert.deepEqual(rewardGroups({}), [])
  const groups = rewardGroups({ career, boyd: true, gear: [{}, {}], newWildlife: [{}],
    newHonors: [{ category: 'Legendary', tier: 'Platinum' }, { category: 'Regional', tier: 'Platinum' }, {}],
    lodge: { tier: {}, upgrades: [{}, {}] } })
  assert.deepEqual(groups.map(group => [group.type, group.count]), [
    ['prestige', 1], ['legendary', 1], ['platinum', 1], ['honor', 1], ['gear', 2], ['species', 1], ['lodge', 3],
  ])
})

test('optional haptics and persisted presentation settings degrade without browser capabilities', () => {
  const requested = []
  const device = { vibrate: pattern => Boolean(requested.push(pattern)) }
  assert.equal(hapticFeedback({}, true, 'retrieve'), false)
  assert.equal(hapticFeedback(device, false, 'retrieve'), false)
  assert.equal(hapticFeedback(device, true, 'running'), false)
  assert.equal(hapticFeedback(device, true, 'retrieve'), true)
  assert.deepEqual(requested, [[20]])
  assert.equal(hapticFeedback({ vibrate() { throw Error() } }, true, 'collision'), false)
  const profile = normalizeProfile(JSON.parse(JSON.stringify({ best: 100, motion: true, keepAwake: false,
    masterVolume: .6, ambientVolume: .3, musicVolume: 0, wildlifeVolume: .7, effectsVolume: .9, haptics: true })))
  assert.deepEqual([profile.best, profile.motion, profile.keepAwake, profile.haptics], [100, true, false, true])
  assert.deepEqual([profile.masterVolume, profile.ambientVolume, profile.musicVolume, profile.wildlifeVolume,
    profile.effectsVolume], [.6, .3, 0, .7, .9])
})

test('all fifteen territories have distinct sound profiles with continuous regional transitions', () => {
  assert.deepEqual(Object.keys(soundscapes), expeditionRegions.map(region => region.key))
  assert.equal(new Set(Object.values(soundscapes).map(String)).size, 15)
  for (let index = 0; index < 15; index++) {
    const seconds = 30 * index
    const before = ambienceMix(seconds - .0001)
    const after = ambienceMix(seconds + .0001)
    assert.equal(before.length, 5)
    assert.ok(before.every((value, layer) => value >= 0 && value <= 1 && Math.abs(value - after[layer]) < .01))
  }
  assert.deepEqual(ambienceMix(600), soundscapes.mountain)
})
