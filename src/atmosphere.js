import * as T from 'three'
import { waterProfiles } from './landscape-surfaces.js'
import { seededRandom } from './trail.js'
import { atmosphereBlend, blendProperty, expeditionRegions, northLevel, snowLevel } from './expedition.js'
import { createNorthernHorizon } from './northern-horizon.js'

export const dawnDirection = new T.Vector3(-.58, .22, -.82).normalize()

const states = [
  ['Autumn sunrise', 0x49728a, 0xcdb69c, 0xffd69e, .0124, .14, 0, 0, .11, 2.05],
  ['Overcast', 0x59676d, 0xa6a69a, 0xd0d0bf, .017, .71, 0, 0, .23, .62],
  ['Morning fog', 0x717c77, 0xaeb0a1, 0xd7ccaa, .027, .45, 0, 0, .11, .76],
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

const mountainWeather = [
  { ...states[6], name: 'High-country snow', snow: .65 },
  { ...states[0], name: 'Alpine sunbreak', cloud: .24, wind: .21, light: 1.56 },
  { ...states[5], name: 'Drifting snow', cloud: .62, snow: .38, wind: .78 },
  { ...states[2], name: 'Cold river mist', fog: .020, cloud: .57, snow: .08 },
]
const mountainArrival = expeditionRegions.at(-1).seconds

export function routeWeatherAt(time) {
  if (time < mountainArrival) return weatherAt(time)
  const elapsed = time - mountainArrival
  const phaseLength = 37
  const index = Math.floor(elapsed / phaseLength)
  return {
    from: index ? mountainWeather[(index - 1) % mountainWeather.length] : weatherAt(mountainArrival).to,
    to: mountainWeather[index % mountainWeather.length],
    blend: T.MathUtils.smoothstep(elapsed % phaseLength, 0, transition),
  }
}

const skyVertex = `
  varying vec3 ray;
  void main() {
    ray = position;
    gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.);
  }`

const skyFragment = `
  uniform vec3 zenith;
  uniform vec3 horizon;
  uniform vec3 sunColor;
  uniform float cloud;
  uniform float clock, skyDetail;
  uniform vec3 dawn;
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
    float toward = max(0., dot(direction, dawn));
    float tint = pow(toward, 10.) * (1. - cloud * .76);
    vec3 lowSky = mix(horizon, mix(horizon, sunColor, .39), tint);
    vec3 color = mix(lowSky, zenith, smoothstep(.015, .59, height));
    color += sunColor * (pow(toward, 27.) * .34 + smoothstep(.99935, .99964, toward) * 1.85) * (1. - cloud);
    vec2 p = direction.xz * vec2(4.8, 8.3) / max(.16, height + .13) + vec2(clock * .013, clock * .006);
    float billow = noise(p) * .67 + noise(p * 2.05) * .33;
    if (skyDetail > .5) billow += (noise(p * 4.06) - .5) * .14;
    float cover = smoothstep(.57-cloud*.27, .83-cloud*.19, billow);
    vec3 cloudLight = mix(horizon*.70, mix(horizon, sunColor, .49), smoothstep(.45,.81,billow) * (.42 + tint * .58));
    color = mix(color, cloudLight, cover*smoothstep(.025, .20, height) * .79);
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
  const material = snow ? new T.PointsMaterial({ color: 0xd8e4e0, size: .047, transparent: true, opacity: .58, depthWrite: false })
    : new T.LineBasicMaterial({ color: 0xc1d5dc, transparent: true, opacity: .25, depthWrite: false })
  const model = snow ? new T.Points(geometry, material) : new T.LineSegments(geometry, material)
  model.frustumCulled = false
  scene.add(model)
  return (amount, time, wind, budget) => {
    const count = Math.floor(max * amount * budget)
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
      sunColor: { value: new T.Color() }, dawn: { value: dawnDirection }, cloud: { value: 0 }, clock: { value: 0 }, skyDetail: { value: 1 } },
    vertexShader: skyVertex, fragmentShader: skyFragment, side: T.BackSide, depthWrite: false,
  }))
  sky.renderOrder = -50
  sky.frustumCulled = false
  scene.add(sky)
  const fog = new T.FogExp2(0xb7a78a, .015)
  scene.fog = fog
  const fill = new T.HemisphereLight(0xcbddef, 0x89734e, 1.56)
  const sun = new T.DirectionalLight(0xf7cb8e, 1.8)
  sun.position.copy(dawnDirection).multiplyScalar(28)
  const front = new T.DirectionalLight(0xf4e8d7, .84)
  front.position.set(7, 6, 10)
  scene.add(sun, fill, front)
  const horizon = createNorthernHorizon(scene)
  const tone = new T.Color()
  const atmosphereWater = new T.Vector4()
  const daylight = [.06, .16, -.10, -.33, .26, .42, .35, .52, .18, .04, -.12, .17, -.27, .36, .51]
  const accent = new T.Color()
  const rain = precipitation(scene, false)
  const snow = precipitation(scene, true)
  const result = { name: '', wind: 0, wet: 0, rain: 0, frost: 0, sky: new T.Color(), zenith: new T.Color(),
    light: new T.Color(), waterTint: new T.Color(), waterProfile: new T.Vector4() }
  return {
    update(elapsed, time, budget, distance = 0) {
      const { from, to, blend } = routeWeatherAt(elapsed)
      const lerp = (key) => T.MathUtils.lerp(from[key], to[key], blend)
      const uniforms = sky.material.uniforms
      uniforms.zenith.value.copy(from.sky).lerp(to.sky, blend)
      uniforms.horizon.value.copy(from.horizon).lerp(to.horizon, blend)
      uniforms.sunColor.value.copy(from.sun).lerp(to.sun, blend)
      const region = atmosphereBlend(elapsed)
      const tint = (target, key, influence) => target.lerp(tone.setHex(region.from[key])
        .lerp(accent.setHex(region.to[key]), region.blend), influence)
      tint(uniforms.zenith.value, 'sky', .76)
      tint(uniforms.horizon.value, 'horizon', .70)
      tint(uniforms.sunColor.value, 'sun', .64)
      result.frost = snowLevel(region)
      horizon(distance, northLevel(region), result.frost, uniforms.horizon.value, budget)
      const lightness = T.MathUtils.lerp(daylight[region.from.index], daylight[region.to.index], region.blend)
      uniforms.cloud.value = T.MathUtils.clamp(lerp('cloud') - lightness * .24, .05, .99)
      result.waterProfile.fromArray(waterProfiles[region.from.key]).lerp(atmosphereWater.fromArray(waterProfiles[region.to.key]), region.blend)
      uniforms.clock.value = time
      uniforms.skyDetail.value = budget > .53 ? 1 : 0
      fog.color.copy(uniforms.horizon.value)
      result.sky.copy(uniforms.horizon.value)
      result.zenith.copy(uniforms.zenith.value)
      result.light.copy(uniforms.sunColor.value)
      result.waterTint.setHex(region.from.waterTint).lerp(tone.setHex(region.to.waterTint), region.blend)
      fog.density = T.MathUtils.lerp(lerp('fog'), blendProperty(region, 'fog'), .72)
      sun.color.copy(uniforms.sunColor.value)
      sun.intensity = lerp('light') * 1.12 * (1 + lightness * .21)
      const elevation = .22 + lightness * .23
      dawnDirection.set(-.58, elevation, -.82).normalize()
      sun.position.copy(dawnDirection).multiplyScalar(28)
      const shade = (region.from.treesPerSide + (region.to.treesPerSide - region.from.treesPerSide) * region.blend) / 12
      const swamp = T.MathUtils.lerp(Number(region.from.key === 'cypress'), Number(region.to.key === 'cypress'), region.blend)
      fill.intensity = 1.67 - lerp('cloud') * .19 - shade * .26 - swamp * .11
      fill.groundColor.setHex(region.from.bank).lerp(tone.setHex(region.to.bank), region.blend).multiplyScalar(.71)
      sun.intensity *= 1.08 - shade * .10 + swamp * .33
      result.rain = lerp('rain') * (1 - result.frost)
      result.wind = lerp('wind')
      result.wet = Math.min(1, result.rain + lerp('snow') * .24)
      result.name = blend > .5 ? to.name : from.name
      rain(result.rain, time, result.wind, budget)
      snow(Math.max(lerp('snow') * .56, result.frost * .10), time, result.wind, budget)
      return result
    },
  }
}
