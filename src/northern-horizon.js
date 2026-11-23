import * as T from 'three'
import { expeditionRegions } from './expedition.js'
import { centerAt, seededRandom } from './trail.js'

const farRadii = [510, 345]
const borderDistance = expeditionRegions[7].marker

export function horizonPosition(distance, layer) {
  return {
    x: -centerAt(distance) + (layer === 0 ? -22 : 16),
    z: 32 * Math.tanh((distance - borderDistance) / 1550),
  }
}

function mountainMesh(layer) {
  const random = seededRandom(47509 + layer * 491)
  const points = [], heights = [], faces = []
  const columns = 88
  const ranges = [[-152, 31, 45], [-92, 25, 31], [-41, 43, 36], [8, 29, 28], [66, 41, 33], [119, 30, 32]]
  for (let i = 0; i <= columns; i++) {
    const x = (i - columns * .5) * 5.3
    let peak = 4 + 4 * random()
    for (const [center, height, span] of ranges) {
      peak = Math.max(peak, 8 + height * Math.max(0, 1 - Math.abs(x - center - layer * 19) / span))
    }
    peak = peak * (.84 + random() * .26) * (layer === 0 ? 1 : .68)
    for (let row = 0; row < 5; row++) {
      const t = row / 4
      const y = T.MathUtils.lerp(-7, peak, t) + Math.sin(x * .27 + row * 1.7) * t * 1.44
      const azimuth = (x + Math.cos(row * 2.7 + i * .44) * (3.6 * (1 - t))) / 155
      const radius = farRadii[layer] + (16 + layer * 9) * t
      points.push(Math.sin(azimuth) * radius, y * (layer === 0 ? 2.25 : 2.05), -Math.cos(azimuth) * radius)
      heights.push(t, random())
      if (i && row) {
        const a = i * 5 + row
        if (i % 2) faces.push(a, a - 5, a - 1, a - 1, a - 5, a - 6)
        else faces.push(a, a - 5, a - 6, a, a - 6, a - 1)
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
          float facets = abs(dot(normalize(ridgeNormal), normalize(vec3(.6,.15,-.78))));
          vec2 stone = ridgePoint.xy;
          float relief = sin(dot(stone, vec2(.037,.060))) * cos(dot(stone, vec2(.046,-.028)));
          relief += .30 * sin(dot(stone, vec2(.083,-.091)) + ridgePoint.z * .051);
          float runnel = relief * .075;
          float snowLine = mix(.84,.47,frost);
          float blanket = smoothstep(snowLine-.09,snowLine+.13,face.x+runnel-facets*.14);
          vec3 rock = mix(vec3(.101,.168,.205), vec3(.143,.242,.235), layer*.44);
          vec3 cap = mix(vec3(.55,.62,.69),vec3(.84,.89,.93),facets*.80);
          vec3 color = mix(rock * (.78+facets*.26+relief*.095+face.y*.04), cap, blanket);
          float separation = (.54 + layer * .21) * smoothstep(.04,.48,face.x) * amount;
          gl_FragColor = vec4(mix(haze, color, .70 + layer * .20), separation);
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
