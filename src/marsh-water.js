import * as T from 'three'
import { dawnDirection } from './atmosphere.js'

const uniforms = T.UniformsUtils.clone(T.UniformsLib.fog)
Object.assign(uniforms, {
  waterClock: { value: 0 }, waterDetail: { value: 1 }, waterWeather: { value: 0 }, waterFrost: { value: 0 },
  waterTint: { value: new T.Color(.049, .109, .113) },
  worldOrigin: { value: new T.Vector2() }, waterSky: { value: new T.Color(0xb4c3ba) },
  waterHorizon: { value: new T.Color(0xe3b994) }, waterLight: { value: new T.Color(0xffdaaa) },
  waterSun: { value: dawnDirection },
})

export const marshWater = new T.ShaderMaterial({
  uniforms, fog: true,
  vertexShader: `
    attribute float marshDepth;
    varying float bedDepth;
    varying vec3 waterPoint;
    #include <fog_pars_vertex>
    void main() {
      bedDepth = marshDepth;
      waterPoint = (modelMatrix * vec4(position, 1.)).xyz;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `,
  fragmentShader: `
    uniform float waterClock, waterDetail, waterWeather, waterFrost;
    uniform vec2 worldOrigin;
    uniform vec3 waterSky, waterHorizon, waterSun, waterLight, waterTint;
    varying float bedDepth;
    varying vec3 waterPoint;
    #include <fog_pars_fragment>

    void main() {
      vec2 p = waterPoint.xz + worldOrigin;
      float broad = sin(dot(p, vec2(.65, 2.12)) - waterClock * 1.84);
      float crossWave = sin(dot(p, vec2(-2.1, 3.8)) + waterClock * 2.6 + broad * .48);
      float ripple = 0.;
      if (waterDetail > .5) {
        float rippleFade = 1. - smoothstep(.11, .28, max(length(dFdx(p)), length(dFdy(p))));
        ripple = sin(dot(p, vec2(6.6, 10.4)) - waterClock * 4.5 + crossWave * .9) * rippleFade;
      }
      vec3 normal = normalize(vec3(.022 * broad - .015 * crossWave,
        1., (.039 + waterWeather * .027) * crossWave + .017 * broad + .011 * ripple));
      vec3 eye = normalize(cameraPosition - waterPoint);
      vec3 reflected = reflect(-eye, normal);
      float graze = 1. - max(0., dot(eye, normal));
      float fresnel = .065 + .89 * graze * graze * graze;
      float crossing = step(1., bedDepth);
      float depth = max(0., bedDepth - crossing + .012 * broad);
      float deep = smoothstep(.02, .64, depth);
      float strand = .5 + .5 * sin(p.x * 1.43 + p.y * .57 + .48 * broad);
      vec3 mud = mix(vec3(.12,.084,.046), vec3(.190,.137,.071), strand);
      vec3 lake = mix(mud, waterTint, deep);
      lake = mix(lake, vec3(.081,.163,.181) * (.85 + deep*.22 + crossWave*.055), crossing * .86);
      lake *= 1. - .26 * (1. - smoothstep(.012, .095, depth));
      float rim = smoothstep(.015,.04,depth) * (1. - smoothstep(.073,.115,depth));
      rim *= .77 + .23 * sin(dot(p, vec2(1.77,.97)) + broad * .41);
      lake += rim * (.5 + crossWave * .5) * vec3(.032,.031,.015);
      float skyGradient = smoothstep(-.02, .55, reflected.y);
      vec3 mirrored = mix(waterHorizon, waterSky, skyGradient) * mix(.36, .60, skyGradient) * vec3(.73,.88,.99);
      float facingSun = max(0., dot(reflected, waterSun));
      float shine = pow(facingSun, 26.) * (.18 + .45 * smoothstep(-.2,.84, crossWave + .32 * ripple));
      float shimmer = pow(facingSun, 115.) * .36;
      vec3 reflectedLight = mirrored + waterLight * (shine + shimmer) * (1. - waterWeather * .76);
      float reflectivity = fresnel * mix(.80, 1., deep) * mix(1., .64, crossing);
      vec3 color = mix(lake, reflectedLight, reflectivity);
      color += crossing * rim * vec3(.025,.036,.036);
      if (waterDetail > .5 && waterWeather > .40) {
        vec2 grid = p * 1.8;
        vec2 cell = floor(grid);
        float seed = fract(dot(cell, vec2(.754877,.56984)));
        vec2 center = .28 + .44 * vec2(seed, fract(seed * 3.73));
        float age = fract(waterClock * 1.81 + seed);
        float ring = 1. - smoothstep(.013, .041, abs(length(fract(grid) - center) - (.025 + age * .20)));
        float rainFocus = 1. - smoothstep(.073, .20, length(fwidth(grid)));
        color += ring * rainFocus * (1. - age) * waterWeather * vec3(.038,.048,.047);
      }
      if (waterFrost > .01 && crossing < .5) {
        float channel = deep + .16 * sin(p.y * .37 + p.x * .22) + .07 * sin(p.x * 2.18 + p.y * .42);
        float edge = smoothstep(.48, .62, channel);
        float crystals = sin(p.x * 11.0 + p.y * 3.88) * sin(p.y * 17.0 - p.x * 9.6);
        float crack = pow(abs(sin(p.x * .92 + p.y * 1.49 + .72 * sin(p.y * .96))), 39.0);
        vec3 ice = mix(vec3(.34,.48,.56), vec3(.53,.66,.71), (1.-deep)*.74 + crystals*.08);
        ice += vec3(.05,.081,.100) * (1. - edge) - crack * .061;
        color = mix(color, ice, (1. - edge) * waterFrost);
      }
      gl_FragColor = vec4(color, 1.);
      #include <fog_fragment>
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `,
})

export function updateMarshWater(time, center, distance, weather, detail) {
  uniforms.waterClock.value = time
  uniforms.waterDetail.value = detail
  uniforms.waterWeather.value = weather.wet
  uniforms.waterFrost.value = weather.frost ?? 0
  uniforms.worldOrigin.value.set(center, -distance)
  uniforms.waterHorizon.value.copy(weather.sky)
  if (weather.zenith) uniforms.waterSky.value.copy(weather.zenith)
  if (weather.light) uniforms.waterLight.value.copy(weather.light)
  if (weather.waterTint) uniforms.waterTint.value.copy(weather.waterTint)
}
