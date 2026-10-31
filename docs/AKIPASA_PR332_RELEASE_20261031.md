# PR #332 release checkpoint — 31 October 2026

The integrated source, local checks, genuine Map-provider checks and all 93
real-backend acceptance checks have passed. The genuine authenticated Next browser
flow also passed. The two reviewed production database forwards are applied and
their postconditions are verified. Fresh hosted checks and the application rollout
remain pending.
This checkpoint does not claim that PR #332 has merged or deployed.

## Authority and completed page review

Alex explicitly instructed: “So 332 is done? If so, let's work on getting it to
live, if anything's remaining, get it done, checked, then live.” This supplies
the release authorization for the coordinated candidate, its necessary reviewed
database forwards and the existing automatic master deployment.

All 90 in-scope page reviews and six fallback reviews are accepted. The thirteen original
separate-product exclusions remain. The independently released private World
page from #341 adds one separate-product entry: 104 inventoried pages, 90
accepted in-scope pages, 14 exclusions and zero outstanding reviews. The historical 49/90 checkpoint is
superseded by the committed completion receipt. Source a48e2c32c6eb1072f0608dae331b35ea5c9e4879
passed all twelve ordinary/strict workflows. The integrated candidate now passes
the complete local check sequence; fresh hosted checks must bind the published
integrated head. The current evidence is consolidated in
[the release-check receipt](receipts/AKIPASA_PR332_RELEASE_CHECKS_20261031.json).

## Concurrent production release

Production advanced independently from 76cb96df21bf9404d50db373cf57bb0287fd9a80 to
6047abc2186e2bab0eacae5ffcb800d73b66d64a through owner-authorized PR #341 while
this release verification was running. That release added restricted AkiPals
World/Wardrobe and did not execute database migrations. PR #332 must retain it.
The merge preserves #332's existing locale, recovery and renderer safeguards
while integrating the current World interfaces and build/browser steps.

The canonical Pals migration on #332 retains its valid dollar-quoted DO block;
the incoming #341 source had a single-dollar transcription error. That file is
not a request to reinstall the already-present production avatar table.

## Integrated local validation

The complete local sequence passed after two environment corrections. The
original run stopped when a generated redirect-test framework inside test-results
was included by TypeScript. Moving that generated artifact to the external review
directory resolved it without application, tsconfig or exclusion changes.
Automation initially lacked its separate Hono dependency; installing its existing
pinned lockfile resolved that without dependency-version or source changes.
Both unsuccessful attempts remain recorded.

The passed stages include 140 initial Node tests, the 104-route audit, formatting,
zero-warning lint, typecheck, 2,876 main test executions across 14 Vitest groups,
33 security tests, database-safety checks, two database-conflict tests, automation
typecheck/tests/deployment dry-run, and the normal default build. The automation
retry and build finished with exit 0. Their raw file capture ended early; the
receipt preserves that qualification and the exact execution-tool completion
records, plus fresh Wrangler and Next build artifact hashes.

Pals integration separately passes 144 focused tests across 17 files, all seven
World browser contexts and the final Wardrobe browser suite with 32 captures.
The World suite uses actual MapLibre and GLB rendering with simulated GPS; the
Wardrobe retains its EN/ES, save/restore, context-loss, reduced-motion and
persisted-return checks. The added World link meets the 44px touch target in
both languages. Nine unconflicted World/API/auth-test files remain byte-identical
to the independently released #341 source. These scoped counts overlap the main
suite and must not be added as a distinct-test total.

## Repairs found during release verification

The real public Map loaded its genuine provider style, vector tiles and 1,612
venues over verified HTTPS. Its added discovery-clusters symbol layer omitted
text-font, selecting MapLibre's default Open Sans/Arial stack, whose glyph URL
returned 404. The repair explicitly selects Noto Sans Regular for that layer.
The existing actual-MapLibre outage/retry matrix passes all 16 locale, theme and
viewport cases and now asserts the native layer's font after it exists. That
runner is tileless. Separate genuine-provider checks passed at EN/dark/360 and
EN/light/1440: 25 provider responses, zero provider HTTP failures, zero requests
for the missing Open Sans glyph stack, zero GPS calls and zero non-GET attempts.
The configured style, fonts and vector tiles were genuine HTTPS responses with
validated TLS. The local component document and three cluster points were
explicit fixtures. This proves the component/provider boundary; authenticated
Next-page and physical-device acceptance remain separate.

The opt-in authenticated Next suite passed one complete maintained Playwright
test against the real clean QA backend, from 15:45:23 to 15:46:31 UTC. It completed
all 24 protected-route audits, Community/Growth checks, Admin controls, the native
mobile Account menu, event details and the media picker. It verifies the actual
authorized /en/staff/audit → /en/admin/audit redirect and its original request
and 307 response, alongside the sign-in, staging-origin, read-only, visibility,
accessible-control and overflow assertions. Ambiguous test selectors were scoped
to the intended Account link and visible main landmark. The 650-file runtime
source manifest was unchanged; the final browser spec hash is recorded in the
consolidated receipt. The suite emits no screenshots on success, so this result
is runtime assertion evidence rather than a claim of new visual captures.

An optional consent-save probe returned HTTP 403 invalid_origin for anonymous
local QA proxy/direct loopback origins. It is retained as a QA origin-topology
limitation, not a consent-save pass. The privacy component, API and request-security
source are byte-identical to live #341. The successful maintained read-only flow
used the existing native Close privacy choices control and verified that stored
privacy and motion values remained unchanged. No application/API/security change
was made to obtain that pass.

## Real backend acceptance

A separate pristine QA project, ngzexyddtnswonjnckco, was initialized with the
official Supabase Postgres 17.6.1.147 defaults before application tables were
created. The baseline source files 0001–0033 were applied atomically. The final
reconstruction contains all 248 actual production migrations, three explicitly
recorded QA foundations and three candidate QA forwards: 254 history entries.
This records reconstructed QA provenance; it does not invent production history.
The final readback found zero active cron jobs, zero admin_push_devices and zero
claim_push_deliveries.

The earlier kxrrupayxkaslmfycbpn bootstrap is retained as an unsuccessful
historical attempt. The superseded branch has now been deleted through the
official resource tool, while its failure evidence is preserved. Its real login
succeeded but its first profile read failed
because the initial platform table grants were incomplete. It was not repaired
with retroactive broad grants. The clean branch established the correct defaults
before creating application tables, preserving the profile-edit replay contract.

The clean Next build and seven harness guard checks passed. Nine disposable QA
identities were explicitly provisioned administratively, then authenticated
through genuine GoTrue password login and the provider's user endpoint. The
strict nonproduction project guard and separate booking/Check-in mutation
opt-ins remained intact. A setup helper initially expected the administrator
fixture actor to be consumer; the canonical venue-members trigger had correctly
promoted it to organiser. The helper resumed that exact partial fixture state
with the corrected expectation; no application or ACL change was needed.

The [full real-backend receipt](receipts/AKIPASA_PR332_REAL_BACKEND_20261031.json)
records 93 passed checks, zero failed checks, 167 actual network requests,
complete=true and no omitted cases. Its eleven recorded source hashes match
the integrated candidate. Coverage includes genuine Auth and eligibility;
Admin/Staff role and pending/underage denials; exact pending-claim lookup;
minimal Check-in preview and credential privacy with no ledger writes;
consumer A/B booking, attendance and XP isolation; and real capacity-one booking
concurrency with one winner, idempotent replay and changed-argument rejection.

Invalid coordinates and accuracy produced no ledger writes. Outside-geofence
Check-in awarded zero XP. Explicitly simulated valid coordinates awarded exactly
10 XP once; repeating the request produced no extra XP, and the other consumer
could not read the first consumer's attendance or XP. These are real backend
operations on known disposable fixtures, not a physical-attendance claim.
Signup/email provisioning, provider fulfillment and the Check-in server-action
transport are outside this RPC-level receipt. The separate protected Next-page
browser acceptance above has passed. After both successful runs, the clean QA
branch was deleted through the official resource tool. Fresh branch-list readback
at 15:48:19 UTC confirmed both disposable QA branches absent and the default
branch present; all failure and success receipts remain available.

## Applied production database forwards

Both reviewed forwards were applied atomically through the official migration
flow after fresh production preflight. Their source hashes are identical to the
versions accepted against the clean QA backend.

| Reviewed function                                       | Production managed version | Result                               |
| ------------------------------------------------------- | -------------------------- | ------------------------------------ |
| staff_pending_venue_claim_by_id(uuid) eligibility guard | 20261031153153             | Applied; definition and ACL verified |
| checkin_venue_preview(uuid) minimal authenticated read  | 20261031153156             | Applied; definition and ACL verified |

The [production-forward receipt](receipts/AKIPASA_PR332_PRODUCTION_FORWARDS_20261031.json)
records the exact source hashes, preflight and postflight function bodies,
security-definer/search-path settings, execute privileges and managed history.
The central account eligibility helper is unchanged. Credential-table ownership,
RLS and ACL are unchanged, and the complete credential policies and profile
UPDATE-column privileges exactly match QA. Production already had 18 such
UPDATE columns; the 15-column replay repair is a subset, not a new production
grant requirement.

Only these two function forwards were applied. No customer DML, Pals schema
reinstallation, profile-column repair or historical bulk replay was performed
in production. Existing avatar saves remain intact. Production database
acceptance is complete for this scoped release delta; the application PR remains
unmerged and deployment remains pending.

## Evidence limits and release status

The remaining release steps are to publish the integrated source and obtain
fresh hosted checks, then merge and verify the automatic production deployment's
source identity and health. Local checks, genuine Map-provider checks, the
93-check backend acceptance, the genuine protected Next-page browser flow and
the two production database forwards are complete. Disposable QA cleanup is also
complete. PR #332 merge and application deployment identity remain pending.

No native Android/iOS, APK/AAB, Gradle, manifest, Capacitor, WebView, deep-link
or asset-link file changes are in the PR's reviewed inventory. Browser/mobile
emulation is not physical-device acceptance. The real backend Check-in used explicitly simulated coordinates. No physical
GPS/attendance, live customer transaction, payment, reward redemption, signup/email
provisioning or provider email delivery is claimed.
Tonight stays off; AkiPals stays behind its existing private access gate.

Rollback retains data: revert the application deployment to the previous
verified Worker/source if necessary. The additive read RPC can remain while
rolling back the UI; do not remove avatar saves or weaken the Staff eligibility
guard as a source rollback.

## Hosted inventory assertion correction

The published integrated head `970064ece3aa7ea3a76f8b8c35efa26569e065f4` passed the full
check and Cloudflare packaging. [Public UI shard 1](https://github.com/elguiriashing/akipasa/actions/runs/41216901369/job/124583210533)
reported 321 passed, 17 skipped and one failed static assertion. The test still
expected 103 total routes; the inventory correctly has 104 after preserving
#341's private World page, with 90 in-scope pages unchanged.

The only correction is `103` → `104` in the existing total-count assertion in
`tests/e2e/pasa-all-route-smoke.spec.ts`; its 90-page assertion and all other route
checks remain. The existing Playwright case passed as one test in 3.0s using the
external-server option; this static case needs no application server, browser
session or backend. Scoped ESLint and Prettier passed. The corrected test SHA256
is `fdb0a58c88196572660bc86e078bedf0a79be913c8f6a2b9258e26893aa841a2`.

The decoded failure log is preserved at `../reviews/pr332-ci-970064e-public-shard1.log`,
SHA256 `c52abc18681693ceb68136a361642f029f2b550a1707aab98782144c99ec4acc`. No application or SQL source changed.
The runtime manifest remains 650 files at
`843a396f73e3df6f43ea5ce79ac2fbd26b664e5c1eb9ca0c472a47cadff9a34b`; the
93-check genuine backend and 24-route authenticated browser evidence remain
source-bound. The corrected publication still requires fresh hosted checks; this
entry does not claim a merge or application deployment.
