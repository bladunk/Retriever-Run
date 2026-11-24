# Retriever Run 1.0 — Phase 02 implementation report

Phase 02 replaces the old full-width horizontal branch with a sloped, fork-supported tree. The left lane can be jumped, the center lane can be slid, and the right lane can be run through. Logs and lodged driftwood hold position on the trail. The existing ten territories and twenty stages now include lane-bound slides, compound switches and optional, validated retrieve trails.

This is a development review build. Local and offline hunts remain available and earn normal local progress. New Worldwide results wait for an isolated Camp ruleset because the new obstacle patterns, pickup reach and optional routes change score comparability. Existing standings, local records, anonymous identities and already-issued receipt handling remain intact. No production reset, database migration, tagged release, deploy or paid dependency is part of this phase.

The deployed comparison is Phase 01, `3fb4c4f9e8eb300e622149a297ff2bbfa26446e8`. All 119 tests, Vite build and artifact verification passed before edits. A baseline Chromium software-rendered test also rechecked the Phase 01 offline path and update. [Pages deployment](https://github.com/bladunk/Retriever-Run/actions/runs/45423302775) · [Rollback and optional tag](RELEASE_CHECKLIST.md)

## Changes by area

| Files | Implementation |
| --- | --- |
| `src/leaning-tree.js`, `src/hazard-hull.js`, `src/fallen-timber.js`, `src/trail-timber.js`, `src/contact-shadow.js`, `src/player.js`, `src/art.js` | Original tapered timber geometry, branch leftovers, structural fork, layered soil-root plates, and shared soft contact shadows. Reuses the bark/end-grain material and the existing shadow texture |
| `src/obstacles.js`, `src/rocks.js`, `src/collision.js`, `src/collision-debug.js` | Registry, regional weights, exact convex rock and wood sections, fixed-step swept volume contacts and a local-only wire overlay. Adds the contacted body, motion state, seed, pattern, territory, stage and placement to the diagnostic death record |
| `src/runner.js`, `src/difficulty.js`, `src/timing.js` | Critically damped lane steering, 30-stage-capable schedule, compound lane patterns, deterministic row IDs, timed swept validation, optional-route recovery and consistent pickup reach |
| `src/run-controls.js`, `src/gesture.js`, `src/profile.js`, `src/lodge-save.js`, `index.html` | Retains touch and keyboard controls, rejects ambiguous diagonal gestures, buffers one vertical action near landing, and supports three persisted swipe sensitivities |
| `src/main.js`, `src/field-stats.js`, `src/campfire.js` | Reports the first contacted hazard, feeds action and route hooks through run statistics, keeps relevant heckles and preserves immediate Hunt Over replay without adding a pause-menu restart |
| `src/sign-lettering.js`, `src/sign-scenery.js`, `src/trail-signs.js`, `src/terrain-geometry.js` | Larger lettering, shorter two-line live messages, local reed clearance. The complete 280-slogan archive and regional deterministic selection remain |
| `src/ruleset.js`, `src/production-session.js`, `src/production-entry.js`, package manifests | Versioned ruleset eligibility and visible local-hunt status. Version `1.0.0-phase.2`. Production pack verification, update protocol and physical score submission checks are retained |
| `test/`, `scripts/`, `docs/production/` | Focused physical movement tests, seeded action-aware stress, production render cases, course surveys, player proxies, measurements, evidence and the handoff |

## Collision, controls and obstacle presentation

Phase 01's movable `drift` frame used a sinusoidal offset of up to 0.69 m. Art and collision both followed it. Phase 02 treats it as lodged driftwood and removes its independent movement. The visible camera and trail still curve together. Bad swipes in the first attempts no longer pick an action when the axes are close. Horizontal and vertical inputs retain independent acceptance on the first eligible 120 Hz step, at most 8.33 ms of simulated time. A queued vertical action can survive the last 150 ms of the preceding action. Existing button and keyboard controls remain. Pausing or losing visibility discards pending actions.

Jump uses the same 0.92 s analytic arc as the dog presentation. Slide lasts 0.87 s including smoothed entry and recovery. The lateral spring accelerates from rest, keeps velocity through a reversal and settles into the requested lane. Current physical body dimensions are shared by all gear and graphics settings. Thin branches, wings and small root strands remain intentionally cosmetic. The reference identifies approximate solid volumes for water, tractor, fence and the narrow overhead branch.

The signature tree shares its render rings with 45 swept convex hull sections. The sectioned stem follows the opening bark taper and the right standing tree provides a substantial fork. The left root and right standing trunk have contact shading. The centered slide, left jump and right run have distinct trajectories. Jumping into the right-side wood still collides. The prior wide branch never spawns. A separate one-lane overhead branch still provides a timed slide.

The [obstacle reference](OBSTACLES.md) documents all fourteen hazard IDs, shapes, expected actions, eligible terrain, placement, motion, visibility targets and remaining approximations. See its debug section for a seed and checkpoint. Screenshots show the camera path and authored geometry in normal play, plus a direct collision check.

## Difficulty, fairness and rewards

The visible course currently uses the same 15 seconds per stage, 30 per territory and 28.8652 m/s pace cap. Stages 1–4 teach a straight water crossing and introduce the forked tree and ordinary lane choices. Stages 5–10 add slide chutes and short sequences. Stages 11–16 add floods, tighter commitments and more double geese. Stages 17–20 offer frequent lane-bound slides with alternating creek actions and less spare setup time. The continuing northern course gradually closes the row-gap allowance up to 55 ms, subject to the same safety constraints. Fifteen territories and thirty configured stages fit the same director interface. Definitive territory content remains Phase 03 work.

The validator measures one- and two-swipe setup with the same spring and fixed step as the live game, then adds a conservative 420 ms recognition interval. Consecutive mandatory actions also need enough time to complete and recover. Timed candidates replay physical sweeps at both ends of a 100 ms tolerance window. Coast and side-block paths use lateral envelopes and the same swept solver where a close shape or moving goose needs it. An unacceptable row falls back to a trivially traversable recovery. The stress suite replays combinations across neighboring rows and stage boundaries, with delayed input and timing error. This tests the designated route and the advertised exits under declared bounds. It is not an exhaustive search over arbitrary prior mistakes.

Optional reward paths offer one low-risk retrieve or three action-linked treats. Jump treats form a visible arc and use the same animated height for display and collection checks. Unchosen optional pickups do not break a streak. The next challenge is scheduled with recovery from any advertised exit. Small rocks, roots, logs and shallow water are eligible when timed swept clearance passes. Risk exits and action-based clearances emit bounded events for later mastery. Pickups leave the active set as soon as they are collected.

The numerical score multipliers and Good Boy rules are unchanged. Final scores can still differ because placement, item count and reach changed. Being connected or keeping a verified pack never bypasses Camp's separate course check. Phase 09 or a separately reviewed intermediate season must bind its ticket and scoring rules to the new course. Local PBs are retained and remain comparable only within the limits of earlier course changes.

## Later human calibration

Run 10–15 first-time and 10–15 repeat players through five hunts each on at least two iPhone generations. Compare median distance in runs 1 and 5, the share crossing the first three territories, failure hazard/action, sign and warning recall, and optional route uptake. Review recordings around any accidental side drift or mislabeled death. Hypotheses are early improvement between attempts, late switch-and-slide failures concentrated in execution, and substantially lower final-territory survival for new players than practiced players. Ask experienced players to run late-stage practice for route recognition and difficult-but-fair timing. Longer northbound completion goals should be calibrated after the fifteen-region build. Scripted profiles measure timing sensitivity only.

## Reproduction

```sh
npm ci
npm test
npm run build
npm run verify:production
npm run stress
npm run stress:master
node scripts/difficulty-survey.mjs . 512
node scripts/phase-two-profiles.mjs . 128
FIELD_BUILD=dist node scripts/phase-two-browser.mjs
FIELD_BUILD=dist node scripts/phase-two-browser.mjs webkit tree low small
FIELD_BUILD=dist npm run test:production -- repair
FIELD_BUILD=dist npm run test:production -- webkit repair
```

Point `FIELD_CHROMIUM` at a local Chromium executable when using the system browser. Playwright browser installation and evidence destinations are listed in the [test matrix](PRODUCTION_TEST_MATRIX.md). Use a local Pages-subpath host and separate contexts for browser suites and old-save comparisons. Stress scripts log the reproducible seed and contact on an unexpected death.

## Build, performance and regressions

| File-byte measurement | Phase 01 | Phase 02 |
| --- | ---: | ---: |
| Entire production build | 2,456,499 | 2,465,533 |
| Required pack, 27 files, duplicate bytes included | 2,428,822 | 2,437,117 |
| Unique required pack | 2,403,499 | 2,411,794 |
| Unique launch shell | 65,751 | 66,135 |

No new model, map or audio download is introduced. The fully cached pack and resource manager use the same verified content scheme. Asset figures are decoded file bytes and exclude transport compression, storage overhead and actual GPU memory. The existing hosting budget still applies. [Performance budget](PERFORMANCE_BUDGET.md) · [Asset register](ASSET_LICENSES.md)

<!-- verification-evidence -->

## Phase 03 readiness and owner review

Engineering is ready to author Phase 03 territory content against the registry, 30-stage interface, fixed motion contract and shared collision pipeline. The phase is **not certified for release**. Native Phase 02 iPhone testing, human difficulty calibration, full severe-weather readability and separate ranked ruleset approval remain open. The report and automated evidence cannot certify real-device latency, FPS, thermals, GPU residency or battery use.

The owner should first try the left jump, center slide and right run on an installed iPhone, then give feedback on early clearance readability and consecutive late choices. Measure a long run in rain, fog and snow, reload a cached offline build, and exercise the last Kennel card. Review the draft without merging until the owner accepts the temporary local-hunt boundary and the native checks for the intended publication. The live Pages workflow deploys on a merge to main. [Production checkpoint](PRODUCTION_PROGRESS.md) · [Release checklist](RELEASE_CHECKLIST.md)
