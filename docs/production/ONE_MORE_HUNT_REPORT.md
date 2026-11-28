# Operation One More Hunt · RC.10

RC.10 adds the separately scored Mastery course. Endless now asks for longer strings of lane changes and alternating jumps and slides, while keeping speed below a fixed ceiling. Treats are collected at swept contact and disappear immediately. Hunt Over shows XP, milestone progress and the actual items earned. The recorded final moments are optional, and Play Again is available as soon as the results appear.

## Starting point and gameplay audit

The branch starts at merged Masterpiece commit `ca87f8ce9467a9cb9e52bb705e539b7d1d8fe81d`, PR #48. RC.9 shipped a 15-territory route, an offline worker and a visual foundation for Hunt Over. The owner’s feedback about the plateau, pickup responsiveness and post-hunt progress drives this release. The RC.9 report records the historical 110–112 ms native Boreal interruption and variable first-hunt software timings. It does not establish a native RC.9 baseline. [Masterpiece report](MASTERPIECE_REPORT.md) · [Master roadmap](MASTER_ROADMAP.md)

| System | Verified starting behavior | RC.10 |
| --- | --- | --- |
| Route and speed | 30 stages over 450 seconds, pace reaches 28.995 m/s at stage 30 | Great Migration keeps its 15 territories, elapsed course and authored obstacle sequence. New speed becomes asymptotic after 450 s. |
| Endless | Stage 30 repeats and the late gap changes by at most 95 ms | Seeded movement strings increase in length. Recovery becomes less generous and paired actions become more likely. |
| Input | Pointer motion was already recognized before release. Fixed simulation runs at 120 Hz. | Touch movement threshold uses 86% of the measured width input to the existing recognizer. Direction, one move per gesture and sensitivity modes are retained. Accepted horizontal inputs require 90 ms between lane changes. |
| Movement | Critically damped lane response at 27, jump lasts 0.92 s and slide lasts 0.87 s. The final 150 ms accepted useful vertical buffering. | The final 180 ms accept one vertical follow-up. Pause and replay clear it. Existing jump and slide envelopes are reused with a small body alignment bias from lateral velocity and reduced-motion-aware landing feedback. |
| Collisions and pickup | Swept dog and hazard contact. Pickup used a final-tick proximity window and left an active treat mesh in a post-collection effect. | Lethal geometry and footprints remain. Treats use swept X/Z overlap and the rendered vertical bob. Scoring, removal, immediate cue and a small optional particle burst come from one event. |
| Scoring | Distance plus points, 10-point treats scaled by a capped multiplier and Good Boy doubling. | Mastery caps chain treats at 12 points before doubling. Each other pickup is worth 48, and skill bonuses are evaluated on cleared rows. Score records are separated by course. |
| Hunt completion | Versioned local save finalizes XP, Honors, gear and Lodge rewards before showing the report | Finalization also produces old/new result data for presentation. The optional XP and reward animation cannot grant rewards. |
| Replay | Primary Play Again exists on Hunt Over, and observed first submissions varied by device and workload | Kept on the same primary action. The optional recap reconstructs recorded poses and nearby hazards without advancing the hunt. |

## Endless model and fairness

The 450-second handoff uses an independent seeded stream. The earlier course feeds the same authored rows as Raptor through the end of the Great Migration. A bounded sequence builder then uses the elapsed Endless age. Let `p = age / (age + 480)`. Speed is `28.995 + (29.4 − 28.995) × p` m/s, and row positions use the analytic distance integral of the same curve. The 0.405 m/s allowance is roughly 1.4% above the old ceiling. Native readability at that speed is an acceptance gate.

Nominal lane-decision gaps tighten from 1.04 to 0.86 s. Nominal gate gaps tighten from 1.53 to 1.38 s. They are raised whenever the actual action or lane transition needs more room. Strings grow from 4 toward 13 decisions, the normal recovery addition shrinks from 0.88 toward 0.29 s, and the chance of a second, opposite gate rises from 22% toward 80%. The limiting factors are actual movement and human decision time. Rare hostile goose rows retain isolated approach and departure space. A construction that fails validation is replaced by a recovery row.

Every new row is checked against the previous lane exits, the swept collider, lateral settling and the current speed envelope. Standard setup preserves a 0.42 s simulated decision reserve alongside execution time. In the five seed-7 sample windows, the minimum modeled reserves were 0.430, 0.420, 0.421, 0.432 and 0.428 s, while the medians fell from 0.631 s at 10 minutes to 0.507 s at 60 minutes. The planned path retains at least ±50 ms at tested gate centers by the geometry check. Three seeds completed 30 minutes with both −40 and +40 ms offsets on **every** Endless timed gate. This is an authored execution margin. Camera exposure, recognition and actual swipe-to-presentation latency are separate measurements. The existing 19 m puddle recognition evidence came from earlier editions and is useful as a comparison, especially in snow and rain. Native verification must establish readable approach distances and last safe actions across terrain, weather and presets. [Timing fixtures](evidence/one-more-hunt/timing-windows.ndjson) · [RC.9 visibility evidence](evidence/masterpiece/REVIEW.md#readability)

| Time | Speed · old / new | Forced route lane changes per preceding minute · old / new | New planned sequence length |
| ---: | ---: | ---: | ---: |
| 10 min | 28.995 / 29.091 m/s | 33 / 38 | 6 |
| 15 min | 28.995 / 29.191 m/s | 25 / 39 | 8 |
| 20 min | 28.995 / 29.242 m/s | 32 / 37 | 9 |
| 30 min | 28.995 / 29.294 m/s | 28 / 36 | 10 |
| 60 min | 28.995 / 29.346 m/s | 26 / 34 | 11 |

These seed-7 lane counts compare the prescribed reference route, including changes selected by the generator. The new edition can have fewer total hazards in a minute because it emphasizes committed movement and protects intervals around geese and timed gates. Each sampled minute includes a different mixture of actions. Neither the counts nor the interval parameter imply a fixed human survival rate. [Raw difficulty series](evidence/one-more-hunt/difficulty.json) · [Difficulty chart](evidence/one-more-hunt/difficulty.svg)

All 12 guided seeds reached 10, 15, 20, 30 and 60 minutes. The survey exercised **32,383 rows** and more than five million fixed ticks, with a peak of **39 active entities**. Seed 7 also reached 120 minutes, 5,398 rows and a peak of 34. These are reachable reference paths, with no collisions in the recorded sample. A finite sample cannot certify every path or every human reaction. Earlier accelerated browser harness attempts stopped at a puddle when two intended lane changes collapsed into one rendered callback. Exact tick delivery via the isolated local QA hook resolved that discrepancy and ran the same seed through the full offline hunt. [Seed-by-seed survey](evidence/one-more-hunt/survey.ndjson) · [Rendered run](evidence/one-more-hunt/continuous-offline.json)

## Scoring, game feel and fairness diagnostics

Treats are 6, 8, 10 or 12 points before Good Boy doubling, advancing every five consecutive treats up to the cap. Milestones at 5, 10, 15, 25 and 40 add up to 50 one-time points per chain milestone. Missing a required treat resets the chain. Pickups on optional branches leave it intact. Waterfowl and other pickups use the original pickup event and add 48 points before doubling in Mastery. Higher combos use richer notes on the existing effects bus. Audio settings remain independent.

Near misses award 24 points after safe clearance when a genuine lateral escape would have collided at a surface 0.18 m closer to the same obstacle. An eligible row earns at most one near miss. A clean row uses the swept counterfactual to check that the dodge, jump or slide mattered. Irrelevant rows break the chain, and every six clean rows pay 36 to 48 points. Moving goose and washout rows are excluded from skill scoring. The same row cannot replay its award when multiple collision volumes overlap. A late collision stops the step before pickups or bonuses count.

In the 60-minute series, distance contributed 103,805 points. Seed 7’s guided score shows the relative size of distance, pickups and clean execution. A survival-focused route still receives distance and whatever it intersects. Following the pickup line adds capped combinations. A legitimate close dodge can add 24 once. Deliberate tight approaches create no bonus unless clearance succeeds. The survey’s guide naturally took many treats, so it is closer to an expert collection route than a neutral human score distribution.

Jump and slide still use the same skinned dog and collision envelopes. During a lane change, visual heading follows lateral velocity without offsetting the dog’s actual position. Landing camera movement stays below 35 mm and respects comfort and reduced motion. Water, mud, sand, gravel, frost and pickup accents reuse one 32-instance spray pool. Existing haptics are feature-tested. The new cue uses supported retrieve pulses at chain milestones. iPhone Safari may hide the control if vibration is unavailable.

The local diagnostic export includes recent accepted inputs, input queue and accepted times, first submission after acceptance, speed, lane, vertical state, relevant hazard IDs, course, seed and fatal contact. It never transmits the export. Submission timing does not establish the instant pixels became visible.

## Hunt Over, career and replay

The result snapshot is created after authoritative completion. It carries previous personal values, the actual XP receipt, up to three strongly relevant single-condition Honor deltas and first discoveries. The ordinary 1.35 s sequence tallies the actual final score and walks the real XP bands. For a rank, Lodge tier, first Great Migration or Master Hunter result, the presentation extends to 1.90 s. Reduced motion displays the settled result immediately. Skip Animation paints the final state, and Play Again cancels the presentation. The XP meter sits above the optional field note and recap controls in the short portrait layout.

The XP sequence uses the authoritative career thresholds and carries overflow across each earned level. Level 100 displays the correct completed meter and lifetime XP. Field Honors show recorded progress or a newly earned result. An expandable reward shows the actual equipment, trophy, photographed discovery or Lodge upgrade. Normal gameplay connects those cards to the Kennel, Journal or Lodge. Studio fixtures use the same presenter with example receipts and no progress writes. The field report retains the original detailed tallies and includes Mastery near misses and clean sequence lengths.

The save snapshot advances to schema 7. The stable course key allows the same Camp board and career rooms to separate Mastery scores from older records. Earlier score and historical entries stay archived. Distance, duration, career ranks, earned Honors, equipment and both discovery collections retain their existing meanings. The snapshot is written before presentation. Animation and recap have no awarding path. Existing run receipts guard duplicates, and a failed storage write remains in memory and retries at lifecycle boundaries. If storage remains unavailable while the app closes, the in-memory result cannot be guaranteed to survive.

Final Moments records up to 84 poses at 30 Hz and 96 nearby hazard descriptors, then uses the real renderer at 0.48× speed. It reconstructs the last approach and collision pose rather than repeating input into the authoritative simulation. Terrain and hazard models use their existing assets. Wildlife and atmospheric styling are recomputed for display where applicable. End Replay and Escape return to the same result. The replay buffer excludes personal identity and is discarded when a hunt starts.

The offline Chromium test started from a version-6 two-profile fixture, crossed a real XP threshold, watched the recorded final moments, replayed twice and independently checked the persisted snapshot. The active player had exactly two completed hunts. The second profile and its earlier score were preserved.

## Competitive compatibility and deployment requirements

| Rules | Course | Replay contract |
| --- | --- | --- |
| Historical signed competition | `migration-30-phase-05` | Existing `great-migration-1` signed server authentication, limits and scoring. |
| Previous local edition | `migration-30-raptor` | Archived local records and legacy route support. |
| Mastery | `migration-30-mastery-1` | Local game and separate deterministic verifier tagged `one-more-hunt-1`. This candidate never requests a hosted Mastery ticket. |

Three known long Phase 05 replays reproduced scores of **38,067**, **45,850** and **66,583**. A separate tagged Mastery trace lasted **1,052.405 seconds**, reproduced **58,741 points**, **65 retrieves**, a **683-treat combo** and a **54-row clean sequence**. The verifier computes those values from the seed and accepted actions. Tests reject an incompatible course, impossible same-tick inputs, an altered terminal tick and out-of-range totals. Contact and trace shape are checked independently from any client-scored result. The sample is verified locally and has no newly issued hosted signature. Both production standings reads returned closed and empty. [Historical replay output](evidence/one-more-hunt/historical-replays.ndjson) · [Mastery replay output](evidence/one-more-hunt/survey.ndjson) · [Hosted board checks](evidence/one-more-hunt/worldwide.json)

To open a future season, first provision separate season and course identifiers in a staging environment. Bind the course, seed, player and season to each signed ticket. Route only verified Mastery tickets to the new verifier. Keep the historical dispatcher and scoreboard separate. Test auth, lease binding, replay limits, exact termination, rank ordering, closure behavior, rollback and server workload under the issued limits. The new verifier caps traces at 60 minutes and 8,192 accepted actions. The shared handler’s explicit staging opt-in requires separate `rr_mastery_claim` and `rr_mastery_commit` operations. The claim must return the authorized Mastery course and season with its seed and lease. Its default production entry point still rejects Mastery. An in-process staged service test checks the opt-in, mismatched season rejection and independently reproduced commit metrics. Its workload budget, schema receipts and hosted signing need independent certification. No SQL migration, RLS change, reset or deployment is part of this draft.

## Performance, resources and offline verification

The software startup pairing used a 320 × 568 portrait viewport at the same Balanced setting. Rows are independent observations and include worker, scene and browser scheduling. Warm loads refer to a new document using the existing offline cache.

| First-hunt measure | Fresh RC.9 | Fresh RC.10 | Cached RC.9 | Cached RC.10 |
| --- | ---: | ---: | ---: | ---: |
| Ready marker | 9,489 ms | 5,083 ms | 7,544 ms | 4,348 ms |
| Input to first submission | 162.8 ms | 91.0 ms | 315.3 ms | 163.1 ms |
| CPU in first submitted frame | 57.8 ms | 22.5 ms | 124.4 ms | 20.7 ms |
| Next callback | 176 ms | 94.1 ms | 325 ms | 166.2 ms |
| First sampled presentation interval | 1,506.1 ms | 11.0 ms | 20.9 ms | 7.3 ms |

These cases used candidate `31da6c9`. They do not establish a native speedup. A separate short-hunt replay during concurrent software load took 1,217 ms to first submission even though the first frame used 3.4 ms of CPU and its first sampled interval was 76.2 ms. Initialization operations in that sample totaled under five milliseconds before rendering work. This gap highlights browser scheduling and the need for real first-visible and first-responsive timings on physical phones. No sample was removed. [Startup traces](evidence/one-more-hunt/startup.json) · [Offline replay trace](evidence/one-more-hunt/replay-offline.json)

The historical Boreal spike remains unresolved on native iPhone. Transition upload, disposal, shader preparation and synchronous driver work remain plausible contributors. Normal-clock paired software attempts ended at different points before finishing the comparison window. Keep their workload samples separate. [RC.9 partial transition](evidence/one-more-hunt/boreal-rc9.json) · [RC.10 partial transition](evidence/one-more-hunt/boreal-rc10.json)

The continuous Low WebKit fixture reached **606.01 simulated seconds**, used **536 accepted actions** and crossed the whole route while offline. It used an accelerated clock and a **102 × 181** drawing buffer. A second such run reached 606.20 s. Both failed the existing 130-geometry budget assertion, with a peak of **134 geometries** compared with **129** in the shorter RC.9 fixture. Peak textures moved from 12 to 13, while resident tiles stayed at seven. The first RC.10 run sampled 82 peak draws and 201,140 peak triangles, with 30 shader programs at the endpoint of the retest. The experiments kept the terrain, foliage and visibility settings intact. Temporarily trimming idle puddle geometry reuse did not resolve the gate, and the previous reuse policy was restored.

The 606.01 s compatibility run measured 20.3 software FPS, 31.79 ms mean CPU workload, a 420 ms maximum presentation interval, 2,530 / 2,445 / 862 intervals over 20 / 33.3 / 50 ms, and 2,451 discarded samples under the accelerated clock. These are software-runner observations. The normal iPhone target remains approximately 60 FPS with 98–99% of intervals within 20 ms and zero discarded simulation samples. [Continuous render trace](evidence/one-more-hunt/continuous-offline.json) · [Geometry retest](evidence/one-more-hunt/continuous-retest.json)

The production build `5076c61` is 18,605,511 bytes, including 18,515,852 required offline bytes and 127 required files. The RC.9 comparison contains 18,586,113 total and 18,496,466 required bytes. Under content-hash reuse the RC.10 update requires 2,489,722 new bytes before transport encoding. RC.10 reuses the existing fonts, models, recordings, textures and licensed art. The recap adds bounded CPU records rather than decoded media. The particles share the existing instanced mesh. [Existing media licenses](ASSET_LICENSES.md)

Chromium verified that a paused hunt in another tab blocked update activation and that the interrupted download retried while keeping the verified assets. Both saved hunts survived activation. Production and Art Studio builds passed the offline manifest validator. All 243 automated tests passed, including the existing regressions and new long-route, pickup, near-miss, XP threshold, archive, recap and staged verifier checks. [Offline update trace](evidence/one-more-hunt/interrupted-update.json)

## Art Studio and gameplay evidence

Build with `npm run build -- --mode art-studio` and serve with `npm run preview -- --host 0.0.0.0`. The branch uses the existing `/Retriever-Run/` path. Append a query below to its preview address. No hosted RC.10 preview was deployed for this draft.

| Review | Art Studio query |
| --- | --- |
| Jump, slide or lane change | `?studio=1&view=dog&motion=Jump&framing=trail`, or `motion=Slide` / `motion=Lane%20change` |
| Treat, combo, near miss and clean obstacle feedback | `?studio=1&view=effects&effect=pickup`, or `effect=combo` / `near` / `clean`. Tap Show Feedback. |
| Water and mud effects | `?studio=1&view=effects&effect=water`, or `effect=mud` |
| Progressing difficulty | `?studio=1&view=endless&minute=5&seed=7`, also `minute=10`, `15`, `20` or `30`. Select Run Isolated Practice for interactive controls. |
| Ordinary result and records | `?studio=1&view=report&result=ordinary` or `result=record` |
| Partial, exact and multiple-level XP | `?studio=1&view=report&result=partial`, `result=level` or `result=multi` |
| Rank, equipment, trophy, Lodge and discovery | `?studio=1&view=report&result=rank`, or `result=equipment` / `trophy` / `lodge` / `rare` |
| Great Migration and Master Hunter | `?studio=1&view=report&result=migration` or `result=master` |
| Final moments replay | `?studio=1&view=recap&offset=0&seed=7`. Tap Run Isolated Practice, let the hunt finish, then tap Watch Final Moments. |

See the matched result pair, the actual two-hunt offline clip with Watch Final Moments, the 15 continuous journey captures, and the clearly labeled Studio examples. Several individual movement, pickup, feedback and rare reward cases still need matched native recordings. Signals such as sound balance, haptic support and motion comfort require a device. [Visual and test evidence index](evidence/one-more-hunt/REVIEW.md)

## Owner iPhone acceptance

1. Start a normal hunt in Safari portrait. Use intentional short swipes on a small and large screen. Check lane changes, jumping, sliding, inputs near the end of another action, and the absence of incidental double moves. Confirm the first hunt starts promptly with audio on and off.
2. Run through multiple treats and a waterfowl pickup at different speeds. Check immediate disappearance, score and audio synchronization, a growing combo, a legitimate near miss and a meaningful clean sequence. Check splash, mud and camera effects with Reduce Motion both ways.
3. Compare the first minutes, the late Migration and several Endless intervals. Look for longer movement strings and fewer easy rests. Recheck snow, puddles, geese, foliage, signs and visibility on Low, Balanced, High and Auto. Note any obstacle you first understood too late.
4. Confirm each death makes sense. Watch the final moments and exit early. Check XP across a level boundary, Honor meters and interactive reward artwork. Tap Play Again immediately during the animation. Return to the profile and verify gear, Lodge, XP and discoveries persisted exactly once.
5. Run ordinary unrecorded sessions and export diagnostics separately from any screen recording. Record device model, thermal state, graphics setting, terrain and timing of any stutter. Include at least one Boreal-to-Foothills crossing, a cached replay and a long Endless run. [Performance diagnostics](https://bladunk.github.io/Retriever-Run/?perf=1)
6. Check whether the hunt feels fair and whether you want to replay. Record what led to that choice without forcing replay.

For human testing, observe first-time, casual, experienced runner and experienced Retriever Run players on several supported iPhones. Obtain consent and note their unaided starts, causes of death they can explain, voluntary replay, time to learn the controls, collection timing and Hunt Over understanding. Report sample sizes and the full range of outcomes. Review the provisional 95% unaided start, 95% death comprehension and 75% voluntary replay goals as internal measures. No participants or native survival distributions were available for this draft. Independent playtesting remains on the roadmap for RC.13.

## Rollback and outstanding release gates

The draft leaves production on the owner-approved release. For a future deployment rollback, restore the previously verified client artifact and deploy only after active hunts and update vetoes are clear. Export the current schema-7 save first. The older client protects the newer on-disk save from writes, so it may need the earlier exported version for interactive local progress. Keep both copies and reopen RC.10 to resume schema-7 progression. Leave the production database and existing ruleset season untouched.

Native Safari performance, device heat and speaker mix, real human difficulty and timing distributions, and a hosted Mastery signing and verification workflow remain open. The draft leaves telemetry transmission, support tooling, public profile and friends features, independent beta and production certification to their assigned releases. [Stable release checklist](RELEASE_CHECKLIST.md) · [Roadmap](MASTER_ROADMAP.md)
