-- SOURCE ONLY: reviewed deployment and private bucket verification required.
begin;
-- Deployment readiness and export must be verified before collection is enabled.
create table public.community_story_settings (singleton boolean primary key default true check(singleton),collection_enabled boolean not null default false);
insert into public.community_story_settings(singleton,collection_enabled) values(true,false);
alter table public.community_story_settings enable row level security;
revoke all on public.community_story_settings from anon,authenticated;
create table public.community_stories (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
 check_in_id uuid not null references public.check_ins(id) on delete cascade, venue_id uuid not null references public.venues(id) on delete cascade,
 city_id uuid not null references public.cities(id) on delete cascade, caption text not null default '' check(char_length(caption)<=240),
 kind text not null check(kind in ('selfie','venue')), public_opt_in boolean not null default false,
 status text not null default 'uploading' check(status in ('uploading','pending','approved','rejected')),
 created_at timestamptz not null default now(), expires_at timestamptz not null default now()+interval '24 hours',
 deleted_at timestamptz, moderated_by uuid references public.profiles(id) on delete set null, moderation_reason text,
 check(expires_at=created_at+interval '24 hours')
);
create unique index community_stories_active_check_in on public.community_stories(check_in_id) where deleted_at is null;
create table public.community_story_media_cleanup (story_id uuid primary key,owner_id uuid references public.profiles(id) on delete set null,created_at timestamptz not null default now());
alter table public.community_story_media_cleanup enable row level security;
revoke all on public.community_story_media_cleanup from anon,authenticated;
create index community_stories_city_live on public.community_stories(city_id,created_at desc,id) where status='approved' and public_opt_in and deleted_at is null;
create index community_stories_owner_recent on public.community_stories(owner_id,created_at desc);
create table public.community_story_reports (
 story_id uuid not null references public.community_stories(id) on delete cascade, reporter_id uuid not null references public.profiles(id) on delete cascade,
 reason text not null check(reason in ('unsafe','privacy','misleading','other')),created_at timestamptz not null default now(),
 primary key(story_id,reporter_id)
);
alter table public.community_stories enable row level security;
alter table public.community_story_reports enable row level security;
revoke all on public.community_stories,public.community_story_reports from anon,authenticated;
-- Identity/check-in cascades revoke metadata immediately while retaining only an
-- opaque object identifier for private cleanup. A deleted profile cannot be re-linked.
create function public.community_story_enqueue_deleted_media() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.community_story_media_cleanup(story_id,owner_id)
 values(old.id,case when exists(select 1 from public.profiles where id=old.owner_id) then old.owner_id else null end)
 on conflict(story_id) do update set owner_id=excluded.owner_id;
 return old;
end $$;
revoke all on function public.community_story_enqueue_deleted_media() from public,anon,authenticated;
create trigger community_story_delete_cleanup before delete on public.community_stories
 for each row execute function public.community_story_enqueue_deleted_media();
-- Restrictive bucket isolation also defeats unrelated permissive legacy policies.
create policy community_stories_server_only on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'community-stories') with check(bucket_id<>'community-stories');
-- Only the authorized server uploads.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('community-stories','community-stories',false,5242880,array['image/webp']);

create function public.community_stories_api(p_action text,p_payload jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); sid uuid; ci record; row_story public.community_stories; answer jsonb;
 staff boolean:=false; city_slug text:=p_payload->>'city';
 export_section text; page_limit integer; page_after uuid; page_rows jsonb; page_more boolean;
begin
 staff:=actor is not null and public.account_features_allowed() and public.has_platform_role(array['moderator','administrator']::public.app_role[]);
 -- Withdrawal is an ownership right, not a reward-producing account feature.
 if p_action not in ('cities','feed','media') and (actor is null or not exists(select 1 from public.profiles where id=actor)) then
  raise exception 'Account required' using errcode='42501';
 end if;
 if p_action not in ('cities','feed','media','mine','delete','abort','cleanup-complete','export') and not public.account_features_allowed() then
  raise exception 'Eligible account required' using errcode='42501';
 end if;
 if p_action in ('moderation','moderate') and not staff then raise exception 'Moderator required' using errcode='42501'; end if;
 if p_action='export' then
  export_section:=p_payload->>'section'; page_limit:=coalesce((p_payload->>'limit')::integer,100); page_after:=nullif(p_payload->>'after','')::uuid;
  if export_section not in ('stories','reports','cleanup') or export_section is null or page_limit<1 or page_limit>100 then raise exception 'Invalid export page' using errcode='22023'; end if;
  if export_section='stories' then
   select coalesce(jsonb_agg(x.data order by x.sort_id),'[]') into page_rows from (
    select s.id sort_id,jsonb_build_object('id',s.id,'checkInId',s.check_in_id,'venueId',s.venue_id,'cityId',s.city_id,'caption',s.caption,'kind',s.kind,'publicOptIn',s.public_opt_in,'status',s.status,'createdAt',s.created_at,'expiresAt',s.expires_at,'deletedAt',s.deleted_at) data
    from public.community_stories s where s.owner_id=actor and (page_after is null or s.id>page_after) order by s.id limit page_limit+1
   ) x;
  elsif export_section='reports' then
   select coalesce(jsonb_agg(x.data order by x.sort_id),'[]') into page_rows from (
    select r.story_id sort_id,jsonb_build_object('id',r.story_id,'reason',r.reason,'createdAt',r.created_at) data from public.community_story_reports r
    where r.reporter_id=actor and (page_after is null or r.story_id>page_after) order by r.story_id limit page_limit+1
   ) x;
  else
   select coalesce(jsonb_agg(x.data order by x.sort_id),'[]') into page_rows from (
    select q.story_id sort_id,jsonb_build_object('id',q.story_id,'status','pending','createdAt',q.created_at) data from public.community_story_media_cleanup q
    where q.owner_id=actor and (page_after is null or q.story_id>page_after) order by q.story_id limit page_limit+1
   ) x;
  end if;
  page_more:=jsonb_array_length(page_rows)>page_limit;
  select coalesce(jsonb_agg(value order by ordinality),'[]') into answer from jsonb_array_elements(page_rows) with ordinality where ordinality<=page_limit;
  return jsonb_build_object('section',export_section,'items',answer,'nextCursor',case when page_more then answer->(page_limit-1)->>'id' else null end,'truncated',page_more);
 elsif p_action='cities' then
  select coalesce(jsonb_agg(x),'[]') into answer from (
   select c.id,c.slug,c.name_es as "nameEs",c.name_en as "nameEn",
    public.st_y(c.center::public.geometry) as latitude,public.st_x(c.center::public.geometry) as longitude,
    (select count(*) from public.community_stories s join public.venues v on v.id=s.venue_id where s.city_id=c.id and s.status='approved' and s.public_opt_in and s.deleted_at is null and s.expires_at>now() and s.created_at>now()-interval '24 hours' and v.status='published' and v.verified) as "approvedStories24h"
   from public.cities c where c.center is not null order by c.slug limit 200
  ) x;
  return jsonb_build_object('cities',answer,'available',true);
 elsif p_action='check-ins' then
  select coalesce(jsonb_agg(x),'[]') into answer from (
   select ch.id,v.name as "venueName",c.slug as "citySlug",ch.created_at as "acceptedAt"
   from public.check_ins ch join public.venue_checkin_credentials cr on cr.id=ch.credential_id and cr.venue_id=ch.venue_id
   join public.venues v on v.id=ch.venue_id join public.cities c on c.id=v.city_id
   where ch.profile_id=actor and ch.state='accepted' and ch.created_at between now()-interval '24 hours' and now()
    and not ('outside_geofence'=any(coalesce(ch.risk_flags,'{}'::text[]))) and v.status='published' and v.verified
    and not exists(select 1 from public.community_stories s where s.check_in_id=ch.id and s.deleted_at is null)
   order by ch.created_at desc limit 20
  ) x;
  return jsonb_build_object('checkIns',answer,'available',true);
 elsif p_action='reserve' then
  if not exists(select 1 from public.community_story_settings where singleton and collection_enabled) then raise exception 'Story collection unavailable' using errcode='P0002'; end if;
  if p_payload->>'publicOptIn' is distinct from 'true' then raise exception 'Public opt-in required' using errcode='42501'; end if;
  if p_payload->>'kind' not in ('selfie','venue') or char_length(coalesce(p_payload->>'caption',''))>240 then raise exception 'Invalid input' using errcode='22023'; end if;
  perform 1 from public.profiles where id=actor for update;
  if (select count(*) from public.community_stories where owner_id=actor and created_at>now()-interval '24 hours')>=10 then raise exception 'Daily limit' using errcode='P0001'; end if;
  select ch.id,v.id venue_id,c.id city_id into ci from public.check_ins ch
   join public.venue_checkin_credentials cr on cr.id=ch.credential_id and cr.venue_id=ch.venue_id
   join public.venues v on v.id=ch.venue_id join public.cities c on c.id=v.city_id
   where ch.id=(p_payload->>'checkInId')::uuid and ch.profile_id=actor and ch.state='accepted'
    and ch.created_at between now()-interval '24 hours' and now()
    and not ('outside_geofence'=any(coalesce(ch.risk_flags,'{}'::text[]))) and v.status='published' and v.verified;
  if not found then raise exception 'Verified check-in required' using errcode='42501'; end if;
  insert into public.community_stories(owner_id,check_in_id,venue_id,city_id,caption,kind,public_opt_in)
   values(actor,ci.id,ci.venue_id,ci.city_id,trim(coalesce(p_payload->>'caption','')),p_payload->>'kind',true) returning id into sid;
  return jsonb_build_object('id',sid);
 elsif p_action='cleanup-complete' then
  sid:=(p_payload->>'id')::uuid;
  if not exists(select 1 from public.community_story_media_cleanup where story_id=sid and (owner_id=actor or staff)) then raise exception 'Not eligible' using errcode='42501'; end if;
  if exists(select 1 from storage.objects where bucket_id='community-stories' and name=sid::text||'.webp') then return jsonb_build_object('removed',false); end if;
  delete from public.community_story_media_cleanup where story_id=sid; return jsonb_build_object('removed',true);
 elsif p_action in ('finalize','abort','delete','report','moderate','media') then
  sid:=(p_payload->>'id')::uuid;
  select * into row_story from public.community_stories where id=sid for update;
  if not found then return null; end if;
  if p_action='abort' then
   if row_story.owner_id<>actor or row_story.status<>'uploading' then raise exception 'Not eligible' using errcode='42501'; end if;
   update public.community_stories set deleted_at=coalesce(deleted_at,now()) where id=sid;
   insert into public.community_story_media_cleanup(story_id,owner_id) values(sid,row_story.owner_id) on conflict do nothing;
   return jsonb_build_object('aborted',true);
  elsif p_action='finalize' then
   if row_story.owner_id<>actor or row_story.status<>'uploading' or row_story.deleted_at is not null then raise exception 'Not eligible' using errcode='42501'; end if;
   if not exists(select 1 from storage.objects where bucket_id='community-stories' and name=sid::text||'.webp') then raise exception 'Upload missing' using errcode='22023'; end if;
   update public.community_stories set status='pending' where id=sid;
  elsif p_action='delete' then
   if row_story.owner_id<>actor then raise exception 'Not eligible' using errcode='42501'; end if;
   update public.community_stories set deleted_at=coalesce(deleted_at,now()) where id=sid;
   insert into public.community_story_media_cleanup(story_id,owner_id) values(sid,row_story.owner_id) on conflict do nothing;
   return jsonb_build_object('deleted',true);
  elsif p_action='moderate' then
   if char_length(trim(coalesce(p_payload->>'reason','')))<3 or char_length(p_payload->>'reason')>240 or p_payload->>'decision' not in ('approve','reject','remove') then raise exception 'Reason required' using errcode='22023'; end if;
   if p_payload->>'decision'='approve' and not exists(select 1 from storage.objects where bucket_id='community-stories' and name=sid::text||'.webp') then raise exception 'Upload missing' using errcode='22023'; end if;
   if row_story.status='uploading' or row_story.deleted_at is not null or row_story.expires_at<=now() then raise exception 'Not eligible' using errcode='22023'; end if;
   update public.community_stories set status=case when p_payload->>'decision'='approve' then 'approved' else 'rejected' end,
    deleted_at=case when p_payload->>'decision'='remove' then now() else deleted_at end,moderated_by=actor,moderation_reason=trim(p_payload->>'reason') where id=sid;
   if p_payload->>'decision'='remove' then insert into public.community_story_media_cleanup(story_id,owner_id) values(sid,row_story.owner_id) on conflict do nothing; end if;
  else
   if row_story.deleted_at is not null or row_story.expires_at<=now() then return null; end if;
   if not (row_story.status='approved' and row_story.public_opt_in and exists(select 1 from public.venues where id=row_story.venue_id and status='published' and verified)) then
    if p_action<>'media' or not (staff or coalesce(row_story.owner_id=actor,false)) then return null; end if;
   end if;
   if p_action='report' then
    perform 1 from public.profiles where id=actor for update;
    if (select count(*) from public.community_story_reports where reporter_id=actor and created_at>now()-interval '24 hours')>=20 then raise exception 'Daily limit' using errcode='P0001'; end if;
    insert into public.community_story_reports(story_id,reporter_id,reason) values(sid,actor,p_payload->>'reason') on conflict do nothing;
    return jsonb_build_object('reported',true);
   end if;
   return jsonb_build_object('id',sid);
  end if;
  select jsonb_build_object('id',s.id,'citySlug',c.slug,'venueName',v.name,'status',s.status,'createdAt',s.created_at,'expiresAt',s.expires_at) into answer from public.community_stories s join public.cities c on c.id=s.city_id join public.venues v on v.id=s.venue_id where s.id=sid;
  return jsonb_build_object('story',answer,'moderation','manual');
 elsif p_action in ('feed','mine','moderation') then
  select coalesce(jsonb_agg(x),'[]') into answer from (
   select s.id,c.slug as "citySlug",v.name as "venueName",s.caption,s.kind,s.status,s.created_at as "createdAt",s.expires_at as "expiresAt",
    '/api/community/stories/'||s.id::text||'/media' as "mediaUrl",
    case when p_action='moderation' then (select count(*) from public.community_story_reports r where r.story_id=s.id) else null end as "reportCount"
   from public.community_stories s join public.cities c on c.id=s.city_id join public.venues v on v.id=s.venue_id
   where s.deleted_at is null and s.expires_at>now() and s.status<>'uploading'
    and ((p_action='mine' and s.owner_id=actor) or (p_action='moderation' and staff and s.status in ('pending','approved') and ((p_payload->>'queue'='reported' and exists(select 1 from public.community_story_reports r where r.story_id=s.id)) or (coalesce(p_payload->>'queue','pending')='pending' and s.status='pending'))) or (p_action='feed' and c.slug=city_slug and s.status='approved' and s.public_opt_in and v.status='published' and v.verified))
   order by s.created_at desc,s.id desc limit 50
  ) x;
  return jsonb_build_object('stories',answer,'nextCursor',null,'available',true);
 end if;
 raise exception 'Invalid action' using errcode='22023';
end $$;
revoke all on function public.community_stories_api(text,jsonb) from public;
grant execute on function public.community_stories_api(text,jsonb) to anon,authenticated;
comment on function public.community_stories_api(text,jsonb) is 'Bounded public projections and caller-authorized story lifecycle; no attendance or XP writes. Source-only until separately deployed.';
commit;
