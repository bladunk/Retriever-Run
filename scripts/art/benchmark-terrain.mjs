import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { expeditionRegions } from '../../src/expedition.js'
import { distanceAtTime } from '../../src/difficulty.js'
import { segmentLength } from '../../src/trail.js'

const [baseline, candidate = '.'] = process.argv.slice(2)
if (!baseline) throw new Error('Usage: node scripts/art/benchmark-terrain.mjs <baseline repo> [candidate repo]')
const builders = await Promise.all([baseline,candidate].map(async root =>
  (await import(pathToFileURL(resolve(root,'src/terrain-geometry.js')).href)).buildTile))
const seed = 7
const comparisons = []
for (const region of expeditionRegions.slice(0,5)) {
  const tiles = [5,15,27].map(seconds => Math.floor(distanceAtTime(region.seconds + seconds) / segmentLength))
  const timings = [[],[]]
  const cpu = [[],[]]
  for (const build of builders) build(tiles[1],seed)
  for (let sample = 0; sample < 15; sample++) {
    for (const side of sample % 2 ? [1,0] : [0,1]) {
      const started = performance.now()
      const used = process.cpuUsage()
      builders[side](tiles[sample % tiles.length],seed)
      const { user, system } = process.cpuUsage(used)
      cpu[side].push((user + system) / 1000)
      timings[side].push(+(performance.now() - started).toFixed(3))
    }
  }
  const median = values => values.toSorted((a,b) => a-b)[7]
  comparisons.push({ region:region.key, tiles, seed, beforeMs:timings[0], afterMs:timings[1],
    medians:timings.map(median), beforeCpuMs:cpu[0], afterCpuMs:cpu[1], cpuMedians:cpu.map(median) })
}
console.log(JSON.stringify({
  method:'15 paired CPU calls per region, alternating order and warming each implementation once.',
  comparisons,
},null,2))
