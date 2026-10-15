-- Additive create-only onboarding. Existing venue links and billing stay intact.
-- Rollback: revoke this RPC, retain created locations, membership and request IDs.
begin;

create table public.private_operating_location_requests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  workspace_id text not null unique references public.crm_workspaces(id) on delete restrict,
  requested_name text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, request_id)
);
alter table public.private_operating_location_requests enable row level security;
revoke all on public.private_operating_location_requests from public, anon, authenticated;

create function public.create_private_operating_location(p_request_id uuid, p_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_profile uuid := (select auth.uid());
  v_name text := btrim(p_name);
  v_previous public.private_operating_location_requests%rowtype;
  v_workspace text;
begin
  if v_profile is null or not exists (
    select 1 from auth.users u join public.profiles p on p.id=u.id
    where u.id=v_profile and u.email_confirmed_at is not null and u.deleted_at is null
  ) then
    raise exception 'verified account required' using errcode='42501';
  end if;
  if p_request_id is null or v_name is null or char_length(v_name) not between 2 and 120
    or v_name ~ '[[:cntrl:]]' then
    raise exception 'invalid location request' using errcode='22023';
  end if;
  -- Serialize retries for this caller/request only, never infer company identity.
  perform pg_advisory_xact_lock(hashtextextended(v_profile::text || ':' || p_request_id::text,0));
  select * into v_previous from public.private_operating_location_requests
    where profile_id=v_profile and request_id=p_request_id;
  if found then
    if v_previous.requested_name <> v_name then
      raise exception 'request already used with another name' using errcode='PT409';
    end if;
    if not exists (
      select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id
      where w.id=v_previous.workspace_id and w.owner_profile_id=v_profile
        and w.status in ('active','trial') and m.profile_id=v_profile
        and m.role='owner' and m.status='active'
    ) then
      raise exception 'location ownership no longer available' using errcode='42501';
    end if;
    return v_previous.workspace_id;
  end if;
  v_workspace := 'private-' || gen_random_uuid()::text;
  insert into public.crm_workspaces(id,name,slug,owner_profile_id,source_venue_id,plan,status,seat_limit)
    values(v_workspace,v_name,v_workspace,v_profile,null,'starter','active',4);
  insert into public.crm_workspace_members(workspace_id,profile_id,role,status)
    values(v_workspace,v_profile,'owner','active');
  insert into public.private_operating_location_requests(profile_id,request_id,workspace_id,requested_name)
    values(v_profile,p_request_id,v_workspace,v_name);
  -- Membership proves ownership, not a subscription or enabled operations tools.
  return v_workspace;
end;
$$;
revoke all on function public.create_private_operating_location(uuid,text) from public, anon;
grant execute on function public.create_private_operating_location(uuid,text) to authenticated;

-- Management metadata is free; this does not authorize operational table reads.
create function public.list_managed_operating_locations(p_limit integer default 50, p_offset integer default 0)
returns table(id text, name text, role text)
language plpgsql stable security definer set search_path = '' as $$
declare v_profile uuid := (select auth.uid());
begin
  if v_profile is null or not exists (
    select 1 from auth.users u join public.profiles p on p.id=u.id
    where u.id=v_profile and u.email_confirmed_at is not null and u.deleted_at is null
  ) then
    raise exception 'verified account required' using errcode='42501';
  end if;
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 10000 then
    raise exception 'invalid location page' using errcode='22023';
  end if;
  return query select w.id,w.name,m.role from public.crm_workspaces w
    join public.crm_workspace_members m on m.workspace_id=w.id
    where m.profile_id=v_profile and m.status='active' and w.status in ('active','trial')
    order by w.name,w.id limit p_limit offset p_offset;
end;
$$;
revoke all on function public.list_managed_operating_locations(integer,integer) from public,anon;
grant execute on function public.list_managed_operating_locations(integer,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
