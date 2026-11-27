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
  manitoba:   [ .67, .78, .38, .14, .38 ],
  parklands:  [ .53, .28, .77, .06, .16 ],
  boreal:     [ .34, .46, .82, .04, .48 ],
  foothills:  [ .69, .71, .57, .01, .83 ],
  mountain:   [ .88, .74, .28, .00, .84 ],
}

export function ambienceMix(seconds) {
  const { from, to, blend } = atmosphereBlend(seconds)
  const start = soundscapes[from.key]
  const end = soundscapes[to.key]
  return start.map((value, layer) => value + (end[layer] - value) * blend)
}
