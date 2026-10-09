# Change Impact Register

Every behavior-changing PR adds an entry before merge. No invented verification.

## Entry template

### YYYY-MM-DD | PR # | Domain and owner

- User-visible change and exact expectation:
- Current code paths, routes, buttons/labels, EN/ES copy:
- Read/write data flow, DB tables/RPC, storage, external APIs, role/consent:
- Callers and downstream pages, other portals, Android, jobs, map/search/SEO/cache:
- Source-of-truth conflicts / earlier incidents checked:
- Files changed and why:
- Tests added/updated, exact commands and pass/fail/skip:
- Cross-role, cross-locale, theme, 360px/desktop coverage:
- Security/privacy, idempotency, migrations, rollback:
- Production build/deployment ID, URL smoke, metrics/logs (or NOT DEPLOYED):
- Outstanding gaps and accountable follow-up:

## 2026-10-09 | Initial contract baseline

- Reviewed: `AGENTS.md`, `README.md`, `package.json`, `wrangler.jsonc`, `docs/AI_HANDOFF.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/deployment-source.md`, `docs/PROJECT_STATUS.md`, `docs/CHANGELOG.md` plus accumulated user requests through 2026-10-09.
- Added `docs/AKIPASA_MASTER.md` as an initial **non-exhaustive** contract and agent playbook.
- No application code, database records, CI settings, production service or deployment touched.
- **Not run**: application/build/browser/production tests. Documentation-only change composed through GitHub connector; no local repository runtime available.
- Next required audit: programmatically traverse all `src/app` routes and `src/components` event handlers, labels, permissions and mutation flows and link each to specific code/tests. Inventory release branches, current DB policies and production observability with approved access.

## 2026-10-09 | PR #71 automation extension

- Added source scanner `scripts/generate-system-inventory.mjs` and PR contract guard `scripts/check-change-contract.mjs`; added `.github/workflows/master-system-contract.yml` to run both and upload the route inventory as an artifact.
- Static coverage: Next page/layout/route paths, UI tag/handler/label sites, integration keyword matches, migrations and tests. Dynamic runtime contracts, imports, all rendered text, DB policies and end-to-end click semantics are **not** exhaustively mapped by this heuristic.
- Verification: GitHub connector confirmed writes; no local source checkout or runnable CI environment. **Not run**: Node scripts, full source scan, unit/e2e tests or Actions build. Must inspect GitHub Actions result before claiming checks pass.
- No application runtime code, external services, paid campaign, secrets, database or deployment modified.
- Follow-up: make this workflow a required branch protection check; add richer AST-based interactive inventory and route-to-test mapping; run smoke/browser tests in a checked-out environment.

## 2026-10-09 | Advanced booking resources and recurrence (candidate PR)

- User-visible goal: resource pools, non-overlapping capacity, native
  recurring availability, SVG icons replacing emoji template visuals.
- Existing locations:
  `src/components/BookingManager.tsx`,
  `src/app/[locale]/business/venue/[id]/page.tsx`, and `actions.ts`.
- New DB migrations:
  `20261009115000_booking_resources.sql` and
  `20261009120000_recurring_booking_slots.sql`.
- Dependencies: venue slot RLS, owner/manager roles, `request_booking` RPC,
  public venue/event booking forms, time zone, native booking-mode settings.
- Integrity: resources belong to their venue; named resource capacity cannot
  be exceeded; only one active overlapping slot per resource; old records
  retain nullable resource assignment. The recurring RPC is permission-gated
  and bounded to 90 days.
- Regression coverage: new `tests/booking-manager.test.tsx` UI cases; SQL
  validation, full repository CI and live smoke status pending.
- Release state: NOT DEPLOYED. Existing schema and production booking data
  have not been changed by this feature branch.
- Remaining architecture: specialized stay inventory, dining/table joins,
  ticket tiers, payments and staff calendars need additional design/tests.

## 2026-10-09 | PR #74 extension: bookable offerings

- Business behavior: managers create independent named offerings with booking type, duration and capacity, then attach them to manual or recurring availability slots. Customers see offering names for eligible slots. Existing slots without offerings continue working.
- Paths: `src/components/BookingManager.tsx`, venue owner actions and loader, public venue booking page, `booking_offerings` migration, recurring RPC, SQL and UI test suites.
- Database: RLS and same-venue foreign key protect bookings from cross-venue references; offering capacity checked on slot insert/update. Existing resource lock and request_bookings RPC preserved.
- Other surfaces: bilingual venue booking UI and business dashboard, public availability reads, migration ordering. No changes to AkiHQ, Google Ads, Stripe or live pricing.
- Evidence: tests and GitHub CI pending for this latest extension; no staging acceptance or live smoke claimed. No production deployment.
- Remaining: managed cancellations, resource availability exceptions, full ticket/inventory/room-night models, authenticated browser tests and accessible UI review.

## 2026-10-09 | AkiBusiness booking flow redesign and consumer My Bookings (candidate)

- User intent: booking wizard with buttons and fewer text inputs; modern compact AkiBusiness workspace; saved subtab persistence; approved booking confirmation emailed to both customer and opted-in venue; personal Upcoming/Active/Past booking history.
- Paths: BookingWizard, MyBookings, Account layout/overview/bookings route, venue public booking route, business booking manager/editor/actions, email adapter, Supabase notification migration, tests and responsive CSS.
- Data: existing booking_requests and availability remain authoritative; recipient queue is keyed by booking and audience, approval is a conditional transition; venue notification recipient is explicit and private. All account queries filter by auth profile and rely on RLS.
- Integrations: Resend transactional API requires RESEND_API_KEY and verified BOOKING_EMAIL_FROM. Root akipasa.com domain is now verified in Resend and contact@akipasa.com is the default sender; Cloudflare secret verification is still outstanding.
- Rollout: Database migration ahead of application release; never send actual customer emails in tests. Verify EN/ES, mobile/desktop, light/dark, party max, permission boundaries, retry/idempotency, email formatting, saved tabs, status transitions.
- Status: draft branch, CI and staging/live acceptance NOT YET VERIFIED; production remains unchanged by this branch.

## 2026-10-09 | PR #75 release hardening and rollout

- Approval: user explicitly requested a live release and final runtime key instructions; no advertising budgets, payment plans, external accounts or real customer emails are modified by acceptance tests.
- Audit found and fixed: root sender fallback still using auth subdomain; customer UPDATE rights could change capacity/confirm their own booking; private notification email on a public settings table; history joins losing past dates; UI using total rather than remaining capacity; navigation restored only on initial mount; no automatic email retry or stale-lease recovery.
- Cross-layer fixes: public booking action/schema/wizard; owner loader/actions/workspace; Account route, polling, cancellation and export; private settings/outbox tables, status guard/queue triggers, approval/availability/history/request RPCs; rendered HTML/text emails and runtime dispatcher; Worker scheduled handler plus five-minute cron. Existing auth, map special routes, search, ads and Stripe behavior preserved.
- Tests: `npm run check`, `npm run build:cloudflare`, `node scripts/test-booking-engine-sql.mjs`, `npm run test:booking:browser`, and `npm run test:e2e`. Results are recorded against the final commit in the PR; at composition time these latest hardening changes await execution. The SQL suite uses real authenticated/anonymous/service roles with owner/editor/customer/stranger fixtures and independent concurrent transactions. Browser screenshots cover EN/ES, 360px/desktop, light/dark with mock client actions; these are not a claim of an authenticated production session.
- Security: direct booking ownership/party rewrites revoked; permissible state transitions enforced in database; customer cancellations only their future bookings; aggregate capacity contains no contact data; private email settings and queue protected by RLS; rendered email snapshot escaped; queued deliveries survive missing API keys and crashes. No test credentials or real personal data are included.
- Rollout order: final candidate checks, atomic application of both pending migrations, merge the exact tested head to master, verify connected Cloudflare rollout via `/api/bookings/release` and public routes. An edge version marker is deliberately public and contains no configuration or credentials.
- Rollback: do not revert the new DB security boundaries or delete queued/customer data. Keep additive migrations, restore a reviewed compatible Worker version, disable the booking cron if necessary, and inspect `review`/`failed` deliveries before any manual resend. The previous UI can still set status using the strengthened database checks.
- Outstanding operational prerequisite: the user must add `RESEND_API_KEY` as a Worker runtime Secret and Deploy. Queue sending/inbox delivery cannot be proven without this key. Root domain verification was inspected separately; it is not runtime-secret evidence.

## 2026-10-09 | PR pending | Event-first venue cards and event-linked menus

- User-facing: rich upcoming event cards above venue menu, optional multi-section venue menu selector in event editor, selected published catalogue sections on public event details.
- Source: `src/app/[locale]/venues/[slug]/page.tsx`, `src/app/[locale]/events/[slug]/page.tsx`, `src/app/[locale]/business/venue/[id]/page.tsx`, `src/components/BusinessEventEditPanel.tsx`, `src/app/compact-app.css`.
- Data: add `events.catalogue_section_ids text[]` default empty; server validation against matching venue catalogue section IDs, public reads via event ID, venue ID, published status; no duplicate item prices or allergens.
- Dependency: existing booking settings, catalogue publishing RPC, event permissions, media links, locale and themes. Migration must precede Cloudflare rollout.
- Verification: NOT RUN locally: checkout unavailable in tool runtime. GitHub CI requested; pending status, migration deployment and live smoke checks must not be represented as passed.
- Rollback: revert feature code first; added database column can safely remain with empty default. No live production changes performed as part of initial PR preparation.
