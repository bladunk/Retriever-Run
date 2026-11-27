# Operation Clarity gameplay comparisons

The frames use the production gameplay camera and seed 7 on a 320 × 568 CSS-pixel portrait viewport. Each pair places published RC.3 `3205d74` on the left and the Clarity candidate on the right. The labels show each render buffer's pixel dimensions. These are rendered browser captures.

## Opening, signs and Delta crowns

- **Gulf Coast opening**, five seconds into the course. [All three presets](opening.webp)
- **Gulf Coast notice**, about 14.5 m before the board at the same camera distance. [All three presets](notice-approach.webp)
- **Mississippi Delta**, about 83 seconds into the course, in morning fog. [All three presets](delta-handoff.webp)

Chromium captured this series on `973bc49`, after the adaptive resolution and sign changes and before the final timber bark export correction. [Frame distances and resource counts](matched-scenes.json)

## Delta to Flooded Timber

The final dense woodland comparison uses WebKit at Balanced with `368a0bd`. Look for visible bark and branches below the leaf volumes in the foreground and through the morning fog.

- [Delta approaching the territory handoff](webkit-delta.webp)
- [Flooded Timber, 12 seconds after the handoff](webkit-timber.webp)

## Moving offline hunt

These frames were captured during a continuous 95-second scripted run on the accelerated gameplay clock, on build `973bc49`.

[Gulf Coast](moving-gulf.webp) · [Cypress](moving-cypress.webp) · [Delta](moving-delta.webp) · [Flooded Timber](moving-timber.webp)
