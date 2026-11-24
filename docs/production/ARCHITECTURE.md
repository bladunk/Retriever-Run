# Production architecture

## Boundaries

The static Pages site retains Vite, Three.js, the fixed-step runner, and the Supabase Worldwide Camp adapter. The HTML shell starts in `production-entry.js`. It imports the game only after an existing pack passes verification or the player chooses to download or play online. Browser environments that block Service Workers can continue online. Auth data and permanent saves are independent of the content caches.

`build/offline-worker.js` generates a schema-1 manifest from emitted bytes. Each logical asset has an ID, URL, release membership through the manifest version, group, required flag, dependency IDs, a quality variant slot, exact decoded byte length, SHA-256, license reference, and cache policy. Groups may identify any number of territory keys. The current content has one optimized variant per asset. A future asset variant resolver should select an allowed quality set before dependency expansion and retain a universal fallback. The required dependency graph is the smallest complete offline edition of the current ten-territory game. The small collision diagnostic chunk is optional.

## Preparation and offline operation

The worker installs the shell, manifest and application icons. Full game transfers begin after the player’s action. The content store checks SHA-256 and length, ingests a file only after verification, and keys it by digest in a cache scoped to the project URL. Existing releases and matching legacy Pages cache entries can supply unchanged bytes. Loading reads count real decoded response bytes. Total size excludes HTTP headers, transport compression variance and browser storage overhead. Failed files retry twice with short backoff. Returning after a failure or reload rechecks the cache and starts with the missing or damaged assets. Resume is at file level.

After successful preparation a controlled launch can work from Cache Storage with a disconnected network. The on-disk manifest belongs to the worker that served the HTML. The service worker handles only same-origin GETs for explicit static URLs, the manifest and the project navigation, and excludes requests carrying authorization, API-key or range headers. It never handles Supabase hosts or writes to localStorage. Downloading never requires a Supabase query. Browser eviction may require reconnecting to repair content.

Ordinary solo gameplay, achievements, equipment, Journal and Kennel use local state. Production ranked eligibility requires a verified pack and a connection when starting, plus the existing server-issued permit and unchanged server enforcement. A connectivity loss during the hunt makes that hunt local. Previously verified pending submissions keep their existing receipt handling. Future noncompetitive cloud progression and conflict reconciliation can be implemented separately from ranked submission. This phase keeps ordinary local progress on the device.

## Updates and saves

The active worker keeps its HTML and manifest coherent across a deployment. Waiting workers expose the candidate manifest. The player prepares missing content and applies it at a menu boundary. Every open game tab must acknowledge the switch and temporarily block starting a hunt. Active and paused hunts reject an update. After activation the agreeing tabs reload into the new worker. Old releases can keep valid bytes for one rollback generation. Pruning is scoped to known releases and never touches player storage, unrelated caches, or a partial manifest. The pre-Phase-01 worker cannot acknowledge this protocol. Its first upgrade uses the browser’s legacy activation boundary after those old tabs close.

The existing version-3 Lodge save keeps explicit legacy normalization and one-key atomic writes. A previous validated snapshot is written to a separate backup key before replacement. Invalid primary records can load that backup. An unknown future version is left intact. Practice has its own keys. Finished runs use the existing monotonic ID and reward guard. A reload discards temporary run state. Backgrounding and context recovery preserve a paused run in memory. Concurrent editing of one local profile in multiple tabs still uses last-writer behavior. Cloud backup, cross-tab save arbitration, and the official reviewed reset belong to later work.

## Rendering and mobile lifecycle

Terrain already uses seven streaming tile slots and a worker with a main-thread fallback. Instances, pooled objects, baked materials, and adaptive display cadence keep work bounded. The resource pool memoizes each decoded optional habitat pack, frees GPU objects once its last tile is replaced, and disposes late loads after release. Preparation starts up to 320 metres ahead. Individual tiles retain the chosen geometry for their lifetime, avoiding mid-tile model swapping. Procedural geometry supplies a continuous fallback. Weather, procedural wildlife and horizon artwork retain their previous streaming model.

Battery Saver, Balanced, High and Adaptive use the existing framebuffer limits, geometry and particle detail, and frame-time hysteresis. Fixed-step simulation and content reach are shared. Background and WebGL loss pause the game. The fixed clock resets on suspension, context restore and page return. Wake Lock is opportunistic and released outside active, visible hunts. The viewport uses safe-area offsets and supports scaling in menus. Additional haptics are opt-in. Environmental audio, wildlife calls, music and gameplay effects use independent controls.

The localhost-only `?perf=1` probe uses a bounded frame ring, actual renderer counters and territory records. Collision practice remains the existing isolated developer path. Local test measurements are software-renderer observations. [Performance budget](PERFORMANCE_BUDGET.md)

## Phase 02 gameplay contract

Course rows have stable per-seed ordinal and pattern IDs. The planner reserves reaction and movement setup from every advertised exit. It samples action timing with the same swept solver used at 120 Hz in play. It substitutes a recovery row when a candidate misses the budget. A handcrafted route references its required action and clearance geometry. Replay campaigns supplement the local per-row solver, which is a guaranteed-route test with bounded timing variation.

Collision poses and the Labrador rig share analytic jump height and a smoothed slide depth. Lateral steering uses the same critically damped spring in the game and the lane budget calculation. The breed and equipment are presentation choices. Sources for the supported tree, roots and ground timber produce both the artwork and swept hulls; smaller scenic remnants remain cosmetic.

Phase 02 plays locally because the live Camp course contract predates the new risk routes. The older standings and previously granted receipt paths remain available. Eligibility now checks the release ruleset before requesting a permit. Keep future ruleset identifiers aligned with a reviewed and isolated server season. [Obstacle reference](OBSTACLES.md) · [Phase 02 report](PHASE_02_REPORT.md)
