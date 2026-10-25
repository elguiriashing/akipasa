begin;
alter table public.account_deletion_requests add column verified_at timestamptz,
 add column due_at timestamptz;
create schema if not exists account_privacy_private;
revoke all on schema account_privacy_private from public, anon, authenticated;
create table account_privacy_private.reviews (
 request_id uuid primary key references public.account_deletion_requests(id) on delete cascade,
 target_profile uuid not null,
 checks jsonb not null default '{}'::jsonb,
 legal_hold boolean not null default true,
 evidence text not null check (length(evidence) between 30 and 4000),
 reviewed_by uuid references public.profiles(id) on delete set null,
 reviewed_at timestamptz not null default now(),
 lease uuid, lease_until timestamptz,
 finished_at timestamptz,
 evidence_until timestamptz,
 manual_confirmation_at timestamptz,
 confirmation_evidence text check(length(confirmation_evidence)<=1000)
);
alter table account_privacy_private.reviews enable row level security;
revoke all on account_privacy_private.reviews from public, anon, authenticated, service_role;
create table account_privacy_private.events (
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null references public.account_deletion_requests(id) on delete cascade,
 event text not null check(event in ('reviewed','execution_started','execution_failed','identity_deleted','confirmation_recorded')),
 created_at timestamptz not null default now()
);
alter table account_privacy_private.events enable row level security;
revoke all on account_privacy_private.events from public, anon, authenticated, service_role;
create index on account_privacy_private.events(created_at);
create table account_privacy_private.settings (
 singleton boolean primary key default true check(singleton),
 retention_enabled boolean not null default false
);
alter table account_privacy_private.settings enable row level security;
revoke all on account_privacy_private.settings from public, anon, authenticated, service_role;
insert into account_privacy_private.settings(singleton) values(true);

create function public.review_account_deletion(p_request uuid,p_target uuid,p_checks jsonb,p_legal_hold boolean,p_evidence text)
returns void language plpgsql security definer set search_path='' as $$
declare r public.account_deletion_requests; existing account_privacy_private.reviews;
begin
 if auth.uid() is null or not public.has_platform_role(array['administrator']::public.app_role[]) then raise exception 'administrator required'; end if;
 if p_evidence is null or length(trim(p_evidence)) not between 30 and 4000 or p_legal_hold is null
 or p_checks is null or jsonb_typeof(p_checks)<>'object' then raise exception 'invalid review'; end if;
 if exists(select 1 from jsonb_object_keys(p_checks) k where k not in ('identityVerified','sessionsReviewed','storageCleared','providersResolved','businessContinuityResolved','retentionRecorded','confirmationContactVerified')) then raise exception 'invalid checks'; end if;
 select * into r from public.account_deletion_requests where id=p_request for update;
 if not found or r.state not in ('requested','processing') or r.profile_id is null or r.profile_id is distinct from p_target or p_target=auth.uid() then raise exception 'invalid target'; end if;
 select * into existing from account_privacy_private.reviews where request_id=p_request;
 if existing.lease_until>now() then raise exception 'execution in progress'; end if;
 insert into account_privacy_private.reviews(request_id,target_profile,checks,legal_hold,evidence,reviewed_by)
 values(p_request,p_target,p_checks,p_legal_hold,trim(p_evidence),auth.uid())
 on conflict(request_id) do update set checks=excluded.checks,legal_hold=excluded.legal_hold,evidence=excluded.evidence,
 reviewed_by=excluded.reviewed_by,reviewed_at=now(),lease=null,lease_until=null,finished_at=null,evidence_until=null;
 insert into account_privacy_private.events(request_id,event) values(p_request,'reviewed');
 if p_checks @> '{"identityVerified":true}'::jsonb then
  update public.account_deletion_requests set verified_at=coalesce(verified_at,now()),due_at=coalesce(due_at,now()+interval '48 hours') where id=p_request;
 end if;
end $$;
revoke all on function public.review_account_deletion(uuid,uuid,jsonb,boolean,text) from public,anon,service_role;
grant execute on function public.review_account_deletion(uuid,uuid,jsonb,boolean,text) to authenticated;

-- Read-only FK preflight. Metadata identifiers are quoted, the exact profile is
-- a bound parameter, and rows are never returned. No FK or retained record changes.
create function account_privacy_private.identity_dependencies(p_profile uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare fk record; blocked boolean; result jsonb:='[]'::jsonb;
begin
 for fk in
 select n.nspname schema_name,t.relname table_name,c.conname constraint_name,
 a.attname column_name,cardinality(c.conkey) key_count,c.confdeltype
 from pg_catalog.pg_constraint c
 join pg_catalog.pg_class t on t.oid=c.conrelid
 join pg_catalog.pg_namespace n on n.oid=t.relnamespace
 join pg_catalog.pg_attribute a on a.attrelid=t.oid and a.attnum=c.conkey[1]
 where c.contype='f' and c.confrelid='public.profiles'::regclass and c.confdeltype in ('a','r')
 order by n.nspname,t.relname,c.conname
 loop
  if fk.key_count<>1 then blocked:=true;
  else execute format('select exists(select 1 from %I.%I where %I=$1)',fk.schema_name,fk.table_name,fk.column_name) into blocked using p_profile;
  end if;
  result:=result||jsonb_build_array(jsonb_build_object('schema',fk.schema_name,'table',fk.table_name,'column',fk.column_name,'constraint',fk.constraint_name,'blocking',blocked,'composite',fk.key_count<>1));
 end loop;
 return result;
end $$;
revoke all on function account_privacy_private.identity_dependencies(uuid) from public,anon,authenticated,service_role;

create function public.account_deletion_dependencies(p_request uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if auth.uid() is null or not public.has_platform_role(array['administrator']::public.app_role[]) then raise exception 'administrator required'; end if;
 select profile_id into target from public.account_deletion_requests where id=p_request and state in ('requested','processing');
 if target is null then raise exception 'active linked request required'; end if;
 return account_privacy_private.identity_dependencies(target);
end $$;
revoke all on function public.account_deletion_dependencies(uuid) from public,anon,service_role;
grant execute on function public.account_deletion_dependencies(uuid) to authenticated;

create function public.begin_account_deletion(p_request uuid,p_target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.account_deletion_requests; v account_privacy_private.reviews; token uuid;
begin
 if auth.uid() is null or not public.has_platform_role(array['administrator']::public.app_role[]) then raise exception 'administrator required'; end if;
 select * into r from public.account_deletion_requests where id=p_request for update;
 if not found or r.state not in ('requested','processing') or r.profile_id is distinct from p_target or p_target is null or p_target=auth.uid() then raise exception 'invalid target'; end if;
 select * into v from account_privacy_private.reviews where request_id=p_request for update;
 if not found or v.legal_hold or v.reviewed_by is distinct from auth.uid() or v.reviewed_at<now()-interval '24 hours'
 or v.lease_until>now() or v.finished_at is not null or v.target_profile is distinct from p_target
 or not(v.checks @> '{"identityVerified":true,"sessionsReviewed":true,"storageCleared":true,"providersResolved":true,"businessContinuityResolved":true,"retentionRecorded":true,"confirmationContactVerified":true}'::jsonb)
 then raise exception 'review incomplete, stale or blocked'; end if;
 if exists(select 1 from jsonb_array_elements(account_privacy_private.identity_dependencies(p_target)) dependency where coalesce((dependency->>'blocking')::boolean,true)) then raise exception 'identity dependencies require scoped manual resolution'; end if;
 token:=gen_random_uuid();
 update account_privacy_private.reviews set lease=token,lease_until=now()+interval '10 minutes' where request_id=p_request;
 update public.account_deletion_requests set state='processing',updated_at=now(),updated_by=auth.uid() where id=p_request;
 insert into account_privacy_private.events(request_id,event) values(p_request,'execution_started');
 return jsonb_build_object('profile',p_target,'lease',token);
end $$;
revoke all on function public.begin_account_deletion(uuid,uuid) from public,anon,service_role;
grant execute on function public.begin_account_deletion(uuid,uuid) to authenticated;

create function public.finish_account_deletion(p_request uuid,p_lease uuid,p_succeeded boolean)
returns void language plpgsql security definer set search_path='' as $$
declare r public.account_deletion_requests; v account_privacy_private.reviews;
begin
 if auth.uid() is null or not public.has_platform_role(array['administrator']::public.app_role[]) then raise exception 'administrator required'; end if;
 select * into r from public.account_deletion_requests where id=p_request for update;
 select * into v from account_privacy_private.reviews where request_id=p_request for update;
 if not found or p_lease is null or v.lease is distinct from p_lease or v.reviewed_by is distinct from auth.uid() or v.finished_at is not null then raise exception 'invalid execution lease'; end if;
 if p_succeeded is null then raise exception 'execution result required'; end if;
 if p_succeeded then
  if r.profile_id is not null or exists(select 1 from public.profiles where id=v.target_profile) then raise exception 'identity still exists'; end if;
  update account_privacy_private.reviews set finished_at=now(),evidence_until=now()+interval '12 months',lease_until=null where request_id=p_request;
  -- Keep the request open until the separately written human email is recorded.
 else
  update account_privacy_private.reviews set lease=null,lease_until=null,checks='{}'::jsonb where request_id=p_request;
 end if;
 insert into account_privacy_private.events(request_id,event) values(p_request,case when p_succeeded then 'identity_deleted' else 'execution_failed' end);
end $$;
revoke all on function public.finish_account_deletion(uuid,uuid,boolean) from public,anon,service_role;
grant execute on function public.finish_account_deletion(uuid,uuid,boolean) to authenticated;

-- Recovery after Auth succeeded but acknowledgement was interrupted. This does
-- not call Auth or repeat erasure; the same reviewer confirms the original UUID.
create function public.reconcile_account_deletion(p_request uuid,p_target uuid)
returns void language plpgsql security definer set search_path='' as $$
declare v account_privacy_private.reviews;
begin
 if auth.uid() is null or not public.has_platform_role(array['administrator']::public.app_role[]) then raise exception 'administrator required'; end if;
 perform 1 from public.account_deletion_requests where id=p_request and state='processing' and profile_id is null for update;
 if not found then raise exception 'unlinked processing request required'; end if;
 select * into v from account_privacy_private.reviews where request_id=p_request for update;
 if not found or p_target is null or v.target_profile is distinct from p_target or v.reviewed_by is distinct from auth.uid() or v.finished_at is not null or v.lease is null then raise exception 'original exact account execution required'; end if;
 perform public.finish_account_deletion(p_request,v.lease,true);
end $$;
revoke all on function public.reconcile_account_deletion(uuid,uuid) from public,anon,service_role;
grant execute on function public.reconcile_account_deletion(uuid,uuid) to authenticated;

create function public.confirm_account_deletion_reply(p_request uuid,p_evidence text)
returns void language plpgsql security definer set search_path='' as $$
declare r public.account_deletion_requests;
begin
 if auth.uid() is null or not public.has_platform_role(array['administrator']::public.app_role[]) then raise exception 'administrator required'; end if;
 if p_evidence is null or length(trim(p_evidence)) not between 10 and 1000 then raise exception 'manual send evidence required'; end if;
 select * into r from public.account_deletion_requests where id=p_request for update;
 if not found or r.state<>'processing' or r.profile_id is not null then raise exception 'deletion not ready for confirmation'; end if;
 update account_privacy_private.reviews set manual_confirmation_at=now(),confirmation_evidence=trim(p_evidence),evidence_until=now()+interval '12 months'
 where request_id=p_request and finished_at is not null and not legal_hold and manual_confirmation_at is null;
 if not found then raise exception 'reviewed deletion required'; end if;
 update public.account_deletion_requests set state='completed',completed_at=now(),updated_at=now(),updated_by=auth.uid(),resolution='Reviewed identity deletion and manual support confirmation; restricted retention recorded separately.' where id=p_request;
 insert into account_privacy_private.events(request_id,event) values(p_request,'confirmation_recorded');
end $$;
revoke all on function public.confirm_account_deletion_reply(uuid,text) from public,anon,service_role;
grant execute on function public.confirm_account_deletion_reply(uuid,text) to authenticated;

create function public.hold_account_deletion(p_request uuid,p_hold boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not public.has_platform_role(array['administrator']::public.app_role[]) then raise exception 'administrator required'; end if;
 perform 1 from public.account_deletion_requests where id=p_request for update;
 update account_privacy_private.reviews set legal_hold=p_hold
 where request_id=p_request and (lease_until is null or lease_until<=now());
 if not found or p_hold is null then raise exception 'review absent or execution in progress'; end if;
end $$;
revoke all on function public.hold_account_deletion(uuid,boolean) from public,anon,service_role;
grant execute on function public.hold_account_deletion(uuid,boolean) to authenticated;

-- Existing status-only RPC and direct privileged updates cannot bypass review.
create function account_privacy_private.require_completed_review() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.state='cancelled' and old.state is distinct from new.state then
  if exists(select 1 from account_privacy_private.reviews where request_id=new.id and (lease_until>now() or finished_at is not null)) then raise exception 'execution must be reconciled before cancellation'; end if;
  update account_privacy_private.reviews set evidence_until=now()+interval '12 months' where request_id=new.id;
 end if;
 if new.state='completed' and old.state is distinct from new.state then
  if not exists(select 1 from account_privacy_private.reviews where request_id=new.id and finished_at is not null and manual_confirmation_at is not null and not legal_hold) then raise exception 'reviewed identity execution and manual confirmation required'; end if;
 end if;
 return new;
end $$;
revoke all on function account_privacy_private.require_completed_review() from public,anon,authenticated,service_role;
create trigger account_deletion_completion_review before update on public.account_deletion_requests
for each row execute function account_privacy_private.require_completed_review();

create function public.purge_account_deletion_evidence() returns integer
language plpgsql security definer set search_path='' as $$
declare count_deleted integer;
begin
 if not exists(select 1 from account_privacy_private.settings where retention_enabled) then return 0; end if;
 -- Only this new workflow's logs/evidence. No accounts, business/provider rows,
 -- existing support mail, statutory records or historical audit are purged.
 delete from account_privacy_private.events where id in
 (select e.id from account_privacy_private.events e where e.created_at<now()-interval '90 days'
 and not exists(select 1 from account_privacy_private.reviews v where v.request_id=e.request_id and v.legal_hold) order by e.created_at limit 1000);
 delete from public.account_deletion_requests where id in
 (select v.request_id from account_privacy_private.reviews v join public.account_deletion_requests r on r.id=v.request_id
 where v.evidence_until<now() and not v.legal_hold and
 ((r.state='completed' and v.finished_at is not null) or (r.state='cancelled' and v.finished_at is null))
 order by v.evidence_until limit 1000);
 get diagnostics count_deleted=row_count;
 return count_deleted;
end $$;
revoke all on function public.purge_account_deletion_evidence() from public,anon,authenticated;
grant execute on function public.purge_account_deletion_evidence() to service_role;
commit;
