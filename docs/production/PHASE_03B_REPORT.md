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

## Verified artifact and distribution

| Local built artifact | Phase 03 | Phase 03B |
| --- | ---: | ---: |
| Build bytes | 2,487,534 | 5,611,909 |
| Required bytes including duplicate files | 2,458,841 | 5,581,420 |
| Unique required bytes | 2,433,518 | 5,556,097 |
| Unique shell bytes | 66,202 | 76,074 |
| Optional diagnostic bytes | 5,372 | 5,372 |
| Required production files | 27 | 29 |

The Phase 03B verifier matched the manifest and service worker and checked each emitted SHA-256 and byte length. The local release ID is `3565eb83e40bd8feef02`. Comparing distinct required hashes against the prior build found 3,637,807 bytes to transfer and 1,918,290 bytes reusable when all old files remain verified. The worker may prepare some shell files before the initial download button. The download dialog measured 5.49 MB still to download and 5.58 MB total, based on the current fixture's byte accounting including duplicate paths. Compression, cache eviction and already-installed assets affect wire traffic.

There are no optional art downloads. Both texture choices remain available during an offline hunt, and the optional payload is the existing collision diagnostic module. Original diffuse scans were RGB photographs. The conversion retains relief and surface contrast as sampled color modulation while the existing normal/roughness techniques still provide lighting. The atlas accounts for the overwhelming majority of growth and materially changes nearby ground, exterior finishes and shallow water. Most of the geometry remains reproducibly generated and instanced. No asset host besides Pages is needed. [Hosting budget and projections](PERFORMANCE_BUDGET.md)

## Gameplay and production regression

- The baseline passed 131 Node tests. The candidate passed 134 with the new landscape, geometry ownership and variant swap checks. All existing obstacle and save tests remain.
- Seeded gameplay passed 10,000 hunts, 31,865,525 fixed steps, and all 15 hazard types. The difficulty suite passed 100,020 windows and 69,147,728 fixed ticks across all 30 stages. Neither course generator nor collision solver differs from the deployed Phase 03 source.
- WebKit ran at the built Pages subpath in a 320 × 568 touch viewport. The test deliberately dropped three transfers one quarter of the way into the 2.57 MB atlas. Retry reused verified audio, repair replaced only the corrupted cached atlas, and the verified pack booted offline. The same sequence played a hunt, persisted local progression, paused on backgrounding and used the last Kennel item. This was Linux WebKit emulation.
- That fault-injection run reached the title in 16.16 s including retries, and in 6.47 s from a subsequent offline reload. Its measured replay took 493 ms end-to-end, with an internal render marker of 69 ms. It was a shared software host. Those figures should not be interpreted as native iPhone loading or input latency.

## Matched rendering checkpoints

The numbers below use mobile-sized Linux WebKit with software WebGL, the same seed and normal gameplay camera, and the Balanced preset. They compare submitted geometry and draw counts. The practice harness holds the simulation at each checkpoint, so these values do not describe sustained frame rate.

| Checkpoint | Phase 03 draws / triangles | Phase 03B draws / triangles |
| --- | ---: | ---: |
| Gulf opening | 53 / 106,778 | 56 / 107,574 |
| Cypress interior | 58 / 139,994 | 64 / 141,484 |
| Flooded Timber | 61 / 144,260 | 68 / 145,303 |
| Farm landmark | 68 / 179,913 | 70 / 179,598 |
| Platte River | 66 / 116,203 | 71 / 117,780 |
| Sandhills | 46 / 85,475 | 47 / 84,370 |
| Boreal Forest | 66 / 120,861 | 72 / 123,004 |
| Mountain Wilderness | 53 / 102,744 | 56 / 101,065 |

Thirty running checkpoints showed 41–65 geometries and 10–13 renderer textures, seven resident tiles, and at most two optional habitat packs. The most demanding sampled Balanced checkpoint remained the cornfields by the Farm landmark at 179,598 triangles. Draw counts rise with the extra opaque batches. Cypress lifetime sampling recorded 334 in-window observations of a single opaque geometry, then 19 observations after the tile left that render window. [Measurements](evidence/phase-03b/measurements.json)

The median title readiness marker across independent capture navigations was 3.78 s in the baseline and 5.67 s in the candidate. Both sets shared the software host with other browser jobs at different points, so the difference is an observation to check on-device. The candidate logged 106 ms median and 309 ms p95 for tile generation on the loaded worker. Its largest sampled main-thread unpack interval was 75 ms. The atlas image request and load callback ranged from 1.17 to 4.90 s in those navigation samples. The callback includes transfer, decode and scheduling. A dedicated GPU upload duration, production frame pacing, and a cold-to-cold iPhone comparison were not measured.

## Visual review and follow-up

1. **Environments.** Inspected all fifteen territory approaches and landmark views. During review, dark water replaced clipped pale reflections and wave distortion reduced visible repeating bands. The distinct ground scans read most clearly in Gulf, Platte, Sandhills and alpine terrain.
2. **Readability.** Checked the normal camera against timber, water crossings, fences, the tractor and snowmobile. The camera, collision solver, lane coordinates and movement were retained. The backlit fog and rain samples still need native-phone comfort checks.
3. **Lifetime.** The solid batch removes the destructive fade and keeps the shape while visible. Procedural placement and plate ownership have focused unit tests. The assembled clips show real browser footage. Their wall playback is accelerated to reduce software-renderer waiting.
4. **Mobile.** Tested portrait rendering, the small-phone Kennel card, offline restart, backgrounding and an interrupted WebP transfer. High's extra detail is a choice. The physical frame cadence and texture-memory margin remain unmeasured.
5. **Release safety.** Verified the two image variants, package version, game identity, documentation, unchanged competitive gate and save schema. The review branch has no database, account, hosting, or deploy changes.

The current pass concentrates external intake on surfaces. The revised models are original procedural forms, with some shared cabin components and cutout tree crowns. Full reflected scene geometry, dedicated higher-poly vehicles, a second forest foliage library and systematic seasonal swaps are outside this implementation. Clearer regional land silhouettes and material variety are visible across the route. The annotated evidence lists the exercised cases and the matched captures. [Visual evidence index](evidence/phase-03b/README.md)

Phase 04 can use the existing habitat markers and the current tile and surface architecture once the owner accepts the visual revision. Before publishing, check iPhone readability and scene stability in a long hunt, try all three fixed presets and Adaptive, and verify cache behavior after a normal update. Phase 03B native FPS, thermals, low-storage eviction and a continuous rendered 7:30 hunt remain unverified.

In the matched 320 × 568 Chromium Cypress check, Battery Saver submitted 110,320 triangles in 59 draws, Balanced submitted 141,880 in 65, and High submitted 178,156 in 68. All three drew ten renderer texture objects, with the active atlas dimensions reduced by half per axis in Battery Saver. These are controlled checkpoint counts at the same seed. [Preset evidence](evidence/phase-03b/small-phone-presets.webp)
