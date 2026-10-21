-- Generated canonical native accommodation deployment phase 20. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create function public.accommodation_property_review_page(p_limit integer default 101,p_offset integer default 0)
returns table(id uuid,name text,status text,revision_id uuid,city text,address text,description_es text,description_en text,orphaned boolean)
language plpgsql stable security definer set search_path='' as $$
begin
 if not accommodation_property_private.ready() or not public.account_features_allowed() or not exists(select 1 from public.profiles where profiles.id=auth.uid() and app_role='administrator') then raise exception 'Administrator required' using errcode='42501';end if;
 if p_limit is null or p_offset is null or p_limit not between 1 and 101 or p_offset not between 0 and 10000 then raise exception 'Invalid pagination';end if;
 return query select p.id,p.name,p.status,p.revision_id,p.city,p.address,p.description_es,p.description_en,p.owner_profile_id is null from public.accommodation_properties p where p.status='pending' or p.orphaned_at is not null order by p.created_at,p.id limit p_limit offset p_offset;
end $$;
revoke all on function public.accommodation_property_review_page(integer,integer) from public,anon;
grant execute on function public.accommodation_property_review_page(integer,integer) to authenticated;
revoke all on function public.accommodation_property_review_page(integer,integer) from public,anon;
grant execute on function public.accommodation_property_review_page(integer,integer) to authenticated;
create or replace function public.managed_accommodation_properties_page(p_limit integer default 101,p_offset integer default 0) returns table(id uuid,name text,status text,workspace_id text,legacy_venue_id uuid) language plpgsql stable security definer set search_path='' as $$
begin
 if not accommodation_property_private.ready() or auth.uid() is null or not public.account_features_allowed() then raise exception 'Account access required' using errcode='42501';end if;
 if p_limit is null or p_offset is null or p_limit not between 1 and 101 or p_offset not between 0 and 10000 then raise exception 'Invalid pagination';end if;
 return query select p.id,p.name,p.status,p.workspace_id,p.legacy_venue_id from public.accommodation_properties p where accommodation_property_private.property_access(p.id) order by p.id limit p_limit offset p_offset;
end $$;
revoke all on function public.managed_accommodation_properties_page(integer,integer) from public,anon;
grant execute on function public.managed_accommodation_properties_page(integer,integer) to authenticated;
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
