import * as T from 'three'
import { expeditionRegions } from './expedition.js'
import { centerAt, seededRandom } from './trail.js'

const farRadii = [510, 345]
const borderDistance = expeditionRegions.find(region => region.key === 'foothills').marker

export function horizonPosition(distance, layer) {
  return {
    x: -centerAt(distance) + (layer === 0 ? -22 : 16),
    z: 32 * Math.tanh((distance - borderDistance) / 1550),
  }
}

const ridges = [
  [[-174,45,41,60],[-122,66,35,51],[-73,78,36,27],[-44,56,37,34],
    [-7,36,21,28],[40,52,33,25],[72,68,19,55],[112,64,50,40],[156,50,42,54]],
  [[-161,43,62,46],[-111,46,41,54],[-68,38,48,29],[-29,24,34,20],
    [27,25,21,41],[71,44,36,52],[111,52,37,42],[154,39,27,54],[201,44,38,39]],
]

function mountainMesh(layer, fine) {
  const random = seededRandom(47509 + layer * 491)
  const points = [], heights = [], faces = []
  const columns = fine ? 168 : 96
  const bands = fine ? 12 : 7
  for (let i = 0; i <= columns; i++) {
    const x = (i / columns - .5) * 453.6
    let contour = 3 + 1.6 * Math.sin(x * .071 - layer)
    for (const [center, height, left, right] of ridges[layer]) {
      const slope = x < center ? left : right
      const reach = Math.abs(x-center)/slope
      const shoulder = Math.exp(-1.18*reach**1.42)
      const tiltedShelf = .17*Math.exp(-.98*(Math.abs(x-center+10)/(slope*.39))**1.23)
      contour = Math.max(contour,height*(shoulder+tiltedShelf))
    }
    const fracture = Math.sin(x * .31 + layer * 5.4) * 1.6 + Math.cos(x * .57 - layer * 3.1) * 1.45
      + Math.cos(x * .14 + Math.sin(x * .053) * 2.6) * 2.2
    const peak = contour + fracture * (.45 + contour * .015)
    for (let row = 0; row < bands; row++) {
      const t = row / (bands - 1)
      const spur = Math.sin(x * .079 + row * .63) * (1 - t) * .08
      const gully = Math.sin(x*.19 + t*5 + .9*Math.sin(x*.036)) * Math.cos(x*.042-layer)*Math.sin(t*Math.PI)
      const buttress = Math.sin(x*.066 + t*2.3) * Math.cos(x*.142+layer)*Math.sin(t*Math.PI)
      const y = -8+(peak+8)*(t**1.13+spur)+gully*(layer ? 7.7 : 9.1)+buttress*7.1
      const azimuth = (x + 2.7 * Math.sin(row * .60 + x * .09) * (1 - t)) / 157
      const radius = farRadii[layer] + (98 - layer * 24) * (t - .72)
        - (gully * 8.5 + Math.cos(x * .06) * 7) * (1 - t * .40)
      points.push(Math.sin(azimuth) * radius, y * (layer === 0 ? 2.59 : 2.25), -Math.cos(azimuth) * radius)
      heights.push(y / 65, random())
      if (i && row) {
        const a = i * bands + row
        if (i % 2) faces.push(a, a - bands, a - 1, a - 1, a - bands, a - bands - 1)
        else faces.push(a, a - bands, a - bands - 1, a, a - bands - 1, a - 1)
      }
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(points, 3))
  geometry.setAttribute('ridge', new T.Float32BufferAttribute(heights, 2))
  geometry.setIndex(faces)
  geometry.computeVertexNormals()
  return geometry
}

export function createNorthernHorizon(scene) {
  const haze = { value: new T.Color() }
  const frost = { value: 0 }
  const amount = { value: 0 }
  const mountains = [0, 1].map(layer => {
    const geometries = [mountainMesh(layer, false), mountainMesh(layer, true)]
    const material = new T.ShaderMaterial({
      uniforms: { haze, frost, amount, layer: { value: layer }, horizonDetail: { value: 0 }, finish: { value: 0 } },
      side: T.DoubleSide,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute vec2 ridge;
        uniform float finish;
        varying vec2 face;
        varying vec3 ridgePoint, ridgeNormal;
        void main() {
          face = ridge;
          ridgePoint = position;
          ridgeNormal = normal;
          vec3 terrain = position;
          terrain.y *= mix(.77,1.16,finish);
          vec4 clip = projectionMatrix * modelViewMatrix * vec4(terrain, 1.);
          // The trail keeps its short far plane and depth precision. This pass
          // sits behind it while retaining the arc's actual projected parallax.
          gl_Position = vec4(clip.xy, clip.w * .99996, clip.w);
        }
      `,
      fragmentShader: `
        uniform vec3 haze;
        uniform float frost, amount, layer, horizonDetail, finish;
        varying vec2 face;
        varying vec3 ridgePoint, ridgeNormal;
        void main() {
          vec3 rockNormal = normalize(ridgeNormal);
          vec3 sunVector = normalize(vec3(-.72,.35,.50));
          float faceLight = .20+.80*max(0.,dot(rockNormal,sunVector));
          vec2 stone = ridgePoint.xy;
          float erosion = sin(dot(stone, vec2(.047,.031)) + sin(stone.x * .032) * 1.65)
            * cos(dot(stone, vec2(.050,-.046)));
          float gullies = sin(stone.x * .100 + stone.y * .028 + erosion * 1.09)
            * sin(stone.x * .038 - stone.y * .072 + ridgePoint.z * .095);
          float bedrock = smoothstep(.07,.76,abs(gullies));
          float faults = (stone.y*.27 + stone.x*.091 + erosion*1.72 + gullies*.34);
          float strata = smoothstep(-.35,.50,sin(faults))*(1.-smoothstep(.35,1.21,fwidth(faults)));
          if (horizonDetail > .5) strata *= .82+.18*sin(faults*2.13);
          float snowLine = mix(.85,.65,frost)+.14*erosion;
          float pitch = smoothstep(.22,.80,abs(rockNormal.y));
          float snowfield = smoothstep(snowLine-.10,snowLine+.15,face.x+.20*gullies+.08*pitch);
          snowfield *= 1.-.75*max(bedrock,strata*.77)*(1.-pitch);
          vec3 rock = mix(vec3(.069,.100,.133),vec3(.285,.318,.338),faceLight);
          rock *= .75+.23*faceLight+erosion*.08-bedrock*.19-strata*.24;
          vec3 snow = mix(vec3(.235,.337,.447),vec3(.89,.92,.94),faceLight*.88+.12);
          snow *= .92+erosion*.071+face.y*.025;
          vec3 shade = mix(rock,snow,snowfield);
          float forest = (1.-smoothstep(.15,.49,face.x))*(.73+.21*gullies);
          shade = mix(shade,vec3(.092,.132,.114)*(.71+.48*faceLight),forest*(1.-finish*.55));
          float separation = (.72+layer*.21)*smoothstep(-.09,.27,face.x)*amount;
          gl_FragColor = vec4(mix(haze,shade,.53+layer*.32),separation);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
    const mountain = new T.Mesh(geometries[0], material)
    mountain.position.y = -9
    mountain.renderOrder = -40 + layer
    mountain.frustumCulled = false
    scene.add(mountain)
    return { mountain, geometries }
  })
  let wasVisible = false
  return (distance, northern, snow, color, detail, finish) => {
    haze.value.copy(color)
    frost.value = snow
    amount.value = northern
    for (const [index, { mountain: ridge, geometries }] of mountains.entries()) {
      if (!wasVisible && northern > 0) ridge.geometry = geometries[Number(detail > .80)]
      ridge.material.uniforms.horizonDetail.value = Number(detail > .80)
      ridge.material.uniforms.finish.value = finish
      ridge.visible = northern > 0
      const origin = horizonPosition(distance, index)
      ridge.position.x = origin.x
      ridge.position.z = origin.z
    }
    wasVisible = northern > 0
  }
}
