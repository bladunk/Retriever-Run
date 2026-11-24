# Retriever Run 1.0 — Phase 03 implementation report

Phase 03 expands the journey to fifteen territories and thirty primary stages, with endless Canadian Mountain Wilderness after 7:30. It replaces the fragmented center-lane timber with a rooted storm-bent tree and adds geographically inspired landforms, tree stands, shoreline profiles, and off-trail landmarks. Nebraska has separate farm country, shallow Platte braids and sparsely wooded Sandhills. The course remains local-only and plays from the existing verified content pack.

The development baseline is deployed Phase 02, `6ced9492d1f330bca91f4461dc068a035b8c6152`. All 126 tests, a fresh production build, and hash verification passed before Phase 03 work. The owner reported practical iPhone testing of the earlier phases and the Cypress timber issue. Phase 03 device performance was not measured on a physical iPhone. [Pages baseline](https://github.com/bladunk/Retriever-Run/actions/runs/45453881715)

## Files and implementation

| Areas | Files and actual work |
| --- | --- |
| Fifteen landscapes | `src/migration-landscapes.js`, `src/expedition.js`, `src/landforms.js`. Registry, time and distance lookup, distinct terrain functions, blended elevations, plant eligibility, climate and water colors |
| Streaming and set dressing | `src/terrain-geometry.js`, `src/terrain-worker.js`, `src/terrain.js`, `src/migration-landmarks.js`, `src/forest-models.js`. Layouts, depth-aware shore placement, tree species and two forms, seeded worker requests, original buildings, windmill, limestone shelf and grain bins. Previously licensed cards and grass remain shared |
| Shaders | `src/marsh-water.js`, `src/materials.js`, `src/atmosphere.js`, `src/northern-horizon.js`. Bank color and reflected canopy approximation, ripples and multi-material ground, regional light, terrain-based shoreline ice and late mountain layers |
| Hazards and progression | `src/low-timber.js`, `src/snowmobile.js`, `src/art.js`, `src/collision.js`, `src/contact-shadow.js`, `src/obstacles.js`, `src/rocks.js`, `src/runner.js`, `src/difficulty.js`. Rooted slide hulls, parkable equipment, late eligibility and patterns, 30-stage schedule, fixed-speed upper bound and overtime gap ramp |
| UI and records | `src/main.js`, `src/field-stats.js`, `src/lodge-save.js`, `src/lodge-ui.js`, `src/honors.js`, `src/ruleset.js`. Stage HUD and brief territory callouts, Canada arrival, territory event hooks and archived ten-territory records |
| Download and test | `build/offline-worker.js`, `index.html`, `scripts/`, `test/`, `docs/production/`. Page-subpath build manifests, migration automation, seeded difficulty coverage and checkpoint evidence |

## Visual diagnosis and choices

At 841 m the Phase 02 build with seed 1 shows the middle-lane branch around 851 m. Its previous art assembles three independent limbs and balances them on a thin post, consistent with the reported visual defect. The owner’s image was unavailable in the supplied files, so exact seed or screenshot identity could not be established. The replacement uses one continuous overhead limb growing from a rooted storm-bent trunk with asymmetrical branching, cut grain, flare and contact shading. Collision sweeps the same section hulls. Standing and jumping through the solid overhead passage hit timber, and the correct center slide clears it at early and late speeds. Adjacent lanes allow a dodge where the lane is otherwise open.

The separate three-lane grounded signature obstacle retains the left jump, center slide and right run. Lodged driftwood and ground logs preserve their stationary position. Root plates remain soil-backed. Both baseline and candidate captures distinguish the narrow branch, signature tree, uprooted tree and driftwood. The parked snowmobile uses an original track, dark saddle, ochre-red hood, windscreen, steering bars and two skis. It is a stationary dodge obstacle in stages 27–30. Its core volumes follow the major component dimensions.

Trail collision still uses the same three lanes and surface height function. The new terrain raises surrounding land, cuts shoulder drainage and differentiates sand, rock, leaf litter, ruts and snow without displacing the gameplay floor. Coastal ribbons, forest swales, Platte braids, dunes and glacial depressions change terrain geometry. Water uses bathymetry, tinted diffuse and Fresnel reflection, shore ice and a low-cost canopy reflection approximation. Lighting changes are blended, with cost controlled by the same quality presets. There is no render-to-texture reflection pass. The two stable ridgeline meshes appear gradually around the Boreal–Foothills boundary. Northern marsh and grassland stay mountain-free. [Fifteen-territory registry and references](TERRITORIES.md)

The same seed reproduces vegetation, crops and landmark variants. Ground and channel elevations stay constant across seeds. Planting honors depth, bank position and clumping. Cypress and hardwood use distinct silhouettes, and tree models use bounded shared geometry with variation by tile. Corn, barn and tractor elements are preserved. The axial lodges share construction shapes with differing proportions and raised or dry foundations. Day-to-day wildlife variation, dynamic seasonal realism, and full ecological spawn surveys are later work.

## Movement, ruleset and saves

The fixed-step movement, buffering, reaction allowance and physical validator remain. Stages 21–30 increase slide commitments and follow-up probability within the same top pace and established recovery checks. Wetland and northern obstacle weights change by territory. Post-stage-30 spacing continues tightening within the existing validator. Human difficulty and distant obstacle recognition still need additional playtests.

The new course identifies local records as `migration-30-phase-03`. Save schema 4 retains settings, equipment, patches, identity, lifetime scores and the old territory totals under their original labels. The 15-territory journal begins recording new-course travel as hunts finish. The verified pre-upgrade snapshot can recover v3. A future Camp season must authorize its own ruleset and keep archived scores separate from thirty-stage records. This PR does not change production database schema, player records or server validation.

## Reproduction

```sh
npm test
npm run build
npm run verify:production
npm run stress
npm run stress:master
npm run test:difficulty-survey -- . 512
FIELD_BUILD=dist node scripts/phase-three-browser.mjs webkit
FIELD_BUILD=dist node scripts/phase-three-browser.mjs transitions
FIELD_BUILD=dist node scripts/phase-three-browser.mjs webkit timber
FIELD_PHASE_TWO_BUILD=/path/to/phase-two FIELD_BUILD=dist npm run test:production -- webkit from-phase-two repair
```

Build the baseline from the SHA above in an isolated directory. For comparable rendered software benchmarks point `FIELD_SOURCE` and `FIELD_BUILD` to that baseline source and distributable. Use the same emulated viewport and preset. Chromium accepts `FIELD_CHROMIUM` to use the local system browser. Playback takes real rendered frames from the built game and uses practice checkpoints to reach specific times. The automated simulation clock is independent of wall FPS.

## Verification and performance

| Built file bytes | Phase 02 | Phase 03 |
| --- | ---: | ---: |
| Total artifact | 2,465,533 | 2,487,534 |
| Required download, duplicate bytes included | 2,437,117 | 2,458,841 |
| Unique required content | 2,411,794 | 2,433,518 |
| Unique shell | 66,135 | 66,202 |

Hash verification covered 30 files with 27 required. No external runtime asset dependency or binary model download was introduced. Unique offline content grew by 21,724 bytes. The guided references and screenshots live in the repository outside the deployed artifact.

- `npm test` passed **131** tests, including the thirty-stage clock, terrain seams, rooted timber, snowmobile, seed variation and save archive.
- `npm run stress` passed **10,000** hunts and **31,865,525** fixed steps. The longest seeded hunts reached 465, 600, 1,200 and 1,800 active seconds. Coverage included all fifteen active hazards and the parked snowmobile.
- The 512-seed survey recorded 29.3 lane switches and 6.0 switch-and-slide encounters per minute in Stage 20. Stage 30 rises to 34.9 switches and 11.2 switch-and-slide encounters per minute. Top pace remains 28.995 m/s. The survey is about authored route demand, and human completion rates remain unknown.
- Chromium and WebKit passed the real Phase 02 update with the current save and a paused second tab. The waiting release re-used cached audio, deferred activation until the hunt ended and preserved four runs. The late Mountain Wilderness rendered offline after content download at 10.9 km.
- The draft branch build and test workflow passed. PR jobs skip publication.

- `npm run stress:master` passed **100,020 windows** and **69,147,728 fixed ticks** across thirty stages, all fifteen hazards and northern overtime. Center-lane render windows use a clear-seed fixture so the actual tile seam stays visible. The stress suite independently exercises lane changes and timed hazards at the same progression boundaries.
- The built Pages subpath rendered fifteen portrait approaches and fifteen wider landmark or terrain views in WebKit. Chromium also rendered Cypress, Platte River, Sandhills and Mountain Wilderness. The WebKit crossing suite played across all 14 territory boundaries and across 450 seconds into endless play. Screenshots used the normal runner camera and exclude the diagnostics overlay. [Approaches](evidence/phase-03-approaches.webp) · [Landmarks and terrain](evidence/phase-03-landmarks.webp) · [Before and after](evidence/phase-03-environment-comparison.webp) · [Cypress timber and snowmobile](evidence/phase-03-timber-comparison.webp) · [Transition windows](evidence/phase-03-transitions.webp)
- A fresh Phase 03 WebKit installation recovered an interrupted file and a corrupt cache entry. The software host reached Play in 17.0 s including the fault and 13.5 s on cached offline startup. Eight consecutive WebKit replays stayed at 43 geometries, seven textures and seven tiles, with internal restart markers of 50–156 ms. These markers exclude the user's tap and do not measure native-device restart latency. [Measurement records](evidence/phase-03-measurements.json)

### Render measurements

The following counters use software WebGL in mobile-sized WebKit at Balanced. The matched scenes use the same seed and relative territory time. Route distance changes for farm and the Rockies. Opening and forest screenshots exclude the collision-volume overlay. Draw and triangle totals include the remaining scene, dog and HUD-related 3D elements.

| Checkpoint | Phase 02 draws / triangles | Phase 03 draws / triangles | Phase 03 geometry count |
| --- | ---: | ---: | ---: |
| Gulf opening | 59 / 108,464 | 53 / 105,242 | 38 |
| Cypress interior | 51 / 122,658 | 58 / 139,994 | 45 |
| Platte approach | — | 65 / 115,323 | 55 |
| Sandhills approach | — | 46 / 85,475 | 48 |
| Mountain Wilderness approach | 49 / 109,820 | 53 / 102,023 | 50 |

Cypress adds about 17,000 submitted triangles in that scene. The largest sampled Balanced landmark was Farm Country near mature corn, at 70 draws and 179,937 submitted triangles. The largest sampled transition approached that same farm belt at 69 draws and 176,903 triangles. At a fixed Cypress pose, changing graphics in Settings produced 108,268 triangles and 52 draws on Battery Saver, 139,994 and 58 on Balanced, and 154,366 and 61 on High. Adaptive matched Balanced during the stationary observation. [Preset captures](evidence/phase-03-presets.webp) Seven terrain slots cap active packets across the route, and the optional vegetation residency is at most two packs. Texture and geometry figures are renderer object counts, not measured VRAM. The upgrade harness's WebKit start and reload times on the Phase 02 side were 37.1 s with an injected failure and 18.0 s cached on a heavily shared software host. The final Chromium upgrade rehearsal recorded 10.0 s with an injected Phase 02 transfer fault and 2.4 s cached. These individual measurements use different host loads. These timings stress recovery and cannot establish native load speed. The visually advancing tests use an injected simulation clock. Their software WebGL intervals cannot establish phone FPS.

### Acceptance and owner review

| Requested areas | Status |
| --- | --- |
| Territory order, timing, stage HUD, and endless course | Fifteen implemented terrain definitions and thirty primary stages. All stage and terrain seams have automated coverage and all 15 boundary windows have WebKit captures |
| Wetlands, farming, plains, forests and mountains | Distinct silhouettes, landforms and landmark families. Cypress branch defect has a reproduced baseline and replacement. Water reflections are approximate and gallery lighting is reviewed in emulation |
| Movement, content, offline saves and competitive restrictions | Preserved and tested within the recorded cases. Camp remains local for the new ruleset. Existing historic entries are archived with route metadata |
| Resource and performance limits | Tile and pack bounds are implemented and instrumented. Long rendered soak, native iPhone thermals and battery data remain open |
| Publication readiness | Review the evidence, verify readability and transitions on the owner’s device, and calibrate late-course response. Current physical phone status is the owner’s earlier Phase 02 report |

The same porch and roof construction is shared across some original landmarks, and sprays still use cached cutout silhouettes. The landscape is geographically inspired with authored scale. Full seasonal swaps, asset-grade photorealistic vehicles, detailed forest reflections and geographically exhaustive ecology remain outside the demonstrated scope.

## Release readiness

Phase 04 can begin developing wildlife against the territory and habitat registry once the environment review is accepted. Physical iPhone thermal, display, storage and long-play performance are open. The final marketing and production competitive reviews, wildlife, character artwork and expanded presentation remain assigned to later phases. The existing release instructions and Phase 02 rollback remain available. [Production checkpoint](PRODUCTION_PROGRESS.md) · [Release checklist](RELEASE_CHECKLIST.md)
