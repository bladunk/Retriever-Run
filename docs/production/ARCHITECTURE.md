# Production architecture

## Boundaries

The static Pages site retains Vite, Three.js, the fixed-step runner, and the Supabase Worldwide Camp adapter. The HTML shell starts in `production-entry.js`. It imports the game only after an existing pack passes verification or the player chooses to download or play online. Browser environments that block Service Workers can continue online. Auth data and permanent saves are independent of the content caches.

`build/offline-worker.js` generates a schema-1 manifest from emitted bytes. Each logical asset has an ID, URL, release membership through the manifest version, group, required flag, dependency IDs, a quality variant slot, exact decoded byte length, SHA-256, license reference, and cache policy. Groups may identify any number of territory keys. The current content has one optimized variant per asset. A future asset variant resolver should select an allowed quality set before dependency expansion and retain a universal fallback. The required dependency graph is the smallest complete offline edition of the current fifteen-territory game. The small collision diagnostic chunk is optional.

## Preparation and offline operation

The worker installs the shell, manifest and application icons. Full game transfers begin after the player’s action. The content store checks SHA-256 and length, ingests a file only after verification, and keys it by digest in a cache scoped to the project URL. Existing releases and matching legacy Pages cache entries can supply unchanged bytes. Loading reads count real decoded response bytes. Total size excludes HTTP headers, transport compression variance and browser storage overhead. Failed files retry twice with short backoff. Returning after a failure or reload rechecks the cache and starts with the missing or damaged assets. Resume is at file level.

After successful preparation a controlled launch can work from Cache Storage with a disconnected network. The on-disk manifest belongs to the worker that served the HTML. The service worker handles only same-origin GETs for explicit static URLs, the manifest and the project navigation, and excludes requests carrying authorization, API-key or range headers. It never handles Supabase hosts or writes to localStorage. Downloading never requires a Supabase query. Browser eviction may require reconnecting to repair content.

Ordinary solo gameplay, achievements, equipment, Journal and Kennel use local state. Production ranked eligibility requires a verified pack and a connection when starting, plus the existing server-issued permit and unchanged server enforcement. A connectivity loss during the hunt makes that hunt local. Previously verified pending submissions keep their existing receipt handling. Future noncompetitive cloud progression and conflict reconciliation can be implemented separately from ranked submission. This phase keeps ordinary local progress on the device.

## Updates and saves

The active worker keeps its HTML and manifest coherent across a deployment. Waiting workers expose the candidate manifest. The player prepares missing content and applies it at a menu boundary. Every open game tab must acknowledge the switch and temporarily block starting a hunt. Active and paused hunts reject an update. After activation the agreeing tabs reload into the new worker. Old releases can keep valid bytes for one rollback generation. Pruning is scoped to known releases and never touches player storage, unrelated caches, or a partial manifest. The pre-Phase-01 worker cannot acknowledge this protocol. Its first upgrade uses the browser’s legacy activation boundary after those old tabs close.

The version-4 Lodge save keeps explicit legacy normalization and one-key atomic writes. A previous validated snapshot is written to a separate backup key before replacement. Invalid primary records can load that backup. An unknown future version is left intact. Practice has its own keys. Finished runs use the existing monotonic ID and reward guard. A reload discards temporary run state. Backgrounding and context recovery preserve a paused run in memory. Concurrent editing of one local profile in multiple tabs still uses last-writer behavior. Cloud backup, cross-tab save arbitration, and the official reviewed reset belong to later work.

## Rendering and mobile lifecycle

Terrain already uses seven streaming tile slots and a worker with a main-thread fallback. Instances, pooled objects, baked materials, and adaptive display cadence keep work bounded. The resource pool memoizes each decoded optional habitat pack, frees GPU objects once its last tile is replaced, and disposes late loads after release. Preparation starts up to 320 metres ahead. Individual tiles retain the chosen geometry for their lifetime, avoiding mid-tile model swapping. Procedural geometry supplies a continuous fallback. Weather, procedural wildlife and horizon artwork retain their previous streaming model.

Battery Saver, Balanced, High and Adaptive use the existing framebuffer limits, geometry and particle detail, and frame-time hysteresis. Fixed-step simulation and content reach are shared. Background and WebGL loss pause the game. The fixed clock resets on suspension, context restore and page return. Wake Lock is opportunistic and released outside active, visible hunts. The viewport uses safe-area offsets and supports scaling in menus. Additional haptics are opt-in. Environmental audio, wildlife calls, music and gameplay effects use independent controls.

The localhost-only `?perf=1` probe uses a bounded frame ring, actual renderer counters and territory records. Collision practice remains the existing isolated developer path. Local test measurements are software-renderer observations. [Performance budget](PERFORMANCE_BUDGET.md)

## Phase 02 gameplay contract

Course rows have stable per-seed ordinal and pattern IDs. The planner reserves reaction and movement setup from every advertised exit. It samples action timing with the same swept solver used at 120 Hz in play. It substitutes a recovery row when a candidate misses the budget. A handcrafted route references its required action and clearance geometry. Replay campaigns supplement the local per-row solver, which is a guaranteed-route test with bounded timing variation.

Collision poses and the Labrador rig share analytic jump height and a smoothed slide depth. Lateral steering uses the same critically damped spring in the game and the lane budget calculation. The breed and equipment are presentation choices. Sources for the supported tree, roots and ground timber produce both the artwork and swept hulls; smaller scenic remnants remain cosmetic.

Phase 02 plays locally because the live Camp course contract predates the new risk routes. The older standings and previously granted receipt paths remain available. Eligibility now checks the release ruleset before requesting a permit. Keep future ruleset identifiers aligned with a reviewed and isolated server season. [Obstacle reference](OBSTACLES.md) · [Phase 02 report](PHASE_02_REPORT.md)

## Phase 03 environment and migration

`migration-landscapes.js` owns the territory catalog, look development data and habitat descriptions. `landforms.js` evaluates ground outside the active lanes at continuous coordinates. Neighboring terrain packets share analytic height samples, while deterministic decoration varies independently by tile and run seed. The worker ignores stale seed or index packets. Terrain holds seven slots and shares the authored geometry, materials and optional decoded vegetation packs. Distant mountain layers have independent coordinates and a geography gate. The active route never fetches a new territory download.

Schema 4 archives the old ten-territory ledger and tags local leaderboard entries with their course. Historical lifetime statistics, patches and equipment remain in the profile. The network ruleset match still rejects new ranked eligibility. [Territories](TERRITORIES.md) · [Phase 03 report](PHASE_03_REPORT.md)

## Phase 03B scenery and surface ownership

A terrain packet has independent opaque scenery, low-detail ground cover, ground and water geometry. The tile slot owns those four buffers. It releases a previous buffer only when replacing its own packet. Shared materials and instanced geometry belong to separate registries. Solid props retain the same geometry through approach, pass and departure. The optional screen-door treatment is confined to low ground details and crop blades. Solid scenery uses the scene's distance haze at the far rendering edge. The slot remains available for one full tile behind the runner before reassigning it ahead.

The verified offline pack contains two quality variants of one atlas shared across territories. Both are downloaded together so the settings work offline. The renderer decodes one variant at a time, holds the previous valid texture while loading, and releases it after binding the replacement. Stale asynchronous completions are discarded. Atlas cells use padded UVs and controlled mip footprints. High requests more detailed tree geometry for incoming tiles and additional water detail. Current tiles retain their selected tree mesh until recycled. A mountain mesh choice is made on entry before the layer becomes visible. Terrain, hazard geometry, scoring, rule data and save schema use the same contracts as Phase 03.

## Phase 05 working dogs and presentation resources

The 120 Hz physics contract remains breed- and equipment-independent. The player loads one skinned rig and moves it between the trail and Kennel scenes. Coat colors are shader parameters over a shared embedded map. Fitted clothing samples the model's unanimated bind coordinates, copies skin weights and attaches to the same skeleton. Legacy equipment identifiers and profile ownership persist. The Pointer is a localhost practice option. Boyd is represented by a locked career entry pending an approved likeness.

The wildlife staging layer reserves at most two slots across decoded models and any in-flight load. It warms models during the title, a visible pause, and Hunt Over. Opening or contextual rigs are reused across hunts where possible. Assembly waits for a safe break if decoding completes during a hunt. The warmup initializes textures and bone textures, compiles scene-compatible shaders, and uploads one geometry at a time. Eviction releases geometry, materials, textures, unique image handles and skeletons. A rig attached to a frozen scene stays pinned. An encounter picks its prepared model or lightweight fallback at entry and keeps it through departure. The next safe break can prepare a missed model for the next encounter or replay. Saves and collision use independent gameplay events.

The package version and short hash of build inputs are embedded in the running JavaScript and published as optional schema-1 manifest metadata. Client labels use the running bundle's metadata. The waiting worker returns a separate pending build label without affecting the active game.
