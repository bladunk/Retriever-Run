# Operation Raptor engineering review

## Review status

Draft PR [#40](https://github.com/bladunk/Retriever-Run/pull/40) is based on merged Opening Day PR #39, `62b0470cd32bbd3cacbdaac94a45a10e4905c890`. The published comparison is `1.0.0-rc.1 · 1687883`, content manifest `9672ebf8a856b0a077d2`. The configured Raptor review build is `1.0.0-rc.2 · 7db32d3`, content manifest `e2c3860892a6433038c5`. Both builds include the same public Camp configuration. No production database or competition control state was changed.

Raptor removes repeated pace integration, consolidates geometry preparation, reuses opening terrain packets, caps reusable obstacle wrappers and stages fern rendering resources. It also corrects wildlife heading, reduces hostile goose pressure in ordinary hunts, separates the adjusted course's records, restores Worldwide read compatibility and clears controls from Boyd’s portrait. An isolated Art Studio makes the real renderer accessible by territory, animal and dog.

## Architecture and lifecycle

| Finding | Change and reasoning |
| --- | --- |
| Each shipped pace lookup walked the course and each distance query re-integrated earlier stages | Direct indexing and cumulative stage distance for the fixed 15-second stages. Generic custom schedules keep the original path. Canonical replay uses unchanged fixed ticks, easing and spawn arithmetic. |
| Opening terrain repeatedly passes through the worker lifecycle | Retain four immutable seed-zero opening packets on the CPU. The active renderer still owns up to seven tile slots. The content-addressed offline store already reuses atlas bytes. Rebuilding new per-tile geometry and transferring immutable textures to WebGL are separate kinds of work. |
| Wildlife had its own scratch uploader. Ferns could first submit several resources at once | Share one 1 × 1 scratch target per renderer. Stage Fern 02 maps, mesh and representative instanced shader separately. Release the pack once its last tile and pending compile are gone. |
| Obstacle reuse could retain unnecessary wrappers after a dense sequence | Cap idle wrappers per type. Shared hazard geometry remains shared. A retired washout disposes its private ribbon. Rigs retain the existing two-model bound and bone-texture disposal. |
| The title ran the covered 3D scene between changes | Draw when terrain becomes ready, dog rig changes or viewport resizes. Keep worker traffic and small safe-period preparation alive between draws. |
| Recurring frame spikes lacked resource context | Optional named geometry, map and material/shader callbacks and disposals, correlated with territory, preparation work and frame deltas. Retain earlier export fields. Time the input handler, first submitted scene, next callback and first measured interval separately. |

The ownership map covers controls, simulation, terrain, rendering, wildlife, characters, audio, career, Lodge, offline assets, backend and diagnostics. Compatibility paths still have valid callers. No dependency was added or removed. The installed production dependency audit reported zero known advisories at review time. Existing assets, dog geometry, atlas dimensions and preset quality were retained. [Ownership map and art workflow](RAPTOR_ARCHITECTURE.md)

## Performance and resource evidence

The owner’s RC.1 iPhone Safari trace recorded 58,870 frames, 60.0 FPS, 2.72 ms average CPU, eight intervals above 50 ms and a 73 ms maximum across three different hunts at Auto detail 2. The ready marker was 688 ms. The source here is the owner’s summary. The original native per-frame samples were unavailable. [Owner-provided baseline](evidence/raptor/physical-baseline-owner.json)

| Controlled observation | RC.1 | Raptor |
| --- | ---: | ---: |
| Pace microbenchmark median, 864,000 paired lookups | 1,199 ms | 100 ms |
| WebGL draw calls behind the opaque title in a matched 2 s idle window | 72 | 0 |
| Ordered control events, 62 s coastal scene | 35 | 35 |
| End distance at tick 7,442 | 1,063.755 m | 1,063.755 m |
| Peak draws / triangles | 63 / 146,879 | 63 / 146,879 |
| Peak textures / geometries / terrain tiles | 14 / 84 / 7 | 14 / 84 / 7 |
| Installed required content | 17,447,860 B | 17,456,335 B |

The pace run times only the two functions. The idle count comes from the browser WebGL draw methods after changing both builds to Battery Saver and allowing the title to settle. [Idle draw counts](evidence/raptor/idle-rendering.json) The 62-second run uses Chromium SwiftShader, CSS viewport 320 × 568 at 0.32 device scale, seed 7, the Phase 05 course, Battery Saver and identical controls on fixed ticks. Both had installed assets and blocked external network access. It ends in Cypress. It was captured with Raptor development build `8066694`, before the menu/fern preparation split. Battery Saver does not display Fern 02. Matched render resources and distances are useful from this fixture. The accelerated clock, software renderer and shared host make its frame latency unsuitable for native comparisons. [Baseline samples](evidence/raptor/baseline-62s.json) · [Candidate samples](evidence/raptor/candidate-62s.json) · [Pace samples](evidence/raptor/course-survey.json)

### Restart residency

Both builds completed 60 controlled restarts from seed 7 at Battery Saver using the original course. The first collision was the same stream at 35.867 m every time. All settled samples in both builds reported 44 geometries and 12 textures. Warm per-hunt peaks were 47 geometries and 12 textures. Residency finished at seven tiles and zero wildlife rigs for this short low-detail route. Ordinary saves were unchanged. This controlled opener gives no evidence of a restart-driven geometry leak. It cannot isolate the cause of differing native peaks over different routes. [RC.1 raw cycles](evidence/raptor/baseline-restarts.json) · [Raptor raw cycles](evidence/raptor/candidate-restarts.json) · [Compared counts and quantiles](evidence/raptor/restarts-summary.json)

The Raptor press-to-first-submit median was 68.9 ms, with a p95 of 806.8 ms in software. The corresponding first recorded interval was 14 ms median and 508.5 ms p95. The browser runs shared CPU capacity, and the accelerated simulation is unsuitable for comparing responsiveness. In the last sample, first scene submission was 9.2 ms after the press, while the next recorded frame interval was 483.8 ms. This demonstrates why the old handler marker alone is insufficient. Raptor's final build now reads actual renderer counters at press time, including resources prepared in the title. The repeat loop ran on runtime build `1f327a9` before that diagnostic-only correction; the final High trace verifies actual counters.

### Full offline migration

Seed 7 completed the tuned local course through all 15 territories and into Endless at 451.125 simulation seconds and 11,621.553 m. The browser's network was disabled after installation. All 394 scheduled inputs executed and the trace recorded zero discarded samples. In 903 resource snapshots, the route peaked at 71 draw calls, 176,926 triangles, 121 geometries, 13 textures, seven tiles and two environment packs. Geometry settled at 116 at the end, with zero environment packs still resident. Territory diversity changes the working set while the opener is stable under repeats. This is one accelerated software-rendered route, distinct from the matched coastal comparison. The final revision changes only the pre-restart counter sample since the run. [All 15 rendered territories](evidence/raptor/full-migration.webp) · [Raw trace](evidence/raptor/full-migration.json) · [Per-territory peaks](evidence/raptor/full-migration-summary.json)

### Frame spikes and texture study

The Fern 02 GLB contains one geometry and three 1,024 × 1,024 maps. RC.1 could first draw all three maps and the geometry with the new instanced material program in one frame. That path can produce exactly the owner-reported shape. The pack's first-use structure is confirmed. Attribution of any particular iPhone frame remains open, especially in the Delta and Manitoba near habitat and wildlife transitions. The staged upload preserves normal fallback on a platform where explicit compile fails. A fast hunt can continue staging one job at a time when input is clear. That work is included in frame diagnostics. On the configured Raptor build, an actual Chromium High title trace recorded the three separately named texture uploads, one geometry upload and shader preparation before the first hunt. This demonstrates that preparation ran as intended on this path. At Hunt press, the final trace recorded 23 geometries, 21 textures and 14 programs already resident. After the first scene submission it recorded 42 geometries, 21 textures and 18 programs. This trace measures CPU-side WebGL submission on the software renderer. [Named trace](evidence/raptor/resource-trace.json)

No GPU completion time, thermal reading or reliable JavaScript GC time is available through this interface. Safari's Long Tasks absence remains visible in the export.

The existing full atlas is 2,560 × 2,048. Its 2,573,034-byte WebP represents roughly 27,962,027 bytes of RGBA storage with mips. KTX-Software 4.4.2 produced a 6,395,157-byte UASTC KTX2 (quality 1, Zstd 3, with mips) in 11.53 seconds. ASTC 4 × 4 or ETC2 RGBA at a supported GPU target would use roughly 6,990,507 bytes with mips. Those are format estimates. The test measures offline encoding and transfer size. Mobile transcode overhead, sampling seams, battery and GPU residency remain to be tested. Keep the current atlas until a representative asset proves a favorable mobile tradeoff.

Artifact verification reports 125 output files, 122 required, 17,543,150 deployed bytes and 81,774 shell bytes. The required content grew by 8,475 B. Comparing asset digests against RC.1 gives an incremental estimate of 2,014,224 required bytes plus the manifest and service worker. Existing art is reused. Bundling changes also invalidate shared JavaScript chunks. Original Boyd photographs and their metadata stay outside the published artifact. Historical exposure remains a separate owner-authorized operation.

## Wildlife and course

The renderer measures the world-space tangent between two positions on the actual travel path using a fixed origin, then turns the normalized local `-Z` nose toward that vector. The fix includes the deer’s curved exit and translates flight heading for mallard, pheasant and formation leaders. Cosmetic lower-detail sampling accumulates the real clip time. These are orientation and playback repairs. Species animation rigs and natural flock choreography remain Living Wilderness work.

The revised local director adds an eight-second minimum separation and schedules fewer hostile attacks. Across 128 paired 15-minute courses, attacks fell from 12,434 to 7,764 (37.6%). Endless alone fell from 7,720 to 4,775 (38.1%). Minimum attack separation went from 2.431 s to 8.001 s. The ambient encounter planner and scoring remain shared. The new `migration-30-raptor` key keeps adjusted local records separate. Signed `great-migration-1` tickets still use `migration-30-phase-05`. Existing profiles, Lodge, archived records and earned equipment retain their contracts. [Stage-by-stage survey](evidence/raptor/course-survey.json)

## Art Studio and visual preservation

The studio works in Vite development and explicit `art-studio` builds. Choose all 15 territory starts, seed, graphics, camera position and speed. Inspect available species in movement or flock presentation with the existing rig or fallback. Pick any dog and the available idle, locomotion, jump, slide, land and retrieve playback. Open the real Kennel for attached equipment. Lighting follows the route clock. A separate studio build is required for remote review. The ordinary release ignores the query, and there is no normal save, award or Camp submission path in the preview. Future assets still need dedicated takeoff, landing, axes overlay, independent weather and Lodge staging. [Exact iPhone and LAN instructions](RAPTOR_ARCHITECTURE.md#art-studio-on-an-iphone)

Boyd’s approved artwork is unchanged. The redundant upper brand was removed and controls moved beneath Hunt and navigation. Confirmed title layout at 320 × 568 and 430 × 932 in Chromium and WebKit. [Small title](evidence/raptor/title-320-pair.webp) · [Large title](evidence/raptor/title-430-pair.webp) · [Studio territory](evidence/raptor/boreal-studio.webp) · [Studio deer fallback](evidence/raptor/deer-studio.webp) · [Studio Boyd](evidence/raptor/boyd-studio.webp)

[Gulf pair](evidence/raptor/journey-gulf-pair.webp) · [Cypress pair](evidence/raptor/journey-cypress-pair.webp) · [End of matched route](evidence/raptor/soak-finish-pair.webp)

## Worldwide compatibility

The hosted Phase 09 score RPC returned HTTP 200 and a closed empty board; the combined standings call returned HTTP 404 with `PGRST202`. Its HTTP schema does not resolve `rr_worldwide_standings(p_offset)`. The public response does not establish whether the function is missing in PostgreSQL or whether the schema cache is stale. Raptor automatically shows authoritative official scores if the combined function is unavailable. It identifies the four unavailable independent bests, preserves the official rank and does not use fallback on permission or general network errors.

Run the read-only SQL Editor checks first. Apply only the Opening Day additive standings SQL if the function is missing, or restore the named grant and refresh schema if indicated. Phase 09 requires no reinstallation. The combined SQL reads independent bests and exposes no authentication or private Camp data. Hosted Edge replay acceptance and opening competition remain separate owner operations. [Observed public responses](evidence/raptor/hosted-read.json) · [Portrait comparisons using isolated records](evidence/raptor/worldwide-test-pair.webp) · [SQL and owner procedure](RAPTOR_WORLDWIDE.md)

## Regression and release gates

- All 203 automated tests passed. The suite covers deterministic timing, save compatibility, game lifecycle, ranked replay, SQL authorization, offline cache integrity, progression, presentation and focused Raptor regressions.
- The tuned course passed 10,000 seeded hunt sessions and 100,020 obstacle viability windows. The unchanged ranked ruleset replay accepted three independent deterministic result sets through 451.687, 601.631 and 862.124 seconds. [Hunt sweep](evidence/raptor/field-stress.json) · [Course windows](evidence/raptor/master-stress.json) · [Long ranked replays](evidence/raptor/ranked-replay.jsonl)
- Opening Day's isolated GoTrue, PostgREST and PostgreSQL identity/authorization evidence remains relevant because the verifier, combined SQL and database policies are unchanged. Raptor ran PostgreSQL-backed tests and read both HTTP APIs against that disposable stack. The three retained replay fixtures returned scores of 95, 75 and 35 in order, with no identity fields in the response rows. Live access was read-only. [Current isolated PostgREST reads](evidence/raptor/isolated-postgrest-reads.json) · [Opening Day verifier evidence](OPENING_DAY_REPORT.md)
- Chromium checked both title sizes and a Studio territory, deer and dog. The documented Vite URL also opened the isolated preview with all 15 territory options. WebKit checked both title sizes. The Chromium service worker rehearsal recovered an interrupted install, repaired corrupted content, preserved the seeded save and prevented activation during a hunt or in the Lodge. [Chromium](evidence/raptor/review-chromium.json) · [WebKit](evidence/raptor/review-webkit.json) · [Upgrade results](evidence/raptor/upgrade.json)
- Native iPhone FPS, frame pacing, shader and texture behavior, long-session memory and Safari background recovery remain owner acceptance gates.

### Physical iPhone review

1. After authorized publication, open [the native trace link](https://bladunk.github.io/Retriever-Run/?perf=1&resources=1). Confirm RC.2. In Settings open Developer performance, tap Capture performance report and copy the JSON. Save a clean Safari open and a warm app relaunch. Repeat once from the Home Screen.
2. With the same graphics preset as the baseline, start promptly and record three restarts. Include one after leaving the title idle. Observe the first visible frames and export the restart trace. Track input to first scene submission alongside the next recorded interval.
3. Play through Gulf, Cypress, the Delta and Manitoba. Capture a deer exit, hostile geese and normal ambient flocks. Compare the new named resource events against frames over 50 ms. If the new trace calls out a different asset, keep the original JSON with the build and graphics preset.
4. Revisit the same opening territory repeatedly, then play a sixty-minute mixed route. Compare stationary counts and releases at identical distances. The older native peaks of 125, 133 and 142 geometries covered different routes and cannot determine whether a leak exists.
5. Confirm Worldwide opens from the title and reports the real closed state. After the additive API is present, verify all independent columns. Launch remains gated on separate hosted replay acceptance and owner approval.

The foundation supports the next focused Living Wilderness changes. This review does not certify native frame targets, sixty-minute physical residency, or the hosted verifier for competition launch. Keep the existing release and production data intact until the separate review gates are satisfied. [Draft review and CI](https://github.com/bladunk/Retriever-Run/pull/40/checks)
