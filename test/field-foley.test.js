import assert from 'node:assert/strict'
import test from 'node:test'
import { expeditionRegions } from '../src/expedition.js'
import { pawSounds, pawSurface } from '../src/field-foley.js'

test('the migration has audibly distinct surfaces and only presentation selects foley', () => {
  const surfaces = expeditionRegions.map(region => pawSurface(region))
  assert.deepEqual(surfaces, [
    'mud','mud','dirt','mud','gravel','gravel','gravel','sand',
    'grass','grass','mud','grass','dirt','gravel','snow',
  ])
  const farm = expeditionRegions[5]
  assert.equal(pawSurface(farm, .7), 'mud')
  assert.equal(pawSurface(farm, .7, .22), 'frost')
  assert.equal(pawSurface(farm, .7, .22, true), 'splash')
  assert.equal(pawSurface(expeditionRegions.at(-1), .7, .22, true), 'splash')
  assert.equal(new Set(Object.values(pawSounds).map(String)).size, 9)
  assert.ok(Object.values(pawSounds).every(([gain, hz, seconds]) =>
    gain > 0 && gain < .06 && hz > 220 && hz < 1800 && seconds < .20))
})
