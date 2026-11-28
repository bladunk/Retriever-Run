import * as T from 'three'
import { landscapeMap, landscapeReady } from './landscape-atlas.js'
import { fieldAtlasShader } from './field-atlas-shader.js'
import { dawnDirection } from './atmosphere.js'
import { expeditionRegions } from './expedition.js'
import { gulfMap, gulfProperties, gulfReady, gulfScans } from './gulf-surfaces.js'
import { puddleWidths, puddleLengths, puddleMargin } from './puddle-art.js'

const uniforms = T.UniformsUtils.clone(T.UniformsLib.fog)
Object.assign(uniforms, {
  waterClock: { value: 0 }, waterDetail: { value: 1 }, waterWeather: { value: 0 }, waterFrost: { value: 0 },
  waterTint: { value: new T.Color(.049, .109, .113) },
  worldOrigin: { value: new T.Vector2() }, waterSky: { value: new T.Color(0xb4c3ba) },
  waterHorizon: { value: new T.Color(0xe3b994) }, waterLight: { value: new T.Color(0xffdaaa) },
  waterSun: { value: dawnDirection }, landscapeMap, landscapeReady,
  waterProfile: { value: new T.Vector4(.60, .42, .67, .78) }, waterWind: { value: 0 },
  southernWater: { value: 0 }, twilight: { value:0 },
  gulfEnd: { value: expeditionRegions[1].marker }, gulfMap, gulfProperties, gulfReady,
  swampRange: { value: new T.Vector2(expeditionRegions[1].marker, expeditionRegions[2].marker) },
  platteRange: { value: new T.Vector2(expeditionRegions[6].marker, expeditionRegions[7].marker) },
  alpineStart: { value: expeditionRegions[13].marker },
  puddleWidths: { value: puddleWidths }, puddleLengths: { value: puddleLengths },
})

export const marshWater = new T.ShaderMaterial({
  uniforms, fog: true,
  vertexShader: `
    attribute float marshDepth, marshCanopy;
    varying float bedDepth, bankCanopy;
    varying vec3 waterPoint;
    varying vec2 puddleUV;
    #include <fog_pars_vertex>
    void main() {
      bedDepth = marshDepth;
      bankCanopy = marshCanopy;
      waterPoint = (modelMatrix * vec4(position, 1.)).xyz;
      puddleUV = position.xz;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `,
  fragmentShader: `
    uniform float waterClock, waterDetail, waterWeather, waterFrost;
    uniform vec2 worldOrigin;
    uniform vec4 waterProfile;
    uniform float waterWind, southernWater, twilight;
    uniform float gulfEnd, alpineStart;
    uniform vec2 swampRange, platteRange;
    uniform vec3 puddleWidths, puddleLengths;
    ${fieldAtlasShader}
    ${gulfScans}
    uniform vec3 waterSky, waterHorizon, waterSun, waterLight, waterTint;
    varying float bedDepth, bankCanopy;
    varying vec3 waterPoint;
    varying vec2 puddleUV;
    #include <fog_pars_fragment>

    vec3 trailPool(vec2 p, float edge) {
      float variation = sin(p.x*73. + sin(p.y*57.)*2.) * cos(p.y*64.-p.x*39.);
      float fringe = sin(p.x*9.6+p.y*12.2 + .7*sin(p.x*19. - p.y*4.));
      float margin = ${puddleMargin.toFixed(2)} * (.61 + .24*fringe + .13*variation);
      if (edge > margin) discard;
      float water = 1.-smoothstep(-.012,.026+.013*fringe,edge);
      float graze = pow(1.-max(0.,normalize(cameraPosition-waterPoint).y),2.);
      float bands = sin(p.y*15.+p.x*8.3+waterClock*2.6+sin(p.x*9.)*.48);
      float textureFade = 1.-smoothstep(.025,.16,length(fwidth(p)));
      vec3 wetGravel = mix(vec3(.066,.058,.041),vec3(.139,.122,.091),smoothstep(.0,margin, edge));
      wetGravel = mix(wetGravel,mix(wetGravel,waterTint,.22),waterWeather*.45);
      wetGravel *= 1. + variation*.31*textureFade;
      vec3 skyImage = mix(waterSky,waterHorizon, .35 + .20*bands*textureFade);
      skyImage = mix(skyImage,max(skyImage,vec3(.185,.242,.251)),twilight*.88);
      vec3 silt = mix(vec3(.066,.077,.067),waterTint*.58, .46);
      vec3 reflected = mix(silt,skyImage * vec3(.47,.61,.65), .43 + graze*.36);
      reflected *= .92 + .10*bands*textureFade;
      reflected += (1.-smoothstep(.014,.059,abs(edge+.027))) * vec3(.023,.019,.010);
      return mix(wetGravel,reflected,water);
    }

    void main() {
      if (bedDepth <= 0.) discard;
      vec2 p = waterPoint.xz + worldOrigin;
      if (bedDepth > 2.) {
        vec2 pool = abs(puddleUV);
        vec3 x = pool.x-puddleWidths, z = pool.y-puddleLengths;
        vec3 corner = max(x,0.)*max(x,0.) + max(z,0.)*max(z,0.);
        vec3 edges = sqrt(corner) + min(max(x,z),0.);
        gl_FragColor = vec4(trailPool(p,min(edges.x,min(edges.y,edges.z))),1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
        return;
      }
      float coast = 1. - smoothstep(gulfEnd - 11., gulfEnd + 16., -p.y);
      float swamp = smoothstep(swampRange.x - 18., swampRange.x + 29., -p.y) *
        (1. - smoothstep(swampRange.y - 29., swampRange.y + 18., -p.y));
      float braid = smoothstep(platteRange.x-36.,platteRange.x+36.,-p.y) *
        (1. - smoothstep(platteRange.y-36.,platteRange.y+36.,-p.y));
      float alpine = smoothstep(alpineStart-35.,alpineStart+42.,-p.y);
      vec2 flow = normalize(vec2(.26 + waterProfile.y * .43, 1.0));
      vec2 drift = p + vec2(.49 * sin(p.x*.64 + p.y*.38), .44 * cos(p.y*.59-p.x*.73));
      drift += southernWater * vec2(.88 * sin(p.y*.19-p.x*.24),.73*cos(p.x*.11+p.y*.17));
      float broad = sin(dot(drift, flow) * 2.23 + waterClock * (.85 + waterProfile.y * 2.6));
      float crossWave = sin(dot(drift, vec2(-2.1, 3.8)) + waterClock * (1.1 + waterWind * 2.15) + broad * .58);
      float ripple = 0.;
      if (waterDetail > .5) {
        float rippleFade = 1. - smoothstep(.11, .28, max(length(dFdx(p)), length(dFdy(p))));
        ripple = sin(dot(p, vec2(6.6, 10.4)) - waterClock * 4.5 + crossWave * .9) * rippleFade;
      }
      float chop = .34 + waterProfile.w * .70 + waterWind * .46;
      chop *= (1. - swamp * .57) * (1. - southernWater * (.31 + coast*.12));
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
          vec3 sand = coast > .5 && gulfReady > .5 ? gulfScan(2.,0.,bed,dx,dy)
            : scannedSurface(19.,bed,dx,dy);
          mud *= mix(vec3(1.), .69 + .75 * sand, close);
        }
      }
      mud *= 1. + sediment * .15 * (1. - smoothstep(.18,.55,length(fwidth(p))));
      vec3 lake = mix(mud, waterTint, deep);
      lake = mix(lake, mix(vec3(.055,.042,.023), vec3(.012,.025,.018),deep), swamp * .63);
      lake = mix(lake, mix(vec3(.105,.093,.052),vec3(.026,.119,.108),deep),coast * .74);
      float stream = max(braid,smoothstep(.52,.78,waterProfile.y) * southernWater);
      vec3 bankBed = mix(vec3(.116,.097,.057), vec3(.181,.159,.111), stream);
      vec3 basin = mix(waterTint*.81, vec3(.031,.077,.062),coast*.65);
      lake = mix(lake, mix(bankBed*(.66 + .57*strand), basin, deep), southernWater*.57);
      lake = mix(lake, mix(vec3(.176,.141,.084)*(.82+strand*.27),vec3(.068,.106,.108),deep),
        braid*.77*(1.-crossing));
      lake = mix(lake,mix(vec3(.142,.143,.119)*(.91+.22*strand),vec3(.061,.102,.108),deep),
        alpine*.81*(1.-crossing));
      // Trail crossings use the same water as the banks. Reach a deeper
      // channel color in the middle, and leave the wet gravel edges visible.
      vec3 channel = mix(waterTint * .82, vec3(.048,.074,.061), coast);
      lake = mix(lake, mix(mud * .82, channel, .28 + deep * .63), crossing);
      lake *= 1. - .26 * (1. - smoothstep(.012, .095, depth));
      // Broad lenses of sediment and root shadow follow the actual depth.
      // Independent irregularity prevents an identical band around all banks.
      float bankPattern = sin(dot(p,vec2(.71,1.42)) + .65*sin(p.y*.88-p.x*1.19));
      float stain = (1.-smoothstep(.026,.19+.039*bankPattern,depth))*(1.-crossing);
      lake = mix(lake, lake*mix(vec3(.69,.78,.70),vec3(.95,.86,.69),stream), stain*.47);
      float rim = smoothstep(.013,.049,depth) * (1. - smoothstep(.074,.139,depth));
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
      mirrored *= 1. - swamp * (.23 + bankReflection * .13);
      // A broad, bounded color response from the bank canopy avoids a
      // separate mirrored scene and carries the actual tree placements.
      float trunks = smoothstep(.43,.79,.54 + .21*sin((p.x + broad*.10)*2.9 + .36*sin(p.y*.36)) + .17*seam);
      vec3 stand = mix(vec3(.046,.051,.034),vec3(.095,.093,.062),.65 - .65*trunks);
      float canopyImage = clamp(bankCanopy,0.,1.) * (1. - .54*crossing) * (.45 + graze*.44);
      mirrored = mix(mirrored,stand,canopyImage * southernWater);
      if (waterDetail > 1.5) {
        float wake = sin(dot(p, flow) * 5.7 + waterClock*2.17 + broad*1.16) * crossWave;
        mirrored *= .94 + wake * .11;
      }
      vec3 reflectedLight = mirrored + waterLight * (shine + shimmer) * (1. - waterWeather * .76) *
        (1. - coast * .28) * (1. - swamp * .81);
      float reflectivity = fresnel * mix(.50, .92, deep) * mix(1., .64, crossing) * (.58 + waterProfile.z * .67);
      vec3 color = mix(lake, reflectedLight, reflectivity);
      color += alpine * twilight * graze * deep * (1.-crossing) * vec3(.012,.039,.025) * (.39+.36*broad);
      color += braid*(1.-crossing)*graze*(.021+.027*smoothstep(.37,.88,crossWave))*waterSky;
      float wave = smoothstep(.40,.93, crossWave*.7 + broad*.3);
      float fade = 1. - smoothstep(.16,.43,length(fwidth(p)));
      color += coast * fade * (rim*.020 + deep * wave * graze * .016) *
        vec3(.85,.91,.78) * (1. - crossing * .45);
      color *= 1. - min(.69,bankCanopy*.54) * mix(.71,.32,deep);
      color += (broad + crossWave * .6) * (.002 + chop*.003) * vec3(.74,.96,1.) * (1. - southernWater*.47);
      // Open-water sky color can read at grazing angles while the steep
      // off-trail banks retain their sediment edge.
      float creek = smoothstep(.18, .65, depth) * (1. - crossing);
      color += creek * graze * waterProfile.z * (.018 + .025*wave*fade) * mix(waterSky, waterHorizon, .32)
        * (1. - .72 * foliage) * (1. - .58 * swamp);
      // Sediment stays visible in sunlit, shallow gravel and braid channels.
      float shoal = rim * fade * (1. - crossing) * (1. - .65 * foliage);
      color += shoal * (.024 * braid + .019 * alpine + .011 * waterProfile.y) *
        mix(vec3(.84,.70,.53),vec3(.67,.76,.72),alpine);
      color += crossing * rim * vec3(.021,.019,.012);
      if (waterDetail > .5 && crossing < .5) {
        float moving = smoothstep(.55,.90,crossWave + broad*.29);
        float ribbons = smoothstep(.26,.91,sediment) * rim * moving;
        color += ribbons * waterProfile.y * vec3(.17,.16,.12);
        float driftLine = sin(dot(p, vec2(.43,.83))*3.4 + waterClock*1.9 + sediment*.64);
        float surfaceStreak = smoothstep(.78, .97, driftLine) * smoothstep(.25,.73, sediment);
        color += stream * surfaceStreak * fade * (.009 + rim*.024) * vec3(1.,1.04,.93);
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
  uniforms.southernWater.value = weather.southern ?? 0
  uniforms.twilight.value = weather.twilight ?? 0
  if (weather.waterProfile) uniforms.waterProfile.value.copy(weather.waterProfile)
  uniforms.waterFrost.value = weather.frost ?? 0
  uniforms.worldOrigin.value.set(center, -distance)
  uniforms.waterHorizon.value.copy(weather.sky)
  if (weather.zenith) uniforms.waterSky.value.copy(weather.zenith)
  if (weather.light) uniforms.waterLight.value.copy(weather.light)
  if (weather.waterTint) uniforms.waterTint.value.copy(weather.waterTint)
}
