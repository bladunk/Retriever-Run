import * as T from 'three'
import { seededRandom } from './trail.js'

export function createDriftingLeaves(scene) {
  const seeds = new Float32Array(54 * 3)
  const random = seededRandom(131173)
  for (let i = 0; i < seeds.length; i++) seeds[i] = random()
  const geometry = new T.BufferGeometry()
  geometry.setAttribute('position', new T.BufferAttribute(seeds, 3))
  const uniforms = { clock: { value: 0 }, travel: { value: 0 }, wind: { value: 0 }, strength: { value: 0 },
    haze: { value: new T.Color() } }
  const material = new T.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false,
    vertexShader: `
      uniform float clock, travel, wind, strength;
      varying float fall, shade, fade;
      void main() {
        float k = position.x * 17.96;
        float side = step(.5,position.x) * 2. - 1.;
        float lane = 4.2 + 11. * fract(position.x * 2.01);
        float height = fract(position.y - clock * (.072 + position.z * .04));
        float ahead = mod(position.z * 94. - travel + clock * wind * .53, 94.);
        float x = side * (lane + sin(clock * (1.25 + position.y) + k) * (.21 + wind * .83));
        vec4 view = modelViewMatrix * vec4(x,height * 9.8 - .21,-ahead + 3.,1.);
        gl_Position = projectionMatrix * view;
        gl_PointSize = min(14., max(1., (56. + 32. * position.y) / max(1., -view.z)));
        fall = clock * (1.5 + position.z) + k;
        shade = position.z;
        fade = strength * smoothstep(1.,8.,ahead) * (1. - smoothstep(38.,70.,ahead)) * smoothstep(.04,.13,height);
      }`,
    fragmentShader: `
      uniform vec3 haze;
      varying float fall, shade, fade;
      void main() {
        vec2 p = gl_PointCoord - .5;
        float c = cos(fall), s = sin(fall);
        p = mat2(c,-s,s,c) * p;
        float shape = 1. - smoothstep(.63,.96,length(vec2(p.x * 3.2, p.y * 2.23)));
        if (shape * fade < .07) discard;
        vec3 copper = mix(vec3(.40,.18,.065), vec3(.67,.38,.11), shade);
        gl_FragColor = vec4(mix(copper,haze,.19), shape * fade * .81);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const leaves = new T.Points(geometry, material)
  leaves.name = 'Drifting autumn leaves'
  leaves.frustumCulled = false
  leaves.visible = false
  scene.add(leaves)
  return (region, distance, time, weather, detail, reduced) => {
    const autumn = region === 2 || region === 3 || region === 4 || region === 5
    leaves.visible = autumn && detail > 0 && !reduced
    if (!leaves.visible) return
    geometry.setDrawRange(0, detail > 1 ? 54 : 28)
    uniforms.clock.value = time
    uniforms.travel.value = distance
    uniforms.wind.value = weather.wind
    uniforms.strength.value = .74 + Math.min(.18, weather.wind * .18)
    uniforms.haze.value.copy(weather.sky)
  }
}
