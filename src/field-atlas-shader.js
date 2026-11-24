import { atlasColumns, atlasRows } from './landscape-surfaces.js'

export const fieldAtlasShader = `
  uniform sampler2D landscapeMap;
  uniform float landscapeReady;
  const vec2 atlasGrid = vec2(${atlasColumns}., ${atlasRows}.);
  vec3 scannedSurface(float slot, vec2 uv, vec2 dx, vec2 dy) {
    vec2 offset = vec2(mod(slot, atlasGrid.x), floor(slot / atlasGrid.x));
    vec2 bounded = (offset + .0625 + fract(uv) * .875) / atlasGrid;
    // Keep the bilinear footprint in its cell. At larger footprints the
    // caller is already fading to vertex color, which carries distant detail.
    vec2 gradient = vec2(.875) / atlasGrid;
    return textureGrad(landscapeMap, bounded,
      clamp(dx, vec2(-.08), vec2(.08)) * gradient,
      clamp(dy, vec2(-.08), vec2(.08)) * gradient).rgb;
  }
`
