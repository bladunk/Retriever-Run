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
  [[-178, 22, 44, 67], [-135, 38, 42, 65], [-81, 55, 45, 58], [-30, 45, 46, 30],
    [16, 61, 32, 64], [63, 39, 37, 39], [113, 51, 52, 46], [167, 32, 28, 67]],
  [[-166, 21, 51, 47], [-101, 25, 41, 57], [-55, 31, 52, 28], [2, 26, 36, 59],
    [45, 32, 24, 38], [92, 43, 52, 34], [144, 29, 34, 51], [196, 36, 52, 30]],
]

function mountainMesh(layer) {
  const random = seededRandom(47509 + layer * 491)
  const points = [], heights = [], faces = []
  const columns = 144
  const bands = 8
  for (let i = 0; i <= columns; i++) {
    const x = (i - columns * .5) * 3.15
    let contour = 3 + 1.6 * Math.sin(x * .071 - layer)
    for (const [center, height, left, right] of ridges[layer]) {
      const slope = x < center ? left : right
      const shoulder = Math.exp(-1.19 * (Math.abs(x - center) / slope) ** 1.77)
      const ledge = Math.exp(-.88 * (Math.abs(x - center - 8) / (slope * .45)) ** 1.36) * .17
      contour = Math.max(contour, height * (shoulder + ledge))
    }
    const fracture = Math.sin(x * .31 + layer * 5.4) * 1.6 + Math.cos(x * .57 - layer * 3.1) * 1.45
      + Math.cos(x * .14 + Math.sin(x * .053) * 2.6) * 2.2
    const peak = contour + fracture * (.49 + contour * .011)
    for (let row = 0; row < bands; row++) {
      const t = row / (bands - 1)
      const spur = Math.sin(x * .079 + row * .63) * (1 - t) * .08
      const gully = Math.sin(x * .23 + row * .46) * Math.cos(x * .052 - layer) * Math.sin(t * Math.PI)
      const y = -8 + (peak + 8) * (t ** 1.18 + spur) + gully * (layer ? 6.5 : 8.1)
      const azimuth = (x + 2.7 * Math.sin(row * .60 + x * .09) * (1 - t)) / 157
      const radius = farRadii[layer] + (98 - layer * 24) * (t - .72)
        - (gully * 8.5 + Math.cos(x * .06) * 7) * (1 - t * .40)
      points.push(Math.sin(azimuth) * radius, y * (layer === 0 ? 2.18 : 2.09), -Math.cos(azimuth) * radius)
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
    const material = new T.ShaderMaterial({
      uniforms: { haze, frost, amount, layer: { value: layer } },
      side: T.DoubleSide,
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute vec2 ridge;
        varying vec2 face;
        varying vec3 ridgePoint, ridgeNormal;
        void main() {
          face = ridge;
          ridgePoint = position;
          ridgeNormal = normal;
          vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.);
          // The trail keeps its short far plane and depth precision. This pass
          // sits behind it while retaining the arc's actual projected parallax.
          gl_Position = vec4(clip.xy, clip.w * .99996, clip.w);
        }
      `,
      fragmentShader: `
        uniform vec3 haze;
        uniform float frost, amount, layer;
        varying vec2 face;
        varying vec3 ridgePoint, ridgeNormal;
        void main() {
          vec3 rockNormal = normalize(ridgeNormal);
          vec3 sunVector = normalize(vec3(-.60,.44,.48));
          float faceLight = .26 + .74 * max(0., dot(rockNormal, sunVector));
          vec2 stone = ridgePoint.xy;
          float erosion = sin(dot(stone, vec2(.047,.031)) + sin(stone.x * .032) * 1.65)
            * cos(dot(stone, vec2(.050,-.046)));
          float gullies = sin(stone.x * .100 + stone.y * .028 + erosion * 1.09)
            * sin(stone.x * .038 - stone.y * .072 + ridgePoint.z * .095);
          float bedrock = smoothstep(.12,.77,abs(gullies));
          float snowLine = mix(.62,.27,frost) + .10 * erosion;
          float snowfield = smoothstep(snowLine-.12,snowLine+.16,face.x + .23 * gullies);
          snowfield *= 1. - .64 * bedrock * (1. - smoothstep(.22,.86,abs(rockNormal.y)));
          vec3 rock = mix(vec3(.143,.207,.236), vec3(.265,.294,.317), faceLight);
          rock *= .76 + .25 * faceLight + erosion * .09 - bedrock * .16;
          vec3 snow = mix(vec3(.39,.51,.60),vec3(.87,.91,.93),faceLight * .88 + .12);
          snow *= .92 + erosion * .055 + face.y * .045;
          vec3 shade = mix(rock, snow, snowfield);
          float separation = (.64 + layer * .25) * smoothstep(-.09,.28,face.x) * amount;
          gl_FragColor = vec4(mix(haze,shade,.66 + layer*.18), separation);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    })
    const mountain = new T.Mesh(mountainMesh(layer), material)
    mountain.position.y = -9
    mountain.renderOrder = -40 + layer
    mountain.frustumCulled = false
    scene.add(mountain)
    return mountain
  })
  return (distance, northern, snow, color) => {
    haze.value.copy(color)
    frost.value = snow
    amount.value = northern
    for (const [index, ridge] of mountains.entries()) {
      ridge.visible = northern > 0
      const origin = horizonPosition(distance, index)
      ridge.position.x = origin.x
      ridge.position.z = origin.z
    }
  }
}
