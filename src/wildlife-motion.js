import { speedAtTime } from './difficulty.js'
import { placeOnTrail } from './trail.js'
import { terrainElevation } from './landforms.js'
import { fieldSpecies } from './wildlife-catalog.js'

const defaultApproach = [61, 27]
const approaches = {
  deer: [61, 89], pheasant: [58, 55], goose: [82, 135], duck: [66, 57],
  crane: [102, 100], raptor: [88, 110], moose: [70, 58],
}
const flightProfiles = {
  duck: [5.4, .83, 11.0], teal: [8.3, .64, 13], diver: [6.3, .68, 10.8],
  'crest-diver': [6.7, .67, 11.4], crest: [6.1, .74, 11.2],
  spoon: [5.8, .72, 11.8], pintail: [5.2, .78, 12.5], merganser: [6.0, .70, 13.6],
  goose: [3.4, .69, 13.5], crane: [2.4, .75, 13.8], raptor: [2.25, .65, 12],
  wader: [2.75, .68, 9.4],
}
const individualBeats = { mallard: 5.6, goldeneye: 7.4, bufflehead: 8.0, 'blue-teal': 8.1,
  'green-teal': 8.65, 'wood-duck': 6.05, 'canada-goose': 3.35, 'cackling-goose': 3.85 }
export const encounterApproach = species => approaches[fieldSpecies[species]?.family] ?? (fieldSpecies[species] && flightProfiles[fieldSpecies[species].family] ? approaches.duck : defaultApproach)

const tau = 2*Math.PI
const smooth = (value, start, end) => {
  const t = Math.max(0,Math.min(1,(value-start)/(end-start)))
  return t*t*(3-2*t)
}
const move = (time, speed, ramp) => speed*(time-ramp*(1-Math.exp(-time/ramp)))
const bankLimit = (side, lateral) => side*Math.max(4.82,side*lateral)
const before = {}, after = {}
const motionYaw = (distance,lateral,ahead,nextLateral) => {
  placeOnTrail(before,distance,lateral,distance)
  placeOnTrail(after,distance+ahead,nextLateral,distance)
  return Math.atan2(before.x-after.x,before.z-after.z)
}
const current = {}, next = {}
const interval = .035

function pheasant(time, path) {
  path.along = .7*time + move(time,17.3,.36)
  path.side = -.85*smooth(time,.02,.62) + move(Math.max(0,time-.65),5.1,.43)
  path.lift = .06*Math.sin(time*9)*Math.exp(-4*time) +
    2.18*(1-Math.exp(-time*3.4)) + .70*Math.min(time,1.28) - .31*Math.max(0,time-1.48)
}

function waterDeparture(time, path, speed, diving) {
  path.along = time*.4 + move(time,speed,diving ? .76 : .38)
  path.side = move(time,2.35,.65)
  const running = Math.max(0,time-(diving ? .42 : .12))
  path.lift = 2.18*(1-Math.exp(-running*1.46)) + .52*Math.min(running,2)
}

function airborne(time, path, speed, bend, seed) {
  path.along = time*speed
  path.side = time*bend + .75*Math.sin(time*.67+seed)
  path.lift = .51*Math.sin(time*.66+seed) + .23*Math.sin(time*.33)
}

function heading(event, out, side, path, future) {
  const lateral = out.lateral+side*(future.side-path.side)
  out.yaw = motionYaw(event.distance+out.along,out.lateral,future.along-path.along,
    event.migration ? lateral : bankLimit(side,lateral))
}

export function encounterPose(event, animal, ahead, elapsed, unit, out) {
  const side = Math.sign(event.lateral)
  const group = unit > 0 ? Math.ceil(unit/2) : 0
  const formation = unit % 2 ? 1 : -1
  const speed = speedAtTime(event.previewElapsed ?? elapsed)
  ahead -= (event.previewClock ?? 0)*speed
  const seed = (event.seed % 1619)*.019 + unit*1.93
  const { family, size } = animal
  out.offset = group*formation*(family === 'crane' ? 1.9 : family === 'goose' ? 1.34 : .78)
  out.along = group*(flightProfiles[family] ? -1.82 : .83)
  out.height = event.height
  out.lateral = bankLimit(side,event.lateral+out.offset)
  out.yaw = side*-.71
  out.roll = out.pitch = out.wing = out.tip = out.gait = out.stride = 0
  out.fold = 1
  out.cadence = 1
  out.rig = 'Idle'
  out.state = 'rest'
  out.draw = true

  if (family === 'pheasant') {
    const age = (40-ahead)/speed
    const t = Math.max(0,age)
    pheasant(t,current)
    pheasant(t+interval,next)
    out.along += current.along
    out.lateral = bankLimit(side,out.lateral+side*current.side)
    const ground = event.kind === 'studio' ? event.height : terrainElevation(event.distance,event.lateral)
    out.height = ground + size*.25 + Math.max(0,current.lift)
    out.fold = 1-smooth(age,-.035,.105)
    out.draw = t < 3.45
    if (age < 0) {
      out.yaw = motionYaw(event.distance,out.lateral,1,out.lateral+side*.41)
      out.pitch = -.13*smooth(age,-.31,-.05)
      out.height -= size*.054*smooth(age,-.31,-.05)
      return out
    }
    heading(event,out,side,current,next)
    out.pitch = Math.min(.72,Math.atan2(next.lift-current.lift,Math.max(.085,Math.hypot(next.along-current.along,next.side-current.side))))
    out.roll = side*(-.22*smooth(t,.12,.36)*(1-smooth(t,.49,.76)) + .26*smooth(t,.69,.96)*(1-smooth(t,1.2,1.63)))
    const glide = smooth(t,.99,1.19)*(1-smooth(t,1.81,2.06))
    const phase = tau*(6.15*t+.35*(1-Math.exp(-3.7*t)))
    out.wing = (.11 + .97*Math.sin(phase))*(1-glide) + glide*.06
    out.tip = .45*Math.sin(phase-1.1)*(1-glide) - .13
    out.gait = smooth(t,.06,.36)
    out.rig = glide > .72 ? 'Glide' : 'Fly'
    out.state = t < .36 ? 'takeoff' : glide > .72 ? 'glide' : 'powered'
    return out
  }

  if (family === 'deer' || family === 'moose' || family === 'alligator') {
    const trigger = family === 'deer' ? 41 : family === 'moose' ? 50 : 30
    const t = Math.max(0,(trigger-ahead)/speed)
    const pace = family === 'deer' ? 12.9 : family === 'moose' ? 3.65 : 1.02
    const spread = family === 'deer' ? 4.8 : 1.20
    const start = out.lateral
    out.along += move(t,pace,.42)
    out.lateral = bankLimit(side,start+side*move(t,spread,.93))
    const stride = out.along/(family === 'deer' ? 3.7 : family === 'moose' ? 1.92 : .85)
    out.stride = stride
    out.gait = smooth(t,0,.53)
    out.rig = t > .03 ? family === 'deer' ? 'Gallop' : 'Walk' : family === 'deer' ? 'Eating' : 'Idle'
    out.state = t > .03 ? 'ground' : 'rest'
    out.yaw = motionYaw(event.distance+out.along,out.lateral,
      move(t+interval,pace,.42)-move(t,pace,.42),bankLimit(side,start+side*move(t+interval,spread,.93)))
    out.height = (event.kind === 'studio' ? event.height : terrainElevation(event.distance+out.along,out.lateral)) +
      (family === 'deer' ? .095 : .021)*out.gait*Math.max(0,Math.sin(stride*tau))
    return out
  }

  const [beats, amplitude, velocity] = flightProfiles[family]
  const fromWater = event.kind === 'water'
  const wading = family === 'wader' && event.kind === 'bank'
  if (wading) {
    out.height = event.height + .055
    return out
  }
  const trigger = fromWater ? (animal.id === 'mallard' ? 28 : 24) - group*1.4 : event.migration ? 93 : 62
  const age = (trigger-ahead)/speed
  const t = Math.max(0,age)
  if (event.migration) {
    const flock = Math.floor(unit/13)
    const member = unit%13
    out.along = flock*19 - 12 - Math.ceil(member/2)*(2.1+flock*.14) + .81*Math.sin(unit*4.2)
    out.lateral = event.lateral + (member % 2 ? -1:1)*Math.ceil(member/2)*1.32 + flock*5.6 + 1.6*Math.sin(unit*1.7)
    out.height += flock*3.75 + Math.sin(unit*1.41)*.73
  }
  if (fromWater) {
    const diver = family.includes('diver') || family === 'merganser'
    waterDeparture(t,current,velocity,diver)
    waterDeparture(t+interval,next,velocity,diver)
    out.height += size*.10 + current.lift + (age < 0 ? Math.sin(elapsed*3.4+seed)*.025 : 0)
    out.fold = 1-smooth(t,0,.19)
    out.gait = smooth(t,.14,.53)
    out.state = age < 0 ? 'swim' : t < .48 ? 'takeoff' : 'powered'
    if (age < 0) {
      out.along += .66*Math.sin(ahead*.035+seed)
      return out
    }
  } else {
    const bend = event.migration ? -4.7 : family === 'raptor' ? 3.9 : family === 'goose' ? 1.13 : 1.76
    airborne(age,current,velocity,bend,seed*.09)
    airborne(age+interval,next,velocity,bend,seed*.09)
    out.height += current.lift + (family === 'raptor' ? 4.1 : family === 'crane' && !event.migration ? 3.3 : 0)
    out.state = 'powered'
    out.fold = 0
    out.gait = 1
  }
  out.along += current.along
  out.lateral += side*current.side
  if (!event.migration) out.lateral = bankLimit(side,out.lateral)
  heading(event,out,side,current,next)
  out.roll = side*(family === 'raptor' ? .38 : .17)*Math.sin(t*.77 + unit*.028)
  out.pitch = Math.atan2(next.lift-current.lift,Math.max(.14,next.along-current.along))*.64
  const glide = fromWater ? 0 : family === 'raptor' ? .98*smooth(Math.cos(t*.62+seed*.09),-.78,-.22)
    : (family === 'goose' || family === 'crane' ? .91 : .42)*smooth(Math.sin(t*.78 + seed*.37),.5,.93)
  const cadence = (individualBeats[animal.id] ?? beats)*(1+.07*Math.cos(seed))
  const phase = tau*cadence*age + seed
  out.wing = (Math.sin(phase)*amplitude + .10)*(1-glide) + glide*.055
  out.tip = Math.sin(phase-.93)*.38*(1-glide) - .09
  out.rig = glide > .68 ? 'Glide' : 'Fly'
  if (out.rig === 'Glide') out.state = 'glide'
  out.cadence = cadence
  return out
}
