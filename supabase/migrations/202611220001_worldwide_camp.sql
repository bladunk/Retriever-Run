begin;

create schema retriever_camp;
revoke all on schema retriever_camp from public, anon, authenticated;

create table retriever_camp.players (
  player_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null check (char_length(nickname) between 3 and 20),
  renamed_at timestamptz not null,
  score integer not null default 0,
  distance integer not null default 0,
  retrieves integer not null default 0,
  score_at timestamptz,
  distance_at timestamptz,
  retrieves_at timestamptz
);
create unique index rr_camp_nickname_key on retriever_camp.players (lower(nickname));
create index rr_camp_score_idx on retriever_camp.players (score desc, score_at, player_id) where score_at is not null;
create index rr_camp_distance_idx on retriever_camp.players (distance desc, distance_at, player_id) where score_at is not null;
create index rr_camp_retrieves_idx on retriever_camp.players (retrieves desc, retrieves_at, player_id) where score_at is not null;

-- Keep a narrow receipt rather than a public list of every run.
create table retriever_camp.receipts (
  run_id uuid primary key,
  player_id uuid not null references retriever_camp.players(player_id) on delete cascade,
  submitted_at timestamptz not null
);
create index rr_camp_receipts_rate_idx on retriever_camp.receipts (player_id, submitted_at desc);

alter table retriever_camp.players enable row level security;
alter table retriever_camp.receipts enable row level security;
revoke all on all tables in schema retriever_camp from public, anon, authenticated;

create function retriever_camp.caller() returns uuid
language sql stable set search_path = ''
as $$
  select case when auth.jwt() ->> 'is_anonymous' = 'true' then auth.uid() end
$$;

create function public.rr_camp_nickname(p_nickname text) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := retriever_camp.caller();
  clean text;
  folded text;
  old retriever_camp.players%rowtype;
  stamp timestamptz := statement_timestamp();
begin
  if caller_id is null then return jsonb_build_object('status', 'auth_required'); end if;
  if p_nickname is null or length(p_nickname) > 80 then
    return jsonb_build_object('status', 'invalid_name');
  end if;
  clean := btrim(regexp_replace(p_nickname, '[[:space:]]+', ' ', 'g'));
  if clean !~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,18}[A-Za-z0-9]$' then
    return jsonb_build_object('status', 'invalid_name');
  end if;
  folded := regexp_replace(translate(lower(clean), '013457', 'oieast'), '[^a-z]', '', 'g');
  if folded ~ '(fuck|shit|bitch|cunt|nigger|faggot|whore|nazi|killyourself)'
      or folded in ('admin', 'administrator', 'moderator', 'staff', 'system', 'official', 'retrieverrun', 'supabase', 'github') then
    return jsonb_build_object('status', 'invalid_name');
  end if;

  -- Serialize the first claim, renames, and retries for this identity.
  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 412096));
  select * into old from retriever_camp.players where player_id = caller_id;
  if old.nickname = clean then
    return jsonb_build_object('status', 'ok', 'nickname', old.nickname);
  end if;
  if old.renamed_at > stamp - interval '1 hour' then
    return jsonb_build_object('status', 'rename_wait');
  end if;
  begin
    insert into retriever_camp.players as player (player_id, nickname, renamed_at)
    values (caller_id, clean, stamp)
    on conflict (player_id) do update set nickname = excluded.nickname, renamed_at = excluded.renamed_at;
  exception when unique_violation then
    return jsonb_build_object('status', 'name_taken');
  end;
  return jsonb_build_object('status', 'ok', 'nickname', clean);
end
$$;

create function public.rr_camp_submit(
  p_run_id uuid, p_score integer, p_distance integer, p_retrieves integer, p_duration_ms integer
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  caller_id uuid := retriever_camp.caller();
  stamp timestamptz := statement_timestamp();
  length_seconds numeric := p_duration_ms / 1000.0;
  records retriever_camp.players%rowtype;
  receipt_owner uuid;
begin
  if caller_id is null then return jsonb_build_object('status', 'auth_required'); end if;
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

  -- Lock the player's row before the receipt/rate checks and personal best update.
  select * into records from retriever_camp.players where player_id = caller_id for update;
  if not found then return jsonb_build_object('status', 'profile_required'); end if;
  select player_id into receipt_owner from retriever_camp.receipts where run_id = p_run_id;
  if receipt_owner is null then
    if (select count(*) from retriever_camp.receipts
        where player_id = caller_id and submitted_at > stamp - interval '1 minute') >= 12 then
      return jsonb_build_object('status', 'rate_limited');
    end if;

    insert into retriever_camp.receipts (run_id, player_id, submitted_at)
    values (p_run_id, caller_id, stamp) on conflict (run_id) do nothing;
    if found then
      update retriever_camp.players set
        score_at = case when score_at is null or p_score > score then stamp else score_at end,
        distance_at = case when distance_at is null or p_distance > distance then stamp else distance_at end,
        retrieves_at = case when retrieves_at is null or p_retrieves > retrieves then stamp else retrieves_at end,
        score = greatest(score, p_score),
        distance = greatest(distance, p_distance),
        retrieves = greatest(retrieves, p_retrieves)
      where player_id = caller_id returning * into records;
      return jsonb_build_object('status', 'ok', 'score', records.score,
        'distance', records.distance, 'retrieves', records.retrieves);
    end if;
    select player_id into receipt_owner from retriever_camp.receipts where run_id = p_run_id;
  end if;
  if receipt_owner is distinct from caller_id then return jsonb_build_object('status', 'invalid_run'); end if;
  return jsonb_build_object('status', 'duplicate', 'score', records.score,
    'distance', records.distance, 'retrieves', records.retrieves);
end
$$;

create function public.rr_camp_board(p_metric text, p_offset integer default 0, p_limit integer default 25)
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
         from retriever_camp.players where score_at is not null
         order by %1$I desc, %2$I, player_id offset $1 limit $2
       ) page
     ) rows', p_metric, stamp_column) into page_rows using start_at, page_size + (start_at + page_size < 100)::integer;
  if caller_id is not null then
    execute format(
      'select jsonb_build_object(
         ''rank'', 1 + (select count(*) from retriever_camp.players a where a.score_at is not null
           and (-a.%1$I, a.%2$I, a.player_id) < (-p.%1$I, p.%2$I, p.player_id)),
         ''nickname'', p.nickname, ''score'', p.score, ''distance'', p.distance,
         ''retrieves'', p.retrieves, ''recorded_at'', p.%2$I)
       from retriever_camp.players p where p.player_id = $1 and p.score_at is not null',
      p_metric, stamp_column) into own_row using caller_id;
  end if;
  return jsonb_build_object('status', 'ok', 'rows', page_rows - page_size, 'mine', own_row,
    'has_more', jsonb_array_length(page_rows) > page_size);
end
$$;

revoke all on function public.rr_camp_nickname(text) from public, anon, authenticated;
revoke all on function public.rr_camp_submit(uuid, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.rr_camp_board(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rr_camp_nickname(text) to authenticated;
grant execute on function public.rr_camp_submit(uuid, integer, integer, integer, integer) to authenticated;
grant execute on function public.rr_camp_board(text, integer, integer) to anon, authenticated;

commit;
