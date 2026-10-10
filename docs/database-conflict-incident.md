# Database conflict retry incident

Production logs for 2026-10-10 01:45-02:00 UTC contained 63,163 catalogue
revision errors and 974 workspace revision errors. The database reported
PostgREST 14.5. Five application functions deliberately raised SQLSTATE 40001
for stale revisions, triggering PostgREST 14's unbounded transaction retry bug.

Migration `20261010030000_stop_application_conflict_retries.sql` changes only
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
Migration `20261010030100_restore_offer_audience.sql` restores that narrow
contract, defaulting existing offers to public and enforcing Premium visibility
through the existing entitlement function. It does not rerun billing migrations.
