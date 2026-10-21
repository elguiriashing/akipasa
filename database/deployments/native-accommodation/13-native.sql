-- Generated canonical native accommodation deployment phase 13. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
revoke all on function public.can_manage_accommodation_property(uuid),public.create_accommodation_property(text,text),public.managed_accommodation_properties_page(integer,integer),public.set_accommodation_property_member(uuid,uuid,text),public.accommodation_property_team(uuid,integer,integer),public.save_accommodation_property_profile(uuid,jsonb,boolean),public.review_accommodation_property(uuid,boolean,uuid,text),public.accommodation_listing_info(uuid),public.reserve_accommodation_upload(uuid,text,text,integer,integer,integer) from public,anon;
grant execute on function public.can_manage_accommodation_property(uuid),public.create_accommodation_property(text,text),public.managed_accommodation_properties_page(integer,integer),public.set_accommodation_property_member(uuid,uuid,text),public.accommodation_property_team(uuid,integer,integer),public.save_accommodation_property_profile(uuid,jsonb,boolean),public.review_accommodation_property(uuid,boolean,uuid,text),public.accommodation_listing_info(uuid),public.reserve_accommodation_upload(uuid,text,text,integer,integer,integer) to authenticated;
revoke all on function public.complete_accommodation_upload(uuid,text),public.cancel_accommodation_upload(uuid) from public,anon,authenticated;
grant execute on function public.complete_accommodation_upload(uuid,text),public.cancel_accommodation_upload(uuid) to service_role;
revoke all on function public.accommodation_storage_allowed(text,text,boolean) from public;
grant execute on function public.accommodation_storage_allowed(text,text,boolean) to anon,authenticated;
notify pgrst,'reload schema';
alter table accommodation_property_private.launch_settings add column inventory_enabled boolean not null default false;
alter table accommodation_property_private.launch_settings add constraint accommodation_inventory_requires_foundation check(not inventory_enabled or enabled);
create function public.can_manage_accommodation_inventory(p_property uuid) returns boolean language sql stable security definer set search_path='' as $$
 select (select inventory_enabled from accommodation_property_private.launch_settings where singleton) and public.can_manage_accommodation_property(p_property)
$$;
revoke all on function public.can_manage_accommodation_inventory(uuid) from public,anon;
grant execute on function public.can_manage_accommodation_inventory(uuid) to authenticated;
revoke all on function public.can_manage_accommodation_inventory(uuid) from public,anon;
grant execute on function public.can_manage_accommodation_inventory(uuid) to authenticated;
create table public.accommodation_property_room_types(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),name text not null check(char_length(btrim(name)) between 2 and 120),max_guests integer not null check(max_guests between 1 and 30),active boolean not null default true,created_at timestamptz not null default now(),unique(id,property_id)
);
alter table public.accommodation_property_room_types enable row level security;
revoke all on public.accommodation_property_room_types from public,anon,authenticated;
do $native_closed$ declare r record; v boolean;begin
 if to_regclass('accommodation_property_private.launch_settings') is not null then
  if not exists(select 1 from accommodation_property_private.launch_settings) or exists(select 1 from accommodation_property_private.launch_settings s where s.enabled or s.uploads_enforced or coalesce(to_jsonb(s)->>'inventory_enabled','false')<>'false') then raise exception 'Native deployment requires disabled settings';end if;
 end if;
 for r in select c.oid::regclass t from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and ((n.nspname='accommodation_property_private' and c.relname<>'launch_settings') or (n.nspname='public' and (c.relname='accommodation_properties' or c.relname like 'accommodation_property_%'))) loop
  execute format('select exists(select 1 from %s limit 1)',r.t) into v;if v then raise exception 'Native deployment requires empty tables';end if;
 end loop;
 if exists(select 1 from storage.buckets where id='accommodation-media' and public) then raise exception 'Native bucket must remain private';end if;
 if exists(select 1 from storage.objects where bucket_id='accommodation-media') then raise exception 'Native deployment requires empty Storage';end if;
end $native_closed$;
commit;
