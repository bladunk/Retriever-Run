begin;

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
commit;
