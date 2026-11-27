export const masteryStart = 450
export const masterySpeedCeiling = 29.4
const approachSeconds = 480

export function endlessPressure(seconds) {
  const age = Math.max(0, seconds - masteryStart)
  const pressure = age / (age + approachSeconds)
  return {
    pressure,
    decisionGap: 1.04 - .18 * pressure,
    gateGap: 1.53 - .15 * pressure,
    stringLength: 4 + Math.floor(pressure * 9),
    relief: .88 - .59 * pressure,
    repeatChangeChance: .34 + .60 * pressure,
    secondGateChance: .22 + .58 * pressure,
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
