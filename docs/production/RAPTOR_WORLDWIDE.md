# Restore all five Worldwide columns

The read-only check against live build `1687883` gave HTTP 200 for the Phase 09 score RPC and HTTP 404 with `PGRST202` for the combined RPC. Closure and zero ranks are expected. Supabase exposes the first function. Its HTTP schema could not resolve the second function by the expected name and argument. The public read cannot distinguish absence in PostgreSQL from a stale schema cache.

In Supabase SQL Editor for the correct project run only these diagnostics first.

```sql
select
  to_regprocedure('public.rr_ranked_board(text,integer,text,uuid)') as phase_09,
  to_regprocedure('public.rr_worldwide_standings(integer)') as combined;
select public.rr_ranked_board('score', 0, 'worldwide', null);
select
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as result_type,
  has_function_privilege('anon', oid, 'EXECUTE') as public_read,
  has_function_privilege('authenticated', oid, 'EXECUTE') as signed_in_read
from pg_proc
where oid = to_regprocedure('public.rr_worldwide_standings(integer)');
```

- If `combined` is null, apply the single additive migration below. It grants anonymous and signed-in readers access to the same bounded public data. It leaves all tables, receipts, score rows, ties and the ranked gate intact. [Copy the Opening Day addition](../../supabase/migrations/202611270001_opening_day_standings.sql)
- If `combined` exists, the expected argument is `p_offset integer DEFAULT 0`, the result type is `jsonb`, and both read privileges are true. Run `select public.rr_worldwide_standings(0);` in the SQL Editor. If only the grants differ, the reviewed migration restores them. If the argument name or result type differs, capture the diagnostics before any changes. If function and grants match, run `notify pgrst, 'reload schema';` and recheck the HTTP read.
- Refresh Worldwide. Expect the status to reflect the closed launch gate, with zero ranked players if no real submissions exist. Raptor can show authoritative official scores when the combined RPC is temporarily absent. It labels the unavailable secondary columns. It does not attempt a second request for unrelated authentication, connection or permission errors.
- Hosted verifier deployment, abuse review and ranked activation stay separate. For pre-merge verification use an isolated Supabase project and the staged CLI verifier. Follow the previous reviewed owner operations. [Verifier and rollback procedure](OPENING_DAY_OPERATIONS.md)

No hosted SQL, credentials, ranked activation, or record changes were needed for this audit. [Sanitized HTTP receipt](evidence/raptor/hosted-read.json)
