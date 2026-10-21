-- Structural tenant boundary, independent of listing/Premium activation.
-- Retain historical mismatches; new/edited event placements must match their venue.
begin;
create function public.guard_event_media_target_scope() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if left(new.placement::text,6)='event_' then
  if auth.uid() is not null and not public.is_venue_member(new.venue_id)
    and not public.has_platform_role(array['moderator','administrator']::public.app_role[]) then
   raise exception 'Event media venue permission required' using errcode='42501';
  end if;
  if new.target_key is null or new.target_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
   raise exception 'Event media target must identify its venue event' using errcode='42501';
  end if;
  if not exists(select 1 from public.events e where e.id=new.target_key::uuid and e.venue_id=new.venue_id) then
   raise exception 'Event media target belongs to another venue or no longer exists' using errcode='42501';
  end if;
 end if;
 return new;
end$$;
revoke all on function public.guard_event_media_target_scope() from public,anon,authenticated,service_role;
create trigger event_media_target_scope before insert or update on public.venue_media_placements
 for each row execute function public.guard_event_media_target_scope();
notify pgrst,'reload schema';
commit;
