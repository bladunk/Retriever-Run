import * as T from 'three'
import { rocks, rockShape } from './rocks.js'

const geometryCache = new Map()
const material = new T.MeshStandardMaterial({ vertexColors: true, roughness: .91 })
const conditions = { value: new T.Vector2() }
const cover = { mud: 0, moss: 1, river: 2, dry: 3, frost: 4, snow: 5 }

material.onBeforeCompile = shader => {
  shader.uniforms.rockWeather = conditions
  shader.vertexShader = 'attribute float stoneCover; varying vec3 vRockPoint; varying float vStoneCover, vRockUp;\n'
    + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vRockPoint = position;
        vStoneCover = stoneCover;
        vRockUp = normal.y;`)
  shader.fragmentShader = `
    uniform vec2 rockWeather;
    varying vec3 vRockPoint;
    varying float vStoneCover, vRockUp;

    float rockHash(vec3 p) {
      p = fract(p * .319 + vec3(.13,.43,.79)) * 17.;
      return fract(p.x * p.y * p.z * (p.x+p.y+p.z));
    }
    float rockNoise(vec3 p) {
      vec3 i = floor(p), f = fract(p);
      f = f*f*(3.-2.*f);
      return mix(
        mix(mix(rockHash(i),rockHash(i+vec3(1,0,0)),f.x),
            mix(rockHash(i+vec3(0,1,0)),rockHash(i+vec3(1,1,0)),f.x),f.y),
        mix(mix(rockHash(i+vec3(0,0,1)),rockHash(i+vec3(1,0,1)),f.x),
            mix(rockHash(i+vec3(0,1,1)),rockHash(i+vec3(1,1,1)),f.x),f.y),f.z);
    }
  ` + shader.fragmentShader
    .replace('#include <color_fragment>', `#include <color_fragment>
      vec3 rockP = vRockPoint + vec3(vStoneCover * 2.17, 0., .7);
      float largeGrain = rockNoise(rockP * 3.1);
      float detailGrain = rockNoise(rockP * 20.7 + largeGrain * .8);
      float seam = sin(dot(rockP, vec3(3.6, 23.8, 5.3)) + 4.2 * largeGrain);
      float veins = smoothstep(.84,.99,seam) * smoothstep(.38,.69,largeGrain);
      vec3 stoneColor = diffuseColor.rgb * (.69 + .32 * largeGrain + .39 * detailGrain);
      stoneColor = mix(stoneColor, stoneColor * vec3(1.55,1.48,1.38), veins * .53);
      float silt = 1. - smoothstep(.015,.29,rockP.y + largeGrain * .13);
      float moss = smoothstep(.41,.68,.72 * largeGrain + .26 * detailGrain + .15 * max(vRockUp,0.));
      if (vStoneCover < .5) silt *= 1.45;
      if (vStoneCover > .5 && vStoneCover < 1.5)
        stoneColor = mix(stoneColor, vec3(.119,.164,.054) * (.75 + detailGrain * .71), moss * .73);
      if (vStoneCover > 2.5 && vStoneCover < 3.5)
        stoneColor = mix(stoneColor, vec3(.27,.246,.146), .34 * moss);
      stoneColor = mix(stoneColor, vec3(.15,.112,.068), clamp(silt * .57,0.,.85));
      float snowFacing = smoothstep(.31,.79,vRockUp + .27 * largeGrain - .13);
      float cold = vStoneCover > 4.5 ? .95 : vStoneCover > 3.5 ? .47 : .0;
      float snow = snowFacing * clamp(cold + rockWeather.y * .69,0.,1.);
      stoneColor *= 1. - .17 * rockWeather.x - (vStoneCover > 1.5 && vStoneCover < 2.5 ? .14 : 0.);
      diffuseColor.rgb = mix(stoneColor, vec3(.67,.75,.77) * (.83 + .19*detailGrain), snow);
    `).replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = mix(clamp(.91 - rockWeather.x * .30 + detailGrain * .13, .43, 1.), .96, snow);
    `).replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      vec3 rockDX = dFdx(-vViewPosition), rockDY = dFdy(-vViewPosition);
      vec3 rockT = cross(rockDY, normal), rockB = cross(normal, rockDX);
      float grainHeight = .007 * detailGrain + .006 * largeGrain;
      float det = dot(rockDX, rockT);
      vec3 grainGradient = sign(det) * (dFdx(grainHeight) * rockT + dFdy(grainHeight) * rockB);
      normal = normalize(max(abs(det), .000001) * normal - grainGradient * (1. - snow * .64));
    `)
}

export function setRockWeather(weather) {
  conditions.value.set(weather.wet, weather.frost ?? 0)
}

export function rockMesh(variant, turn) {
  const key = variant + ':' + turn
  if (!geometryCache.has(key)) {
    const profile = rocks[variant]
    const color = new T.Color(profile.color)
    const positions = [], normals = [], colors = [], covers = []
    const average = new T.Vector3(), tint = new T.Color()
    for (const part of rockShape(variant, turn)) {
      const vertexNormals = new Map()
      for (const face of part.hull.faces) {
        let edge = face.edge
        do {
          const point = edge.head().point
          if (!vertexNormals.has(point)) vertexNormals.set(point, new T.Vector3())
          vertexNormals.get(point).addScaledVector(face.normal, face.area)
          edge = edge.next
        } while (edge !== face.edge)
      }
      for (const face of part.hull.faces) {
        tint.copy(color).multiplyScalar(.83 + .30 * Math.abs(Math.sin(face.constant * 39 + face.normal.x * 7)))
        let edge = face.edge
        do {
          const p = edge.head().point
          positions.push(p.x, p.y, p.z)
          average.copy(vertexNormals.get(p)).normalize().lerp(face.normal, 1 - part.roundness * .72).normalize()
          normals.push(average.x, average.y, average.z)
          colors.push(tint.r, tint.g, tint.b)
          covers.push(cover[profile.cover])
          edge = edge.next
        } while (edge !== face.edge)
      }
    }
    const geometry = new T.BufferGeometry()
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new T.Float32BufferAttribute(normals, 3))
    geometry.setAttribute('color', new T.Float32BufferAttribute(colors, 3))
    geometry.setAttribute('stoneCover', new T.Float32BufferAttribute(covers, 1))
    geometry.computeBoundingSphere()
    geometryCache.set(key, geometry)
  }
  const mesh = new T.Mesh(geometryCache.get(key), material)
  mesh.name = rocks[variant].name
  return mesh
}
