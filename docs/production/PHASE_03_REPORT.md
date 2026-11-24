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

<!-- phase-three-results -->

## Release readiness

Phase 04 can begin developing wildlife against the territory and habitat registry once the environment review is accepted. Physical iPhone thermal, display, storage and long-play performance are open. The final marketing and production competitive reviews, wildlife, character artwork and expanded presentation remain assigned to later phases. The existing release instructions and Phase 02 rollback remain available. [Production checkpoint](PRODUCTION_PROGRESS.md) · [Release checklist](RELEASE_CHECKLIST.md)
