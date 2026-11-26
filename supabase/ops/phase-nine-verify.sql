-- Read-only check after applying the Phase 09 migration files.
select season, course, active from retriever_camp.ranked_control;
-- Expect great-migration-1 | migration-30-phase-05 | false on a new install.

select
  has_function_privilege('anon', 'public.rr_ranked_board(text,integer,text,uuid)', 'EXECUTE') as public_board,
  has_function_privilege('anon', 'public.rr_camp_social(text,uuid,text,uuid)', 'EXECUTE') as anonymous_social,
  has_function_privilege('authenticated', 'public.rr_ranked_commit(uuid,uuid,uuid,jsonb)', 'EXECUTE') as browser_commit,
  has_function_privilege('service_role', 'public.rr_ranked_commit(uuid,uuid,uuid,jsonb)', 'EXECUTE') as verifier_commit,
  has_schema_privilege('authenticated', 'retriever_camp', 'USAGE') as private_schema;
-- Expect true, false, false, true, false.

select relname, relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'retriever_camp' and c.relkind = 'r' order by relname;
-- Expect true for every listed table.

select (select count(*) from retriever_camp.ranked_bests) as ranked_rows,
       (select count(*) from retriever_camp.ranked_tickets) as ranked_tickets;
-- Expect 0, 0 on the new production namespace. Legacy rows are untouched.

select payload->>'total_ranked' as score_board_total, payload->>'course' as verified_course
from (select public.rr_ranked_board('score') as payload) board;
-- Expect 0 on a new board and migration-30-phase-05 for the verified course.
