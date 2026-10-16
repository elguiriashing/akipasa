-- Coordinated independent stay profile, moderation, discovery and saved-state contract.
-- Public activation remains gated in applications until authenticated acceptance.
begin;
alter table public.accommodation_properties
 add column review_revision uuid not null default gen_random_uuid(),
 add column slug text unique,
 add column address text not null default '',
 add column city text not null default '',
 add column latitude double precision check(latitude between -85 and 85),
 add column longitude double precision check(longitude between -180 and 180),
 add column accommodation_type text not null default 'hotel' check(accommodation_type in ('hotel','apartment','rural_house','hostel','guest_house','campsite','motel','student_accommodation')),
 add column website_url text check(website_url is null or website_url ~ '^https://[^[:space:]]+$'),
 add column description_es text not null default '',
 add column description_en text not null default '';
alter table public.accommodation_properties drop constraint accommodation_properties_status_check;
alter table public.accommodation_properties add check(status in ('private','pending_review','published','archived'));
update public.accommodation_properties set slug='stay-'||id::text where legacy_venue_id is null;
create function accommodation_private.property_slug() returns trigger language plpgsql set search_path='' as $$
begin
 if new.legacy_venue_id is null then new.slug:='stay-'||new.id::text; end if;
 return new;
end $$;
revoke all on function accommodation_private.property_slug() from public,anon,authenticated;
create trigger accommodation_property_slug before insert on public.accommodation_properties for each row execute function accommodation_private.property_slug();
create table public.accommodation_property_reviews (
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id) on delete restrict,
 actor_id uuid references public.profiles(id) on delete set null,
 old_status text not null,new_status text not null,reason text not null,created_at timestamptz not null default now()
);
alter table public.accommodation_property_reviews enable row level security;
revoke all on public.accommodation_property_reviews from public,anon,authenticated;
grant select on public.accommodation_property_reviews to authenticated;
create policy accommodation_reviews_manager_read on public.accommodation_property_reviews for select to authenticated
 using(public.can_manage_accommodation_property(property_id) or public.has_platform_role(array['moderator','administrator']::public.app_role[]));
create policy accommodation_property_staff_read on public.accommodation_properties for select to authenticated
 using(public.has_platform_role(array['moderator','administrator']::public.app_role[]));

create function public.save_accommodation_property_profile(p_property uuid,p_profile jsonb,p_submit boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare previous public.accommodation_properties; next_status text;
begin
 if not public.can_manage_accommodation_property(p_property) then raise exception 'Not authorized' using errcode='42501'; end if;
 if p_profile is null or jsonb_typeof(p_profile)<>'object' or octet_length(p_profile::text)>20000
  or exists(select 1 from jsonb_object_keys(p_profile) k where k not in ('name','address','city','latitude','longitude','accommodation_type','website_url','description_es','description_en'))
  or length(btrim(coalesce(p_profile->>'name',''))) not between 2 and 120
  or length(coalesce(p_profile->>'address',''))>500 or length(coalesce(p_profile->>'city',''))>160
  or length(coalesce(p_profile->>'description_es',''))>6000 or length(coalesce(p_profile->>'description_en',''))>6000
  or length(coalesce(p_profile->>'website_url',''))>2000 then raise exception 'Invalid property profile' using errcode='22023'; end if;
 select * into previous from public.accommodation_properties where id=p_property for update;
 if previous.legacy_venue_id is not null then raise exception 'Use legacy profile editor' using errcode='22023'; end if;
 -- Any independent public profile edit goes back to review; existing bookings remain valid.
 next_status:=case when p_submit or previous.status in ('published','pending_review') then 'pending_review' else 'private' end;
 update public.accommodation_properties set name=btrim(p_profile->>'name'),address=btrim(coalesce(p_profile->>'address','')),
  city=btrim(coalesce(p_profile->>'city','')),latitude=(p_profile->>'latitude')::double precision,longitude=(p_profile->>'longitude')::double precision,
  accommodation_type=coalesce(p_profile->>'accommodation_type','hotel'),website_url=nullif(btrim(p_profile->>'website_url'),''),
  description_es=coalesce(p_profile->>'description_es',''),description_en=coalesce(p_profile->>'description_en',''),status=next_status,review_revision=gen_random_uuid()
 where id=p_property;
 if p_submit and (length(btrim(coalesce(p_profile->>'address','')))<3 or length(btrim(coalesce(p_profile->>'city','')))<2
  or p_profile->>'latitude' is null or p_profile->>'longitude' is null) then raise exception 'Complete location required' using errcode='22023'; end if;
 if next_status is distinct from previous.status then
  insert into public.accommodation_property_reviews(property_id,actor_id,old_status,new_status,reason)
   values(p_property,auth.uid(),previous.status,next_status,'Owner submitted profile');
 end if;
end $$;
revoke all on function public.save_accommodation_property_profile(uuid,jsonb,boolean) from public,anon;
grant execute on function public.save_accommodation_property_profile(uuid,jsonb,boolean) to authenticated;
create function public.review_accommodation_property(p_property uuid,p_publish boolean,p_reason text,p_revision uuid) returns void
language plpgsql security definer set search_path='' as $$
declare previous public.accommodation_properties;next_status text;
begin
 if auth.uid() is null or not public.has_platform_role(array['moderator','administrator']::public.app_role[]) then raise exception 'Staff required' using errcode='42501'; end if;
 if p_publish is null or length(btrim(coalesce(p_reason,''))) not between 10 and 2000 then raise exception 'Review reason required' using errcode='22023'; end if;
 select * into previous from public.accommodation_properties where id=p_property for update;
 if not found or previous.legacy_venue_id is not null or previous.status<>'pending_review' then raise exception 'Pending property required' using errcode='PT409'; end if;
 if p_revision is null or previous.review_revision<>p_revision then raise exception 'Property changed; review again' using errcode='PT409'; end if;
 if p_publish and previous.owner_profile_id is null then raise exception 'Owner recovery required' using errcode='42501'; end if;
 if p_publish and (length(previous.address)<3 or length(previous.city)<2 or previous.latitude is null or previous.longitude is null) then raise exception 'Complete location required' using errcode='22023'; end if;
 next_status:=case when p_publish then 'published' else 'private' end;
 update public.accommodation_properties set status=next_status where id=p_property;
 insert into public.accommodation_property_reviews(property_id,actor_id,old_status,new_status,reason)
  values(p_property,auth.uid(),previous.status,next_status,btrim(p_reason));
end $$;
revoke all on function public.review_accommodation_property(uuid,boolean,text,uuid) from public,anon;
grant execute on function public.review_accommodation_property(uuid,boolean,text,uuid) to authenticated;

-- One projected catalogue and one pagination order, no duplicate legacy rows.
create function accommodation_private.catalogue() returns table(
 id uuid,slug text,name text,address text,city text,accommodation_type text,website_url text,
 description_es text,description_en text,location jsonb,latitude double precision,longitude double precision,
 legacy_venue_id uuid,verified boolean,search_document tsvector)
language sql stable security invoker set search_path='' as $$
 select v.id,v.slug,v.name,coalesce(v.address,''),coalesce(c.name_es,''),coalesce(v.accommodation_type,'hotel'),v.website_url,
 coalesce(v.description_es,''),coalesce(v.description_en,''),to_jsonb(v.location),null::double precision,null::double precision,v.id,coalesce(v.verified,false),v.search_document
 from public.venues v left join public.cities c on c.id=v.city_id
 where v.status='published' and v.discovery_vertical='accommodation' and (not public.venue_relevance_enabled() or v.discovery_enabled or (auth.uid() is not null and public.is_venue_member(v.id,array['owner','manager']::public.venue_member_role[])))
 union all
 select p.id,p.slug,p.name,p.address,p.city,p.accommodation_type,p.website_url,p.description_es,p.description_en,
 jsonb_build_object('type','Point','coordinates',jsonb_build_array(p.longitude,p.latitude)),p.latitude,p.longitude,null::uuid,false,
 to_tsvector('simple',public.venue_search_normalize(p.name||' '||p.address||' '||p.city))
 from public.accommodation_properties p where p.legacy_venue_id is null and p.status='published'
$$;
revoke all on function accommodation_private.catalogue() from public,anon,authenticated;
create function accommodation_private.search_terms(p_search text) returns tsquery language sql stable set search_path='' as $$
 select to_tsquery('simple',string_agg(quote_literal(token)||':*',' & ')) from (
 select token from regexp_split_to_table(public.venue_search_normalize(left(coalesce(p_search,''),160)),'[^a-z0-9]+') token
 where token<>'' limit 6) tokens
$$;
revoke all on function accommodation_private.search_terms(text) from public,anon,authenticated;
create function public.accommodation_public_properties(p_search text default '',p_type text default 'all',p_limit integer default 24,p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;terms tsquery;
begin
 if p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset not between 0 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
 terms:=accommodation_private.search_terms(p_search);
 with matched as (select * from accommodation_private.catalogue() c where (p_type='all' or c.accommodation_type=p_type)
  and (terms is null or c.search_document@@terms)), page as (select * from matched order by name,id limit p_limit offset p_offset)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page)-'search_document' order by name,id) from page),'[]'::jsonb),'total',(select count(*) from matched)) into result;
 return result;
end $$;
create or replace function public.accommodation_property_public(p_property uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select to_jsonb(c)-'search_document' from accommodation_private.catalogue() c where c.id=p_property
$$;
create function public.accommodation_property_by_slug(p_slug text) returns jsonb language sql stable security definer set search_path='' as $$
 select case when count(*)=1 then jsonb_agg(to_jsonb(c)-'search_document')->0 else null end
 from accommodation_private.catalogue() c where c.slug=p_slug and length(p_slug)<=300
$$;
create function public.accommodation_public_viewport(p_west float8,p_east float8,p_south float8,p_north float8,p_type text default 'all',p_query text default '')
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare legacy jsonb;result jsonb;
begin
 legacy:=public.public_stay_viewport(p_west,p_east,p_south,p_north,p_type,p_query);
 with markers as (
  select marker from jsonb_array_elements(legacy->'markers') marker
   where exists(select 1 from accommodation_private.catalogue() c where c.id::text=marker->>0)
  union all
  select jsonb_build_array(p.id,p.longitude,p.latitude,0,1) from public.accommodation_properties p
   where p.legacy_venue_id is null and p.status='published' and p.longitude between p_west and p_east and p.latitude between p_south and p_north
    and (p_type='all' or p.accommodation_type=p_type)
    and (coalesce(trim(p_query),'')='' or public.venue_search_normalize(p.name||' '||p.address) like '%'||replace(replace(public.venue_search_normalize(left(p_query,100)),'%',''),'_','')||'%')
 ), bounded as(select marker from markers order by marker->>0 limit 1001)
 select jsonb_build_object('markers',coalesce(jsonb_agg(marker),'[]'::jsonb),'truncated',coalesce((legacy->>'truncated')::boolean,false) or count(*)>1000) into result from bounded;
 return result;
end $$;
revoke all on function public.accommodation_public_properties(text,text,integer,integer),public.accommodation_property_by_slug(text),public.accommodation_public_viewport(float8,float8,float8,float8,text,text) from public;
grant execute on function public.accommodation_public_properties(text,text,integer,integer),public.accommodation_property_by_slug(text),public.accommodation_public_viewport(float8,float8,float8,float8,text,text) to anon,authenticated;

-- Preserve saved-state IDs/dates; legacy-only clients continue their original keys.
insert into public.accommodation_properties(id,legacy_venue_id,name,status)
 select v.id,v.id,v.name,'private' from public.venues v where exists(select 1 from public.suite_saved_stays s where s.venue_id=v.id)
 on conflict(id) do nothing;
alter table public.suite_saved_stays add column property_id uuid references public.accommodation_properties(id) on delete restrict;
update public.suite_saved_stays set property_id=venue_id;
alter table public.suite_saved_stays drop constraint suite_saved_stays_pkey;
alter table public.suite_saved_stays alter column property_id set not null,alter column venue_id drop not null;
alter table public.suite_saved_stays add primary key(profile_id,property_id),add unique(profile_id,venue_id);
create trigger a_saved_property_identity before insert or update on public.suite_saved_stays for each row execute function accommodation_private.guard_property_identity();
create or replace function public.suite_save_stay(p_venue uuid,p_saved boolean,p_locale text default 'es')
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if p_venue is null or p_saved is null then raise exception 'Invalid stay'; end if;
 if p_saved then
  if public.accommodation_property_public(p_venue) is null then raise exception 'Stay not available'; end if;
  insert into public.suite_saved_stays(profile_id,property_id,locale)
   values(auth.uid(),p_venue,case when p_locale='en' then 'en' else 'es' end) on conflict(profile_id,property_id) do nothing;
 else delete from public.suite_saved_stays where profile_id=auth.uid() and property_id=p_venue;
 end if;
 return true;
end $$;
create function public.managed_accommodation_properties() returns setof public.accommodation_properties language sql stable security invoker set search_path='' as $$
 select * from public.accommodation_properties where public.can_manage_accommodation_property(id) order by created_at desc,id limit 100
$$;
revoke all on function public.managed_accommodation_properties() from public,anon;
grant execute on function public.managed_accommodation_properties() to authenticated;
create or replace function public.queue_due_suite_reminders()
returns integer language plpgsql security definer set search_path='' as $$
declare count_rows integer := 0; n integer;
begin
 with due as (
  select s.profile_id,oc.event_id,oc.id occurrence_id,oc.starts_at,
     e.title_en,e.title_es,e.slug,p.preferred_locale,u.email
  from public.saved_event_refs s
  join public.suite_email_preferences pref on pref.profile_id=s.profile_id and pref.event_reminders=true
  join public.event_occurrences oc on oc.event_id::text=s.event_key
    and oc.starts_at>now()+interval '47 hours'
    and oc.starts_at<=now()+interval '49 hours'
    and s.created_at<=oc.starts_at-interval '48 hours'
  join public.events e on e.id=oc.event_id and e.status::text='published'
  join public.profiles p on p.id=s.profile_id
  join auth.users u on u.id=s.profile_id and u.deleted_at is null and u.email_confirmed_at is not null
  where oc.status::text not in('cancelled','expired')
 )
 insert into public.suite_email_outbox(dedupe_key,kind,profile_id,recipient,locale,payload,available_at)
 select 'event-saved:'||d.profile_id||':'||d.occurrence_id,
  'event_saved_reminder',d.profile_id,d.email,
  case when d.preferred_locale='en' then 'en' else 'es' end,
  jsonb_build_object('eventId',d.event_id,'occurrenceId',d.occurrence_id,
   'eventName',coalesce(d.title_en,d.title_es,'Event'),'startsAt',d.starts_at,
   'slug',d.slug),
  d.starts_at-interval '48 hours'
 from due d on conflict (dedupe_key) do nothing;
 get diagnostics n=row_count;count_rows:=n;
 insert into public.suite_email_outbox(dedupe_key,kind,profile_id,recipient,locale,payload,available_at)
 select 'stay-saved:'||s.profile_id||':'||s.property_id||':'||md5(s.saved_at::text),
   'stay_saved_reminder',s.profile_id,u.email,s.locale,
   jsonb_build_object('venueId',s.property_id,'propertyId',s.property_id,'independentProperty',v.legacy_venue_id is null,'venueName',v.name,'venueSlug',v.slug,'savedAt',s.saved_at),
   s.saved_at+interval '5 days'
 from public.suite_saved_stays s
 join public.suite_email_preferences pref on pref.profile_id=s.profile_id and pref.stay_reminders=true
 join accommodation_private.catalogue() v on v.id=s.property_id
 join auth.users u on u.id=s.profile_id and u.deleted_at is null and u.email_confirmed_at is not null
 where s.saved_at<=now()-interval '5 days'
   and not exists (
     select 1 from public.accommodation_reservations a
     where a.profile_id=s.profile_id and a.property_id=s.property_id
       and a.created_at>=s.saved_at and a.status in('requested','confirmed','checked_in')
   )
 on conflict (dedupe_key) do nothing;
 get diagnostics n=row_count;
 return count_rows+n;
end $$;
revoke all on function public.queue_due_suite_reminders() from public,anon,authenticated;
grant execute on function public.queue_due_suite_reminders() to service_role;
create function public.pending_accommodation_properties(p_limit integer default 20,p_offset integer default 0) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.has_platform_role(array['moderator','administrator']::public.app_role[]) then raise exception 'Staff required' using errcode='42501'; end if;
 if p_limit is null or p_limit not between 1 and 50 or p_offset is null or p_offset not between 0 and 100000 then raise exception 'Invalid page' using errcode='22023'; end if;
 with pending as(select id,name,address,city,latitude,longitude,slug,accommodation_type,website_url,description_es,description_en,review_revision,created_at from public.accommodation_properties where legacy_venue_id is null and status='pending_review'),
 page as(select * from pending order by created_at,id limit p_limit offset p_offset)
 select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(page) order by created_at,id) from page),'[]'::jsonb),'total',(select count(*) from pending)) into result;
 return result;
end $$;
revoke all on function public.pending_accommodation_properties(integer,integer) from public,anon;
grant execute on function public.pending_accommodation_properties(integer,integer) to authenticated;
create policy accommodation_media_staff_read on public.accommodation_property_media for select to authenticated
 using(public.has_platform_role(array['moderator','administrator']::public.app_role[]));
notify pgrst,'reload schema';
commit;
