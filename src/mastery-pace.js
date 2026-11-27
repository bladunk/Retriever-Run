export const masteryStart = 450
export const masterySpeedCeiling = 29.4
const approachSeconds = 480

export function endlessPressure(seconds) {
  const age = Math.max(0, seconds - masteryStart)
  const pressure = age / (age + approachSeconds)
  return {
    pressure,
    decisionGap: 1.26 - .34 * pressure,
    gateGap: 1.67 - .26 * pressure,
    stringLength: 2 + Math.floor(pressure * 8),
    relief: 1.65 - 1.16 * pressure,
    repeatChangeChance: .34 + .60 * pressure,
    secondGateChance: .18 + .55 * pressure,
  }
}

export function endlessSpeed(seconds, base) {
  const age = Math.max(0, seconds - masteryStart)
  return base + (masterySpeedCeiling - base) * (age / (age + approachSeconds))
}

export function endlessDistance(seconds, base) {
  const age = Math.max(0, seconds - masteryStart)
  return base * age + (masterySpeedCeiling - base) *
    (age - approachSeconds * Math.log1p(age / approachSeconds))
}
