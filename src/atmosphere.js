import * as T from 'three'
import { seededRandom } from './trail.js'

const states = [
  ['Autumn sunrise', 0x647477, 0xc88649, 0xead49b, .013, .08, 0, 0, .11, 1.9],
  ['Overcast', 0x59676d, 0xa6a69a, 0xd0d0bf, .017, .71, 0, 0, .23, .62],
  ['Morning fog', 0x717c77, 0xaeb0a1, 0xd7ccaa, .034, .45, 0, 0, .11, .76],
  ['Light rain', 0x48595d, 0x8e9c98, 0xb9c8ca, .019, .82, .43, 0, .35, .64],
  ['Heavy rain', 0x38464c, 0x798782, 0xa3bac2, .024, .94, 1, 0, .73, .48],
  ['Windy', 0x536b73, 0xaca087, 0xdcc5a1, .015, .42, 0, 0, 1, 1.0],
  ['Snow', 0x59686d, 0xb6bbba, 0xd4d9d4, .022, .70, 0, 1, .24, .70],
  ['Sleet', 0x47575e, 0x9a9e9a, 0xb9c9d4, .022, .91, .58, .47, .70, .51],
].map(([name, sky, horizon, sun, fog, cloud, rain, snow, wind, light]) => ({
  name, sky: new T.Color(sky), horizon: new T.Color(horizon), sun: new T.Color(sun), fog, cloud, rain, snow, wind, light,
}))

const weatherInterval = 34
const transition = 12

export function weatherAt(time) {
  const index = Math.floor(time / weatherInterval)
  const fraction = (time % weatherInterval) / transition
  const blend = index === 0 ? 1 : T.MathUtils.smoothstep(fraction, 0, 1)
  return { from: states[(Math.max(0, index - 1)) % states.length], to: states[index % states.length], blend }
}

const skyVertex = `
  varying vec3 ray;
  void main() {
    ray = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
  }`

const skyFragment = `
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 sunColor;
  uniform float cloud;
  uniform float clock;
  varying vec3 ray;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3.-2.*f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+1.), f.x), f.y);
  }

  void main() {
    vec3 direction = normalize(ray);
    float height = max(0., direction.y);
    vec3 color = mix(horizon, zenith, smoothstep(0., .76, height));
    float toward = max(0., dot(direction, normalize(vec3(-.33, .155, -1.))));
    color += sunColor * (pow(toward, 17.) * .23 + smoothstep(.999, .99955, toward) * 1.45) * (1. - cloud);
    vec2 p = direction.xz * vec2(4., 7.) / max(.12, height + .12) + vec2(clock * .024, clock * .007);
    float texture = noise(p)*.53 + noise(p*2.04)*.30 + noise(p*4.13)*.17;
    float cover = smoothstep(.60-cloud*.29, .88-cloud*.25, texture);
    color = mix(color, mix(horizon*.55, sunColor*.99, texture), cover*smoothstep(.015, .23, height) * .85);
    gl_FragColor = vec4(color, 1.);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`

function precipitation(scene, snow) {
  const max = snow ? 220 : 420
  const vertices = snow ? 1 : 2
  const positions = new Float32Array(max * 3 * vertices)
  const seeds = new Float32Array(max * 3)
  const random = seededRandom(snow ? 412812 : 8319)
  for (let i = 0; i < seeds.length; i++) seeds[i] = random()
  const geometry = new T.BufferGeometry()
  const attr = new T.BufferAttribute(positions, 3)
  attr.setUsage(T.DynamicDrawUsage)
  geometry.setAttribute('position', attr)
  const material = snow ? new T.PointsMaterial({ color: 0xd8e4e0, size: .065, transparent: true, opacity: .72, depthWrite: false })
    : new T.LineBasicMaterial({ color: 0xc1d5dc, transparent: true, opacity: .34, depthWrite: false })
  const model = snow ? new T.Points(geometry, material) : new T.LineSegments(geometry, material)
  model.frustumCulled = false
  scene.add(model)
  return (amount, time, wind, lowQuality) => {
    const count = Math.floor(max * amount * (lowQuality ? .45 : 1))
    model.visible = count > 0
    if (!count) return
    const modulo = (value) => ((value % 1) + 1) % 1
    for (let i = 0; i < count; i++) {
      const n = i * 3
      const k = n * vertices
      const speed = snow ? .085 : .63
      const x = (modulo(seeds[n] + time * wind * (snow ? .048 : .069)) - .5) * 25
      const y = modulo(seeds[n + 1] - time * speed) * 10 - .05
      const z = modulo(seeds[n + 2] + time * (snow ? .048 : .125)) * -31 + 7
      positions[k] = x + (snow ? Math.sin(time * 1.8 + i * .75) * .38 : 0)
      positions[k + 1] = y
      positions[k + 2] = z
      if (!snow) {
        positions[k + 3] = x + wind * .14
        positions[k + 4] = y + .37
        positions[k + 5] = z - .072
      }
    }
    geometry.setDrawRange(0, count * vertices)
    attr.needsUpdate = true
  }
}

export function createAtmosphere(scene) {
  const sky = new T.Mesh(new T.SphereGeometry(146, 32, 16), new T.ShaderMaterial({
    uniforms: { zenith: { value: new T.Color() }, horizon: { value: new T.Color() },
      sunColor: { value: new T.Color() }, cloud: { value: 0 }, clock: { value: 0 } },
    vertexShader: skyVertex, fragmentShader: skyFragment, side: T.BackSide, depthWrite: false,
  }))
  sky.renderOrder = -50
  sky.frustumCulled = false
  scene.add(sky)
  const fog = new T.FogExp2(0xb7a78a, .015)
  scene.fog = fog
  const fill = new T.HemisphereLight(0xfcdfb4, 0x7f8a65, 1.61)
  const sun = new T.DirectionalLight(0xf7cb8e, 1.8)
  sun.position.set(-11, 9, -15)
  const front = new T.DirectionalLight(0xe0d1b0, .93)
  front.position.set(7, 6, 10)
  scene.add(sun, fill, front)
  const rain = precipitation(scene, false)
  const snow = precipitation(scene, true)
  const result = { name: '', wind: 0, wet: 0, rain: 0 }
  return {
    update(elapsed, time, lowQuality) {
      const { from, to, blend } = weatherAt(elapsed)
      const lerp = (key) => T.MathUtils.lerp(from[key], to[key], blend)
      const uniforms = sky.material.uniforms
      uniforms.zenith.value.copy(from.sky).lerp(to.sky, blend)
      uniforms.horizon.value.copy(from.horizon).lerp(to.horizon, blend)
      uniforms.sunColor.value.copy(from.sun).lerp(to.sun, blend)
      uniforms.cloud.value = lerp('cloud')
      uniforms.clock.value = time
      fog.color.copy(uniforms.horizon.value)
      fog.density = lerp('fog')
      sun.color.copy(uniforms.sunColor.value)
      sun.intensity = lerp('light')
      fill.intensity = 1.47 - lerp('cloud') * .22
      result.rain = lerp('rain')
      result.wind = lerp('wind')
      result.wet = Math.min(1, result.rain + lerp('snow') * .24)
      result.name = blend > .5 ? to.name : from.name
      rain(result.rain, time, result.wind, lowQuality)
      snow(lerp('snow'), time, result.wind, lowQuality)
      return result
    },
  }
}
