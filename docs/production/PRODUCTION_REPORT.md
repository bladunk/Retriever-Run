# Retriever Run 1.0 — Phase 01 implementation report

The Phase 01 branch adds a versioned application and content delivery layer to the existing game. The engine, 20-stage course, ten territories, visual assets, saved career and equipment, Lodge, Kennel, local boards, and Camp server contracts remain available. The package is `1.0.0-phase.1`. The installed app is **Retriever Run**.

## Files and decisions

| Files | Work |
| --- | --- |
| `index.html`, `public/manifest.webmanifest`, `public/icons/`, `assets/source/`, `src/production.css` | Subpath PWA identity, replaceable original temporary icon, download dialog and settings affordances |
| `build/offline-worker.js`, `build/offline-runtime.js`, `src/content-*.js`, `src/production-entry.js`, `src/production-session.js` | Final artifact manifest generation, content verification and retry, explicit launch options and safe worker switching |
| `src/main.js`, `src/mobile-lifecycle.js`, `src/profile.js`, `src/audio.js`, menu CSS | Offline ranked-run boundary, suspension and wake handling, independent audio/haptic settings, accessible menu gestures |
| `src/lodge-save.js`, `src/reward-notices.js`, `src/field-notes.js` | Previous validated save snapshot, bounded reward notices and five referenced loading notes |
| `src/terrain.js`, `src/environment-assets.js`, `src/resource-pool.js`, `src/performance-probe.js` | Resource preparation, release after terrain recycling and bounded render diagnostics |
| `scripts/production-browser.mjs`, `scripts/verify-production.mjs`, `test/production-foundation.test.js`, `test/portrait.test.js`, `.github/workflows/pages.yml` | Production-subpath browser suite, regression fixtures, built byte validation in CI and additive settings tests |
| `docs/production/`, `README.md`, package manifests | Roadmap, permanent checkpoint, charter, architecture, budgets, provenance, certification matrix, report and evidence |

Cache membership follows content hashes rather than filenames. The browser verifies each downloaded file and stores only completed files. That keeps retry, offline operation and release changes independent of server Range support. A complete current edition is approximately 2.4 MB. Expanded future packs can use the same IDs, dependency graph and territory groups, with a new quality selection pass when multiple variants exist.

Ordinary solo play and local progression use browser storage. Supabase traffic and save data stay outside the content cache. Production ranked runs require a completed pack, connectivity and an existing server permit. No Supabase migration, privileged credential, or player reset is included. A previous valid local snapshot can recover a corrupted primary record. Existing saves and earned unlocks stay on the same origin and schema.

## Measured outputs

Raw file bytes from the actual Vite output. Unique content counts byte-identical artifacts once. The first load also obtains the small worker and manifest metadata. Compression and browser storage overhead are separate.

| Measure | Pre-release 5.5.1 | Phase 01 |
| --- | ---: | ---: |
| Full build | 2,352,943 bytes | 2,456,499 bytes |
| HTML and static launch assets | 897,695 bytes before background assets | 65,751 unique shell bytes. 91,074 bytes including both icon paths |
| Required offline edition | Previous auto-prefetch policy | 27 files, 2,428,822 logical bytes, 2,403,499 unique bytes |

Locality and clock conditions for browser timings matter. The harness uses Linux software WebGL in a 390 × 844 CSS viewport with a reduced device scale. It accelerates selected hunts to exercise results and repeated restarts. Real animation callback intervals are recorded separately. A few callbacks in these runs do not establish device FPS. The prior release had no opt-in download step, so its cold load is not directly comparable with an intentionally interrupted-then-recovered download.

The instrumented pre-release Chromium smoke samples reached Play in 4.65–10.02 seconds. Automated restart input to a running callback varied from 0.33 to 2.51 seconds with host load. A Phase 01 Chromium sample reached Play in 7.61 seconds including the intentionally interrupted download, then reached Play in 4.81 seconds on cached offline reload. Its automated restart took 1.89 seconds, including Playwright interaction, while the renderer's internal restart marker measured 78 ms. The same opening frame reported 57 draws, 84,646 submitted triangles, nine textures, 45 geometries and seven resident tiles. The physical one-second restart goal remains open. [Performance budget and limitations](PERFORMANCE_BUDGET.md)

A Phase 01 WebKit sample reached Play in 9.66 seconds including the intentionally interrupted download and 4.70 seconds on cached offline reload. Its automated restart took 0.63 seconds. It recorded 56 draws, 85,112 submitted triangles, eight textures, 42 geometries and seven resident tiles. [Measurement records](evidence/measurements.json)

## Test and visual evidence

- Preserved the pre-change production artifact. The baseline passed 110 Node tests. Phase 01 passed 119 tests and a full byte-by-byte manifest verification.
- The gameplay suite completed 10,000 seeded sessions and 31,838,356 fixed steps. The difficulty suite completed 100,000 windows through all 20 stages and 69,251,140 ticks.
- Chromium and WebKit ran the built site at the Pages subpath. Browser runs exercised first download, interrupted transfer, reuse of previously cached audio, offline reload, an offline hunt with persistent local progress, background pause, and the last Kennel equipment card.
- Chromium and WebKit repaired a corrupt cached file. Both engines held a waiting release while another tab had an open hunt, activated at camp and preserved four local run records. The unchanged audio file reached the server once in each fixture. The existing Chromium small-phone harness completed 14 runs and restarts with one audio context, including the roster and Kennel.
- A separate rendered Chromium rehearsal started from the 5.5.1 service worker, finished a hunt, allowed the old scope to empty, then opened Phase 01. The new app kept the local run and reused the verified instrument bank from the legacy cache.
- The WebKit migration harness rendered the Arkansas Flooded Timber approach and the Boreal-to-alpine transition. The tile slots and the current two habitat packs remain the boundary for this architecture, with later high-resolution scenes pending.
- Inspected the actual download, retry, offline camp and gameplay frames. The mobile-size frame shows the offline solo status below the Play controls. [Download and offline captures](evidence/download-and-offline.webp) · [Territory transition](evidence/territory-transition.webp)

## Phase 01 acceptance

| Criteria | Status |
| --- | --- |
| 1–3 · Roadmap, recoverable production reference, and playable game | Implemented. The baseline and tag instructions are documented, and the playable browser suites ran |
| 4 · PWA identity and installation architecture | Implemented and verified for the manifest, subpath, service worker and browser UI. Native installation and eviction tests are incomplete |
| 5–8 · Versioned packs, real progress, cache reuse and interruption recovery | Verified with final artifact checksums, Node fixtures and rendered Chromium/WebKit download tests |
| 9 · Offline solo play | Verified by offline browser reload and a completed local hunt. Native Home Screen cold launch is incomplete |
| 10–11 · Safe updates and save protection | Verified in Chromium and WebKit for the managed release-to-release protocol and in Node for record backups. The 5.5.1-to-Phase-01 migration was rehearsed in Chromium at the old worker's activation boundary |
| 12–14 · Resource, territory and graphics foundations | Implemented and demonstrated with resource-pool tests, existing adaptive-quality tests and rendered migration windows. Device GPU budgets and larger art packs are future work |
| 15 · Mobile lifecycle | Background pause/resume, offline menus and last Kennel card verified in software browsers. Physical interruption, context loss and native safe areas remain incomplete |
| 16–17 · Field Notes, licenses and budgets | Implemented with five sourced notes, stable IDs and an asset register with prior credit links |
| 18–19 · Existing behavior and automated regression | Node, Pages artifact validation and procedural stress suites passed. Hosted Supabase ticket rehearsal was outside the local software run |
| 20–21 · Limitations and handoff | Physical-device and larger-pack limitations are documented, along with the branch, baseline, commands and Phase 02 entry point |

## Readiness and remaining work

The branch is suitable as the engineering baseline for Phase 02 after review. It is a production-development checkpoint. Release certification requires native iPhone Home Screen and Android installation, a long device run with thermal and GPU residency observations, verified screen lock and device storage eviction/recovery, and actual restart measurements on supported phones. Approved Boyd artwork is pending. The current icon is an original generic Labrador and follows the final asset paths.

Larger packs need new limits on decode and cache verification I/O, measured quality variants, and install-policy review before the provisional 75–150 MB target is approached. Game content stays on GitHub Pages with existing free infrastructure and no new subscriptions. Full-hosting scenarios and the separate Supabase traffic budget are recorded in the [performance budget](PERFORMANCE_BUDGET.md).

Owner actions are to review the draft, optionally create the rollback tag, supply approved icon artwork, and record the outstanding device tests. Confirm deployment readiness before merging because the current Pages workflow deploys from `main`. A future production reset is a separate reviewed operation after backups and final approval. [Release checklist](RELEASE_CHECKLIST.md)
