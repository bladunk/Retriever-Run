-- Opening Day requires the already-installed Phase 09 schema.
begin;

create or replace function public.rr_worldwide_standings(p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  with board as materialized (
    select public.rr_ranked_board('score',p_offset,'worldwide',null) as result
  ), standings as (
    select entry_row.value || jsonb_build_object('bests', coalesce(m.bests,'{}'::jsonb)) as entry, entry_row.position
    from board cross join lateral jsonb_array_elements(board.result->'rows') with ordinality as entry_row(value,position)
    join retriever_camp.players p on lower(p.nickname)=lower(entry_row.value->>'nickname')
    cross join lateral (
      select jsonb_object_agg(b.metric,b.value) as bests
      from retriever_camp.ranked_bests b
      where b.player_id=p.player_id and b.season=board.result->>'season'
        and b.metric in ('score','distance','duration','retrieves','combo')
    ) m
  )
  select jsonb_set(board.result,'{rows}',coalesce((
    select jsonb_agg(entry order by position) from standings
  ),'[]'::jsonb)) from board;
$$;

revoke all on function public.rr_worldwide_standings(integer) from public, anon, authenticated;
grant execute on function public.rr_worldwide_standings(integer) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
