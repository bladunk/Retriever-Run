# Operation Connected · RC.12

Connected adds a private, score-ranked Friends and Camp experience, explicit public career snapshots, local share images and equipped-first wardrobe ordering. It introduces an independent Mastery season and complete ticket-to-record path in the draft code. Production competition stays closed. The owner can review the change without applying production SQL or deploying the verifier. [Draft PR #51](https://github.com/bladunk/Retriever-Run/pull/51)

## Verified start and deployed state

PR #50 merged at `4d39b498728eb63a90d3fbf86685ce1bdb6162fb`, the latest main at branch creation. Pages deployed that commit via run `46111762038`. The live artifact identified version `1.0.0-rc.11`, build `c3ca268`, manifest `d8765feeeda517e430de`. The owner's observed progression preservation is separate physical evidence. The draft uses branch `codex/retriever-run-connected`. The current final revision and build checks are pinned by the draft PR. [Merged baseline](https://github.com/bladunk/Retriever-Run/pull/50) · [Pages run](https://github.com/bladunk/Retriever-Run/actions/runs/46111762038) · [Live manifest](https://bladunk.github.io/Retriever-Run/content-manifest.json)

Public production requests to both historical boards returned HTTP 200, `open:false`, season `great-migration-1`, course `migration-30-phase-05`, zero eligible scores. The new Connected endpoint returned HTTP 404 with `PGRST202`. That agrees with RC.12 additive SQL pending and the intentionally closed screen the owner reported. Public production reads prove endpoint availability and state. They do not establish hosted ticket issuance or Mastery verification. No hosted privileged schema access, usage counts or signed submission was available for this review. [Sanitized public requests](evidence/connected/live-standings.ndjson)

## Competitive architecture

The merged client issued historical tickets, forced ranked play onto Phase 05 and dropped recordings above 108,000 ticks or 2,048 moves. The RC.10 code had a Mastery verifier and a staged handler gate, with no hosted claim/commit implementation or master-ticket client. Connected keeps the legacy endpoint and board unchanged. The draft migration creates `one-more-hunt-1` for `migration-30-mastery-1`, with a separate ticket ledger and an explicit closed flag. A separate `RR_ENABLE_MASTERY=true` Edge environment setting enables dispatch after owner approval. The client only offers ranked Mastery with a matching, open, fresh server season and an explicitly enrolled local profile.

The authoritative runner and replay simulator use the same gameplay rules as RC.11. The client records accepted moves with their fixed ticks after input filtering. The verifier derives seed and identity from a server-issued ticket and Auth, validates bounds and runs the course to its real terminal step. Client scores, screenshots and local save values cannot supply verified statistics. An expiry of 48 hours allows reconnect and retries on the same ticket. One active lease per player and four in total bound the Mastery verifier work under bursts. Tickets also inherit the 4 per minute and 60 per day per player issue caps. Only the server role can claim and commit. Authorized commits serialize by player, validate terminal duration and write independent bests with an idempotent receipt. Rejected or incompatible tapes do not update ranking. Production SQL, Edge and activation remain separate. [SQL migration](../../supabase/migrations/202611280002_connected.sql) · [Owner runbook](CONNECTED_OPERATIONS.md)

Player progression and multiplayer records remain separate. An eligible result queues with its original profile, identity and ticket during an outage. A lost acknowledgment returns the existing receipt on retry. Offline hunts without tickets always remain local. During a hunt or while the app is hidden, social work observes the existing flush safety gate. Competitive screens load on demand and no periodic polling was added. Local Play Again retains its immediate ordinary-hunt action.

### Long-hunt verification

Mastery accepts 240–432,000 ticks at 120 Hz, up to 8,192 accepted moves and at most 80 KiB of uncompressed request body. Legacy remains 108,000 ticks, 2,048 actions and 20 KiB. Stream validation, encoding checks, terminal matching, ownership, elapsed wall time, expiry, bounded simulation and leases precede any write. Longer Mastery hunts still earn local progress. The published limits above 60 minutes need a further bounded architecture and hosted proof before extending the eligible course.

| Target | Real terminal time | Accepted moves | Local replay CPU |
| --- | ---: | ---: | ---: |
| 7:30 | 7:33.376 | 394 | 371 ms |
| 10:00 | 10:01.265 | 533 | 284 ms |
| 15:00 | 15:01.261 | 830 | 410 ms |
| 20:00 | 20:01.566 | 1,120 | 453 ms |
| 30:00 | 30:07.139 | 1,742 | 642 ms |
| 60:00 | 59:46.423 | 3,577 | 1,264 ms |

The same terminal runs passed the Edge handler plus disposable PostgreSQL claim, commit, board read and duplicate receipt. CPU estimates above are from a separate Node benchmark on the review host, measured with `process.cpuUsage()`. They are not hosted timings. Supabase documents a 2 s CPU limit per worker and a 150 s wall-clock limit on Free. The near-hour tape was 26.5 KB. Validate cold and warm execution and bursts on an authorized hosted staging configuration. If a legitimate 60-minute replay does not have sufficient CPU headroom, keep activation closed and prototype an authenticated resumable verifier with server-owned checkpoints, capped jobs and idempotent final commits. The RC.10 two-hour solver reference establishes route survival only. [Local timings and trace lengths](evidence/connected/verification-lengths.ndjson) · [Supabase Edge limits](https://supabase.com/docs/guides/functions/limits)

Legacy reproductions still give scores **38,067**, **45,850** and **66,583** at the original seed and tick traces. The 15-minute historical guard remains in force. [Historical evidence](evidence/connected/historical-replays.ndjson)

### Standings and social experience

- The same table ranks Worldwide, Friends and private Camps by verified score descending, earlier verification timestamp, then stable player ID. Phone layouts prioritize Rank, Hunter and Score. Tap a hunter to see verified distance, duration, retrieves and combo. The columns represent independent personal bests. Show up to 100 rows in pages of 25. The signed-in panel can show rank outside the first 100, total population and nearby rivals.
- Percentile is the percentage of *other eligible hunters with a strictly lower verified score*, rounded to a whole percent. Ties change official ordinal position but do not count as beating an equal score. No percentile appears for zero or one player, fewer than five in the UI, unranked players, stale data or legacy fallback. Small groups still show actual rank and count.
- The UI distinguishes closed, empty, eligible, unranked, offline, pending, cached, unavailable and mismatched-course cases. Season identifiers and sync timestamps sit under Season details. New season archives are explicitly separate from the original Camp archive.
- Friends use the existing random code, exact matching, mutual acceptance, rate limits and unlinking. Add copy, native code sharing where supported and replacement of a code without dropping connections. Awaiting and accepted states remain private. A friend comparison shows both verified bests. Camp membership, owner controls, transfer, removal and invitations reuse the existing protected RPCs. Private boards independently check accepted friendship or membership before reading.
- Enrollment with a public nickname is optional. A player can explicitly publish or remove a local snapshot of career level and Great Migration completion once the independent backend flag is authorized. Verified records remain labeled separately. A nickname lookup returns opted-in snapshots or public verified results. It returns no Auth UUID, dog name, diagnostic, precise device identity or local save.

## Local sharing and equipment

- Hunt Over can share the actual completed run, and Lodge Records can share the retained best for a specific course. The card uses the in-game route drawing with the recorded territory, and shows score, distance, duration and retrieves from the same hunt. Older records without a recorded territory omit it. A local banner does not imply online verification.
- The Kennel uses its current model and existing 3D renderer for a dedicated portrait of the equipped coat, collar or bandana and vest. The snapshot uses equipped gear even if the player is inspecting a locked item. Restoration returns the previously previewed outfit after one render. There is no additional WebGL context or retained render target.
- The Lodge export uses the existing earned tier artwork, material choice, selected or automatic shelf trophies and applicable furnishings or milestones. It uses a separate camera composition with no menus, Save file or private profile fields.
- Portrait JPEGs are 960 × 1280, square exports 960 × 960. Both use local resources and system typefaces. Nickname and ordinary dog-name sharing start off. Cancel keeps the preview open and has no publish side effect. A file-share sheet is offered if the platform reports support. Save image remains a local fallback. Canvas re-encoding keeps source file metadata out, and closing or switching format releases the old object URL. No upload service or new art download is needed.
- In every Kennel category the equipped item appears first, followed by other owned items and then locked items. Each group keeps catalog order. Owned, All, Locked and Favorites filters still work. Reordering does not change unlock requirements or replace existing gear.

## Verification and limits

The full local suite passed **249 tests** with the new Connected cases included. Isolated database tests verify Mastery closed defaults, claim and commit permission, public versus private scopes, social acceptance and code rotation, career publication and withdrawal, honest ties, 100-entry pagination and below-100 own position. The browser package and deployable Edge bundle compiled successfully. Review evidence uses disposable synthetic identities, game fixtures and zero production submissions. [Verification and visual evidence](evidence/connected/REVIEW.md)

Chromium at 320 × 568 exercised the mocked competitive lifecycle, invitations, private comparisons and Camps, a stale board, missing connectivity, an outage and the pending ranked result. Both test profiles preserved progress. Software WebKit at 430 × 932 exercised the closed screen and installed offline play, JPEG generation for all three share types, report dialogs and immediate replay. Browser file-share cancellation was instrumented. Physical iOS file-sheet activation and save behavior remain open. The Chromium install check reproduced an interrupted Labrador asset, resumed the verified cache, completed an offline hunt and retained four runs through an interrupted/paused update. No telemetry or changes to the RC.11 feedback queue, private inbox or intake switch were added.

Open physical gates include repeated-hunt geometry growth, the historical Boreal/Foothills interruption, Fern resource churn, start/replay responsiveness, hazard readability and human difficulty balancing. Full camera and input reconstruction remains an RC.11 follow-up. File previews used software browsers, never physical-device certification. Native upload/sharing, independently hosted verification and actual usage capacity remain open.

## Infrastructure estimates

Assumptions are 10 hunts per monthly active player, 10% eligible ranked participation by hunt, 20% verification retries, four 8 KB standings reads per player, one ticket per ranked hunt, 500 bytes per retained ticket including a planning allowance for indexing, seven days of tickets retained and an average 0.35 seconds of local CPU per verification attempt. At scale, the profile, index, existing Camp and private feedback storage still share the database. These are planning scenarios.

| Monthly players | Hunts | Ranked hunts | Verify calls | Approx. ticket storage | Approx. standings egress | Assumed verification CPU |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 1,000 | 100 | 120 | 0.012 MB | 3.2 MB | 42 s |
| 1,000 | 10,000 | 1,000 | 1,200 | 0.12 MB | 32 MB | 420 s |
| 10,000 | 100,000 | 10,000 | 12,000 | 1.17 MB | 320 MB | 4,200 s |
| 100,000 | 1,000,000 | 100,000 | 120,000 | 11.7 MB | 3.2 GB | 42,000 s |

Additional RPC estimates include four reads per player, one ticket call per ranked hunt, one Auth check plus two server RPCs per verification, and optional profile/social reads. A 25% optional online adoption rate at 100,000 players means about 25,000 monthly active Auth identities. A shift to multiple profiles or higher adoption can approach the Free cap. Supabase lists 50,000 Auth MAU, 500 MB database per free project, 5 GB uncached egress and 500,000 Edge invocations. Egress and quotas share space with existing usage. CPU deadlines and live burst capacity can bind earlier. The owner should inspect actual project usage after authorization; no actual free-tier capacity has been proved by load testing. If needed, keep the season closed or expand the approved staged capacity in a separate decision. [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase) · [Execution limits](https://supabase.com/docs/guides/functions/limits)

## Owner iPhone checklist

1. Open the approved RC.12 candidate and check the build badge. Switch between two familiar local profiles and confirm levels, records, dog, gear, Lodge and discoveries still belong to the right profile. Start and replay a solo hunt with no account.
2. Check coats, vests, collars and bandanas. The equipped item should be first, other owned items next and locked items last. Check this again offline and after changing gear or profile.
3. Open Worldwide. Confirm that the actual production season remains closed. Check archived records and states for a new, offline or temporarily unavailable board. In approved staging only, opt into an online profile, publish/remove a career snapshot, share a friend code, accept a request, compare stats, and enter a private Camp.
4. Preview a personal record card, equipped Labrador and earned Lodge. Verify the name is absent until chosen, both formats look correct, Save image works, and canceling the native share sheet returns without posting. Repeat offline and after backgrounding.
5. Check Settings feedback and unfair-death reporting. Screenshot and diagnostic consent should remain optional. Hosted intake follows separate RC.11 approval. Cancel out and verify Play Again starts immediately.
6. Run several consecutive native hunts, including the Boreal/Foothills transition and long Endless conditions. Capture unrecorded local diagnostics for frame timing and geometry, and separate screen recordings for visual readability. [Live game](https://bladunk.github.io/Retriever-Run/) · [Local diagnostics](https://bladunk.github.io/Retriever-Run/?perf=1)

[Activation, backup and rollback](CONNECTED_OPERATIONS.md) · [Updated roadmap and Wild Heritage handoff](MASTER_ROADMAP.md) · [Actual visual evidence](evidence/connected/REVIEW.md)

## Rendered offline and resource checks

The final candidate ran the complete 15-territory course continuously offline in software WebKit at Low and a 102 × 181 buffer with the accelerated verification clock. It reached **630.07 seconds**, including 180 seconds of Endless. The scene retained the original 130-geometry guard. A pass during other browser checks is included so timing differences remain visible. These are instrumented software tests with accelerated-clock discards. They cannot establish native device pacing, zero ordinary simulation discards or an improvement in physical latency.

| Measure | RC.11 | RC.12 concurrent | RC.12 final |
| --- | ---: | ---: | ---: |
| Continuous duration | 630.05 s | 630.07 s | 630.07 s |
| Sampled scene checkpoints | 1,261 | 1,261 | 1,261 |
| Peak geometries / textures | 126 / 12 | 126 / 12 | 126 / 12 |
| Maximum sampled draw calls / final shader programs | 81 / 29 | 80 / 29 | 81 / 29 |
| Software average FPS | 20.3 | 8.4 | 21.2 |
| Average / worst presentation interval | 49.34 / 440 ms | 119.35 / 1,577 ms | 47.22 / 518 ms |
| Over 20 / 33.3 / 50 ms | 2,628 / 2,508 / 784 | 2,630 / 2,599 / 1,985 | 2,629 / 2,469 / 728 |
| Average / worst CPU frame | 31.92 / 909 ms | 75.83 / 3,014 ms | 30.61 / 732 ms |
| Accelerated-clock discards | 2,554 | 2,555 | 2,555 |
| Startup readiness | 4,322 ms | 14,540 ms | 4,721 ms |
| First frame submitted / first sampled interval | 945 / 279 ms | 4,190 / 1,065 ms | 1,035 / 302 ms |

The six live terrain tiles and stable geometry peak at the end show the tested route stayed inside the residency limit. Sharing uses short-lived canvases outside hunting. Portrait composition uses approximately 4.9 MB of RGBA backing store plus a 2.8 MB source canvas for the dog. It reuses the existing WebGL context and restores the previous drawing buffer. The release asset package is 18,655,597 bytes, with 18,550,040 required for offline installation and 1,332,621 changed required bytes by manifest hash against RC.11. It adds no gameplay textures, models or audio. The isolated Chromium replay observation submitted at about 1,047 ms under software conditions. Native responsiveness and the reported resource issues still require the owner checklist. [Full software comparison](evidence/connected/software-performance.json) · [Endless capture](evidence/connected/screens/endless-1030.jpg)

The verified code candidate is `7ca02c0ca551cb00179fe32c25d45dda220dea0a`. GitHub Actions built it, passed all automated tests and verified the production manifest. The execution skipped deployment. The draft PR's current head includes this final evidence. A scan of 13 public JavaScript chunks found no Supabase secret-key or service-role JWT formats. [Code CI](https://github.com/bladunk/Retriever-Run/actions/runs/46114527685) · [Draft head](https://github.com/bladunk/Retriever-Run/pull/51)
