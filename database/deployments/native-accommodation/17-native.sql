-- Generated canonical native accommodation deployment phase 17. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create function accommodation_property_private.inventory_occupancy_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare v_start date;v_end date;v_active boolean;
begin
 if auth.uid() is not null and current_setting('role',true)<>'service_role' and not public.can_manage_accommodation_inventory(new.property_id) then raise exception 'Property inventory membership required' using errcode='42501';end if;
 -- Both block and reservation writes touch the unit, also rejecting stale repeatable-read snapshots.
 update public.accommodation_property_units set active=active where id=new.unit_id and property_id=new.property_id returning active into v_active;
 if not found then raise exception 'Unit property mismatch' using errcode='42501';end if;
 if tg_table_name='accommodation_property_reservations' then
  if new.status not in ('requested','confirmed','checked_in') then return new;end if;
  if not v_active then raise exception 'Unit unavailable';end if;
  v_start:=new.check_in;v_end:=new.check_out;
  if exists(select 1 from public.accommodation_property_reservations r where r.unit_id=new.unit_id and r.property_id=new.property_id and r.id<>new.id and r.status in ('requested','confirmed','checked_in') and daterange(r.check_in,r.check_out,'[)') && daterange(v_start,v_end,'[)')) then raise exception 'Native unit unavailable' using errcode='23P01';end if;
 else v_start:=new.start_date;v_end:=new.end_date_exclusive;
  if exists(select 1 from public.accommodation_property_unit_blocks b where b.unit_id=new.unit_id and b.property_id=new.property_id and b.id<>new.id and daterange(b.start_date,b.end_date_exclusive,'[)') && daterange(v_start,v_end,'[)')) then raise exception 'Native unit already blocked' using errcode='23P01';end if;
 end if;
 if tg_table_name='accommodation_property_reservations' then
  if exists(select 1 from public.accommodation_property_unit_blocks b where b.unit_id=new.unit_id and b.property_id=new.property_id and daterange(b.start_date,b.end_date_exclusive,'[)') && daterange(v_start,v_end,'[)')) then raise exception 'Native unit blocked' using errcode='23P01';end if;
 else
  if exists(select 1 from public.accommodation_property_reservations r where r.unit_id=new.unit_id and r.property_id=new.property_id and r.status in ('requested','confirmed','checked_in') and daterange(r.check_in,r.check_out,'[)') && daterange(v_start,v_end,'[)')) then raise exception 'Native unit reserved' using errcode='23P01';end if;
 end if;return new;
end $$;
revoke all on function accommodation_property_private.inventory_occupancy_guard() from public,anon,authenticated,service_role;
create trigger native_accommodation_blocks_occupancy before insert or update on public.accommodation_property_unit_blocks for each row execute function accommodation_property_private.inventory_occupancy_guard();
create trigger native_accommodation_reservation_occupancy before insert or update of unit_id,property_id,check_in,check_out,status on public.accommodation_property_reservations for each row execute function accommodation_property_private.inventory_occupancy_guard();
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
