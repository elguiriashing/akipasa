-- Activate only after both management deployments use the reserved service path.
-- No Storage metadata is mutated by SQL; object writes/deletes use the Storage API.
begin;
alter table akisuite_listing_private.launch_settings add column uploads_enforced boolean not null default false;
alter table akisuite_listing_private.launch_settings add constraint listing_uploads_require_limits check(not uploads_enforced or enabled);
create table akisuite_listing_private.upload_reservations (
 id uuid primary key default gen_random_uuid(),
 venue_id uuid not null references public.venues(id),
 actor uuid not null references public.profiles(id),
 event_id uuid references public.events(id),
 storage_path text not null unique,
 digest text not null check(digest ~ '^[0-9a-f]{64}$'),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
 size_bytes integer not null check(size_bytes between 1 and 10485760),
 width integer not null check(width between 1 and 3840),
 height integer not null check(height between 1 and 3840),
 state text not null default 'pending' check(state in ('pending','uploaded','committed','failed')),
 media_id uuid unique,
 expires_at timestamptz not null default now()+interval '15 minutes',
 created_at timestamptz not null default now(),
 committed_at timestamptz
);
alter table akisuite_listing_private.upload_reservations enable row level security;
revoke all on akisuite_listing_private.upload_reservations from public,anon,authenticated;
create index listing_upload_live on akisuite_listing_private.upload_reservations(venue_id,expires_at) where state in ('pending','uploaded');

create or replace function public.listing_limits_info(p_venue uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_premium boolean;
begin
 if (select auth.uid()) is null or not public.is_venue_member(p_venue) then raise exception 'Venue membership required' using errcode='42501'; end if;
 v_premium:=akisuite_listing_private.listing_premium(p_venue);
 return jsonb_build_object('enabled',(select enabled from akisuite_listing_private.launch_settings where singleton),
  'uploads_enforced',(select uploads_enforced from akisuite_listing_private.launch_settings where singleton),
  'premium',v_premium,'photos',case when v_premium then 250 else 8 end);
end;
$$;
revoke all on function public.listing_limits_info(uuid) from public,anon;
grant execute on function public.listing_limits_info(uuid) to authenticated;

create function public.reserve_listing_upload(p_venue uuid,p_digest text,p_mime text,p_bytes integer,p_width integer,p_height integer,p_event uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_id uuid:=gen_random_uuid(); v_path text; v_count bigint; v_bytes bigint; v_premium boolean; v_limit integer;
begin
 if not (select uploads_enforced and enabled from akisuite_listing_private.launch_settings where singleton) then raise exception 'Reserved uploads not active'; end if;
 if (select auth.uid()) is null or not public.is_venue_member(p_venue) then raise exception 'Venue membership required' using errcode='42501'; end if;
 if p_event is not null and not exists(select 1 from public.events where id=p_event and venue_id=p_venue) then raise exception 'Event listing mismatch' using errcode='42501'; end if;
 if p_digest is null or p_digest !~ '^[0-9a-f]{64}$' or p_mime is null or p_mime not in ('image/jpeg','image/png','image/webp')
  or p_bytes is null or p_bytes not between 1 and 10485760 or p_width is null or p_height is null or least(p_width,p_height)<1 then raise exception 'Invalid image evidence'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_venue::text,2));
 v_premium:=akisuite_listing_private.listing_premium(p_venue);v_limit:=case when v_premium then 250 else 8 end;
 if greatest(p_width,p_height)>(case when v_premium then 3840 else 1920 end) then raise exception 'Image resolution allowance exceeded' using errcode='PT402'; end if;
 -- Union paths prevents double counting while a reservation becomes an object/media row.
 select count(*),coalesce(sum(bytes),0) into v_count,v_bytes from (
  select path,max(bytes) as bytes from (
   select m.storage_path as path,m.size_bytes::bigint as bytes from public.venue_media m where m.venue_id=p_venue
   union all select o.name,case when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 10485760 end from storage.objects o where o.bucket_id='event-media' and split_part(o.name,'/',1)=p_venue::text
   union all select r.storage_path,r.size_bytes::bigint from akisuite_listing_private.upload_reservations r where r.venue_id=p_venue and r.state in ('pending','uploaded') and r.expires_at>now()
  ) paths group by path
 ) accounted;
 if v_count>=v_limit or v_bytes+p_bytes>(case when v_premium then 1073741824 else 157286400 end) then raise exception 'Media allowance exceeded' using errcode='PT402'; end if;
 v_path:=p_venue::text||case when p_event is null then '/' else '/events/'||p_event::text||'/' end||v_id::text||case p_mime when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.webp' end;
 insert into akisuite_listing_private.upload_reservations(id,venue_id,actor,event_id,storage_path,digest,mime_type,size_bytes,width,height)
 values(v_id,p_venue,auth.uid(),p_event,v_path,p_digest,p_mime,p_bytes,p_width,p_height);
 return jsonb_build_object('id',v_id,'path',v_path);
end;
$$;
revoke all on function public.reserve_listing_upload(uuid,text,text,integer,integer,integer,uuid) from public,anon;
grant execute on function public.reserve_listing_upload(uuid,text,text,integer,integer,integer,uuid) to authenticated;

create function public.complete_listing_upload(p_reservation uuid,p_digest text) returns boolean
language plpgsql security definer set search_path='' as $$
declare r akisuite_listing_private.upload_reservations; o storage.objects;
begin
 select * into r from akisuite_listing_private.upload_reservations where id=p_reservation for update;
 if not found or r.state not in ('pending','uploaded') or r.expires_at<=now() or p_digest is distinct from r.digest then raise exception 'Invalid upload receipt'; end if;
 if not exists(select 1 from public.venue_members where venue_id=r.venue_id and profile_id=r.actor)
  and not exists(select 1 from public.profiles where id=r.actor and app_role='administrator') then raise exception 'Membership revoked' using errcode='42501'; end if;
 select * into o from storage.objects where bucket_id='event-media' and name=r.storage_path;
 if not found or o.metadata->>'size' is distinct from r.size_bytes::text or o.metadata->>'mimetype' is distinct from r.mime_type
  or o.user_metadata->>'listing_upload_id' is distinct from r.id::text or o.user_metadata->>'sha256' is distinct from r.digest then raise exception 'Stored bytes evidence mismatch'; end if;
 update akisuite_listing_private.upload_reservations set state='uploaded' where id=r.id;
 return true;
end;
$$;
revoke all on function public.complete_listing_upload(uuid,text) from public,anon,authenticated;
grant execute on function public.complete_listing_upload(uuid,text) to service_role;

create function public.cancel_listing_upload(p_reservation uuid) returns boolean
language plpgsql security definer set search_path='' as $$
declare r akisuite_listing_private.upload_reservations;
begin
 select * into r from akisuite_listing_private.upload_reservations where id=p_reservation for update;
 if not found or r.state='committed' then return false; end if;
 update akisuite_listing_private.upload_reservations set state='failed' where id=r.id;
 return true;
end;
$$;
revoke all on function public.cancel_listing_upload(uuid) from public,anon,authenticated;
grant execute on function public.cancel_listing_upload(uuid) to service_role;

create function public.listing_storage_client_write_allowed(p_bucket text) returns boolean
language sql stable security definer set search_path='' as $$
 select p_bucket<>'event-media' or not coalesce((select uploads_enforced from akisuite_listing_private.launch_settings where singleton),false)
$$;
revoke all on function public.listing_storage_client_write_allowed(text) from public,anon;
grant execute on function public.listing_storage_client_write_allowed(text) to authenticated;
create policy listing_reserved_storage_insert on storage.objects as restrictive for insert to authenticated
 with check(public.listing_storage_client_write_allowed(bucket_id));
create policy listing_reserved_storage_update on storage.objects as restrictive for update to authenticated
 using(public.listing_storage_client_write_allowed(bucket_id)) with check(public.listing_storage_client_write_allowed(bucket_id));

create function akisuite_listing_private.guard_upload_receipt() returns trigger
language plpgsql security definer set search_path='' as $$
declare r akisuite_listing_private.upload_reservations; v_max integer;
begin
 if not (select uploads_enforced from akisuite_listing_private.launch_settings where singleton) then return new; end if;
 if tg_op='UPDATE' then
  if new.venue_id is distinct from old.venue_id or new.storage_path is distinct from old.storage_path then raise exception 'Stored media identity is immutable' using errcode='42501'; end if;
  new.size_bytes:=old.size_bytes;new.mime_type:=old.mime_type;return new;
 end if;
 if auth.uid() is null or not public.is_venue_member(new.venue_id) then raise exception 'Venue membership required' using errcode='42501'; end if;
 select * into r from akisuite_listing_private.upload_reservations where storage_path=new.storage_path for update;
 if not found or r.venue_id<>new.venue_id or r.actor<>auth.uid() or r.state<>'uploaded' or r.expires_at<=now() then raise exception 'Verified owner upload receipt required' using errcode='42501'; end if;
 v_max:=case when akisuite_listing_private.listing_premium(new.venue_id) then 3840 else 1920 end;
 if greatest(r.width,r.height)>v_max then raise exception 'Image resolution allowance changed' using errcode='PT402'; end if;
 if not exists(select 1 from storage.objects where bucket_id='event-media' and name=r.storage_path and metadata->>'size'=r.size_bytes::text and user_metadata->>'sha256'=r.digest and user_metadata->>'listing_upload_id'=r.id::text) then raise exception 'Stored bytes evidence mismatch'; end if;
 new.size_bytes:=r.size_bytes;new.mime_type:=r.mime_type;
 update akisuite_listing_private.upload_reservations set state='committed',media_id=new.id,committed_at=now() where id=r.id;
 return new;
end;
$$;
revoke all on function akisuite_listing_private.guard_upload_receipt() from public,anon,authenticated;
create trigger listing_verified_upload before insert or update on public.venue_media for each row execute function akisuite_listing_private.guard_upload_receipt();
notify pgrst,'reload schema';
commit;
