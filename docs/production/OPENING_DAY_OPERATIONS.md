# Opening Day owner operations

The owner reported that the Phase 09 consolidated migration was installed and that Worldwide opened on iPhone with zero ranked players. Leave the current competition closed during review.

## Add the standings read API

1. In the target Supabase dashboard, open SQL Editor. Confirm the Phase 09 install under `public`, including `rr_ranked_board(text,integer,text,uuid)`.
2. Open [the Opening Day standings migration](../../supabase/migrations/202611270001_opening_day_standings.sql) and paste the entire file into a new query. Run it once. Existing Phase 09 SQL, saved results, player identities and competition settings are retained.
3. Run the checks below. Expect two non-null function names. The JSON should include `status: "ok"`, `open: false`, `season: "great-migration-1"`, `course: "migration-30-phase-05"`, and `rows`. An empty board legitimately has zero ranked players.
4. Verify the public read over PostgREST with the project's publishable key, then refresh Worldwide on the approved review build. A PGRST202 response after the SQL succeeds indicates a stale schema cache or a mismatched project. The script requests a schema reload.

```sql
select to_regprocedure('public.rr_ranked_board(text,integer,text,uuid)') as phase_nine,
       to_regprocedure('public.rr_worldwide_standings(integer)') as opening_day;
select public.rr_worldwide_standings(0);
```

The previous frontend can keep reading the Phase 09 endpoint. If rolling back, use that frontend first. The additive standings endpoint can stay in place. Removing it is a separate owner-approved operation.

## Review and deploy the verifier

Use a separate Supabase project for hosted acceptance if an authorized free project slot is available. Use the same reviewed SQL and deploy bundle there. Synthetic players are appropriate only on the isolated project. Confirm Auth permits anonymous sign-in and configure the exact allowed game origin per [Phase 09 operations](PHASE_09_DEPLOYMENT.md).

- The reviewed workflow **Deploy ranked verifier by request** becomes dispatchable after it is present on the repository default branch. Configure GitHub **Settings → Environments → ranked-verifier** with the project reference as `SUPABASE_PROJECT_REF` and an authorized Supabase deployment token as the secret `SUPABASE_ACCESS_TOKEN`. Scope the account to the target project where project and organization access controls permit. Require an owner reviewer if the repository plan supports environment reviewers. Dispatching the workflow with the explicit confirmation is an owner operation even without reviewer controls.
- From GitHub Actions on iPhone, open the workflow, choose **Run workflow**, select `main` and enter `deploy verify-hunt`. The workflow deploys only the function. It does not run migrations or set the competition gate. Use desktop layout in Safari if the mobile UI omits environment settings. Do not paste a deployment token into chat, issue comments, repository files or command arguments.
- CLI alternative from a computer with Node and the Supabase CLI. Run `npm ci`. Run `node scripts/prepare-camp-deployment.mjs /path/to/staged-verifier`. From the staged directory, authenticate with `supabase login`, then run `supabase functions deploy verify-hunt --project-ref YOUR_PROJECT_REF --use-api`. Project secrets and the publishable key are handled as described in the Phase 09 operations guide. Standard Supabase managed credentials are supplied to the Edge runtime. The handler authenticates each request through Auth before using privileged RPCs.

The verifier replays an exact fixed-step hunt and accepts at most 108,000 ticks (15 minutes), 2,048 accepted inputs and a 20 KiB request body. Ordinary hunts and play beyond these limits retain normal local records and progression. A capped hunt receives no partial verified score. The game discloses this before ranked entry. Hosted CPU on near-limit replays remains an acceptance gate. Record successful and rejected submissions, CPU time, resource errors, duplicate/interrupted retry results and scope project access checks before requesting activation. Deterministic replay confirms that submitted inputs can produce the result. It cannot identify every assisted or scripted run.

## Owner approval gates and rollback

- Keep production ranks closed until isolated hosted verification and owner acceptance are complete. Verify with three anonymous QA identities and genuinely different replay-derived results. Exercise worse and better retries, persistence, invalid input handling and cross-account denial. Sample both short and near-limit valid runs. Verify profile deletion using a disposable isolated account.
- For further production verification, confirm the standings read and its closed flag anonymously. A separate approved owner activation is required for production ranked writes. If a hosted failure occurs after activation, close the gate using the reviewed procedure in the Phase 09 operations guide. Roll back the verifier bundle to the last approved function version and recheck the closed flag.
- Preserve the published game and save namespace until launch approval. Open Field settings → Game and installation → Export local save. Keep the JSON in Files or equivalent private storage. Repeat separately for each browser or PWA installation. Verify the file contains the expected profiles and records. It contains no online session tokens. Import and reinstall should be reviewed before any reset. Back up the hosted schema and relevant records with existing authorized database tools. Keep backups private.
- A launch clean start is a proposal for separate review. An archived development competition and a fresh, explicitly versioned public season can coexist. Local saves, hosted rankings and anonymous Auth identities have separate lifecycles. Do not delete historical records or identities as part of asset or application deployment. A local fresh start needs its own explicit owner decision and a tested import path.
- Previously identified metadata in historical Boyd source uploads requires separate authorization for any rewrite. Keep current build exclusions in place. Plan a coordinated history and host-cache remediation separately. A publication check covers the current output and cannot establish removal from prior commits, forks or caches.

## Apple Home Screen review

Review a fresh installation and an existing installation on iPhone. From Safari, use Share → Add to Home Screen and check the Boyd icon and exact name **Retriever Run**. For an existing icon, first export and verify the local save. Safari or iOS may keep the old icon. Only remove and re-add the Home Screen app when you can recover its local saves.
