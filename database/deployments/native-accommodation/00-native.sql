-- Generated canonical native accommodation deployment phase 00. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $$ begin
 if to_regclass('public.accommodation_properties') is not null or to_regclass('public.accommodation_property_media') is not null then
  raise exception 'Native accommodation schema already exists; reconcile ownership and paid access before migration';
 end if;
 if to_regprocedure('public.account_features_allowed()') is null then raise exception 'Shared account eligibility contract required'; end if;
end $$;
do $native_fresh$ begin
 if to_regnamespace('accommodation_property_private') is not null then raise exception 'Native schema already exists; reconcile exact deployment receipts';end if;
 if not exists(select 1 from pg_class where oid='storage.objects'::regclass and relrowsecurity) or not exists(select 1 from pg_class where oid='storage.buckets'::regclass and relrowsecurity) then raise exception 'Storage RLS prerequisite required';end if;
 if exists(select 1 from pg_policy p where p.polrelid='storage.buckets'::regclass and p.polpermissive and p.polcmd in('*','a','w','d') and (0=any(p.polroles) or exists(select 1 from pg_roles r where r.oid=any(p.polroles) and (pg_has_role('anon',r.oid,'USAGE') or pg_has_role('authenticated',r.oid,'USAGE'))))) then raise exception 'Client bucket mutation policy requires explicit privacy review';end if;
 if exists(select 1 from pg_policy where polrelid='storage.objects'::regclass and polname='native_deployment_bucket_hold') then raise exception 'Native Storage hold already exists; inspect prior receipt';end if;
end $native_fresh$;
create policy native_deployment_bucket_hold on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'accommodation-media') with check(bucket_id<>'accommodation-media');
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
