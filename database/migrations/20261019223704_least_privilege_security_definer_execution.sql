-- Restrict privileged SECURITY DEFINER entry points to the roles that use them.
--
-- PostgreSQL grants function execution to PUBLIC by default. Revoking from
-- `anon` alone is therefore insufficient: `anon` inherits PUBLIC privileges.
-- Keep service_role explicit so server-side recovery and operational tooling
-- remain available after the PUBLIC revocation.

revoke execute on function public.accept_current_terms(text,text)
  from public, anon;
grant execute on function public.accept_current_terms(text,text)
  to authenticated, service_role;

revoke execute on function public.admin_search_users(text,integer)
  from public, anon;
grant execute on function public.admin_search_users(text,integer)
  to authenticated, service_role;

revoke execute on function public.admin_user_record(uuid)
  from public, anon;
grant execute on function public.admin_user_record(uuid)
  to authenticated, service_role;

revoke execute on function public.delete_owned_event(uuid,text,text)
  from public, anon;
grant execute on function public.delete_owned_event(uuid,text,text)
  to authenticated, service_role;

revoke execute on function public.grant_staff_billing_access(uuid,text,text,text,uuid)
  from public, anon;
grant execute on function public.grant_staff_billing_access(uuid,text,text,text,uuid)
  to authenticated, service_role;

revoke execute on function public.operator_update_event(
  uuid,text,text,text,text,integer,text,public.content_status,text
) from public, anon;
grant execute on function public.operator_update_event(
  uuid,text,text,text,text,integer,text,public.content_status,text
) to authenticated, service_role;

revoke execute on function public.operator_update_venue(
  uuid,text,text,text,text,public.content_status,boolean,text
) from public, anon;
grant execute on function public.operator_update_venue(
  uuid,text,text,text,text,public.content_status,boolean,text
) to authenticated, service_role;

revoke execute on function public.review_business_application(uuid,text,text)
  from public, anon;
grant execute on function public.review_business_application(uuid,text,text)
  to authenticated, service_role;

revoke execute on function public.set_automatic_moderation(boolean)
  from public, anon;
grant execute on function public.set_automatic_moderation(boolean)
  to authenticated, service_role;

revoke execute on function public.set_feature_flag(text,boolean,text)
  from public, anon;
grant execute on function public.set_feature_flag(text,boolean,text)
  to authenticated, service_role;

revoke execute on function public.update_deletion_request(
  uuid,public.deletion_request_state,text,boolean
) from public, anon;
grant execute on function public.update_deletion_request(
  uuid,public.deletion_request_state,text,boolean
) to authenticated, service_role;

revoke execute on function public.update_own_profile(text,text)
  from public, anon;
grant execute on function public.update_own_profile(text,text)
  to authenticated, service_role;

revoke execute on function public.upsert_catalog_category(uuid,text,text,text,text)
  from public, anon;
grant execute on function public.upsert_catalog_category(uuid,text,text,text,text)
  to authenticated, service_role;

revoke execute on function public.upsert_catalog_city(
  uuid,text,text,text,double precision,double precision,text,text
) from public, anon;
grant execute on function public.upsert_catalog_city(
  uuid,text,text,text,double precision,double precision,text,text
) to authenticated, service_role;

revoke execute on function public.venue_analytics(uuid,timestamp with time zone)
  from public, anon;
grant execute on function public.venue_analytics(uuid,timestamp with time zone)
  to authenticated, service_role;

-- Launch catalogue promotion is an operational bootstrap, never a browser RPC.
revoke execute on function public.promote_launch_catalogue(text)
  from public, anon, authenticated;
grant execute on function public.promote_launch_catalogue(text)
  to service_role;

-- Trigger functions execute through their bound trigger and need no direct
-- browser role access. Keeping service_role permits controlled diagnostics.
revoke execute on function public.enforce_community_submission_rate_limit()
  from public, anon, authenticated;
revoke execute on function public.enforce_report_rate_limit()
  from public, anon, authenticated;
revoke execute on function public.handle_new_user()
  from public, anon, authenticated;
revoke execute on function public.keep_verified_venue_content_live()
  from public, anon, authenticated;
revoke execute on function public.promote_business_owner()
  from public, anon, authenticated;
revoke execute on function public.reconcile_venue_access()
  from public, anon, authenticated;
revoke execute on function public.require_enabled_feature()
  from public, anon, authenticated;
revoke execute on function public.sync_profile_entitlements_from_billing()
  from public, anon, authenticated;

grant execute on function public.enforce_community_submission_rate_limit()
  to service_role;
grant execute on function public.enforce_report_rate_limit()
  to service_role;
grant execute on function public.handle_new_user()
  to service_role;
grant execute on function public.keep_verified_venue_content_live()
  to service_role;
grant execute on function public.promote_business_owner()
  to service_role;
grant execute on function public.reconcile_venue_access()
  to service_role;
grant execute on function public.require_enabled_feature()
  to service_role;
grant execute on function public.sync_profile_entitlements_from_billing()
  to service_role;
