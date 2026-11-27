import assert from 'node:assert/strict'
import test from 'node:test'
import { expeditionRegions } from '../src/expedition.js'
import { buildTile } from '../src/terrain-geometry.js'
import { centerAt, segmentLength, trailHeight } from '../src/trail.js'
import { southernModel } from '../src/southern-banks.js'
import { shoreHeight } from '../src/landforms.js'

test('all fifteen terrain profiles preserve lane elevations and share tile boundaries', () => {
  for (const region of expeditionRegions) {
    const index = Math.round(region.marker / segmentLength)
    const tile = buildTile(index, 7)
    const first = tile.ground.buffers.position.values
    const second = buildTile(index + 1, 7).ground.buffers.position.values
    const columns = first.length / ((segmentLength * 2 + 1) * 3)
    const start = index * segmentLength
    for (const [column, lateral] of [[14,-1.6],[16,0],[18,1.6]]) {
      for (const row of [0, 18, 43, segmentLength * 2]) {
        const height = first[(row * columns + column) * 3 + 1]
        assert.ok(Math.abs(height - (trailHeight(start + row / 2, lateral) - .008)) < .00001, region.key)
      }
    }
    for (let column = 0; column < columns; column++) {
      const end = (segmentLength * 2 * columns + column) * 3
      const begin = column * 3
      assert.ok(Math.abs(first[end] + centerAt(start) - second[begin] - centerAt(start + segmentLength)) < .00002)
      assert.equal(first[end + 1], second[begin + 1], region.key)
      assert.ok(Math.abs(first[end + 2] + segmentLength - second[begin + 2]) < .00001)
    }
    if (tile.water) {
      const depths = tile.water.buffers.marshDepth.values
      for (const row of [0, 9, 23, segmentLength]) {
        for (const col of [4, 13, 16, 25, columns-1]) {
          const floor = first[((segmentLength-row)*2*columns + col)*3+1]
          assert.ok(Math.abs(depths[row*columns+col]-Math.min(.98,-.55-floor)) < .00001, region.key)
        }
      }
    }
  }
})

test('tidal channels, rice drainage and river banks contain wet and dry ground beyond the lane', () => {
  for (const region of expeditionRegions.filter(value => ['gulf','flyway','ozark'].includes(value.key))) {
    const samples = []
    for (let d = 15; d < 165; d += 4) {
      for (let x = 6; x < 38; x++) samples.push(shoreHeight(region, region.marker + d, x)[0])
    }
    assert.ok(samples.some(y => y < -.73), region.key)
    assert.ok(samples.some(y => y > -.27), region.key)
  }
})

test('southern authored geometry is shared, indexed and bounded at both vegetation qualities', () => {
  for (const [detailed, compact] of [['TidalCordgrass','SaltFlatGrass'],['BottomlandOak','BottomlandOakLOD'],['WillowOak','WillowOakLOD']]) {
    const near = southernModel(detailed)
    const far = southernModel(compact)
    assert.equal(southernModel(detailed), near)
    assert.ok(near.index.count < 4000 && far.index.count < near.index.count * .55)
    assert.ok(near.index.array.every(index => index < near.attributes.position.count))
  }
})
