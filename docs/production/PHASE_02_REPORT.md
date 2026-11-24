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
| `src/ruleset.js`, `src/production-session.js`, `src/production-entry.js`, package manifests | Versioned ruleset eligibility and visible local-hunt status. Version `1.0.0-phase.2`. Production pack verification, update protocol and server score submission checks are retained |
| `test/`, `scripts/`, `docs/production/` | Focused physical movement tests, seeded action-aware stress, production render cases, course surveys, player proxies, measurements, evidence and the handoff |

## Collision, controls and obstacle presentation

Phase 01's movable `drift` frame used a sinusoidal offset of up to 0.69 m. Art and collision both followed it. Phase 02 treats it as lodged driftwood and removes its independent movement. The visible camera and trail still curve together. Bad swipes in the first attempts no longer pick an action when the axes are close. Horizontal and vertical inputs retain independent acceptance on the first eligible 120 Hz step, at most 8.33 ms of simulated time. A queued vertical action can survive the last 150 ms of the preceding action. Existing button and keyboard controls remain. Pausing or losing visibility discards pending actions.

Jump uses the same 0.92 s analytic arc as the dog presentation. Slide lasts 0.87 s including smoothed entry and recovery. The lateral spring accelerates from rest, keeps velocity through a reversal and settles into the requested lane. Current physical body dimensions are shared by all gear and graphics settings. Thin branches, wings and small root strands remain intentionally cosmetic. The reference identifies approximate solid volumes for water, tractor, fence and the narrow overhead branch.

The signature tree shares its render rings with 45 swept convex hull sections. The sectioned stem follows the opening bark taper and the right standing tree provides a substantial fork. The left root and right standing trunk have contact shading. The centered slide, left jump and right run have distinct trajectories. Jumping into the right-side wood still collides. The prior wide branch never spawns. A separate one-lane overhead branch still provides a timed slide.

The [obstacle reference](OBSTACLES.md) documents all fourteen hazard IDs, shapes, expected actions, eligible terrain, placement, motion, visibility targets and remaining approximations. See its debug section for a seed and checkpoint. Screenshots show the camera path and authored geometry in normal play, plus a direct collision check. [Three-lane tree and Hunt Over](evidence/phase-02-three-lane-tree.webp)

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
FIELD_BUILD=dist node scripts/phase-two-browser.mjs webkit weather
FIELD_BUILD=dist node scripts/phase-two-browser.mjs webkit restarts small
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

### Executed verification

- `npm test` passed **126 tests**. Phase 01 passed 119 on this checkout. New fixtures include all three signature actions and wrong actions, high-speed contact, static ground hazards, steering while airborne, held vertical input, a physically reachable arced pickup route and a sample 30-stage configuration. The original career, Supabase ownership and season, save, offline and worker coverage remains.
- `npm run stress` passed **10,000 seeded sessions**, **31,845,344 fixed steps**, and all guided sessions. The four uninterrupted horizon cases reached 300, 600, 1,200 and 1,800 active seconds. The unguided profiles produce expected impact deaths.
- `npm run stress:master` passed **100,000 windows** across all 20 stages and continuing wilderness, including **69,549,115 simulation ticks** and all 14 live hazard types. It replays 320–470 ms reaction delays and ±46 ms timing errors over the selected route. Faster reactions here are comparison fixtures. The planner still reserves 420 ms.
- `npm run build` and `npm run verify:production` passed at the Pages subpath configuration. The verifier checked 30 emitted artifacts and the versioned content graph. Build and download size changed by about 9 KB and 8 KB respectively.
- Production Chromium and WebKit completed interrupted download and retry, corrupt-file repair, cached offline startup, offline progress, background pause/resume, interaction with the last Kennel card, reconnect and update. The busy tab vetoed activation until the hunt ended. Four local runs survived each test. The unchanged verified instrument bank was transferred once in each context. The required failed requests were injected in the local test server. A separate built Phase 01 to built Phase 02 upgrade in both Chromium and WebKit verified the changed-file transfer, both tabs activating together at camp, complete save preservation, cached audio reuse and swipe-sensitivity persistence.
- WebKit rendered the grade, left jump, center slide, right run, wire hulls, and a wrong action with the correct Hunt Over cause, at 320 × 568 in Battery Saver. Chromium checked the same approaches and gestures in a 390 × 844 emulated mobile viewport. Rendered evidence is from the game, using seeded localhost jumps to an approach checkpoint. Physical iPhone touch and display timing remain open. The test fixture lets streamed terrain settle after a large diagnostic seek before capturing scenery. The sign is fully in frame on approach and can crop near the viewport edge once the runner is beside it. The WebKit software capture renders a lighter coat than Chromium. The character material and breed are outside the Phase 02 changes. High-preset WebKit screenshots cover logs in overcast, fog, rain and snow. The stationary logs stay grounded and visible at the selected near-camera checkpoint. Longer recognition distances, especially on a smaller device, remain a playtesting item. [Trail scenarios](evidence/phase-02-trail-scenarios.webp) · [Sign detail](evidence/phase-02-sign-detail.webp) · [Weather comparison](evidence/phase-02-log-weather.webp)

### Pace and variety survey

The planner survey uses 512 seeds. Entries are counts per minute within that stage, so it is possible to extrapolate a short stage to a bigger number. A switch is the reference route's next lane change. A switch-and-slide is a lane change followed by a mandatory lane-bound slide in the same row. Recovery around optional paths trades some encounter density for a reachable return.

| Stage | Encounters before → after | Lane switches before → after | Slides before → after | Phase 02 switch-and-slide | Distinct adjacent hazard pairs before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1 | 32.0 → 32.0 | 17.9 → 18.2 | 0.3 → 0.2 | 0 | 346 → 381 |
| 5 | 43.5 → 43.6 | 20.8 → 22.3 | 4.6 → 4.9 | 0.8 | 935 → 1,146 |
| 10 | 51.2 → 51.1 | 26.8 → 29.3 | 7.0 → 8.2 | 3.2 | 1,089 → 1,089 |
| 15 | 55.3 → 53.5 | 26.1 → 32.5 | 9.1 → 9.8 | 5.8 | 767 → 848 |
| 20 | 56.3 → 53.6 | 24.9 → 32.4 | 10.5 → 11.3 | 9.0 | 610 → 682 |

Late steering demands are stronger without increasing top speed. Stage 20 has about 30% more reference-route switches and 9 lane-bound switch-and-slide sequences per minute. Median spacing remains 1.02 s. The validated optional trail count averages 4.1 per minute in stage 20. The regional mix and per-stage repetition counts are included in the evidence. [Seeded distributions](evidence/phase-02-measurements.json)

### Scripted player comparisons

Each profile played the same 128 seeds in each version until death or 315 seconds. A completion means reaching 300 seconds. Agents have exact course knowledge. Reaction time is additional waiting after the previous clearance. Timing errors are randomly signed within the listed bound. These figures describe software agents with known inputs.

| Scripted profile | Model | Phase 01 completions | Phase 02 completions | Median survival before → after |
| --- | --- | ---: | ---: | ---: |
| Reference route | 420 ms reaction, ±35 ms on jumps/slides | 128 | 128 | 315 → 315 s |
| Conservative | 450 ms, ±45 ms, default safe exits | 128 | 128 | 315 → 315 s |
| Collectible seeking | Same timing as conservative, takes each advertised risk branch | 128 | 128 | 315 → 315 s |
| Delayed reaction | 580 ms, ±70 ms | 128 | 48 | 315 → 265.7 s |
| Uneven timing | 450 ms, ±210 ms | 128 | 128 | 315 → 315 s |
| Missed actions | 450 ms, ±50 ms, 6.5% chance of omitting each input | 0 | 0 | 65.9 → 92.2 s |

Phase 01 has no separately tagged risk exits for this agent. In Phase 02, the same collectible-seeking policy averages 15.5 completed risk exits, 525 treats and 40,961 points. Its conservative counterpart averages 494 treats and 38,814 points. Delayed decisions became more costly. Pure timing jitter at the tested setting and occasional missed inputs do not establish a broad rise in difficulty. Real players must establish the target difficulty.

### Performance observations

On Node, the profile runs averaged 0.217 ms for course row generation in Phase 01 and 0.227 ms in Phase 02, including timed validation. Collision dispatch averaged 0.0030 and 0.0037 ms per step over 25.47M and 25.04M checks. The averages include empty steps. They are CPU measures on this host and exclude Three.js.

The comparable Chromium opening check used a 390 × 844 CSS viewport at 0.58 device scale. Renderer draws were 56 before and 54 after. Submitted triangles were 84,180 and 83,851. Scene object counts were nine textures, 44 geometries and seven terrain tiles in both opening samples. Random opening seed and load can change the exact counters. On the Phase 02 Battery Saver tree approach in WebKit, the captured passes submitted about 83,400–87,300 triangles, 59–61 drawing calls, eight or nine textures and 42–46 geometries. Wire overlays increase debug-only draws; they are disabled in normal play.

The PWA harness deliberately interrupts the first download. Chromium reached Play in 4.64 s on the Phase 01 baseline and 15.84 s in the concurrent Phase 02 verification. Cached offline times were 1.63 and 18.28 s. These are single observations with materially different host load. Restart-to-render markers were 11 and 72 ms inside the renderer, and the automation input-to-running samples were 81 ms and 5.79 s. WebKit Phase 02 took 21.69 s including the injected failure and 9.54 s on cached reload, with a 90 ms internal restart. The separate eight-restart WebKit fixture measured 31–129 ms internal restarts, all at 42 geometries, seven textures and seven terrain tiles. This supports bounded opening reuse. It does not measure a rendered 30-minute soak or the end-user cold start across devices. The evidence records raw samples and host contention. [Measurement records](evidence/phase-02-measurements.json)

### Acceptance status

| User criteria | Status |
| --- | --- |
| 1–7 · Registry, supported tree, stationary logs, boulders and roadside signs | Implemented. Browser evidence and expected responses are documented. Wider weather legibility remains a partial check |
| 8–11 · Collision, responsive actions and combined steering | Shared sweep and supported actions pass automated testing and rendered tree cases. Exact silhouettes are used for stone and main timber. Water edges, narrow low limbs, fence bracing and tractor details use simplified bounds. Native touch latency remains unverified |
| 12–14 · Harder progression and support for 30 stages | Existing twenty-stage course retained and a 30-stage definition exercised. More late switches and fewer delayed-agent completions are measured. Substantially harder overall for human players remains unverified |
| 15–20 · Validated patterns, reaction allowance, possible routes, reward placement and variety | Implemented and checked for intended plays and the tested timing bounds. Arbitrary mistimed entries and all weather visibility are outside the proof. The director currently substitutes the same recovery row for timing and geometry rejections |
| 21–24 · Cause of death, event hooks, offline, saves and ranking protections | Implemented. Separate competitive ruleset approval is open, so new Phase 02 runs stay local |
| 25–29 · Tests, rendered QA, performance, honest device scope and checkpoint | Automated and software-browser checks complete for the cases reported. Native measurements, full weather/quality matrix and long rendered resource soak remain incomplete |
| 30 · Phase 03 readiness | Ready to start integrated territory work. Use the open items below as regression and release gates |

## Phase 03 readiness and owner review

Engineering is ready to author Phase 03 territory content against the registry, 30-stage interface, fixed motion contract and shared collision pipeline. The phase is **not certified for release**. Native Phase 02 iPhone testing, human difficulty calibration, full severe-weather readability and separate ranked ruleset approval remain open. The report and automated evidence cannot certify real-device latency, FPS, thermals, GPU residency or battery use.

The owner should first try the left jump, center slide and right run on an installed iPhone, then give feedback on early clearance readability and consecutive late choices. Measure a long run in rain, fog and snow, reload a cached offline build, and exercise the last Kennel card. Review the draft without merging until the owner accepts the temporary local-hunt boundary and the native checks for the intended publication. The live Pages workflow deploys on a merge to main. [Production checkpoint](PRODUCTION_PROGRESS.md) · [Release checklist](RELEASE_CHECKLIST.md)
