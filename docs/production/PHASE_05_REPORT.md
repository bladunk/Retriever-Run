# Phase 05 · Working Dogs, Boyd and Wildlife Realism

## Review candidate

Branch `codex/retriever-run-phase-05`, runtime commit `e7409c2ac7bf7cf63af0d1e9991e5f014bf0a0e3`, app version `1.0.0-phase.5`, local build `d4a614b`. The build identifier hashes application inputs and configured public Camp values. A CI or deployment build can have a different identifier. The live Pages manifest remained `9a3ae462e13d8d048ea2` at this review. The Phase 04.1 rollback anchor is `85f041cebf0ef161f91b68f17575459e02586f2c`, merged through PR #29. [Draft PR #30](https://github.com/bladunk/Retriever-Run/pull/30) · [PR checks](https://github.com/bladunk/Retriever-Run/pull/30/checks) · [Phase 04.1 Pages deployment](https://github.com/bladunk/Retriever-Run/actions/runs/45551610022)

The main-menu footer and Field settings report the bundle's own version and short identifier. The performance export uses the same metadata. The update dialog labels the waiting release separately. The service worker continues to verify content by hash, reuse unchanged files and wait until each open hunt is safe to leave. Roll back through a reviewed revert and the same between-hunts update protocol.

## Working dogs and Kennel

- The Labrador and development-only Pointer use resculpted, continuously weighted meshes. The Labrador has a deeper chest, abdominal tuck, shaped hindquarters and tapered tail. The Pointer has longer limbs, a narrower frame, liver patches and ticking. Twelve Labrador coat previews share one mesh and coat texture. The 120 Hz movement and collision contract remains independent of dog and equipment. [Working-dog comparisons and coats](evidence/phase-05/README.md)
- Continuous portrait gameplay shows the rear-camera gallop, steer, jump, slide and vest fit. The dog leans from actual lateral speed, pitches into takeoff and settles its front paws near touchdown. Tail counter-movement and ears follow the blended pose. A short procedural retrieve reach, head-mounted carry and animated release now follow pickups. The dog releases the visual bird when jumping or sliding. The carry and gear are cosmetic. The movement uses retargeted and procedural poses with approximate ground contact. Dedicated motion capture, full stride locking and distinct celebration and failure clips remain open. [Moving comparisons](evidence/phase-05/visual-pass/README.md)
- Fitted vests follow the active dog's bind coordinates and skin weights. Collars and bandanas use the shared neck fit. The Kennel can rotate by drag or arrows and retains existing ownership, previews and scrolling. Pointer inspection is local to `?debug=collision&breed=pointer`; ordinary profiles cannot select it for public play. Boyd remains locked at Master Hunter. The likeness, portrait and exclusive gear await approved photography, and the temporary PWA icon remains generic. [Private reference intake and modeling workflow](references/boyd/README.md)

## Wildlife and artwork

Pheasants flush ahead of the camera, deer and mallards move alongside the shoulders, and geese bank away after a longer flyby. One departing goose flock can overlap the next encounter. These presentations stay outside the running lanes and preserve habitat eligibility, encounter rarity, observations, scoring and the retrieve contract.

The skinned CC0 doe by CDmir and TinyWorlds replaces the former lower-detail deer model. Its surface maps and grazing and gallop clips are resident only when that rig is prepared. The lightweight deer has articulated silhouette details and the lightweight pheasant has split tail feathers and shoulder detail. The licensed mallard, pheasant and bald eagle rigs carry forward. A reviewed goose model described a domestic bird without suitable authored flight. Reviewed goose and moose demos offered noncommercial free variants. Additional storefront downloads needed authenticated access. A better licensed or authored goose, moose and black bear remain open, as do higher-detail pheasant and mallard variants. [Asset register](ASSET_LICENSES.md#phase-05-deer-female) · [Goose candidate](https://www.innerscene.com/tools/library/3d-parts/goose-667a348d) · [Goose demo license](https://sketchfab.com/3d-models/goose-realistic-3d-model-demo-free-0f5568c57ed84f02a5cc790ba16f5abc) · [Moose demo license](https://sketchfab.com/3d-models/moose-realistic-3d-model-demo-free-0ee3d3f1e02746c89d6a5754dfd2ee67)

The Linux WebKit captures use a moving 320 × 568 CSS gameplay camera and the real animation frame clock. The local QA probe samples roughly every 0.20 game seconds. To count as clear, the projected animal needs a body center inside the portrait frame, an estimated span of at least 10 CSS pixels, and one unblocked body ray through terrain, trees, crops and buildings. Reported times use consecutive clear samples from the same encounter. Thin understory and alpha edges are approximate. These are sampled opportunities to see an animal, with video for independent inspection of recognition.

| Encounter | Seeds and longest clear observation | Result |
| --- | --- | --- |
| Midwest deer | 13 · 4.03–4.32 s on `d4a614b`; 2 · 3.82 s on the preceding route; 13 · 5.14 s with the new rig on the preceding route | Dog-side yaw and forward exit were refined after the shorter seed-2 capture. The 5–8 s target remains variable with cover, crop positions and the route. |
| Midwest pheasant | 9 · 3.29 s; 19 · 3.80 s; another encounter on seed 9 · 2.16 s | Leading encounter met 3–5 s in two seeds. The second flush on seed 9 was shorter. |
| Gulf Coast mallard | 12 · 3.36 s; 14 · 3.20 s | Multiple clear seconds in both routes. |
| Sandhills Canada geese | 8 · 4.72 s; 21 · 8.54 s | Meets 8–15 s in one capture. In seed 8 the flock moved out of the portrait frame earlier. |
| Rare Platte River sandhill cranes | 5 · 3.84 s; 48 · 4.69 s | Rare formation remained apparent in the moving view. |

[Moving wildlife and measurement details](evidence/phase-05/visual-pass/README.md)

## Wildlife preparation and performance

The owner’s Phase 04.1 iPhone recorded 59.8 FPS and a rolling P95 of 18 ms and P99 of 30 ms. Three mallard appearance frames took 91–95 ms, with 75–79 ms in renderer submission and increases of eight textures, ten geometries and six programs. Those deltas implicate first-use rendering work without measuring individual GPU operations. The 1,057 ms load-ready span includes asynchronous waiting. Hunt peaks were 23 textures and 93 geometries. The iPhone recorded six retired skeleton bone textures. The retained disposal calls remain covered by tests.

GPU work now runs in separately paced steps on the title screen, a visible pause, and Hunt Over. The game never waits for a wildlife rig to start. A quick-start encounter can use the lightweight model for its entire pass, even if decoding finishes while the player runs. That decoded data is assembled at the next safe break. A later encounter can use the rig. Two slots cover decoded models and a reserved load. Attached models stay pinned during frozen-scene menus, and evictions release unique images, textures, materials, geometry, animation bindings and skeleton resources. This is separate from the terrain and character budgets.

- The warmed portrait duck sample replayed three rig encounters with zero in-hunt rig setup and GPU preparation operations. The new deer appeared twice in a portrait sample and peaked at 23 textures and 82 geometries with two rigs resident. Software title steps still varied substantially under contention. One deer texture initialization showed 272 ms, and a mallard preparation operation reached 375 ms in a concurrent run. A separate heavily contended opening capture recorded a 944 ms menu step. Those observations apply to the menu. They do not establish physical-device stalls or their removal.
- On the final built offline lifecycle test, a quick-start mallard entered on fallback. Backgrounding stopped the game clock. Returning and switching Battery Saver back to Balanced during pause let the mallard rig prepare. The resumed and replayed hunts each rendered two rig encounters without explicit setup or GPU warm operations on the active clock. They peaked at 22 textures each and 65 then 67 geometries. The replay engine marker was 109 ms. Two decoded rigs were retained. These runs took place on contended software WebGL.
- Earlier five-replay bounded tests, using an explicit warmup fixture, recorded 21 textures per retired scene and geometry counts of 57, 61, 63, 63 and 63. The earlier fixture's costly steps included 113 ms geometry preparation and 114 ms shader preparation. Its fixture clock held for readiness. The new moving captures start without that hold. They measure separate steps and draw selection on the actual run clock.
- First-use software rendering for the terrain, canine and lightweight encounter art still varies. A cold launch can continue an in-flight asynchronous model decode into the first hunt. The decoder cannot be interrupted mid-operation. Asset assembly and explicit GPU uploads wait for the next safe break. If a player never pauses, low-detail encounters can continue until Hunt Over. The remaining performance acceptance is a matched physical iPhone capture.

## Timber, structures and course

The active `fallen` hazard has three deterministic tapered-trunk variants. Two adjacent lanes select different shapes. The main trunk now reaches toward the camera with continuous bark, fractured wood and an inclined irregular root plate behind it. Swept hulls were updated with the visual trunk axes. Stationary logs, rooted branches and the dedicated left-jump, center-slide and right-run leaning tree keep their own contracts. [Matched Cypress approach at 956 m](evidence/phase-05/visual-pass/cypress-pair.webp) · [Near view](evidence/phase-05/visual-pass/cypress-close.webp) · [Moving approach](evidence/phase-05/visual-pass/cypress-moving.mp4)

The Northern Dakota grain facility around 7,007 m has a broader, lower utility building and a fill pad around its grounded bins and shed. The shed body changed from 3.25 × 3.50 × 4.70 m to 4.50 × 4.05 × 3.20 m. The visual audit includes matched Dakota, Delta, Midwest and Prairie shots, checks of the remaining regional landmark proportions and the complete rendered route. Elevated swamp camp structures and Platte River terrain and water remain as designed. [Dakota comparison](evidence/phase-05/visual-pass/dakota-grain-shed.webp) · [Rural building audit](evidence/phase-05/visual-pass/rural-structures.webp) · [Moving Dakota approach](evidence/phase-05/visual-pass/dakota-moving.mp4) · [All territories](evidence/phase-05/territories/)

All 15 territories keep 30-second intervals and two 15-second stages. Endless Wilderness begins after 7:30. The speed curve and reaction validator carry forward. Stage inputs are actual planner changes relative to Phase 04.1, rather than human completion estimates.

| Stages | Base gap change (s) | Wide-action weight change | Follow-up weight change | Preferred flock interval (s) |
| --- | ---: | ---: | ---: | ---: |
| 1–6 | 0 | 0 | 0 | 0 |
| 7–12 | −0.024 | +0.022 | +0.025 | −0.24 |
| 13–18 | −0.048 | +0.044 | +0.050 | −0.48 |
| 19–24 | −0.072 | +0.066 | +0.075 | −0.72 |
| 25–30 | −0.012 | +0.088 | +0.100 | −0.96 |

Stages 19–24 add a paired creek jump into a lane-changing slide, increasing these transitions from 271 to 434 across 64 seeds. Stages 25–30 produced 283 full two-lane jump-to-slide transitions versus zero on the earlier Phase 05 candidate. The first 90 endless seconds added 270. The full two-lane gates have at least 1.48 s nominal spacing and are placed only after validating reachable transitions. Optional retrieve-route totals across the three survey bands changed from 415, 593 and 538 to 441, 553 and 542. The course follows local ruleset `migration-30-phase-05`. Archived records remain available separately, and Worldwide submissions stay restricted. Human difficulty calibration awaits owner playtest. [Stage 25 in motion](evidence/phase-05/visual-pass/cross-trail-slide.mp4) · [Course composition](evidence/phase-05/visual-pass/measurements.json)

## Asset delivery and verification

| Measurement | Phase 04.1 comparison | Phase 05 local candidate |
| --- | ---: | ---: |
| Build artifact bytes | 7,499,203 | 9,387,684 |
| Unique required offline bytes | 7,436,065 | 9,323,898 |
| Unique shell bytes | 76,973 | 77,992 |
| Required files, distinct by content hash | — | 38 |
| Estimated complete transfer with text gzip | — | 8,344,575 |
| Increment from an intact Phase 04.1 cache | — | 3,495,594 B raw, about 2,688,610 B with text gzip |
| Increment from prior review build `9249422` | — | 1,543,880 B raw, about 847,510 B with text gzip |
| Optional diagnostics chunk | — | 5,418 B |

The Labrador GLB is 893,212 B and the optional gameplay inspection breed's Pointer GLB is 894,100 B. Both include animation and an embedded 1536² coat map. One active coat map is about 12 MiB decoded with RGBA mipmaps. The deer adds 380,772 encoded bytes over the former 148,876-byte file. Two 1024² maps are about 10.67 MiB together before implementation-specific GPU compression or padding. Asset group size and GPU residency are separate. The higher-resolution coats, additional breed, continuous deformation and detailed doe account for the material art increase. Reviewed assets that lacked compatible redistribution terms were excluded. There are no new runtime CDN requirements, standalone audio packs or paid services. [Licenses and provenance](ASSET_LICENSES.md)

At 100, 1,000 and 10,000 complete unique required downloads, plan for about 0.93 GB, 9.32 GB and 93.24 GB before actual HTTP compression, retries and overhead. [Hosting assumptions](PERFORMANCE_BUDGET.md)

| Check | Result |
| --- | --- |
| `npm test` | 152 passing tests. Focused rerun after the final deer trajectory passed 24 tests. GitHub CI runs the full suite. |
| `npm run build` and `npm run verify:production` | Built and verified 42 artifact files. Manifest `4dcff3121a512e161bd8`. |
| `npm run stress` | 10,000 seeded hunts, 6,001 guided, 31,865,173 simulation ticks. All 15 active hazard types exercised. |
| `npm run stress:master` | 100,020 windows across 3,334 seeds and 69,103,785 fixed ticks. All 30 stages. The stress run also includes 10-, 20- and 30-minute guided wilderness windows. |
| Rendered offline migration | WebKit Battery Saver, 451.19 game seconds on final build `d4a614b`. It used 406 scripted inputs and 903 samples across all 15 territories and Endless Wilderness. Peaks were 72 draws, 168,978 triangles, 116 geometries, 11 textures, 7 tiles and 2 habitat packs. A tile integration sample reached 453 ms on the contended software host versus 112 ms on the earlier pass. Retest tile and render timing on iPhone. |
| Mobile install and update | 320 × 568 WebKit verified interrupted download, isolated repair, installed-style offline game launch and version, offline Journal, bottom Kennel card, open-hunt update veto and save-preserving activation with unchanged audio reused. The Home Screen signal was emulated. A real Phase 04.1 artifact upgraded to the final candidate with unchanged audio retained. The running build label appeared after activation and settings survived reload. Chromium also upgraded from the earlier Phase 05 draft to the final build, with separate pending and active labels, cache repair and saved runs preserved. The 320 × 568 Chromium Kennel inspection rendered Pointer rotation, four viewing angles and equipment fitting. Linux software-browser timing under contention is unsuitable for a direct performance comparison. |
| Physical iPhone | Pending for Phase 05. Phase 04.1 owner trace is the comparison baseline. |

The accelerated migration checks rendering, input and progression across the course. The wildlife, movement and selected obstacle clips run on the normal browser animation clock. [Full evidence index](evidence/phase-05/README.md) · [Targeted footage and data](evidence/phase-05/visual-pass/README.md)

## Scope and owner acceptance

| Status | Work |
| --- | --- |
| Implemented and verified | Revised working-dog meshes and coat previews, fitted gear, short carry, local Pointer inspection, bounded wildlife model prep, physical timber hulls, Dakota utility shed, separate course rules, offline build identification and deterministic fairness. |
| Requires native verification | Cold and repeat wildlife presentation spikes, thermal and memory behavior, swipe feel, Home Screen installation and footer, actual player-perceived late challenge and visibility on the owner's device. |
| Partial | Wildlife sightline consistency in cover or at the portrait edges, longer native sightings, broader species upgrades and motion fidelity. The targeted shed and Cypress examples were audited. Region-wide environmental signoff remains open. |
| Deferred | Approved Boyd likeness, exclusive art, advanced canine motion and gear polish, additional wildlife rigs, fishing behavior and bear family encounters. Progression expansion stays with a later phase. |

1. Open the reviewed build and verify the footer before capturing performance. Run once immediately with `?perf=1`. Then pause at a safe break or return through Hunt Over, and record the next mallard encounter on the same device and preset. Compare slow frames, resource peaks and input feel with the Phase 04.1 trace.
2. Review actual deer and pheasant recognizability, the pose in a vest, the paired Cypress timber around 955 m, and the utility shed near 7,007 m. Try the late creek-to-slide sequence.
3. On the installed Home Screen app, verify the footer in airplane mode. Rotate the dog and tap the last Kennel card. Verify immediate replay and settings persistence.
4. Send Boyd's approved references as private task attachments following the [intake guide](references/boyd/README.md). The Master Hunter entry remains locked.

The handoff is owner review on draft PR #30. Production and the database remain at their existing releases. Resume from the [persistent checkpoint](PRODUCTION_PROGRESS.md). [Complete branch diff](https://github.com/bladunk/Retriever-Run/pull/30/files)
