-- Forward-only repair for the historical entitlement source CHECK; no table replay.
begin;
create or replace function akibusiness_private.sync(p_workspace text,p_tier text,p_tools text[],p_anchor timestamptz,p_paid_until timestamptz,
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
revoke all on function akibusiness_private.sync(text,text,text[],timestamptz,timestamptz,text,text,text,bigint,text,boolean) from public,anon,authenticated;
grant execute on function akibusiness_private.sync(text,text,text[],timestamptz,timestamptz,text,text,text,bigint,text,boolean) to service_role;
commit;
