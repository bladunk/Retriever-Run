# Phase 04 · Living Wilderness, visual realism and performance

The deployed baseline is Phase 03B merge `f8094b23072151c7bcc31135b422df74f6a53eb3`. GitHub Pages reported release `98efe11eac0ac2a31752`. The baseline build reproduced in an isolated local environment without the production Camp build configuration was `3565eb83e40bd8feef02`. It verified 32 files and passed 134 Node tests. [Live deployment](https://github.com/bladunk/Retriever-Run/actions/runs/45509931577)

The owner's physical iPhone run reached Saskatchewan Parklands at Stage 24 after 5:52, with 30,040 points, 573 treats and seven retrieves. It ended at an uprooted tree. The owner reported enjoyable difficulty alongside slight stutters, soft lettering, occasionally narrow tall sheds and crossings that read as blue strips.

## Responsive terrain and rendering

Phase 03B integrated all tile geometry and instance transforms in one callback. Tile unpacking included bounding-sphere scans over transferred arrays. Phase 04 computes bounds in the worker and attaches the transferred arrays directly. It stages tile integration across four rendered steps. The partial scene stays hidden until its final step, retains stable landmark lifetime, and rejects work from outdated positions or seeds. The cached spawn packets can start installing while an obsolete request drains. The 120 Hz simulation and all swept physics use the same contract. The owner-observed stutter can have additional causes. Browser profiling and physical iPhone testing are separate evidence.

The opt-in `?perf=1` report is available on hosted builds from **Field settings → Developer performance → Capture performance report**. It includes software or device presentation intervals, percentiles and threshold counts, an average presentation rate, platform-supported long tasks, worker integration timings, preset changes, wildlife activity, decoded model preparation time and live renderer counters. It displays only with the explicit query. The collision practice controls stay local.

## Environmental corrections

| Owner feedback | Change |
| --- | --- |
| Uprooted tree | Replaced disconnected soil lobes with one rough soil plate, a continuous trunk and tapering roots. The three variants still share the previous swept shapes exactly. The separate leaning tree keeps its Phase 03 route |
| Blue strips | Landscape water profiles now tint crossing beds and surface shading. The stream edges are irregular and carry a shallow dark bed, mottled sediment and a narrow rippled water surface. The visual bed stays near the existing collision floor |
| Road signs | 1,024 × 448 raster with stronger lettering strokes, mipmaps, grazing-angle filtering and an adjusted viewing angle. Same text, frequency and mounts |
| Sheds | Mississippi and pothole sheds now have wider bases and lower roof rises. Marsh camps retain their existing authentic raised structures |
| Platte Valley | Terrain, sandbars and structures use the existing route layouts. Migrating cranes can appear above shallow water and fields. The Midwest barn, tractor and corn retain their gameplay roles |
| Sparse motion | Corn bends subtly by row and wind phase. Authored ferns use licensed scanned surface maps on selected woodland banks. River sound accents and four new field recordings supplement animated fauna |

## Wildlife and offline preparation

The 29-species catalog includes 21 waterfowl, the ring-necked pheasant, Sandhill Crane, heron, egret, Bald Eagle, deer, moose and alligator. Four models use individually licensed rigs. Remaining wildlife uses stylized original procedural silhouettes with different anatomical families. The wildlife model decoder holds at most a current and upcoming file and only one in-flight preparation. Birds, mammals and their journal events are independent of the obstacle and reward systems. All graphics settings use the same lead animal and sighting thresholds.

The Phase 04 download contains the regional asset groups. Terrain packets preselect off-trail, roost, water-edge and flight anchors. Cache verification, recovery, prompt sizing and worker activation continue to use existing offline preparation. No remote wildlife fetch is needed once verification completes. The local history persists observation and retrieve counts separately. [Species, territory and journal contracts](LIVING_WILDERNESS.md) · [Individual credits](ASSET_LICENSES.md#phase-04-living-wilderness)

The primary development branch is `codex/retriever-run-phase-04`. No release publication or database work occurred on this branch.

## Build, asset and hosting measurements

| Local production output | Phase 03B | Phase 04 |
| --- | ---: | ---: |
| Files in Pages artifact | 32 | 41 |
| Total artifact bytes | 5,611,909 | 7,494,868 |
| Required manifest bytes with duplicate paths | 5,581,420 | 7,457,053 |
| Unique required bytes by SHA-256 | 5,556,097 | 7,431,730 |
| Unique shell bytes | 76,074 | 76,973 |
| Optional diagnostic module |  | 5,418 |

The isolated Phase 04 verifier reported content version `77e3cc6b74180b5f653b`. Compared by digest, 17 changed or new required content objects total 3,006,320 bytes. Approximately 4.43 MB of the new working set can be reused from verified Phase 03B files. The figure excludes update metadata, network overhead and corruption repairs. Both landscape texture variants and all required model files are in the offline edition. There is no separate paid or online graphics pack.

| New content | Download bytes | Render / decode estimate | In-game purpose |
| --- | ---: | --- | --- |
| Mallard | 371,508 | 14,632 triangles, 4.33 MiB mipmapped RGBA8 | Mobile wetland lead bird with a rig and distinctive coloration |
| Bald Eagle | 419,060 | 17,619 triangles, 4.33 MiB mipmapped RGBA8 | Overhead glide and flight in river and mountain habitats |
| White-tailed Deer | 148,876 | 2,096 triangles, one tiny palette texture | Off-trail grazing and bounding reactions |
| Ring-necked Pheasant | 494,560 | 1,628 triangles, up to 16 MiB mipmapped RGBA8 | Long-tailed upland bird launched from cover |
| Fern 02 | 161,356 | 3,426 triangles in the file, up to 16 MiB shared mipmapped RGBA8 | Shaded banks and forest understory with authored surface detail |
| Crane, pheasant, eagle and creek recordings | 249,346 | 24 kHz mono MP3 | Sparse, attenuated calls, wing sound and moving-water cues |

Texture estimates assume RGBA8 with a full mip chain. They exclude model buffers, temporary copies, canvas backing stores and the driver. Roadside sign textures are pooled with existing sign slots. Future compression work should compare the decode, upload and steady-state GPU costs using representative physical devices. Exact upstream and build sizes, model edits, recordings and licenses are in the asset register. [Asset provenance](ASSET_LICENSES.md#phase-04-living-wilderness)

The five model files use 1,595,360 bytes and the four recordings use 249,346 bytes. The extra storage buys articulated wildlife, richer forest banks and audible field activity across the offline migration. The phase still relies on procedural secondary silhouettes. A broader collection of individually licensed, well-animated species and tree models would make better use of the owner's 25–75 MB allowance. The preceding asset register records which sources made it into the playable build. The current edition uses about 0.74 GB at 100 full installs, 7.43 GB at 1,000 and 74.32 GB at 10,000. Traffic from active returning players depends on cache retention. [Hosting limits and projections](PERFORMANCE_BUDGET.md#phase-04-content-and-device-gates)

## Preservation and rollback

The fixed-step engine, actual collision data, course and difficulty configuration, input controls and score code retain their Phase 03B behavior. The rendered crossing defers to the existing physical hull. The supported three-lane tree keeps left jump, center slide and right run. Ambient sightings remain local and carry zero points. Existing bird pickups retain their prior reward amounts and get parallel species counters. Existing Camp rankings remain readable under the prior eligibility restrictions. The save migration leaves previous records, Kennel unlocks, fields and anonymous identities in place.

To reproduce the release baseline, use a separate checkout of `f8094b23072151c7bcc31135b422df74f6a53eb3`, install dependencies and use the existing Pages configuration. Preserve that SHA as a rollback reference. Phase 04 changes application files and derived offline content only. The existing update protocol activates a verified bundle at a safe menu boundary.

## Rendering and responsiveness

The baseline Chromium sample rendered 62 active seconds of seed 7 at a 320 × 568 CSS-pixel viewport in Battery Saver. Its last scene reported 59 draws and a range of 1.3–6.2 ms across the seven visible tile integration callbacks. Callback CPU time, excluding initial load, was 2 ms median and 7 ms p95 over the 720-sample rolling window. The test injects the gameplay clock. The baseline report had only that clock for frame intervals.

The first Phase 04 balanced WebKit evidence run sampled all fifteen territories at 390 × 844. The passes ranged from 45–71 draws, 84,353–148,785 submitted triangles, 10–17 renderer textures and 44–59 geometries. It showed at most three shared vegetation packs. With multiple tests sharing the two-core software-rendered host, the largest sampled main-thread integration slice was 33 ms in the Cypress checkpoint. A shorter offline Battery Saver replay on the same shared host observed a 103 ms outlier, so Phase 04 does not establish that runtime hitching has been eliminated. Landmarks and object meshes kept their separate sharing lifetimes.

The offline WebKit acceptance flow measured 982 ms from replay input to its first callback displaying the running state and 7.16 seconds from offline reload to availability on the shared host. Its 29 sampled rendered intervals had a 199 ms median and 1,453 ms p95 under concurrent software rendering and first-use work. It reported one adaptive downgrade and a 4.32 s wildlife load window. These wall times include host contention. They establish an offline and instrumentation result. GPU upload time and browser storage verification were not separately isolated. The target remains 60 FPS on capable phones, with a 30 FPS fallback. Mobile Safari thermal behavior, frame pacing and input latency need physical measurements.

## Verification and captures

- `npm test` on the baseline passed all 134 tests. The Phase 04 suite adds encounter eligibility, deterministic reruns, animation and visibility bounds, journal migration and idempotence, original obstacle hull consistency and wildlife geometry lifecycle.
- `npm run build` and `npm run verify:production` verified the actual Vite output under `/Retriever-Run/`, including locally hosted Meshopt/WebP assets and every offline content digest.
- `npm run stress` passed 10,000 seeded hunts and 31,865,525 fixed-step ticks, with 431,143 pickups. `npm run stress:master` verified 100,020 windows across all thirty stages over 69,147,728 ticks. The validation covered all 15 hazard types and the endless extension.
- The WebKit 320 × 568 offline test interrupted a partial `living-mallard.glb` response, confirmed reuse of unchanged audio on retry, repaired a corrupt cached model, reloaded offline, played and completed a hunt, paused and returned from a visibility change, replayed, and exercised the last Kennel card. It also verified all 29 Journal entries offline. The test injected the network failures it reported.
- The 390 × 844 WebKit tour used separate seeded approaches through the normal camera. It is rendered checkpoint evidence rather than a continuous native playthrough. Full route, wildlife footage and graphics evidence status are listed with the capture index. [Rendered evidence](evidence/phase-04/README.md)

## Physical iPhone checklist

1. In Safari, open the version offered for owner review with `?perf=1`. Prepare the content, verify the disclosure, then go offline and launch from the Home Screen.
2. Run a normal hunt through several regions with Auto, through a forest in Balanced and through the opening in Battery Saver. Record startup, replay, obvious frame skips and whether any scenery or wildlife appears abruptly.
3. Capture reports after the marsh, Cypress, Platte and Saskatchewan approaches using **Field settings → Developer performance → Capture performance report**. Include phone model, iOS version, power mode and graphics preset. Capture a separate report after repeated replays.
4. Approach the Saskatchewan uprooted tree, check left or right passage when an open lane is available, and verify the center collision attributes correctly when the dog contacts it. Check the separate leaning tree where available.
5. Compare Gulf or Cypress crossing color with the nearby water, read the first sign while moving, and confirm Platte remains recognizable. Observe a pheasant flush and check the discovery after the hunt. Open the bottom Kennel card before and after offline use.
6. Reconnect and confirm local progress persists. Leave the older Worldwide Camp records visible under the existing competition rules.

## Incomplete acceptance areas

- The portfolio has 21 waterfowl, with four authored animated wildlife models across the broader roster. The remaining silhouettes and behaviors are stylized. Wider mammal coverage, full waterfowl realism, richer ecology and weather, additional high-quality canopy assets, bear-with-cubs encounters, eagle fishing and aurora remain open artwork or engineering work.
- The water treatments stay close to the existing collision floor. An actual terrain cutout and connection to side channels at every crossing require a separate terrain and gameplay validation pass.
- The file-digest cache holds the offline journey and the model loader bounds current/upcoming wildlife. High-resolution atlas and model residency on devices, per-file CPU/GPU upload times and thermal stability remain unverified.
- The native iPhone evidence in this report describes the owner's Phase 03B run. The Phase 04 candidate is a draft for review. Completion of the checklist and the remaining rendered and device gates belong in the production checkpoint. [Production progress](PRODUCTION_PROGRESS.md)
