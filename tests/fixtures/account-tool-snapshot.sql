-- Reviewed deployed snapshot/filter functions, 20 October 2026.
-- No customer data. Tenant/licence authorities are isolated test adapters.
CREATE OR REPLACE FUNCTION akihq_security.filtered_snapshot(p_workspace text, p_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_data jsonb:='{}'; v_key text; v_tool text; v_admin boolean;
begin
  perform akihq_security.workspace_access(p_workspace);
  v_admin:=akihq_security.can_administer(p_workspace);
  foreach v_key in array array['tasks','projects','contacts','companies','deals','leads','pipelines',
    'products','warehouses','invoices','campaigns','pages','forms','automations','conversations','feed',
    'events','knowledge','employees'] loop
    v_tool:=akihq_security.snapshot_module(v_key);
    v_data:=v_data||jsonb_build_object(v_key,case when akihq_security.can_tool(p_workspace,v_tool)
      then coalesce(p_data->v_key,'[]'::jsonb) else '[]'::jsonb end);
  end loop;
  foreach v_key in array array['activities','audit'] loop
    v_data:=v_data||jsonb_build_object(v_key,case when v_admin then coalesce(p_data->v_key,'[]'::jsonb) else '[]'::jsonb end);
  end loop;
  foreach v_key in array array['integrations','settings'] loop
    v_data:=v_data||jsonb_build_object(v_key,case when v_admin then akihq_security.redact_secrets(coalesce(p_data->v_key,'{}'::jsonb)) else '{}'::jsonb end);
  end loop;
  v_data:=v_data||jsonb_build_object('workspace',(select jsonb_build_object('id',w.id,'name',w.name,
    'slug',w.slug,'timezone',w.timezone,'currency',w.currency) from public.crm_workspaces w where w.id=p_workspace));
  return v_data;
end $function$
;

CREATE OR REPLACE FUNCTION akihq_security.read_workspace_snapshot(p_workspace text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_row public.workspace_snapshots%rowtype; v_access jsonb;
begin
  v_access:=akihq_security.workspace_access(p_workspace);
  select * into v_row from public.workspace_snapshots where workspace_id=p_workspace;
  return jsonb_build_object('data',akihq_security.filtered_snapshot(p_workspace,coalesce(v_row.data,'{}'::jsonb)),
    'updated_at',v_row.updated_at,'updated_by',v_row.updated_by,'access',v_access);
end $function$
;

CREATE OR REPLACE FUNCTION akihq_security.record_tool(p_type text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case p_type when 'event' then 'calendar' when 'article' then 'knowledge'
    when 'task' then 'tasks' when 'project' then 'tasks' when 'contact' then 'crm'
    when 'company' then 'crm' when 'deal' then 'crm' when 'lead' then 'crm'
    when 'product' then 'inventory' when 'invoice' then 'sales' when 'employee' then 'employees'
    when 'campaign' then 'marketing' when 'page' then 'sites' when 'form' then 'sites'
    when 'automation' then 'automation' else null end;
$function$
;

CREATE OR REPLACE FUNCTION akihq_security.snapshot_module(p_key text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select case
    when p_key in ('tasks','projects') then 'tasks'
    when p_key in ('contacts','companies','deals','leads','pipelines') then 'crm'
    when p_key in ('products','warehouses') then 'inventory'
    when p_key='invoices' then 'sales'
    when p_key='campaigns' then 'marketing'
    when p_key in ('pages','forms') then 'sites'
    when p_key='automations' then 'automation'
    when p_key='conversations' then 'inbox'
    when p_key='feed' then 'collaboration'
    when p_key='events' then 'calendar'
    when p_key='knowledge' then 'knowledge'
    when p_key='employees' then 'employees'
    else null end;
$function$
;

CREATE OR REPLACE FUNCTION akihq_security.write_workspace_snapshot(p_workspace text, p_data jsonb, p_expected_updated_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_current public.workspace_snapshots%rowtype; v_next jsonb; v_key text; v_value jsonb;
  v_tool text; v_admin boolean; v_now timestamptz;
begin
  perform akihq_security.workspace_access(p_workspace);
  if not public.crm_can_operate_workspace(p_workspace) then raise exception 'Workspace write access required' using errcode='42501'; end if;
  if p_data is null or jsonb_typeof(p_data)<>'object' then raise exception 'Snapshot must be an object' using errcode='22023'; end if;
  -- Lock the parent as well so simultaneous first saves cannot bypass version checks.
  perform 1 from public.crm_workspaces where id=p_workspace for update;
  select * into v_current from public.workspace_snapshots where workspace_id=p_workspace for update;
  if v_current.workspace_id is not null and (p_expected_updated_at is null or v_current.updated_at is distinct from p_expected_updated_at)
    then raise exception 'Workspace changed. Reload the latest data before saving.' using errcode='PT409'; end if;
  if v_current.workspace_id is null and p_expected_updated_at is not null
    then raise exception 'Workspace snapshot changed. Reload before saving.' using errcode='PT409'; end if;
  v_admin:=akihq_security.can_administer(p_workspace);
  v_next:=coalesce(v_current.data,'{}'::jsonb);
  for v_key,v_value in select key,value from jsonb_each(p_data) loop
    v_tool:=akihq_security.snapshot_module(v_key);
    if (v_tool is not null and akihq_security.can_tool(p_workspace,v_tool)) or (v_admin and v_key in ('activities','audit')) then
      if jsonb_typeof(v_value)<>'array' then raise exception 'Snapshot collection % must be an array',v_key using errcode='22023'; end if;
      v_next:=v_next||jsonb_build_object(v_key,v_value);
    elsif v_admin and v_key in ('integrations','settings') then
      if jsonb_typeof(v_value)<>'object' then raise exception 'Snapshot setting % must be an object',v_key using errcode='22023'; end if;
      v_next:=v_next||jsonb_build_object(v_key,akihq_security.redact_secrets(v_value));
    end if;
  end loop;
  -- Keep only display metadata in legacy state. Roles and entitlements never come
  -- from JSON, including privileged callers and imported browser backups.
  v_next:=v_next||jsonb_build_object('workspace',(akihq_security.filtered_snapshot(p_workspace,'{}'::jsonb))->'workspace');
  insert into public.workspace_snapshots(workspace_id,data,updated_by,updated_at)
    values(p_workspace,v_next,(select auth.uid()),clock_timestamp())
    on conflict(workspace_id) do update set data=excluded.data,updated_by=excluded.updated_by,updated_at=excluded.updated_at
    returning updated_at into v_now;
  return jsonb_build_object('updated_at',v_now,'updated_by',(select auth.uid()),'data',akihq_security.filtered_snapshot(p_workspace,v_next),
    'access',akihq_security.workspace_access(p_workspace));
end $function$
;

CREATE OR REPLACE FUNCTION akihq_security.can_tool(p_workspace text, p_tool text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select (select auth.uid()) is not null
    and public.crm_can_access_workspace(p_workspace)
    and exists(select 1 from public.crm_workspaces w where w.id=p_workspace and w.status in ('active','trial'))
    and public.crm_has_tool(p_workspace,p_tool)
    and (public.crm_member_has_tool(p_workspace,p_tool)
      or exists(select 1 from public.profiles p where p.id=(select auth.uid()) and p.app_role='administrator'));
$function$
;

CREATE OR REPLACE FUNCTION akihq_security.redact_secrets(p_value jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare v_result jsonb; v_key text; v_child jsonb;
begin
  if jsonb_typeof(p_value)='object' then
    v_result:='{}'::jsonb;
    for v_key,v_child in select key,value from jsonb_each(p_value) loop
      if lower(regexp_replace(v_key,'[^a-zA-Z0-9]','','g')) !~ '(apikey|token|secret|password|credential|authorization|privatekey)' then
        v_result:=v_result||jsonb_build_object(v_key,akihq_security.redact_secrets(v_child));
      end if;
    end loop;
    return v_result;
  elsif jsonb_typeof(p_value)='array' then
    return coalesce((select jsonb_agg(akihq_security.redact_secrets(value) order by ordinality) from jsonb_array_elements(p_value) with ordinality),'[]'::jsonb);
  end if;
  return p_value;
end $function$
;
