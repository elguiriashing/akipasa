begin;
-- Minimal rolling diagnostics; no IDs, payloads, errors, amounts or provider values.
create schema operations_runtime_private;
revoke all on schema operations_runtime_private from public,anon,authenticated;
grant usage on schema operations_runtime_private to service_role;
create table operations_runtime_private.health(
 singleton boolean primary key default true check(singleton),enabled boolean not null default false,last_tick_at timestamptz,
 cron_stage text check(cron_stage in('started','bindings','merchant','claim','work','completed')),
 cron_outcome text check(cron_outcome in('running','ok','failed','disabled')),cron_updated_at timestamptz,
 billing_stage text check(billing_stage in('started','bindings','merchant','claim','work','completed')),
 billing_outcome text check(billing_outcome in('running','ok','failed','disabled')),billing_updated_at timestamptz,
 migration_stage text check(migration_stage in('started','bindings','merchant','claim','work','completed')),
 migration_outcome text check(migration_outcome in('running','ok','failed','disabled')),migration_updated_at timestamptz
);
insert into operations_runtime_private.health(singleton) values(true);
alter table operations_runtime_private.health enable row level security;
revoke all on operations_runtime_private.health from public,anon,authenticated,service_role;
grant select on operations_runtime_private.health to service_role;
create policy operations_runtime_service_read on operations_runtime_private.health for select to service_role using(true);
create function operations_runtime_private.record(p_task text,p_stage text,p_outcome text)
returns boolean language plpgsql security definer set search_path='' as $$
declare stamp timestamptz;recorded boolean;
begin
 if p_task is null or p_task not in('cron','billing','migration')
 or p_stage is null or p_stage not in('started','bindings','merchant','claim','work','completed')
 or p_outcome is null or p_outcome not in('running','ok','failed','disabled')
 then raise exception 'Invalid runtime health classification' using errcode='22023';end if;
 -- Stamp after the row lock so delayed calls cannot move diagnostic time backwards.
 perform 1 from operations_runtime_private.health where singleton and enabled for update;
 if not found then return false;end if;
 stamp:=clock_timestamp();
 -- Only this task's columns change while the singleton lock is held.
 if p_task='cron' then
  update operations_runtime_private.health set cron_stage=p_stage,cron_outcome=p_outcome,cron_updated_at=stamp,
   last_tick_at=case when p_stage='started' then stamp else last_tick_at end where singleton and enabled;
 elsif p_task='billing' then
  update operations_runtime_private.health set billing_stage=p_stage,billing_outcome=p_outcome,billing_updated_at=stamp where singleton and enabled;
 else
  update operations_runtime_private.health set migration_stage=p_stage,migration_outcome=p_outcome,migration_updated_at=stamp where singleton and enabled;
 end if;
 recorded:=found;return recorded;
end $$;
create function public.record_operations_runtime_health(p_task text,p_stage text,p_outcome text)
returns boolean language sql security invoker set search_path='' as $$select operations_runtime_private.record(p_task,p_stage,p_outcome)$$;
revoke all on function operations_runtime_private.record(text,text,text) from public,anon,authenticated,service_role;
revoke all on function public.record_operations_runtime_health(text,text,text) from public,anon,authenticated,service_role;
grant execute on function operations_runtime_private.record(text,text,text) to service_role;
grant execute on function public.record_operations_runtime_health(text,text,text) to service_role;
commit;
