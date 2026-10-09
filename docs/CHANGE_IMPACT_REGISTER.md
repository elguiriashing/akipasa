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

## 2026-10-09 | PR pending | AkiDuermo claim selection and owner playtest seed

- Adds Activities/Accommodation selection to the existing AkiBusiness claim picker, reusing standard claim approvals and venue member authorization.
- Code: `src/components/ClaimVenuePicker.tsx`, `src/app/api/business/claim-search/route.ts`, `src/app/api/business/claim-map/route.ts` and `supabase/migrations/20261009130000_accommodation_claim_discovery.sql`.
- New RPCs maintain same output schema, restrict to published/unclaimed, geolocated, non-suspect accommodation, and limit map/search outputs. Existing activity functions are unchanged.
- Direct DB test fixture: AkiDuermo HQ at user-supplied address, approximate coordinate, explicitly fictional and not bookable; `discovery_enabled=false`, `search_enabled=false`, owned by the existing `alex@akipasa.com` account. No public claim or booking inventory generated.
- Verified: demo venue and owner membership by read-only SQL; migration applied. CI source/format/build/browser results remain pending until PR checks. No claim mutation or authenticated full browser test performed.
- Rollback: revert branch code; new claim read functions may remain unused. Keep demo listing private to discovery, remove only on user request.

## 2026-10-09 | Tablet viewport and per-host PWA identity candidate

- Observed: Android Chrome offered AkiBusiness as AkiPasa; shared manifest had one name/start URL. Tablet portrait AkiBusiness auth showed desktop two-column layout with cramped copy; split-window landscape venue rows clipped action buttons.
- Changes: host-sensitive PWA manifest name/id/start URL/theme, SVG colored icon, AkiDuermo manifest route allowlist, responsive auth tablet single column and wrap/stack venue management actions. No database/auth/API/role mutation.
- Source: src/app/manifest.ts, src/app/pwa-icon.svg/route.ts, src/lib/akiduermo-routing.ts, src/app/tablet-responsive.css, src/app/layout.tsx.
- Cross-portal impact: app installs on three hosts, AkiBusiness login, AkiBusiness venue list; global stylesheet import could affect other portal pages but selectors are scoped.
- Verification: connector file inspection and GitHub commits only. npm check, Next build, Android Chrome portrait/landscape/split-screen and end-to-end workflows **NOT RUN** in connector runtime. No production deployment.
- Risks: Chromium icon selection/installability with SVG-only manifests, CSS specificity on production, existing installed apps may cache old labels, uninspected routes might overflow. Browser QA and green checks required before merge.

## 2026-10-09 | PR #79 continuation | Tablet acceptance and install hardening

- Read full master contract, AGENTS, architecture, decisions, deployment-source and impact register; fetched master e2a1e54. Inspected the three supplied tablet screenshots.
- Fixed auth below 1200px, actual flex venue rows and action wrapping, narrow input tracks and topbar wrapping, AkiDuermo tablet search/card tracks, short-viewport delete dialog scrolling and long names.
- PWA: restore PNG 192/512 any/maskable with reproducible branded assets, hostname-aware favicon/application metadata, retain existing implicit AkiPasa identity, enable service worker on all origins, allow offline/service-worker host routes, remove stale manifest cache. No auth, permission, data, booking mutation, advertising, pricing or DB changes.
- Dependencies traced: root metadata/manifest, middleware/static asset exclusion, stay route gate, service-worker registration/cache, shared auth CSS, managed venue actions and actual module-based deletion dialog, VenueDashboard/BookingManager, AkiDuermo CSS.
- Browser evidence: 28 real-component combinations passed locally in headless Chromium 153 (390/600/768/820/1024/1280 widths plus 640x400), EN/ES light/dark. Deletion action is a disposable adapter; no production records touched. Public route/e2e and final check/Cloudflare results pending at this entry's composition; record final outcomes before handoff.
- First npm check attempt reached automation and failed because its nested dependencies were not installed; installed with npm ci --prefix automation and reran. Playwright CDN browser ZIP failed; isolated Chromium binary obtained from npm for local tests. No dependency changes to project.
- Rollback: revert PR application/assets; keep data unchanged. NOT DEPLOYED. Physical Android install, authenticated live roles/full editor content and on-device keyboard/rotation are not claimed verified.
- Interim validation: npm run check passed before the final test/document additions (357 application + 5 subscription + 41 automation tests, lint/typecheck/format/database-safety/automation dry-run/Next build); npm run build:cloudflare passed; six added PWA unit tests passed. Full site e2e currently exposes unavailable test backend and legacy selector failures and is not green. Merge remains blocked.
- Host browser acceptance exposed differing host resolution between middleware/colored SVG (Next URL hostname) and manifest/root metadata (request Host). Middleware and SVG now use the normalized request Host with URL fallback, matching the manifest and preserving exact portal hostname matching. No client-supplied product header is trusted. Host-level browser acceptance rerun required against the rebuilt candidate.
- Latest browser results: all four public route matrices passed on a stable production Next build (252 route/locale/theme/viewport visits), plus successful navigation sheet open/close after supplying an existing consent-version cookie; optional privacy choices remain false. Per-host manifest/PNG/SVG/service-worker/offline checks and AkiBusiness four-mode auth matrix passed after host normalization. Full combined rerun status is recorded below when complete.
- Expanded component acceptance passed all 28 combinations again, now including every booking subtab and visible booking form input/select/textarea/action bounds.
- The broad `npm run test:e2e` run was interrupted after unavailable backend and legacy-selector failures; it is FAILED/INCOMPLETE, not release evidence. Earlier isolated attempts affected by concurrent rebuilds and/or missing localhost server are superseded by the stable focused runs.
- Clean Cloudflare snapshot with symlinked dependencies failed on native sharp/esbuild resolution outside the snapshot. Reinstalling dependencies physically inside the snapshot and rerunning; this is an environment issue, not a removed application feature.
- Final focused combined browser suite: six tests PASSED in 3.3 minutes, covering 252 public route visits, responsive navigation interactions, 112 business auth-mode visits and per-host installation resources. Expanded component suite: 28 combinations PASSED. Screenshot samples inspected for business light/dark portrait, split-window actions and AkiDuermo tablet search layout.
- Final clean Cloudflare packaging PASSED after physically installing snapshot dependencies. Six PWA unit tests plus focused auth/SEO/accommodation regressions PASSED (29 tests); final lint, typecheck and formatting passed. Final npm run check PASSED with 363 application + 5 subscription + 41 automation tests, formatting, lint, typecheck, DB safety, automation dry-run and the production Next build.
- Release remains blocked: broad site e2e FAILED/INCOMPLETE, no authenticated staging data/session, no physical Android install/update/keyboard/rotation verification. PR remains unmerged and no production promotion was performed. See docs/TABLET_ACCEPTANCE.md.

## 2026-10-09 | Tablet booking inbox and scroll polish follow-up

- User supplied four live tablet screenshots after PR #79 and explicitly requested implementation, testing and merge to live. Observed: all requests rendered as an unbounded list; Services panel clipped at the edge of an independently scrolling, height-capped booking hub; oversized stretched status pills.
- Base: fetched master d26c4c5 (PR #79 merge); local f18b80c tree matches that merge. Traced BookingManager → venue loader → signed-in Supabase/RLS and availability/offering joins → update/retry actions → email state. Reviewed VenueDashboard module styles, global booking styles and tablet acceptance. Public consumer booking engine, account history, PWA, permissions/capacity/email dispatch rules are unchanged.
- Changes: 20-row server query with exact count, validated URL search/status/order/page, independent pending count, bounded email-state query, historical slot join, retained filters on mutation redirects, explicit read errors, accessible controls and expandable details. No migrations, secrets, live record writes, ads or billing changes. Supabase guidance informed query boundaries and permission preservation.
- Layout: one document scroll rather than nested clipped Services panel, compact manager spacing/status pills, responsive search grid. Existing service/resource creation and booking approve/decline/cancel/complete/retry controls remain.
- Planned acceptance: real Supabase-client HTTP query contract tests, existing booking regression tests, populated 65-request fixture browser paging/search/filter and form-boundary checks across EN/ES themes and nine viewports, full check and Cloudflare packaging. Results pending; no current production verification claimed.
- Rollback: revert application changes only; database and customer data unchanged. Physical tablet keyboard/touch and authenticated live sessions cannot be inferred from component fixtures.
- Verification: full `npm run check` passed (370 application, 5 subscription and 41 automation tests, format/lint/types/DB-safety/dry-run/Next build); focused booking suites passed 22 tests. Final populated tablet component rerun passed all 36 EN/ES/theme/viewport combinations, including bottom pager and screenshot capture. Existing customer/manager/history browser acceptance passed eight combinations. Final OpenNext packaging passed. Services and inbox screenshot samples inspected in portrait/split-window; connected PR checks and post-merge rollout must be independently verified.
- Read-only Supabase checks confirmed RLS on booking_requests and booking_confirmation_emails, existing venue-manager email read policy, and a real bounded booking query returned five rows. No records were changed and no authenticated browser session is implied.
- Broad browser suite was run fail-fast (`npx playwright test --max-failures=1 --workers=1`): failed on the existing BusinessPackages “Business type” selectOption selector; one authenticated production test skipped (session absent), 67 not run. That component/test is unchanged by this patch, and this is not a full-suite pass. Current PR #79 master Cloudflare build/check/booking live-read-only checks succeeded; separate AkiPals live smoke failed with repeated 403 responses. Neither issue is concealed or marked green by this follow-up.
- Additional screenshot inspection found sticky venue navigation hidden behind the product header. VenueDashboard now measures/observes its header and uses inherited offsets for desktop/sidebar and tablet/mobile tabs; search anchors share that measurement. One new observer/resize/cleanup regression test, plus the 36-case browser harness now includes a realistic wrapping header and explicit no-overlap assertion. This final follow-up awaits renewed full check/browser/Cloudflare evidence before merge.
- Header-aware `npm run check` passed with 371 application + 5 subscription + 41 automation tests. Literal apostrophes/underscores are preserved in search, with SQL LIKE and PostgREST quoted-value escaping; focused final inbox/dashboard suites passed 42 tests and lint passed. A local public-route attempt overlapped a rebuild and failed on stale page/hydration assets; it is NOT acceptance and is being rerun against a stable build. Final clean CI/rollout results are recorded in PR #80 before release approval.
- Final review follow-up preserves formatted phone parentheses, commas and quoted contact names rather than deleting punctuation. External inbox fields now use Zod; LIKE and PostgREST quoting are escaped independently. Updated real-client query regression assertions passed within the 42 focused tests. Renewed exact-head checks required before merge.

## 2026-10-09 | Booking services edit and persistent inbox polish

- User-visible change and exact expectation: AkiBusiness Services now lets venue managers edit existing servicios after creation, including name, category, duration, capacity and active state. Booking search/status/sort applies without a full document reload while keeping URL persistence, and booking request cards use a responsive grid instead of wasting tablet/desktop horizontal space.
- Current code paths, routes, buttons/labels, EN/ES copy: `src/components/BookingManager.tsx` Services and Bookings tabs; `src/app/[locale]/business/venue/[id]/actions.ts`; venue workspace wiring in `page.tsx`; labels include Edit/Editar, Save offering/Guardar servicio, Active/Activo, Search/Buscar.
- Read/write data flow, DB tables/RPC, storage, external APIs, role/consent: updates write only `booking_offerings` through the signed-in Supabase client after `requireBookingManager`; existing `booking_offerings_manage` RLS remains authoritative. No storage, email, analytics, Google Ads, Stripe or migrations.
- Callers and downstream pages, other portals, Android, jobs, map/search/SEO/cache: affects AkiBusiness booking manager and public availability indirectly through offering active/capacity/type; no AkiPasa discovery, AkiDuermo, AkiHQ, worker cron or SEO changes.
- Source-of-truth conflicts / earlier incidents checked: previous live screenshot showed create-only services and column-style booking list after PR #80; this extends that release without changing the booking database model.
- Files changed and why: `BookingManager.tsx` for edit form, client-side filter routing and grid class; `actions.ts` for update action; `page.tsx` wiring; `globals.css` layout; `tests/booking-manager.test.tsx` regressions; master/changelog docs.
- Tests added/updated, exact commands and pass/fail/skip: `npx vitest run --environment node tests/booking-manager.test.tsx tests/venue-dashboard.test.tsx` PASS, 44 tests. Full `npm run check`, Cloudflare build, CI and live smoke pending at entry composition.
- Cross-role, cross-locale, theme, 360px/desktop coverage: component coverage includes EN behavior and existing dashboard tablet tests; ES copy is present but not yet browser-smoked. Physical tablet and authenticated production session remain pending until post-merge/live verification.
- Security/privacy, idempotency, migrations, rollback: no new secrets or personal-data exposure; RLS and venue membership checks protect updates; no migrations. Rollback is code-only and leaves offering rows intact.
- Production build/deployment ID, URL smoke, metrics/logs (or NOT DEPLOYED): NOT DEPLOYED at entry composition.
- Outstanding gaps and accountable follow-up: run full repository check/build, push PR, merge only after checks pass, then verify Cloudflare master deployment and tablet UI.

## 2026-10-09 | AkiBusiness unified properties and AkiDuermo-specific manager candidate

- Requested: after AkiBusiness login, show all managed AkiPasa venues and AkiDuermo properties; opening each exposes an appropriate dedicated tool suite, with a full future accommodation reservation service.
- Source: src/app/[locale]/business/page.tsx membership select extended with discovery_vertical, labels and management link copy; VenueDashboard.tsx tool filtering by product; business/venue/[id]/page.tsx passes accommodation type and routes Bookings to AccommodationBookingWorkspace, preserving existing regular venue BookingManager; tablet-responsive.css supports narrow split screens.
- Security: existing requireBusinessAccess, is_venue_member and platform_staff access guards stay in place. No changes to role/RLS or data migrations. Accommodation overnight reservation remains deliberately blocked.
- Cross-surface: AkiBusiness account list and property editor, AkiDuermo preview linking; regular AkiPasa venue-specific bookings remain unchanged. Full target design in docs/AKIDUERMO_BOOKING_DESIGN.md.
- Verification: GitHub connector writes only; npm check, Playwright, DB schema and Cloudflare build not available in current tool runtime. NOT DEPLOYED; NO HOTEL RESERVATION ENGINE YET. Must complete inventory, transaction safety, migrations, tests and authenticated browser QA before merge.

### 2026-10-09 | Follow-up: interactive AkiDuermo management tabs

- Changed AccommodationBookingWorkspace from four static placeholder tiles to selectable, accessible Reservations/Calendar/Rooms/Rates panels; none claim false inventory or enable booking.
- Added narrow split-screen responsive tab styling and tests/akiduermo-manager.test.tsx, included in package.json default npm test command.
- Checks **not run locally**: lint/typecheck/build, CI pending. No DB migration, real hotel inventory or production deployment. Await green checks and full feature implementation before live reservation claims.
