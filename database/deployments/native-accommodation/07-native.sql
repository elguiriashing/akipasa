-- Generated canonical native accommodation deployment phase 07. No activation.
begin;
set local lock_timeout='2s';
set local statement_timeout='8s';
set local idle_in_transaction_session_timeout='15s';
do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='native_deployment_bucket_hold' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;
revoke all on function public.set_accommodation_listing_grant(uuid,text,timestamptz,boolean) from public,anon;
grant execute on function public.set_accommodation_listing_grant(uuid,text,timestamptz,boolean) to authenticated;
create table public.accommodation_property_media(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),storage_path text not null unique,
 alt_text text not null default '' check(char_length(alt_text)<=300),public_position integer check(public_position between 0 and 249),
 mime_type text not null,size_bytes integer not null check(size_bytes between 1 and 10485760),created_at timestamptz not null default now(),unique(property_id,public_position)
);
alter table public.accommodation_property_media enable row level security;
revoke all on public.accommodation_property_media from public,anon,authenticated;
create index accommodation_media_property on public.accommodation_property_media(property_id,created_at desc,id);
create table accommodation_property_private.upload_reservations(
 id uuid primary key default gen_random_uuid(),property_id uuid not null references public.accommodation_properties(id),actor uuid not null references public.profiles(id) on delete cascade,storage_path text not null unique,
 digest text not null check(digest ~ '^[0-9a-f]{64}$'),mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),size_bytes integer not null check(size_bytes between 1 and 10485760),width integer not null check(width between 1 and 3840),height integer not null check(height between 1 and 3840),
 state text not null default 'pending' check(state in ('pending','uploaded','committed','failed')),media_id uuid unique,expires_at timestamptz not null default now()+interval '15 minutes',created_at timestamptz not null default now()
);
alter table accommodation_property_private.upload_reservations enable row level security;
revoke all on accommodation_property_private.upload_reservations from public,anon,authenticated;
create index accommodation_upload_pending on accommodation_property_private.upload_reservations(property_id,expires_at) where state in ('pending','uploaded');
create function public.accommodation_listing_info(p_property uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_premium boolean;v_used bigint;
begin
 if not public.can_manage_accommodation_property(p_property) then raise exception 'Property membership required' using errcode='42501';end if;
 v_premium:=accommodation_property_private.premium(p_property);select count(*) into v_used from public.accommodation_property_media where property_id=p_property;
 return jsonb_build_object('premium',v_premium,'photos',case when v_premium then 250 else 8 end,'used',v_used,'max_dimension',case when v_premium then 3840 else 1920 end,'uploads_enforced',(select uploads_enforced from accommodation_property_private.launch_settings where singleton));
end $$;
revoke all on function public.accommodation_listing_info(uuid) from public,anon;
grant execute on function public.accommodation_listing_info(uuid) to authenticated;
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
