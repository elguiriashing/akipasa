-- AkiPasa editorial publisher + town-scale official events.
-- "Selección AkiPasa" means curated/published by AkiPasa, not necessarily organised by AkiPasa.

alter table public.events drop constraint if exists events_source_check;
alter table public.events
  add constraint events_source_check
  check (source = any (array['verified_venue'::text,'community'::text,'akipasa_selection'::text]));

alter table public.events
  add column if not exists location geography(point,4326),
  add column if not exists location_label text;

alter table public.events
  drop constraint if exists events_location_label_length;
alter table public.events
  add constraint events_location_label_length
  check (location_label is null or char_length(location_label) <= 300);

insert into public.venues(
  id,city_id,slug,name,description_es,description_en,address,location,
  verified,status,accessibility,discovery_vertical,discovery_enabled,search_enabled
)
select
  'a1a1a1a1-2026-4000-8000-000000000001'::uuid,
  c.id,
  'akipasa-editorial',
  'AkiPasa',
  'Perfil editorial oficial de AkiPasa para ferias, romerías, fiestas populares y otros planes de interés público.',
  'AkiPasa editorial profile for fairs, local festivals, pilgrimages and other public-interest plans.',
  'Fuengirola, Málaga, España',
  c.center,
  true,
  'published',
  jsonb_build_object('claim_status','claimed','akipasa_publisher',true),
  'activities',
  true,
  true
from public.cities c
where c.slug='fuengirola'
on conflict (id) do update set
  name=excluded.name,
  description_es=excluded.description_es,
  description_en=excluded.description_en,
  verified=true,
  status='published',
  accessibility=excluded.accessibility,
  discovery_enabled=true,
  search_enabled=true;

create or replace function public.sync_akipasa_editorial_membership()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_venue constant uuid := 'a1a1a1a1-2026-4000-8000-000000000001'::uuid;
begin
  if new.app_role in ('moderator'::public.app_role,'administrator'::public.app_role) then
    insert into public.venue_members(venue_id,profile_id,role)
    values(v_venue,new.id,'editor'::public.venue_member_role)
    on conflict(venue_id,profile_id) do update set role='editor'::public.venue_member_role;
  else
    delete from public.venue_members
    where venue_id=v_venue and profile_id=new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_akipasa_editorial_membership on public.profiles;
create trigger profiles_sync_akipasa_editorial_membership
after insert or update of app_role on public.profiles
for each row execute function public.sync_akipasa_editorial_membership();

insert into public.venue_members(venue_id,profile_id,role)
select
  'a1a1a1a1-2026-4000-8000-000000000001'::uuid,
  p.id,
  'editor'::public.venue_member_role
from public.profiles p
where p.app_role in ('moderator','administrator')
on conflict(venue_id,profile_id) do update set role=excluded.role;

create or replace function public.create_akipasa_selection_event(
  p_category uuid,
  p_slug text,
  p_title_es text,
  p_title_en text,
  p_description_es text,
  p_description_en text,
  p_price_cents integer,
  p_booking_url text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_location_label text,
  p_latitude double precision,
  p_longitude double precision
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_venue constant uuid := 'a1a1a1a1-2026-4000-8000-000000000001'::uuid;
begin
  if not public.has_platform_role(array['moderator','administrator']::public.app_role[]) then
    raise exception 'staff role required' using errcode='42501';
  end if;
  if p_ends_at <= p_starts_at
    or p_latitude not between 27 and 44.5
    or p_longitude not between -19 and 5
    or char_length(trim(coalesce(p_location_label,''))) not between 3 and 300
  then raise exception 'invalid official event'; end if;

  insert into public.events(
    id,venue_id,slug,title_es,title_en,description_es,description_en,category_id,
    price_cents,booking_url,source,status,location,location_label
  ) values(
    v_id,v_venue,lower(trim(p_slug)),trim(p_title_es),nullif(trim(p_title_en),''),
    trim(p_description_es),nullif(trim(p_description_en),''),p_category,
    greatest(p_price_cents,0),nullif(trim(p_booking_url),''),
    'akipasa_selection','published',
    st_setsrid(st_makepoint(p_longitude,p_latitude),4326)::geography,
    trim(p_location_label)
  );
  insert into public.event_occurrences(id,event_id,starts_at,ends_at)
  values(gen_random_uuid(),v_id,p_starts_at,p_ends_at);
  return v_id;
end;
$$;

revoke all on function public.create_akipasa_selection_event(
  uuid,text,text,text,text,text,integer,text,timestamptz,timestamptz,text,double precision,double precision
) from public,anon;
grant execute on function public.create_akipasa_selection_event(
  uuid,text,text,text,text,text,integer,text,timestamptz,timestamptz,text,double precision,double precision
) to authenticated;
