-- Explicit company ownership groups existing CRM workspaces; it never grants tools.
-- No inferred backfill, source-venue changes, subscriptions or public listings.
-- Recovery: revoke write RPCs and retain all grouping, membership and audit rows.
begin;
create schema operating_org_private;
revoke all on schema operating_org_private from public, anon, authenticated;

create table public.operating_organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 120 and name !~ '[[:cntrl:]]'),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now()
);
create table public.operating_organisation_members (
  organisation_id uuid not null references public.operating_organisations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('owner','admin')),
  active boolean not null default true,
  primary key(organisation_id,profile_id)
);
create unique index operating_organisation_one_owner on public.operating_organisation_members(organisation_id) where role='owner';
create index operating_organisation_member_profile on public.operating_organisation_members(profile_id,organisation_id) where active;
create table public.operating_organisation_locations (
  organisation_id uuid not null references public.operating_organisations(id) on delete restrict,
  workspace_id text primary key references public.crm_workspaces(id) on delete restrict,
  attached_by uuid references public.profiles(id) on delete set null,
  attached_at timestamptz not null default now()
);
create index operating_organisation_location_group on public.operating_organisation_locations(organisation_id,workspace_id);
create table operating_org_private.creation_requests (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid not null,
  organisation_id uuid not null unique references public.operating_organisations(id) on delete restrict,
  requested_name text not null,
  primary key(profile_id,request_id)
);
create table operating_org_private.events (
  id bigint generated always as identity primary key,
  organisation_id uuid not null references public.operating_organisations(id) on delete restrict,
  actor uuid references public.profiles(id) on delete set null,
  action text not null check(action in ('created','location_attached','admin_enabled','admin_revoked')),
  workspace_id text references public.crm_workspaces(id) on delete restrict,
  target_profile uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.operating_organisations enable row level security;
alter table public.operating_organisation_members enable row level security;
alter table public.operating_organisation_locations enable row level security;
alter table operating_org_private.creation_requests enable row level security;
alter table operating_org_private.events enable row level security;
revoke all on public.operating_organisations, public.operating_organisation_members, public.operating_organisation_locations from public,anon,authenticated;
revoke all on all tables in schema operating_org_private from public,anon,authenticated;
grant select on public.operating_organisations, public.operating_organisation_members, public.operating_organisation_locations to authenticated;

create function operating_org_private.verified_actor() returns uuid
language sql stable security definer set search_path='' as $$
  select p.id from public.profiles p join auth.users u on u.id=p.id
  where p.id=(select auth.uid()) and u.email_confirmed_at is not null and u.deleted_at is null;
$$;
create function operating_org_private.member_role(p_organisation uuid) returns text
language sql stable security definer set search_path='' as $$
  select m.role from public.operating_organisation_members m
  join public.operating_organisations o on o.id=m.organisation_id
  where m.organisation_id=p_organisation and m.profile_id=operating_org_private.verified_actor()
    and m.active and o.status='active';
$$;
revoke all on function operating_org_private.verified_actor(), operating_org_private.member_role(uuid) from public,anon,authenticated;
create function public.can_manage_operating_organisation(p_organisation uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(operating_org_private.member_role(p_organisation) in ('owner','admin'),false);
$$;
revoke all on function public.can_manage_operating_organisation(uuid) from public,anon;
grant execute on function public.can_manage_operating_organisation(uuid) to authenticated;
create policy own_operating_organisation on public.operating_organisations for select to authenticated
  using(public.can_manage_operating_organisation(id));
create policy own_operating_organisation_members on public.operating_organisation_members for select to authenticated
  using(public.can_manage_operating_organisation(organisation_id));
create policy own_operating_organisation_locations on public.operating_organisation_locations for select to authenticated
  using(public.can_manage_operating_organisation(organisation_id));

create function public.create_operating_organisation(p_request_id uuid,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=operating_org_private.verified_actor(); v_name text:=btrim(p_name);
  v_prior operating_org_private.creation_requests%rowtype; v_id uuid;
begin
  if v_actor is null then raise exception 'verified account required' using errcode='42501'; end if;
  if p_request_id is null or v_name is null or char_length(v_name) not between 2 and 120 or v_name ~ '[[:cntrl:]]' then
    raise exception 'invalid company request' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('operating-org:'||v_actor::text||':'||p_request_id::text,0));
  select * into v_prior from operating_org_private.creation_requests where profile_id=v_actor and request_id=p_request_id;
  if found then
    if v_prior.requested_name<>v_name then raise exception 'request already used with another name' using errcode='PT409'; end if;
    if operating_org_private.member_role(v_prior.organisation_id) is distinct from 'owner' or not exists(
      select 1 from public.operating_organisations where id=v_prior.organisation_id and owner_profile_id=v_actor
    ) then raise exception 'company ownership no longer available' using errcode='42501'; end if;
    return v_prior.organisation_id;
  end if;
  insert into public.operating_organisations(name,owner_profile_id) values(v_name,v_actor) returning id into v_id;
  insert into public.operating_organisation_members(organisation_id,profile_id,role) values(v_id,v_actor,'owner');
  insert into operating_org_private.creation_requests values(v_actor,p_request_id,v_id,v_name);
  insert into operating_org_private.events(organisation_id,actor,action) values(v_id,v_actor,'created');
  return v_id;
end;
$$;

create function public.attach_operating_location(p_organisation uuid,p_workspace text) returns text
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=operating_org_private.verified_actor(); v_workspace text; v_existing uuid;
begin
  if v_actor is null then raise exception 'verified account required' using errcode='42501'; end if;
  -- All group mutations share this lock so admin revocation cannot race attachment.
  perform 1 from public.operating_organisations where id=p_organisation for update;
  if not public.can_manage_operating_organisation(p_organisation) then
    raise exception 'company management required' using errcode='42501'; end if;
  select w.id into v_workspace from public.crm_workspaces w
    join public.crm_workspace_members m on m.workspace_id=w.id
    where w.id=p_workspace and w.owner_profile_id=v_actor and w.status in ('active','trial')
      and m.profile_id=v_actor and m.role='owner' and m.status='active' for update of w,m;
  if v_workspace is null then raise exception 'explicit location ownership required' using errcode='42501'; end if;
  select organisation_id into v_existing from public.operating_organisation_locations where workspace_id=v_workspace;
  if found then
    if v_existing<>p_organisation then raise exception 'location already belongs to another company' using errcode='PT409'; end if;
    return v_workspace;
  end if;
  insert into public.operating_organisation_locations(organisation_id,workspace_id,attached_by) values(p_organisation,v_workspace,v_actor);
  insert into operating_org_private.events(organisation_id,actor,action,workspace_id) values(p_organisation,v_actor,'location_attached',v_workspace);
  return v_workspace;
end;
$$;

create function public.set_operating_organisation_admin(p_organisation uuid,p_profile uuid,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=operating_org_private.verified_actor(); v_changed integer;
begin
  if v_actor is null then raise exception 'verified account required' using errcode='42501'; end if;
  perform 1 from public.operating_organisations where id=p_organisation for update;
  if operating_org_private.member_role(p_organisation) is distinct from 'owner' or not exists(
    select 1 from public.operating_organisations where id=p_organisation and owner_profile_id=v_actor
  ) then raise exception 'company owner required' using errcode='42501'; end if;
  if p_profile is null or p_active is null or p_profile=v_actor then
    raise exception 'invalid administrator assignment' using errcode='22023'; end if;
  if p_active and not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
    where p.id=p_profile and u.email_confirmed_at is not null and u.deleted_at is null) then
    raise exception 'verified target account required' using errcode='42501'; end if;
  if exists(select 1 from public.operating_organisation_members where organisation_id=p_organisation and profile_id=p_profile and role='owner') then
    raise exception 'owner membership cannot be changed' using errcode='42501'; end if;
  if p_active then
    insert into public.operating_organisation_members(organisation_id,profile_id,role,active) values(p_organisation,p_profile,'admin',true)
      on conflict(organisation_id,profile_id) do update set active=true where not operating_organisation_members.active;
  else
    update public.operating_organisation_members set active=false where organisation_id=p_organisation and profile_id=p_profile and role='admin' and active;
  end if;
  get diagnostics v_changed=row_count;
  if v_changed>0 then insert into operating_org_private.events(organisation_id,actor,action,target_profile)
    values(p_organisation,v_actor,case when p_active then 'admin_enabled' else 'admin_revoked' end,p_profile); end if;
end;
$$;

create function public.list_operating_organisations(p_limit integer default 50,p_offset integer default 0)
returns table(id uuid,name text,role text)
language plpgsql stable security definer set search_path='' as $$
declare v_actor uuid:=operating_org_private.verified_actor();
begin
  if v_actor is null then raise exception 'verified account required' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 10000 then
    raise exception 'invalid company page' using errcode='22023'; end if;
  return query select o.id,o.name,m.role from public.operating_organisations o
    join public.operating_organisation_members m on m.organisation_id=o.id
    where m.profile_id=v_actor and m.active and o.status='active' order by o.name,o.id limit p_limit offset p_offset;
end;
$$;
create function public.list_operating_organisation_locations(p_organisation uuid,p_limit integer default 50,p_offset integer default 0)
returns table(id text,name text,role text)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.can_manage_operating_organisation(p_organisation) then
    raise exception 'company management required' using errcode='42501'; end if;
  if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 10000 then
    raise exception 'invalid location page' using errcode='22023'; end if;
  return query select w.id,w.name,m.role from public.operating_organisation_locations l
    join public.crm_workspaces w on w.id=l.workspace_id
    left join public.crm_workspace_members m on m.workspace_id=w.id and m.profile_id=operating_org_private.verified_actor() and m.status='active'
    where l.organisation_id=p_organisation and w.status in ('active','trial') order by w.name,w.id limit p_limit offset p_offset;
end;
$$;
revoke all on function public.create_operating_organisation(uuid,text), public.attach_operating_location(uuid,text),
 public.set_operating_organisation_admin(uuid,uuid,boolean),public.list_operating_organisations(integer,integer),
 public.list_operating_organisation_locations(uuid,integer,integer) from public,anon;
grant execute on function public.create_operating_organisation(uuid,text), public.attach_operating_location(uuid,text),
 public.set_operating_organisation_admin(uuid,uuid,boolean),public.list_operating_organisations(integer,integer),
 public.list_operating_organisation_locations(uuid,integer,integer) to authenticated;
notify pgrst,'reload schema';
commit;
