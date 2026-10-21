-- Run only after all phases commit. Reads only new optional data and catalogue metadata.
select jsonb_build_object(
 'settings',(select jsonb_build_object('enabled',enabled,'retention_days',retention_days,'retention_approval_ref',retention_approval_ref,'enabled_since',enabled_since) from suite_funnel_private.settings where singleton),
 'optional_rows',(select count(*) from suite_funnel_private.stages),
 'private_client_execute_grants',(select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute'))),
 'trigger_count',(select count(*) from pg_catalog.pg_trigger where not tgisinternal and (tgname like 'suite_funnel_%' or tgname='trusted_funnel_analytics')),
 'manager_authenticated_execute',has_function_privilege('authenticated','public.suite_business_funnel(text,integer)','execute'),
 'manager_anon_execute',has_function_privilege('anon','public.suite_business_funnel(text,integer)','execute'),
 'maintenance_service_execute',has_function_privilege('service_role','public.purge_suite_business_funnel(integer)','execute'),
 'maintenance_authenticated_execute',has_function_privilege('authenticated','public.purge_suite_business_funnel(integer)','execute'),
 'privacy_authenticated_execute',has_function_privilege('authenticated','public.my_business_funnel_export(text,text,integer)','execute'),
 'privacy_anon_execute',has_function_privilege('anon','public.my_business_funnel_export(text,text,integer)','execute'));
