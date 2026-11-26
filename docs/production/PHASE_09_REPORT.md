# Phase 09 · Worldwide Camp and competitive integrity

Phase 09 adds a distinct competition for the existing Great Migration. A ranked hunt uses a server-issued seed and records accepted actions on fixed simulation ticks. The verifier replays those actions and derives the result. Five leaderboards retain one verified best per player and metric. Exact-code friends, private Camps, scoped standings, a public record profile and competitive Honors use the existing optional anonymous identity. Solo hunting, career rewards and replay remain independent. The new ranked namespace is closed on installation.

| Review item | Identity |
| --- | --- |
| Integrated baseline | `3d4ce2fd1ef6e4d032b7a810c9ced0a1a2467169` · merged Phase 08 PR #36 |
| Deployed build checked at baseline | `1.0.0-phase.8 · 93cecaa` · manifest `e8a91c54d4edb1895c75` |
| Phase 08 approved review identity | `1.0.0-phase.8 · a8b6e41` |
| Branch | `codex/retriever-run-phase-09` |
| Review runtime revision | `dd98dfc84ef107555117cc2b487b1ee9b8203288` |
| Local verification build | `1.0.0-phase.9 · 63116ab` · manifest `5abc7323339f07dd9c58` |
| Isolated browser fixture build | `1.0.0-phase.9 · 8548f06` · manifest `b146d0d6001176ea56dd` |
| Review | [Draft PR #37](https://github.com/bladunk/Retriever-Run/pull/37) · [CI checks](https://github.com/bladunk/Retriever-Run/pull/37/checks) |

Phase 08 was accepted for merge. Its physical iPhone acceptance is still open. Phase 09 changes online entry points and presentation. It reuses the deterministic course, score, obstacle, collision and fixed-step modules, the 15 territories and 30 stages, and the Phase 08 interface and audio. The original career levels, 621 local Honors, 151 earnable cosmetics, 29 Journal species, Lodge, Boyd and offline Master Hunter path use the same save and progression contracts.


## Dedicated Worldwide follow-up

PR #37 was already merged when this directive arrived. The follow-up starts from its merge commit `7137b60a01e94e8337c927909ff3c5cda12ec333`. Pages served `1.0.0-phase.9 · f1a7d29`, content manifest `32ed589111635a5d9ae6`, during the live investigation. Review branch is `codex/retriever-run-phase-09-worldwide`. The runtime source is `8d9ae2d`. The review builds are `1.0.0-phase.9 · 2da3910` without network configuration and `1.0.0-phase.9 · b83b0db` with the isolated review connection. [Draft PR #38](https://github.com/bladunk/Retriever-Run/pull/38) · [CI checks](https://github.com/bladunk/Retriever-Run/pull/38/checks)

The title now offers six primary destinations. Hunt keeps its full-width button, and Lodge, Kennel, Journal, Worldwide and Camp share one row. Worldwide opens directly into its own titled view. The dialog keeps the same six destinations and marks the active one. Worldwide groups current rankings, the competitive profile and archived standings. Camp groups local records, Friends and Private Camps. The final 320 × 568 portrait test checked the six title buttons for clipping and 44 px minimum height.

The Worldwide selector offers Highest Score, Longest Distance, Longest Hunt, Most Retrieves and Longest Combo. Career Legends is visible as unavailable until a trustworthy long-term measure exists. The database returns the size of the eligible category and the current player's ordinal rank from one snapshot on the first page. The displayed percentile is the share of **other** ranked players below the current player after deterministic tie-breaking. A single entrant has no percentile. The view highlights the current player, shows both available adjacent rivals and gives the exact additional amount needed to beat the next rival, including the extra point, meter, retrieve, treat or millisecond required to break an earlier record. Worldwide has a manual Refresh action, visible course/version and last successful synchronization time. Opening the room after verification fetches the current best. Hunt Over shows the verifier's personal-best receipt with immediate replay. Named overtakes and rank movement notices remain pending.

### Live diagnosis and owner remediation

The live Pages bundle contains a Supabase project URL and publishable key. Its exact read-only Worldwide request returned HTTP 404 and PostgREST `PGRST202` for `rr_ranked_board`. The separately tested legacy `rr_camp_season` also returned `PGRST202`. The public API therefore cannot currently serve the ranked board. A public response alone cannot distinguish an unapplied migration, wrong project configuration or stale API schema cache. The app now reports the missing schema explicitly and distinguishes it from empty standings, lost Auth, offline cache, course/version mismatch, and a missing verifier. Opt-in diagnostics record only allowlisted operation and status names. No hosted database writes, sign-ups, test entries or configuration changes were made. [Copy-ready consolidated SQL](../../supabase/ops/phase-nine-install.sql) · [Precise SQL Editor and verification steps](PHASE_09_DEPLOYMENT.md#resolve-the-live-pgrst202)

### Actual local Supabase verification

This run used real GoTrue v2.185.0 anonymous authentication, PostgREST v13.0.7, PostgreSQL 17 in disposable containers, and the repository verifier behind a loopback HTTP relay. Three anonymous identities registered public nicknames through the actual app transport. The only seeded database input was the issued test ticket's seed. Every ranked score came from an accepted replay, and no seeding script wrote a best. The compiled Chromium app read those same database records. After closing and reopening its page, it read the same rank under the same anonymous identity from the existing browser storage. The fixture copied in the authenticated identity only once, before the initial page. It then prepared a fresh ticket and completed a real browser hunt using its server-generated seed. Hunt Over displayed the actual verification receipt with Play Again enabled. The five public category reads returned HTTP 200. Retrieves correctly had no ranked players in these short test runs.

| Isolated player | Initial verified score | Score after refresh |
| --- | ---: | ---: |
| QA Marsh Dog | 55 · rank #2 | 95 · rank #1 |
| QA Delta Dog | 75 · rank #1 | 75 · rank #2 |
| QA Cedar Dog | 35 · rank #3 | 35 · rank #3 |

QA Marsh Dog completed the improvement with its transport offline, reopened the saved outbox and synchronized. A following 45-point replay kept the 95-point best. The score category still held exactly three rows. Reusing the same receipt returned `duplicate`. A second identity could not submit the first identity's ticket. PostgREST denied a direct privileged write with HTTP 403. The local verifier rejected a practice course, archived version and false terminal tick. A separate embedded PostgreSQL fixture exercised public pagination through rank #100 and an authenticated rank outside that list. The earlier Phase 09 long-replay and social-policy tests retain their existing coverage. [Raw local verification summary](evidence/phase-09/worldwide/local-supabase.json) · [Mobile screenshots](evidence/phase-09/worldwide/README.md)

The consolidated script was applied after only the original Camp base SQL in a new isolated PostgreSQL engine. It exposed the public board, denied browser verification writes, preserved private-schema isolation and returned zero ranked entries with the new competition closed. Both review artifacts passed manifest and byte verification. The configuration-free artifact is 14,834,034 bytes, with 14,779,557 required offline. The presentation and diagnostics increase the prior offline set by 4,601 bytes. The final WebKit fixture covered private Camps, friends, submission reconnection and the verified Honor. The final offline Chromium regression covered a guest hunt, replay, the Kennel and existing Lodge progression. The follow-up suite has 196 automated cases and adds checks for missing database APIs and pagination beyond rank #100. The previous hosted build continues to require owner migration and Edge verification. Physical iPhone acceptance is pending.

### Physical iPhone checklist for the owner

1. Open Worldwide directly from the main menu of the reviewed build. Check all six destinations, the selector, ruleset and server status.
2. In an approved isolated or explicitly authorized ranked test window, create an anonymous test profile. Prepare a ranked hunt, finish a legitimate run and look for the server receipt on Hunt Over.
3. Open Worldwide, refresh and find your nickname and verified score. On a second eligible hunt, improve the score. Refresh and verify the same row now shows the higher best.
4. Close the browser tab or Home Screen app, reopen it and confirm the same nickname and best return.
5. Prepare a second ranked entry online, start it, then disconnect during play. Finish it, verify local rewards and the pending state, reconnect and confirm exactly one verification. A hunt **started** fully offline stays local.
6. Check that Play Again stays available while verification is pending. Before any public ranked activation, confirm a successfully installed verifier, a closed production control and the Phase 10 owner approval.


## Existing Camp audit

| Area | Prior behavior | Phase 09 |
| --- | --- | --- |
| Identity | Existing Supabase browser adapter isolates anonymous sessions by local profile and scopes use to the previously claimed Auth identity | Same auth, nickname screening, rename limits and profile choice. Separate friend codes and group handles avoid exposing any Auth identifier |
| Archived standings | Three categories and per-metric bests. Preseason range checks preceded optional Season One tickets. Dates and stable identity break ties. Previous browser ruleset could not enter the current course | Historical board is labeled Archived standings. API and existing retry receipts remain intact. The competition has its own control, ticket, record and award tables |
| Security | Private `retriever_camp` schema and RLS. Security-definer RPCs with empty search paths. Existing range and time checks useful as filters | The replay service calculates accepted results from the canonical simulation. Direct table access and client access to verification writes are denied |
| Outbox and rivals | Small personal-best contender queue, cached board pages, and a server-backed rival calculation for older records | The older queue retains its owner/session identity. New verified replays have separate ticket keys and a bounded submission path. Worldwide rankings show the nearest verified entry above and below |
| Public configuration | GitHub Actions supplies project URL and the publishable browser key | Same config. Privileged service key stays inside the Edge runtime. Neither a logged-out browser nor signed-in anonymous guest can call the privileged write function |

The live release was identified through its public build manifest. The repo records migration files and prior operational instructions. This review did not use live database credentials to infer which SQL the owner previously applied. The owner instructions include read-only prerequisite checks. [Original Camp](../../GLOBAL-CAMP.md) · [Owner operations](PHASE_09_DEPLOYMENT.md)

## Competition, rankings and profiles

The new namespace is `great-migration-1`, bound to `migration-30-phase-05`. Worldwide shows **score, survival duration, distance, retrieves and longest treat combo**. Values are integers, with duration in milliseconds and distance in whole meters. Only positive results enter a category. Each metric has a separate best and server record time. Order is higher value, earlier accepted record time, then stable internal UUID. UUIDs never appear in public results. A tied later submission keeps the earlier record. An example is scope-aware filtered standings with at most 25 rows per request and the first 100 ranks publicly browsable.

The signed-in Worldwide view gives own rank, verified best, adjacent rivals, differences and last synchronization time. A tied metric tells the player why record time matters. A row opens a public profile with the chosen nickname and verified personal bests across categories. No public directory, percentile guesses, locally claimed career rank, cosmetics, Master Hunter badge or Career Legends ranking are presented as server-verified. Private and friends boards compare the same verified bests among authorized current members. They do not publish membership. A true personal best can surface on Hunt Over. Named overtakes, top-100 awards requiring reliable timing, and verified career recognition remain pending.

## Replay verification and launch gate

1. Choose Prepare a ranked hunt in Camp. This explicit action gets a random ticket, a server seed and a 48-hour expiration. The entry may proceed once prepared. Ordinary Hunt and Play Again start local immediately and perform no ticket request.
2. The browser records accepted actions at their fixed ticks, including accepted buffered inputs. The server derives movement, collision fraction, survival, points, retrieves and longest combo using the canonical modules. It accepts only a trace that reaches a collision on the declared tick. The uploaded payload carries version, ticket, tick count and action tape. It carries no claimed score and uploads no personal device or location information.
3. The Edge handler bounds the body to 20 KiB and the tape to 2,048 actions and 108,000 ticks, or 15 minutes. It confirms the bearer with Supabase Auth. Only the service may claim a ticket under that caller’s identity. The database rejects tickets for another player, expired tickets, wrong courses, too-early completion and competing claims. A temporary lease prevents duplicate replay compute. The service finishes with an atomic receipt, personal-best updates and idempotent award rows. Retry of an accepted ticket returns the same receipt.
4. Replay verification confirms a possible sequence on the official course. A browser can still automate play, inspect its seed, manipulate client timing within the server bounds, or create disposable anonymous accounts. The protocol does not prove human input and peripheral timing. Ticket limits (four per minute and 60 per day per identity), server timing, seed issuance, signed identity, a finite trail tape and dashboard-level abuse monitoring reduce practical risk. Hosted Edge CPU, mobile long-route parity and provider abuse controls are Phase 10 launch checks.

Legacy records remain archived. Successful new reads and closure are independent of the provider’s historical namespace. With the review migration applied to a new project, the public board opens in a closed state and cannot issue ranked entries until an owner activates it. No production data, Auth variables or live deployment was changed. [Install, backup, verification and rollback](PHASE_09_DEPLOYMENT.md)

## Friends, private Camps and data control

- **Friends.** Share a random exact code. The recipient accepts or declines, the sender can cancel, and either party can remove the connection. The SQL normalizes the pair, rejects self-connections and duplicates, and caps each member’s requests plus friends at 50. The friends board includes only mutually accepted friends and the current player. The database allows 12 code lookup attempts per identity per hour.
- **Private Camps.** An owner creates a screened 3–20-character name and shares an opaque UUID invitation. Members see standings and allowed roster data. Only the owner sees and rotates the invitation, removes members or transfers ownership. The owner may close a Camp. An owner leaves by transferring or closing it first. Each player may belong to at most five Camps. Each Camp holds up to 32 members. There are three creations per day, 20 join attempts per hour and 12 rotations per hour per identity. Rotation immediately invalidates the previous invite.
- **Profiles and privacy.** Joining uses the existing browser-scoped anonymous session. A browser storage reset or new device can lose that identity. Supabase supports optional linking with a separately designed verified identity flow. This phase adds no account recovery secrets or automatic cross-device claim. In Competitive profile, an explicit typed confirmation can delete the current player’s Camp application data and cascade their hosted records, memberships, hosted receipts and still-owned Camps. Their local save and underlying platform Auth record remain. [Anonymous Auth](https://supabase.com/docs/guides/auth/auth-anonymous)

## Local play, replay and competitive rewards

A ranked hunt started with a prepared ticket can finish during an outage. Its trace stays in an identity-bound browser outbox with up to three entries per profile. Stable ticket IDs survive retry or reload. A tape can sync again on a safe screen or manually through Camp. It expires after 48 hours. Permanent invalid results leave the queue. Read requests are paged and cached for a minute, with a bounded set held in memory. Older standings can still be viewed through the separate archive when available. The app labels cached rankings and pending, verified, or ineligible results. The app uses manual or safe-screen retries and avoids continuous polling.

Local result and reward saving finishes first. Hunt Over reports a genuine verified best and groups earned competitive Honors when a receipt is available. Replay remains active while verification is pending. A late receipt updates the local Camp display on a safe screen and the game keeps its visual and input state during hunts. The service issues **15** of the 25 reserved IDs. First Verified Hunt, Private Camp Member, Three Leaderboards, and four tiers each of verified score, distance and retrieves all have an explicit check. The other **10** remain pending: four global placement tiers, four overtake tiers, Camp Invitational and Returning Rival. Verified awards appear in Camp profile, Field Honors and the Trophy Room, plus a Lodge overview count. They are independent of local career XP, wardrobe ownership and Master Hunter qualification.

| Award | Canonical check |
| --- | --- |
| First Verified Hunt | One accepted replay |
| Three Leaderboards | A positive verified score, distance and retrieve best in the new namespace |
| Private Camp Member | Joined a private Camp with a valid invitation |
| Verified Score | 2,500 / 10,000 / 25,000 / 50,000 in one replay |
| Verified Distance | 500 / 2,000 / 5,000 / 10,000 meters in one replay |
| Verified Retrieves | 1 / 5 / 10 / 25 in one replay |

## Free-tier estimate

Supabase’s official Free plan listed 500 MB database, 50,000 monthly active users, 5 GB standard egress, 5 GB cached egress and 500,000 included Edge invocations when checked. The Edge limits page lists a 150-second Free wall limit and 2 seconds of CPU time per request. GitHub Pages lists a 100 GB monthly soft bandwidth limit. Treat paid platform headroom as unavailable for this release. Supabase can pause an inactive project or throttle at quotas. Local play remains available. [Free pricing](https://supabase.com/pricing) · [Edge limits](https://supabase.com/docs/guides/functions/limits) · [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)

Illustrative monthly workload uses a 30-day month, 20% daily actives, up to four ranked completions and four uncached boards per active day, about 4 KB per board response, 2 KB of modeled egress per ranked transaction across Auth/Edge/Data API, and 30% extra modeled API egress and verification invocations for account, social and retry traffic. Storage estimates include approximately 0.7 KB per active ticket/receipt including indexes and a seven-day cleanup, plus 2 KB per registered player for the combined ranked best, Auth and limited social/award rows. Actual Auth rows, larger or more numerous relationships, database overhead, logs and WAL, retention schedules, short-lived lease writes and response overhead vary. Rank counts use indexed constraints. No production resource samples were taken.

| Registered players | Daily active | Ranked submissions/month | Approx. verification invocations with retry allowance | Modeled egress/month | Modeled hot ranked and account data | Fresh Pages installs at 14.83 MB |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 20 | 2,400 | 3,120 | 18.72 MB | 0.59 MB | 1.48 GB |
| 1,000 | 200 | 24,000 | 31,200 | 187.2 MB | 5.92 MB | 14.83 GB |
| 10,000 | 2,000 | 240,000 | 312,000 | 1.87 GB | 59.2 MB | 148.3 GB |

Without ticket cleanup or with substantially more actives, these estimates rise. An influx of 10,000 new downloads crosses the Pages soft monthly transfer limit before this model crosses Supabase’s listed quotas. Keep static and online usage separate. Monitor the owner dashboard, keep archives read-only, run bounded authorized ticket cleanup and suspend issuance if quotas or abuse require it. Hosted CPU and abuse rates remain unmeasured. No paid service, analytics, Auth channel or runtime dependency was added.

## Verification and review

The Phase 08 baseline passed 185 automated tests. Phase 09 passes 194. Its suite includes PostgreSQL authorization tests for public and authenticated roles, direct-write denial, legacy compatibility, actual replay through the verifier boundary, owner-only claims, lease and receipt idempotency, ties, best improvement, profile disclosure, friendship consent, invitation rotation, nonmember access, ownership transfer and explicit deletion. Browser tests use the built Pages subpath and a disposable database. The Supabase HTTP and Auth gateway are isolated fixtures. The published screenshots show fictional opponents and masked invitation codes. Review does not write to a hosted database. The read-only owner verification script returned the expected closed control, grants, RLS and zero competitive data on a fresh database. The final online fixture passed at 320 × 568 in Chromium and WebKit. Each used in-engine gameplay to record a locally saved 95-point hunt. The verifier placed it at #2, granted exactly one Honor and successfully submitted a second completed hunt after disconnection. Its matching best produced no duplicate award. The final portrait automation measured ordinary replay in 211 ms in Chromium and 1,712 ms in WebKit while multiple software render jobs shared the host. No Camp request occurred during ordinary replay. The earlier standalone offline smoke on the preceding client build recorded 49 ms in Chromium. These figures include automation and scheduling, so native replay and frame pacing need direct retest. [Browser results and portrait gallery](evidence/phase-09/README.md)

The standalone verifier package is **310,983 bytes** and passed Deno 2.9 type checking. The actual bundled handler returned the same 95 points in 100 isolated Deno runs with stubbed Auth and database transport. Median was 0.68 ms and p95 was 6.53 ms on this host for the 3.16-second hunt. The three `node scripts/field-stress.mjs ranked-replay` cases verified 451.687, 601.631 and 862.124 seconds of simulation with 438–878 accepted moves, matching all five metrics. Replay work took 377–590 ms in Node on the shared host. The source draws from the existing offline QA route and publishes no raw input tapes. Long hosted execution against Supabase’s CPU limit remains a launch check. [Recorded long verifier cases](evidence/phase-09/long-replays.json)

Both 70-file artifacts pass production verification. The configuration-free local build totals **14,829,433 bytes** and requires **14,774,956 bytes** offline. The matched Phase 08 artifact requires 14,755,349 bytes. Six changed required files total **922,273 bytes** against that cache, with the remainder reusable. The generated server bundle travels with the owner deployment package and sits outside the PWA manifest. During active ranked play, the browser retains only a bounded action tape for submission. The local path does no additional simulation or networking.

The Phase 08 → 09 production-subpath rehearsal interrupted an asset mid-transfer, recovered it, repaired a corrupted cache entry, and reused the verified audio. A paused hunt and an open Lodge each vetoed activation. The final phase activated after both closed and preserved two completed hunts and the swipe setting. [PWA update trace](evidence/phase-09/update-verification.json)

The existing game’s `runner.js`, `collision.js`, `difficulty.js` and course data retain the tested Phase 08 behavior. Previous long-course evidence still applies. The existing production verifier and the same official icon/privacy exclusions cover the new artifact.

## iPhone owner acceptance and remaining work

1. Open a prepared isolated review build on iPhone Safari and the installed PWA. Complete a guest hunt in airplane mode. Verify local rewards, paused recovery after backgrounding and immediate replay. Check the Phase 08 acceptance items separately.
2. Test with two consenting anonymous players in the isolated project. Accept and remove a friend, join by invitation, rotate it, confirm the old code fails, and verify camp and friends standings. Check that a nonmember cannot see the roster.
3. Start a ranked hunt while connected. Disconnect mid-hunt, finish, open Camp on reconnect and verify one receipt and the canonical result. Try a long run, faster local replay while a ranked result waits, and rank reads from older clients. Check hosted Edge CPU and timings under the real Free runtime.
4. Confirm the closed production state, backup and launch plan before approving any database application or activation. Use the [owner operations](PHASE_09_DEPLOYMENT.md). The [final visual backlog](FINAL_VISUAL_BACKLOG.md) carries rank emblems, social screens and badges into Phase 08B. Native iPhone and hosted Supabase acceptance remain open.
