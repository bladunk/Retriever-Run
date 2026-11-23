import * as T from 'three'
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
    fieldDetail: { value: 1 }, fieldWet: { value: 0 },
  }

  for (const [key, url, space] of [
    ['fieldEarth', dirtColorUrl, T.SRGBColorSpace], ['fieldWood', woodColorUrl, T.SRGBColorSpace],
    ['fieldEarthPbr', dirtSurfaceUrl, T.NoColorSpace], ['fieldWoodPbr', woodSurfaceUrl, T.NoColorSpace],
  ]) {
    const map = loader.load(url, (loaded) => { uniforms[key].value = loaded })
    map.colorSpace = space
    map.wrapS = map.wrapT = T.RepeatWrapping
    map.anisotropy = 4
  }

  fieldMaterial.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = 'attribute float fieldLayer; varying float vFieldLayer; varying vec2 vFieldUv;\n'
      + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvFieldLayer = fieldLayer; vFieldUv = uv;')
    shader.fragmentShader = `
      uniform sampler2D fieldEarth, fieldWood, fieldEarthPbr, fieldWoodPbr;
      uniform float fieldDetail, fieldWet;
      varying float vFieldLayer;
      varying vec2 vFieldUv;
    ` + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        bool onGround = vFieldLayer > .5;
        bool onWood = vFieldLayer > 1.5;
        vec4 fieldPbr = vec4(.5, .5, .85, 1.);
        if (onGround) {
          vec3 grain = onWood ? texture2D(fieldWood, vFieldUv).rgb : texture2D(fieldEarth, vFieldUv).rgb;
          diffuseColor.rgb *= mix(vec3(.70), grain * (onWood ? 2.75 : 2.40), onWood ? .66 : .88);
          if (fieldDetail > .0) {
            fieldPbr = onWood ? texture2D(fieldWoodPbr, vFieldUv) : texture2D(fieldEarthPbr, vFieldUv);
            diffuseColor.rgb *= mix(.73, 1., fieldPbr.a);
          }
          if (!onWood) {
            float silt = sin(vFieldUv.y * 1.07 + sin(vFieldUv.x * 3.17)) *
              sin(vFieldUv.x * 4.71 + vFieldUv.y * .38);
            diffuseColor.rgb *= mix(vec3(.83,.88,.89), vec3(1.19,1.14,1.10), smoothstep(-.72,.72,silt));
            fieldPbr.b -= .13 * max(0., -silt);
          }
          diffuseColor.rgb *= 1. - fieldWet * (onWood ? .16 : .23);
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
