-- Generated canonical native accommodation deployment phase 21. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create or replace function public.accommodation_property_team(p_property uuid,p_limit integer default 100,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_members jsonb;
begin
 if not public.can_manage_accommodation_property(p_property) then raise exception 'Property membership required' using errcode='42501';end if;
 if p_limit is null or p_offset is null or p_limit not between 1 and 100 or p_offset not between 0 and 10000 then raise exception 'Invalid pagination';end if;
 select coalesce(jsonb_agg(to_jsonb(m)),'[]') into v_members from (select profile_id,role from public.accommodation_property_members where property_id=p_property order by profile_id limit p_limit offset p_offset)m;
 return jsonb_build_object('canManageTeam',accommodation_property_private.property_access(p_property,true),'ownerProfileId',(select owner_profile_id from public.accommodation_properties where id=p_property),'members',v_members,'total',(select count(*) from public.accommodation_property_members where property_id=p_property));
end $$;
revoke all on function public.accommodation_property_team(uuid,integer,integer) from public,anon;
grant execute on function public.accommodation_property_team(uuid,integer,integer) to authenticated;
notify pgrst,'reload schema';
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
