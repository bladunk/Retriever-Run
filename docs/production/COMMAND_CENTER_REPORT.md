# Operation Developer Command Center · RC.11

RC.11 adds optional in-game feedback, a private inbox, receipt-based follow-up and a developer workflow for reviewing a reported collision. Worldwide now states when competition is closed and whether eligible records are present. Feedback intake defaults to closed even after installing the additive database migration. This release is a draft for owner review.

## Starting point and audit

The owner-confirmed PR #49 is merged. The actual GitHub main head was `3b19de130ee812884e9b34f02691744edc022bc4`. Pages Actions run `46106193310` deployed that commit. The published content manifest identified version `1.0.0-rc.10`, build `5076c61`, manifest `1cf67dcf0d485ebc3436`. The compiled build ID identifies its source checkout. The branch head identifies the merge result. [Merged PR](https://github.com/bladunk/Retriever-Run/pull/49) · [Pages Actions run](https://github.com/bladunk/Retriever-Run/actions/runs/46106193310) · [Live manifest](https://bladunk.github.io/Retriever-Run/content-manifest.json)

The baseline used GitHub Pages and a content-verifying service worker. Career, equipment, discoveries and player profiles lived locally. RC.10 already provided a temporary Final Moments buffer, opt-in local performance diagnostics, Art Studio and a versioned signed replay verifier. Supabase provided a public standings read, anonymous Camp identity, private ranked tickets and a service-side replay verifier. Production SQL project internals, project usage, auth settings, hosted verifier deployment and unpublished historical records require existing owner dashboard access. [RC.10 report and evidence](ONE_MORE_HUNT_REPORT.md) · [Architecture](ARCHITECTURE.md)

## Feedback and issue management

| Workflow | Implementation |
| --- | --- |
| Player feedback | Settings → Player feedback. Select bug, suggestion or general note. Write a short title, description or both. The form discloses attached version and build. |
| Unfair death | Hunt Over → Report an unfair death. Pick a reason and optionally add text, screenshots and technical details. Play Again and authoritative rewards remain independent. |
| Screenshots | Select JPEG, PNG or WebP. The client decodes and re-encodes the pixels as a JPEG at up to 800 px, removing source metadata. It shows a preview and Remove action. The API bounds encoded and decoded size, format and storage. |
| Technical details | An unchecked box allows sending the displayed capture. It contains graphics preference, a bounded recent frame interval summary, incident data for an unfair-death report and limited CPU, entry and peak resource totals when local diagnostics are active. Technical history stays in memory until the next hunt. |
| Offline | On send failure, choose Save for later. Three reports can queue per browser. A reconnect can retry the same ID and consent. Cancel removes a queued report before its next attempt. An acknowledged in-flight report can be deleted via its receipt. |
| Receipt | A service acknowledgment shows an eight-character reference. A separate random 256-bit receipt secret allows status and deletion of that one report. Store up to 12 receipts in this browser. |
| Verified fix | The player can separately opt in to check status from a receipt. Only Verified resolved signals a fix. It is a manual in-game check without push notifications. |
| Developer inbox | Title, category, version, status and priority filters with 25 rows per page. Detail includes attachments, editable severity, fairness classification, bounded status history, private notes and a common issue reference. |
| Issue lifecycle | New → Under review → Needs reproduction → Confirmed → In development → Fix under review → Released → Verified resolved. Duplicate and Archived support grouping and review. |
| Codex and GitHub | Copy a private evidence package after checking for personal details. The public issue outline excludes report body, screenshots, identifiers and diagnostic data. Publish only after human review. |

A report-free browser can play and progress regardless of feedback settings. Supabase creates a scoped anonymous Auth session only after the player sends or retries and the public intake check confirms that the service is open. Feedback sessions are separate from Camp accounts and rankings. Dashboard sessions use tab-scoped storage and authorized non-anonymous members. The dashboard shell is a bookmarkable page whose APIs require server-side permissions. The change uses the existing services and requires no new Edge Function or bucket.

## Incident evidence

A consented unfair-death capture records the course seed, ruleset, territory and stage, terminal fixed tick, two exact movement poses surrounding contact, nearby hazard geometry parameters, collision witness, up to 32 recent accepted gameplay inputs and difficulty parameters. A private incident link goes through the same developer authorization as the inbox. The inspector independently reruns the swept collision step. It distinguishes a match on the original build, a cross-build match, a mismatch and insufficient data.

The inspector covers one collision step. Human-readable hazard exposure, the last reachable action, rejected inputs and full before-death replay still require additional evidence. Record classifications under Needs reproduction or Confirmed once supported. Keep the RC.10 Final Moments view for the ordinary in-game replay. Neither replay path grants rewards or submits a ranked score.

## Worldwide investigation

Read-only requests to actual production returned HTTP 200 from both `rr_worldwide_standings` and `rr_ranked_board`. Both returned `ok`, `open:false`, season `great-migration-1`, course `migration-30-phase-05` and zero rows. No historical PGRST202 failure appeared in these requests. This establishes the closed and empty state at the time checked. An intermittent or session-specific failure remains possible. [Sanitized production reads](evidence/command-center/worldwide-production.ndjson)

The unified table ranks by verified score. Other columns are explicitly labeled independent personal bests. Closed status now appears above the standings with a season-specific empty message. Compatible historical records would appear when returned. A missing combined RPC still falls back to the legacy score-only route. Unavailable service and stale cached standings have separate messages. The private Worldwide tab runs an on-demand public health read.

Current production admits neither a new Mastery season nor open submissions. Historical signed verification keeps the previous course and season with 15-minute and 2,048-action limits. The staged Mastery handler requires separate claim and commit RPCs, isolates season and course and caps verification at 60 minutes and 8,192 actions. Hosted Mastery admission, lease binding, signing workload and signed test submission remain open for an authorized isolated Supabase environment. [RC.10 report](ONE_MORE_HUNT_REPORT.md#competitive-compatibility)

## Performance and offline verification

The RC.10 offline reference stopped sampling at 606.20 s after all 15 territories and into Endless. It hit 134 geometries against the shared budget of 130. The RC.11 resource fix reuses the dog's unit quad for the four single-patch obstacle contact shadows. Object-space transforms preserve coverage and add no draw calls. The two-patch leaning timber shadow retains its merged mesh. No artwork, graphics preset, collision shape or authoritative rules changed.

| Software WebKit, seed 7, Low, 102×181 | RC.10 evidence | RC.11 candidate |
| --- | ---: | ---: |
| Continuous offline rendered hunt | 606.20 s | 630.05 s |
| Accepted route inputs | 536 | 559 |
| Peak textures | 13 | 12 |
| Peak geometries | 134 | 126 |
| Shader programs at end | 30 | 29 |
| Average FPS | 11.8 | 20.3 |
| Presentation intervals / avg / worst | 2531 / 84.68 ms / 600 ms | 2630 / 49.34 ms / 440 ms |
| Over 20 / 33.3 / 50 ms | 2530 / 2425 / 1393 | 2628 / 2508 / 784 |
| CPU avg / worst | 53.56 / 575 ms | 31.92 / 909 ms |
| Simulation discard counter | 2449 | 2554 |
| Startup ready | 5662 ms | 4322 ms |
| First hunt input to submitted frame | 417 ms | 945 ms |
| First submitted frame CPU / render | 292 / 283 ms | 909 / 904 ms |
| First sampled presentation interval | 301 ms | 279 ms |

These runs used an accelerated clock, a software renderer, a small buffer and no screen-recording overhead. The discard counter includes accelerated-clock saturation. Preserve the full data. The measurements do not establish native frame pacing, zero discarded samples, GPU execution, or a responsiveness improvement. The first-hunt values are from the opening frame and are not cached replay or input-to-photon latency. RC.10 cached replay evidence remains the last comparison. [Sample and timing evidence](evidence/command-center/offline-resource-comparison.json) · [RC.10 report](ONE_MORE_HUNT_REPORT.md)

The continuous RC.11 course passed the existing 130-geometry gate. This supports a bounded software scene on the tested route. It does not establish the cause of every earlier geometry peak or prove stability on other seeds and platforms. Track the historical 110–112 ms Boreal-to-Foothills interruption separately. The historically associated resource disposal, first-visible upload, material change and synchronous driver work remain plausible explanations. The accelerated RC.11 crossings cannot resolve the physical iPhone issue. Native responsiveness, weather and hazard readability, human balance, full repeated navigation stress and hosted acceptance remain open.

The verified production build totaled 18,640,971 bytes versus 18,605,511 at baseline. Required installation assets totaled 18,536,682 versus 18,515,852 bytes. Manifest hash comparison identified 1,822,154 bytes of changed required resources, including rebuilt game and dependency chunks. There are no new gameplay textures, models or audio recordings. The only new image memory is a player-selected preview, capped at 800 × 800 pixels or about 2.56 MB RGBA when decoded. The earlier source may require temporary decode memory. Up to three compressed pending reports occupy at most about 0.9 MB before browser storage overhead.

## Verification and release gates
[Actual renderer evidence, footage and Art Studio routes](evidence/command-center/REVIEW.md)

- The test suite passed 247 tests. The added test file exercises isolated PostgreSQL roles, closed intake, scoped receipts, cross-player access, idempotence, rate limits, retention, bounds and preserved shadow transforms. Isolated PostgreSQL does not simulate the hosted Auth gateway or a native phone. No player data was used.
- Twenty browser captures passed the viewport and interaction checks. The send test observes the outbound request in an isolated fixture. Unchecked attachments stay out of the body, offline retry preserves the selected consent and cancellation prevents a later send. The fixture verifies a successful receipt and a voluntary fix check. The production JavaScript scan detected no Supabase service-role JWT or secret-key formats. The production build excludes the synthetic inbox records.
- Historical signed replays reproduced scores 38,067, 45,850 and 66,583. A fresh seed-7 Mastery simulation covered 60 minutes and reached 213,865 points with a peak of 34 active simulation objects. Native human survival distribution remains a separate gate. [Replay data](evidence/command-center/historical-replays.ndjson)
- The suite includes existing progression, equipment, Hunt Over and reward idempotence checks. The uninterrupted offline renderer run covers all regions and 180 seconds of Endless. Chromium also preserved two local profiles across offline replay and a deterministic XP crossing, resumed a deliberately interrupted download, protected a paused hunt from update activation and reused verified audio. Native deployment and update acceptance remain pending. The software replay sample submitted at 2,109.9 ms from input, with 3.3 ms first-frame CPU and a 69 ms sampled interval. Software scheduling and actual native presentation remain separate. The Balanced opening sample estimated 27,962,027 bytes for the terrain atlas with mipmaps and 10,517,048 bytes of decoded audio. [Offline and update checks](evidence/command-center/installation-and-offline-replay.json)
- Open gates include native frame pacing near 60 FPS with 98–99% intervals within 20 ms, zero discarded simulation samples in normal play, hazard visibility, first-visible response, replay, heat and extended Endless balance. Hosted Mastery test admission and production privacy approval also remain open.
- The code and CSS are original project work. The evidence uses existing game assets under the established manifest and synthetic UI records. [Asset license manifest](ASSET_LICENSES.md)

## Developer owner checklist

1. On small and modern iPhones, test startup, ordinary play, swipes, collection and replay. From Hunt Over verify the exact XP result, earned rewards and Play Again while the presentation is active.
2. Verify hazard readability in rain and near the final territories. Spend time in Endless and check for sustained fair difficulty. Collect a normal unrecorded performance report for the Boreal and Foothills transition. Record the matching interface video separately. [Live gameplay](https://bladunk.github.io/Retriever-Run/) · [Live performance diagnostics](https://bladunk.github.io/Retriever-Run/?perf=1)
3. Use an approved staging build for feedback. Open Settings, send a test bug, suggestion and note, then follow Hunt Over → Report an unfair death. Test unchecked and checked technical details, screenshot preview and removal, and offline Save for later → Cancel and Retry.
4. Sign in to the staged Command Center as an explicitly authorized developer. Review a test report, change severity and state, check the collision, copy the private Codex package, and inspect the public issue outline. Confirm an ordinary authenticated user sees no inbox data.
5. Read offline release notes and known issues. Try Worldwide online with competition closed and with a failed connection. Verify that ranked entry is absent and an offline hunt, rewards and replay still work.

[Owner setup, consent design, retention and rollback](COMMAND_CENTER_OPERATIONS.md) · [Canonical roadmap](MASTER_ROADMAP.md) · [Draft PR #50](https://github.com/bladunk/Retriever-Run/pull/50)
