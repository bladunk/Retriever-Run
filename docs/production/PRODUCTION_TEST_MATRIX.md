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
- To test the real worker transition, build the Phase 03 merge and set `FIELD_PHASE_THREE_BUILD` to that artifact. Run `npm run test:production -- from-phase-three update-only`. It tests that a paused tab prevents update, then verifies the activated worker and manifest, existing runs and swipe settings.
- A continuous 62-second offline Battery Saver replay uses `node scripts/phase-three-browser.mjs webkit offline small low soak seconds=62`. It sends deterministic keyboard actions through the game input handler and bounds draw-time resource counts across two territory boundaries. Longer rendered play and native timings remain in the manual device matrix.

## Phase 04 additions

| Area | Automated and rendered coverage | Owner verification |
| --- | --- | --- |
| Wildlife placement and timing | Seeded regional tier selection, safe shoulders, wing and flush motion, geometry disposal, normal-camera approach fixtures for eight species | Confirm recognizable pheasant, crane, waterfowl and mammal behavior in ordinary hunts |
| Journal and saves | Legacy retrieve migration, separate sighting and retrieve totals, duplicate prevention, offline Journal and last Kennel card in Chromium and WebKit | Confirm a newly observed animal persists after offline replay and reconnection |
| Environment and collision | Identical uprooted-tree swept volumes, localized stream material and terrain placement screenshots, opaque structures, selected sign and shed comparisons | Recheck lighting, sign readability and obstacle identification across presets |
| Migration | 10,000 seeded hunts, 100,020 difficulty windows, fifteen rendered territories, fourteen rendered border checks and endless entry | Compare native frame pacing and stability across the complete route |
| Download and cache | Required SHA-256 verification, partial-file interruption and repair, offline startup and hunt across both engines | Complete the Home Screen install, offline and update checks |
| Performance | Presented-frame diagnostics, adaptive events, worker and installation timing, runtime model decode and renderer residency | Record `?perf=1` output on physical iPhone after a long run and repeated replays |

See [Phase 04 results and checklist](PHASE_04_REPORT.md) for remaining coverage and measured limits.

## Phase 05 additions

- Run `node --test test/phase-five.test.js test/audio-slide.test.js test/portrait.test.js` for build labels, course archives, the two-rig cache, staged renderer work, bark-and-root shape selection, shared wearable fitting and decoded character motion.
- Run `FIELD_BUILD=dist node scripts/phase-three-browser.mjs webkit small working-dogs offline`. Add `pointer` for the development-only Pointer inspection. Use `neighbor-timber video` for the matched Cypress case, seed 73 at about 955 m, and `living video` for regional animal approaches.
- Run `FIELD_BUILD=dist node scripts/phase-three-browser.mjs webkit small texture-replays reuse expect-bounded wait-for-warmup` for repeated skinned mallard use. The tallied resources include idle members of the two-rig cache. Compare all five hunts before treating stable idle counts as leaks.
- Run `FIELD_BUILD=dist node scripts/phase-three-browser.mjs webkit small low soak seconds=451 offline fast territory-evidence` to render all thirty stages and the start of endless play. The harness advances an accelerated clock with real buffered input and collision. Do not use it as an iPhone frame-rate benchmark.
- In the production browser matrix, use `webkit small offline-only partial repair journal` and `small from-phase-three update-only partial repair` with `FIELD_PHASE_THREE_BUILD` pointing to the Phase 04.1 artifact. Check the old pause-time update veto, cache reuse, migrated records, offline version identification and the bottom Kennel card.

- For the visual pass use `webkit small balanced natural-review sight video` with the seeds from the targeted evidence. Use `menu=0` for quick start or a short normal title dwell for the prepared-rig path. The gameplay clock runs on normal browser frames. Use `webkit small balanced offline wildlife-breaks` to assert cold play, background pause, paused quality changes, a prepared encounter on resume and two-rig capacity on replay. Use `npm run stress:master` for the full course and hull validation. [Visual-pass results](evidence/phase-05/visual-pass/README.md)

## Phase 05.1 Boyd and installation artwork

- Run `node --test test/boyd.test.js test/production-foundation.test.js`, the production build and artifact verifier. The artifact must contain only the approved static files and emitted dependencies.
- Run `FIELD_BUILD=dist node scripts/phase-three-browser.mjs webkit small boyd-review` against the built Pages subpath for the locked Kennel, active footer, verified offline branding and dog rig, the last card and Labrador → Pointer → Boyd inspection. Use `boyd natural-review video seed=7` for actual trail motion.
- Run the Phase 05 artifact upgrade using `scripts/production-browser.mjs small from-phase-three update-only partial repair`. Check the pending and current build labels, unchanged cached audio and safe activation. Verify native Home Screen artwork after approval. [Phase 05.1 report](PHASE_05_1_REPORT.md)

## Phase 05.2 Gulf Coast camera and regional map ownership

- Run `node --test test/gulf-art.test.js test/field-ready.test.js` for shared assets, exported topology, bank placement and transferable terrain packets.
- Use `scripts/phase-three-browser.mjs webkit small balanced gulf-slice` on each build, then `scripts/art/compare-views.py` to assert matching distances and seed. Use `view=cordgrass-shore` with `low` and `high` to compare presets at the same normal camera.
- Use `scripts/phase-three-browser.mjs small balanced presets gulf` to change High, Battery Saver and Auto during the same paused hunt with the coast pack bound.
- Use `scripts/phase-three-browser.mjs small balanced gulf-lifecycle fast` to verify the map pair binds, retires across the live Cypress transition and can be brought back. The clock is accelerated for this resource test. Use `natural-review video seed=7 seconds=17 menu=2000` for normal-clock comparison.
- Run `FIELD_FAULT_ASSET=gulf-field-pbr.webp npm run test:production -- webkit small partial repair journal offline-only` to break a real transfer, repair cache bytes, replay offline and reach the final Kennel card. Use `small from-phase-three update-only partial repair` with the exact Phase 05.1 artifact for safe update and save compatibility. [Phase 05.2 results](PHASE_05_2_REPORT.md)

## Phase 06 · Career and rewards

- Run `npm test` for all 100 threshold edges, rank transitions, the four seeded progression profiles, receipt idempotency, same-hunt combinations, realistic clear credit, historical recognition, saved wardrobe state, ownership validation, Master Hunter qualification, and practice exclusions.
- Run `FIELD_BUILD=dist node scripts/phase-six-browser.mjs` for the verified Pages subpath, 320 × 568 career, honors, Journal, Kennel, last-card and locked preview checks. The isolated fixture qualifies through a normal offline hunt and verifies auto-awards, Labrador and Boyd swaps and immediate offline replay.
- Use `webkit small partial repair journal journal-sighting offline-only` with the production browser script for the interrupted download, actual cache repair, witnessed wildlife, background/resume, and last-card checks. Use `small from-phase-three update-only partial repair` with `FIELD_PHASE_THREE_BUILD` pointing to the Cypress artifact for upgrade and save preservation.
- Use the iPhone acceptance checklist for native replay and frame-time verification. [Phase 06 report](PHASE_06_REPORT.md) · [Rendered portrait evidence](evidence/phase-06/README.md)

## Phase 07 · The Evolving Hunting Lodge

- Run `npm test` for all five tier boundaries, 25 requirement and image mappings, v5 migration, same-level personalization, favorites and caps, wildlife and retrieval separation, course archives, practice isolation, upgrade receipts, and Boyd’s legitimate gate.
- Run `FIELD_BUILD=dist node scripts/phase-seven-browser.mjs` for the verified Pages path and the 320 × 568 room flow. Append `webkit` for the second browser or `startup` for the warmed offline startup sample. The isolated fixture earns its tribute and cabin upgrade through normal offline Hunts Over.
- Set `FIELD_PHASE_THREE_BUILD` to the exact Phase 06 artifact and run the production browser script with `small from-phase-three update-only partial repair phase-six-close`. This reproduces the retired-dialog issue and verifies that an already downloaded update activates after all old clients close, with the saved hunts intact.
- Run the production browser script with `small partial repair lodge-veto` after the Phase 07 change. It exercises the paused hunt and open Lodge vetoes and the normal all-idle activation path.
- Review the iPhone checklist for physical scrolling, offline recovery, startup and replay. [Phase 07 report](PHASE_07_REPORT.md) · [Mobile portrait gallery](evidence/phase-07/README.md)
