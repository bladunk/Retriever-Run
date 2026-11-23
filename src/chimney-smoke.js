import * as T from 'three'

const geometry = new T.PlaneGeometry(3.8, 3).translate(0, 1.5, 0)
const material = new T.ShaderMaterial({
  uniforms: { clock: { value: 0 }, wind: { value: 0 } },
  transparent: true,
  depthWrite: false,
  vertexShader: `
    varying vec2 plumePoint;
    varying float depth;
    void main() {
      vec4 view = modelViewMatrix * vec4(0., 0., 0., 1.);
      plumePoint = position.xy;
      depth = -view.z;
      gl_Position = projectionMatrix * (view + vec4(position.xy, 0., 0.));
    }`,
  fragmentShader: `
    uniform float clock, wind;
    varying vec2 plumePoint;
    varying float depth;

    float wisp(float phase) {
      float age = fract(clock * .28 + phase);
      float drift = (.62 + wind * .86) * age * age;
      vec2 center = vec2(drift + .14 * sin(age * 9. + phase * 7.) * age, .15 + age * 2.5);
      vec2 radius = vec2(.13 + age * .54, .20 + age * .30);
      vec2 p = (plumePoint - center) / radius;
      float shape = dot(p, p) + .15 * sin(plumePoint.x * 16. + age * 12.) * cos(plumePoint.y * 12.);
      return (1. - smoothstep(.08, 1., shape)) * smoothstep(0., .13, age) * (1. - smoothstep(.38, 1., age));
    }

    void main() {
      float density = wisp(0.) + wisp(.33) + wisp(.66);
      float fade = smoothstep(4., 10., depth) * (1. - smoothstep(29., 65., depth));
      gl_FragColor = vec4(.48, .51, .52, density * fade * .48);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
})

export function createChimneySmoke() {
  const mesh = new T.Mesh(geometry, material)
  mesh.visible = false
  return mesh
}

export function updateChimneySmoke(time, wind) {
  material.uniforms.clock.value = time
  material.uniforms.wind.value = wind
}
