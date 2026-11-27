import { atmosphereBlend } from './expedition.js'

// Wind, water, foliage, insects, creek, wind edge in Hz, water spectrum in
// Hz, foliage spectrum in Hz, open-channel width, and low bank resonance.
// Profiles are mixed at the same boundary used by the landscape lighting.
export const soundscapes = {
  gulf:      [.96,.60,.46,.12,.25, 750,1020,1510,.40,.18],
  cypress:   [.23,.42,.25,.92,.26, 420, 540,1080,.12,.48],
  flyway:    [.68,.36,.56,.34,.36, 760, 700,1540,.35,.18],
  timber:    [.38,.63,.58,.39,.22, 480, 600,1390,.20,.36],
  ozark:     [.39,.87,.51,.22,.96, 650,1230,1370,.28,.42],
  farm:      [.78,.08,.92,.29,.08, 850, 620,1660,.11,.10],
  platte:    [.59,.90,.39,.16,.83, 810,1100,1380,.58,.22],
  sandhills: [1.0,.13,.70,.14,.06, 650, 680,1300,.41,.27],
  prairie:   [.81,.53,.62,.24,.19, 735, 840,1480,.48,.14],
  dakota:    [.93,.61,.46,.07,.25, 900, 915,1520,.54,.20],
  manitoba:  [.68,.85,.61,.10,.42, 820, 830,1200,.65,.30],
  parklands: [.56,.27,.98,.08,.13, 575, 695,1700,.26,.30],
  boreal:    [.36,.49,.79,.02,.47, 415, 780,1040,.23,.56],
  foothills: [.68,.75,.62,.00,.94, 680,1290,1210,.42,.61],
  mountain:  [.91,.65,.23,.00,.75, 850,1150,1180,.70,.62],
}

export function ambienceMix(seconds) {
  const { from, to, blend } = atmosphereBlend(seconds)
  const start = soundscapes[from.key]
  const end = soundscapes[to.key]
  return start.map((value, layer) => value + (end[layer] - value) * blend)
}
