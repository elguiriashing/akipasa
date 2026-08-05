begin;

-- ============================================================
-- CRM staff data RPCs
-- Callable by moderator and administrator roles only.
-- These expose platform data to the AkiHQ CRM without
-- relaxing existing RLS policies on the underlying tables.
-- ============================================================

-- 1. List contacts: returns all profiles for the CRM Contacts section
create or replace function crm_list_contacts(
  p_limit integer default 500
) returns table (
  profile_id   uuid,
  display_name text,
  app_role     public.app_role,
  primary_email text,
  venue_count  bigint,
  created_at   timestamptz
) language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_platform_role(array['moderator','administrator']::public.app_role[]) then
    raise exception 'moderator or administrator role required';
  end if;

  return query
  select
    p.id,
    coalesce(nullif(p.display_name,''), split_part(u.email,'@',1)) as display_name,
    p.app_role,
    u.email::text,
    (select count(*) from public.venue_members vm where vm.profile_id = p.id) as venue_count,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.deleted_at is null
  order by p.created_at desc
  limit least(greatest(coalesce(p_limit,500),1),1000);
end;
$$;

-- 2. List venues: returns all venues for the CRM Companies section
create or replace function crm_list_venues(
  p_limit integer default 500
) returns table (
  venue_id    uuid,
  venue_slug  text,
  venue_name  text,
  address     text,
  city_name   text,
  verified    boolean,
  status      text,
  owner_email text,
  member_count bigint,
  created_at  timestamptz
) language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_platform_role(array['moderator','administrator']::public.app_role[]) then
    raise exception 'moderator or administrator role required';
  end if;

  return query
  select
    v.id,
    v.slug,
    v.name,
    v.address,
    coalesce(c.name_en, c.name_es, 'Unknown') as city_name,
    v.verified,
    v.status::text,
    owner_data.email::text,
    (select count(*) from public.venue_members vm where vm.venue_id = v.id) as member_count,
    v.created_at
  from public.venues v
  left join public.cities c on c.id = v.city_id
  left join lateral (
    select u.email
    from public.venue_members vm
    join auth.users u on u.id = vm.profile_id
    where vm.venue_id = v.id and vm.role = 'owner'
    order by vm.created_at asc
    limit 1
  ) owner_data on true
  order by v.created_at desc
  limit least(greatest(coalesce(p_limit,500),1),2000);
end;
$$;

-- 3. Dashboard stats: aggregate counts for the CRM dashboard
create or replace function crm_dashboard_stats()
returns table (
  total_venues          bigint,
  verified_venues       bigint,
  pending_venues        bigint,
  total_users           bigint,
  staff_users           bigint,
  new_users_30d         bigint,
  pending_claims        bigint
) language plpgsql security definer set search_path = ''
as $$
begin
  if not public.has_platform_role(array['moderator','administrator']::public.app_role[]) then
    raise exception 'moderator or administrator role required';
  end if;

  return query
  select
    (select count(*) from public.venues)::bigint                                                        as total_venues,
    (select count(*) from public.venues where verified = true)::bigint                                  as verified_venues,
    (select count(*) from public.venues where status = 'pending')::bigint                               as pending_venues,
    (select count(*) from public.profiles p join auth.users u on u.id = p.id where u.deleted_at is null)::bigint as total_users,
    (select count(*) from public.profiles where app_role in ('moderator','administrator'))::bigint       as staff_users,
    (select count(*) from public.profiles p join auth.users u on u.id = p.id where p.created_at >= now() - interval '30 days' and u.deleted_at is null)::bigint as new_users_30d,
    (select count(*) from public.venue_claims where status = 'pending')::bigint                         as pending_claims;
end;
$$;

-- Grant access to authenticated users (RLS inside functions enforces role check)
revoke all on function crm_list_contacts(integer)  from public;
revoke all on function crm_list_venues(integer)     from public;
revoke all on function crm_dashboard_stats()        from public;
grant execute on function crm_list_contacts(integer)  to authenticated;
grant execute on function crm_list_venues(integer)    to authenticated;
grant execute on function crm_dashboard_stats()       to authenticated;

commit;
