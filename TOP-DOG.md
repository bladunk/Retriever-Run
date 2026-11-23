# Retriever Run 4.3 · Operation Top Dog

**Release assessment — Ready with caveats.** The release builds on main at `c39117e`, the merge of Operation Field Ready (PR #9). Apply the tracked, read-only Rivals migration before publishing 4.3. Use the physical iPhone checklist before sharing the public link. Browser tests use desktop engines and an isolated backend fixture.

## Retriever Camp

A fresh profile sees **Welcome to Retriever Camp** once the trail is ready. A camp name follows the existing Worldwide rules, including the case-insensitive reservation. The game reuses a saved session when available and reserves the name before opening the welcome confirmation. While a reservation is in flight the form locks both actions. A guest name identifies a local profile. It is globally reserved only after the player explicitly joins Worldwide Camp in the Lodge.

Returning profiles skip registration, including local-only 4.2 players and players returning offline. Local Guest Camp progress stays with that profile when it later joins Worldwide Camp. Future qualifying runs can post. Earlier guest runs remain local. A cached game can reopen offline, while an uncached first visit requires the site files to load. Anonymous identities stay with the browser’s storage. Data deletion, device changes, Safari eviction, or an unrecoverable refresh token can remove access. The opt-in uses no email, password, or phone number.

## Working Dog career

| Rank | Levels | First promotion reward |
| --- | --- | --- |
| Pup | 1–5 | Classic field gear |
| Junior Retriever | 6–12 | Junior Field Collar |
| Seasoned Gun Dog | 13–20 | Seasoned Waxed Vest |
| Master Retriever | 21–30 | Master’s Leather Collar |
| Marsh Legend | 31 and up | Marsh Legend Vest |

The title shows the player’s rank, level, and next-level progress. The Lodge’s Career room shows current and lifetime XP, all five patches, gear requirements, and a summary of existing Field Journal milestones. The curve begins at 110 XP to reach Level 2. Each additional level costs 26 XP more than the previous step, continuing past Level 50.

| Event on a completed run | XP |
| --- | ---: |
| Legitimate run of at least two seconds | 25 |
| Each full 100 m in that run | 10 |
| A hazard cleared by a swept jump | 5 |
| An overhead branch cleared by a swept slide | 5 |
| A diving goose avoided inside its attack window | 15 |
| Each collected treat | 2 |
| Each retrieved mallard or pheasant | 20 |
| New score or distance personal best | 75 once per run |
| First tier of each newly earned Field Honor | 50 |

Clearance credit comes from a successful pass where the collision test shows that the action mattered. Jump and slide button presses on their own continue to count only toward the existing Field Journal input statistics. Hall of Shame patches and later tiers keep their normal awards. The Field Report shows XP and newly earned gear. Major promotions appear after the run, one at a time. A promotion stays queued until **Continue**, even if the browser closes. The guitar cue follows the existing master and effects volumes.

## The Kennel

| Category | Gear and required career levels |
| --- | --- |
| Collars | Classic Leather (1), Forest Green (3), Junior Field (6), Blaze Orange (7), Brass Buckle (15), Master’s Leather (21), Master Retriever (25) |
| Hunting vests | No Vest (1), Canvas Training (5), Marsh Green Field (12), Seasoned Waxed (13), Blaze Orange Field (20), Master Gun Dog (30), Marsh Legend (31) |
| Coats | Classic Yellow (1), Light Cream (8), Golden (16), Fox Red (24), Dark Chocolate (35) |

Select any visible item to preview it. Equip becomes available at the listed level. **Reset to Classic** resets the three equipped choices. It keeps all earned gear. Existing 4.2 unlocks and the last worn Blaze Collar, Marsh Bandana, or Fox Red Coat carry forward where applicable.

The Kennel temporarily moves the game’s Labrador and canvas to a small lit preview scene. The game loads one GLB, uses one WebGL renderer, and draws the preview only while its room is open. Collars follow the existing neck bone. A brass buckle replaces the tag in one draw call. A vest is a material fitted to the original skinned surface, so its hems and strap follow the animation without a second mesh. Coats retain the GLB texture and lights. Equipment switches update existing uniforms or visibility. They never change pose, motion, scoring, or collision volumes. The fallback dog retains a simplified collar and coat when the GLB is unavailable.

## Worldwide Camp Rivals

For members, the selected category shows the actual player directly above them, their two published bests, ranks, and the improvement needed to pass. When metrics tie, a later equal record does not beat the earlier record, so the target includes the point, meter, or retrieve needed to pass. The authenticated RPC checks the same metric, timestamp, and identity ordering as the board, including positions outside its visible top 100.

The Field Report shows the local run result and any pending Worldwide status separately. **Rival overtaken** requires this run’s accepted result, a fresh server-confirmed rank improvement, and verification against the previous rival’s published record. If that competitor changes their name or improves their target after it was cached, the report can still show the current target and local result. The server comparison can no longer confirm that previous record as the overtaken rival. At rank one the board reports **Top of the Camp**. An unranked, offline, or unavailable response has its own state. Cached rivals include their last checked time, including after an offline reload.

Normal board views reuse a one-minute cache per identity and category. Overlapping requests for the same view share one read. Opening a board, changing categories, or completing a member’s run can read standings. An accepted submission invalidates the affected view, and there is no per-tick polling. Existing queue limits and receipt IDs apply unchanged.

## Save migration

The existing `retriever-run.record` save moves from schema 1 to 2. The profile keeps its nickname, settings, stats, patches, records, local leaderboard, and next run counter. Worldwide sessions and pending receipts keep their existing keys. The new local fields are enrollment, career XP and promotion queue, the career run ID high-water mark, and Kennel equipment. The local rival snapshot is stored separately.

Existing players receive a one-time service credit based on 15 XP per recorded completed run and 5 XP per full 100 m of recorded lifetime distance, capped at 1,000 XP. Old button presses, reconstructed clears, and achievements without an award history do not generate event XP. Each new run reserves a stable local ID. Completion commits its XP, report, records, and promotions in one save write. Beginning a run without finishing grants nothing. A failed storage write leaves the in-memory report available for the current visit. Diagnostic runs write to a separate local key and cannot earn career XP or post Worldwide.

## Verification and performance

- `npm test` passed all 78 tests. Coverage includes the 4.2 suite, original GLB animation with gear, XP transactions, save migration, offline Rival snapshots, and both SQL migrations on embedded PostgreSQL. PGlite verifies the actual predecessor and privacy boundaries across timestamps, ties, rank one, and ranks beyond 100.
- `npm run stress` completed 10,000 deterministic sessions and 31,804,151 fixed ticks. All nine hazard types appeared. Guided sessions reached 5, 10, 20, and 30 minutes, with the longest at 50,844 m. This is logic simulation.
- `npm run test:top-dog` and `npm run test:top-dog -- webkit` exercised the production build at 390 × 844 with a loopback HTTPS Auth/RPC fixture. They covered delayed nickname claims, session reuse, genuine run completion, verified overtaking, a career promotion, the live Kennel preview, saved gear, Guest Camp upgrade, and a cached offline reload. The fixture runs entirely on loopback and uses a disposable certificate.
- The production build passed. Its raw size grew from about 1.97 MB to 2.00 MB. The Labrador, audio, and terrain assets retained their sizes. The main entry increased by about 8 kB gzip. The app reuses its single canvas and skin, and active play starts no leaderboard reads. `npm audit --omit=dev --audit-level=high` reported zero known vulnerabilities. The production build contains no privileged credential material.
- The [portrait review captures](docs/screenshots/operation-top-dog.webp) use isolated fixture rankings. Linux software WebGL results cannot establish physical iPhone frame rate, touch latency, battery use, or Safari storage persistence.

Use Node 22.12 or newer. Install Playwright’s Chromium and WebKit for local browser runs. The fixture also uses OpenSSL for its temporary certificate. Set `FIELD_QA_OUTPUT` to choose a screenshot directory.

```sh
npm ci
npm test
npm run build
npm run stress
npx playwright install chromium webkit
npm run test:browser -- slow
npm run test:browser -- webkit
npm run test:top-dog
npm run test:top-dog -- webkit
npm run test:top-dog -- webkit small
```

## Supabase permissions and cost

The new function grants execution only to the authenticated role and requires the existing anonymous-owner JWT claims. The caller cannot choose a different owner. It returns the caller’s and predecessor’s public ranking fields plus an optional Boolean comparing a posted record. A public nickname and exact record timestamp identify that comparison. The private tables, existing RLS, privileges, submission envelope, limits, and receipt checks are unchanged.

The predecessor seeks one row using the existing three partial ranking indexes. Exact rank still counts qualifying rows ahead of the caller. That work grows with the leaderboard. Monitor Auth signup and API rates, active users, database size, and egress in Supabase. Anonymous signups, cache-clearing traffic, and public ranking reads can still consume Free quotas. Client play remains tamperable within the validated score envelope. The rollout uses the existing publishable key and introduces no paid service. [Worldwide Camp operations](GLOBAL-CAMP.md)

## Deployment order

1. Confirm PR #9 is on `main`. The 4.3 pull request is based on that merge.
2. In the existing Supabase project’s **SQL Editor**, review and run [`202611220002_camp_rivals.sql`](supabase/migrations/202611220002_camp_rivals.sql) once. It adds only a lookup function and its grants. The previous Worldwide Camp schema must already be installed. Existing nickname and score APIs continue to function before and after this migration.
3. Verify the repository still has `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in Actions variables. Leave the existing anonymous Auth settings in place. A build without this configuration still supports Guest Camp.
4. Merge the reviewed pull request when ready. The existing Pages workflow publishes from `main`. After it succeeds, close any open game tabs and open the normal URL to let Safari pick up the new cached build. [Play Retriever Run](https://bladunk.github.io/Retriever-Run/)
5. Complete the iPhone checklist. The 4.3 work has used local backend fixtures only.

## iPhone acceptance checklist

Allow approximately 10 minutes after deployment.

1. **Existing save · 1 min.** Open Safari in portrait. Confirm the older nickname, personal best, patches, and journals survived. Check the title shows the career and that you were not prompted to rejoin.
2. **First launch · 2 min.** Use a separate browser profile, or a separate device, to avoid disturbing the existing save. Choose an ordinary nickname. Confirm the one-time welcome and Level 1. In a separate cached fresh-profile check, use Guest Camp offline and confirm it stays local.
3. **Play and replay · 2 min.** Swipe all four directions, tap a fallback control, jump the creek, and finish a run. Look for a correct collision cause, XP, and a working **Run Again**. Background and return once, then resume. Check music and effects at your chosen volume.
4. **Career and gear · 2 min.** Open Career and verify all five badges. Open the Kennel and preview a locked coat or vest. Equip a reward if available, reload, and verify what the dog wears. On a profile near a major threshold, dismiss the post-run promotion with **Continue**.
5. **Worldwide and offline · 3 min.** Check all three categories. If ranked, compare the rival target with the actual standings and confirm the card is dated in Airplane Mode after a cached reload. Complete a regular offline run. Reconnect, reopen Worldwide Camp, and confirm any qualifying result clears pending only once. Share after the game looks, sounds, and feels right on the device.
