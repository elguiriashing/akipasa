-- Preserve retained shared placements, but never transfer their identity to new media.
begin;
create index listing_retained_media_identity on akisuite_listing_private.retained_media_reuse(media_id);
create function akisuite_listing_private.guard_library_media_identity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not coalesce((select library_enabled from akisuite_listing_private.launch_settings where singleton),false) then return new;end if;
 if tg_op='UPDATE' then
  if new.id is distinct from old.id then raise exception 'Media identity is immutable' using errcode='42501';end if;
 elsif exists(select 1 from akisuite_listing_private.retained_media_reuse where media_id=new.id) then
  raise exception 'Retained media identity cannot be recreated' using errcode='23505';
 end if;
 return new;
end $$;
revoke all on function akisuite_listing_private.guard_library_media_identity() from public,anon,authenticated,service_role;
create trigger listing_library_media_identity before insert or update of id on public.venue_media for each row execute function akisuite_listing_private.guard_library_media_identity();
notify pgrst,'reload schema';
commit;
