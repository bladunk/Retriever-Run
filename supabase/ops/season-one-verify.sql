-- Read-only preflight and post-switch review. Run manually as the database owner.
begin transaction read only;

select active, generation from retriever_camp.season_control where singleton;

select
  (select count(*) from retriever_camp.players) as anonymous_profiles,
  (select count(*) from retriever_camp.players where score_at is not null) as preseason_ranked_players,
  (select count(*) from retriever_camp.receipts) as preseason_receipts,
  (select count(*) from retriever_camp.season_one_records) as season_one_ranked_players,
  (select count(*) from retriever_camp.season_one_tickets where submitted_at is not null) as season_one_used_tickets;

select
  has_schema_privilege('authenticated', 'retriever_camp', 'usage') as private_schema_access,
  has_table_privilege('authenticated', 'retriever_camp.season_one_records', 'insert') as direct_record_insert,
  has_table_privilege('authenticated', 'retriever_camp.season_one_tickets', 'select') as direct_ticket_read,
  has_function_privilege('anon', 'public.rr_camp_start_run()', 'execute') as anonymous_ticket_issue,
  has_function_privilege('authenticated', 'public.rr_camp_start_run()', 'execute') as signed_session_ticket_issue;

select public.rr_camp_season() as metadata,
  public.rr_camp_board('score', 0, 1) as active_public_board;

rollback;
