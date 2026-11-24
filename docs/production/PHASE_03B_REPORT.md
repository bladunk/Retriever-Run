# Phase 03B · Environmental art and wilderness realism

The baseline is the deployed Phase 03 merge `02db9239fbdeb28655eb0ae577fa703bb0bc1789`. The owner reported reaching Stage 19 on iPhone and asked to preserve the balance. This branch changes visual presentation and content packaging. Movement, stage data, seeded course generation, contact rules, save schema and Camp eligibility remain on their Phase 03 contracts. [Verified production deployment](https://github.com/bladunk/Retriever-Run/actions/runs/45472889024)

## The dissolving buildings

The previous terrain worker put walls, roof faces, porches and grass details in the same tile geometry. Its material discarded pixels in screen space while transitioning to a shorter-distance representation. Other trees and distant corn had separate representations, but the buildings had no destination. The selected graphics preset therefore controlled where a solid wall began looking perforated, and whole structures could disappear at the short end of the cull.

Phase 03B places structural pieces in an opaque, depth-writing batch with a stable tile identity. The far atmosphere blends the batch toward the horizon color. Frustum testing uses the whole geometry and one trailing tile is retained. Streaming replaces the tile's own old packet and leaves the material and other tiles untouched. Ground-cover fade remains isolated from walls, roofs, decks, major rocks and scenery vehicles.

## Art in the running game

| Region | Trail surface and water | Regional work |
| --- | --- | --- |
| Gulf Coast Marsh | Shell and coastal sediment, tidal ripples | Braced fishing shack, plank siding and connected pier |
| Southern Cypress Swamp | Dark wet forest soil and quiet tannin water | Buttressed cypress and tupelo, stronger knee shapes, hanging moss, raised gallery cabin |
| Mississippi Delta | Leaf-dotted floodplain mud, high-turbidity channels | Board-and-batten shed and improved levee finish |
| Arkansas Flooded Timber | Leaf-bed pattern, canopy-darkened standing water | Deeper oak/maple contrast and opaque timber blinds |
| Ozark River Country | Angular gravel, clear flowing shoals | Scanned limestone, differentiated bridge finish |
| Midwest Farm Country | Wheel-marked earth and brighter road edge | Red barn and silo retained, gray barn with framed door, recognizable tractor fenders and lugs |
| Platte River Valley | Gravel bars and pale mobile sediment in braids | Cottonwood and willow banks, raised river camp |
| Nebraska Sandhills | Pale sandy ranch track and quiet ponds | Open dune grasslands with the original windmill, kept intact at distance |
| Dakota Prairie Potholes | Grass and rock grain, gentle pond chop | Farmstead cladding and alternating water and grass margins |
| Northern Dakota Wetlands | Wet gravel and cold sloughs | Weathered corrugation and grain elevator, preserved bank cover |
| Manitoba Marshlands | Heavy organic mud and sheltered reed water | Raised freshwater camp, boardwalk and supports |
| Saskatchewan Parklands | Leaf-scattered gravel at aspen edges | Log-built cabin, localized light and shorter crown silhouettes |
| Canadian Boreal Forest | Forest duff, shaded lake edges | Tamarack joins spruce, fir, pine and snags, with textured lower trunks and a log cabin |
| Rocky Mountain Foothills | Fractured gravel and moving water | Forested slopes, deeper buttresses and forestry cabin |
| Canadian Mountain Wilderness | Packed snow, stone and cold runoff | Larger fractured skyline, varied snow and roof pitch, weathered snowmobile finishes |

The atlas uses 20 individually verified CC0 Poly Haven scans. It includes one ground cell for every territory and separate finishes for bark, worn siding, corrugated metal, masonry and shallow sand. The original material photographs total 16,545,971 bytes. The two game-ready maps contain 3,096,626 compressed bytes. The roof, wall, supports, machinery details, foliage and mountain geometry were authored in the project. [Asset licenses](ASSET_LICENSES.md) · [Individual source records](PHASE_03B_ASSET_SOURCES.json)

The existing shader pipeline handles bank depth, dissolved sediment, approximate canopy shading from real tree positions, surface movement, reflection tint and ice. No second reflection render pass is required. Battery Saver uses the 1,280 × 1,024 atlas and simpler water. Balanced and High share the 2,560 × 2,048 atlas. High adds water detail, a denser tree mesh selection for future tile packets, a higher outer horizon mesh when selected before mountain entry, and the existing higher framebuffer and weather budgets. Adaptive retains the existing hysteresis. Texture choice and terrain dressing do not control collision or physical visibility distances.

The finished atlas is shared across regions. Verification includes both variants because all settings must remain available offline. Only one active uploaded atlas is retained. During a swap the old map remains bound while a single new image decodes. RGBA8 plus mip estimates for the atlas alone are approximately 6.67 or 26.67 MiB. Browser and driver allocation can differ. The seven streamed tile slots and optional vegetation packs remain independently bounded.

The field-notes collection adds 35 independently linked Cornell Lab entries, for 40 notes total. They use the existing download screen and do not extend loading.

## Reproducing the comparisons

Serve the actual Vite artifact at the GitHub Pages subpath. Node 22.12 or later and installed Playwright browsers are required.

```sh
npm test
npm run build
npm run verify:production
npm run stress
npm run stress:master
FIELD_BUILD=dist node scripts/phase-three-browser.mjs webkit
FIELD_BUILD=dist node scripts/phase-three-browser.mjs webkit wide landmarks-only
FIELD_BUILD=dist node scripts/phase-three-browser.mjs webkit transitions
FIELD_BUILD=dist node scripts/phase-three-browser.mjs landmark-pass only=cypress low video
FIELD_BUILD=dist node scripts/phase-three-browser.mjs small presets
FIELD_BUILD=dist FIELD_FAULT_ASSET=field-atlas-full.webp npm run test:production -- webkit small offline-only partial repair
FIELD_BUILD=dist FIELD_PHASE_THREE_BUILD=/path/to/phase-03-dist npm run test:production -- from-phase-three
```

The scenery capture harness uses ordinary game-camera screenshots from built gameplay and deterministic practice positions. Its simulated game clock is separate from the render callback rate. Native device latency, playback FPS, thermals, battery and iOS memory pressure need direct testing. [Performance budget](PERFORMANCE_BUDGET.md)
