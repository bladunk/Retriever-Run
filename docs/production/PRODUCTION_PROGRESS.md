# Production progress checkpoint

## Resume here

- Program target is Retriever Run 1.0 — The Great Migration. Phase 02 development version is `1.0.0-phase.2`.
- Development baseline and rollback point are the deployed Phase 01 merge `3fb4c4f9e8eb300e622149a297ff2bbfa26446e8`. Development branch `codex/retriever-run-production-phase-02`. [Successful Pages deployment](https://github.com/bladunk/Retriever-Run/actions/runs/45423302775)
- Read the [charter](PLAYER_FIRST_CHARTER.md), [architecture](ARCHITECTURE.md), [obstacle reference](OBSTACLES.md), [test matrix](PRODUCTION_TEST_MATRIX.md), and the [Phase 02 report](PHASE_02_REPORT.md) before changing course rules.
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

## Carry forward

1. Reproduce the supported tree and chase camera on a physical iPhone. Record glare, low light and fog, touch timing, texture residency, thermals, and restart on minimum and recent supported devices. The owner previously reported passing Phase 01 downloading, play, installation, offline hunts, restart, Kennel scrolling and reconnect. That evidence does not cover Phase 02.
2. Gather human difficulty feedback using the report's first-run and practiced cohorts. Review density, timing, risky-route value and short failing replays. Preserve readable route choice across Phase 03 scenery and weather.
3. Use the registry's eligibility hooks for 15 territories and the configurable stage table. Re-run sequential coverage across every new region, watch forward sightlines and shared GPU residency, and keep barn, crop and tractor regressions.
4. Record the approved Boyd portrait when available and replace the four icons using the existing pipeline. [Application icons](ASSET_LICENSES.md#application-icons)
5. Keep both rollback references and all saves. The final ranked migration and reset require reviewed backups and separate explicit approval. [Release checklist](RELEASE_CHECKLIST.md)
