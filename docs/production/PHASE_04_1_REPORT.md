# Phase 04.1 · Targeted performance polish

The baseline is merged Phase 04, commit `2f7875aaf36d7df6fa2f6b24ac9e132457e3f58e`. The verified live content version was `d492efd2fef0eef77533`. A local build without the deployment’s Camp configuration produced `98d7cfa5f1b6a962443c` and passed all 140 tests. Phase 04.1 uses the isolated branch `codex/retriever-run-phase-04-1`. [Baseline deployment](https://github.com/bladunk/Retriever-Run/actions/runs/45527749359)

## Owner’s iPhone baseline

The owner recorded 29,008 frames. The last 720 presentation samples averaged 59 FPS, with 17 ms median, 18 ms p95, 30 ms p99 and a 95 ms maximum. Four intervals exceeded 50 ms. Reported CPU work averaged 2.6 ms and peaked at 82 ms. Recent tile integration slices were 0–1 ms. Startup readiness was 924 ms and the internal restart marker was 87 ms. In Northern Dakota Wetlands, Auto showed 69 draws, 109,784 triangles, 37 textures, 104 geometries, seven tiles, two habitat packs and the 2560 × 2048 atlas. The atlas estimate was 26.67 MiB with mipmaps. There were four adaptive changes. Long Tasks was unavailable.

## Findings and corrections

| Path | Finding and change |
| --- | --- |
| Wildlife retirement | Three.js lazily creates a bone texture for each rendered skeleton. The previous wildlife teardown released materials, geometry and material maps while leaving skeleton textures allocated. Retirement now disposes each unique skeleton and closes shared decoded images once, after releasing their textures. The report lists model and bone textures and a running count of retired bone textures |
| Terrain material startup | The four field material maps initially share two placeholder textures. A separate placeholder backs the surface atlas. The placeholders can remain in Three's texture count after their replacement. The code now disposes them after their last reference is replaced. These are bounded startup allocations and differ from the per-rig retention |
| Drawing-buffer size | Three's `setPixelRatio()` already calls `setSize()`. The old gameplay resize path then called `setSize()` again. It now applies one size change only when the logical size or pixel ratio differs. Target resolution and the Auto selection rules are the same |
| Signs | A pooled sign previously painted its canvas on its first eligible draw. The same sign art and canvas are now prepared up to 40 m before the existing draw boundary when the tile is ready. Existing sign distance, placement and texture resolution are retained |
| Terrain, shaders and audio | The four terrain integration slices remain intact. The opt-in trace records territory boundaries, worker fallback, long integration slices, completed tiles, habitat operations, atlas switches, audio initialization and decode, wildlife preparation and release, and quality changes. Shader-program, geometry and texture count deltas are useful clues. They do not isolate GPU compilation, uploads or garbage collection |

The owner's one texture sample cannot be decomposed retrospectively. It can contain active material and shader-uniform maps, the Lab and active wildlife bone textures, habitat atlases, signs and any allocations left by prior draws. The old lifetime defect provides a mechanism for growth. The software replay reproduces and measures that retention under controlled conditions. The physical iPhone still needs a fresh trace to establish how much of its 37 textures came from that path or another cache.

## Reading the opt-in report

Open the review build with `?perf=1`. In **Field settings → Developer performance → Capture performance report**, copy the report after a long frame and again after several Hunt Over replays in the same page. The top-level percentiles describe recent rolling samples. `hunt` is the current or most recent hunt, `previousHunts` contains up to five earlier summaries, and `session` accumulates counts, averages, maxima and resource peaks until reload. Pausing resets the presentation interval anchor. Whole-hunt CPU statistics include rendered callbacks with unusable simulation deltas. The legacy engine interval window still rejects deltas over 350 ms.

`slowFrames` keeps the latest 48 intervals over 50 ms or callbacks over 16.7 ms. Entries include JS render submission time, territory, graphics detail, resource counts, count changes and up to 12 nearby operations. Operation timestamps share the `performance.now()` clock. Asynchronous load and decode durations include waiting time. Timestamps describe nearby operations. A presentation interval measures the spacing between completed renderer calls.

The application collects these traces only with `?perf=1`. The live asset and terrain snapshots are assembled on report request. A synthetic Node sample of 100,000 steady frames took about 24 ms for the probe’s `frame()` bookkeeping, excluding browser integration and report formatting. This is a Node bookkeeping sample.

## Before and after in Chromium

Five same-page replays followed seed 1 through the same skinned mallard encounter in a 320 × 568 software-WebGL viewport. Each sample was taken after the mallard retired, at the same point on the route. The test used a controlled simulation clock.

| Sample | Phase 04 | Phase 04.1 |
| --- | --- | --- |
| Textures after the five retirements | 14, 15, 16, 17, 18 | 13, 13, 13, 13, 13 |
| Geometry count after each retirement | 49 | 49 |
| Five observed bone texture releases | Untracked | 5 |
| Last sample’s draw calls / triangles | 55 / 129,427 | 55 / 129,427 |
| Last sample’s largest resident-tile slice | 1.2 ms | 0.4 ms |
| Last sample’s recent CPU work, median | 2.6 ms | 2.2 ms |
| Last sample’s recent submission interval, median / p99 | 376.2 / 2,069.8 ms | 324.3 / 1,124.8 ms |
| Initial readiness marker | 7,134.5 ms | 2,998.4 ms |
| Internal restart markers on replays 2–5 | 9.5–24.8 ms | 12.7–23.6 ms |

The resource counts reproduce the retention and show its removal. Host contention and the replay harness affect these timings. They cannot establish a device speedup from the patch. In a separate WebKit Auto sample, the trace recorded a long renderer call immediately after the compact atlas switched in. The resource count stayed flat on that frame. This narrows investigation to first use and renderer submission for that sample, with the cause on iPhone still open. Early sign rasterization spreads work before first use. Wildlife models continue to decode ahead through the existing lookahead window.

## Verification

- The matched replay command was `node scripts/phase-three-browser.mjs small texture-replays`. The candidate passed `expect-bounded` against its built artifact. It retired the GLB entirely on all five hunts and kept the session and hunt counters distinct.
- The mobile-sized WebKit offline run retried a partial install, loaded offline, completed a hunt, resumed after a visibility change, and opened the existing Field Journal and last Kennel card. The automated harness measured 283 ms from replay input to the first running callback on that sample.

- A 2× mobile viewport in WebKit switched live through Balanced, High, Battery Saver and Auto. The quality trace showed one drawing-buffer resize at each changed ratio, 1.22, 1.57, 0.86 and 1.22. The full, compact and restored full atlases appeared at the expected settings.
- The Chromium update and repair test recovered a corrupt cached asset, preserved both completed hunts and the settings after activation, and reused unchanged audio. A paused hunt blocked activation until its result was saved.
- `npm test` passed 142 tests. New regressions exercise shared bone texture retirement, event-history bounds, pause exclusion, and hunt versus session totals. The existing sign test now verifies early painting and unchanged visibility.
- `npm run build` and `npm run verify:production` produced `1c6287a852731c75069d`. The artifact is 7,499,203 bytes versus 7,495,289 before. Model, texture and audio files retain their original digests. Dependency versions are unchanged. The bundle grows by 3,914 bytes, with 440,607 bytes of changed required files when upgrading from a complete Phase 04 cache.
- The built site rendered seeded Cypress, Mississippi Delta and Northern Dakota boundaries in Linux WebKit at 320 × 568. The six captures used seven tiles, 12–13 textures and 1–3 ms maximum visible-tile integration slices per checkpoint. These are software-browser samples.

## Owner iPhone retest

1. Open the approved review build with `?perf=1` and select Auto. Play the same route toward Northern Dakota Wetlands. Capture the report using **Field settings → Developer performance** as soon as a noticeable hitch occurs.
2. Replay five hunts in the same page. Capture another report and compare each hunt’s texture peak, the live texture count after a wildlife retirement and the session’s `releasedBoneTextures` in `wildlifeModels`.
3. Compare rolling p99, counts over 50 ms, startup readiness and replay latency against your Phase 04 trace. If a spike recurs, include the `slowFrames` item with its operations and region.

Native 60 FPS consistency and the 20 ms p99 target remain open. Phase 05 remains Working Dogs & Boyd.
