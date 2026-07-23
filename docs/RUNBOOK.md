# Production runbook

## Release

1. Confirm `.env.local` contains the intended Supabase public URL/key and no service-role secret.
2. Apply unapplied `database/migrations/*.sql` in numeric order to the Supabase SQL editor. Each migration is transactional. Save the SQL success result in the release notes.
3. Run `database/tests/acceptance.sql` in the Supabase SQL editor. Require the single `ok = true` result; the suite finishes with `rollback` and must not leave QA data.
4. Run `npm run check` and `npm run test:e2e`.
5. Run `npm run preview:cloudflare` for high-risk Worker changes.
6. With the authenticated Wrangler profile: `wrangler deploy --dry-run`, then `wrangler deploy --keep-vars`.
7. Record the Worker version ID and smoke-test apex plus `www`.

The local fixture commands are deliberately not production tooling.
`npm run db:seed:local` and `npm run db:reset:local` refuse any database URL
whose hostname is not a loopback host. Production content is onboarded through
the application and reviewed migrations, never through the demo reset command.

Run the same non-destructive browser suite against production after deployment:

```powershell
$env:PLAYWRIGHT_EXTERNAL_SERVER='1'
$env:PLAYWRIGHT_BASE_URL='https://akipasa.com'
node node_modules/@playwright/test/cli.js test
```

## Rollback

- Application: list versions with `wrangler versions list`, then `wrangler rollback <VERSION_ID>`.
- Database: migrations are forward-only in production. Restore structure/data from Supabase backups or write a reviewed compensating migration. Never drop production tables merely to match an older Worker.
- If a Worker depends on a new additive column/table, roll the Worker back safely; additive migrations may remain.

## Backup and recovery

- Supabase project backups are the authoritative database recovery source. Before destructive migrations, take and verify an export from the dashboard/CLI appropriate to the current plan.
- Storage objects in `event-media` must be inventoried separately from PostgreSQL rows.
- Quarterly recovery drill: restore to a non-production project, apply later migrations, run RLS/critical-flow checks, and record recovery time.

### Logical backup

1. In Supabase **Connect**, copy the session-pooler URL and provide the database
   password only through `AKIPASA_BACKUP_DATABASE_URL`.
2. Run `powershell -File scripts/backup-supabase.ps1`.
3. Confirm the timestamped directory contains non-empty `roles.sql`,
   `schema.sql`, `data.sql` and `sha256.json`.
4. Copy the encrypted backup off the workstation. Database backups do not
   contain Storage objects; inventory and copy `event-media` separately.

Never commit a connection string or backup. The script rejects a URL that does
not identify production project `vhpbvcfkcteswlsdjrfl`.

### Non-production restore drill

1. Create a temporary Supabase project in the same region. Never restore this
   drill over production.
2. Copy its session-pooler URL and verify its project reference differs from
   `vhpbvcfkcteswlsdjrfl`.
3. Follow Supabase's documented CLI restore order: roles, schema, then data.
   Physical/project restore flows must preserve the project's encryption root
   key; a manual logical restore may require the documented key-copy step.
4. Apply any migrations newer than the backup.
5. Run `database/tests/acceptance.sql`, inspect RLS, verify Auth sign-in and
   compare critical row counts. Test Storage separately.
6. Record backup timestamp, restore start/end, RPO, RTO, failures and operator.
7. Delete the temporary project only after evidence has been retained.

Restoring production causes downtime and is destructive. It always requires a
separate incident decision and an explicit Supabase confirmation.

## Authentication email and recovery

- Production auth mail uses the dedicated EU-region `auth.akipasa.com` Resend
  domain with TLS enforced and open/click tracking disabled.
- Configure Supabase custom SMTP with sender `AkiPasa
<no-reply@auth.akipasa.com>`, host `smtp.resend.com`, port 465 or 587,
  username `resend`, and the sending-only credential stored only in Supabase.
- Test signup confirmation, magic-link sign-in and password recovery with a
  real mailbox. Check Supabase Auth logs and Resend delivery logs without
  copying tokens into tickets.
- Keep auth and marketing email on separate sending subdomains and credentials.

## Incidents

- Disable a broken frontend with Worker rollback.
- For auth/provider incidents, disable only the affected provider in Supabase; email/password remains the baseline.
- Review Cloudflare Worker logs and Supabase Auth/Postgres logs without copying tokens or personal data into issue trackers.
- Privilege, moderation, reward and redemption investigations use their append-only audit/ledger records.

## Scheduled operations

- After migration `0012_event_expiry_cron.sql` is applied, Supabase Cron runs `expire_finished_events_scheduled()` hourly at minute 17 UTC. Review `cron.job_run_details` after database or infrastructure incidents; moderators retain the manual control as fallback.
- Process account-deletion requests from the Administrator privacy queue. Move
  the request to `processing` with an operator note, inventory any legally
  retained records, then delete the identity through Supabase Authentication.
  The request survives with a null profile reference for audit purposes. Only
  after the identity and erasable data are gone, tick the deletion confirmation
  and mark the request `completed`; the database rejects premature completion.
- Review open reports, venue claims, promotion requests and reward redemptions.

## RPC permission audit

- Privileged security-definer functions must first `revoke all ... from public`, then grant only the intended Supabase roles. Revoking only `anon` is insufficient because PostgreSQL functions receive `PUBLIC` execute permission by default.
- After any new RPC migration, verify `has_function_privilege('anon', '<signature>', 'execute')` and `has_function_privilege('authenticated', '<signature>', 'execute')` explicitly in a rollback-only acceptance query.
