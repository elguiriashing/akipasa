-- Count historical shared placements independently of the enhanced-library launch.
-- Requires the forward RR scope serialization migration181500; no activation.
begin;
create function akisuite_listing_private.media_usage(p_venue uuid,p_exclude_path text default null)
returns table(photos bigint,total_bytes bigint) language plpgsql security definer set search_path='' as $$
begin
 return query select count(*),coalesce(sum(assets.size),0)::bigint from (
  select path,max(size) size from (
   select m.storage_path path,m.size_bytes::bigint size from public.venue_media m where m.venue_id=p_venue
   union all select m.storage_path,m.size_bytes::bigint from public.venue_media_placements p join public.venue_media m on m.id=p.media_id where p.venue_id=p_venue
   union all select name,case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 10485760 end from storage.objects where bucket_id='event-media' and split_part(name,'/',1)=p_venue::text
   union all select storage_path,size_bytes::bigint from akisuite_listing_private.upload_reservations where venue_id=p_venue and state in ('pending','uploaded') and expires_at>now()
  ) all_assets where p_exclude_path is null or path<>p_exclude_path group by path
 ) assets;
end$$;
revoke all on function akisuite_listing_private.media_usage(uuid,text) from public,anon,authenticated,service_role;
-- Preserve installed authorization and metadata, and reject unexpected versions.
do $patch$
declare r record;f record;definition text;n integer;
begin
 if to_regprocedure('akisuite_listing_private.claim_quota_scope(uuid,integer)') is null then raise exception 'Quota scope serialization prerequisite missing';end if;
 for r in select * from (values
  ($identity$public.reserve_listing_upload(uuid,text,text,integer,integer,integer,uuid)$identity$,$old$ select count(*),coalesce(sum(size),0) into n,bytes from (
  select path,max(size) size from (
   select m.storage_path path,m.size_bytes::bigint size from public.venue_media m where m.venue_id=p_venue
   union all select m.storage_path,m.size_bytes::bigint from public.venue_media_placements p join public.venue_media m on m.id=p.media_id where p.venue_id=p_venue
   union all select name,case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 10485760 end from storage.objects where bucket_id='event-media' and split_part(name,'/',1)=p_venue::text
   union all select storage_path,size_bytes::bigint from akisuite_listing_private.upload_reservations where venue_id=p_venue and state in ('pending','uploaded') and expires_at>now()
  ) assets group by path
 ) unique_assets;$old$,$new$ select photos,total_bytes into n,bytes from akisuite_listing_private.media_usage(p_venue,null);$new$),
  ($identity$public.akisuite_listing_storage_upload_allowed(text)$identity$,$old$ select count(*),coalesce(sum(size),0) into n,bytes from (
  select path,max(size) size from (
   select name path,case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 10485760 end size from storage.objects where bucket_id='event-media' and split_part(name,'/',1)=v::text
   union all select m.storage_path,m.size_bytes::bigint from public.venue_media m where m.venue_id=v and (select library_enabled from akisuite_listing_private.launch_settings where singleton)
   union all select m.storage_path,m.size_bytes::bigint from public.venue_media_placements p join public.venue_media m on m.id=p.media_id where p.venue_id=v and (select library_enabled from akisuite_listing_private.launch_settings where singleton)
  ) assets where path<>p_name group by path
 ) unique_assets;$old$,$new$ select photos,total_bytes into n,bytes from akisuite_listing_private.media_usage(v,p_name);$new$),
  ($identity$public.reserve_listing_upload(uuid,text,text,integer,integer,integer,uuid)$identity$,$old$ if not (select library_enabled from akisuite_listing_private.launch_settings where singleton) then return result;end if;$old$,$new$$new$),
  ($identity$akisuite_listing_private.guard_media_quota()$identity$,$old$  return new;
end;$old$,$new$  select photos,total_bytes into v_count,v_bytes from akisuite_listing_private.media_usage(new.venue_id,null);
  if v_count>v_limit or v_bytes>(case when v_limit=250 then 1073741824 else 157286400 end) then raise exception 'media allowance exceeded' using errcode='PT402';end if;
  return new;
end;$new$)
 ) targets(identity,old_body,new_body) loop
  select oid,proowner,proacl,proconfig,prosecdef,provolatile into f from pg_proc where oid=to_regprocedure(r.identity);
  if not found or not f.prosecdef or f.provolatile<>'v' then raise exception 'Unknown media quota function contract: %',r.identity;end if;
  if not has_function_privilege(f.proowner,'akisuite_listing_private.media_usage(uuid,text)'::regprocedure,'EXECUTE') or not has_schema_privilege(f.proowner,'akisuite_listing_private','USAGE') then raise exception 'Installed owner cannot execute private media accounting';end if;
  definition:=pg_get_functiondef(f.oid);
  n:=(length(definition)-length(replace(definition,r.old_body,'')))/length(r.old_body);
  if n<>1 then raise exception 'Expected one canonical media accounting anchor in %, found %',r.identity,n;end if;
  execute replace(definition,r.old_body,r.new_body);
  if exists(select 1 from pg_proc p where p.oid=f.oid and (p.proowner is distinct from f.proowner or p.proacl is distinct from f.proacl or p.proconfig is distinct from f.proconfig or p.prosecdef is distinct from f.prosecdef or p.provolatile is distinct from f.provolatile)) then raise exception 'Media quota metadata changed: %',r.identity;end if;
 end loop;
end$patch$;
-- Existing cross-venue associations remain readable/editable. New associations
-- require the guarded enhanced library; the free baseline cannot import arbitrary
-- public assets to bypass its own-media and upload allowance.
create function akisuite_listing_private.guard_baseline_media_source() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not (select enabled and not library_enabled from akisuite_listing_private.launch_settings where singleton) then return new;end if;
 if tg_op='UPDATE' then
  if new.venue_id=old.venue_id and new.media_id=old.media_id then return new;end if;
 end if;
 if not exists(select 1 from public.venue_media m where m.id=new.media_id and m.venue_id=new.venue_id) then raise exception 'Enhanced media library required for cross-listing media reuse' using errcode='42501';end if;
 return new;
end$$;
revoke all on function akisuite_listing_private.guard_baseline_media_source() from public,anon,authenticated,service_role;
create trigger akisuite_baseline_media_source before insert or update on public.venue_media_placements for each row execute function akisuite_listing_private.guard_baseline_media_source();
notify pgrst,'reload schema';
commit;
