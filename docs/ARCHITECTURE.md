# Architecture

Last updated: 2026-07-31.

## Overall system architecture

AkiPasa has two independently deployed Cloudflare Workers:

```text
Browser
  -> Cloudflare custom domain
  -> OpenNext/Next.js Worker
  -> Supabase Auth + PostgreSQL/PostGIS + Storage

Android app
  -> native secure WebView host
  -> same Cloudflare custom domain and Next.js application
  -> same Supabase Auth session, database, storage, and server rules
  -> system browser for Google OAuth, Stripe, and external destinations

Android voice trigger
  -> Tasker/Termux signing bridge
  -> Hono automation Worker
  -> HMAC/device/time/replay security
  -> generated command router
  -> D1 business data + execution audit
  -> Telegram Bot API

Telegram group
  -> secret-token POST /telegram/webhook
  -> configured-group validation + D1/KV update reservation
  -> shared generated command router
  -> Telegram reply + D1 execution audit
```

The public application and automation Worker share repository standards but do
not share routes, secrets, databases, or deployment lifecycles.

### Public Worker request-cost boundary

The public Worker uses OpenNext's generated `.open-next/worker.js` entry point
directly. A custom Cache API wrapper was removed after production
version-override tests reproduced a Next.js `workUnitAsyncStorage` invariant
in the Windows-built candidate. Connected Cloudflare Linux builds are the
release path; a candidate must pass a 0%-traffic version-override smoke test
before promotion.

Middleware detects whether a Supabase Auth cookie exists before constructing a
Supabase SSR client or calling `auth.getUser()`. Public catalogue reads use a
separate non-persistent client with Auth refresh disabled. Event, venue, and
passport pages switch to the cookie-backed client only for signed-in visitors.
MapLibre and QR generation are client-only and are excluded from server chunks.

## Folder structure

```text
src/
  app/                 Next.js routes, layouts, server actions, API endpoints
  components/          UI-only reusable components
  lib/                 Domain, providers, permissions, validation, services
database/
  migrations/          Ordered Supabase/PostgreSQL migrations
  tests/               Rollback-only database acceptance
automation/
  clients/tasker/      Android trigger instructions
  migrations/          D1 schema and safe initial shell
  scripts/             Command registry and signed request client
  src/commands/        One module per automation command
  src/dashboard/       Dashboard authentication, queries, and HTML
  src/security/        Canonical signing, HMAC, and replay protection
  src/services/        Finance and Telegram adapters
  tests/               Automation unit tests
tests/
  e2e/                 Mobile Chromium and opt-in production acceptance
Android/               Native Play Store client for the production web app
docs/                  Product and operational contracts
.github/workflows/     Automation CI/manual deployment
```

## Backend

### Public application

Next.js App Router server components and server actions perform authenticated
reads and mutations. External input is validated with Zod or narrow typed
parsers. Authorization is checked server-side and reinforced by Supabase RLS,
database constraints, triggers, and audited RPCs.

`src/lib/repository.ts` exposes a discovery interface with three adapters:

- `FixtureRepository`: deterministic local records for credential-free tests.
- `SupabaseDiscoveryRepository`: published production catalogue.
- `HybridDiscoveryRepository`: live data plus non-conflicting labelled
  fixtures, deduplicated by slug.

Authentication, maps, storage, analytics, email, and future ticketing remain
behind provider boundaries.

### Automation Worker

`automation/src/index.ts` exposes:

- `POST /voice`: authenticated command execution.
- `POST /telegram/webhook`: secret-token authenticated, group-restricted slash
  commands with update replay protection.
- `GET /health`: minimal D1/service health.
- `/dashboard/login`, `/dashboard`, `/dashboard/logout`: separate operator
  session.
- `/dashboard/commands` and command detail/run routes: generated command
  catalogue and audited operator execution.
- `/dashboard/activity`: recent execution audit.
- A scheduled handler for retention cleanup.

Valid command modules implement `AutomationCommand` in
`automation/src/commands/types.ts`. A generated registry discovers command
files before development, tests, type checks, and deployment.

## Frontend

The public UI is mobile-first and localized under `/es` and `/en`. Public
discovery, membership, event, venue, map, auth, privacy, and legal routes are
server-rendered where appropriate. The compact mobile site menu becomes a
regular primary navigation bar on desktop. Membership remains visible in the
header and homepage before authentication; checkout still requires an account
and returns to `/{locale}/account/subscription`.

Account, business, community, passports, moderation, and administration use
icon-led `WorkspaceShell` navigation and focused sub-pages:

- Desktop: a collapsible, sticky sidebar with route-aware links.
- Mobile: a burger trigger and bounded in-flow panel with initial focus,
  Escape, explicit close behavior, and no viewport-covering overlay.
- Account: eight focused routes under `/{locale}/account`.
- Staff: six operational routes under `/{locale}/staff`; legacy
  `/{locale}/moderation` requests redirect to the matching staff workflow.
- Administrator: eight routes under `/{locale}/admin`; overview pages query
  summaries while detailed datasets load only on their selected route.

Reports are the current database-backed support case model. There is no support
conversation, participant, assignment, or message schema, so the UI does not
claim to provide threaded inboxes.

The automation Command Centre is intentionally dependency-light server-rendered
HTML/CSS from the Hono Worker. Overview, Command Hub, and Activity pages display
health, execution success, latency, pending jobs, the latest report, Telegram
configuration state, typed command cards, and recent executions. It does not
expose secrets. Authenticated operator commands share command implementations
and audit logging with voice calls; external actions require a same-origin POST
from an explicit confirmation screen. A generated operation ID is reserved
through the same D1/KV nonce layer to prevent duplicate form submissions.

### Android client

`Android/` is a dependency-light native Android application targeting API 36.
Its primary view hosts the production AkiPasa web application, so it shares the
same database, authentication cookies, server actions, RLS, storage, billing,
roles, and release behavior instead of duplicating them in a mobile-only data
layer. The native boundary handles exact-host navigation, App Links, system-
browser OAuth/billing handoff, location permission, document picking,
downloads, back/rotation state, and offline retry UI.

Only `https://akipasa.com` and its canonical `www` redirect host render inside
the WebView. Other supported destinations open through Android; cleartext,
file, JavaScript, intent, and unknown schemes are rejected. Google OAuth and
Stripe return links require the Play app-signing fingerprint to be published
at `/.well-known/assetlinks.json` before release. This client is a native
package with a web-delivered product UI, not a screen-by-screen native UI
rewrite. Such a rewrite would first require a versioned mobile API because the
current mutations are Next.js server actions.

## Database

### Supabase PostgreSQL/PostGIS

The authoritative product database covers identities, roles, cities,
categories, venues, ownership/team membership, events and occurrences, media,
offers, loyalty, passports, check-ins, redemptions, community submissions,
reports, claims, promotions, analytics, privacy requests, feature flags, and
audit records.

Migrations are ordered in `database/migrations` and production currently runs
through `0030`. Production migrations
are forward-only; rollback uses a compensating migration or Supabase backup
restore. Reward operations are transactional and idempotent. UTC instants are
stored and rendered in the venue IANA time zone, defaulting to
`Europe/Madrid`.

### Automation D1

`automation/migrations` defines:

- `company_metrics`
- `revenue_entries`
- `expense_entries`
- `request_nonces`
- `execution_logs`
- `generated_reports`
- `automation_jobs`

Money uses integer minor units. The seed inserts only an intentionally stale,
zero-valued company shell. Reporting fails until current real metrics exist.
D1's `(device_id, nonce)` primary key is authoritative replay protection.
Telegram update IDs use the same table under a separate `telegram-group` actor
and a two-day replay window.

## APIs

### Public application API

- Next.js server actions implement authenticated product mutations.
- `update_own_profile` changes only the caller's display name and locale.
- `submit_business_application` creates one bounded active application per
  user; staff review is role-gated and audited.
- Staff catalogue mutations use `operator_update_venue`,
  `operator_update_event`, and `operator_delete_catalogue_item` with required
  reasons and explicit deletion confirmation.
- `/api/analytics` accepts a strict same-origin, privacy-minimised event
  contract.
- `/api/stripe/webhook` verifies Stripe HMAC signatures within a five-minute
  tolerance, deduplicates event IDs, and uses a server-only Supabase service
  client to update subscription entitlements.
- Hosted Checkout carries profile, plan, and interval metadata into the Stripe
  subscription. Redirect success is informational; only a verified webhook
  activates paid access.
- Supabase REST/RPC and Storage calls are made through server/browser clients
  according to RLS policy.

### Voice API

`POST /voice` accepts a Zod-validated command, device ID, ISO timestamp, unique
nonce, versioned HMAC signature, and optional payload. The canonical signature
includes method, path, normalized command, device, timestamp, nonce, and a
stable payload hash. Bodies are capped at 16 KiB.

The request sequence is:

1. Parse and validate shape.
2. Verify allowed device, timestamp window, and HMAC.
3. Create the execution audit.
4. Reject replay via KV cache and D1 unique insert.
5. Resolve and execute the command.
6. Persist success/failure duration and bounded result/error details.
7. Return a non-sensitive JSON response.

### Telegram webhook API

`POST /telegram/webhook` accepts Telegram Bot API message updates. It verifies
the `X-Telegram-Bot-Api-Secret-Token` header before parsing, ignores any chat
other than the configured group, parses supported slash commands including
bot-addressed forms, and reserves the Telegram `update_id` before execution.

`/numbers`, `/revenue`, `/expenses`, `/status`, and `/test` resolve through the
same generated command router as voice and dashboard operations. `/help` and
`/commands` return the group command menu. Executions and failures are written
to the same D1 audit table with a transport-specific caller.

## External services

- Cloudflare: Workers runtime, custom domains, assets, D1, KV, observability.
- Supabase: Auth, PostgreSQL/PostGIS, Storage, Cron, backups.
- Telegram Bot API: automation message delivery.
- Android Tasker and Termux: voice trigger and local request signing.
- Google: configured public-app OAuth and device Assistant trigger.
- Resend: production authentication email through Supabase SMTP.
- Stripe Billing: hosted subscription Checkout, customer portal, and signed
  webhooks.
- GitHub Actions: automation checks and manually gated deployment.

No external service credential belongs in source or documentation.

## Authentication

### Public application

Supabase Auth is the only password processor. Public signup starts as User.
Business capability follows venue ownership/team membership. Staff and
Administrator are privileged platform roles; privileged role changes require
Administrator authorization, a reason, and an audit row. Administrator venue
access is inherited without synthetic membership.

Migration `0027` adds `admin_search_users` and `admin_user_record` as narrowly
granted security-definer RPCs. They inspect `auth.users` and Google
`auth.identities` only after an administrator check, cap search results, and
return a bounded record. The browser uses a debounced same-origin API and never
receives a service-role credential. `set_platform_role` serializes role
changes, rejects self/no-op changes, protects the final active administrator,
and appends the reason plus old/new role to the audit system.

Billing service-role access exists only in the server webhook route. It is
never exposed to browser code. Customers can read only their own billing rows;
staff can read grants/subscriptions and create grants only through an audited
security-definer RPC. New venue creation requires an active Business
subscription/grant, except for Administrators.

### Voice execution

Anonymous execution is impossible by contract. Requests require a shared
HMAC-SHA256 signing secret, allowed device ID, fresh timestamp, and unused
nonce. Web Crypto performs verification. D1 prevents replay across edge
locations, with KV serving only as an optimization.

### Telegram execution

Telegram authenticates webhook delivery with an independent secret-token
header. The Worker additionally requires the configured numeric group ID and
deduplicates update IDs in D1/KV. Telegram credentials are not reused for
dashboard or voice authentication.

### Automation dashboard

The dashboard uses a separate password and a signed short-lived cookie with
`HttpOnly`, `Secure`, and `SameSite=Strict`. Login/logout POSTs require a
same-origin request.

## Deployment

### Public Worker

OpenNext builds `.open-next/worker.js` and static assets. `wrangler.jsonc`
attaches the apex and `www` custom domains; middleware canonicalizes `www` to
the apex. Release requires migrations, rollback-only database acceptance,
`npm run check`, `npm run test:e2e`, Worker preview/dry-run, approved deploy,
and post-deploy smoke tests.

The connected Cloudflare build runs `npm run build:cloudflare` on Linux and
deploys with `npx wrangler deploy --keep-vars`. This is the production build
path when the managed Windows environment blocks OpenNext's parent-directory
scan. The stale local `.open-next` directory must never be deployed.

For release verification in the managed Windows environment, source can be
copied to an isolated temporary snapshot and mounted as a temporary drive root.
This prevents esbuild from traversing denied parent directories. Dependencies
must be complete and local to that snapshot; generated or ignored repository
artifacts are never copied. The resulting bundle must pass Wrangler dry-run
before deployment, and production deployment must use `--keep-vars`.

Billing uses encrypted `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and
`SUPABASE_SERVICE_ROLE_KEY` Worker secrets. Stripe price IDs are non-secret
deployment variables. All three secrets and the four-event production webhook
are configured.

Production currently runs Worker version
`1f6e4d66-de50-4580-863c-411627c4c875`. The optimized artifact uploads
7,128.55 KiB (1,390.16 KiB gzip) and reports a 24 ms startup. A controlled
40-request production probe returned only `200` responses and no Worker error.

The Workers Paid plan removes the free plan's 10 ms request ceiling. The public
Worker nevertheless sets a defensive 1,000 ms CPU limit and 100-subrequest
limit per invocation. These bounds provide ample Next.js SSR headroom while
containing runaway execution and downstream request amplification.

### Automation Worker

`automation/wrangler.jsonc` defines the D1/KV bindings, configuration, and
observability. The dedicated resources are provisioned and the Worker is
deployed. The scheduled maintenance handler exists in code, but no production
Cron trigger is currently attached. The GitHub workflow always runs checks;
deployment is available only through a manual boolean input and protected
production environment.

Detailed procedures are in `docs/RUNBOOK.md` and `automation/README.md`.

## Infrastructure

- Public Cloudflare Worker plus static assets and two custom-domain routes.
- Hosted Supabase project with PostgreSQL/PostGIS, Auth, Storage, and hourly
  event-expiry Cron.
- Separate deployed automation Cloudflare Worker with dedicated EU D1 and KV.
- Cloudflare structured observability enabled for both Worker configurations.
- GitHub Actions uses short-scope Cloudflare account/token secret names.

## Data flow

### Discovery

```text
Localized request
  -> validated query
  -> selected repository adapter
  -> published Supabase rows and/or labelled fixtures
  -> occurrence/time/distance filters
  -> localized server-rendered result
```

### Authenticated mutation

```text
Form/server action
  -> Zod validation
  -> Supabase session
  -> server permission check
  -> RLS/constraint/trigger/RPC enforcement
  -> transaction and audit/ledger
  -> revalidated UI
```

### Subscription fulfillment

```text
Authenticated plan selection
  -> server creates Stripe-hosted Checkout Session
  -> Stripe collects payment
  -> signed POST /api/stripe/webhook
  -> event ID reservation
  -> Supabase subscription entitlement
  -> Business application activation where applicable
```

### Voice investor update

```text
Spoken phrase
  -> Tasker/Termux generates timestamp + nonce + HMAC
  -> POST /voice
  -> authentication and D1/KV replay reservation
  -> finance service reads current D1 rows
  -> report formatter
  -> Telegram adapter
  -> generated report + execution audit
  -> dashboard metrics
```

### Telegram group command

```text
Slash command in configured group
  -> Telegram webhook with secret-token header
  -> chat allow-list + D1/KV update reservation
  -> shared command module
  -> reply or external command delivery
  -> execution audit + dashboard metrics
```

# Personalisation and recommendations (2026-08-13)

The central recommendation boundary is `src/lib/personalisation/server.ts`; ranking components are in `src/lib/personalisation/ranking.ts`. Versioned ingestion is `/api/v1/behaviour/events` and versioned internal recommendations are `/api/v1/recommendations`. The existing discovery repository remains candidate infrastructure, so homepage, maps, AI tools and future partner gateways can converge on one engine. See `docs/RECOMMENDATIONS.md`.
