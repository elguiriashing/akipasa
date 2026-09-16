# AI Handoff

Last updated: 2026-07-28 15:28 +02:00.

## Project purpose

AkiPasa is a mobile-first bilingual platform for discovering events and
venues across Spain, operating business catalogues, moderating community
content, and running loyalty/passport programmes. The repository also contains
an isolated voice automation platform that executes authenticated commands and
can deliver financial updates to Telegram.

## Problem being solved

- Consumers need one trustworthy place to discover nearby Spanish events.
- Venues need self-service publishing, offers, loyalty, analytics, and team
  controls.
- Staff need scalable moderation and customer-support operations.
- Operators need secure, reusable automation rather than hardcoded voice demos.

## Current architecture

Two Cloudflare Workers share one repository but have separate request surfaces:

1. The public Next.js application is packaged by OpenNext and uses Supabase
   PostgreSQL/PostGIS, Auth, Storage, and Cron.
2. `automation/` is a Hono Worker using dedicated D1 and KV bindings. Signed
   Android requests reach `POST /voice`, pass HMAC/timestamp/device/replay
   checks, enter a generated command router, execute business services, and
   optionally call Telegram. Telegram group slash commands enter through a
   separate secret-token webhook, configured-group allow-list, and D1/KV
   update replay gate before using the same router.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for data flows and boundaries.

## Technology stack

- Node.js 22+, TypeScript, Next.js 15, React 19, Tailwind CSS
- Cloudflare Workers, OpenNext, Wrangler, D1, KV, Workers observability
- Supabase Auth, PostgreSQL/PostGIS, Storage, and Cron
- Hono and Zod for the automation Worker
- Vitest, Testing Library, and Playwright
- Telegram Bot API and Android Tasker/Termux bridge
- GitHub Actions for automation checks and manually gated deployment

## Major components

- `src/app`: localized pages, server actions, authentication callbacks, and API
  endpoints.
- `src/components`: reusable presentation and console navigation components.
- `src/lib`: domain models, provider adapters, permissions, validation, time,
  analytics, moderation, and Supabase clients.
- `database`: 33 ordered Supabase/PostgreSQL migrations, deterministic local
  seed tooling, and rollback-only acceptance SQL.
- `automation`: independent Worker, commands, security, dashboard, D1
  migrations, tests, and Android signing client.
- `tests`: unit/integration suites and mobile Chromium acceptance.
- `docs`: product, architecture, operations, acceptance, legal, and handoff
  contracts.

## Current progress

The optimized progressive-disclosure account/staff/administrator release is
deployed to production. Historical deployment evidence reported a 29 ms Worker
startup for the failed release, ruling out the one-second startup ceiling;
Cloudflare documents 1102 as request CPU exhaustion, and the account is
currently on the 10 ms free request allowance. Account tools use eight
dedicated routes. Staff operations use six routes under `/{locale}/staff`; the
former moderation URL remains a compatibility redirect. Administration uses
eight focused routes, including a searchable user CRM. Production Supabase is migrated through `0030`; local migration `0033` is pending deployment..

The deployed correction skips Supabase Auth for requests without a Supabase
session cookie and uses a sessionless client for public catalogue reads.
MapLibre and QR generation now run only in the browser. MapLibre previously
contributed about 1.07 MB to a server chunk; both libraries are absent from the
rebuilt Next server chunks. The release upload
fell from 8,738.70 KiB to 7,128.55 KiB and sustained production sampling
returned 40/40 successful responses with no 1102 or other 5xx response.
Workers Paid is now active. `wrangler.jsonc` sets pending defensive limits of
1,000 ms CPU and 100 subrequests per public Worker invocation so the
application has SSR headroom without exposing paid defaults to runaway work.

The current candidate fixes account profile updates through
`update_own_profile`, puts all Staff and Administration destinations directly
on Account Overview, and replaces the read-only staff catalogue with
searchable all-status venue/event inventory plus audited operator edit/delete
records. Migrations `0028` through `0030` are applied in production. Ordinary users
can apply and track status at `/{locale}/business/apply`; new venue creation
requires an active Business entitlement. Stripe products are live for Premium
at EUR 5/month or EUR 48/year and Business at EUR 20/month or EUR 190/year.
Hosted Checkout, Portal, signed/idempotent webhook processing, billing RLS, and
audited one-month, three-month, or indefinite staff grants are implemented.
The Worker release is not yet deployed. A restricted live Stripe key now
exists with Checkout Sessions and Customer Portal write access. The production
webhook at `/api/stripe/webhook` is active for the four implemented events, and
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
`SUPABASE_SERVICE_ROLE_KEY` are installed as encrypted Worker secrets. The
clean isolated Windows snapshot generated 81 pages and 153 assets and passed
Wrangler dry-run, but its uploaded candidate failed App Router HTML requests
with a Next.js `workUnitAsyncStorage` invariant. It was rolled back and
retained at 0% only long enough for version-override diagnosis. The deployment
contract now uses OpenNext's generated entry directly, and the connected
Cloudflare Linux build is the required release path.

The voice automation foundation and graphical Command Centre are deployed.
Dedicated D1 and KV resources are bound, migrations are applied, all current
financial values are truthfully set to zero, and the public health endpoint is
healthy. A signed production command delivered the labelled connection test to
the intended Telegram group and was visually verified.

Telegram slash-command webhook code is deployed. The webhook secret and
six-command group menu are registered with Telegram, with no reported delivery
error. Live `/help` and `/status` group acceptance still requires permission to
send those two user messages.

## Completed features

- Nationwide Spanish/English discovery, filters, event/venue detail, and
  accessible map-list fallback.
- Email/password and Google authentication with four server-enforced roles.
- Business venue/event management, recurrence, media, offers, loyalty,
  promotions, analytics, team permissions, and audited deletion.
- Community submissions, reports, claims, moderation queues, support
  operations, audit history, and abuse limits.
- Atomic idempotent check-ins, cooldowns, XP, stamps, passports, and reward
  redemption.
- Versioned consent, privacy export/deletion operations, feature flags,
  catalogue administration, and event expiry Cron.
- Public application Cloudflare deployment and production acceptance evidence.
- Modular voice commands, HMAC authentication, replay protection, D1 auditing,
  Telegram adapter, operations dashboard, retention Cron, signing client, and
  deployment workflow.
- Icon-led Overview, Command Hub, and Activity pages with typed command
  metadata, audited/idempotent operator execution, and explicit confirmation
  before external actions.
- Hardened Tasker/Termux launcher with owner-only configuration enforcement,
  spoken-phrase forwarding, production HTTPS enforcement, and a five-second
  timeout without unsafe automatic retries.
- Dedicated `send-telegram-test` command, aliased as `test the bot`, for first
  end-to-end acceptance without fabricated financial data.
- Provisioned EU D1 and KV resources, applied migrations, installed Worker
  secrets, deployed the Worker, and verified health and Telegram delivery.
- Secured Telegram webhook implementation for `/help`, `/commands`, `/numbers`,
  `/revenue`, `/expenses`, `/status`, and `/test`, including configured-group
  isolation, secret-token verification, shared routing, auditing, and
  D1/KV update deduplication.

## Features currently in development

- Authenticated browser acceptance remains pending because disposable QA
  credentials are not configured in this environment.
- The account/catalogue/onboarding/billing source passes the full repository
  check but still requires a connected Linux build, 0%-traffic smoke test, and
  promotion; database migrations `0028` through `0030` are
  production-applied.
- Stripe checkout is blocked only on production upload and release acceptance.
- Telegram slash-command live `/help` and `/status` acceptance remains open.

## Remaining roadmap

- Provision and accept the automation Worker end to end.
- Use verified real businesses throughout the launch catalogue.
- The public map uses MapLibre GL JS with OpenFreeMap's no-key OpenStreetMap
  vector style by default. Set `NEXT_PUBLIC_MAP_STYLE_URL` to move to a custom
  hosted or self-hosted MapLibre style without changing the UI.
- Complete professional Spanish/EU legal review and a backup restore drill.
- Validate production authentication email delivery and optional identity
  providers.
- Later options: native apps, payments/ticketing, AI-assisted content,
  rotating QR tokens, additional languages, charts/PDF/CSV automation outputs.

## Highest-priority next steps

1. Commit/push the reviewed source to trigger the configured connected Linux
   build, then test its version at 0% before promotion.
2. Perform live Checkout/webhook,
   onboarding, profile, catalogue, and 360 px acceptance.
3. Configure disposable administrator QA credentials and run the authenticated
   workspace/browser suite, including 360 px navigation.
4. Inspect and remove known stale deterministic QA rows from an older
   acceptance run only after a separate reviewed cleanup.
5. Monitor production for intermittent 503s under sustained browser crawling;
   focused post-deploy sampling was clean.
6. Complete Telegram `/help`, `/status`, and Android voice acceptance.

## Important design decisions

- PostgreSQL/PostGIS is authoritative for public product data; deterministic
  the local repository remains an explicit test-only fallback.
- Provider boundaries prevent Supabase, maps, email, and Telegram from leaking
  into domain logic.
- Every mutation validates input and authorizes server-side; RLS and database
  triggers provide a second enforcement layer.
- Financial and reward-producing operations use integer minor units,
  transactions, idempotency, and audit records.
- The automation Worker is isolated from the public application and never
  accepts anonymous commands.
- D1 is authoritative for replay prevention; KV is only the fast edge cache.
- Real metrics are never fabricated. Investor reporting refuses an
  unconfigured company shell.
- Telegram is an independent authenticated transport. It accepts only the
  configured group and reuses command modules rather than duplicating business
  behavior.
- Progressive disclosure is route-based: overview pages show summaries and
  next actions, while substantial workflows have stable dedicated URLs.
- Supabase Auth email search occurs only in administrator-gated
  security-definer RPCs. No service-role credential is exposed to Next.js or
  the browser.

Full records are in [DECISIONS.md](./DECISIONS.md).

## Known issues and technical debt

- The first signed connection test reached Telegram, but its originating
  five-second client timed out after delivery and left one incomplete audit
  row. Increase client tolerance or detach final audit completion from client
  cancellation.
- Telegram slash commands are registered but `/help` and `/status` have not yet
  been sent from the user's account for final end-to-end acceptance.
- Android Assistant Action availability depends on device/language; the
  documented Tasker fallback must be tested on the target phone.
- OpenFreeMap is the zero-config public tile/style provider. Reassess hosted or
  self-hosted capacity if map traffic becomes commercially significant.
- Hybrid discovery intentionally falls back to local test records when the
  live provider fails; this can hide availability incidents from users.
- Privacy and terms text are implementation drafts pending professional review.
- A production backup restore drill and real-mail auth acceptance remain open.
- Phone, Apple, and X authentication are not configured.
- The GitHub automation workflow has not yet been exercised against production.
- Support reports and resolution are database-backed; threaded support inboxes
  and conversations have no current tables/API and are intentionally not
  represented by fake controls.
- A prior production acceptance run left deterministic QA identities/fixtures.
  The current suite is rerunnable and rollback-safe, but cleanup of those old
  rows is a separate production-data operation.
- The previous release's sustained browser crawl observed intermittent
  503/aborted requests. The optimized production release completed a focused
  40-request sample with zero failures.
- The failed release uploaded 8,738.70 KiB (1,708.80 KiB gzip) and reported a
  29 ms startup. This isolates the incident to request CPU/free-tier limits,
  but historical per-invocation CPU quantiles were not retrievable from the
  current managed browser/CLI session.
- A clean OpenNext build succeeds only through an isolated temporary drive-root
  snapshot because esbuild parent traversal is denied from the repository.
  Never deploy the stale repository `.open-next` artifact.
- The connected build commands are configured, but the managed filesystem
  denied `git add` because `.git` is read-only. Commit/push requires a narrow
  elevated Git action.
- Direct Wrangler upload of the clean artifact was denied by managed execution
  policy despite explicit operator approval.

## Deployment status

- Public Worker: deployed to the production apex and `www` domains.
- Supabase: production migrations `0001` through `0030` applied; expiry Cron
  active.
- Public Worker version: `1f6e4d66-de50-4580-863c-411627c4c875`.
- Rejected release version: `cdf8050d-9d24-4f4a-b15d-3229c0d382f2`
  exceeded Cloudflare Worker resource limits and must not be redeployed
  unchanged.
- Corrected release: deployed to apex and `www`; formatting, lint, strict
  types, 48 tests, database safety, the production Next/OpenNext builds, and
  Wrangler dry-run passed. Local mobile browser acceptance passed 18 tests
  with one credential-gated test skipped. Upload is 7,128.55 KiB
  (1,390.16 KiB gzip), startup is 35 ms, and a 40-request production probe
  returned 40 successful responses with zero Worker errors.
- Paid-plan limit release: deployed with 1,000 ms CPU and 100 subrequests per
  invocation; upload remains 7,128.55 KiB and startup is 24 ms.
- Account/catalogue/onboarding/billing candidate: clean-built and dry-run
  validated, not deployed. Formatting, lint, strict types, 53 application
  tests, database safety, the regular Next build, and a clean OpenNext build
  pass. The build generated 81 pages and 153 assets; Wrangler dry-run reported
  7,090.69 KiB upload and 1,329.72 KiB gzip. Migrations `0028` through `0030`
  are production-applied. Stripe restricted-key/webhook provisioning and all
  three encrypted Worker secrets are complete. Production upload and live
  payment acceptance remain.
- Validated candidate path:
  `%TEMP%\akipasa-release-20260728-1`. Its
  `.open-next/server-functions/default/handler.mjs` SHA-256 is
  `B28D964B840DF1C3603C7E1353141A0E84E232092B6AEA67FCF632CF65880ECB`.
  The repository `.open-next` handler does not match and must not be deployed.
- Production database acceptance returned `ok = true` and rolled back its
  temporary writes.
- Automation Worker: deployed at its Cloudflare Workers development domain;
  health, D1, KV, secrets, and outbound Telegram delivery verified.
- Latest automation verification: strict TypeScript and 37 tests passed.
- Current automation Worker version:
  `2bd03271-7a18-427e-8ccf-da8ad290b4b7`.
- Updated automation bundle: 249.52 KiB upload, 52.60 KiB gzip.
- Dashboard privacy-browser login compatibility is deployed and accepted with
  a `303` login followed by an authenticated `200` dashboard response.

Release and rollback procedures are in [RUNBOOK.md](./RUNBOOK.md).

## Environment variable names

Public application:

- `NEXT_PUBLIC_PRODUCT_NAME`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_DATA_PROVIDER`
- `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED`
- `NEXT_PUBLIC_MAP_STYLE_URL` (optional; defaults to OpenFreeMap Liberty)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PREMIUM_MONTHLY_PRICE_ID`
- `STRIPE_PREMIUM_YEARLY_PRICE_ID`
- `STRIPE_BUSINESS_MONTHLY_PRICE_ID`
- `STRIPE_BUSINESS_YEARLY_PRICE_ID`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AKIPASA_LOCAL_DATABASE_URL`
- `AKIPASA_BACKUP_DATABASE_URL`

Automation Worker secrets:

- `SIGNING_SECRET`
- `DASHBOARD_PASSWORD`
- `DASHBOARD_SESSION_SECRET`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `TELEGRAM_WEBHOOK_SECRET`

Automation Worker configuration:

- `APP_NAME`
- `APP_VERSION`
- `ALLOWED_DEVICE_IDS`
- `COMMAND_MAX_AGE_SECONDS`
- `DASHBOARD_SESSION_TTL_SECONDS`
- `DEFAULT_COMPANY_ID`
- `EXECUTION_LOG_RETENTION_DAYS`
- `REPORT_RETENTION_DAYS`
- `TELEGRAM_API_BASE`

Automation client:

- `AKIPASA_AUTOMATION_URL`
- `AKIPASA_DEVICE_ID`
- `AKIPASA_SIGNING_SECRET`

Testing and CI:

- `PLAYWRIGHT_EXTERNAL_SERVER`
- `PLAYWRIGHT_BASE_URL`
- `AKIPASA_QA_EMAIL`
- `AKIPASA_QA_PASSWORD`
- `AKIPASA_QA_VENUE_ID`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Bindings, not string environment variables:

- `ASSETS`
- `AUTOMATION_DB`
- `REPLAY_KV`

Never place values in documentation, source, tickets, or logs.

## Important files and folders

- `package.json`: root commands and required full check.
- `wrangler.jsonc`: public Worker deployment contract.
- `automation/wrangler.jsonc`: automation bindings and schedule.
- `automation/src/index.ts`: automation HTTP and scheduled entry point.
- `automation/src/commands`: plug-in command modules and generated registry.
- `automation/src/operator-command.ts`: audited dashboard command executor.
- `automation/src/telegram-webhook.ts`: authenticated Telegram slash-command
  transport and response formatting.
- `automation/scripts/render-command-hub.ts`: static visual preview renderer.
- `automation/migrations`: D1 schema.
- `database/migrations`: production PostgreSQL schema and policies.
- `database/migrations/0027_admin_user_crm.sql`: administrator-only Auth user
  search/detail RPCs and hardened audited role changes.
- `database/migrations/0028_profile_operations_and_business_onboarding.sql`:
  self-profile RPC, business applications, audited staff catalogue operations,
  and Business-role venue-creation gate.
- `database/migrations/0029_stripe_billing.sql`: subscription entitlements,
  webhook event idempotency, staff grants, RLS, and paid venue-creation gate.
- `database/migrations/0030_atomic_stripe_webhook_claim.sql`: atomic event
  reservation and safe retry after failed webhook processing.
- `src/app/api/stripe/webhook/route.ts`: signed Stripe fulfillment endpoint.
- `src/app/[locale]/account/subscription`: hosted Checkout/Portal membership
  interface and actions.
- `src/lib/stripe.ts`: price mapping, Stripe REST client, and HMAC verification.
- `src/components/AccountWorkspacePortals.tsx`: direct privileged workspace
  launchpads on Account Overview.
- `src/app/[locale]/staff/catalogue`: searchable inventory and audited venue
  record editor.
- `src/app/[locale]/business/apply`: business application and status flow.
- `src/components/WorkspaceShell.tsx`: responsive sidebar/mobile drawer.
- `src/app/[locale]/account`: focused account route hierarchy.
- `src/app/[locale]/staff`: staff operations route hierarchy.
- `src/app/[locale]/admin/users`: searchable administrator user CRM.
- `src/app/api/admin/users/route.ts`: bounded private user-search endpoint.
- `database/tests/acceptance.sql`: rollback-only database acceptance.
- `src/lib/repository.ts`: fixture/Supabase/hybrid discovery adapters.
- `src/lib/supabase/auth-cookie.ts`: shared session-cookie detection.
- `src/lib/supabase/public.ts`: sessionless public catalogue client.
- `src/components/VenueQrCode.tsx`: browser-only QR generation.
- `src/lib/config.ts`: product, locale, provider, and time-zone configuration.
- `.github/workflows/automation.yml`: checks and manual production gate.
- `docs/RUNBOOK.md`: release, rollback, backup, and incidents.
- `docs/ACCEPTANCE.md`: production acceptance contract.
- `docs/PROJECT_STATUS.md`: concise current work state.
- `docs/TODO.md`: prioritized work.
- `docs/CHANGELOG.md`: milestone history.

## Recommended first task for the next AI

Deploy the clean dry-run-validated artifact with `--keep-vars` while preserving
the installed secrets, or commit/push the reviewed source to trigger the
configured connected build. Then complete one end-to-end subscription
acceptance. Never deploy the stale repository artifact.
