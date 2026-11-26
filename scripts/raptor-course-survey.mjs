import { performance } from 'node:perf_hooks'
import { director, localDirector, difficultyAt, distanceAtTime, stageSeconds } from '../src/difficulty.js'
import { createCourse } from '../src/runner.js'

const seeds = 128
const endSeconds = 900
function survey(rules) {
  const primary = new Array(30).fill(0)
  let endless = 0, minGap = Infinity
  for (let seed = 0; seed < seeds; seed++) {
    const next = createCourse(seed, rules)
    let previous = -Infinity
    for (let row = next(); row.time < endSeconds; row = next()) {
      if (row.pattern !== 'swoop') continue
      const stage = Math.floor(row.time / stageSeconds)
      if (stage < primary.length) primary[stage]++
      else endless++
      minGap = Math.min(row.time - previous, minGap)
      previous = row.time
    }
  }
  return { primary, endless, minGap, total: primary.reduce((sum, count) => sum + count, endless) }
}

// Using a copied curve exercises the retained interval scan. Both paths
// perform the same arithmetic, validated tick by tick by the unit test.
const legacy = { ...director, curve: director.curve.map(point => [...point]) }
function timePace(rules, loops) {
  const begin = performance.now()
  let sum = 0
  for (let loop = 0; loop < loops; loop++) {
    for (let sample = 0; sample < 108000; sample++) {
      const at = sample / 120
      sum += difficultyAt(at, rules.curve) + distanceAtTime(at, rules)
    }
  }
  return { ms:performance.now()-begin, checksum:sum }
}
timePace(director,2)
timePace(legacy,2)
const pace = { original:[], optimized:[] }
for (let probe = 0; probe < 5; probe++) {
  for (const key of probe % 2 ? ['optimized','original'] : ['original','optimized'])
    pace[key].push(timePace(key === 'original' ? legacy : director,8))
}
console.log(JSON.stringify({ seeds,endSeconds,baseline:survey(director),raptor:survey(localDirector),pace },null,2))
