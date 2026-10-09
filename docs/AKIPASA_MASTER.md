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

### AkiHQ / management / operations

- AkiHQ Pro plan, POS/till/table service, staff devices/roles, order movement/splitting, inventory and printers are **planned/partially built** until code and live evidence prove otherwise. Never represent an untested action as live.
- Staff/admin: searchable catalogue and users, moderation, venue verification, CRM/support reports, business applications, abuse controls, audited role changes, privileged grants, Field Atlas pin research. Authorization lives server-side and in database policies, never only hidden navigation.
- Field Atlas pin creation (**INTENT**): tap empty map enters temporary center-marker placement, drag map beneath fixed marker, explicit confirm only; do not create pins accidentally. Retain CSV/Excel, saved pins and settings.

### AkiDuermo / accommodations

- `akiduermo.akipasa.com`: mobile-first accommodation discovery, listing filters, locale, map redirect and eventual booking pages. Approx. 21k accommodation records is a dated conversation estimate, not a verified current count. Review availability/booking claims against implemented backend.

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
