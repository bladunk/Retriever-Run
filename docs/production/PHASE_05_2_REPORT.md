# Phase 05.2 · Gulf Coast Marsh art prototype

The playable Gulf Coast Marsh slice adds scanned trail and shallow-water materials, clustered cattail and cordgrass banks, a raised timber shelter, scanned driftwood and an authored mallard fallback. The largest differences from the running camera are the trail surface, the wet banks and the structure silhouetted on approach. This is the candidate art standard for owner review before work expands to the other territories.

| Identity | Value |
| --- | --- |
| Branch | `codex/retriever-run-phase-05-2` |
| Exact parent | `a7d24eba0886cd56af35083e981aba8f0eb17c53`, verified Phase 05.1 baseline |
| Baseline rendered bundle | `1.0.0-phase.5.1 · e21de57`, manifest `85a0c4255ce182eb788a` |
| Runtime candidate | `c2740fca269e0fd690717a43837961d0e60a8787` |
| Candidate release bundle | `1.0.0-phase.5.2 · 81dec1d`, manifest `9bc5d12cb5db1dc2ad7f` |
| Production observed during review | `1.0.0-phase.5.1 · 8262b46`. The owner’s last reported native trace used Phase 05 `79c3c0f` |

PR #31 was already merged into main at `0f6ef9b0d6880e84678f7d18faf7c66223a5468e` when work began. Its source tree matched the selected parent. Build identifiers reflect the application files and public Camp configuration. The owner-review checkpoint is a draft. [PR #32](https://github.com/bladunk/Retriever-Run/pull/32) · [CI checks](https://github.com/bladunk/Retriever-Run/pull/32/checks)

## Implemented art

Three Poly Haven CC0 scans supply stone, clay and damp sand with separate color and roughness/normal data. The Gulf shader uses broken wheel tracks, shoulder blending and distance-aware texture sampling. Near the creek, the same sand scan colors shallow sediment. The water pass uses region-specific turbidity, softer glints and shoreline highlights. The existing crossing geometry still controls the width a player reads and jumps.

Blender produces the timber shelter with pilings, bracing, stairs, a shooting slot and corrugated roofing. The tile worker places it at the existing site. `Dead Tree Trunk 02` supplies the shore debris silhouette and baked bark pigment. The vegetation uses instanced opaque blades and seedheads with close and distant forms. Clumps use shoreline elevation and leave clear space at signs, lanes and structures. High adds the closer cordgrass model and a wet-clay normal blend. Battery Saver uses the smaller geometry and color-only trail treatment.

The original Blender mallard drake and hen are used in the decoy spread. The drake also replaces the simpler fallback mallard body for encounters that start before the hero rig is prepared. The licensed animated mallard stays the prepared hero. The existing mover, habitat selection and journal observation rules are independent of these assets. In ordinary play, the driftwood and planted banks are decorative. [Six matched gameplay views](evidence/phase-05-2/README.md) · [Asset register](ASSET_LICENSES.md#phase-052-gulf-coast-art)

## Art tools and iteration

| Tool | Executed work |
| --- | --- |
| Blender 4.3.2 | Headless Python authoring, source-scene export, CC0 scan decimation and vertex pigment baking, Eevee material studies and skinned rig inspection. EGL fell back to the available software rendering path |
| glTF Transform 4.5.1 and Meshoptimizer 1.3.0 | Weld, simplify, prune, attribute validation, experimental GLB compression and dequantized rig import for Blender |
| Pillow 13.0.0 and NumPy 2.3.5 | Resampling, wrapped atlas borders, normal/roughness packing and matched image comparison |
| FFmpeg 7.1.5 | Transcode game capture for phone review |
| Khronos KTX-Software 4.4.2 | Portable Linux tool execution and validation of a UASTC test encode. The property map went from 1,396,916 B WebP to 903,347 B KTX2. Adoption awaits a browser transcode and native residency comparison |

The first rendered pass exposed purple stripes where distant sampling reached the adjacent property map. The second pass limited texture footprints and broke up the parallel ruts, but traces remained at shallow angles. The final pass separated sRGB color and linear property atlases, widened the gutters, added graded mip falloff and calmer Gulf glints. A subsequent pass added scanned driftwood, tested the shelter farther up the trail and reduced the Balanced property sample count. The software comparison then led to a separate Gulf ground shader, active through the continuous terrain blend. Inspect the final creek and foreground images at full size. [Pipeline reproduction commands](../../art/README.md) · [Art review rules](ART_PIPELINE.md)

Blender imported the existing Labrador and Boyd derivatives from decoded Meshopt GLBs. Both retain 54 gameplay skin joints and eight clips. The Blender importer adds a root bone in its scene. The Labrador has 13,340 imported vertices and Boyd 19,726. The shoulder experiment widens and lifts a small region of the Labrador without modifying skin weights or UVs. The matched study showed a subtle chest/shoulder change, with accessory fit and stride contact still requiring motion review. The approved game rigs and shared animation clips remain the runtime standard. A meaningful next canine pass needs matched paw contacts under gallop and a clip-based jump/slide/carry review. [Blender rig studies](evidence/phase-05-2/README.md#blender-studies)

OpenCV was absent from the base Python install. NumPy and Pillow supplied the necessary offline manipulation. The portable KTX tools and npm art dependencies run in scratch without operating-system installation or a new runtime dependency. Blender's native import uses the standard GLB skin and animation data after decoding the Meshopt extension with the reproducible preparation script.

## Packaging and budgets

| Build measure | Phase 05.1 | Phase 05.2 |
| --- | ---: | ---: |
| Full artifact | 12,039,830 B | 14,265,674 B |
| Unique required content | 11,997,779 B | 14,222,169 B |
| Required entries | 45 | 47 |
| Launch shell | 79,569 B | 79,569 B |
| Changed required content from intact baseline | — | 2,814,824 B across seven digests. Forty required files are reusable |
| Incremental transferred with estimated gzip on text | — | 2,149,406 B |
| Fresh transferred with estimated gzip on text | — | 12,943,287 B |

The licensed raw inputs total 38,088,788 B. The nine scans become a 313,128 B sRGB atlas and a 1,396,916 B linear property atlas. Each texture is 1536 × 512, approximately 4 MiB with mipmaps at RGBA8. Allow up to 8 MiB additional local GPU texture storage in the Gulf scene and about 6 MiB additional decoded CPU pixels if the browser retains both image surfaces. Actual storage and upload behavior vary by implementation. The Blender author export is 481,548 B. The checked-in packed mesh source is 253,452 B before compression. The offline Meshopt comparison export is 158,112 B. The running game uses the packed vertex and index derivative `src/assets/environment/gulf-meshes.js` for its existing tile worker and instancers, so there is no additional per-prop texture or GLB fetch. The CC0 driftwood drops from 83,128 source triangles to 1,346. The authored shelter submits 1,784 triangles before occlusion. Cattail tiers use 345 and 135 triangles, and cordgrass tiers 244 and 72. The bird bodies are 1,060 and 1,010 triangles.

The game verifies the two maps in the normal offline preparation flow before entering a fully offline hunt. They decode as the Gulf scene opens. A request released during decoding disposes the completed textures rather than binding stale responses. Leaving the visible Gulf range releases both maps and preserves the installed cache for later hunts. The scene still recycles seven tile slots. No face or source reference texture was introduced. The Phase 05.1 privacy audit and its historical concern still apply. [Private reference policy](references/boyd/README.md)

At 14.22 MB of required files, 1,000 complete installations imply about 14.22 GB of full transfers before gzip or retries. At 10,000 installations the same estimate is 142.22 GB. Replays with an intact cache reuse the offline pack. The art prototype focuses on selected assets with a clear change visible in portrait. The 25–75 MB allowance can support improved vegetation, character movement and wildlife as those assets clear review. [Hosting and residency limits](PERFORMANCE_BUDGET.md)

## Matched software WebGL checkpoints

Six screenshots use WebKit, seed 7, 320 × 568 portrait, Balanced and autumn sunrise. The frame counters describe submitted rendering work. These shots use candidate `034aa90`. The final commit extends the same material through the transition after these six positions.

| Checkpoint | Draws before → after | Triangles before → after | Textures before → after | Geometries before → after |
| --- | ---: | ---: | ---: | ---: |
| Opening, 3 m | 56 → 60 | 119,698 → 143,279 | 17 → 19 | 40 → 43 |
| Shelter, 170 m | 57 → 61 | 106,574 → 123,604 | 18 → 21 | 42 → 48 |
| Creek approach, 27 m | 51 → 55 | 106,302 → 128,880 | 18 → 20 | 45 → 47 |
| Creek near bank, 34 m | 53 → 55 | 113,930 → 133,561 | 18 → 20 | 44 → 45 |
| Cordgrass, 79 m | 49 → 53 | 100,473 → 117,071 | 18 → 20 | 41 → 43 |
| Marsh horizon, 149 m | 54 → 57 | 108,861 → 124,689 | 18 → 20 | 44 → 45 |

All six sampled checkpoints fit the Balanced budget of 100 draws and 180,000 triangles. The slice adds up to about 24,000 triangles in these views. At 79 m, Battery Saver submitted 45 draws and 83,709 triangles in the art candidate, compared with 59 draws and 148,473 triangles in High. Physical iPhone frame pacing requires a matched device trace.

### Continuous software Chromium run

Both builds ran from the same seed and title dwell at 320 × 568, Balanced, sequentially with video capture. The fixture sends ordinary movement inputs and runs at the browser frame clock for 17 seconds of game time. SwiftShader submissions and video recording load this Linux environment heavily.

| Metric | Phase 05.1 `e21de57` | Shared coastal program `056eaf3` | Scoped coastal ground `034aa90` |
| --- | ---: | ---: | ---: |
| Presentation samples | 86 | 85 | 85 |
| Observed software FPS | 3.2 | 1.8 | 2.0 |
| Presentation median | 288 ms | 532 ms | 510 ms |
| Presentation p95 | 1,097 ms | 1,696 ms | 1,865 ms |
| Presentation p99 | 1,852 ms | 2,872 ms | 2,126 ms |
| CPU median | 5.1 ms | 4.6 ms | 5.2 ms |
| CPU p95 | 792 ms | 1,366 ms | 1,005 ms |
| Launch readiness | 3,733 ms | 4,206 ms | 3,818 ms |
| Peak textures / geometries | 20 / 65 | 22 / 64 | 21 / 62 |

The streamed scene incurred several unusually long submissions with shader program deltas in both builds. Limiting the coastal shader to ground tiles in the Gulf and its blend reduces peak resource counts and the largest measured spikes compared with the shared program. The software candidate still runs slower than the Phase 05.1 comparison, with considerable frame-time variation. Use this as a performance risk for the native review. The new maps reached the renderer during the title in the traced art candidate. The profile cannot isolate a single cause for the full submission slowdown. [Moving gameplay samples](evidence/phase-05-2/README.md#moving-gameplay)

## Verification

- `npm test` passed all 158 tests. The new tests validate source mesh indices, vertex data, shared geometry cloning and deterministic off-trail planting. The terrain worker fixture now includes the transferred planting array.
- `npm run build` and `npm run verify:production` passed. The candidate had 50 emitted files. The verifier checks the complete file set, required file hashes, offline worker agreement and prohibited paths.
- Chromium at the GitHub Pages subpath upgraded from the Phase 05.1 artifact. Its transfer interruption and corrupt-file repair passed. The update preserved two saved runs, reused intact content and deferred activation during an active paused hunt.
- WebKit at 320 × 568 recovered an interrupted 1.40 MB Gulf property map and repaired the intentionally corrupted fixture. It relaunched offline as `034aa90`, completed two hunts, returned from a simulated background pause, navigated the Journal and reached the final Kennel card. The replay from tap to running was 114 ms, with a 42 ms internal marker. Cached startup took 7.33 s in the concurrent software browser run. The older art candidate replay measured 501 ms. These timings vary with the concurrent renderer workload.
- The final build `81dec1d` passed the live Chromium Gulf-to-Cypress lifecycle fixture. The two Gulf maps bound during title and released once during the running transition. The sampled scene held 20 textures and 45 geometries in the opening, 23 and 75 in Cypress, and 20 and 46 on a fresh High return. The Cypress count includes forest resources. Tile occupancy stayed within seven. [Transition evidence](evidence/phase-05-2/cypress-release.webp)
- Chromium switched the final build from Balanced to High, Battery Saver and Auto during the same paused-and-resumed Gulf hunt. The Gulf maps remained bound across the settings changes.
- The baseline and candidate share course generation, difficulty, collision, movement, control timing, scoring and competitive eligibility modules. The Phase 05 stress and fairness reports remain relevant to those modules. [Phase 05 validation](PHASE_05_REPORT.md)
- Compared 68 terrain packets across four original seeds. Landmark positions, sign anchors, wildlife anchors, tree transforms and ground and water positions matched. Decorative habitat counts changed on three packets. The creature path fixture used seed 14 and recorded the same three fallback mallards and trajectory in both builds.

## Remaining art and owner review

The distant tree and sky silhouettes still use the shared Phase 05.1 library. Shore geometry stays coarse at longer distances. The larger migration awaits a region-by-region plant, shoreline and lighting review. Original assets or specifically verified commercially redistributable rigs are still needed for a better wild Canada goose and wood duck. For a nearer-term study, the original [Mallard Duck source](https://vinish-models.pages.dev/birds/mallard-duck.glb) is already credited CC BY 4.0 and can test richer material and clip retention. The original [Pheasant](https://sketchfab.com/3d-models/f6d8887011314469b55f03a5807705db) and [Deer Female](https://opengameart.org/content/deer-female) are other known licensed sources for feather, foot-contact and gait refinements. The noncommercial goose demo encountered during sourcing is outside the approved intake. Any newly obtained wild goose or wood duck model needs an asset-specific redistribution license and editable rig, texture and clip source.

### Physical iPhone acceptance

1. Use the reviewed build and confirm the menu footer or `?perf=1` identifies Phase 05.2. Compare two runs against the owner’s Phase 05 trace on the same phone and settings.
2. In ordinary portrait play, inspect the first creek and the supported tree around the raised shelter. Check all three lanes and the silhouettes in Auto, Battery Saver and High. Review glare and shader seams as the camera turns and the water scrolls.
3. Play into Cypress and replay twice. Record median, p95 and p99, frames over 50 ms, first wildlife appearance and preparation events, textures, geometries, tile count and heat after several minutes. The existing owner baseline was 59.9 FPS across 19,462 frames, with five frame intervals over 50 ms and peak 29 textures, 124 geometries and two resident wildlife rigs. Investigate material regressions before extending the pipeline.
4. Prepare the offline content, relaunch in airplane mode, run into Cypress, restart and open the last Kennel card. Check saved hunts and build identity after restoring the connection.

The immediate decision is whether the trail, wet banks and raised shelter meet the intended look from the iPhone gameplay camera. Retain the Phase 05.1 baseline as the comparison and rollback anchor. Future territory work can reuse this pipeline after visual and native performance approval. [Expansion map](ART_PIPELINE.md#expansion-beyond-gulf-coast)
