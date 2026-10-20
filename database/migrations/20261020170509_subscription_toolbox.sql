-- Explicit enrollment only. No customer, price or historical entitlement changes.
begin;
create schema if not exists akibusiness_private;
revoke all on schema akibusiness_private from public,anon;
grant usage on schema akibusiness_private to authenticated,service_role;

create function akibusiness_private.catalogue() returns text[]
language sql immutable set search_path='' as $$
 select array['crm','inbox','tasks','calendar','inventory','pos','sales','marketing','automation','collaboration','employees','knowledge']::text[]
$$;
create function akibusiness_private.parent_tool(p_tool text) returns text
language sql immutable set search_path='' as $$ select case p_tool when 'crm-social' then 'crm' when 'support' then 'inbox' when 'sites' then 'marketing' else p_tool end $$;
create function akibusiness_private.capacity(p_tier text) returns integer
language sql immutable set search_path='' as $$ select case p_tier when 'basico' then 4 when 'standard' then 8 when 'pro' then 12 else 0 end $$;
create function akibusiness_private.allowance(p_tier text) returns integer
language sql immutable set search_path='' as $$ select case p_tier when 'basico' then 1 when 'standard' then 2 when 'pro' then 12 else 0 end $$;
-- Recompute from the original UTC anchor every time: Jan 31 -> Feb 28 -> Mar 31.
create function akibusiness_private.anniversary(p_anchor timestamptz,p_month integer) returns timestamptz
language sql immutable set search_path='' as $$
 select ((date_trunc('month',p_anchor at time zone 'UTC')+make_interval(months=>p_month))
  + (least(extract(day from p_anchor at time zone 'UTC')::integer,
      extract(day from (date_trunc('month',p_anchor at time zone 'UTC')+make_interval(months=>p_month+1)-interval '1 day'))::integer)-1)*interval '1 day'
  + ((p_anchor at time zone 'UTC')-date_trunc('day',p_anchor at time zone 'UTC'))) at time zone 'UTC'
$$;
create function akibusiness_private.valid_tools(p_tier text,p_tools text[]) returns boolean
language sql immutable set search_path='' as $$
 select p_tools is not null and cardinality(p_tools)=akibusiness_private.capacity(p_tier)
  and cardinality(p_tools)=(select count(distinct t) from unnest(p_tools)t)
  and p_tools <@ akibusiness_private.catalogue()
$$;

create table akibusiness_private.toolboxes (
 workspace_id text primary key references public.crm_workspaces(id),
 tier text not null check(tier in ('basico','standard','pro')),
 active_tools text[] not null,
 saved_tools text[] not null,
 anchor timestamptz not null,
 rotation integer not null default 0 check(rotation>=0),
 paid_until timestamptz not null,
 billing_status text not null check(billing_status in ('active','trialing','past_due','unpaid','canceled','incomplete','paused')),
 source text not null check(source in ('stripe','trial','promotion','admin','grandfathered')),
 subscription_id text unique,
 billing_revision bigint not null,
 revision bigint not null default 1,
 enabled boolean not null default false,
 reconciliation_attempts integer not null default 0,
 retry_after timestamptz not null default '-infinity',
 updated_at timestamptz not null default now(),
 check(akibusiness_private.valid_tools(tier,active_tools)),
 check(akibusiness_private.valid_tools(tier,saved_tools)),
 check(paid_until>=anchor)
);
create table akibusiness_private.toolbox_history (
 id bigint generated always as identity primary key,
 workspace_id text not null references public.crm_workspaces(id),
 action text not null,
 actor uuid,
 rotation integer not null,
 old_tools text[] not null,
 new_tools text[] not null,
 evidence text not null,
 created_at timestamptz not null default now()
);
create unique index toolbox_rotation_once on akibusiness_private.toolbox_history(workspace_id,rotation) where action='rotation';
create table akibusiness_private.toolbox_notifications (
 history_id bigint primary key references akibusiness_private.toolbox_history(id),
 workspace_id text not null,
 delivered_at timestamptz,
 attempts integer not null default 0
);
-- Individual settings can restrict a role; they cannot expand it.
create table akibusiness_private.member_tool_limits (
 workspace_id text not null,
 profile_id uuid not null,
 tools text[] not null check(tools <@ akibusiness_private.catalogue()),
 primary key(workspace_id,profile_id),
 foreign key(workspace_id,profile_id) references public.crm_workspace_members(workspace_id,profile_id)
);
alter table akibusiness_private.toolboxes enable row level security;
alter table akibusiness_private.toolbox_history enable row level security;
alter table akibusiness_private.toolbox_notifications enable row level security;
alter table akibusiness_private.member_tool_limits enable row level security;
revoke all on table akibusiness_private.toolboxes, akibusiness_private.toolbox_history,
 akibusiness_private.toolbox_notifications, akibusiness_private.member_tool_limits from public,anon,authenticated;
grant select on table akibusiness_private.toolboxes, akibusiness_private.toolbox_history,
 akibusiness_private.toolbox_notifications, akibusiness_private.member_tool_limits to service_role;

create function akibusiness_private.owner(p_workspace text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.crm_workspace_members m
  where m.workspace_id=p_workspace and m.profile_id=auth.uid() and m.status='active' and m.role='owner')
$$;
create function akibusiness_private.licensed(p_workspace text,p_tool text) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from akibusiness_private.toolboxes b where b.workspace_id=p_workspace and b.enabled)
 or exists(select 1 from akibusiness_private.toolboxes b where b.workspace_id=p_workspace and b.enabled
  and b.billing_status in ('active','trialing','past_due') and b.anchor<=now() and b.paid_until>now()
  and (akibusiness_private.parent_tool(p_tool)=any(b.active_tools)
    or p_tool in ('dashboard','integrations','analytics','business-admin')))
$$;

-- Backwards compatible migration order. Once the central onboarding migration
-- exists, direct operations APIs share its caller-only authoritative soft lock.
create function akibusiness_private.account_allowed() returns boolean
language plpgsql stable security definer set search_path='' as $$
declare permitted boolean;
begin
 if auth.uid() is null then return false; end if;
 if to_regprocedure('public.account_features_allowed()') is null then return true; end if;
 execute 'select public.account_features_allowed()' into permitted;
 return coalesce(permitted,false);
end $$;

create or replace function public.crm_can_access_workspace(p_workspace text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (
  exists(select 1 from public.crm_workspace_members m join public.crm_workspaces w on w.id=m.workspace_id
   where m.workspace_id=p_workspace and m.profile_id=auth.uid() and m.status='active' and w.status in ('active','trial') and (
    exists(select 1 from akibusiness_private.toolboxes b where b.workspace_id=p_workspace and b.enabled
     and b.billing_status in ('active','trialing','past_due') and b.anchor<=now() and b.paid_until>now())
    or (not exists(select 1 from akibusiness_private.toolboxes b where b.workspace_id=p_workspace and b.enabled)
     and (w.id='ws_akipasa' or public.has_active_entitlement(w.owner_profile_id,'business')))))
  or exists(select 1 from public.profiles p where p.id=auth.uid() and p.app_role='administrator'))
$$;

-- Preserve the existing membership/role/entitlement checks, add the authoritative
-- active toolbox intersection. Inactive delegation rows never confer access.
create or replace function public.crm_has_tool(p_workspace text,p_tool text) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and akibusiness_private.account_allowed() and public.crm_can_access_workspace(p_workspace)
  and exists(select 1 from public.crm_workspaces w where w.id=p_workspace and w.status in ('active','trial'))
  and exists(select 1 from public.crm_workspace_entitlements e join public.crm_tool_catalog c on c.tool_key=e.tool_key and c.active
    where e.workspace_id=p_workspace and e.tool_key=p_tool and e.active and e.starts_at<=now() and (e.ends_at is null or e.ends_at>now()))
  and akibusiness_private.licensed(p_workspace,p_tool)
  and (exists(select 1 from public.profiles p where p.id=auth.uid() and p.app_role='administrator')
   or exists(select 1 from public.crm_workspace_members m where m.workspace_id=p_workspace and m.profile_id=auth.uid() and m.status='active'
    and (m.role='owner' or (m.role='admin' and m.role_template_id is null)
     or exists(select 1 from public.crm_role_templates t join public.crm_role_template_tools tt on tt.template_id=t.id
       where t.id=m.role_template_id and t.workspace_id=p_workspace and tt.tool_key=p_tool))
    and (m.role='owner' or not exists(select 1 from akibusiness_private.member_tool_limits l where l.workspace_id=p_workspace and l.profile_id=m.profile_id)
     or exists(select 1 from akibusiness_private.member_tool_limits l where l.workspace_id=p_workspace and l.profile_id=m.profile_id and akibusiness_private.parent_tool(p_tool)=any(l.tools)))))
$$;

create function akibusiness_private.snapshot(p_workspace text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare b akibusiness_private.toolboxes; n integer;
begin
 if not akibusiness_private.owner(p_workspace) then raise exception 'Owner access required' using errcode='42501'; end if;
 select * into b from akibusiness_private.toolboxes where workspace_id=p_workspace;
 if not found then return jsonb_build_object('enrolled',false); end if;
 select count(*) into n from unnest(b.saved_tools)t where not t=any(b.active_tools);
 return to_jsonb(b)-'subscription_id' || jsonb_build_object('enrolled',true,'catalogue',akibusiness_private.catalogue(),
  'allowance',akibusiness_private.allowance(b.tier),'pending_replacements',n,
  'next_activation',akibusiness_private.anniversary(b.anchor,b.rotation+1),
  'licensed',akibusiness_private.licensed(p_workspace,b.active_tools[1]),
  'affected_staff',(select coalesce(jsonb_agg(jsonb_build_object('profile_id',m.profile_id,'tool',tt.tool_key)),'[]')
   from public.crm_workspace_members m join public.crm_role_template_tools tt on tt.template_id=m.role_template_id
   where m.workspace_id=p_workspace and m.status='active' and akibusiness_private.parent_tool(tt.tool_key)=any(b.active_tools)
   and not akibusiness_private.parent_tool(tt.tool_key)=any(b.saved_tools)));
end $$;
create function public.crm_toolbox(p_workspace text) returns jsonb language sql stable security invoker set search_path='' as $$select akibusiness_private.snapshot(p_workspace)$$;

create function akibusiness_private.save(p_workspace text,p_tools text[],p_revision bigint) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b akibusiness_private.toolboxes; n integer;
begin
 if not akibusiness_private.owner(p_workspace) then raise exception 'Owner access required' using errcode='42501'; end if;
 select * into b from akibusiness_private.toolboxes where workspace_id=p_workspace for update;
 if not found or not b.enabled then raise exception 'Toolbox not enabled'; end if;
 if b.revision<>p_revision then raise exception 'Configuration changed. Refresh and try again.' using errcode='PT409'; end if;
 if akibusiness_private.anniversary(b.anchor,b.rotation+1)<=now() then raise exception 'Rotation reconciliation pending. Try again shortly.' using errcode='PT409'; end if;
 if not akibusiness_private.valid_tools(b.tier,p_tools) then raise exception 'Invalid selection size or tool identifiers'; end if;
 select count(*) into n from unnest(p_tools)t where not t=any(b.active_tools);
 if n>akibusiness_private.allowance(b.tier) then raise exception 'Monthly replacement allowance exceeded'; end if;
 update akibusiness_private.toolboxes set saved_tools=p_tools,revision=revision+1,updated_at=now() where workspace_id=p_workspace;
 insert into akibusiness_private.toolbox_history(workspace_id,action,actor,rotation,old_tools,new_tools,evidence)
 values(p_workspace,'saved',auth.uid(),b.rotation,b.active_tools,p_tools,'owner-save');
 return akibusiness_private.snapshot(p_workspace);
end $$;
create function public.crm_toolbox_save(p_workspace text,p_tools text[],p_revision bigint) returns jsonb
language sql security invoker set search_path='' as $$select akibusiness_private.save(p_workspace,p_tools,p_revision)$$;

-- Service-only boundary, called after fetching authoritative current Stripe
-- subscription/invoice state. Each workspace has one explicitly bound subscription.
-- New prices are not mapped by display name; enrollment requires release acceptance.
create function akibusiness_private.sync(p_workspace text,p_tier text,p_tools text[],p_anchor timestamptz,p_paid_until timestamptz,
 p_status text,p_source text,p_subscription text,p_billing_revision bigint,p_evidence text,p_enabled boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare b akibusiness_private.toolboxes; chosen text[]; hid bigint; r integer; before_tools text[];
begin
 if p_evidence is null or length(p_evidence)<3 or p_billing_revision is null then raise exception 'Billing evidence required'; end if;
 if not akibusiness_private.valid_tools(p_tier,p_tools) or p_anchor is null or p_paid_until is null or p_paid_until<p_anchor then raise exception 'Invalid billing state'; end if;
 if p_source='stripe' and (p_subscription is null or p_subscription not like 'sub_%') then raise exception 'Subscription binding required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_workspace,7721));
 select * into b from akibusiness_private.toolboxes where workspace_id=p_workspace for update;
 if found and p_billing_revision<=b.billing_revision then return; end if;
 if b.workspace_id is not null and (b.subscription_id is distinct from p_subscription or b.anchor<>p_anchor) then raise exception 'Subscription or anniversary rebinding requires reviewed migration'; end if;
 if p_enabled and p_status in ('active','trialing','past_due') then
  -- Toolbox is an additional entitlement intersection, not a replacement for the
  -- established checks. Reuse their stable tool identifiers and retain all data.
  insert into public.crm_workspace_entitlements(workspace_id,tool_key,active,source,starts_at,ends_at)
  select p_workspace,c.tool_key,true,case p_source when 'stripe' then 'purchase' when 'trial' then 'trial' else 'manual' end,p_anchor,p_paid_until from public.crm_tool_catalog c
   where c.active and (akibusiness_private.parent_tool(c.tool_key)=any(akibusiness_private.catalogue())
    or c.tool_key in ('dashboard','integrations','analytics'))
  on conflict(workspace_id,tool_key) do update set active=true,starts_at=excluded.starts_at,ends_at=excluded.ends_at;
 end if;
 chosen:=p_tools; before_tools:=coalesce(b.active_tools,'{}'); r:=coalesce(b.rotation,0);
 -- A renewal cannot silently replace the owner's selection. An effective tier
 -- change must carry a separately validated target with the appropriate capacity.
 if b.workspace_id is not null and b.tier=p_tier then chosen:=b.active_tools; end if;
 insert into akibusiness_private.toolboxes(workspace_id,tier,active_tools,saved_tools,anchor,paid_until,billing_status,source,subscription_id,billing_revision,enabled)
 values(p_workspace,p_tier,chosen,chosen,p_anchor,p_paid_until,p_status,p_source,p_subscription,p_billing_revision,p_enabled)
 on conflict(workspace_id) do update set tier=excluded.tier,active_tools=excluded.active_tools,
  saved_tools=case when b.tier=p_tier then b.saved_tools else excluded.saved_tools end,
  paid_until=excluded.paid_until,billing_status=excluded.billing_status,source=excluded.source,
  billing_revision=excluded.billing_revision,enabled=excluded.enabled,revision=akibusiness_private.toolboxes.revision+1,updated_at=now();
 insert into akibusiness_private.toolbox_history(workspace_id,action,rotation,old_tools,new_tools,evidence)
 values(p_workspace,'billing-sync',r,before_tools,chosen,p_evidence) returning id into hid;
 insert into akibusiness_private.toolbox_notifications(history_id,workspace_id) values(hid,p_workspace);
end $$;
create function public.crm_toolbox_billing_sync(p_workspace text,p_tier text,p_tools text[],p_anchor timestamptz,p_paid_until timestamptz,
 p_status text,p_source text,p_subscription text,p_billing_revision bigint,p_evidence text,p_enabled boolean default false) returns void
language sql security invoker set search_path='' as $$select akibusiness_private.sync(p_workspace,p_tier,p_tools,p_anchor,p_paid_until,p_status,p_source,p_subscription,p_billing_revision,p_evidence,p_enabled)$$;

create function akibusiness_private.rotate(p_workspace text) returns boolean
language plpgsql security definer set search_path='' as $$
declare b akibusiness_private.toolboxes; r integer; n integer; hid bigint; boundary timestamptz;
begin
 select * into b from akibusiness_private.toolboxes where workspace_id=p_workspace for update;
 if not found or not b.enabled or b.billing_status not in ('active','trialing','past_due') then return false; end if;
 r:=b.rotation; boundary:=akibusiness_private.anniversary(b.anchor,r+1);
 if boundary>now() or boundary>=b.paid_until or b.paid_until<=now() then return false; end if;
 if not akibusiness_private.valid_tools(b.tier,b.saved_tools) then raise exception 'Invalid saved toolbox'; end if;
 select count(*) into n from unnest(b.saved_tools)t where not t=any(b.active_tools);
 if n>akibusiness_private.allowance(b.tier) then raise exception 'Invalid saved replacements'; end if;
 -- Recover missed months in one transaction. No extra swaps accrue while offline.
 while akibusiness_private.anniversary(b.anchor,r+1)<=now() loop r:=r+1; end loop;
 update akibusiness_private.toolboxes set active_tools=saved_tools,rotation=r,revision=revision+1,updated_at=now() where workspace_id=p_workspace;
 insert into akibusiness_private.toolbox_history(workspace_id,action,rotation,old_tools,new_tools,evidence)
 values(p_workspace,'rotation',r,b.active_tools,b.saved_tools,'monthly-anniversary') returning id into hid;
 insert into akibusiness_private.toolbox_notifications(history_id,workspace_id) values(hid,p_workspace);
 return true;
end $$;
create function public.crm_toolbox_rotate(p_workspace text) returns boolean
language sql security invoker set search_path='' as $$select akibusiness_private.rotate(p_workspace)$$;

create function akibusiness_private.delegate(p_workspace text,p_profile uuid,p_tools text[]) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not akibusiness_private.owner(p_workspace) then raise exception 'Owner access required' using errcode='42501'; end if;
 if p_tools is null or not p_tools <@ akibusiness_private.catalogue() then raise exception 'Invalid delegation'; end if;
 if not exists(select 1 from public.crm_workspace_members where workspace_id=p_workspace and profile_id=p_profile and status='active' and role<>'owner') then raise exception 'Active non-owner member required'; end if;
 if exists(select 1 from unnest(p_tools)t where not akibusiness_private.licensed(p_workspace,t)) then raise exception 'Unlicensed tool'; end if;
 -- Role template remains an independent mandatory upper bound in crm_has_tool.
 insert into akibusiness_private.member_tool_limits values(p_workspace,p_profile,p_tools)
 on conflict(workspace_id,profile_id) do update set tools=excluded.tools;
 insert into akibusiness_private.toolbox_history(workspace_id,action,actor,rotation,old_tools,new_tools,evidence)
 values(p_workspace,'delegation',auth.uid(),0,'{}',p_tools,'member:'||p_profile::text);
end $$;
create function public.crm_toolbox_delegate(p_workspace text,p_profile uuid,p_tools text[]) returns void
language sql security invoker set search_path='' as $$select akibusiness_private.delegate(p_workspace,p_profile,p_tools)$$;

create function akibusiness_private.team(p_workspace text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not akibusiness_private.owner(p_workspace) then raise exception 'Owner access required' using errcode='42501'; end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('profile_id',m.profile_id,'label',coalesce(p.display_name,p.username,m.profile_id::text),
  'role_tools',case when m.role='admin' and m.role_template_id is null then to_jsonb(akibusiness_private.catalogue())
   else (select coalesce(jsonb_agg(distinct akibusiness_private.parent_tool(tt.tool_key)),'[]') from public.crm_role_template_tools tt
    join public.crm_role_templates t on t.id=tt.template_id and t.workspace_id=p_workspace where tt.template_id=m.role_template_id) end,
  'individual_tools',l.tools)),'[]') from public.crm_workspace_members m
  left join public.profiles p on p.id=m.profile_id
  left join akibusiness_private.member_tool_limits l on l.workspace_id=m.workspace_id and l.profile_id=m.profile_id
  where m.workspace_id=p_workspace and m.status='active' and m.role<>'owner');
end $$;
create function public.crm_toolbox_team(p_workspace text) returns jsonb language sql stable security invoker set search_path='' as $$select akibusiness_private.team(p_workspace)$$;

create function akibusiness_private.due() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(b)),'[]') from
 (select workspace_id,subscription_id,source,tier,anchor,billing_revision,active_tools,paid_until from akibusiness_private.toolboxes
  where enabled and retry_after<=now() and (source='stripe' or paid_until>now())
   and billing_status in ('active','trialing','past_due') and akibusiness_private.anniversary(anchor,rotation+1)<=now()
  order by updated_at limit 100) b
$$;
create function public.crm_toolbox_due() returns jsonb language sql stable security invoker set search_path='' as $$select akibusiness_private.due()$$;

create function akibusiness_private.attempt(p_workspace text,p_success boolean) returns void
language sql security definer set search_path='' as $$
 update akibusiness_private.toolboxes set
  retry_after=now()+make_interval(secs=>case when p_success then 60 else least(1800,60*power(2,least(reconciliation_attempts,5))::integer) end),
  reconciliation_attempts=case when p_success then 0 else least(reconciliation_attempts+1,1000) end,
  updated_at=now() where workspace_id=p_workspace
$$;
create function public.crm_toolbox_attempt(p_workspace text,p_success boolean) returns void
language sql security invoker set search_path='' as $$select akibusiness_private.attempt(p_workspace,p_success)$$;

revoke all on all functions in schema akibusiness_private from public,anon,authenticated;
grant execute on function akibusiness_private.owner(text),akibusiness_private.licensed(text,text),akibusiness_private.snapshot(text),
 akibusiness_private.save(text,text[],bigint),akibusiness_private.delegate(text,uuid,text[]),akibusiness_private.team(text) to authenticated;
grant execute on all functions in schema akibusiness_private to service_role;
revoke all on function public.crm_toolbox(text),public.crm_toolbox_save(text,text[],bigint),public.crm_toolbox_delegate(text,uuid,text[]) from public,anon;
grant execute on function public.crm_toolbox(text),public.crm_toolbox_save(text,text[],bigint),public.crm_toolbox_delegate(text,uuid,text[]) to authenticated;
revoke all on function public.crm_toolbox_rotate(text),public.crm_toolbox_billing_sync(text,text,text[],timestamptz,timestamptz,text,text,text,bigint,text,boolean) from public,anon,authenticated;
grant execute on function public.crm_toolbox_rotate(text),public.crm_toolbox_billing_sync(text,text,text[],timestamptz,timestamptz,text,text,text,bigint,text,boolean) to service_role;
revoke all on function public.crm_has_tool(text,text) from public,anon;
grant execute on function public.crm_has_tool(text,text) to authenticated,service_role;
revoke all on function public.crm_toolbox_team(text) from public,anon;
grant execute on function public.crm_toolbox_team(text) to authenticated;
revoke all on function public.crm_toolbox_due() from public,anon,authenticated;
grant execute on function public.crm_toolbox_due() to service_role;
revoke all on function public.crm_toolbox_attempt(text,boolean) from public,anon,authenticated;
grant execute on function public.crm_toolbox_attempt(text,boolean) to service_role;
commit;
