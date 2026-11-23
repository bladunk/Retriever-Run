begin;

-- Installation alone leaves both the deployed game and rankings in Preseason.
create table retriever_camp.season_control (
  singleton boolean primary key default true check (singleton),
  active text not null default 'preseason' check (active in ('preseason', 'season-one')),
  generation bigint not null default 0 check (generation >= 0)
);
insert into retriever_camp.season_control default values;

create function retriever_camp.advance_season_generation() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.active is distinct from old.active then new.generation := old.generation + 1; end if;
  return new;
end
$$;
create trigger rr_camp_new_generation before update of active on retriever_camp.season_control
  for each row execute function retriever_camp.advance_season_generation();
revoke all on function retriever_camp.advance_season_generation() from public, anon, authenticated;

create table retriever_camp.season_one_records (
  player_id uuid primary key references retriever_camp.players(player_id) on delete cascade,
  score integer not null,
  distance integer not null,
  retrieves integer not null,
  score_at timestamptz not null,
  distance_at timestamptz not null,
  retrieves_at timestamptz not null
);
create index rr_season_one_score_idx on retriever_camp.season_one_records (score desc, score_at, player_id);
create index rr_season_one_distance_idx on retriever_camp.season_one_records (distance desc, distance_at, player_id);
create index rr_season_one_retrieves_idx on retriever_camp.season_one_records (retrieves desc, retrieves_at, player_id);

create view retriever_camp.season_one_rankings as
  select r.*, p.nickname from retriever_camp.season_one_records r
  join retriever_camp.players p using (player_id);

create table retriever_camp.season_one_tickets (
  run_id uuid primary key default gen_random_uuid(),
  player_id uuid not null references retriever_camp.players(player_id) on delete cascade,
  generation bigint not null,
  issued_at timestamptz not null,
  submitted_at timestamptz
);
create index rr_season_one_ticket_player_idx on retriever_camp.season_one_tickets (player_id, issued_at desc);
create index rr_season_one_submitted_idx on retriever_camp.season_one_tickets (player_id, submitted_at desc)
  where submitted_at is not null;

alter table retriever_camp.season_control enable row level security;
alter table retriever_camp.season_one_records enable row level security;
alter table retriever_camp.season_one_tickets enable row level security;
revoke all on all tables in schema retriever_camp from public, anon, authenticated;

-- Preserve the deployed code and records as a rollback path and Preseason archive.
alter function public.rr_camp_submit(uuid, integer, integer, integer, integer) set schema retriever_camp;
alter function public.rr_camp_board(text, integer, integer) set schema retriever_camp;
alter function public.rr_camp_rival(text, text, timestamptz) set schema retriever_camp;
revoke all on function retriever_camp.rr_camp_submit(uuid, integer, integer, integer, integer),
  retriever_camp.rr_camp_board(text, integer, integer), retriever_camp.rr_camp_rival(text, text, timestamptz)
  from public, anon, authenticated;

create function public.rr_camp_season() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('status', 'ok', 'season', active, 'generation', generation)
  from retriever_camp.season_control where singleton
$$;

create function public.rr_camp_start_run() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := retriever_camp.caller();
  state retriever_camp.season_control%rowtype;
  ticket_id uuid;
  stamp timestamptz := statement_timestamp();
begin
  if caller_id is null then return jsonb_build_object('status', 'auth_required'); end if;
  select * into strict state from retriever_camp.season_control where singleton for share;
  if state.active = 'preseason' then return jsonb_build_object('status', 'ok', 'season', state.active, 'generation', state.generation); end if;

  perform 1 from retriever_camp.players where player_id = caller_id for update;
  if not found then return jsonb_build_object('status', 'profile_required', 'season', state.active, 'generation', state.generation); end if;
  if (select count(*) from retriever_camp.season_one_tickets
      where player_id = caller_id and issued_at > stamp - interval '1 minute') >= 16
      or (select count(*) from retriever_camp.season_one_tickets
      where player_id = caller_id and issued_at > stamp - interval '24 hours') >= 480 then
    return jsonb_build_object('status', 'rate_limited', 'season', state.active, 'generation', state.generation);
  end if;
  insert into retriever_camp.season_one_tickets (player_id, generation, issued_at)
  values (caller_id, state.generation, stamp) returning run_id into ticket_id;
  return jsonb_build_object('status', 'ok', 'season', state.active, 'generation', state.generation, 'run_id', ticket_id);
end
$$;

create function public.rr_camp_submit(
  p_run_id uuid, p_score integer, p_distance integer, p_retrieves integer, p_duration_ms integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  caller_id uuid := retriever_camp.caller();
  state retriever_camp.season_control%rowtype;
  chosen retriever_camp.season_one_tickets%rowtype;
  records retriever_camp.season_one_records%rowtype;
  stamp timestamptz := statement_timestamp();
  length_seconds numeric := p_duration_ms / 1000.0;
begin
  if caller_id is null then return jsonb_build_object('status', 'auth_required'); end if;
  -- Serializes writes with the owner-operated switch, including queued 5.0 clients.
  select * into strict state from retriever_camp.season_control where singleton for share;
  if state.active = 'preseason' then
    if exists (select from retriever_camp.season_one_tickets where run_id = p_run_id) then
      return jsonb_build_object('status', 'season_changed', 'season', state.active, 'generation', state.generation);
    end if;
    return retriever_camp.rr_camp_submit(p_run_id, p_score, p_distance, p_retrieves, p_duration_ms)
      || jsonb_build_object('season', state.active, 'generation', state.generation);
  end if;
  if p_run_id is null or p_run_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or p_score is null or p_distance is null or p_retrieves is null or p_duration_ms is null
      or p_duration_ms not between 2000 and 14400000
      or p_distance < 11 * length_seconds - 2
      or p_distance > least(29 * length_seconds, 11 * length_seconds + .14 * length_seconds ^ 2) + 2
      or p_retrieves < 0 or p_retrieves > floor(length_seconds / .85) + 1
      or p_score < p_distance + p_retrieves::bigint * 75
      or p_score > p_distance + 450 * ceil(length_seconds) + 350
      or (p_score::bigint - p_distance) % 5 <> 0 then
    return jsonb_build_object('status', 'invalid_run');
  end if;


  perform 1 from retriever_camp.players where player_id = caller_id for update;
  if not found then return jsonb_build_object('status', 'profile_required', 'season', state.active, 'generation', state.generation); end if;

  if exists(select from retriever_camp.receipts where run_id = p_run_id) then
    return jsonb_build_object('status', 'season_changed', 'season', state.active, 'generation', state.generation);
  end if;
  select * into chosen from retriever_camp.season_one_tickets where run_id = p_run_id and player_id = caller_id;
  if not found then return jsonb_build_object('status', 'season_changed', 'season', state.active, 'generation', state.generation); end if;
  if chosen.submitted_at is not null then
    select * into strict records from retriever_camp.season_one_records where player_id = caller_id;
    return jsonb_build_object('status', 'duplicate', 'season', state.active, 'generation', state.generation, 'score', records.score,
      'distance', records.distance, 'retrieves', records.retrieves);
  end if;
  if chosen.generation <> state.generation or chosen.issued_at < stamp - interval '72 hours' then
    return jsonb_build_object('status', 'season_changed', 'season', state.active, 'generation', state.generation);
  end if;
  -- The ticket is acquired as play begins. Allow the transport's latency, but
  -- do not accept a long run from a ticket just issued.
  if stamp + interval '7 seconds' < chosen.issued_at + p_duration_ms * interval '1 millisecond' then
    return jsonb_build_object('status', 'invalid_run', 'season', state.active, 'generation', state.generation);
  end if;
  if (select count(*) from retriever_camp.season_one_tickets where player_id = caller_id
       and submitted_at > stamp - interval '1 minute') >= 12 then
    return jsonb_build_object('status', 'rate_limited', 'season', state.active, 'generation', state.generation);
  end if;

  update retriever_camp.season_one_tickets set submitted_at = stamp where run_id = p_run_id;
  insert into retriever_camp.season_one_records as stored
    (player_id, score, distance, retrieves, score_at, distance_at, retrieves_at)
    values (caller_id, p_score, p_distance, p_retrieves, stamp, stamp, stamp)
  on conflict (player_id) do update set
    score_at = case when excluded.score > stored.score then stamp else stored.score_at end,
    distance_at = case when excluded.distance > stored.distance then stamp else stored.distance_at end,
    retrieves_at = case when excluded.retrieves > stored.retrieves then stamp else stored.retrieves_at end,
    score = greatest(stored.score, excluded.score),
    distance = greatest(stored.distance, excluded.distance),
    retrieves = greatest(stored.retrieves, excluded.retrieves)
  returning * into records;
  return jsonb_build_object('status', 'ok', 'season', state.active, 'generation', state.generation, 'score', records.score,
    'distance', records.distance, 'retrieves', records.retrieves);
end
$$;

create function retriever_camp.season_one_board(p_metric text, p_offset integer default 0, p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  caller_id uuid := retriever_camp.caller();
  start_at integer := greatest(0, least(100, coalesce(p_offset, 0)));
  page_size integer := least(100 - start_at, greatest(1, least(25, coalesce(p_limit, 25))));
  stamp_column text;
  page_rows jsonb;
  own_row jsonb;
begin
  if p_metric is null or p_metric not in ('score', 'distance', 'retrieves') then
    return jsonb_build_object('status', 'invalid_metric');
  end if;
  stamp_column := p_metric || '_at';
  -- Identifiers come exclusively from the allowlist above. Caller values are bound.
  execute format(
    'select coalesce(jsonb_agg(to_jsonb(rows) order by rows.rank), ''[]''::jsonb)
     from (
       select ($1 + row_number() over (order by %1$I desc, %2$I, player_id)) as rank,
         nickname, score, distance, retrieves, %2$I as recorded_at
       from (
         select player_id, nickname, score, distance, retrieves, %2$I
         from retriever_camp.season_one_rankings where score_at is not null
         order by %1$I desc, %2$I, player_id offset $1 limit $2
       ) page
     ) rows', p_metric, stamp_column) into page_rows using start_at, page_size + (start_at + page_size < 100)::integer;
  if caller_id is not null then
    execute format(
      'select jsonb_build_object(
         ''rank'', 1 + (select count(*) from retriever_camp.season_one_rankings a where a.score_at is not null
           and (-a.%1$I, a.%2$I, a.player_id) < (-p.%1$I, p.%2$I, p.player_id)),
         ''nickname'', p.nickname, ''score'', p.score, ''distance'', p.distance,
         ''retrieves'', p.retrieves, ''recorded_at'', p.%2$I)
       from retriever_camp.season_one_rankings p where p.player_id = $1 and p.score_at is not null',
      p_metric, stamp_column) into own_row using caller_id;
  end if;
  return jsonb_build_object('status', 'ok', 'rows', page_rows - page_size, 'mine', own_row,
    'has_more', jsonb_array_length(page_rows) > page_size);
end
$$;

create function retriever_camp.season_one_rival(p_metric text, p_compare_name text default null,
  p_compare_at timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  caller_id uuid := retriever_camp.caller();
  stamp_column text;
  mine jsonb;
  rival jsonb;
  ahead bigint;
  my_value integer;
  my_stamp timestamptz;
  passed boolean;
begin
  if caller_id is null then return jsonb_build_object('status', 'auth_required'); end if;
  if p_metric is null or p_metric not in ('score', 'distance', 'retrieves') then
    return jsonb_build_object('status', 'invalid_metric');
  end if;
  stamp_column := p_metric || '_at';
  execute format('select jsonb_build_object(''nickname'', nickname, ''score'', score,
      ''distance'', distance, ''retrieves'', retrieves, ''recorded_at'', %2$I), %1$I, %2$I
    from retriever_camp.season_one_rankings where player_id = $1 and score_at is not null',
    p_metric, stamp_column) into mine, my_value, my_stamp using caller_id;
  if mine is null then return jsonb_build_object('status', 'ok', 'mine', null, 'rival', null, 'passed', null); end if;

  execute format(
    'select (select count(*) from retriever_camp.season_one_rankings where score_at is not null and %1$I > $1)
          + (select count(*) from retriever_camp.season_one_rankings where score_at is not null and %1$I = $1
            and (%2$I, player_id) < ($2, $3))', p_metric, stamp_column)
    into ahead using my_value, my_stamp, caller_id;
  if ahead > 0 then
    -- Check tied scores first. Only if there are none, seek the smallest
    -- higher score and use its last timestamp and stable identity.
    execute format(
      'select jsonb_build_object(''nickname'', nickname, ''score'', score,
        ''distance'', distance, ''retrieves'', retrieves, ''recorded_at'', %2$I)
       from retriever_camp.season_one_rankings where score_at is not null and %1$I = $1
         and (%2$I, player_id) < ($2, $3)
       order by %2$I desc, player_id desc limit 1', p_metric, stamp_column)
      into rival using my_value, my_stamp, caller_id;
    if rival is null then
      execute format(
        'select jsonb_build_object(''nickname'', nickname, ''score'', score,
          ''distance'', distance, ''retrieves'', retrieves, ''recorded_at'', %2$I)
         from retriever_camp.season_one_rankings where score_at is not null and %1$I > $1
         order by %1$I asc, %2$I desc, player_id desc limit 1', p_metric, stamp_column)
        into rival using my_value;
    end if;
    rival := rival || jsonb_build_object('rank', ahead);
  end if;
  if p_compare_at is not null and p_compare_name is not null and length(p_compare_name) between 3 and 20 then
    execute format(
      'select ($1 > %1$I or ($1 = %1$I and ($2, $3) < (%2$I, player_id)))
       from retriever_camp.season_one_rankings where score_at is not null and lower(nickname) = lower($4)
         and %2$I = $5 and player_id <> $3', p_metric, stamp_column)
      into passed using my_value, my_stamp, caller_id, p_compare_name, p_compare_at;
  end if;
  return jsonb_build_object('status', 'ok', 'mine', mine || jsonb_build_object('rank', ahead + 1),
    'rival', rival, 'passed', passed);
end
$$;

create function public.rr_camp_board(p_metric text, p_offset integer default 0, p_limit integer default 25)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case active
    when 'season-one' then retriever_camp.season_one_board(p_metric, p_offset, p_limit)
    else retriever_camp.rr_camp_board(p_metric, p_offset, p_limit)
  end || jsonb_build_object('season', active, 'generation', generation)
  from retriever_camp.season_control where singleton
$$;

create function public.rr_camp_rival(p_metric text, p_compare_name text default null,
  p_compare_at timestamptz default null)
returns jsonb language sql stable security definer set search_path = '' as $$
  select case active
    when 'season-one' then retriever_camp.season_one_rival(p_metric, p_compare_name, p_compare_at)
    else retriever_camp.rr_camp_rival(p_metric, p_compare_name, p_compare_at)
  end || jsonb_build_object('season', active, 'generation', generation)
  from retriever_camp.season_control where singleton
$$;

revoke all on function retriever_camp.season_one_board(text, integer, integer),
  retriever_camp.season_one_rival(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.rr_camp_season(), public.rr_camp_start_run(),
  public.rr_camp_submit(uuid, integer, integer, integer, integer), public.rr_camp_board(text, integer, integer),
  public.rr_camp_rival(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.rr_camp_season(), public.rr_camp_board(text, integer, integer) to anon, authenticated;
grant execute on function public.rr_camp_start_run(), public.rr_camp_submit(uuid, integer, integer, integer, integer),
  public.rr_camp_rival(text, text, timestamptz) to authenticated;
notify pgrst, 'reload schema';

commit;
