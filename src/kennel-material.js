import * as T from 'three'
import { classicGear, kennelCatalog } from './kennel-catalog.js'

export function gearAppearance(equipment = classicGear) {
  return Object.fromEntries(Object.entries(kennelCatalog).map(([category, items]) =>
    [category, items.find(item => item.id === equipment?.[category]) ?? items[0]]))
}

const patternStyle = { stripe: 1, brush: 2, plaid: 3, border: 4, seam: 5 }
export function tintFieldPattern(material, point = 'position') {
  const style = { value: 0 }
  const accent = { value: new T.Color() }
  const prior = material.onBeforeCompile
  material.onBeforeCompile = shader => {
    prior.call(material, shader)
    Object.assign(shader.uniforms, { gearPattern: style, gearAccent: accent })
    shader.vertexShader = 'varying vec3 gearPoint;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ngearPoint = ' + point + ';')
    shader.fragmentShader = 'varying vec3 gearPoint; uniform float gearPattern; uniform vec3 gearAccent;\n' +
      shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
        if (gearPattern > .5) {
          vec3 p = gearPoint;
          float visible = 1. - smoothstep(.021,.105,length(fwidth(p)));
          float weave = sin(p.x*36. + p.y*14. + p.z*17.);
          float band = smoothstep(.45,.73,weave);
          if (gearPattern == 2.) band = smoothstep(.03,.55,sin(p.x*19.+p.y*16.)*cos(p.z*24.-p.y*9.));
          if (gearPattern == 3.) band = max(band*.85,smoothstep(.55,.82,sin(p.y*54.-p.z*12.))*.65);
          if (gearPattern == 4.) band = smoothstep(.12,.21,abs(p.x) + abs(p.y)*.58);
          if (gearPattern == 5.) band = smoothstep(.72,.99,weave)*.48;
          diffuseColor.rgb = mix(diffuseColor.rgb, gearAccent, band * visible * .76);
        }
      `)
  }
  material.customProgramCacheKey = () => 'field-gear:' + point
  return item => {
    style.value = patternStyle[item.pattern] ?? 0
    accent.value.setHex(item.panel ?? item.binding ?? item.color ?? 0xffffff)
  }
}

export function tintLabradorCoat(material, modelToRest, breed = 'lab') {
  const cream = { value: 0 }
  material.roughness = .91
  material.metalness = 0
  material.onBeforeCompile = shader => {
    shader.uniforms.coatCream = cream
    shader.uniforms.modelToRest = { value: modelToRest }
    shader.vertexShader = 'uniform mat4 modelToRest; varying vec3 coatRest;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ncoatRest = (modelToRest * vec4(position, 1.)).xyz;')
    // These coordinates match the existing GLB bind scale and origin. The baked
    // coat still supplies anatomical detail, including eyelids and paw pads.
    shader.fragmentShader = 'varying vec3 coatRest; uniform float coatCream;\n' + shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 p = coatRest;
        vec3 naturalCoat = diffuseColor.rgb / max(diffuse, vec3(.01));
        float warmFur = smoothstep(.09,.37,naturalCoat.r) * smoothstep(.020,.132,naturalCoat.r-naturalCoat.b);
        float muzzle = smoothstep(1.91,2.38,p.z) * (1. - smoothstep(2.34,2.50,p.y));
        float cheek = smoothstep(1.48,1.95,p.z) * smoothstep(1.78,2.16,p.y) * (1. - smoothstep(2.40,2.63,p.y));
        float ears = smoothstep(.29,.43,abs(p.x)) * smoothstep(1.56,1.83,p.z)
          * (1. - smoothstep(2.02,2.27,p.z)) * smoothstep(2.13,2.45,p.y);
        float saddle = smoothstep(1.72,2.17,p.y) * (1. - smoothstep(.55,1.59,p.z));
        float ankles = 1. - smoothstep(.20,.74,p.y);
        vec3 preserveDark = naturalCoat * mix(vec3(.93,.86,.79), vec3(.85,.88,.86), muzzle);
        vec3 fur = mix(naturalCoat, vec3(.93,.83,.68), warmFur * coatCream) * diffuse;
        float grainFade = 1. - smoothstep(.015,.061,length(fwidth(p)));
        float direction = sin(p.z * 7. + p.y * 4.1);
        float shortFur = sin(p.x*309. + p.y*111. + direction) * sin(p.z*112. - p.y*165.);
        float smallFur = sin(p.z*49. + p.x*118. - direction) * sin(p.y*141. + p.x*136.);
        vec3 coatShading = mix(vec3(1.10,1.09,1.03), vec3(.75,.72,.64), max(.58*ears,.46*saddle));
        float earFold = ears * smoothstep(.12,.37,abs(p.x - .057 * sin(p.y*9.)));
        float shoulder = smoothstep(.63,1.25,p.z) * (1. - smoothstep(1.45,1.80,p.z)) *
          smoothstep(1.09,1.74,p.y) * (1. - smoothstep(1.92,2.24,p.y));
        coatShading += muzzle*vec3(.06,.11,.14) + cheek*vec3(.075,.043,.018) + .045*ankles;
        coatShading *= mix(vec3(1.),vec3(.79,.72,.64),earFold*.40);
        coatShading += vec3(.041,.032,.015)*shoulder;
        fur *= coatShading * (1. + (.071*shortFur + .037*smallFur) * grainFade);
        diffuseColor.rgb = mix(preserveDark, fur, warmFur);
        ${breed === 'pointer' ? `
          float spot = sin(p.x*11. + p.y*5.) * sin(p.z*8. - p.y*5.);
          float ticking = step(.74, sin(p.x*153. + p.z*137.) * cos(p.y*143. - p.z*68.)) * grainFade;
          float liver = max(.90*smoothstep(1.48,1.94,p.z),max(smoothstep(.41,.66,spot),ticking*.75));
          float blaze = (1. - smoothstep(.05,.13,abs(p.x + .033))) * smoothstep(2.07,2.29,p.y);
          vec3 pointerFur = mix(vec3(.87,.82,.72),vec3(.21,.094,.064),liver*(1.-blaze));
          diffuseColor.rgb = mix(diffuseColor.rgb,pointerFur * coatShading,warmFur);
        ` : ''}
        float dark = 1. - smoothstep(.046,.22,naturalCoat.r);
        float nose = smoothstep(2.29,2.48,p.z) * smoothstep(2.05,2.34,p.y);
        float eye = smoothstep(1.65,1.89,p.z) * (1. - smoothstep(2.11,2.32,p.z))
          * smoothstep(.21,.34,abs(p.x)) * smoothstep(2.18,2.37,p.y);
        ${breed === 'boyd' ? `
          float crown = smoothstep(2.24,2.61,p.y) * smoothstep(1.62,1.89,p.z);
          float creamChest = smoothstep(.78,1.48,p.z) * (1. - smoothstep(1.44,2.04,p.y));
          vec3 boydFur = mix(vec3(.80,.67,.49),vec3(.66,.43,.23),.31*crown + .69*ears);
          boydFur = mix(boydFur,vec3(.96,.89,.74),.44 * max(muzzle,creamChest));
          diffuseColor.rgb = mix(diffuseColor.rgb, boydFur * coatShading * (.94 + .085*smallFur*grainFade),warmFur*.81);
          float lip = smoothstep(2.08,2.31,p.z) * smoothstep(1.98,2.05,p.y) * (1. - smoothstep(2.20,2.29,p.y));
          float enamel = smoothstep(.31,.61,naturalCoat.b) * (1. - smoothstep(.048,.16,naturalCoat.r-naturalCoat.b));
          float tongue = smoothstep(.022,.11,naturalCoat.r-naturalCoat.g) *
            smoothstep(.018,.09,naturalCoat.b) * (1. - smoothstep(.26,.60,naturalCoat.g));
          diffuseColor.rgb *= mix(vec3(1.),vec3(.48,.36,.33),lip * max(enamel,.76*tongue));
          diffuseColor.rgb += dark * nose * smoothstep(.017,.13,naturalCoat.r) * vec3(.130,.069,.054);
          diffuseColor.rgb += dark * eye * smoothstep(.018,.12,naturalCoat.r) * vec3(.043,.023,.010);
        ` : ''}
      `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float gloss = dark * max(nose * .85, eye * .61);
        float noseGrain = sin(p.x*205. + shortFur*.48)*sin(p.y*192. + p.z*140.);
        roughnessFactor = mix(mix(.71,roughnessFactor,warmFur), .29 + .12*noseGrain*grainFade, gloss);
      `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (grainFade > .10) {
          vec3 dx = dFdx(-vViewPosition), dy = dFdy(-vViewPosition);
          vec3 tangent = cross(dy,normal), bitangent = cross(normal,dx);
          float scale = inversesqrt(max(1.e-8,max(dot(tangent,tangent),dot(bitangent,bitangent))));
          float grain = grainFade * (warmFur * shortFur * .034 + gloss * noseGrain * .018);
          normal = normalize(normal - (tangent*dFdx(grain) + bitangent*dFdy(grain))*scale);
        }
      `)

  }
  return coat => {
    material.color.setHex(coat.color)
    cream.value = coat.light ?? 0
  }
}

export function collarBuckle(material) {
  const buckle = new T.InstancedMesh(new T.BoxGeometry(1, 1, 1), material, 4)
  buckle.name = 'KennelBuckle'
  const bar = new T.Object3D()
  for (let i = 0; i < 4; i++) {
    const topOrBottom = i < 2
    const side = i % 2 ? 1 : -1
    bar.scale.set(topOrBottom ? .222 : .026, topOrBottom ? .025 : .105, .021)
    bar.position.set(topOrBottom ? 0 : side * .098, topOrBottom ? side * .063 : 0, 0)
    bar.updateMatrix()
    buckle.setMatrixAt(i, bar.matrix)
  }
  buckle.position.set(.343, .178, .235)
  buckle.rotation.y = .93
  buckle.visible = false
  return buckle
}
