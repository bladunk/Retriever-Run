begin;

-- Uses the same ordering and indexed metrics as rr_camp_board. The optional
-- comparison is a public nickname and record timestamp from a previous card.
create function public.rr_camp_rival(p_metric text, p_compare_name text default null,
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
    from retriever_camp.players where player_id = $1 and score_at is not null',
    p_metric, stamp_column) into mine, my_value, my_stamp using caller_id;
  if mine is null then return jsonb_build_object('status', 'ok', 'mine', null, 'rival', null, 'passed', null); end if;

  execute format(
    'select (select count(*) from retriever_camp.players where score_at is not null and %1$I > $1)
          + (select count(*) from retriever_camp.players where score_at is not null and %1$I = $1
            and (%2$I, player_id) < ($2, $3))', p_metric, stamp_column)
    into ahead using my_value, my_stamp, caller_id;
  if ahead > 0 then
    -- Check tied scores first. Only if there are none, seek the smallest
    -- higher score and use its last timestamp and stable identity.
    execute format(
      'select jsonb_build_object(''nickname'', nickname, ''score'', score,
        ''distance'', distance, ''retrieves'', retrieves, ''recorded_at'', %2$I)
       from retriever_camp.players where score_at is not null and %1$I = $1
         and (%2$I, player_id) < ($2, $3)
       order by %2$I desc, player_id desc limit 1', p_metric, stamp_column)
      into rival using my_value, my_stamp, caller_id;
    if rival is null then
      execute format(
        'select jsonb_build_object(''nickname'', nickname, ''score'', score,
          ''distance'', distance, ''retrieves'', retrieves, ''recorded_at'', %2$I)
         from retriever_camp.players where score_at is not null and %1$I > $1
         order by %1$I asc, %2$I desc, player_id desc limit 1', p_metric, stamp_column)
        into rival using my_value;
    end if;
    rival := rival || jsonb_build_object('rank', ahead);
  end if;
  if p_compare_at is not null and p_compare_name is not null and length(p_compare_name) between 3 and 20 then
    execute format(
      'select ($1 > %1$I or ($1 = %1$I and ($2, $3) < (%2$I, player_id)))
       from retriever_camp.players where score_at is not null and lower(nickname) = lower($4)
         and %2$I = $5 and player_id <> $3', p_metric, stamp_column)
      into passed using my_value, my_stamp, caller_id, p_compare_name, p_compare_at;
  end if;
  return jsonb_build_object('status', 'ok', 'mine', mine || jsonb_build_object('rank', ahead + 1),
    'rival', rival, 'passed', passed);
end
$$;

revoke all on function public.rr_camp_rival(text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.rr_camp_rival(text, text, timestamptz) to authenticated;

commit;
