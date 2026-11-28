import { firstContact, obstacleVolumes } from './collision.js'

const poseKeys = ['distance', 'elapsed', 'x', 'lane', 'lateralSpeed', 'jump', 'slide', 'power', 'speed']
const hazardKeys = ['type', 'lane', 'distance', 'wide', 'variant', 'turn', 'span', 'flightSpeed', 'direction', 'lead',
  'safeLane', 'pattern', 'rowId', 'hazard']
const contactKeys = ['type', 'lane', 'elapsed', 'fraction', 'distance', 'part', 'solid', 'pattern', 'height',
  'obstacleDistance', 'obstacleLane', 'targetLane', 'jumpRemaining', 'slideRemaining', 'action']
const pick = (value, keys) => Object.fromEntries(keys.filter(key => {
  const item = value[key]
  return Number.isFinite(item) || typeof item === 'boolean' || typeof item === 'string' && item.length < 96
}).map(key => [key, value[key]]))
const validPose = pose => pose && poseKeys.every(key => Number.isFinite(pose[key]))

export function createIncidentCapture() {
  const inputs = []
  const intervals = []
  let latest
  return {
    reset() { inputs.length = 0; intervals.length = 0; latest = undefined },
    input(tick, move) {
      if (inputs.length === 32) inputs.shift()
      inputs.push({ tick, move })
    },
    frame(ms) {
      if (intervals.length === 90) intervals.shift()
      intervals.push(Math.round(ms * 10) / 10)
    },
    fatal({ seed, ruleset, territory, stage, tick, before, after, contact, entities, pressure }) {
      latest = {
        seed, ruleset, territory, stage, tick, before: pick(before, poseKeys), after: pick(after, poseKeys),
        expected: pick(contact, contactKeys), hazards: entities.filter(entity => entity.hazard &&
          Math.abs(entity.distance - before.distance) <= 32).slice(0, 36).map(entity => pick(entity, hazardKeys)),
        inputs: inputs.slice(), pressure: pressure && pick(pressure, Object.keys(pressure)),
      }
    },
    diagnostics(graphics, includeIncident) {
      const timing = intervals.length ? {
        samples: intervals.length,
        averageMs: Math.round(10 * intervals.reduce((sum, ms) => sum + ms, 0) / intervals.length) / 10,
        worstMs: Math.max(...intervals),
        over20: intervals.filter(ms => ms > 20).length,
        over33: intervals.filter(ms => ms > 33.3).length,
        over50: intervals.filter(ms => ms > 50).length,
      } : undefined
      return { graphics, ...(timing && { timing }), ...(includeIncident && latest && { incident: latest }) }
    },
  }
}

export function inspectIncident(incident, builtWith, reviewBuild) {
  if (!incident || !validPose(incident.before) || !validPose(incident.after) || !Number.isFinite(incident.expected?.fraction) ||
      !Array.isArray(incident.hazards) || incident.hazards.length > 36 ||
      incident.hazards.some(hazard => !hazard || typeof hazard.type !== 'string' || !Number.isFinite(hazard.distance) ||
        !Number.isFinite(hazard.lane))) return { status: 'insufficient' }
  if (incident.after.elapsed - incident.before.elapsed < 0 || incident.after.elapsed - incident.before.elapsed > .012 ||
      incident.after.distance - incident.before.distance < 0 || incident.after.distance - incident.before.distance > 1) {
    return { status: 'insufficient' }
  }
  try {
    const witness = {}
    const actual = firstContact(incident.before, incident.after, incident.hazards, witness)
    const match = Boolean(actual && witness.type === incident.expected.type && witness.lane === incident.expected.lane &&
      Math.abs(witness.fraction - incident.expected.fraction) <= 1e-8)
    const sameBuild = builtWith === reviewBuild
    return { status: match ? sameBuild ? 'reproduced' : 'matched_on_review_build' : 'mismatch',
      sameBuild, collision: actual ? pick(witness, contactKeys) : null,
      volumes: actual ? obstacleVolumes(actual) ?? null : null }
  } catch { return { status: 'insufficient' } }
}
