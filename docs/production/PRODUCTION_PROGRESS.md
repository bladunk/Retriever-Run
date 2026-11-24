# Production progress checkpoint

## Resume here

- Program target is Retriever Run 1.0 — The Great Migration. Phase 01 implementation version is `1.0.0-phase.1`.
- Base is deployed pre-release **5.5.1**, commit `88d5de3b5c0028468723ae2d1dcd8dc2c57cb09c`. Branch is `codex/retriever-run-production-phase-01`. [Rollback and reset procedure](RELEASE_CHECKLIST.md)
- Start with `npm ci`, `npm test`, `npm run build` and `npm run verify:production`. Obtain rendered evidence at the Pages subpath using the [test matrix](PRODUCTION_TEST_MATRIX.md).
- Read [architecture](ARCHITECTURE.md), [player-first charter](PLAYER_FIRST_CHARTER.md) and the [production roadmap](PRODUCTION_ROADMAP.md) before Phase 02.

## Implemented in Phase 01

- Small bootstrap with install manifest, original temporary icon, optional installation UI, safe-area dialog and progressive game import.
- Emitted schema-1 content inventory and project-scoped caches with per-file SHA-256, real byte counts, explicit downloads, file-level retry, integrity repair and unchanged-file reuse.
- Offline launch and solo progression, atomic save snapshots with local backup, future-version protection, ranking eligibility through the existing server-issued ticket boundary, and a safe waiting-worker protocol for open game tabs.
- Pooled territory resources, cached tile preparation ahead of the player, release after the last referencing tile, and a bounded localhost diagnostics probe.
- Independent ambience and wildlife mix, optional haptics and Wake Lock, suspension recovery, a bounded reward notice queue, and five sourced Field Notes.
- Recurring checks for build integrity and playback regressions, plus documented thresholds and legal asset intake.

## Carry forward

1. Record the approved Boyd portrait and replace the four icon outputs using [the icon instructions](ASSET_LICENSES.md#application-icons). Leave the app identity stable.
2. Run and record the outstanding native device tests and physical performance/thermal checks. Treat any layout, lifecycle or cache-eviction failures as app certification blockers.
3. Prioritize Phase 02 input timing, physical hazard readability and fair recovery from mistakes. Keep the fixed simulation clock and Camp ticket boundary. Use the Phase 01 harness for regression comparisons.
4. Before making packs substantially larger, measure cache verification I/O and add bounded, content-aware release retention to the budget review. Implement logical-asset quality selection before authoring multiple variants. Cloud save conflict reconciliation, private camps, and trusted competitive validation are later work.
5. Retain saves, database migrations, and the base tag target. The eventual reset requires the owner’s separately reviewed approval. [Release checklist](RELEASE_CHECKLIST.md)

The [implementation report](PRODUCTION_REPORT.md) records the evidence and acceptance status for this branch. No production deployment or reset is part of this checkpoint.
