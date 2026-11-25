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
