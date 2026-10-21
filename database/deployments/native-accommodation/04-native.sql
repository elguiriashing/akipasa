-- Generated canonical native accommodation deployment phase 04. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create function public.managed_accommodation_properties_page(p_limit integer default 101,p_offset integer default 0) returns table(id uuid,name text,status text,workspace_id text,legacy_venue_id uuid) language plpgsql stable security definer set search_path='' as $$
begin
 if not accommodation_property_private.ready() or auth.uid() is null or not public.account_features_allowed() then raise exception 'Account access required' using errcode='42501';end if;
 if p_limit not between 1 and 101 or p_offset not between 0 and 10000 then raise exception 'Invalid pagination';end if;
 return query select p.id,p.name,p.status,p.workspace_id,p.legacy_venue_id from public.accommodation_properties p where accommodation_property_private.property_access(p.id) order by p.id limit p_limit offset p_offset;
end $$;
revoke all on function public.managed_accommodation_properties_page(integer,integer) from public,anon;
grant execute on function public.managed_accommodation_properties_page(integer,integer) to authenticated;
create function public.set_accommodation_property_member(p_property uuid,p_profile uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$
declare p public.accommodation_properties;
begin
 if not public.can_manage_accommodation_property(p_property) or not accommodation_property_private.property_access(p_property,true) then raise exception 'Property owner required' using errcode='42501';end if;
 select * into p from public.accommodation_properties where id=p_property for update;
 if p_profile=p.owner_profile_id or (p_role is not null and p_role<>'manager') then raise exception 'Invalid delegation';end if;
 if p_role is null then delete from public.accommodation_property_members where property_id=p_property and profile_id=p_profile;
 else
 if p.workspace_id is not null and not exists(select 1 from public.crm_workspace_members m where m.workspace_id=p.workspace_id and m.profile_id=p_profile and m.status='active' and m.role in ('owner','admin','manager','staff')) then raise exception 'Active organisation membership required' using errcode='42501';end if;
 insert into public.accommodation_property_members(property_id,profile_id,role) values(p_property,p_profile,'manager') on conflict(property_id,profile_id) do update set role=excluded.role;
 end if;
 insert into accommodation_property_private.audit(property_id,actor,action,detail) values(p_property,auth.uid(),'membership',jsonb_build_object('profile',p_profile,'role',p_role));
end $$;
revoke all on function public.set_accommodation_property_member(uuid,uuid,text) from public,anon;
grant execute on function public.set_accommodation_property_member(uuid,uuid,text) to authenticated;
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
