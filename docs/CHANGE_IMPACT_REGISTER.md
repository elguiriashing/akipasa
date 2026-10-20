Warning: truncated output (original token count: 55588)
Total output lines: 1673

# Change Impact Register

## 2026-10-20 | Historical-branch formatter compatibility

- **Before:** the formatter failed before checking a clean historical legal
  branch because its hard-coded list included files added later on `master`.
- **After:** unmatched later paths are skipped and only existing tracked files
  are staged. Existing files still use the same Prettier rules.
- **Evidence:** legal PR #8 run `39407569046`, job `118577111911`, failed only
  with unmatched-path errors after its 16 legal files had been formatted.
- **Rollback:** revert this workflow change. No application, database, billing,
  legal content or production runtime changes.

## 2026-10-20 | Reconcile unavailable GitHub production credential

- **Before:** every `master` push started the production deployment workflow;
  all repository checks passed, then the preflight failed because the scoped
  `CLOUDFLARE_API_TOKEN` secret was empty. The connected Cloudflare release path
  separately deployed the same commit, leaving a permanently red duplicate job.
- **After:** production publication from GitHub is manual-only and requires the
  exact `DEPLOY_AKIPASA` confirmation input. Missing credentials still block the
  preflight, but no normal push is reported as a failed deployment.
- **Evidence:** run `39337824257`, job `118351640032`, failed only at `Load
existing production bindings and check destination`; live
  `/release-source.json` served `1305e6696379b81af8c81247fcc614ae6375b18b`.
- **Rollback:** restore the `push` trigger only after a least-privilege Worker
  deployment token is configured and a manual exact-source release succeeds.
  No application or data rollback is involved.

## 2026-10-19 | SECURITY DEFINER execution hardening (PR #208)

- **Before:** 44 `SECURITY DEFINER` functions owned by the application or PostGIS
  were executable by `anon`; several staff/account RPCs and trigger functions
  retained explicit or inherited anonymous execution despite internal checks.
- **After:** 15 authenticated/staff RPCs revoke `PUBLIC` and `anon`, one catalogue
  bootstrap is service-only, and eight trigger functions revoke direct execution
  from both browser roles. `service_role` remains explicit. The 20 remaining
  anonymous advisor findings are intentional discovery, availability, engagement,
  printer-token or policy-helper endpoints, plus PostGIS-owned functions.
- **Dependencies:** shared Supabase project `vhpbvcfkcteswlsdjrfl`; existing RPC
  authorization and trigger bindings; public discovery and booking reads. Global
  default privileges remain unchanged to avoid silently breaking other products.
- **Verification:** all 24 live identities resolved before application; 24/24
  effective privilege assertions passed afterward; anonymous advisor findings
  fell from 44 to 20; focused security tests and the full repository check pass.
- **Data/billing impact:** additive ACL migration only. No row changes, policy
  weakening, extension moves, Auth configuration, Stripe mutation or activation.
- **Rollback:** use a reviewed forward ACL migration for a confirmed caller
  regression. Do not regrant `PUBLIC`; restore only the minimum affected role.

## 2026-10-18 | Origin-scoped membership offers and personal Premium lock (candidate PR #201)

- **Before:** central membership grid exposed the complete old suite catalogue
  regardless of originating product and allowed personal Premium checkout whenever
  the generic Stripe checkout readiness flag was enabled.
- **After:** origin-scoped legacy grid and explicit fail-closed Premium launch gate
  in the page and the checkout server action. Env controls:
  `AKISUITE_PERSONAL_PREMIUM_ENABLED=true`,
  `AKISUITE_ADOPTION_EARNED_POINTS`, `AKISUITE_ADOPTION_UNLOCK_THRESHOLD`;
  `AKISUITE_PERSONAL_PREMIUM_FORCE_OFF=true` overrides all.
  All are unset by default; no spreadsheet polling is enabled.
- **Access and billing:** current subscribers unchanged. No database migration,
  Stripe price changes, webhooks, or domain cutover. Existing operations plan
  identifiers remain legacy AkiHQ names until the verified billing migration.
- **Risks:** unfinished AkiDuermo/AkiCoches storefront integration and business
  listings; host-specific query context; inconsistent catalogue naming.
- **Verification:** unit launch tests, UI source regression, CI format/contract,
  manual logged-in/out testing, Stripe reconciliation and each Cloudflare host.
- **Rollback:** revert the PR; gate remains disabled until independently activated.
- **Release:** keep draft and do not merge to production before all checks
  and end-to-end launch criteria pass.

## 2026-10-17 | Next.js and React October security backports

- **Before:** Next.js/eslint-config-next 15.5.27 and React/React DOM 19.1.0
  remained in the deployment lockfile after the October 14 advisories.
- **After:** deterministic Next.js/eslint-config-next 15.5.28, React/React
  DOM 19.1.10 and matching @next compiler binaries. Existing Sharp 0.35.5
  override remains fixed.
- **Impact:** closes known upstream exposure including App Router Server
  Actions denial of service. No intended user-visible, business, schema,
  session, access, payment or configuration changes.
- **Verification:** security branch lockfile regenerated on GitHub Actions,
  deterministic npm ci, full PR CI/Cloudflare build, post-merge production
  version and route smoke. Unverified gates must not be described as passed.
- **Rollback:** revert the two dependency/lockfile edits if regressions are
  found, with a new follow-up patch because rollback restores upstream risk.

## 2026-10-17 | AkiDuermo personal account redesign (candidate)

- **Before:** generic three-link card row and large logout panel with little
  visibility of real reservations or their confirmation status.
- **After:** compact responsive account header, actual scoped booking counters,
  next three eligible stays, device-saved and bookings shortcuts, existing
  security/profile links and sign-out. Both languages and theme modes are styled.
- **Dependencies:** AkiDuermo routes /account, /bookings, /saved, /settings;
  accommodation_reservations.profile_id, Supabase session/RLS, StayAppShell
  navigation; AkiPasa shared profile across root domains.
- **Data / permissions:** no mutation, migrations, payments, or change of
  permissions. Four read-only queries on the signed-in user's reservations.
  Failed queries show an error rather than manufactured zeros.
- **Verification required:** format, lint, typecheck, account-focused Vitest,
  full CI/build, authenticated real-account EN/ES on desktop/tablet/mobile
  and empty/error/populated states, cross-host sign-in and logout. Do not
  merge or deploy before these pass. Rollback reverts account page/styles/tests
  without touching customer data.

## 2026-10-15 | Rental company cards on legacy Business home

- **Before:** the AkiPasa-hosted portal exposed a top-level AkiConduzco tab,
  while the owner's rental company was absent from managed places.
- **After:** the home reads the signed-in operator's companies by `submitted_by`,
  displays each as an AkiCoches card and rental filter, and routes to the venue
  fleet section when linked or the existing mobility editor otherwise. The
  top-level tab is removed.
- **Dependencies:** Supabase rental company RLS, the standalone AkiBusiness home,
  legacy mobility editor, and host routing. No schema, booking, payment, venue
  membership or unrelated customer data is changed.
- **Verification:** focused owner-scoped loader assertion, type/lint/build and
  hosted CI, then exact-source live smoke of the legacy Business host. Rollback
  restores the previous navigation/card code; no data restoration is needed.

## 2026-10-15 | AkiCoches venue data contract

- **Before:** company owners had one unlinked rental listing, and managers could
  not operate a venue fleet or choose its media for vehicle covers.
- **After:** nullable venue/cover keys, one company per venue, scoped company/fleet/
  availability/request access for venue owners/managers, and a same-venue cover
  trigger. The legacy owner policies, existing rows, and pending-review gate remain.
- **Dependencies:** AkiBusiness venue editor, AkiCoches public signed covers,
  shared Supabase RLS and Storage, and the booking status RPC's existing lock and
  state transitions. No payments, scheduled jobs or email ownership changes.
- **Verification:** mirrored SQL, function/policy readback, both independent app
  CI/builds, owner-vs-other-tenant acceptance and live-domain smoke. Rollback is a
  reviewed forward schema change; never drop customer records.

## 2026-10-14 | AkiConduzco mobility foundation (implementation candidate)

- **Request / before:** AkiPasa has no car-rental discovery or fleet tools. Its
  general venue vertical only models activities/accommodation, and the existing
  AkiBusiness venue claim flow is not appropriate for a rental marketplace.
- **Implemented:** add an independent AkiConduzco brand and host, rental
  company/vehicle/availability/request records, public list/map/search, account
  booking view and a separate AkiBusiness mobility workspace. Rental operators
  create a pending listing directly; no venue claim is used. Booking requests
  require owner confirmation; no payment or automatic confirmation is implied.
- **Dependencies / impact:** middleware host/path/method routing, SSR auth
  callbacks and safe destinations, localized EN/ES copy and metadata, PWA
  branding, public API bounds, Supabase RLS and tenant ownership, availability
  conflict checks, sitemap/robots policy, business navigation and deployment
  host routing. Existing AkiPasa/AkiDuermo discovery, venue ownership and claims
  remain unchanged. No external business data is imported by this change.
- **Acceptance matrix:** anonymous/authenticated visitor and operator; EN/ES;
  mobile/desktop; empty/error/loading/populated states; public vs pending
  company visibility; owner vs unrelated user; unavailable dates; booking
  request/owner decision; safe login return; map route; host branding.
- **Evidence:** schema and account-owned `TEST ONLY` company are present in
  development Supabase project `vhpbvcfkcteswlsdjrfl`; the test company is
  pending review and cannot appear in public search. Product route, API,
  operator tools, staff queue, account surface, sitemap and host routing are
  implemented. Formatting, lint, TypeScript, production build, database safety
  and conflict tests, automation checks, and all secondary product suites pass;
  23 focused AkiConduzco/PWA/staff cases pass. The full root suite passed 626
  cases but hit its existing 5-second timeout in the unrelated PGlite Spanish
  text test; that test passes in isolation. Production schema, production
  DNS/Worker route, Auth redirect allowlist, deployment and live booking are
  not established.
- **Rollback:** remove the new routes/components/migration and product branding;
  if the additive schema migration has been applied, use a separately reviewed
  forward migration rather than dropping customer records.

## 2026-10-14 | Individual venue event search and pagination (PR #172)

- **Scope:** AkiBusiness per-venue Events workspace and new client-side browser.
- **Before:** every event and its potentially large editing form appeared in an unbounded accordion list.
- **After:** EN/ES title/status search, current/past/archived filters, counts, nine-per-page pagination, and responsive 3/2/1-column event grid. Expanded editor spans full width; existing deep links reveal the correct event.
- **Dependencies:** existing Supabase event reads, publish/edit/delete/occurrence actions, venue access, and main events catalogue remain unchanged.
- **Validation:** focused UI and formatting checks plus contract gate required before merge; production verification required after merge.
- **Rollback:** revert component and workspace rendering changes; no data or schema rollback.

## 2026-10-14 | Membership blocked-action guidance

- **Inventory:** MEMBER-01.
- **Before:** some disabled cards retained “Choose plan” or add-on language even
  when access was unreadable, another plan overlapped, no workspace existed or
  AkiHQ Pro was missing.
- **After:** every blocked card states the applicable EN/ES reason and uses a
  matching disabled label. Recoverable states link to the existing account access,
  billing, retry, workspace setup or AkiHQ Pro section.
- **Dependencies:** seven-plan visibility, effective/overlapping-plan resolution,
  checkout readiness, workspace selection, add-on eligibility and Stripe actions
  remain authoritative and unchanged.
- **Evidence:** AkiSuite rendering covers included plans, closed checkout, missing
  workspace, add-on eligibility and failed access reads with their recovery links.
- **Rollback:** revert component/style/page/tests/docs; no billing or data rollback.

## 2026-10-14 | Passport status localization

- **Inventory:** PASS-03.
- **Before:** reward and enrollment cards exposed backend state values, and several
  Spanish notices omitted accents.
- **After:** ready/redeemed/expired claims and active/completed/redeemed/expired
  enrollments use explicit EN/ES labels; unexpected values use a localized safe
  fallback. Spanish Passport copy is corrected throughout the affected page.
- **Dependencies:** state identifiers, reward/enrollment actions, claim codes and
  Europe/Madrid deadline formatting remain unchanged.
- **Evidence:** focused status-map cases cover every stored value and unknown/null
  fallbacks; Spanish text integrity, Spotlight, TypeScript and lint remain gates.
- **Rollback:** revert helper/page/tests/docs; no schema or record changes.

## 2026-10-14 | Privacy withdrawal recovery

- **Inventory:** PRIVACY-01.
- **Before:** a failed account POST left the personalization checkbox visibly On
  even though local consent and queued optional behavior had already been removed.
- **After:** withdrawal immediately renders Off locally. A failed account sync says
  exactly what happened and offers a retry that posts the current local analytics,
  personalization and marketing choices without re-enabling consent.
- **Dependencies:** existing consent cookies/version, behavior-queue removal,
  consent API, account setting and global consent-change event remain unchanged.
- **Evidence:** component coverage exercises a failed withdrawal, preserved
  analytics choice, explicit retry and successful recovery.
- **Rollback:** revert component/test/docs; server and local formats do not change.

## 2026-10-14 | Account collection management

- **Inventory:** ACCOUNT-02.
- **Before:** saved and followed pages read every reference into one static card
  grid; people had to open an item detail to remove it.
- **After:** both collections use exact counts, stable created-at/key ordering,
  24-item server pages and localized name search. Each card exposes an authorized,
  pending-aware remove action with localized success/failure feedback; stale page
  numbers recover to the last available page.
- **Dependencies:** existing per-profile reference tables/RLS, current catalogue
  label refresh, reminder opt-in, account overview counts and export reads remain
  authoritative. Removal records the existing trusted unsave/unfollow behavior.
- **Evidence:** Account collection rendering covers search, totals, paging and form
  return state; all 65 Account cases, TypeScript, lint and formatting are release
  gates on the final stacked head.
- **Rollback:** revert application/tests/docs; no schema or stored-data migration.

## 2026-10-14 | Actionable authentication feedback

- **Inventory:** AUTH-03.
- **Before:** every authentication category displayed the same generic notice;
  affected fields were not associated with it, safe email entry was lost, and
  submit buttons gave no pending state.
- **After:** EN/ES alerts explain email format, password policy/mismatch, terms,
  credential retry and expired-link recovery while retaining account-existence
  privacy. Email alone is restored from same-tab storage; passwords are never
  stored. Form-status buttons disable and announce their pending action.
- **Dependencies:** existing server error taxonomy, Zod/password validation,
  provider rate limits, Terms controls and redirect allowlists remain unchanged.
- **Evidence:** rendered auth/control tests cover safe restoration, pending state,
  error roles and field associations; existing action suites remain green.
- **Rollback:** revert component/page/tests/docs and clear optional tab storage; no
  account, provider or database rollback.

## 2026-10-14 | Password recovery task continuity

- **Inventory:** AUTH-02.
- **Before:** Forgot-password discarded the original membership, claim or stay
  destination; the reset callback targeted only the recovery form and a completed
  reset returned to generic sign-in.
- **After:** one origin-aware allowlist carries the task through the recovery email,
  callback, update form and required fresh sign-in. Validation, provider, missing
  session and expired/reused callback paths retain the same safe task.
- **Dependencies:** public/AkiDuermo host routing, Supabase PKCE callback/session,
  existing password policy, sign-out-after-reset and Terms guard remain unchanged.
  Passwords and provider codes are never copied into the task query.
- **Evidence:** 18 focused auth-action/recovery cases plus public and AkiDuermo
  nested-destination security cases pass; TypeScript and scoped lint pass.
- **Rollback:** revert source/tests/docs; no session or database migration rollback.

## 2026-10-14 | Creator review draft recovery

- **Inventory:** completes PUB-09.
- **Before:** review outcomes and the creator return path were visible, but a failed
  insert, validation redirect or sign-in handoff discarded the typed review.
- **After:** the review form records its rating/body in session storage before the
  server action, returns from sign-in with a bounded recovery marker, reopens the
  disclosure and restores the draft. A normal or submitted page clears stale data.
- **Dependencies:** existing review validation, requireUser/Terms handoff,
  creator_reviews moderation/RLS and result notices remain authoritative. No review
  is auto-submitted and no persistent cross-tab storage is introduced.
- **Evidence:** 17 focused action, profile and draft cases pass, including all three
  failure/auth returns and clearing outside recovery.
- **Rollback:** revert source/tests/docs; session drafts expire with the tab and no
  database rollback is needed.

## 2026-10-14 | Discovery filter recovery

- **Inventory:** PUB-17.
- **Before:** inverted price/date ranges silently produced empty discovery results,
  selected filters had no direct removal controls, and the 100 km empty-state
  action linked back to the same ineffective radius.
- **After:** EN/ES range errors remain beside the filters and block navigation;
  active filters can be removed individually or together with focus returned to
  the search panel. At the maximum radius, the empty state offers a clean area
  and filter reset.
- **Dependencies:** existing URL filter names, discovery defaults, native field
  constraints, recommendation queries and list/Map routes remain authoritative.
  No API, schema, permission, ranking or stored-data change is included.
- **Evidence:** 59 focused validation, active-filter and public empty-state cases
  pass. TypeScript, lint, formatting and the full Spotlight suite are final gates.
- **Rollback:** revert application/helper/tests/docs; no data rollback is needed.

## 2026-10-14 | Mobile More focus containment

- **Inventory:** PUB-16.
- **Before:** the aria-modal More sheet moved focus only on open; keyboard focus
  could leave the dialog, the background stayed interactive and closing did not
  restore the opener.
- **After:** background shell siblings are inert, forward/reverse Tab cycle through
  the sheet, and Escape/backdrop/button/route cleanup restores scroll, prior inert
  state and the mounted opener.
- **Dependencies:** AppShell destinations, capability gates, localized labels,
  GlobalSearch, theme and layout CSS remain unchanged.
- **Evidence:** WorkspaceShell/AppShell passes 15/15 including focus endpoints,
  background inert state, Escape cleanup and opener restoration; TypeScript passes.
- **Rollback:** revert source/test/docs; no persisted state or data rollback.

## 2026-10-14 | Event occurrence and stay handoff

- **Inventory:** PUB-11, PUB-12, PUB-13 and PUB-14.
- **Before:** a card displayed one occurrence but detail independently chose another;
  downstream booking/calendar/return routes dropped occurrence identity. Ended
  scheduled events could still offer booking. Stay search always used the organizer
  venue coordinates, and copy still described AkiDuermo as a non-booking preview.
- **After:** a selected event-owned occurrence survives the full public journey;
  invalid IDs fall back safely. Ended/cancelled/postponed/sold-out states govern
  actions truthfully. Custom event coordinates drive stays, and request-only,
  property-confirmed, no-online-payment behavior is explicit.
- **Dependencies:** existing event/occurrence repository rows, booking settings and
  slots, booking RPC, entitlement check, calendar builder, engagement actions and
  AkiDuermo query contract remain authoritative. No schema, RLS, provider, payment
  or stored-record changes.
- **Evidence:** 34 focused occurrence, detail, card and booking-action cases pass,
  including exact/fallback selection, ended actions, custom coordinates and preserved
  success/error returns. TypeScript passes; full Spotlight, lint, formatting and
  production build remain final stacked-head gates.
- **Rollback:** revert application/helper/tests/docs; no data rollback is needed.

## 2026-10-14 | Discover and Map filter continuity

- **Inventory:** PUB-05 and PUB-15.
- **Before:** primary navigation and the no-results Map action discarded some or
  all active discovery filters. Map's visible list honored selected filters while
  initial event pins came from a separate nationwide, unfiltered query.
- **After:** desktop/mobile switches share one bounded allowlist for location,
  radius, time, category, price, dates and accessibility; list/pagination state is
  deliberately reset. Initial pins and list cards use the same filtered result set.
- **Dependencies:** recommendation ranking and request IDs, map venue tiles,
  clustering, popups, selected centre, geolocation and ResultPagination remain
  unchanged. No query is broadened, no permission prompt is added and no stored
  data changes.
- **Evidence:** 57 focused discovery cases cover filter URL allowlisting, exact
  no-results handoff and filtered pin inputs; WorkspaceShell passes 14/14 including
  desktop/mobile link continuity. TypeScript, scoped lint, formatting and diff
  checks remain required on the stacked head.
- **Rollback:** revert application/helper/tests/docs; no data rollback is needed.

## 2026-10-14 | Community contribution recovery

- **Inventory:** PUB-06, PUB-07 and PUB-08.
- **Before:** form errors discarded suggestion/report fields; report target selects
  loaded an unbounded catalogue and could omit a directly linked item; catalogue,
  history and feature-flag failures appeared paused or empty.
- **After:** tab-local drafts restore after validation, RPC and rate-limit returns,
  including the selected precise address. Target search is capped at 50 per type,
  treats punctuation as literal text and separately loads a valid selected UUID.
  Search/auth/retry context remains intact. Independent unavailable reads show retry
  and withhold only forms or histories that require the failed data.
- **Dependencies:** existing `submit_community_event`/`submit_report` RPCs,
  Zod/Madrid-time validation, automatic moderation, authenticated access and RLS
  remain unchanged. Draft data is session storage only; no schema or stored-data
  change is included.
- **Evidence:** full Spotlight suite passes 191/191; 55 focused public/draft cases
  cover all read failures, bounded/escaped exact target search, clean zero/empty
  paths and precise-address restoration. Feature-flag state tests pass 3/3;
  TypeScript, scoped lint, formatting and diff checks pass.
- **Rollback:** revert source/tests/docs. Browser session drafts expire with the tab;
  no database rollback or provider replay is required.

## 2026-10-14 | Accommodation and member Passport read recovery

- **Inventory:** BS-05 and PASS-01.
- **Before:** six property-workspace reads discarded errors, so failed inventory
  and reservation reads appeared as zero/empty and failed settings appeared as a
  paused booking mode. Seven Passport reads discarded errors, turning outages into
  zero XP/stamps, empty routes/claims and unsafe start or reward decisions.
- **After:** the active property tab checks its precise dependencies, shows retry
  and withholds its forms when unknown; unaffected tabs stay usable. Passport
  catalogue and personal reads fail independently, unknown totals render as dashes,
  and actions/badges/progress/claim codes remain hidden until required reads succeed.
  Successful empty results remain truthful empty or zero states.
- **Dependencies:** existing server actions, ownership/RLS, inventory overlap and
  capacity rules, booking transitions, reward calculations and enrollment/claim
  validation remain authoritative. There are no schema, grant, data or provider
  changes.
- **Evidence:** accommodation manager cases pass 7/7 and the Account/Passport suite
  passes 64/64, including eight seven-read recovery cases. TypeScript and scoped
  lint pass. Integrated CI, browser suites and exact deployed-source verification
  remain release gates for the final rebased head.
- **Rollback:** revert application/tests/docs; no stored-data rollback is needed.

## 2026-10-14 | Independent operational read recovery

- **Inventory:** AS-17, AS-19, AS-29, AS-30, BS-06, PUB-18, the remainder of
  ACCOUNT-01, and the visible
  outcome/auth-return portion of PUB-09. Review draft retention remains open.
- **Before:** Admin search retained stale accounts and accepted late responses;
  failed moderation mode appeared manual; personalisation RPC failure appeared as
  zero activity plus an unproven migration diagnosis and invented ranking defaults;
  failed venue analytics appeared empty; Passport campaign and venue failures both
  silently became empty arrays, leaving creation decisions based on unknown data.
  Public creator outages appeared as empty directories or missing profiles, and
  review redirects had no rendered outcome or task-specific auth return.
- **After:** search clears on each query, rejects superseded responses and exposes
  explicit retry. Mode, personalisation, per-venue analytics, campaigns and venue
  choices each expose localized unavailable states and retain independently healthy
  content. Confirmed zero metrics remain zero. Missing ranking configuration has a
  distinct truthful state. Passport creation is withheld only when its venue
  dependency is unavailable. Creator directory/profile outages have retryable
  states; literal bounded filters survive retry, true missing profiles retain
  not-found, and review outcome/auth return point to the selected profile.
  Account collections refresh currently readable localized event titles, venue
  names and slugs by UUID while retaining stored fallbacks for unavailable or
  legacy records.
- **Dependencies:** existing administrator/staff/business access guards, tenant
  queries, moderation action, `personalisation_admin_metrics`, `venue_analytics`,
  Passport creation action and server/RLS enforcement remain authoritative. No
  query scope, action payload, mutation, schema, grant, pricing, payment flag or
  customer record changes.
- **Evidence:** focused Admin failure/empty tests pass 24/24, Staff failure and
  moderation tests 40/40, user-search race/retry tests 4/4, and business-loader
  analytics tests 6/6. Creator read/outcome tests pass 7/7 and review action
  return/validation tests 3/3. TypeScript, formatting, the integrated repository check,
  browser CI, Cloudflare packaging and exact live-source verification remain
  release gates for the final rebased head.
- **Rollback:** revert application/tests/docs. No data rollback, replay, provider
  call or migration is required. Authenticated production-role acceptance remains
  separate from fixture evidence.

## 2026-10-14 | Approved workflow continuity batch

- **Inventory:** PUB-10, NAV-01, SUPPORT-03/04, AUTH-04, AS08/09/10/11/13/14/15/33/34,
  BS-26, PASS-02 and the locale-link part of ACCOUNT-01. Current-title lookup is
  completed by the next recovery batch; complete paging/actions remain separately
  tracked.
- **Before:** cards rounded monetary cents; hidden prices leaked into map popups;
  stored locale links ignored current language; failed questions required retyping;
  new replies could be below view; Staff headings clipped/repeated; narrow brand
  words split; stay reservation spans concatenated; several Admin failures appeared
  empty and saves had no acknowledgement; AI failures were hidden when agents
  loaded, zero budget became EUR4, and mixed-author/audience chats were unlabeled.
- **Trace:** shared event formatter -> card/map/detail; existing collection refs ->
  canonical local URL rewrite; shared role-gated WorkspaceShell -> localized labels;
  Staff layout/scoped styles and stay manager styles -> existing controls/actions;
  Support state -> same-origin chat endpoint/provider; authorized Admin loaders ->
  independent read outcomes and guarded existing editors; AI metadata/usage reads ->
  loaded-sample presentation, with authoritative server budget/tool checks retained.
- **Evidence:** 163 focused cases pass, including 36 new failure/retry, exact-price,
  locale-link/navigation, zero-budget and independent-read cases. TypeScript passes.
  Staff/Admin 80, stay-manager 48 and Support 24 real-browser cases pass in EN/ES,
  both themes and responsive/short windows. Strengthened Staff geometry checks
  initially found omitted imported route CSS in the harness; the corrected harness
  uses bundled production styles and preserves the strict padding assertions.
  Full checks, responsive browser/hosted CI and actual deployed-source verification
  remain required before release. No timeouts or assertions are relaxed.
- **Safety/rollback:** code-only; no migrations, RLS/roles, paid activation,
  automatic provider retries or customer-data changes. Revert source to roll back;
  preserve existing stored records and provider outcomes. Authenticated/device
  acceptance remains distinct from component/fixture evidence.

## 2026-10-14 | Approved GUI and workflow release batch

The user approved all upgrades, implementation and live merging on 14 October.
This batch reconciles prepared code onto master `6fb9fae`; it preserves upstream
public-media, catalogue visibility and localized commercial labels. Historical
no-commit limits below describe the preparation stage, not current authorization.
No schema changes or payment activation are included. Fresh current-head checks,
CI and exact deployed source must pass before reporting the batch as live.

- **Request:** audit GUIs, user experience and workflows, list concrete upgrades,
  prepare reviewable improvements, and notify the user before committing anything.
  Public baseline `8613edbd962a978dc3d85f9f7b9aafcc4da54a56`; separate current
  AkiHQ and the older CRM branch are identified independently in the audit artifacts.
- **Before editing:** read mandatory guidance and dependency contracts, inventory
  routes and controls, inspect existing PRs, and record per-domain before/after
  traces. The review distinguishes confirmed defects, proposals, validation gates
  and existing work rather than treating historic release notes as current proof.
- **Public:** map/discovery date parsing disagreed in winter/DST; homepage claimed
  venues showed Unclaimed; contribution actions/auth returns landed in creators
  and lost visible feedback/target. Reuse Madrid validation, render existing
  claim state and preserve validated workflow URLs. Original RPCs, permissions,
  automatic review, map rendering and record selection remain intact.
- **Identity/support:** authentication failures lost safe next/mode. Support's
  modal lacked keyboard containment/restoration and could crop its composer.
  Reuse existing host-specific return allowlists; preserve signup/provider/Terms
  behavior. Add dialog focus/scroll lifecycle and bounded responsive content;
  provider request payload, transcripts and anonymous email fallback remain intact.
- **Accommodation:** Past omitted real completed/declined states; room booking
  discarded validated trip intent; manager/customer statuses exposed raw enums and
  filtered lists lacked feedback. Correct read predicates, editable per-property
  defaults and display labels without altering booking status transitions,
  authorization, capacity, quotes, idempotency, inventory or notification actions.
- **Staff/Admin:** failed reads masqueraded as empty queues/stable operations;
  event search omitted English titles and Manage event opened the venue rather
  than the selected editor. Add explicit localized recovery, safe bilingual
  search and authorized-record selection. City form omitted coordinate fields
  while saveCity substituted Madrid, making name/timezone saves destructive.
  Retain loaded geography coordinates and require explicit validated values;
  preserve the existing administrator check, RPC, audit reason and timezone.
- **Matrix/dependencies:** EN/ES, light/dark, phone/tablet/desktop and short
  windows, authenticated/anonymous/role gates, success/empty/loading/error,
  keyboard, query punctuation, DST, geography response shapes and real action
  payloads. AkiHQ modal/form fixes are in its separate local repository; Android,
  automation and remaining upgrade items have acceptance/dependency plans.
- **Scope/rollback:** no commit, push, PR, deploy, paid activation, provider send,
  live customer-data mutation or database migration. Source changes are
  reversible; stored data and existing server/RLS authorization are preserved.
  Open PRs #103/#133/#136/#140/#143/#151/#152 and legal #8 retain their ownership.
- **Verification at preparation:** focused route/action/component regressions,
  isolated baseline reproductions, peer review and synthetic real-browser
  matrices run locally. Final integrated results and browser limits are recorded
  in the generated review artifacts. Required current-head CI, clean Cloudflare
  packaging, authenticated staging/live acceptance, actual PostgreSQL geography
  readback and physical devices remain separate gates. No production success is
  inferred from a fixture, source change or passing local test.

Final local source checks pass: formatting, zero-warning lint, TypeScript,
1,011 application tests, two database-conflict cases, database safety, 41
automation tests and the ordinary Next production build. The full command
initially stopped at Wrangler's unwritable global configuration directory;
the same automation check (including dry-run) passes with task-local XDG
configuration/log paths, followed by a successful production build. No timeout
or assertion was weakened. A stale fixed-CTA source assertion was updated and
actual EN/ES business-priority behavior is regression-tested.

Focused real-browser matrices pass: Support 24, stay/manager 48, Staff/Admin 80,
HQ dialogs 16 and portal Home 64 combinations. Independent city geography
reproduction passes 27 cases. Separate HQ full checks pass 350 cases with one
existing actual-workbook fixture skip. The broad Account run stopped on a
navigation timeout; its isolated subscription follow-up passes 34 cases and
does not establish the complete Account matrix. Exploratory local development
routes completed 54 of 56 snapshots, with two membership hydration/theme
failures retained for production-run investigation. Final production E2E,
current-head CI, actual protected sessions/device behavior and clean Cloudflare
packaging remain separate evidence. Packaging correctly rejects the uncommitted
candidate under the user's no-commit instruction.

During final review, upstream PR #152 merged at
`7311ae9f6550f9dabf96a39c7782287bbacb303c`. The local candidate reconciles onto
that existing commit without creating a new commit, preserving the map naming
and normal static-asset transport repairs. Original full checks/browser builds
are identified by their `8613edbd` baseline in the review evidence; targeted map
and type checks establish reconciliation compatibility, while current-head CI
and release acceptance remain required after the user's commit approval.

Final nested-dialog review reproduced Support Escape reaching an outer menu's
earlier document/window handlers. Its keyboard listener now owns the capture
phase while open, preventing both menus closing together and preserving the
outer scroll lock. The failing-before/passing-after regression also proves outer
Escape handlers resume after Support closes. All 23 auth/support cases and the
fresh 24-case Support browser matrix pass; payloads and provider calls are unchanged.

Broad production-server acceptance records 143 passed, two local Google-enabled
fixture-setting failures and 29 intentional separate-suite/credential skips.
Both auth contract cases pass after rebuilding the reconciled source with the
intended Google flag. The separate venue/event suite is recorded independently
in the review artifacts, and protected production acceptance remains unrun.

The separate Spotlight venue/event suite passes 28/28 on the reconciled source,
including EN/ES, both themes, responsive layouts, real action/menu/SEO contracts
and strict synthetic-read fixture boundaries. The two corrected auth cases plus
those 28 cases cover the first broad run's setup failures and separate-suite
skips; the single credential-gated authenticated production case remains unrun.

## 2026-10-13 | Recovered claim-picker overlap from PR #97

- Before: `.claim-search-results` used absolute `top: 7.8rem`; additional business-type controls and wrapped headings can place results over the search input. Current master retained the defect despite later claim form releases.
- After: results follow the actual input in normal flex flow, with the existing bounded scrolling and selection/clear behavior preserved. Applies to EN/ES, activity and accommodation searches, both themes and phone/tablet/desktop.
- Dependency trace: `ClaimVenuePicker` -> existing `/api/business/claim-search` and `/api/business/claim-map` -> authorised claim submission. Only results geometry changes; no component/API/RPC/role/SQL/storage/email/billing/analytics/consent changes. Map network and selection semantics are unchanged.
- Regression: real-component browser harness uses disposable search responses, verifies wrapped headings, populated/empty results, input/result/map geometry, list scrolling and selection/clear at six widths in both locales/themes. Map rendering and authenticated production claiming are not covered. Added to existing tablet CI, which retains all its previous steps and artifact upload.
- Validation: pending execution; no merge or deployment claimed. Rollback: revert results CSS and harness/workflow addition, with no data migration.

## 2026-10-13 | Compact memberships with official app brands and sector tools

- **Request:** Reduce excessive desktop/tablet/mobile scrolling and wasted horizontal space; restore the useful sector selector and make packages identifiable by original app marks.
- **Change:** Shared seven-plan catalogue uses a four/two/one-column responsive grid, compact collapsed mobile details, original PWA/brand icons for each product, paired HQ/Business add-on icons and four-icon Enterprise grouping. The six existing business categories highlight tools from the existing `business-packages.ts` Standard/Pro allowlist, with the complete tool list available by disclosure.
- **Dependencies:** `AkiSuiteMembershipGrid.tsx`, module CSS, `business-packages.ts`, existing public logo assets, shared account/public membership entry points, EN/ES and light/dark display.
- **Security and billing:** No checkout enablement, new plans, grants, workspace authorization, Stripe price or database modifications. Business sectors only change marketing previews, never entitlement checks.
- **Regression:** Membership source tests and rendered subscription test updated to expect the six-option business selector; require format, lint, TypeScript, full checks, Cloudflare packaging and responsive account/public and tablet browser acceptance before merging.

## 2026-10-13 | Backlog #119 public shared-media placement recovery

- **Evidence:** merged PR #119 exposed event-uploaded assets in VenueMediaStudio, but its unresolved review identified `venueBySlug`/`venueById` excluding every `/events/` path before resolving explicit placements. Current master still contained both filters; the UI could save a placement which the public reader replaced with another photo.
- **Repair:** retain the ordinary gallery query/filter/window and fetch missing explicitly selected venue-slot IDs separately, constrained to IDs from the target venue's public placements. Both public loaders resolve placements from the union. Existing public-client RLS, storage signing and fallback behavior remain authoritative. Discovery already reads selected placements independently; its private event-bin filter is retained.
- **Matrix:** public venue details EN/ES, event host lookup, legacy ordinary uploads, selected event uploads, media beyond the 60-row fallback window, no own images, missing/deleted/un-signable media, same/cross-venue records. Manager mutation authorization, accommodation media gallery, premium media limits, email, payments and database schema are unchanged.
- **Tests:** actual public repository loader tests exercise both slug and ID paths, explicit event asset display, unplaced event-bin exclusion, authorized cross-venue sharing and inaccessible-asset fallback, signing failure and avoiding unnecessary extra reads. Full CI/production build and authenticated owner placement/live detail smoke remain required for release. No database operations performed.
- **Rollback:** revert application/test change; keep stored placement records and files intact. No migration reversal needed.

- **Health integration:** preserve the merged #150 one-batch signer and all installed-SDK HTTP boundary tests; resolve explicit selected IDs first, then sign the union once. Existing TTL, valid response paths, ordering, fallbacks, public clients and RLS remain. Reconcile the reviewed sparse Spotlight fixture without overwriting other Health changes. Final combined checks and exact-head acceptance are required before release.

## 2026-10-12 | Venue profile media picker usability

- **Request:** Replace the increasingly narrow five-slot image strips with the existing event-style gallery selector in AkiBusiness Profile.
- **Change:** Each venue image slot opens the shared event gallery modal with searchable, paginated, touch-friendly previews. Existing venue image placements and Auto behavior still use the same authorized server actions. The venue-wide library and accommodation gallery remain unchanged.
- **Dependencies:** VenueMediaStudio, event media modal CSS, signed venue media URLs, EN/ES, tablet/phone/desktop, Supabase placement mutations. No schema, storage, permissions, email, payment or public page changes.
- **Regression:** Static venue-dashboard contract assertion added. CI format, lint, types, tests, Cloudflare build and tablet/browser acceptance must pass before merge. Rollback by reverting this UI-only change.

## 2026-10-12 | AkiBusiness shared media inventory (issue #118)

- Requested: Venue Profile, Event Media and Event Library must expose the same venue-owned media, with lightweight browsing by origin.
- Previously: venue profile hid event-path files; events received only their own event-bin files plus venue-origin files. Uploads already persisted into the common `venue_media` table.
- Changed: both editors now receive all signed assets for their authorised venue. The event media picker sees every asset; the library offers All/Venue/Events virtual folders and search. Event association buttons retain the existing `event_bin` placement actions. No data migration, duplicate storage, or automatic publishing is introduced.
- Dependencies: AkiBusiness EN/ES, venue-membership RLS and signed media URLs, venue/event image slots, existing event-bin placements, legacy upload API and server actions, responsive event editor and venue profile.
- Risk: Existing physical-media delete behaviour and signed URL freshness are unchanged; files shared across event and venue surfaces may still need explicit referential deletion protection. Full local build, database checks and E2E remain required before release.
- Regressions: Static contract assertions added to `tests/venue-dashboard.test.tsx`. Runtime checks are not claimed until CI or local execution confirms them.

## 2026-10-12 | Aki Spotlight public venue and event detail layouts

- **User request:** implement the selected **01 / Aki Spotlight** concept for
  both public detail page types across desktop, landscape tablet, portrait
  tablet and phone, then merge the verified result to live. Isolated source
  begins at public `master` commit `c651a69`.
- **Observed:** both detail types inherited the same generic cover/facts/action
  layout. The selected design instead prioritizes venue photography, menu and
  visiting actions on venues, and event artwork, timing, host and booking on
  events. EN/ES and light/dark modes are preserved.
- **Changes:** scoped shared detail chrome, distinct venue/event layout styles,
  accessible venue section navigation with real published catalogue previews,
  compact upcoming events, intact event posters and a clear date ribbon.
  Responsive action bars keep visiting and booking actions available. Shared
  sharing gains a named icon variant, clipboard status and native-cancel/error
  handling; existing text-button callers retain their presentation.
- **Dependency matrix:** public route -> existing repository/published rows and
  media placements -> server-authorized personal/booking state -> existing
  engagement forms, booking routes and catalogue/allergen component. Preserve
  metadata/JSON-LD, custom event location, Madrid start/end dates, external vs
  native booking, cancellation/sold-out gates, authenticated favorites/going,
  premium calendar/offers, loyalty, contact and accommodation redirect.
  The concept's sample opening hours and imagery are not production data.
- **Boundaries:** no SQL/RLS, API, credential, storage upload, production record,
  billing/email or other portal redesign. CSS is scoped to these public detail
  pages. Revert the source change for rollback; no data restoration needed.
- **Verification:** focused route/component and sharing tests, full repository
  check and Cloudflare package, plus the mandatory `test:spotlight:browser`
  command in tablet CI. The browser harness serves disposable read-only
  Supabase-shaped responses through the real Next routes; empty default
  fixtures cannot exercise venue/event detail. Detailed acceptance and release
  evidence is maintained in `docs/SPOTLIGHT_DETAIL_REDESIGN.md`. Full check
  passed with 623 tests and the production build; dedicated acceptance passed
  all 28 cases. The broad legacy suite was diagnostically interrupted after
  repeated obsolete-selector timeouts and is explicitly not green. Final
  browser/package, CI and live proof are recorded in the release document.

## 2026-10-12 | AkiPals companion playground and playable arcade

- **User request:** six specialist roles to improve the existing `/pals`
  interface, original characters/outfits, game progression/interactions,
  minigames, integrated supervision and QA, then merge the verified result to
  live. Work starts from public `master` at
  `554aeca23724e5049b4def403c48119e4f8b8f35`.
- **Observed:** live anonymous `/pals` correctly returns the private team
  sign-in gate. Source had English-only standalone nonce HTML, ten families,
  61 designs, banked parcels and ten choice stories. A story-card string
  precedence error could omit the card body and Start action; the interface
  rewrite repairs it while retaining all existing story choices.
- **Changes:** dark/light responsive collector studio, distinct vector faces
  and garment silhouettes, ten curated styles from stable existing IDs,
  wardrobe search/collection filters, care and permanent bond ranks,
  daily/weekly activity bonuses and two interactive arcade puzzles. Games
  validate bounded move transcripts server-side; rewards use existing account
  authorization, version checks, command UUID and `pals_commit` transaction.
- **Compatibility:** `journey` and arcade state are optional schema-1 fields.
  Existing equipment, appearance, entitlements, achievement trophies, maps and
  saved progress survive. Care rewards are once/activity/UTC day; completed
  but unclaimed journey bonuses remain available across period boundaries.
  No new SQL schema, service, external asset, currency purchase, invitation,
  public/social map exposure, auth role or production data backfill.
- **Dependency matrix:** isolated route -> preview shell/client/styles ->
  authenticated API -> engine/journey/arcade -> existing own-account JSONB
  save and command ledger. Art also feeds the existing opt-in marker. Other
  AkiSuite portals, bookings/claims/email, billing, analytics consent and
  discovery/SEO behavior are unchanged. Private response release marker
  `2026-10-12-playground-r1` lets the live smoke wait for this rollout.
- **Verification:** focused API tests exercise authorization, forged fields,
  stale versions and ambiguous committed-response replay. Disposable PGlite
  executes the existing save migration to verify own-row reads, denied client
  writes/commit, schema-1 extension persistence and duplicate/stale commands.
  Read-only live catalog inspection confirmed both existing saves are schema 1
  and `pals_commit` remains service-only with RLS on all three preview tables.
  All 15 Pals browser scenarios passed (32 completed games; 298 requests,
  297 commits), along with the 603-test repository check, clean Cloudflare
  packaging and Worker dry-run. The general site E2E suite is not green in
  the local fixture environment; two stale-selector failures reproduce with
  identical errors on untouched `master`. No unrelated tests were weakened.
  See `docs/AKIPALS_RELEASE_20261012.md` and the release PR for complete checks,
  remaining broad-suite limitations, CI and observed deployment evidence.
- **Rollback:** application revert; retain saves, inventory, entitlement and
  command history. No data deletion, reward replay, access relaxation or
  migration rollback. Authenticated live gameplay still needs a valid preview
  session; local test adapters never stand in for that evidence.

## 2026-10-10 | Staff operations overview includes pending ownership claims

- User-visible defect: the Staff operations hero, publishing queue badge and “por revisar” stat displayed 0 even while Moderation → Reclamaciones showed a pending venue claim.
- Cause: Staff homepage queried pending venues/events/community but omitted `venue_claims` entirely (and separately omitted pending offers), while Moderation queried the privileged, paginated `staff_pending_venue_claims` RPC.
- Fix: staff-only `staff_pending_venue_claim_count()` RPC with the same pending/venue/profile join and authorization; add offers to overview counts, explicit claims metric, direct claims shortcut, and responsive 4-metric grid.
- Completeness: any failed/null moderation counter gives an unavailable total rather than a false “all up to date”. Publishing queue shortcut goes straight to claims when claims are the only outstanding work.
- Security/data: aggregate-only count, moderator/administrator gate, schema-qualified private data, revoked PUBLIC/anon execute. Existing claimant contact details, decision workflow, notification emails, memberships and queued records unchanged.
- Validation: PGlite suite verifies count matches paginated claim RPC even with >20 records and denies anon/consumer/business roles; unit tests cover claims/offers and unknown counts; EN/ES labels share the same source. Pending release checks before merge: TypeScript, lint, Vitest and browser/Cloudflare acceptance.
- Deployment: public AkiPasa branch `master`, Supabase SQL migration before UI publication; verify count against real pending queue. No data backfill or schema column rewrite.

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
- Integrity: resources belong to their venu…25588 tokens truncated…ate AkiHQ PR #25 provides matching nav link.
- **Dependencies:** `billing_subscriptions`, `billing_customers`, `staff_billing_grants`; opt-in new AkiSuite table via `AKISUITE_SUBSCRIPTIONS_READY`, authenticated RLS, `openBillingPortal` server action, host-local EN/ES routing, workspace navigation, membership styling and account error/retry states. No direct Stripe charges or database mutations.
- **Release checks:** typecheck, formatting, unit + UI, EN/ES, phone/tablet/desktop, paid/legacy/missing-data grants, Customer Portal click and rollback smoke. The plan UI must not offer unavailable Premium benefits as purchasable.
- **Rollback:** revert hub and page integrations; leave existing customer subscriptions and Stripe products untouched. AkiHQ nav-only PR can revert independently.

## 2026-10-12 | Workspace Premium implementation and gated catalogue release

- **Scope and dependencies:** seven-plan catalogue and all EN/ES membership aliases across public AkiPasa, Business, Duermo and companion HQ; authenticated billing customer/subscription/grant reads; workspace ownership and existing member role templates; signed Stripe webhook, price allowlist and server Checkout; event/recurrence/moderation tables; shared private storage/media; consent-derived analytics; existing five-minute Cloudflare cron and release marker. Current master design and booking/room-night systems are retained.
- **Behaviour:** catalogue remains visible with checkout off. New ledger is workspace-scoped for business plans, customer read-only/service-write, chronology and ownership protected. Legacy billing/grants/free management remain authoritative. Superseded sales close without cancelling existing subscriptions. Replacement updates an existing Stripe item through hosted confirmation; ambiguous consolidation is refused. SQL checks enforce recurrence, template, media and report access. Recurrence uses IANA/DST exceptions/cancellation and duplicate constraints. Approved-content scheduled publishing and conditional add-on renewal use bounded service jobs.
- **Retention/security:** 15-image free workspace/250-image Premium allowances and fair-use bytes apply to future uploads only; existing content/files remain after downgrade. Storage accounting and folder tenancy are server-enforced. Consumer Enterprise access never propagates to employees; HQ tools retain role-template restrictions. No Stripe identity/tax registration or production schema changes were performed. All five activation flags and private database launch default false.
- **Evidence:** initial full check exposed an unused variable and old-tab tests; fixed and rerun. Focused AkiSuite SQL/RLS/render/routing/billing suites passed 76 tests. HQ full check passed 339 with one existing gated skip. Full check/package and remote CI outcomes are recorded in the PR. Local browser launch is blocked by OS socket denial, not a screenshot success. Earlier CI clipping and pricing expectations were investigated and repaired; action_required is unvalidated. Sandbox provisioning requires sign-in. Production baseline still has legacy membership and plural alias 404s.
- **Release limitations:** actual tax registrations absent; product tax codes unset and price tax behaviour unspecified; legal invoice/profile/descriptor reconciliation required. Disposable tests are a bounded schema, not a full production clone. No production migrations, actual sandbox charges, authenticated portal acceptance or live rollout claimed at this checkpoint. Disable checkout/feature/private-launch flags and revert source for rollback; retain customer data and legacy subscriptions. See the rewritten rollout contract for exact activation gates and outstanding checks.

- **CI follow-up:** the first current account browser run reached subscription rendering and then timed out on its old Business tab selector. Replace the interaction with seven-plan/annual payload checks and assert that disabled catalogue forms remain visible during billing errors. The actual ten-page browser bundle compiles. Updated shared-media checks deny new cross-venue reuse after downgrade while retaining existing placements; owner deletion checks every referencing venue through an authorised RPC. The publication worker now preserves both legacy Business tiers and staff grants without requiring a linked new workspace. New CI evidence remains required before merge.

- **Additional acceptance:** real SQL tests exercise AkiDuermo confirmed-night comparisons, retained cross-venue media after downgrade, global reference protection, conditional renewal queue and authenticated employee role-template restrictions. Account exports add only the payer's new billing rows and only after the schema-ready flag. Public CI's lone catalogue failure was an ambiguous Premium/add-on heading selector; exact heading matching retains both visible plans. HQ entry and offline-cache versions refresh the new navigation for existing installations. Full current checks and browser CI remain release gates.

- **Storage/billing enforcement:** restrictive Storage INSERT/UPDATE checks count physical objects and protect byte limits; Storage DELETE checks all shared references, and placement writes serialize against deletion. Gated public reads retain selected artwork and the existing fallback while protecting private bin contents. Policies use authorised definer wrappers, never direct calls into the revoked private schema. A staff grant or trialing Pro retains its legacy access but cannot qualify for a discounted paid add-on. Disposable tests exercise actual authenticated/anonymous roles and direct Storage writes, not just disabled buttons.

- **Release checkpoint:** HQ #26 merged at `21843db608932eea46d1e83d82b8481ee19b5767`; live bundle v36 and cache v110 verified. AP checkpoint passed repository/Cloudflare, tablet, booking and Pals CI; updated account/public browser selectors still require fresh CI. Workspace-wide media/template reuse requires explicit active company membership as well as venue rights; existing assigned assets remain usable after downgrade. Approval fingerprints now use SHA-256, and already-verified venue drafts can be scheduled without briefly publishing them first. Rollback after accepting any new payment must retain its billing adapter/jobs.

- **Production compatibility preflight:** zero current legacy recurrence rules. The connected `postgres` role is not a superuser or member of the Storage table owner (`supabase_storage_admin`); hosted policy-management permission remains a concrete disposable-schema validation requirement. No production DDL attempted to probe that permission.

- **Membership compatibility:** preserve origin through public/account sign-in redirects, permit named HQ workspace preparation without requiring a venue, and reject new-plan webhook customer-map reassignment. No global HQ profile upgrade or implicit venue verification.

Responsive catalogue screenshot review also corrected Spanish add-on wording and preserved whole words in compact disabled purchase buttons.

Live membership smoke verification found that the parent account layout replaced the subscription destination with the account root before page authentication. A server-derived, same-locale membership return header now preserves subscription/from through sign-in and terms acceptance; middleware removes caller-supplied headers, and unrelated account routes keep their previous return behavior. Regression coverage includes the actual layout guard, spoofed headers, and signed-out EN/ES browser aliases.

2026-10-13 membership presentation refinement (PR #129): Public AkiSuite pricing retains all seven plans and the existing checkout eligibility, amounts, intervals and entitlements. Compact two-column mobile cards and wider responsive desktop comparison reduce vertical card height; the billing-period switch and sector-specific AkiHQ tool exploration now follow the plan catalogue. Business categories only change displayed tools, never granted access. Billing/migration readiness flags remain unchanged. Validate responsive overflow, screen-reader disclosure state and locale-aware prices before production promotion.

2026-10-13 AkiSuite membership width/overlap follow-up: The membership-only shell now uses available desktop/tablet viewport width up to a 1720px bound while keeping responsive gutters. Catalogue cards reflow across wider screens, and the Enterprise card brand/header badge can wrap without label collision. No subscription billing, entitlement, feature flag, migration or checkout change. Validate EN/ES membership layouts on mobile, tablet and desktop.

## 2026-10-13 | Recovered Stripe tax-audit follow-up (#127)

Read-only live revalidation confirms the same approved account `acct_1SVLH2GfzDhsgsQZ` now displays AkiPasa Marketing S.L., all fourteen AkiSuite prices use inclusive tax behaviour, and all seven products have tax codes (AkiPasa Premium `txcd_10103000`, others `txcd_10103001`). Stripe Tax registrations remain absent. Technical classification and account display name do not establish legal identity or VAT approval. `docs/AKISUITE_PRICING_ROLLOUT.md` and the checked-in price audit must describe the same observed state; the obsolete unspecified-tax update instruction is removed.

The linked Supabase project's read-only schema probe found neither `public.akisuite_billing_subscriptions` nor `akisuite_private.launch_settings`. The two new migrations, hosted Storage DDL compatibility, legal registration, isolated payment lifecycle acceptance and authenticated portal validation remain release blockers. No flags, prices, products, registrations, subscriptions, permissions, schema or production data changed. Historic release-test claims remain dated evidence, not new validation. Documentation rollback is a source revert.

## 2026-10-13 | Exact source deployment verification

- Before: Booking live smoke accepted the constant October 9 feature marker and reported a hardcoded historical application commit, allowing success before the triggering source deployed.
- Change: successful clean-Git Cloudflare packaging writes an ignored asset source stamp. Existing read-only Worker release JSON resolves only the internal ASSETS binding and reports validated full source SHA or null. Smoke polls four public hostnames for the triggering GitHub SHA and original booking marker.
- Dependencies: `scripts/run-cloudflare.mjs`, source-stamp utility, Worker endpoint, ASSETS and booking-live workflow. No customer state, migration, billing/tax flags, auth, locale/theme/UI, email or external credentials change. Revert code/assets to roll back.
- Validation: targeted tests exercise clean/dirty Git, invalid stamp, exact current-host asset reads, legacy/missing/error responses. Full checks, packaging and connected production evidence remain required; none is implied by this entry.

- Review follow-up: remove the master-push path filter so every connected deployment, including dependencies/assets/config changes, receives exact-source verification.

### 2026-10-13 | Recovered venue media picker review defects

Unmerged PRs #121/#122 contained review findings still present after #123: search/folder controls consumed the gallery scroll row, and the modal lacked keyboard focus containment, Escape dismissal, restoration and slot-specific trigger names. VenueMediaStudio now groups controls into one intrinsic row and empty/results into the scroll row, with dedicated CSS preserving the event editor modal. EN/ES triggers identify the image surface; opening resets filters, focuses search, traps keyboard/programmatic focus and closing restores the opener. Existing upload/placement/Auto actions, permission checks, media inventory, accommodation header, event editor, billing and SQL remain unchanged. Rollback is code-only. Component regression tests exercise actual focus wrapping, Escape/close restoration, filter reset and variable-content DOM rows in both locales. Full check, responsive browser/Cloudflare CI and authenticated live owner acceptance remain required before deployment; no live storage/data mutation or deployment is claimed.

## 2026-10-13 | Recovered picker browser gates

Tablet CI now runs `test-claim-picker-browser.mjs` and `test-venue-media-picker-browser.mjs`. These exercise real components/CSS with disposable actions; no production records are changed. Local browser downloads failed; actual browser execution remains a CI release gate.

## 2026-10-13 | Recover current authority from historical handoff links

- **Observed:** README instructed new sessions to start with the July handoff
  and described August project status/July TODO as current. Those records
  retain historical prices, pending migrations and inconsistent acceptance
  boundaries, while the October master already identifies them as stale.
- **Change:** point README to AGENTS/master and add prominent historical
  notices to AI_HANDOFF, PROJECT_STATUS and TODO. Preserve their dated content
  and link current impact/billing evidence instead of marking old tasks done.
- **Scope:** documentation only, across all readers/portals. No runtime,
  locales, roles, database, storage, analytics, CI or production settings
  change. Rollback is a source revert with no customer-data impact.
- **Validation:** review Markdown links against tracked files, preserve the
  historical file bodies, check formatting and whitespace; CI remains
  authoritative for required PR checks. No application or live workflow was
  tested by this documentation change.

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

### 2026-10-13 | First-visit privacy dismissal restores stay filter access

- **Observed:** current-head CI failed four 390px EN/ES × light/dark AkiDuermo consumer cases at the normal Hotels click: the initially visible privacy aside intercepted the map filter after dock-clearance repair. Existing consent-version cookies in layout tests had not exercised this first-visit state.
- **Change:** `PersonalisationConsent` adds localized Close, Escape from panel controls, a labelled expanded/controls trigger and focus restoration without scrolling the page. A dedicated CSS module keeps the heading readable and Close at 46px minimum height without changing shared global styles. Dismissal only hides the panel and preserves drafts, persisted permissions, denied defaults and the existing save/error path. It does not set the consent version, POST, request motion, grant telemetry or permanently suppress the initial prompt.
- **Dependencies:** shared root privacy controls across AkiPasa/Business/Duermo, Passport portal trigger, EN/ES reactive locale state, cookie-backed `privacy-consent`, on-device motion preference, ConsentAnalytics and the existing consent API; account settings event reopening still reloads its saved preferences as before. No server/schema/RLS/Storage/auth/payment/email/map-instance or production-state change.
- **Acceptance:** four new component cases plus all seventeen existing consent cases; eight existing guest-route cases now exercise the actual first-visitor panel, checkboxes denied, normal Close/focus, no consent cookies/POST, and normal search/map Hotels interaction. Do not force clicks or prepopulate consent to pass this regression. Full suite/browser/short-window visual/Cloudflare/current-head CI and deployment verification are pending until evidence is recorded.
- **Rollback:** revert source and tests; no data migration or replay. First-visit obstruction remains release-blocking until final-source browser acceptance passes.

## 2026-10-14 | Measure claim-picker geometry in one rendered state

- Before: the empty-text assertion could pass before the search effect set loading, while separate geometry reads crossed renders. The copy height changed by 19.1875px between reads, reproducing the exact false -2.1875px overlap.
- Cause/evidence: actual unchanged component snapshots show 17px results/map separation in transient-empty, pending and settled-empty states; no same-frame CSS defect was established.
- Change: exact query/vertical response readiness, spinner absence and atomic DOMRect sampling; held-response tests cover loading and settled-empty separately. Actual input bounds are now checked alongside every unchanged label/result/map/overflow inequality.
- Paths: scripts/test-claim-picker-browser.mjs. API, map, actions, EN/ES, themes and all existing 24 cases/two verticals/24-row scrolling/natural selection/clear remain. No application, schema, role, email, billing, consent or production data changes.
- Validation: 24/24 browser combinations, 144 atomic snapshots, minimum input gap 13.59375px/map gap 17px, 48 natural last-result selections and clears; representative captures, scoped ESLint/Prettier and diff checks passed. Required integrated check, tablet/public/Cloudflare CI and live acceptance are not inferred from these local results.
- Rollback: source revert of the harness. Coordination: #131/#132; do not independently take over Cleanup #143/#136.

## 2026-10-14 | Isolate customer AI context and effective tool execution

Actual gateway and installed-client fixtures reproduced two boundaries: same-account operator messages entered later customer prompts, including after role demotion, and an unsolicited provider call executed an agent-permitted tool despite the request advertising no tools. History now filters audience before ordering/limiting while retaining actor, agent and user/assistant filters. Untagged legacy history remains operator-only. Customer history additionally requires context version 1 because earlier customer replies could already contain echoed operator context; fresh customer messages and replies carry that version. Historical customer context restarts without rewriting or deleting records. Operator legacy behavior stays compatible. Execution also requires the effective advertised tool set before existing permission, validation, approval and audit checks.

Thirty-two focused cases, TypeScript, scoped ESLint/Prettier and whitespace checks passed. Inert base-to-persisted-state-to-patched replay confirms old customer replies cannot re-enter; fresh multi-turn context, JSON audience/version negatives, latest-message filtering, budgets and allowed-tool approvals remain covered. No real provider request, database migration, role grant, mail, paid activation or production write occurred. Existing admin-authorized dashboard mixed-history display is a separate presentation gap. Full integrated/Cloudflare/browser/current-head CI and exact deployed-source verification remain release gates. Rollback is a source revert; existing stored rows remain intact.

Dependencies: `/api/support-agent/chat`, operator AI routes/schedules, shared gateway/provider/tool executor, service-only chat and budget tables, existing actor authorization and EN/ES customer instruction selection. No new endpoint, schema, permissions, entitlements, pricing or model contract. Independent one-cycle review found no surviving gateway bypass; its fixture and persisted-state feedback was incorporated and directly verified. Coordination: Health #132 / Cleanup #131.

## 2026-10-14 | Public venue signing request reduction

Both public venue loaders signed photos one request at a time. A shared signer now deduplicates requested paths and uses one createSignedUrls batch, retaining the 3600-second TTL, original media order/IDs/localized alt text, existing cover selection/fallback and published/venue-only selectors. Only requested, successful batch entries are used; denied, missing and unknown paths cannot become images. Empty media performs no signing request. A failed batch returns the existing missing-media fallback rather than retrying every asset. There is no shared signed-URL cache or permission/bucket change.

Installed-SDK HTTP fixtures pass 44/44 repository cases, including 14 new boundary cases. Each direct loader changes signing calls from 60 to 1 and 12 to 1; empty remains 0. This measures request counts, not field latency or CWV. Historical Storage 400s were signed-object GET downloads, not signing POSTs, so this optimization is not claimed to remediate those errors. Public browser fixtures already support the batch endpoint. Scoped lint/format/diff checks pass; full current-head checks, Spotlight browser acceptance, Cloudflare package and exact deployed-source verification remain required. Rollback is a source revert with no data rollback. Cleanup #136 shares repository.ts selected-media code; reconcile that reviewed change after the serialized Health release, retaining both behaviors.

Dependencies: hybrid Supabase public venueBySlug/venueById loaders, venue/event details, event-media bucket and installed Storage SDK, preserved published-row filters and EN/ES metadata. Static/mock providers, row selection, roles/RLS, expiry, uploads, booking, billing and consent are unchanged. Independent QA source/test review found no blocker. Health #132 / Cleanup #131.

## 2026-10-14 | Pin runtime fixes and guard MapLibre attribution artifacts

The runtime audit identified six affected packages. Next and its ESLint configuration are pinned to 15.5.27, PostCSS to 8.5.23 with nanoid 3.3.18/source-map-js 1.2.2, and Sharp to 0.35.5. MapLibre remains exactly 5.12.0 because the fixed major release changes worker/ESM/WebGL contracts; its upstream PR #8189 attribute-removal fix is applied narrowly to DOM source and all four distributed map bundles. Snapshotting attributes prevents adjacent unsafe attributes from being skipped. Existing worker, CSS, license, map API and WebGL behavior remain byte-identical. Patched bundles stop advertising their stale upstream source maps; remaining map files are not valid patched-source debugging evidence.

Postinstall validates exact package version/license/runtime entry and all pristine/patched SHA256 fingerprints before writing, rejects unknown/missing/mixed installs, and is idempotent. Build, Cloudflare build, development and check refuse unpatched artifacts. Twenty-nine inert native AttributionControl/metadata/failure tests pass, covering each bundle, consecutive/nested attributes, safe OSM credits, source metadata updates and package-entry overrides. A clean lifecycle-enabled install applies the backport and full repository checks/build pass; final integrated checks and native browser/Cloudflare/current-head CI remain gates. The runtime audit falls from six package flags to one version-based critical MapLibre flag; npm does not understand the verified local backport. This flag is explicitly retained, not waived or claimed absent. Dev-tool findings are outside this focused runtime repair.

The unchanged upstream sanitizer still permits iframe srcdoc in inert tests. No ordinary user-controlled style/attribution input was found; external configured tile/style providers remain a separate trust/hardening risk, with no production exploit or script execution demonstrated. Independent one-cycle review found no adjacency blocker and identified the runtime-entry guard, which is incorporated and directly regression-tested. No production data, SQL, role, payment, email, analytics or service configuration changes. Source/lockfile revert followed by a clean reinstall is rollback; restoring vulnerable versions requires security review. Physical Android/iOS/WebGL1 acceptance is unperformed.

Dependencies: public Next server/browser build, OpenNext1.20.2 worker packaging, Tailwind/PostCSS compilation, Node image processing, ProductionMap/StayMapPage attribution, npm lifecycle/checks and release-source packaging. OpenNext peer compatibility is declared; successful actual package/dry-run evidence remains separate. Node/image advisory reachability is not inferred as a demonstrated production Cloudflare exploit. Coordination: Health #132 / Cleanup #131, stacked source prerequisites only.

## 2026-10-14 | Shared native geolocation accessibility and browser static transport

- **Requested/observed:** Health continuation owns two shared failures reported by Cleanup. Public UI run 38492216310/job 115619854895 reports a visible disabled unnamed native geolocate button on /es/map. Run 38491307253/job 115616882352 reports route.fetch socket hang up for the real compiled CSS asset while opening AkiDuermo EN/dark/390 auth. Each run retains 144 passes and 29 intentional skips; neither is a full acceptance pass.
- **Established map cause:** installed MapLibre 5.12.0 creates an icon-only disabled button synchronously; its permission-support promise later supplies title and aria-label. Holding that promise reproduces the exact failing HTML. The application now supplies a localized initial name through a native-control subclass onAdd boundary; native permission settlement updates supported/unavailable names and state normally. No observer, polling or extra geolocation call.
- **Map dependencies:** src/lib/map-geolocation.ts, ProductionMap and ClaimVenuePicker; AkiPasa EN/ES map, AkiDuermo /map and AkiBusiness activity/accommodation claims. Original control options, initial-location logic, camera, viewport/cache/filter/discovery contracts, authorization, native onRemove and guarded attribution vendor artifacts remain. Native tests are included in the existing npm test command.
- **Transport change:** three host-forwarding browser fixtures bypass only /\_next/static/ through route.continue. Middleware already excludes this compiled asset namespace; actual CSS/JS bytes, status and headers still come from Next. HTML, RSC, auth, manifest, dynamic /pwa-icon.svg and API behavior retain original forwarding/fixtures. No retries, timeout changes, swallowed HTTP failures, permission bypasses or relaxed acceptance. The original CI socket reset is recorded, not attributed to an unproven application/server cause.
- **Ownership/safety:** separate Health integration branch based on public master 8613edbd. Cleanup #136 selected-media and #143 catalogue deltas remain untouched. No SQL, RLS, grants, linked data, billing activation, provider mail, session cookies, analytics/consent changes or GSC work. Root coordinates docs and exact-head gates.
- **Verification/status:** see docs/HEALTH_SHARED_CONTROLS_20261014.md for native/HTTP evidence and exact limitations. Hosted public/tablet/Spotlight, full checks and clean Cloudflare packaging remain required before merge; no deployment is implied. Local browser confinement is distinct from application failure. Real account-role/room-night/device/printer acceptance and commercial release holds remain.
- **Rollback:** revert application helper/call sites and test transport changes. No production data rollback or migration is needed.

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

## 2026-10-14 | AkiBusiness events grid, image dialog and claimed listings (#167)

Scope: AkiBusiness EN/ES event catalogue, desktop/tablet/mobile grid and pagination; image-slot selection and keyboard access; public venue claim gating plus secure claim submission; database `public_venue_is_claimed` function; GitHub build cache. Safeguards: existing roles, event mutations, image storage permissions and claims approval are unchanged; existing ownership records are authoritative without requiring owners to edit listing data. The RPC migration is mirrored in `database/migrations/` and `supabase/migrations/`, recorded on Supabase ref `vhpbvcfkcteswlsdjrfl` as `20261014143947_public_venue_claim_ownership`, and verified by read-only inspection of its definition and grants. The repository runbook maps this ref to production, but the connected Supabase project listing labels it `AkiPasa Development`; confirm the deployment role before claiming production application. Regression evidence: `tests/business-event-workspace.test.ts` covers nine-item pagination/reset, bilingual current-group labels, EN/ES/responsive grid and accessible filter state, plus media-dialog keyboard containment and focus restoration. Local `npm run check`, exact-head hosted CI, Cloudflare build, browser acceptance and live-release smoke passed. Merge conflict resolution retained both the #167 entry and all newer master entries in this register and contract. Rollback: revert frontend changes after verifying migration compatibility; do not delete approved ownership memberships or claim records.

## 2026-10-14 | Historical #103 Passport frame recovery

- **Before editing:** current master `8613edbd` PassportBook unconditionally reschedules requestAnimationFrame and writes every foil property while visible, even when idle. Existing draft #103 at `aef15f534ca68051d1bed5828ffddee486614a03` contains a bounded demand-driven helper. Latest coordination issue #131 reserves this scope independently of active Health and billing work.
- **Dependencies traced:** PassportBook surface refs/page/city effects, pointer handlers, sensor calibration, foilTarget/foilProperties, passport-motion preference/permission events, reduced-motion media listener, visibility lifecycle, CityStamps and existing Passport Playwright suite. EN/ES and all roles share this client surface; data/RPC/awards and server access remain unchanged. Theme/CSS/layout, locale navigation and auth caches are not edited.
- **Recovered change:** retain original interpolation and optical mapping, stop when target settles, deduplicate pending frames, cancel hidden/unmounted work and wake for input/recenter/new surface. Only the Passport scheduler hunks/helper are recovered; the old draft's NavigationLink and every other feature are excluded. Existing optional motion permission and revocation remain authoritative.
- **Regression evidence:** deterministic scheduler tests and real-component tests exercise idle settling, both locale sensor controls, hidden input/no frames, visibility recovery, recentering, reduced motion, motion revocation, pointer fallback/leave, foil off/on and chapter changes. New tests run through the existing mandatory subscription suite. Baseline reproduction and final results are recorded in the focused PR. Fixture clocks prove scheduling behavior, not physical frame rate or battery gains.
- **Release limitations:** full check/build and existing public Passport browser CI must pass on the final candidate; authenticated live and physical gyro acceptance remain separate. No production action, permissions, storage, billing, email, analytics, database or customer data changed. Revert these source/test additions to roll back.

- **Validation checkpoint:** the unchanged master component fails all six new component regressions because one frame remains queued after 100 ticks. Recovered helper/component tests pass 8/8, independently repeated by another reviewer with no blocking findings. Scoped ESLint/Prettier pass. Local full check/build is deferred due simultaneous Health/billing builds; hosted full check, Cloudflare packaging and public Passport browser checks are mandatory before merge.

## 2026-10-14 | Public membership account handoff

The public catalogue has no authenticated owned-workspace or entitlement context. Its ready plan CTAs now navigate to the existing same-locale account subscription hub with the allowlisted originating app, rather than posting a workspace checkout without a workspace. Authentication and terms use the existing middleware/account return path; the account still loads authorised workspaces, exposes existing setup and requires a separate final purchase. Public closed gates retain seven disabled Coming soon buttons. Account workspace purchases are disabled until a workspace exists, with EN/ES setup guidance; personal purchases, included/access-error guards and selected-workspace add-on eligibility remain intact.

Dependencies: public/Business/Duermo aliases and HQ origin, shared catalogue, account layout/auth/terms, gated owned-workspace RPC/setup, existing checkout server authorisation and Stripe safeguards. No server billing action, entitlement, readiness flag, price, migration, live service call, analytics or customer-data change. Five new rendered regressions fail against the original grid; all 18 focused rendered/UI/checkout cases pass after the patch. Full check, current-head CI/browser/Cloudflare and authenticated acceptance remain pending. Rollback is a source revert; paid rollout remains blocked by the separate legal/tax/schema/lifecycle gates.

Validation follow-up: full check passed formatting, lint, TypeScript, all application suites (855 tests including AkiSuite 114), database safety and two conflict tests, then stopped because the isolated automation workspace lacked Hono dependencies. After installing that subproject from its lockfile, automation checks/dry-run passed; the production build is being checked separately. The existing account browser workflow now includes eight ready/closed public-handoff cases (EN/ES, both themes, 360/1536px), actual anchor target/text geometry, account navigation with zero checkout actions and disabled closed gates. Its disposable bundle compiles. Local Chrome cannot launch because ProcessSingleton socket() is prohibited; geometry assertions and screenshots must pass hosted CI before acceptance. Scoped anchor CSS shares the existing button dimensions. Independent source review found no functional/security blocker; neither hosted browser execution nor payment acceptance is claimed.

Hosted handoff follow-up: run 38500939403/account job 115647472508 passed the pre-existing matrix but stopped before the new geometry assertions. Expanding a card changed its accessible button name, shrinking the live name-filtered nth locator set and making nth(4) disappear. The harness now iterates stable article containers and explicitly verifies false-to-true aria-expanded per card. All eight cases, CTA geometry and zero-checkout assertions remain unchanged; no production source or timeout change. Fresh hosted execution remains required.

## 2026-10-14 | Recovered lazy owner toolbox (#103)

The owner-only launcher previously imported the full toolbox, achievement scopes and Pals engine before activation. The bounded recovery extracts the current panel intact and dynamically imports it only after a click or Ctrl/Meta+Shift+O. Saved appearance still applies immediately. Concurrent activations share the pending load; an EN/ES busy/retry trigger retains the existing responsive class and accessible name; late completion after unmount is ignored. Once loaded, the panel remains mounted so Escape, outside-close and reopen preserve its existing state. The locale layout's server has_owner_console gate and every owner/award action remain unchanged; lazy delivery grants no authorization.

Eight focused cases cover import deferral, immediate appearance, mouse/keyboard activation, pending deduplication, failed-load retry, unmount and actual panel state across close/reopen in EN/ES. These are component/module-boundary evidence, not live bandwidth or authenticated acceptance. No CSS, auth cache, route, SQL, data, rewards, billing, email or consent changes. Current-head full checks, production/Cloudflare packaging and required CI remain release gates. Rollback restores the original eager component; no data restoration.

## 2026-10-14 | Parallel tablet acceptance jobs (#169)

Scope: GitHub Actions tablet workflow only. Existing tablet route, AkiDuermo route, portal smoke and layout/Spotlight tests remain required; route suites run with two workers in a separate job, other suites run concurrently, and stale same-PR workflow runs are cancelled. Evidence artifacts use distinct job names and `tablet-ui` remains the required check. No app, database, permission or test assertion changes. Validation: an initial hosted run failed the contract documentation gate; this entry and the master contract update address that failure. Fresh exact-head checks must pass before merge. Monitor parallel runner pressure; reverting route worker count to one preserves job concurrency.

## 2026-10-14 | Remove unavailable duplicate Wrangler job

Scope: remove the added GitHub Actions Wrangler deployment workflow after its Cloudflare build succeeded but deploy failed because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` resolve empty in repository and `automation-production` scopes. The existing connected Cloudflare release published commit `31c643a6ecf8bd618b5e7f86ebb178da9102ab3e`; read-only live smoke passed with that exact source SHA and confirmed AkiConduzco's root, map, robots and sitemap return HTTP 200. This cleanup removes a duplicate failing job only; no app code, database, auth or customer data changed. Rollback is to restore the workflow after valid Cloudflare credentials are configured.

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

## 2026-10-17 | AkiSuite shared icon identity alignment

- **Before:** AkiConduzco legacy navigation had a car illustration, and the
  shared product switcher could show a stale blue AkiHQ PNG.
- **After:** both use the same pin-and-spark geometry as the existing consumer
  AkiPasa mark, with hot-red/black/white for AkiCoches and black/gold/white
  for AkiHQ. AkiPasa, AkiDuermo, and the AkiBusiness purple AB are unchanged.
- **Scope:** public SVGs, legacy AkiConduzco manifest/theme colour, and the
  shared portal switcher's AkiHQ SVG reference. No PWA IDs, financial flows,
  auth permissions, schema, events, venues or booking behaviour change.
- **Checks:** CI typecheck, tests, browser and tablet acceptance, installed
  icon visuals, and release-source fingerprint checks. Rollback is a source
  reversion with no customer data action.

## 2026-10-17 | AkiPasa production brand release gate

- **Before:** merging cross-suite branding did not advance the live AkiPasa Worker.
- **After:** the `master` push workflow verifies tests and exact-source builds,
  requires matching existing Cloudflare Worker/domain bindings, and verifies
  deployed release fingerprint and shared SVG colors over HTTPS.
- **Scope:** GitHub Actions and deploy validation script only; no public AB logo
  changes, business logic, schema migrations, customer data changes or feature
  flag changes. Existing production variables and secrets are preserved.
- **Rollback:** redeploy the previous Worker version. A missing GitHub Cloudflare
  token, missing expected binding, or failing test must stop release.

## 2026-10-17 | Production branding CI dependency fix

- **Observed failure:** The new AkiPasa production branding deployment workflow failed at `npm run check` because its installation step omitted the separate `automation` workspace, triggering TypeScript missing-dependency errors.
- **Fix:** Install `automation` with `npm ci --prefix automation` before the exact-source test/build gate, matching the existing public CI workflow.
- **Impact:** CI only; no change to branding artwork, production data, credentials, feature flags, API paths, or active Worker until a verified deployment succeeds.

## 2026-10-17 | AkiSuite launcher discovery and account controls

- **Before:** the AkiPasa consumer shell lacked a visible cross-product launcher while the other sites exposed inconsistent Settings/Sign out actions.
- **After:** AkiPasa shows the five canonical apps in the desktop rail and mobile/tablet sheet; the mobile header also provides a labelled entry point. AkiDuermo adds sign-out next to Settings; the management, rentals and operations apps have matching actions in their respective repos.
- **Bounds:** navigation and presentation only; existing authentication server actions, privacy, permissions, subscriptions, and PWA identities are preserved. Anonymous AkiPasa visitors see Sign in instead of Sign out.
- **Verification:** full Next/Cloudflare CI, authenticated logout flow, keyboard and focus, desktop compact rail, mobile/tablet sheet, and five-app URL/icon inspection. Revert these UI changes independently if needed; no data migration.

## 2026-10-17 | AkiPasa sidebar utility dock visibility and density

- **Before:** long signed-in navigation pushed the AkiSuite, theme, language, and collapse controls below the visible window, particularly with the compact rail and desktop taskbars.
- **After:** on desktop a viewport-height rail reserves a fixed footer for AkiSuite and preferences, allows only the central navigation list to scroll if absolutely necessary, and tightens navigation spacing for shorter windows. The suite menu remains an above-footer overlay. Desktop expanded, compact, and map routes share the same fix.
- **Bounds:** sidebar presentation, menu layout and acceptance checks only. No change to user roles, permissions, business app destinations, PWA/icons, production data, booking, auth, or billing.
- **Verification:** CI including desktop/mobile/tablet UI; 740px and 900px desktop rail/footer and suite overlay containment; no regressions at mobile breakpoint. Revert CSS only if needed.

## 2026-10-17 | Mobile navigation separation

- Problem: AkiSuite and More opened the same sheet and the top trigger collided with search.
- Fix: separate suite and internal sheets, with independently controlled focus and mobile header spacing.
- Scope: consumer navigation CSS and markup only, no changes to data, billing or branding.

- **Acceptance refinement:** guest Sign in is restored within bottom More and mobile top AkiSuite is product-only. Verify two distinct dialogs and no overlap with the global search button at 390px/768px/820px, including keyboard/focus return.

# 2026-10-19 | AkiPasa backlog recovery release candidate

- **Requested:** account for every open AkiPasa PR/issue, preserve independent
  product ownership, repair actionable security/export/Android work and deploy
  only an exact, tested AkiPasa source.
- **Source:** `master` at `0edb7ed931610dfe38d195920379961b4b1a3465`.
  #199/#194/#188 are superseded by merged #201/#198/#186/#190. #202 belongs to
  the independent AkiDuermo repository. The full #184 product application and
  stale #103 branch are not restored into AkiPasa.
- **Billing:** the recovered #133 guard rejects Pro-to-dependent-add-on
  replacement before any Stripe update. No price, subscriber, proration,
  entitlement, tax registration or readiness flag changes.
- **Webhook:** mirrored forward migration
  `20261014183842_restrict_stripe_webhook_claim_execution.sql` revokes RPC
  execution from `PUBLIC`, `anon` and `authenticated`, retains `service_role`
  and fixes the search path. The ledger is preserved.
- **Export:** bounded exact-count pagination and 100-ID recommendation batches
  fail closed rather than attaching incomplete data. Caller-owned Pals rows are
  included. `20261019231000_account_export_owner_reads.sql` grants authenticated
  `SELECT` only under owner RLS for preferences and the claimant's alert row;
  delivery writes and leases remain service-only.
- **Migration audit:** new CI checks changed table-creating migrations for an
  explicit privilege statement and RLS. The audit found the existing rental
  review policy lacked a matching table grant; the forward fix grants only
  authenticated `SELECT` and preserves owner/staff RLS.
- **Android:** package `com.akipasa`, production origin and signing boundary are
  unchanged. Version becomes 2 / 1.0.1 and CI produces an unsigned validation
  artifact only. Upload-key activation and real-device/internal-track acceptance
  remain external gates.
- **Rollback:** use the prior Worker version for application rollback. Keep
  additive security policies/grants unless a reviewed forward migration proves
  incompatibility. Never delete ledger, export, billing or email history.
- **Verification required:** formatter, lint, TypeScript, focused SQL/RLS and
  billing tests, full repository check, Android test/lint/bundle, Cloudflare
  package, exact-head CI, hosted Supabase advisors/preflight, then anonymous and
  authenticated production smoke. Record pass/fail/blocked honestly.

## 2026-10-20 | Account completion and age declaration candidate

- Scope: AkiPasa email/password and Google signup/session callbacks, `requireUser`,
  private onboarding state and caller-only RPCs, selected legacy activity-table
  mutation triggers, protected privacy/export/deletion flow, avatar reuse and
  Google/behaviour/conversion suppression. EN/ES completion routes are responsive
  and use existing theme/form controls. Shared identity, existing profile data,
  approved terms version, Stripe and ownership are preserved.
- Rollout: private enrolment start/approved terms default null; application schema
  flag default false. Existing users are exempt, not age verified. New users are
  cohort-enrolled only by trusted database configuration. Existing admin/staff
  access is not backfilled or revoked. No live migration/configuration applied.
- Dependencies: profile username uniqueness/RLS, existing uploadProfileMedia and
  profile-media Storage, Auth PKCE/cookies, requireUser consumers, terms RPC,
  privacy/consent/settings/deletion/export, analytics root and server ingestion.
  Negative declarations are not sent to analytics. Separate safety pages avoid
  recursive account-layout guards; password recovery stays accessible.
- Verification: focused unit/action/rendered and PGlite SQL role tests exercise
  terminal state, legacy definer mutation bypass, private ACL denial, existing
  account preservation, safe redirects, minimal bilingual controls and tag denial.
  Exact counts/full checks are recorded in the release checkpoint. Live OAuth,
  hosted RLS/advisors, cross-connection concurrency, five-app acceptance and
  mobile/tablet browser acceptance remain gates, not claimed successes.
- Limits/rollback: explicit mutation-table inventory is not universal API coverage;
  independent apps and remaining privileged reads/mutations must adopt the shared
  guard before cohort activation. Legal policy, retention and appeal handling
  require approval. Before activation source revert is sufficient; after it,
  retain guards and stop only new enrolment while investigating. Preserve all data.
