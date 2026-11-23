import * as T from 'three'
import { classicGear, kennelCatalog } from './kennel-catalog.js'

export function gearAppearance(equipment = classicGear) {
  return Object.fromEntries(Object.entries(kennelCatalog).map(([category, items]) =>
    [category, items.find(item => item.id === equipment?.[category]) ?? items[0]]))
}

export function fitKennelMaterial(material) {
  const fabric = { value: new T.Color() }
  const vestOn = { value: 0 }
  const cream = { value: 0 }
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { kennelFabric: fabric, kennelVest: vestOn, kennelCream: cream })
    shader.vertexShader = 'varying vec3 kennelRest;\n' + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nkennelRest = position.xzy;')
    shader.fragmentShader = `varying vec3 kennelRest;
      uniform vec3 kennelFabric;
      uniform float kennelVest, kennelCream;
      ` + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      // Mix the cream into fur only. Dark eyes and nose retain their texture.
      float warmFur = smoothstep(.08, .50, diffuseColor.r) *
        smoothstep(.02, .14, diffuseColor.r - diffuseColor.b);
      diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.93, .83, .68), warmFur * kennelCream);
      if (kennelVest > .5) {
        // The GLB's fitted surface is skinned once. Bind-pose coordinates keep
        // the saddle, binding and girth strap fixed to that skin in every pose.
        vec3 p = kennelRest;
        float side = abs(p.x);
        float rear = p.z + .36 - side * .30;
        float front = .42 - p.z - side * .36;
        float hem = p.y - .11 - .11 * smoothstep(.18, .42, p.z);
        float boundary = min(min(front, rear), hem);
        float edge = max(fwidth(boundary), .003);
        float saddle = smoothstep(-edge, edge, boundary);
        float binding = 1.0 - smoothstep(.005, .017, boundary);
        float strapDistance = abs(p.z + .06 + .24 * (p.y - .15));
        float strap = (1.0 - smoothstep(.032, .038, strapDistance)) * smoothstep(-.015, .030, p.y);
        float clothGrain = .96 + .04 * sin(p.z * 178.0) * sin((p.y + side) * 133.0);
        vec3 cloth = kennelFabric * clothGrain *
          mix(.78, 1.04, clamp(.32 + diffuseColor.r * .80, 0.0, 1.0));
        cloth *= mix(1.0, .57, max(binding * saddle, strap * .7));
        diffuseColor.rgb = mix(diffuseColor.rgb, cloth, max(saddle, strap));
      }`)
  }

  return ({ coat, vest }) => {
    material.color.setHex(coat.color)
    cream.value = coat.light ?? 0
    vestOn.value = Number(vest.color !== null)
    if (vestOn.value) fabric.value.setHex(vest.color)
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
