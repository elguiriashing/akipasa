-- Explicit independent-property teams. No invitation, ownership transfer or paid grant.
begin;
create table public.accommodation_property_member_audit (
 id uuid primary key default gen_random_uuid(),
 property_id uuid not null references public.accommodation_properties(id) on delete restrict,
 actor_id uuid references public.profiles(id) on delete set null,
 target_id uuid references public.profiles(id) on delete set null,
 old_role text,new_role text,
 created_at timestamptz not null default now()
);
alter table public.accommodation_property_member_audit enable row level security;
revoke all on public.accommodation_property_member_audit from public,anon,authenticated;

create function public.set_accommodation_property_member(p_property uuid,p_profile uuid,p_role text)
returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p public.accommodation_properties%rowtype; previous text;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and deleted_at is null) then raise exception 'Verified account required' using errcode='42501'; end if;
 select * into p from public.accommodation_properties where id=p_property for update;
 if p.id is null or p.legacy_venue_id is not null or p.owner_profile_id is distinct from actor then raise exception 'Independent property owner required' using errcode='42501'; end if;
 if p_profile is null or p_profile=actor or (p_role is not null and p_role<>'manager') then raise exception 'Invalid member or role' using errcode='22023'; end if;
 if p_role is not null then
  perform 1 from auth.users u join public.profiles pr on pr.id=u.id where u.id=p_profile and u.email_confirmed_at is not null and u.deleted_at is null for share of u,pr;
  if not found then raise exception 'Verified member required' using errcode='42501'; end if;
 end if;
 select role into previous from public.accommodation_property_members where property_id=p_property and profile_id=p_profile;
 if previous is not distinct from p_role then return false; end if;
 if p_role is null then
  delete from public.accommodation_property_members where property_id=p_property and profile_id=p_profile;
 else
  insert into public.accommodation_property_members(property_id,profile_id,role) values(p_property,p_profile,p_role)
  on conflict(property_id,profile_id) do update set role=excluded.role;
 end if;
 insert into public.accommodation_property_member_audit(property_id,actor_id,target_id,old_role,new_role)
 values(p_property,actor,p_profile,previous,p_role);
 return true;
end $$;
revoke all on function public.set_accommodation_property_member(uuid,uuid,text) from public,anon;
grant execute on function public.set_accommodation_property_member(uuid,uuid,text) to authenticated;

create function public.accommodation_property_team(p_property uuid,p_limit integer default 100,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); p public.accommodation_properties%rowtype; is_owner boolean; rows jsonb; total bigint;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null and deleted_at is null) then raise exception 'Verified account required' using errcode='42501'; end if;
 select * into p from public.accommodation_properties where id=p_property;
 if p.id is null or p.legacy_venue_id is not null or not public.can_manage_accommodation_property(p_property) then raise exception 'Independent property access required' using errcode='42501'; end if;
 if p_limit is null or p_limit not between 1 and 100 or p_offset is null or p_offset not between 0 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
 is_owner:=p.owner_profile_id is not distinct from actor;
 select count(*) into total from public.accommodation_property_members where property_id=p_property and (is_owner or profile_id=actor);
 select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) into rows from
  (select profile_id,role from public.accommodation_property_members where property_id=p_property and (is_owner or profile_id=actor) order by profile_id limit p_limit offset p_offset) m;
 return jsonb_build_object('canManageTeam',is_owner,'ownerProfileId',p.owner_profile_id,'members',rows,'total',total);
end $$;
revoke all on function public.accommodation_property_team(uuid,integer,integer) from public,anon;
grant execute on function public.accommodation_property_team(uuid,integer,integer) to authenticated;
-- Team metadata is visible only to the canonical owner or the member themself.
drop policy accommodation_property_member_read on public.accommodation_property_members;
create policy accommodation_property_member_read on public.accommodation_property_members for select to authenticated
 using(profile_id=auth.uid() or exists(select 1 from public.accommodation_properties p where p.id=property_id and p.legacy_venue_id is null and p.owner_profile_id=auth.uid()));
create function public.managed_accommodation_properties_page(p_limit integer default 100,p_offset integer default 0)
returns setof public.accommodation_properties language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_limit is null or p_limit not between 1 and 101 or p_offset is null or p_offset not between 0 and 10000 then raise exception 'Invalid page' using errcode='22023'; end if;
 return query select p.* from public.accommodation_properties p where public.can_manage_accommodation_property(p.id) order by p.name,p.id limit p_limit offset p_offset;
end $$;
revoke all on function public.managed_accommodation_properties_page(integer,integer) from public,anon;
grant execute on function public.managed_accommodation_properties_page(integer,integer) to authenticated;
commit;
