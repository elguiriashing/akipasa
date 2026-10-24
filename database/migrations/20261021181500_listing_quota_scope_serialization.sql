-- Forward-only RR safety for the canonical170415/173552/233027 count guards.
begin;
create table akisuite_listing_private.quota_scopes(
 venue_id uuid not null references public.venues(id) on delete cascade,
 channel integer not null check(channel in(2,17)),
 revision bigint not null default 1,
 primary key(venue_id,channel)
);
alter table akisuite_listing_private.quota_scopes enable row level security;
revoke all on akisuite_listing_private.quota_scopes from public,anon,authenticated,service_role;
create function akisuite_listing_private.claim_quota_scope(p_venue uuid,p_channel integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into akisuite_listing_private.quota_scopes(venue_id,channel) values(p_venue,p_channel)
 on conflict(venue_id,channel) do update set revision=akisuite_listing_private.quota_scopes.revision+1;
end$$;
revoke all on function akisuite_listing_private.claim_quota_scope(uuid,integer) from public,anon,authenticated,service_role;
-- Preserve every installed function body, authorization wrapper, owner, OID and
-- ACL. Refuse unknown versions instead of replacing them with a stale source copy.
do $$
declare r record;f record;definition text;anchor text;patched text;n integer;
begin
 for r in select * from (values
  ('akisuite_listing_private.enforce_listing_event(uuid)','v_event.venue_id::text','v_event.venue_id',17),
  ('akisuite_listing_private.guard_media_quota()','v_scope','new.venue_id',2),
  ('public.akisuite_listing_storage_upload_allowed(text)','v::text','v',2),
  ('akisuite_listing_private.reserve_listing_upload_legacy(uuid,text,text,integer,integer,integer,uuid)','p_venue::text','p_venue',2),
  ('akisuite_listing_private.guard_library_media()','new.venue_id::text','new.venue_id',2),
  ('akisuite_listing_private.guard_library_placement()','new.venue_id::text','new.venue_id',2)
 ) as targets(identity,lock_scope,venue_scope,channel) loop
  select oid,proowner,proacl,proconfig,prosecdef,provolatile into f from pg_proc where oid=to_regprocedure(r.identity);
  if not found or not f.prosecdef or f.provolatile<>'v' then raise exception 'Unknown quota function contract: %',r.identity;end if;
  if not has_function_privilege(f.proowner,'akisuite_listing_private.claim_quota_scope(uuid,integer)'::regprocedure,'EXECUTE')
    or not has_schema_privilege(f.proowner,'akisuite_listing_private','USAGE') then
   raise exception 'Installed quota function owner cannot execute private scope helper: %',r.identity;
  end if;
  definition:=pg_get_functiondef(f.oid);
  if strpos(definition,'akisuite_listing_private.claim_quota_scope(')>0 then raise exception 'Quota function already patched: %',r.identity;end if;
  anchor:='perform pg_advisory_xact_lock(hashtextextended('||r.lock_scope||','||r.channel||'));';
  n:=(length(definition)-length(replace(definition,anchor,'')))/length(anchor);
  if n<>1 then raise exception 'Expected exactly one canonical quota anchor in %, found %',r.identity,n;end if;
  patched:=replace(definition,anchor,anchor||E'\n perform akisuite_listing_private.claim_quota_scope('||r.venue_scope||','||r.channel||');');
  execute patched;
  if exists(select 1 from pg_proc p where p.oid=f.oid and
    (p.proowner is distinct from f.proowner or p.proacl is distinct from f.proacl or p.proconfig is distinct from f.proconfig
      or p.prosecdef is distinct from f.prosecdef or p.provolatile is distinct from f.provolatile)) then
   raise exception 'Quota function metadata changed: %',r.identity;
  end if;
 end loop;
end$$;
-- No backfill or activation: first mutation creates its scope under the existing
-- advisory key. RR conflicts fail40001 and must retry with a fresh transaction.
notify pgrst,'reload schema';
commit;
