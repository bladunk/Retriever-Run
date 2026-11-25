export const masterHunter = Object.freeze({
  id: 'boyd',
  name: 'Boyd',
  title: 'Master Hunter',
  level: 100,
  signature: 'boyd-signature-collar',
  vest: 'master-hunter-vest',
  bandana: 'master-hunter-bandana',
  emblem: 'master-hunter-emblem',
})

export function inspectionBreed(practice, requested) {
  return practice && (requested === 'pointer' || requested === masterHunter.id) ? requested : 'lab'
}

// These previews are deliberately outside the saved equipment catalog. The
// career release will award the same stable IDs through its normal gates.
export function boydAppearance(kit) {
  return {
    collar: kit === 'bandana'
      ? { id: masterHunter.bandana, color: 0x512c2e, bandana: true }
      : { id: masterHunter.signature, color: 0x262c28, buckle: true },
    vest: kit === 'signature' || kit === 'bandana'
      ? { color: null }
      : { id: masterHunter.vest, color: 0x48523d, binding: 0x30352e, panel: 0x586047, rough: .88 },
    coat: { id: 'boyd-cream', color: 0xffffff, light: .51 },
  }
}
