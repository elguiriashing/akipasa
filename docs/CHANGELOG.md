# Changelog

This is an engineering milestone log, not a semantic-version release log.
Entries are newest first and must not contain credentials or personal data.

## 2026-07-29

### Summary

Shortened the path from discovery to paid membership and rebuilt navigation
mobile-first. The homepage and public header now link directly to a public,
bilingual membership offer; Account Overview links directly to billing; and
the authenticated billing screen presents two plan cards with monthly and
annual choices instead of four repeated cards.

Replaced the mobile horizontal header strip with a compact menu and changed
workspace navigation from a full-screen modal to an in-flow panel. Community
and Passports now use the same responsive workspace navigation instead of
duplicated console tab bars. Zero-value navigation badges are hidden until
they carry useful information.

### Verification

- Lint and strict TypeScript pass.
- Production Next build generates 83 pages.
- Mobile browser acceptance covers the public header, membership conversion
  path, in-flow Passport menu, and removal of the old console tab bar.
- Desktop browser acceptance confirms the regular primary navigation and
  sticky workspace sidebar remain visible while burger controls remain hidden.
- Connected Linux build `9291811e-e042-4dc8-b0f2-c72049532224` deployed the
  release successfully. Both locales, both public membership routes, and 40
  controlled production requests returned successfully.

## 2026-07-28 23:45 +02:00

### Summary

Recovered the interrupted billing release, reran the complete repository
check, and attempted the verified Windows-built OpenNext artifact. Live smoke
tests immediately found HTTP 500 responses, so production was rolled back to
`1f6e4d66-de50-4580-863c-411627c4c875`. A 0%-traffic version-override trace
identified Next.js `workUnitAsyncStorage` invariant failures on App Router HTML
requests. Production remained on the last-good version throughout diagnosis.

Removed the custom cache wrapper from the deployment path and restored the
generated OpenNext entry point. Windows-built candidates are not promotable;
the connected Cloudflare Linux build must produce the next candidate, which
must pass a 0%-traffic version-override smoke test before promotion.

## 2026-07-28 12:35 +02:00

### Summary

Implemented recurring Premium and Business billing, applied production
migrations `0028` through `0030`, and verified the deployment candidate.

### Files affected

- `database/migrations/0029_stripe_billing.sql`
- `database/migrations/0030_atomic_stripe_webhook_claim.sql`
- `src/lib/stripe.ts`
- `src/lib/supabase/service.ts`
- `src/app/api/stripe/webhook/route.ts`
- Account subscription, business application, and staff catalogue routes
- `wrangler.jsonc`, tests, styles, and canonical documentation

### Reasoning

Paid access must be fulfilled from a signed Stripe event rather than a browser
redirect. Durable subscription/grant rows keep billing separate from platform
roles while supporting audited one-month, three-month, and indefinite staff
access.

### Verification

- Production Supabase migrations `0028` through `0030` returned success.
- Lint, strict TypeScript, 53 tests, database safety, and the production Next
  build pass.
- Stripe products use the approved EUR 5/48 Premium and EUR 20/190 Business
  recurring prices.

### Outstanding follow-up work

- Create the restricted Stripe API key and webhook endpoint after explicit
  action-time confirmation.
- Install three encrypted Worker secrets, dry-run/deploy, and complete live
  checkout/webhook acceptance.

## 2026-07-28 11:42 +02:00

### Summary

Fixed the account profile mutation contract, added direct privileged
workspaces, built audited staff catalogue management, and added durable
business onboarding locally.

### Files affected

- `database/migrations/0028_profile_operations_and_business_onboarding.sql`
- Account profile action, overview, and navigation
- `src/components/AccountWorkspacePortals.tsx`
- Staff catalogue list, actions, and venue record routes
- Business application route and action
- Database acceptance, unit tests, styles, and canonical documentation

### Reasoning

Profile writes included a column users were not granted, privileged navigation
was hidden behind Settings, staff inventory was read-only and published-only,
and ordinary users had no visible onboarding despite being able to bypass it
through a legacy venue RPC. The correction uses narrow role-gated RPCs and a
durable application state machine.

### Verification

- Formatting, lint, strict TypeScript, all 51 application tests, local database
  safety, and all 37 automation tests passed.
- The production Next build passed and includes the new application and staff
  venue record routes.
- Local mobile browser acceptance passed 18 tests; one credential-gated
  authenticated test was skipped.
- The aggregate `npm run check` reached only the known Automation Wrangler
  sandbox restriction after all code tests passed.
- Migration and rollback-only database acceptance remain pending.

### Outstanding follow-up work

- Review and apply migration `0028`, then run rollback-only database
  acceptance before deploying dependent code.
- Decide Stripe pricing/billing/refund policy and configure Checkout plus
  signed idempotent webhooks; payment is intentionally not presented as live.

## 2026-07-28 11:05 +02:00

### Summary

Deployed paid-plan defensive invocation ceilings to the public Worker.

### Files affected

- `wrangler.jsonc`
- Cloudflare production version and canonical documentation

### Verification

- Production version `1f6e4d66-de50-4580-863c-411627c4c875` is live.
- CPU is capped at 1,000 ms and subrequests at 100 per invocation.
- Upload remains 7,128.55 KiB (1,390.16 KiB gzip); startup is 24 ms.

## 2026-07-28 11:15 +02:00

### Summary

Configured defensive execution ceilings for the upgraded Workers Paid public
application.

### Files affected

- `wrangler.jsonc`
- Canonical documentation

### Reasoning

Paid capacity removes the 10 ms free-plan constraint, but accepting the full
30-second and 10,000-subrequest defaults would increase the impact of runaway
code or abusive requests. The selected limits preserve substantial SSR
headroom while bounding per-request resource consumption.

### Verification

- Wrangler's installed configuration schema accepts `limits.cpu_ms` and
  `limits.subrequests`.

### Outstanding follow-up work

- Run project checks and Wrangler dry-run.
- Deploy the limits and complete live route/load verification.

## 2026-07-28 10:55 +02:00

### Summary

Built, dry-ran, and deployed the optimized public Worker, then completed
controlled production acceptance without a resource-limit recurrence.

### Files affected

- Cloudflare production deployment
- Fresh `.open-next` release artifact
- Canonical documentation

### Reasoning

The previous redesigned release exceeded the free request CPU allowance.
Removing anonymous Auth work, repeated anonymous landing SSR, and browser-only
libraries from server paths reduced the deployment footprint and request cost
while preserving the progressive-disclosure product release.

### Verification

- Formatting, lint, strict TypeScript, 48 application tests, database safety,
  37 automation tests, the Next/OpenNext builds, and Wrangler dry-run passed.
- Upload decreased from 8,738.70 KiB (1,708.80 KiB gzip) to 7,128.55 KiB
  (1,390.16 KiB gzip); Worker startup is 35 ms.
- Production version `0ebdae82-4a7f-42de-b5cb-409ac84cc184` is live on apex
  and `www`.
- English and Spanish discovery rendered correctly with current catalogue
  results.
- A controlled 40-request query-route probe returned 40 `200` responses and
  zero 1102/5xx errors.
- Authenticated browser traffic returned no landing-cache header, as required.

### Outstanding follow-up work

- Confirm anonymous `/en` and `/es` cache `miss` then `hit` headers using a
  clean production session.
- Continue monitoring production Worker errors and CPU usage.
- Complete credential-gated administrator and 360 px production acceptance.

## 2026-07-28 01:38 +02:00

### Summary

Attributed the rolled-back Worker 1102 to request CPU/free-tier limits and
implemented a resource-focused correction without changing production.

### Files affected

- `src/cloudflare-worker.ts`
- `src/cloudflare-cache.ts`
- `src/lib/supabase/auth-cookie.ts`
- `src/lib/supabase/public.ts`
- `src/lib/supabase/middleware.ts`
- `src/lib/auth.ts`
- `src/lib/repository.ts`
- Public event, venue, passport, map, and venue QR paths
- `next.config.ts`, `wrangler.jsonc`, tests, and canonical documentation

### Reasoning

Wrangler recorded a 29 ms startup for the rejected 8,738.70 KiB release, so
startup was healthy. Anonymous traffic nevertheless performed Supabase Auth
validation and repeated SSR, while MapLibre and server QR generation inflated
the server bundle. The correction skips those costs and adds a private-data-safe
landing cache.

### Verification

- Lint and strict TypeScript passed.
- All 48 application tests passed.
- The production Next build passed.
- Local mobile browser acceptance passed 18 tests; one authenticated test was
  skipped because disposable QA credentials are not configured.
- MapLibre's prior approximately 1.07 MB server chunk and QR code server module
  are absent from rebuilt Next server chunks.
- Production remains on stable version
  `beb39dc8-442b-489f-a261-7c1570157a0b`.

### Outstanding follow-up work

- OpenNext build is blocked in the managed Windows sandbox by a denied
  parent-directory esbuild scan.
- Build outside that restriction, run Wrangler dry-run, deploy, and verify
  cache isolation and zero 1102/5xx failures under cold and sustained load.

## 2026-07-27 23:55 +02:00

### Summary

Rolled the public Worker back after the progressive-disclosure release
generated Cloudflare error 1102 under production traffic.

### Files affected

- Cloudflare production deployment
- Canonical documentation

### Reasoning

Service restoration takes priority over retaining a release that exceeds CPU
or memory limits. The additive Supabase migration remains compatible with the
previous Worker.

### Verification

- Version `beb39dc8-442b-489f-a261-7c1570157a0b` restored to 100% traffic.
- Twenty consecutive root, home, authentication, and robots checks returned
  expected statuses without a 5xx response.

### Outstanding follow-up work

- Inspect invocation outcomes and CPU/memory metrics for the rejected version.
- Profile and optimize before considering Workers Paid or redeployment.

## 2026-07-27 22:22 +02:00

### Summary

Rebuilt account, staff, and administrator information architecture around
route-based progressive disclosure and added a secure administrator user CRM.

### Files affected

- `src/components/WorkspaceShell.tsx`
- `src/app/[locale]/account/**`
- `src/app/[locale]/staff/**`
- `src/app/[locale]/moderation/**`
- `src/app/[locale]/admin/**`
- `src/app/api/admin/users/route.ts`
- `src/lib/admin-users.ts`
- `database/migrations/0027_admin_user_crm.sql`
- Unit, database acceptance, browser tests, styles, and canonical documentation

### Reasoning

The previous consoles exposed unrelated controls and datasets together. Stable
sub-pages reduce initial cognitive load and query scope. Auth email lookup and
role mutation remain database-authorized and audited rather than relying on
hidden controls or a browser service credential.

### Verification

- Root formatting, lint, strict types, 42 application tests, database safety,
  37 automation tests, automation Wrangler dry-run, and production builds
  passed.
- Local browser acceptance passed 18 tests with one credential-gated test
  skipped.
- Migration `0027` applied successfully; production rollback-only database
  acceptance returned one `ok = true` row.
- Cloudflare Worker version `cdf8050d-9d24-4f4a-b15d-3229c0d382f2` deployed to
  both custom domains.
- Focused production health sampling returned 40 expected responses with zero
  5xx failures.

### Outstanding follow-up work

- Run authenticated browser acceptance when disposable QA credentials are
  available.
- Investigate intermittent 503/aborted requests observed during sustained
  production crawling if they recur outside the test load.
- Review stale deterministic QA fixtures left by an older acceptance run.
- Design a real conversation backend before adding threaded support inboxes.

## 2026-07-27 14:08 +02:00

### Summary

Deployed Telegram slash commands and fixed dashboard login compatibility for
browsers that omit the `Origin` header on same-origin form submissions.

### Files affected

- `automation/src/dashboard/auth.ts`
- `automation/tests/routes.test.ts`
- Automation deployment and canonical documentation

### Reasoning

The permanent dashboard credential was confirmed valid, but the browser
received `403` before password verification. The CSRF guard now falls back to
same-origin referrer or fetch metadata only when a usable `Origin` is absent.
An explicit cross-site `Origin` continues to take precedence and is rejected.

### Verification

- Strict TypeScript and all 37 automation tests passed.
- Cross-site login rejection has dedicated regression coverage.
- Live compatibility login returned `303`, followed by authenticated dashboard
  status `200`.
- Worker version `2bd03271-7a18-427e-8ccf-da8ad290b4b7` is deployed.
- Telegram reports the secured webhook and all six group commands registered,
  with zero pending updates and no delivery error at verification time.

### Outstanding follow-up work

- Send and verify `/help` and `/status` after explicit permission for those
  external user messages.

## 2026-07-27 13:39 +02:00

### Summary

Added a secured Telegram group command transport and reconciled documentation
with the now-live automation infrastructure and first Telegram delivery.

### Files affected

- `automation/src/telegram-webhook.ts`
- `automation/src/index.ts`
- `automation/src/bindings.ts`
- `automation/src/security/replay.ts`
- `automation/src/services/telegram.ts`
- `automation/tests/telegram-webhook.test.ts`
- `automation/README.md`
- Canonical project documentation

### Reasoning

Group operators need discoverable `/` commands without duplicating the voice
and dashboard business logic. The webhook therefore verifies Telegram's
independent secret-token header, permits only the configured group, reserves
each update ID in D1/KV, and executes the shared generated command modules.

### Verification

- Strict TypeScript passed.
- All 35 automation tests passed.
- Wrangler dry bundle passed at 249.13 KiB upload and 52.51 KiB gzip.
- Tests cover invalid secrets, wrong chats, bot-addressed commands, D1/KV
  deduplication, auditing, help replies, and routed status execution.

### Outstanding follow-up work

- Obtain explicit approval to reuse the authenticated Wrangler configuration
  stored outside the repository.
- Install `TELEGRAM_WEBHOOK_SECRET`, deploy, register Telegram's webhook and
  command menu, and verify `/help` plus `/status` live.

## 2026-07-27 13:08 +02:00

### Summary

Validated external readiness for Telegram delivery and Cloudflare provisioning
without exposing or persisting credentials.

### Files affected

- `automation/src/commands/telegram-test.ts`
- `automation/tests/voice-route.test.ts`
- Automation and Tasker documentation
- Canonical project documentation

### Reasoning

End-to-end deployment must be driven from authoritative external state rather
than assumptions. Read-only checks prove the bot credential is valid, the bot
is a member of the destination group, the Cloudflare account is authenticated,
and the automation Worker/D1/KV resources do not yet exist.

A dedicated `test the bot` command now removes the financial-data dependency
from first acceptance. Its signed-route integration test covers HMAC
authentication, replay reservation, audit writes, generated routing, Telegram
payload delivery, and response handling.

### Outstanding follow-up work

- Obtain explicit approval for one potentially billable EU D1 database, one KV
  namespace, Worker deployment/secrets/migrations, and one labelled Telegram
  connection-test message.
- Continue through signed command acceptance after approval.

## 2026-07-27 12:59 +02:00

### Summary

Added the graphical automation Command Centre and hardened the Android
Hey Google/Tasker bridge.

### Files affected

- `automation/src/command-router.ts`
- `automation/src/commands/**`
- `automation/src/dashboard/html.ts`
- `automation/src/index.ts`
- `automation/src/operator-command.ts`
- `automation/scripts/render-command-hub.ts`
- `automation/scripts/send-voice-request.mjs`
- `automation/clients/tasker/**`
- `automation/tests/**`
- Canonical project documentation

### Reasoning

Operators need a scalable visual command catalogue and audited manual fallback,
while the public demonstration needs a bounded, HTTPS-only Android signing path
that forwards the spoken phrase without embedding secrets in Tasker.

The operator path reserves a generated operation ID through D1/KV before
execution, preventing duplicate external sends. Static desktop and mobile
renders were inspected with no horizontal overflow.

### Verification

- Root formatting, lint, TypeScript, database safety, and production build
  passed.
- 35 public-application tests and 21 automation tests passed.
- Wrangler dry bundle passed at 242.14 KiB upload and 50.76 KiB gzip.
- Credential-pattern scan found no Telegram-token-shaped values in source.

### Outstanding follow-up work

- Add dashboard login rate limiting and Worker route integration tests.
- Provision remote resources and run Android-to-Telegram acceptance after
  credential rotation and explicit deployment approval.

## 2026-07-27 12:26 +02:00

### Summary

Established the six canonical documentation artifacts and reconciled them with
the current public application and voice automation implementation.

### Files affected

- `docs/AI_HANDOFF.md`
- `docs/PROJECT_STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/TODO.md`
- `docs/CHANGELOG.md`
- `docs/STATUS.md`
- `README.md`

### Reasoning

Another engineer or AI must be able to become productive from `/docs` without
reverse-engineering source, relying on chat history, or risking credential
exposure.

### Outstanding follow-up work

- Keep all six files synchronized after each meaningful milestone and session.
- Update deployment evidence after automation production acceptance.

## 2026-07-27 12:18 +02:00

### Summary

Completed and verified the isolated AkiPasa voice automation foundation.

### Files affected

- `automation/**`
- `.github/workflows/automation.yml`
- Root check/configuration files
- Architecture and implementation-status documentation

### Reasoning

Provide a reusable authenticated automation engine rather than a hardcoded
voice-to-Telegram demonstration.

### Outstanding follow-up work

- Rotate external credentials.
- Provision remote D1/KV and deploy under explicit approval.
- Load real metrics and run Android-to-Telegram acceptance.

## 2026-07-27 09:00 +02:00

### Summary

Completed the focused console redesign and expanded staff/business operations,
including moderation visibility and ownership of the launch catalogue.

### Files affected

- `src/app/[locale]/**`
- `src/components/**`
- `src/lib/**`
- `src/app/globals.css`
- `database/migrations/0024_staff_operations_moderation.sql`
- `database/migrations/0025_owned_catalogue_deletion.sql`
- `database/migrations/0026_promote_launch_catalogue.sql`
- Unit and browser tests

### Reasoning

Reduce scrolling and text density while providing scalable staff, moderation,
customer-support, catalogue, and owner-management workflows.

### Outstanding follow-up work

- Replace fictional launch catalogue entries with verified businesses.
- Continue production usability monitoring with real operators.

## 2026-07-28 14:20 +02:00

### Summary

Recorded the approved production billing/deployment attempt and its exact
environmental blockers. The permitted OpenNext build reproduced esbuild's
parent-directory access failure; the external build was denied by execution
policy, and authenticated Chrome tab claims timed out before any Stripe,
Supabase, or Cloudflare secret changes could be completed.

### Files affected

- `docs/AI_HANDOFF.md`
- `docs/PROJECT_STATUS.md`
- `docs/TODO.md`
- `docs/CHANGELOG.md`

### Reasoning

The release must not use a stale `.open-next` artifact, and future work needs
to distinguish an environment/tooling block from an application or database
failure.

### Outstanding follow-up work

- Resume the already-approved restricted Stripe key, webhook, and encrypted
  Worker secret setup from a working authenticated session.
- Build a fresh OpenNext artifact outside the managed parent-directory
  restriction, then dry-run, deploy, and perform live payment acceptance.

## 2026-07-28 14:29 +02:00

### Summary

Completed production billing credential provisioning: created a least-privilege
Stripe key, registered the AkiPasa webhook for the four implemented events, and
installed all three runtime credentials as encrypted Cloudflare Worker secrets.

### Files affected

- `docs/AI_HANDOFF.md`
- `docs/PROJECT_STATUS.md`
- `docs/TODO.md`
- `docs/CHANGELOG.md`
- Stripe production API-key and webhook configuration
- Cloudflare Worker encrypted secret configuration

### Reasoning

Hosted Checkout, Customer Portal, and signed webhook fulfillment cannot operate
without production credentials, and credentials must never be committed or
documented.

### Outstanding follow-up work

- Produce a fresh OpenNext artifact through the connected Cloudflare Linux
  build, deploy it while preserving secrets, and run live payment acceptance.

## 2026-07-28 14:45 +02:00

### Summary

Configured the connected Cloudflare Linux build to generate the OpenNext
artifact and deploy while preserving dashboard-managed secrets. Reverified
formatting, lint, strict types, 53 application tests, database safety, 37
automation tests, and the regular Next production build. Publishing stopped at
the managed environment's read-only `.git` boundary.

### Files affected

- `.gitignore`
- `docs/AI_HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/PROJECT_STATUS.md`
- `docs/CHANGELOG.md`
- Cloudflare connected-build configuration

### Reasoning

The stale local OpenNext artifact cannot be deployed. Cloudflare's Linux build
avoids the Windows parent-directory restriction and `--keep-vars` preserves the
three encrypted runtime secrets.

### Outstanding follow-up work

- Stage, commit, and push the reviewed source to `master`.
- Inspect the connected build, verify the fresh artifact, and complete
  production smoke/payment acceptance.

## 2026-07-28 15:28 +02:00

### Summary

Built the current release from a clean isolated Windows snapshot, fixed the
clean-build dependency on an ignored generated `ExecutionContext` declaration,
and completed a fresh OpenNext build and Wrangler dry-run. The bundle generated
81 pages and 153 assets and measured 7,090.69 KiB upload / 1,329.72 KiB gzip.
The managed policy denied the approved production upload, so live acceptance
has not started.

The validated candidate remains at
`%TEMP%\akipasa-release-20260728-1`. Its server handler SHA-256 is
`B28D964B840DF1C3603C7E1353141A0E84E232092B6AEA67FCF632CF65880ECB`; the
repository `.open-next` handler differs and is not the release candidate.

### Files affected

- `src/cloudflare-worker.ts`
- `docs/AI_HANDOFF.md`
- `docs/PROJECT_STATUS.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `docs/TODO.md`
- `docs/CHANGELOG.md`

### Reasoning

A release must build from source without relying on ignored generated type
files, and only a fresh validated OpenNext artifact is safe to promote.

### Outstanding follow-up work

- Deploy the validated artifact with `--keep-vars`, or publish the reviewed
  source through the configured connected build.
- Run live profile, catalogue, onboarding, billing webhook, and 360 px
  acceptance.
