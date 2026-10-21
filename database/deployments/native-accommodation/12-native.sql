-- Generated canonical native accommodation deployment phase 12. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
-- Service storage creates require a current, unconsumed server reservation too.
create function accommodation_property_private.guard_object() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.bucket_id<>'accommodation-media' then return new;end if;
 if tg_op='UPDATE' then raise exception 'Native accommodation objects immutable' using errcode='42501';end if;
 if current_setting('role',true)<>'service_role' or not exists(select 1 from accommodation_property_private.upload_reservations r where r.storage_path=new.name and r.state='pending' and r.expires_at>now() and r.id::text=new.user_metadata->>'accommodation_upload_id' and r.digest=new.user_metadata->>'sha256' and r.size_bytes::text=new.metadata->>'size' and r.mime_type=new.metadata->>'mimetype') then raise exception 'Approved service upload reservation required' using errcode='42501';end if;
 return new;
end $$;
revoke all on function accommodation_property_private.guard_object() from public,anon,authenticated,service_role;
create trigger native_accommodation_storage_evidence before insert or update on storage.objects for each row execute function accommodation_property_private.guard_object();
alter table public.accommodation_properties enable row level security;
alter table public.accommodation_property_members enable row level security;
alter table public.accommodation_property_media enable row level security;
revoke all on public.accommodation_properties,public.accommodation_property_members,public.accommodation_property_media from public,anon,authenticated;
grant select on public.accommodation_properties to authenticated;
grant select,insert,update,delete on public.accommodation_property_media to authenticated;
create policy accommodation_properties_management on public.accommodation_properties for select to authenticated using(public.can_manage_accommodation_property(id));
create policy accommodation_media_management on public.accommodation_property_media for all to authenticated using(public.can_manage_accommodation_property(property_id)) with check(public.can_manage_accommodation_property(property_id));
alter table accommodation_property_private.launch_settings enable row level security;
revoke all on accommodation_property_private.launch_settings from public,anon,authenticated;
alter table accommodation_property_private.property_entitlements enable row level security;
revoke all on accommodation_property_private.property_entitlements from public,anon,authenticated;
alter table accommodation_property_private.audit enable row level security;
revoke all on accommodation_property_private.audit from public,anon,authenticated;
alter table accommodation_property_private.upload_reservations enable row level security;
revoke all on accommodation_property_private.upload_reservations from public,anon,authenticated;
do $$ declare r record;begin
 for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='accommodation_property_private' loop execute format('revoke all on function %s from public,anon,authenticated,service_role',r.f);end loop;
end $$;
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
