# Database conflict retry incident

Production logs for 2026-10-10 01:45-02:00 UTC contained 63,163 catalogue
revision errors and 974 workspace revision errors. The database reported
PostgREST 14.5. Five application functions deliberately raised SQLSTATE 40001
for stale revisions, triggering PostgREST 14's unbounded transaction retry bug.

Migration `20261010021926_stop_application_conflict_retries.sql` changes only
these functions' explicit conflict codes to PT409. Existing revision checks,
authorization, row locks, validation, function ownership and grants remain.
CRM functions absent from a public-app-only development database are skipped.
The venue review API recognizes both codes during rollout. All callers receive
a finite HTTP 409 instead of repeatedly executing a stale mutation.

Supabase's documented incident and remedy:
https://supabase.com/docs/guides/troubleshooting/high-cpu-and-infinite-transaction-retries-when-using-custom-error-codes-in-rpc-functions-77326b

After migration, inspect authenticator backends and recent logs. A function
replacement does not stop already-running retries: terminate only confirmed
looping backend PIDs, never unrelated requests. The compute upgrade restarted
connections; verify whether any loops remain before terminating anything.

The migration changes existing definitions rather than replacing them with
older source copies. Rollback can restore the prior function definitions, but
restoring 40001 on PostgREST 14 recreates the incident; prefer a forward fix.
The dashboard's rolling 24-hour totals retain historical errors after repair.

The same window contained 108 `offers.audience` missing-column errors. The
application already reads/writes this field; the production schema was missing
the original `0033_premium_entitlements.sql` offer column and visibility policy.
Migration `20261010021927_restore_offer_audience.sql` restores that narrow
contract, defaulting existing offers to public and enforcing Premium visibility
through the existing entitlement function. It does not rerun billing migrations.

Production verification: both migrations applied successfully at 02:19 UTC.
All five function body hashes match the expected conflict-code substitution;
grants, security-definer settings and search paths match their previous values.
A rollback-only stale catalogue unpublish test returned PT409. Local embedded
PostgreSQL tests passed for conflict/authorization/write and offer RLS behavior.

Anonymous role verification exposed an additional helper EXECUTE restriction.
Follow-up `20261010022234_split_offer_visibility_roles.sql` separates anonymous
public-offer reads from authenticated entitlement checks. Both roles now query
offers successfully in production; the local RLS test models the restricted
helper grant and verifies Premium offers remain hidden without entitlement.
