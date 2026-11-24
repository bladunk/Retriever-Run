import { landscapeProfiles } from './migration-landscapes.js'

// The first 15 atlas cells are in route order so terrain can interpolate
// between adjacent source surfaces at exactly the same samples as elevation.
export const surfaceOrder = Object.fromEntries(landscapeProfiles.map(({ key }, index) => [key, index]))
export const atlasColumns = 5
export const atlasRows = 4

export const landscapeVariant = detail => detail === 0 ? 'compact' : 'full'

// One decode at a time, including across rapid settings changes. The renderer
// keeps the old atlas until the latest selection has completely decoded.
export function createLandscapeAtlas(load, apply, release) {
  let selected
  let resident
  let pending
  let failed
  let elapsed = 0

  function prepare() {
    if (!selected || pending || selected === resident?.key || selected === failed) return
    const key = selected
    const start = performance.now()
    pending = Promise.resolve().then(() => load(key)).then(texture => {
      if (key !== selected) {
        release(texture)
        return
      }
      const previous = resident?.texture
      apply(texture)
      resident = { key, texture }
      if (previous) release(previous)
      elapsed = performance.now() - start
    }).catch(() => { failed = key }).finally(() => {
      pending = undefined
      prepare()
    })
  }

  return {
    select(key) {
      if (selected === key) return
      selected = key
      failed = undefined
      prepare()
    },
    state() {
      return { active: resident?.key ?? null, pending: Boolean(pending), lastLoadMs: elapsed }
    },
  }
}

// Turbidity, current, reflected sky, wave chop. Interpolated at the
// same geographic boundary as the base terrain and atmosphere.
export const waterProfiles = Object.fromEntries(landscapeProfiles.map(({ key }, index) => [key, [
  [.60, .42, .67, .78], [.72, .12, .34, .27], [.91, .41, .54, .52],
  [.67, .10, .39, .31], [.20, .76, .48, .48], [.71, .32, .52, .45],
  [.33, .97, .57, .59], [.29, .09, .71, .75], [.53, .11, .66, .56],
  [.44, .21, .68, .71], [.47, .14, .60, .45], [.31, .17, .61, .47],
  [.32, .14, .41, .48], [.17, .71, .53, .54], [.14, .63, .56, .42],
][index]]))
