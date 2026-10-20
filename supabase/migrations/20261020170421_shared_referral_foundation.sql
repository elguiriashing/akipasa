begin;

-- Shared account attribution; monetary incentives and disbursement are deliberately disabled.
create table public.suite_referral_programmes (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(name) between 2 and 120),
 programme_type text not null check (programme_type in ('public','representative','partner')),
 state text not null default 'draft' check (state in ('draft','active','suspended')),
 eligible_products text[] not null default '{}',
 starts_at timestamptz not null default now(), ends_at timestamptz,
 attribution_days integer not null default 30 check (attribution_days between 1 and 365),
 discount_percent numeric(5,2) check (discount_percent > 0 and discount_percent <= 100),
 discount_fixed_cents bigint check (discount_fixed_cents > 0),
 commission_percent numeric(5,2) check (commission_percent > 0 and commission_percent <= 100),
 commission_fixed_cents bigint check (commission_fixed_cents > 0),
 commission_basis text check (commission_basis in ('initial_invoice','each_invoice')),
 currency text not null default 'eur' check (currency ~ '^[a-z]{3}$'),
 terms_version text,
 monetary_enabled boolean not null default false check (monetary_enabled = false),
 payouts_enabled boolean not null default false check (payouts_enabled = false),
 created_at timestamptz not null default now(),
 check (ends_at is null or ends_at > starts_at),
 check (discount_percent is null or discount_fixed_cents is null),
 check (commission_percent is null or commission_fixed_cents is null)
);
create table public.suite_referral_representatives (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 state text not null default 'pending' check (state in ('pending','approved','suspended')),
 approved_by uuid references public.profiles(id) on delete set null, approved_at timestamptz
);
create table public.suite_referral_codes (
 code text primary key check (code ~ '^[A-Z0-9]{8,24}$'),
 programme_id uuid not null references public.suite_referral_programmes(id),
 owner_profile_id uuid references public.profiles(id) on delete set null,
 revoked_at timestamptz, expires_at timestamptz,
 usage_limit integer check (usage_limit > 0),
 created_at timestamptz not null default now()
);
create index suite_referral_codes_owner on public.suite_referral_codes(owner_profile_id);
create table public.suite_referral_attributions (
 profile_id uuid primary key references public.profiles(id) on delete cascade,
 code text not null references public.suite_referral_codes(code),
 source_product text not null check (source_product in ('akipasa','akiduermo','akicoches','akihq','akibusiness')),
 captured_at timestamptz not null default now(),
 expires_at timestamptz not null
);
create index suite_referral_attributions_code on public.suite_referral_attributions(code);
create table public.suite_referral_leads (
 id uuid primary key default gen_random_uuid(),
 representative_id uuid not null references public.suite_referral_representatives(profile_id) on delete cascade,
 business_name text not null check (length(business_name) between 2 and 160),
 contact_email text check (contact_email is null or length(contact_email) <= 254),
 stage text not null default 'registered' check (stage in ('registered','qualified','contacted','converted','lost')),
 notes text not null default '' check (length(notes) <= 2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index suite_referral_leads_rep on public.suite_referral_leads(representative_id,created_at desc);
-- Append-only evidence, not an accounts-payable promise. No paid/approved state exists yet.
create table public.suite_referral_billing_events (
 stripe_event_id text primary key check (stripe_event_id ~ '^evt_[A-Za-z0-9]+$'),
 event_kind text not null check (event_kind in ('paid','refund_hold','dispute_hold')),
 profile_id uuid references public.profiles(id) on delete set null,
 code text not null references public.suite_referral_codes(code),
 stripe_customer_id text not null,
 stripe_subscription_id text,
 stripe_invoice_id text,
 product_code text,
 amount_paid_cents bigint check (amount_paid_cents >= 0), currency text,
 proposed_commission_cents bigint check (proposed_commission_cents >= 0), rule_snapshot jsonb,
 stripe_created_at timestamptz not null,
 recorded_at timestamptz not null default now(),
 eligibility text not null default 'held_unapproved' check (eligibility = 'held_unapproved'),
 check (event_kind <> 'paid' or (stripe_invoice_id is not null and amount_paid_cents > 0))
);
create unique index suite_referral_one_paid_invoice on public.suite_referral_billing_events(stripe_invoice_id) where event_kind='paid';
create index suite_referral_billing_owner on public.suite_referral_billing_events(code,recorded_at desc);
create table public.suite_referral_audit (
 id bigint generated always as identity primary key,
 actor_id uuid, action text not null, entity_type text not null, entity_id text not null,
 before_value jsonb, after_value jsonb, occurred_at timestamptz not null default now()
);

create table public.suite_referral_cases (
 id uuid primary key default gen_random_uuid(),
 code text not null references public.suite_referral_codes(code),
 reporter_id uuid references public.profiles(id) on delete set null,
 source_event_id text unique references public.suite_referral_billing_events(stripe_event_id),
 case_type text not null check (case_type in ('attribution_dispute','fraud','refund','other')),
 detail text not null check(length(detail) between 5 and 2000),
 state text not null default 'open' check(state in ('open','reviewing','resolved','rejected')),
 resolution text not null default '' check(length(resolution)<=2000),
 reviewed_by uuid references public.profiles(id) on delete set null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index suite_referral_cases_owner on public.suite_referral_cases(reporter_id,created_at desc);
alter table public.suite_referral_cases enable row level security;
revoke all on public.suite_referral_cases from public,anon,authenticated,service_role;
grant select,insert,update on public.suite_referral_cases to authenticated;
create policy referral_cases_read on public.suite_referral_cases for select to authenticated
 using(reporter_id=(select auth.uid()) or public.current_app_role()='administrator');
create policy referral_cases_report on public.suite_referral_cases for insert to authenticated
 with check(reporter_id=(select auth.uid()) and source_event_id is null and state='open' and resolution='' and reviewed_by is null and
 (exists(select 1 from public.suite_referral_codes c where c.code=suite_referral_cases.code and c.owner_profile_id=auth.uid()) or exists(select 1 from public.suite_referral_attributions a where a.code=suite_referral_cases.code and a.profile_id=auth.uid())));
create policy referral_cases_admin_update on public.suite_referral_cases for update to authenticated
 using(public.current_app_role()='administrator') with check(public.current_app_role()='administrator');

alter table public.suite_referral_programmes enable row level security;
alter table public.suite_referral_representatives enable row level security;
alter table public.suite_referral_codes enable row level security;
alter table public.suite_referral_attributions enable row level security;
alter table public.suite_referral_leads enable row level security;
alter table public.suite_referral_billing_events enable row level security;
alter table public.suite_referral_audit enable row level security;

revoke all on public.suite_referral_programmes, public.suite_referral_representatives, public.suite_referral_codes,
 public.suite_referral_attributions, public.suite_referral_leads, public.suite_referral_billing_events, public.suite_referral_audit
 from public, anon, authenticated, service_role;
grant select on public.suite_referral_programmes, public.suite_referral_representatives, public.suite_referral_codes,
 public.suite_referral_attributions, public.suite_referral_leads, public.suite_referral_billing_events, public.suite_referral_audit to authenticated;
-- Raw attributions are readable only by their own customer; representatives receive aggregate counts via RPC.
grant select,insert,update on public.suite_referral_programmes, public.suite_referral_representatives, public.suite_referral_codes to authenticated;
grant insert,update on public.suite_referral_leads to authenticated;
grant select,insert on public.suite_referral_billing_events to service_role;
grant select on public.suite_referral_attributions, public.suite_referral_codes, public.suite_referral_programmes to service_role;

create policy referral_programme_admin on public.suite_referral_programmes for all to authenticated
 using (public.current_app_role()='administrator') with check (public.current_app_role()='administrator');
create policy referral_rep_self_read on public.suite_referral_representatives for select to authenticated
 using (profile_id=(select auth.uid()) or public.current_app_role()='administrator');
create policy referral_rep_admin on public.suite_referral_representatives for all to authenticated
 using (public.current_app_role()='administrator') with check (public.current_app_role()='administrator');
create policy referral_code_self_read on public.suite_referral_codes for select to authenticated
 using (owner_profile_id=(select auth.uid()) or public.current_app_role()='administrator');
create policy referral_code_admin on public.suite_referral_codes for all to authenticated
 using (public.current_app_role()='administrator') with check (public.current_app_role()='administrator');
create policy referral_lead_read on public.suite_referral_leads for select to authenticated
 using (public.current_app_role()='administrator' or (representative_id=(select auth.uid()) and exists(select 1 from public.suite_referral_representatives r where r.profile_id=auth.uid() and r.state='approved')));
create policy referral_lead_insert on public.suite_referral_leads for insert to authenticated
 with check (representative_id=(select auth.uid()) and exists(select 1 from public.suite_referral_representatives r where r.profile_id=auth.uid() and r.state='approved'));
create policy referral_lead_update on public.suite_referral_leads for update to authenticated
 using (representative_id=(select auth.uid()) and exists(select 1 from public.suite_referral_representatives r where r.profile_id=auth.uid() and r.state='approved'))
 with check (representative_id=(select auth.uid()) and exists(select 1 from public.suite_referral_representatives r where r.profile_id=auth.uid() and r.state='approved'));
-- Referrers can read no customer-level invoice rows, only their own aggregate dashboard.
create policy referral_attribution_self_read on public.suite_referral_attributions for select to authenticated using(profile_id=(select auth.uid()));
create policy referral_billing_self_read on public.suite_referral_billing_events for select to authenticated using(profile_id=(select auth.uid()));
create policy referral_billing_admin_read on public.suite_referral_billing_events for select to authenticated using(public.current_app_role()='administrator');
create policy referral_audit_admin_read on public.suite_referral_audit for select to authenticated using(public.current_app_role()='administrator');

create function public.suite_referral_config_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.suite_referral_audit(actor_id,action,entity_type,entity_id,before_value,after_value)
 values(auth.uid(),TG_OP,TG_TABLE_NAME,coalesce(to_jsonb(new)->>'id',to_jsonb(new)->>'code',to_jsonb(new)->>'profile_id'),case when TG_OP='UPDATE' then to_jsonb(old) end,to_jsonb(new));
 return new;
end $$;
revoke all on function public.suite_referral_config_audit() from public,anon,authenticated;
create trigger referral_programme_audit after insert or update on public.suite_referral_programmes for each row execute function public.suite_referral_config_audit();
create trigger referral_codes_audit after insert or update on public.suite_referral_codes for each row execute function public.suite_referral_config_audit();
create trigger referral_reps_audit after insert or update on public.suite_referral_representatives for each row execute function public.suite_referral_config_audit();

create trigger referral_cases_audit after insert or update on public.suite_referral_cases for each row execute function public.suite_referral_config_audit();

create function public.suite_capture_referral(p_code text,p_product text) returns boolean
 language plpgsql security definer set search_path='' as $$
declare c public.suite_referral_codes; p public.suite_referral_programmes; n integer; u uuid:=auth.uid();
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_product not in ('akipasa','akiduermo','akicoches','akihq','akibusiness') then raise exception 'Invalid product'; end if;
 -- One account, one attribution: retries cannot reassign a lead to another representative.
 if exists(select 1 from public.suite_referral_attributions where profile_id=u) then return false; end if;
 select * into c from public.suite_referral_codes where code=p_code for update;
 if not found or c.owner_profile_id is null or c.owner_profile_id=u or c.revoked_at is not null or (c.expires_at is not null and c.expires_at<=now()) then return false; end if;
 select * into p from public.suite_referral_programmes where id=c.programme_id for share;
 if p.state<>'active' or p.starts_at>now() or (p.ends_at is not null and p.ends_at<=now()) then return false; end if;
 if p.programme_type='representative' and not exists(select 1 from public.suite_referral_representatives where profile_id=c.owner_profile_id and state='approved') then return false; end if;
 if exists(select 1 from public.billing_subscriptions where profile_id=u) then return false; end if;
 if to_regclass('public.akisuite_billing_subscriptions') is not null then
   execute 'select count(*) from public.akisuite_billing_subscriptions where profile_id=$1' into n using u;
   if n>0 then return false; end if;
 end if;
 select count(*) into n from public.suite_referral_attributions where code=c.code;
 if c.usage_limit is not null and n>=c.usage_limit then return false; end if;
 insert into public.suite_referral_attributions(profile_id,code,source_product,expires_at)
 values(u,c.code,p_product,least(now()+make_interval(days=>p.attribution_days),coalesce(c.expires_at,'infinity'),coalesce(p.ends_at,'infinity')))
 on conflict(profile_id) do nothing;
 if not found then return false; end if;
 insert into public.suite_referral_audit(actor_id,action,entity_type,entity_id,after_value)
 values(u,'captured','attribution',u::text,jsonb_build_object('code',c.code,'source_product',p_product));
 return true;
end $$;
revoke all on function public.suite_capture_referral(text,text) from public,anon;
grant execute on function public.suite_capture_referral(text,text) to authenticated;

create function public.suite_referral_dashboard() returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); result jsonb;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select jsonb_build_object('codes',coalesce((select jsonb_agg(jsonb_build_object('code',c.code,'revoked',c.revoked_at is not null,'expires_at',c.expires_at)) from public.suite_referral_codes c where c.owner_profile_id=u),'[]'::jsonb),
 'referrals',(select count(*) from public.suite_referral_attributions a join public.suite_referral_codes c on c.code=a.code where c.owner_profile_id=u),
 'conversions',(select count(distinct e.profile_id) from public.suite_referral_billing_events e join public.suite_referral_codes c on c.code=e.code where c.owner_profile_id=u and e.event_kind='paid'),
 'invoice_count',(select count(*) from public.suite_referral_billing_events e join public.suite_referral_codes c on c.code=e.code where c.owner_profile_id=u and e.event_kind='paid'),
 'available_programmes',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name)) from (select id,name from public.suite_referral_programmes where programme_type='public' and state='active' and starts_at<=now() and (ends_at is null or ends_at>now()) order by created_at limit 50) available),'[]'::jsonb),
 'recent_activity',coalesce((select jsonb_agg(jsonb_build_object('kind',event_kind,'recorded_at',recorded_at)) from (select e.event_kind,e.recorded_at from public.suite_referral_billing_events e join public.suite_referral_codes c on c.code=e.code where c.owner_profile_id=u order by e.recorded_at desc limit 50) activity),'[]'::jsonb),
 'held',true,'payouts_enabled',false) into result;
 return result;
end $$;
revoke all on function public.suite_referral_dashboard() from public,anon;
grant execute on function public.suite_referral_dashboard() to authenticated;

-- Callable only after HTTP signature verification AND customer/subscription/price reconciliation.
create function public.suite_record_referral_billing(p_event text,p_kind text,p_profile uuid,p_customer text,p_subscription text,p_invoice text,p_product text,p_amount bigint,p_currency text,p_created timestamptz,p_initial boolean default false) returns boolean
 language plpgsql security definer set search_path='' as $$
declare a public.suite_referral_attributions; c public.suite_referral_codes; p public.suite_referral_programmes; proposed bigint;
begin
 if p_kind not in ('paid','refund_hold','dispute_hold') then raise exception 'Invalid event'; end if;
 select * into a from public.suite_referral_attributions where profile_id=p_profile;
 if not found then return false; end if;
 if not exists(select 1 from public.billing_customers where profile_id=p_profile and stripe_customer_id=p_customer) then raise exception 'Customer mismatch'; end if;
 select * into c from public.suite_referral_codes where code=a.code;
 select * into p from public.suite_referral_programmes where id=c.programme_id;
 if p_kind='paid' then
   if p_created<a.captured_at or (p_created>=a.expires_at and not exists(select 1 from public.suite_referral_billing_events where stripe_subscription_id=p_subscription and profile_id=p_profile and event_kind='paid')) or c.owner_profile_id is null or c.owner_profile_id=p_profile or p.state<>'active' or c.revoked_at is not null or not(p_product=any(p.eligible_products)) then return false; end if;
   if p.programme_type='representative' and not exists(select 1 from public.suite_referral_representatives where profile_id=c.owner_profile_id and state='approved') then return false; end if;
   if p_invoice is null or p_subscription is null or p_amount<=0 or p_currency<>p.currency then return false; end if;
   perform pg_advisory_xact_lock(hashtextextended(p_subscription,0));
   if (p.commission_percent is not null or p.commission_fixed_cents is not null) and (p.commission_basis='each_invoice' or (p.commission_basis='initial_invoice' and p_initial)) then
     proposed:=least(p_amount,coalesce(p.commission_fixed_cents,floor(p_amount*p.commission_percent/100)::bigint));
   end if;
 end if;
 insert into public.suite_referral_billing_events(stripe_event_id,event_kind,profile_id,code,stripe_customer_id,stripe_subscription_id,stripe_invoice_id,product_code,amount_paid_cents,currency,stripe_created_at,proposed_commission_cents,rule_snapshot)
 values(p_event,p_kind,p_profile,a.code,p_customer,p_subscription,p_invoice,p_product,p_amount,p_currency,p_created,proposed,jsonb_build_object('terms_version',p.terms_version,'commission_basis',p.commission_basis,'percent',p.commission_percent,'fixed_cents',p.commission_fixed_cents,'approved',false))
 on conflict do nothing;
 if not found then return false; end if;
 if p_kind<>'paid' then
   insert into public.suite_referral_cases(code,reporter_id,source_event_id,case_type,detail)
   values(a.code,p_profile,p_event,case when p_kind='refund_hold' then 'refund' else 'fraud' end,'Verified Stripe billing hold requires administrator review')
   on conflict(source_event_id) do nothing;
 end if;
 return true;
end $$;
revoke all on function public.suite_record_referral_billing(text,text,uuid,text,text,text,text,bigint,text,timestamptz,boolean) from public,anon,authenticated;
grant execute on function public.suite_record_referral_billing(text,text,uuid,text,text,text,text,bigint,text,timestamptz,boolean) to service_role;

create function public.suite_referral_immutable_code() returns trigger language plpgsql set search_path='' as $$
begin
 if new.code<>old.code or new.programme_id<>old.programme_id or (new.owner_profile_id is not null and new.owner_profile_id is distinct from old.owner_profile_id) then
 raise exception 'Referral code assignment is immutable' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function public.suite_referral_immutable_code() from public,anon,authenticated;
create trigger referral_code_immutable before update on public.suite_referral_codes for each row execute function public.suite_referral_immutable_code();

create function public.suite_join_referral_programme(p_programme uuid) returns text language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); p public.suite_referral_programmes; existing text; generated text;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into p from public.suite_referral_programmes where id=p_programme for update;
 if not found or p.programme_type<>'public' or p.state<>'active' or p.starts_at>now() or (p.ends_at is not null and p.ends_at<=now()) then raise exception 'Programme unavailable' using errcode='42501'; end if;
 select code into existing from public.suite_referral_codes where owner_profile_id=u and programme_id=p_programme and revoked_at is null and (expires_at is null or expires_at>now()) order by created_at limit 1;
 if found then return existing; end if;
 generated:=upper(replace(gen_random_uuid()::text,'-',''));
 generated:=substr(generated,1,16);
 insert into public.suite_referral_codes(code,programme_id,owner_profile_id,expires_at) values(generated,p_programme,u,p.ends_at);
 return generated;
end $$;
revoke all on function public.suite_join_referral_programme(uuid) from public,anon;
grant execute on function public.suite_join_referral_programme(uuid) to authenticated;

commit;
