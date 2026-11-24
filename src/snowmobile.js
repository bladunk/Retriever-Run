// The chassis, track, seat, hood and cowl dimensions drive the renderer and
// the swept collision solver. Skis and steering bars keep separate trim.
export const snowmobileParts = [
  ['rubber track', 'track', 0x373735, 0,.31,.34, .91,.54,1.58],
  ['running boards', 'frame', 0x4e5351, 0,.57,.23, 1.15,.13,1.77],
  ['saddle', 'seat', 0x43403b, 0,.80,.40, .65,.36,.96],
  ['hood', 'hood', 0x87442e, 0,.83,-.57, .94,.64,1.04],
  ['windscreen', 'screen', 0x657e81, 0,1.28,-.49, .66,.53,.14],
  ['left ski', 'ski', 0x454947, -.44,.078,-1.04, .24,.156,1.23],
  ['right ski', 'ski', 0x454947, .44,.078,-1.04, .24,.156,1.23],
]
export const snowmobileVolumes = snowmobileParts.map(([name, , , x,y,z,w,h,d]) => ({
  name, x, y, z, hx: w * .48, hy: h * .47, hz: d * .46,
}))
