begin;
create function public.rr_ranked_board(p_metric text,p_offset integer default 0,p_scope text default 'worldwide',p_camp uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  mine_id uuid := retriever_camp.caller();
  settings retriever_camp.ranked_control;
  my_best retriever_camp.ranked_bests;
  mine jsonb;
  rivals jsonb := '[]'::jsonb;
  result jsonb;
  ordinal integer;
  skip integer := least(75,greatest(0,coalesce(p_offset,0)));
begin
  if p_metric is null or p_metric not in ('score','distance','duration','retrieves','combo') then
    return jsonb_build_object('status','invalid_metric');
  end if;
  if p_scope is null or p_scope not in ('worldwide','friends','camp') then return jsonb_build_object('status','not_found'); end if;
  if p_scope <> 'worldwide' and mine_id is null then return jsonb_build_object('status','auth_required'); end if;
  if p_scope='camp' and not exists(select 1 from retriever_camp.private_members where player_id=mine_id and camp_id=p_camp)
    then return jsonb_build_object('status','not_found'); end if;
  select * into settings from retriever_camp.ranked_control where season='great-migration-1';
  if p_scope='worldwide' then
    select * into my_best from retriever_camp.ranked_bests
      where season=settings.season and metric=p_metric and player_id=mine_id;
    if found then
      select 1+count(*) into ordinal from retriever_camp.ranked_bests b
      where b.season=settings.season and b.metric=p_metric and
        (-b.value,b.recorded_at,b.player_id)<(-my_best.value,my_best.recorded_at,my_best.player_id);
      select jsonb_build_object('rank',ordinal,'nickname',nickname,'value',my_best.value,'recorded_at',my_best.recorded_at)
      into mine from retriever_camp.players where player_id=mine_id;
      with ahead as (
        select b.* from retriever_camp.ranked_bests b where b.season=settings.season and b.metric=p_metric and
          (-b.value,b.recorded_at,b.player_id)<(-my_best.value,my_best.recorded_at,my_best.player_id)
        order by b.value asc,b.recorded_at desc,b.player_id desc limit 1
      ), behind as (
        select b.* from retriever_camp.ranked_bests b where b.season=settings.season and b.metric=p_metric and
          (-b.value,b.recorded_at,b.player_id)>(-my_best.value,my_best.recorded_at,my_best.player_id)
        order by b.value desc,b.recorded_at,b.player_id limit 1
      ), nearby as (
        select ahead.*,ordinal-1 as rank from ahead union all select behind.*,ordinal+1 from behind
      )
      select coalesce(jsonb_agg(jsonb_build_object('rank',n.rank,'nickname',p.nickname,'value',n.value,
        'recorded_at',n.recorded_at) order by n.rank),'[]'::jsonb) into rivals
      from nearby n join retriever_camp.players p on p.player_id=n.player_id;
    end if;
  end if;
  with scoped as (
    select mine_id as player_id where p_scope='friends'
    union select case when f.first_id=mine_id then f.second_id else f.first_id end
      from retriever_camp.friends f where p_scope='friends' and f.accepted and mine_id in (f.first_id,f.second_id)
    union select m.player_id from retriever_camp.private_members m where p_scope='camp' and m.camp_id=p_camp
  ), page as (
    select b.player_id,b.value,b.recorded_at from retriever_camp.ranked_bests b
    where b.season=settings.season and b.metric=p_metric and
      (p_scope='worldwide' or b.player_id in (select player_id from scoped))
    order by b.value desc,b.recorded_at,b.player_id offset skip limit 26
  ), numbered as (
    select p.nickname, page.value,page.recorded_at,
      skip + row_number() over (order by page.value desc,page.recorded_at,page.player_id) as rank
    from page join retriever_camp.players p on p.player_id=page.player_id
  )
  select jsonb_build_object('status','ok','season',settings.season,'course',settings.course,'open',settings.active,
    'mine',mine,'rivals',rivals,'as_of',statement_timestamp(),
    'rows',coalesce(jsonb_agg(to_jsonb(numbered) order by rank) filter(where rank <= skip+25),'[]'::jsonb),
    'has_more',skip<75 and count(*)>25) into result from numbered;
  return result;
end $$;
create index ranked_best_rank_key on retriever_camp.ranked_bests (season,metric,(-value),recorded_at,player_id);
create function public.rr_ranked_profile(p_nickname text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce((select jsonb_build_object('status','ok','nickname',p.nickname,'records',jsonb_object_agg(b.metric,b.value))
    from retriever_camp.players p join retriever_camp.ranked_bests b on b.player_id = p.player_id
    where lower(p.nickname) = lower(p_nickname) and p.nickname = p_nickname and b.season = 'great-migration-1'
    group by p.player_id),'{"status":"not_found"}'::jsonb)
$$;
revoke all on function public.rr_ranked_board(text,integer,text,uuid) from public, anon, authenticated;
grant execute on function public.rr_ranked_board(text,integer,text,uuid) to anon, authenticated;
revoke all on function public.rr_ranked_profile(text) from public, anon, authenticated;
grant execute on function public.rr_ranked_profile(text) to anon, authenticated;
commit;
