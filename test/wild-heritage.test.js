import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import test from 'node:test'
import { expeditionRegions } from '../src/expedition.js'
import { localHonors } from '../src/field-honors.js'
import { honorFamilies } from '../src/honor-ui.js'
import { kennelItems } from '../src/kennel-catalog.js'
import { chapterContent, migrationChapter } from '../src/migration-chapter.js'

test('the chapter names and numbering follow the authoritative migration', () => {
  const chapters = expeditionRegions.map(region => chapterContent(region))
  assert.equal(chapters.length, 15)
  assert.equal(new Set(chapters.map(chapter => chapter.subtitle)).size, 15)
  for (const [index, chapter] of chapters.entries()) {
    assert.equal(chapter.title, expeditionRegions[index].name)
    assert.ok(chapter.series.endsWith(String(index + 1).padStart(2, '0') + ' / 15'))
    assert.equal(chapter.milestone, '')
  }
  assert.equal(chapterContent(expeditionRegions[10], { first: true }).milestone, 'First arrival in Canada')
  assert.equal(chapterContent(expeditionRegions[13], { first: true }).title, 'Canadian Rocky Mountain Foothills')
  assert.equal(chapterContent(expeditionRegions[14], { endless: true }).title, 'Into the Endless')
})

test('a chapter holds for 2.8 simulated seconds and repeated updates do not restart it', t => {
  const stored = new Map()
  const segments = []
  const element = () => ({
    hidden: true,
    appendChild(child) { segments.push(child); return child },
    animate() {},
    setAttribute(key, value) { stored.set(key, value) },
    toggleAttribute() {},
  })
  const original = globalThis.document
  globalThis.document = { createElement: element, documentElement: { hasAttribute: () => true } }
  t.after(() => {
    if (original === undefined) delete globalThis.document
    else globalThis.document = original
  })
  const ui = Object.fromEntries(['migration-chapter', 'migration-ribbon', 'chapter-title', 'chapter-series',
    'chapter-subtitle', 'chapter-milestone'].map(key => [key, element()]))
  const chapter = migrationChapter(ui)
  const region = expeditionRegions[1]
  chapter.show(region, 30, {})
  chapter.show(region, 31, {})
  chapter.update(region, 32.7, false)
  assert.equal(ui['migration-chapter'].hidden, false)
  assert.equal(ui['chapter-title'].textContent, 'Southern Cypress Swamp')
  assert.equal(segments.length, 15)
  assert.equal(stored.get('aria-valuenow'), '2')
  chapter.update(region, 32.8, false)
  assert.equal(ui['migration-chapter'].hidden, true)
  chapter.reset()
  chapter.show(region, 30, {})
  assert.equal(ui['migration-chapter'].hidden, false)
})

test('grouping Field Honors preserves each original record and keeps secret tiers separate', () => {
  const families = honorFamilies(localHonors)
  assert.ok(families.some(family => family.tiers.length === 4))
  const flattened = families.flatMap(family => family.tiers)
  assert.deepEqual(new Set(flattened), new Set(localHonors))
  assert.equal(flattened.length, localHonors.length)
  assert.ok(families.filter(family => family.tiers.length > 1).every(family => family.tiers.every(honor => !honor.secret)))
})

test('each owned or locked catalog item has a single offline studio render', async () => {
  const files = await readdir(new URL('../public/gear/', import.meta.url))
  assert.deepEqual(files.sort(), kennelItems.map(({ id }) => id + '.webp').sort())
})
