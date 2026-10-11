# AkiSuite performance audit — 11 October 2026

The current stack can support a responsive first app release. The immediate
problem is cumulative work: blocking server reads, catalogue queries that grow
with the dataset, globally loaded UI, and expensive shared paint effects. Keep
Next/Supabase and fix those boundaries before considering a native UI rewrite.

## Scope and evidence

- AkiPasa/AkiBusiness/AkiDuermo/Passport, public and protected routes, shared
  layout/auth/media/recommendation services, automation Worker, Android host,
  migrations, test and release configuration: `elguiriashing/akipasa`, public
  `master` at `abe7d8755cd73a93457f2afa5bbd0ea5398f69f5`.
- AkiHQ: read-only audit of `elguiriashing/akihq` `main` at
  `6d6b1bae7e8a76ec4c5e59fbf9b6ad12c100caa3`; checked the actual `app-v32.js`
  entrypoint and its imported scripts. No HQ/POS behavior is changed here.
- Supabase: read-only function definitions, performance advisors and classified
  `extensions.pg_stat_statements` aggregates from the connected shared project
  named **AkiPasa Development**. The name alone does not prove environment
  isolation. No records, functions, indexes, policies or configuration were changed.
- Controlled production Next builds on localhost, with disposable Auth/PostgREST
  fixtures adding 120 ms per backend request. Both compared builds use
  `NEXT_PUBLIC_DATA_PROVIDER=hybrid`. The fixture listen queue is 128 to avoid
  artificial connection retries when page reads run concurrently.

This is a repository-wide audit, not a claim that every screen was manually
exercised. Live HTTP probes returned 403. Local Chrome/Chromium installation was
blocked; the new browser checks have been added to CI. Authenticated live
navigation, physical-device frame timings, real-network percentiles and app-store
acceptance remain unmeasured. The timing tables below describe simulated SSR,
not production click-to-screen latency or scroll FPS.

The final candidate also incorporates `master` claim-contact update `35c4649`
(PR #102), preserving its form, private metadata, Staff renderer, migrations,
notification dispatch and tests. The measurements remain comparisons against the
original audit baseline; they are not rerun production measurements.

## Implemented in this candidate

| Change                                                                            | Purpose and boundary                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Route loading boundaries for locale, Account, Admin, Staff, Business and Passport | Allow streaming/loading feedback and Next's partial route prefetch rather than a silent wait. Layout guards still run.                                                                                                    |
| Shared navigation uses `useLinkStatus`                                            | Display a pending indicator and suppress repeated activation of the same pending link. Keep native links, modified clicks and router cancellation behavior.                                                               |
| Request-scoped `optionalUser` and `viewerProfile`                                 | Reuse authenticated client and viewer projection inside one server render. Fresh `getUser`, terms and role checks still run on subsequent requests; no shared identity/role cache.                                        |
| Page-level Admin authorization                                                    | Deny before overview query fan-out, rather than depending only on the parallel layout guard. RLS remains authoritative.                                                                                                   |
| Parallel independent Discover, Map and Passport reads                             | Remove explicit waterfalls without changing ranking, filtering, pagination or unavailable-data handling.                                                                                                                  |
| Lazy owner toolbox panel                                                          | Keep saved appearance and launch controls immediately available; defer toolbox/Pals code until opening. Owner server actions keep existing authorization.                                                                 |
| Batch venue media signing                                                         | Sign up to 60 images with one Storage call; match responses by path, preserve order/labels, omit failed objects. Bucket policies and URL lifetime remain unchanged.                                                       |
| Touch/reduced-motion rendering override                                           | Stop ambient body animation and fixed background attachment; replace shared blur sampling with stable theme surfaces. Palette, layout and borders remain. Custom background images scroll with the document on this path. |
| Demand-driven Passport foil                                                       | Interpolate while input changes, then stop frame scheduling/style writes when settled. Pause while hidden, wake on pointer/sensor/recenter input, cancel on unmount.                                                      |

The rendering override is deliberately narrow and temporary. It addresses
plausible paint pressure in source; it does not establish that all reported
scroll lag is resolved. Fine-pointer desktop effects are retained unless reduced
motion is enabled. No global `will-change`, authenticated service-worker cache,
arbitrary navigation debounce or database migration is introduced.

## Controlled comparison

One paired run, same build mode and 120 ms backend delay; rounded milliseconds.
First byte may now contain a loading shell, not completed content. Complete body
time is shown separately so faster feedback is not confused with faster data.

| Route / viewer              | First byte before → candidate | Complete body before → candidate | Profile requests before → candidate |
| --------------------------- | ----------------------------: | -------------------------------: | ----------------------------------: |
| Explore EN / anonymous      |                      394 → 24 |                        396 → 280 |                               0 → 0 |
| Account EN / administrator  |                     533 → 440 |                        535 → 565 |                               4 → 1 |
| Admin EN / administrator    |                     525 → 403 |                        526 → 538 |                               3 → 2 |
| Staff ES / administrator    |                     528 → 396 |                        530 → 522 |                               2 → 1 |
| Map EN / administrator      |                     529 → 398 |                        530 → 399 |                               1 → 1 |
| Passport ES / anonymous     |                      141 → 17 |                        143 → 144 |                               0 → 0 |
| Passport EN / administrator |                     519 → 401 |                        640 → 526 |                               1 → 1 |

Admin's two profile requests include the overview's separate HEAD user-count
aggregate; the viewer projection is read once. Middleware plus server render
still perform two Auth requests in authenticated cases, both before and after.
The Account/Admin body times are essentially unchanged/slightly slower in this
single run: read reuse and loading feedback are useful but do not remove every
critical-path wait. Explore's first candidate run included one extra backend
request; a repeated anonymous request had three, matching baseline.

HTML-referenced initial JavaScript shrank by about **32 KB raw / 11 KB gzip** per
sampled route. Account: 604,832 → 572,886 raw bytes, 190,665 → 179,252 gzip bytes.
Map: 694,588 → 662,152 raw bytes. These totals include referenced polyfills;
they are asset inventory estimates, not measured browser transfers/execution.
The toolbox is a bounded saving; the remaining global client payload is substantial.

Reproduce from this branch's `scripts/profile-navigation.py` (Python 3.9+):

```sh
NEXT_PUBLIC_DATA_PROVIDER=hybrid npm run build
python3 scripts/profile-navigation.py --assert-candidate --output /tmp/candidate.json
python3 scripts/profile-navigation.py --root /path/to/built-baseline --output /tmp/baseline.json
```

Build the baseline with the same provider setting first. The script replaces
backend credentials with localhost fixtures and blank service keys. It uses
ports 3999/3100, reports request counts/assets, and checks role denial, invalid
sessions, stale terms and anonymous isolation after an authenticated request.
Streaming redirects/404s are checked through response instructions rather than
HTTP status alone. CI also runs it for authorization regression with its existing
fixture-mode build; compare performance only between identical build settings.

## Remaining bottlenecks, in priority order

### 1. Nearby venue query: strongest database lead

The available cumulative statement statistics contain 79,568 calls to
`public_nearby_venue_page`, **542.65 ms mean execution**, and a 2,999.28 ms maximum.
The observation window is unknown; these are not current p95 timings and do not
prove the cause of any individual click. Still, this is a strong prioritization
signal because Explore and Map call this RPC directly.

The function materializes candidates, normalizes every candidate name, calculates
distances, and performs a correlated duplicate-winner check against that
materialized set. The spatial index can help the initial radius filter, but it
cannot index the materialized deduplication relation. Dense-city and large-radius
requests are the next cases to investigate with plans and representative fixtures.

Next work: preserve claimed/verified/ID winner order and the existing 80 m boundary;
evaluate persistent normalized names and precomputed duplicate groups or an indexed
deduplication relation. Compare sparse/dense areas and page counts under anon,
consumer, staff and owner roles. Check RLS and plans before adding indexes. Do not
apply a speculative rewrite to live data. See existing venue-search/relevance and
pagination tests for behavioral constraints.

Other cumulative observations: Passport collection mean 198.52 ms (148 calls,
587.44 ms maximum); one HQ team-chat statement mean 173.89 ms (15,700 calls,
838.57 ms maximum). Measure query variants and a known recent window before
attributing those totals to a release.

### 2. Discovery fetches the event catalogue before filtering

`src/lib/repository.ts` reads published events and nested venue/media data, then
applies time/radius and other filters in application code. Map performs both
local recommendation and nationwide discovery reads. This scales with total
catalogue size, not the visible result page.

Introduce a bounded PostGIS/time-filtered event query and a slim map-point
projection. Separate viewport points from detail/card payloads; reuse the same
candidate set where possible. Keep stable sort, exact pagination, visibility and
sponsorship explanations. Virtualize long lists only after payloads are bounded;
virtualization alone will not fix a slow query.

### 3. Recommendation writes and global layout work delay content

`src/lib/personalisation/server.ts` waits for candidate loading, preference/config
reads and recommendation logging. Request/item inserts are on the response path.
Layout also reads owner access/preferences and can sign a private background
before rendering the shared shell. Business-host requests do some owner work
before returning their separate shell.

Measure each stage. Move nonessential, consented telemetry to a properly retained
Worker task/outbox only after preserving recommendation IDs and feedback
attribution. Avoid fire-and-forget promises that die with the Worker request.
Split optional owner appearance/support sections behind local Suspense where
visual consistency allows it. Stream page sections with independent failure
states instead of waiting for the slowest dashboard counter.

### 4. Shared CSS and paint pressure

At the audit baseline, six global stylesheets total approximately **497 KB of source**, including a
409,927-byte, 19,235-line `globals.css`. Multiple later overrides and `!important`
rules make both cost and design changes difficult to reason about. Shared glass
surfaces sample blurred content as it moves; animated body background-position
can keep painting even when the UI is otherwise idle.

Adopt one token layer, one shared shell stylesheet and route/component CSS
modules. Remove superseded rules using visual regression, not blind text deletion.
Restrict decorative motion to visible surfaces and transform/opacity where
appropriate. Profile paint/raster time, DOM size, images and frame intervals on
the actual tablet before expanding the touch override to desktop or changing
all visual effects. The only general scroll listener found is passive/once-only
analytics; source does not establish a universal React scroll-render loop.

### 5. AkiHQ redraws and polling share the main thread

The entry page eagerly references 27 assets: about 1.18 MB raw / 301 KB gzip.
`app-v32.js` alone is 521,591 bytes. `StateStore.save` synchronously serializes
the whole workspace to localStorage. `persist()` saves and requests cloud push,
then `render()` rebuilds the app root with `innerHTML` and restores form/scroll
state. Background-render suppression while interacting already helps, but a
full redraw remains expensive and risks perceived jumps.

Global loops include chat every 3 s, workspace every 4 s, presence/mailbox every
15 s, and Telegram every 5 s; chat also has realtime subscriptions. Replace full
root rendering with targeted view updates, lazy-load module code, and use scoped
invalidation/subscriptions plus hidden/idle polling fallback. Batch local
persistence and persist changed slices. Preserve immediate POS receipt/payment
durability and workspace revision/conflict handling. Convert one view at a time;
POS should have dedicated acceptance before changing its render/store boundary.

### 6. Database policy/index hygiene

Performance advisors returned 158 unindexed-FK notices, 37 auth/RLS init-plan
warnings, 54 multiple-permissive-policy warnings and 56 unused-index notices.
These are diagnostic counts, not a count of proven user-facing bottlenecks. Prioritize
tables on measured hot paths; check predicate/join indexes and make row-independent
Auth checks init-plan candidates without weakening authorization. Test equivalent
allow/deny behavior for every policy change. Do not drop indexes merely because
the current statistics show no usage.

References: [unindexed foreign keys](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys),
[RLS init plans](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan),
[permissive policies](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).
The October 10 retry-storm repair is documented in `database-conflict-incident.md`;
confirm recent health rather than interpreting historical totals as current errors.

## Groundwork for the suite and stores

Keep independent products/deployments, with explicit shared domain contracts:

1. Shared identity, memberships/entitlements, catalogue/discovery, bookings,
   Passport/rewards, communications/outboxes and typed domain errors. Keep
   authorization, idempotency and transaction rules on the server/database.
2. Versioned read/mutation APIs at those boundaries. Web server actions can call
   the same services; future iOS/Android clients should not depend on private
   Next action identifiers. Begin inside existing repositories; extract shared
   packages or a monorepo when both products actually consume the contract.
3. A persistent client shell and shared request cache for ordinary read data,
   scoped to user/tenant, cleared on identity/entitlement changes. Public
   catalogue projections may use bounded TTL/tag invalidation. Identity, role,
   booking inventory, payments and private media require appropriate fresh or
   explicitly expiring access; do not blanket-cache them in the service worker.
4. Feature modules with bounded loaders and local pending/error states. Heavy
   maps, PDFs, owner tools and management screens load on demand. Modularize
   AkiHQ's store/render lifecycle before a framework migration.
5. One canonical migration source with checked/generated mirroring to prevent
   database/Supabase migration drift. Add contract tests for shared APIs and
   component tests around changed user behavior, rather than source-text tests
   as the sole evidence.

The current Android secure WebView shares these web costs. A native rewrite
would still wait on the same slow queries. First establish API and measurement
boundaries; consider native navigation/UI later where device traces show benefit.
Test a release build on representative Android phone/tablet and iPhone/iPad, cold
and warm sessions, weak network, keyboard/orientation, OAuth return, back/forward,
deep links, background/resume and interrupted booking/payment operations.

## Measurement and release gates

Proposed budgets, to calibrate with device baselines: visible action feedback
within 100 ms; warm primary navigation p95 under 500 ms to useful content; cold
useful content p95 under 1.5 s on the agreed test network; field INP p75 at most
200 ms. Measure scrolling separately: INP does not measure scroll gestures.
Record frame intervals/dropped frames and long paint/raster tasks during repeated
ten-second scrolls on the same device, viewport, route, dataset and power state.

Add sampled route timing and server-stage timings with request IDs, route pattern,
build version, broad device/network bucket and counts. Avoid tokens, email,
profile IDs, precise coordinates or raw query strings; respect existing consent
boundaries. Compare cold/warm and anonymous/member/staff/owner separately. Keep
realistic latency profiles and bundle changes as CI evidence, not flaky absolute
speed assertions on shared runners.

Validation completed locally: full `npm run check`, production build, Cloudflare
packaging, focused pending-link/media/lazy-toolbox/foil tests and the controlled
authorization probe. Browser execution failed at launch because Chrome is
unavailable; new touch-rendering and existing Passport browser acceptance run in
the tablet CI workflow. Review their results before merge. Physical-device,
authenticated live and Cloudflare version-override acceptance are still required
before production release. This branch is a candidate; no deployment is implied.

Primary references: [Next 15 navigation](https://nextjs.org/docs/15/app/getting-started/linking-and-navigating),
[INP and its limits](https://web.dev/articles/inp),
[Supabase RLS performance](https://supabase.com/docs/guides/database/postgres/row-level-security#rls-performance-recommendations).

Browser follow-up: the first newly enabled Passport run exposed obsolete test selectors/drawer expectations; those checks now follow the existing mobile menu and accessible names, with the same interaction/permission/consent checks. The phone menu target is increased from 38 to 44 px. The first touch-surface assertion also needed to accept one scrolling attachment per background layer. See the PR for the final CI rerun; these initial failures are not counted as acceptance.
