# Operation Wilderness | Heartland RC.4

Heartland starts from merged Clarity commit `c4a29e579120c80552a7ee45eb201305bf06a93f` on `codex/retriever-run-wilderness-heartland`. The published comparison build and owner-tested iPhone baseline are `1.0.0-rc.3.1 · 368a0bd`, manifest `e66178643922f5bd4132`. The configured candidate is `1.0.0-rc.4 · a524eac`, manifest `d6a6f0cbc30f9b8a2920`. [Draft PR #43](https://github.com/bladunk/Retriever-Run/pull/43)

The largest changes are the Sandhills' off-trail dune relief, the Platte's shallow channels and depositional bars, and the farm-to-wetland sequence. Across the entire route, trail puddles now use a ground-conforming surface and derive their waterline from the existing collision footprint. Both deterministic courses retain their existing timing, simulation, scoring, signed rules and hazard volumes.

## Territory review

| Territory | RC.3.1 weakness | RC.4 composition | Remaining work and reference |
| --- | --- | --- | --- |
| Midwest Farm Country | The distant ground read as a flat field with generic roadside trees. Corn was interrupted by regular strips of exposed earth. | Opened views by moving trees toward shelterbelts. Rolled the fields, cut drainage and small basins, extended harvest rows with a filtered field material, and added planted margins and a weathered barn with two grounded grain bins. Existing near and far corn instances still carry the visible stalks. | The closest field-facing camera can still reveal the gap between the last corn row and the distant residue pattern. [USDA sloping fields and crop residue](https://www.nrcs.usda.gov/state-offices/nebraska/news/farmers-encouraged-to-keep-the-stubble) |
| Platte River Valley | Parallel roadside channels and a continuous dark-blue look made it hard to read as a shallow, braided river. | Asymmetric braids separate around shallow sandbars and vegetated islands. Silt shades and reflective ripples vary with water depth. Cottonwoods and willow use solid crowns and sit away from the lane. Existing crane encounters remain visible in the flyway. | The lowest camera cannot reveal every far braid at the same time. Crane motion and species forms remain Living World work. [USFWS Platte roost and islands](https://www.fws.gov/rivers/nebraska) |
| Nebraska Sandhills | Almost flat ground and two linear strips of water resembled another wet agricultural region. | The off-trail surface rises into overlapping, grass-covered dunes, with lower wet meadows and a long second horizon. Repeated grass cards gave way to seed heads and a banded prairie surface. Ranch windmill and open sightlines give the hills scale. | The route crosses a wide low draw and retains its gentle original grade. The distant texture of individual grasses is abstract at gameplay scale. [NPS Sandhills prairie](https://www.nps.gov/niob/learn/nature/grasses.htm) |
| Dakota Prairie Potholes | A flat, green corridor hid the boundaries between prairie and small pools. | Offset basin shapes create independent, irregular ponds. Dry upper shelves and clustered rushes break up the margins. The existing hunting blinds remain outside the playable lanes. | Low water and reeds can visually converge under fog on small screens. Owner motion review should focus on the south-facing bank during sleet. [USGS glacial potholes and aerial views](https://www.usgs.gov/media/images/prairie-pothole-landscape) |
| Northern Dakota Wetlands | Water continuation resembled smaller potholes with a different tint. | Broader sloughs, a recurved spit, straighter distant prairie silhouettes and colder light lead toward Manitoba. Pale reed beds and existing grain infrastructure mark the northbound transition. | This pass preserves the existing late-season trees. Dedicated bare-tree structures and northern wildlife animation belong in the following releases. [USFWS Des Lacs refuge and landscape photography](https://www.fws.gov/locations/des-lacs-national-wildlife-refuge/photography) |

The existing seven-tile stream, northern horizon, Southern Flyway atlas and wind code provide the common renderer. The Heartland adds two shared landscape horizon draws, using the existing shader and buffers. The farm receives a filtered furrow pattern beyond the shoulder. The new native grass and rush geometry uses the existing instanced wind material with per-instance phase. Heartland tree stands use the same compact solid-canopy meshes at all presets. The runtime skips the old licensed grass and tree-card packs in this area. Ozark and Manitoba transitions reuse the existing geographic and light crossfade schedule.

## Puddles and obstacle readability

The old puddle used a nearly flat ellipse and a separate soil decal at a fixed height relative to its center. The trail itself curves and changes height across the footprint. This creates a depth conflict with hillside approaches and makes the pictured water differ from the three overlapping collision volumes. Some loose stones used a constant world height and could float above the surface. The existing water shader also shaded a hazard with much the same sediment and reflection response as larger scenic water.

The new pooled mesh follows the curved trail in each occupied lane. Its water resolves the union of the three collision boxes, with a narrow antialiased transition at the edge. An irregular damp-earth margin is explicitly outside the dangerous water. Silt and a restrained sky reflection distinguish it from dry or merely rain-darkened ground. Near-lane decorative stones follow the actual trail level. Larger stems and rocks have an off-lane setback. The existing camera, obstacle visibility range, fog and depth testing remain in use.

The geometry test raycasts against actual tile triangles at the three lanes of each of the 15 territories. WebKit rendered all 15 actual seeded puddles from 19 m at Balanced, across sunrise, overcast, fog, rain, wind, sleet and snow. At those frames the collision fixture allowed 0.60–1.20 s before the latest safe jump, above the course's 0.42 s reaction allowance. This measures the remaining time for an isolated puddle using the same 120 Hz motion and collision code. A human recognition threshold and mixed-hazard reaction time remain iPhone review items. The separate heavy-rain Studio fixture exercised Battery Saver and High. [Hazard approach gallery](evidence/heartland/REVIEW.md#occlusion-and-rain) · [Sweep timings](evidence/heartland/puddles.json)

The permanent charter standard requires a moving camera review across presets and weather, a readable lane and intended escape, visual correspondence with swept bounds, and sufficient time before the last safe input. The existing course reaction allowance is 0.42 s, with additional setup where the maneuver needs it. The broader audit treats fences, logs, roots and driftwood as low silhouettes, branches and supported trunks as slide clearance, rocks and fallen trees as shape-dependent routes, and tall trunks, tractors, snowmobiles and geese as lane-exclusion cases. Creeks and longitudinal washouts keep their established cues. Puddle rendering is the visual correction in this PR. Recognition of every other course combination under native fog, rain and high speed remains an acceptance task. [Permanent standard](PLAYER_FIRST_CHARTER.md#obstacle-readability)

## Performance and assets

The owner measured RC.3.1 at 60.0 FPS, 2.80 ms mean CPU per frame, 696 ms startup-ready, and 7 ms from the latest restart input to scene submission. The next animation callback took 41 ms, and the first presentation interval was 71 ms. The first scene submission itself used 2 ms CPU. Those markers concern different points in the frame, and they do not localize the physical restart stall. [Owner's native comparison data](evidence/heartland/native-rc31-owner.json)

Two of the three over-50-ms samples were associated with Fern 02 preparation. The named texture and shader calls explain the work present in those samples but do not establish browser or GPU causation. RC.4 lets one already prepared pack span a gap of at most 460 m beyond the last regional request. The extra hold does not start a load, and manual Battery Saver is ineligible for it. Existing tile references can outlive a demand boundary while their tile drains. The repeat pack's estimated cost is at most 16 MiB for three 1K RGBA8 mipmapped maps. The pack and shader preparation were already in the original startup path. Native follow-up should verify whether the repeated Gulf and Delta preparations decline and whether the longer residency affects heat or pressure.

Required offline bytes are 17,806,380 across 122 entries. The complete configured build is 17,893,197 bytes. The incremental change is 2,323,338 required bytes before HTTP compression, including changed chunk names and contents. The two original grass meshes compile to 22,852 bytes of packed source and approximately 35,276 bytes of shared decoded geometry. Blender produced a 52,248-byte author GLB and the packer produced a 19,700-byte optimized review GLB. Both remain in development. The full terrain atlas remains 2,560 × 2,048, an estimated 27,962,027 bytes in RGBA8 with mipmaps. The vegetation, horizon and puddles add zero textures. [Asset register](ASSET_LICENSES.md) · [Incremental digest change](evidence/heartland/asset-delta.json)

The public Worldwide standings and fallback score RPCs both responded HTTP 200 with an empty list and `open: false` in `great-migration-1`. This pass uses the existing read paths and does not exercise the live ranked verifier.

### Matched running-camera resources

Seed 7. Balanced. Chromium's software renderer at 320 × 568 CSS pixels with a 416 × 738 drawing buffer. Each observation was captured fifteen seconds into the named territory. Counts are active Three.js resources or submitted work for the pictured frame.

| Scene | Draws RC.3.1 → RC.4 | Triangles | Textures | Geometries | Programs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Farm | 68 → 70 | 141,171 → 174,618 | 20 → 19 | 55 → 52 | 24 → 22 |
| Platte | 61 → 64 | 147,779 → 153,162 | 20 → 17 | 60 → 57 | 21 → 19 |
| Sandhills | 49 → 49 | 97,886 → 114,168 | 18 → 17 | 49 → 51 | 18 → 17 |
| Prairie Potholes | 56 → 58 | 115,173 → 122,625 | 16 → 17 | 57 → 56 | 19 → 18 |
| Northern Dakota | 57 → 63 | 119,948 → 135,331 | 20 → 16 | 55 → 53 | 21 → 21 |

The farm has the biggest addition at this camera, approximately 24% more triangles. It includes the rim vegetation, more standing crop and the farther grounded farm structures. Texture and geometry counts changed in both directions as the selected scenery changed. These captures cannot establish physical frame pacing or GPU memory. [15 matched gameplay comparisons](evidence/heartland/REVIEW.md) · [Frame data](evidence/heartland/matched-frames.json)

### Startup and first scene submission

This paired SwiftShader run used the same small viewport, DPR 2, seed generator and verified production startup path on a shared host.

| Launch | Ready RC.3.1 → RC.4 | Hunt input to first submission | CPU time in first render |
| --- | ---: | ---: | ---: |
| Fresh install | 16,787 → 17,013 ms | 864 → 530 ms | 295 → 295 ms |
| Cached offline reload | 15,713 → 16,122 ms | 357 → 580 ms | 58 → 507 ms |

The cached RC.4 sample had a 4,835 ms first reported presentation interval during concurrent software rendering checks. It also first submitted ten geometries and three program variants, compared with five and one in the cached baseline.

In a quieter repeat, fresh ready time was 5,411 → 4,666 ms and cached ready time was 3,875 → 2,807 ms. First submission was 127 → 68 ms fresh and 124 → 91 ms cached. The cached first presentation interval remained uneven at 21 → 920 ms. In the RC.4 interval the renderer call took about 5 ms of the 917 ms CPU workload. Named events include Fern 02 shader initialization, terrain readiness, the next Gulf tile's geometry uploads and audio decode completion. The earlier version also showed a long, fern-associated interval in its fresh run. The traces establish work coincident with these stalls. They cannot apportion driver and browser costs or establish a repeatable startup change on iPhone. Check cold, warm and offline first hunts under comparable native conditions. [Concurrent launch trace](evidence/heartland/startup.json) · [Quieter launch trace](evidence/heartland/startup-quieter.json)

### Matched offline motion and replay

The paired Chromium runs started at 180 simulated seconds and continued to 225.14 using the same 40 inputs on the 120 Hz clock. They traversed the Platte and crossed into the Sandhills. Balanced graphics stayed fixed. A reduced 0.32 emulated pixel ratio and the accelerated test clock kept these passes within the software-rendering budget. Presentation timing under this clock is synthetic.

| Observed metric | RC.3.1 | RC.4 |
| --- | ---: | ---: |
| Resident terrain tiles | 7 | 7 |
| Peak regional packs | 2 | 0 |
| Peak textures | 20 | 20 |
| Peak geometries | 86 | 87 |
| Peak draw calls | 74 | 76 |
| Peak submitted triangles | 142,803 | 175,703 |
| End-of-run programs | 27 | 26 |
| Average software CPU frame work over 210 samples | 145.75 ms | 122.71 ms |
| Worst software CPU frame work | 8,425 ms | 4,584 ms |
| Worst measured tile integration slice | 9.1 ms | 42.4 ms |

These were individual software runs with concurrent checks and substantial outliers. The large tile slice warrants a look in the native trace. A separate overloaded real-clock recording discarded 19 simulation samples in each build. The motion clip uses matching fixed-step frames to keep that host scheduling variation out of the visual comparison. Six equivalent offline Battery Saver restarts on RC.4 ended at 44 geometries, 12 textures and seven terrain tiles each, without changing the normal profile fixture. [Moving frame checks and raw samples](evidence/heartland/motion.json) · [Real-clock trace](evidence/heartland/natural-platte.json) · [Restart cycles](evidence/heartland/restarts.json)

An uninterrupted offline software run reached 120.02 simulated seconds before the long render was stopped for execution time. A separate offline fixture ran from 446 to 461.04 simulated seconds through the final territory and into Endless. It used 20 scripted inputs and peaked at seven tiles, 12 textures and 73 geometries. The initial deep-start fixture briefly had only four tiles past its two-second lookahead deadline. The settled fixture waited for the relocated tiles before releasing its clock. The initial and settled samples remain available. [Endless capture](evidence/heartland/endless-approach.webp) · [Settled run](evidence/heartland/endless-approach.json) · [Direct relocation trace](evidence/heartland/endless-relocation.json)

## Regression results

All 214 automated tests passed in GitHub Actions, including both deterministic courses, production asset integrity and all-territory terrain continuity. The new tests cover the collision-derived puddle shape, rendered-ground intersections in 45 region-and-lane combinations, and Heartland elevation and water conditions. The configured production build passed manifest and Pages subpath verification. [CI](https://github.com/bladunk/Retriever-Run/pull/43/checks)

The controlled Chromium Auto run used a 324 ms opener, then sustained pressure and controlled recovery. The rendered preset changed from Balanced to Low at about four simulated seconds, returned to Balanced at nine and reached High at thirteen and a half. Every observed step kept the full terrain atlas. Independent WebKit checks rendered all five Heartland regions at Battery Saver and High. [Auto transitions](evidence/heartland/auto.json) · [Fixed presets](evidence/heartland/webkit-presets.webp)

The production browser interrupted a fresh Labrador download, resumed with verified files, repaired a deliberately damaged asset, and reused the existing audio on update from RC.3.1 to RC.4. Two saved hunts persisted. Open Lodge and Hunt screens deferred activation. The independent WebKit Art Studio rehearsal changed the puddle lane, changed graphics, ran the camera and confirmed that the normal profile fixture was untouched. [Offline update](evidence/heartland/update.json) · [Studio isolation](evidence/heartland/studio.json)

## Art Studio and iPhone acceptance

Run `npm ci` and `npm run dev -- --host 0.0.0.0` from the Heartland branch on the same Wi-Fi as the iPhone. Replace `COMPUTER-LAN-IP` with the development computer's address. Use Play online if the local HTTP origin cannot install assets. Use the final approved HTTPS build to assess installation and offline behavior.

| View | Safari address |
| --- | --- |
| Midwest Farm Country | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=6&offset=15` |
| Platte River Valley | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=7&offset=15` |
| Nebraska Sandhills | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=8&offset=15` |
| Dakota Prairie Potholes | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=9&offset=15` |
| Northern Dakota Wetlands | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=10&offset=15` |
| Isolated puddle in heavy rain | `http://COMPUTER-LAN-IP:5173/?studio=1&perf=1&seed=7&territory=7&offset=15&hazard=puddle&lane=0&light=rain&quality=low` |

The Territory control selects any of the 15 puddle backgrounds. Use Play camera to approach the water, choose Left or Right to check an outer lane, and switch between Battery Saver, Balanced and High. The ordinary Pages build keeps the Art Studio guard.

1. Confirm the candidate build in Settings. Start an Auto hunt promptly and read the first notice. Compare the opening crispness and tree crowns with RC.3.1.
2. Approach puddles in the center and outer lanes. In rain and glare, look for the filled water edge, then jump or change lanes at ordinary speed.
3. Visit all five Heartland regions. Check farm, river and dune identity, distant scale, cattail edges, obstacle silhouettes and the Manitoba handoff.
4. Restart twice, try each fixed preset, then play on Auto. Capture a normal and a warm-device session for presentation intervals, recovered preset, terrain atlas, fern preparation and temperature by touch.
5. Verify an installed offline relaunch and submit the diagnostic JSON from Settings. The public link continues to serve the published release until an approved deployment. [iPhone diagnostic link](https://bladunk.github.io/Retriever-Run/?perf=1)

The physical checks remain open for RC.4. Northern Frontier should extend the same terrain and water foundation with true northern shorelines, varied conifers and stronger mountain layering. Living World owns crane, flock and canine animation. Gun Dog, Legacy, Masterpiece and Gold Master retain their scope. [Roadmap](PRODUCTION_ROADMAP.md#wilderness-and-artistic-release-milestones)
