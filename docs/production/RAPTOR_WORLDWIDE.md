# Restore all five Worldwide columns

The read-only check against live build `1687883` gave HTTP 200 for the Phase 09 score RPC and HTTP 404 with `PGRST202` for the combined RPC. Closure and zero ranks are expected. Supabase exposes the first function. Its HTTP schema could not resolve the second function by the expected name and argument. The public read cannot distinguish absence in PostgreSQL from a stale schema cache.

In Supabase SQL Editor for the correct project run only these diagnostics first.

```sql
select
  to_regprocedure('public.rr_ranked_board(text,integer,text,uuid)') as phase_09,
  to_regprocedure('public.rr_worldwide_standings(integer)') as combined;
select public.rr_ranked_board('score', 0, 'worldwide', null);
```

- If `combined` is null, apply the single additive migration below. It grants anonymous and signed-in readers access to the same bounded public data. It leaves all tables, receipts, score rows, ties and the ranked gate intact. [Copy the Opening Day addition](../../supabase/migrations/202611270001_opening_day_standings.sql)
- If `combined` exists, run `select public.rr_worldwide_standings(0);` in the SQL Editor. Confirm the expected signature, then check EXECUTE permission with `select has_function_privilege('anon','public.rr_worldwide_standings(integer)','EXECUTE');`. The expected result is true. The migration is idempotent and can restore the expected grants. If schema and grants already match, run `notify pgrst, 'reload schema';` and recheck the HTTP read.
- Refresh Worldwide. Expect the status to reflect the closed launch gate, with zero ranked players if no real submissions exist. Raptor can show authoritative official scores when the combined RPC is temporarily absent. It labels the unavailable secondary columns. It does not attempt a second request for unrelated authentication, connection or permission errors.
- Hosted verifier deployment, abuse review and ranked activation stay separate. For pre-merge verification use an isolated Supabase project and the staged CLI verifier. Follow the previous reviewed owner operations. [Verifier and rollback procedure](OPENING_DAY_OPERATIONS.md)

No hosted SQL, credentials, ranked activation, or record changes were needed for this audit. [Sanitized HTTP receipt](evidence/raptor/hosted-read.json)
