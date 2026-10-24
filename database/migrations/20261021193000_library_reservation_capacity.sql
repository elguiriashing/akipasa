-- The enhanced library shares capacity with live upload reservations and objects.
begin;
create function akisuite_listing_private.check_placement_capacity(p_venue uuid,p_media uuid) returns void
language plpgsql security definer set search_path='' as $$
declare path text;size bigint;all_photos bigint;other_photos bigint;other_bytes bigint;premium boolean;
begin
 select storage_path,size_bytes into path,size from public.venue_media where id=p_media;
 if not found then raise exception 'Media access required' using errcode='42501';end if;
 select photos into all_photos from akisuite_listing_private.media_usage(p_venue,null);
 select photos,total_bytes into other_photos,other_bytes from akisuite_listing_private.media_usage(p_venue,path);
 -- An already-counted path adds no capacity. Preserve historical over-quota
 -- associations and repeated placements without granting any new unique image.
 if other_photos<all_photos then return;end if;
 premium:=akisuite_listing_private.listing_premium(p_venue);
 if other_photos+1>(case when premium then 250 else 8 end) or other_bytes+size>(case when premium then 1073741824 else 157286400 end) then raise exception 'Media allowance exceeded' using errcode='PT402';end if;
end$$;
revoke all on function akisuite_listing_private.check_placement_capacity(uuid,uuid) from public,anon,authenticated,service_role;
do $patch$
declare f record;definition text;anchor text;n integer;
begin
 select oid,proowner,proacl,proconfig,prosecdef,provolatile into f from pg_proc where oid=to_regprocedure('akisuite_listing_private.guard_library_placement()');
 if not found or not f.prosecdef or f.provolatile<>'v' then raise exception 'Unknown library placement function contract';end if;
 if not has_function_privilege(f.proowner,'akisuite_listing_private.check_placement_capacity(uuid,uuid)'::regprocedure,'EXECUTE') then raise exception 'Installed owner cannot execute private capacity helper';end if;
 definition:=pg_get_functiondef(f.oid);
 anchor:='perform akisuite_listing_private.claim_quota_scope(new.venue_id,2);';
 n:=(length(definition)-length(replace(definition,anchor,'')))/length(anchor);
 if n<>1 or strpos(definition,'akisuite_listing_private.check_placement_capacity(')>0 then raise exception 'Expected canonical RR-safe library placement guard';end if;
 execute replace(definition,anchor,anchor||E'\n perform akisuite_listing_private.check_placement_capacity(new.venue_id,new.media_id);');
 if exists(select 1 from pg_proc p where p.oid=f.oid and (p.proowner is distinct from f.proowner or p.proacl is distinct from f.proacl or p.proconfig is distinct from f.proconfig or p.prosecdef is distinct from f.prosecdef or p.provolatile is distinct from f.provolatile)) then raise exception 'Library placement function metadata changed';end if;
end$patch$;
notify pgrst,'reload schema';
commit;
