-- Generated canonical native accommodation deployment phase 11. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
-- Restrictive policies intersect every existing broad Storage policy.
create function public.accommodation_storage_allowed(p_bucket text,p_path text,p_write boolean default false) returns boolean language plpgsql stable security definer set search_path='' as $$
declare p_id uuid;
begin
 if p_bucket<>'accommodation-media' then return true;end if;
 if not accommodation_property_private.ready() then return false;end if;
 if split_part(p_path,'/',1) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false;end if;
 p_id:=split_part(p_path,'/',1)::uuid;
 if p_write then return public.can_manage_accommodation_property(p_id);end if;
 return public.can_manage_accommodation_property(p_id) or (accommodation_property_private.ready() and exists(select 1 from public.accommodation_property_media m join public.accommodation_properties p on p.id=m.property_id where m.storage_path=p_path and m.property_id=p_id and m.public_position is not null and p.status='published' and p.owner_profile_id is not null));
end $$;
revoke all on function public.accommodation_storage_allowed(text,text,boolean) from public;
grant execute on function public.accommodation_storage_allowed(text,text,boolean) to anon,authenticated;
create policy accommodation_native_bucket_read on storage.objects for select to anon,authenticated using(bucket_id='accommodation-media' and public.accommodation_storage_allowed(bucket_id,name));
create policy accommodation_native_bucket_delete on storage.objects for delete to authenticated using(bucket_id='accommodation-media' and public.accommodation_storage_allowed(bucket_id,name,true));
create policy accommodation_storage_read on storage.objects as restrictive for select to anon,authenticated using(public.accommodation_storage_allowed(bucket_id,name));
create policy accommodation_storage_delete on storage.objects as restrictive for delete to anon,authenticated using(public.accommodation_storage_allowed(bucket_id,name,true));
create policy accommodation_storage_no_insert on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'accommodation-media');
create policy accommodation_storage_no_update on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'accommodation-media') with check(bucket_id<>'accommodation-media');
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
