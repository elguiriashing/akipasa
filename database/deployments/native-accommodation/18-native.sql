-- Generated canonical native accommodation deployment phase 18. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create function public.accommodation_property_change_status(p_reservation uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$
declare r public.accommodation_property_reservations;
begin
 select * into r from public.accommodation_property_reservations where id=p_reservation for update;
 if not found or not public.can_manage_accommodation_inventory(r.property_id) then raise exception 'Property membership required' using errcode='42501';end if;
 if p_status=r.status then return;end if;
 if not ((r.status='requested' and p_status in ('confirmed','declined','cancelled')) or (r.status='confirmed' and p_status in ('checked_in','cancelled')) or (r.status='checked_in' and p_status='completed')) then raise exception 'Invalid native reservation transition';end if;
 update public.accommodation_property_reservations set status=p_status,updated_at=now() where id=r.id;
 insert into accommodation_property_private.audit(property_id,actor,action,detail) values(r.property_id,auth.uid(),'reservation_status',jsonb_build_object('reservation',r.id,'from',r.status,'to',p_status));
end $$;
revoke all on function public.accommodation_property_change_status(uuid,text) from public,anon;
grant execute on function public.accommodation_property_change_status(uuid,text) to authenticated;
revoke all on function public.accommodation_property_change_status(uuid,text) from public,anon;
grant execute on function public.accommodation_property_change_status(uuid,text) to authenticated;
alter table public.accommodation_property_room_types enable row level security;
revoke all on public.accommodation_property_room_types from public,anon,authenticated;
grant select,insert,update,delete on public.accommodation_property_room_types to authenticated;
create policy native_room_types_owner on public.accommodation_property_room_types for all to authenticated using(public.can_manage_accommodation_inventory(property_id)) with check(public.can_manage_accommodation_inventory(property_id));
create trigger native_room_types_identity before update on public.accommodation_property_room_types for each row execute function accommodation_property_private.inventory_identity();
alter table public.accommodation_property_units enable row level security;
revoke all on public.accommodation_property_units from public,anon,authenticated;
grant select,insert,update,delete on public.accommodation_property_units to authenticated;
create policy native_units_owner on public.accommodation_property_units for all to authenticated using(public.can_manage_accommodation_inventory(property_id)) with check(public.can_manage_accommodation_inventory(property_id));
create trigger native_units_identity before update on public.accommodation_property_units for each row execute function accommodation_property_private.inventory_identity();
alter table public.accommodation_property_nightly_rates enable row level security;
revoke all on public.accommodation_property_nightly_rates from public,anon,authenticated;
grant select,insert,update,delete on public.accommodation_property_nightly_rates to authenticated;
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
