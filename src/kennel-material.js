import * as T from 'three'
import { classicGear, kennelCatalog } from './kennel-catalog.js'

export function gearAppearance(equipment = classicGear) {
  return Object.fromEntries(Object.entries(kennelCatalog).map(([category, items]) =>
    [category, items.find(item => item.id === equipment?.[category]) ?? items[0]]))
}

export function tintLabradorCoat(material) {
  const cream = { value: 0 }
  material.roughness = .88
  material.metalness = 0
  material.onBeforeCompile = shader => {
    shader.uniforms.coatCream = cream
    shader.vertexShader = 'varying vec3 coatRest;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\ncoatRest = position;')
    // Sample the original albedo before the kennel tint, then keep nose and eyes neutral.
    shader.fragmentShader = 'varying vec3 coatRest; uniform float coatCream;\n' + shader.fragmentShader
      .replace('#include <map_fragment>', `#include <map_fragment>
        vec3 naturalCoat = diffuseColor.rgb / max(diffuse, vec3(.01));
        float warmFur = smoothstep(.09, .39, naturalCoat.r) *
          smoothstep(.025, .14, naturalCoat.r - naturalCoat.b);
        vec3 fur = mix(naturalCoat, vec3(.93, .83, .68), warmFur * coatCream) * diffuse;
        float shortFur = sin(coatRest.x * 413.0 + coatRest.y * 214.0) *
          sin(coatRest.z * 593.0 + coatRest.y * 169.0);
        shortFur *= 1.0 - smoothstep(.004, .022, length(fwidth(coatRest)));
        diffuseColor.rgb = mix(naturalCoat, fur * (1.0 + .065 * shortFur), warmFur);
      `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(.61, roughnessFactor, warmFur);
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
