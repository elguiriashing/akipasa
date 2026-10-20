-- Standalone listing library; depends on170415 and173552. No historical billing bundle.
begin;
alter table akisuite_listing_private.launch_settings add column library_enabled boolean not null default false;
alter table akisuite_listing_private.launch_settings add constraint listing_library_requires_limits check(not library_enabled or enabled);
-- This is an independent forward contract; an installed historical library must be reconciled first.
do $$begin if to_regclass('public.akisuite_event_templates') is not null or to_regclass('public.akisuite_media_folders') is not null then raise exception 'Existing library requires explicit historical reconciliation';end if;end$$;
create function akisuite_listing_private.venue_workspace(p_venue uuid) returns text
language sql stable security definer set search_path='' as $$
 select w.id from public.crm_workspaces w join public.crm_workspace_venues l on l.workspace_id=w.id
 where l.venue_id=p_venue and w.id<>'ws_akipasa' and w.status in ('active','trial')
 and exists(select 1 from public.venue_members m where m.venue_id=p_venue and m.profile_id=w.owner_profile_id and m.role='owner')
 order by (w.source_venue_id=p_venue) desc,w.id limit 1
$$;
revoke all on function akisuite_listing_private.venue_workspace(uuid) from public,anon,authenticated;
create function akisuite_listing_private.library_access(p_venue uuid,p_require_premium boolean default true) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.is_venue_member(p_venue)
 and coalesce((select library_enabled from akisuite_listing_private.launch_settings where singleton),false)
 and (not p_require_premium or akisuite_listing_private.listing_premium(p_venue))
 and exists(select 1 from public.crm_workspace_members m where m.workspace_id=akisuite_listing_private.venue_workspace(p_venue) and m.profile_id=auth.uid() and m.status='active')
$$;
revoke all on function akisuite_listing_private.library_access(uuid,boolean) from public,anon,authenticated;
create table public.akisuite_event_templates(
 id uuid primary key default gen_random_uuid(),workspace_id text not null references public.crm_workspaces(id),
 source_venue_id uuid not null references public.venues(id),name text not null check(length(btrim(name)) between 2 and 100),
 source_event_id uuid references public.events(id) on delete set null,
 template_document jsonb not null check(jsonb_typeof(template_document)='object' and length(template_document::text)<=100000),
 created_by uuid references public.profiles(id) on delete set null,created_at timestamptz not null default now(),
 unique(workspace_id,source_venue_id,name)
);
alter table public.akisuite_event_templates enable row level security;
revoke all on public.akisuite_event_templates from public,anon,authenticated,service_role;
grant select on public.akisuite_event_templates to authenticated;
-- Raw rows remain private: consumers use bounded member-scoped RPCs only.
create table public.akisuite_media_folders(
 id uuid primary key default gen_random_uuid(),workspace_id text not null references public.crm_workspaces(id),
 venue_id uuid not null references public.venues(id),name text not null check(length(btrim(name)) between 1 and 80),
 unique(workspace_id,venue_id,name)
);
alter table public.akisuite_media_folders enable row level security;
revoke all on public.akisuite_media_folders from public,anon,authenticated,service_role;
grant select on public.akisuite_media_folders to authenticated;
alter table public.venue_media add column akisuite_folder_id uuid references public.akisuite_media_folders(id) on delete set null;
create table akisuite_listing_private.retained_media_reuse(
 venue_id uuid not null,media_id uuid not null,placement text not null,target_key text not null,
 primary key(venue_id,media_id,placement,target_key)
);
alter table akisuite_listing_private.retained_media_reuse enable row level security;
revoke all on akisuite_listing_private.retained_media_reuse from public,anon,authenticated,service_role;
insert into akisuite_listing_private.retained_media_reuse
 select distinct p.venue_id,p.media_id,p.placement::text,coalesce(p.target_key,'') from public.venue_media_placements p
 join public.venue_media m on m.id=p.media_id where m.venue_id<>p.venue_id
 and akisuite_listing_private.venue_workspace(p.venue_id) is not null
 and akisuite_listing_private.venue_workspace(p.venue_id)=akisuite_listing_private.venue_workspace(m.venue_id);

create function public.save_akisuite_event_template(p_event uuid,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare e public.events; result uuid; w text;
begin
 select * into e from public.events where id=p_event;
 if not found or not akisuite_listing_private.library_access(e.venue_id) then raise exception 'Listing Premium and scoped membership required' using errcode='42501';end if;
 if p_name is null or length(btrim(p_name)) not between 2 and 100 then raise exception 'Invalid template name';end if;
 w:=akisuite_listing_private.venue_workspace(e.venue_id);
 insert into public.akisuite_event_templates(workspace_id,source_venue_id,name,source_event_id,created_by,template_document)
 values(w,e.venue_id,btrim(p_name),e.id,auth.uid(),jsonb_build_object('title_es',e.title_es,'title_en',e.title_en,'description_es',e.description_es,'description_en',e.description_en,'category_id',e.category_id,'price_cents',e.price_cents,'currency',e.currency,'booking_url',e.booking_url))
 on conflict(workspace_id,source_venue_id,name) do update set source_event_id=excluded.source_event_id,template_document=excluded.template_document returning id into result;
 return result;
end$$;
revoke all on function public.save_akisuite_event_template(uuid,text) from public,anon,service_role;
grant execute on function public.save_akisuite_event_template(uuid,text) to authenticated;
create function public.akisuite_templates_for_venue(p_venue uuid) returns table(id uuid,name text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not akisuite_listing_private.library_access(p_venue,false) then raise exception 'Scoped venue access required' using errcode='42501';end if;
 return query select t.id,t.name from public.akisuite_event_templates t where t.workspace_id=akisuite_listing_private.venue_workspace(p_venue)
 and akisuite_listing_private.library_access(t.source_venue_id,false) order by t.name,t.id limit 100;
end$$;
revoke all on function public.akisuite_templates_for_venue(uuid) from public,anon,service_role;
grant execute on function public.akisuite_templates_for_venue(uuid) to authenticated;
create function public.create_akisuite_event_from_template(p_template uuid,p_venue uuid,p_slug text) returns uuid
language plpgsql security definer set search_path='' as $$
declare t public.akisuite_event_templates; d jsonb; result uuid:=gen_random_uuid();
begin
 if not akisuite_listing_private.library_access(p_venue) then raise exception 'Listing Premium and scoped membership required' using errcode='42501';end if;
 select * into t from public.akisuite_event_templates where id=p_template;
 if not found or t.workspace_id is distinct from akisuite_listing_private.venue_workspace(p_venue) or not akisuite_listing_private.library_access(t.source_venue_id,false) then raise exception 'Template access required' using errcode='42501';end if;
 if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug)>150 then raise exception 'Invalid slug';end if;
 d:=t.template_document;
 insert into public.events(id,venue_id,slug,title_es,title_en,description_es,description_en,category_id,price_cents,currency,source,sponsored,booking_url,status)
 values(result,p_venue,p_slug,d->>'title_es',d->>'title_en',d->>'description_es',d->>'description_en',(d->>'category_id')::uuid,(d->>'price_cents')::integer,d->>'currency','verified_venue',false,d->>'booking_url','draft');
 return result;
end$$;
revoke all on function public.create_akisuite_event_from_template(uuid,uuid,text) from public,anon,service_role;
grant execute on function public.create_akisuite_event_from_template(uuid,uuid,text) to authenticated;

create function public.set_akisuite_media_folder(p_media uuid,p_name text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v uuid; w text; result uuid;
begin
 select venue_id into v from public.venue_media where id=p_media;
 if not akisuite_listing_private.library_access(v) then raise exception 'Listing Premium and scoped membership required' using errcode='42501';end if;
 if p_name is not null and length(btrim(p_name))>80 then raise exception 'Invalid folder name';end if;
 if coalesce(btrim(p_name),'')='' then update public.venue_media set akisuite_folder_id=null where id=p_media;return null;end if;
 w:=akisuite_listing_private.venue_workspace(v);
 insert into public.akisuite_media_folders(workspace_id,venue_id,name) values(w,v,btrim(p_name))
 on conflict(workspace_id,venue_id,name) do update set name=excluded.name returning id into result;
 update public.venue_media set akisuite_folder_id=result where id=p_media;
 return result;
end$$;
revoke all on function public.set_akisuite_media_folder(uuid,text) from public,anon,service_role;
grant execute on function public.set_akisuite_media_folder(uuid,text) to authenticated;
create function akisuite_listing_private.guard_library_media() returns trigger
language plpgsql security definer set search_path='' as $$
declare n bigint;lim integer;
begin
 if not (select library_enabled from akisuite_listing_private.launch_settings where singleton) then return new;end if;
 if tg_op='INSERT' then
  perform pg_advisory_xact_lock(hashtextextended(new.venue_id::text,2));
  select count(*) into n from (select id from public.venue_media where venue_id=new.venue_id union select media_id from public.venue_media_placements where venue_id=new.venue_id) assets;
  lim:=case when akisuite_listing_private.listing_premium(new.venue_id) then 250 else 8 end;
  if n>=lim then raise exception 'Media allowance exceeded' using errcode='PT402';end if;
 end if;
 if tg_op='UPDATE' then
  if new.venue_id is distinct from old.venue_id or new.storage_path is distinct from old.storage_path then raise exception 'Media identity is immutable' using errcode='42501';end if;
  new.size_bytes:=old.size_bytes;new.mime_type:=old.mime_type;
 end if;
 if new.akisuite_folder_id is not null and (tg_op='INSERT' or new.akisuite_folder_id is distinct from old.akisuite_folder_id) then
  if not akisuite_listing_private.library_access(new.venue_id) or not exists(select 1 from public.akisuite_media_folders f where f.id=new.akisuite_folder_id and f.venue_id=new.venue_id and f.workspace_id=akisuite_listing_private.venue_workspace(new.venue_id)) then raise exception 'Premium scoped folder required' using errcode='42501';end if;
 end if;
 return new;
end$$;
revoke all on function akisuite_listing_private.guard_library_media() from public,anon,authenticated,service_role;
create trigger listing_library_media before insert or update on public.venue_media for each row execute function akisuite_listing_private.guard_library_media();
create function public.akisuite_media_allowed(p_venue uuid,p_media uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.is_venue_member(p_venue) and exists(select 1 from public.venue_media m where m.id=p_media and
 (m.venue_id=p_venue or (akisuite_listing_private.library_access(p_venue,false) and akisuite_listing_private.library_access(m.venue_id,false)
 and akisuite_listing_private.venue_workspace(p_venue)=akisuite_listing_private.venue_workspace(m.venue_id)
 and (akisuite_listing_private.listing_premium(p_venue) or exists(select 1 from akisuite_listing_private.retained_media_reuse r where r.venue_id=p_venue and r.media_id=m.id)))))
$$;
revoke all on function public.akisuite_media_allowed(uuid,uuid) from public,anon,service_role;
grant execute on function public.akisuite_media_allowed(uuid,uuid) to authenticated;
create function public.akisuite_media_library(p_venue uuid)
returns table(id uuid,venue_id uuid,storage_path text,alt_es text,alt_en text,mime_type text,size_bytes integer,sort_order integer,folder_id uuid,folder_name text)
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.is_venue_member(p_venue) then raise exception 'Venue access required' using errcode='42501';end if;
 return query select m.id,m.venue_id,m.storage_path,m.alt_es,m.alt_en,m.mime_type,m.size_bytes,m.sort_order,f.id,f.name
 from public.venue_media m left join public.akisuite_media_folders f on f.id=m.akisuite_folder_id where m.venue_id in (select p_venue union select v.venue_id from public.crm_workspace_venues v where v.workspace_id=akisuite_listing_private.venue_workspace(p_venue))
 and public.akisuite_media_allowed(p_venue,m.id)
 order by m.sort_order,m.id limit 1000;
end$$;
revoke all on function public.akisuite_media_library(uuid) from public,anon,service_role;
grant execute on function public.akisuite_media_library(uuid) to authenticated;
create function public.akisuite_media_in_use(p_media uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.venue_media where id=p_media and public.is_venue_member(venue_id)) then raise exception 'Media owner required' using errcode='42501';end if;
 return exists(select 1 from public.venue_media_placements where media_id=p_media);
end$$;
revoke all on function public.akisuite_media_in_use(uuid) from public,anon,service_role;
grant execute on function public.akisuite_media_in_use(uuid) to authenticated;
create function akisuite_listing_private.guard_library_placement() returns trigger
language plpgsql security definer set search_path='' as $$
declare source uuid; n bigint; lim integer;
begin
 if not (select library_enabled from akisuite_listing_private.launch_settings where singleton) then return new;end if;
 if auth.uid() is null or not public.is_venue_member(new.venue_id) then raise exception 'Venue membership required' using errcode='42501';end if;
 select venue_id into source from public.venue_media where id=new.media_id;
 if source is null or not public.akisuite_media_allowed(new.venue_id,new.media_id) then raise exception 'Media access required' using errcode='42501';end if;
 if source<>new.venue_id and not akisuite_listing_private.listing_premium(new.venue_id) and not exists(select 1 from akisuite_listing_private.retained_media_reuse r where r.venue_id=new.venue_id and r.media_id=new.media_id and r.placement=new.placement::text and r.target_key=coalesce(new.target_key,'')) then raise exception 'Premium required for new shared media reuse' using errcode='PT402';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.venue_id::text,2));
 select count(*) into n from (select id from public.venue_media where venue_id=new.venue_id union select media_id from public.venue_media_placements where venue_id=new.venue_id) assets;
 lim:=case when akisuite_listing_private.listing_premium(new.venue_id) then 250 else 8 end;
 if not exists(select 1 from public.venue_media where id=new.media_id and venue_id=new.venue_id) and not exists(select 1 from public.venue_media_placements where venue_id=new.venue_id and media_id=new.media_id) and n>=lim then raise exception 'Media allowance exceeded' using errcode='PT402';end if;
 if source<>new.venue_id and akisuite_listing_private.listing_premium(new.venue_id) then
  insert into akisuite_listing_private.retained_media_reuse values(new.venue_id,new.media_id,new.placement::text,coalesce(new.target_key,'')) on conflict do nothing;
 end if;
 return new;
end$$;
revoke all on function akisuite_listing_private.guard_library_placement() from public,anon,authenticated,service_role;
create trigger listing_library_placement before insert or update on public.venue_media_placements for each row execute function akisuite_listing_private.guard_library_placement();
create or replace function public.listing_limits_info(p_venue uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare premium boolean; flags jsonb;
begin
 if auth.uid() is null or not public.is_venue_member(p_venue) then raise exception 'Venue membership required' using errcode='42501';end if;
 premium:=akisuite_listing_private.listing_premium(p_venue);select to_jsonb(s) into flags from akisuite_listing_private.launch_settings s where singleton;
 return jsonb_build_object('enabled',flags->'enabled','uploads_enforced',coalesce(flags->'uploads_enforced','false'::jsonb),'library_enabled',flags->'library_enabled','premium',premium,'photos',case when premium then 250 else 8 end);
end$$;
revoke all on function public.listing_limits_info(uuid) from public,anon,service_role;
grant execute on function public.listing_limits_info(uuid) to authenticated;
-- Reuse the verified byte reservation engine while counting shared assets atomically.
alter function public.reserve_listing_upload(uuid,text,text,integer,integer,integer,uuid) set schema akisuite_listing_private;
alter function akisuite_listing_private.reserve_listing_upload(uuid,text,text,integer,integer,integer,uuid) rename to reserve_listing_upload_legacy;
revoke all on function akisuite_listing_private.reserve_listing_upload_legacy(uuid,text,text,integer,integer,integer,uuid) from public,anon,authenticated,service_role;
create function public.reserve_listing_upload(p_venue uuid,p_digest text,p_mime text,p_bytes integer,p_width integer,p_height integer,p_event uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb; n bigint; bytes bigint; premium boolean;
begin
 result:=akisuite_listing_private.reserve_listing_upload_legacy(p_venue,p_digest,p_mime,p_bytes,p_width,p_height,p_event);
 if not (select library_enabled from akisuite_listing_private.launch_settings where singleton) then return result;end if;
 -- The legacy reservation holds the same venue transaction lock through this check.
 select count(*),coalesce(sum(size),0) into n,bytes from (
  select path,max(size) size from (
   select m.storage_path path,m.size_bytes::bigint size from public.venue_media m where m.venue_id=p_venue
   union all select m.storage_path,m.size_bytes::bigint from public.venue_media_placements p join public.venue_media m on m.id=p.media_id where p.venue_id=p_venue
   union all select name,case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 10485760 end from storage.objects where bucket_id='event-media' and split_part(name,'/',1)=p_venue::text
   union all select storage_path,size_bytes::bigint from akisuite_listing_private.upload_reservations where venue_id=p_venue and state in ('pending','uploaded') and expires_at>now()
  ) assets group by path
 ) unique_assets;
 premium:=akisuite_listing_private.listing_premium(p_venue);
 if n>(case when premium then 250 else 8 end) or bytes>(case when premium then 1073741824 else 157286400 end) then raise exception 'Media allowance exceeded' using errcode='PT402';end if;
 return result;
end$$;
revoke all on function public.reserve_listing_upload(uuid,text,text,integer,integer,integer,uuid) from public,anon,service_role;
grant execute on function public.reserve_listing_upload(uuid,text,text,integer,integer,integer,uuid) to authenticated;
create or replace function public.akisuite_listing_storage_upload_allowed(p_name text) returns boolean
language plpgsql security definer set search_path='' as $$
declare v uuid;premium boolean;n bigint;bytes bigint;
begin
 if not (select enabled from akisuite_listing_private.launch_settings where singleton) then return true;end if;
 if p_name is null or length(p_name)>1000 or split_part(p_name,'/',1)!~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false;end if;
 v:=split_part(p_name,'/',1)::uuid;if auth.uid() is null or not public.is_venue_member(v) then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(v::text,2));
 select count(*),coalesce(sum(size),0) into n,bytes from (
  select path,max(size) size from (
   select name path,case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 10485760 end size from storage.objects where bucket_id='event-media' and split_part(name,'/',1)=v::text
   union all select m.storage_path,m.size_bytes::bigint from public.venue_media m where m.venue_id=v and (select library_enabled from akisuite_listing_private.launch_settings where singleton)
   union all select m.storage_path,m.size_bytes::bigint from public.venue_media_placements p join public.venue_media m on m.id=p.media_id where p.venue_id=v and (select library_enabled from akisuite_listing_private.launch_settings where singleton)
  ) assets where path<>p_name group by path
 ) unique_assets;
 premium:=akisuite_listing_private.listing_premium(v);
 return n<(case when premium then 250 else 8 end) and bytes+10485760<=(case when premium then 1073741824 else 157286400 end);
end$$;
revoke all on function public.akisuite_listing_storage_upload_allowed(text) from public,anon,service_role;
grant execute on function public.akisuite_listing_storage_upload_allowed(text) to authenticated;
notify pgrst,'reload schema';
commit;
