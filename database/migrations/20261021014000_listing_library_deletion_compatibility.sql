-- Forward-only compatibility: preserve library snapshots without transferring scope.
-- Deliberately does not delete Storage objects, financial records or quota tombstones.
begin;
alter table public.akisuite_event_templates
 alter column workspace_id drop not null,
 alter column source_venue_id drop not null,
 drop constraint akisuite_event_templates_workspace_id_fkey,
 drop constraint akisuite_event_templates_source_venue_id_fkey,
 add constraint akisuite_event_templates_workspace_id_fkey foreign key(workspace_id) references public.crm_workspaces(id) on delete set null,
 add constraint akisuite_event_templates_source_venue_id_fkey foreign key(source_venue_id) references public.venues(id) on delete set null;
alter table public.akisuite_media_folders
 alter column workspace_id drop not null,
 alter column venue_id drop not null,
 drop constraint akisuite_media_folders_workspace_id_fkey,
 drop constraint akisuite_media_folders_venue_id_fkey,
 add constraint akisuite_media_folders_workspace_id_fkey foreign key(workspace_id) references public.crm_workspaces(id) on delete set null,
 add constraint akisuite_media_folders_venue_id_fkey foreign key(venue_id) references public.venues(id) on delete set null;
-- Receipts are transient upload evidence. Event removal retains its venue image;
-- venue/account erasure removes only their receipts, not business media or objects.
alter table akisuite_listing_private.upload_reservations
 drop constraint upload_reservations_venue_id_fkey,
 drop constraint upload_reservations_event_id_fkey,
 drop constraint upload_reservations_actor_fkey,
 add constraint upload_reservations_venue_id_fkey foreign key(venue_id) references public.venues(id) on delete cascade,
 add constraint upload_reservations_event_id_fkey foreign key(event_id) references public.events(id) on delete set null,
 add constraint upload_reservations_actor_fkey foreign key(actor) references public.profiles(id) on delete cascade;
-- Bound FK cleanup work to the affected parent rather than full-table scans.
create index listing_template_source_venue on public.akisuite_event_templates(source_venue_id);
create index listing_folder_venue on public.akisuite_media_folders(venue_id);
create index listing_upload_actor on akisuite_listing_private.upload_reservations(actor);
create index listing_upload_event on akisuite_listing_private.upload_reservations(event_id);
create index listing_upload_venue on akisuite_listing_private.upload_reservations(venue_id);
-- Existing RPC authorization requires both original workspace and source venue.
-- NULL links archive the row; there are no new grants, policies or rebinding RPCs.
commit;
