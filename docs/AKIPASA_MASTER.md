# AKIPASA MASTER SYSTEM CONTRACT

> Entry point for every human or AI modifying AkiPasa. Established 2026-10-09. **Living engineering contract, not a claim that every production behavior is verified.**
> Source priority: running code + database schema + production evidence > current tests > these docs > historical handoff notes > chat discussions. If they disagree, investigate; never silently choose the older description.

## Mandatory change protocol

1. Read `AGENTS.md`, **this entire document**, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/deployment-source.md`, and the relevant domain files. Also inspect current source, tests, migrations, deployment config, and the full import/call graph of touched code.
2. Record the requested behavior, current observed behavior, locale/portal/role/device matrix, exact source paths, data ownership, upstream/downstream consumers, failure/rollback modes, and potential regressions **before** editing.
3. Search for ALL instances of the affected function, copy, action, routes, translations, tables, permissions, caches, events, background jobs, telemetry, callbacks, mobile integrations, and tests. No isolated UI patch without tracing server and storage effects.
4. Implement the smallest coherent cross-layer change. Preserve all existing visible behaviors unless explicitly superseded. Avoid deleting code or features merely to satisfy compilation.
5. Add or update contract tests, UI interaction tests, and affected end-to-end tests. Verify BOTH /en and /es, desktop/mobile, light/dark, anonymous/authenticated, role gates, empty/error/loading/success, keyboard and accessibility.
6. Run `npm run check`, affected integration suites, and `npm run test:e2e` where usable. Where blocked, log exact failed/skipped commands and why. Green tests do **not** prove live traffic is healthy.
7. Update this file's inventory and dependency matrix, `docs/CHANGE_IMPACT_REGISTER.md`, affected architecture/decisions/runbook docs and changelog; include evidence and unresolved risks in the PR.
8. Before a production release: determine source branch, inspect branch diff, validate Cloudflare/worker build, required migrations/backward compatibility, permission/consent behavior, Google/Stripe/Supabase integrations, cache and SEO. Deploy only with approval. Confirm public and authenticated smoke checks, logs, 5xx/1102 rates and rollback path. Never claim production verification without production evidence.
9. Stop deployment if a critical acceptance case fails or coverage cannot be demonstrated for a changed sensitive workflow.

## Repository and topology (verified from repository files 2026-10-09)

- **Public deploy source: `master`.** `main` is a separate CRM source. See `docs/deployment-source.md`. Historic stale-branch deployment overwrote redesigned public UI.
- On the AkiDuermo host, localized auth and terms pages use an AkiDuermo header and controls without the AkiPasa consumer sidebar; shared Supabase identity and locale routes remain intact.
- AkiDuermo Explore, Saved, Map, property and member pages share the same five-link navigation order and fixed placement. Saved uses a compact local search instead of the Explore booking search; the map opens its search and type filters from one disclosure button.
- `src/app`: Next.js 15.5.21 App Router, locale routes, actions, endpoints. `src/components`: UI. `src/lib`: logic/adapters. React 19 / TypeScript / Tailwind.
- Public runtime: OpenNext + Cloudflare Workers, `wrangler.jsonc` entry `custom-worker.ts`; Cloudflare routes include `akipasa.com`, `www.akipasa.com`, `business.akipasa.com`, `akiduermo.akipasa.com`. **Verify host routing/redirects and whether all hosts use same worker on every release.**
- Public data: Supabase Auth, PostgreSQL/PostGIS with RLS, RPCs, Storage, Cron. Fixture/Hybrid repository modes are for deterministic testing and hybrid reads; do not leak fixtures into claims of validated public venues.
- Map: MapLibre, OpenFreeMap style, viewport/pagination/snapshot caching; Cloudflare Durable Object `MAP_SNAPSHOTS` appears in worker config.
- AkiHQ gateway: Cloudflare service binding `AKIHQ_GATEWAY` to `akihq-integration-gateway`. Business suite is separate from the general discovery user journey.
- `automation/`: independently deployed Hono Worker, D1/KV, voice and Telegram command routes, separately gated.
- `Android/`: native host with web-backed product, Google OAuth/billing handoffs, App Links, location and upload support. Capacitor/iOS direction discussed; do not assert iOS production availability without code/store evidence.
- Core commands `npm run check` = format, lint, typecheck, tests, DB safety, automation checks, production build; `npm run test:e2e` builds and runs browser acceptance; `npm run build:cloudflare` tests Cloudflare packaging. Read current `package.json` to confirm scripts before use.
- Schema: ordered `database/migrations/`; database safety tool refuses remote URLs. Run rollback-only `database/tests/acceptance.sql` on approved DB migrations.
- **Existing docs are not uniformly current.** `docs/AI_HANDOFF.md` dated July, `docs/ARCHITECTURE.md` July, `docs/PROJECT_STATUS.md` August, while repo changes and user requirements continue through October. Historic prices/version/status claims there are not current authority.

## Product surfaces and their cross-surface contracts

Each item must be validated against source route discovery before claiming exhaustive coverage. User-described behavior is tagged **INTENT**, existing architecture **CODE-DOC**, or observed production **LIVE**. These tags must not be conflated.

### Discovery and public site

- `/en` and `/es`: localized landing/discovery, venue and event discovery, searches by name/city/full address, category/time filters, pagination, map/list, saved/followed, suggestions, SEO titles/canonicals/sitemap/robots, privacy.
- Shared top-right search should avoid duplicated in-page search. Filter state should persist across Discover/Map/Saved. Explore/map lists should paginate without throwing SSR Worker errors.
- Venue/event detail: photos/gallery, descriptions, contact/navigation, event timing/recurrence, saved/going and privacy-respecting analytics. Do not expose the entire editable business gallery by default (**INTENT**).
- Map contract (**INTENT**, verify current code): sanitized venue rows only, accurate per-venue coordinates/directions, no stacked duplicates, cluster count consistent with visible hits, official events never disappear beneath nearby markers, legend opening does not recenter/zoom, list origin computed on open, viewport cache invalidated on data refresh. Quarantined count 7,782 was a dated discussion number, not a live query result.
- Locales: every label, error, button, URL and SEO attribute in EN/ES; translations never overwrite canonical business-entered text.

### Consumer identity and billing

- Signup via password and Google OAuth, login portal selection, callback/redirect paths, session cookies, role resolution and profile editing. Both auth paths must produce correct registration analytics ONLY after actual signup, deduped, and only with lawful consent.
- User Account Overview shows consumer plan Free/Premium only (**INTENT**); business/venue privileges belong to separate portals, not a consumer package badge.
- Premium/subscriptions: checkout/portal, webhook, account entitlements, cancellations/refunds, staff grants, audit and Stripe reconciliation. Success redirects MUST NOT grant entitlement or count a conversion; require signed, durable, deduped payment/webhook confirmation. Pricing in historic handoff may be outdated; read current Stripe config and approved price table.
- Consent: GDPR consent default, versioning, opt-outs, export/deletion, analytics and ad pixels. Verify no Google Ads or GA4 events fire without applicable consent; check revocation across sessions.

### Passport, achievements, AkiPals

- Passport immersive responsive page, dark/light themes, holographic card/tilt, motion permission and privacy, scroll handling, city cards, rank tiers and city-specific category stamps (**INTENT**). Keep desktop and mobile navigation parity.
- Check-ins/XP/stamps/rewards MUST be transactional, authorized, rate-limited, idempotent with audit; regrant/revoke other tiers atomically where applicable.
- AkiPals (**INTENT**): character families, layered wardrobe/inventory, rarity/ownership, item grants, shop, daily rewards, adventures, sponsored cosmetics and future monetization. Source foundations are exercised by `tests/pals*.test.ts`; do not assume planned features are released.

### AkiBusiness and event management

- `business.akipasa.com`: claim/find venue using search + real map pins, venue ownership verification, business applications, dashboard, profile editor, image uploads, menus/allergens, events, offers, team access, analytics and publishing.
- English UI edits should persist entered source and generate the opposite-language projection for consumer display; errors must not silently fall back to stale source text. Translation endpoint name present in `wrangler.jsonc`; verify API availability, backoff, failure/retry, provenance and missing translation state.
- Photo uploads: multi-select, safe extension/MIME/size checks, acceptable short filenames, compression/variants, selection UI 3×3 paginated picker, storage transactions, deletion and event/venue display permissions (**INTENT** based on latest bug report).
- Menu category accordions independently open/close, global expand/collapse, all allergen badges legible, layout intact at small widths (**INTENT**).
- Staff-created official town events hosted by an official AkiPasa venue, privileged creation and publishing, dedicated map marker, audit and visibility under density (**INTENT**). Never let an ordinary claimed business impersonate the official organizer.
- Claim, save, publish and event editing must preserve all fields and error recovery; full-screen compact editor must not crop header/details.

### Booking engine: resource-backed recurring availability (branch candidate, not deployed)

- Venues retain External / Via AkiPasa / Disabled modes. External remains
  a single URL, disabled hides public booking actions, and native booking
  requests use the existing capacity-locked `request_booking` function.
- Resource pools (`booking_resources`) have a venue owner, name, kind, seat
  capacity, active state, and owner/manager-only RLS. Assigning a resource
  to `venue_availability_slots.resource_id` is optional, preserving all
  historical unassigned slots and booking requests.
- Resource-backed slots cannot overlap in active time ranges for one resource.
  The database validates resource ownership, active state and per-slot
  capacity; cross-venue assignments must fail.
- The new `create_recurring_booking_slots` RPC expands weekday selections
  into bounded (maximum 90-day span) slots in Europe/Madrid civil time.
  It applies authorization, active native-mode checks, duplicate suppression,
  DST round-trip validation and an atomic SQL transaction.
- The AkiBusiness manager exposes resources, individual slots and recurring
  rules; seven presets remain suggested UI defaults, not complete specialist
  hotel/restaurant/ticketing engines.
- Regression surfaces: public venue and event booking availability, external
  redirects, existing request confirmation, Supabase RLS, EN/ES, small screens,
  venue membership permissions and future AkiDuermo integrations.
- **Not yet verified:** recurring SQL on an upgraded test database, live
  booking via a resource, browser acceptance, Cloudflare production status.
  Never merge/deploy before required validation and migrations.

### Multiple independent booking offerings (draft extension)

- `booking_offerings` models a venue-owned service or activity, with type, duration, capacity and active state, protected by RLS. The customer booking page shows the offering name for each assigned slot.
- `venue_availability_slots.offering_id` is optional and references an offering at the _same venue_; existing general booking slots remain valid and are not moved.
- Single and recurring slot creation can assign both an offering and a physical resource. Database triggers reject exceeding the offering or resource capacity. Historical request_booking capacity locking is retained.
- No payment entitlement, ticket fulfilment, automatic staff assignment or hotel room-night pricing is implied by this model.
- Acceptance required: additive migrations applied in order, disposable Postgres suite, EN/ES responsive UI, direct customer reservation, cross-tenant and duplicate-capacity checks. **Not deployed to production.**

### Consumer booking UX and confirmations (October 2026 release candidate)

- Customer venue booking uses `BookingWizard`: date/time buttons, remaining-capacity party controls, minimal contact details, retained error inputs, and a per-form idempotency key. `request_booking_v2` serializes capacity and validates published/native settings, active offerings/resources and submitted identities. The legacy event RPC delegates to the same engine.
- `booking_available_slots` returns aggregate remaining inventory only. Pending and confirmed reservations both consume capacity; zero remaining never becomes one place in the UI.
- Account `/[locale]/account/bookings` provides Upcoming/Active/Past, 20-row paging, totals, status badges, service/address details, and explicit future cancellation. `my_booking_history` enforces `auth.uid()` inside SQL and includes historical slot dates even where public slot policies hide past rows. Visible pages refresh every 30 seconds. Booking requests and customer confirmation snapshots are included in the account export; deletions cascade to queued mail.
- AkiBusiness has Bookings, Calendar, Services and Settings in a bounded workspace. Saves retain `section=bookings&bookingTab=...`; service selection belongs to each new offering. All booking mutations require actual venue owner/manager or inherited administrator access. Ordinary editors cannot approve. Direct customer field rewrites and self-approval are denied in PostgreSQL, not merely by hidden buttons.
- Approval is a one-way `requested` to `confirmed` transition. A trigger produces one durable row per customer/venue audience with an immutable localized content snapshot. Venue notification settings are in a separate private RLS table; fallback is an actual verified owner email, never a fabricated address. Missing recipients are shown as blocked. Cancellation suppresses unsent confirmations.
- Resend sends from `AkiPasa <contact@akipasa.com>` unless a runtime sender override is configured. HTML is escaped, audience content differs, and provider idempotency is stable. `sent` means accepted by Resend, not proven inbox delivery. Secrets missing means queued without consuming attempts.
- `custom-worker.ts` runs a five-minute scheduled outbox dispatcher with the existing Supabase service role and the new runtime `RESEND_API_KEY`. Lease claims prevent concurrent senders; stale leases recover; exponential retries are bounded. Ambiguous delivery older than 23 hours is held for review rather than resent beyond Resend's 24-hour idempotency window.
- Required new migrations: `20261009160000_booking_notification_email.sql`, then `20261009170000_booking_release_integrity.sql`. Existing advanced booking tables and all historical booking data remain intact. Do not apply the superseded draft notification schema from an earlier PR revision.
- Release runbook: `docs/BOOKING_RELEASE.md`. SQL acceptance uses real PostgreSQL roles/RLS and concurrent connections; browser acceptance exercises actual components in eight locale/theme/viewport combinations. The broad site browser suite also runs. Record actual CI and edge evidence in the PR; no statement here asserts unperformed production login or real email delivery.
- Scope: configurable service/resource slot reservations. Automatic table combinations, full hotel room-night pricing, ticket fulfilment and online deposits remain outside this release. An optional deposit is only a manual arrangement with the venue, not a charge.

### AkiHQ / management / operations

- AkiHQ Pro plan, POS/till/table service, staff devices/roles, order movement/splitting, inventory and printers are **planned/partially built** until code and live evidence prove otherwise. Never represent an untested action as live.
- Staff/admin: searchable catalogue and users, moderation, venue verification, CRM/support reports, business applications, abuse controls, audited role changes, privileged grants, Field Atlas pin research. Authorization lives server-side and in database policies, never only hidden navigation.
- Field Atlas pin creation (**INTENT**): tap empty map enters temporary center-marker placement, drag map beneath fixed marker, explicit confirm only; do not create pins accidentally. Retain CSV/Excel, saved pins and settings.

### AkiDuermo / accommodations

- `akiduermo.akipasa.com`: mobile-first accommodation discovery, listing filters, locale, map redirect and eventual booking pages. Approx. 21k accommodation records is a dated conversation estimate, not a verified current count. Review availability/booking claims against implemented backend.
- Candidate PR #82 adds explicit disabled/external/request settings, property-owned room/unit/rate/block inventory, aggregate public availability, authenticated expiring quotes, atomic idempotent room assignment, owner/customer status transitions, audit/outbox, account history/export and bilingual customer/manager UI. Migration `20261009220000_accommodation_inventory_foundation.sql` must run before application rollout. No online payment, OTA sync or automatic confirmation is implied.
- Release gate: run `scripts/test-accommodation-sql.mjs` on disposable PostgreSQL 16, the full repository and browser suites, Cloudflare packaging, then authenticated EN/ES owner/customer production smoke. A passing static SQL test or merged PR alone is not evidence of live booking.
- The AkiBusiness accommodation manager is a compact tabbed WebApp rather than a continuous settings document: a summary strip reports active types/units, occupied units, pending requests and booking mode; one bounded work panel is visible at a time; create/edit inventory controls are disclosure panels; and request mode is visually unavailable until an active type, physical unit and rate exist. Preserve every manager action and EN/ES keyboard access at mobile, tablet/split-screen and desktop widths.
- Consumer AkiDuermo has dedicated same-host `/map`, `/saved`, `/account`, `/bookings`, `/settings`, and `/stays/[slug]` routes. The `/[locale]/auth` and callback pages are permitted on the stay host; they use the **same Supabase user identity** but a host-scoped session. AkiDuermo sign-in returns only to an allowlisted local member or stay route, never an arbitrary external redirect. Session refresh must survive middleware rewrites, and POST access remains restricted to auth, terms acceptance, stay booking and member actions.
- Stay map uses the accommodation-only `ProductionMap` full-screen mode (`cooperativeGestures: false`), with dedicated viewport and overlay filters; route content, not an embedded box. Customer bookings read only their own reservation rows under RLS and cancellation rechecks ownership server-side before calling the status RPC. Saved stays remain device-local, not synchronized account data. Email/password, OAuth, magic-link and recovery redirects require exact AkiDuermo Auth URL allowlisting in the Supabase project and authenticated production smoke before release.

### Marketing, attribution and integrations

- Search Console, sitemap indexing, Google Analytics / GA4, BigQuery, Google Ads conversion tracking, paid campaign: **do not modify spending or campaign settings as a side effect of source changes**. Campaign 24330369989 was requested to remain €8/day with its existing end date.
- Google Ads tag ID `AW-18500420718` discussed; verify current code and account before assuming binding. Registration and subscription events are distinct, consent-controlled and deduped; server confirmation required for payments.
- Stripe webhook, Supabase login/storage/RPC, Google OAuth, Cloudflare Worker logging and release, translation backend, AkiHQ service binding, email provider, QR/NFC, Android link association: trace each upstream and downstream before edits.
- Customer-facing copy, translations, design/theme tokens, package descriptions, finance claims, SEO structure and legal/GDPR documents must stay consistent across all portals.

## Dependency impact matrix

| Change domain                | Review together                                                                                                                | Minimum regression checks                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| Venue schema/location/status | migrations/RLS/RPC, repository adapter, search/SEO, map, clusters, list, directions, claim, business editor, cache, admin, CSV | duplicate/quarantine filters, pagination, accurate lat/lng, EN/ES, mobile, map/list parity |
| Events/official events       | ownership, auth, event recurrence, editor, pin priority, schema, search, SEO, calendar and moderation                          | staff vs consumer auth, publish, localized detail, map priority                            |
| Auth/session/roles           | password+OAuth callbacks, cookies, portals, account/business/staff/admin, Android, CRM, metrics                                | login/logout and redirect each portal, privilege denial, consent                           |
| Billing/plans                | Stripe config, webhook and RLS, entitlement projection, pricing copy, account, business tools, premium XP                      | signed webhook, duplicate/stale/reordered events, cancel/refund, no redirect-only grants   |
| Media/upload                 | storage policies, filename parsing, sizes, transforms, multi-select, event+venue galleries, CDN/cache                          | 1-char name, large images, multi-images, upload/delete, published/private boundaries       |
| Translation/i18n             | writer UI locale, backend translation, storage fields, consumer read paths, legal/SEO                                          | source EN→ES and ES→EN, fallback/error/retry, preserve source                              |
| Search/discovery             | query parser, locality, pagination, DB indexes, time zone, map/list, SEO                                                       | full address, venue+city, nights across midnight, deep pages, no Worker 5xx                |
| Map/Field Atlas              | map styles, viewport/legend, clusters, coordinate integrity, quarantine, directions, research pins                             | no camera jump, stacked pin handling, accurate directions, no accidental writes            |
| Passport/rewards/Pals        | grants, ledgers, inventory, entitlements, client UI, admin tools, privacy                                                      | idempotent grant/revoke, localization, 360px, durable ownership                            |
| Ads/analytics                | consent, signup flows, payment verification, event idempotency, dashboards                                                     | opt-out=no event, OAuth+password once, payment once, no PII                                |
| Theme/responsive navigation  | design tokens, 3 portals, nested shell, dialogs, scroll, focus, dark/light                                                     | EN/ES 360px/desktop light/dark, back/escape/touch                                          |
| Deploy/config                | master HEAD, bindings, secrets names, Cloudflare builds, SEO, migrations, Android links                                        | build, smoke apex/www/hosts, rollback, logs, 5xx                                           |

## Minimum release smoke matrix

A passing build is only the start. Test routes on `/en` and `/es` for homepage, Explore, map, venue/event detail, login, membership, account and privacy. Check business claim, event edit/publish, official event map marker, translation, media picker, AkiDuermo accommodation, AkiHQ auth and protected access, Passport/Pals, staff/admin gating, Stripe signed test events and analytics consent. Use browser at 360 px and desktop with both themes. Check console/network and Cloudflare traces for 5xx/1102. Mark paths `pass`, `fail`, `not run`, `blocked`; never quietly omit.

## Coverage gaps, not achievements

**Not yet established by this master-document PR:** automated exhaustive enumeration of every current route/button/text/action; actual full current Supabase schema and RLS snapshot; live Cloudflare rollout/production diagnostics; completion status of newest user-requested fixes; current asset storage policy; exact Google Ads state. Future agents must inventory these from current source and live approved systems and replace each gap with file paths, tests and evidence. Historic chats capture requests, not proof of deployment.

## Automated inventory and pull-request gates (added 2026-10-09)

- Run `node scripts/generate-system-inventory.mjs > /tmp/akipasa-inventory.json` for a deterministic, reviewable inventory of source files, Next routes, route-handler HTTP exports, visible-control JSX tag sites, event-handler references, aria labels, migrations, tests and integration-keyword references. `--summary` produces a smaller routing summary. GitHub Actions uploads this summary as `akipasa-source-inventory` for every PR to `master`.
- The inventory is **static heuristic discovery**, not a verified button-by-button semantic map: dynamic component factories, runtime copy from dictionaries, imported callbacks, SQL permissions and browser behavior require separate analysis.
- `.github/workflows/master-system-contract.yml` invokes `scripts/check-change-contract.mjs`. For source, migrations, automation, Android, worker config, build configuration, package or CI workflow changes, the PR must also modify both `docs/AKIPASA_MASTER.md` and `docs/CHANGE_IMPACT_REGISTER.md`. Documentation-only changes do not trip this gate.
- This mechanism **cannot enforce agent reading** or verify that changes are correctly documented; require the check as a branch-protection rule and review the impact register. It does not replace `npm run check` or browser/production smoke tests.
- Workflow and scripts were committed through the GitHub connector; execution and PR CI results still need independent verification. No claim of passing CI is made.

## Documentation map

- `AGENTS.md`: mandatory start/stop instructions.
- `docs/CHANGE_IMPACT_REGISTER.md`: per-change before/after evidence ledger.
- `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`: deeper architecture/ADRs.
- `docs/deployment-source.md`, `docs/RUNBOOK.md`: source and release/rollback.
- `docs/AI_HANDOFF.md`, `docs/PROJECT_STATUS.md`, `docs/TODO.md`, `docs/ACCEPTANCE.md`, `docs/CHANGELOG.md`: check freshness and reconcile, never blindly trust.

### Event-first venue pages and linked event menus (2026-10-09, pending verification)

- Venue detail prioritizes upcoming (non-cancelled, unfinished) events above public catalogue, with responsive artwork/date cards; old event paragraph links removed.
- Business event editor optionally selects venue catalogue section IDs, submitted in `catalogueSectionIds`, validated against the venue's own catalogue and stored in `events.catalogue_section_ids` (migration `0102_event_catalogue_sections.sql`).
- Public event detail reads the current published venue catalogue and renders selected matching sections, never copied prices/allergens. No selection gives no menu. Menu deletion/unpublish removes it from event display.
- Cross-surface release prerequisites: migration before Workers deploy, full check/e2e, EN/ES mobile/desktop, role ownership, published/unpublished catalogue, bookings and media regression. Never claim deployed before verification.

### AkiDuermo accommodation claim discovery (2026-10-09)

- AkiBusiness claim picker now has Activities / Accommodation tabs, using validated `vertical` on `/api/business/claim-search` and `/api/business/claim-map`.
- Existing activity RPCs remain unchanged. Accommodation uses `search_claimable_accommodations` and `claimable_accommodation_cards_in_bounds`, restricting results to genuinely unclaimed, published, enabled, located, non-suspect accommodation.
- All claims still use the existing `venue_claims` and member grant process, with no automatic ownership on claim submission.
- `AkiDuermo HQ` demo property is a manually seeded, non-discoverable, non-bookable published accommodation with a verified owner association. Never use test listing to infer real inventory, prices, licensing or service availability.
- Room-night inventory, property amenities and hotel-specific booking/editor tools are future work, not completed by this change.

### Tablet, multi-window and PWA identity (2026-10-09 candidate)

- Each public hostname must expose its own manifest name, stable app ID, correct start URL and branded icon. AkiBusiness is **not** an AkiPasa installation, even though all three share the worker and original global metadata.
- Treat viewport width, not hardware type, as the layout signal: split-screen on a landscape tablet can be narrower than a phone landscape window. Test roughly 390, 600, 768, 820, 1024 and 1280 CSS pixels in both orientations and browser/PWA modes.
- AkiBusiness venue rows must keep name/role/status and both Manage/Delete actions available, wrapped without clipping, plus safe delete confirmation at narrow widths. Preserve the two-language account and business login flows.
- Files: src/app/manifest.ts, src/app/pwa-icon.svg/route.ts, src/lib/akiduermo-routing.ts, src/app/tablet-responsive.css, src/app/layout.tsx. This is a **candidate partial fix**, not certification that every AkiPasa, AkiBusiness, or AkiDuermo page has been visually audited.
- Still require chromium/Android installation checks (including SVG icon support and installed-name refresh), auth and workspace browser screenshots, scrolling/no-overflow matrix, light/dark EN/ES and Cloudflare build evidence. Not deployed.

### Tablet acceptance continuation (PR #79)

- Raster PWA icons in `public/pwa/` include independent orange/yellow/green identities at 192/512px plus maskable safe-area variants; regenerate with `node scripts/generate-pwa-icons.mjs`. Root metadata resolves hostname-specific application names and favicon/touch icons. Keep AkiPasa ID `/es`, matching its former implicit start-URL identity.
- The shared service worker registers separately on all three origins; allow its `/sw.js` and `/offline.html` routes on business/stay hosts. Never cache the manifest, authenticated responses or API data. Existing install labels may need Android Chrome refresh/reinstall after release.
- `scripts/test-tablet-browser.mjs` exercises real VenueDashboard, BookingManager and VenueDeleteControl with disposable actions across 28 EN/ES, light/dark, portrait/landscape/short split-screen combinations. It checks visible venue action bounds, all dashboard tabs and delete confirmation/cancel without deleting records. This is component acceptance, not production authenticated acceptance.
- `tests/e2e/tablet-suite.spec.ts` covers public route widths, business virtual-host auth modes and host-specific manifests. Physical Android WebAPK installation, rotation/keyboard behavior and authenticated full editor content require device/staging acceptance before production.
- Detailed candidate coverage and production hold: `docs/TABLET_ACCEPTANCE.md`. Browser route matrices use existing consent-version cookies with optional choices disabled, fixture discovery and no real auth mutations; backend availability and physical Android installation remain separate gates.

### Tablet booking inbox follow-up (2026-10-09)

- AkiBusiness bookings use `src/lib/business-booking-inbox.ts`: 20-row server paging, exact filtered count, guest name/email/phone or exact UUID reference search, status filter, deterministic received-date ordering. The request remains scoped to venue ID through the existing signed-in Supabase client/RLS; no service-role client or schema changes. Pending dashboard totals use a separate count rather than the current page.
- Search/filter/page state is URL-backed (`bookingSearch`, `bookingStatus`, `bookingSort`, `bookingPage`) with GET search, reset and accessible previous/next controls. Booking approval/cancel/retry redirects preserve Zod-validated filters; out-of-range pages clamp after mutations. Contact punctuation is preserved inside escaped PostgREST quoted values; SQL LIKE literal characters are escaped. Failed reads are not presented as an empty inbox.
- Only visible booking email statuses are fetched. Joined historical slot dates remain available independently of the Calendar array; compact status pills, expandable reference/contact/notes, and existing approval/cancellation/mail actions remain intact.
- Booking manager uses document scrolling rather than a capped nested scrolling box, preserving Services/Resources/Calendar/Settings form boundaries at short split-window heights. Test tablet portrait/landscape including 960×1536 and 1536×960, EN/ES and both themes. Component fixtures do not establish authenticated live acceptance.
- VenueDashboard observes the actual AkiBusiness header height and offsets its sticky horizontal/vertical venue navigation accordingly, including wrapped split-screen headers; observer/listener clean up on unmount. Without a business header, the normal standalone offsets remain. Booking search anchors account for that header height.

### Booking service editing and persistent inbox filters (2026-10-09)

- AkiBusiness Services must support editing existing `booking_offerings`, not only creating them. Managers can update name, type, duration, capacity and active state through the same booking manager, using owner/manager authorization and existing RLS; no schema migration is required.
- Booking inbox filters remain URL-backed for share/reload persistence, but the search form submits through the client router so applying search/status/sort does not trigger a full document reload. Booking action redirects still preserve validated filters.
- Booking request cards use a responsive grid on tablet/desktop to use horizontal space; narrow screens collapse to one card per row. Keep approval/decline/complete/cancel/retry controls visible inside each card.

### Business vs accommodation tool selection (2026-10-09, unverified candidate)

- AkiBusiness managed list now resolves `venues.discovery_vertical`: regular AkiPasa venues and AkiDuermo accommodations are visible within one authorized account, labelled separately, with their existing verified membership/role gates.
- VenueDashboard receives an explicit product type. Accommodation exposes Overview, Profile, Bookings, Team only; venue-specific events/catalogue/rewards/check-in remain available unchanged on regular venues. AkiDuermo booking area is separate from timed-slot BookingManager, and remains intentionally NON-BOOKABLE until room-night inventory and rates ship.
- See `docs/AKIDUERMO_BOOKING_DESIGN.md` for complete seven-template booking system, room-night transaction model, UI contract and rollout phases. This branch does not implement accommodation inventory, actual nightly-rate quotes or booking transactions; no deployment claims.
