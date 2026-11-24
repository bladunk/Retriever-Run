# Production test matrix

Run on Node.js 22.12 or later. Browser tests serve the built app at `/Retriever-Run/`. A Vite dev-page demonstration cannot substitute for this check.

| Check | Reproducible coverage |
| --- | --- |
| Gameplay, career, migration, security behavior | `npm test`, `npm run stress`, `npm run stress:master`. Cover determinism, varied collision timing, offline/outbox behavior, incremental rewards, Supabase rules, long runs and readable obstacle variants |
| Asset contract | `npm run build && npm run verify:production`. Verify receiver paths, dependency graph, worker/manifest parity, byte length and checksum of each emitted file |
| Browser content | `npm run test:production -- repair` and `npm run test:production -- webkit`. Assert that the engine is not requested before consent, fail a late transfer, retry from verified files, and reload offline. The `repair` case corrupts one entry and checks that only that file is downloaded again |
| Player activity and update | The rendered production suite starts offline and finishes a hunt, checks local run count, enters the Kennel and reaches its last card. Its next-release fixture changes real shell bytes and checks that a second tab with an active or paused hunt vetoes activation. It then applies the update from idle and verifies both tabs and the save |
| Mobile viewport and controls | Existing `npm run test:master -- phone` covers 320 × 568. The production harness uses a 390 × 844 mobile view, touch targets, offline reload, background/resume, scroll-to-card, and a standalone-state simulation. Native installed Home Screen and Android display-mode behavior require devices |
| Context and resources | Node checks late wake acquisition, resource disposal including a late pack completion, and bounded frame history. Existing migration browser harness covers transitions and route scenery. Existing 5.5 baseline records extended restart and residency behavior |
| Registry and source review | Asset register, temporary icon review, Field Note source links, rendered screenshots and click-through UI. Browser evidence and actual results belong in the implementation report |

Install the automation browsers with `npx playwright install --with-deps chromium webkit`. Choose another output with `FIELD_QA_OUTPUT`. Set `FIELD_BUILD` to a specific build. Run a pre-release comparison with `FIELD_BUILD=/path/to/baseline npm run test:production -- baseline`. Reproduce migration without the download prompt by building `npm run build -- --mode migration-qa --outDir qa-output/migration-build` and running `FIELD_BUILD=qa-output/migration-build npm run test:migration -- webkit canopy-timber alpine-entry`.

The prior worker upgrade uses `FIELD_LEGACY_BUILD=/path/to/5.5.1-dist npm run test:production -- legacy`. It waits outside the game scope for the old worker to relinquish its clients before opening Phase 01, then verifies the local record and reuse of an unchanged audio file. WebKit cache repair can be exercised separately with `npm run test:production -- webkit offline-only repair`.

## Manual device matrix

| Device or mode | Required before production certification | Current evidence boundary |
| --- | --- | --- |
| iPhone Safari at minimum and current supported iOS | Share-menu installation, portrait/landscape, notch/home indicator, pinch zoom in menus, native swipe/long Kennel scroll, no accidental browser scrolling during a hunt | Linux WebKit with mobile viewports and DOM interaction. Physical checks pending |
| Installed iPhone Home Screen | Launch offline in airplane mode after caching, screen lock and interruption, suspend/resume with audio off, update without closing idle app windows, low-storage eviction/recovery, icon and splash fit | Standalone-state simulation only. Physical checks pending |
| Android Chrome and installed PWA | Native install prompt, icon mask, safe area, navigation, lock, wake lock decline, offline cold start, content updates and storage pressure | Chromium automation tests browser mechanics. Native install checks pending |
| Desktop Chrome, Safari and Firefox | Fullscreen exit, keyboard and tab-focus behavior, repeated starts, corrupt-cache recovery, private-window fallback | Desktop Chromium/WebKit engines with mobile emulation. Native Safari/Firefox manual pass pending |
| GPU and long session | At least 30 minutes of real play, stable 30/60 FPS quality, context recovery, thermals, and decode and texture memory at territory boundaries | Seeded simulations plus two rendered migration windows. Long physical soak pending |
| Worldwide and unavailable Supabase | Verify an enrolled eligible ticket online, reject a hunt begun offline, preserve local rewards during outage, and audit access controls on an isolated project | Existing adapter/rules regression and isolated offline guest browser. No production database changes |

Owner approval and recorded physical-device evidence are separate from automated acceptance. [Release checklist](RELEASE_CHECKLIST.md)

## Phase 02 additions

- `node --test test/phase-two.test.js` checks the supported tree actions, stable ground hazards, swept contact, aimed inputs, collectible paths, repetition and configurable 30-stage scaffolding.
- `FIELD_BUILD=dist node scripts/phase-two-browser.mjs` captures the built site with deterministic practice checkpoints. Add `webkit tree low small` for the 320 × 568 WebKit tree action check. The Chromium harness uses browser touch swipes. WebKit uses keyboard movement and taps for the available automation.
- `node scripts/difficulty-survey.mjs . 512` measures seeded stage distribution. `node scripts/phase-two-profiles.mjs . 128` compares scripted movement profiles. Change the repository path argument to analyze an isolated Phase 01 checkout with the same profile harness.
- Physical testing is required for touch and display latency, legibility in severe weather, real-world frame-time distribution, and several longer iPhone hunts. See the [Phase 02 report](PHASE_02_REPORT.md) for tested boundaries.

To rehearse an actual Phase 01 update, point `FIELD_PHASE_ONE_BUILD` at an isolated build of `3fb4c4f` and `FIELD_BUILD` at the Phase 02 build. Run `npm run test:production -- from-phase-one repair` and prefix the arguments with `webkit` to switch engines. This covers a paused tab veto, changed-file download, existing saves, and persistent swipe sensitivity.

## Phase 03 additions

The revision tests the fifteen-stage-pair route, all boundary seams, bounded terrain packets, seeded topology, landmark placement, the slide volume and snowmobile eligibility, and save schema 4. `scripts/phase-three-browser.mjs` runs the compiled Pages subpath in Chromium or WebKit. Its default mode captures both approach and landmark scenes, and `transitions` replays the boundaries at the actual stage clock. The `timber` case uses independent Phase 02 and Phase 03 build and source directories for the reported cypress scene. `from-phase-two repair` rehearses updating while a paused hunt prevents activation.

## Phase 03B additions

- The Phase 03B Node checks evaluate deterministic landmark packets in all fifteen territories, color and water profiles, replacement of tile-owned geometry and serialized texture quality transitions. The previous obstacle, mobility and offline suites remain.
- The built-site runner adds `landmark-pass` with a reproducible continuous approach, center coast, passing frame, trail departure and tile recycling. The candidate checks that all drawn frames share the same stable landmark ID and geometry. `video` records actual game output while the test advances.
- Run `FIELD_FAULT_ASSET=field-atlas-full.webp npm run test:production -- webkit small offline-only partial repair` against the built subpath. The test severs the HTTP body at one quarter, verifies retry and reuse of downloaded audio, damages the atlas in Cache Storage, and tests repair. It then exercises offline boot, a hunt, background pause and the final Kennel card at 320 × 568.
- To test the real worker transition, build the Phase 03 merge and set `FIELD_PHASE_THREE_BUILD` to that artifact. Run `npm run test:production -- from-phase-three`. It tests that a paused tab prevents update, then verifies the activated worker, existing runs and swipe settings.
