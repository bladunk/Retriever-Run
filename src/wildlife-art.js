import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { gulfGeometry } from './gulf-models.js'

const plumage = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide })
const round = new T.SphereGeometry(1, 11, 7).toNonIndexed()
const small = new T.SphereGeometry(1, 7, 5).toNonIndexed()
const shaft = new T.CylinderGeometry(.60, 1, 1, 7).toNonIndexed()
const shade = new T.Color()

function append(pieces, shape, tint, x,y,z, w,h,d, pitch = 0) {
  const geometry = shape.clone().scale(w,h,d).rotateX(pitch).translate(x,y,z)
  const data = new Float32Array(geometry.attributes.position.count * 3)
  shade.setHex(tint)
  for (let n = 0; n < data.length; n += 3) shade.toArray(data, n)
  geometry.setAttribute('color', new T.BufferAttribute(data, 3))
  pieces.push(geometry)
}

function bake(parts) {
  const geometry = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  return geometry
}

function birdBody(animal) {
  const { family, id, body, head, wing, neck, bill } = animal
  if (id === 'mallard') return gulfGeometry('MallardDrake').clone()
  const long = ['goose','crane','wader'].includes(family)
  const wader = family === 'wader' || family === 'crane'
  const diver = family.includes('diver') || family === 'merganser'
  const pheasant = family === 'pheasant'
  const goose = family === 'goose'
  const eagle = family === 'raptor'
  const parts = []
  const put = (shape, tint, ...pose) => append(parts, shape, tint, ...pose)
  put(round, body, 0,0,.055, goose ? .217 : diver ? .213 : .183, goose ? .167 : .146,
    pheasant ? .235 : wader ? .258 : .291)
  const breast = id === 'mallard' ? 0x874937 : id === 'shoveler' ? 0xf1ede0 : body
  put(small, breast, 0,-.034,-.125,.157,.118,.17)
  put(small, eagle ? 0xf0e8d6 : wing, 0,.019,pheasant ? .37 : .30,pheasant ? .075 : .116,.037,
    pheasant ? .325 : family === 'pintail' ? .215 : .137,pheasant ? .15 : -.12)
  if (pheasant || family === 'pintail') put(small, wing, 0,-.015,.47,.036,.016,.205,.19)
  if (pheasant) {
    for (const side of [-1, 1]) {
      put(small, 0x795039, side * .055, -.014, .49, .028, .016, .265, .10)
      put(small, 0xc08946, side * .137, .037, .112, .036, .058, .188, .14)
    }
  }
  const headZ = goose ? -.26 : wader ? -.42 : -.275
  const headY = long ? .185 * neck : .143 + (neck - 1) * .12
  const neckColor = wader || eagle ? body : head
  if (goose) {
    put(round, neckColor, 0,headY*.58,-.203,.058,headY*.74,.061,-.15)
  } else if (wader && family !== 'crane') {
    put(round, neckColor, 0,headY*.34,-.205,.057,headY*.49,.057,-.44)
    put(round, neckColor, 0,headY*.68,-.326,.041,headY*.39,.046,-.42)
  } else {
    put(round, neckColor, 0,headY * .56,headZ * .68,long ? .059 : .081,headY * .71 + .054,.068,long ? -.41 : -.6)
  }
  put(small, head, 0,headY,headZ,long ? .064 : .081,
    id === 'canvasback' ? .089 : .076,.102)
  const billColor = ['pintail','canvasback','gadwall','bufflehead','canada-goose','cackling-goose','wood-duck'].includes(id) ? 0x4a4850 :
    ['snow-goose','ross-goose','white-fronted-goose'].includes(id) ? 0xb7837a :
      pheasant || family === 'raptor' || wader ? 0xc7a64e : 0xb19446
  put(small, billColor, 0,headY-.018,headZ-.121,
    family === 'spoon' ? .071 : wader ? .019 : .045, wader ? .023 : .025,.087*bill)
  if (family === 'crest' || family === 'crest-diver' || family === 'merganser') {
    put(small, id === 'hooded-merganser' ? 0xe1ded0 : head,
      0,headY+.062,headZ+.046,.058,.083,.081,.23)
  }
  if (id === 'mallard' || pheasant || family === 'pintail')
    put(small, 0xe4dfcb,0,headY*.61,headZ*.71,.084,.033,.082,-.58)
  if (wader) for (const side of [-1, 1]) {
    put(shaft, 0x525044, side*.065,-.18,.24,.017,.33,.019,1.22)
  }
  if (id === 'wood-duck') {
    put(small, 0x775040, 0,-.022,-.140,.163,.104,.139)
    put(small, 0xbe4f3b, 0,headY-.010,headZ-.109,.039,.021,.043)
    put(small, 0x233c45, 0,headY+.052,headZ+.053,.058,.045,.137,.26)
  }
  if (eagle) {
    put(small, 0xc99c42, 0,headY-.029,headZ-.168,.036,.042,.029,.26)
  }
  for (const side of [-1,1]) {
    if (id === 'wood-duck') {
      put(small, 0xeae8d9, side*.055,headY+.056,headZ+.056,.017,.009,.106,.24)
      put(small, 0xeae8d9, side*.075,headY-.034,headZ+.029,.013,.011,.066,-.10)
      put(small, 0xa92d26, side*.081,headY+.009,headZ-.030,.013,.014,.015)
      put(small, 0x191616, side*.090,headY+.011,headZ-.033,.005,.007,.008)
      put(small, 0xb9a180, side*.143,-.003,.068,.048,.077,.156)
      continue
    }
    const whiteChin = id === 'canada-goose' || id === 'cackling-goose'
    const mark = ['canada-goose','cackling-goose','goldeneye','bufflehead','blue-teal','wood-duck','white-fronted-goose'].includes(id) ? 0xe5dfce :
      id === 'green-teal' ? 0x346d5c : pheasant ? 0xa74635 : head
    put(small, mark, side * (long ? .051 : .068),headY - (whiteChin ? .043 : .009),
      headZ+(id === 'white-fronted-goose' || id === 'blue-teal' ? -.046 : .015),.023,.032,.061)
    put(small, id === 'goldeneye' ? 0xddb544 : 0x211d18, side*(long ? .063 : .080),headY+.018,headZ-.025,.013,.012,.015)
    if (!long && !pheasant) put(small, wing, side*.144,.042,.068,.062,.07,.185)
  }
  return bake(parts)
}

function pinions(animal) {
  const { family, wing, id } = animal
  const wader = family === 'crane' || family === 'wader'
  const raptor = family === 'raptor'
  const span = wader || raptor ? .82 : family === 'goose' ? .72 : .56
  const blackWing = ['snow-goose','ross-goose','crane'].includes(id)
  const positions = [], colors = []
  const base = new T.Color(wing)
  function fan(a, b, c, gain, tint = base) {
    positions.push(...a,...b,...c)
    for (const value of [gain,gain*.91,gain*.76]) shade.copy(tint).multiplyScalar(value).toArray(colors,colors.length)
  }
  const patch = new T.Color(id === 'gadwall' ? 0xebe1c8 : id === 'mallard' ? 0x41569c : id === 'blue-teal' ? 0x728c9c : wing)
  const primary = new T.Color(0x2c2e2a)
  for (let k = 0; k < 12; k++) {
    const t = k / 12, u = (k + 1) / 12
    const a = [t*span,.034*Math.sin(t*2.7),-.14-.10*Math.sin(t*2.5)]
    const b = [u*span,.034*Math.sin(u*2.7),-.14-.10*Math.sin(u*2.5)]
    const mid = [(t+.035)*span,.059-.057*t,.026]
    const finger = raptor && k >= 7 ? Math.sin((k - 6) * Math.PI / 6) * .085 : 0
    const tip = [(t+.04)*span+.19*t+finger,-.023,.187-.15*t*t+finger*.64]
    const feathers = blackWing && k >= (id === 'crane' ? 6 : 8) ? primary : base
    fan(a,b,mid,1.16,k>2 && k<7 ? patch : feathers)
    fan(a,mid,tip,.91,k<6 ? patch : feathers)
    fan(mid,b,tip,1.10,feathers)
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors,3))
  geometry.computeVertexNormals()
  return geometry
}

function mammalArt(animal) {
  const parts = []
  const { family, body, head, wing } = animal
  const low = family === 'alligator'
  const deer = family === 'deer'
  append(parts, round, body, 0,low ? .13 : .43,0,low ? .128 : .169,low ? .104 : .185,.32)
  append(parts, round, body, 0,low ? .16 : .49,-.21,.145,low ? .055 : .178,.154)
  append(parts, round, head, 0,low ? .18 : .62,-.37,.098,low ? .061 : .112,.175,low ? 0 : .31)
  append(parts, small, wing,0,low ? .145 : .574,-.51,low ? .084 : .073,.055,.102)
  if (low) {
    for (let n = 0; n < 7; n++) append(parts, small, n % 2 ? body : head,
      n*n*.001,.124-n*.011,.31+n*.069,.108-n*.014,.048-n*.005,.124)
  } else {
    for (const side of [-1,1]) {
      append(parts, small, head,side*.102,.734,-.35,.035,.079,.049,.26)
      if (deer) {
        append(parts, small, 0xd9bea6, side*.123,.752,-.348,.013,.056,.034,.27)
        append(parts, small, 0x302519, side*.091,.664,-.418,.017,.012,.017)
        append(parts, small, 0xc5a98a, side*.10,.321,.107,.06,.046,.164)
      }
      if (family === 'moose') append(parts, round, 0x9a886a,side*.17,.755,-.325,.14,.017,.064,-.38)
    }
    append(parts,small,0xdec9b1,0,.485,.327,.071,.068,.081,.66)
  }
  const legParts = []
  if (deer) {
    append(legParts, shaft, head, 0,-.070,-.015,.045,.179,.045,-.31)
    append(legParts, small, body, 0,-.154,-.041,.031,.036,.026)
    append(legParts, shaft, 0x847260, 0,-.238,-.008,.023,.17,.021,.34)
    append(legParts, small, 0x423a31, 0,-.322,.021,.030,.025,.041)
  } else {
    append(legParts, shaft, head, 0,-.095,0,low ? .046 : .033,.25,.036,.31)
    append(legParts, small, wing, 0,-.22,.035,.039,.036,.07)
  }
  return { body: bake(parts), appendage: bake(legParts), legs: true }
}

export function createEncounterArt(animal) {
  const mammal = ['deer','moose','alligator'].includes(animal.family)
  const shapes = mammal ? mammalArt(animal) : { body: birdBody(animal), appendage: pinions(animal), legs: false }
  const count = 9
  const body = new T.InstancedMesh(shapes.body, plumage, count)
  const appendage = new T.InstancedMesh(shapes.appendage, plumage, count * (mammal ? 4 : 2))
  for (const mesh of [body, appendage]) {
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage)
    mesh.frustumCulled = false
  }
  const root = new T.Group()
  root.add(body, appendage)
  return { ...shapes, root, bodyMesh: body, appendageMesh: appendage,
    dispose() {
      root.removeFromParent()
      body.dispose()
      appendage.dispose()
      shapes.body.dispose()
      shapes.appendage.dispose()
    },
  }
}
