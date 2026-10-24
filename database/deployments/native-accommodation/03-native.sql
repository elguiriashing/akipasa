-- Generated canonical native accommodation deployment phase 03. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create function accommodation_property_private.property_access(p_property uuid,p_owner boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.account_features_allowed() and exists(
  select 1 from public.accommodation_properties p where p.id=p_property and p.owner_profile_id is not null and
  (p.owner_profile_id=auth.uid() or (not p_owner and exists(select 1 from public.accommodation_property_members m where m.property_id=p.id and m.profile_id=auth.uid())))
  and (p.workspace_id is null or exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id
    where w.id=p.workspace_id and w.id<>'ws_akipasa' and w.owner_profile_id=p.owner_profile_id and w.status in ('active','trial') and m.profile_id=auth.uid() and m.status='active' and m.role in ('owner','admin','manager','staff'))))
$$;
revoke all on function accommodation_property_private.property_access(uuid,boolean) from public,anon,authenticated,service_role;
create function public.can_manage_accommodation_property(p_property uuid) returns boolean language sql stable security definer set search_path='' as $$select accommodation_property_private.ready() and accommodation_property_private.property_access(p_property)$$;
revoke all on function public.can_manage_accommodation_property(uuid) from public,anon;
grant execute on function public.can_manage_accommodation_property(uuid) to authenticated;
create function accommodation_property_private.premium(p_property uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from accommodation_property_private.property_entitlements e where e.property_id=p_property and e.revoked_at is null and e.starts_at<=now() and (e.ends_at is null or e.ends_at>now()))
$$;
revoke all on function accommodation_property_private.premium(uuid) from public,anon,authenticated,service_role;
create function public.create_accommodation_property(p_name text,p_workspace text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if not accommodation_property_private.ready() or auth.uid() is null or not public.account_features_allowed() then raise exception 'Account access required' using errcode='42501';end if;
 if p_workspace is not null and not exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id where w.id=p_workspace and w.id<>'ws_akipasa' and w.owner_profile_id=auth.uid() and w.status in ('active','trial') and m.profile_id=auth.uid() and m.role='owner' and m.status='active') then raise exception 'Workspace owner required' using errcode='42501';end if;
 insert into public.accommodation_properties(owner_profile_id,workspace_id,name) values(auth.uid(),p_workspace,p_name) returning id into v_id;
 insert into accommodation_property_private.audit(property_id,actor,action) values(v_id,auth.uid(),'created');return v_id;
end $$;
revoke all on function public.create_accommodation_property(text,text) from public,anon;
grant execute on function public.create_accommodation_property(text,text) to authenticated;
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
