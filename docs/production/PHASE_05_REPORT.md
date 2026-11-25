# Phase 05 · Working Dogs, Boyd and Wildlife Realism

## Review baseline

- Baseline and rollback anchor `85f041cebf0ef161f91b68f17575459e02586f2c`, the merged Phase 04.1 change in PR #29. The Pages deployment serves manifest `9a3ae462e13d8d048ea2`. [Phase 04.1 deployment](https://github.com/bladunk/Retriever-Run/actions/runs/45551610022)
- Phase 05 branch `codex/retriever-run-phase-05`, runtime candidate `69ca4ad0ac6f21fb03da220bffeb4920e935bfe7`, application version `1.0.0-phase.5`, local review build `6e28cc3`. The production build identifier also incorporates the configured public Camp values. [Draft PR #30](https://github.com/bladunk/Retriever-Run/pull/30) Build metadata is derived from application inputs. The menu, Field settings, offline shell and performance export report the actual bundle. A waiting update has its own label.
- Phase 05 uses the existing Pages and Supabase architecture. Production identity, saves and the Worldwide ticket boundary remain in place. There is no new operating expense or production database step. Roll back by reviewing a revert to the baseline release. Existing installations should receive the rollback through the normal between-hunts update flow.

## Working dogs and Kennel

The Labrador uses a resculpted continuous weighted coat with a deeper chest, leaner waist, reshaped hindquarters and tapered tail. The original legally cleared texture source was reprocessed at 1536 × 1536. The Pointer derivative has a narrower frame and muzzle, taller stance, shorter tail, liver markings and fine ticking. Both use a single authoritative 120 Hz movement and collision representation. Normal play uses the Labrador. The Pointer is available through the localhost practice fixture `?debug=collision&breed=pointer` and has no public unlock.

Eight embedded retargeted poses and cycles support idle and alert blending, gait, gallop, jump, landing and a lowered body. Lane sway, ears, breathing and tail follow the blended pose. The Kennel supports horizontal drag and arrow-key rotation. Twelve Labrador colors share the mesh and map, with existing ownership preserved and future coats previewable while locked. The skinned vest follows the bind shape of the active breed. Collars and bandanas are neck mounted. The currently shipped catalog remains the equipment source for later progression.

Boyd remains a locked Master Hunter entry. The repository and accessible task assets contained no approved reference photography. The owner was asked for front, side and rear three-quarter photos and a collar close-up. A likeness, portrait, exclusive fitted equipment and owner approval remain pending. The temporary generic icon still identifies the installed application as Retriever Run. A future custom rig pass can add a dedicated trot, retrieve and carry, celebration, failure presentation and bespoke Pointer motion. An embedded motion clip alone does not establish gameplay integration or natural locomotion.

## Timber, structures and wildlife

- The active `fallen` hazard generates three tipped soil-and-root fans with continuous tapered bark-textured trunks, fractured grain and tapered broken roots. Lane and distance select variants consistently for both renderer and swept hulls. Adjacent lanes receive different variants. The separately registered three-lane leaning tree, rooted branch and stationary logs retain their contracts.
- The Northern Dakota grain facility's former 3.25 × 3.50 × 4.70 shed body becomes a 4.50 × 4.05 × 3.20 utility building. It has a lower roof, equipment door and grounded foundation. Dry foundations extend into the ground. Raised swamp structures remain raised. The Platte terrain and water treatment carry forward.
- Deer start from up to 64 m ahead and move forward and out after the reaction point. Pheasants begin concealed, accelerate forward from up to 43 m ahead and climb gradually. Ducks take off ahead of the runner, and flight species use wider forward trajectories. Models and discovery remain outside the active lanes. The independent encounter location, rarity, score and retrieve contracts remain unchanged. Path and view tests are needed to quantify visible seconds in moving portrait footage. The existing wildlife assets are reused. An eagle fishing animation, redesigned moose, bear cubs and a model-by-model upgrade of all requested birds remain open.
- At most two decoded rigs and one in-flight load are retained. The current and upcoming rigs are pinned. Idle decoded rigs can be reused across hunts. Retirement detaches the scene and stops actions. Eviction releases geometry, material, decoded images, mixer bindings and skeleton bone textures. The render loop prepares a texture, a skinned bone texture, a shader batch or a single indexed geometry upload ahead of use when a frame allows. Pose/model loading is asynchronous and separately instrumented from render submission. A 1 × 1 draw prepares one model geometry through Three.js. When render headroom or lead time runs out, some first-use work can still land on appearance.

## Course rules

Each territory lasts 30 seconds. There are 30 primary stages at 15 seconds each, then Endless Wilderness. The speed curve, 120 Hz movement, reward routes, swipe settings and base reaction checks are retained. The new stage modifiers are actual planner inputs. They do not estimate the percentage of players who will complete a stage.

| Stages | Base gap change (s) | Wide action change | Dodge follow-up change | Preferred flock interval (s) |
| --- | ---: | ---: | ---: | ---: |
| 1–6 | 0 | 0 | 0 | 0 |
| 7–12 | −0.024 | +0.022 | +0.025 | −0.24 |
| 13–18 | −0.048 | +0.044 | +0.050 | −0.48 |
| 19–24 | −0.072 | +0.066 | +0.075 | −0.72 |
| 25–30 | −0.012 | +0.088 | +0.100 | −0.96 |

Action and follow-up weights cap at 0.97 and 0.985. The late compound cooldown is 2.03 seconds from Stage 25. The northern block-to-switch decision gives a validated commitment at least 1.10 seconds of nominal spacing. The optional retrieve-route weight grows by 0.12 at Stage 25. The overtime gap multiplier ramps toward 0.095 with a 95-second time constant. Existing route validation bounds every resulting combination. A 64-seed survey found that excessively tight late gaps reduced available lane changes. With that spacing restored, the final three territories generated 1,474 goose hazards versus 1,320 on Phase 04.1, about 12% more. Stages 25–30 averaged 6.2 versus 5.0 optional retrieve-route rows per minute and 33.8 versus 33.7 planned lane switches per minute. Close chains fell from 46.7 to 45.9 per minute. This measures course composition. It leaves overall human difficulty and the proposed percentage targets open for iPhone playtest.

New local runs use `migration-30-phase-05`. Its results have a separate local rank from archived Great Migration and ten-territory records. Worldwide Camp remains on its previously deployed validated rules, with Phase 05 submissions held for Phase 09.

## Assets and delivery

- Labrador GLB 893,212 B and Pointer GLB 894,100 B. Both are Meshopt-compressed CC BY 4.0 derivatives of the already credited game asset, with CC0 motion. The old Labrador GLB was 292,936 B. Shared character geometry and one texture keep the active cost independent of the number of coats. The loaded breed uses one 1536² image, approximately 12 MiB RGBA with mipmaps before implementation-specific compression or padding. [Asset register](ASSET_LICENSES.md)
- Higher-resolution embedded textures and preserved mesh detail account for the new bytes. No new standalone texture or audio pack is included. The only new required model file is the Pointer. It is downloaded with verified offline content, but ordinary hunts decode only the Labrador. The submitted FeralMotion files explicitly restrict redistribution as asset files and were excluded. The desired independently authored character animations and additional wildlife art remain contingent on an appropriate source or new authored art.
- The existing asset groups and SHA-256 store verify files and reuse unchanged assets across updates. One additional 5.4 KB diagnostics chunk is optional. The Pointer data is cached for offline inspection. Its geometry and coat are not decoded in ordinary hunts.

| Measurement | Phase 04.1 comparison artifact | Phase 05 review artifact |
| --- | ---: | ---: |
| SHA-256 manifest | `1c6287a852731c75069d` | `ce61c8b3c9c1225683f7` |
| All published bytes | 7,499,203 | 9,000,759 |
| Unique required bytes | 7,436,065 | 8,936,973 |
| Unique shell bytes | 76,973 | 77,963 |
| Local HTTP gzip estimate for required content | — | 7.96 MB |
| Incremental bytes from intact Phase 04.1 cache | — | 2.96 MB, about 2.15 MB with text compression |

The gzip estimate compresses text files and uses the existing encoded size of model, texture and audio files. Actual transferred bytes depend on HTTP encoding and retries. At 100, 1,000 and 10,000 complete downloads, budget roughly 0.89 GB, 8.94 GB and 89.37 GB of unique content before protocol overhead or retries. A larger future art pack needs a fresh traffic and iOS storage review. [Hosting budget and provider limits](PERFORMANCE_BUDGET.md)

## Verification and remaining acceptance

The native comparison baseline is the owner's Phase 04.1 iPhone trace, averaging 59.8 FPS with rolling p95 18 ms and p99 30 ms, whole-hunt maximum presentation interval 95 ms, 23 peak textures and 93 peak geometries. The three mallard samples included 75–79 ms in renderer submission, increasing textures by eight, geometries by ten and programs by six. Those readings support first-use rendering work. They cannot establish how much time the GPU spent on texture copies, geometry transfer or shader compilation. The isolated 1,057 ms load-ready span includes asynchronous work and must be compared with adjacent synchronous operations and frame intervals.

## Browser evidence and performance

The settled Phase 05 software fixture retains a mallard rig between hunts. The earlier Phase 04.1 fixture retired it each time, with five skeleton bone textures released across five runs. It measured 13 textures after retirement and 21 while the repeated mallard was visible. The Phase 05 staging fixture without explicit prewarm wait reported 19 textures after each replay, one miss and five hits, and one retained rig. Geometries were 53–55 after replays two through five. The fixtures differ in seed and visibility window. The counts establish bounded reuse and do not compare native frame pacing or verify that the cold stall is gone.

An explicit warmup fixture in the local review artifact held the practice clock until the upcoming mallard finished all seven material textures, one bone texture, eight shader batches and eight geometry uploads. Across five complete replays the model remained at one miss, five hits, one idle rig and no eviction. Post-encounter counts were 21 textures in all five hunts. Geometry counts were 57, 61, 63, 63 and 63 as reusable scene resources settled. First-use software warmup steps still showed substantial work under contention, including a 113 ms initial geometry draw and a 114 ms shader step. This fixture demonstrates staged work and reuse. It does not verify natural lookahead under iPhone load or elimination of cold stalls.

On the opening pose fixture, the WebKit Phase 04.1 recording had 62 draws, 114,118 triangles, 17 textures and 50 geometries. The Phase 05 character recording had 65 draws, 133,362 triangles, 17 textures and 52 geometries. Parts of the scene were still settling. The comparison estimates opening load and is not a physical-device draw budget. The Labrador’s coat accounts for the largest incremental decoded allocation. Four wildlife GLBs retain their Phase 04 sizes. The main offline fixture uses the existing streamed terrain texture atlases and retains at most seven tiles and three requested habitat packs.

The production browser tests built before the final late-stage tuning confirmed interrupted download, isolated corrupt-byte repair, offline play and Journal, bottom Kennel card, multi-tab pause veto and save-preserving activation in small WebKit. A separate Chromium Phase 04.1 upgrade verified the same veto, repaired asset, two preserved hunts and one request for unchanged audio. Pending and running version labels were checked independently. On that WebKit test, offline readiness was 3.49 seconds and the input-to-first-frame restart was 300 ms, with a 109 ms engine marker. These are contended software samples. The native Phase 04.1 readiness and engine restart markers were 611 ms and 104 ms. [Rendered evidence](evidence/phase-05/README.md)

## Verification record

| Check | Result |
| --- | --- |
| `npm test` and `npm run verify:production` | 149 tests, production build and byte integrity on GitHub Actions. [PR checks](https://github.com/bladunk/Retriever-Run/pull/30/checks) |
| `npm run stress` | 10,000 seeded hunts, including 6,001 guided, with 31,865,536 simulation ticks and 6,002 surviving scripted horizons |
| `npm run stress:master` | 100,020 validated windows with 3,334 seeds and 69,068,231 fixed ticks across all 30 stages |
| Rendered workflow | Real play rendering on Linux WebKit and Chromium, with deterministic practice input for action capture, mobile Kennel, candidate versus baseline timber and shed, regional wildlife, graphics presets and offline update |
| Latest full migration | Review build `6e28cc3` rendered 451.24 game seconds through all 15 territories offline and entered Endless Wilderness. It used 401 routed inputs, 903 samples, 71 peak draws, 167,410 peak triangles, 115 geometries, 11 textures, 7 terrain tiles and 2 packs at Battery Saver. The highest reported integration slice was 76 ms on the contended software host. The accelerated fixture verifies rendering and route continuity |
| Physical-device result | Pending owner test. The 04.1 iPhone trace remains the comparison baseline |

## Review map

| Area | Primary files |
| --- | --- |
| Dogs, fitting and live preview | `src/lab.js`, `src/lab-rig.js`, `src/player.js`, `src/working-vest.js`, `src/kennel-*.js`, `src/assets/{labrador,pointer}.glb`, `scripts/prepare-working-dog.mjs` |
| Terrain and hazards | `src/fallen-timber.js`, `src/migration-landmarks.js` |
| Wildlife behavior and GPU staging | `src/living-wilderness.js`, `src/wildlife-models.js`, `src/main.js` |
| Course and records | `src/difficulty.js`, `src/runner.js`, `src/ruleset.js`, `src/lodge-save.js`, `src/lodge-ui.js` |
| Build identity and offline metadata | `build/build-info.js`, `build/offline-worker.js`, `src/build-info.js`, `src/content-manifest.js`, `src/production-entry.js`, `index.html`, `vite.config.js` |
| Acceptance and artifacts | `test/phase-five.test.js`, `scripts/phase-three-browser.mjs`, `scripts/production-browser.mjs`, `docs/production/evidence/phase-05/` |

[Full file list](https://github.com/bladunk/Retriever-Run/pull/30/files) · [Structured measurements](evidence/phase-05/measurements.json)

## Owner review and open acceptance

Before owner approval, review matched portrait movement, wildlife staging, timber silhouettes and the Northern Dakota shed. Run native iPhone measurements with `?perf=1` on this exact build. Compare a cold mallard appearance with later encounters and repeat Hunts using the same preset. Record the new per-hunt peaks and the visible/model-ready/prepare operations in slow-frame history. Open Kennel at small-screen scale, try touch rotation, reach the last card, and verify the version footer in airplane mode after installation. Report any visible clipping, artificial movement or optional content layout issues.

| Status | Work |
| --- | --- |
| Implemented and verified | Skinned Lab revision, 12 Labrador coat previews, alternate Pointer geometry and local inspection, weighted vests and shared neck attachments, Kennel rotation, three paired timber variants, targeted Dakota shed, local ruleset separation and offline build identification |
| Implemented, needs native verification | Cold and repeat model preparation, frame spikes, representative collision readability, field controls, player-perceived late challenge, persistent cache behavior and iPhone Home Screen layout |
| Partial | Retargeted canine motion, equipment breadth, environmental proportion audit, model and scene resource prewarm, wildlife trajectories and visibility. Captures demonstrate motion at several encounter checkpoints. They do not establish the full requested 3–15 second on-screen windows |
| Deferred or pending inputs | Boyd likeness and exclusive art awaiting approved photo references, separately authored canine trot, retrieve/carry and celebration, final prestige progression, additional wildlife rigs, fishing behavior and bear family encounters |
| Held | Merging, deployment, production database changes, reset, and Phase 06 |

Resume from the existing branch. Start with the owner’s approved Boyd reference assets and a physical iPhone trace of the current review build. Use the Phase 05 evidence scenarios for comparison. Check the 955 m Cypress pair and the 7,007 m Dakota approach in ordinary play. Review animal motion and visual shelter before increasing the content budget. [Persistent checkpoint](PRODUCTION_PROGRESS.md)
