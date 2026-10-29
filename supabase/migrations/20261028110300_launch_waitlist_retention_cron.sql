-- Private launch-list retention. Uses the existing pg_cron extension.
-- The named job is idempotent: replay updates its schedule instead of
-- creating a second job. Daily at 03:20 UTC, low-traffic window.
-- Unverified submissions: 30 days; verified: 12 months;
-- keyed anti-abuse counters: 2 days. No other account or booking records.
-- Initially activated and verified as cron.job #3 on 2026-10-28.
select cron.schedule(
  'launch_waitlist_retention_cleanup',
  '20 3 * * *',
  'select public.purge_expired_launch_waitlist();'
);
