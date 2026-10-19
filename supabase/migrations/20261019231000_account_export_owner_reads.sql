begin;

-- Data portability requires caller-owned projections without exposing delivery
-- operations or staff recipients. Existing service-role privileges stay intact.
drop policy if exists suite_email_preferences_owner_export
  on public.suite_email_preferences;
create policy suite_email_preferences_owner_export
  on public.suite_email_preferences
  for select to authenticated
  using (profile_id = (select auth.uid()));
grant select on table public.suite_email_preferences to authenticated;

drop policy if exists claim_submission_alerts_claimant_export
  on public.claim_submission_alerts;
create policy claim_submission_alerts_claimant_export
  on public.claim_submission_alerts
  for select to authenticated
  using (claimant_id = (select auth.uid()));
grant select on table public.claim_submission_alerts to authenticated;

commit;
