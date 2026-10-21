-- Generated canonical native accommodation deployment phase 08. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
create function public.reserve_accommodation_upload(p_property uuid,p_digest text,p_mime text,p_bytes integer,p_width integer,p_height integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=gen_random_uuid();v_path text;v_count bigint;v_premium boolean;
begin
 if not public.can_manage_accommodation_property(p_property) or not (select uploads_enforced from accommodation_property_private.launch_settings where singleton) then raise exception 'Property uploads unavailable' using errcode='42501';end if;
 if p_digest is null or p_digest !~ '^[0-9a-f]{64}$' or p_mime is null or p_mime not in ('image/jpeg','image/png','image/webp') or p_bytes is null or p_bytes not between 1 and 10485760 or p_width is null or p_height is null or least(p_width,p_height)<1 then raise exception 'Invalid image evidence';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_property::text,8));
 -- Touch the scope row: a stale REPEATABLE READ snapshot must serialize, not over-reserve.
 update public.accommodation_properties set updated_at=updated_at where id=p_property;
 v_premium:=accommodation_property_private.premium(p_property);
 if greatest(p_width,p_height)>(case when v_premium then 3840 else 1920 end) then raise exception 'Image resolution allowance exceeded' using errcode='PT402';end if;
 select count(*) into v_count from (
 select storage_path from public.accommodation_property_media where property_id=p_property
 union select name from storage.objects where bucket_id='accommodation-media' and split_part(name,'/',1)=p_property::text
 union select storage_path from accommodation_property_private.upload_reservations where property_id=p_property and state in ('pending','uploaded') and expires_at>now())x;
 if v_count>=(case when v_premium then 250 else 8 end) then raise exception 'Media allowance exceeded' using errcode='PT402';end if;
 v_path:=p_property::text||'/'||v_id::text||case p_mime when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.webp' end;
 insert into accommodation_property_private.upload_reservations(id,property_id,actor,storage_path,digest,mime_type,size_bytes,width,height) values(v_id,p_property,auth.uid(),v_path,p_digest,p_mime,p_bytes,p_width,p_height);
 return jsonb_build_object('id',v_id,'path',v_path);
end $$;
revoke all on function public.reserve_accommodation_upload(uuid,text,text,integer,integer,integer) from public,anon;
grant execute on function public.reserve_accommodation_upload(uuid,text,text,integer,integer,integer) to authenticated;
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
