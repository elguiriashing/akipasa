# Change Impact Register

## 2026-10-10 | Stop database application-conflict retry storm

- Evidence: 63,163 catalogue and 974 workspace revision errors in 15 minutes;
  production PostgREST 14.5; five functions explicitly raise 40001 for stale
  application revisions, matching Supabase's documented infinite retry bug.
- Change: additive migration replaces only those five functions' conflict
  codes with PT409, retaining authorization, grants, validation and row locks.
  Venue-review API accepts both codes during rollout. No locale or layout change.
- Dependencies: AkiBusiness catalogue save/unpublish, staff venue review, AkiHQ
  company and workspace saves, shared production PostgreSQL/PostgREST. Public
  booking, billing, storage, Google integrations and analytics stay unchanged.
- Verification: embedded PostgreSQL regression covers stale conflict, denied
  authorization, valid writes, preserved function attributes/grants, idempotent
  migration and optional absent CRM functions. Release check and live evidence
  must be recorded after execution; see database-conflict-incident.md.
- Recovery: inspect current authenticator backends; terminate only confirmed
  in-flight loops. Restoring 40001 before PostgREST 16 recreates the incident.
- Secondary repair: restore missing offers.audience and the original Premium
  visibility policy. Existing rows default to public; embedded PostgreSQL tests
  verify anonymous, ordinary authenticated and Premium visibility under RLS.

Every behavior-changing PR adds an entry before merge. No invented verification.

## 2026-10-10 | AkiDuermo auth shell follow-up

- Live finding: the new same-host sign-in form worked but inherited the AkiPasa consumer sidebar from the shared locale layout.
- Change: stay-host auth, recovery and terms acceptance render inside an AkiDuermo header with theme and language controls; sign-in gets a dedicated night-sky hero and rounded form panel. The shared Auth and Supabase actions remain unchanged. Main AkiPasa and AkiBusiness layout paths retain their existing shells.
- Cross-portal/security: middleware product header selects the shell; no new data, role, cookie, redirect, storage or payment behavior. Rollback is UI-only.
- Verification: TypeScript, lint and formatting passed locally. Browser regression now asserts the AkiDuermo brand and absence of AkiPasa primary navigation on the stay-host sign-in page. Full check, CI browser matrix and live smoke are required before this follow-up release.

## 2026-10-10 | AkiDuermo navigation, Saved and map controls

- Live/user finding: Saved inherited the Explore search bar's negative hero overlap without a hero, map filters were always expanded over the map, and bottom navigation changed style/order between routes.
- UI changes: a shared five-link `StayNavigation` renders in the same order and position on discovery, Saved, property, map and member pages. Saved has a compact local search, while Explore retains its trip search. Map search and type controls sit inside an accessible disclosure; property mobile booking action sits above the fixed nav.
- Data/security: same read-only accommodation listing and localStorage saved filters; no API, auth, RLS, inventory, payment or redirect changes. AkiPasa and AkiBusiness unaffected.
- Verification: focused Saved filtering test, TypeScript and lint pass; EN/ES, light/dark, 390/1280 browser assertions for search isolation, disclosure and nav order added. Full check, CI browser matrix and live smoke pending at entry composition.

## 2026-10-10 | AkiDuermo consumer suite candidate

- User-visible expectation: guest sign-in stays on AkiDuermo and returns to the selected property; separate Explore/Saved/Map/Bookings/Account/Settings routes; the map fills its dedicated viewport and uses one-finger gestures.
- Paths: stay virtual-host middleware and routing, shared `/[locale]/auth` and terms flows, `StayBookingPanel`, `AkiDuermo`, `StayProperty`, `StayAppShell`, `StayMapPage`, new `/akiduermo/{map,saved,account,bookings,settings}` pages, responsive styles and EN/ES labels.
- Data/permissions: same Supabase Auth identity with host-scoped SSR cookies; no new credential store or tables. Bookings query only `profile_id=auth.uid()` under existing reservation RLS; cancellation also selects ownership and uses `accommodation_change_status`. Settings email/password changes use existing Supabase Auth. Saved items remain localStorage-only.
- Related surfaces: AkiPasa auth/terms actions are shared and retain their main-host redirect policy. Stay host allows only its auth, consent, booking and member POSTs; unrelated business/admin APIs stay rejected. Map reuses accommodation-only tile data and marker navigation. No billing, ads, email outbox or inventory migration changed.
- Security and rollback: local-path destination allowlist and trusted origin validation; no cross-host cookie sharing or service-role key. Code-only rollback preserves customer reservations. Exact production Supabase Auth redirect URLs for both locales need verification before releasing Google/magic/confirmation/recovery flows.
- Verification: focused routing, auth and saved-route tests passed (23). Full check, browser matrix, Cloudflare build and authenticated owner/customer production smoke pending at entry composition. NOT DEPLOYED.

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

## 2026-10-09 | Accommodation room-night schema candidate on PR #82

- Implemented additive room type/unit, nightly rate, booking and maintenance block tables; exclusive check-out range semantics, overlap constraints and shared unit locking; authenticated owner/manager inventory RLS and no guest write grant.
- No live accommodation booking, no public customer price-quote API, no transaction RPC, no deployment.
- Added static SQL contract test to default test script, but no actual PostgreSQL acceptance run; must exercise migrations against a disposable seeded copy of the real base schema and confirm concurrent overlaps, blocks, RLS tenant isolation, rollback and historic schema compatibility.
- Security/deployment gate: hold merge and migration until automated checks and full booking product implementation are verified. This is a partial feature, not customer-ready.

## 2026-10-09 | PR #82 continuation | Owner-managed AkiDuermo inventory

- User-visible change and exact expectation: accommodation owners can now manage real room categories, physical units, nightly rates and maintenance blocks in the AkiDuermo-specific AkiBusiness workspace. Public overnight checkout remains disabled with explicit copy.
- Current code paths, routes, buttons/labels, EN/ES copy: `src/components/AccommodationBookingWorkspace.tsx`; `src/app/[locale]/business/venue/[id]/page.tsx`; actions in `src/app/[locale]/business/venue/[id]/actions.ts`; workspace tabs Reservations/Calendar/Rooms & units/Rates & rules.
- Read/write data flow, DB tables/RPC, storage, external APIs, role/consent: reads/writes `accommodation_room_types`, `accommodation_units`, `accommodation_nightly_rates`, `accommodation_unit_blocks` and reads `accommodation_reservations`; every write uses `requireBusinessAccess`, `is_venue_member(owner|manager)` and a `venues.discovery_vertical='accommodation'` check. No storage, email, payments, Google Ads, Stripe or customer writes.
- Callers and downstream pages, other portals, Android, jobs, map/search/SEO/cache: affects AkiBusiness accommodation management only; regular AkiPasa venue timed bookings keep `BookingManager`. Public AkiDuermo listing/booking UI still does not accept reservations.
- Source-of-truth conflicts / earlier incidents checked: branch was reconciled with current master including PR #81 service-edit, persistent filter and grid work. No newer booking/tablet fixes were reverted.
- Files changed and why: accommodation workbench for persisted management UI; business venue page for loading and action wiring; business venue actions for Zod-validated writes; VenueDashboard JSDOM-safe scroll guard and hook dependency; tests and handoff docs.
- Tests added/updated, exact commands and pass/fail/skip: PASS `npm run format:check`; PASS `npm run lint`; PASS `npm run typecheck`; PASS `npm test` (380 app + 5 subscription tests); PASS `npm run test:db-safety`; PASS `npm run automation:check` (41 automation tests + Wrangler dry-run); PASS `npm run build`; PASS `npm run build:cloudflare`.
- Cross-role, cross-locale, theme, 360px/desktop coverage: component tests cover EN/ES copy and accommodation-specific tool gating. Authenticated browser, tablet/physical-device, dark-mode and live role coverage remain pending.
- Security/privacy, idempotency, migrations, rollback: no public booking or guest write path enabled; SQL migration still requires real PostgreSQL RLS/concurrency validation before release. Rollback is code-only until migration is applied.
- Production build/deployment ID, URL smoke, metrics/logs (or NOT DEPLOYED): NOT DEPLOYED; not merged to master.
- Outstanding gaps and accountable follow-up: run the candidate migration in disposable PostgreSQL with concurrent connections and tenant fixtures; build secure availability/quote and atomic booking RPC; add customer booking UI and business guest operations; then run browser E2E and live smoke before merge/deploy.

## 2026-10-09 | PR #82 completion candidate | AkiDuermo room-night requests

- User-visible change: opted-in accommodations can publish real per-night availability, quote a complete stay, accept an authenticated request without double-booking, manage guest status in AkiBusiness, and expose the stay in the customer's My Bookings area. Disabled and external modes remain available and no online charge is taken.
- Paths/copy: public `StayProperty` and `StayBookingPanel`; `/api/stays/bookings`; AkiBusiness accommodation Reservations/Calendar/Rooms/Rates/Settings; Account Bookings; EN/ES confirmation email content.
- Data: additive accommodation settings, quotes, audit and confirmation outbox extend room types/units/rates/blocks/reservations. Server-side SECURITY DEFINER RPCs calculate/revalidate quotes, lock physical units, enforce idempotency and state transitions. Owner/manager and customer RLS remain distinct; anonymous users receive aggregate availability only.
- Dependencies: stay-host method routing, Supabase Auth/PostgreSQL/RLS, Worker five-minute Resend dispatch, GDPR export/deletion, account history, Cloudflare build. Stripe, Google Ads, venue timed bookings, AkiHQ and campaign budget are untouched.
- Security/privacy: strict same-origin POST, Zod request bounds, no client totals, no public guest details, quote expiry, cross-tenant checks, audit trail, leased/deduped mail and cancellation suppression. Rollback SQL removes only candidate accommodation objects; production data requires forward compensation/backup rather than destructive rollback.
- Verification so far: TypeScript PASS; lint PASS; DB-safety PASS; existing application suite PASS (380 tests before new accommodation assertions). Disposable PostgreSQL could not be launched under the current root-only managed runtime despite server binaries; the dedicated CI PostgreSQL workflow is the required execution record. Full check, browser E2E, Cloudflare package, CI and production smoke remain pending at this entry.
- Production: NOT DEPLOYED at entry composition. Do not enable AkiDuermo HQ or any imported stay until migration, CI, explicit property settings and post-release authenticated smoke pass.

## 2026-10-10 | AkiDuermo manager compact WebApp redesign

- Requested behavior: replace the accommodation manager's long stack of text and always-open forms with a comfortable one-screen WebApp while retaining every existing inventory, rate, block, settings and reservation action.
- Surface and data flow: `AccommodationBookingWorkspace.tsx` remains the UI boundary over the existing server actions and accommodation tables; no schema, RLS, API, email, payment or public booking behavior changes.
- UI changes: compact live summary metrics, horizontal tool navigation, one bounded scrollable work panel, responsive booking-mode cards, sticky save action, compact inventory grids, and collapsed create/edit disclosures. Setup messaging now distinguishes verified overlap protection from missing physical inventory.
- Responsive/accessibility: EN/ES copy remains present; native radio controls back the visual mode picker; disclosure controls remain keyboard-operable; desktop keeps a bounded work panel while phone layouts use document flow and horizontally scrollable tabs without page overflow.
- Verification at entry composition: focused TypeScript, lint and 16 accommodation/booking contract tests pass. Full repository check, Cloudflare package and multi-width browser evidence remain required before merge/deployment.
- Rollback: UI/CSS/test/docs-only revert; persisted room types, units, rates, blocks, settings and reservations remain untouched.

## 2026-10-10 | AkiDuermo map filter and Explore availability correction

- Requested behavior: filter the map without jumping back to its initial center, remove the stray box beneath the filter button, and have Explore date/guest searches find genuinely available rooms.
- Root cause: `ProductionMap` included stay filter values in its map-creation effect dependencies; the general map legend sat beneath the stay filter; Explore omitted dates/guests from `/api/stays` and only displayed a planning notice. Long search names expanded to many `ILIKE` clauses and the live `Fuengirola` and `AkiDuermo HQ` queries returned 503 while a short prefix succeeded.
- Changes: keep MapLibre alive and refresh markers inside the current bounds on filter changes, discarding stale responses; hide the redundant full-screen legend. Bound text search probes. `/api/stays` validates optional complete date/guest criteria and checks each candidate on the current 12-item page against `accommodation_available_rooms`, failing closed if availability fails. Explore labels page-scoped available results and retains the property-detail quote/revalidation flow. A signed-in owner/manager can see their own hidden stay as a labelled private preview when its name/address matches the search, including Fuengirola for AkiDuermo HQ.
- Data/permissions: anonymous aggregate RPC for availability; authenticated `venue_members` scoped by `auth.getUser()` and owner/manager role before exposing a hidden listing to that caller. Personalized responses are `private, no-store` and private previews cannot be saved to device favourites. No inventory mutation or private unit/guest disclosure. Candidate pagination count is still a listing count, not total available inventory. Existing discovery gating continues to exclude intentionally hidden properties from ordinary visitors and map results. No changes to AkiBusiness, email, payments, analytics, other maps or database schema.
- Verification: focused API/component tests, full `npm run check`, and `npm run build:cloudflare` passed locally. Live read-only reproduction showed `Fuengirola` and `AkiDuermo HQ` listing search returning 503, a short prefix returning rows, and HQ's room availability returning two room types for the selected four nights. EN/ES light/dark 390/1280 browser assertions were added, but local Playwright could not launch because Chrome is absent at `/opt/google/chrome/chrome`; CI browser evidence is required before merge. Existing production still has the defect until deployed.
- Rollback: revert UI/API/query changes; booking transaction and schema remain unchanged.

### Live follow-up: indexed Explore text query

- Post-merge live smoke confirmed the new availability response but `q=Fuengirola` still returned 503. Supabase PostgreSQL logs showed `canceling statement due to statement timeout`; `EXPLAIN ANALYZE` of the unindexed `name/address ILIKE` path took about 404 ms and scanned 21,001 accommodation rows. The existing indexed `venues.search_document` prefix query returned the same 30 discoverable matches in about 117 ms with a bitmap index scan. This is a read-only diagnostic, not evidence of live API success.
- Replace the listing text predicate with bounded, accent-normalized prefix terms against the existing GIN index through Supabase `textSearch`. Keep the owner-only preview and date/guest checks unchanged. No migration or production data change. Repeat CI and live search smoke before accepting this follow-up.

## 2026-10-10 | AkiBusiness accommodation media upload transport

- Observed: AkiDuermo property editor reports `Falló la subida ... Comprueba la conexión` for selected images. That copy is emitted only when the `uploadVenueImage` Server Action invocation rejects, before the UI receives its typed validation/storage/database result. The screenshot shows an accepted PNG in the media form and an empty management bin. An authenticated production reproduction and Worker trace were unavailable in this session.
- Change: use a dedicated same-origin multipart `/api/business/venue-media` POST for each file, bypassing the Server Action's 10 MB serialized body transport. The route checks exact origin and framing size, forces inline result handling, and calls the existing server-side upload action. The UI handles server rejection separately from network failure; existing Supabase ownership/RLS, MIME/10 MB file validation, translation, private media bin and placement semantics remain in the action.
- Affects: AkiBusiness media editor for ordinary venues and accommodation properties, both EN/ES, phone/tablet/desktop. No public AkiDuermo booking, consumer media visibility, schema, storage policy, auth session, analytics, email or payment change. Failure mode: an oversized or unsupported file is rejected; storage and database failures return explicit error. No migration; revert endpoint/UI call to roll back.
- Verification: route tests cover binary multipart forwarding, cross-origin denial and storage/invalid-body responses; component tests exercise the same-origin upload and preview in EN/ES. Local `npm run check` passed on the final tree and `npm run build:cloudflare` passed on the same production code before the component assertions were added. Authenticated live upload remains unverified without an owner session. No production image was uploaded by the agent.

## 2026-10-10 | Accommodation public header gallery and large-source compression

- Requested behavior: retain five listing media selections; expose a dedicated accommodation header upload/selection area; stop public stay pages from displaying one copy of each private bin item. Accept high-resolution source images and compress them before transport.
- Root cause: `loadStayDetail` selected the first five `venue_media` rows directly regardless of explicit placement. The media input rejected source files above 10 MB before compression.
- Paths: `src/lib/stay-detail.ts` now reads only ordered `venue_gallery/stay_header` placements (12 maximum) and signs owned media; `VenueMediaStudio` shows a separate gallery uploader and bin-to-header selection beside the existing five slots; placement server actions check accommodation identity and same-venue media, using existing RLS; `SafeMediaFileInput` compresses JPEG/PNG/WebP originals up to 50 MB to a bounded JPEG under 10 MB before existing same-origin multipart upload. Existing non-accommodation slot fallback and events remain unchanged.
- Security/data: no migration or new public access to the entire bin; public reads are confined to explicitly placed media. Authenticated mutations use the existing business access and `venue_media_placements` policies. No booking, payment, mail, analytics or consent change. Delete from the bin cascades placement; remove from header keeps the private file. Concurrency conflicts return an error instead of fabricating success.
- Verification: component regression test added for private bin-to-header assignment/removal. Full `npm run check`, browser tests and authenticated live upload are pending because this connector workspace has no repository checkout or installed dependencies. No migration or production deployment performed. Rollback: revert this UI/loader/actions change; existing placement rows can remain unused safely.

## 2026-10-10 | Business/Duermo portal home and branding unity

- Request: use unchanged AkiPasa as visual reference; overhaul AkiBusiness and AkiDuermo home/branding/navigation, using supplied yellow, green and purple AE marks. Screenshot showed generic A badges, inconsistent headers and oversized continuously stacked property rows.
- Matrix: EN/ES; anonymous stay discovery/auth, authenticated business home, owner/manager/editor + inherited staff editorial listing; light/dark; 360/390/512/600/820/960/1536 and short 640x400 split windows. Existing property-specific tools remain downstream of the same management links.
- Paths: `BusinessHome`, `BusinessHeader`, `PortalLogo`, `StayHeader`, Stay shell/property/Explore, localized/root layout, scoped portal stylesheet, uploaded brand masters and Business/Duermo PWA variants. Existing AkiPasa component source and raster icons remain unchanged. No AkiHQ repository changes.
- Ownership/dependencies: existing session-backed membership query/RLS supplies cards; filters/paging operate only on that authorized result. Management/deletion URLs/actions retain existing server checks. No auth, roles, booking transactions, email, DB, storage, consent, ads or paid campaign settings change. Analytics-view RPC reads are deferred off Home. Existing create/claim/event/reward/growth pages stay accessible. No migration.
- Failure/rollback: explicit membership-load failure; no fake property totals/activity. Native disclosure keeps dangerous delete out of primary action; existing reason/DELETE confirmation still applies. Revert UI/assets/CSS/conditional read changes to restore former behavior; no data rollback needed.
- Verification pending: focused interaction suite passed initially (7 cases). Local Chrome is absent and `npx playwright install chromium` returns truncated/invalid downloads, so real browser evidence must come from CI. A 64-combination real-component browser harness is added to tablet CI before build/routes; uploaded screenshots allow visual review. Full check and Cloudflare build are pending at entry composition. Not merged/deployed; authenticated production and physical PWA acceptance remain unperformed.

### Local verification update

- `npm run check` PASS: formatting, lint, TypeScript, 386 general + 5 subscription + 16 dedicated app tests, DB safety, 2 conflict tests, 41 automation tests/dry-run and Next production build. The final scoped language-visibility override is additionally checked in the subsequent Cloudflare build.
- The managed runtime has no Chrome executable; download failed with invalid ZIP contents, and the new browser harness bundles but fails at browser launch. Browser acceptance remains NOT RUN. Its CI step is prepared but the branch has not been pushed.
- Auto-review rejected GitHub push: authorization to publish the private changes to the remote feature branch was not verified. Local commit is complete; obtain user approval to push, then run CI and inspect its screenshots. No workaround publication or production deploy was attempted.
- Membership query now explicitly filters `profile_id` to the signed-in user, avoiding duplicate team rows/other members' role labels in the home catalogue; inherited editorial staff access remains explicit.

- Final `npm run build:cloudflare` PASS (Next production build and OpenNext Worker packaging). The first packaging attempt failed because shared dependencies resolved outside the isolated checkout; rerunning with checkout-local dependencies passed without any source/dependency changes. No Worker was uploaded.

- Route E2E runner (`node scripts/run-e2e.mjs` after the successful production build) could not pass local server readiness: `/en` reports missing Supabase environment variables in this checkout. Stopped the blocked runner; no route acceptance is claimed. The CI tablet job provides disposable test variables and installs Chrome before running the prepared browser checks.

- User approved remote publication; draft PR #92 is open. Booking browser CI and contract gate passed. The first tablet run installed Chrome, then the new standalone portal harness failed before rendering because imported configuration referenced browser `process.env`. Added disposable compile-time defaults and immediate page-error/failure screenshot diagnostics; no production configuration changed. Browser acceptance remains pending rerun.

- Corrected harness also waits for DOM before applying test theme; all 64 portal combinations PASS on `22be0bd`. Cleared the inherited 300px mobile hero minimum to honor the compact 190px design, and tightened first-screen search acceptance to require the CTA above fixed bottom navigation. Final rerun and screenshot review pending; no deployment.

- Final UI code `421a965`: local `npm run check` and Cloudflare packaging PASS; all 64 tightened portal cases PASS. Existing tablet route suite PASS. Guest-route suite failed solely on its old `/AkiDuermo\./` text locator after the shared header gained an explicit auth-brand link label; updated that acceptance locator. Separate Playwright output directories preserve portal/tablet screenshot evidence that the default root output cleanup discarded. CI rerun pending; no production deployment.

- All five workflows PASS on `b1a91ba`, including 6 tablet-route tests, 8 guest-route tests and 44 management-component combinations. Visual inspection of retained portal screenshots found default-sized Business shortcut SVGs expanding the quick-action cards. Scope of final polish: explicit icon dimensions only in `BusinessHome`; add a compact quick-action height browser guard and early portal artifact upload for prompt visual review. Shared AkiPasa icons/code and all management actions remain unchanged. Revert the size props to roll back; no data impact. Final browser rerun pending.

- Incorporated upstream master `59abeb9` (PR #91 accommodation media/gallery work) after it advanced during review. Kept both impact records and the automatically merged master contract; no application conflict or override. Combined-tree checks and final compact-icon browser evidence are pending.

## 2026-10-10 | Identical Business/Duermo header controls

- Observed/requested: Duermo used theme/language/settings while Business used language/theme/products; its AkiPasa link lacked the branded card. Both must use the same language/theme/Aki Apps controls and omit the current app. User authorized publication and live merge after testing.
- Traced paths: BusinessHeader via localized business layout; StayHeader via Explore/Saved, property and map/member shells; localized Duermo auth/terms header. Shared ThemeToggle preference/event remains intact; Business LanguageLink preserves pathname/query, Duermo callback preserves lang/cookie. PortalLogo gains only an AkiPasa menu variant using existing orange PWA artwork. Scoped CSS clears legacy header style differences.
- Matrix: EN/ES, light/dark, phone/tablet/split-screen/desktop, anonymous/authenticated Business logout, Duermo Settings, all three relative app links and current-app omission. Disclosure retains native keyboard operation plus Escape/focus return and outside-tap dismissal; short screens scroll the bounded menu.
- Data/upstream/downstream: existing app links and server logout retained; shared auth identity stays host-scoped. No DB/RLS/API, booking, media/storage, analytics, payments, consent, PWA assets or AkiPasa consumer component change. Revert shared header wiring/styles to roll back; no records change.
- Verification: focused suite passes 20 tests, including 10 portal home/header cases. Expanded real-component 64-case browser harness checks ordered controls, theme toggling, branded app links, current-app omission, menu bounds and keyboard/outside-tap dismissal. Full check, CI/browser and live results pending; no deployment yet.

## 2026-10-10 | Staff claim review details

- Request/observed: Claims showed only venue name and approve/reject; evidence and created_at were fetched but masked by the venue-name fallback, and claimant identity was not loaded.
- Matrix: EN/ES staff and administrator, regular and accommodation claims, light/dark, phone/tablet/desktop. Anonymous, consumer and business accounts must be denied at page and direct RPC boundaries.
- Paths/dependencies: StaffQueue, staff moderation page, moderation actions, scoped claim CSS; existing business `submitVenueClaim` -> venue_claims -> staff-only pending read -> unchanged audited moderate_item -> venue_members. Legacy moderation/admin navigation leads into the same staff workflow. SQL joins current profiles/Auth users and catalogue venues/cities; no contact snapshots or new submitted fields. No API handler, service credential, external message, storage, analytics, payment or consent change.
- Data/security: role-gated bounded SECURITY DEFINER read with empty search_path, qualified tables and explicit execution revocations. Pending claims only; deleted Auth email suppressed; no public profile email duplication. Full evidence is escaped text, HTTPS website links only. Current email and profile phone are separately labelled from venue contacts. Empty/error states remain distinct; pagination is stable; claim decisions preserve queue/page.
- Migration/release: new additive read function in both migration directories must precede app rollout. Revert app then DROP FUNCTION public.staff_pending_venue_claims(integer) for rollback; no claim or ownership data is removed. NOT DEPLOYED; no production migration applied.
- Verification so far: 4 bilingual/component cases and 3 executable PGlite SQL cases PASS, including direct anonymous/consumer/business denial, moderator/admin reads, 20+4 paging, invalid offsets and deleted Auth email. Full check, Cloudflare package and browser verification pending.

- Local validation update: `npm run check` PASS (format/lint/types, 389 general + 5 subscription + 24 dedicated cases, 2 conflict cases, 41 automation cases/dry-run, Next build); `npm run build:cloudflare` PASS. New browser harness lint PASS. Browser bundle compiles, but launch is blocked by absent Chrome and `npx playwright install chromium` fails with corrupted ZIP downloads. `node scripts/run-e2e.mjs` fails readiness because local Supabase variables are missing. PR #94 runs the 16 EN/ES, light/dark, 360/600/1536/short-window claim cases in CI with disposable form actions. Authenticated production acceptance remains unperformed; migration/deployment require approval.

## 2026-10-10 | Claim decision emails

- Request: send formatted welcome/approval or denial/resubmission emails from alex@akipasa.com after claim review. Before: audited decisions and ownership work, no claimant email. Existing business claims form accepts a new submission after rejection. Both venue and accommodation claims share this workflow.
- Trace/matrix: staff/admin -> moderateItem -> existing staff-gated moderate_item -> atomic pending transition/ownership/audit + new private trigger outbox -> immediate scoped service dispatch + five-minute Worker cron -> Resend. EN/ES claimant locale, approval/denial, missing name/contact, verified/missing/deleted/changed Auth email, anonymous/consumer/business denial, browser templates at 360/960px. Existing staff queue/mobile/light/dark and public/booking regression remain covered by CI.
- Source: claim-decision-email.ts, claim-mail-delivery.ts, moderation/actions.ts, custom-worker.ts, account-export.ts; mirrored migration 20261010114606_claim_decision_emails.sql. Provider/from is separate from existing booking mail. akipasa.com is verified in Resend with sending enabled and tracking disabled; runtime key capability is not established by domain status.
- Data/security: future decisions only, one immutable recipient/payload row per claim. Verified Auth recipient, escaped HTML and sanitized subjects, fixed HTTPS canonical links, no passwords/bank/identity-document requests. Claimant/staff read RLS, no client write access, service-only leases/ack, cascade privacy deletion/export. No changes to role/ownership/billing, signup mail, media, SEO, analytics, campaigns or consent.
- Reliability: stable claim provider idempotency key; same-transaction queue ensures failed review/audit leaves no email; immediate provider errors do not undo decisions; scheduled retry with locked eight-row batches, ten-minute stale-lease recovery, twelve attempts and exponential backoff. Persistent uncertain-delivery flag prevents later 429 responses clearing earlier uncertainty. After 23h uncertain delivery is held; permanent failures are blocked. Provider acceptance is not delivered/inbox proof.
- Rollback/release: apply additive migration before code, preserve old booking schema. Revert app and disable the new queue trigger to stop future notifications without deleting claim/member/audit history. Do not backfill or test-send real claimant emails. No migration applied or live deployment performed for this candidate.
- Verification: focused initial 24 tests PASS; expanded SQL reliability tests, full check, Cloudflare package and browser/CI evidence pending. Local email browser bundle compiles but cannot launch because Chrome is absent; CI installs browsers and retains eight template screenshots plus HTML. Authenticated live UI/email acceptance remains unperformed.

- Validation update on application tree e6dbc5f: local full check PASS (405 general, 5 subscription, 24 dedicated, 2 database-conflict, 41 automation tests and production build); Cloudflare packaging PASS. All 16 new SQL/renderer/delivery tests PASS. CI's eight email browser previews and 16 existing claim review cases PASS; mobile approval and desktop denial screenshots inspected. Booking browser, contract and format workflows PASS; wider tablet/public checks are still running. Local `npm run test:e2e` reached server readiness but failed because this checkout has no Supabase runtime variables; no local route acceptance is claimed.
- Production configuration investigation (read-only): the apex sending domain is verified, but four confirmed-booking messages have remained pending with zero attempts since October 9. No new AkiPasa application sending key appears in Resend key metadata; only the older Auth SMTP key is identifiable. This indicates a runtime-mail configuration gap, not proof of a particular missing secret. Wrangler reports unauthenticated and no Cloudflare connector is available. Verify/provision the Worker's runtime RESEND_API_KEY before accepting email activation; domain verification or a successful code build is insufficient. No real messages, database migration or deployment were performed for this investigation.

- Release verification follows the existing read-only `/api/bookings/release` endpoint: the booking marker remains unchanged, with a new claimNotifications release marker and configuration boolean. It exposes no credential or recipient data and allows direct post-deploy verification of runtime URL/service/Resend-key presence. This boolean is not proof of a valid sending key or inbox delivery. Application review and retry behavior are unchanged.

- An optional isolated `CLAIM_RESEND_API_KEY` takes precedence for claims, with the existing RESEND_API_KEY as fallback. Provisioning a claim-only key does not enable the older booking queues or change their senders. The release configuration check follows the same precedence. Added executable coverage of a claim-only key without a general booking key; no secrets are embedded in code or build variables.

## 2026-10-10 | Venue and accommodation team workspace access

- Request/observed: members added through Team are missing from their own management experience. Traced before implementation: `addTeamMember` -> owner-only `add_venue_member_by_email` -> `venue_members` -> membership/RLS -> AkiBusiness Home and venue workspace -> protected server actions. The basic entitlement guard rejects editors and members of unverified properties; Home separately rejects `consumer` platform roles even after entitlement access succeeds. Verified current database `is_venue_member` uses tenant membership without personal billing, and member read/venue read policies already allow the caller's assigned rows.
- Change: basic `requireBusinessAccess` checks the signed-in caller's editor/manager/owner membership before the existing billing fallback. Home relies on that guard rather than requiring a global organiser role. Existing team records now work without promotion or a separate personal subscription, including pending/unverified stays. No schema migration, entitlement/profile write, ownership transfer or production data repair.
- Matrix/dependencies: AkiBusiness EN/ES, venue and stay rows, regular consumer team members, owners, managers, editors, staff, subscribers, nonmembers, removed members and failed reads. User/terms guard remains first; caller-scoped membership read fails closed. RLS/RPC still restrict every operation/tenant; editor content access does not imply manager booking/inventory or owner team/deletion powers. Business Pro still independently requires its entitlement. AkiHQ billing, consumer plans, public discovery/media, email, cron, analytics/consent, SEO and Android identity are unchanged.
- Sources: `src/lib/entitlements.ts`, business Home loader; guard and real Home-loader regression suites wired into `npm test`. Existing booking/accommodation/portal suites exercise affected downstream surfaces. No visual/layout change; theme and device presentation remain existing components. Revert these two application changes for rollback without changing data.
- Session freshness: successful team additions invalidate both localized Home pages. `BusinessTeamRefresh` refreshes the managed list on window focus/visibility return and every 30 seconds while visible, preserving client filters and suspending hidden polling. Tests exercise timer/listener cleanup. The existing portal browser adapter is extended with a disposable router.
- Live read-only investigation: the screenshot assignments belong to the reported teammate account. That account is already an administrator; a read-only authenticated-role SQL transaction returns both rows and true workspace access. Therefore the ordinary-user guard defects alone do not explain his specific open-session symptom; list freshness is addressed, but his authenticated browser reproduction remains unverified. No real permissions or account data were changed.
- Validation: 8 admission tests, 4 real Home-loader EN/ES consumer/admin tests, refresh lifecycle and existing portal component tests PASS. Full `npm run check` PASS (414 general, 5 subscription, 27 dedicated, 2 conflict, 41 automation tests and production Next build; dedicated loader subsequently expanded from 2 to 4 passing cases). Cloudflare packaging pending. Local portal browser launch is blocked by absent Chromium; Playwright browser download failed. `npm run test:e2e` reached the server but its readiness route fails because Supabase runtime variables are absent; this is not authenticated acceptance. CI browser evidence and production verification remain pending. No release claimed.
- Final local validation: Cloudflare packaging PASS after replacing reused dependency symlinks with physical local dependencies (the symlink attempt failed native Sharp bundling). Final guard and Home/refresh/portal rerun PASS, 23 cases, including four consumer/admin locale loader cases; focused lint, typecheck, formatting and diff checks PASS. Automatic approval review rejected the GitHub push as unapproved external publication. The fix is committed locally; no PR, remote CI or production deployment has occurred. Publishing requires user approval, then CI browser and authenticated live verification remain necessary.
