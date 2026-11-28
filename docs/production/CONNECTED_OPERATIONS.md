# Connected owner runbook

## Review environments

Production currently runs RC.11 and the historical closed season. The RC.12 draft contains SQL and an Edge entry point for independent review. In an approved disposable Supabase project, use separate synthetic Auth users and clean seeds. Connecting a review build requires only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The service-role key belongs inside Supabase, and the deployment token belongs in the restricted GitHub environment. Never use either one in Vite or a browser.

### Before an approved installation

1. In Safari, open the Supabase project and verify its name, organization and environment in the dashboard. In SQL Editor run a read-only inventory. Inspect migration history and the installed definitions before making any change. The production read checks only prove which public RPCs respond.
2. Export a restricted schema and database backup using the existing backup facility or authorized Supabase CLI connection. Verify it can be restored in isolation. Include Camp identities, season controls, bests, tickets, private connections and Camp ownership in the protected backup. Exclude authentication keys and private feedback from any public artifact.
3. In the intended staging project, install the required reviewed historical migrations in a fresh database. In any already provisioned project, compare migration history and apply the missing reviewed additive files only. For RC.12 the new file is `202611280002_connected.sql`. Do not re-run consolidated setup SQL. If the public RPC is newly installed but still reports `PGRST202`, check PostgREST schema exposure and reload its schema cache after confirming installation. [Connected migration](../../supabase/migrations/202611280002_connected.sql)

```sql
select to_regclass('retriever_camp.ranked_control') as season_control,
       to_regclass('retriever_camp.mastery_tickets') as mastery_tickets,
       to_regprocedure('public.rr_connected_standings(text,uuid,integer,text)') as connected_board,
       to_regprocedure('public.rr_mastery_claim(uuid,uuid,integer)') as mastery_claim;
select season, course, active from retriever_camp.ranked_control order by season;
```

After installation both seasons should remain closed in production. The Connected board should answer `ok` with `open:false` and return only the requested season. The archive uses Great Migration 1. Career snapshot publication has an independent closed switch. RC.11 intake and developer access remain independent.

### Provision and verify Mastery only in staging

- Review the existing anonymous Auth provider and rate limits. Competitive users must explicitly join with their chosen public nickname. Check authenticated access from two different local profiles, an unrelated identity, and ordinary signed-out reads. Check accepted friends and Camp membership separately. Observe that a developer account grants no player permissions.
- Package the verifier with `node scripts/prepare-camp-deployment.mjs /path/to/temporary-output`. Deploy the resulting `verify-hunt` function to the owner-approved staging project only, using the Supabase CLI and an approved session. Set `RR_ENABLE_MASTERY=true` inside the same staging project. The production GitHub workflow is separately authorized and requires the `ranked-verifier` environment and explicit dispatch.
- Leave the historical season closed. In disposable staging only, enable `one-more-hunt-1` temporarily to issue real tickets. Check the returned course, expiry and season before playing. Exercise short, 7:30, 10, 15, 20, 30 and near-60-minute signed terminal fixtures, account isolation and the historical dispatcher. Use normal issued timestamps or an explicitly controlled staging clock fixture. Record execution CPU, cold/warm failures, rejected malformed or mismatched inputs, a lost-response retry and a confirmed duplicate receipt. Never use production tickets or ranking tables as fixtures.
- Test score ties, the same hunter changing several independent records, top 100 pagination, own position outside the page, closed/read-only mode and pause/reconnect. Disable the staging season when done.
- Open public career snapshot publication only after a separate data and child-privacy review. This flag controls optional snapshots, including their public read visibility. The browser still requires an explicit player confirmation to publish. Withdrawals remain available while publication is disabled. [FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions)

## Production activation at Gold Master

This is a future procedure with its own approval. Completing Connected or merging its frontend does not activate anything.

1. Record the release artifact hash, staged verification evidence and owner decision. Confirm `one-more-hunt-1` uses `migration-30-mastery-1`, and that the historic `great-migration-1` remains closed. Verify the exact deployed Edge revision and its Mastery capability in a matched staging project.
2. Confirm the hosted near-60-minute runs complete within published CPU limits and that malformed or ineligible submissions do not create records. Compare a fresh client against legacy replays. Keep production closed if any gate fails.
3. Back up and rehearse rollback before considering a fresh start. Record the archive decision and the reset scope separately from a release merge. The versioned reset proposal below requires RC.14 review and a second explicit approval before any operation.
4. After owner acceptance of the final production image, schema and verifier, approve the named season switch. In SQL Editor on the confirmed production project, activate the intended season only. Re-read both controls immediately. Do not enable the separate career publication flag unless separately approved. Use the first real eligible player run to confirm acceptance and correct rank. First-record checks should confirm the stable ticket and duplicate behavior.
5. To close competition immediately, set `active=false` for the named Mastery season. Submission claims and commits will respect closure. Keep historical records and close the client entry independently if edge health is uncertain. Preserve queued results for review. Roll back the previous Pages artifact or Edge revision by its verified release SHA, following the same authorization; leave the additive schema and stored records intact.

Future, **only after separate Gold Master activation approval**:

```sql
update retriever_camp.ranked_control set active=true
where season='one-more-hunt-1' and course='migration-30-mastery-1' and not active;
```

Emergency pause after an activation:

```sql
update retriever_camp.ranked_control set active=false
where season='one-more-hunt-1' and course='migration-30-mastery-1';
```

## Gold Master reset proposal v1

Use a newly reviewed season identifier and archive old results read-only by season whenever possible. On staged clones, verify legacy replay results, old archive visibility, private friend groups, camps, opt-in profile visibility and ticket ineligibility across season boundaries. Work with the owner to decide whether existing Camp identities, social relationships and public career snapshots carry forward. Browser saves are separate from hosted tables. Provide an explicit export, a separate fresh-career choice or reviewed version migration, and a way to recover the archived career; a server-side cleanup cannot reset offline browser saves on its own.

Any later deletion request requires an exact reviewed record/key scope, privacy/retention review, isolated rehearsal, verified backup and explicit owner permission. Capture before/after counts and keep rollback instructions with access-restricted backups. Restore the compatible earlier artifact and scoped state if needed. Keep feedback reports and the developer inbox outside the competitive reset unless a separately authorized retention process applies.

## Separate owner approvals

| Decision | Required action |
| --- | --- |
| Additive production database migration | Review installed schema, take a backup, run only the reviewed missing migration with both switches closed. |
| Hosted Edge deployment | Review staging evidence, deployed version, environment and secrets. Keep the season closed while validating. |
| Developer identity, feedback intake and retention | Use the RC.11 separate approvals. Connected makes no change to those permissions, switches or schedules. |
| New public career data | Review audience and legal requirements, storage and withdrawal. Authorize the separate `public_career_enabled` flag. Per-player publication remains explicit. |
| Public season activation | Review hosted end-to-end and physical acceptance, approve the exact season and rollback. |
| Production reset | Approve separately under Gold Master with a rehearsed scope and verified backups. |
| Paid infrastructure or resource budget changes | Require separate approval. No change is proposed. |
| Optional gameplay telemetry | Remains absent. Treat any future proposal as a separate approval. |

[RC.11 operations and privacy](COMMAND_CENTER_OPERATIONS.md)
