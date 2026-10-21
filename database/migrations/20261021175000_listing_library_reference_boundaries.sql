-- Independent forward repair for the gated standalone233027 library.
begin;
create function public.listing_shared_media_visible(p_media uuid,p_path text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((select library_enabled from akisuite_listing_private.launch_settings where singleton),false)
 and exists(select 1 from public.venue_media m join public.venue_media_placements p on p.media_id=m.id
 join public.venues v on v.id=p.venue_id
 where ((p_media is not null and m.id=p_media) or (p_media is null and p_path is not null and m.storage_path=p_path))
 and m.venue_id<>p.venue_id and v.status='published' and (
   (p.placement in ('venue_logo','venue_profile','venue_cover','venue_menu','venue_events','venue_explore') and p.target_key='')
   or (p.placement='venue_gallery' and p.target_key='stay_header')
   or (p.placement in ('event_banner','event_explore','event_profile','event_background','event_map_vertical')
    and exists(select 1 from public.events e where e.id::text=p.target_key and e.venue_id=p.venue_id and e.status='published'))));
$$;
revoke all on function public.listing_shared_media_visible(uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.listing_shared_media_visible(uuid,text) to anon,authenticated;
-- Expose only explicitly selected public destination artwork, not private bins,
-- drafts, arbitrary target keys or other images belonging to the source venue.
create policy listing_shared_media_public_read on public.venue_media for select to anon,authenticated
 using(public.listing_shared_media_visible(id,null));
create policy listing_shared_object_public_read on storage.objects for select to anon,authenticated
 using(bucket_id='event-media' and public.listing_shared_media_visible(null,name));

create function akisuite_listing_private.lock_shared_media_reference() returns trigger
language plpgsql security definer set search_path='' as $$
declare path text;
begin
 if not (select library_enabled from akisuite_listing_private.launch_settings where singleton) then return new;end if;
 -- FK/media and Storage row locks serialize both direct deletion races. A delete
 -- that won first makes the reference fail; a reference that won blocks deletion
 -- until its committed placement is visible to the delete trigger.
 select storage_path into path from public.venue_media where id=new.media_id for key share;
 if not found then raise exception 'Media asset no longer exists' using errcode='23503';end if;
 perform 1 from storage.objects where bucket_id='event-media' and name=path for key share;
 if not found then raise exception 'Stored media no longer exists' using errcode='23503';end if;
 return new;
end$$;
revoke all on function akisuite_listing_private.lock_shared_media_reference() from public,anon,authenticated,service_role;
create trigger listing_library_reference_locks before insert or update on public.venue_media_placements
 for each row execute function akisuite_listing_private.lock_shared_media_reference();

create function akisuite_listing_private.protect_referenced_media() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not (select library_enabled from akisuite_listing_private.launch_settings where singleton) then return old;end if;
 -- Preserve the existing explicit whole-venue deletion lifecycle. Once its parent
 -- was intentionally deleted, FK cascades may remove its owned catalogue/media.
 if exists(select 1 from public.venues where id=old.venue_id)
 and exists(select 1 from public.venue_media_placements where media_id=old.id) then
  raise exception 'Remove media placements before deleting the asset' using errcode='23503';
 end if;
 return old;
end$$;
revoke all on function akisuite_listing_private.protect_referenced_media() from public,anon,authenticated,service_role;
create trigger listing_library_reference_delete before delete on public.venue_media
 for each row execute function akisuite_listing_private.protect_referenced_media();

create function akisuite_listing_private.protect_referenced_object() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.bucket_id='event-media' and (select library_enabled from akisuite_listing_private.launch_settings where singleton)
 and exists(select 1 from public.venue_media m join public.venue_media_placements p on p.media_id=m.id where m.storage_path=old.name) then
  raise exception 'Remove media placements before deleting the object' using errcode='23503';
 end if;
 return old;
end$$;
revoke all on function akisuite_listing_private.protect_referenced_object() from public,anon,authenticated,service_role;
create trigger listing_library_object_reference_delete before delete on storage.objects
 for each row execute function akisuite_listing_private.protect_referenced_object();
create index listing_library_media_reference on public.venue_media_placements(media_id);
notify pgrst,'reload schema';
commit;
