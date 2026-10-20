-- Forward-only hardening of170415. Retain every historical event and quota record.
begin;
create index listing_event_month_identity on akisuite_listing_private.listing_event_months(event_id);
create function akisuite_listing_private.guard_event_identity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not coalesce((select enabled from akisuite_listing_private.launch_settings where singleton),false) then return new;end if;
 if tg_op='UPDATE' then
  if new.id is distinct from old.id then raise exception 'Event identity is immutable' using errcode='42501';end if;
 elsif exists(select 1 from akisuite_listing_private.listing_event_months where event_id=new.id) then
  raise exception 'Event identity was previously published and cannot be recreated' using errcode='23505';
 end if;
 return new;
end$$;
revoke all on function akisuite_listing_private.guard_event_identity() from public,anon,authenticated,service_role;
create trigger listing_event_identity before insert or update of id on public.events
 for each row execute function akisuite_listing_private.guard_event_identity();
notify pgrst,'reload schema';
commit;
