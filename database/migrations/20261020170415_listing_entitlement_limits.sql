-- Additive, gated limits. Historical rows remain; no billing or launch activation.
begin;
create schema if not exists akisuite_listing_private;
revoke all on schema akisuite_listing_private from public,anon,authenticated;
create table akisuite_listing_private.launch_settings(singleton boolean primary key default true check(singleton),enabled boolean not null default false);
insert into akisuite_listing_private.launch_settings values(true,false);
alter table akisuite_listing_private.launch_settings enable row level security;
revoke all on akisuite_listing_private.launch_settings from public,anon,authenticated;

-- Caller-independent entitlement; authorization remains at mutation/RLS boundaries.
create function akisuite_listing_private.listing_premium(p_venue uuid) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare v_workspace text; v_active boolean:=false; v_plan text;
begin
 if exists(select 1 from public.profiles where id=(select auth.uid()) and app_role='administrator') then return true; end if;
 select l.workspace_id into v_workspace from public.crm_workspace_venues l join public.crm_workspaces w on w.id=l.workspace_id
 where l.venue_id=p_venue and w.id<>'ws_akipasa' and w.status in ('active','trial') and exists(
 select 1 from public.venue_members m where m.venue_id=p_venue and m.profile_id=w.owner_profile_id and m.role='owner') order by (w.source_venue_id=p_venue) desc,w.id limit 1;
 -- Optional adapter: the old suite billing migration is NOT required for this release.
 if to_regprocedure('akisuite_private.plan_active(uuid,text,text)') is not null then
  select case when discovery_vertical='accommodation' then 'akiduermo_premium' else 'akibusiness_premium' end into v_plan from public.venues where id=p_venue;
  execute 'select akisuite_private.plan_active(null::uuid,$1,$2)' into v_active using v_workspace,v_plan;
  if v_active then return true; end if;
 end if;
 return exists(select 1 from public.venue_members m join public.billing_subscriptions b on b.profile_id=m.profile_id
 where m.venue_id=p_venue and m.role='owner' and b.plan_code in ('business','business_pro') and b.status in ('active','trialing') and (b.current_period_end is null or b.current_period_end>now()))
 or exists(select 1 from public.venue_members m join public.staff_billing_grants g on g.profile_id=m.profile_id
 where m.venue_id=p_venue and m.role='owner' and g.plan_code in ('business','business_pro') and g.active and g.starts_at<=now() and (g.expires_at is null or g.expires_at>now()));
end;
$$;
revoke all on function akisuite_listing_private.listing_premium(uuid) from public,anon,authenticated;

create or replace function akisuite_listing_private.guard_media_quota() returns trigger language plpgsql
security definer set search_path='' as $$
declare v_workspace text; v_scope text; v_count bigint; v_bytes bigint; v_limit integer; v_size bigint;
begin
  if not (select enabled from akisuite_listing_private.launch_settings where singleton) then return new; end if;
  if not public.is_venue_member(new.venue_id) then raise exception 'venue access required' using errcode='42501'; end if;

  v_scope:=new.venue_id::text;
  perform pg_advisory_xact_lock(hashtextextended(v_scope,2));
  select (o.metadata->>'size')::bigint into v_size from storage.objects o
    where o.bucket_id='event-media' and o.name=new.storage_path;
  if v_size is null or v_size<1 or v_size>10485760 or split_part(new.storage_path,'/',1)<>new.venue_id::text
    then raise exception 'invalid stored image'; end if;
  new.size_bytes:=v_size;
  select count(*),coalesce(sum(m.size_bytes),0) into v_count,v_bytes from public.venue_media m
    where m.venue_id=new.venue_id;
  v_limit:=case when akisuite_listing_private.listing_premium(new.venue_id) then 250 else 8 end;
  if v_count>=v_limit or v_bytes+v_size>(case when v_limit=250 then 1073741824 else 157286400 end)
    then raise exception 'media allowance exceeded' using errcode='PT402'; end if;
  return new;
end;
$$;

create or replace function public.akisuite_listing_storage_upload_allowed(p_name text) returns boolean
language plpgsql security definer set search_path='' as $$
declare v_venue uuid; v_workspace text; v_limit integer; v_count bigint; v_bytes bigint;
begin
  if not (select enabled from akisuite_listing_private.launch_settings where singleton) then return true; end if;
  if p_name is null or length(p_name)>1000 or split_part(p_name,'/',1)!~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return false; end if;
  v_venue:=split_part(p_name,'/',1)::uuid;
  if not public.is_venue_member(v_venue) then return false; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_venue::text,2));
  v_limit:=case when akisuite_listing_private.listing_premium(v_venue) then 250 else 8 end;
  select count(*),coalesce(sum(case when o.metadata->>'size' ~ '^[0-9]+$' then (o.metadata->>'size')::bigint else 10485760 end),0)
    into v_count,v_bytes from storage.objects o
    where o.bucket_id='event-media' and o.name<>p_name and split_part(o.name,'/',1)=v_venue::text;
  -- The existing bucket caps objects at 10 MiB. Reserve that upper bound before accepting bytes.
  return v_count<v_limit and v_bytes+10485760<=case when v_limit=250 then 1073741824 else 157286400 end;
end;
$$;

revoke all on function akisuite_listing_private.guard_media_quota() from public,anon,authenticated;
revoke all on function public.akisuite_listing_storage_upload_allowed(text) from public,anon;
grant execute on function public.akisuite_listing_storage_upload_allowed(text) to authenticated;

create trigger akisuite_listing_media_quota before insert on public.venue_media for each row execute function akisuite_listing_private.guard_media_quota();
create policy akisuite_listing_storage_insert on storage.objects as restrictive for insert to authenticated
 with check(bucket_id<>'event-media' or public.akisuite_listing_storage_upload_allowed(name));
create policy akisuite_listing_storage_update on storage.objects as restrictive for update to authenticated
 using(bucket_id<>'event-media' or public.akisuite_listing_storage_upload_allowed(name))
 with check(bucket_id<>'event-media' or public.akisuite_listing_storage_upload_allowed(name));

create function public.listing_limits_info(p_venue uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_premium boolean;
begin
 if (select auth.uid()) is null or not public.is_venue_member(p_venue) then raise exception 'Venue membership required' using errcode='42501'; end if;
 v_premium:=akisuite_listing_private.listing_premium(p_venue);
 return jsonb_build_object('enabled',(select enabled from akisuite_listing_private.launch_settings where singleton),'premium',v_premium,'photos',case when v_premium then 250 else 8 end);
end;
$$;
revoke all on function public.listing_limits_info(uuid) from public,anon;
grant execute on function public.listing_limits_info(uuid) to authenticated;

-- Preserve the installed legacy RPCs without replaying old suite migrations.
alter function public.duplicate_owned_event(uuid,text) set schema akisuite_listing_private;
alter function akisuite_listing_private.duplicate_owned_event(uuid,text) rename to duplicate_event_legacy;
revoke all on function akisuite_listing_private.duplicate_event_legacy(uuid,text) from public,anon,authenticated;
create function public.duplicate_owned_event(p_event uuid,p_slug text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_venue uuid;
begin
 select venue_id into v_venue from public.events where id=p_event;
 if (select enabled from akisuite_listing_private.launch_settings where singleton) and not akisuite_listing_private.listing_premium(v_venue) then raise exception 'Listing Premium required' using errcode='PT402'; end if;
 return akisuite_listing_private.duplicate_event_legacy(p_event,p_slug);
end;
$$;
revoke all on function public.duplicate_owned_event(uuid,text) from public,anon;
grant execute on function public.duplicate_owned_event(uuid,text) to authenticated;
create function akisuite_listing_private.guard_recurrence() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_venue uuid;
begin
 if not (select enabled from akisuite_listing_private.launch_settings where singleton) then return new; end if;
 select venue_id into v_venue from public.events where id=new.event_id;
 if not akisuite_listing_private.listing_premium(v_venue) then raise exception 'Listing Premium required' using errcode='PT402'; end if;
 return new;
end;
$$;
revoke all on function akisuite_listing_private.guard_recurrence() from public,anon,authenticated;
create trigger akisuite_listing_recurrence before insert or update on public.recurrence_rules for each row execute function akisuite_listing_private.guard_recurrence();

-- No event FK: deletion/unpublication must never replenish an allowance already used.
create table akisuite_listing_private.listing_event_months (
 venue_id uuid not null,
 event_id uuid not null,
 month date not null check(extract(day from month)=1),
 title_fingerprint text not null,
 first_published_at timestamptz not null default now(),
 primary key(venue_id,event_id,month)
);
alter table akisuite_listing_private.listing_event_months enable row level security;
revoke all on akisuite_listing_private.listing_event_months from public,anon,authenticated;
create index listing_event_month_count on akisuite_listing_private.listing_event_months(venue_id,month);

-- Backfill existing publication history without rejecting or rewriting old events.
insert into akisuite_listing_private.listing_event_months(venue_id,event_id,month,title_fingerprint)
select distinct e.venue_id,e.id,m::date,md5(lower(btrim(e.title_es))) from public.events e
join public.event_occurrences o on o.event_id=e.id
cross join lateral generate_series(
 date_trunc('month',o.starts_at at time zone 'Europe/Madrid'),
 date_trunc('month',o.ends_at at time zone 'Europe/Madrid'),interval '1 month') m
where e.status='published' on conflict do nothing;

create table akisuite_listing_private.listing_event_review_signals (
 venue_id uuid not null,event_id uuid not null,signal text not null,
 detected_at timestamptz not null default now(),
 primary key(event_id,signal)
);
alter table akisuite_listing_private.listing_event_review_signals enable row level security;
revoke all on akisuite_listing_private.listing_event_review_signals from public,anon,authenticated;

-- Trigger enforcement covers direct table/API writes and old publication RPCs.
create function akisuite_listing_private.enforce_listing_event(p_event uuid) returns void
language plpgsql security definer set search_path='' as $$
declare v_event public.events%rowtype; v_first date; v_last date; v_month date; v_count bigint;
begin
 if not (select enabled from akisuite_listing_private.launch_settings where singleton) then return; end if;
 select * into v_event from public.events where id=p_event;
 if not found or v_event.status<>'published' then return; end if;
 -- Serialize *all* publication paths at listing scope, including separate events.
 perform pg_advisory_xact_lock(hashtextextended(v_event.venue_id::text,17));
 select min((starts_at at time zone 'Europe/Madrid')::date),
        max((ends_at at time zone 'Europe/Madrid')::date)
 into v_first,v_last from public.event_occurrences where event_id=p_event and status<>'cancelled';
 if v_first is null then return; end if;
 if not akisuite_listing_private.listing_premium(v_event.venue_id) then
  if v_last-v_first+1>5 then raise exception 'Free events are limited to five calendar days' using errcode='PT402'; end if;
  if exists(select 1 from public.recurrence_rules where event_id=p_event) then
   raise exception 'Listing Premium required for recurring events' using errcode='PT402';
  end if;
 end if;
 for v_month in select m::date from generate_series(date_trunc('month',v_first::timestamp),date_trunc('month',v_last::timestamp),interval '1 month') m loop
  if not akisuite_listing_private.listing_premium(v_event.venue_id) and not exists(
   select 1 from akisuite_listing_private.listing_event_months where venue_id=v_event.venue_id and event_id=p_event and month=v_month) then
   select count(*) into v_count from akisuite_listing_private.listing_event_months where venue_id=v_event.venue_id and month=v_month;
   if v_count>=4 then raise exception 'Free listings may publish four distinct events per calendar month' using errcode='PT402'; end if;
  end if;
  insert into akisuite_listing_private.listing_event_months(venue_id,event_id,month,title_fingerprint) values(v_event.venue_id,p_event,v_month,md5(lower(btrim(v_event.title_es)))) on conflict do nothing;
 end loop;
 -- Signals request review only; legitimate festivals are not automatically rejected.
 if exists(select 1 from akisuite_listing_private.listing_event_months e where e.venue_id=v_event.venue_id and e.event_id<>p_event
   and e.title_fingerprint=md5(lower(btrim(v_event.title_es))) and e.first_published_at>now()-interval '60 days') then
  insert into akisuite_listing_private.listing_event_review_signals values(v_event.venue_id,p_event,'repeated_title',now()) on conflict do nothing;
 end if;
 if lower(v_event.title_es) ~ '(always open|open daily|abierto todos los d[ií]as|horario habitual)' then
  insert into akisuite_listing_private.listing_event_review_signals values(v_event.venue_id,p_event,'opening_hours_content',now()) on conflict do nothing;
 end if;
 if v_last-v_first>=3 then
  insert into akisuite_listing_private.listing_event_review_signals values(v_event.venue_id,p_event,'continuous_multiday',now()) on conflict do nothing;
 end if;
end;
$$;
revoke all on function akisuite_listing_private.enforce_listing_event(uuid) from public,anon,authenticated;

create function akisuite_listing_private.guard_listing_event() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not (select enabled from akisuite_listing_private.launch_settings where singleton) then return new; end if;
 if tg_table_name='events' then
  if tg_op='UPDATE' and new.venue_id is distinct from old.venue_id then
   raise exception 'Event listing is immutable' using errcode='42501';
  end if;
  if tg_op='UPDATE' and new.status is not distinct from old.status then return new; end if;
  perform akisuite_listing_private.enforce_listing_event(new.id);
 else
  if tg_op='UPDATE' and new.event_id is distinct from old.event_id then
   raise exception 'Occurrence event is immutable' using errcode='42501';
  end if;
  -- Cancelling a retained legacy date and editing its metadata cannot expand discovery.
  if new.status='cancelled' then return new; end if;
  if tg_op='UPDATE' and new.starts_at is not distinct from old.starts_at and new.ends_at is not distinct from old.ends_at and old.status<>'cancelled' then return new; end if;
  perform akisuite_listing_private.enforce_listing_event(new.event_id);
 end if;
 return new;
end;
$$;
revoke all on function akisuite_listing_private.guard_listing_event() from public,anon,authenticated;
create trigger akisuite_listing_event after insert or update of status,venue_id on public.events
 for each row execute function akisuite_listing_private.guard_listing_event();
create trigger akisuite_listing_occurrence after insert or update on public.event_occurrences
 for each row execute function akisuite_listing_private.guard_listing_event();
create index listing_event_review_recent on akisuite_listing_private.listing_event_review_signals(detected_at desc);
create function public.listing_event_review_queue() returns table(venue_id uuid,event_id uuid,signal text,detected_at timestamptz,venue_name text,event_title text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.app_role='administrator') then
  raise exception 'Administrator required' using errcode='42501';
 end if;
 return query select s.venue_id,s.event_id,s.signal,s.detected_at,v.name::text,e.title_es::text
 from akisuite_listing_private.listing_event_review_signals s left join public.venues v on v.id=s.venue_id
 left join public.events e on e.id=s.event_id order by s.detected_at desc,s.event_id,s.signal limit 100;
end;
$$;
revoke all on function public.listing_event_review_queue() from public,anon;
grant execute on function public.listing_event_review_queue() to authenticated;
notify pgrst,'reload schema';
commit;
