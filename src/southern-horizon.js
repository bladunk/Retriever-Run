import * as T from 'three'
import { centerAt } from './trail.js'

// Relative land height and canopy for open marsh, cypress, rice country,
// bottomland hardwood and the Ozark ridges. Only two distant draws.
const silhouettes = [
  [0x707c62, 2.7, .53, .75], [0x4d6256, 9.3, 3.9, .28], [0x77785a, 3, 1.25, .33],
  [0x5d6c56, 10, 4.9, .53], [0x637e6d, 18.8, 13.2, .62],
].map(([hex, ...contour]) => ({ tint:new T.Color(hex), contour:new T.Vector3(...contour) }))
const none = { tint:new T.Color(0), contour:new T.Vector3() }
const profile = region => silhouettes[region.index] ?? none

function silhouetteGeometry(radius, layer) {
  const positions = [], samples = [], indices = []
  const segments = 170
  for (let i = 0; i <= segments; i++) {
    const unit = i / segments
    const azimuth = (unit - .5) * 2.92
    const angle = i * .22 + layer * 4.8
    const spine = Math.max(.06, .54 + .26 * Math.sin(angle * .23) + .15 * Math.cos(angle * .57 + 3))
    const crowns = Math.max(0, .54 + .23 * Math.sin(angle * 1.21 + layer) + .16 * Math.cos(angle * 3.41))
    for (let row = 0; row < 2; row++) {
      positions.push(Math.sin(azimuth) * radius, row, -Math.cos(azimuth) * radius)
      samples.push(spine, crowns, unit)
    }
    if (i) indices.push(i*2-2,i*2,i*2+1,i*2-2,i*2+1,i*2-1)
  }
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions,3))
  geometry.setAttribute('silhouette', new T.Float32BufferAttribute(samples,3))
  geometry.setIndex(indices)
  return geometry
}

export function createSouthernHorizon(scene) {
  const haze = { value:new T.Color() }
  const tint = { value:new T.Color() }
  const contour = { value:new T.Vector3() }
  const opacity = { value:0 }
  const target = new T.Color()
  const ridges = [217, 126].map((radius, layer) => {
    const surface = new T.ShaderMaterial({
      uniforms:{ haze,tint,contour,opacity,layer:{value:layer} },
      side:T.DoubleSide, depthWrite:false,
      vertexShader:`
        attribute vec3 silhouette;
        uniform vec3 contour;
        uniform float layer;
        varying vec3 vSilhouette;
        varying float height;
        void main() {
          vSilhouette = silhouette;
          height = position.y;
          float canopyBreak = .38 + .62*smoothstep(.14,.62,silhouette.x);
          vec3 point = position;
          point.y = mix(-5.5, contour.x*silhouette.x*(1.08-layer*.21) + silhouette.y*contour.y*canopyBreak, height);
          vec4 clip = projectionMatrix*modelViewMatrix*vec4(point,1.);
          gl_Position = vec4(clip.xy, clip.w*.99995, clip.w);
        }`,
      fragmentShader:`
        uniform vec3 haze, tint, contour;
        uniform float opacity, layer;
        varying vec3 vSilhouette;
        varying float height;
        void main() {
          float scarp = smoothstep(.0,.73,height);
          float strata = .89 + .19*vSilhouette.y + .08*sin(vSilhouette.z*168. - height*4.);
          float air = (.31 + layer*.24)*opacity*(.70+scarp*.30);
          vec3 hills = tint*strata*(.83 + scarp*.17) + vec3(.053,.044,.026)*contour.z;
          gl_FragColor = vec4(mix(haze, hills, air),1.);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    })
    const mesh = new T.Mesh(silhouetteGeometry(radius, layer),surface)
    mesh.renderOrder = -45 + layer
    mesh.frustumCulled = false
    mesh.visible = false
    scene.add(mesh)
    return mesh
  })
  return (distance, zone, color) => {
    const from = profile(zone.from), to = profile(zone.to)
    const amount = T.MathUtils.lerp(Number(from !== none), Number(to !== none), zone.blend)
    for (let layer = 0; layer < ridges.length; layer++) {
      ridges[layer].visible = amount > .015
      if (amount > .015) ridges[layer].position.x = -centerAt(distance)*(.19 + layer*.14)
    }
    if (amount <= .015) return
    opacity.value = amount
    contour.value.copy(from.contour).lerp(to.contour,zone.blend)
    haze.value.copy(color)
    tint.value.copy(from === none ? to.tint : from.tint).lerp(target.copy(to === none ? from.tint : to.tint),zone.blend)
  }
}
