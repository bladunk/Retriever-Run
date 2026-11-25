# Production progress checkpoint

## Resume here

- Active checkpoint is Phase 06 owner review on `codex/retriever-run-phase-06` from integrated Cypress commit `db2565afcc30283b23ab9ac5a246feb36fc53b18`. Public baseline was Phase 05.3A `0ab92b0`. Review candidate `1.0.0-phase.6 · d4be70e`, manifest `53197ea0a3a7f57920ae`. [Draft PR #34](https://github.com/bladunk/Retriever-Run/pull/34) · [Phase 06 report](PHASE_06_REPORT.md)
- Phase 06 adds the 100-level career, 621 local Field Honors, 25 pending Camp entries, Journal collections, 151 earnable wardrobe options and automatic Boyd qualification. The version 5 Lodge save retains prior progress. The owner accepted the Cypress showcase and reserved remaining environment and character art for the late visual-polish phase.
- Review the portrait evidence and repeat the acceptance checklist on iPhone before approving. Next development phase is 07 after review. No merge, deployment, database migration or reset was performed.

## Implemented in Phase 01

- Small bootstrap with install manifest, original temporary icon, optional installation UI, safe-area dialog and progressive game import.
- Emitted schema-1 content inventory and project-scoped caches with per-file SHA-256, real byte counts, explicit downloads, file-level retry, integrity repair and unchanged-file reuse.
- Offline launch and solo progression, atomic save snapshots with local backup, future-version protection, ranking eligibility through the existing server-issued ticket boundary, and a safe waiting-worker protocol for open game tabs.
- Pooled territory resources, cached tile preparation ahead of the player, release after the last referencing tile, and a bounded localhost diagnostics probe.
- Independent ambience and wildlife mix, optional haptics and Wake Lock, suspension recovery, a bounded reward notice queue, and five sourced Field Notes.
- Recurring checks for build integrity and playback regressions, plus documented thresholds and legal asset intake.

## Implemented in Phase 02

- Swept geometry follows the new supported left-jump, center-slide, right-run tree, plus solid roots, ground logs and driftwood. The old wide branch is retired. Only goose hazards move independently. Decorative signs remain rate-limited and now use a shorter subset.
- The 120 Hz movement contract uses a critically damped lateral spring and independent steering and vertical buffering. Swipe sensitivity is local, backwards-compatible and adjustable.
- Twenty shipped stages preserve the ten-territory sequence and timing. Timed chutes, narrow switch-and-slide routes, validated high-value branches, multi-route recovery, deterministic pattern IDs and a configurable stage table provide the gameplay contracts for the next territory pass.
- Ruleset `gameplay-phase-02` is local-only. Camp keeps previous standings, authentication, and valid old permit receipts. Bind a future ranked season to its own reviewed ruleset before re-enabling new ranked hunts.

The Phase 02 review build passed 126 Node tests, 10,000 fixed-step runs and 100,000 difficulty windows. Independent Chromium and WebKit checks cover rendered obstacle actions and the Phase 01 offline/update path. Follow the report for actual evidence, approximate collision bounds, and native-device work.

## Implemented in Phase 03

- Fifteen habitats, thirty stages, 7:30 primary duration and endless northern wilderness. Stage, territory, and record labels use the new route. Phase 03 hunts remain local, and the version-4 save preserves Phase 02 and earlier history.
- Curved Cypress slide timber with a rooted support and shared swept volume. Existing signature route remains left jump, center slide and right run. Parked snowmobile is eligible in the final two territories.
- Geo-specific landforms, foliage, water and landmarks. Bounded streamed terrain recycles generated assets and shares existing decoded cards and atlases. Future habitat spawning can consume `migration-landscapes.js` and tile packet metadata.

Phase 03 passed 131 Node tests, 10,000 full stress sessions, and 100,020 route windows. The report links rendered views of all 15 territories, the 14 boundaries, endless entry, and the Phase 02/Cypress comparison. The owner reported positive iPhone play and reached Stage 19, and reported a building presentation issue addressed in Phase 03B.

## Implemented in Phase 03B

- Fixed screen-space breakup by separating opaque landmark geometry from ground-cover fades. A tile owns the stream geometry. Shared material and model assets retain their separate lifetimes.
- Added twenty verified CC0 surface sources, two offline atlas sizes, and one active rendering variant. The scans inform each trail, bark, regional structures, roadside stone and submerged sand.
- Added roof assemblies, log walls, porch braces, tractor and snowmobile finishes, forest silhouettes, water character and stable mountain relief. Increased High geometry and water effects within the existing quality architecture.
- Preserved Stage 1–30 and endless timing, obstacle decisions, the supported-tree and center-slide geometry contracts, v4 saves and the local-only Camp gate. Added 35 sourced notes to the existing loading UI.

The review build passed 134 Node tests, 10,000 seeded hunts, 100,020 difficulty windows, all rendered borders and a 62-second offline WebKit soak. Chromium passed graphics switching and activated the real Phase 03 update after a paused hunt finished. The report and evidence document the software host and remaining physical iPhone review. [Phase 03B implementation report](PHASE_03B_REPORT.md)

## Phase 04 checkpoint

- Baseline build and all 134 tests were verified from the deployed Phase 03B merge. The owner reported 5:52, 30,040 points, 573 treats and seven retrieves at Stage 24, ending at an uprooted tree. The owner asked to retain the balance and reported stutters, soft sign text, blue-strip crossings and narrow tall sheds.
- Terrain packets now carry worker-computed bounds. The main thread integrates ground and water, trees, crops and plants, then publishes the finished tile. The previous route and swept collisions remain.
- The new Phase 04 art uses region-tinted crossings, a replacement continuous root plate with the prior collision volumes, higher-resolution sign lettering and wide low sheds. Platte banks and the Midwest farm layout are retained.
- Encounter habitat tables, four named tiers, new four animated models, Fern 02 and verified recordings are integrated. The nested official Journal tracks observations and retrieves separately without awarding gameplay credit. The baseline and review artifact paths are recorded in the report.
- Runtime review build `98d7cfa5f1b6a962443c` is on `codex/retriever-run-phase-04` and was produced at runtime commit `7c0d798`. The phase was merged via [PR #28](https://github.com/bladunk/Retriever-Run/pull/28). Both software browsers verified offline recovery, play and Kennel selection. The 140 tests, both stress suites, all 15 rendered checkpoints, 14 borders and endless entry passed. The final rendered accelerated offline run reached 466.14 seconds with peak geometry residency down from 136 to 115. The new Journal test recorded a real Mallard sighting and displayed it after offline reload. See the [Phase 04 report](PHASE_04_REPORT.md), [wildlife registry](LIVING_WILDERNESS.md) and [capture index](evidence/phase-04/README.md).

## Phase 04.1 checkpoint

- The owner’s Phase 04 iPhone run averaged 59 FPS in the rolling window and reported a 30 ms p99, four intervals over 50 ms and 37 current textures. Phase 04.1 releases wildlife bone textures and replaced material placeholders, avoids duplicate gameplay canvas resizes and paints pooled signs ahead of their first draw.
- The `?perf=1` report adds bounded slow frames, operation context and separate rolling, hunt and page-session summaries. All 142 tests passed and the matched Chromium replay stayed at 13 textures after five retirements. Verified build `1c6287a852731c75069d` is the owner review candidate in [draft PR #29](https://github.com/bladunk/Retriever-Run/pull/29). See the [Phase 04.1 report](PHASE_04_1_REPORT.md) for measurements and the iPhone retest. The next major phase is Working Dogs & Boyd.

## Carry forward

1. Use the Phase 03B report to reproduce the build and render captures. Test native graphics presets and a continuous hunt on iPhone before publication, paying attention to building approach and departure, atlas switches, and terrain visibility.
2. Finish owner review of Phase 04.1. Capture native `?perf=1` traces for the same route and for repeated hunts. Use the [Phase 04.1 report](PHASE_04_1_REPORT.md) to distinguish mobile browser checks from native timings. Keep active hazards separate from ambient wildlife and Journal encounters.
3. Preserve the staged recovery checks, terrain slot limits, offline hydration, historic leaderboard restriction and local record compatibility. Run all thirty stage windows whenever gameplay changes.
4. Record the approved Boyd portrait when available. Keep both rollback references and retain all saves. [Artwork pipeline](ASSET_LICENSES.md#application-icons) · [Release checklist](RELEASE_CHECKLIST.md)
