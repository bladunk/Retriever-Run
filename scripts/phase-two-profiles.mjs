import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const source = process.argv[2] ?? '.'
const count = Number(process.argv[3] ?? 128)
const load = file => import(pathToFileURL(resolve(source, 'src', file + '.js')))
const { createCourse, newRun, advance, touchesPickup, score, collect, reactionWindow } = await load('runner')
const { firstContact } = await load('collision')
const { tickSeconds } = await load('timing')
const { seededRandom } = await load('trail')
const profiles = [
  ['route reference', reactionWindow, .035, 0, false],
  ['conservative', .45, .045, 0, false],
  ['collectible seeking', .45, .045, 0, true],
  ['delayed reaction', .58, .07, 0, false],
  ['uneven timing', .45, .21, 0, false],
  ['occasionally missed actions', .45, .05, .065, false],
]
const { createRunControls } = await load('run-controls')
const stats = { generation: 0, generatedRows: 0, collision: 0, contactChecks: 0 }

function replay(seed, delay, tolerance, missed, risky) {
  const course = createCourse(seed)
  const input = createRunControls()
  const random = seededRandom(seed ^ 0xf19b4)
  const run = newRun()
  const before = {}
  const contact = {}
  const rows = []
  const active = []
  let released = -1, swipeAfter = 0, cursor, sent, target, action, paceError, tookRisk
  let treats = 0, riskTrails = 0

  while (run.elapsed < 315) {
    while (!rows.length || rows.at(-1).at < run.distance + 90) {
      const t = performance.now()
      const next = course()
      stats.generation += performance.now() - t
      stats.generatedRows++
      rows.push(next)
      active.push(...next.entities)
    }
    if (cursor !== rows[0]) {
      cursor = rows[0]
      const bonus = risky && cursor.entities.find(item => item.riskExit)
      target = bonus ? bonus.lane : cursor.lane
      action = bonus ? cursor.pattern === 'forked-timber' && target === 0 ? 'slide' : 'jump'
        : cursor.gate?.action ?? (cursor.gate && (cursor.entities[0].type === 'branch' ? 'slide' : 'jump'))
      paceError = (random() * 2 - 1) * tolerance
      tookRisk = Boolean(bonus)
      sent = false
    }
    if (run.lane !== target && run.elapsed >= Math.max(swipeAfter, released + delay)) {
      if (random() >= missed) input.enqueue(run.lane < target ? 'right' : 'left')
      swipeAfter = run.elapsed + .16
    }
    if (action && !sent && cursor.at - run.distance <= run.speed * ((action === 'jump' ? .92 : .87) / 2 + paceError)) {
      if (random() >= missed) input.enqueue(action)
      sent = true
    }
    input.apply(run, () => {})
    Object.assign(before, run)
    advance(run, tickSeconds)
    const time = performance.now()
    const impact = firstContact(before, run, active, contact)
    stats.collision += performance.now() - time
    stats.contactChecks++
    if (impact) break
    for (let index = 0; index < active.length; index++) {
      const item = active[index]
      if (touchesPickup(run, item)) {
        collect(run, item.type)
        if (item.type === 'treat') treats++
        if (item.riskExit) riskTrails++
      } else if (item.distance >= run.distance - (item.hazard ? 4 : 1)) continue
      active.splice(index--, 1)
    }
    if (run.distance > (cursor.end ?? cursor.at) + (tookRisk ? 4.55 : 1.58)) {
      rows.shift()
      released = run.elapsed
    }
  }
  return { seconds: run.elapsed, score: score(run), treats, riskTrails }
}

const mean = (list, key) => +(list.reduce((sum, item) => sum + item[key], 0) / list.length).toFixed(2)
const samples = profiles.map(([name, delay, tolerance, missed, risky]) => {
  const runs = Array.from({ length: count }, (_, i) =>
    replay(Math.imul(i + 1, 0x53d72d91) >>> 0, delay, tolerance, missed, risky))
  runs.sort((a, b) => a.seconds - b.seconds)
  const p = fraction => +runs[Math.floor(runs.length * fraction)].seconds.toFixed(2)
  return { name, delay, tolerance, missed, risky, completed: runs.filter(run => run.seconds >= 300).length,
    p25Seconds: p(.25), medianSeconds: p(.50), p75Seconds: p(.75),
    meanScore: mean(runs, 'score'), meanTreats: mean(runs, 'treats'), meanRiskExits: mean(runs, 'riskTrails') }
})

console.log(JSON.stringify({ countPerProfile: count, samples, perf: {
  meanCourseRowMs: +(stats.generation / stats.generatedRows).toFixed(4), generatedRows: stats.generatedRows,
  meanCollisionStepMs: +(stats.collision / stats.contactChecks).toFixed(4), contactChecks: stats.contactChecks,
} }, null, 2))
