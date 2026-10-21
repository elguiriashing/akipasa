-- Read-only metadata. An absent settings table is the reported recovery baseline.
select jsonb_build_object(
 'reserved_enum_present',exists(select 1 from pg_catalog.pg_enum e join pg_catalog.pg_type t on t.oid=e.enumtypid join pg_catalog.pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='analytics_action' and e.enumlabel='suite_business_stage'),
 'private_schema_present',to_regnamespace('suite_funnel_private') is not null,
 'settings_present',to_regclass('suite_funnel_private.settings') is not null,
 'stages_present',to_regclass('suite_funnel_private.stages') is not null,
 'privacy_rpc_present',to_regprocedure('public.my_business_funnel_export(text,text,integer)') is not null,
 'required_relations',(select jsonb_object_agg(name,to_regclass(name) is not null) from unnest(array['public.analytics_events','public.profiles','public.personalisation_settings','account_private.onboarding','public.venues','public.venue_members','public.venue_claims','public.crm_workspaces','public.crm_workspace_members','akibusiness_private.operations_checkouts','akibusiness_private.operations_subscriptions','akibusiness_private.toolboxes','akibusiness_private.operations_billing_events']) name),
 'account_guard_present',to_regprocedure('public.account_features_allowed()') is not null,
 'workspace_guard_present',to_regprocedure('public.crm_can_access_workspace(text)') is not null);
