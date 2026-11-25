# Phase 05 · Working Dogs, Boyd and Wildlife Realism

## Review baseline

- Baseline and rollback anchor `85f041cebf0ef161f91b68f17575459e02586f2c`, the merged Phase 04.1 change in PR #29. The Pages deployment serves manifest `9a3ae462e13d8d048ea2`. [Phase 04.1 deployment](https://github.com/bladunk/Retriever-Run/actions/runs/45551610022)
- Phase 05 branch `codex/retriever-run-phase-05`, application version `1.0.0-phase.5`. Build metadata is derived from application inputs. The menu, Field settings, offline shell and performance export report the actual bundle. A waiting update has its own label.
- Phase 05 uses the existing Pages and Supabase architecture. Production identity, saves and the Worldwide ticket boundary remain in place. There is no new operating expense or production database step. Roll back by reviewing a revert to the baseline release. Existing installations should receive the rollback through the normal between-hunts update flow.

## Working dogs and Kennel

The Labrador uses a resculpted continuous weighted coat with a deeper chest, leaner waist, reshaped hindquarters and tapered tail. The original legally cleared texture source was reprocessed at 1536 × 1536. The Pointer derivative has a narrower frame and muzzle, taller stance, shorter tail, liver markings and fine ticking. Both use a single authoritative 120 Hz movement and collision representation. Normal play uses the Labrador. The Pointer is available through the localhost practice fixture `?debug=collision&breed=pointer` and has no public unlock.

Eight embedded retargeted poses and cycles support idle and alert blending, gait, gallop, jump, landing and a lowered body. Lane sway, ears, breathing and tail follow the blended pose. The Kennel supports horizontal drag and arrow-key rotation. Twelve Labrador colors share the mesh and map, with existing ownership preserved and future coats previewable while locked. The skinned vest follows the bind shape of the active breed. Collars and bandanas are neck mounted. The currently shipped catalog remains the equipment source for later progression.

Boyd remains a locked Master Hunter entry. The repository and accessible task assets contained no approved reference photography. The owner was asked for front, side and rear three-quarter photos and a collar close-up. A likeness, portrait, exclusive fitted equipment and owner approval remain pending. The temporary generic icon still identifies the installed application as Retriever Run. A future custom rig pass can add a dedicated trot, retrieve and carry, celebration, failure presentation and bespoke Pointer motion. An embedded motion clip alone does not establish gameplay integration or natural locomotion.

## Timber, structures and wildlife

- The active `fallen` hazard generates three tipped soil-and-root fans with continuous tapered bark-textured trunks, fractured grain and tapered broken roots. Lane and distance select variants consistently for both renderer and swept hulls. Adjacent lanes receive different variants. The separately registered three-lane leaning tree, rooted branch and stationary logs retain their contracts.
- The Northern Dakota grain facility's former 3.25 × 3.50 × 4.70 shed body becomes a 4.50 × 4.05 × 3.20 utility building. It has a lower roof, equipment door and grounded foundation. Dry foundations extend into the ground. Raised swamp structures remain raised. The Platte terrain and water treatment carry forward.
- Deer start from up to 64 m ahead and move forward and out after the reaction point. Pheasants begin concealed, accelerate forward from up to 43 m ahead and climb gradually. Ducks take off ahead of the runner, and flight species use wider forward trajectories. Models and discovery remain outside the active lanes. The independent encounter location, rarity, score and retrieve contracts remain unchanged. Path and view tests are needed to quantify visible seconds in moving portrait footage. The existing wildlife assets are reused. An eagle fishing animation, redesigned moose, bear cubs and a model-by-model upgrade of all requested birds remain open.
- At most two decoded rigs and one in-flight load are retained. The current and upcoming rigs are pinned. Idle decoded rigs can be reused across hunts. Retirement detaches the scene and stops actions. Eviction releases geometry, material, decoded images, mixer bindings and skeleton bone textures. The render loop prepares a texture, a skinned bone texture or a shader batch ahead of use when a frame allows. Pose/model loading is asynchronous and separately instrumented from render submission. Geometry buffer uploads can still happen on first draw.

## Course rules

Each territory lasts 30 seconds. There are 30 primary stages at 15 seconds each, then Endless Wilderness. The speed curve, 120 Hz movement, reward routes, swipe settings and base reaction checks are retained. The new stage modifiers are actual planner inputs. They do not estimate the percentage of players who will complete a stage.

| Stages | Base gap change (s) | Wide action change | Dodge follow-up change | Preferred flock interval (s) |
| --- | ---: | ---: | ---: | ---: |
| 1–6 | 0 | 0 | 0 | 0 |
| 7–12 | −0.024 | +0.022 | +0.025 | −0.24 |
| 13–18 | −0.048 | +0.044 | +0.050 | −0.48 |
| 19–24 | −0.072 | +0.066 | +0.075 | −0.72 |
| 25–30 | −0.096 | +0.088 | +0.100 | −0.96 |

Action and follow-up weights cap at 0.97 and 0.985. The late compound cooldown uses a 2.7-second minimum and the overtime gap multiplier grows at 0.095 per minute. Existing route validation bounds every resulting combination. New local runs use `migration-30-phase-05`. Its results have a separate local rank from archived Great Migration and ten-territory records. Worldwide Camp remains on its previously deployed validated rules, with Phase 05 submissions held for Phase 09.

## Assets and delivery

- Labrador GLB 893,212 B and Pointer GLB 894,100 B. Both are Meshopt-compressed CC BY 4.0 derivatives of the already credited game asset, with CC0 motion. The old Labrador GLB was 292,936 B. Shared character geometry and one texture keep the active cost independent of the number of coats. The loaded breed uses one 1536² image, approximately 12 MiB RGBA with mipmaps before implementation-specific compression or padding. [Asset register](ASSET_LICENSES.md)
- Higher-resolution embedded textures and preserved mesh detail account for the new bytes. No new standalone texture or audio pack is included. The only new required model file is the Pointer. It is downloaded with verified offline content, but ordinary hunts decode only the Labrador. The submitted FeralMotion files explicitly restrict redistribution as asset files and were excluded. The desired independently authored character animations and additional wildlife art remain contingent on an appropriate source or new authored art.
- The existing asset groups and SHA-256 store verify files and reuse unchanged assets across updates. Bytes and runtime measurements for this candidate are listed in verification below.

## Verification and remaining acceptance

The native comparison baseline is the owner's Phase 04.1 iPhone trace, averaging 59.8 FPS with rolling p95 18 ms and p99 30 ms, whole-hunt maximum presentation interval 95 ms, 23 peak textures and 93 peak geometries. The three mallard samples included 75–79 ms in renderer submission, increasing textures by eight, geometries by ten and programs by six. Those readings support first-use rendering work. They cannot establish how much time the GPU spent on texture copies, geometry transfer or shader compilation. The isolated 1,057 ms load-ready span includes asynchronous work and must be compared with adjacent synchronous operations and frame intervals.

Verification is in progress. Before owner approval, review matched portrait movement, wildlife staging, timber silhouettes and the Northern Dakota shed. Run native iPhone measurements with `?perf=1` on this exact build. Compare a cold mallard appearance with later encounters and repeat Hunts using the same preset. Record the new per-hunt peaks and the visible/model-ready/prepare operations in slow-frame history. Open Kennel at small-screen scale, try touch rotation, reach the last card, and verify the version footer in airplane mode after installation. Report any visible clipping, artificial movement or optional content layout issues.
