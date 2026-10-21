-- Generated canonical native accommodation deployment phase 19. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create policy native_nightly_rates_owner on public.accommodation_property_nightly_rates for all to authenticated using(public.can_manage_accommodation_inventory(property_id)) with check(public.can_manage_accommodation_inventory(property_id));
create trigger native_nightly_rates_identity before update on public.accommodation_property_nightly_rates for each row execute function accommodation_property_private.inventory_identity();
alter table public.accommodation_property_unit_blocks enable row level security;
revoke all on public.accommodation_property_unit_blocks from public,anon,authenticated;
grant select,insert,update,delete on public.accommodation_property_unit_blocks to authenticated;
create policy native_unit_blocks_owner on public.accommodation_property_unit_blocks for all to authenticated using(public.can_manage_accommodation_inventory(property_id)) with check(public.can_manage_accommodation_inventory(property_id));
create trigger native_unit_blocks_identity before update on public.accommodation_property_unit_blocks for each row execute function accommodation_property_private.inventory_identity();
alter table public.accommodation_property_booking_settings enable row level security;
revoke all on public.accommodation_property_booking_settings from public,anon,authenticated;
grant select,insert,update,delete on public.accommodation_property_booking_settings to authenticated;
create policy native_booking_settings_owner on public.accommodation_property_booking_settings for all to authenticated using(public.can_manage_accommodation_inventory(property_id)) with check(public.can_manage_accommodation_inventory(property_id));
create trigger native_booking_settings_identity before update on public.accommodation_property_booking_settings for each row execute function accommodation_property_private.inventory_identity();
alter table public.accommodation_property_reservations enable row level security;
revoke all on public.accommodation_property_reservations from public,anon,authenticated;
grant select on public.accommodation_property_reservations to authenticated;
create policy native_reservations_read on public.accommodation_property_reservations for select to authenticated using(public.can_manage_accommodation_inventory(property_id));
create trigger native_reservations_identity before update on public.accommodation_property_reservations for each row execute function accommodation_property_private.inventory_identity();
revoke all on function accommodation_property_private.inventory_identity(),accommodation_property_private.inventory_rate_guard(),accommodation_property_private.inventory_occupancy_guard() from public,anon,authenticated,service_role;
notify pgrst,'reload schema';
create index accommodation_native_review_scope on public.accommodation_properties(status,created_at,id) where status='pending' or orphaned_at is not null;
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
