-- Additive independent property identity. Apply only after exact-head SQL/RLS acceptance.
-- Legacy IDs and venue relations remain intact; no workspace is detached or inferred.
begin;
create table public.accommodation_properties (
 id uuid primary key default gen_random_uuid(),
 legacy_venue_id uuid unique references public.venues(id) on delete restrict,
 workspace_id text references public.crm_workspaces(id) on delete restrict,
 owner_profile_id uuid references public.profiles(id) on delete set null,
 name text not null check(legacy_venue_id is not null or length(btrim(name)) between 2 and 120),
 status text not null default 'private' check(status in ('private','published','archived')),
 created_at timestamptz not null default now(),
 check(legacy_venue_id is null or id=legacy_venue_id)
);
-- Existing, explicit source links only. No name/email/address ownership matching.
insert into public.accommodation_properties(id,legacy_venue_id,workspace_id,name,status)
 select v.id,v.id,w.id,v.name,case when v.status='published' and v.discovery_vertical='accommodation' then 'published' else 'private' end
 from public.venues v left join public.crm_workspaces w on w.source_venue_id=v.id
 where v.discovery_vertical='accommodation' or v.id in (
  select venue_id from public.accommodation_room_types union select venue_id from public.accommodation_units
  union select venue_id from public.accommodation_nightly_rates union select venue_id from public.accommodation_reservations
  union select venue_id from public.accommodation_unit_blocks union select venue_id from public.accommodation_booking_settings
  union select venue_id from public.accommodation_quotes union select venue_id from public.accommodation_confirmation_emails
  union select venue_id from public.suite_saved_stays);
create table public.accommodation_property_members (
 property_id uuid not null references public.accommodation_properties(id) on delete restrict,
 profile_id uuid not null references public.profiles(id) on delete cascade,
 role text not null check(role in ('manager','editor')),
 primary key(property_id,profile_id)
);
alter table public.accommodation_properties enable row level security;
alter table public.accommodation_property_members enable row level security;
revoke all on public.accommodation_properties,public.accommodation_property_members from public,anon,authenticated;
grant select on public.accommodation_properties,public.accommodation_property_members to authenticated;
create function public.can_manage_accommodation_property(p_property uuid) returns boolean
 language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.accommodation_properties p where p.id=p_property and (
   (p.legacy_venue_id is not null and public.is_venue_member(p.legacy_venue_id,array['owner','manager']::public.venue_member_role[]))
   or (p.legacy_venue_id is null and (p.owner_profile_id=auth.uid() or exists(
    select 1 from public.accommodation_property_members m where m.property_id=p.id and m.profile_id=auth.uid() and m.role='manager')))))
$$;
revoke all on function public.can_manage_accommodation_property(uuid) from public,anon;
grant execute on function public.can_manage_accommodation_property(uuid) to authenticated;
create policy accommodation_property_manager_read on public.accommodation_properties for select to authenticated
 using(public.can_manage_accommodation_property(id));
create policy accommodation_property_member_read on public.accommodation_property_members for select to authenticated
 using(profile_id=auth.uid() or public.can_manage_accommodation_property(property_id));
create function public.create_accommodation_property(p_name text,p_workspace text default null) returns uuid
 language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); result uuid;
begin
 if actor is null or not exists(select 1 from auth.users u where u.id=actor and u.email_confirmed_at is not null and u.deleted_at is null) then raise exception 'Verified account required' using errcode='42501'; end if;
 if p_name is null or length(btrim(p_name)) not between 2 and 120 then raise exception 'Invalid property name' using errcode='22023'; end if;
 if p_workspace is not null and not exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id
  where w.id=p_workspace and w.owner_profile_id=actor and w.status in ('active','trial') and m.profile_id=actor and m.role='owner' and m.status='active') then
  raise exception 'Workspace owner required' using errcode='42501'; end if;
 insert into public.accommodation_properties(name,owner_profile_id,workspace_id) values(btrim(p_name),actor,p_workspace) returning id into result;
 return result;
end $$;
revoke all on function public.create_accommodation_property(text,text) from public,anon;
grant execute on function public.create_accommodation_property(text,text) to authenticated;
-- Legacy profile identity stays synchronized; never grants property ownership by inference.
create function accommodation_private.sync_legacy_property() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.discovery_vertical='accommodation' then
  if exists(select 1 from public.accommodation_properties where id=new.id and legacy_venue_id is null) then raise exception 'Property identity already exists' using errcode='23505'; end if;
  insert into public.accommodation_properties(id,legacy_venue_id,name,status)
   values(new.id,new.id,new.name,case when new.status='published' then 'published' else 'private' end)
   on conflict(id) do update set name=excluded.name,status=excluded.status;
 elsif exists(select 1 from public.accommodation_properties where legacy_venue_id=new.id) then
  update public.accommodation_properties set status='private' where legacy_venue_id=new.id;
 end if;
 return new;
end $$;
revoke all on function accommodation_private.sync_legacy_property() from public,anon,authenticated;
create trigger accommodation_property_legacy_sync after insert or update of name,status,discovery_vertical on public.venues
 for each row execute function accommodation_private.sync_legacy_property();

-- New identity column is canonical. Old clients may still submit venue_id for legacy properties.
create function accommodation_private.guard_property_identity() returns trigger language plpgsql security definer set search_path='' as $$
declare legacy uuid;
begin
 new.property_id:=coalesce(new.property_id,new.venue_id);
 select legacy_venue_id into legacy from public.accommodation_properties where id=new.property_id;
 if not found then raise exception 'Property unavailable' using errcode='23503'; end if;
 if new.venue_id is not null and new.venue_id is distinct from legacy then raise exception 'Property identity mismatch' using errcode='23514'; end if;
 new.venue_id:=legacy;
 if tg_op='UPDATE' and new.property_id is distinct from old.property_id then raise exception 'Property reassignment prohibited' using errcode='23514'; end if;
 return new;
end $$;
revoke all on function accommodation_private.guard_property_identity() from public,anon,authenticated;
alter table public.accommodation_room_types add column property_id uuid references public.accommodation_properties(id) on delete restrict;
update public.accommodation_room_types set property_id=venue_id;
alter table public.accommodation_room_types alter column property_id set not null, alter column venue_id drop not null;
create trigger a_property_identity before insert or update on public.accommodation_room_types for each row execute function accommodation_private.guard_property_identity();
create index accommodation_room_types_property_idx on public.accommodation_room_types(property_id);
alter table public.accommodation_units add column property_id uuid references public.accommodation_properties(id) on delete restrict;
update public.accommodation_units set property_id=venue_id;
alter table public.accommodation_units alter column property_id set not null, alter column venue_id drop not null;
create trigger a_property_identity before insert or update on public.accommodation_units for each row execute function accommodation_private.guard_property_identity();
create index accommodation_units_property_idx on public.accommodation_units(property_id);
alter table public.accommodation_nightly_rates add column property_id uuid references public.accommodation_properties(id) on delete restrict;
update public.accommodation_nightly_rates set property_id=venue_id;
alter table public.accommodation_nightly_rates alter column property_id set not null, alter column venue_id drop not null;
create trigger a_property_identity before insert or update on public.accommodation_nightly_rates for each row execute function accommodation_private.guard_property_identity();
create index accommodation_nightly_rates_property_idx on public.accommodation_nightly_rates(property_id);
alter table public.accommodation_reservations add column property_id uuid references public.accommodation_properties(id) on delete restrict;
update public.accommodation_reservations set property_id=venue_id;
alter table public.accommodation_reservations alter column property_id set not null, alter column venue_id drop not null;
create trigger a_property_identity before insert or update on public.accommodation_reservations for each row execute function accommodation_private.guard_property_identity();
create index accommodation_reservations_property_idx on public.accommodation_reservations(property_id);
alter table public.accommodation_unit_blocks add column property_id uuid references public.accommodation_properties(id) on delete restrict;
update public.accommodation_unit_blocks set property_id=venue_id;
alter table public.accommodation_unit_blocks alter column property_id set not null, alter column venue_id drop not null;
create trigger a_property_identity before insert or update on public.accommodation_unit_blocks for each row execute function accommodation_private.guard_property_identity();
create index accommodation_unit_blocks_property_idx on public.accommodation_unit_blocks(property_id);
alter table public.accommodation_booking_settings drop constraint accommodation_booking_settings_pkey;
alter table public.accommodation_booking_settings add column property_id uuid references public.accommodation_properties(id) on delete restrict;
update public.accommodation_booking_settings set property_id=venue_id;
alter table public.accommodation_booking_settings alter column property_id set not null, alter column venue_id drop not null;
create trigger a_property_identity before insert or update on public.accommodation_booking_settings for each row execute function accommodation_private.guard_property_identity();
create index accommodation_booking_settings_property_idx on public.accommodation_booking_settings(property_id);
alter table public.accommodation_booking_settings add primary key(property_id), add unique(venue_id);
alter table public.accommodation_quotes add column property_id uuid references public.accommodation_properties(id) on delete restrict;
update public.accommodation_quotes set property_id=venue_id;
alter table public.accommodation_quotes alter column property_id set not null, alter column venue_id drop not null;
create trigger a_property_identity before insert or update on public.accommodation_quotes for each row execute function accommodation_private.guard_property_identity();
create index accommodation_quotes_property_idx on public.accommodation_quotes(property_id);
alter table public.accommodation_confirmation_emails add column property_id uuid references public.accommodation_properties(id) on delete restrict;
update public.accommodation_confirmation_emails set property_id=venue_id;
alter table public.accommodation_confirmation_emails alter column property_id set not null, alter column venue_id drop not null;
create trigger a_property_identity before insert or update on public.accommodation_confirmation_emails for each row execute function accommodation_private.guard_property_identity();
create index accommodation_confirmation_emails_property_idx on public.accommodation_confirmation_emails(property_id);
alter table public.accommodation_room_types add unique(id,property_id);
alter table public.accommodation_units add unique(id,property_id);
alter table public.accommodation_units add foreign key(room_type_id,property_id) references public.accommodation_room_types(id,property_id);
alter table public.accommodation_nightly_rates add foreign key(room_type_id,property_id) references public.accommodation_room_types(id,property_id);
alter table public.accommodation_quotes add foreign key(room_type_id,property_id) references public.accommodation_room_types(id,property_id);
alter table public.accommodation_reservations add foreign key(unit_id,property_id) references public.accommodation_units(id,property_id);
alter table public.accommodation_unit_blocks add foreign key(unit_id,property_id) references public.accommodation_units(id,property_id);
alter table public.accommodation_units add unique(property_id,name);
alter table public.accommodation_reservations add unique(property_id,idempotency_key);

create or replace function public.accommodation_guard_occupancy()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare occupied boolean;
begin
 -- Touch the lock row as well: REPEATABLE READ must fail serialization instead
 -- of checking the other occupancy table against an older transaction snapshot.
 update public.accommodation_units set active=active where id=new.unit_id and property_id=new.property_id;
 if not found then raise exception 'Accommodation unit does not belong to this property'; end if;
 if tg_table_name = 'accommodation_unit_blocks' then
  select exists (
   select 1 from public.accommodation_reservations r
   where r.unit_id=new.unit_id and r.status in ('requested','confirmed','checked_in')
     and daterange(r.check_in,r.check_out,'[)') && daterange(new.start_date,new.end_date_exclusive,'[)')
  ) into occupied;
 else
  if new.status not in ('requested','confirmed','checked_in') then return new; end if;
  select exists (
   select 1 from public.accommodation_unit_blocks b
   where b.unit_id=new.unit_id and daterange(b.start_date,b.end_date_exclusive,'[)')
     && daterange(new.check_in,new.check_out,'[)')
  ) into occupied;
 end if;
 if occupied then raise exception 'Unit unavailable for selected nights'; end if;
 return new;
end;
$$;

create or replace function accommodation_private.snapshot(p_type uuid,p_in date,p_out date,p_guests integer)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare t public.accommodation_room_types; s public.accommodation_booking_settings;
 nights integer; covered integer; minimum integer; total bigint; prices jsonb;
begin
 nights := p_out-p_in;
 if p_in is null or p_out is null or p_guests is null or nights not between 1 and 365
  or p_in < (now() at time zone 'Europe/Madrid')::date or p_in > (now() at time zone 'Europe/Madrid')::date+730 then
  raise exception 'Invalid stay dates'; end if;
 select * into t from public.accommodation_room_types where id=p_type and active;
 if not found or p_guests not between 1 and t.max_guests then raise exception 'Room unavailable'; end if;
 select * into s from public.accommodation_booking_settings where property_id=t.property_id and mode='request';
 if not found or not exists(select from public.accommodation_properties v where v.id=t.property_id and v.status='published')
  then raise exception 'Booking unavailable'; end if;
 select count(*)::integer,max(r.minimum_nights),sum(r.nightly_price_cents),
  jsonb_agg(jsonb_build_object('date',d::date,'price_cents',r.nightly_price_cents,'rate_id',r.id,'minimum_nights',r.minimum_nights) order by d)
 into covered,minimum,total,prices
 from generate_series(p_in::timestamp,(p_out-1)::timestamp,interval '1 day') d
 join public.accommodation_nightly_rates r on r.room_type_id=p_type and d::date>=r.start_date and d::date<r.end_date_exclusive;
 if covered<>nights or nights<minimum or total>2147483647 then raise exception 'Rates unavailable for selected nights'; end if;
 return jsonb_build_object('room_type_id',t.id,'room_name',t.name,'check_in',p_in,'check_out',p_out,'guests',p_guests,
  'nights',nights,'currency','EUR','total_cents',total,'prices',prices,'policy',s.policy,
  'taxes_included',true,'payment','pay_at_property','status','requested');
end $$;

create or replace function public.accommodation_available_rooms(p_venue uuid,p_in date,p_out date,p_guests integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t record; result jsonb := '[]'; snapshot jsonb; available integer;
begin
 if p_in is null or p_out is null or p_guests is null or p_out-p_in not between 1 and 365 or p_guests not between 1 and 30 then raise exception 'Invalid stay dates'; end if;
 for t in select id from public.accommodation_room_types where property_id=p_venue and active and max_guests>=p_guests order by name,id loop
  begin snapshot := accommodation_private.snapshot(t.id,p_in,p_out,p_guests);
  exception when raise_exception then continue; end;
  select count(*)::integer into available from public.accommodation_units u where u.room_type_id=t.id and u.active
   and not exists(select from public.accommodation_unit_blocks b where b.unit_id=u.id and daterange(b.start_date,b.end_date_exclusive,'[)') && daterange(p_in,p_out,'[)'))
   and not exists(select from public.accommodation_reservations r where r.unit_id=u.id and r.status in ('requested','confirmed','checked_in') and daterange(r.check_in,r.check_out,'[)') && daterange(p_in,p_out,'[)'));
  if available>0 then result := result || jsonb_build_array(snapshot || jsonb_build_object('available',available)); end if;
 end loop;
 return result;
end $$;

create or replace function public.accommodation_create_quote(p_type uuid,p_in date,p_out date,p_guests integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.accommodation_room_types; snapshot jsonb; q public.accommodation_quotes;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into t from public.accommodation_room_types where id=p_type;
 snapshot := accommodation_private.snapshot(p_type,p_in,p_out,p_guests);
 if not exists(select from jsonb_array_elements(public.accommodation_available_rooms(t.property_id,p_in,p_out,p_guests)) a where a->>'room_type_id'=p_type::text)
  then raise exception 'Room unavailable'; end if;
 delete from public.accommodation_quotes where profile_id=auth.uid() and expires_at<now();
 if (select count(*) from public.accommodation_quotes where profile_id=auth.uid())>=30 then raise exception 'Too many quotes'; end if;
 insert into public.accommodation_quotes(profile_id,property_id,room_type_id,check_in,check_out,guests,snapshot)
 values(auth.uid(),t.property_id,p_type,p_in,p_out,p_guests,snapshot) returning * into q;
 return jsonb_build_object('id',q.id,'expires_at',q.expires_at,'snapshot',snapshot);
end $$;

create or replace function public.accommodation_request_booking(p_quote uuid,p_key uuid,p_name text,p_email text,p_locale text)
returns uuid language plpgsql security definer set search_path='' as $$
declare q public.accommodation_quotes; r public.accommodation_reservations; chosen uuid; snapshot jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if p_key is null or p_name is null or char_length(btrim(p_name)) not between 2 and 120
  or p_email is null or char_length(p_email)>254 or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or p_locale not in ('en','es') or p_locale is null then raise exception 'Invalid guest details'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_key::text,0));
 select * into q from public.accommodation_quotes where id=p_quote and profile_id=auth.uid() for update;
 if not found then raise exception 'Quote unavailable'; end if;
 if q.venue_id is null and not exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null and u.deleted_at is null and lower(u.email)=lower(btrim(p_email))) then raise exception 'Verified account email required' using errcode='42501'; end if;
 select * into r from public.accommodation_reservations where property_id=q.property_id and idempotency_key=p_key;
 if found then
  if r.profile_id is distinct from auth.uid() or r.quote_snapshot<>q.snapshot or r.contact_name<>btrim(p_name) or r.contact_email<>lower(btrim(p_email)) or r.locale<>p_locale
   then raise exception 'Request key reused'; end if;
  return r.id;
 end if;
 if q.expires_at<now() then raise exception 'Quote expired'; end if;
 perform 1 from public.accommodation_properties where id=q.property_id for share;
 perform 1 from public.accommodation_booking_settings where property_id=q.property_id for share;
 perform 1 from public.accommodation_room_types where id=q.room_type_id for share;
 perform 1 from public.accommodation_nightly_rates where room_type_id=q.room_type_id and daterange(start_date,end_date_exclusive,'[)') && daterange(q.check_in,q.check_out,'[)') for share;
 snapshot := accommodation_private.snapshot(q.room_type_id,q.check_in,q.check_out,q.guests);
 if snapshot<>q.snapshot then raise exception 'Quote changed; request a new quote'; end if;
 select u.id into chosen from public.accommodation_units u where u.room_type_id=q.room_type_id and u.active
  and not exists(select from public.accommodation_unit_blocks b where b.unit_id=u.id and daterange(b.start_date,b.end_date_exclusive,'[)') && daterange(q.check_in,q.check_out,'[)'))
  and not exists(select from public.accommodation_reservations occupied where occupied.unit_id=u.id and occupied.status in ('requested','confirmed','checked_in') and daterange(occupied.check_in,occupied.check_out,'[)') && daterange(q.check_in,q.check_out,'[)'))
  order by u.id for update of u skip locked limit 1;
 if chosen is null then raise exception 'Room unavailable'; end if;
 insert into public.accommodation_reservations(property_id,unit_id,profile_id,check_in,check_out,guests,contact_name,contact_email,quoted_total_cents,quote_snapshot,idempotency_key,locale)
 values(q.property_id,chosen,auth.uid(),q.check_in,q.check_out,q.guests,btrim(p_name),lower(btrim(p_email)),(snapshot->>'total_cents')::integer,snapshot,p_key,p_locale) returning * into r;
 insert into public.accommodation_booking_audit(reservation_id,actor_id,new_status) values(r.id,auth.uid(),'requested');
 return r.id;
end $$;

create or replace function public.accommodation_change_status(p_reservation uuid,p_status text)
returns boolean language plpgsql security definer set search_path='' as $$
declare r public.accommodation_reservations; manager boolean; today date := (now() at time zone 'Europe/Madrid')::date;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into r from public.accommodation_reservations where id=p_reservation for update;
 if not found then raise exception 'Reservation unavailable'; end if;
 manager := public.can_manage_accommodation_property(r.property_id);
 if not manager and (r.profile_id is distinct from auth.uid() or p_status<>'cancelled' or r.check_in<=today) then raise exception 'Not authorized'; end if;
 if r.status=p_status then return false; end if;
 if not ((r.status='requested' and p_status in ('confirmed','declined','cancelled'))
  or (r.status='confirmed' and p_status in ('checked_in','cancelled'))
  or (r.status='checked_in' and p_status='completed')) then raise exception 'Invalid reservation transition'; end if;
 if p_status='checked_in' and today not between r.check_in and r.check_out then raise exception 'Check-in date unavailable'; end if;
 update public.accommodation_reservations set status=p_status,updated_at=now() where id=r.id;
 insert into public.accommodation_booking_audit(reservation_id,actor_id,old_status,new_status) values(r.id,auth.uid(),r.status,p_status);
 return true;
end $$;

create or replace function public.accommodation_public_settings(p_venue uuid)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('mode',s.mode,'external_url',s.external_url,'policy',s.policy)
 from public.accommodation_booking_settings s join public.accommodation_properties v on v.id=s.property_id
 where v.id=p_venue and v.status='published'
$$;

create or replace function accommodation_private.queue_confirmation() returns trigger
language plpgsql security definer set search_path='' as $$
declare payload jsonb; recipient text;
begin
 if new.status in ('cancelled','declined') then
  update public.accommodation_confirmation_emails set status='cancelled' where booking_id=new.id and status<>'sent';
 end if;
 if new.status<>'confirmed' or old.status='confirmed' then return new; end if;
 select jsonb_build_object('bookingId',new.id,'venueId',new.property_id,'propertyId',new.property_id,'independentProperty',v.legacy_venue_id is null,'venueName',v.name,'customerName',new.contact_name,
  'customerEmail',new.contact_email,'guestCount',new.guests,'bookingStart',new.check_in,'bookingEnd',new.check_out,
  'offeringName',new.quote_snapshot->>'room_name','locale',new.locale,'product','accommodation','totalCents',new.quoted_total_cents,'policy',new.quote_snapshot->>'policy')
 into payload from public.accommodation_properties v where v.id=new.property_id;
 select notification_email into recipient from public.accommodation_booking_settings where property_id=new.property_id;
 if recipient is null then
  select u.email into recipient from public.accommodation_properties p join auth.users u on u.id=p.owner_profile_id
   where p.id=new.property_id and u.email_confirmed_at is not null;
  if recipient is null then
   select u.email into recipient from public.venue_members m join auth.users u on u.id=m.profile_id
    join public.accommodation_properties p on p.legacy_venue_id=m.venue_id
    where p.id=new.property_id and m.role='owner' and u.email_confirmed_at is not null order by m.profile_id limit 1;
  end if;
 end if;
 insert into public.accommodation_confirmation_emails(booking_id,property_id,audience,recipient,payload)
 values(new.id,new.property_id,'customer',new.contact_email,payload) on conflict do nothing;
 insert into public.accommodation_confirmation_emails(booking_id,property_id,audience,recipient,payload,status,last_error)
 values(new.id,new.property_id,'venue',recipient,payload,case when recipient is null then 'blocked' else 'pending' end,
  case when recipient is null then 'venue_email_missing' else null end) on conflict do nothing;
 return new;
end $$;
drop policy accommodation_types_owner on public.accommodation_room_types;
create policy accommodation_types_owner on public.accommodation_room_types for all to authenticated
 using(public.can_manage_accommodation_property(property_id)) with check(public.can_manage_accommodation_property(property_id));
drop policy accommodation_units_owner on public.accommodation_units;
create policy accommodation_units_owner on public.accommodation_units for all to authenticated
 using(public.can_manage_accommodation_property(property_id)) with check(public.can_manage_accommodation_property(property_id));
drop policy accommodation_rates_owner on public.accommodation_nightly_rates;
create policy accommodation_rates_owner on public.accommodation_nightly_rates for all to authenticated
 using(public.can_manage_accommodation_property(property_id)) with check(public.can_manage_accommodation_property(property_id));
drop policy accommodation_blocks_owner on public.accommodation_unit_blocks;
create policy accommodation_blocks_owner on public.accommodation_unit_blocks for all to authenticated
 using(public.can_manage_accommodation_property(property_id)) with check(public.can_manage_accommodation_property(property_id));
drop policy accommodation_settings_owner on public.accommodation_booking_settings;
create policy accommodation_settings_owner on public.accommodation_booking_settings for all to authenticated
 using(public.can_manage_accommodation_property(property_id)) with check(public.can_manage_accommodation_property(property_id));
drop policy accommodation_reservations_owner_read on public.accommodation_reservations;
create policy accommodation_reservations_owner_read on public.accommodation_reservations for select to authenticated using(public.can_manage_accommodation_property(property_id));
drop policy accommodation_mail_read on public.accommodation_confirmation_emails;
create policy accommodation_mail_read on public.accommodation_confirmation_emails for select to authenticated using(
 public.can_manage_accommodation_property(property_id) or (audience='customer' and exists(select 1 from public.accommodation_reservations r where r.id=booking_id and r.profile_id=auth.uid())));
-- Same canonical sender/outbox. No historical send replay and no new scheduler.
create or replace function public.queue_suite_stay_lifecycle()
returns trigger language plpgsql security definer set search_path='' as $$
declare kind text;recipient text;venue_name text;
begin
 if tg_op='INSERT' then
  if new.status <> 'requested' then return new; end if;
  kind:='stay_booking_requested';
 elsif tg_op='UPDATE' then
  if new.status <> 'cancelled' or old.status='cancelled' then return new; end if;
  kind:='stay_booking_cancelled';
 else return new; end if;
 select u.email into recipient from auth.users u
   where u.id=new.profile_id and u.deleted_at is null and u.email_confirmed_at is not null;
 if recipient is null then return new; end if;
 select v.name into venue_name from public.accommodation_properties v where v.id=new.property_id;
 insert into public.suite_email_outbox(dedupe_key,kind,profile_id,recipient,locale,payload)
 values('stay:'||new.id::text||':'||kind,kind,new.profile_id,recipient,
  case when new.locale='en' then 'en' else 'es' end,
  jsonb_build_object('bookingId',new.id,'venueName',coalesce(venue_name,'Stay'),
    'checkIn',new.check_in,'checkOut',new.check_out,'guests',new.guests,
    'totalCents',new.quoted_total_cents,'venueId',new.property_id,'propertyId',new.property_id,'independentProperty',new.venue_id is null))
 on conflict(dedupe_key) do nothing;
 return new;
end $$;
-- Independent media is private until explicitly placed and published. Legacy venue media stays untouched.
create table public.accommodation_property_media (
 id uuid primary key default gen_random_uuid(),
 property_id uuid not null references public.accommodation_properties(id) on delete restrict,
 storage_path text not null unique,
 alt_text text not null default '' check(length(alt_text)<=300),
 public_position integer check(public_position between 0 and 11),
 created_at timestamptz not null default now(),
 check(split_part(storage_path,'/',1)=property_id::text),
 unique(property_id,public_position)
);
alter table public.accommodation_property_media enable row level security;
revoke all on public.accommodation_property_media from public,anon,authenticated;
grant select on public.accommodation_property_media to anon,authenticated;
grant insert,update,delete on public.accommodation_property_media to authenticated;
create policy accommodation_media_manage on public.accommodation_property_media for all to authenticated
 using(public.can_manage_accommodation_property(property_id)) with check(public.can_manage_accommodation_property(property_id));
create policy accommodation_media_published on public.accommodation_property_media for select to anon,authenticated
 using(public_position is not null and exists(select 1 from public.accommodation_properties p where p.id=property_id and p.status='published'));
create function accommodation_private.owner_erasure_hold() returns trigger language plpgsql set search_path='' as $$
begin
 if old.owner_profile_id is not null and new.owner_profile_id is null and new.legacy_venue_id is null then new.status:='private'; end if;
 return new;
end $$;
revoke all on function accommodation_private.owner_erasure_hold() from public,anon,authenticated;
create trigger accommodation_owner_erasure_hold before update of owner_profile_id on public.accommodation_properties for each row execute function accommodation_private.owner_erasure_hold();
-- Public profile reads contain no membership/contact fields; direct property table stays private.
create function public.accommodation_property_public(p_property uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',id,'name',name,'legacy_venue_id',legacy_venue_id) from public.accommodation_properties where id=p_property and status='published'
$$;
revoke all on function public.accommodation_property_public(uuid) from public;
grant execute on function public.accommodation_property_public(uuid) to anon,authenticated;
-- The media policy must not depend on a manager-only property SELECT policy.
drop policy accommodation_media_published on public.accommodation_property_media;
create policy accommodation_media_published on public.accommodation_property_media for select to anon,authenticated
 using(public_position is not null and public.accommodation_property_public(property_id) is not null);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('accommodation-media','accommodation-media',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy accommodation_objects_read on storage.objects for select to anon,authenticated
 using(bucket_id='accommodation-media' and exists(select 1 from public.accommodation_property_media m where m.storage_path=name));
create policy accommodation_objects_insert on storage.objects for insert to authenticated
 with check(bucket_id='accommodation-media' and exists(select 1 from public.accommodation_properties p where p.id::text=split_part(objects.name,'/',1) and public.can_manage_accommodation_property(p.id)));
create policy accommodation_objects_delete on storage.objects for delete to authenticated
 using(bucket_id='accommodation-media' and exists(select 1 from public.accommodation_properties p where p.id::text=split_part(objects.name,'/',1) and public.can_manage_accommodation_property(p.id)));
-- Retain every original reservation, inventory, venue, CRM member and email ID.
commit;
