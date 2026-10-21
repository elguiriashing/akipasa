-- Generated canonical native accommodation deployment phase 16. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create function accommodation_property_private.inventory_rate_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is not null and not public.can_manage_accommodation_inventory(new.property_id) then raise exception 'Property inventory membership required' using errcode='42501';end if;
 update public.accommodation_property_room_types set active=active where id=new.room_type_id and property_id=new.property_id;
 if not found then raise exception 'Room type property mismatch' using errcode='42501';end if;
 if exists(select 1 from public.accommodation_property_nightly_rates r where r.room_type_id=new.room_type_id and r.property_id=new.property_id and r.id<>new.id and daterange(r.start_date,r.end_date_exclusive,'[)') && daterange(new.start_date,new.end_date_exclusive,'[)')) then raise exception 'Overlapping native nightly rates' using errcode='23P01';end if;
 return new;
end $$;
revoke all on function accommodation_property_private.inventory_rate_guard() from public,anon,authenticated,service_role;
create trigger native_accommodation_rates_no_overlap before insert or update on public.accommodation_property_nightly_rates for each row execute function accommodation_property_private.inventory_rate_guard();
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
