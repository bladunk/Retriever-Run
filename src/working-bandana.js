import * as T from 'three'
import { tintFieldPattern } from './kennel-material.js'

export function createWorkingBandana(root, neck, breed, tieMaterial) {
  // Construct the scarf in the dog's anatomical bind space, then fix that
  // space to the animated neck. The bib hangs down the front of the chest.
  const fit = new T.Group()
  fit.name = 'WorkingDogBandana'
  fit.matrixAutoUpdate = false
  neck.updateWorldMatrix(true, false)
  fit.matrix.copy(neck.matrixWorld).invert().multiply(root.matrixWorld)
  neck.add(fit)

  const material = new T.MeshStandardMaterial({ roughness: .89, side: T.DoubleSide })
  const flutter = { value: 0 }
  const trim = { value: new T.Color() }
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { scarfFlutter: flutter, scarfTrim: trim })
    shader.vertexShader = 'uniform float scarfFlutter; varying vec2 scarfCut;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        scarfCut = uv;
        transformed.z += scarfFlutter * uv.y * uv.y * (.8 + .35 * uv.x);
        transformed.x += scarfFlutter * uv.y * .55;
      `)
    shader.fragmentShader = 'varying vec2 scarfCut; uniform vec3 scarfTrim;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float w = (1. - scarfCut.y) * min(scarfCut.x, 1. - scarfCut.x);
        float hem = 1. - smoothstep(.013,.032,w);
        float seam = (1. - smoothstep(.004,.012, abs(w - .039)));
        float stitchWave = scarfCut.y * 221. + min(scarfCut.x,1. - scarfCut.x) * 23.;
        float stitch = .26 * seam * smoothstep(.05,.48,sin(stitchWave));
        float twill = sin((scarfCut.x - scarfCut.y)*280.) * sin((scarfCut.y + scarfCut.x)*247.);
        float clothDetail = 1. - smoothstep(.012,.045,length(fwidth(scarfCut)));
        diffuseColor.rgb = mix(diffuseColor.rgb,scarfTrim*.73, .91*hem);
        diffuseColor.rgb *= 1. + clothDetail * (stitch + twill*.047);
      `)
  }
  const dye = tintFieldPattern(material, 'position', 'bandana')
  const positions = [], coords = [], triangles = []
  const width = breed === 'pointer' ? .44 : .52
  const bibLength = breed === 'pointer' ? .58 : .65
  const columns = 14
  const rows = 15
  for (let row = 0; row <= rows; row++) {
    const t = row / rows
    for (let column = 0; column <= columns; column++) {
      const u = column / columns
      const across = u * 2 - 1
      const a = Math.abs(across)
      const pleat = Math.cos(across * 10.5 + t * 3.7) * (.034 * (1 - .72 * t))
      const x = across * width * Math.max(.016, 1 - t) - .095 * t
      const y = 2.02 - t * bibLength + .081 * a * (1 - t) + pleat * .34
      const z = 1.83 - .31 * a ** 1.8 * (1 - t) - .12 * t + pleat
      positions.push(x, y, z)
      coords.push(u, t)
      if (row && column) {
        const d = row * (columns + 1) + column
        const c = d - 1
        const b = d - (columns + 1)
        const a = b - 1
        triangles.push(a, c, b, c, d, b)
      }
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new T.Float32BufferAttribute(coords, 2))
  geometry.setIndex(triangles)
  geometry.computeVertexNormals()
  const bib = new T.Mesh(geometry, material)
  bib.name = 'HemmedTriangularBib'
  fit.add(bib)
  const tie = new T.Mesh(new T.SphereGeometry(1, 12, 6), tieMaterial)
  tie.name = 'BandanaKnot'
  tie.position.set(-.40, 2.12, 1.47)
  tie.rotation.z = -.38
  tie.scale.set(.095, .061, .075)
  fit.add(tie)

  return {
    appearance(item) {
      fit.visible = Boolean(item.bandana)
      material.color.setHex(item.color)
      trim.value.setHex(item.binding ?? item.panel ?? item.color)
      dye(item)
    },
    pose(time, stride, run, lean) {
      if (fit.visible) flutter.value = Math.sin(stride - .8) * .073 * run +
        Math.sin(time * 2.2) * .012 + lean * .075
    },
  }
}
