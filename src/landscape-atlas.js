import * as T from 'three'
import compact from './assets/environment/field-surfaces/field-atlas-compact.webp?url'
import full from './assets/environment/field-surfaces/field-atlas-full.webp?url'
import { createLandscapeAtlas, landscapeVariant } from './landscape-surfaces.js'

const loader = new T.TextureLoader()
const fallback = new T.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1)
fallback.needsUpdate = true

export const landscapeMap = { value: fallback }
export const landscapeReady = { value: 0 }

const variants = { compact, full }
const manager = createLandscapeAtlas(async key => {
  const texture = await loader.loadAsync(variants[key])
  texture.anisotropy = key === 'full' ? 4 : 2
  // Atlas pixels are perceptually equalized detail factors, used as linear
  // multipliers rather than direct scene color.
  texture.colorSpace = T.NoColorSpace
  return texture
}, texture => {
  const previous = landscapeMap.value
  landscapeMap.value = texture
  landscapeReady.value = 1
  if (previous === fallback) fallback.dispose()
}, texture => texture.dispose())

export const updateLandscapeQuality = detail => manager.select(landscapeVariant(detail))
export function landscapeResidency() {
  const { width, height } = landscapeMap.value.image
  return { ...manager.state(), width, height,
    estimatedRgbaMipBytes: landscapeReady.value ? Math.ceil(width * height * 4 * 4 / 3) : 4 }
}
