import * as T from 'three'

const clamp = T.MathUtils.clamp
const smooth = T.MathUtils.smoothstep

function pattern({ x, y, z }) {
  // Anatomical space of the shipped bind pose, with +Z toward the muzzle.
  const side = Math.abs(x)
  const neckline = 1.08 + .66 * (1 - smooth(y, 1.80, 2.22)) - .22 * smooth(side, .15, .59)
  const tailEdge = -.90 + .22 * (1 - smooth(y, 1.35, 2.05))
  const armhole = Math.hypot((z - 1.00) / .58, (y - 1.11) / .61) - 1
  return Math.min(z - tailEdge, neckline - z, y - 1.0, Math.max(.22 - side, .46 * armhole))
}

function blendInfluences(a, b, t) {
  const combined = new Map()
  for (const [j, w] of a) combined.set(j, w * (1 - t))
  for (const [j, w] of b) combined.set(j, (combined.get(j) ?? 0) + w * t)
  return [...combined.entries()].sort((left, right) => right[1] - left[1]).slice(0, 4)
}

function clipEdge(a, b) {
  const t = a.edge / (a.edge - b.edge)
  return {
    position: a.position.clone().lerp(b.position, t),
    normal: a.normal.clone().lerp(b.normal, t).normalize(),
    rest: a.rest.clone().lerp(b.rest, t),
    influences: blendInfluences(a.influences, b.influences, t),
    edge: 0,
  }
}

export function createWorkingVest(body) {
  const source = body.geometry
  const { position, normal, skinIndex, skinWeight } = source.attributes
  const joint = new T.Vector4()
  const weight = new T.Vector4()
  const vertices = Array.from({ length: position.count }, (_, i) => {
    const rest = body.getVertexPosition(i, new T.Vector3()).applyMatrix4(body.matrixWorld)
    joint.fromBufferAttribute(skinIndex, i)
    weight.fromBufferAttribute(skinWeight, i)
    return {
      position: new T.Vector3().fromBufferAttribute(position, i),
      normal: new T.Vector3().fromBufferAttribute(normal, i),
      rest,
      edge: pattern(rest),
      influences: joint.toArray().map((index, component) => [index, weight.getComponent(component)])
        .filter(([, amount]) => amount > 0),
    }
  })

  const locations = [], normals = [], joints = [], weights = [], fit = [], indices = []
  const exterior = new Map()
  function add(vertex, inner = false) {
    if (!inner && exterior.has(vertex)) return exterior.get(vertex)
    const { position: point, normal: n, rest, edge, influences } = vertex
    const index = locations.length / 3
    if (!inner) exterior.set(vertex, index)
    const dorsalClosure = Math.exp(-Math.abs(rest.x) * 60) * smooth(rest.y, 1.85, 2.15)
    const thickness = inner ? .003 : .012 + .004 * smooth(edge, 0, .10) + .007 * dorsalClosure
    locations.push(point.x + n.x * thickness, point.y + n.y * thickness, point.z + n.z * thickness)
    normals.push(n.x, n.y, n.z)
    fit.push(rest.x, rest.y, rest.z, inner ? -.014 : edge)
    const sum = influences.reduce((total, [, value]) => total + value, 0)
    for (let i = 0; i < 4; i++) {
      joints.push(influences[i]?.[0] ?? 0)
      weights.push((influences[i]?.[1] ?? 0) / sum)
    }
    return index
  }

  const crossings = new Map()
  const boundary = new Map()
  const triangles = source.index.array
  for (let i = 0; i < triangles.length; i += 3) {
    const polygon = []
    const cuts = []
    for (let j = 0; j < 3; j++) {
      const a = triangles[i + j], b = triangles[i + (j + 1) % 3]
      if (vertices[a].edge >= 0) polygon.push(vertices[a])
      if ((vertices[a].edge >= 0) === (vertices[b].edge >= 0)) continue
      const key = Math.min(a, b) * vertices.length + Math.max(a, b)
      if (!crossings.has(key)) crossings.set(key, clipEdge(vertices[a], vertices[b]))
      const cut = crossings.get(key)
      polygon.push(cut)
      cuts.push(cut)
    }
    if (polygon.length < 3) continue
    const first = add(polygon[0])
    for (let j = 1; j < polygon.length - 1; j++) indices.push(first, add(polygon[j]), add(polygon[j + 1]))
    if (cuts.length !== 2) continue
    const a = add(cuts[0]), b = add(cuts[1])
    const innerA = boundary.get(a) ?? add(cuts[0], true)
    const innerB = boundary.get(b) ?? add(cuts[1], true)
    boundary.set(a, innerA)
    boundary.set(b, innerB)
    if (polygon.indexOf(cuts[1]) === polygon.indexOf(cuts[0]) + 1) {
      indices.push(a, innerA, b, b, innerA, innerB)
    } else {
      indices.push(b, innerB, a, a, innerB, innerA)
    }
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(locations, 3))
  geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3))
  geometry.setAttribute('skinIndex', new T.Uint16BufferAttribute(joints, 4))
  geometry.setAttribute('skinWeight', new T.Float32BufferAttribute(weights, 4))
  geometry.setAttribute('fitRest', new T.Float32BufferAttribute(fit, 4))
  geometry.setIndex(indices)

  const material = new T.MeshStandardMaterial({ roughness: .88 })
  const panel = { value: new T.Color() }
  const binding = { value: new T.Color() }
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { vestPanel: panel, vestBinding: binding })
    shader.vertexShader = 'attribute vec4 fitRest; varying vec4 vestCut;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvestCut = fitRest;')
    shader.fragmentShader = 'varying vec4 vestCut; uniform vec3 vestPanel, vestBinding;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float side = abs(vestCut.x);
        float y = vestCut.y;
        float z = vestCut.z;
        float hem = 1.0 - smoothstep(.02, .045, vestCut.w);
        float panelLine = y - 1.56 - .14 * z - .12 * cos(z * 2.4);
        float seam = 1.0 - smoothstep(.008, .025, abs(panelLine));
        float stitch = smoothstep(-.18, .20, sin(z * 156.0)) *
          (1.0 - smoothstep(.003, .009, abs(panelLine + .030)));
        float webbing = smoothstep(1.79, 2.11, y) * (1.0 - smoothstep(.022, .040, side));
        float keeper = max(1.0 - smoothstep(.024, .042, abs(z + .38)),
          1.0 - smoothstep(.024, .042, abs(z - .44))) * (1.0 - smoothstep(.065, .086, side)) * smoothstep(1.92, 2.10, y);
        float weave = sin(z * 137.0 + side * 84.0) * sin(y * 172.0 - side * 105.0);
        weave *= 1.0 - smoothstep(.018, .055, length(fwidth(vestCut.xyz)));
        vec3 cloth = mix(vestPanel, diffuseColor.rgb, smoothstep(-.012, .012, panelLine));
        cloth = mix(cloth, vestBinding, max(hem, max(seam * .40, webbing * .80)));
        cloth = mix(cloth, vestBinding * 1.48, keeper * .8);
        diffuseColor.rgb = (cloth + stitch * .036) * (1.0 + .07 * weave);
      `)
  }
  const mesh = new T.SkinnedMesh(geometry, material)
  mesh.name = 'WorkingDogVest'
  mesh.frustumCulled = false
  mesh.visible = false
  mesh.bindMode = body.bindMode
  mesh.bind(body.skeleton, body.bindMatrix)
  body.add(mesh)

  return style => {
    mesh.visible = style.color !== null
    if (!mesh.visible) return
    material.color.setHex(style.color)
    material.roughness = style.rough
    panel.value.setHex(style.panel)
    binding.value.setHex(style.binding)
  }
}
