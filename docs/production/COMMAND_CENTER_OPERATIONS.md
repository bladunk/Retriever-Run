# Developer Command Center · Owner runbook

## Access from iPhone

The deployed game URL gains a private dashboard entry with `?command=1`. Bookmark the route on the approved staging build first. Enter the approved developer email and password using the browser password manager, and sign out on shared devices. The page checks Supabase Auth and the server-side developer allowlist. A bookmark or private incident link alone grants no access.

Use Inbox to filter, open an item, inspect consented evidence and set a shared issue number and severity. Compare the original build, visibility and device evidence before confirming a defect. Copy the private Codex package only after reviewing its contents. For GitHub use the public outline and add verified facts manually. Keep raw reports, screenshots, private notes, references and credentials private. Mark Released after deployment and Verified resolved after testing the deployed fix. A player who selected fix follow-up can check the receipt.

For a live Worldwide check, open Worldwide → Check Worldwide in the dashboard. Verify availability, season, course and open flag. When a schema mismatch is suspected, compare public read RPCs to the migration history. The dashboard read leaves tickets, scores and storage alone.

## Separate owner approvals

| Action | Operational effect, cost and reversal |
| --- | --- |
| Install the additive migration | Creates an isolated schema, capped private records and scoped RPCs. Intake stays closed. No new paid service, bucket or Edge Function. Begin in an authorized isolated project and retain a schema backup. |
| Authorize a developer identity | Allows an approved non-anonymous Supabase Auth user to review private reports. Password and UUID stay inside the owner workflow. Delete its allowlist entry to revoke access. Check denial for an ordinary test user. |
| Approve intake and child-privacy design | Opens optional explicit reports. Review privacy content, screenshot policy and anonymous provider behavior first. Turning off intake preserves existing reports and receipts. |
| Approve retention | Approves the proposed prune schedule. Preview affected counts before scheduling. Application deletion is irreversible. Provider backups follow the provider policy. |
| Approve optional gameplay telemetry | Separate purpose, fields, consent and capacity review. RC.11 has no collector or transmission. Feedback works independently. |
| Approve future hosted Mastery work | Separate staging and production decisions for a new season, SQL, verifier and ticket admission. |
| Revise the resource budget | No change is requested. The software run passed the existing 130-geometry limit. |

### Add the approved schema and identity

1. Open the intended project in the Supabase dashboard on iPhone. Confirm the environment before using SQL Editor. Save a secure schema export or approved snapshot. If the project offers no dashboard backup, use the existing authorized database connection from a desktop to export the schema with the Supabase CLI. Keep the database URL and password private.
2. Run the new migration only. It leaves the Camp schema and competition controls alone. Reload PostgREST schema in the dashboard if the new functions are absent after successful migration. [Versioned SQL](../../supabase/migrations/202611280001_command_center.sql)
3. In Authentication → Users, create or select the approved non-anonymous developer. Replace the placeholder with its actual Auth UUID in SQL Editor.

```sql
insert into rr_support.developers(user_id)
values ('PASTE-AUTH-USER-UUID-HERE'::uuid);
```

4. Use a staging browser to check denial before signing in. Sign in as a developer and confirm the inbox works. If anonymous sign-ins are off, review the existing Auth signup rate limits and safeguards before approving any change. After separate privacy and intake approval run the following SQL in the approved environment.

```sql
update rr_support.control set accepting = true where singleton;
```

Use browser fixtures for screenshots or failure cases until isolated hosted access is authorized. Keep demonstration reports out of production.

## Data, privacy and retention

- Proactive monitoring in RC.11 stays local. Settings performance diagnostics run only when requested. The dashboard presents explicitly submitted report evidence. It does not receive application-wide errors, observer traces, continuous frame history or player behavior. Browser errors cannot reveal every operating-system termination.
- The report retains voluntary text, chosen category, version/build, a randomized report ID and a hash of the scoped receipt secret. A separate one-day rate-limit record contains a private Supabase Auth UID. The short public-facing reference alone cannot return data. The player can delete with the receipt in the original browser. Clearing that browser removes the saved receipt. The authorized developer can delete a report separately.
- Browser screenshots are re-encoded and metadata stripped. Pixels can still include sensitive personal information. The form asks the sender to omit personal information and to seek adult help for young players. Those prompts do not establish parental consent. Before opening intake, review the audience, parental-consent requirements, provider logs, incident process and whether open text or screenshot collection needs additional safeguards or should be disabled. Include relevant jurisdictions. This release has no independent legal certification. [FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)
- Proposed periods are 30 days for screenshots and technical attachments, 180 days for reports and 60 days after verified resolution or archival. A separate private rate-limit journal expires after a day at the next submission or prune. Authorize and schedule periodic execution of `select rr_support.prune()` only after approval. The app never schedules or runs it against production. The provider's Auth and backup retention are separately governed. Review and document an approved cleanup process for expired feedback anonymous identities without removing any Camp identities.
- Authorized database editors should restrict secure exports. Suppress unnecessary report information in logs and third-party copies. A signed-in developer can see only the scope of the dashboard role through report RPCs, and cannot grant developer access via the app.

## Optional metrics proposal

**Collection is disabled.** Consider one capped summary per consented session after a separate owner/privacy review, with per-session grouping and no persistent analytics identifier. Proposed fields below are a complete allowlist for that discussion. Bucket only against a fixed list. A declining player gets the same game and can still send a report. Provide an unchecked plain-language opt-in, a separate setting to turn it off and clear future outbound consent immediately when disabled. Draft retention is at most seven days for any raw troubleshooting summaries and 90 days for anonymized aggregates. Exact thresholds and backend ingest would require separate approval and implementation.

| Purpose | Proposed allowlist and aggregation |
| --- | --- |
| Version comparisons | Build ID, version, course ruleset, broad browser/platform family, selected preset, broad drawing-buffer size category and physical/software evidence source when known. No exact device model, locale, full UA, GPS or device fingerprint. |
| Difficulty and survival | Counts by ordered highest territory and stage, fixed duration bins at 2, 4, 6, 7:30, 10, 15, 20, 30 and 60 minutes, termination type (collision, explicitly abandoned, censored or unknown), collision category, retrieves, max combo, near misses and clean-streak bins. Use counts and survival intervals only when there are enough samples. Incomplete hunts are censored and solver runs stay in a separate dataset. |
| Voluntary replay | Count of eligible completed hunts followed by a deliberately initiated hunt in the same foreground session, and eligible denominator. End the session at reload, explicit exit or over 30 minutes of inactivity. Exclude Art Studio, scripted inputs, crashes and session windows with incomplete evidence. Disallow cross-install returning-player measurement unless separately approved. |
| Equipment and navigation | Per-category counts by shipped item ID for equipped items, and eligible unlocked counts if needed for a denominator. Count destination openings by coarse fixed destination key, with no route traces, timestamps per click or sequences. No personal names. |
| Reliability and performance | Counts by enumerated error class only, refresh/update failures, graphics context-lost events, aggregate frame interval histogram and CPU averages, startup/first-hunt/replay timing buckets, explicit quality transition categories, peak resource-count ranges and discarded simulation samples. Do not send stack text, unhandled exceptions with URLs, browser activity, traces or screenshots automatically. |

Report sample denominators by version, ruleset and quality cohort, and suppress comparisons under 20 eligible samples. Keep screen-recorded and casual native tests labeled separately. RC.11 displays smaller report counts so the owner can triage individual incidents, with performance comparisons flagged as insufficient. The dashboard cannot infer healthy reliability, player retention, regional balancing or feature usage from an empty source.

## Capacity planning

Supabase lists 500 MB database per free project, 50,000 monthly active Auth users, 5 GB uncached egress, 1 GB object storage and 500,000 Edge Function invocations. The relevant charges are shared with the existing project and organization. The draft uses Postgres for the recompressed attachment, so object storage and Edge invocation estimates for feedback are zero. Actual project headroom requires the owner to open the billing usage dashboard. [Supabase official billing documentation](https://supabase.com/docs/guides/platform/billing-on-supabase) · [Egress quota](https://supabase.com/docs/guides/platform/manage-your-usage/egress)

The following scenarios assume 10 hunts per monthly player, a 0.5% monthly feedback rate, 20% of reports with an 80 KB screenshot, 2 KB of row/index/technical data per report on average, six months of report text, one month of attachments, and about five API requests per report including Auth, reads and triage. They exclude existing Camp and ordinary site traffic. Optional analytics adds zero traffic.

| Monthly players | Hunts | Reports / screenshots per month | Estimated RPC/Auth requests per month | Incremental database steady state | Approximate screenshot egress per month, one view each |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 100 | 1,000 | 0.5 / 0.1 | 2.5 | 0.014 MB | 0.011 MB |
| 1,000 | 10,000 | 5 / 1 | 25 | 0.14 MB | 0.107 MB |
| 10,000 | 100,000 | 50 / 10 | 250 | 1.4 MB | 1.07 MB |
| 100,000 | 1,000,000 | 500 / 100 | 2,500 | 14 MB | 10.7 MB |

Egress includes base64 expansion and excludes headers and repeated views. The database estimates exclude internal storage overhead and existing data. Burst reporting, anonymous signup and attachment retention matter more than hunt count. The intake caps 3 reports per identity per hour, 10 per day, 100 overall per hour, 10,000 retained reports and 1,000 retained images. A 1,000-image burst at 192 KiB per image can use about 197 MB before storage overhead. Check actual headroom before opening intake. Supabase signup controls and existing Auth capacity are a separate dependency. Anonymous Auth users count toward relevant provider limits and may outlive report retention. Consider reducing attachment quota or pausing intake if existing usage leaves little headroom. Solo play still works when any operational quota is reached.

## Rollback

- Stop intake immediately with `update rr_support.control set accepting = false where singleton;`. Keep the schema and reports for review. Remove only the authorized developer's allowlist entry to revoke that identity.
- Pause an approved retention job if needed. A schema rollback should leave private data intact. For an emergency access lockout, revoke the affected RPC grant and keep report data stored privately. Check the current grants before restoring access.
- To roll back the frontend, republish the previously verified RC.10 artifact through the existing Pages process after the owner's decision. Export and retain local saves first and let existing offline update protections run. Validate that expected profiles and reward records still load. Keep competition closed and leave all ranked database controls alone.
