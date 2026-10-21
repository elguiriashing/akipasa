begin;
-- Forward-only telemetry extension. Existing singleton enabled flag/ACLs remain.
alter table operations_runtime_private.health
 add column billing_merchant_http_status integer check(billing_merchant_http_status between 100 and 599),
 add column billing_merchant_category text check(billing_merchant_category in('ok','api_version','authentication','permission','account_mismatch','network','rate_limit','provider','invalid_response','validation','rejected')),
 add column billing_merchant_updated_at timestamptz,
 add column migration_merchant_http_status integer check(migration_merchant_http_status between 100 and 599),
 add column migration_merchant_category text check(migration_merchant_category in('ok','api_version','authentication','permission','account_mismatch','network','rate_limit','provider','invalid_response','validation','rejected')),
 add column migration_merchant_updated_at timestamptz;
create function operations_runtime_private.record_merchant(p_task text,p_http_status integer,p_category text)
returns boolean language plpgsql security definer set search_path='' as $$
declare stamp timestamptz;
begin
 if p_task is null or p_task not in('billing','migration')
 or p_category is null or p_category not in('ok','api_version','authentication','permission','account_mismatch','network','rate_limit','provider','invalid_response','validation','rejected')
 or (p_http_status is not null and p_http_status not between 100 and 599)
 or (p_category='network') is distinct from (p_http_status is null)
 then raise exception 'Invalid merchant health classification' using errcode='22023';end if;
 perform 1 from operations_runtime_private.health where singleton and enabled for update;
 if not found then return false;end if;
 stamp:=clock_timestamp();
 if p_task='billing' then
  update operations_runtime_private.health set billing_merchant_http_status=p_http_status,billing_merchant_category=p_category,billing_merchant_updated_at=stamp where singleton and enabled;
 else
  update operations_runtime_private.health set migration_merchant_http_status=p_http_status,migration_merchant_category=p_category,migration_merchant_updated_at=stamp where singleton and enabled;
 end if;
 return found;
end $$;
create function public.record_operations_merchant_health(p_task text,p_http_status integer,p_category text)
returns boolean language sql security invoker set search_path='' as $$select operations_runtime_private.record_merchant(p_task,p_http_status,p_category)$$;
revoke all on function operations_runtime_private.record_merchant(text,integer,text) from public,anon,authenticated,service_role;
revoke all on function public.record_operations_merchant_health(text,integer,text) from public,anon,authenticated,service_role;
grant execute on function operations_runtime_private.record_merchant(text,integer,text) to service_role;
grant execute on function public.record_operations_merchant_health(text,integer,text) to service_role;
notify pgrst,'reload schema';
commit;
