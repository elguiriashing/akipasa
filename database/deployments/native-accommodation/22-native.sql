-- Generated canonical native accommodation deployment phase 22. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
do $native_final$ begin
 if (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname in('accommodation_native_bucket_read','accommodation_native_bucket_delete','accommodation_storage_read','accommodation_storage_delete','accommodation_storage_no_insert','accommodation_storage_no_update'))<>6 or not exists(select 1 from pg_trigger where tgrelid='storage.objects'::regclass and tgname='native_accommodation_storage_evidence' and not tgisinternal) then raise exception 'Native final Storage protection incomplete';end if;
 if to_regprocedure('public.accommodation_property_review_page(integer,integer)') is null or not exists(select 1 from accommodation_property_private.launch_settings s where not s.enabled and not s.uploads_enforced and not s.inventory_enabled) then raise exception 'Native final gated schema incomplete';end if;
end $native_final$;
drop policy native_deployment_bucket_hold on storage.objects;
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
