import * as T from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { gulfGeometry } from './gulf-models.js'

const plumage = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide })
const round = new T.SphereGeometry(1, 11, 7).toNonIndexed()
const small = new T.SphereGeometry(1, 7, 5).toNonIndexed()
const detail = new T.SphereGeometry(1, 16, 10).toNonIndexed()
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

function pheasantBody(compact) {
  const parts = []
  const put = (mesh, color, ...coordinates) => append(parts,mesh,color,...coordinates)
  const mantle = compact ? round : detail
  put(mantle,0x99532e,0,.008,.070,.173,.145,.251,.10)
  put(mantle,0xa4592e,0,-.018,-.106,.156,.135,.163,.16)
  put(round,0x4c3326,0,-.101,.017,.141,.060,.221)
  put(round,0x213d2d,0,.157,-.197,.071,.112,.096,-.43)
  put(small,0xe1ddc5,0,.128,-.170,.076,.025,.077,-.58)
  put(mantle,0x274c3d,0,.232,-.239,.071,.073,.102)
  put(small,0xc1a478,0,.213,-.342,.031,.024,.051,.12)
  for (const side of [-1,1]) {
    put(round,0x997250,side*.125,.063,.082,.063,.077,.239,.18)
    put(small,0xa52e23,side*.065,.235,-.257,.015,.045,.056)
    put(small,0xbdb159,side*.078,.249,-.275,.008,.011,.012)
    put(small,0x151c18,side*.084,.249,-.28,.005,.005,.005)
    for (let i = 0; i < (compact ? 3 : 8); i++) {
      const progress = i / (compact ? 3 : 8)
      put(small,i%2 ? 0xc58a54 : 0x74452a,side*(.145+.013*Math.sin(i)),.006+progress*.049,
        .02+progress*.211,.018,.027,.081-.015*progress,.16)
    }
  }
  const tail = new T.BufferGeometry()
  const positions = [], colors = []
  for (let feather = -2; feather <= 2; feather++) {
    const length = .65 - Math.abs(feather)*.075
    for (let band=0; band<8; band++) {
      const point = (t, side) => [feather*.022*(1+t) + side*.018*(1-t*.91),
        .039 - .164*t + .012*Math.abs(feather),.24+length*t]
      const a = point(band/8,-1), b = point(band/8,1), c = point((band+1)/8,1), d = point((band+1)/8,-1)
      positions.push(...a,...c,...b,...a,...d,...c)
      shade.setHex(band%2 ? 0x674631 : feather%2 ? 0xaf865c : 0xb2966a)
      for (let j=0; j<6; j++) shade.toArray(colors,colors.length)
    }
  }
  tail.setAttribute('position',new T.Float32BufferAttribute(positions,3))
  tail.setAttribute('color',new T.Float32BufferAttribute(colors,3))
  tail.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(positions.length/3*2),2))
  tail.computeVertexNormals()
  parts.push(tail)
  return bake(parts)
}

function birdBody(animal,compact) {
  const { family, id, body, head, wing, neck, bill } = animal
  if (id === 'pheasant') return pheasantBody(compact)
  if (id === 'mallard') return gulfGeometry('MallardDrake').clone()
  const long = ['goose','crane','wader'].includes(family)
  const wader = family === 'wader' || family === 'crane'
  const diver = family.includes('diver') || family === 'merganser'
  const goose = family === 'goose'
  const eagle = family === 'raptor'
  const parts = []
  const put = (shape, tint, ...pose) => append(parts, shape, tint, ...pose)
  put(round, body, 0,0,.055, goose ? .217 : diver ? .213 : .183, goose ? .167 : .146,
    wader ? .258 : .291)
  const breast = id === 'mallard' ? 0x874937 : id === 'shoveler' ? 0xf1ede0 : body
  put(small, breast, 0,-.034,-.125,.157,.118,.17)
  put(small, eagle ? 0xf0e8d6 : wing, 0,.019,.30,.116,.037,
    family === 'pintail' ? .215 : .137,-.12)
  if (family === 'pintail') put(small, wing, 0,-.015,.47,.036,.016,.205,.19)
  const headZ = family === 'crane' ? -.505 : goose ? -.36 : wader ? -.42 : -.275
  const headY = family === 'crane' ? .18 : long ? .185 * neck : .143 + (neck - 1) * .12
  const neckColor = wader || eagle ? body : head
  if (family === 'crane') {
    put(round, body,0,.063,-.278,.053,.053,.265,.27)
    put(small,0x9b463c,0,headY+.062,headZ-.013,.048,.018,.062)
  } else if (goose) {
    put(round, neckColor, 0,headY*.48,-.224,.057,headY*.79,.071,.47)
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
      family === 'raptor' || wader ? 0xc7a64e : 0xb19446
  put(small, billColor, 0,headY-.018,headZ-.121,
    family === 'spoon' ? .071 : wader ? .019 : .045, wader ? .023 : .025,.087*bill)
  if (family === 'crest' || family === 'crest-diver' || family === 'merganser') {
    put(small, id === 'hooded-merganser' ? 0xe1ded0 : head,
      0,headY+.062,headZ+.046,.058,.083,.081,.23)
  }
  if (id === 'mallard' || family === 'pintail')
    put(small, 0xe4dfcb,0,headY*.61,headZ*.71,.084,.033,.082,-.58)
  if (wader) for (const side of [-1, 1]) {
    put(shaft, 0x525044, side*.065,-.12,family === 'crane' ? .38 : .24,.015,family === 'crane' ? .60 : .33,.018,1.38)
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
      id === 'green-teal' ? 0x346d5c : head
    put(small, mark, side * (long ? .051 : .068),headY - (whiteChin ? .043 : .009),
      headZ+(id === 'white-fronted-goose' || id === 'blue-teal' ? -.046 : .015),.023,.032,.061)
    put(small, id === 'goldeneye' ? 0xddb544 : 0x211d18, side*(long ? .063 : .080),headY+.018,headZ-.025,.013,.012,.015)
    if (!long) put(small, wing, side*.144,.042,.068,.062,.07,.185)
  }
  return bake(parts)
}

function pinions(animal, outer, compact) {
  const { family, wing, id } = animal
  const wader = family === 'crane' || family === 'wader'
  const raptor = family === 'raptor'
  const span = wader || raptor ? .83 : family === 'goose' ? .73 : family === 'pheasant' ? .47 : .57
  const hinge = span*.52
  const first = outer ? .52 : 0
  const last = outer ? 1 : .58
  const count = compact ? 5 : 8
  const blackWing = ['snow-goose','ross-goose','crane'].includes(id)
  const positions = [], colors = []
  const base = new T.Color(wing)
  function fan(a, b, c, gain, tint = base) {
    positions.push(...a,...b,...c)
    for (const value of [gain,gain*.91,gain*.76]) shade.copy(tint).multiplyScalar(value).toArray(colors,colors.length)
  }
  const patch = new T.Color(id === 'gadwall' ? 0xebe1c8 : id === 'mallard' ? 0x41569c : id === 'blue-teal' ? 0x728c9c : wing)
  const primary = new T.Color(0x2c2e2a)
  const sweep = t => family === 'pheasant' ? -.12 + .105*t*t : -.14-.10*Math.sin(t*2.5)
  const local = x => x - (outer ? hinge : 0)
  for (let k = 0; k < count; k++) {
    const t = first+(last-first)*k/count, u = first+(last-first)*(k+1)/count
    const a = [local(t*span),.034*Math.sin(t*2.7),sweep(t)]
    const b = [local(u*span),.034*Math.sin(u*2.7),sweep(u)]
    const mid = [local((t+.035)*span),.059-.057*t,.026]
    const finger = raptor && outer ? Math.sin((k+.3)*Math.PI/(count+1))*.085 : 0
    const tip = [local((t+.05)*span+(.10+.08*Number(!compact))*t+finger),-.019,(family === 'pheasant' ? .217 : .185)-.15*t*t+finger*.64]
    const feathers = blackWing && (outer || id === 'crane' && k >= count*.8) ? primary : base
    fan(a,b,mid,1.16,k>2 && k<7 ? patch : feathers)
    fan(a,mid,tip,.91,k<6 ? patch : feathers)
    fan(mid,b,tip,1.10,feathers)
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color', new T.Float32BufferAttribute(colors,3))
  geometry.computeVertexNormals()
  return { geometry, hinge }
}

function mammalArt(animal) {
  const parts = []
  const { family, body, head, wing } = animal
  const low = family === 'alligator'
  const deer = family === 'deer'
  const heavy = family === 'moose'
  const rise = heavy ? .24 : 0
  append(parts, round, body, 0,low ? .13 : .43+rise,0,low ? .128 : heavy ? .202 : .169,low ? .104 : .185,heavy ? .38 : .32)
  append(parts, round, body, 0,low ? .16 : .49+rise,-.21,heavy ? .204 : .145,low ? .055 : heavy ? .235 : .178,.181)
  append(parts, round, head, 0,low ? .18 : .62+rise,-.37,heavy ? .118 : .098,low ? .061 : .112,heavy ? .205 : .175,low ? 0 : .31)
  append(parts, small, wing,0,low ? .145 : .574+rise,-.51,heavy ? .102 : low ? .084 : .073,heavy ? .093 : .055,heavy ? .142 : .102)
  if (low) {
    for (let n = 0; n < 7; n++) append(parts, small, n % 2 ? body : head,
      n*n*.001,.124-n*.011,.31+n*.069,.108-n*.014,.048-n*.005,.124)
  } else {
    for (const side of [-1,1]) {
      append(parts, small, head,side*.102,.734+rise,-.35,.035,.079,.049,.26)
      if (deer) {
        append(parts, small, 0xd9bea6, side*.123,.752,-.348,.013,.056,.034,.27)
        append(parts, small, 0x302519, side*.091,.664,-.418,.017,.012,.017)
        append(parts, small, 0xc5a98a, side*.10,.321,.107,.06,.046,.164)
      }
      if (heavy) {
        append(parts, round,0x9a886a, side*.235,.742+rise,-.377,.165,.026,.091,-.31)
        for (let tine=0; tine<3; tine++)
          append(parts,small,0xa99470,side*(.168+tine*.077),.761+rise,-.403-tine*.022,.026,.063-tine*.007,.022,-.30)
      }
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
    append(legParts, shaft, head, 0,heavy ? -.18 : -.095,0,heavy ? .052 : low ? .046 : .033,heavy ? .37 : .25,.036,.19)
    if (heavy) append(legParts,shaft,body,0,-.437,.019,.033,.19,.028,-.20)
    append(legParts, small, wing, 0,heavy ? -.531 : -.22,.035,.039,.036,.07)
  }
  return { body: bake(parts), appendage: bake(legParts), legs: true }
}

function birdLegs() {
  const parts = []
  append(parts,shaft,0xb28856,0,-.072,.019,.020,.16,.017,-.30)
  append(parts,small,0x9e7950,0,-.172,-.010,.033,.014,.055,-.15)
  return bake(parts)
}

export function createEncounterArt(animal, count = 9, compact = false) {
  const mammal = ['deer','moose','alligator'].includes(animal.family)
  const shapes = mammal ? mammalArt(animal) : { body:birdBody(animal,compact), legs:false }
  const root = new T.Group()
  const meshes = []
  function batch(geometry, capacity) {
    const mesh = new T.InstancedMesh(geometry,plumage,capacity)
    mesh.frustumCulled = false
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage)
    meshes.push(mesh)
    root.add(mesh)
    return mesh
  }
  const bodyMesh = batch(shapes.body,count)
  const legMesh = mammal ? batch(shapes.appendage,count*4) :
    animal.family === 'pheasant' || animal.family === 'duck' ? batch(birdLegs(),count*2) : null
  const shoulders = mammal ? null : pinions(animal,false,compact)
  const tipMesh = mammal ? null : batch(pinions(animal,true,compact).geometry,count*2)
  const wingMesh = shoulders ? batch(shoulders.geometry,count*2) : null
  return { root, bodyMesh, legMesh, wingMesh, tipMesh, hinge:shoulders?.hinge, legs:mammal,
    dispose() {
      root.removeFromParent()
      for (const mesh of meshes) {
        mesh.dispose()
        mesh.geometry.dispose()
      }
    },
  }
}
