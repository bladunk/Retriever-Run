import * as T from 'three'
import { landscapeMap, landscapeReady } from './landscape-atlas.js'
import { fieldAtlasShader } from './field-atlas-shader.js'
import { dawnDirection } from './atmosphere.js'

const uniforms = T.UniformsUtils.clone(T.UniformsLib.fog)
Object.assign(uniforms, {
  waterClock: { value: 0 }, waterDetail: { value: 1 }, waterWeather: { value: 0 }, waterFrost: { value: 0 },
  waterTint: { value: new T.Color(.049, .109, .113) },
  worldOrigin: { value: new T.Vector2() }, waterSky: { value: new T.Color(0xb4c3ba) },
  waterHorizon: { value: new T.Color(0xe3b994) }, waterLight: { value: new T.Color(0xffdaaa) },
  waterSun: { value: dawnDirection }, landscapeMap, landscapeReady,
  waterProfile: { value: new T.Vector4(.60, .42, .67, .78) }, waterWind: { value: 0 },
})

export const marshWater = new T.ShaderMaterial({
  uniforms, fog: true,
  vertexShader: `
    attribute float marshDepth, marshCanopy;
    varying float bedDepth, bankCanopy;
    varying vec3 waterPoint;
    #include <fog_pars_vertex>
    void main() {
      bedDepth = marshDepth;
      bankCanopy = marshCanopy;
      waterPoint = (modelMatrix * vec4(position, 1.)).xyz;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `,
  fragmentShader: `
    uniform float waterClock, waterDetail, waterWeather, waterFrost;
    uniform vec2 worldOrigin;
    uniform vec4 waterProfile;
    uniform float waterWind;
    ${fieldAtlasShader}
    uniform vec3 waterSky, waterHorizon, waterSun, waterLight, waterTint;
    varying float bedDepth, bankCanopy;
    varying vec3 waterPoint;
    #include <fog_pars_fragment>

    void main() {
      if (bedDepth <= 0.) discard;
      vec2 p = waterPoint.xz + worldOrigin;
      vec2 flow = normalize(vec2(.26 + waterProfile.y * .43, 1.0));
      vec2 drift = p + vec2(.49 * sin(p.x*.64 + p.y*.38), .44 * cos(p.y*.59-p.x*.73));
      float broad = sin(dot(drift, flow) * 2.23 + waterClock * (.85 + waterProfile.y * 2.6));
      float crossWave = sin(dot(drift, vec2(-2.1, 3.8)) + waterClock * (1.1 + waterWind * 2.15) + broad * .58);
      float ripple = 0.;
      if (waterDetail > .5) {
        float rippleFade = 1. - smoothstep(.11, .28, max(length(dFdx(p)), length(dFdy(p))));
        ripple = sin(dot(p, vec2(6.6, 10.4)) - waterClock * 4.5 + crossWave * .9) * rippleFade;
      }
      float chop = .34 + waterProfile.w * .70 + waterWind * .46;
      vec3 normal = normalize(vec3((.021 * broad - .024 * crossWave) * chop,
        1., ((.041 + waterWeather * .033) * crossWave + .021 * broad + .017 * ripple) * chop));
      vec3 eye = normalize(cameraPosition - waterPoint);
      vec3 reflected = reflect(-eye, normal);
      float graze = 1. - max(0., dot(eye, normal));
      float fresnel = .055 + .73 * graze * graze * graze;
      float crossing = step(1., bedDepth);
      float depth = max(0., bedDepth - crossing + .012 * broad);
      float deep = smoothstep(.015, .83 - waterProfile.x * .54, depth);
      float strand = .5 + .5 * sin(p.x * 1.43 + p.y * .57 + .48 * broad);
      float sediment = sin(p.x * 2.1 + sin(p.y * 1.54) * 1.31)
        * sin(p.y * 1.6 - p.x * 2.35);
      vec3 clearBed = mix(vec3(.084,.084,.054), vec3(.169,.144,.091), strand);
      vec3 siltBed = mix(vec3(.051,.043,.024), vec3(.099,.071,.041), strand);
      vec3 mud = mix(clearBed, siltBed, waterProfile.x);
      if (waterDetail > .5 && deep < .95 && landscapeReady > .5) {
        vec2 bed = p * .74 + vec2(broad, crossWave) * depth * .072;
        vec2 dx = dFdx(bed), dy = dFdy(bed);
        float close = (1. - smoothstep(.08,.29,max(length(dx), length(dy)))) * (1. - deep);
        if (close > .01) {
          vec3 sand = scannedSurface(19.,bed,dx,dy);
          mud *= mix(vec3(1.), .69 + .75 * sand, close);
        }
      }
      mud *= 1. + sediment * .15 * (1. - smoothstep(.18,.55,length(fwidth(p))));
      vec3 lake = mix(mud, waterTint, deep);
      // Trail crossings use the same water as the banks. Reach a deeper
      // channel color in the middle, and leave the wet gravel edges visible.
      lake = mix(lake, mix(mud * .72, waterTint * .82, .28 + deep * .63), crossing);
      lake *= 1. - .26 * (1. - smoothstep(.012, .095, depth));
      float rim = smoothstep(.015,.04,depth) * (1. - smoothstep(.073,.115,depth));
      rim *= .77 + .23 * sin(dot(p, vec2(1.77,.97)) + broad * .41);
      lake += rim * (.5 + crossWave * .5) * vec3(.017,.018,.010);
      float skyGradient = smoothstep(-.02, .62, reflected.y);
      float waterLightness = mix(.30, .59, waterProfile.z);
      vec3 mirrored = mix(waterHorizon, waterSky, skyGradient) * mix(.27, .55, skyGradient) * vec3(.68,.83,.90)
        * waterLightness * (1.0 - waterProfile.x * .24);
      float facingSun = max(0., dot(reflected, waterSun));
      float shine = pow(facingSun, 51.) * (.06 + .34 * smoothstep(.14,.91, crossWave + .32 * ripple));
      float shimmer = pow(facingSun, 170.) * .28;
      float seam = sin(p.x * 1.23 + ripple*.27) * cos(p.x * .60 - .8 + sin(p.y * .32) * .44);
      float foliage = smoothstep(-.15,.60, seam + .23*crossWave) * clamp(bankCanopy,0.,1.);
      float bankReflection = mix(.19, .88, min(1., bankCanopy)) * (.55 + graze * .45);
      mirrored *= 1. - foliage * (.41 + .40 * graze) - bankReflection * .17;
      if (waterDetail > 1.5) {
        float wake = sin(dot(p, flow) * 5.7 + waterClock*2.17 + broad*1.16) * crossWave;
        mirrored *= .94 + wake * .11;
      }
      vec3 reflectedLight = mirrored + waterLight * (shine + shimmer) * (1. - waterWeather * .76);
      float reflectivity = fresnel * mix(.50, .92, deep) * mix(1., .64, crossing) * (.58 + waterProfile.z * .67);
      vec3 color = mix(lake, reflectedLight, reflectivity);
      color *= 1. - min(.69,bankCanopy*.54) * mix(.71,.32,deep);
      color += (broad + crossWave * .6) * (.002 + chop*.003) * vec3(.74,.96,1.);
      color += crossing * rim * vec3(.021,.019,.012);
      if (waterDetail > .5 && crossing < .5) {
        float moving = smoothstep(.55,.90,crossWave + broad*.29);
        float ribbons = smoothstep(.26,.91,sediment) * rim * moving;
        color += ribbons * waterProfile.y * vec3(.17,.16,.12);
      }
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
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }
  `,
})

export function updateMarshWater(time, center, distance, weather, detail) {
  uniforms.waterClock.value = time
  uniforms.waterDetail.value = detail
  uniforms.waterWeather.value = weather.wet
  uniforms.waterWind.value = weather.wind
  if (weather.waterProfile) uniforms.waterProfile.value.copy(weather.waterProfile)
  uniforms.waterFrost.value = weather.frost ?? 0
  uniforms.worldOrigin.value.set(center, -distance)
  uniforms.waterHorizon.value.copy(weather.sky)
  if (weather.zenith) uniforms.waterSky.value.copy(weather.zenith)
  if (weather.light) uniforms.waterLight.value.copy(weather.light)
  if (weather.waterTint) uniforms.waterTint.value.copy(weather.waterTint)
}
