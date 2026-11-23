import * as T from 'three'
import { classicGear, kennelCatalog } from './kennel-catalog.js'

export function gearAppearance(equipment = classicGear) {
  return Object.fromEntries(Object.entries(kennelCatalog).map(([category, items]) =>
    [category, items.find(item => item.id === equipment?.[category]) ?? items[0]]))
}

export function tintLabradorCoat(material) {
  const cream = { value: 0 }
  material.roughness = .91
  material.metalness = 0
  material.onBeforeCompile = shader => {
    shader.uniforms.coatCream = cream
    shader.vertexShader = 'varying vec3 coatRest;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ncoatRest = position;')
    // These coordinates match the existing GLB bind scale and origin. The baked
    // coat still supplies anatomical detail, including eyelids and paw pads.
    shader.fragmentShader = 'varying vec3 coatRest; uniform float coatCream;\n' + shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 p = coatRest * 2.7186 + vec3(0.,1.3702,-.1586);
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
        coatShading += muzzle*vec3(.06,.11,.14) + cheek*vec3(.075,.043,.018) + .045*ankles;
        fur *= coatShading * (1. + (.071*shortFur + .037*smallFur) * grainFade);
        diffuseColor.rgb = mix(preserveDark, fur, warmFur);
        float dark = 1. - smoothstep(.046,.22,naturalCoat.r);
        float nose = smoothstep(2.29,2.48,p.z) * smoothstep(2.05,2.34,p.y);
        float eye = smoothstep(1.65,1.89,p.z) * (1. - smoothstep(2.11,2.32,p.z))
          * smoothstep(.21,.34,abs(p.x)) * smoothstep(2.18,2.37,p.y);
      `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float gloss = dark * max(nose * .85, eye * .61);
        roughnessFactor = mix(mix(.71,roughnessFactor,warmFur), .34 + .08*shortFur*grainFade, gloss);
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
