# Phase 09 · Owner operations and Phase 10 launch

Phase 09 adds new tables and functions alongside the existing Camp API. The migration seeds the new competition **closed**. This document describes owner operations after review. The Phase 09 review used PGlite, Node, Deno tooling and fixture browser requests. No hosted Supabase project was used for writes.

## Prerequisites and application order

1. Verify you are in the intended Supabase project. Keep `retriever_camp` out of the exposed Data API schema list. Enable anonymous sign-in using the existing Auth configuration. Review Supabase Auth safeguards before opening public competition. Keep keys, DB passwords, backups, auth data and connection strings out of repository history and screenshots.
2. Export a supported backup before any migration. Include schema, legacy records and existing authentication/identity mappings. Use a protected local dump with owner access and record the restore test on an isolated project. Free-plan backup/restore features vary. Use the supported CLI or PostgreSQL dump tools if automatic platform backups are unavailable. [Supabase database dumps](https://supabase.com/docs/reference/cli/supabase-db-dump)
3. Check prerequisites in SQL Editor using the query below. On the existing project, skip migrations that are already represented in the schema. If starting an isolated fresh project, paste each entire file in order: [base Camp](../../supabase/migrations/202611220001_worldwide_camp.sql), [rivals](../../supabase/migrations/202611220002_camp_rivals.sql), [Season One](../../supabase/migrations/202611230001_season_one.sql).
4. After review and only with owner approval, apply [ranked schema](../../supabase/migrations/202611250001_verified_camp.sql), [relationships and private Camps](../../supabase/migrations/202611250002_camp_social.sql), then [bounded ranking and profile APIs](../../supabase/migrations/202611250003_ranked_board.sql). Each file is a transaction. Save the execution record and run [the read-only verification](../../supabase/ops/phase-nine-verify.sql). On a fresh Phase 09 production namespace, expect inactive control, zero ranked tickets/bests, role grants `true, false, false, true, false`, and RLS enabled on all private tables. No row sampling from real records is necessary.

```sql
select
  to_regclass('retriever_camp.players') as original_players,
  to_regprocedure('public.rr_camp_rival(text,text,timestamptz)') as archive_rivals,
  to_regclass('retriever_camp.season_control') as legacy_competition;
```

Deploy the Edge function first to the isolated review project. Package from the reviewed repository checkout with the existing lockfile. Enter the temporary workspace path printed by the packager, then run the Supabase CLI against the **isolated** project. The prepared function includes the canonical runner and the existing hull math in one module. The function verifies anonymous bearer identity with Supabase Auth before it calls either privileged RPC. The CLI reads `verify_jwt = false` because the handler performs that verification itself. Keep the handler in place if moving or changing the gateway configuration.

```bash
npm ci
node scripts/prepare-camp-deployment.mjs
cd <printed-target>
supabase functions deploy verify-hunt --project-ref <isolated-review-project-ref>
```

Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to the Edge runtime. The service key authorizes the verification RPCs only from that runtime. Existing GitHub Pages variables remain the project HTTPS URL and `sb_publishable_` key under `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. The static build accepts only a publishable key. Production variables and deployment need owner approval. Validate on the actual free-tier Edge worker during Phase 10, including a long online hunt, partial report failure and retry, rejected non-owner access, and the installed iPhone build.

On the **isolated review project** only, after the read-only checks pass and the owner approves a test window, use this statement to open test entries. Verify the production project stays closed.

```sql
update retriever_camp.ranked_control set active=true where season='great-migration-1';
```

## Maintenance and rollback

Use the backend dashboard for Auth and rate-limit monitoring. Ranked ticket pruning exposes a service-only function to remove at most 5,000 tickets older than seven days per call. After launch, inspect retention and run `select public.rr_ranked_prune();` as the owner in SQL Editor when needed. Personal bests, private Camps, accepted connections and permanent awards have separate tables. The game uploads no live per-frame stream and retains no replay on the backend.

With owner approval, stop issuance and new writes using one statement while keeping existing results visible:

```sql
update retriever_camp.ranked_control set active=false where season='great-migration-1';
```

The previously approved Pages revision can be republished through the existing process. Preserve the additive tables, legacy APIs and saves during rollback so a later review can inspect them. Avoid deleting objects or auth identities to fix a UI outage. For player-requested data removal, use the Competitive profile confirmation. It removes the application’s public record, relationships, owned Camps and award receipts through existing foreign keys. The platform Auth record remains. Use the owner’s Supabase dashboard identity deletion workflow for that separate operation.

## Phase 10 launch sequence

1. Obtain approval for named operations and the launch date. Capture backup metadata and verify restore independently. Snapshot historical `preseason`, `season-one` and any review output. Keep those rows separate from replay-verified Great Migration 1 standings. Treat any cut-off for old writes as a separate approved archive decision, since deployed legacy clients may still use their original API.
2. Test migration, function deployment, claims, capacity, archive, and identity continuity in an isolated project. Review the final gameplay build and confirm it still uses the expected course. If competitive physics changes, cut a different ruleset namespace and revalidate the Edge verifier before any production activation.
3. Confirm the new production namespace is empty and inactive. Keep anonymous identity mappings unless the owner authorizes identity work separately. A clean local production start requires a separately reviewed versioned save/reset operation before exposure, with an export and migration rollback. Phase 09 does not ship a reset command or run any reset.
4. Apply the reviewed migrations and Edge bundle in the approved order. Verify role checks, closed state and count. Build with the production publishable config after sign-off and run the physical installation and offline matrix. Only after owner approval, set the control to active in the new namespace. Confirm older clients still see their archived standings and new hunters receive canonical results.
5. If acceptance fails, close ranked issuance, retain all records, and use the approved earlier app build or restore only the explicitly affected objects from protected backups. Keep local play available during investigation.
