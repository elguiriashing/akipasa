-- Independent properties: new UUID identity, no invented venue or paid plan mapping.
-- Refuse ambiguous pre-existing native records rather than overwrite entitlements.
begin;
do $$ begin
 if to_regclass('public.accommodation_properties') is not null or to_regclass('public.accommodation_property_media') is not null then
  raise exception 'Native accommodation schema already exists; reconcile ownership and paid access before migration';
 end if;
 if to_regprocedure('public.account_features_allowed()') is null then raise exception 'Shared account eligibility contract required'; end if;
end $$;
do $$ begin
 if to_regclass('storage.buckets') is not null then
  if exists(select 1 from storage.buckets where id='accommodation-media' and public) then raise exception 'Existing public native media bucket requires privacy reconciliation';end if;
  insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('accommodation-media','accommodation-media',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
 end if;
end $$;
create schema accommodation_private;
revoke all on schema accommodation_private from public,anon,authenticated;
create table accommodation_private.launch_settings(singleton boolean primary key default true check(singleton),enabled boolean not null default false,uploads_enforced boolean not null default false,check(not uploads_enforced or enabled));
insert into accommodation_private.launch_settings default values;
create table public.accommodation_properties(
 id uuid primary key default gen_random_uuid(),owner_profile_id uuid references public.profiles(id) on delete set null,orphaned_at timestamptz,
 workspace_id text references public.crm_workspaces(id),legacy_venue_id uuid unique references public.venues(id),
 name text not null check(char_length(btrim(name)) between 2 and 120),slug text unique,
 status text not null default 'private' check(status in ('private','pending','published','rejected')),
 address text not null default '' check(char_length(address)<=500),city text not null default '' check(char_length(city)<=160),
 latitude double precision check(latitude between -85 and 85),longitude double precision check(longitude between -180 and 180),
 accommodation_type text not null default 'hotel' check(accommodation_type in ('hotel','apartment','rural_house','hostel','guest_house','campsite','motel','student_accommodation')),
 website_url text check(website_url is null or (char_length(website_url)<=2000 and website_url ~ '^https://[^[:space:]]+$')),
 description_es text not null default '' check(char_length(description_es)<=6000),description_en text not null default '' check(char_length(description_en)<=6000),
 revision_id uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create function accommodation_private.orphan_property() returns trigger language plpgsql set search_path='' as $$
begin
 if old.owner_profile_id is not null and new.owner_profile_id is null then new.orphaned_at:=now();new.status:='private';end if;
 return new;
end $$;
create trigger native_accommodation_orphan_review before update of owner_profile_id on public.accommodation_properties for each row execute function accommodation_private.orphan_property();
create index accommodation_properties_owner on public.accommodation_properties(owner_profile_id,id);
create index accommodation_properties_workspace on public.accommodation_properties(workspace_id,id) where workspace_id is not null;
create table public.accommodation_property_members(property_id uuid not null references public.accommodation_properties(id),profile_id uuid not null references public.profiles(id) on delete cascade,role text not null check(role='manager'),created_at timestamptz not null default now(),primary key(property_id,profile_id));
create index accommodation_property_members_profile on public.accommodation_property_members(profile_id,property_id);
create table accommodation_private.property_entitlements(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),
 source text not null check(source in ('verified_billing','legacy_review','trial','promotion','admin_override')),
 reference text not null check(char_length(btrim(reference)) between 3 and 300),
 starts_at timestamptz not null default now(),ends_at timestamptz,revoked_at timestamptz,
 created_at timestamptz not null default now(),check(ends_at is null or ends_at>starts_at),unique(property_id,source,reference)
);
create index accommodation_property_entitlements_active on accommodation_private.property_entitlements(property_id,starts_at,ends_at) where revoked_at is null;
create table accommodation_private.audit(id bigint generated always as identity primary key,property_id uuid not null,actor uuid,action text not null,detail jsonb not null default '{}',created_at timestamptz not null default now());
create function accommodation_private.append_only() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'Immutable accommodation audit';end $$;
create trigger accommodation_audit_immutable before update or delete on accommodation_private.audit for each row execute function accommodation_private.append_only();
create function accommodation_private.ready() returns boolean language sql stable security definer set search_path='' as $$select enabled from accommodation_private.launch_settings where singleton$$;
create function accommodation_private.property_access(p_property uuid,p_owner boolean default false) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and public.account_features_allowed() and exists(
  select 1 from public.accommodation_properties p where p.id=p_property and p.owner_profile_id is not null and
  (p.owner_profile_id=auth.uid() or (not p_owner and exists(select 1 from public.accommodation_property_members m where m.property_id=p.id and m.profile_id=auth.uid())))
  and (p.workspace_id is null or exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id
    where w.id=p.workspace_id and w.id<>'ws_akipasa' and w.owner_profile_id=p.owner_profile_id and w.status in ('active','trial') and m.profile_id=auth.uid() and m.status='active' and m.role in ('owner','admin','manager','staff'))))
$$;
create function public.can_manage_accommodation_property(p_property uuid) returns boolean language sql stable security definer set search_path='' as $$select accommodation_private.ready() and accommodation_private.property_access(p_property)$$;
create function accommodation_private.premium(p_property uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from accommodation_private.property_entitlements e where e.property_id=p_property and e.revoked_at is null and e.starts_at<=now() and (e.ends_at is null or e.ends_at>now()))
$$;
create function public.create_accommodation_property(p_name text,p_workspace text default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if not accommodation_private.ready() or auth.uid() is null or not public.account_features_allowed() then raise exception 'Account access required' using errcode='42501';end if;
 if p_workspace is not null and not exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id where w.id=p_workspace and w.id<>'ws_akipasa' and w.owner_profile_id=auth.uid() and w.status in ('active','trial') and m.profile_id=auth.uid() and m.role='owner' and m.status='active') then raise exception 'Workspace owner required' using errcode='42501';end if;
 insert into public.accommodation_properties(owner_profile_id,workspace_id,name) values(auth.uid(),p_workspace,p_name) returning id into v_id;
 insert into accommodation_private.audit(property_id,actor,action) values(v_id,auth.uid(),'created');return v_id;
end $$;
create function public.managed_accommodation_properties_page(p_limit integer default 101,p_offset integer default 0) returns table(id uuid,name text,status text,workspace_id text,legacy_venue_id uuid) language plpgsql stable security definer set search_path='' as $$
begin
 if not accommodation_private.ready() or auth.uid() is null or not public.account_features_allowed() then raise exception 'Account access required' using errcode='42501';end if;
 if p_limit not between 1 and 101 or p_offset not between 0 and 10000 then raise exception 'Invalid pagination';end if;
 return query select p.id,p.name,p.status,p.workspace_id,p.legacy_venue_id from public.accommodation_properties p where accommodation_private.property_access(p.id) order by p.id limit p_limit offset p_offset;
end $$;
create function public.set_accommodation_property_member(p_property uuid,p_profile uuid,p_role text) returns void language plpgsql security definer set search_path='' as $$
declare p public.accommodation_properties;
begin
 if not public.can_manage_accommodation_property(p_property) or not accommodation_private.property_access(p_property,true) then raise exception 'Property owner required' using errcode='42501';end if;
 select * into p from public.accommodation_properties where id=p_property for update;
 if p_profile=p.owner_profile_id or (p_role is not null and p_role<>'manager') then raise exception 'Invalid delegation';end if;
 if p_role is null then delete from public.accommodation_property_members where property_id=p_property and profile_id=p_profile;
 else
 if p.workspace_id is not null and not exists(select 1 from public.crm_workspace_members m where m.workspace_id=p.workspace_id and m.profile_id=p_profile and m.status='active' and m.role in ('owner','admin','manager','staff')) then raise exception 'Active organisation membership required' using errcode='42501';end if;
 insert into public.accommodation_property_members(property_id,profile_id,role) values(p_property,p_profile,'manager') on conflict(property_id,profile_id) do update set role=excluded.role;
 end if;
 insert into accommodation_private.audit(property_id,actor,action,detail) values(p_property,auth.uid(),'membership',jsonb_build_object('profile',p_profile,'role',p_role));
end $$;
create function public.accommodation_property_team(p_property uuid,p_limit integer default 100,p_offset integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_members jsonb;
begin
 if not public.can_manage_accommodation_property(p_property) then raise exception 'Property membership required' using errcode='42501';end if;
 if p_limit not between 1 and 100 or p_offset not between 0 and 10000 then raise exception 'Invalid pagination';end if;
 select coalesce(jsonb_agg(to_jsonb(m)),'[]') into v_members from (select profile_id,role from public.accommodation_property_members where property_id=p_property order by profile_id limit p_limit offset p_offset)m;
 return jsonb_build_object('canManageTeam',accommodation_private.property_access(p_property,true),'ownerProfileId',(select owner_profile_id from public.accommodation_properties where id=p_property),'members',v_members,'total',(select count(*) from public.accommodation_property_members where property_id=p_property));
end $$;
create function public.save_accommodation_property_profile(p_property uuid,p_profile jsonb,p_submit boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare v_revision uuid:=gen_random_uuid();
begin
 if not public.can_manage_accommodation_property(p_property) then raise exception 'Property membership required' using errcode='42501';end if;
 if p_profile is null or jsonb_typeof(p_profile)<>'object' or exists(select 1 from jsonb_object_keys(p_profile) k where k not in ('name','address','city','latitude','longitude','accommodation_type','website_url','description_es','description_en')) then raise exception 'Invalid profile';end if;
 update public.accommodation_properties set name=p_profile->>'name',address=coalesce(p_profile->>'address',''),city=coalesce(p_profile->>'city',''),latitude=(p_profile->>'latitude')::double precision,longitude=(p_profile->>'longitude')::double precision,accommodation_type=p_profile->>'accommodation_type',website_url=p_profile->>'website_url',description_es=coalesce(p_profile->>'description_es',''),description_en=coalesce(p_profile->>'description_en',''),status=case when p_submit then 'pending' else 'private' end,revision_id=v_revision,updated_at=now() where id=p_property;
 insert into accommodation_private.audit(property_id,actor,action,detail) values(p_property,auth.uid(),'profile_revision',jsonb_build_object('revision',v_revision,'submitted',p_submit));return v_revision;
end $$;
create function public.review_accommodation_property(p_property uuid,p_publish boolean,p_revision uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not accommodation_private.ready() or not public.account_features_allowed() or not exists(select 1 from public.profiles where id=auth.uid() and app_role='administrator') then raise exception 'Administrator required' using errcode='42501';end if;
 if p_reason is null or char_length(btrim(p_reason)) not between 10 and 2000 then raise exception 'Review reason required';end if;
 update public.accommodation_properties set status=case when p_publish then 'published' else 'rejected' end,updated_at=now() where id=p_property and revision_id=p_revision and status='pending';
 if not found then raise exception 'Stale property revision';end if;
 insert into accommodation_private.audit(property_id,actor,action,detail) values(p_property,auth.uid(),'review',jsonb_build_object('revision',p_revision,'publish',p_publish,'reason',p_reason));
end $$;
-- An explicit reviewed override is scoped to one property, with no Stripe/price mutation.
create function public.set_accommodation_listing_grant(p_property uuid,p_reference text,p_until timestamptz default null,p_revoke boolean default false) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if not accommodation_private.ready() or not public.account_features_allowed() or not exists(select 1 from public.profiles where id=auth.uid() and app_role='administrator') then raise exception 'Administrator required' using errcode='42501';end if;
 if p_reference is null or char_length(btrim(p_reference)) not between 3 and 300 or (p_until is not null and p_until<=now()) then raise exception 'Valid review reference and future expiry required';end if;
 perform 1 from public.accommodation_properties where id=p_property for update;
 if not found then raise exception 'Unknown property';end if;
 if p_revoke then
  update accommodation_private.property_entitlements set revoked_at=coalesce(revoked_at,now()) where property_id=p_property and source='admin_override' and reference=p_reference returning id into v_id;
  if v_id is null then raise exception 'Unknown reviewed grant';end if;
 else
  insert into accommodation_private.property_entitlements(property_id,source,reference,ends_at) values(p_property,'admin_override',p_reference,p_until) returning id into v_id;
 end if;
 insert into accommodation_private.audit(property_id,actor,action,detail) values(p_property,auth.uid(),'listing_grant_review',jsonb_build_object('grant',v_id,'reference',p_reference,'revoke',p_revoke,'until',p_until));return v_id;
end $$;
revoke all on function public.set_accommodation_listing_grant(uuid,text,timestamptz,boolean) from public,anon;
grant execute on function public.set_accommodation_listing_grant(uuid,text,timestamptz,boolean) to authenticated;
create table public.accommodation_property_media(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),storage_path text not null unique,
 alt_text text not null default '' check(char_length(alt_text)<=300),public_position integer check(public_position between 0 and 249),
 mime_type text not null,size_bytes integer not null check(size_bytes between 1 and 10485760),created_at timestamptz not null default now(),unique(property_id,public_position)
);
create index accommodation_media_property on public.accommodation_property_media(property_id,created_at desc,id);
create table accommodation_private.upload_reservations(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),actor uuid not null references public.profiles(id) on delete cascade,storage_path text not null unique,
 digest text not null check(digest ~ '^[0-9a-f]{64}$'),mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),size_bytes integer not null check(size_bytes between 1 and 10485760),width integer not null check(width between 1 and 3840),height integer not null check(height between 1 and 3840),
 state text not null default 'pending' check(state in ('pending','uploaded','committed','failed')),media_id uuid unique,expires_at timestamptz not null default now()+interval '15 minutes',created_at timestamptz not null default now()
);
create index accommodation_upload_pending on accommodation_private.upload_reservations(property_id,expires_at) where state in ('pending','uploaded');
create function public.accommodation_listing_info(p_property uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_premium boolean;v_used bigint;
begin
 if not public.can_manage_accommodation_property(p_property) then raise exception 'Property membership required' using errcode='42501';end if;
 v_premium:=accommodation_private.premium(p_property);select count(*) into v_used from public.accommodation_property_media where property_id=p_property;
 return jsonb_build_object('premium',v_premium,'photos',case when v_premium then 250 else 8 end,'used',v_used,'max_dimension',case when v_premium then 3840 else 1920 end,'uploads_enforced',(select uploads_enforced from accommodation_private.launch_settings where singleton));
end $$;
create function public.reserve_accommodation_upload(p_property uuid,p_digest text,p_mime text,p_bytes integer,p_width integer,p_height integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid:=gen_random_uuid();v_path text;v_count bigint;v_premium boolean;
begin
 if not public.can_manage_accommodation_property(p_property) or not (select uploads_enforced from accommodation_private.launch_settings where singleton) then raise exception 'Property uploads unavailable' using errcode='42501';end if;
 if p_digest is null or p_digest !~ '^[0-9a-f]{64}$' or p_mime is null or p_mime not in ('image/jpeg','image/png','image/webp') or p_bytes is null or p_bytes not between 1 and 10485760 or p_width is null or p_height is null or least(p_width,p_height)<1 then raise exception 'Invalid image evidence';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_property::text,8));
 -- Touch the scope row: a stale REPEATABLE READ snapshot must serialize, not over-reserve.
 update public.accommodation_properties set updated_at=updated_at where id=p_property;
 v_premium:=accommodation_private.premium(p_property);
 if greatest(p_width,p_height)>(case when v_premium then 3840 else 1920 end) then raise exception 'Image resolution allowance exceeded' using errcode='PT402';end if;
 select count(*) into v_count from (
 select storage_path from public.accommodation_property_media where property_id=p_property
 union select name from storage.objects where bucket_id='accommodation-media' and split_part(name,'/',1)=p_property::text
 union select storage_path from accommodation_private.upload_reservations where property_id=p_property and state in ('pending','uploaded') and expires_at>now())x;
 if v_count>=(case when v_premium then 250 else 8 end) then raise exception 'Media allowance exceeded' using errcode='PT402';end if;
 v_path:=p_property::text||'/'||v_id::text||case p_mime when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.webp' end;
 insert into accommodation_private.upload_reservations(id,property_id,actor,storage_path,digest,mime_type,size_bytes,width,height) values(v_id,p_property,auth.uid(),v_path,p_digest,p_mime,p_bytes,p_width,p_height);
 return jsonb_build_object('id',v_id,'path',v_path);
end $$;
create function public.complete_accommodation_upload(p_reservation uuid,p_digest text) returns boolean language plpgsql security definer set search_path='' as $$
declare r accommodation_private.upload_reservations;o storage.objects;
begin
 select * into r from accommodation_private.upload_reservations where id=p_reservation for update;
 if not found or r.state not in ('pending','uploaded') or r.expires_at<=now() or p_digest is distinct from r.digest then raise exception 'Invalid receipt';end if;
 -- Check the actor, not the service identity issuing this receipt.
 if not exists(select 1 from public.accommodation_properties p where p.id=r.property_id and p.owner_profile_id is not null and
 (p.owner_profile_id=r.actor or exists(select 1 from public.accommodation_property_members m where m.property_id=p.id and m.profile_id=r.actor)) and
 (p.workspace_id is null or exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id where w.id=p.workspace_id and w.owner_profile_id=p.owner_profile_id and w.status in ('active','trial') and m.profile_id=r.actor and m.status='active' and m.role in ('owner','admin','manager','staff')))) then raise exception 'Membership revoked' using errcode='42501';end if;
 if exists(select 1 from account_private.onboarding where profile_id=r.actor and status<>'complete') then raise exception 'Account completion required' using errcode='42501';end if;
 select * into o from storage.objects where bucket_id='accommodation-media' and name=r.storage_path;
 if not found or o.metadata->>'size' is distinct from r.size_bytes::text or o.metadata->>'mimetype' is distinct from r.mime_type or o.user_metadata->>'accommodation_upload_id' is distinct from r.id::text or o.user_metadata->>'sha256' is distinct from r.digest then raise exception 'Stored bytes mismatch';end if;
 update accommodation_private.upload_reservations set state='uploaded' where id=r.id;return true;
end $$;
create function public.cancel_accommodation_upload(p_reservation uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare r accommodation_private.upload_reservations;
begin
 select * into r from accommodation_private.upload_reservations where id=p_reservation for update;
 if not found or r.state='committed' then return false;end if;
 update accommodation_private.upload_reservations set state='failed' where id=r.id;return true;
end $$;
create function accommodation_private.guard_media() returns trigger language plpgsql security definer set search_path='' as $$
declare r accommodation_private.upload_reservations;v_max integer;
begin
 if not public.can_manage_accommodation_property(case when tg_op='DELETE' then old.property_id else new.property_id end) then raise exception 'Property membership required' using errcode='42501';end if;
 if tg_op='DELETE' then return old;end if;
 if new.public_position is not null and (tg_op='INSERT' or new.public_position is distinct from old.public_position) and new.public_position>=(case when accommodation_private.premium(new.property_id) then 250 else 8 end) then raise exception 'Gallery position allowance exceeded' using errcode='PT402';end if;
 if tg_op='UPDATE' then
 if new.id is distinct from old.id or new.property_id is distinct from old.property_id or new.storage_path is distinct from old.storage_path or new.mime_type is distinct from old.mime_type or new.size_bytes is distinct from old.size_bytes or new.created_at is distinct from old.created_at then raise exception 'Media identity immutable' using errcode='42501';end if;return new;end if;
 perform pg_advisory_xact_lock(hashtextextended(new.property_id::text,8));
 update public.accommodation_properties set updated_at=updated_at where id=new.property_id;
 select * into r from accommodation_private.upload_reservations where storage_path=new.storage_path for update;
 if not found or r.actor<>auth.uid() or r.property_id<>new.property_id or r.state<>'uploaded' or r.expires_at<=now() then raise exception 'Verified owner receipt required' using errcode='42501';end if;
 v_max:=case when accommodation_private.premium(new.property_id) then 3840 else 1920 end;
 if greatest(r.width,r.height)>v_max then raise exception 'Image resolution allowance changed' using errcode='PT402';end if;
 if (select count(*) from public.accommodation_property_media where property_id=new.property_id)>=(case when accommodation_private.premium(new.property_id) then 250 else 8 end) then raise exception 'Media allowance exceeded' using errcode='PT402';end if;
 if not exists(select 1 from storage.objects where bucket_id='accommodation-media' and name=r.storage_path and metadata->>'size'=r.size_bytes::text and user_metadata->>'sha256'=r.digest and user_metadata->>'accommodation_upload_id'=r.id::text) then raise exception 'Stored bytes mismatch';end if;
 new.mime_type:=r.mime_type;new.size_bytes:=r.size_bytes;
 update accommodation_private.upload_reservations set state='committed',media_id=new.id where id=r.id;return new;
end $$;
create trigger accommodation_verified_media before insert or update or delete on public.accommodation_property_media for each row execute function accommodation_private.guard_media();
-- Restrictive policies intersect every existing broad Storage policy.
create function public.accommodation_storage_allowed(p_bucket text,p_path text,p_write boolean default false) returns boolean language plpgsql stable security definer set search_path='' as $$
declare p_id uuid;
begin
 if p_bucket<>'accommodation-media' then return true;end if;
 if not accommodation_private.ready() then return false;end if;
 if split_part(p_path,'/',1) !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false;end if;
 p_id:=split_part(p_path,'/',1)::uuid;
 if p_write then return public.can_manage_accommodation_property(p_id);end if;
 return public.can_manage_accommodation_property(p_id) or (accommodation_private.ready() and exists(select 1 from public.accommodation_property_media m join public.accommodation_properties p on p.id=m.property_id where m.storage_path=p_path and m.property_id=p_id and m.public_position is not null and p.status='published' and p.owner_profile_id is not null));
end $$;
create policy accommodation_native_bucket_read on storage.objects for select to anon,authenticated using(bucket_id='accommodation-media' and public.accommodation_storage_allowed(bucket_id,name));
create policy accommodation_native_bucket_delete on storage.objects for delete to authenticated using(bucket_id='accommodation-media' and public.accommodation_storage_allowed(bucket_id,name,true));
create policy accommodation_storage_read on storage.objects as restrictive for select to anon,authenticated using(public.accommodation_storage_allowed(bucket_id,name));
create policy accommodation_storage_delete on storage.objects as restrictive for delete to anon,authenticated using(public.accommodation_storage_allowed(bucket_id,name,true));
create policy accommodation_storage_no_insert on storage.objects as restrictive for insert to anon,authenticated with check(bucket_id<>'accommodation-media');
create policy accommodation_storage_no_update on storage.objects as restrictive for update to anon,authenticated using(bucket_id<>'accommodation-media') with check(bucket_id<>'accommodation-media');
-- Service storage creates require a current, unconsumed server reservation too.
create function accommodation_private.guard_object() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.bucket_id<>'accommodation-media' then return new;end if;
 if tg_op='UPDATE' then raise exception 'Native accommodation objects immutable' using errcode='42501';end if;
 if current_setting('role',true)<>'service_role' or not exists(select 1 from accommodation_private.upload_reservations r where r.storage_path=new.name and r.state='pending' and r.expires_at>now() and r.id::text=new.user_metadata->>'accommodation_upload_id' and r.digest=new.user_metadata->>'sha256' and r.size_bytes::text=new.metadata->>'size' and r.mime_type=new.metadata->>'mimetype') then raise exception 'Approved service upload reservation required' using errcode='42501';end if;
 return new;
end $$;
create trigger native_accommodation_storage_evidence before insert or update on storage.objects for each row execute function accommodation_private.guard_object();
alter table public.accommodation_properties enable row level security;
alter table public.accommodation_property_members enable row level security;
alter table public.accommodation_property_media enable row level security;
revoke all on public.accommodation_properties,public.accommodation_property_members,public.accommodation_property_media from public,anon,authenticated;
grant select on public.accommodation_properties to authenticated;
grant select,insert,update,delete on public.accommodation_property_media to authenticated;
create policy accommodation_properties_management on public.accommodation_properties for select to authenticated using(public.can_manage_accommodation_property(id));
create policy accommodation_media_management on public.accommodation_property_media for all to authenticated using(public.can_manage_accommodation_property(property_id)) with check(public.can_manage_accommodation_property(property_id));
alter table accommodation_private.launch_settings enable row level security;
revoke all on accommodation_private.launch_settings from public,anon,authenticated;
alter table accommodation_private.property_entitlements enable row level security;
revoke all on accommodation_private.property_entitlements from public,anon,authenticated;
alter table accommodation_private.audit enable row level security;
revoke all on accommodation_private.audit from public,anon,authenticated;
alter table accommodation_private.upload_reservations enable row level security;
revoke all on accommodation_private.upload_reservations from public,anon,authenticated;
do $$ declare r record;begin
 for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='accommodation_private' loop execute format('revoke all on function %s from public,anon,authenticated,service_role',r.f);end loop;
end $$;
revoke all on function public.can_manage_accommodation_property(uuid),public.create_accommodation_property(text,text),public.managed_accommodation_properties_page(integer,integer),public.set_accommodation_property_member(uuid,uuid,text),public.accommodation_property_team(uuid,integer,integer),public.save_accommodation_property_profile(uuid,jsonb,boolean),public.review_accommodation_property(uuid,boolean,uuid,text),public.accommodation_listing_info(uuid),public.reserve_accommodation_upload(uuid,text,text,integer,integer,integer) from public,anon;
grant execute on function public.can_manage_accommodation_property(uuid),public.create_accommodation_property(text,text),public.managed_accommodation_properties_page(integer,integer),public.set_accommodation_property_member(uuid,uuid,text),public.accommodation_property_team(uuid,integer,integer),public.save_accommodation_property_profile(uuid,jsonb,boolean),public.review_accommodation_property(uuid,boolean,uuid,text),public.accommodation_listing_info(uuid),public.reserve_accommodation_upload(uuid,text,text,integer,integer,integer) to authenticated;
revoke all on function public.complete_accommodation_upload(uuid,text),public.cancel_accommodation_upload(uuid) from public,anon,authenticated;
grant execute on function public.complete_accommodation_upload(uuid,text),public.cancel_accommodation_upload(uuid) to service_role;
revoke all on function public.accommodation_storage_allowed(text,text,boolean) from public;
grant execute on function public.accommodation_storage_allowed(text,text,boolean) to anon,authenticated;
notify pgrst,'reload schema';
commit;
