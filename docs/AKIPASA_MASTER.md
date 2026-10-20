Warning: truncated output (original token count: 41514)
Total output lines: 1231

# AKIPASA MASTER SYSTEM CONTRACT

## 2026-10-20 | Historical-branch formatter compatibility

The pull-request formatter may check a branch created before newer contract and
membership files existed. Missing later paths are not formatting failures. The
workflow formats every listed path that exists and stages only tracked changes;
the merge-candidate contract, full checks and reviews remain mandatory. This
does not relax Prettier rules or create absent files on an old branch.

## 2026-10-20 | Manually gated production workflow

The `Deploy verified AkiPasa brand` workflow no longer runs on every push to
`master`. GitHub has no configured `CLOUDFLARE_API_TOKEN`, while the connected
Cloudflare release path already owns production publication; automatic runs
therefore completed the full test suite and then failed before packaging or
deployment. The workflow remains available as an explicit manual rollback-safe
release path and now requires the confirmation text `DEPLOY_AKIPASA`. It still
fails closed when the scoped Cloudflare credential is unavailable. Ordinary
push validation and the exact-source live smoke remain separate workflows.

This changes release orchestration only. It does not alter Worker code,
bindings, routes, secrets, Supabase, Stripe, or customer data.

## 2026-10-19 | SECURITY DEFINER least-privilege execution

Privileged functions in the exposed `public` schema must not rely on PostgreSQL's
default `PUBLIC` execution grant. Fifteen signed-in or staff RPCs explicitly deny
`PUBLIC` and `anon` while retaining `authenticated` and `service_role`; the launch
catalogue bootstrap is service-only; and eight trigger functions deny direct
browser-role execution. Their internal authorization checks remain mandatory.

Anonymous discovery, availability, public engagement, printer-token and RLS-helper
functions remain callable where the product or an anonymous policy requires them.
Do not blanket-revoke those endpoints. The production migration resolved all 24
target identities and the Supabase anonymous SECURITY DEFINER advisor count fell
from 44 to 20. Default privileges are unchanged because the database is shared
with independent products; future migrations must continue to declare grants.
No data, table policy, Stripe setting, subscription or entitlement changed.

## 2026-10-19 | Backlog security, export and Android release candidate

The AkiPasa-only recovery candidate preserves the five-repository product split.
It adds Android version code 2 for the existing `com.akipasa` identity and an
unsigned validation workflow; signing material remains outside GitHub and the
replacement upload key must not be used before 21 October 2026 at 17:05
Europe/Madrid. No Play submission or paid rollout is implied.

New migration work must declare table privileges and RLS explicitly. A changed-
migration audit runs in CI. The current audit found the rental review table was
missing an explicit authenticated `SELECT` grant despite an owner/staff policy;
the forward migration grants only `SELECT` and retains RLS. The Stripe webhook
lease RPC is explicitly executable only by `service_role`, with an empty search
path; signed HTTP verification still precedes creation of the service client.

Account exports page deterministically with exact counts, bounded requests and
no partial attachment on failure. Caller-owned Pals records are included, while
command/analytics and administrator AI tables remain excluded. Two private
email tables gain caller-only `SELECT` policies solely for data portability;
their delivery mutations remain service-only. The AkiHQ Pro subscription cannot
be replaced by its dependent add-on. Existing subscriptions, prices,
entitlements, tax settings and all personal-Premium launch flags are unchanged.

Apply only the additive migrations after hosted preflight. Do not replay email,
activate staged products, publish the legal draft or upload an unsigned bundle.

## 2026-10-18 | Membership rollout gate and scoped catalogue (candidate PR #201)

Personal AkiPasa Premium is absent from public/account offer grids until a
server-controlled adoption threshold is reached. The gate requires explicit
activation, finite earned-points input and a positive threshold; it defaults
closed and supports a force-off switch. The checkout server action also rejects
AkiPasa Premium purchases while closed. Current subscriptions/entitlements
remain untouched. The offer grid uses the origin app to hide irrelevant legacy
consumer products, while retaining Enterprise and business operations plans.
The old AkiHQ Stripe catalogue keys have **not** been rebranded or migrated.
AkiDuermo/AkiCoches business products, native pages and spreadsheet ingestion
remain out of scope for this first candidate. Never expose an unverified price.
Validate contract, format, tests and live checkout separation before merging.

## 2026-10-17 | October upstream dependency security patch

AkiPasa pins Next.js and eslint-config-next to 15.5.28 and React/React DOM
to 19.1.10. The npm lockfile must resolve these exact releases, including
the matching Next.js compiler packages. Keep the existing Sharp 0.35.5
override. This patch addresses the October 14 upstream Server Actions
denial-of-service and image-optimization advisories without changing
application routes, auth, ownership, payments, or database schemas.
Production deployment requires passing CI and exact-source Cloudflare
verification; dependency edits alone do not certify a live release.

## 2026-10-17 | AkiDuermo consumer account dashboard (isolated PR)

The account page now shows upcoming/current reservation counts, pending confirmation
counts and all-time booking count, alongside up to three upcoming/current stay cards.
All reads are performed with the signed-in user's normal Supabase session and are
explicitly constrained by accommodation_reservations.profile_id; existing RLS
continues to apply. Statuses remain request/confirmation based, with no new
payment or cancellation endpoints. The existing /bookings, /saved, /settings,
privacy and sign-out flows remain in place. Saved stays are device-local, so
the account page links to them but does not claim a server-side count.
Cross-domain profile links may require a separate host-scoped login.
Responsive EN/ES markup uses product-specific mint styling. No database, shared
auth, analytics, middleware, worker or production deployment change.
This is an unmerged candidate until checks, preview and authenticated acceptance.

## 2026-10-15 | Rental company cards in the legacy Business portal

The AkiPasa-hosted Business home lists rental companies submitted by the signed-in
operator beside their venues and stays. AkiCoches has its own car glyph and scarlet
accent, rental filter and fleet management action. A linked company opens its venue
fleet section; an existing unlinked company opens the mobility editor. The
AkiConduzco top-level tab is removed. The read is scoped by `submitted_by` and
does not attach an existing company to an unrelated venue. Venue ownership and
rental authorization remain enforced by their existing policies. The standalone
AkiBusiness portal mirrors this presentation.

## 2026-10-15 | AkiCoches venue data contract

AkiBusiness now owns venue-scoped rental management and AkiCoches remains the
public catalogue. The mirrored migration adds nullable company venue linkage,
vehicle cover selection, venue-team RLS and manager booking decisions. It keeps
legacy unlinked companies and requests, and allows a manager of multiple venues
to operate separate fleets. The cover trigger prevents cross-venue media links.
No booking/payment records are rewritten. Independent app releases and actual
owner/other-tenant acceptance are tracked in their repositories; this schema
change alone does not certify a production UI.

## 2026-10-14 | AkiConduzco mobility product (live release)

AkiConduzco is a car-rental discovery and booking-request product on
`akiconduzco.akipasa.com`, integrated with AkiPasa trip discovery and the
AkiBusiness operator portal. It is an independent rental vertical, not a new
`venues.discovery_vertical`: rental companies, individual vehicles, availability
and booking requests must not leak into ordinary venue/event or AkiDuermo
catalogues. Operators create their own rental company profile for review; do not
reuse venue claiming or grant access to a venue. Public rates and availability
must be explicit, time-bounded, and distinguish requests from confirmed rentals.
The first release is request-based and does not imply payment, instant booking,
or live OTA/partner inventory. Public location records must have a lawful,
traceable source; no open-data import is included until source coverage,
licence, attribution and update process are verified.

Cross-surface release checks: EN/ES discovery and map, host-scoped login and safe
return, renter account and own booking history, AkiBusiness operator setup and
fleet/rates/availability, pending vs published visibility, owner isolation/RLS,
date overlap behavior, empty/error states, mobile/tablet/desktop, per-host logo,
manifest, robots/canonical and sitemap behavior, Cloudflare hostname routing.
The public application and rental schema are live, and exact-source public-route
smoke passed. Authenticated login, fleet mutation and booking request acceptance
were not exercised in that anonymous smoke. See `docs/CHANGE_IMPACT_REGISTER.md`
for the release evidence and remaining acceptance scope.

## 2026-10-14 | Per-venue event browsing

The AkiBusiness individual venue Events workspace offers localized search by title/status, current/past/archived filter counts and nine-event pagination in responsive 3/2/1-column layouts. Existing event management, publication, media, occurrence and deletion forms remain available within expandable event details. Deep links from the main business event catalogue select the correct page and expand the requested event. No database, permission or event-action contract changes.

> Entry point for every human or AI modifying AkiPasa. Established 2026-10-09. **Living engineering contract, not a claim that every production behavior is verified.**
> Source priority: running code + database schema + production evidence > current tests > these docs > historical handoff notes > chat discussions. If they disagree, investigate; never silently choose the older description.

## 2026-10-14 | Mobile More dialog focus containment

Opening the public mobile More sheet moves focus to its close control, makes every
background shell sibling inert, locks document scrolling and contains forward and
reverse Tab navigation within the dialog. Escape, the close control, backdrop and
route-driven closure all run the same cleanup: previous inert/scroll state is
restored and focus returns to the specific More opener when it remains mounted.
Existing authorized workspace links, EN/ES labels, responsive geometry, theme and
navigation destinations remain unchanged.

## 2026-10-14 | Event occurrence continuity and honest actions

Discovery and Map event cards include the displayed occurrence ID in their detail
destination. Detail selects that exact event-owned occurrence, with a bounded safe
fallback to the next active occurrence for invalid input. The selected identity is
retained in authentication, saved/preference return paths, internal booking, booking
outcomes, premium calendar downloads, sharing through the current URL and stay
planning. Calendar files use the selected dates and custom event location when set.

Scheduled occurrences whose end time has passed are explicitly marked ended and no
longer expose booking, stay-planning or calendar actions. Cancelled, postponed and
sold-out states retain their explicit status; booking is offered only for a future
scheduled occurrence, while sold-out future events may retain stay planning for
people who already have access.

Stay planning uses custom event coordinates when present and falls back to the host
venue. Copy reflects the current request workflow: participating properties accept
requests, confirm them directly, and AkiDuermo provides neither automatic confirmation
nor online payment. Booking/RLS, availability slots, external providers, pricing and
stored engagement remain unchanged.

## 2026-10-14 | Discover and Map filter continuity

The primary desktop and mobile Discover/Map navigation preserves only the shared
discovery filter contract: selected locality/name/coordinates, radius, time,
category, price range, dates and accessibility. View-only list and pagination
parameters are cleared on a switch. Other product routes never inherit discovery
query state. The no-results Map handoff uses the same helper and contract.

Initial event pins on Map now come from the same personalized, location-bounded and
filtered recommendation result set as the Map list. Category, time, price, date and
accessibility selections therefore describe both pins and results. Existing map
viewport venue-tile loading, selected centre, official event metadata, clustering,
popup behavior and geolocation controls remain unchanged. No ranking, repository,
location permission or stored-data change is included.

## 2026-10-14 | Community contribution recovery and target search

Event suggestions and reports retain their current tab's text, selections and
validated CartoCiudad address coordinates before submission. A failed validation,
RPC or rate-limit return restores that draft; opening a clean form clears stale
draft data. Drafts remain browser-tab local and are never copied into URLs or a
shared server record.

Report target discovery is an explicit bounded event/venue search with escaped
PostgREST literals. A safe linked event or venue ID is loaded exactly even when it
falls outside the current 50-result search window. Authentication, retry and action
failure returns preserve the bounded search and validated selected target.

Feature availability, categories, report targets, suggestion history and report
history each expose localized unavailable states and suppress controls that depend
on unknown data. Successful empty results retain their normal empty states. Existing
authenticated RPCs, automatic moderation, RLS, validation and rate limits remain
authoritative; no schema, policy or submitted record changes.

## 2026-10-14 | Accommodation and Passport read recovery

The AkiDuermo property workspace treats settings, room types, units, rates,
blocks and reservations as separate read dependencies. A failed active-section
dependency produces a localized retry and withholds only that section's controls;
other tabs remain usable. Unknown inventory counts render as unknown, and a failed
settings read never appears as a confirmed paused booking mode. Existing tenant
authorization, actions, inventory validation and booking transitions are unchanged.

The member Passport separates public passport and stamp-card catalogue reads from
XP, stamp ledger, route progress, enrollment and reward-claim reads. Failed totals
render as unknown instead of zero. Dependent start/claim controls, route completion,
badges and claim codes remain hidden until their source read succeeds, while healthy
catalogues and sections remain available. Successful empty ledgers still render zero.
No reward math, enrollment action, RLS policy, schema or stored record changes.

## 2026-10-14 | Independent read recovery for operations

Admin user search clears prior results as soon as a new query begins, ignores
superseded responses even when a transport does not honor abort, and offers an
explicit retry after failure. Staff moderation treats a failed or missing mode
record as unknown, keeps the independently loaded queue visible, and withholds
the mode mutation until the current value is confirmed.

Personalisation renders confirmed zero metrics as zero, but a failed or malformed
aggregate response hides all metrics and removes the previous guessed migration
diagnosis. Missing active-ranking configuration is distinguished from malformed
ranking data. AkiBusiness handles each venue analytics RPC independently and
never presents a failed venue read as “no activity.” Admin Passport campaign and
published-venue reads are also independent: campaign history remains usable when
venues fail, while creation stays hidden until its required first-step venue list
is known.

Public creator directory/profile read failures are separate from successful empty
or missing results. Directory retry preserves bounded literal name/area/category
filters; a successful missing profile still returns not-found. Creator review
outcomes are visible on the profile and authenticated submission returns to that
profile. Failed review draft retention remains separately tracked and is not
claimed by this batch.

Saved, followed and recent Account collections refresh names and slugs from the
currently readable event/venue catalogue by UUID. Current localized titles and
routes replace stale stored display snapshots; inaccessible, deleted, legacy-key
or temporarily unavailable catalogue rows retain the member's stored label/link
fallback. The existing locale-safe link renderer still rewrites canonical fallback
routes. Collection storage, export, paging limits and engagement mutations are
unchanged.

Existing server authorization, tenant/RLS checks, moderation mutations, analytics
RPC ownership, reward creation action and stored records remain unchanged. No
schema, role, data, provider, billing or checkout change is included. Retry links
reload the same bounded view. Source revert is sufficient for rollback.

## 2026-10-14 | GUI workflow continuity, exact prices and unavailable reads

The user approved implementation and live merging of the complete GUI inventory.
This follow-up preserves exact event cents and hidden-price choices across cards,
map popups and details using one currency formatter. Saved/followed/recent links
rewrite only canonical local event/venue destinations to the current locale,
preserving query and fragment. Workspace accessible names match EN/ES. Staff uses one
page-specific heading with scoped safe padding, and accommodation reservation
cards have explicit responsive rows without altering inventory actions. Narrow
auth portal cards retain complete brand words and touch targets.

Support failures restore an editable question and require explicit retry, with
one transcript entry per successful submission and no automatic provider calls.
Replies follow the transcript only when already near its end; older reading
positions are retained with a localized jump control. Existing modal focus,
scroll, same-origin payload, provider authorization and email fallback remain.

Admin catalogue/configuration/privacy/audit/application read failures show a
localized Retry and suppress unknown-data editors or decisions; successful empty
reads retain their controls. Taxonomy/configuration saves display outcomes.
AI section failures remain visible independently of loaded agents, affected
lists and budget controls stay unavailable, and real zero budgets stay zero.
Counts and monthly costs disclose their loaded sample; server budget enforcement
is unchanged. Failed operator chat drafts remain editable. Existing conversation
audience and actor references are displayed without changing provider history
isolation or task/tool execution permissions.

Passport start acknowledgement refers to the enrolled route deadline rather
than inventing a 30-day window; returned expiry dates render in Europe/Madrid.

No schema, authorization, RLS, price amount, booking transition, reward, consent,
provider-send contract, checkout flag or production-data changes. Rollback is a
source revert. Regression and responsive/current-head release evidence belong in
the impact register; fixtures do not establish authenticated production behavior.

## 2026-10-14 | GUI and workflow upgrades (approved release candidate)

The user approved implementation, commits, merges and live release on 14 October.
This first release batch preserves the complete 147-item upgrade inventory;
remaining work is tracked separately and is not represented as shipped.
The audit covers public discovery/community, identity and support, Account and
rewards, AkiBusiness/AkiDuermo, Staff/Admin, the separate AkiHQ repository, the
historical CRM branch, Android and the independent automation dashboard.
Source findings, design proposals, existing PRs and unperformed acceptance are
separate categories in the review artifacts; planned upgrades are not shipped
capabilities. The public baseline is `8613edbd962a978dc3d85f9f7b9aafcc4da54a56`.

- Map date filters use the same Europe/Madrid civil-time validation as discovery;
  inclusive end dates remain inclusive. Homepage venue badges reflect the
  existing claim state without changing it.
- Contribution success/errors return to the matching history/form. Auth and
  Terms returns preserve a validated contribution view and event/venue target.
  Auth error/notices retain the existing safe destination and the relevant form
  mode. Full failed-form draft retention and post-reset task continuity remain
  separate planned upgrades.
- Support dialogs contain/restore keyboard focus, lock/restore document scroll,
  have unique labels and retain a reachable scrollable composer in short windows.
  Existing help payloads, transcript, anonymous email fallback and provider
  boundaries remain authoritative.
- AkiDuermo history uses actual `completed`/`declined` reservation states. Valid
  trip intent supplies editable initial dates/guests without requesting availability
  automatically; per-property/user edits are retained. Customer and manager status
  text is localized while raw action/status values remain unchanged. Filtered
  accommodation inboxes explain no matches.
- Staff queues distinguish read failure from true empty results; creator decision
  failures remain visible. Catalogue retries retain filters, event search covers
  both title languages using escaped PostgREST literals, and Manage event opens
  only the selected event already present in the authorized venue result.
- Admin overview never treats a failed required read as stable/zero activity and
  directs the priority action to a known pending or unavailable work area. City
  editing retains actual coordinates; `saveCity` requires explicit finite,
  Spain-bounded values rather than silently substituting Madrid. Center decoding
  must support the database geography representations as well as GeoJSON.

No schema migration, new permission, RLS/Storage rule, reward calculation,
booking transition, price, payment activation, consent or outbound-message
contract changes. Existing server-side role/tenant checks and audited mutations
remain in place. Verification and limitations are recorded in the impact register;
local component/browser fixtures do not establish production authentication,
database acceptance, provider delivery or physical-device behavior. Cloudflare's
clean-source packaging gate remains intact; packaging follows a clean source commit.
The batch is reconciled with master `6fb9fae27d56f44b62dcf79bf50f293e5454c1c3`,
including selected-media and hidden-catalogue-starter recoveries.

## 2026-10-13 | Responsive AkiSuite membership catalogue and AkiHQ sectors

The shared seven-plan membership catalogue keeps every plan visible regardless of payment activation. It uses the original AkiPasa, AkiBusiness, AkiDuermo and AkiHQ icons; Enterprise shows all four and the conditional AkiHQ Pro business add-on shows the paired business/HQ marks. The legacy business-sector taxonomy from `src/lib/business-packages.ts` powers an informational Standard/Pro tool comparison, not separate checkout packages or sector-specific entitlements. Plans remain VAT-inclusive and checkout remains gated.

Desktop cards use four columns, tablet two, and narrow mobile a single column with accessible, expandable benefit panels to reduce initial scrolling. The selector, recurring prices, plan inheritance, current-access indicators, server-side authorization and Stripe overlap guards must remain intact. EN/ES, light/dark, touch targets and responsive browser acceptance are release requirements. This change does not update billing, tax registration, database schema, grants or storage.

## Mandatory change protocol

Database application revision conflicts use SQLSTATE `PT409` (HTTP 409), never
`40001`: PostgREST 14 retries the latter indefinitely. See
`docs/database-conflict-incident.md` for the October 10 incident and recovery.

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
- Public runtime: OpenNext + Cloudflare Workers, `wrangler.jsonc` entry `custom-worker.ts`; Cloudflare routes include `akipasa.com`, `www.akipasa.com`, `business.akipasa.com`, `akiduermo.akipasa.com`, and AkiConduzco `akiconduzco.akipasa.com`. **Verify host routing/redirects and whether all hosts use same worker on every release.**
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
- October 12 AkiPals playground (**CODE-DOC**): `/pals` remains an English-language,
  account-authorized, noindex/private preview. A responsive dark/light hideout,
  distinct vector family expressions and ten curated outfit recipes retain all
  61 existing design IDs. Schema-1 saves gain optional journey progression:
  care actions, permanent XP-based bond ranks, real-activity daily goals and a
  three-distinct-story weekly goal. Completed bonuses bank without expiring.
  Interactive arcade challenges join the same server-validated action and
  atomic command ledger; browser scores/balances are never authoritative.
  No migration, real-money commerce, public navigation or new map/location
  integration is added. Current source/dependency and release evidence lives
  in `docs/AKIPALS_RELEASE_20261012.md`; local fixtures are not live login proof.

### AkiBusiness and event management

- `business.akipasa.com`: claim/find venue using search + real map pins, venue ownership verification, business applications, dashboard, profile editor, image uploads, menus/allergens, events, offers, team access, analytics and publishing.
- English UI edits should persist entered source and generate the opposite-language projection for consumer display; errors must not silently fall back to stale source text. Translation endpoint name present in `wrangler.jsonc`; verify API availability, backoff, failure/retry, provenance and missing translation state.
- Photo uploads: multi-select, safe extension/MIME/size checks, acceptable short filenames, compression/variants, selection UI 3×3 paginated picker, storage transactions, deletion and event/venue display permissions (**INTENT** based on latest bug report).
- Venue media studio sends each selected image/PDF-converted JPEG as same-origin multipart POST to `/api/business/venue-media`, outside the Next Server Action body transport. The endpoint requires exact origin, bounded multipart size and reuses the authenticated `uploadVenueImage` validation, Business entitlement, Supabase Storage and `venue_media` RLS path. Responses are private/no-store and distinguish invalid file, translation, storage, database and unavailable server errors. This applies to both ordinary venues and accommodation properties; images stay in the private management bin until placed.
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
- Staff/admin: searchable catalogue and users, moderation, venue verification, CRM/support reports, business applications, abuse controls, audited role changes, privileged grants, Field Atlas pin research.
- **Staff operations count contract (Oct 10):** /es/staff and /en/staff summarize pending venues, events, offers, community submissions, and venue ownership claims. Claim counts come from the staff-authorized `staff_pending_venue_claim_count()` RPC, which mirrors the joins and pending-status predicate in the paginated `staff_pending_venue_claims()` queue; it does not expose claimant contact details. The overview has a direct ownership-claims shortcut. Failure to load a count must not be represented as zero or “all caught up”. The four metrics keep venue-publication count distinct from the ownership-claim count. Affected: `src/app/[locale]/staff/page.tsx`, `src/lib/staff-moderation-summary.ts`, `src/app/[locale]/staff/staff-overview.css`, `database/migrations/20261010231800_staff_pending_claim_count.sql`, PGlite and moderation tests. No claim status transitions, business membership, emails or customer-facing map/search have changed. Authorization lives server-side and in database policies, never only hidden navigation.
- Field Atlas pin creation (**INTENT**): tap empty map enters temporary center-marker placement, drag map beneath fixed marker, explicit confirm only; do not create pins accidentally. Retain CSV/Excel, saved pins and settings.

### AkiDuermo / accommodations

- Accommodation media contract (October 10 candidate): the AkiBusiness media studio keeps five explicit listing selections and a separate ordered public header gallery. Header membership uses existing `venue_media_placements` rows with `placement='venue_gallery'` and `target_key='stay_header'`, capped at 12. The AkiDuermo detail loader must never read the first images from `venue_media` directly: the bin is private until placement. An empty gallery renders the existing placeholder.
- JPEG/PNG/WebP originals up to 50 MB are decoded and downscaled to at most 2560 pixels per side, exported as JPEG below the existing 10 MB server and 11 MB multipart limits, then uploaded one by one. PDFs retain the sanitized JPEG conversion. The server still validates MIME, bounds, auth and RLS; client compression is convenience, not authorization.

- `akiduermo.akipasa.com`: mobile-first accommodation discovery, listing filters, locale, map redirect and eventual booking pages. Approx. 21k accommodation records is a dated conversation estimate, not a verified current count. Review availability/booking claims against implemented backend.
- `akiconduzco.akipasa.com`: standalone rental car search, map, operator listings and request-only bookings; fleet tools live in AkiBusiness `/[locale]/business/mobility`. Rental companies are independent records with staff review and owner RLS, never claimed venues. No payments or instant confirmations; validate against current migration and release evidence.
- Candidate PR #82 adds explicit disabled/external/request settings, property-owned room/unit/rate/block inventory, aggregate public availability, authenticated expiring quotes, atomic idempotent room assignment, owner/customer status transitions, audit/outbox, account history/export and bilingual customer/manager UI. Migration `20261009220000_accommodation_inventory_foundation.sql` must run before application rollout. No online payment, OTA sync or automatic confirmation is implied.
- Release gate: run `scripts/test-accommodation-sql.mjs` on disposable PostgreSQL 16, the full repository and browser suites, Cloudflare packaging, then authenticated EN/ES owner/customer production smoke. A passing static SQL test or merged PR alone is not evidence of live booking.
- The AkiBusiness accommodation manager is a compact tabbed WebApp rather than a continuous settings document: a summary strip reports active types/units, occupied units, pending requests and booking mode; one bounded work panel is visible at a time; create/edit inventory controls are disclosure panels; and request mode is visually unavailable until an active type, physical unit and rate exist. Preserve every manager action and EN/ES keyboard access at mobile, tablet/split-screen and desktop widths.
- Consumer AkiDuermo has dedicated same-host `/map`, `/saved`, `/account`, `/bookings`, `/settings`, and `/stays/[slug]` routes. The `/[locale]/auth` and callback pages are permitted on the stay host; they use the **same Supabase user identity** but a host-scoped session. AkiDuermo sign-in returns only to an allowlisted local member or stay route, never an arbitrary external redirect. Session refresh must survive middleware rewrites, and POST access remains restricted to auth, terms acceptance, stay booking and member actions.
- Stay map uses the accommodation-only `ProductionMap` full-screen mode (`cooperativeGestures: false`), with dedicated viewport and overlay filters; route content, not an embedded box. Customer bookings read only their own reservation rows under RLS and cancellation rechecks ownership server-side before calling the status RPC. Saved stays remain device-local, not synchronized account data. Email/password, OAuth, magic-link and recovery redirects require exact AkiDuermo Auth URL allowlisting in the Supabase project and authenticated production smoke before release.
- Map filter changes must refresh accommodation markers in the current bounds without recreating MapLibre or resetting camera/zoom. Its full-screen layout hides the general-purpose map legend beneath the filter control. Explore listing searches use the indexed, unaccented `venues.search_document` prefix search rather than an unindexed `ILIKE` count scan; when dates and guest count are supplied, each candidate page is checked against the public aggregate room availability RPC and only available stays on that page are shown. The candidate pagination total is not a nationwide availability count. Property detail still rechecks availability and quotes before booking. A signed-in owner/manager may see their hidden accommodation as a marked private search preview on the first page; it must not be included in anonymous discovery, public caching or device saved stays. AkiDuermo HQ remains intentionally non-discoverable to ordinary visitors unless its owner explicitly enables discovery.

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

- AkiBusiness bookings use `src/lib/business-booking-inbox.ts`: 20-row server paging, exact filtered count, guest name/email/phone or exact UUID reference search, status f…11514 tokens truncated…k to the visible/accessibility tree and raises phone controls, the map legend summary and compact attribution toggle to 44px. Attribution and its expanded text have reserved space beside Privacy, Support and the short-window map controls; the status caption wraps within its own available width. Native attribution and privacy interactions are checked in both languages across phone, tablet, desktop and short windows. CSS-only changes preserve motion permission, reduced-motion handling, consent, map and reward behavior; browser tests open the current mobile drawers before exercising their controls.

### Aki Spotlight public venue and event layouts (2026-10-12)

- Alex selected **01 / Aki Spotlight** and explicitly authorized implementation and a live merge. Public routes remain `/[locale]/venues/[slug]` and `/[locale]/events/[slug]`, from public `master`; this is a presentation change with distinct venue/event hierarchy and responsive desktop, landscape tablet, portrait tablet, phone and short split-screen arrangements in EN/ES and light/dark.
- Venue source pairs its selected public image with identity/location and directions/booking/follow/share, then uses `VenueSpotlightSections` for actual published menu section previews, upcoming events, information and conditional perks. Preserve the full published catalogue/allergens, contact/claim/report, loyalty/progress and RLS-controlled premium offers. Categories derive from available catalogue sections; no mock opening-hours/status or concept imagery is inserted into production. Logo-only artwork is contained on a matte surface.
- Event source pairs intact artwork and a date ribbon with the existing selected occurrence, full Europe/Madrid start/end dates, price/accessibility, booking/social actions and linked host. Preserve official custom locations, occurrence booking URL precedence, request mode, cancelled/sold-out restrictions, authenticated saved/going/not-interested forms, premium calendar export, event-linked catalogue and stay handoff. Metadata, canonical/hreflang, JSON-LD and consent-controlled analytics remain connected to the same records.
- Shared `spotlight-detail.css` and route-specific CSS are scoped to public detail variants. `ShareButton` gains an optional accessible icon presentation and handles native-share cancellation/clipboard errors without changing existing text callers. No schema/RLS migration, production data mutation, storage upload, role/payment/email boundary or other AkiSuite portal layout change. Rollback is a source revert.
- Focused route/component/sharing coverage lives in `vitest.spotlight.config.ts` and `npm test`. Mandatory `npm run test:spotlight:browser` uses disposable read-only Supabase-shaped records with the real Next routes and CSP for EN/ES/light/dark responsive acceptance; default fixtures contain no venues/events and cannot establish detail-route acceptance. Full `npm run check`, Cloudflare package, CI and live CityDiscovery/venue/event smoke must be recorded before declaring release complete. See `docs/SPOTLIGHT_DETAIL_REDESIGN.md` and `docs/CHANGE_IMPACT_REGISTER.md` for dependency and acceptance evidence.

### AkiBusiness shared venue media (2026-10-12)

The canonical media asset store is `venue_media`, scoped by `venue_id`, with public surface selection in `venue_media_placements`. Venue Profile and all event editors should receive the same signed venue-scoped inventory, regardless of its original upload path. Event-specific associations (`event_bin`) are independent of owning or viewing the asset. Virtual folders are presentation filters; no files are copied or migrated to organise them. Uploading media alone must not publish it. Validate permissions on the server for every mutation.

### 2026-10-13 | Recovered shared-media public placement resolution

Public venue detail and event host lookup resolve explicit venue placements independently of the legacy first-60 ordinary-image gallery. A selected asset can originate from an event upload, lie beyond that gallery window or be legitimately shared from another venue. Only missing IDs from the target venue's explicit public placements are fetched under the existing public-client RLS and signed; unplaced event-bin files remain excluded. Discovery's existing placement resolution and ordinary fallback order remain unchanged. No storage policy, migration, billing flag or customer records change. Regression coverage exercises both slug and ID loaders, no ordinary media, cross-venue exclusion, missing signing and no unnecessary selected reads. Production acceptance remains separate from local validation.

Integration with the merged Health #150 source resolves the selected/fallback union before its existing one-batch signer. Path deduplication, 3600-second expiry, response-path validation, per-row signing denials and no retry fan-out remain intact. Installed-SDK HTTP regressions retain the Health batching suite and exercise selected event/shared assets, the gallery boundary, empty ordinary media, denied reads/signatures and avoiding redundant reads. Fresh combined CI/Cloudflare and authenticated live acceptance remain release gates.

### 2026-10-12 AkiBusiness catalogue save regression (candidate)

- New catalogue items must have non-empty localized names immediately, because `save_venue_catalogue` validates the entire JSON document on both draft and publish. Empty names used to make all subsequent edits to that document fail with PostgreSQL `Invalid item`, misleadingly shown as a permission error.
- `blankCatalogueItem` supplies safe bilingual starter labels; editors can replace either label. New item tests cover non-empty names and valid starter price/variants. No database schema, RLS, memberships, public catalogue rendering or existing records are changed.
- Business save errors now separate invalid items/sections/prices, stale revisions (`PT409`) and lack of access (`42501`) in EN/ES. Allergen publishing checks remain strict.
- Production read-only evidence: on October 12 multiple `save_venue_catalogue` calls returned HTTP 400; Postgres logs included `Invalid item`; live RPCs existed and revision-conflict SQL used `PT409`. This does not prove every unsuccessful save had the same root cause.
- Verification pending: full `npm run check`, authenticated end-to-end edit flows and deployment smoke. Not live until confirmed CI and merge.

### Catalogue starter publication recovery (2026-10-13)

New catalogue items retain nonempty bilingual starter names for immediate draft saves but default to hidden. Editors use the existing Visible publicly / Visible al público toggle after preparing the item; editing a name alone does not silently opt into publication. Existing documents, visibility choices, prices including legitimate zero-price items, translations and allergen publishing checks remain unchanged. Public venue and event catalogue consumers already omit hidden items. No database migration or existing-item rewrite is required.

### Venue profile media selector (2026-10-12)

The five venue surface cards use the same full-size event gallery picker styling and pagination rather than inline thumbnail strips. Selection persists via the existing `setVenueMediaPlacement` action; Auto clears the explicit placement via `clearVenueMediaPlacement`. The venue-wide library remains the sole media inventory.

## 2026-10-12 AkiSuite membership and Premium rollout

`docs/AKISUITE_PRICING_ROLLOUT.md` is the current commercial, workspace, retention, deployment and validation contract. Seven plans are always visible through the shared EN/ES public/account catalogue, independent of payment activation. Enterprise is featured first. Cross-host aliases preserve locale and originating app; AkiHQ points to the same account hub.

The approved Stripe account and fourteen existing live price IDs are verified and recorded; no duplicate products were created. New payments require all five readiness flags, actual tax/product validation, workspace ownership, durable reservation and ledger/Stripe overlap checks. Existing legacy prices, subscriptions, free venue access and staff grants remain valid; superseded new-checkout forms redirect to the catalogue. Do not enable payment until legal invoicing/tax details and isolated checkout/lifecycle tests are complete.

New migrations are pending, mirrored in both migration locations and exercised through disposable PGlite SQL/RLS tests. Business/Duermo/HQ paid access belongs to an authorised workspace, preserving active employee membership and role templates. Personal Enterprise Premium belongs only to the payer. Workspace-scoped recurrence, templates, scheduled approved publication, media quotas/folders/sharing, historical growth and accommodation reports are gated. Published content and media are retained after downgrade; future automation/uploads are restricted. Service cron is bounded and respects approval fingerprints and conditional add-on renewal. Full-schema compatibility, live advisors, sandbox tests and authenticated production acceptance remain separate release requirements.

Release marker `membershipCatalogue: 2026-10-12-akisuite-catalogue-v2` is added to the existing read-only release endpoint. Record merge/deployment/live smoke evidence before declaring success. A release with checkout disabled is independently permissible only after its relevant checks pass; it does not complete paid rollout.

Membership browser acceptance uses seven catalogue cards and the global annual toggle, preserving card visibility during partial billing failure. Shared-media mutation permissions are independent of read retention: downgrade preserves media/placements while restricting new reuse, and owner deletion checks cross-venue references. Legacy scheduled publication preserves both Business tiers and staff grants.

The authenticated account export includes the new payer ledger only once the schema-ready flag is enabled; existing exports remain available before migration. SQL acceptance separately verifies AkiDuermo comparisons, media retention/reference protection, conditional add-on renewal and employee role templates.

Premium media enforcement includes restrictive Storage policies for direct API writes and referenced-file deletion, plus gated private-bin reads that preserve selected/fallback public artwork. Discount eligibility requires a paid, active, non-ending Pro subscription; staff grants and trials continue to grant their authorised tools without qualifying for that purchase.

Shared media/template reuse additionally requires active workspace membership; venue-only editors retain their venue and assigned-content rights. Verified-venue drafts can be scheduled directly with SHA-256 approval fingerprints. After any new paid subscription exists, billing adapters/reconciliation must survive presentation rollback. HQ's companion merge `21843db608932eea46d1e83d82b8481ee19b5767` serves the refreshed membership navigation in production; authenticated acceptance remains separate.

Live migration preflight must include managed Storage ownership/DDL permissions: current migration role is non-superuser `postgres` and is not a member of `supabase_storage_admin`. Do not infer hosted policy-management permission from disposable PGlite ownership.

HQ setup can create a named self-owned workspace before venue ownership, preserving separate venue authorisation. Auth redirects from membership retain the originating app. New-plan webhook customer mapping cannot overwrite a profile's existing Stripe customer.

Responsive catalogue screenshot review also corrected Spanish add-on wording and preserved whole words in compact disabled purchase buttons.

Live membership smoke verification found that the parent account layout replaced the subscription destination with the account root before page authentication. A server-derived, same-locale membership return header now preserves subscription/from through sign-in and terms acceptance; middleware removes caller-supplied headers, and unrelated account routes keep their previous return behavior. Regression coverage includes the actual layout guard, spoofed headers, and signed-out EN/ES browser aliases.

2026-10-13 membership presentation refinement (PR #129): Public AkiSuite pricing retains all seven plans and the existing checkout eligibility, amounts, intervals and entitlements. Compact two-column mobile cards and wider responsive desktop comparison reduce vertical card height; the billing-period switch and sector-specific AkiHQ tool exploration now follow the plan catalogue. Business categories only change displayed tools, never granted access. Billing/migration readiness flags remain unchanged. Validate responsive overflow, screen-reader disclosure state and locale-aware prices before production promotion.

2026-10-13 AkiSuite membership width/overlap follow-up: The membership-only shell now uses available desktop/tablet viewport width up to a 1720px bound while keeping responsive gutters. Catalogue cards reflow across wider screens, and the Enterprise card brand/header badge can wrap without label collision. No subscription billing, entitlement, feature flag, migration or checkout change. Validate EN/ES membership layouts on mobile, tablet and desktop.

## 2026-10-13 | Recovered Stripe tax-audit follow-up (#127)

Read-only live revalidation confirms the same approved account `acct_1SVLH2GfzDhsgsQZ` now displays AkiPasa Marketing S.L., all fourteen AkiSuite prices use inclusive tax behaviour, and all seven products have tax codes (AkiPasa Premium `txcd_10103000`, others `txcd_10103001`). Stripe Tax registrations remain absent. Technical classification and account display name do not establish legal identity or VAT approval. `docs/AKISUITE_PRICING_ROLLOUT.md` and the checked-in price audit must describe the same observed state; the obsolete unspecified-tax update instruction is removed.

The linked Supabase project's read-only schema probe found neither `public.akisuite_billing_subscriptions` nor `akisuite_private.launch_settings`. The two new migrations, hosted Storage DDL compatibility, legal registration, isolated payment lifecycle acceptance and authenticated portal validation remain release blockers. No flags, prices, products, registrations, subscriptions, permissions, schema or production data changed. Historic release-test claims remain dated evidence, not new validation. Documentation rollback is a source revert.

## Exact source release evidence (2026-10-13)

Cloudflare packaging stamps `.open-next/assets/release-source.json` with the clean tracked Git HEAD before deployment. Packaging refuses tracked changes; commit source before running `build:cloudflare`. The existing `/api/bookings/release` returns `sourceCommit` from this internal ASSETS binding, preserving feature markers and returning null for legacy/missing/malformed artifacts. The post-push smoke must observe the exact triggering commit on apex/www/Business/Duermo before claiming deployment; a constant feature marker alone is insufficient. This adds no database, billing, permission, locale or secret dependency. Rollback restores older code/assets and accurately loses current-source readiness. Browser/authenticated workflow acceptance remains separate.

Exact-source release verification runs for every master push, including asset, dependency, configuration and documentation changes; there is no deployment-input path filter.

### 2026-10-13 | Recovered venue media picker review defects

Unmerged PRs #121/#122 contained review findings still present after #123: search/folder controls consumed the gallery scroll row, and the modal lacked keyboard focus containment, Escape dismissal, restoration and slot-specific trigger names. VenueMediaStudio now groups controls into one intrinsic row and empty/results into the scroll row, with dedicated CSS preserving the event editor modal. EN/ES triggers identify the image surface; opening resets filters, focuses search, traps keyboard/programmatic focus and closing restores the opener. Existing upload/placement/Auto actions, permission checks, media inventory, accommodation header, event editor, billing and SQL remain unchanged. Rollback is code-only. Component regression tests exercise actual focus wrapping, Escape/close restoration, filter reset and variable-content DOM rows in both locales. Full check, responsive browser/Cloudflare CI and authenticated live owner acceptance remain required before deployment; no live storage/data mutation or deployment is claimed.

The recovered claim and venue-media browser harnesses run in tablet CI with disposable actions; their real-browser results remain separate from component tests and live authenticated acceptance.

## 2026-10-13 | Historical backlog documentation authority

The README entry point now directs engineers to `AGENTS.md` and this contract.
The July/August AI handoff, project status and TODO files carry explicit
historical-snapshot notices linking current change evidence and the gated
AkiSuite billing contract. Their historical content remains intact for backlog
recovery; an unchecked task is not proof of a current omission, and an old
acceptance checkbox is not proof of the present deployment. No application,
workflow, database, entitlement or payment-activation behavior changes.

### 2026-10-13 | Venue picker short-window visual acceptance repair

Actual CI screenshot review of PR #138 at 640×400 caught gallery cards collapsing into thin, unreadable strips even though modal/footer geometry checks passed. Dedicated venue-picker gallery rows now retain a nine-rem minimum and scroll instead of compressing; short-window controls share one row and the footer stays horizontal to reserve a readable first card. Shared event-picker geometry and existing placement/Auto actions remain unchanged. Browser acceptance now requires actual thumbnail and label dimensions, the first label inside the gallery, overflowing short-window results, scrolling to the last selectable thumbnail and successful selection/focus restoration with disposable actions. This repairs a visual acceptance failure; required browser CI and screenshot reinspection remain pending on the amended head. No production data, permissions, SQL or billing changes.

## 2026-10-13 | Count actual media and customer-support request bytes

Both /api/business/venue-media and /api/support-agent/chat trusted Content-Length before parsing. Four isolated streamed-request cases reproduced oversized bodies reaching mocked authenticated adapters. Media now counts binary bytes before forwarding to the multipart parser, with an 11 MiB framing budget and cancellation on overflow; support reuses readBoundedText for its 8000-byte UTF-8 contract. Missing or understated length cannot bypass the limits. Origin checks, existing upload action authorization/file validation/RLS, authenticated support identity and provider/tool boundaries remain unchanged. No schema, data, email, prices, entitlements or consent behavior changes.

Eleven focused cases, TypeScript, scoped lint and formatting passed, including cancellation failures, multibyte chunks, valid binary forms, legitimate support, malformed inputs and authorization/origin denials. The existing AkiSuite test glob includes the new file. Full integrated check, Cloudflare packaging, CI and approved authenticated acceptance remain release gates. Rollback is a source revert; no production writes or provider requests were made.

## 2026-10-13 | AkiDuermo Saved avoids unused catalogue requests

The device-local Saved view filtered only its own inventory but issued /api/stays requests on mount and each filter/search change. The discovery effect now skips the Saved view, preserving the separate authenticated /api/stays/saved preference read and save/unsave synchronization. EN/ES component reproduction measured four catalogue requests before and zero after; Explore still fetches and displays its existing private owner preview. Focused 4/4 and broader AkiDuermo 31/31 tests, scoped lint and formatting passed. No stopwatch/CWV or production speed improvement is claimed. No routes, roles, RLS, persistent save format, booking, paid access or data changed. Full check, browser/CI and live version verification remain release gates; rollback is a source revert. Homepage concurrency overlaps existing PR #103 and was not duplicated.

## 2026-10-13 | Locale navigation and membership control acceptance

The health audit reproduces stale Spanish privacy copy after switching to an English localized route, a membership Manage/Search collision at 1363px, and auth language switching that retains the previous locale in a single local return destination. PersonalisationConsent derives copy from the exact current locale segment, then a valid reactive AkiDuermo lang query, with the existing server fallback; LanguageLink translates one well-formed localized next destination while preserving its suffix/query and the existing server destination sanitizer. Membership imports a narrow stylesheet reserving Search space at the existing 800px breakpoint. Consent choices, auth/session/roles, pricing, checkout gates, API/RLS, media, storage, analytics and production data are unchanged.

Focused privacy 14/14 and language-return/auth 30/30 tests passed; 62 browser cases cover seven widths, both locales/themes, collision geometry, target size, overflow, normal Manage clicks and privacy draft preservation. Browser execution, combined check, Cloudflare packaging, CI and deployed-version/live smoke remain release gates. Source reverts roll back presentation; no data migration or restoration is required.

### Stay privacy controls and property CTA protection (health follow-up)

Production and CI reproduce the AkiDuermo Privacy trigger beneath fixed StayNavigation. Scoped StayAppShell rules place the trigger and bounded, scrollable panel above the dock/safe area. A property-only <=800px offset also preserves its separate planning CTA; wider screens and route departure reset the CSS variable automatically. Membership Manage uses a 46px minimum target while retaining the strict >=44px acceptance assertion. No consent defaults/submission, booking actions, property data, auth/roles, prices or shared global/root/picker styling changes. Sixty-two real-route cases include both locales/themes, seven catalogue widths, stay-host short windows and twelve synthetic property-renderer layouts. Property fixture shapes are layout evidence, not live inventory/RLS proof. Source reverts are sufficient; no migration. Final execution, integrated checks and deployment proof remain release gates.

### In-place stay language acceptance (final Health follow-up)

Actual browser acceptance caught Next retaining the old reactive query because the stay screens preserve history state markers. AkiDuermo and StayProperty now emit a bounded locale notification after their existing in-place language change. Consent validates EN/ES, keeps an exact localized pathname authoritative and clears scoped notifications on navigation, including return to an old route. Existing draft choices, motion, cookie and submission behavior remain. Seventeen component cases pass; the 62-case browser matrix now includes bidirectional property language switches with zero consent POST and no document reload. Current-head browser, CI, clean Cloudflare package and exact live source/smoke remain release gates. The branch includes reviewed #145/#144 prerequisites for ordered integration; no duplicate security migration.

### First-visit privacy panel dismissal (Health CI repair)

Current-head browser CI reproduced four EN/ES × light/dark 390px AkiDuermo guest journeys failing to click Hotels because the initially visible privacy panel intercepted the map filter. The shared nonmodal panel now has an EN/ES Close control (46px minimum height), scoped header styling and Escape dismissal from its controls, restoring focus to the existing Privacy trigger without scrolling the page. Closing changes visibility only: it writes no consent/version cookie, sends no POST, requests no motion permission and does not apply optional choices. Existing saved permissions remain authoritative and the draft remains available when reopened. The prompt still appears on a fresh document until an explicit consent choice is saved. Auth, account settings, consent API/RLS, telemetry permission checks, pricing, booking and production data are unchanged.

Four additional component cases verify denied first visits in both locales, preserved drafts/saved permissions, keyboard focus and pending-save behavior. The existing eight locale/theme/mobile/desktop guest journeys now assert the real initially open panel, denied defaults, normal dismissal, focus restoration and zero consent writes before their ordinary discovery/filter interactions. Focused tests, complete browser/check/Cloudflare CI and exact live-source smoke remain release gates. Rollback is an application source revert; no migration or customer-data restoration.

## 2026-10-14 | Claim picker browser phase sampling

The inherited PR #143 geometry failure mixed two renders: a transient empty results bottom of 383.703125px and a subsequent loading map top of 381.515625px produced the exact -2.1875px report. Actual same-frame snapshots retain a 17px map gap and 13.59375px input gap. The harness now waits for the exact query/vertical response and completed loading state, then reads all bounds in one browser task. Every original strict assertion and 24 EN/ES, light/dark and responsive combinations, both verticals, scrolling and normal last-result selection/clear remain. Held requests additionally verify loading and settled-empty geometry and actual input bounds. No application CSS, API, role, SQL, data, billing, consent, map renderer or claim mutation changes.

Local Chromium 153 acceptance passed 24/24 combinations, 144 atomic snapshots and 48 natural selections/clears; representative screenshots, scoped lint/format and whitespace checks passed. Integrated full checks, Cloudflare/current-head CI and live/authenticated acceptance remain separate gates. Rollback reverts the harness only. Cleanup retains PR #143/#136 ownership; this focused Health repair does not take over those changes.

## 2026-10-14 | Customer AI prompt and tool boundaries

Actual gateway and installed-client fixtures reproduced two boundaries: same-account operator messages entered later customer prompts, including after role demotion, and an unsolicited provider call executed an agent-permitted tool despite the request advertising no tools. History now filters audience before ordering/limiting while retaining actor, agent and user/assistant filters. Untagged legacy history remains operator-only. Customer history additionally requires context version 1 because earlier customer replies could already contain echoed operator context; fresh customer messages and replies carry that version. Historical customer context restarts without rewriting or deleting records. Operator legacy behavior stays compatible. Execution also requires the effective advertised tool set before existing permission, validation, approval and audit checks.

Thirty-two focused cases, TypeScript, scoped ESLint/Prettier and whitespace checks passed. Inert base-to-persisted-state-to-patched replay confirms old customer replies cannot re-enter; fresh multi-turn context, JSON audience/version negatives, latest-message filtering, budgets and allowed-tool approvals remain covered. No real provider request, database migration, role grant, mail, paid activation or production write occurred. Existing admin-authorized dashboard mixed-history display is a separate presentation gap. Full integrated/Cloudflare/browser/current-head CI and exact deployed-source verification remain release gates. Rollback is a source revert; existing stored rows remain intact.

## 2026-10-14 | Batch public venue media signing

Both public venue loaders signed photos one request at a time. A shared signer now deduplicates requested paths and uses one createSignedUrls batch, retaining the 3600-second TTL, original media order/IDs/localized alt text, existing cover selection/fallback and published/venue-only selectors. Only requested, successful batch entries are used; denied, missing and unknown paths cannot become images. Empty media performs no signing request. A failed batch returns the existing missing-media fallback rather than retrying every asset. There is no shared signed-URL cache or permission/bucket change.

Installed-SDK HTTP fixtures pass 44/44 repository cases, including 14 new boundary cases. Each direct loader changes signing calls from 60 to 1 and 12 to 1; empty remains 0. This measures request counts, not field latency or CWV. Historical Storage 400s were signed-object GET downloads, not signing POSTs, so this optimization is not claimed to remediate those errors. Public browser fixtures already support the batch endpoint. Scoped lint/format/diff checks pass; full current-head checks, Spotlight browser acceptance, Cloudflare package and exact deployed-source verification remain required. Rollback is a source revert with no data rollback. Cleanup #136 shares repository.ts selected-media code; reconcile that reviewed change after the serialized Health release, retaining both behaviors.

## 2026-10-14 | Runtime dependency security and MapLibre v5 backport

The runtime audit identified six affected packages. Next and its ESLint configuration are pinned to 15.5.27, PostCSS to 8.5.23 with nanoid 3.3.18/source-map-js 1.2.2, and Sharp to 0.35.5. MapLibre remains exactly 5.12.0 because the fixed major release changes worker/ESM/WebGL contracts; its upstream PR #8189 attribute-removal fix is applied narrowly to DOM source and all four distributed map bundles. Snapshotting attributes prevents adjacent unsafe attributes from being skipped. Existing worker, CSS, license, map API and WebGL behavior remain byte-identical. Patched bundles stop advertising their stale upstream source maps; remaining map files are not valid patched-source debugging evidence.

Postinstall validates exact package version/license/runtime entry and all pristine/patched SHA256 fingerprints before writing, rejects unknown/missing/mixed installs, and is idempotent. Build, Cloudflare build, development and check refuse unpatched artifacts. Twenty-nine inert native AttributionControl/metadata/failure tests pass, covering each bundle, consecutive/nested attributes, safe OSM credits, source metadata updates and package-entry overrides. A clean lifecycle-enabled install applies the backport and full repository checks/build pass; final integrated checks and native browser/Cloudflare/current-head CI remain gates. The runtime audit falls from six package flags to one version-based critical MapLibre flag; npm does not understand the verified local backport. This flag is explicitly retained, not waived or claimed absent. Dev-tool findings are outside this focused runtime repair.

The unchanged upstream sanitizer still permits iframe srcdoc in inert tests. No ordinary user-controlled style/attribution input was found; external configured tile/style providers remain a separate trust/hardening risk, with no production exploit or script execution demonstrated. Independent one-cycle review found no adjacency blocker and identified the runtime-entry guard, which is incorporated and directly regression-tested. No production data, SQL, role, payment, email, analytics or service configuration changes. Source/lockfile revert followed by a clean reinstall is rollback; restoring vulnerable versions requires security review. Physical Android/iOS/WebGL1 acceptance is unperformed.

## 2026-10-14 | Native geolocation naming and static browser transport

The shared native MapLibre geolocate button receives an EN/ES name synchronously while its permission-support check is pending. Native supported/unavailable labels subsequently replace that initial label. ProductionMap (AkiPasa and AkiDuermo) and the separate business claim picker use the same boundary; geolocation requests, disabled states, tracking options, camera, filters and teardown remain native. No vendor artifacts, CSS, API, role, session, database, storage, consent or production state change.

Three virtual-host browser fixtures let compiled /\_next/static/ assets use the browser's ordinary transport instead of redundantly fetching them through Playwright's Node proxy. Actual page/auth/manifest/branding requests retain host forwarding, and stay/map synthetic responses and all acceptance assertions remain. A recorded CSS socket reset is a local test-transport failure; its original server/socket cause is unestablished and no production outage is inferred. No retry, increased timeout or failed-response substitution is added.

Installed native lifecycle cases, actual built-asset byte/header comparisons and focused review are recorded in docs/HEALTH_SHARED_CONTROLS_20261014.md. Full current-head check, hosted public and complete tablet/Spotlight acceptance, clean Cloudflare packaging and exact live-source verification are separate gates. Source reverts suffice; no data rollback. Health #132 owns these new shared fixes; Cleanup #136/#143 retain their original PR ownership.

## 2026-10-14 | Recovered commercial request localization (#112)

Current Admin promotions still displayed raw service/state keys and English
status options on Spanish pages after #113 replaced #112's layout. Staff also
labelled `featured_listing` as a venue listing and omitted three accepted
services. `src/lib/promotion-labels.ts` now supplies display-only EN/ES names
for the four existing service values and five states. `featured_listing` means
Featured event / Evento destacado, matching the existing business request
selector and event-backed scheduling migration `0044`.

Admin summaries, editable status options, localized search terms and its
status filter use these names. `AdminSearchList` accepts an optional label map
only for this caller; other queues retain their existing display. The business
request selector and read-only Staff inbox share the same names. Original
machine IDs, form values, server actions, role/RLS checks, state groups, query
limits, message/evidence text and per-caller unknown-value fallbacks remain
intact. No CSS, route, API, SQL, storage, email, billing, consent, analytics or
production data changes. Other portals are unaffected. Rollback is a source
revert with no data restoration.

Ten focused rendered regressions cover EN/ES: real business selectors,
Admin route summaries and FormData, status filters/localized search, Staff
search and accepted labels, legacy read-only aliases, plus unknown/prototype-name
safety. Existing Staff aliases remain display-only; request validation/options
still admit exactly four service IDs. Business previous-request history retains
its existing raw service/state presentation outside this focused #112 recovery. Existing
Admin/Staff suites and full check/Cloudflare/browser CI remain release gates;
no production deployment or authenticated acceptance is claimed.

## 2026-10-14 | Combined safe historical recovery integration

The recovery candidate starts from merged Health #152 master
`7311ae9f6550f9dabf96a39c7782287bbacb303c` and incorporates the reviewed
#143 catalogue starter visibility, #136 explicit public media selection and
#153 promotion localization/checkpoint scopes. All sixteen scoped application/test/fixture
blobs are byte-identical to their original candidate heads. Master
Health control/transport source remains intact; independent shared-document
entries are preserved. Original heads remain in the candidate ancestry.

Focused combined regressions pass: repository/Admin/Staff 71/71, catalogue
foundation/rendering 13/13, Spotlight 20/20 and promotion EN/ES 10/10. Full
check, independent review, fresh complete hosted CI/Cloudflare/browser gates
and exact deployed-source verification remain required. This candidate does
not claim a live release or authenticated editing/placement acceptance.

All existing role/RLS, storage signing, machine IDs, explicit visibility,
pricing, consent and action boundaries remain as documented in the three
original recovery entries. No SQL, authorization/payment rollout, customer
records or email replay is included; drafts #133/#140 stay excluded. Source
revert rolls back these repairs without rewriting catalogue/media/history.

## 2026-10-14 | AkiBusiness event workspace and ownership signal (PR #167)

Business event listings use a nine-card paginated responsive catalogue, text search, and localized current/past/archived filters. Event creation stays collapsed until requested and uses a media-library dialog with keyboard focus containment, Escape close, and return to its opener. The public claim CTA and claim submission guard depend on the privacy-safe `public_venue_is_claimed` RPC, which checks approved claims and venue membership independently of edited venue content and fails closed. The migration is mirrored in `database/migrations/` and `supabase/migrations/`, and is recorded as `20261014143947_public_venue_claim_ownership` on Supabase ref `vhpbvcfkcteswlsdjrfl`. Read-only verification confirmed the function definition and execution grants for `anon` and `authenticated`, with no `PUBLIC` execute grant. The repository runbook identifies this ref as production, while the connected Supabase listing labels it `AkiPasa Development`; confirm the project’s deployment role before treating this connection as production. This change keeps server authorization and event reuse actions unchanged. Local checks, hosted CI, Cloudflare build, and live-release smoke passed before merge. Rollback requires restoring old UI with compatible ownership RPC policy and preserving legitimate claim records.

## 2026-10-14 | Discovery filter recovery

GlobalSearch validates price and date ranges before its existing automatic URL
replacement. Invalid ranges receive localized visible errors and do not navigate.
The panel exposes its active discovery filters as named removal controls plus a
clear-all action, clears stale result pagination after individual changes and
returns focus to the panel after the routed query update. The public no-results
state expands only up to 100 km; at that limit it now links to the locale home to
choose a new area from a clean filter state.

This is PUB-17. Existing filter keys/defaults, list and Map routing, recommendation
queries, native input constraints and ranking remain unchanged. No API, database,
authorization, consent, payment or persistent customer data changes. Focused
validation and empty-state tests pass; current-head checks, CI, Cloudflare release
and exact live-source verification remain required before this entry is live.

## 2026-10-14 | Recovered demand-driven Passport foil from #103

The retained Passport-only scheduler from draft #103 now stops animation frames and style writes after interpolation settles, pauses while hidden, and wakes on pointer/sensor input, recentering and surface changes. Current theme/layout, motion permission and on-device preference, reduced-motion behavior, rank/stamp data and existing interpolation/sensitivity remain unchanged. No broader navigation/auth/cache/toolbox changes from the old branch are incorporated.

The mandatory subscription test configuration includes scheduler and real PassportBook regressions for EN/ES sensor input, hidden/resumed documents, recentering, unmount, reduced motion, preference revocation, pointer fallback, foil toggling and chapter changes. The unchanged original component fails the new idle-frame regression. Full checks, existing public Passport browser acceptance, current-head CI and deployed-source verification remain release gates. Physical gyro feel, device power consumption and production frame-rate improvements are not established. Rollback is a source revert; no data or migration rollback.

## 2026-10-14 | Public membership account handoff

The public catalogue has no authenticated owned-workspace or entitlement context. Its ready plan CTAs now navigate to the existing same-locale account subscription hub with the allowlisted originating app, rather than posting a workspace checkout without a workspace. Authentication and terms use the existing middleware/account return path; the account still loads authorised workspaces, exposes existing setup and requires a separate final purchase. Public closed gates retain seven disabled Coming soon buttons. Account workspace purchases are disabled until a workspace exists, with EN/ES setup guidance; personal purchases, included/access-error guards and selected-workspace add-on eligibility remain intact.

Dependencies: public/Business/Duermo aliases and HQ origin, shared catalogue, account layout/auth/terms, gated owned-workspace RPC/setup, existing checkout server authorisation and Stripe safeguards. No server billing action, entitlement, readiness flag, price, migration, live service call, analytics or customer-data change. Five new rendered regressions fail against the original grid; all 18 focused rendered/UI/checkout cases pass after the patch. Full check, current-head CI/browser/Cloudflare and authenticated acceptance remain pending. Rollback is a source revert; paid rollout remains blocked by the separate legal/tax/schema/lifecycle gates.

Validation follow-up: full check passed formatting, lint, TypeScript, all application suites (855 tests including AkiSuite 114), database safety and two conflict tests, then stopped because the isolated automation workspace lacked Hono dependencies. After installing that subproject from its lockfile, automation checks/dry-run passed; the production build is being checked separately. The existing account browser workflow now includes eight ready/closed public-handoff cases (EN/ES, both themes, 360/1536px), actual anchor target/text geometry, account navigation with zero checkout actions and disabled closed gates. Its disposable bundle compiles. Local Chrome cannot launch because ProcessSingleton socket() is prohibited; geometry assertions and screenshots must pass hosted CI before acceptance. Scoped anchor CSS shares the existing button dimensions. Independent source review found no functional/security blocker; neither hosted browser execution nor payment acceptance is claimed.

Hosted handoff follow-up: run 38500939403/account job 115647472508 passed the pre-existing matrix but stopped before the new geometry assertions. Expanding a card changed its accessible button name, shrinking the live name-filtered nth locator set and making nth(4) disappear. The harness now iterates stable article containers and explicitly verifies false-to-true aria-expanded per card. All eight cases, CTA geometry and zero-checkout assertions remain unchanged; no production source or timeout change. Fresh hosted execution remains required.

## 2026-10-14 | Recovered lazy owner toolbox (#103)

The owner-only launcher previously imported the full toolbox, achievement scopes and Pals engine before activation. The bounded recovery extracts the current panel intact and dynamically imports it only after a click or Ctrl/Meta+Shift+O. Saved appearance still applies immediately. Concurrent activations share the pending load; an EN/ES busy/retry trigger retains the existing responsive class and accessible name; late completion after unmount is ignored. Once loaded, the panel remains mounted so Escape, outside-close and reopen preserve its existing state. The locale layout's server has_owner_console gate and every owner/award action remain unchanged; lazy delivery grants no authorization.

Eight focused cases cover import deferral, immediate appearance, mouse/keyboard activation, pending deduplication, failed-load retry, unmount and actual panel state across close/reopen in EN/ES. These are component/module-boundary evidence, not live bandwidth or authenticated acceptance. No CSS, auth cache, route, SQL, data, rewards, billing, email or consent changes. Current-head full checks, production/Cloudflare packaging and required CI remain release gates. Rollback restores the original eager component; no data restoration.

## 2026-10-14 | Creator review draft recovery

PUB-09 now retains a creator-review rating and body in tab-local session storage
before invoking the existing server action. Validation, unavailable-service and
authentication returns reopen the review disclosure and restore those fields; the
authentication return carries only a bounded `review=draft` marker. Normal and
successful profile loads clear stale drafts. Existing Zod limits, requireUser and
Terms routing, creator_reviews RLS/moderation, pending state and EN/ES outcome copy
remain unchanged. No automatic resubmission, new endpoint, schema or persistent
cross-tab storage is added. Focused action/profile/draft tests pass; full CI and
exact deployed-source verification remain release gates.

## 2026-10-14 | Password recovery task continuity

AUTH-02 carries the sanitized originating task through password-reset request,
the PKCE callback, the authenticated recovery page, password update, mandatory
sign-out and the following sign-in. Public paths use the locale allowlist and
AkiDuermo paths use its host-specific member/stay allowlist. Expired or reused
callbacks, missing recovery sessions, password-policy failures and provider save
failures keep that safe destination available for recovery. Nested task parsing
never serializes a password, recovery code or provider token. Existing password
rules, callback exchange, Terms enforcement and sign-out behavior remain
authoritative. Focused action/security tests pass; both host browser journeys,
current-head CI and exact live-source verification remain release gates.

## 2026-10-14 | Actionable authentication feedback

AUTH-03 maps the existing authentication error categories to localized alerts and
associates invalid email, password/confirmation and Terms controls with the active
summary. Credential failures keep the same account-private wording for unknown and
incorrect accounts. A client boundary stores only the typed email in host-scoped,
tab-local session storage; it never receives or stores password fields. Submit
buttons use native React form status to disable repeat submission and announce the
pending action. Server validation, provider calls, rate limits, Terms enforcement,
redirects and account-existence privacy remain authoritative. Rendered controls and
existing inert action tests pass; full CI and live-source verification remain gates.

## 2026-10-14 | Faster tablet acceptance workflow (PR #169)

Tablet browser acceptance retains its existing route, portal-smoke and layout/Spotlight commands while running them in three independent GitHub Actions jobs. Route suites use two Playwright workers; superseded runs for the same PR are cancelled, and each job uploads distinct evidence artifacts. The existing `tablet-ui` required-check name remains available. This changes CI orchestration only; application behavior and test assertions are unchanged. Full exact-head CI and branch-protection verification remain required before merge. If parallel browser resource pressure causes instability, return route workers to one while retaining job parallelism.

## 2026-10-14 | Connected Cloudflare release evidence

The connected production release smoke published and verified AkiPasa master commit `31c643a6ecf8bd618b5e7f86ebb178da9102ab3e`. Its `booking-live-evidence.json` confirms HTTP 200 and the exact source commit on `akipasa.com`, `www`, `business`, `akiduermo`, and `akiconduzco`; the AkiConduzco home, map, robots file and sitemap also returned 200. The smoke is anonymous/read-only and did not test authenticated operator actions. The available GitHub environment has no Wrangler API token, so the unsupported redundant deployment workflow was removed. Continue using the connected Cloudflare release and require exact-commit live smoke evidence.

## 2026-10-15 | Fullscreen rental company apps

The independent AkiCoches company page prioritizes company identity, paginated
fleet discovery, a selected-car photo/specification view, blocked-date calendar
and a separate authenticated request step. The date-filtered catalogue no longer
removes company identity or the rest of its fleet. Public calendar reads select
only vehicle/date fields under existing anonymous RLS; failed/truncated reads
never imply known free dates. Final range availability and request pricing remain
authoritative server contracts; requests are not confirmations or payments.

The independent AkiBusiness uses a shared fullscreen rental desk for linked venue
fleets and existing unlinked companies: fleet search/selection, add/rate/cover/
visibility editing, availability, pending/confirmed/history requests and a
dedicated existing venue media studio. Native mutations retain server validation
and RLS. Read errors disable dependent management. Mobile uses bounded panels;
short viewports and media retain internal overflow for reachability.

The new link_owned_rental_company_venue RPC is an explicit one-time attachment:
authenticated company owner AND venue owner/manager are required. It locks both
records, rejects accommodation/occupied venues and reassignment, permits an
idempotent same-venue retry, preserves company/fleet/booking rows and does not
grant direct venue_id updates. Migration 20261015163602 is applied on shared
project vhpbvcfkcteswlsdjrfl; anon execution and direct venue reassignment remain
denied. The SQL regression covers absent identity, unrelated venue member, wrong
company owner, success/retry and reassignment. Authenticated owner/media/booking
production UI acceptance remains separate. No customer records were edited.

Validation: both independent Next builds, lint/types and the first full product
suites passed (Coches 102 plus 65 redirect cases; Business 170). Follow-up UI/error
changes require final checks. The local Chromium download is truncated by the
environment, so no responsive browser/screenshot acceptance is claimed. Hosted
CI, clean Cloudflare packaging and authenticated preview acceptance are required
before release. Rollback: revert app code; keep the compatible additive RPC, or
revoke/drop that function in a reviewed forward migration. Never unlink records
or drop customer data as rollback.

## 2026-10-15 | Independent AkiCoches branches and booking operations

Rental locations are independent Branches / Sucursales with their own profile,
coordinates and private rental-media library. Existing company/fleet/booking IDs
remain stable. The one-time migration snapshots current venue owner/manager grants
as independent branch memberships, clears the historical venue link, disables the
old link RPC and imports only previously selected covers into branch media rows.
The authenticated branch workspace copies those legacy files into rental-media;
failed copies remain visible with a retry notice and never delete source files.
New uploads and selected covers/profile/hero media must belong to the same branch.
Public media reads are restricted to published branch profile or active-car covers.

Customer requests require name, valid phone and the verified account email, checked
in the UI, API and authoritative SQL RPC. Existing historical incomplete contacts
are retained. Booking details include email, phone, message, dates, car, status and
quote. The operator overview reports current rentals, pending requests, today pick-
ups and returns in Europe/Madrid; a separate scoped API pages live/upcoming/pending/
historical bookings and rechecks manager authorization on every request. Requests
are distinct from confirmations; no payment or instant availability is fabricated.

Rental lifecycle email uses the existing AkiPasa suite outbox and five-minute sender,
not a scheduler in either extracted product. Request/confirmation/decline/cancel/
completion changes enqueue deduplicated customer and verified branch-owner emails.
The dispatcher rechecks current verified addresses, branch owner, renter and status
before sending. No historical email backfill or test email to real customers.
New email rows remain blocked for the compatible sender during rollout; its service-only activation RPC releases only those new rental messages. The existing sender also copies selected legacy covers in bounded batches, preserving original files.

Rollback uses a reviewed forward migration and app version rollback; do not drop
branch media, re-link companies, rewrite bookings or reapply migration history.
Owner-session production mutations remain a separate acceptance check.

Migration `20261015220302_independent_rental_branches` is applied to confirmed
shared project `vhpbvcfkcteswlsdjrfl`. Readback: zero linked rental branches, one
selected legacy cover imported, the existing booking count preserved, the old
authenticated link RPC disabled and anonymous email activation denied. Security
advisors flag the intentional deny-all legacy audit and explicitly guarded
definer RPCs; no new public booking/contact access is granted.

## 2026-10-16 | Rental media upload policy repair

The shared rental-media Storage INSERT/DELETE policy used an unqualified `name`
inside a company subquery. PostgreSQL resolved it to the company's display name,
so valid owner/manager image uploads were denied. The forward migration explicitly
uses `objects.name` for the branch UUID folder. Manager SELECT access also covers
their own folder before a media row exists, allowing failed-save cleanup; anonymous
and unrelated-user reads remain limited to selected, published media.

Impacts: independent AkiBusiness multipart uploads and cleanup, AkiCoches selected
cover signing, shared Storage RLS and the eventual AkiHQ management handoff. No
UI, locale, role membership, booking, billing, media content or analytics change.
Regression must execute Storage INSERT/SELECT/DELETE under authenticated and anon
roles, including cross-folder/bucket denial and UUID-shaped branch display names.
Rollback is a reviewed forward policy migration; do not delete or rewrite files.
Production logs confirm three rental uploads denied by RLS. Release evidence is
recorded in the PR; this entry alone does not establish live acceptance.

Migration `20261015232311_fix_rental_storage_object_policies` is applied on the
confirmed shared project. The new Storage RLS regression fails on the original
policy and passes after the correction. A rollback-only production owner-role
probe confirms own-folder INSERT/SELECT and foreign-folder denial, leaving no
objects behind. Production direct SQL DELETE is protected by Supabase's storage
API-only guard; that guard was retained, with DELETE policy behavior tested locally.
No real customer image, profile, booking, email or subscription was mutated.

## 2026-10-17 | AkiSuite shared brand icon family

The public AkiPasa logo and AkiDuermo teal mark remain unchanged. The legacy
AkiConduzco host now points to the red-pin/black-star/white AkiCoches SVG, and
its maskable manifest icon has a dedicated safe-zone SVG. The shared product
switcher resolves the AkiHQ image to a black-pin/gold-star/white SVG rather than
the old blue icon PNG. Icon geometry uses the existing AkiPasa mark shape and a
128x128 canvas with 29px corner radius. AkiBusiness AB artwork is preserved in
the distinct operations release. No PWA identity, deep links, users, billing,
roles, event/venue records, Map, or Supabase contract changes.

Verification: compare the four suite icons at launcher scale and in portal
switcher, check metadata/manifest for the legacy hostname, run the existing
Next/Cloudflare and tablet CI. Rolling back restores the previous SVG and
component paths, without any data restoration.

## 2026-10-17 | Verified brand production deployment automation

AkiPasa now has a reviewed production workflow proposal for `master` that runs
source checks, builds the Cloudflare worker with the existing public environment,
compares the exact release-source stamp and uploads only to the existing
`akipasa` Worker. It reads live Worker bindings before release and keeps existing
feature gates, service bindings, domain routes and secrets; the pipeline does
not apply Supabase migrations or enable billing. Post-deploy acceptance checks
`/release-source.json`, AkiHQ's black/gold suite SVG and AkiCoches' red/black
suite SVG. Failed checks block deployment. Cloudflare API credentials must be
configured as a scoped GitHub Actions `CLOUDFLARE_API_TOKEN` secret; a missing
secret blocks the workflow rather than silently deploying. Existing Worker
version history remains the rollback path.

## 2026-10-17 | Production branding CI automation dependencies

The AkiPasa brand-release workflow must run `npm ci --prefix automation` after
root dependencies and before `npm run check`. This matches the existing public
AkiSuite CI workflow and prevents the separately scoped automation TypeScript
build from failing due to missing packages. This is deployment pipeline hygiene
only, not an application, role, schema, artwork, data, Stripe or billing change.
Cloudflare deployment still requires existing Worker/domain preflight, an
explicit GitHub Actions `CLOUDFLARE_API_TOKEN` secret, and successful
exact-source/HTTPS verification before it can be called live.

## 2026-10-17 | Five-product navigation and account actions

The consumer AkiPasa shell now exposes the same five-product launcher as AkiDuermo, AkiCoches, AkiHQ, and AkiBusiness: desktop sidebar button and mobile/tablet header button plus the More bottom sheet. The launcher preserves each product's canonical URL, logo, accent colour, current-app indication, and English/Spanish labels. Consumer account settings and the existing server-side sign-out action are included; guests receive a sign-in link instead of a misleading sign-out action. Legacy AkiDuermo header navigation also offers Settings and sign-out. No product identity, subscription, auth policy, claims or Supabase schema changes. Verify keyboard/Escape behaviour, small viewport scrolling, contrast, and sign-out scope across products before deployment.

## 2026-10-17 | Viewport-fitted AkiPasa sidebar / AkiSuite dock

The desktop AkiPasa sidebar now separates the independently scrolling navigation list from a pinned utility dock (AkiSuite product switcher, language, appearance and expand/collapse). On desktop viewports up to 980px tall, vertical gaps and item padding are reduced; at unusually small heights only the list can scroll, never the footer controls or whole page. The expanded footer places the theme/language controls alongside the collapse action, and the compact rail keeps its icon-only controls. The AkiSuite popup remains reachable above the dock with a viewport-constrained internal scroll region. Phone/tablet bottom navigation and standalone map layout are not altered. Validation: desktop viewport heights (740/900px), compact and expanded rail, guest and admin navigation groups, click/focus of product switcher, keyboard access and tablet CI. Rollback is CSS-only, no database or auth changes.

## 2026-10-17 | Separate mobile AkiSuite and internal More navigation

The header AkiSuite button opens only the five product links plus Settings/account action. Bottom More retains internal navigation, workspaces, passports, membership, appearance and language. Independent sheet state, Escape handling and focus return. Header reserves search space. No auth or data changes.

**Final mobile split:** the top-header AkiSuite sheet contains only the five Aki product destinations and current-product marker. Personal account actions belong to the internal bottom More sheet; guests see Sign in there. The top sheet does not contain Passports, Membership, workspaces, Settings or Sign out. The desktop rail's original suite menu remains unchanged.

## 2026-10-20 | Gated Passport prestige candidate

`/[locale]/passports/prestige` and the administrator prestige studio add configurable,
versioned recognition against the existing natural achievement engine. Both server
`AKIPASA_PRESTIGE_ENABLED=true` and the private database launch setting are required;
new migration defaults closed and seeds no milestone. Claims recompute accepted
activity, reject marked test accounts and manual-only awards, freeze requirement
definitions, serialize by member and issue one immutable serial/evidence snapshot.
Existing stamps, XP, loyalty and manual awards are unchanged.

Awards are private by default. A separate alias and sharing opt-in expose only the
certificate projection; voluntary Hall participation requires sharing. Public outputs
exclude account identifiers, email, activity evidence and physical requests. Withdrawal
and fraud revocation stop future public reads; downloadable cards are no-store SVGs.
Physical interest and admin review create no order. A separate strict-private shipping
intake supports owner read/delete/export, expiry, audited single-record admin reads and
manual concurrency-safe delivery states. Intake/delivery settings default false; approved
retention remains unset and purge readiness false. No UI/RPC enables these settings or
calls a provider. Budget, milestones, retention and a tested service purge schedule gate
activation. `/[locale]/privacy/prestige` bypasses terms/onboarding feature locks for data
rights; claim/intake/interest actions intersect the shared account-features helper when
installed, preserving independent migration ordering. See `docs/PASSPORT_PRESTIGE.md` for source tracing,
read-only coverage, tests and remaining acceptance. No production migration or launch
is implied by this candidate.
