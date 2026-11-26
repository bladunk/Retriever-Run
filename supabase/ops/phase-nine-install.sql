begin;

-- 202611250001_verified_camp.sql
-- A separate namespace. Installing this migration never opens ranked play.
create table retriever_camp.ranked_control (
  season text primary key check (season = 'great-migration-1'),
  course text not null check (course = 'migration-30-phase-05'),
  active boolean not null default false
);
insert into retriever_camp.ranked_control (season, course)
values ('great-migration-1', 'migration-30-phase-05');

create table retriever_camp.ranked_tickets (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references retriever_camp.players on delete cascade,
  season text not null references retriever_camp.ranked_control,
  seed bigint not null check (seed between 0 and 4294967295),
  issued_at timestamptz not null default clock_timestamp(),
  lease_until timestamptz,
  lease uuid,
  checked_at timestamptz,
  accepted boolean,
  new_best text[],
  new_honors text[]
);
create index ranked_ticket_owner_time on retriever_camp.ranked_tickets (player_id, issued_at desc);
create index ranked_ticket_retention on retriever_camp.ranked_tickets (issued_at);

create table retriever_camp.ranked_bests (
  season text references retriever_camp.ranked_control,
  metric text check (metric in ('score','duration','distance','retrieves','combo')),
  player_id uuid references retriever_camp.players on delete cascade,
  value integer not null check (value > 0),
  recorded_at timestamptz not null,
  primary key (season, metric, player_id)
);
create index ranked_best_order on retriever_camp.ranked_bests
  (season, metric, value desc, recorded_at, player_id);

create table retriever_camp.verified_honors (
  player_id uuid references retriever_camp.players on delete cascade,
  id text,
  earned_at timestamptz not null default statement_timestamp(),
  primary key (player_id, id)
);

alter table retriever_camp.ranked_control enable row level security;
alter table retriever_camp.ranked_tickets enable row level security;
alter table retriever_camp.ranked_bests enable row level security;
alter table retriever_camp.verified_honors enable row level security;
revoke all on retriever_camp.ranked_control, retriever_camp.ranked_tickets, retriever_camp.ranked_bests,
  retriever_camp.verified_honors from public, anon, authenticated;

create function public.rr_ranked_ticket(p_course text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := retriever_camp.caller();
  ticket retriever_camp.ranked_tickets;
  settings retriever_camp.ranked_control;
  stamp timestamptz := clock_timestamp();
begin
  if owner_id is null then return jsonb_build_object('status','auth_required'); end if;
  select * into settings from retriever_camp.ranked_control where season = 'great-migration-1';
  if not settings.active then return jsonb_build_object('status','closed'); end if;
  if p_course is distinct from settings.course then return jsonb_build_object('status','wrong_course'); end if;
  perform 1 from retriever_camp.players where player_id = owner_id for update;
  if not found then return jsonb_build_object('status','profile_required'); end if;
  if (select count(*) from retriever_camp.ranked_tickets
      where player_id = owner_id and issued_at > stamp - interval '1 minute') >= 4
     or (select count(*) from retriever_camp.ranked_tickets
      where player_id = owner_id and issued_at > stamp - interval '1 day') >= 60 then
    return jsonb_build_object('status','rate_limited');
  end if;
  -- No auth or member identifier is derived from the seed.
  insert into retriever_camp.ranked_tickets(player_id,season,seed,issued_at)
  values (owner_id, settings.season, ('x' || left(replace(gen_random_uuid()::text,'-',''),8))::bit(32)::bigint, stamp)
  returning * into ticket;
  return jsonb_build_object('status','ok','id',ticket.id,'seed',ticket.seed,'season',ticket.season,
    'course',settings.course,'expires',stamp + interval '48 hours');
end $$;

-- Service-only calls. The Edge verifier supplies the identity from Auth, never
-- from the request body, and derives the metrics by replay.
create function public.rr_ranked_claim(p_player uuid, p_ticket uuid, p_ticks integer) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ticket retriever_camp.ranked_tickets;
  stamp timestamptz := clock_timestamp();
begin
  if p_ticks is null or p_ticks not between 240 and 108000 then return jsonb_build_object('status','invalid_run'); end if;
  select * into ticket from retriever_camp.ranked_tickets where id = p_ticket and player_id = p_player for update;
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
  update retriever_camp.ranked_tickets set lease = gen_random_uuid(), lease_until = stamp + interval '30 seconds'
  where id = p_ticket returning * into ticket;
  return jsonb_build_object('status','ok','seed',ticket.seed,'lease',ticket.lease);
end $$;

create function public.rr_ranked_commit(p_player uuid, p_ticket uuid, p_lease uuid, p_metrics jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  ticket retriever_camp.ranked_tickets;
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
  select * into ticket from retriever_camp.ranked_tickets where id = p_ticket and player_id = p_player for update;
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
  update retriever_camp.ranked_tickets set checked_at = stamp, accepted = p_metrics is not null, lease = null, lease_until = null
    where id = ticket.id;
  if p_metrics is null then return jsonb_build_object('status','invalid_run'); end if;
  -- A malformed verifier payload aborts the transaction, including the receipt.
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
  update retriever_camp.ranked_tickets set new_best = improved, new_honors = awarded where id = ticket.id;
  return jsonb_build_object('status','ok','improved',improved,'honors',awarded);
end $$;

create function public.rr_ranked_prune() returns integer
language sql security definer set search_path = '' as $$
  with stale as (select id from retriever_camp.ranked_tickets
    where issued_at < statement_timestamp() - interval '7 days' order by issued_at limit 5000),
  removed as (delete from retriever_camp.ranked_tickets t using stale where t.id = stale.id returning 1)
  select count(*)::integer from removed
$$;

revoke all on function public.rr_ranked_ticket(text), public.rr_ranked_claim(uuid,uuid,integer),
  public.rr_ranked_commit(uuid,uuid,uuid,jsonb), public.rr_ranked_prune() from public, anon, authenticated;
grant execute on function public.rr_ranked_ticket(text) to authenticated;
grant execute on function public.rr_ranked_claim(uuid,uuid,integer), public.rr_ranked_commit(uuid,uuid,uuid,jsonb),
  public.rr_ranked_prune() to service_role;

-- 202611250002_camp_social.sql
create table retriever_camp.friend_codes (
  player_id uuid primary key references retriever_camp.players on delete cascade,
  code uuid unique not null default gen_random_uuid()
);
create table retriever_camp.friends (
  first_id uuid references retriever_camp.players on delete cascade,
  second_id uuid references retriever_camp.players on delete cascade,
  requested_by uuid not null,
  request_key uuid unique not null default gen_random_uuid(),
  accepted boolean not null default false,
  primary key (first_id, second_id),
  check (first_id < second_id and requested_by in (first_id,second_id))
);
create index camp_friends_second on retriever_camp.friends(second_id);
create table retriever_camp.private_camps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references retriever_camp.players on delete cascade,
  name text not null check(char_length(name) between 3 and 20),
  invite uuid unique not null default gen_random_uuid()
);
create table retriever_camp.private_members (
  camp_id uuid references retriever_camp.private_camps on delete cascade,
  player_id uuid references retriever_camp.players on delete cascade,
  member_key uuid unique not null default gen_random_uuid(),
  primary key (camp_id,player_id)
);
create index camp_private_member_owner on retriever_camp.private_members(player_id,camp_id);
create table retriever_camp.social_budget (
  player_id uuid references retriever_camp.players on delete cascade,
  kind text,
  bucket bigint not null,
  uses integer not null,
  primary key (player_id,kind)
);
alter table retriever_camp.friend_codes enable row level security;
alter table retriever_camp.friends enable row level security;
alter table retriever_camp.private_camps enable row level security;
alter table retriever_camp.private_members enable row level security;
alter table retriever_camp.social_budget enable row level security;
revoke all on retriever_camp.friend_codes,retriever_camp.friends,retriever_camp.private_camps,
  retriever_camp.private_members,retriever_camp.social_budget from public, anon, authenticated;

create function retriever_camp.social_allow(p_owner uuid,p_kind text,p_limit integer,p_window integer) returns boolean
language sql volatile set search_path = '' as $$
  with pulse as (
    insert into retriever_camp.social_budget as existing values
      (p_owner,p_kind,floor(extract(epoch from statement_timestamp()) / p_window)::bigint,1)
    on conflict (player_id,kind) do update set bucket = excluded.bucket,
      uses = case when existing.bucket = excluded.bucket then existing.uses + 1 else 1 end
    where existing.bucket <> excluded.bucket or existing.uses < p_limit returning 1
  ) select exists(select 1 from pulse)
$$;
revoke all on function retriever_camp.social_allow(uuid,text,integer,integer) from public, anon, authenticated;

create function public.rr_camp_social(p_action text,p_camp uuid default null,p_value text default null,p_target uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  mine uuid := retriever_camp.caller();
  other uuid;
  group_row retriever_camp.private_camps;
  code uuid;
  rows jsonb;
  clean text;
begin
  if mine is null then return jsonb_build_object('status','auth_required'); end if;
  if not exists (select 1 from retriever_camp.players where player_id = mine)
    then return jsonb_build_object('status','profile_required'); end if;

  case p_action
  when 'profile' then
    select coalesce(jsonb_object_agg(b.metric,b.value),'{}'::jsonb) into rows
    from retriever_camp.ranked_bests b where b.player_id = mine and b.season = 'great-migration-1';
    return jsonb_build_object('status','ok','nickname',(select nickname from retriever_camp.players where player_id=mine),
      'records',rows, 'honors', (select coalesce(jsonb_agg(id order by id),'[]'::jsonb)
        from retriever_camp.verified_honors where player_id=mine));
  when 'friends' then
    insert into retriever_camp.friend_codes (player_id) values (mine) on conflict do nothing;
    select f.code into code from retriever_camp.friend_codes f where f.player_id=mine;
    select coalesce(jsonb_agg(jsonb_build_object('key',f.request_key,'nickname',p.nickname,'state',
      case when f.accepted then 'friend' when f.requested_by = mine then 'outgoing' else 'incoming' end)
      order by f.accepted desc,p.nickname),'[]'::jsonb) into rows
    from retriever_camp.friends f join retriever_camp.players p
      on p.player_id = case when f.first_id = mine then f.second_id else f.first_id end
    where mine in (f.first_id,f.second_id);
    return jsonb_build_object('status','ok','code',code,'rows',rows);
  when 'friend_request' then
    if not retriever_camp.social_allow(mine,'friend_attempt',12,3600) then return jsonb_build_object('status','rate_limited'); end if;
    if p_value is null or p_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then return jsonb_build_object('status','invalid_code'); end if;
    select player_id into other from retriever_camp.friend_codes where friend_codes.code = p_value::uuid;
    if other is null or other = mine then return jsonb_build_object('status','invalid_code'); end if;
    -- Serialize reciprocal requests and protect both players' inbox limits.
    perform player_id from retriever_camp.players where player_id in (mine,other) order by player_id for update;
    if exists(select 1 from retriever_camp.friends where first_id = least(mine,other) and second_id = greatest(mine,other))
      then return jsonb_build_object('status','already_exists'); end if;
    if (select count(*) from retriever_camp.friends where mine in (first_id,second_id)) >= 50 or
       (select count(*) from retriever_camp.friends where other in (first_id,second_id)) >= 50
      then return jsonb_build_object('status','limit'); end if;
    insert into retriever_camp.friends (first_id,second_id,requested_by)
    values (least(mine,other),greatest(mine,other),mine);
  when 'friend_accept' then
    update retriever_camp.friends set accepted=true where request_key=p_target and mine in (first_id,second_id)
      and requested_by <> mine;
    if not found then return jsonb_build_object('status','not_found'); end if;
  when 'friend_remove' then
    delete from retriever_camp.friends where request_key=p_target and mine in (first_id,second_id);
    if not found then return jsonb_build_object('status','not_found'); end if;
  when 'camps' then
    select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'owner',c.owner_id=mine) order by c.name,c.id),'[]'::jsonb)
    into rows from retriever_camp.private_members m join retriever_camp.private_camps c on c.id=m.camp_id
    where m.player_id=mine;
    return jsonb_build_object('status','ok','rows',rows);
  when 'camp_create' then
    if not retriever_camp.social_allow(mine,'create',3,86400) then return jsonb_build_object('status','rate_limited'); end if;
    clean := regexp_replace(trim(left(p_value,81)),'[[:space:]]+',' ','g');
    if clean is null or clean !~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,18}[A-Za-z0-9]$' or
      regexp_replace(translate(lower(clean),'013457','oieast'),'[^a-z]','','g') ~ '(fuck|shit|bitch|cunt|nigger|faggot|whore|nazi|killyourself)'
      then return jsonb_build_object('status','invalid_name'); end if;
    perform player_id from retriever_camp.players where player_id=mine for update;
    if (select count(*) from retriever_camp.private_members where player_id=mine) >= 5
      then return jsonb_build_object('status','limit'); end if;
    insert into retriever_camp.private_camps (name,owner_id) values (clean,mine) returning * into group_row;
    insert into retriever_camp.private_members (camp_id,player_id) values (group_row.id,mine);
    return jsonb_build_object('status','ok','id',group_row.id);
  when 'camp_join' then
    if not retriever_camp.social_allow(mine,'invite_attempt',20,3600) then return jsonb_build_object('status','rate_limited'); end if;
    if p_value is null or p_value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then return jsonb_build_object('status','invalid_code'); end if;
    perform player_id from retriever_camp.players where player_id=mine for update;
    select * into group_row from retriever_camp.private_camps where invite=p_value::uuid for update;
    if not found then return jsonb_build_object('status','invalid_code'); end if;
    if exists(select 1 from retriever_camp.private_members where camp_id=group_row.id and player_id=mine)
      then return jsonb_build_object('status','ok','id',group_row.id); end if;
    if (select count(*) from retriever_camp.private_members where player_id=mine) >= 5 or
       (select count(*) from retriever_camp.private_members where camp_id=group_row.id) >= 32
      then return jsonb_build_object('status','limit'); end if;
    insert into retriever_camp.private_members (camp_id,player_id) values (group_row.id,mine);
    insert into retriever_camp.verified_honors (player_id,id) values (mine,'camp-private-camp') on conflict do nothing;
    return jsonb_build_object('status','ok','id',group_row.id);
  when 'camp_detail' then
    select c.* into group_row from retriever_camp.private_members m
      join retriever_camp.private_camps c on c.id=m.camp_id where m.player_id=mine and c.id=p_camp;
    if not found then return jsonb_build_object('status','not_found'); end if;
    select coalesce(jsonb_agg(jsonb_build_object('key',m.member_key,'nickname',p.nickname,
      'owner',m.player_id=group_row.owner_id,'self',m.player_id=mine) order by p.nickname),'[]'::jsonb) into rows
    from retriever_camp.private_members m join retriever_camp.players p on p.player_id=m.player_id where m.camp_id=p_camp;
    return jsonb_build_object('status','ok','name',group_row.name,'owner',mine=group_row.owner_id,
      'invite',case when mine=group_row.owner_id then group_row.invite end,'rows',rows);
  else
    if p_action not in ('camp_rotate','camp_leave','camp_remove','camp_transfer','camp_delete') or p_action is null
      then return jsonb_build_object('status','invalid_action'); end if;
    select c.* into group_row from retriever_camp.private_members m
      join retriever_camp.private_camps c on c.id=m.camp_id where m.player_id=mine and c.id=p_camp for update of c;
    if not found then return jsonb_build_object('status','not_found'); end if;
    if p_action='camp_leave' then
      if mine=group_row.owner_id then return jsonb_build_object('status','owner_must_transfer'); end if;
      delete from retriever_camp.private_members where camp_id=p_camp and player_id=mine;
    elsif mine <> group_row.owner_id then return jsonb_build_object('status','not_found');
    elsif p_action='camp_rotate' then
      if not retriever_camp.social_allow(mine,'rotate',12,3600) then return jsonb_build_object('status','rate_limited'); end if;
      update retriever_camp.private_camps set invite=gen_random_uuid() where id=p_camp returning invite into code;
      return jsonb_build_object('status','ok','invite',code);
    elsif p_action='camp_delete' then
      delete from retriever_camp.private_camps where id=p_camp;
    else
      select player_id into other from retriever_camp.private_members where camp_id=p_camp and member_key=p_target;
      if other is null or other=mine then return jsonb_build_object('status','not_found'); end if;
      if p_action='camp_transfer' then update retriever_camp.private_camps set owner_id=other where id=p_camp;
      else delete from retriever_camp.private_members where camp_id=p_camp and player_id=other; end if;
    end if;
  end case;
  return jsonb_build_object('status','ok');
end $$;

create function public.rr_camp_erase(p_confirm text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare mine uuid := retriever_camp.caller();
begin
  if mine is null then return jsonb_build_object('status','auth_required'); end if;
  if p_confirm is distinct from 'DELETE MY CAMP PROFILE' then return jsonb_build_object('status','confirmation_required'); end if;
  delete from retriever_camp.players where player_id=mine;
  return jsonb_build_object('status','ok');
end $$;

revoke all on function public.rr_camp_social(text,uuid,text,uuid),public.rr_camp_erase(text) from public, anon, authenticated;
grant execute on function public.rr_camp_social(text,uuid,text,uuid),public.rr_camp_erase(text) to authenticated;

-- 202611250003_ranked_board.sql
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

-- 202611260001_worldwide_rank_summary.sql
create or replace function public.rr_ranked_board(p_metric text,p_offset integer default 0,p_scope text default 'worldwide',p_camp uuid default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  mine_id uuid := retriever_camp.caller();
  settings retriever_camp.ranked_control;
  my_best retriever_camp.ranked_bests;
  mine jsonb;
  rivals jsonb := '[]'::jsonb;
  result jsonb;
  ordinal integer;
  population bigint;
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
  if p_scope='worldwide' and skip=0 then
    select count(*) into population from retriever_camp.ranked_bests
      where season=settings.season and metric=p_metric;
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
    'mine',mine,'rivals',rivals,'as_of',statement_timestamp(),'total_ranked',population,
    'percentile',case when population > 1 and ordinal is not null
      then round((population - ordinal) * 100.0 / (population - 1),1) end,
    'rows',coalesce(jsonb_agg(to_jsonb(numbered) order by rank) filter(where rank <= skip+25),'[]'::jsonb),
    'has_more',skip<75 and count(*)>25) into result from numbered;
  return result;
end $$;

notify pgrst, 'reload schema';
commit;
