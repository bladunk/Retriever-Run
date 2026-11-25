import { atmosphereBlend } from './expedition.js'

// Wind, water, foliage, insects and recorded creek presence. Wildlife calls
// still originate from the actual species encounters and their existing bus.
export const soundscapes = {
  gulf:       [ .74, .70, .40, .14, .38 ],
  cypress:    [ .30, .60, .34, .84, .36 ],
  flyway:     [ .56, .58, .44, .30, .48 ],
  timber:     [ .37, .71, .60, .38, .32 ],
  ozark:      [ .47, .77, .73, .30, .88 ],
  farm:       [ .76, .13, .88, .30, .12 ],
  platte:     [ .69, .87, .67, .18, .88 ],
  sandhills:  [ .97, .22, .53, .16, .08 ],
  prairie:    [ .84, .40, .53, .13, .21 ],
  dakota:     [ .91, .48, .31, .05, .25 ],
  manitoba:   [ .61, .68, .45, .20, .50 ],
  parklands:  [ .58, .27, .61, .09, .17 ],
  boreal:     [ .40, .46, .70, .06, .54 ],
  foothills:  [ .77, .51, .65, .02, .60 ],
  mountain:   [ .96, .64, .33, .00, .74 ],
}

export function ambienceMix(seconds) {
  const { from, to, blend } = atmosphereBlend(seconds)
  const start = soundscapes[from.key]
  const end = soundscapes[to.key]
  return start.map((value, layer) => value + (end[layer] - value) * blend)
}
