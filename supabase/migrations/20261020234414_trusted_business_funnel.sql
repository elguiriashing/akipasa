-- Optional commercial measurement, future events only. No enrollment, backfill or billing mutation.
begin;
alter type public.analytics_action add value if not exists 'suite_business_stage';
create schema suite_funnel_private;
revoke all on schema suite_funnel_private from public,anon,authenticated;
grant usage on schema suite_funnel_private to service_role;
create table suite_funnel_private.settings(singleton boolean primary key default true check(singleton),enabled boolean not null default false,retention_days integer check(retention_days between 1 and 3650),retention_approval_ref text check(length(retention_approval_ref) between 1 and 200),enabled_since timestamptz,capture_failures bigint not null default 0,last_error text check(last_error is null or last_error ~ '^[A-Z0-9]{5}$'),check(not enabled or (retention_days is not null and retention_approval_ref is not null)));
insert into suite_funnel_private.settings(singleton,enabled) values(true,false);
create table suite_funnel_private.stages(
 analytics_id bigint primary key references public.analytics_events(id) on delete cascade deferrable initially deferred,
 stage text not null check(stage in('claim_completed','hq_activated','checkout_started','payment_verified','subscription_upgraded','subscription_cancelled')),
 proof_key text not null check(length(proof_key) between 1 and 512),
 profile_id uuid not null references public.profiles(id) on delete cascade,
 workspace_id text references public.crm_workspaces(id) on delete cascade,
 venue_id uuid references public.venues(id) on delete cascade,
 occurred_at timestamptz not null default now(),consented_at timestamptz not null,
 unique(stage,proof_key),check(workspace_id is not null or venue_id is not null)
);
create index suite_funnel_workspace_time on suite_funnel_private.stages(workspace_id,occurred_at);
create index suite_funnel_venue_time on suite_funnel_private.stages(venue_id,occurred_at);
create index suite_funnel_profile on suite_funnel_private.stages(profile_id);
create index suite_funnel_retention on suite_funnel_private.stages(occurred_at);
alter table suite_funnel_private.settings enable row level security;
alter table suite_funnel_private.stages enable row level security;
revoke all on suite_funnel_private.settings,suite_funnel_private.stages from public,anon,authenticated,service_role;
grant select,update on suite_funnel_private.settings to service_role;
grant select on suite_funnel_private.stages to service_role;
create policy suite_funnel_settings_service on suite_funnel_private.settings to service_role using(true) with check(true);
create policy suite_funnel_stages_service on suite_funnel_private.stages for select to service_role using(true);

create function suite_funnel_private.stamp_activation() returns trigger
language plpgsql security definer set search_path='' as $$begin
 if new.enabled and not old.enabled then new.enabled_since:=now();end if;return new;
end $$;
create trigger suite_funnel_activation before update of enabled on suite_funnel_private.settings for each row execute function suite_funnel_private.stamp_activation();
create function suite_funnel_private.subject_allowed(p_profile uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p join public.personalisation_settings s on s.profile_id=p.id
 where p.id=p_profile and s.analytics_enabled and s.marketing_enabled and s.updated_at<=now()
 and (p.birth_year is null or extract(year from now() at time zone 'UTC')::integer-p.birth_year>=18)
 and not exists(select 1 from account_private.onboarding o where o.profile_id=p.id and o.status<>'complete'))
$$;
create function suite_funnel_private.emit(p_stage text,p_proof text,p_profile uuid,p_workspace text,p_venue uuid) returns void
language plpgsql security definer set search_path='' as $$
declare event_id bigint; consent_time timestamptz;
begin
 if not coalesce((select enabled from suite_funnel_private.settings where singleton),false)
 then return;end if;
 perform pg_advisory_xact_lock(hashtextextended(p_profile::text,734414));
 if not suite_funnel_private.subject_allowed(p_profile) then return;end if;
 select updated_at into consent_time from public.personalisation_settings where profile_id=p_profile;
 event_id:=nextval(pg_get_serial_sequence('public.analytics_events','id'));
 insert into suite_funnel_private.stages(analytics_id,stage,proof_key,profile_id,workspace_id,venue_id,consented_at)
 values(event_id,p_stage,p_proof,p_profile,p_workspace,p_venue,consent_time) on conflict(stage,proof_key) do nothing;
 if not found then return;end if;
 insert into public.analytics_events(id,action,venue_id,profile_id,metadata) overriding system value
 values(event_id,'suite_business_stage',p_venue,p_profile,jsonb_strip_nulls(jsonb_build_object('stage',p_stage,'workspace_id',p_workspace,'product',case when p_stage in('claim_completed','hq_activated') then 'hq' else 'business' end)));
exception when others then
 -- Optional measurement must never abort a verified billing/claim operation.
 update suite_funnel_private.settings set capture_failures=capture_failures+1,last_error=sqlstate where singleton;
 raise log 'business_funnel_capture_failed SQLSTATE=%',sqlstate;
 return;
end $$;
-- The existing generic analytics RPC must not be able to invent trusted stage rows.
create function suite_funnel_private.protect_analytics() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.action::text='suite_business_stage' and not exists(select 1 from suite_funnel_private.stages s
 where s.analytics_id=new.id and s.venue_id is not distinct from new.venue_id and s.profile_id=new.profile_id
 and new.metadata=jsonb_strip_nulls(jsonb_build_object('stage',s.stage,'workspace_id',s.workspace_id,'product',case when s.stage in('claim_completed','hq_activated') then 'hq' else 'business' end)))
 then raise exception 'Trusted funnel evidence required' using errcode='42501';end if;
 return new;
end $$;
create trigger trusted_funnel_analytics before insert or update of action,venue_id,metadata on public.analytics_events for each row execute function suite_funnel_private.protect_analytics();
create function suite_funnel_private.remove_optional_event() returns trigger
language plpgsql security definer set search_path='' as $$begin delete from public.analytics_events where id=old.analytics_id and action::text='suite_business_stage';return old;end $$;
create trigger suite_funnel_remove_event after delete on suite_funnel_private.stages for each row execute function suite_funnel_private.remove_optional_event();
create function suite_funnel_private.lock_subject() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid;
begin
 if tg_table_name='profiles' then
  if tg_op='DELETE' then subject:=old.id;else subject:=new.id;end if;
 elsif tg_op='DELETE' then subject:=old.profile_id;else subject:=new.profile_id;end if;
 perform pg_advisory_xact_lock(hashtextextended(subject::text,734414));
 if tg_op='DELETE' then return old;else return new;end if;
end $$;
create trigger suite_funnel_lock_consent before update or delete on public.personalisation_settings for each row execute function suite_funnel_private.lock_subject();
create trigger suite_funnel_lock_age before update of birth_year or delete on public.profiles for each row execute function suite_funnel_private.lock_subject();
create trigger suite_funnel_lock_onboarding before insert or update of status on account_private.onboarding for each row execute function suite_funnel_private.lock_subject();
create function suite_funnel_private.withdraw() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid;
begin
 if tg_op='DELETE' then subject:=old.profile_id;
 elsif tg_table_name in('personalisation_settings','onboarding') then subject:=new.profile_id;else subject:=new.id;end if;
 if not suite_funnel_private.subject_allowed(subject) then delete from suite_funnel_private.stages where profile_id=subject;end if;
 return new;
end $$;
create trigger suite_funnel_consent_withdraw after update or delete on public.personalisation_settings for each row execute function suite_funnel_private.withdraw();
create trigger suite_funnel_age_withdraw after update of birth_year on public.profiles for each row execute function suite_funnel_private.withdraw();
create trigger suite_funnel_onboarding_withdraw after insert or update of status on account_private.onboarding for each row execute function suite_funnel_private.withdraw();

create function suite_funnel_private.claim_completed() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.status::text='approved' and old.status::text is distinct from 'approved'
 and new.decided_by=auth.uid() and exists(select 1 from public.profiles p where p.id=new.decided_by and p.app_role::text in('administrator','moderator'))
 and exists(select 1 from public.venue_claims c join public.venue_members m on m.venue_id=c.venue_id and m.profile_id=c.claimant_id
 where c.id=new.id and c.status::text='approved' and c.decided_by is not null and c.decided_at is not null and m.role::text='owner')
 then perform suite_funnel_private.emit('claim_completed','claim:'||new.id,new.claimant_id,null,new.venue_id);end if;
 return new;
end $$;
create constraint trigger suite_funnel_claim after insert or update on public.venue_claims deferrable initially deferred for each row execute function suite_funnel_private.claim_completed();
create function suite_funnel_private.hq_activated() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 -- Explicit owner-created management workspace, not a visit, staff provisioning or migration.
 if auth.uid()=new.owner_profile_id and exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id
 where w.id=new.id and w.owner_profile_id=new.owner_profile_id and w.status in('active','trial') and m.profile_id=w.owner_profile_id and m.status='active' and m.role='owner')
 then perform suite_funnel_private.emit('hq_activated','workspace:'||new.id,new.owner_profile_id,new.id,new.source_venue_id);end if;
 return new;
end $$;
create constraint trigger suite_funnel_hq after insert on public.crm_workspaces deferrable initially deferred for each row execute function suite_funnel_private.hq_activated();
create function suite_funnel_private.checkout_started() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.session_id like 'cs_%' and new.state='reserved' and (tg_op='INSERT' or old.session_id is distinct from new.session_id)
 and exists(select 1 from public.crm_workspaces w join public.crm_workspace_members m on m.workspace_id=w.id
 where w.id=new.workspace_id and w.owner_profile_id=new.profile_id and m.profile_id=new.profile_id and m.role='owner' and m.status='active')
 then perform suite_funnel_private.emit('checkout_started','checkout:'||new.token,new.profile_id,new.workspace_id,null);end if;
 return new;
end $$;
create trigger suite_funnel_checkout after insert or update on akibusiness_private.operations_checkouts for each row execute function suite_funnel_private.checkout_started();
create function suite_funnel_private.billing_transition() returns trigger
language plpgsql security definer set search_path='' as $$
declare subject uuid; evidence text; event_key text; evidence_count integer;
begin
 if new.source<>'stripe' or new.subscription_id is null or (tg_op='UPDATE' and old.billing_revision=new.billing_revision) then return new;end if;
 -- Deferred until the sole verified billing apply has appended its durable event.
 if not exists(select 1 from akibusiness_private.toolboxes b where b.workspace_id=new.workspace_id and b.billing_revision=new.billing_revision) then return new;end if;
 select b.profile_id into subject from akibusiness_private.operations_subscriptions b join public.crm_workspaces w on w.id=b.workspace_id
 where b.subscription_id=new.subscription_id and b.workspace_id=new.workspace_id and w.owner_profile_id=b.profile_id;
 if subject is null then return new;end if;
 select count(*),min(e.event_id),min(e.evidence) into evidence_count,event_key,evidence from akibusiness_private.operations_billing_events e
 where e.subscription_id=new.subscription_id and e.processed_at=transaction_timestamp()
 and (e.evidence like 'stripe-invoice:in_%' or e.evidence like 'stripe-current:%');
 if evidence_count<>1 then return new;end if; -- Ambiguous provenance is unavailable, never guessed.
 if new.billing_status='active' and new.paid_until>now() and evidence like 'stripe-invoice:in_%' then
 perform suite_funnel_private.emit('payment_verified',evidence,subject,new.workspace_id,null);
 if tg_op='UPDATE' and array_position(array['basico','standard','pro'],new.tier)>array_position(array['basico','standard','pro'],old.tier) then
 perform suite_funnel_private.emit('subscription_upgraded',evidence,subject,new.workspace_id,null);end if;
 end if;
 if new.billing_status='canceled' and tg_op='UPDATE' and old.billing_status<>'canceled' then
 perform suite_funnel_private.emit('subscription_cancelled','cancellation:'||event_key,subject,new.workspace_id,null);end if;
 return new;
end $$;
create constraint trigger suite_funnel_billing after insert or update on akibusiness_private.toolboxes deferrable initially deferred for each row execute function suite_funnel_private.billing_transition();

create function public.suite_business_funnel(p_workspace text,p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; source_venue uuid; collection_since timestamptz; retention integer;
begin
 if not public.account_features_allowed() or not exists(select 1 from public.crm_workspace_members m
 where m.workspace_id=p_workspace and m.profile_id=auth.uid() and m.status='active' and m.role in('owner','admin','manager'))
 or not public.crm_can_access_workspace(p_workspace) then raise exception 'Workspace manager required' using errcode='42501';end if;
 if p_days is null or p_days<1 or p_days>90 then raise exception 'Period must be between 1 and 90 days';end if;
 select source_venue_id into source_venue from public.crm_workspaces where id=p_workspace;
 if not coalesce((select enabled from suite_funnel_private.settings where singleton),false) then
 return jsonb_build_object('available',false,'reason','not_activated');end if;
 select enabled_since,retention_days into collection_since,retention from suite_funnel_private.settings where singleton;
 if collection_since is null then return jsonb_build_object('available',false,'reason','not_initialized');end if;
 select coalesce(jsonb_object_agg(stage,total),'{}') into result from (
 select s.stage,count(*) total from suite_funnel_private.stages s where s.occurred_at>=greatest(collection_since,now()-make_interval(days=>least(p_days,retention)))
 and (s.workspace_id=p_workspace or (s.workspace_id is null and s.venue_id=source_venue and public.is_venue_member(source_venue)))
 and suite_funnel_private.subject_allowed(s.profile_id) group by s.stage) counts;
 return jsonb_build_object('available',true,'scope','workspace','days',p_days,'stages',result,'coverage','consented_verified_observations_only',
 'retention_days',retention,'collection_started_at',collection_since,'claim_stage_available',source_venue is not null and public.is_venue_member(source_venue),'cta_attribution_available',false,'conversion_rate_available',false,'hq_activation_definition','owner_created_management_workspace');
end $$;
create function public.purge_suite_business_funnel(p_limit integer default 500) returns integer
language plpgsql security definer set search_path='' as $$
declare removed integer; retention integer;
begin
 select retention_days into retention from suite_funnel_private.settings where singleton and retention_approval_ref is not null;
 if retention is null then return 0;end if;
 delete from suite_funnel_private.stages where analytics_id in(select analytics_id from suite_funnel_private.stages where occurred_at<now()-make_interval(days=>retention) order by occurred_at,analytics_id limit greatest(1,least(coalesce(p_limit,500),1000)));
 get diagnostics removed=row_count;return removed;
end $$;
revoke all on all functions in schema suite_funnel_private from public,anon,authenticated,service_role;
revoke all on function public.suite_business_funnel(text,integer) from public,anon;
grant execute on function public.suite_business_funnel(text,integer) to authenticated;
revoke all on function public.purge_suite_business_funnel(integer) from public,anon,authenticated;
grant execute on function public.purge_suite_business_funnel(integer) to service_role;
commit;
