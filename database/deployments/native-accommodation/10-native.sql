-- Generated canonical native accommodation deployment phase 10. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create function accommodation_property_private.guard_media() returns trigger language plpgsql security definer set search_path='' as $$
declare r accommodation_property_private.upload_reservations;v_max integer;
begin
 if not public.can_manage_accommodation_property(case when tg_op='DELETE' then old.property_id else new.property_id end) then raise exception 'Property membership required' using errcode='42501';end if;
 if tg_op='DELETE' then return old;end if;
 if new.public_position is not null and (tg_op='INSERT' or new.public_position is distinct from old.public_position) and new.public_position>=(case when accommodation_property_private.premium(new.property_id) then 250 else 8 end) then raise exception 'Gallery position allowance exceeded' using errcode='PT402';end if;
 if tg_op='UPDATE' then
 if new.id is distinct from old.id or new.property_id is distinct from old.property_id or new.storage_path is distinct from old.storage_path or new.mime_type is distinct from old.mime_type or new.size_bytes is distinct from old.size_bytes or new.created_at is distinct from old.created_at then raise exception 'Media identity immutable' using errcode='42501';end if;return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(new.property_id::text,8));
 update public.accommodation_properties set updated_at=updated_at where id=new.property_id;
 select * into r from accommodation_property_private.upload_reservations where storage_path=new.storage_path for update;
 if not found or r.actor<>auth.uid() or r.property_id<>new.property_id or r.state<>'uploaded' or r.expires_at<=now() then raise exception 'Verified owner receipt required' using errcode='42501';end if;
 v_max:=case when accommodation_property_private.premium(new.property_id) then 3840 else 1920 end;
 if greatest(r.width,r.height)>v_max then raise exception 'Image resolution allowance changed' using errcode='PT402';end if;
 if (select count(*) from public.accommodation_property_media where property_id=new.property_id)>=(case when accommodation_property_private.premium(new.property_id) then 250 else 8 end) then raise exception 'Media allowance exceeded' using errcode='PT402';end if;
 if not exists(select 1 from storage.objects where bucket_id='accommodation-media' and name=r.storage_path and metadata->>'size'=r.size_bytes::text and user_metadata->>'sha256'=r.digest and user_metadata->>'accommodation_upload_id'=r.id::text) then raise exception 'Stored bytes mismatch';end if;
 new.mime_type:=r.mime_type;new.size_bytes:=r.size_bytes;
 update accommodation_property_private.upload_reservations set state='committed',media_id=new.id where id=r.id;return new;
end $$;
revoke all on function accommodation_property_private.guard_media() from public,anon,authenticated,service_role;
create trigger accommodation_verified_media before insert or update or delete on public.accommodation_property_media for each row execute function accommodation_property_private.guard_media();
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
