# Change Impact Register

## 2026-10-20 | Restore authoritative contracts from intact Git blobs

- Exact corrupting commit: `1305e6696379b81af8c81247fcc614ae6375b18b` (#208).
  Last intact parent: `548bc2516b7f92f9f61e50625869c4c5524bfb78`.
- Restored 205 master-contract lines and 462 impact-register lines from the original
  parent blobs. Removed only transport headers and their two collapsed marker lines;
  preserved the legitimate #208 security entries and all later #209/#210 text.
- Preservation proof: before adding this entry, the parent-to-recovered line sequence
  contains only equal/insert operations, with no original parent line removed or
  changed. Exact blobs/ranges and procedure are in `docs/CONTRACT_DOCUMENT_RECOVERY.md`.
- Added a two-file integrity guard and ten regression cases. The existing contract
  gate invokes it before the docs-only shortcut; contract CI and `npm run check` run
  it. Arbitrary example documents are not scanned and normal partial-read prose passes.
- Scope: docs, Node CI tooling, package check orchestration and contract workflow only.
  No app/schema/customer-data, provider, permission, price or live-deployment change.
- Validation: ten Node tests and recovered-source integrity pass. Scoped format/lint,
  the base-aware change gate and exact-head CI are recorded at publication. No broad
  application behavior test is replaced, weakened or claimed by this docs repair.
- Rollback: revert the guard independently if needed; keep history-backed recovered
  text. Do not reintroduce corrupted contracts when rolling back application code.

## 2026-10-20 | GA4 consent command queue repair (PR #230)

- **Before:** after 8 October's GDPR tag gating, the `gtag` shim pushed arrays
  instead of native `arguments` objects; Google loaded but ignored consent and
  configuration commands. Event/page-view reporting fell effectively to zero.
- **After:** preserve the loader's opt-in requirement and queue each command as
  a native `arguments` object. Correctly consenting browsers can once again
  initialize and transmit GA4 events.
- **Dependencies and risk:** `ConsentAnalytics`, existing consent cookies,
  `PersonalisationConsent`, same-origin consent API, GA4 stream
  `G-PW8547QDGD`, Ads destination. No server, RLS, personalisation, Stripe,
  billing, SEO, domain, spend or campaign setting changes.
- **Evidence:** live isolated browser: valid analytics cookie plus current code
  produced `usedDefault=false`, `usedUpdate=false` and no
  `google-analytics.com/g/collect`. Injecting native `arguments` commands
  changed both flags to `true` and produced one GA4 collection request.
  Anonymous consent POST returned HTTP 204.
- **Verification:** native-arguments regression test, denied-consent test,
  lint, typecheck, full required CI, then exact-source Cloudflare deployment
  and live Realtime/collection smoke under granted consent. Denied consent must
  still prevent optional tags from loading.
- **Rollback:** restore the previous verified GDPR-safe deployment only if
  regression warrants; do not reintroduce unconsented analytics. GA4 data lost
  during the incident cannot be retroactively recovered.

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

## 2026-10-11 | Staff ownership claim counter and two-recipient new-claim alerts

- Report: Staff overview showed “0 por revisar” despite a pending claim in Moderation → Reclamaciones, and staff discovered new ownership requests only by visiting the queue.
- Root cause: Staff overview omitted `venue_claims` from its count; submitting a new claim inserted only into `venue_claims`, with existing emails emitted only after review decisions.
- UI: Staff homepage separately displays pending ownership claims and includes them in total pending review; distinct direct moderation link; unavailable count displays dash, not fake zero. Existing venues/events/offers/community counts remain separate.
- Email pipeline: transactionally queue one private alert on new `venue_claims` INSERT, immediately attempt sending from the claim action, then recover via existing Cloudflare cron every five minutes. Resend-backed sender already used for claim-decision messages; the two fixed recipients are alex@akipasa.com and andrew@akipasa.com. Google Workspace receives ordinary email without Gmail API authorization; sending _through_ Workspace would require additional credentials.
- Privacy/security: static recipients; no applicant PII/evidence in outbound notification; protected review links; service-only outbox leasing/ack; status, attempt, ambiguous-delivery and permanent failure logging. No new public response or bypass to moderation roles. Account export covers the claimant's outbox row.
- Tests: PGlite tests of staff count authorization and no-backfill/private new-claim trigger; unit tests of dual-recipient sender, idempotency, provider errors and dispatcher acknowledgment. `npm run check`, Cloudflare packaging, staff EN/ES browser and release endpoint must pass before merge. Supabase migration before app, safe rollback via application revert keeping additive tables.
- Limits: an email accepted by a provider is not proof of inbox delivery. Existing pending claims are **not** backfilled. Customer claim-decision emails continue their separate queue.

## 2026-10-11 | Publish structured AkiBusiness claim form

- **Bug:** the live /business?view=claims form contained only a giant evidence textarea, even though Staff expected applicant name, phone, and business contact details. The earlier structured-form PR was never merged.
- **Surfaces:** `src/app/[locale]/business/page.tsx` (bilingual responsive form), `src/app/[locale]/business/actions.ts` (Zod + private `claim_details`), `src/app/[locale]/staff/StaffQueue.tsx` (explicit unverified applicant data), `src/app/globals.css` (mobile/light/dark), two mirrored migrations and tests.
- **Invariants:** profile/account email is not rewritten; unverified business website and phones are private claim metadata, not public venue fields. Existing owner-approval/denial policy, RLS, staff-only read RPC, subscriber decision emails and staff submission-alert trigger/dispatcher remain intact. No retroactive data from old claims; missing fields display “not provided.”
- **Release order:** run format/lint/typecheck, PGlite staff-only claim tests, EN/ES rendering checks, Cloudflare and browser builds; apply additive Supabase migration before merging. Verify the new form is present on the business hostname after deployment.
- **Rollback:** app-only rollback of form/UI; retain claim metadata and audit evidence. Do not delete pending claims or re-trigger notifications.

## 2026-10-11 | Premium focused ownership-claim review UI

- User observation: Moderation > Claims repeated the same applicant data in several ugly stacked blocks and required scanning too far for decision buttons. Approved mockup: compact claim summary, separate applicant submission vs canonical venue/profile, supporting evidence, decision actions, checklist and references. No unlicensed venue thumbnail or fake verified flag.
- Scope: `src/app/[locale]/staff/StaffQueue.tsx` selects one claim from the staff-gated loaded page and keeps other queue rendering unchanged; `ClaimReview.tsx` displays safe, responsive focused cards; `claim-review.css` provides scoped dark/light styling; `staff/moderation/page.tsx` passes claim selector, retains role gating/pagination and hides irrelevant auto-publication controls in Claims. Staff changes are EN/ES, regular venue and accommodation, phone/tablet/desktop/split-screen.
- Invariants: selected claim ID is matched to existing 20 authorized rows rather than fetched by arbitrary ID. Existing `moderateItem` `approve/reject` audited RPC, reason requirement, current page and customer decision emails preserved. Mailto Request More Information only composes in the local client; no new workflow state or promised outbound email. Guide checkboxes are ephemeral and explicitly non-audited. Canonical venue/account data shown once without modifying it; applicant-submitted data stays visibly unverified and separate.
- Validation: bilingual jsdom claim review/navigation assertions, selector and action form checks, browser Playwright layout and horizontal overflow at 360, 600, 1536 and 640x400 in light/dark; full `npm run check`, Cloudflare build, and other moderation queue smoke tests before merge. No SQL migration or content changes. Live Cloudflare publication and actual authenticated reviewer actions require separate verification. Rollback is app-only.

## 2026-10-11 | Unified bilingual AkiSuite lifecycle notifications

- Request: venue claim received and staff emails, four distinct product welcomes, confirmed event/stay messages, two-day saved event / five-day saved stay nudges, cancellation updates and a complete roadmap of useful notices.
- **Current:** Existing separate claim decision and booking confirmation queues remain; new `suite_email_outbox` adds receipt, first-visit welcome, pending booking request, cancellation and optional reminders. Verified `support@akipasa.com` sender templates. Separate HQ repo's welcome hook must ship with the public DB RPC.
- **Cross-domain:** Shared Supabase user, /[locale]/layout and AkiDuermo pages control first product visits; the AkiBusiness claim server action snapshots locale while retaining existing structured fields and staff alert dispatch; AkiHQ JavaScript queues after authorised workspace login. Existing /api/stays/saved and /account/saved act through authenticated RPCs.
- **Safety:** no old claim/booking backfill, marketing reminders require opt-in and current saved state, provider keys never embedded, stable idempotency, staff recipient list fixed, confirmed booking sender independent from pending request notice, cancellation only on a real status transition, no changes to Stripe subscriptions or fiscal invoices. Consent/preferences off by default.
- **Dependency map:** master auth + account saved + AkiBusiness + AkiDuermo + event booking -> guarded Supabase functions and immutable outbox -> scheduled worker -> Resend provider -> verified recipient. Existing booking and claim decision notifications untouched apart from from-address branding.
- **Validation:** suite contract, bilingual templates, dispatcher mock/provider errors, existing booking/claim regressions, PGlite safety, EN/ES responsive portal checks, full Next/OpenNext builds. SQL migration before master merge. Production Cloudflare secret correctness and actual end-to-end sends require separate verification; direct Resend previews do not prove worker credentials. Rollback app without deleting queued history.

## 2026-10-11 | Surface unsent claim-decision emails after provider 403

- **Observed live failure:** latest rejected claim plus four earlier moderation decisions persist, but all five customer outbox jobs are `blocked/provider_403`; three staff alerts and one suite notification also failed with 403. Provider IDs absent. The existing Staff UI only said the decision was recorded.
- **Change:** `moderateItem` preserves its authoritative audited status update, observes provider acceptance from the existing `dispatchClaimDecisions` result, and redirects with `mail=sent` or `mail=not_sent` for claim decisions only. An authenticated EN/ES Staff notice warns when the email send is unconfirmed. No sensitive recipient/payload/provider details are put in URLs. Non-claim moderation redirects are unchanged.
- **Dependencies/risks:** Staff desktop/mobile/theme presentation uses the existing notice style. No Supabase schema, permission, queue, sender, booking, accommodation, AkiHQ, consent or admin-email recipient change. Delayed cron sends may succeed later; the notice truthfully describes only immediate provider acceptance. Code cannot repair a bad production Cloudflare secret.
- **Tests:** claim-decision provider 403 dispatcher regression and static moderation redirect/notice contract. Full CI/browser verification remains required before merge; no production mail or blocked-row replay was attempted. Operator runbook: `docs/CLAIM_EMAIL_403_RECOVERY.md`.
- **Rollback:** revert action/page/contract-test changes only; retain immutable recorded mail failures. Repair worker secret and perform individual approved requeue after proven live sending.

## 2026-10-11 | Standardize all app-owned Resend mail on the support address

- Requested sender: `AkiPasa Support <support@akipasa.com>` through Resend (reply to support). Confirmed claim decision, staff alert, suite email and booking dispatchers already use Resend; removed the last configurable From override in the booking confirmation implementation.
- Surfaces: AkiPasa EN/ES confirmed venue/event reservations, AkiDuermo confirmed stays, AkiBusiness claim decision and staff notifications, shared suite welcome/requests/cancellation/reminders. No other production function behavior, database schema, recipient, plan or role changes.
- Testing: extended suite email contract to require the booking sender's Resend endpoint and fixed From/Reply-To and forbid legacy overrides. GitHub CI and browser acceptance must pass before merge. This does **not** resolve the actual Cloudflare API-key 403 or send historical blocked messages; see `docs/CLAIM_EMAIL_403_RECOVERY.md`.

## 2026-10-11 | Resend connection incident: canonical key priority

- Live evidence: newest claim denials at 12:02 and 12:09 UTC also `blocked/provider_403`, making seven failed claim-decision sends. A single direct Resend diagnostic to the owned inbox was independently marked delivered using the verified support sender; no matching Worker requests appeared in the connected Resend logs.
- Suspected cross-account credential drift: runtime source chose `CLAIM_RESEND_API_KEY` ahead of the corrected general key, despite identical sender/recipient behavior. This can shadow a valid `RESEND_API_KEY` and cause a separate account/domain permission rejection.
- Fix: central `resendSendingKey` selects `RESEND_API_KEY` first and uses claim-specific secret only as a backwards-compatible fallback. All claim, staff, suite, venue booking and AkiDuermo booking modules use it. The caller's role, security, queue leases, locale, send From and Reply-To, recipients and UI do not change. No migration.
- Tests: assert canonical selection when both secrets exist, legacy fallback, and real mocked claim delivery Authorization header. Contract assertions cover all dispatcher consumers. Required gates: full check, EN/ES browser and Cloudflare build. Live end-to-end validation and any requeue are deferred to corrected Cloudflare credentials.

## 2026-10-13 | Canonical Resend recovery instruction

The claim-email recovery runbook inspects production `RESEND_API_KEY` first, matching `resendSendingKey` in `booking-mail-delivery.ts`. Only absent or blank primary keys use legacy `CLAIM_RESEND_API_KEY`; rotating that fallback cannot repair an invalid nonblank primary. No keys, runtime configuration, queue status or messages are changed. Existing key-precedence regression coverage remains authoritative; live credential repair and individually authorized requeues are operational dependencies, not accomplished by this documentation change.

Canonical-key recovery validation: the existing `tests/claim-decision-email.test.ts` suite passed 10/10 cases on 2026-10-13, including trimmed primary-key selection, absent/blank-primary legacy fallback and dispatcher selection. The isolated command retained the existing timeout limits; no credentials or real messages were used. Required exact-head CI remains the merge gate.

## 2026-10-11 | Anchored overlay for sticky mobile workspace menus

- **Observed:** On Account/Staff/Admin, the menu button stayed at the mobile viewport top but opening it created an in-flow section near the page's beginning; the user had to scroll back upward to use its links.
- **Source/root cause:** Shared `src/components/WorkspaceShell.tsx` places the trigger, desktop navigation and conditional drawer; the late `src/app/globals.css` mobile override intentionally forced `.workspace-drawer-layer` and `.workspace-drawer` to `position: static`.
- **Fix:** Group the mobile trigger/drawer inside a sticky, desktop-hidden wrapper and absolutely position a height-limited independently scrollable panel beneath the trigger. Keep underlying content in place. Escape returns focus, outside pointer closes, navigation closes, breakpoint transition closes; render mobile navigation without stealing the desktop scroll ref.
- **Matrix:** EN/ES, Account/Staff/Admin, mobile/tablet at <=850px incl. landscape/short heights, light/dark and authenticated roles; >=851px desktop remains unchanged. Staff/Admin role gates continue on the server.
- **Dependencies:** UI/CSS only; no database, permissions, Supabase queries, cross-portal claims, bookings, billing, mail, analytics, storage, translations or API behavior. Routes and menu links remain unchanged. Rollback via UI/CSS/test/docs revert, with no migration.
- **Tests/evidence:** Expanded `tests/workspace-shell.test.tsx` to assert anchored wrapper, close interactions and CSS contracts in each route family. `npm run check`, CI browser evidence and authenticated production smoke remain pending; no claim of a tested live deployment.

## 2026-10-11 | Full-width Staff operations without audit disclosure

- **Requested:** Remove Staff's duplicate side audit and its full-audit navigation/permission; let the day-to-day Staff surface use the available width. Retain the more complex Admin dashboard for privileged operators.
- **Observed root causes:** `src/app/[locale]/staff/page.tsx` read the last six `moderation_actions` in an always-present right column; Staff layout and `/[locale]/staff/audit` offered full history. The existing database `moderation_actions_operator_read` SELECT policy explicitly allowed `moderator` as well as `administrator`, making UI-only hiding insufficient.
- **Changed:** EN/ES Staff page now uses all horizontal space for priority workflows, live counts, support and secondary tools, without an audit fetch or tile; scoped CSS handles phone/tablet/desktop. Removed Staff layout link. Staff audit route rejects non-admin users server-side and redirects admins to the Admin audit. Legacy view=audit goes to Admin. Admin audit adds an explicit page-level role check without changing display/queries.
- **Authoritative gate:** mirrored `20261011204631_staff_audit_admin_only_20261011.sql` ALTER POLICY on `moderation_actions` restricts direct authenticated SELECT to admin app role. All moderation insert/update RPC paths and records remain intact. Safe deployment ordering: apply migration before exposing the redesigned Staff UI; verify existing role assignments and confirm protected database reads before promoting.
- **Tests:** new `tests/staff-audit-access.test.ts` executes the policy in disposable PGlite for role split; source checks assert no Staff audit path/query and preserve Admin. Existing Staff moderation and role tests remain. Run `npm run check`, Cloudflare packaging and mobile/desktop EN/ES/browser checks; production role smoke must be verified separately.
- **Rollback:** UI revert + reviewed policy reversion if necessary, with no audit data deletion, claim decision replay, or booking/email change. No production migration/merge confirmed at drafting.

## 2026-10-11 | Staff promotions inbox instead of long text cards

- **Current UX:** Staff Promotions renders the last 50 rows as unfiltered, lengthy message and operator-note paragraphs underneath a duplicated Operations heading. Reported crowded desktop, tablet and small-screen appearance.
- **Requested:** concise, task-first Staff Promotions with controls to find requests quickly. No change to Admin commercial management.
- **Change:** `src/app/[locale]/staff/promotions/page.tsx` retains the bounded authorization-backed read; adds explicit moderator/administrator check and query-error feedback. New `StaffPromotionsInbox.tsx` displays compact cards with venue, localized service, status, date and short preview; full original message/notes on native disclosure; searchable and filterable recent-50 subset. `staff-promotions.css` eliminates only the route's duplicate global heading and styles EN/ES/light/dark/responsive windows.
- **Impact graph:** authenticated Staff layout -> authorized recent `promotion_requests` SELECT with `venues(name)` -> server normalization -> local UI filters. No DB migration, privileged write, state transition, booking, emails, billing, maps, storage, analytics, AkiBusiness or Admin page changes. Unknown states/services remain present in All; SQL errors are distinguished from no data.
- **Test:** `tests/staff-promotions-inbox.test.tsx` guards bilingual content, search/filter, detail expansion, HTML escaping, empty state and absence of mutation forms. Run complete `npm run check` and CI tablet/Cloudflare gates before merge. Deployment can roll back via UI-only revert; existing requests remain intact.
- **Existing tablet-gate repair:** An unrelated shared Business/Duermo header browser test asserted `boundingBox().height === 44` exactly, but Chrome returned `43.999999046325684` for a nominal 44px button. `scripts/test-portal-home-browser.mjs` now uses `toBeCloseTo(44, 1)` for width/height. No production header layout or click targets changed; this retains 44px acceptance while allowing subpixel rounding. Rerun the real browser matrix before merging.

## 2026-10-12 | Unified Admin suite and Rewards Centre

- **User issue:** rounded gradient page headings clip Spanish eyebrow/description, oversized duplicated "Administración" header appears on every Admin subpage, navigation has separate Passport/Grant/Achievement sections, audit/business/commercial/passport/flags lists lack efficient search.
- **Source audit:** `src/app/[locale]/admin/` route inventory includes Overview, User directory + identity details, Business Applications, Promotions, Privacy, Audit, Catalogue/categories/cities, Venue Relevance, AI Team, Personalisation, Settings, Passports/award grants, Achievements + venue categories. User search, relevance pagination, AI team tabs, achievement filters, and Award member lookup existed already. Missing local finders targeted only bounded lists. No new backend search endpoints are invented.
- **Shared design:** optional `WorkspaceShell.hidePageHeading` used by Admin; `admin-suite.css` adds safe padding/wrapping to section headers and long content, status pills, responsive control/row layouts without changing account/staff/business. Admin top navigation groups three existing rewards routes under one active Rewards item; tabs embedded on Passports, Grants, Achievements and the venue category child route. Old links and privileges remain.
- **Data:** `AdminSearchList` filters only server-authorized rendered rows in memory (existing limits, most importantly audit 150/business 100/cities 100, no claim of searching all database pages). Controls retain every original form with server actions/hidden record IDs/reasons, and never mutate on search. Admin lists and AI team loaded task/schedule/approval/activity now have search. Specialist user directory, relevance proposals, award lookup and achievement manager keep authoritative search.
- **Risk matrix:** EN/ES, dark/light, 360px/390px/tablet landscape/desktop/short split viewport; passwords/account deletion and reward grants gated by current Admin layout and existing server/RLS rules, no new scope. Venue claims, booking inventory, transactional email, usage ledger, Stripe, audit history, member XP and Rewards data untouched.
- **Tests/rollback:** `tests/admin-suite.test.tsx` covers search filtering/status/reset, unified tabs, retained privileged forms/routes. CI full check, browser matrices and Cloudflare package are release gates; authenticated production UI smoke remains required for complete acceptance. No DB migration. Roll back UI commit if regressions; do not replay mutations.

## 2026-10-12 | Admin commercial requests and user-search overlap follow-up

- Screenshot regression: Users & Roles search label/help text intersect the rounded input, while commercial requests render as oversized unstructured accordions with expanded forms that feel like a text minefield.
- UI-only: Admin-scoped CSS makes search label, input and helper separate grid rows, preventing overlap at tablet widths; commercial request summaries become compact and details group message + editable fields with sensible spacing and mobile one-column dates.
- Preserves Admin authorization, server-side user search, request IDs, form actions, promotion status, event selection, dates and internal notes. No SQL/RLS/data mutations, changes to Staff or other AkiSuite apps. Verify EN/ES, dark/light, tablet landscape and portrait. Rollback via revert.
- **2026-10-12 follow-up (disclosure indicator):** Admin Business Applications `settings-disclosure full-width-disclosure` uses global disclosure chevron borders, but Admin stylesheet also injected `+`/`−` into the same `summary::after` pseudo-element. These combined visually into an X plus an arrow. Add a narrowly scoped CSS override that renders only one 45° chevron (225° when open), hides the native marker, and leaves the existing summary button and audited action form untouched. Source-regression test `tests/admin-suite.test.tsx` checks the two states. No permissions, migration or API changes.

## 2026-10-12 | Three one-screen Admin master-detail workbenches

- **User intent and evidence:** Catalogue Categories currently presents a full-width vertical form per expanded item; Relevance displays repeated evidence/form cards across ~1,505 pending proposals; Configuration similarly expands full-width flag forms. In tablet landscape, excessive unused horizontal space and long vertical scrolling obscure the active workflow. Explicit requirement: desktop, tablet **and phone**, not tablet alone.
- **Source/dependency tracing:** `/admin/catalogue` loads categories or top 100 cities and delegates form actions `saveCategory`/`saveCity` to `src/app/[locale]/admin/actions.ts`; `/admin/settings` loads flags and delegates `updateFeatureFlag`, which invokes `set_feature_flag` RPC. `VenueRelevanceReview` uses authenticated `/api/admin/venue-relevance` GET and POST with fingerprint checks, stale protection, weight bounds, a 10-character reason and server-side authorization/RPC. Both route families are under `src/app/[locale]/admin/layout.tsx` administrator role guard. No new permissions, data source or backend pagination route was added.
- **Implementation:** new client `AdminWorkbench` handles selection, in-memory search/status and new category/city pane, rendering exactly one original Server Action form at a time with original IDs/reason inputs. Relevance becomes a paged proposal queue plus one selected decision form and evidence. New `admin-compact.css` uses desktop wide 30/70, tablet 38/62 and phone records/editor switch <=700px. Under short landscape windows, bounded internal scrolling keeps actions accessible. Client search only covers rows already loaded; API relevance search is server-backed and paginated. Do not claim whole-database search for cities.
- **Matrix:** >=1450px desktop, 701–1080px tablet (portrait/landscape and split-screen), <=700px phone, <=600px tall-short viewports; ES/EN labels, light/dark token styling, touch/keyboard. The existing authenticated actions and stale-row handling must stay intact, and actual live authenticated cross-device smoke remains needed.
- **Risks/rollback:** React Server Action form slots are passed as ReactNode content to an RSC-compatible client presentation component, following the existing `AdminSearchList` pattern. No migration/RLS/API schema, ledger, booking, map, media, analytics, email or account mutations. Revert files if forms do not hydrate correctly; never replay submitted actions. `tests/admin-compact-workbenches.test.tsx` covers selected editor, mobile panes and decision POST. Run full CI and Cloudflare package before requested merge; merge is not proof of live Cloudflare deployment.

## 2026-10-12 | Account workspace overhaul and Spanish text integrity

- Request/evidence: uploaded Account Saved, Following, Bookings, Activity, Premium and Settings screenshots show clipped left-hand labels. The shared consumer header resets padding to zero while another rule retains rounded overflow clipping. Repeated generic Account banners and inherited 12-column placements consume space and hide useful controls. User requests a complete responsive account overhaul, Progress removal in favour of Passport, and repair of corrupted Spanish accents.
- Before editing: traced every Account route and layout, WorkspaceShell, AccountItems, AccountWorkspacePortals, MyBookings, profile/media, MembershipPicker, PersonalisationSettings, auth/terms guards, account actions, consent, subscription/calendar/export endpoints and current Admin compact workbenches. Matrix: EN/ES, light/dark, Free/Premium, anonymous/authenticated, consumer/staff/admin, phone/tablet/desktop/short split window, empty/populated/error and long names.
- Scope: dedicated AccountPageHeader and account-only styles; generic hero hidden with existing WorkspaceShell opt-in, all wider-screen navigation destinations visible, contextual cards/actions and native edit disclosures. Old /account/rewards retains requireUser and redirects to localized /passports; overview links there directly and stops reading the duplicate XP ledger. Saved/following summary reads explicitly scope the signed-in profile and show unavailable counters as unavailable.
- Dependencies preserved: existing server actions/IDs/authorization/RLS and locale destinations, opt-in reminder defaults, booking status/pagination/cancellation, profile/media uploads, email/password confirmation, subscription checkout/portal and signed payment entitlement, privacy/export and typed account deletion. No user identity, consent, billing, booking record, reward grant, map/search indexing or external email mutation is part of UI validation. Disposable browser fixture actions never contact real recipients.
- Encoding investigation: tracked source and current public auth/privacy DOM retain proper UTF-8. Read-only live SQL found historical mojibake in category labels literature/tradition and feature flag recommendation_reasons, despite correct source migration literals. Server and client encodings are UTF8. Only exact verified textual corrections may be repaired; no broad reinterpretation of valid names, IDs, values or flags. Final scan/repair results are recorded below.
- Validation status at implementation: component/browser tests, full npm run check, npm run test:e2e and Cloudflare packaging pending. Account browser harness uses actual route components with isolated Auth/database/action adapters; it does not establish authenticated production acceptance. No merge/deployment yet. Rollback: revert Account source and restore only documented original labels if required; never restore data by replaying user actions.

- Encoding repair verified: `database/repairs/2026-10-12-spanish-ui-copy.sql` passed disposable PGlite checks for exact-row correction, retained IDs/English labels/feature states, repeat no-op and preservation of later edits. Applied the same SQL under the user's text-fix authorization: literature = Literatura y poesía, tradition = Tradición, recommendation_reasons = Motivos de recomendación. Read-back confirms all three and zero remaining markers across the checked system label tables. Published venue name/Spanish description scan found only the legitimate name Âgora Café Bar, which was retained. New source UTF-8/mojibake regression passes. This fixes verified historical stored-copy drift; it does not claim to diagnose an unseen example elsewhere.

- Release evidence: the existing read-only `/api/bookings/release` response includes `accountWorkspace: 2026-10-12-account-suite-v1`. This additive public build marker has no account data or credentials and leaves existing booking/mail markers untouched. It distinguishes the connected deployment from a successful GitHub merge without requiring a production login. Authenticated account smoke remains separate.

- Integration evidence: merged current public `master` at `c651a69` into the work branch, retaining the AkiPals release and its tests. `npm run check` passed with 641 tests across app, database conflicts and automation, plus formatting, lint, TypeScript, database safety, automation Worker dry-run and production build. Cloudflare/OpenNext packaging also passed. Generated browser bundles under `test-results` are excluded from lint just like other generated reports; harness and test source remain checked.
- Account browser evidence: 282 route/locale/theme/viewport and boundary cases passed, followed by 60 targeted cases after correcting two visually observed inherited-grid problems: Overview implicit columns and the old Profile marker placing its title under navigation. New assertions cover both defects. All ten current account screens were visually inspected; long accented labels, native disclosures, original action fields, opt-in preferences and authenticated legacy Passport redirects are exercised with disposable data.
- Wider browser acceptance traced stale homepage/Passport selectors to the current search overlay, location picker, mobile Passport drawer and explicit auth routes. Existing motion-feedback and 44px touch assertions revealed real Passport CSS issues: `display:none` hid the existing status from sight and assistive technology, while several phone controls were 38–42px. The CSS-only repair restores wrapping feedback and minimum 44px controls; no sensor permission, consent, state, storage, API or reward behavior changes. Full production-server E2E and connected live release verification remain pending at this checkpoint.
- Failed-read follow-up: Profile no longer exposes blank edit/upload forms after a query error; Privacy distinguishes unavailable consent/deletion status from Off/no request; Membership offers recovery before new checkout when any of its four access reads fails; Manage billing remains available when the customer read succeeded. Successful missing-row defaults, original consent API/form actions, export, checkout attribution and confirmation refresh remain unchanged. This is UI recovery, not a change to backend billing authorization or duplicate-payment guarantees. All 51 focused Account tests pass, including 15 new failure/default cases. Four Profile plus eight Privacy/Membership browser failure cases pass at 360/1536px in EN/ES; screenshots were inspected. The default Account browser matrix now contains 302 cases.
- Final Account browser matrix passed 302/302: 240 normal screens (ten routes, EN/ES, both themes, six viewport sizes), 60 boundary cases and two localized legacy Progress redirects. Full results and reviewed screen captures are preserved as browser evidence. Broader public acceptance also retains exact auth/status/SEO/consent checks while following current menus/forms. Map legend touch sizing is corrected from 36px to at least 44px in its existing scoped selector. CI also exposed the undersized native MapLibre attribution summary: its toggle and compact wrapper now have matching 44px dimensions, with reserved space for expanded attribution text. The map stylesheet test distinguishes the standalone vendor selector from legitimate scoped layout rules; no map bundling change was needed.
- Public test infrastructure supplies read-only synthetic venue discovery and details on an explicitly configured disposable localhost port: 2,105 records exercise 20-card nearby paging, the real Next map API's 2,000-record cursor continuation and the existing venue detail renderer. The fixture permits the two pagination RPCs, the public catalogue read (no catalogue), published venue lookup by slug/ID, and empty event, offer, loyalty, media, booking-setting and feature-flag reads; unsupported requests and all writes are rejected. The runner enables the existing Supabase repository only for its Next child through a private server-only flag, with independent guards requiring the fixture provider and the same build-time uncredentialed loopback HTTP URL used by the public client. Ordinary fixture, Supabase and hybrid deployments retain their existing selection. The E2E runner starts/stops the fixture with its production server, and CI runs the full public suite including exact 200 checks for synthetic card links. This does not authenticate users, forward requests or claim PostgreSQL/RLS integration. Authenticated production acceptance still requires separately supplied disposable QA credentials.
- Final repository check passed after the recovery, public CSS and fixture-detail fixes: 680 tests (637 application, two database-conflict and 41 automation), formatting, zero-warning lint, TypeScript, database safety, automation Worker dry-run and the production Next build. The 24 new provider-guard cases verify exact opt-in, unchanged ordinary providers, safe local URLs and server-only selection. The final full public E2E run and CI Cloudflare package are release gates; their final outcomes and the connected live marker are recorded in the release PR.
- Native map interaction follow-up: 44px sizing alone did not catch Privacy intercepting attribution on narrow screens or Support covering it on desktop. Scoped responsive offsets reserve space for all three controls and the short-window geolocation column; the map status caption wraps within its available horizontal space. A deterministic, tileless basemap response supplies attribution to the actual MapLibre control in one added public test: EN/ES, five viewport sizes, native disclosure clicks, control/container bounds, privacy reopening and screenshots. No forced clicks, hidden controls, consent saves or production map-style changes are used. At this checkpoint, before integrating Spotlight, the public suite contains 78 cases. A separate AkiDuermo test race is corrected by waiting for the canvas before marking it and always checking that filtering preserves that same canvas; the previous independent conditional counts could mark nothing and later assert against a newly loaded canvas. Application map lifecycle behavior is unchanged. Final focused, full-suite and CI results remain in the release PR.
- Latest release integration retains public `master` at `4443b12`, including the Aki Spotlight venue/event layouts and all their test gates. Both the Account and Spotlight component suites remain in `npm test`. Generic public E2E now discovers 106 cases: the 28 Spotlight cases have an explicit separate-fixture gate and run through the mandatory `npm run test:spotlight:browser` command in tablet CI; the existing authenticated-production case retains its credential gate. These separate suites rebuild with different disposable backends and must run sequentially locally. Final combined check, browser and deployment outcomes are recorded in the release PR.

## 2026-10-13 | Recover PR #120 starter catalogue publication review

- Evidence: #120 fixed immediate draft saves by providing nonempty New item / Nuevo elemento names, but blankCatalogueItem also defaulted visible=true and priceCents=0. Publishing unrelated changes could expose unfinished starter rows.
- Trace: blankCatalogueItem -> VenueCatalogueEditor.addItem -> existing explicit visibility checkbox -> translated draft document -> save_venue_catalogue. SQL validates nonempty names even for hidden drafts; publishing and food-index generation already respect visibility. PublicVenueCatalogue filters hidden rows for venues and event-selected sections.
- Repair: only newly added rows default hidden. Keep starter names, zero price, variants and unknown-allergen defaults unchanged; no name heuristics, automatic visibility, price restriction or rewrite of existing documents. EN/ES editors can explicitly enable visibility using the existing control.
- Paths: src/lib/venue-catalogue.ts, focused foundation/public-rendering tests registered in existing AkiDuermo Vitest group. No schema, RLS, auth/venue membership, API, Storage, paid entitlement, email, booking, analytics, consent or live-data change.
- Validation: foundation and EN/ES rendering tests verify starter exclusion, explicit visibility, preserved existing visibility and legitimate zero/custom prices. Full repository checks/CI and deployment remain required; no authenticated production editing is claimed. Rollback via source revert; no data restoration.

## 2026-10-12 | AkiBusiness catalogue unable to save

- Reported: multiple editors cannot add/remove catalogue items or categories; the UI returns generic permission guidance.
- Evidence: authenticated save RPC returned repeated HTTP 400 on October 12; matching PostgreSQL `Invalid item` logs. Existing persisted items pass database item-shape checks. The client creates new items with blank names, while the database requires a non-empty title for draft saves as well as publish.
- Changed: bilingual default names in `src/lib/venue-catalogue.ts`, precise catalogue-error routing in `src/app/[locale]/business/venue/[id]/actions.ts`, localized error guidance in `page.tsx`, and starter item regression test.
- Security: venue access and SQL/RLS unchanged. Published allergen confirmation enforcement unchanged. Existing catalogue records unchanged. Other portals, translations of existing content, API and SEO unaffected.
- Rollback: revert code-only commits; no schema or data migration.
- Checks: no local Node checkout in connector runtime; full npm, browser E2E, Cloudflare build and authenticated live checks unverified. Do not merge without green checks and release approval.

## 2026-10-12 | Independent AkiSuite catalogue foundation (NOT LIVE)

- Request: separate AkiBusiness marketing from AkiHQ operations, AkiDuermo and consumer premium, with 20% annual discount and bundle.
- Change: add typed standalone catalogue with pricing and composition tests; add staged rollout and rollback documentation. No checkout, DB, webhook, media or event behavior changed.
- Dependencies: existing Stripe billing and migrations use legacy premium/business/business_pro; the staged catalogue does not grant access. Locales, routes, analytics, claims and storage untouched.
- Verification: review only; no npm check/CI or Stripe live transaction verified. Do not merge without verified checks. Rollback: revert new files and documentation.

## 2026-10-12 | Staged AkiBusiness Growth overview

- Request: move toward a responsive AkiBusiness Growth marketing dashboard and accurate new tier positioning.
- Before: Growth view contained only commercial promotion requests; analytics was a separate view.
- After: Growth presents authorised venue and event counts, existing per-venue engagement RPC results and quick links, followed by the unchanged promotion request flow. Premium capabilities are labelled coming later, without functioning checkout or fabricated statistics.
- Dependencies: BusinessPage auth/permissions, venue_members and venue_analytics RPC, managed events, responsive CSS, EN/ES. No schema, data mutation, Stripe, cloud environment or scheduled job changes.
- Checks: CI required on updated head; no local execution claimed. Rollback: revert Growth component/CSS and BusinessPage integration.

## 2026-10-12 | Staged AkiSuite Stripe mapping

- Added isolated Stripe price ID mapping/validator for all seven new commercial plans, plus unit tests for annual/interval/amount mismatch and HQ add-on eligibility.
- Does not touch live Stripe products, old membership pages, webhook code, database migrations or existing entitlements. Checkout remains inactive pending cross-portal rollout.
- Live merchant ambiguity: connected account named Alex Ashing LTD; no Tax registrations surfaced. Do not launch without confirmed merchant of record and VAT settings.
- Regression: new Stripe tests plus existing legacy checkout and webhook suite, app check and E2E required. Rollback by removing adapter and tests.

## 2026-10-12 | Staged multi-plan Stripe ledger and checkout guard

- **Request:** distinct AkiBusiness marketing, AkiHQ operations, AkiDuermo and consumer plans, Enterprise bundle, 20% annual savings, safe legacy migration.
- **Change:** separate AkiSuite Stripe ledger plus RLS/SQL RPC, signed webhook dispatch into new ledger, disabled-by-default checkout action with account/tax/price gates and duplicate-payment checks, and focused regression tests.
- **Dependencies:** existing `billing_customers`, Stripe webhook event lock, profile reconciliation, CRM AkiHQ gates, venue ownership, legacy subscription records, AkiBusiness/AkiDuermo EN/ES and Stripe Tax. No live Stripe write performed. No customer-facing new checkout enabled.
- **Risk:** account connected as Alex Ashing LTD with unrelated products and no tax registrations; current staging attaches plan to billing profile, not a validated multi-location organisation. Production migrations require SQL/RLS and end-to-end tests; don't merge or provision paid resources until resolved.
- **Rollback:** revert application and SQL migration only after reviewing any new subscription records; never drop paid entitlements or overwrite legacy subscriptions.

## 2026-10-12 | Unified four-app membership centre

- **Requested:** clean, horizontal-space-efficient, responsive membership overview/management for AkiPasa, AkiDuermo, AkiBusiness and AkiHQ, plus `/membership` and account membership routes.
- **Before:** account subscription page displayed legacy three-plan billing cards and access records; public membership displayed a separate legacy picker; new suite UI was hidden behind readiness flags; AkiHQ lacked a central membership link.
- **After:** bilingual responsive hub and shared seven-plan grid; data grounded in per-user Stripe-backed subscription rows and grants; current legacy records remain valid; Stripe Customer Portal handles payment updates and cancellation; disabled new checkout unless readiness flags are set. On desktop app overview displays four horizontal tiles and a side summary; tablet/mobile collapse cleanly. Account aliases redirect and AkiBusiness sidebar includes membership. Separate AkiHQ PR #25 provides matching nav link.
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

## 2026-10-20 | Contextual free management and operations previews

The business-owner disclosure uses the canonical AkiSuite navigation contract,
keeping free AkiHQ listing/location/team management separate from AkiBusiness
paid operations. Venue claim initiation is shown only when the existing public
ownership check confirms claim availability; property/rental prompts use the
free hub without fabricating claimability or creating a venue dependency.
Category workflow previews describe organisation steps, without invented results
or prices. The operations link is neutral, not an upgrade promise or entitlement
grant; actual target server permissions remain authoritative.

CTA impressions/clicks and claim starts use existing GA4 only when the current
analytics consent cookie grants it. No identifier, contact field, payment success
or claim completion is inferred or sent. Consent revocation is rechecked on
every signal. No new loader, cross-domain cookie, tracking pixel, billing flow,
backend mutation, schema or production configuration is introduced. The mirrored
BusinessPathway, suite-conversion and suite-navigation sources have shared v1
provenance and no sibling-checkout imports.

Validation: new five-case rendered/interaction/consent suite; full source gates
and responsive/provider acceptance remain tracked in the release report. Revert
these source commits for rollback; no data restoration is required.

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

## 2026-10-20 | Shared referral foundation (gated candidate)

Before: current source had no referral/representative commission infrastructure.
After: shared-account one-time capture and public enrolment RPCs, programme/code/
representative admin studio, account/lead dashboard, append-only invoice/hold
ledger and config audit. No active monetary incentives or disbursement are added;
SQL requires both monetary flags to remain false. Existing subscription products,
customer access, profile roles, cookie consent and checkout are unchanged.

Dependencies traced: existing requireUser/Terms/password/OAuth next contract,
account/admin layouts, shared profiles and billing customer/subscription mapping,
Stripe signed leased webhook/price reconciliation, Supabase RLS/explicit execute
and table privileges, bounded export, EN/ES navigation and responsive forms.
Runtime gate defaults off; other independent apps can carry the allowlisted ref
code and reuse shared account attribution without identity cookies or service keys.

Tests: disposable PostgreSQL/PGlite role execution exercises immutable capture,
usage/self/existing-subscriber denial, service-only billing writes, event/invoice
idempotency, failed amounts, private aggregate reads, representative isolation and
suspension, admin config checks and irreversible-money gate. Adapter tests cover
paid/customer validation, database retry failures and retrieved refund/dispute
holds. Final full check/browser/hosted migration/advisors/Stripe sandbox and
production evidence are separate gates recorded in the feature checkpoint.
Rollback disables gate and reverts source, retaining historical schema/evidence.

Referral review follow-up: customer reports and private administrator fraud/dispute
case review are implemented with reporter-isolated reads, administrator-only
resolution, append-only audit and deduplicated automatic refund/dispute cases.
Case resolution cannot modify attribution or authorize money. No financial
approval, incentive activation, customer migration or production write occurred.

## 2026-10-20 | Suite language and canonical handoffs

- Before: management/operations selector destinations omitted language; operations
  ignored incoming locale and could reload a workspace's previous language.
- After: fixed-origin suite-navigation v1 preserves the current EN/ES across all
  five products. Canonical free-management and paid-operations roles are retained.
- Dependencies: desktop/mobile selectors, locale headers, static workspace cache,
  membership back links, auth portal links and explicit location handoffs. Public
  referral codes are bounded; callback/redirect wrappers and credentials are not
  forwarded. No DB/API/RLS, subscription, consent or analytics behavior changes.
- Verification: fixed-origin/security matrix and actual selector EN/ES rendering;
  complete CI/build, responsive browsers and canonical authenticated journeys
  remain required. Source/deployment rollback preserves all stored data.

## 2026-10-20 | Standalone listing media and event allowances

Owner venue/accommodation uploads, event creation and recurrence/duplication,
Storage INSERT/UPDATE, direct table writes, publication scheduler, subscription
lookup and administrative review dependencies were traced before implementation.
Live read-only inspection confirms the two historical October12 Premium migrations
are absent. They must NOT be replayed to deploy this bounded feature.

Migration 20261020170415 installs standalone in akisuite_listing_private with an
independent default-closed gate. Per-listing media is 8/250; existing media remains.
Free published events consume four distinct IDs per Madrid calendar month and a
five-inclusive-date envelope. Retained private event-month history survives
unpublication/deletion; title hashes permit recreation review without copying old
content. Publication and media advisory locks serialize scope consumption. Existing
published history is backfilled without rewriting events. Same-status content
edits remain possible after downgrade. Recurrence/duplicate legacy RPCs and direct
API paths are guarded. Caller-independent authoritative entitlement protects
service publication; browser mutations retain normal authorization and RLS.

A bounded admin-only review RPC/page explains repeated-title, multi-day and generic
opening-hours signals without automatically blocking legitimate festivals. Event
composer returns inline quota errors and controlled fields preserve drafts on quota
or provider failures. Owner media shows EN/ES counts/upgrade links when the new
listing gate is confirmed. Recurrence/duplicate controls explain listing Premium.
Image header validation and browser1920/.8 versus3840/.9 preparation are groundwork,
with the server action separately gated: direct authenticated Storage can bypass
resolution, so do not enable/claim complete resolution enforcement.

Validation:8 actual PGlite migration cases cover both legacy-only and optional old
suite schemas,8/250 Storage limits, per-listing scope, Madrid dates, month crossing,
delete/recreate resistance, direct edits, admin isolation, downgrade retention and
caller-independent service access.4 header policy cases and3 EN/ES draft retention
cases pass. Full pre-follow-up AkiSuite136 tests passed. Full check passed format,
lint, typecheck and634/635 first-suite tests, with unrelated Spanish PGlite5s startup
timeout; isolated retry2/2 passes. Current expanded-head scoped tests/TypeScript,
SQL privilege audit and lint pass. Hosted CI/build/browser, real multi-connection
and owner acceptance remain required. No production mutation was performed.

Read docs/LISTING_LIMITS_RELEASE.md for exact independent activation and rollback.

## 2026-10-20 | Passport prestige candidate — implementation, not production release

- Before editing: traced `private.achievement_counts`, natural unlocks, manual/test
  grants, Passport collection, admin awards, private RPC wrappers, shared Auth,
  EN/ES layout, existing SQL fixtures and public-source deployment requirements.
- Adds private deny-all settings/programmes/awards/physical-interest/audit tables;
  explicitly granted invoker wrappers call guarded private helpers. No browser-role
  table writes, purchase/order/provider calls or analytics. Shipping fields are strict-private
  and separately disabled until approved retention/purge readiness and intake settings.
  No billing changes or existing-progress rewrites occur. The server flag and DB launch gate
  both default off; no arbitrary prestige threshold is seeded.
- Natural requirements are snapshotted at programme creation. Catalogue definition
  drift closes claims until a new reviewed programme is configured. Member locks and
  unique `(profile_id, programme_key)` make retries atomic/idempotent. Manual/test
  recognition cannot substitute for accepted activity; fraud revocation preserves
  history and cannot be undone through a repeat claim.
- EN/ES member trophies, minimal privacy controls, printable certificate, downloaded
  share card, voluntary paged Hall, and admin configuration/review/revoke studio.
  Reduced-motion styling, both themes and responsive grid are scoped to this feature.
- Read-only hosted coverage: only 2 currently credential-eligible venues in one city,
  zero classified eligible category/city families, zero complete holographic cities.
  This blocks an honest City Master launch and does not describe total venue inventory.
- Rollback: close gates/revert app source; retain additive records. Do not reset XP,
  erase stamps or replay reward claims. No live mutation, order or fulfilment occurred.
- Verification checkpoint: focused disposable PostgreSQL role/ownership/launch,
  natural/manual/test provenance, retries, definition-drift, visibility withdrawal,
  physical-disabled and revoke tests pass. EN/ES UI/privacy/SVG tests and TypeScript
  pass. Full current-head check/build, hosted schema/advisors, responsive browser
  acceptance, exact-head CI and deployment/activation remain separate gates.

Prestige validation follow-up: the full local `npm run check` completed successfully,
including the production build. The final focused suite passes 28/28; scoped lint,
TypeScript and formatting also pass. Hosted browser acceptance is explicitly pending
because local Playwright's CDN archive was truncated. Account data portability adds
a separate schema-ready-only caller export while launch is off; account deletion
cascades private awards/interest and clears audit actor references. No live schema,
flags, awards, shipping PII or fulfilment changed.

Prestige shipping infrastructure follow-up: completed the gated private address path,
owner-only intake/read/delete/export, explicit expiry, service-only bounded purge,
purpose-audited single-address admin reads and manual optimistic delivery transitions.
Review/intake/preparation/dispatch recheck accepted-source eligibility; test/manual
awards and stale role assumptions cannot authorise a shipment state. There is no order
or provider call. Independent shipping/delivery flags default false; retention defaults
NULL and purge readiness false. No production PII was collected or processed.

The independent privacy surface `/[locale]/privacy/prestige` reuses verified optional
identity, with no terms/account-feature lock; data export/delete/withdraw survive closed
launch. Reward/intake actions conditionally call the shared `account_features_allowed()`
helper when installed. Tests cover that migration ordering and restricted accounts.
Forty focused tests and sixty-four real Chromium component combinations now pass,
including EN/ES, themes, phone/tablets/desktop, actual PNG output, private intake/deletion
and admin read/hide/status controls. Inspected screenshots exposed and corrected a
light-theme trophy heading contrast defect; the new regression checks its actual color.
Full final shipping check and exact-head hosted CI remain release gates until recorded.

Final local shipping verification: 40 focused tests, TypeScript, scoped lint/format and
64 real Chromium component cases pass. The broad final local check encountered six
timeouts in unchanged catalogue/map/rental/Spanish SQL tests during resource contention;
all six pass unchanged when rerun in focused groups (32 cases across seven files).
The initial digital candidate passed the full check/build. Exact final hosted CI is
required; no test timeouts/assertions were weakened and no production action occurred.

## 2026-10-20: Reserved server image uploads (gated follow-up)

Venue and event image actions now share server-owned byte inspection, SHA-256,
member-owned quota reservation, identical service Storage write and readback,
service-only verification and one-use owner receipt. Migration173552 depends only
on standalone170415, defaults strictfalse, and denies direct authenticated
Storage INSERT/UPDATE after explicit activation. Existing read/delete/data remain.
Free/Premium maximum image dimensions1920/3840, browserJPEG .8/.9. See
ENFORCED_LISTING_UPLOADS.md for atomic two-product rollout, rollback and actual
provider acceptance still required. No live change performed.

## 2026-10-20 | Operations billing and renewal migration

Adds EN/ES owner location checkout, confirmed paid upgrade adapter, same-subscription scheduled downgrades, explicit private legacy migration scopes and one-time owner initial selection. Cross-app handoff carries only locale/workspace; sole AkiPasa webhook and referral invoice/hold processing are preserved. SQL uses private RLS tables, owner/account eligibility and service-only atomic ledger writes. Existing personal Premium is untouched; legacy business retires only on the verified replacement invoice. Tests cover failed payments, duplicate leases/events, private scope and owner isolation, schedule retries and annual paid expiry. Release remains gated pending hosted migration/CI, merchant tax/price readiness, sandbox and browser acceptance. Rollback/recovery details: `OPERATIONS_BILLING_RELEASE.md`.

## 2026-10-20 | AkiSuite mission integration candidate

The integration combines exact source heads #211–#219, preserves all historical
contract text, and retains independent feature/activation gates. Account export
now composes both onboarding and Passport privacy records with caller identity
and complete-export failure semantics. All original package suites and source
ancestry are retained. Included heads, conflict resolutions, acceptance status
and rollback limits are recorded in `docs/AKISUITE_MISSION_INTEGRATION.md`.
No production deployment, migration, financial mutation or fulfilment is implied.

## 2026-10-20 | Safe cross-product task resume

The gated central completion flow now resumes allowlisted tasks across all five
products using fixed canonical origins and the shared EN/ES navigation contract.
Identity and onboarding state remain server-authoritative; no credentials cross
domains. See `ACCOUNT_TASK_RESUME_V1.md` for tests, safety boundaries and rollout.

### Integration SQL audit follow-up

The gated toolbox migration declares browser-role revocation and service SELECT
against its exact four private tables rather than schema-wide table statements.
This preserves intended ACLs, narrows cross-feature coupling and passes the
changed-migration permission audit. Mirrored SQL remains identical; executed
owner/service lifecycle tests are rerun. No production migration is implied.

## 2026-10-20 | Recover operations before the first toolbox exists

Adds additive recovery lease/backoff columns and service-only claim/finish RPCs to operations bindings and checkout reservations. Central cron handles missing first webhook, validates customer/workspace/token and actual paid price lines, then applies idempotent billing and catches up rotation. Foreign owner/browser calls are denied; pre-renewal legacy prices defer without activating new tools. Tests execute10SQLrole/lease scenarios and7adapter scenarios; typecheck/scopedlint are required at handoff. Gate defaults off pending integration/provider acceptance. Existing email and event cron work remains independent.

### Hosted entitlement provenance compatibility

The canonical toolbox sync respects the existing entitlement source CHECK by
mapping Stripe to purchase, trial to trial and approved other grants to manual.
A forward-only function replacement preserves applied table migration history.
The fixture now includes the actual CHECK and nonempty twelve-tool catalogue;
paid activation asserts purchase provenance. The release manager's rollback-only
actual-schema acceptance preserves zero toolbox enrolment and legacy paid access.
Exact hashes, bounded acceptance and no-replay instructions are recorded in
`docs/AKISUITE_MISSION_INTEGRATION.md`.

## 2026-10-20 | Referral administrative eligibility and approval

Before: invoice evidence was always held_unapproved and had no administrator
approval-review history. Existing fraud/dispute cases and RLS were already present.
After: separate default-disabled review settings and immutable admin-only decision
ledger; paid evidence eligibility, prior-review/document-backed approval, retry
idempotency, current hold/suspension revalidation, bounded EN/ES queue and existing
JSON export inclusion. Frozen invoice evidence and its held eligibility do not
change; actual payouts and monetary incentives remain hard disabled.

Dependencies: shared170421 foundation, profiles/admin roles, signed Stripe billing
evidence and customer identity, code/representative membership, existing case/audit
RLS, schema readiness, owner versus admin routes, EN/ES forms and bounded exports.
Role/SQL and rendered UI/export tests accompany mirrored180654. No live migration,
programme/Stripe value, legal assertion, accounting instruction or disbursement.
Read REFERRAL_PAYOUT_REVIEW.md before deployment or either readiness/gate change.

## 2026-10-20 | Additive database account-lock coverage

Read-only metadata identified direct RPC/mutation paths beyond the initial
account guard. The disabled-cohort coverage candidate adds permission/RPC/table
intersections without enrollment, customer backfill, billing or data changes.
See ACCOUNT_DATABASE_COVERAGE.md and the recorded metadata manifest. Representative
PGlite coverage and the complete generic-snapshot tool matrix pass; exact-schema
staging, advisors and authenticated privacy/provider acceptance remain gates.

### Final integrated account and referral coverage

The coverage manifest includes the new private toolbox owner predicate, six
authenticated referral RPCs and nine referral mutation tables. It preserves
service-only verified billing and existing portability/deletion exceptions.
Actual-membership and direct-RPC SQL regressions intersect restricted callers
while preserving grandfathered users. Task resume retains bounded vehicle/dates
and booking page keys in both languages. The final scoped suites pass 70 account
and 41 referral cases; exact integrated hosted CI remains mandatory before merge.

## 2026-10-20 | Service-enqueued legacy renewal schedules

Adds private immutable reviewed migration commands and explicit service RPCs; no browser endpoint or credentials. Central cron uses the existing billing key and bounded leases. It checks unchanged source/binding, creates from_subscription only, preserves full current phase/defaults, saves future plan before writing, requires provider future invoice preview with existing discount and exact paid-expiry period, then verifies schedule/current subscription readback. Source changes, unrelated schedules, nonzero invoices, unknown fields and expired ambiguous attempts fail closed. Retains legacy access until actual new-price payment reconciliation and leaves personal plans untouched. See OPERATIONS_RENEWAL_COMMANDS.md for gates and rollback.

## 2026-10-20 | Portal browser selector compatibility

The integrated tablet portal smoke exposed an ambiguous logo selector after the
five-product suite menu began retaining the current product. The browser harness
now scopes the logo to the primary brand link and verifies the single current-role
marker plus all five exact language-preserving destination URLs. Application,
billing, canonical schema and authorization source remain unchanged. Existing
layout, image-loading, keyboard, theme, catalogue and navigation assertions remain
in the full 64-case EN/ES, light/dark, phone/tablet/desktop matrix.

Verification: all 64 combinations pass in Chromium 143 on the exact component
source. Phone light and tablet dark menu screenshots were inspected; scoped
ESLint, formatting, contract integrity and whitespace checks pass. Hosted full
CI must pass on the replacement commit before merge.

## 2026-10-20 | Spotlight claim acceptance follows AkiHQ

The sparse-venue browser case retained the retired local claim label and URL after
the approved BusinessPathway conversion integration. It now opens the contextual
business prompt and verifies the exact AkiHQ Spanish claim URL with the synthetic
venue identifier. Existing assertions for useful listing information, missing
media, absence of fabricated opening hours/booking and mobile containment remain.
Application behavior, claim authorization, analytics and production data are
unchanged. This is an isolated acceptance amendment after the frozen mission
candidate; final hosted CI remains required before release.

Validation: the real-route fixture production Next build and all 28 Chromium
Spotlight cases pass, including the exact Spanish HQ claim destination. Scoped
ESLint, contract integrity, formatting and whitespace checks pass. Fixtures remain
loopback-only, with no real external requests or production data mutations.

## 2026-10-20 | Operating identity deletion compatibility

New billing profile links previously blocked identity deletion. Mirrored additive
20261020185200 makes those links nullable with SET NULL, and clears obsolete
individual tool limits with their deleted membership. It preserves business and
financial records, prevents detached grants/rebinding, excludes detached recovery
and handles signed webhooks without referral attribution or legacy fallback.
No production identities, billing state or retention rules were changed.
See OPERATIONS_IDENTITY_DELETION.md for actual fixture evidence, deployment
ordering and existing operator-reviewed deletion/financial retention dependencies.

## 2026-10-20 | Preserve current-master consent-aware Google queue repair

The final mission candidate merges current master `cd600e8254d26c73cb6c8c879e4a5c8b24d79803`
and preserves the complete #230 native-arguments Google command fix and its
regression. The combined component still intersects analytics/marketing choices
with server-derived tracking eligibility, leaves every consent signal denied for
restricted accounts, loads optional tags only with permission and disables Google
Signals and ad-personalisation signals in GA4 configuration. Both original contract
entries and all restored historical content are retained. No measurement IDs,
provider destinations, account cohort settings, billing source or schema are changed
by this merge. Exact-head CI remains a release gate.

## 2026-10-20 | Reviewed operations runtime release configuration

A separate post-#229 release PR declares billing/migration worker gates true while
keeping operating checkout/tax and all existing suite acquisition gates false.
No commands are enqueued; legacy-price recovery remains deferred. Central billing
cron also independently retries the existing service-only owner notification
outbox, bounded to 100 rows and ten seconds, without changing billing outcomes
on delivery failure. The DB notification launch setting remains independently
closed. Installed Wrangler 4.113 upload metadata and primary configuration docs
confirm explicit vars are supplied even with keep-vars. Read
`docs/OPERATIONS_REVIEWED_RUNTIME_ROLLOUT.md` for exact settings, dependencies,
verification and rollback. No source is deployed, provider write made or customer
configuration mutated by preparation; only the release manager may merge and
verify the actual production source before enqueueing three reviewed commands.

## 2026-10-20 | Narrow referral audit identity-sequence ACL repair

Before: the hosted public-schema default sequence ACL would grant anon,
authenticated and service_role sequence capabilities on the new referral audit
identity sequence, despite protected audit rows. After: additive185822 revokes
only that sequence, without editing170421/180654 or global defaults. Owner-run
configuration audit still appends. Private review sequence, billing permissions,
RLS, programme checks and all other legacy sequence privileges are unchanged.
Six executed PGlite cases cover inherited grants, raw nextval/setval/read denial,
administrator audit appends, unrelated/review ACLs, financial gates and repeat
execution/mirror identity; existing referral suites are rerun. Source-only install
packet records dependencies and hosted acceptance gates. No production write.

## 2026-10-20 | Account wrapper terminator repair

The production attempt to install un-applied coverage migration 180946 rolled
back with SQLSTATE 42601: PostgreSQL rtrim removes spaces, so a real function
ending END; followed by LF/CRLF received a second standalone semicolon. Both
canonical migration copies now preserve the complete original body and detect
its final semicolon using POSIX whitespace before appending a missing terminator.
No existing routine logic, ACL, owner or attributes are rewritten beyond the
original account guard. A disposable PostgreSQL regression loads complete real
referral foundation/review migrations and the real venue-invite routine,
reproduces the original syntax failure, then compiles the corrected complete
wrappers and verifies retained bodies/attributes, pending denial and legacy
authorization behavior. This corrects the still-unapplied migration; do not
blindly rerun its table/policy creation in a database where it is already recorded.
No live QA transactions, enrollment activation or production writes were made
for this repair. The successful production retry remains a separate release gate.

## Standalone listing Premium template and media library candidate

Before: canonical template/folder/shared-media source depended on the broad old
unapplied suite subscription migration. After: standalone233027 adds separately
gated schema/RPCs and focused EN/ES draft template UI, reuses folder/share controls,
validates active CRM plus both venue scopes, and preserves exact licensed placement
uses on downgrade. Upload reservations and final media/placement writes account for
shared assets under the existing quota lock. No operating subscription, price,
Stripe value, existing customer/media/event row or production activation changed.

Dependencies traced: actual CRM ownership/member links, listing entitlement
resolver170415, verified byte reservation173552, existing media placement and
Storage paths, event snapshots/draft status, owner forms, EN/ES and independent HQ
consumer. SQL/role/UI tests accompany the change; actual provider/concurrency and
authenticated responsive acceptance remain release gates. Large hosted rollback
attempts returned no evidence and are not claimed as passing. Runbook and retained-
data rollback: LISTING_PREMIUM_LIBRARY.md.

## Forward listing event identity guard

Verified gap: deleting then re-inserting the same event UUID reused170415's
retained monthly slot. Additive233905 rejects INSERT of any retained event UUID,
including another venue/tier, and rejects primary-key UPDATE while enforcement
is enabled. It retains the applied migration, RLS, fresh draft/ordinary edit,
account-completion statement guards and all publication history. No entitlement,
flag, customer/event/media data or production schema changed by this patch.

Actual-role SQL regression reproduces the original bypass before migration and
checks blocked resurrection/upsert/PK changes, foreign actor denial, Premium,
private execution and pending/complete onboarding intersection using the actual
cohort guard SQL. See LISTING_EVENT_IDENTITY.md; hosted CI and production schema
acceptance remain separate gates. Large hosted rollback tool hangs are not passes.

## 2026-10-21 | Remove historical paid-HQ acquisition and preserve operations login intent

Replaces current membership acquisition cards with free HQ and canonical monthly paid Business tiers, independent listing/personal Premium and accurate category workflows. Existing legacy billing catalogue, subscription resolver, portal/cancellation and stored records are preserved. No annual operations prices are derived. Middleware overwrites client-supplied return headers, forwards only exact EN/ES operations destinations and validated single workspace, and AccountLayout uses its existing trusted contract. Regression evidence includes rendered ownership/readiness and history-preservation checks, EN/ES account-layout/middleware tests, malicious redirect cases and browser route/layout coverage. No production writes.

New checkout server actions explicitly reject retired AkiHQ Standard/Pro, Business add-on and Enterprise acquisition even with all checkout gates enabled. Historical identifiers, subscription renewal synchronisation, customer access, billing portal and cancellation remain supported. Personal and listing Premium retain their existing authenticated checkout safeguards.

## 2026-10-20 | Operating referral eligibility and private representative evidence

- Before: capture checked historical public subscriptions but omitted the real
  private operating ledger; representatives saw only aggregate conversion activity.
- After: existing bound operating customers cannot make a late new-customer claim.
  Approved representatives receive bounded owned subscription/invoice proposal and
  safe administrative review history, with dynamic holds and no payable/paid state.
- Dependencies: installed foundation170421/review180654/corrected coverage180946,
  shared identity, existing code-owner immutability and review audit, optional private
  operating ledger, account/referrals EN/ES, normal authenticated RLS and a new off
  schema-ready presentation gate. Shared cross-app task-resume is untouched.
- Security: guarded capture body/owner/ACL retained, shared helper private/denied,
  all caller guards precede reads, suspended/foreign reps excluded; no customer,
  Stripe or internal review identity/document/note leaks. No cash flag/rate selected.
- Evidence:58 focused SQL/page cases and16 real-component Chromium cases pass;
  corrected real coverage wrappers compile; TypeScript/scoped lint/SQL audit pass.
  Full exact-head hosted checks and actual production acceptance remain required.
- Rollback: disable new presentation readiness; retain customer exclusion, guarded
  shared evaluator, immutable financial/attribution history and existing ACLs.

## Listing schema-reader source configuration

Adds server-only LIMITS_READY and UPLOADS_READY runtime vars after the standalone
shared schema is installed. Database count/strict gates remain independently off;
strictfalse retains legacy authenticated upload. No customer, billing, global old
feature flag or library activation changes. See LISTING_SCHEMA_READINESS.md for
actual owner paths, native-property dependency, acceptance and coordinated rollback.

## Listing library usage presentation refinement

The initial library consumer counted all pickable organisation assets in its
upload allowance. The follow-up counts owned media IDs plus actual local slots,
header and other event placements, deduplicated by asset. This preserves uploads
at locations with small licensed collections even when the shared library is large;
retained assets without preview URLs still count. Changing venues resets the media
component. SQL/API quota and entitlement guards are unchanged. Focused usage and
EN/ES template tests, owner regressions and TypeScript accompany the amendment.

## 2026-10-20 | Validated referral task completion

Account completion preserves a single public referral code matching the existing
uppercase alphanumeric 8–24 character navigation bound. The canonical public
`/{locale}/referrals?ref=CODE` task returns to AkiPasa's explicit confirmation page;
other allowed product tasks retain their validated code and EN/ES choice through
the same fixed-origin resume envelope. Duplicate, URL-shaped, lowercase and
out-of-range codes are discarded. Direct unprefixed AkiPasa referral completion
uses this same sanitizer rather than falling back to Account.

This changes navigation only: pending/underage restrictions, legal and tracking
choices, first-attribution immutability and the explicit confirmation action remain
authoritative. No automatic attribution, referral cookie, identity transfer, schema,
financial incentive or production write is introduced. Shared contract copies and
role-controller regressions cover all five products and both languages. Hosted CI
and exact-source release checks remain required; unit fixtures do not establish
authenticated production browser acceptance.

## 2026-10-20 | Post-batch candidate with explicit operator hold

A separate integration based on primarya974c449 preserves reviewed227/232/234–242
source ancestry, corrected media client boundary and all contract entries. It
proposes closing only the migration worker batch gate after the release manager
verifies all three actual customer schedules; billing remains true and checkout/tax
remain false. No success receipt is fabricated and no primary/provider/SQL write
occurs during preparation. Exact source heads, staged versus already-applied SQL,
independent listing/referral activation gates, tests and rollback are recorded in
`docs/AKISUITE_POST_MIGRATION_INTEGRATION.md`. The config test refuses all provider
and database requests with the closed batch; existing engine cases stay explicitly
enabled. Required exact-head CI and the operator hold must both pass before merge.

## 2026-10-20 | Verified owner migration status and bilingual initial tools

Additive authenticated owner-only read projection and central operations UI, with matching migrations in both source directories. Private queue and provider identifiers are never returned. Checks bind the current owner and original payer, sealed service evidence, approved business/business_pro cohort and zero upcoming invoice; scheduling never implies a payment or licensed tools. Existing ordinary downgrade display remains intact; all twelve initial tool keys render friendly EN/ES labels reused by checkout. SQL acceptance covers positive cohorts, foreign/removed/transferred owners, anonymous access, queued/prepared/blocked state and mismatched/missing evidence. Rollback: revert UI/module and drop only `public.crm_operations_migration_status(text)`; retain all financial and customer data. Live migration/application, exact-head full CI and production acceptance remain release-manager gates.

## 2026-10-20 | Consent-gated trusted commercial stage ledger

Adds disabled-by-default future-only verified claim/workspace/checkout/invoice/
upgrade/cancellation observations using existing analytics_events and private proof
links. Approval-referenced retention is NULL until operator review; no monetary,
consent, rollout or production configuration is assumed. Manager queries are bounded
and explicitly exclude causal conversion rates/sitewide attribution. Consent/age/
onboarding withdrawal and profile deletion remove only new linked optional rows;
financial history and unrelated analytics remain. See TRUSTED_BUSINESS_FUNNEL.md
for exact source evidence, unsupported adapters, tests and activation/rollback gates.

## 2026-10-21 | Own-identity optional commercial-stage export

Adds caller-only bounded privacy projection and complete account-export pagination
for new commercial observations/consent timestamps. It intentionally bypasses feature,
age and onboarding locks while retaining identity isolation. Raw provider integrity
references remain private; actual financial/billing exports are unchanged. Fixed
watermark/count checks fail the whole file on partial results or exhausted budget.
Readiness depends on both new funnel migrations; collection remains disabled and no
production data/configuration changes occur. See TRUSTED_BUSINESS_FUNNEL.md.

## 2026-10-21 | Supported Next16 runtime for AkiPasa

Next/eslint-config-next16.4.2, OpenNext1.20.12 and Wrangler4.151.3 replace the expired major support window without a bypass. Existing React, security overrides, edge middleware, tenant/authentication rules and one-minute image cache policy remain intact. Explicit Webpack and native flat lint preserve build behavior. Documented new compiler recommendations are deferred while compiler is disabled; original hooks/security/a11y rules remain. New internal-navigation findings use the Next router with regression evidence. See docs/NEXT16_RUNTIME_UPGRADE.md for primary sources, migration choices, verification and rollback. No billing, schemas, product roles, provider or production mutations are part of this dependency branch.

## 2026-10-21 — Add bounded private operating runtime diagnostics

The existing release endpoint adds three configuration-presence booleans only, without database/provider calls. Scheduled billing/migration work emits service-only fixed-enum private health behind a disabled-by-default SQL singleton; original results and failures are preserved. Migration processing remains enabled pending verified actual schedule receipts; checkout/tax remain closed. See [OPERATIONS_RUNTIME_DIAGNOSTICS.md](OPERATIONS_RUNTIME_DIAGNOSTICS.md) for exact dependency ancestry, 22 focused cases, separate operator gates and rollback. No production SQL or provider actions were performed by this source change.

## 2026-10-21 | Bounded own referral and prestige privacy export

- Before: raw referral exports leaked approver/reviewer IDs, suspended representatives
  lost authored records, own audit/reviews were omitted, and prestige export was
  unbounded and omitted still-retained expired addresses. Reviewer FK blocked profile deletion.
- After: caller-only twelve-section keyset projection, bounded complete reader and
  503/no-store on partial/changed/oversized/unavailable data. Own payer/referrer facts
  are separated; other people, raw audit content and internal review notes stay private.
- Dependencies: existing referral/review/prestige schema,243 funnel export and actual
  a974 notification recovery preserved; new schema-readiness flag off until applied.
  It remains separate from optional acquisition/gameplay, cohort and cash activation.
- Identity deletion: drop only blocking review-actor FK; retain actor UUID and all
  financial evidence. UUID is pseudonymous; no invented legal retention/anonymity claim.
- Evidence:22 new database/reader/HTTP cases pass;37 overlapping private/funnel plus
  6 legacy prestige and10 account-export cases pass. Type/lint/SQL/contract checks pass.
- Rollback: keep compatible privacy readiness/readers while retained rows exist;
  preserve historical audits and correct shipping cascades, never delete financial
  records or restore a blocking FK to make an older consumer pass.

## 2026-10-21 | Supported independent mission feature integration

Combines reviewed immutable provider heads227/232/234–243/245/247/248 with full ancestry, retaining migration processing true and checkout/tax false. Actual scheduler regressions preserve first-tick private health, independent notification/billing recovery and optional funnel cleanup. The shared-library client boundary and owned/placed usage counts are corrected; account-only funnel/referral/prestige exports remain available to restricted identities with pagination completeness checks. Final false migration closure is isolated until actual operator-verified schedule receipts; no independent feature waits on those receipts. See AKISUITE_POST_MIGRATION_INTEGRATION.md for exact heads, applied-versus-staged SQL, gates and verification. No production/provider actions accompany this integration.

## 2026-10-21 | Retained shared media identity (gated forward repair)

An actual-role owner regression reproduced reuse of a deleted retained media UUID
with a replacement image after downgrade. New forward guard003500 rejects media
primary-key updates and retained-ID resurrection/upsert while preserving existing
assets, exact old reuse and normal metadata edits. Strict owner Storage overwrite
and a valid new receipt cannot bypass the guard. See LISTING_MEDIA_IDENTITY.md.
11 focused SQL cases pass, permission audit0 findings; hosted builds/provider
acceptance remain separate gates. No live application or activation performed.

## 2026-10-21 | Library requires verified uploads

Forward migration004500 enforces library_enabled implies uploads_enforced in
the database. Activation with legacy byte overwrite fails atomically; disabling
strict uploads while the library is active also fails. Safe rollback disables
the library and strict uploads together, preserving media/placements/grants.
Three new actual-role cases exercise these transitions and the real SQL owner
reservation→service receipt→media/placement flow with all guards active. This
is not provider Storage acceptance; library activation remains blocked until
actual byte-path acceptance. No live SQL or runtime flags changed.

## 2026-10-21 | Preserve management scope through shared account completion

The canonical bounded account-task contract now retains the actual property/company/organisation query names consumed by management destinations, alongside existing IDs. EN/ES cross-product envelopes reject duplicate, external, traversal and overlong values; real central pending→complete redirects preserve selected scopes. No destination origin or authorisation is supplied by this context; destination permissions remain authoritative. Integration preserves246 media identity and250 strict-library invariant ancestry; activation and actual Storage acceptance remain separate operator gates.

## 2026-10-21 | Supported browser acceptance and real consent opt-out

Next16 browser acceptance uses the same explicit webpack compiler as the supported application build. Tablet navigation makes and verifies a real optional-tracking rejection before navigating, waiting for the actual privacy panel lifecycle rather than racing hydration or seeding a consent-version cookie. All three optional cookies must remain denied; no product consent behavior, feature assertions or test cases are disabled. Exact browser matrix and hosted CI remain required.

## 2026-10-21 | Membership hub product-role and return-status correction

Replace the historical four-product upgrade summary with five canonical roles, add AkiCoches and remove paid HQ acquisition links. Do not infer operating entitlement from the legacy listing SKU or count it as an upgraded operating application. Preserve existing billing history, annual records, end dates, portal and cancellation semantics; label legacy records explicitly. Current listing/personal interval controls retain their same-product backend identifiers. Account checkout returns display pending authoritative confirmation. No schema, provider, price, runtime flag or access-grant mutation occurs. Rollback: revert the component/CSS/page copy; preserve all existing customer records. Focused EN/ES component and query-return regressions pass; final combined full CI/deployment verification remains the release manager's gate.

## 2026-10-21 | Installed identity privacy reader and canonical membership acceptance

After release-manager installation/readback of001138, the server-only private identity export reader is declared ready without enabling referral/reward programmes or changing paid access. Integrated256 renders all five canonical product roles, preserves historical billing/portal/cancellation, and treats a checkout-return query as pending confirmation. Existing acquisition acceptance cases now assert freeHQ,4/8/12 operating tools and independent disabled listing checkout instead of retired newEnterprise/HQ offers; all route/theme/viewport/security coverage remains. Final exact-head CI and production verification remain required.

## 2026-10-21 — Account acceptance and persisted-consent route evidence

Updated the remaining account-control assertions to the approved five-product
catalogue: listing access and neutral operating-tool handoffs replace retired
new-purchase AkiHQ assertions, while the actual legacy billing portal submission
and its payload remain tested. All 65 account tests pass. The existing public UI
loopback host proxy now retries one connection reset for GET only and drains its
in-flight handlers before browser teardown; HTTP errors and consent assertions
remain authoritative. All 20 EN/ES, light/dark AkiDuermo privacy viewport cases
pass locally on Chromium 153. The tablet sweep now checks persisted version and
all three denied choices after every route, preserving all seven viewports and
navigation/layout checks. Its English/light 63-route sweep passes locally; the
full hosted matrix remains required because the prior candidate lost cookies at
the second viewport in hosted Chromium. No consent, authentication, billing,
feature activation or provider behavior changes in this amendment. Fresh Next16
production build passes. The separately tested diagnostic #247 final head
9e5a05e is now primary merge39f50a3, and its ancestry is retained by this candidate.
Optional funnel schema is not installed per the release manager's readback;
FUNNEL_READY remains unset. No completed customer migration receipt is asserted.

## 2026-10-21 | Listing library deletion compatibility

Forward migration014000 retains template/folder snapshots with nullable SET NULL
venue/workspace links, while existing membership checks keep archived rows private.
It removes upload-receipt deletion blockers without deleting business images or
Storage objects. Original0060 owner/operator RPCs retain their authorization and
confirmation/reason contract. Seven actual-role regressions cover both venue paths,
event removal, workspace detachment and profile erasure; original14 library/guard
cases remain passing. Financial retention and live Storage acceptance are separate.
See LISTING_LIBRARY_DELETION_COMPATIBILITY.md. No live flags or data changed.

## 2026-10-21 | Reject stale account JWT after profile deletion

The shared `account_features_allowed()` guard now requires the authenticated UUID
to retain a `public.profiles` row. A still-valid JWT therefore cannot keep gated
account access after identity/profile deletion. Existing profiles without an
onboarding row remain compatible; pending/underage profiles remain denied and
completed profiles remain allowed. The function stays `SECURITY DEFINER` with an
empty search path, anonymous execution revoked and authenticated execution retained.
The mirrored additive migration passed its PGlite negative-authorization cases and
the SQL permission audit. The authorised shared project applied the same migration;
readback confirmed owner `postgres`, the fixed search path and grants, and a
synthetic nonexistent profile was denied. Rollback restores the preceding function
body only if the stale-JWT risk is consciously reaccepted; no table or customer row
was changed.

## 2026-10-21 — Remove the public membership tool selector

**Scope:** AkiPasa public membership catalogue only.

Removed the business-type example selector from the shared public catalogue. Public
cards retain AkiHQ Free, applicable product Premium, and AkiBusiness Standard/Plus/Pro
with the approved 4/8/12 allowances. Actual tool selection remains available only in
the authenticated workspace-scoped AkiBusiness operating flow. Added a rendering
regression that asserts the public combobox and selector heading are absent.

**Risk/rollback:** Presentation-only and additive test coverage; no database, Stripe,
price, entitlement, subscription, feature flag or route mutation. Roll back this
single source commit if the public layout regresses.
