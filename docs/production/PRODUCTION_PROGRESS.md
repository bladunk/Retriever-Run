# Production progress checkpoint

## Resume here

- Program target is Retriever Run 1.0 — The Great Migration. Phase 03 development version is `1.0.0-phase.3`.
- Development and rollback baseline is deployed Phase 02 `6ced9492d1f330bca91f4461dc068a035b8c6152`. Branch `codex/retriever-run-production-phase-03`. [Pages deployment](https://github.com/bladunk/Retriever-Run/actions/runs/45453881715)
- Read the [charter](PLAYER_FIRST_CHARTER.md), [architecture](ARCHITECTURE.md), [obstacle reference](OBSTACLES.md), [territory registry](TERRITORIES.md), [test matrix](PRODUCTION_TEST_MATRIX.md) and [Phase 03 report](PHASE_03_REPORT.md).
- Restore dependencies with `npm ci`. Run `npm test`, `npm run build`, `npm run verify:production`, `npm run stress`, and `npm run stress:master`. Use the report for browser and survey reproductions.

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

## Carry forward

1. Use the Phase 03 report to reproduce the review build and its rendered scenes. Gather native Phase 03 device readings and resolve warnings from an extended hunt before publication.
2. Start Phase 04 with `migration-landscapes.js`, `landforms.js` and the terrain worker habitat packet. Add wildlife placement keyed by biome, water depth and cover. Keep active collision hazards separate from background, collectible and encounter wildlife.
3. Preserve the staged recovery checks, terrain slot limits, offline hydration, historic leaderboard restriction and local record compatibility. Run all thirty stage windows whenever gameplay changes.
4. Record the approved Boyd portrait when available. Keep both rollback references and retain all saves. [Artwork pipeline](ASSET_LICENSES.md#application-icons) · [Release checklist](RELEASE_CHECKLIST.md)
