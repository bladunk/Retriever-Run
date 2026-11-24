import { courseRuleset, campRuleset } from './ruleset.js'

const rankedRulesetAvailable = courseRuleset === campRuleset
let ready = false
let updateLocked = false

export const productionSession = {
  prepared() { return ready },
  rankedRulesetAvailable,
  gateRanked() { return !rankedRulesetAvailable || (import.meta.env.PROD && !ready) },
  setPrepared(value) { ready = value },
  lock(value) { updateLocked = value },
  locked() { return updateLocked },
}
