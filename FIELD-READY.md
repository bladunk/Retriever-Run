# Retriever Run 4.2 · Operation Field Ready

## A. Release assessment

**READY WITH CAVEATS.** The production build, deterministic gameplay suite, and isolated Worldwide Camp checks support a friends-and-family release after the physical iPhone checklist below. No known game-breaking collision, save, or leaderboard defect reproduced in the checks that passed. Safari on an actual iPhone and the hosted Supabase project remain release checks. [Pull request #9](https://github.com/bladunk/Retriever-Run/pull/9)

The release fixes lost-focus behavior, terrain startup and tile recycling, and overlapping Worldwide requests. The terrain still uses the same authored look and procedural meshes. The obstacle rules, Labrador rig, score, and save schema carry forward from 4.1. The pull request is open and this work has left GitHub Pages and live Supabase untouched.

## B. Testing performed

| Layer | Result |
| --- | --- |
| Baseline | Main at `ba715a7` (merge of PR #8) built and passed 54 tests. The same 10,000-seed workload completed on baseline and 4.2. |
| Unit and integration | 64 passed. Coverage includes swept collision, last-tick jumping, overlapping hazards, skinned slide transitions, audio scheduling, old saves, offline receipts, and the SQL migration on embedded PostgreSQL. |
| Seeded gameplay | 10,000 sessions on 4.2, seeds 0–9,999. The 6,001 guided sessions survived their target duration. Of 3,999 free-play sessions, 3,997 ended in attributed collisions and two reached their target duration. The harness processed 31,804,151 fixed ticks, 533,870 pickups, 21,441 jumps, 9,988 slides, and 30,575 simulated pauses. All nine hazard types appeared. |
| Long gameplay | Guided runs completed 5, 10, 20, and 30 minutes at approximately 7,794 m, 16,404 m, 33,624 m, and 50,844 m. Test schedules included 0.87 s frame gaps. The guided policy follows the generated route and tests its feasibility with real movement and contacts. |
| Rendered sustained run | Chromium rendered 126 seconds of game time and reached 2,809 m at 28.7 m/s, including creeks, branches, a goose duck, collectibles, and Good Boy power. This took roughly 245 wall seconds on Linux with a sped-up game clock and software WebGL. |
| Repeated runs | 300 completions exercised the save logic through reloads. An independent Chromium lifecycle test finished and restarted 200 runs, recording exactly 200 creek deaths and 200 completed runs. This mode suppressed GPU draw calls and accelerated the simulation clock. |
| Browser and layouts | Playwright used desktop Chromium and WebKit at 390 × 844. Chromium used native CDP touch injection and WebKit used trusted pointer drags. Both exercised all four swipe directions, tap controls, audio and volume, focus loss and page hide, pause and resume, report and achievement, Field Journal, Local Camp, both exit paths from the report, and reload during a run. Chromium additionally verified recovery after forced WebGL context loss. |
| Worldwide in browsers | Both 390 × 844 engines passed the isolated HTTPS fixture. It exercised configured and unconfigured builds, two anonymous sessions, nickname conflict and recovery, category and page navigation, offline game reload, lost-response deduplication, reconnect, and a database permission failure. |
| Production and dependencies | `npm run build` passed. `dist` was 1,968,460 bytes before HTTP compression. npm reported zero known vulnerabilities for the complete dependency tree and the production tree. |

The simulator uses the same production fixed clock, input buffer, swept contact selection, pickup rules, and stats accumulator. It checks that pickups score once and that each death identifies both the player part and the hazard that made contact. Separate full-speed goose tests cover direct impact, a timed duck, and steering to safety. The free-play policy encountered geese but produced no goose deaths. The seeded runs do not exercise rendered frames or browser event delivery. The checks sampled finite routes and frame schedules, so the result is evidence of fairness across those routes.

Portrait captures were reviewed for clipping and overflow at the title, running HUD, report, and Field Journal. The report matched the contact and the journal recorded one completed run. The app smoke checks page errors, console errors, failed asset requests, and horizontal overflow.

## C. Bugs found and fixed

| Severity | Root cause and player impact | Fix and regression coverage |
| --- | --- | --- |
| High | A window could lose focus while the document stayed visible. The run and music then kept going out of the player's control. | The same pause and audio suspension path now handles window blur. Chromium reproduced the baseline failure in three attempts. The candidate held its tick count and required Resume. Browser smoke also exercises page hide and restoration. |
| High | Graphics context loss disabled the large Resume button. The header button and keyboard shortcut could still resume simulation with no graphics. | Graphics loss suspends audio, pauses gameplay, and disables both resume routes. The baseline Chromium test forced context loss and reproduced the shortcut bypass. The browser regression forces loss, checks both routes, restores graphics, and resumes explicitly. |
| High | Reopening the join form during a pending anonymous signup allowed overlapping claims. Two requests could create competing sessions for one profile. | The same request is now shared. A different nickname for that profile waits for the active request to finish. The delayed mock verifies one auth request and one claim across repeated taps and a reopened form. |
| Medium | Reconnect or startup could submit several saved profiles together. Rapid online notifications repeated the drain. | The background drain coalesces notifications and serializes profiles. A ten-profile fixture measured peak concurrent submissions falling from ten to one while all ten settled. The 4.1 fixture retains its original identity and receipt UUID. |
| Medium | Two large terrain meshes were built synchronously before the title could respond. A recycled tile could also accept an obsolete worker response, and a quick restart could step onto an unprepared tile. | Spawn meshes load first on the worker. Start waits for the spawn seam, physics waits for required terrain, and obsolete packets are discarded. Replaced buffers are disposed. The worker falls back to scheduled main-thread builds on failure or timeout. Regression coverage exercises stream order, stale packets, and geometry disposal. |
| Medium | Seeded diagnostic sessions could reach the same online submission path as normal play. | The app keeps those practice results off Worldwide Camp. The isolated browser fixture verifies the server receives no receipt for a completed diagnostic run. This protects against accidental QA traffic. |

## D. Performance and audio

- In three 390 × 844 Chromium software-rendered samples per build, median navigation-to-prepared-start fell from **1,967 to 1,501 ms**. Median of the largest main-thread task in the sampled startup window fell from **474 to 280 ms**. The two initial packed terrain tiles separately took about 149 and 160 ms to build on this host. The optimization moves those builds off the main thread while preserving the mesh and asset content. Sample size and host scheduling limit comparisons.
- Chromium's throttled 390 × 844 smoke reached the prepared title and rendered Labrador in **8.1 s** with 2 Mbit/s simulated download throughput and 150 ms of added latency. The fresh visit completed the same end-to-end checks, including graphics recovery.
- Across 200 browser replays, live geometry at the report stayed at **33–35**, loaded terrain at **6–7 tiles**, and active entities at **25**. Chromium’s post-GC JS heap changed from **6.99 to 7.86 MiB**, including resources first loaded during play. These are two heap samples. GPU memory, WebKit memory, and very long browser sessions were outside this measurement.
- The replay stress recorded one AudioContext, a peak of 43 scheduled sources including the three ambience beds, 3,119 music source starts, and 2,308 gameplay foley starts. The WebKit smoke measured audio after a tap, silence on mute, persisted volume, and suspension on blur or page hide. Audio clock tests verify that the 32-bar score wraps and avoids rescheduling already queued notes. Listening on actual iPhone hardware remains the check for mix balance, silent-mode behavior, and audible gaps.
- The rendered soak used 390 × 844 CSS pixels, a 0.58 device-pixel ratio, and the Low graphics preset to make the software renderer practical. Its 578 sampled animation intervals were **267 ms median** and **1,317 ms p95**, with host load and software rendering dominating. At the final frame there were 47 draw calls, seven tiles, 43 geometries, and 16 active entities. The run used one audio context, scheduled the decoded Canada goose sample 11 times and mallard sample six times, and recorded 632 gameplay foley starts.
- Source inspection covered the bounded entity pools, terrain slot reuse, shared materials, texture and mesh sizes, adaptive resolution, and animation updates. The 293 kB Labrador and 323 kB instrument bank are the largest standalone game assets. Chrome used SwiftShader on a shared Linux host, so its frame timings cannot establish iPhone FPS, input latency, or thermal behavior.

## E. Worldwide Camp, privacy, and cost

- The deployed SQL migration ran locally in embedded PostgreSQL with simulated Supabase roles and JWTs. Checks covered nickname validation including unusual input, case-insensitive conflicts, auth failures, anonymous session isolation, forged ownership, RLS and permission denial, invalid run envelopes, duplicate receipts, tie-breaking, all three categories, the top 100, and the owner's rank outside it. Browser fixtures verified store-before-submit, offline pending state, retries under the same UUID, and a response failure after the server had saved the receipt. The fixture database and accounts were isolated. **Live backend tests and production writes performed in 4.2 QA: none.**
- The browser configuration validator accepts a bare HTTPS project URL and a publishable key. The release bundle scan found no service-role token, secret key, or database password. Nicknames use text rendering and the public RPC projects public ranking fields. 4.2 introduces no analytics, accounts with mandatory email, or paid services.
- The database limits new receipts to 12 per anonymous identity per minute and accepts already recorded IDs safely. Ranking pages cache for a minute, submissions are limited to personal record contenders, and the outbox retries on user action, reconnect, or a later eligible event. Serial reconnects reduce bursts. The server sees summary numbers supplied by the browser. Fabricated runs within the server's plausibility bounds, multiple anonymous identities, public read traffic, and Free-tier quota use remain risks. Small-group usage should be monitored in the platform dashboard. [Worldwide Camp setup and safeguards](GLOBAL-CAMP.md)

## F. Remaining verification

- Physical iPhone Safari is required for actual swipe latency, hardware frame rate and temperature, audio routing, lock and unlock, and storage eviction or process suspension. A cached reload worked in both automated browsers. Safari private mode, a fresh offline visit, and a site whose cache has been evicted can behave differently.
- 4.0 Lodge data and saved 4.1 anonymous receipts have automated compatibility coverage. The in-place update of a real iPhone’s 4.1 service worker and profile, and continued operation with the live Supabase project, are part of the release checklist.
- The 30-minute result is a logic simulation. The browser coverage is shorter. An exhaustive search of seeds, devices, or frame schedules was outside this release, and visual screening sampled important states at one portrait viewport.

## G. iPhone release checklist

Allow **5–10 minutes** on a physical iPhone after you review the PR, merge it, and confirm the GitHub Pages deployment succeeds.

1. **Open the update in Safari (1 min).** Close existing Retriever Run tabs so the old cached build can release. Open the regular Pages URL in portrait. Keep existing Safari site data. Confirm the returning nickname and personal best, and check that the title, Labrador, and Start button load. [Open Retriever Run](https://bladunk.github.io/Retriever-Run/)
2. **Play and replay (1–2 min).** Swipe left, right, up, and down, then tap the on-screen arrows. Jump the first creek. Let another run end at a creek and check that the Field Report attributes the death and the Field Journal increments once. Try **Run Again**, then **Main Menu**. Continue one run long enough to meet the geese if time permits.
3. **Check sound and interruption (1–2 min).** Confirm the first tap unlocks music and that running, jumping, and sliding are audible. Try mute, unmute, and a volume change. Lock the phone for 10 seconds or switch apps mid-run. Return and confirm the run is paused, then tap **Resume** once. Confirm you hear one music track and the distance picks up where you left off.
4. **Check the existing Worldwide profile (1–2 min).** Open the Lodge and compare the nickname, patches, journal, and Local Camp to the known save. Open Worldwide Camp, switch between all three board categories, and check your own rank if you have posted a best. Allow only ordinary legitimate runs to submit.
5. **Play offline and reconnect (1–2 min).** Once the page has cached online, turn on Airplane Mode and reload. Complete a real run and confirm the local report still records. Reconnect and reopen Worldwide Camp. If the run qualified for an online personal best, confirm it clears pending once and appears normally. If it did not qualify, confirm the local result stays in the Journal.

## Reproduce locally

```sh
npm ci
npm test
npm run build
npm run stress
npx playwright install chromium webkit
npm run test:browser
npm run test:browser -- webkit
npm run test:browser -- slow
npm run test:browser -- soak
npm run test:browser -- replays
```

The browser harness serves the static build at the GitHub Pages subpath and saves captures to `qa-output/`. Its diagnostic URL keeps Worldwide submissions disabled. Use an unconfigured build for these commands. The isolated leaderboard tests in `npm test` apply the tracked SQL migration locally and do not require a hosted project.
