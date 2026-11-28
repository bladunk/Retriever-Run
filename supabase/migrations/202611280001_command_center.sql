begin;

create schema rr_support;
revoke all on schema rr_support from public, anon, authenticated;

create table rr_support.control (
  singleton boolean primary key check (singleton),
  accepting boolean not null default false
);
insert into rr_support.control(singleton) values (true);
alter table rr_support.control enable row level security;

create table rr_support.developers (
  user_id uuid primary key references auth.users(id) on delete cascade
);
create table rr_support.reports (
  id uuid primary key,
  receipt_hash bytea not null,
  created_at timestamptz not null default now(),
  kind text not null check (kind in ('bug','suggestion','note','unfair')),
  subject text not null,
  message text not null,
  topic text not null,
  version text not null,
  build text not null,
  updates boolean not null,
  diagnostics jsonb,
  screenshot bytea,
  state text not null default 'new',
  state_history jsonb not null default '[]'::jsonb,
  severity text not null default 'unclassified',
  classification text not null default 'unreviewed',
  developer_note text not null default '',
  issue text not null default '',
  changed_at timestamptz not null default now()
);
create index reports_recent on rr_support.reports(created_at desc, id);
create table rr_support.submissions (
  actor uuid not null,
  sent_at timestamptz not null default now()
);
create index submissions_time on rr_support.submissions(sent_at);
create index submissions_actor_time on rr_support.submissions(actor,sent_at);
alter table rr_support.submissions enable row level security;
alter table rr_support.developers enable row level security;
alter table rr_support.reports enable row level security;
revoke all on all tables in schema rr_support from public, anon, authenticated;

create function rr_support.authorized() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((auth.jwt() ->> 'is_anonymous') = 'false', false)
    and exists (select 1 from rr_support.developers where user_id = auth.uid());
$$;

-- Validate the bounded header before accepting an image. The browser
-- re-encodes the pixels. This keeps executable/non-JPEG types and large
-- decoded dimensions out of the private viewer even for direct API calls.
create function rr_support.jpeg_supported(data bytea) returns boolean
language plpgsql immutable set search_path = '' as $$
declare
  n integer := octet_length(data);
  cursor_at integer := 2;
  marker integer;
  span integer;
  have_frame boolean := false;
begin
  if n not between 64 and 196608 or substr(data,1,2) <> decode('ffd8','hex')
    or substr(data,n-1,2) <> decode('ffd9','hex') then return false; end if;
  while cursor_at+4<n loop
    if get_byte(data,cursor_at)<>255 then return false; end if;
    cursor_at := cursor_at+1;
    while cursor_at<n and get_byte(data,cursor_at)=255 loop cursor_at := cursor_at+1; end loop;
    if cursor_at+2>=n then return false; end if;
    marker := get_byte(data,cursor_at);
    cursor_at := cursor_at+1;
    span := get_byte(data,cursor_at)*256 + get_byte(data,cursor_at+1);
    if span<2 or cursor_at+span>=n then return false; end if;
    if marker in (192,193,194) then
      if span<8 or get_byte(data,cursor_at+2)<>8
        or get_byte(data,cursor_at+3)*256+get_byte(data,cursor_at+4) not between 1 and 800
        or get_byte(data,cursor_at+5)*256+get_byte(data,cursor_at+6) not between 1 and 800
        then return false; end if;
      have_frame := true;
    elsif marker=218 then
      return have_frame and span>=6 and cursor_at+span<n-2;
    end if;
    cursor_at := cursor_at+span;
  end loop;
  return false;
end;
$$;

create function public.rr_support_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('status',case when accepting then 'ok' else 'closed' end)
    from rr_support.control where singleton;
$$;

create function public.rr_support_submit(p_record jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  report_id uuid;
  proof bytea;
  image bytea;
  details jsonb;
  reference text;
  key text;
begin
  if caller is null then return jsonb_build_object('status','denied'); end if;
  if not coalesce((select accepting from rr_support.control where singleton),false)
    then return jsonb_build_object('status','closed'); end if;
  if jsonb_typeof(p_record) is distinct from 'object' or octet_length(p_record::text) > 290000
    then return jsonb_build_object('status','invalid'); end if;
  if p_record - array['id','secret','kind','subject','message','topic','version','build','updates','diagnostics','screenshot'] <> '{}'::jsonb
    or coalesce(p_record->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or coalesce(p_record->>'secret','') !~ '^[0-9a-f]{64}$'
    or coalesce(p_record->>'kind','') not in ('bug','suggestion','note','unfair')
    or coalesce(p_record->>'version','') !~ '^[A-Za-z0-9.-]{1,48}$'
    or coalesce(p_record->>'build','') !~ '^[A-Za-z0-9.-]{1,48}$'
    or jsonb_typeof(p_record->'updates') is distinct from 'boolean'
    then return jsonb_build_object('status','invalid'); end if;
  foreach key in array array['subject','message','topic'] loop
    if jsonb_typeof(p_record->key) is distinct from 'string' then return jsonb_build_object('status','invalid'); end if;
  end loop;
  if length(p_record->>'subject') > 120 or length(p_record->>'message') > 2000
    or length(p_record->>'topic') > 80 or btrim(concat(p_record->>'subject',p_record->>'message',p_record->>'topic')) = ''
    then return jsonb_build_object('status','invalid'); end if;

  details := p_record->'diagnostics';
  if details is not null and (jsonb_typeof(details) is distinct from 'object' or octet_length(details::text) > 12000
    or details - array['graphics','timing','incident','performance'] <> '{}'::jsonb)
    then return jsonb_build_object('status','invalid'); end if;
  if p_record ? 'screenshot' then
    if jsonb_typeof(p_record->'screenshot') is distinct from 'string'
      or length(p_record->>'screenshot') > 262144 or (p_record->>'screenshot') !~ '^/9j/[A-Za-z0-9+/]+={0,2}$'
      then return jsonb_build_object('status','invalid'); end if;
    begin image := decode(p_record->>'screenshot','base64');
    exception when invalid_parameter_value or data_exception then return jsonb_build_object('status','invalid'); end;
    if not rr_support.jpeg_supported(image)
      then return jsonb_build_object('status','invalid'); end if;
  end if;

  report_id := (p_record->>'id')::uuid;
  reference := upper(left(report_id::text, 8));
  proof := sha256(convert_to(p_record->>'secret','UTF8'));
  perform pg_advisory_xact_lock(192911,11);
  if exists (select 1 from rr_support.reports where id=report_id and receipt_hash=proof)
    then return jsonb_build_object('status','ok','reference',reference); end if;
  if exists (select 1 from rr_support.reports where id=report_id)
    then return jsonb_build_object('status','invalid'); end if;
  delete from rr_support.submissions where sent_at <= now()-interval '1 day';
  if (select count(*) from rr_support.submissions where actor=caller and sent_at > now()-interval '1 hour') >= 3
    or (select count(*) from rr_support.submissions where actor=caller and sent_at > now()-interval '1 day') >= 10
    or (select count(*) from rr_support.submissions where sent_at > now()-interval '1 hour') >= 100
    or (select count(*) from rr_support.reports) >= 10000
    or (image is not null and (select count(*) from rr_support.reports where screenshot is not null) >= 1000)
    then return jsonb_build_object('status','rate_limited'); end if;
  insert into rr_support.submissions(actor) values (caller);
  insert into rr_support.reports(id,receipt_hash,kind,subject,message,topic,version,build,updates,diagnostics,screenshot)
  values (report_id,proof,p_record->>'kind',p_record->>'subject',p_record->>'message',p_record->>'topic',
    p_record->>'version',p_record->>'build',(p_record->>'updates')::boolean,details,image);
  return jsonb_build_object('status','ok','reference',reference);
end;
$$;

create function public.rr_support_receipt(p_id uuid, p_secret text, p_action text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  proof bytea;
  available boolean;
begin
  if coalesce(p_secret,'') !~ '^[0-9a-f]{64}$' then return jsonb_build_object('status','unknown'); end if;
  proof := sha256(convert_to(p_secret,'UTF8'));
  if p_action='delete' then
    delete from rr_support.reports where id=p_id and receipt_hash=proof;
    if found then return jsonb_build_object('status','deleted'); end if;
  elsif p_action='status' then
    select updates and state='verified' into available from rr_support.reports where id=p_id and receipt_hash=proof;
    if found then return jsonb_build_object('status',case when available then 'verified' else 'received' end); end if;
  end if;
  return jsonb_build_object('status','unknown');
end;
$$;

create function public.rr_support_inbox(p_filters jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  rows jsonb;
  start_at integer;
begin
  if not rr_support.authorized() then return jsonb_build_object('status','denied'); end if;
  start_at := case when p_filters->>'offset' ~ '^[0-9]{1,5}$' then least(10000,(p_filters->>'offset')::integer) else 0 end;
  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb) into rows from (
    select id, created_at, kind, subject, topic, version, build, state, severity, classification, issue,
      diagnostics is not null as has_diagnostics, screenshot is not null as has_screenshot,
      diagnostics->'incident'->>'territory' as territory,
      case when jsonb_typeof(diagnostics#>'{timing,averageMs}')='number'
        then diagnostics#>'{timing,averageMs}' else null end as timing_average_ms
    from rr_support.reports
    where (coalesce(p_filters->>'kind','')='' or kind=p_filters->>'kind')
      and (coalesce(p_filters->>'state','')='' or state=p_filters->>'state')
      and (coalesce(p_filters->>'version','')='' or version=p_filters->>'version')
      and (coalesce(p_filters->>'severity','')='' or severity=p_filters->>'severity')
      and (coalesce(p_filters->>'query','')='' or strpos(lower(concat_ws(' ',subject,message,topic,issue,id::text)),
        lower(left(p_filters->>'query',120)))>0)
    order by created_at desc, id limit 26 offset start_at
  ) r;
  return jsonb_build_object('status','ok','reports',rows);
end;
$$;

create function public.rr_support_detail(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  data jsonb;
begin
  if not rr_support.authorized() then return jsonb_build_object('status','denied'); end if;
  select (to_jsonb(r) - array['receipt_hash','screenshot']) ||
    jsonb_build_object('screenshot',replace(encode(screenshot,'base64'),chr(10),''))
    into data from rr_support.reports r where id=p_id;
  if not found then return jsonb_build_object('status','unknown'); end if;
  return jsonb_build_object('status','ok','report',data);
end;
$$;

create function public.rr_support_triage(p_id uuid,p_change jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not rr_support.authorized() then return jsonb_build_object('status','denied'); end if;
  if coalesce(p_change->>'state','') not in ('new','review','reproduce','confirmed','development','fix_review',
      'released','verified','duplicate','archived')
    or coalesce(p_change->>'severity','') not in ('unclassified','critical','high','medium','low','suggestion')
    or coalesce(p_change->>'classification','unreviewed') not in ('unreviewed','valid_failure','possible_input',
      'possible_visibility','possible_collision','possible_generation','possible_performance','confirmed_defect','insufficient')
    or length(coalesce(p_change->>'developer_note',''))>4000
    or coalesce(p_change->>'issue','') !~ '^[a-zA-Z0-9#._/-]{0,100}$'
    then return jsonb_build_object('status','invalid'); end if;
  update rr_support.reports set state=p_change->>'state', severity=p_change->>'severity',
    state_history=case when state=p_change->>'state' then state_history
      else (case when jsonb_array_length(state_history)>=20 then state_history-0 else state_history end)
        || jsonb_build_object('from',state,'to',p_change->>'state','at',now()) end,
    classification=coalesce(p_change->>'classification','unreviewed'),
    developer_note=coalesce(p_change->>'developer_note',''), issue=coalesce(p_change->>'issue',''), changed_at=now()
    where id=p_id;
  return jsonb_build_object('status',case when found then 'ok' else 'unknown' end);
end;
$$;

create function public.rr_support_owner_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not rr_support.authorized() then return jsonb_build_object('status','denied'); end if;
  delete from rr_support.reports where id=p_id;
  return jsonb_build_object('status',case when found then 'deleted' else 'unknown' end);
end;
$$;

-- Call from the SQL editor on the owner's approved retention schedule.
create function rr_support.prune() returns void language plpgsql set search_path = '' as $$
begin
  delete from rr_support.submissions where sent_at <= now()-interval '1 day';
  update rr_support.reports set screenshot=null, diagnostics=null
    where created_at < now()-interval '30 days' and (screenshot is not null or diagnostics is not null);
  delete from rr_support.reports where created_at < now()-interval '180 days'
    or (state in ('verified','archived') and changed_at < now()-interval '60 days');
end;
$$;

revoke all on all functions in schema rr_support from public, anon, authenticated;
revoke all on function public.rr_support_status(), public.rr_support_submit(jsonb), public.rr_support_receipt(uuid,text,text),
  public.rr_support_inbox(jsonb), public.rr_support_detail(uuid), public.rr_support_triage(uuid,jsonb),
  public.rr_support_owner_delete(uuid) from public, anon, authenticated;
grant execute on function public.rr_support_submit(jsonb), public.rr_support_inbox(jsonb),
  public.rr_support_detail(uuid), public.rr_support_triage(uuid,jsonb), public.rr_support_owner_delete(uuid) to authenticated;
grant execute on function public.rr_support_status(), public.rr_support_receipt(uuid,text,text) to anon, authenticated;

commit;
