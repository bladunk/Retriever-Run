import * as T from 'three'
import { tintFieldPattern } from './kennel-material.js'

const smooth = T.MathUtils.smoothstep

function pattern({ x, y, z }) {
  // Anatomical space of the shipped bind pose, with +Z toward the muzzle.
  const side = Math.abs(x)
  const neckline = 1.08 + .66 * (1 - smooth(y, 1.80, 2.22)) - .22 * smooth(side, .15, .59)
  const tailEdge = -.90 + .22 * (1 - smooth(y, 1.35, 2.05))
  const armhole = Math.hypot((z - 1.00) / .58, (y - 1.11) / .61) - 1
  return Math.min(z - tailEdge, neckline - z, y - (1.0 + .061 * smooth(side, .18, .49)), Math.max(.20 - side, .46 * armhole))
}

function blendInfluences(a, b, t) {
  const combined = new Map()
  for (const [j, w] of a) combined.set(j, w * (1 - t))
  for (const [j, w] of b) combined.set(j, (combined.get(j) ?? 0) + w * t)
  return [...combined.entries()].sort((left, right) => right[1] - left[1]).slice(0, 4)
}

function clipEdge(a, b) {
  // Locate the curved pattern's intersection on the original mesh edge.
  const probe = new T.Vector3()
  let low = 0, high = 1
  for (let sample = 0; sample < 7; sample++) {
    const middle = (low + high) * .5
    probe.copy(a.rest).lerp(b.rest, middle)
    if ((a.edge >= 0) === (pattern(probe) >= 0)) low = middle
    else high = middle
  }
  const t = (low + high) * .5
  return {
    position: a.position.clone().lerp(b.position, t),
    normal: a.normal.clone().lerp(b.normal, t).normalize(),
    rest: a.rest.clone().lerp(b.rest, t),
    influences: blendInfluences(a.influences, b.influences, t),
    edge: 0,
  }
}

export function createWorkingVest(body, restSpace = body.matrixWorld) {
  const source = body.geometry
  const { position, normal, skinIndex, skinWeight } = source.attributes
  const joint = new T.Vector4()
  const weight = new T.Vector4()
  const vertices = Array.from({ length: position.count }, (_, i) => {
    const rest = new T.Vector3().fromBufferAttribute(position, i).applyMatrix4(restSpace)
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
    const rolledEdge = .005 * (1 - smooth(edge, 0, .052))
    const pad = .012 * smooth(rest.y, 1.06, 1.45) * (1 - smooth(rest.y, 1.93, 2.18))
    const thickness = inner ? .003 : .013 + rolledEdge + pad + .007 * dorsalClosure
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
  const coarseWeave = { value: .6 }
  const textile = { value: 0 }
  const prestige = { value: 0 }
  const panel = { value: new T.Color() }
  const binding = { value: new T.Color() }
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { vestPanel: panel, vestBinding: binding, vestWeave: coarseWeave, vestTextile: textile, vestPrestige: prestige })
    shader.vertexShader = 'attribute vec4 fitRest; varying vec4 vestCut;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvestCut = fitRest;')
    shader.fragmentShader = 'varying vec4 vestCut; uniform vec3 vestPanel, vestBinding; uniform float vestWeave, vestTextile, vestPrestige;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float side = abs(vestCut.x);
        float y = vestCut.y;
        float z = vestCut.z;
        float hem = 1.0 - smoothstep(.02, .045, vestCut.w);
        float panelLine = y - 1.48 - .14 * z - .13 * cos(z * 2.4);
        float chestSeam = (y - 1.36) * .48 + z - .52 + .24*side;
        float chestEdge = (1. - smoothstep(.006,.022,abs(chestSeam))) * (1. - smoothstep(1.67,1.83,y));
        float seam = 1.0 - smoothstep(.008, .025, abs(panelLine));
        float stitch = smoothstep(-.18, .20, sin(z * 156.0)) *
          (1.0 - smoothstep(.003, .009, abs(panelLine + .030)));
        float dorsal = smoothstep(1.91,2.15,y) * smoothstep(.044,.085,vestCut.w);
        float webbing = dorsal * (1.0 - smoothstep(.026,.044,side));
        float rail = dorsal * (1. - smoothstep(.004,.011,abs(side - .027)));
        float keeper = max(1.0 - smoothstep(.024,.042,abs(z + .38)),
          1.0 - smoothstep(.024,.042,abs(z - .44))) * (1.0 - smoothstep(.069,.094,side)) * dorsal;
        float zipper = (1. - smoothstep(.016,.032,side)) * dorsal;
        float slider = (1. - smoothstep(.038,.057,abs(z - .27))) * zipper;
        float loop = (1. - smoothstep(.009,.017,abs(length(vec2(z - .18,vestCut.x * 1.46)) - .032))) * dorsal;
        float grainFade = 1. - smoothstep(.017,.052,length(fwidth(vestCut.xyz)));
        float warp = sin(z*172. + side*91.);
        float weft = sin(y*150. - side*141.);
        float weave = mix(warp*weft,sign(warp)*weft,vestWeave) * grainFade;
        float phase = sin(z * 136. + y * 103. + side * 88.);
        float boundStitch = (1. - smoothstep(.004,.013,abs(vestCut.w - .045))) * smoothstep(.1,.61,phase) * grainFade;
        float frontPanel = smoothstep(-.013,.013,chestSeam)*(1. - smoothstep(1.58,1.75,y));
        vec3 cloth = mix(vestPanel*.77,diffuseColor.rgb,smoothstep(-.032,.018,panelLine));
        cloth = mix(cloth,vestPanel*.69,.72*frontPanel);
        float wax = sin(z*8.+side*5.) * sin(y*12.-z*7.);
        cloth *= 1. + vestTextile*.044*wax;
        cloth = mix(cloth,vestBinding,.39*chestEdge);
        cloth = mix(cloth, vestBinding, max(hem,max(seam*.49,webbing*.84)));
        cloth = mix(cloth, vestBinding*1.56 + vec3(.024,.018,.010), max(rail*.61,keeper*.81));
        float teeth = smoothstep(-.3,.65,sin(z*183.)) * zipper * grainFade;
        float bartack = max(1. - smoothstep(.011,.024,abs(z + .43)),1. - smoothstep(.011,.024,abs(z - .49))) *
          (1. - smoothstep(.03,.055,side)) * dorsal;
        float tabThread = grainFade * smoothstep(-.12,.51,sin(side*410.)) * bartack;
        cloth += (.023*teeth + .018*chestEdge*grainFade + .035*stitch + boundStitch*.029 + tabThread*.036);
        float fastener = max(slider,loop*.85);
        cloth = mix(cloth,vec3(.34,.24,.129),fastener);
        if (vestPrestige > .5) {
          // Reinforced field panel, double-piped seam and stitched oval mark.
          // Everything follows the same weighted shell and shader program.
          float sidePanel = smoothstep(.008,.040,panelLine+.088)*(1.-smoothstep(.25,.38,z));
          float welt = 1.-smoothstep(.006,.013,abs(panelLine+.063));
          float chevron = 1.-smoothstep(.009,.021,abs(z+.29-.58*(y-1.66)));
          vec2 mark = vec2((z+.22)/.153,(y-1.78)/.086);
          float crest = 1.-smoothstep(.87,1.,length(mark));
          float stamp = (1.-smoothstep(.08,.17,abs(abs(mark.x)*.58+mark.y+.23))) * crest;
          cloth = mix(cloth,vestPanel*.68,(.30+.18*vestPrestige)*sidePanel);
          cloth = mix(cloth,vec3(.20,.147,.078),.82*welt+.20*chevron*sidePanel);
          cloth = mix(cloth,vec3(.13,.088,.047),crest*.88);
          cloth = mix(cloth,vec3(.51,.36,.17),stamp*.87);
        }
        diffuseColor.rgb = cloth * (1. + (.12 - vestWeave*.033)*weave);
      `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor + weave*.043,.39,fastener);
      `).replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        metalnessFactor = max(metalnessFactor, fastener * .54);
      `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        if (grainFade > .12) {
          vec3 dx = dFdx(-vViewPosition), dy = dFdy(-vViewPosition);
          vec3 tangent = cross(dy,normal), bitangent = cross(normal,dx);
          float scale = inversesqrt(max(1.e-8,max(dot(tangent,tangent),dot(bitangent,bitangent))));
          float stitchRelief = grainFade * (.024*weave + stitch*.014 + boundStitch*.017);
          normal = normalize(normal - (tangent*dFdx(stitchRelief)+bitangent*dFdy(stitchRelief))*scale);
        }
      `)
  }
  const decorate = tintFieldPattern(material, 'fitRest.xyz', 'vest')
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
    decorate(style)
    material.color.setHex(style.color)
    const neoprene = style.id.endsWith('-water-vest')
    const waxed = style.id.endsWith('-heritage-vest') || style.id === 'seasoned-vest'
    material.roughness = neoprene ? .77 : waxed ? .73 : style.rough ?? .88
    textile.value = waxed ? 1 : 0
    prestige.value = /^(master|legend|boyd)/.test(style.id) ? 1 : 0
    coarseWeave.value = neoprene ? .13 : waxed ? .81 : .96
    panel.value.setHex(style.panel ?? style.color)
    binding.value.setHex(style.binding ?? style.color)
  }
}
