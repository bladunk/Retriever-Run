import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const source = process.argv[2] ?? '.'
const numberOfCourses = Number(process.argv[3] ?? 512)
const { createCourse, speedAtTime } = await import(pathToFileURL(resolve(source, 'src/runner.js')))
const { laneWidth } = await import(pathToFileURL(resolve(source, 'src/trail.js')))
const { expeditionRegions, territorySeconds } = await import(pathToFileURL(resolve(source, 'src/expedition.js')))
const totals = Array.from({ length: 20 }, (_, index) => ({
  stage: index + 1, start: index * 15, switchSlides: 0, repeated: 0, recovery: 0, encounters: 0, crowded: 0, switches: 0, jumps: 0, slides: 0,
  chains: 0, guaranteedFree: 0, gearRisk: 0, reaction: [], gaps: [], patterns: new Set(),
}))
const regions = expeditionRegions.map(({ name }) => ({ territory: name, hazards: {}, rocks: 0 }))
const pickNumber = (arr, fraction) => Number((arr.sort((a, b) => a - b)[Math.floor((arr.length - 1) * fraction)] ?? 0).toFixed(3))
const rate = count => Number((count * 4 / numberOfCourses).toFixed(1))
for (let seed = 0; seed < numberOfCourses; seed++) {
  const next = createCourse(Math.imul(seed + 1, 0x53d72d91) >>> 0)
  let previous
  for (let row = next(); row.time < 300; row = next()) {
    const stage = totals[Math.floor(row.time / 15)]
    const hazards = row.entities.filter(item => item.hazard)
    if (!hazards.length && previous) stage.recovery++
    if (hazards.length) {
      const mix = regions[Math.floor(row.time / territorySeconds)]
      for (const item of hazards) mix.hazards[item.type] = (mix.hazards[item.type] ?? 0) + 1
      if (hazards.some(item => item.type === 'rock')) mix.rocks++
      stage.encounters++
      const wide = row.gate && row.entities.find(item => item.wide)
      const occupied = new Set(hazards.map(item => item.lane)).size
      const delta = previous ? Math.abs(row.lane - previous.lane) : 0
      if (wide?.type === 'stream') stage.jumps++
      if (wide?.type === 'branch' || row.gate?.action === 'slide') stage.slides++
      if (delta && row.gate?.action === 'slide') stage.switchSlides++
      if (previous?.pattern && previous.pattern === row.pattern) stage.repeated++
      if (occupied >= 2 || wide) stage.crowded++
      if (!wide && occupied < 2) stage.guaranteedFree++
      if (delta) stage.switches++
      if (row.entities.some(item => !item.hazard && item.lane !== row.lane)) stage.gearRisk++
      if (previous) {
        const previousTypes = [...new Set(previous.entities.filter(item => item.hazard).map(item => item.type))].sort().join('+')
        const types = [...new Set(hazards.map(item => item.type))].sort().join('+')
        const gap = row.time - previous.time
        if (previousTypes && gap <= 1.65 && (row.gate || previous.gate || delta)) {
          stage.chains++
          stage.patterns.add(previousTypes + ' → ' + types)
        }
        stage.gaps.push(gap)
        if (delta) {
          const clearance = (row.at - (previous.end ?? previous.at) - 3.10) / speedAtTime(row.time + .35)
          stage.reaction.push(clearance - .16 * delta - Math.log(delta * laneWidth / .30) / 17)
        }
      }
    }
    previous = row
  }
}
const territories = regions.map(({ territory, hazards, rocks }) => {
  const instances = Object.values(hazards).reduce((sum, n) => sum + n, 0)
  return { territory, hazards, rockShare: +(100 * rocks / instances).toFixed(1),
    secondsPerRock: rocks ? +(territorySeconds * numberOfCourses / rocks).toFixed(1) : null }
})
console.log(JSON.stringify({ seeds: numberOfCourses, territories, stages: totals.map(({ start, stage, switchSlides, repeated, recovery, encounters, crowded, switches, jumps,
  slides, chains, guaranteedFree, gearRisk, reaction, gaps, patterns }) => ({
    stage, speed: +speedAtTime(start + 7.5).toFixed(2), encounters: rate(encounters), crowded: rate(crowded),
    switches: rate(switches), jumps: rate(jumps), slides: rate(slides), chains: rate(chains),
    switchSlides: rate(switchSlides), repeated: rate(repeated), recovery: rate(recovery),
    singleLane: rate(guaranteedFree), riskRoutes: rate(gearRisk), reactionP10: pickNumber(reaction, .10),
    medianGap: pickNumber(gaps, .50), pairFamilies: patterns.size,
  })) }, null, 2))
