import { firstContact } from './collision.js'
import { diveAge, diveExit } from './dive.js'
import { act, advance, collect, createCourse, newRun, score, touchesPickup } from './runner.js'
import { courseRuleset, masteryCourseRuleset } from './ruleset.js'
import { masteryDirector } from './difficulty.js'
import { createMasteryCourse } from './mastery-course.js'
import { collectMastery, createSkillTracker, sweptPickup } from './mastery-events.js'
import { samplePose, tickSeconds } from './timing.js'

export const rankedVersion = 'great-migration-1'
export const rankedCourse = courseRuleset
export const lastRankedTick = 108000
export const maxRankedActions = 2048
export const rankedMoves = Object.freeze(['left', 'right', 'jump', 'slide'])

// Record accepted controls on the fixed tick before advance, including the
// input buffer's accepted action. The server neither trusts client stats
// nor needs device timestamps, rendering events or unaccepted gestures.
export function recordRankedActions(course = rankedCourse) {
  const mastery = course === masteryCourseRuleset
  const ticksLimit = mastery ? maxMasteryTicks : lastRankedTick
  const actionsLimit = mastery ? maxMasteryActions : maxRankedActions
  const actions = []
  let full = false
  return {
    add(tick, move) {
      if (tick >= ticksLimit || actions.length >= actionsLimit) full = true
      if (!full) actions.push(tick * 4 + rankedMoves.indexOf(move))
    },
    finish(ticks) {
      return full || ticks > ticksLimit ? null : { ticks, actions }
    },
  }
}

export function validRankedTrace(trace) {
  return validTrace(trace, lastRankedTick, maxRankedActions, 17)
}

export const masteryReplayVersion = 'one-more-hunt-1'
export const maxMasteryTicks = 120 * 60 * 60
export const maxMasteryActions = 8192

export function validMasteryTrace(trace) {
  return trace?.course === masteryCourseRuleset && trace.season === masteryReplayVersion &&
    validTrace(trace, maxMasteryTicks, maxMasteryActions, 2)
}

function validTrace(trace, maxTicks, maxActions, simultaneous) {
  if (!Number.isSafeInteger(trace?.ticks) || trace.ticks < 240 || trace.ticks > maxTicks ||
      !Array.isArray(trace.actions) || trace.actions.length > maxActions) return false
  let last = -1
  let onTick = 0
  for (const entry of trace.actions) {
    if (!Number.isSafeInteger(entry) || entry < 0 || entry >= trace.ticks * 4) return false
    const tick = Math.floor(entry / 4)
    if (tick < last) return false
    onTick = tick === last ? onTick + 1 : 1
    if (onTick > simultaneous) return false
    last = tick
  }
  return true
}

// Course objects, collision, pickup order and scoring are the same code used
// by the runner. Assets, render time and graphics options are outside this path.
export function verifyRankedReplay(seed, trace) {
  return verifyTrace(seed, trace, false)
}

export function verifyMasteryReplay(seed, trace) {
  return verifyTrace(seed, trace, true)
}

function verifyTrace(seed, trace, mastery) {
  const valid = mastery ? validMasteryTrace : validRankedTrace
  if (!valid(trace) || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return null
  const rules = mastery ? masteryDirector : undefined
  const run = newRun(rules)
  const skill = mastery ? createSkillTracker() : undefined
  const previous = {}
  const hit = {}
  const next = mastery ? createMasteryCourse(seed) : createCourse(seed)
  const entities = []
  let row = next()
  let action = 0
  for (let tick = 0; tick < trace.ticks; tick++) {
    while (row.at < run.distance + 102) {
      entities.push(...row.entities)
      row = next()
    }
    while (Math.floor(trace.actions[action] / 4) === tick) {
      if (!act(run, rankedMoves[trace.actions[action++] % 4])) return null
    }
    samplePose(previous, run, run, 1)
    advance(run, tickSeconds, rules)
    if (firstContact(previous, run, entities, hit)) {
      if (tick + 1 !== trace.ticks || action !== trace.actions.length) return null
      samplePose(run, previous, run, hit.fraction)
      return { score: score(run), distance: Math.floor(run.distance), duration: Math.round(run.elapsed * 1000),
        retrieves: run.retrieves, combo: run.bestStreak,
        ...(mastery ? { nearMisses: run.nearMisses, cleanStreak: run.bestCleanStreak } : {}) }
    }
    skill?.(previous, run, entities)
    for (let index = 0; index < entities.length; index++) {
      const item = entities[index]
      const ahead = item.distance - run.distance
      if (item.type === 'goose') {
        if (diveAge(item, run.distance) > diveExit) entities.splice(index--, 1)
      } else if (mastery ? sweptPickup(previous, run, item) : touchesPickup(run, item)) {
        if (mastery) collectMastery(run, item, collect)
        else collect(run, item.type)
        entities.splice(index--, 1)
      } else if (ahead < (item.type === 'treat' ? -1 : -8 - (item.span ?? 0) * .5)) {
        if (item.type === 'treat' && !item.comboOptional) run.streak = 0
        entities.splice(index--, 1)
      }
    }
  }
  return null
}
