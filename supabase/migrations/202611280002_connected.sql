begin;

-- Keep the historical functions on their original tickets and season.
alter table retriever_camp.ranked_control
  drop constraint ranked_control_season_check, drop constraint ranked_control_course_check;
alter table retriever_camp.ranked_control add column public_career_enabled boolean not null default false;
alter table retriever_camp.ranked_control add constraint ranked_control_season_course check (
  (season,course) in (('great-migration-1','migration-30-phase-05'),
    ('one-more-hunt-1','migration-30-mastery-1')));
insert into retriever_camp.ranked_control(season,course,active)
values ('one-more-hunt-1','migration-30-mastery-1',false);

create table retriever_camp.mastery_tickets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references retriever_camp.players on delete cascade,
  season text not null references retriever_camp.ranked_control,
  seed bigint not null check (seed between 0 and 4294967295),
  issued_at timestamptz not null default clock_timestamp(),
  lease_until timestamptz,
  lease uuid,
  claimed_ticks integer,
  checked_at timestamptz,
  accepted boolean,
  new_best text[],
  new_honors text[]
);
create index mastery_ticket_owner_time on retriever_camp.mastery_tickets (player_id, issued_at desc);
create index mastery_ticket_retention on retriever_camp.mastery_tickets (issued_at);

alter table retriever_camp.mastery_tickets enable row level security;
revoke all on retriever_camp.mastery_tickets from public, anon, authenticated;
create index mastery_tickets_active_lease on retriever_camp.mastery_tickets (lease_until) where lease_until is not null;

create function public.rr_mastery_ticket(p_course text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := retriever_camp.caller();
  ticket retriever_camp.mastery_tickets;
  settings retriever_camp.ranked_control;
  stamp timestamptz := clock_timestamp();
begin
  if owner_id is null then return jsonb_build_object('status','auth_required'); end if;
  select * into settings from retriever_camp.ranked_control where season = 'one-more-hunt-1';
  if not settings.active then return jsonb_build_object('status','closed'); end if;
  if p_course is distinct from settings.course then return jsonb_build_object('status','wrong_course'); end if;
  perform 1 from retriever_camp.players where player_id = owner_id for update;
  if not found then return jsonb_build_object('status','profile_required'); end if;
  if (select count(*) from retriever_camp.mastery_tickets
      where player_id = owner_id and issued_at > stamp - interval '1 minute') >= 4
     or (select count(*) from retriever_camp.mastery_tickets
      where player_id = owner_id and issued_at > stamp - interval '1 day') >= 60 then
    return jsonb_build_object('status','rate_limited');
  end if;
  -- No auth or member identifier is derived from the seed.
  insert into retriever_camp.mastery_tickets(player_id,season,seed,issued_at)
  values (owner_id, settings.season, ('x' || left(replace(gen_random_uuid()::text,'-',''),8))::bit(32)::bigint, stamp)
  returning * into ticket;
  return jsonb_build_object('status','ok','id',ticket.id,'seed',ticket.seed,'season',ticket.season,
    'course',settings.course,'expires',stamp + interval '48 hours');
end $$;

-- Service-only calls. The Edge verifier supplies the identity from Auth, never
-- from the request body, and derives the metrics by replay.
create function public.rr_mastery_claim(p_player uuid, p_ticket uuid, p_ticks integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ticket retriever_camp.mastery_tickets;
  stamp timestamptz := clock_timestamp();
begin
  if p_ticks is null or p_ticks not between 240 and 432000 then return jsonb_build_object('status','invalid_run'); end if;
  select * into ticket from retriever_camp.mastery_tickets where id = p_ticket and player_id = p_player for update;
  if not found then return jsonb_build_object('status','invalid_ticket'); end if;
  if ticket.checked_at is not null then
    return jsonb_build_object('status',case when ticket.accepted then 'duplicate' else 'invalid_run' end,
      'improved',ticket.new_best,'honors',ticket.new_honors);
  end if;
  if ticket.issued_at < stamp - interval '48 hours' then return jsonb_build_object('status','expired'); end if;
  if not exists (select 1 from retriever_camp.ranked_control where season = ticket.season and active)
    then return jsonb_build_object('status','closed'); end if;
  if stamp - ticket.issued_at + interval '2 seconds' < p_ticks * interval '1 second' / 120
    then return jsonb_build_object('status','invalid_run'); end if;
  if ticket.lease_until > stamp then return jsonb_build_object('status','pending'); end if;
  -- Serialize only the small admission check, outside replay computation.
  perform pg_advisory_xact_lock(412935,12);
  if exists (select 1 from retriever_camp.mastery_tickets where player_id=p_player and lease_until>stamp)
    or (select count(*) from retriever_camp.mastery_tickets where lease_until>stamp)>=4
    then return jsonb_build_object('status','rate_limited'); end if;
  update retriever_camp.mastery_tickets set lease = gen_random_uuid(), lease_until = stamp + interval '30 seconds', claimed_ticks=p_ticks
  where id = p_ticket returning * into ticket;
  return jsonb_build_object('status','ok','seed',ticket.seed,'lease',ticket.lease,
    'season',ticket.season,'course','migration-30-mastery-1');
end $$;

create function public.rr_mastery_commit(p_player uuid, p_ticket uuid, p_lease uuid, p_metrics jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ticket retriever_camp.mastery_tickets;
  m text;
  previous integer;
  amount integer;
  stamp timestamptz := clock_timestamp();
  targets integer[];
  improved text[] := array[]::text[];
  eligible text[] := array['camp-first-hunt'];
  awarded text[];
  index integer;
begin
  -- Serialize personal best and award processing across tickets for one hunter.
  perform 1 from retriever_camp.players where player_id = p_player for update;
  if not found then return jsonb_build_object('status','invalid_ticket'); end if;
  select * into ticket from retriever_camp.mastery_tickets where id = p_ticket and player_id = p_player for update;
  if not found then return jsonb_build_object('status','invalid_ticket'); end if;
  if ticket.checked_at is not null then
    return jsonb_build_object('status',case when ticket.accepted then 'duplicate' else 'invalid_run' end,
      'improved',ticket.new_best,'honors',ticket.new_honors);
  end if;
  if ticket.lease is null or ticket.lease is distinct from p_lease or ticket.lease_until < stamp then
    return jsonb_build_object('status','pending');
  end if;
  if not exists (select 1 from retriever_camp.ranked_control where season = ticket.season and active for share)
    then return jsonb_build_object('status','closed'); end if;
  update retriever_camp.mastery_tickets set checked_at = stamp, accepted = p_metrics is not null, lease = null, lease_until = null
    where id = ticket.id;
  if p_metrics is null then return jsonb_build_object('status','invalid_run'); end if;
  -- A malformed verifier payload aborts the transaction, including the receipt.
  if not (p_metrics ?& array['score','distance','duration','retrieves','combo','nearMisses','cleanStreak'])
    or p_metrics - array['score','distance','duration','retrieves','combo','nearMisses','cleanStreak'] <> '{}'::jsonb
    then raise exception 'Invalid verifier metrics'; end if;
  if coalesce(p_metrics->>'duration','') !~ '^[0-9]{1,7}$'
    or abs((p_metrics->>'duration')::integer - ticket.claimed_ticks * (1000.0/120)) > 10
    then raise exception 'Invalid verifier duration'; end if;
  foreach m in array array['score','distance','duration','retrieves','combo'] loop
    if jsonb_typeof(p_metrics->m) is distinct from 'number' or p_metrics->>m !~ '^[0-9]{1,7}$' then
      raise exception 'Invalid verifier metrics';
    end if;
    amount := (p_metrics->>m)::integer;
    if amount > 0 then
      select value into previous from retriever_camp.ranked_bests
      where season = ticket.season and metric = m and player_id = p_player;
      if previous is null or amount > previous then
        insert into retriever_camp.ranked_bests values (ticket.season, m, p_player, amount, stamp)
        on conflict (season, metric, player_id) do update set value = excluded.value, recorded_at = excluded.recorded_at;
        improved := array_append(improved,m);
      end if;
    end if;
    targets := case m when 'score' then array[2500,10000,25000,50000]
      when 'distance' then array[500,2000,5000,10000]
      when 'retrieves' then array[1,5,10,25] end;
    if targets is not null then
      for index in 1..4 loop
        if amount >= targets[index] then eligible := array_append(eligible,'camp-'||m||'-'||index); end if;
      end loop;
    end if;
  end loop;
  if (select count(*) from retriever_camp.ranked_bests where season = ticket.season and player_id = p_player
    and metric in ('score','distance','retrieves')) = 3 then
    eligible := array_append(eligible,'camp-all-boards');
  end if;
  with awards as (
    insert into retriever_camp.verified_honors (player_id,id)
    select p_player, item from unnest(eligible) item on conflict do nothing returning id
  ) select coalesce(array_agg(id order by id),array[]::text[]) into awarded from awards;
  update retriever_camp.mastery_tickets set new_best = improved, new_honors = awarded where id = ticket.id;
  return jsonb_build_object('status','ok','improved',improved,'honors',awarded);
end $$;

create function public.rr_mastery_prune() returns integer
language sql security definer set search_path = '' as $$
  with stale as (select id from retriever_camp.mastery_tickets
    where issued_at < statement_timestamp() - interval '7 days' order by issued_at limit 5000),
  removed as (delete from retriever_camp.mastery_tickets t using stale where t.id = stale.id returning 1)
  select count(*)::integer from removed
$$;

revoke all on function public.rr_mastery_ticket(text), public.rr_mastery_claim(uuid,uuid,integer),
  public.rr_mastery_commit(uuid,uuid,uuid,jsonb), public.rr_mastery_prune() from public, anon, authenticated;
grant execute on function public.rr_mastery_ticket(text) to authenticated;
grant execute on function public.rr_mastery_claim(uuid,uuid,integer), public.rr_mastery_commit(uuid,uuid,uuid,jsonb),
  public.rr_mastery_prune() to service_role;


create function public.rr_connected_standings(p_scope text default 'worldwide', p_camp uuid default null,
  p_offset integer default 0, p_season text default 'one-more-hunt-1')
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  caller uuid := retriever_camp.caller();
  settings retriever_camp.ranked_control;
  start_at integer := least(75,greatest(0,coalesce(p_offset,0)));
  result jsonb;
begin
  if p_scope is null or p_scope not in ('worldwide','friends','camp') then return jsonb_build_object('status','not_found'); end if;
  if p_scope <> 'worldwide' and caller is null then return jsonb_build_object('status','auth_required'); end if;
  if p_scope='camp' and not exists (
    select 1 from retriever_camp.private_members where camp_id=p_camp and player_id=caller
  ) then return jsonb_build_object('status','not_found'); end if;
  select * into settings from retriever_camp.ranked_control where season=p_season;
  if not found then return jsonb_build_object('status','wrong_version'); end if;

  with members as (
    select caller as player_id where p_scope='friends'
    union select case when first_id=caller then second_id else first_id end
      from retriever_camp.friends where p_scope='friends' and accepted and caller in (first_id,second_id)
    union select player_id from retriever_camp.private_members where p_scope='camp' and camp_id=p_camp
  ), eligible as not materialized (
    select b.player_id,b.value,b.recorded_at from retriever_camp.ranked_bests b
    where b.season=settings.season and b.metric='score'
      and (p_scope='worldwide' or b.player_id in (select player_id from members))
  ), page as (
    select * from eligible order by value desc,recorded_at,player_id offset start_at limit 26
  ), numbered as (
    select page.*, start_at+row_number() over (order by value desc,recorded_at,player_id) as rank from page
  ), page_data as (
    select n.rank, p.nickname, n.value, n.recorded_at,
      (select jsonb_object_agg(metric,b.value) from retriever_camp.ranked_bests b
        where b.season=settings.season and b.player_id=n.player_id) as bests
    from numbered n join retriever_camp.players p using(player_id)
  ), mine as (
    select e.*, p.nickname,
      1+(select count(*) from eligible v where (-v.value,v.recorded_at,v.player_id)<(-e.value,e.recorded_at,e.player_id)) as rank,
      (select count(*) from eligible v where v.value < e.value) as beaten
    from eligible e join retriever_camp.players p using(player_id) where e.player_id=caller and start_at=0
  ), summary as (
    select count(*) as population from eligible where start_at=0
  ), neighbor as (
    (select e.*,m.rank-1 as rank from eligible e cross join mine m
      where (-e.value,e.recorded_at,e.player_id)<(-m.value,m.recorded_at,m.player_id)
      order by e.value,e.recorded_at desc,e.player_id desc limit 1)
    union all
    (select e.*,m.rank+1 as rank from eligible e cross join mine m
      where (-e.value,e.recorded_at,e.player_id)>(-m.value,m.recorded_at,m.player_id)
      order by e.value desc,e.recorded_at,e.player_id limit 1)
  )
  select jsonb_build_object('status','ok','season',settings.season,'course',settings.course,'open',settings.active,
    'as_of',statement_timestamp(),'total_ranked',case when start_at=0 then summary.population end,
    'mine',(select (to_jsonb(m) - array['player_id','beaten']) ||
      jsonb_build_object('bests', (select jsonb_object_agg(metric,b.value) from retriever_camp.ranked_bests b
        where b.season=settings.season and b.player_id=m.player_id)) from mine m),
    'percentile',(select round(m.beaten*100.0/nullif(summary.population-1,0)) from mine m),
    'rivals',coalesce((select jsonb_agg(jsonb_build_object('rank',n.rank,'nickname',p.nickname,
      'value',n.value,'recorded_at',n.recorded_at) order by n.rank)
      from neighbor n join retriever_camp.players p using(player_id)),'[]'::jsonb),
    'rows',coalesce((select jsonb_agg(to_jsonb(d) order by d.rank) from page_data d where rank<=start_at+25),'[]'::jsonb),
    'has_more',start_at<75 and (select count(*) from page)>25)
    into result from summary;
  return result;
end $$;

-- Career details are local and unverified. Absence of a row means private.
create table retriever_camp.public_careers (
  player_id uuid primary key references retriever_camp.players on delete cascade,
  level integer not null check (level between 1 and 100),
  migration_complete boolean not null
);
alter table retriever_camp.public_careers enable row level security;
revoke all on retriever_camp.public_careers from public,anon,authenticated;

create function public.rr_connected_visibility(p_publish boolean,p_level integer default null,p_migration boolean default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare caller uuid := retriever_camp.caller();
begin
  if caller is null then return jsonb_build_object('status','auth_required'); end if;
  if p_publish is false then
    delete from retriever_camp.public_careers where player_id=caller;
  elsif p_publish is true and not exists(select 1 from retriever_camp.ranked_control
    where season='one-more-hunt-1' and public_career_enabled)
    then return jsonb_build_object('status','feature_closed');
  elsif p_publish is true and p_level between 1 and 100 and p_migration is not null
    and exists(select 1 from retriever_camp.players where player_id=caller) then
    insert into retriever_camp.public_careers values (caller,p_level,p_migration)
    on conflict(player_id) do update set level=excluded.level,migration_complete=excluded.migration_complete;
  else return jsonb_build_object('status','invalid'); end if;
  return jsonb_build_object('status','ok');
end $$;

create function public.rr_connected_profile(p_nickname text,p_season text default 'one-more-hunt-1')
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce((
    select jsonb_build_object('status','ok','nickname',p.nickname,'season',p_season,
      'records',coalesce(records.data,'{}'::jsonb), 'career',case when c.player_id is not null then
        jsonb_build_object('level',c.level,'migration_complete',c.migration_complete) end)
    from retriever_camp.players p left join retriever_camp.public_careers c on c.player_id=p.player_id and exists(
      select 1 from retriever_camp.ranked_control where season='one-more-hunt-1' and public_career_enabled)
    cross join lateral (
      select jsonb_object_agg(b.metric,b.value) as data from retriever_camp.ranked_bests b
        where b.player_id=p.player_id and b.season=p_season
    ) records
    where lower(p.nickname)=lower(p_nickname) and (records.data is not null or c.player_id is not null)
      and p_season in ('one-more-hunt-1','great-migration-1')
  ),'{"status":"not_found"}'::jsonb)
$$;

create function public.rr_friend_rotate() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare caller uuid := retriever_camp.caller();
begin
  if caller is null then return jsonb_build_object('status','auth_required'); end if;
  if not exists(select 1 from retriever_camp.players where player_id=caller)
    then return jsonb_build_object('status','profile_required'); end if;
  if not retriever_camp.social_allow(caller,'friend_rotate',4,3600)
    then return jsonb_build_object('status','rate_limited'); end if;
  insert into retriever_camp.friend_codes(player_id) values(caller)
    on conflict(player_id) do update set code=excluded.code;
  return jsonb_build_object('status','ok');
end $$;

revoke all on function public.rr_connected_standings(text,uuid,integer,text), public.rr_connected_profile(text,text),
  public.rr_connected_visibility(boolean,integer,boolean), public.rr_friend_rotate() from public,anon,authenticated;
grant execute on function public.rr_connected_standings(text,uuid,integer,text),public.rr_connected_profile(text,text)
  to anon,authenticated;
grant execute on function public.rr_connected_visibility(boolean,integer,boolean),public.rr_friend_rotate()
  to authenticated;
notify pgrst,'reload schema';
commit;
