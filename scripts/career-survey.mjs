import { pathToFileURL } from 'node:url'
import { runXP, xpAt } from '../src/career.js'
import { distanceAtTime } from '../src/difficulty.js'

const checkpoints = [10, 20, 30, 40, 50, 60, 70, 80, 99, 100]
const profiles = [
  ['Novice', 27, .27, 160, .30],
  ['Casual', 69, .12, 285, .54],
  ['Skilled', 154, .05, 530, .75],
  ['Exceptional', 258, .02, 730, .92],
]
const decimal = value => Math.round(value * 10) / 10

export function surveyCareers() {
  return profiles.map(([player, baseHunt, earlyChance, ceiling, mastery], index) => {
    let seed = 71923 + 1217 * index
    function random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
      return seed / 4294967296
    }
    let xp = 0, active = 0, hunts = 0, retrieves = 0, migrations = 0, metres = 0, best = 0, record = 0
    const levels = {}
    for (const level of checkpoints) {
      while (xp < xpAt(level)) {
        const duration = random() < earlyChance ? 3 + 12 * random()
          : Math.min(ceiling, baseHunt * (.24 + random() ** 1.55 * 2.8))
        const distance = distanceAtTime(duration)
        const birds = Math.floor(random() + duration / (132 - 75 * mastery) * (.72 + random() * .58))
        const pheasants = duration >= 150 ? Math.floor(birds * (.24 + .55 * random())) : 0
        const score = Math.floor(distance * (1.3 + 2.25 * mastery) * (.83 + random() * .32))
        const jumpClears = Math.floor(duration * mastery * .10)
        const slidesCleared = Math.floor(duration * mastery * .045)
        const geese = Math.floor(Math.max(0, duration - 75) * mastery * .02)
        const field = { routes: Math.floor(Math.max(0, duration - 90) * mastery * .012) }
        xp += runXP({ duration, distance, score, ducks: birds - pheasants, pheasants, jumpClears, slidesCleared, geese, field },
          score > record ? ['score'] : [])
        active += duration
        hunts++
        retrieves += birds
        metres += distance
        migrations += Number(duration >= 450)
        best = Math.max(best, duration)
        record = Math.max(record, score)
      }
      levels[level] = { hours: decimal(active / 3600), withReplayHours: decimal((active + hunts * 6) / 3600) }
    }
    return { player, levels, hunts, averageSeconds: decimal(active / hunts), longestSeconds: decimal(best),
      retrieves, migrations, distanceKm: Math.floor(metres / 1000), bestScore: record }
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(surveyCareers(), null, 2))
