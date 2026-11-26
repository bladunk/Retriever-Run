import * as T from 'three'
import { createResourcePool } from './resource-pool.js'
import colorUrl from './assets/environment/gulf-field-color.webp?url'
import propertiesUrl from './assets/environment/gulf-field-pbr.webp?url'

const empty = new T.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1)
empty.needsUpdate = true
export const gulfMap = { value: empty }
export const gulfProperties = { value: empty }
export const gulfReady = { value: 0 }
export const gulfScans = `
  uniform sampler2D gulfMap, gulfProperties;
  uniform float gulfReady;
  vec3 gulfScan(float column, float row, vec2 uv, vec2 dx, vec2 dy) {
    vec2 cell = vec2(1.0 / 3.0, 1.0);
    vec2 inset = (16.0 + fract(uv) * 480.0) / 512.0;
    vec2 footprint = cell * (480.0 / 512.0);
    // At shallow angles the automatic mip can read the adjoining map. Cap
    // each gradient at the gutter and fade to the cell's distant colour.
    float width = max(length(dx), length(dy));
    float scale = min(1.0, .04 / max(.001, width));
    vec2 at = (vec2(column,0.) + inset) * cell;
    vec2 gx = dx * footprint * scale, gy = dy * footprint * scale;
    vec3 texel = row > .5 ? textureGrad(gulfProperties, at, gx, gy).rgb
        : textureGrad(gulfMap, at, gx, gy).rgb;
    vec3 average = row > .5 ? vec3(.50,.50,.77) : column < .5 ? vec3(.126,.084,.051) :
      column < 1.5 ? vec3(.107,.055,.030) : vec3(.163,.147,.101);
    return mix(texel, average, smoothstep(.04,.13,width));
  }
`

const dispose = maps => maps.forEach(map => map.dispose())
const pool = createResourcePool(async () => {
  const loader = new T.TextureLoader()
  const results = await Promise.allSettled([colorUrl, propertiesUrl].map(url => loader.loadAsync(url)))
  const maps = results.filter(result => result.status === 'fulfilled').map(result => result.value)
  if (maps.length !== results.length) {
    dispose(maps)
    throw new Error('The Gulf Coast surface pack could not be decoded')
  }
  for (const [index, map] of maps.entries()) {
    map.flipY = false
    map.colorSpace = index === 0 ? T.SRGBColorSpace : T.NoColorSpace
    map.anisotropy = 2
    map.needsUpdate = true
  }
  return maps
}, dispose)
let requested = false
let pending = false
let generation = 0

export function prepareGulfSurfaces(wanted, probe) {
  if (wanted === requested) return
  requested = wanted
  const request = ++generation
  if (!wanted) {
    gulfReady.value = 0
    gulfMap.value = gulfProperties.value = empty
    pending = false
    pool.release('marsh')
    probe?.operation('gulf-atlas-release', 'Gulf Coast Marsh')
    return
  }
  pending = true
  const start = probe?.stamp()
  pool.request('marsh').then(maps => {
    if (generation !== request) return
    pending = false
    if (!maps) return
    const [color, properties] = maps
    probe?.texture(color, 'Gulf atlas / color')
    probe?.texture(properties, 'Gulf atlas / properties')
    gulfMap.value = color
    gulfProperties.value = properties
    gulfReady.value = 1
    probe?.operation('gulf-atlas-ready', 'Gulf Coast Marsh', start)
  })
}

export function regionalSurfaceResidency() {
  return { gulfAtlas: Boolean(gulfReady.value), gulfAtlasPending: pending }
}
