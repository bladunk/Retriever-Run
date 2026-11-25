import * as T from 'three'
import { fieldAtlasShader } from './field-atlas-shader.js'
import { landscapeMap, landscapeReady } from './landscape-atlas.js'
import dirtColorUrl from './assets/mud-color.webp?url'
import dirtSurfaceUrl from './assets/mud-surface.webp?url'
import woodColorUrl from './assets/wood-color.webp?url'
import woodSurfaceUrl from './assets/wood-surface.webp?url'

const loader = new T.TextureLoader()
export function createFieldMaterial() {
  const fallbackColor = new T.DataTexture(new Uint8Array([160, 142, 119, 255]), 1, 1)
  const fallbackPbr = new T.DataTexture(new Uint8Array([127, 127, 191, 255]), 1, 1)
  fallbackColor.colorSpace = T.SRGBColorSpace
  fallbackColor.needsUpdate = fallbackPbr.needsUpdate = true
  const fieldMaterial = new T.MeshStandardMaterial({ vertexColors: true, roughness: .92 })
  const uniforms = {
    fieldEarth: { value: fallbackColor }, fieldWood: { value: fallbackColor },
    fieldEarthPbr: { value: fallbackPbr }, fieldWoodPbr: { value: fallbackPbr },
    landscapeMap, landscapeReady, fieldDetail: { value: 1 }, fieldWet: { value: 0 }, fieldFrost: { value: 0 },
  }

  for (const [key, url, space] of [
    ['fieldEarth', dirtColorUrl, T.SRGBColorSpace], ['fieldWood', woodColorUrl, T.SRGBColorSpace],
    ['fieldEarthPbr', dirtSurfaceUrl, T.NoColorSpace], ['fieldWoodPbr', woodSurfaceUrl, T.NoColorSpace],
  ]) {
    const map = loader.load(url, loaded => {
      const previous = uniforms[key].value
      uniforms[key].value = loaded
      if (!Object.values(uniforms).some(uniform => uniform.value === previous)) previous.dispose()
    })
    map.colorSpace = space
    map.wrapS = map.wrapT = T.RepeatWrapping
    map.anisotropy = 4
  }

  fieldMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = 'attribute float fieldLayer, landStyle; attribute vec2 regionalSurface; varying vec2 vRegionalSurface; varying float vFieldLayer, vSnowFace, vLandStyle; varying vec2 vFieldUv;\n'
      + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFieldLayer = fieldLayer; vRegionalSurface = regionalSurface; vLandStyle = landStyle; vFieldUv = uv; vSnowFace = normalize(mat3(modelMatrix)*normal).y;')
    shader.fragmentShader = `
      uniform sampler2D fieldEarth, fieldWood, fieldEarthPbr, fieldWoodPbr;
      uniform float fieldDetail, fieldWet, fieldFrost;
      varying float vFieldLayer, vSnowFace, vLandStyle;
      varying vec2 vFieldUv, vRegionalSurface;
      ${fieldAtlasShader}
    ` + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        bool onGround = vFieldLayer > .5;
        bool onWood = vFieldLayer > 1.5;
        bool onCrossCut = vFieldLayer > 2.5 && vFieldLayer < 3.5;
        bool onMetal = vFieldLayer > 4.5 && vFieldLayer < 5.5;
        bool onMasonry = vFieldLayer > 5.5;
        bool onBark = vFieldLayer > 3.5 && vFieldLayer < 4.5;
        vec4 fieldPbr = vec4(.5, .5, .85, 1.);
        if (onGround) {
          vec2 surfaceUV = vFieldUv;
          if (!onWood) surfaceUV += vec2(sin(vFieldUv.y*.78), sin(vFieldUv.x*1.2 + vFieldUv.y*.39))*.09;
          vec3 grain = onWood ? texture2D(fieldWood, surfaceUV).rgb : texture2D(fieldEarth, surfaceUV).rgb;
          float inheritMud = (onWood || landscapeReady < .5) ? 1. : .35;
          diffuseColor.rgb *= mix(vec3(.91), grain * (onWood ? 2.75 : 2.65), (onWood ? .53 : .81) * inheritMud);
          if (fieldDetail > .0) {
            fieldPbr = onWood ? texture2D(fieldWoodPbr, surfaceUV) : texture2D(fieldEarthPbr, surfaceUV);
            diffuseColor.rgb *= mix(.73, 1., fieldPbr.a);
          }
          if (!onWood) {
            float sand = max(0., 1. - abs(vLandStyle - 1.));
            float stone = max(0., 1. - abs(vLandStyle - 2.));
            float litter = max(0., 1. - abs(vLandStyle - 3.));
            float patternScale = 1. - smoothstep(.10, .32, length(fwidth(surfaceUV)));
            float ripples = sin(surfaceUV.y * 58. + sin(surfaceUV.x * 5.2) * 1.8);
            float shale = sin(surfaceUV.x * 73. - surfaceUV.y * 48.) * cos(surfaceUV.y * 92. + grain.r * 7.2);
            float leaves = smoothstep(.44,.82, sin(surfaceUV.x * 76. + grain.r * 18.) * cos(surfaceUV.y * 104.));
            diffuseColor.rgb *= mix(vec3(1.), vec3(1.24, 1.17, 1.02) * (1. + ripples * .094 * patternScale), sand * .82);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (1.15 + shale * .31 * patternScale), stone * .74);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.42,1.07,.72),
              litter * (.16 + leaves * .64 * patternScale));
            float silt = sin(vFieldUv.y * 1.07 + sin(vFieldUv.x * 3.17)) *
              sin(vFieldUv.x * 4.71 + vFieldUv.y * .38);
            float tracks = abs(abs(vFieldUv.x + .037 * sin(vFieldUv.y * .78)) - .42);
            float rut = (1. - smoothstep(.09,.21,tracks)) * (.28 + .30*smoothstep(-.5,.58,silt));
            float bank = smoothstep(1.26,1.75,abs(vFieldUv.x));
            float tracksCountry = max(0., 1. - abs(vRegionalSurface.x - 5.) * .82);
            float damp = max(rut * (.46 + tracksCountry * .59), bank * (.30 + .22 * silt));
            damp = min(.82, damp + fieldWet * .15 * smoothstep(.10,.74,silt) * smoothstep(.62,1.54,abs(vFieldUv.x)));
            diffuseColor.rgb *= mix(vec3(1.15,1.13,1.10), vec3(.56,.66,.67), damp);
            fieldPbr.b -= .34 * damp;
            if (fieldDetail > .0) {
              vec3 grains = texture2D(fieldEarth, vec2(.79 * vFieldUv.x + .34 * vFieldUv.y,
                .64 * vFieldUv.y - .31 * vFieldUv.x) * .52).rgb;
              diffuseColor.rgb *= mix(.86, 1.09, smoothstep(.13,.46,grains.g));
            }
            if (fieldFrost > .05) {
              float iceDust = smoothstep(.24,.56,grain.g * .9 + silt * .13) * fieldFrost;
              diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.52,.61,.66), iceDust * .34);
            }
          }
          if (landscapeReady > .5 && !onCrossCut) {
            vec2 scanUV = surfaceUV;
            float slot = floor(vRegionalSurface.x);
            if (onWood) {
              slot = onMasonry ? 18. : onMetal ? 17. : onBark ? 15. : 16.;
              scanUV *= onBark ? vec2(1.15,.69) : onMetal ? vec2(2.2,1.) : vec2(1.,.89);
            } else {
              // Relief and residue break up the longitudinal repetition on a trail.
              scanUV = vec2(surfaceUV.x * 1.07 + surfaceUV.y * .12, surfaceUV.y * .91 - surfaceUV.x * .16);
            }
            vec2 dx = dFdx(scanUV), dy = dFdy(scanUV);
            float footprint = max(length(dx), length(dy));
            float amount = 1. - smoothstep(.075, .265, footprint);
            if (amount > .005) {
              vec3 scan = scannedSurface(slot,scanUV,dx,dy);
              float regionalBlend = smoothstep(0., 1., fract(vRegionalSurface.x));
              if (!onWood && regionalBlend > .004 && slot < 14.)
                scan = mix(scan,scannedSurface(slot+1.,scanUV,dx,dy),regionalBlend);
              float detailShade = dot(scan, vec3(.25,.60,.15));
              vec3 reliefTone = mix(vec3(.43), vec3(1.96), scan);
              diffuseColor.rgb *= mix(vec3(1.), reliefTone * (onMetal ? 1.13 : 1.07), amount * (onWood ? .79 : .91));
              fieldPbr.b += amount * (onMetal ? -.27 : .37 * (detailShade - .51));
              if (onMetal) fieldPbr.rg = mix(vec2(.5), fieldPbr.rg,.2);
              if (!onWood) {
                float woody = max(max(1.-abs(vRegionalSurface.x - 3.), 1.-abs(vRegionalSurface.x - 11.)),
                  1.-abs(vRegionalSurface.x - 12.));
                float leafLayer = max(0.,woody)*smoothstep(.49,.79,detailShade) * (.36 + vRegionalSurface.y * .64);
                diffuseColor.rgb *= mix(vec3(1.), vec3(1.37,1.17,.78), leafLayer*amount);
                float roadside = smoothstep(.26,.98,vRegionalSurface.y);
                float bleed = smoothstep(.60,.72, detailShade) * .42 * roadside;
                diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(.86,1.08,.69), bleed * amount);
              }
            }
          }
          if (onCrossCut) {
            vec2 split = surfaceUV - vec2(.46,.53);
            float rings = length(split) + .008*sin(split.x*18.) + .012*sin(split.y*13.);
            float cut = smoothstep(-.1,.64,sin(rings*130. + grain.r*1.7));
            diffuseColor.rgb *= mix(vec3(.74,.64,.52),vec3(1.34,1.17,.96),cut);
          }
          diffuseColor.rgb *= 1. - fieldWet * (onWood ? .16 : .23);
          if (fieldFrost > .03 && onWood && !onCrossCut) {
            float dust = smoothstep(.52,.98,vSnowFace) * fieldFrost;
            float scatter = .30+.28*sin(vFieldUv.x*28. + grain.r*3.4)*sin(vFieldUv.y*23. + grain.g*9.4);
            diffuseColor.rgb = mix(diffuseColor.rgb,vec3(.57,.66,.70),dust*scatter);
          }
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        if (onGround) roughnessFactor = clamp(fieldPbr.b * .83 + .21 - fieldWet * .36, .28, 1.);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (onGround && fieldDetail > .0) {
          vec3 dp1 = dFdx(-vViewPosition), dp2 = dFdy(-vViewPosition);
          vec2 d1 = dFdx(vFieldUv), d2 = dFdy(vFieldUv);
          vec3 p2 = cross(dp2, normal), p1 = cross(normal, dp1);
          vec3 t = p2 * d1.x + p1 * d2.x;
          vec3 b = p2 * d1.y + p1 * d2.y;
          float gain = inversesqrt(max(1.e-8, max(dot(t,t), dot(b,b))));
          vec2 xy = (fieldPbr.rg * 2. - 1.) * (fieldDetail > 1. ? .79 : .50);
          normal = normalize(normal + (t * xy.x + b * xy.y) * gain);
        }`)
  }

  return { material: fieldMaterial, uniforms }
}

export const fieldMaterials = createFieldMaterial()
