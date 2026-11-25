begin;

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

commit;
