begin;

-- Additive coverage; does not enroll/backfill users or alter billing/data.
-- Original account_features_allowed() preserves every account without a cohort row.
create table if not exists account_private.guard_definition_backup (
 signature text primary key, definition text not null, recorded_at timestamptz not null default now()
);
alter table account_private.guard_definition_backup enable row level security;
revoke all on account_private.guard_definition_backup from public,anon,authenticated;
grant select on account_private.guard_definition_backup to service_role;
create policy guard_backup_service_read on account_private.guard_definition_backup for select to service_role using(true);

-- Preserve each deployed body's exact logic, owner, attributes, signature and ACL.
-- The outer block runs before original declarations (which may themselves read).
do $coverage$
declare signature text; target oid; original text; body text; guarded text; language_name text; result_type oid;
begin
 foreach signature in array array[
 'public.accommodation_change_status(uuid,text)',
 'public.accommodation_request_booking(uuid,uuid,text,text,text)',
 'public.add_owned_event_occurrence(uuid,timestamp with time zone,timestamp with time zone)',
 'public.add_venue_member(uuid,uuid,venue_member_role)',
 'public.add_venue_member_by_email(uuid,text,venue_member_role)',
 'public.admin_search_users(text,integer)',
 'public.admin_user_record(uuid)',
 'public.approve_booking_and_queue_emails(uuid,uuid)',
 'public.attach_operating_location(uuid,text)',
 'public.attach_rental_operating_location(uuid,text)',
 'public.check_in_by_token(uuid,uuid,double precision,double precision,integer)',
 'public.claim_passport_reward(uuid,uuid)',
 'public.claim_stamp_reward(uuid,uuid)',
 'public.confirm_reward_redemption(uuid)',
 'public.create_akipasa_selection_event_v2(uuid,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone,text,text,double precision,double precision)',
 'public.create_event_with_occurrence(uuid,uuid,text,text,text,text,text,integer,text,timestamp with time zone,timestamp with time zone)',
 'public.create_operating_organisation(uuid,text)',
 'public.create_owned_venue(uuid,text,text,text,text,text,double precision,double precision)',
 'public.create_owned_venue_in_spain(text,text,text,text,text,text,text,double precision,double precision)',
 'public.create_private_operating_location(uuid,text)',
 'public.crm_adjust_tip_balance(text,uuid,integer,text)',
 'public.crm_advertising_profile_overview(timestamp with time zone)',
 'public.crm_analytics_overview(timestamp with time zone)',
 'public.crm_company_backup_create(text)',
 'public.crm_company_backup_restore(uuid,bigint)',
 'public.crm_company_history()',
 'public.crm_company_import_batch(uuid,integer,jsonb)',
 'public.crm_company_import_start(text,text,text,jsonb,integer)',
 'public.crm_company_import_undo(uuid)',
 'public.crm_company_list(text,text,integer)',
 'public.crm_company_publish_claim(boolean)',
 'public.crm_company_publish_finish(text,uuid,text)',
 'public.crm_company_save(text,integer,jsonb,boolean)',
 'public.crm_course_command(text,uuid,jsonb)',
 'public.crm_hospitality_command(text,uuid,jsonb)',
 'public.crm_hospitality_export(text,timestamp with time zone,timestamp with time zone)',
 'public.crm_hospitality_overview(text)',
 'public.crm_inventory_recommendations(text)',
 'public.crm_kds_command(text,uuid,jsonb)',
 'public.crm_kds_overview(text)',
 'public.crm_pos_cash_command(text,uuid,jsonb)',
 'public.crm_pos_cash_overview(text)',
 'public.crm_pos_ledger(text,jsonb)',
 'public.crm_pos_trading_day(text,text,uuid,text)',
 'public.crm_printer_manage(text,text,jsonb)',
 'public.crm_printer_next(uuid,text)',
 'public.crm_printer_report(uuid,text,uuid,text)',
 'public.crm_provision_workspace_for_venue(uuid)',
 'public.crm_record_pos_sale(text,text,text,integer,text,uuid,jsonb)',
 'public.crm_save_role_template(text,uuid,text,text,text[])',
 'public.crm_set_pos_sale_tip(text,uuid,uuid,integer)',
 'public.crm_staff_business_overview()',
 'public.crm_staff_set_business_pro(uuid,boolean,text)',
 'public.crm_staff_set_workspace_tool(text,text,boolean,text)',
 'public.crm_user_analytics_search(text,timestamp with time zone,integer)',
 'public.delete_owned_event(uuid,text,text)',
 'public.delete_owned_venue(uuid,text,text)',
 'public.duplicate_owned_event(uuid,text)',
 'public.enroll_in_passport(uuid)',
 'public.expire_finished_events(timestamp with time zone)',
 'public.grant_staff_billing_access(uuid,text,text,text,uuid)',
 'public.list_managed_operating_locations(integer,integer)',
 'public.list_operating_organisation_locations(uuid,integer,integer)',
 'public.list_operating_organisations(integer,integer)',
 'public.moderate_creator_profile(uuid,text,text)',
 'public.moderate_item(text,uuid,text,text,uuid)',
 'public.operator_delete_catalogue_item(text,uuid,text,text)',
 'public.operator_update_event(uuid,text,text,text,text,integer,text,content_status,text)',
 'public.operator_update_venue(uuid,text,text,text,text,content_status,boolean,text)',
 'public.personalisation_admin_metrics(timestamp with time zone)',
 'public.publish_crm_lead_as_unclaimed_venue(text,text,text,text,text,text,text,double precision,double precision)',
 'public.record_analytics(analytics_action,uuid,uuid,jsonb)',
 'public.redeem_reward_claim(uuid)',
 'public.request_booking_v2(uuid,uuid,integer,text,text,text,text,uuid,text,uuid)',
 'public.request_car_rental_booking(uuid,date,date,text,text,text,text,uuid,text)',
 'public.request_creator_verification()',
 'public.request_reward_redemption(uuid)',
 'public.resolve_promotion_request(uuid,promotion_state,text,uuid,timestamp with time zone,timestamp with time zone)',
 'public.resolve_report(uuid,report_state,text)',
 'public.retry_booking_confirmation(uuid,uuid)',
 'public.review_business_application(uuid,text,text)',
 'public.review_car_rental_company(uuid,text,text)',
 'public.save_venue_catalogue(uuid,integer,jsonb,boolean)',
 'public.set_automatic_moderation(boolean)',
 'public.set_car_rental_booking_status(uuid,text)',
 'public.set_feature_flag(text,boolean,text)',
 'public.set_operating_organisation_admin(uuid,uuid,boolean)',
 'public.set_owned_event_recurrence(uuid,timestamp with time zone,timestamp with time zone,text,integer,integer)',
 'public.set_owner_background_image(text)',
 'public.set_platform_role(uuid,app_role,text)',
 'public.staff_pending_venue_claim_count()',
 'public.staff_pending_venue_claims(integer)',
 'public.submit_business_application(text,text,text,text,text,text,text)',
 'public.submit_community_event(text,text,text,text,text,text,double precision,double precision,uuid,text,text,timestamp with time zone,timestamp with time zone,text)',
 'public.suite_save_stay(uuid,boolean,text)',
 'public.unclaim_owned_venue(uuid,text,text)',
 'public.undo_event_preference_signal(uuid)',
 'public.unpublish_venue_catalogue(uuid,integer)',
 'public.update_business_application_package(text,text)',
 'public.update_owner_console_preferences(text,text,boolean,boolean)',
 'public.update_venue_location_in_spain(uuid,text,text,text,double precision,double precision)',
 'public.upsert_catalog_category(uuid,text,text,text,text)',
 'public.upsert_catalog_city(uuid,text,text,text,double precision,double precision,text,text)',
 'public.venue_analytics(uuid,timestamp with time zone)',
 'public.venue_event_audience_summary(uuid)',
 'public.venue_owner_results(uuid)'
 ] loop
  target:=to_regprocedure(signature);
  if target is null then continue; end if;
  select pg_get_functiondef(p.oid),p.prosrc,l.lanname,p.prorettype into original,body,language_name,result_type
   from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=target;
  if language_name<>'plpgsql' or result_type='trigger'::regtype then raise exception 'Unexpected account RPC shape: %',signature; end if;
  if position('account completion required [coverage-v1]' in body)>0 then continue; end if;
  insert into account_private.guard_definition_backup values(signature,original,now()) on conflict do nothing;
  guarded:='begin
   if auth.uid() is not null and not public.account_features_allowed() then
    raise exception ''account completion required [coverage-v1]'' using errcode=''42501'';
   end if;
  '||rtrim(body)||case when right(rtrim(body),1)=';' then '' else ';' end||'
  end;';
  if length(original)-length(replace(original,body,''))<>length(body) then raise exception 'Ambiguous account RPC source: %',signature; end if;
  execute replace(original,body,guarded);
 end loop;
end $coverage$;

-- SQL permission predicates also protect direct REST reads and invoker wrappers.
-- Anonymous/service evaluation retains its existing predicate result.
do $predicates$
declare signature text; target oid; original text; body text; guarded text; language_name text; result_type oid;
begin
 foreach signature in array array[
 'public.can_manage_operating_organisation(uuid)',
 'public.can_manage_rental_company(uuid)',
 'public.can_read_rental_operating_link(uuid,text)',
 'public.crm_can_access_workspace(text)',
 'public.crm_can_administer_people(text)',
 'public.crm_can_manage_workspace(text)',
 'public.crm_can_manage_workspace_chat(text)',
 'public.crm_can_operate_workspace(text)',
 'public.crm_company_access(boolean)',
 'public.crm_has_tool(text,text)',
 'public.crm_is_workspace_chat_member(text)',
 'public.crm_member_has_tool(text,text)',
 'public.crm_shares_workspace(uuid)',
 'public.has_active_entitlement(uuid,text)',
 'public.has_free_business_access(uuid)',
 'public.has_owner_console()',
 'public.has_platform_role(app_role[])',
 'public.is_venue_member(uuid,venue_member_role[])',
 'fiscal_private.allowed(text,text)',
 'akihq_security.can_tool(text,text)',
 'akihq_security.can_administer(text)',
 'akihq_security.can_export(text,text)'
 ] loop
  target:=to_regprocedure(signature);
  if target is null then continue; end if;
  select pg_get_functiondef(p.oid),p.prosrc,l.lanname,p.prorettype into original,body,language_name,result_type
   from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=target;
  if language_name<>'sql' or result_type<>'boolean'::regtype then raise exception 'Unexpected account predicate shape: %',signature; end if;
  if position('/* account-coverage-v1 */' in body)>0 then continue; end if;
  insert into account_private.guard_definition_backup values(signature,original,now()) on conflict do nothing;
  guarded:='select /* account-coverage-v1 */ (auth.uid() is null or public.account_features_allowed()) and coalesce(('
   ||regexp_replace(body,';\s*$','')||'),false);';
  if length(original)-length(replace(original,body,''))<>length(body) then raise exception 'Ambiguous account predicate source: %',signature; end if;
  execute replace(original,body,guarded);
 end loop;
end $predicates$;

-- Own personal-data export RPCs deliberately remain available. Operational/admin
-- JSON wrappers cannot bypass the central gate through a private definer.
do $json$
declare signature text; target oid; original text; body text; guarded text; language_name text; result_type oid;
begin
 foreach signature in array array['public.my_booking_history(text,integer)','public.admin_passport_awards(text,jsonb)'] loop
  target:=to_regprocedure(signature);
  if target is null then continue; end if;
  select pg_get_functiondef(p.oid),p.prosrc,l.lanname,p.prorettype into original,body,language_name,result_type
   from pg_proc p join pg_language l on l.oid=p.prolang where p.oid=target;
  if language_name<>'sql' or result_type<>'jsonb'::regtype then raise exception 'Unexpected account JSON shape: %',signature; end if;
  if position('/* account-coverage-v1 */' in body)>0 then continue; end if;
  insert into account_private.guard_definition_backup values(signature,original,now()) on conflict do nothing;
  guarded:='select /* account-coverage-v1 */ case when auth.uid() is not null and not public.account_features_allowed() then null::jsonb else ('
   ||regexp_replace(body,';\s*$','')||') end;';
  if length(original)-length(replace(original,body,''))<>length(body) then raise exception 'Ambiguous account JSON source: %',signature; end if;
  execute replace(original,body,guarded);
 end loop;
end $json$;

-- Statement triggers catch direct writes and legacy/private SECURITY DEFINER
-- paths, with no scans, row rewrites or deletion of retained business data.
do $mutations$
declare table_name text; relation record;
begin
 foreach table_name in array array[
 'accommodation_booking_settings',
 'accommodation_nightly_rates',
 'accommodation_quotes',
 'accommodation_room_types',
 'accommodation_unit_blocks',
 'accommodation_units',
 'ai_agents',
 'ai_approvals',
 'ai_chat_messages',
 'ai_handoffs',
 'ai_schedules',
 'ai_tasks',
 'business_applications',
 'business_rewards',
 'calendar_preferences',
 'premium_appearance_preferences',
 'workspace_snapshots',
 'booking_notification_settings',
 'booking_offerings',
 'booking_resources',
 'car_rental_bookings',
 'car_rental_calendar_blocks',
 'car_rental_companies',
 'car_rental_company_members',
 'car_rental_company_reviews',
 'car_rental_media',
 'car_rental_vehicles',
 'creator_profiles',
 'crm_catalogue_venues',
 'crm_company_backup_rows',
 'crm_company_backups',
 'crm_company_import_batches',
 'crm_company_import_issues',
 'crm_company_imports',
 'crm_company_records',
 'crm_demand_signals',
 'crm_fiscal_document_lines',
 'crm_fiscal_documents',
 'crm_fiscal_events',
 'crm_fiscal_item_taxes',
 'crm_fiscal_outbox',
 'crm_fiscal_period_locks',
 'crm_fiscal_profiles',
 'crm_fiscal_releases',
 'crm_fiscal_series',
 'crm_inventory_items',
 'crm_inventory_location_balances',
 'crm_inventory_locations',
 'crm_inventory_movements',
 'crm_inventory_operation_cancellations',
 'crm_inventory_operations',
 'crm_inventory_value_events',
 'crm_module_snapshots',
 'crm_pos_sale_lines',
 'crm_pos_sales',
 'crm_role_template_tools',
 'crm_role_templates',
 'crm_team_channels',
 'crm_team_messages',
 'crm_tip_adjustments',
 'crm_workspace_entitlements',
 'crm_workspace_members',
 'crm_workspace_records',
 'crm_workspace_venues',
 'crm_workspaces',
 'event_occurrences',
 'event_submissions',
 'events',
 'feature_slots',
 'loyalty_program_rewards',
 'loyalty_programs',
 'offers',
 'operating_organisation_locations',
 'operating_organisation_members',
 'operating_organisations',
 'owner_console_preferences',
 'pals_states',
 'passport_enrollments',
 'promotion_requests',
 'recurrence_rules',
 'rental_operating_location_links',
 'reward_claims',
 'suite_saved_stays',
 'venue_availability_slots',
 'venue_booking_settings',
 'venue_catalogue_food_index',
 'venue_catalogue_history',
 'venue_catalogues',
 'venue_checkin_credentials',
 'venue_media',
 'venue_media_placements',
 'venue_members',
 'venues'
 ] loop
  if to_regclass('public.'||table_name) is not null and not exists(
    select 1 from pg_trigger where tgrelid=to_regclass('public.'||table_name) and tgname='account_completion_guard' and not tgisinternal
  ) then
   execute format('create trigger account_completion_guard before insert or update or delete on public.%I for each statement execute function account_private.guard_account_mutation()',table_name);
  end if;
 end loop;
 for relation in select n.nspname schema_name,c.relname table_name,c.oid relation_id from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('akihq_hospitality','fiscal_private') and c.relkind='r'
 loop
  if not exists(select 1 from pg_trigger where tgrelid=relation.relation_id and tgname='account_completion_guard' and not tgisinternal) then
   execute format('create trigger account_completion_guard before insert or update or delete on %I.%I for each statement execute function account_private.guard_account_mutation()',relation.schema_name,relation.table_name);
  end if;
 end loop;
end $mutations$;

do $claim_privacy$
begin
 if to_regclass('public.claim_decision_emails') is not null then
  execute 'create policy account_completion_staff_read_guard on public.claim_decision_emails as restrictive for select to authenticated using(claimant_id=auth.uid() or public.account_features_allowed())';
 end if;
end $claim_privacy$;

-- Restrict new nonessential uploads while retaining file deletion/erasure.
do $storage$
begin
 if to_regclass('storage.objects') is not null then
  execute 'create policy account_completion_insert_guard on storage.objects as restrictive for insert to authenticated with check(public.account_features_allowed())';
  execute 'create policy account_completion_update_guard on storage.objects as restrictive for update to authenticated using(public.account_features_allowed()) with check(public.account_features_allowed())';
 end if;
end $storage$;
commit;

