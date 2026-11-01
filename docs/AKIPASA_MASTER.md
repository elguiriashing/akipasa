# AKIPASA MASTER SYSTEM CONTRACT

## 2026-11-01 | Restore actual AkiHQ Explore media on nearby cards (#351)

Nearby Home/Map venue cards had a metadata-only geography RPC and rendered hardcoded black cards, ignoring AkiHQ's existing venue_explore selection. Keep the performant, page-bounded public_nearby_venue_page RPC unchanged; for its 20 published rows, resolve public venue_explore → venue_cover → venue_profile placements through existing RLS, and optionally use an existing gallery image for venues without slots. Sign only the chosen paths through the public event-media storage authority. Unclaimed status does not conceal an existing legitimate photo. Media read/sign failure preserves discovery and displays a neutral, grey storefront vector; client image load failures do likewise. Event-card artwork keeps its current Explore/Map priority, with the same resilient visual fallback. No writes, migrations, claim/status changes, unauthorised media browsing, billing, geolocation, or analytics changes. Regression coverage is tests/nearby-venue-artwork.test.ts plus existing Explore/Map, event media and responsive suites. Deployment requires fresh exact-head CI and live Cloudflare verification; physical-device tests are not claimed.

## 2026-10-31 | Owner-authorized coordinated release completion

Alex has now instructed that #332's remaining work be completed, checked and
released live. The 90 route and six fallback acceptances are complete; previous
49/90 counts and missing owner-authorization statements are historical. The
current release record is AKIPASA_PR332_RELEASE_20261031.md; it separates actual
checks from unexecuted or physical-device evidence.

The candidate reconciles independently released #341 (6047abc), preserving
restricted World/Wardrobe and #332's locale/recovery safeguards. Map's added
discovery-clusters layer explicitly selects the provider's Noto Sans Regular:
real HTTPS observation found the former implicit default glyph stack returned 404. Sixteen actual-MapLibre recovery/layout cases verify the native font value.
The authenticated Next suite corrects its legacy Staff Audit expectation to the
real authorized307 Admin redirect without weakening access or transport guards.

Production SQL scope is only the missing reviewed Staff eligibility and Check-in
preview forwards, with their atomic catalog preconditions/postconditions. An
isolated data-less QA branch is used for genuine Auth/RLS/transaction verification;
its absent foundational schema is reconstructed with explicit QA provenance.
No production historical replay, Tonight activation, public Pals opening or
customer/provider transaction is authorized by that QA setup.

## 2026-10-31 | Owner-authorized restricted AkiPals World playtest

Alex explicitly requested live testing of AkiPals World and Wardrobe. This
release is assembled on production 76cb96df21bf9404d50db373cf57bb0287fd9a80, importing only
the reviewed avatar/World source from 125a38db785ce8bbb5ad228e8e5e3c63c850c599; it does not
merge the separate consumer overhaul #332 or restore older public application files.
The existing server-side administrator/invitation gate, owner-only avatar RLS,
public-only venue RPC, and legacy saves are preserved. No migrations are executed.
Precise GPS is opt-in and in-memory; callbacks after Stop/background/unmount are
invalidated, stale/inaccurate fixes cannot reposition the avatar, and the Stop
control remains visible while inspecting a venue. World HTTP headers are private,
no-store and noindex. Venue lookups use rounded map centres; map providers receive
tile-area requests. No AR recording, rewards, public location sharing or payments.
Full source check, real WebGL browser fixtures and exact-source Cloudflare packaging
are mandatory before merge. Fixture tests are not physical Android/GPS or real
authenticated production acceptance. Read docs/AKIPALS_PRIVATE_RELEASE_20261031.md.
Rollback reverts this scoped release without deleting avatar or legacy saves.

## 2026-10-31 | Finish remaining screen reviews and repair demonstrated failures

The remaining route review uses the existing source-bound screenshot evidence
where it actually renders the page, and narrow new page/layout/AppShell fixtures
where previous evidence covered only a subsection or an anonymous gate. Original
acceptances and all thirteen separate-product exclusions remain intact. Redirect-only
Membership, Rewards and Staff Audit are verified through actual Next HTTP responses;
their receipts explicitly do not claim a rendered page or accept their destinations.

Three bounded runtime repairs follow actual failures. Passport loyalty titles now
use paper ink, and reduced-motion status uses readable ink on the dark chapter rail.
Operations treats a failed owned-location read as unavailable, suppresses stale rows
and dependent forms/read RPCs, and offers a native localized Retry that preserves
the existing safe workspace/package return path. Genuine empty reads keep the
create-location action. Map List event titles use the existing light-drawer ink;
the selector requires both light theme and the Map drawer and cannot match other
route families. Existing guards, owner-scoped queries, server actions, billing
gates, provider logic, consent and verified reward authority remain unchanged.

The maintained Passport runner retains all 194 cases and adds contrast assertions.
Operations adds eight regressions to its existing unit file; 73 focused tests pass,
with the final 19 Operations tests repeated after the narrow Retry layout repair.
New mandatory browser evidence runs actual composed Staff/business/Account,
Check-in/booking and Map pages with explicitly synthetic identities and reads.
Native recovery, truthful read failures, disabled checkout and unavailable flags
are exercised without customer writes. All existing CI jobs and checks remain.

The route matrix and dated receipts are the current review record. Screen acceptance
does not establish real hosted Auth/RLS/tenant separation, provider/private-write
or physical Android acceptance. The coordinated PR remains draft until those
integrated gates, fresh exact-head checks and final owner review pass. This change
does not create paid QA resources, apply pending SQL, enable Tonight, expose the
isolated AkiPals World/avatar work, merge master or deploy production.

## 2026-10-31 | Preserve the full overhaul while integrating finished live batches

Public339 and Admin/detail340 are reconciled normally into the existing332
candidate, retaining all source history and stronger Auth/Owner/route tests. Only
three route/Admin CSS files change Main runtime; its existing Promotions recovery
already matches the live port. The duplicate operations job from textual merge is
resolved to one mandatory job retaining all old steps, Owner69 and Promotions24.
All original23 Admin assertion calls remain, with37 after added coverage.

Main's own compact-header white wordmark override conflicted with the new light
route chrome. Actual reviewed images showed invisible Aki text. Three guarded
wordmark rules inherit the existing active chrome ink; Home/Login/other routes
and the orange Pasa logo remain unchanged. The detail collector measures actual
visible wordmark contrast; a separate Admin visual probe explicitly covers its
aria-hidden branding without weakening decorative-text filtering or the original
seven Selector checks. Six hundred Aki samples exceed15.98; two fixture-only white
negative controls fail below4.5 and are removed before positive screenshots.

Main100 actual Next detail/Event cases, Admin832, Promotions24 and Owner69 pass;
private fixture evidence does not establish real Auth/RLS/provider/private-write
or physical-device acceptance. Full2,926-test check passed before final ink/probe
refinements; fresh exact-head full CI is mandatory. Matrix49/90 and6 fallback
acceptances are preserved honestly;41 remain pending and strict release remains
blocked. Production340 identity/native evidence and all qualification details are
in the corresponding receipts; no full332 deployment is implied.

## 2026-10-31 | Restore ordinary Privacy access above detail action bars

Postdeploy339 real phone-sized hit tests showed Venue's ordinary Privacy trigger
entirely covered by its fixed Directions bar. General56HTTPS reads passed but did
not test this native control; the baseline failure is retained. Two detail-only
mobile CSS rules now reserve the actual action-bar/dock clearance and matching
focus scroll margin: Venue<=600, Event<=850. Full-detail roots, ordinary flow,
Owner-focus/Map/Passport exclusions prevent spill. Dialog, choices, cookie logic,
tracking, booking/controller, private identity and authorization are unchanged.

Existing32 Spotlight tests remain. Another24 actual built Next cases exercise
both pages in EN/ES/light/dark/360/390/820: five native hit points after bottom
scroll, native Tab auto-scroll and after closing, Enter/Escape/pointer Close,
four unchecked toggles and unchanged saved privacy/motion/queue state; no writes
attempted. Fresh56 cases and optimized build pass, four actual screenshots and
frozen source independently reviewed. Combined340 source now has six bounded
runtime files; remaining1,002 Master paths and all original CI jobs stay intact.
Fresh final-head clean CI remains mandatory; no fix deployment is claimed yet.

## 2026-10-31 | Admin workbench presentation and truthful read recovery

This independently bounded batch follows authorized public339 master0775. Four
runtime files finish Admin workbench/achievement/Selector lab styling and repair
Promotions read errors. Main review evidence exposed inherited Master navy parent
canvas plus failed promotions reads appearing as zero/empty; scoped Admin parent
chrome now matches the neutral workbenches. Owner focus/custom backgrounds and
Privacy dialog/choices remain unchanged. Selector's private preview stays dark;
small EN360 Achievements label wrapping remains a reviewed nonblocking residual.

Promotions handles each existing read error independently, shows unknown counts,
withholds required-event-dependent creation on events failure, and offers native
localized GET retry. Query expressions, requireAdmin, successful forms and all
server actions remain unchanged. No roles, SQL, RLS, provider, billing, private
records, consent choices, XP or AkiPals behavior changes.

Fresh actual-component/AppShell evidence:832 requested contexts,800 renders and
32 expected missing-record denials,600 native menu checks,240 text contrast checks
(minimum5.96),800 canvas/chrome checks;54 existing unit tests and24 maintained
palette cases pass. Another24 faithful Promotions cases include stale/combined
errors and16 native GET recoveries. Actual built Next guest boundaries pass42
cases across all21 Admin routes in EN/ES, using an anonymous localhost-only read
fixture. This is not authenticated-session/RLS/provider/private-write/device proof.
Local full check2184 tests/15 stages plus build passes after repairing a missing
worktree automation dependency link; initial setup failure and unconfigured-preview
42 failures are preserved. Four runtime hashes remain frozen through normal
fast-forward to339; fresh combined exact-head CI is required before publication.

A new parallel mandatory Admin responsive/recovery job retains all original CI
jobs/assertions and uploads its evidence. Formal332 route statuses remain intact:
49/90 accepted and41 pending. This presentation release does not waive the full
overhaul's protected-role/provider/device/final-review gates.

## 2026-10-31 | Isolated public Venue/Event detail whole-page palette

Only the two route stylesheets change runtime behavior. Initial reviewed Main
palette was insufficient on live Master's parent canvas and lower sections;
independent actual screenshot review caught the inherited navy. Full-detail-root
surface aliases now finish About/Information/business panels, with guarded parent
canvas/header/dock/footer ink and ordinary Privacy trigger styling. Owner focus
and private background canvas remain protected; the Privacy dialog and choices
are unchanged. Synthetic test artwork is intentionally retained, not photography
or evidence of production event supply. Small inherited footer button backgrounds
and floating Support edge proximity remain explicit review observations.

All 1,004 pinned Master runtime/schema/workflow/package/runner paths are unchanged.
Venue/Event pages, shared templates, Map drawer, data/controllers, booking/auth,
consent, XP and providers stay live338 bytes. No global skin, asset or SQL copied.
Seventeen focused tests and fresh actual Next 32-case Spotlight suite pass with
EN/ES, dark/light, 360/390/600/820/1280/1440/1536 coverage, original interactions and
sparse/cancelled/sold-out states. Full-page screenshots and actual composed lower
surface/chrome contrast assertions extend the original tests without removing
assertions. This is bounded presentation evidence, not real provider/payment or
physical-device acceptance. Full check, published exact-head CI and final review
must pass before expected-head merge; no deployment is claimed by this entry.

## 2026-10-31 | Complete responsive Admin evidence and truthful Owner recovery

EighteenAdminworkbenches nowhave explicitEN/ES,dark/light,360/390/820/1440
ready/empty/error/static/missing-recordfixturecoverage:832requested,800rendered,
32expectednotFounddenials,600nativeMenuchecks. StaticSelectorstate isdeduplicated.
Originalproofretains16invalidPassportdateDTOimages as superseded; correctedvalid
DTO16followup and finaldefault areexplicit. Actualstate/popuptextaudit identified
LIGHT XPcard/editor,Selectorintro/nightpanelhead,Auditneutralbadge/time and
Promotionshint contrastdefects; narrowlyscopedexistingpalette repairs preserve
darkcanvas/geometry/forms/actions.64finaltargeted208contrasts(min5.2598), maintained
24/72contrasts(min6.0253),104stateaudit withzeroeligiblecandidates pass. Fresh
committed832CI remainsrequired; screenshotexistence alone isnot acceptance.

Ownerpreviously treatedall8readfailures as0/empty andalloweddefaultpreferences
Apply. Onepageonlynowmarksfailedmetricsunknown, distinguishes unavailable/empty,
adds localizedGETretry andwithholdsdependentpreference/backgroundwritesonfailed
prefs/list/signing. Allqueries/Ownerguard/actions remainunchanged.69actualcomponent
cases including16GETrecoveries/5partialfailures,19units/type/lint/format pass; no
realprivateAuth/RLS/storage mutation/provider/device approval is inferred.

Portable832+Owner69 runners aremandatory inoneNEWparallel20minjob insideexisting
tabletworkflow; alloldjobs/assertions retained. No schema/consent/role/billing or
production operation inthisbatch.49individualroutes+6fallbacks accepted;41still
await requiredreview. Rootwillreconcileauthorizedlive338 normally, freeze/test
combinedsource once, thenpush332freshCI; full332remainsdraft andstrictgateactive.

## 2026-10-30 | Public337 production and normal overhaul reconciliation

Owner-authorized public release337 passed all6exact-head workflows and merged
as c51cba991292eb8759e0bcea73f03b2d0408cb64, identical testedtree. Automatic
Cloudflare Worker980f4d74-9dca-42be-b096-03979c749e63 serves100%;22+12realanonymous
HTTPSchecks pass with savedprivacy unchanged. Existing26e retainedrollback; no
manual duplicate deploy or database/customer/consent/payment change. See exact
production receipt and its physicaldevice/console/footer-review limitations.

Production is reconciled normally into332, preserving stronger tests/artifacts
and main protected workflows. Two proven Business presentation defects repair
160pxSave→48px and lighttextcontrast1.19→4.95 with160maintainedcases. SharedAdmin
achievementtoolbar/venue rows use existing semantic surface/ink/line/muted values;
24portable browsercases pass(mincontrast6.05), retaininggeometry/forms/actions.
Existing mandatorytabletjob gains this maintained24runner+artifact, no test policy
weakening. Full33249routeacceptances/6fallbacks remain separate from privateprovider,
RLS, XP, device and final-owner release requirements; no fullrelease approved.

## 2026-10-30 | Fresh route reviews and confirmed Staff visual repair

Actual b7 hosted evidence and responsible screenshot/function review approve
Passport Places, Terms Accept and Business Mobility individually:49/90 accepted,
41remaining,all6fallbacks accepted. Embedded source-bound reviews retain explicit
real Auth/RLS/provider/private-write/device limits. Staff184 tests passed but
actual reviewed images show zero Creator gutters and unreadable activeglyph;
Staff-only padding and inheritedwarmink repairs plus computed browser regressions
address these two presentation defects. No role/action/query/auth/data change.

Isolated publicPR337 exact2506 changes only the duplicate sitemap E2E expectation
and its receipt after initial published271publicPASS/29conditional/1failure.
All five targeted SearchConsole cases pass. Fresh candidateCI and actual expected-
head merge/deployment identity remain required; no production claim inferred.

## 2026-10-30 | Completed family batch and owner-authorized public releases

The completed batch covers actual Terms/AppShell32states+6safe returns, Passport
Places48states+9input probes, Mobility48(retaining32+16no-company), and Staff184
(retaining120+64healthy Support/Creator states). All new browser fixtures declare
synthetic identities/reads and forbidden actions; none certifies real providers,
RLS, private writes, XP or physical Android. Required existing Account/Passport
jobs now run the two maintained new scripts with small accessible artifacts.

Real rendering defects repaired: five Terms-specific selector priorities restore
intended brown/cream hero and readable eyebrow/version (light version was1.3243:1;
final four-text minimum6.5706light/9.2375dark). Staff creator decisions use auto
flexbasis/48pxminimum and a readable local badge (actual48–56.8px/contrast>=16.395).
Only own-award singular/plural copy changes in Prestige Privacy. No legal version,
consent, Auth, role, action, query, payment, schema or production change.

Frozen nine-file full check passes2887Vitest/17groups,140initialNode and193-route
build. Actual2b3CI passes all11ordinary workflows; strict remains red. Subscription
and Staff venue have real corrected hosted evidence and individual reviews:
46/90accepted,44remaining,all6fallbacks accepted. New family scripts await actual
next-head hosted proof, never fabricated future acceptance.

Alex now explicitly authorizes deploying finished independent public batches
before the full overhaul. Root is isolating a candidate from live335source3d87 in
work/pasa-finished-public-release-20261030. This does not waive #332's full strict
gate or authorize pending SQL/private features. Preserve Home/Login/Passport and
all protected master behavior; use only safe public route dependencies, fresh
candidate tests/CI/review and expected-head merge. Master automatically deploys;
verify its exact source/Worker before any manual fallback. Closed336 is preserved.

## 2026-10-30 | Native Account controls, genuine loading readiness and privacy charcoal

Desktop Account Search clicks were intercepted by its menu. An Account-only
4rem gutter at851px clears both controls without changing authorization, billing,
mobile layouts or shared WorkspaceShell.504maintained cases pass, preserving464
and adding40at851px.160native Search/Menu contexts cover all10routes, EN/ES,
both themes and851/1024/1440/1536; original personal-profile32also pass. Four
original1440click probes reproduced the defect;16independent repaired probes pass.
Historical Account reviews do not substitute for the new control regression.

The actual a7Tablet failure was pre-hydration native Enter on visible streamed
Admin HTML. A deterministic real Next diagnostic held12JavaScript chunks and
proved the cause. The boundary fixture now waits its existing provider mount,
asserts the loading screen and focused trigger, then performs the original single
Enter/Escape assertions. All136cases and12native hydration checks pass; no retry,
runtime guard or assertion removal. Staff venue's second fixture navigation now
preserves theme/query and asserts the actual theme:120cases pass. Earlier dark
screenshots labelled light are rejected rather than used as acceptance evidence.

Dark Prestige Privacy panels now use scoped charcoal/warm-orange styles. Light
Privacy and other Prestige selectors are unchanged.122states/16native GET retries,
32lower captures and176keyboard/three-point checks pass; all176control rectangles
unchanged, conservative dark contrast>=7.56:1. Of154before/after pairs,94are exactly
identical,32are intended dark Privacy changes,28differ only in54global Search
antialias pixels each; whole-image identity is not claimed. No private action runs.

Full six-file frozen check passes2887Vitest/17groups,140initialNode and193-route
build. Thirteen more individually reviewed records bring acceptance to44/90,
with all6fallbacks accepted;46routes still need genuine completion/evidence.
Sourcea7CI has10ordinary passes and one real Tablet failure repaired in this batch;
fresh new-head CI remains mandatory. Strict gate stays red. Only connected DB is
live; a separate data-less test branch costs0.01344/hour plus usage and remains
unapproved/uncreated. Production/SQL/customer/consent/billing unchanged. See native
controls, conversion/operations/recovery, public discovery and Roadmap receipts.

## 2026-10-30 | Uncovered Roadmap navigation and maintained recovery/consent proof

The localized Roadmap reserves64px for desktop Search at the existing851px
breakpoint.16actual Next browser cases cover EN/ES, both themes and360/390/820/1440,
native keyboard return and three pointer positions. Two negative controls restore
the403.125px² overlap without the gutter; the repair has zero intersection.

Eleven actual Terms server-action tests now run in the required onboarding suite:
explicit consent, guest return, configured version/locale, forged fields, safe
consumer/sister-product destinations and sanitized failures. No consent is changed
in production. Maintained Recovery presentation proof adds32cases and3sibling
guards to the existing Account job and a small artifact. Its disposable adapters
do not certify actual token/provider/LocaleLayout/device behavior; formal Recovery
acceptance awaits accessible new hosted evidence.

Prestige coverage retains94cases and adds28at360px:122pass, including16native GET
retries. Runtime pages are unchanged. Full seven-file frozen check passes2887
Vitest tests/17groups,140initialNode tests and193-route build. Published1e7b71f
passes all11ordinary workflows; strict remains blocked on real route acceptance.
Individually reviewed onboarding/privacy, Community, Hall, Certificate and two
redirect-only aliases raise the
recorded total to31/90; all6fallbacks remain accepted. Destinations and overall
provider/RLS/device release approval are separate. Fresh20:24UTC aggregate finds
zero future occurrences and zero published events; Tonight stays off. No merge,
deployment, SQL, paid resource or customer change. See the new roadmap/recovery/
terms and onboarding/alias receipts for exact hashes and actual evidence.

## 2026-10-30 | Complete Community and onboarding theme consistency

Community Suggest/Reports/history use dark charcoal tokens scoped by the existing
local workflow marker; public landing, Creator pages, light mode and sister
products are unaffected.272 maintained cases pass with the real AppShell, native
menu/keyboard/touch and lower-control checks. A one-off pending-label failure is
retained; the unchanged deferred fixture/assertion passed17 isolated and272 full
rerun cases. Its cause is not invented; watch fresh CI for recurrence.

Onboarding/restricted Privacy use dark charcoal panels/controls/scrollbars while
all32 light comparisons remain pixel-identical.96 maintained cases pass across
EN/ES, both themes, four widths, reduced motion, real error alerts and guards.
Minimum tested contrast8.46dark/5.62light. Age, consent, terms, actions, redirects
and checkbox defaults are unchanged. The existing required consumer job now runs
94 actual Prestige-page/AppShell fixture cases with12 native retry GET checks;
synthetic adapters are explicitly not actual Next/Auth/RLS/provider certification.
Full six-file frozen check passes2876Vitest/17groups,140Node and193-route build.

Individual hosted review now records24/90 routes and all six fallback contracts
accepted.66 routes remain; overall provider, tenant, payment and physical-device
approval is not inferred. Roadmap has a real desktop Search/backlink overlap;
Terms needs direct action branch tests; Recovery needs hosted screenshots. These
specific gaps stay open. Production, pending SQL and paid resources are unchanged.

## 2026-10-30 | Complete certificate failure journeys and readable Admin headings

Prestige certificate provider errors retain the existing workspace, localized
heading and safe alert, with native same-path Retry and Hall/Passport navigation.
Native keyboard retry performs a fresh document GET and fixture RPC read. Existing
locale/UUID/default-off gates, missing-award404, RPC arguments, success certificate,
private fields and award/download authority are unchanged.23 focused tests,54
Prestige tests and60 browser states pass, including12 real keyboard GET retries.

Admin achievements/venue-category eyebrow text uses darker orange only in light
mode.32 actual route/layout fixture contexts pass across EN/ES, both themes and
360/390/820/1440 widths; contrast improves from1.62:1 to6.68:1. Layout, dark ink,
forms, data, actions and authorization are unchanged; synthetic role fixtures are
not real Auth/RLS certification. Full frozen three-file check passes2876Vitest/
17groups,140initialNode and193-route build.

Nine more routes now have individually reviewed acceptance: three Creator pages,
four public static pages and two redirect-only aliases. Total22/90 accepted;68
remain in progress and six fallback formal records await actual hosted review.
Source67bd passes all11 ordinary workflows; its eight hosted HTTP JSON records
and four static screenshot subsets were actually read. Roadmap evidence was
omitted from the small artifact, so it stays unaccepted while the exact glob is
added. A separate small public discovery archive and existing smoke/legacy JSON
improve access without dropping original evidence or changing CI policies.

The next known visual repair is Community's Suggest/Reports workspace palette;
public landing and already-reviewed Creator pages must remain unaffected. Pending
isolated provider/role/tenant/verified-XP, SQL application, Android and strict
release requirements remain intact. No production merge, deployment or SQL change.

## 2026-10-30 | Coherent conversion panels and readable Account status states

Consumer Membership, Referrals and Account Subscription use scoped charcoal and
orange surfaces, with warm readable light-theme equivalents. The adapter changes
only the consumer shell/AkiPasa offer cards; shared canonical studios, sister
products, prices, checkout readiness and billing actions remain intact. Actual
public-page and Subscription component states, text contrast and unchanged HQ
pixel comparisons were reviewed. Account light-theme success/error notices use
dark green/crimson ink over existing pale fills; messages, actions and dark mode
are unchanged. A real 1.51:1 failure now measures at least6.33:1 in tested states.

Eight Account routes now have individual responsible-tester acceptance at source
c3b5835 with actual hosted screenshots and functional results. The matrix records
13 accepted /77 outstanding in-scope routes, with all six fallback acceptances
still pending fresh hosted evidence. This is not full provider/device approval.
The expanded maintained Account suite passes464 cases, retaining432 existing
cases and adding32 notice states/native password-reset/sign-out controls.

The native fallback harness retains88 cases and adds48 root-error/retry/Admin
loading states;136 pass. Admin shell evidence uses a declared synthetic identity
adapter and does not prove real RLS. The required dedicated Spotlight runner
retains60 tests and adds16 current populated Event cases;76 pass, with a final
16-case screenshot-readiness follow-up covering mobile dock/desktop navigation.
Declared synthetic events remain confined to a loopback adapter; production
Tonight stays default-off. No real booking, XP, customer or payment mutation.

Full local application check passes2868Vitest/17groups,140initialNode cases and
193-route optimized build. The one test-only readiness follow-up is separately
typechecked and executed; new exact-head hosted checks remain required. Small HTTP
and static screenshot artifacts supplement the original full archives, preserving
all assertions, required contexts, policies and seven-day retention. This repairs
the observed512MiB connector transfer ceiling without bypassing blocked transport.
Source-only Staff/preview SQL, real isolated Auth/tenant/provider transactions,
remaining route review, candidate Android and strict release gates remain open.

## 2026-10-30 | Creator encoding and exact workspace task returns

Creator compatibility aliases normalize the route slug once before encoding the
canonical creator segment. Malformed encodings, separators and dot-only segments
fail closed; literal encoded percent text remains stable. Actual built Next HTTP
requests now preserve an encoded creator slug rather than double-encoding it.

Staff/Admin parent layouts previously replaced a guest's Audit destination with
the workspace root. Middleware removes incoming workspace-return headers and sets
a bounded same-locale, same-workspace path/query derived from the actual request.
The shared user guard revalidates that navigation target before the unchanged
identity, onboarding and current-terms checks. Parent and leaf guards retain the
same task and filters. Workspace role/tenant authorization remains unchanged;
this header grants no access. Consumer and separate-product returns are unchanged.

Eight independent EN/ES HTTP contracts pass on the isolated built fixture source,
including forged-header replacement and repeated/encoded query parameters. The
85 focused alias, sanitizer and actual guard/middleware tests pass; additional
132 booking/token/onboarding/navigation regressions pass. Exact published-head CI,
formal route acceptance and protected/provider/device evidence remain distinct.
No production migration, merge or deployment follows from these local results.

## 2026-10-29 | Avatar artwork rejected; functional evidence is not art approval

Alex rejected the retained private-avatar artwork and the isolated original
procedural portrait experiment. Neither is an approved release design. Stop that
art direction; keep experimental files outside the candidate and investigate a
professionally authored stylized human model/rig with verified licensing, mobile
export/customization feasibility and preserved saved-appearance/wardrobe state.
Do not treat passing geometry, WebGL or save tests as visual acceptance. No paid
provider or asset purchase is authorized by this art-foundation research.

Application source `435782ed5765df8f7f4c0908c441b35e88deb452` has independent full
check and clean Cloudflare-package evidence, but all ninety route acceptances and
avatar/physical-device/protected-journey approval remain outstanding. The strict
gate stays intact; this is not merge or deployment authority. The validation
receipt distinguishes the failed broad-browser run from its successful targeted
transport repair and records the live basemap provider-path denial honestly.

## 2026-10-29 | Readable auth and resilient map/private-avatar return

Auth's cinematic photo previously retained navy form text in light mode. A
route-local module now supplies opaque readable AkiPasa form surfaces, labels,
tabs, inputs, recovery/consent links, notices and workspace heading. The separate
product auth skins, existing Google readiness, default unchecked terms, server
actions and safe next/mode routing remain unchanged. The public AkiPals entrance
has explicit light title text over its fixed dark artwork. Actual built-source
browser checks cover EN/ES, light/dark, 360/1440px, all four auth modes, errors,
keyboard focus, contrast and return continuity.

ProductionMap handles asynchronous MapLibre style/tile errors as unavailable,
offers explicit localized retry and preserves the current camera/zoom, selected
place type and filter URL. Retry does not duplicate map-open telemetry. Scoped
measured tab/legend offsets prevent narrow-screen wrapped labels from covering
controls or the outage panel; listeners/observers and old map instances are
cleaned up. Real MapLibre tests use controlled 404 and tileless success fixtures,
not live tile-provider acceptance. No provider URL, data ranking, location consent
or venue/event authority changes.

The private avatar document disables save/export before renderer disposal. A
persisted pageshow reloads the server-gated document and caller-owned saved
appearance, avoiding a disposed canvas with stale enabled controls or another
account's old local draft. EN/ES copy tells members to save before leaving;
unsaved local edits are discarded on return. Saved identities and wardrobe state
are unchanged. Synthetic persisted-event tests verify fresh document/identity
reads; they are not evidence of actual device BFCache eligibility. Art remains
subject to Alex's premium visual review.

## 2026-10-29 | Live Supabase source mapping and verified empty future supply

Read-only provider verification resolved the earlier alias uncertainty:
unauthenticated `/auth/v1/health` and `/rest/v1/` requests to the Worker-configured
`https://akipasa.supabase.co` returned expected HTTP 401 and
`sb-project-ref: vhpbvcfkcteswlsdjrfl`. This matches the connected Supabase project,
despite its Development display name. The fresh aggregate at
`2026-10-29T10:42:57.020752Z` confirms nine events, ten occurrences and zero future
occurrences, including zero future published/scheduled occurrences. No credentials
or customer records were requested or changed. Tonight's supply blocker is now
verified against the actual configured source, and its production gate stays off.

## 2026-10-29 | Truthful private workspaces and continuous identity presentation

The coordinated candidate now gives the existing private rental desk scoped
AkiCoches light/dark surfaces and canonical independent product links, without
requiring venue claims or changing authenticated company/fleet/booking actions.
Unavailable fleet, request or block reads remain unknown rather than becoming zero;
bounded summaries disclose their loaded limits. Business home starts independent
caller-scoped reads together after authorization, while privileged editorial reads
still wait for the known platform role. Failed venue catalogue reads withhold both
the catalogue editor and dependent event editor instead of inventing revision zero;
a successful missing catalogue remains editable. Same-section localized retry and
unknown catalogue counts preserve the read-failure distinction.

Tonight requests an explicit live-only discovery source. This optional internal
recommendation setting defaults false for all existing callers; Tonight bypasses
hybrid fixture/error fallback so outages produce its localized unavailable state.
Retry links retain only sanitized planning filters. Genuine empty results offer
the existing moderated suggestion and roadmap paths, without inventing availability
or enabling the default-off production gate. No XP, ranking consent, RLS, billing,
schema or customer-data authority changes.

Account's EN/ES AkiPals entry describes a 3D avatar and private wardrobe, not a
mascot/adventure game. Private studio work improves authored silhouette, garment
joins, lighting, touch targets, readable disabled controls, idle rendering and
WebGL loss/recovery. Existing appearance IDs, save/restore and wardrobe ownership
remain intact; the art is still subject to Alex's premium visual approval.
Prestige's scoped stylesheet now gives existing privacy controls, checkboxes and
progress a consistent usable presentation; award/privacy logic is unchanged.

New browser fixtures exercise workspace role boundaries and rental operations;
they join tablet CI without replacing any existing checks. Redirect tests exercise
actual root/membership exports and HTTP locale/attribution behavior. Virtual-host
browser transport keeps vendored font assets local instead of following test-only
redirects to production. Fixture screenshots are not proof of production Auth/RLS
or physical Android. All 90 routes still require genuine release acceptance.

## 2026-10-29 | Autonomous coordinated-release control and current precedence

The single candidate is draft PR #332 on `work/coordinated-release-20261029`.
Original PRs #326, #327 and #328 are closed unmerged and superseded with history
preserved; Passport milestones #329 merged separately. Older entries below that
refer to those drafts, mascot/game presentation or manual-only deployment are
historical, not current release authority. Humanlike private 3D identities are the
approved AkiPals direction; saved identities, legacy saves and wardrobe ownership
must remain protected. AkiHQ and independent AkiBusiness remain separate products.

The mission ledger is `docs/AKIPASA_AUTONOMOUS_EXECUTION_LEDGER.md`. At takeover,
the matrix has 103 routes: 84 in progress, six pending, 13 separate-product
exclusions and zero accepted. Final visual and physical Android approval belongs
to Alex; automated captures and emulation do not substitute for that review.
The strict audit remains mandatory. Cloudflare's actual master build trigger
automatically deploys, so a merge is production-impacting. Keep the combined
candidate draft and unmerged until all release prerequisites are satisfied.

The connected Supabase project's timestamped aggregate has zero future event
occurrences, but its mapping to the live hybrid discovery alias remains unproven.
Do not describe that aggregate as conclusively verifying production discovery.
Tonight remains default off; no invented events, activity, XP or rewards may be
used to remove the release hold. Provider mapping and real-role/device acceptance
are tracked explicitly in the mission ledger.

## 2026-10-29 | Private AkiPals 3D character engine (no public launch)

The approved AkiPals reset now has a self-hosted Three.js WebGL studio with two
CC0 rigged Quaternius base models stored under public/pals/models, and original
procedural 3D hair, outfits, bags, shoes and facial feature meshes. Characters
are rotatable/zoomable; edits preview locally, then owner-validated appearance
is saved only upon explicit Save into RLS-isolated pals*avatar_profiles.
Built-in local Three.js runtime bundling occurs before dev, Next and Cloudflare
builds. The preceding flat SVG character is no longer served by the /pals UI,
although old game endpoints/data are retained solely for rollback and must be
reconciled in a future retirement gate. The screenshot reference is a \_concept*,

reconciled in a future retirement gate. The screenshot reference is a _concept_,

not finished in-game art. Actual GLB/browser screenshots, perf, final morphs,
RLS migration and AkiPasa redesign PR #326 integration remain prerequisites.
No commercial unlocks, payments, public social presence, GPS sharing or maps
were enabled. PR #327 remains draft and production deployment prohibited.

## 2026-10-28 | AkiPals human avatar identity reset (private draft)

AkiPals is a customizable human avatar and personal wardrobe, **not** the old
mascot/gacha RPG. The replacement private /pals studio offers validated, original
illustrated features, proportions and free clothes; no XP, equipment stats,
sockets, loot boxes, care tasks, stories or game economies are part of the v2
experience. This PR introduces owner-only RLS storage in
public.pals_avatar_profiles; the additive migration has been applied and RLS verified in Supabase;
private authenticated browser acceptance remains a release prerequisite. Legacy game saves stay untouched for rollback, not as a
v2 mechanic. No public avatar, social graph, real-time user location, heatmap,
commercial item or payments are enabled. Future Where's Poppin' heatmaps must
be crowd-aggregated; any identifiable presence requires separate adult-only,
explicit, short-lived consent with no exact stranger GPS sharing. Reconcile
AkiPasa redesign PR #326, run all CI/browser/Android acceptance, and obtain
explicit release approval. See docs/AKIPALS_IDENTITY_V2_20261028.md and draft
PR #327.

## 2026-10-29 | AkiTonight verified evening-discovery slice (candidate, not live)

AkiTonight adds localized read-only `/[locale]/tonight` guided intent and social-context filters to the existing `recommendDiscovery` event service and published `public_nearby_venue_page` RPC. Its queries are strictly allowlisted and reuse authoritative scheduled occurrences and consent-based existing ranking. A separate nearby venue fallback makes NO claim that a venue is open, meets a selected activity, has space for a group or offers a bookable event. Sponsorship labels continue to come from `EventCard`; no new telemetry, notifications, XP, reward grants, subscription fees, merchant campaigns or RLS functions are introduced. The public route is noindex until credible local event supply exists. Phase-1 audit found **zero future scheduled event occurrences** in the linked project on 2026-10-29; venue directory records must not be treated as event availability.

Source: `src/lib/aki-tonight.ts`, `src/app/[locale]/tonight`, existing `PlansFirstHero`. Test: `tests/aki-tonight.test.ts`, new isolated CI plus full `npm run check`. The source overlaps PR #326's homepage/route-matrix work, and **must be explicitly reconciled with #326** and have bilingual mobile, Android, empty/error, sponsor/consent and real-inventory acceptance before merge/release. No migration or configuration change. Roll back by removing the hero CTA and route; retained existing events and customer records are unaffected. Track `docs/AKIPASA_RETENTION_IMPLEMENTATION_20261029.md`.

## 2026-10-30 | Isolated Account consumer presentation candidate

Following authorizedlive337c51, this candidate applies11surgicalAccountfiles
(including pureHTTP(S)-website display helper), 10lineWorkspaceShell menu-close
on actualhistory/routechange, existingSVGhandoff/CTAarrows inHub/Grid; sharedStudio stayscanonical and legacydockprivacy
spacing.15runtimefiles only;14protectedauth/actions/data-leaves staybyteidentical
to c51. Accountlayout retains existing trustedmembership-header returnresolver/
requireUser and profile writes/exports/deletion/billing/permissions/7leafqueries
areunchanged. Overviewreads existingusername/bio/avatar foronlycallerID; profile
maxlength2000 matchesalready-existingservervalidator. No SQL/newdependency/Pals
wardrobe/provider/consentchoice/event/XP/customer mutation or productboundary change.

MaintainedMaster310Accountbrowserrunner unchanged; additive90actualcomponentstates
+160nativecontrols and pure18websitevectors runinexistingrequiredCIjob/config,
withboundedreviewartifact.58focusedtests,504prefinalfixturecontexts and final90/160
with93stablecompileddependencyhashes pass. Original11portedfull332auth-contract
failures are preserved/notpassed: they demand a different requireUserreturnAPI,
which this isolatedcandidate intentionallydoesnotcopy. AlloriginalMasterchecks
remainrequired. Localfullcheck2184tests/15stages passed before the finaltwoSVG-only repairs;
finaloptimizedbuild and49actualNext cases pass, including20guest routeguards
on the candidate origin and8nativeprivacy cases. Exact-head fullCI/CF and final
independentreview remain required; no newAccountmerge/deployment claimed.

## 2026-10-30 | Finished public-screen release, isolated from the full overhaul

Alex explicitly authorizes shipping finished independent public screens ahead of
the full #332 overhaul for investor demonstrations. This master3d87-based batch
contains Community home, public Creator directory/profile and alias, Roadmap and
root redirect, Privacy/Terms/Photo Credits, and the HQ entry screen. The full332
strict90-route gate remains unchanged on its own integration branch.

Community's protected workflow after requireUser remains byte-identical to master;
only its public home dispatch changes. Fifteen key master files are unchanged,
including Home, Login/actions, Passport, AppShell/search, private Creator Studio/
actions, auth/config/middleware and package/lockfile. No SQL, RLS, roles, consent,
payments, provider configuration or real data changes. Scoped legal/roadmap CSS
and a public-only Creator wrapper avoid porting the full shared overhaul skin.
Existing assets are reused. Test-only public profile/media is synthetic/read-only.

Validation and source hashes are recorded in
receipts/AKIPASA_FINISHED_PUBLIC_RELEASE_20261030.json. The candidate requires its
own full check, actual EN/ES dark/light360/390/820/1440 browser/source review, and
all fresh exact-head master CI before expected-head merge. Master automatically
deploys: verify exact deployed source/Worker and public HTTPS before any manual
fallback. Preserve approved335source3d87/Worker26e51e72 for rollback; no security
rollback or repeat Terms SQL. Browser emulation is not a physical Android claim.

## 2026-10-29 | AkiPassport weekly venue-credential quest preview (candidate, not live)

The existing Passport `progress` view gains two **optional, informational** weekly exploration milestones, based only on caller-owned accepted venue-credential check-ins in `public.check_ins`. The week uses Europe/Madrid Monday civil-time boundaries including DST, and distinct venue IDs prevent duplicate scans counting twice. GPS-only acceptance, duplicate/cooldown, invalid or future records are rejected. Browser data never creates XP, credits, badges, entitlements, vouchers, commercial rewards, public presence, email, push or tracking; the existing check-in/XP ledger remains the only source of authority. Venue credentials are not equivalent to signed rotating proofs or verified commercial spend. Existing `check_ins_own_read` RLS and authenticated SELECT were inspected; the query explicitly scopes to the session profile and limits reads.

Source: `src/lib/aki-weekly-quests.ts`, `src/components/WeeklyQuestPanel.tsx`, `src/app/[locale]/passports/page.tsx`. Test: `tests/aki-weekly-quests.test.ts`; security/DB migration none, but real authenticated RLS/browser acceptance is outstanding. Reconcile Passport presentation work in draft consumer redesign PR #326. Rollback removes only the optional panel and its own-history read without touching existing progress. See `docs/AKIPASSPORT_WEEKLY_QUEST_PILOT_20261029.md` and issue #314.

## 2026-10-28 | Public launch roadmap and Costa del Sol rollout notice (draft PR #326)

AkiPasa's initial audience launch is **planned** around Fuengirola and the Costa del Sol. Consumer visitors should see one accessible, non-scrolling announcement on Home, Map, Community, and public venue/event details, linking to a public localized roadmap. The announcement may not falsely imply that any venue, city, check-in rewards, Passport, AkiPals, or Friends services are already live or verified. The English and Spanish notice uses honest phased language rather than claiming concrete dates for uncertain milestones; no consent, geolocation or email collection is introduced by the banner.

The canonical public pages `/es/roadmap` and `/en/roadmap` have a convenient `/roadmap` redirect to Spanish, consistent with the site's default root. Phase 1 is development and quality, phase 2 is the Costa del Sol first rollout, phase 3 is feedback and engagement improvements, and phase 4 is Spain-wide expansion based on demand and dependable venue coverage. The page distinguishes current active development from private AkiPals testing and planned Friend features. All exact dates are intentionally **to be confirmed**, never invented. Data and bilingual descriptions are centralized in `src/lib/pasa-roadmap.ts`; the page is public and indexable and included in the public SEO catalogue.

The homepage no-event empty state provides explicit reassurance and a roadmap link without hiding existing filter expansion/Map controls. Acceptance requires `tests/pasa-roadmap.test.ts`, a 101-route inventory, ES/EN, reduced motion, 320–1440 px responsive views, Cloudflare source pin, privacy/legal review and the full atomic #326 release gate. No live deployment, data migration, email signup, payments or backend writes are authorized by this addition.

## 2026-10-28 | Radar × After Dark unified consumer redesign (draft, not live)

The AkiPasa visual overhaul is staged on PR #326, independently of the Cloudflare production Worker. The canonical mobile consumer destinations are Home, Map, Check-in, Community and Profile. The same route descriptors feed the desktop links and mobile dock, and one shared icon implementation supplies every destination. Check-in points to the existing venue-specific signed QR and verified-location flow, not an unverified or invented reward. The existing MapLibre data, filter query state, user consent, Supabase RLS/auth, XP ledgers, game saves and Stripe gates remain unchanged.

The first photo-led Home, shared event cards, map overlays, authentic public Community landing, gated AkiPals entry and account/spotlight styles are source changes only. AkiPals remains a restricted preview with server-side permission checks and saved mascot state; public friend features are not represented as active without a reviewed privacy-safe backend. Passport preserves all current achievements and awards. All locale routes, owner/staff/admin routes and other-product hosts require explicit classification; the exhaustive matrix is `docs/AKIPASA_UI_ROUTE_MATRIX_20261028.json` and the release gate is `npm run release:pasa-audit`.

Every consumer and operational route must be reviewed, the complete exact-head CI and browser/Android regressions must pass, and Cloudflare preview and final deployment must be pinned to the reviewed source. Do not merge an unfinished draft branch, turn on unimplemented social or age verification, introduce fabricated events, alter existing customer data, or bypass check-in restrictions. Rollback is the prior validated production Worker version plus reverting the UI branch, with no data migration.

## 2026-10-28 | Secure cross-product launch waitlist (staged, not activated)

AkiDuermo and AkiCoches under-development launches require a shared **double-opt-in** waitlist managed by AkiPasa's existing authorized server. Subscriber contact information is service-only in `public.launch_waitlist_entries`, with explicit launch-purpose consent and a separate optional marketing preference (never prechecked). Browser-origin product and host must match. Turnstile proofs require a matching hostname and the `launch_waitlist` action. Requests are payload-limited, rate-limited by keyed hashes, and require one-time hashed verification tokens with 24-hour expiry and a human POST confirmation (no scanner-triggered GET verification). Existing Supabase and Resend credentials remain **server-only**. A privacy/deletion contact, retention purge job and consent review must be operational before activation. No live migration, customer mail or signup feature is activated by the initial PR. Track #313, #315 and the corresponding front-end/release holds.

## 2026-10-28 | Consumer chooser and AkiHQ business entry

The AkiPasa consumer selector now presents only AkiPasa, AkiDuermo and AkiCoches. Business users retain the existing owner/application path and receive a separate localized `/hq-login` entry pointing to AkiHQ's existing host-local `/login`. AkiBusiness remains a **separate independent operating-software product**. No account, cookie, role, billing, claim, event, or venue data changes; AkiSuite is an umbrella name, not a separate product. See `docs/PRODUCT_RESET_20261028.md` and AkiPasa #310. CI, browser/Android return acceptance and exact live SHA remain required.

## 2026-10-28 | Plans-first Costa del Sol launch hypothesis

AkiPasa's first screen answers **¿Qué hacemos hoy?**, showing live upcoming plan results _before_ the national city-photo catalogue. Supported shortcut filters: **Hoy** (Madrid calendar day, bounded start/end), **Esta noche**, **Este finde**, **Planes gratis**, and the existing map. Initial product focus is local residents and bilingual visitors around Fuengirola/Mijas Costa/Benalmádena; nationwide canonical venue/event URLs stay usable. Discovery remains anonymous, and photo/city inventory is not presented as a promise of current events. Passport/AkiPals/AkiQuests are a later verified-attendance pilot, not fabricated check-ins or paid rewards. No RLS, event schemas, payments, or location tracking are changed by this UI patch. See issue #310 and `src/lib/plans-first.ts` regression tests.

## 2026-10-27 | Correct first-owner Premium destination: AkiPasa listing managed in AkiHQ

AkiPasa's approved claim emails, rejection resubmission links and claim-received acknowledgements now point to the canonical **AkiHQ** management hub at `https://akihq.app/{locale}/business`, with owner venue deep-links scoped to the approved venue UUID. AkiBusiness is **only** the separately paid operating suite (Basic, Standard, Pro), not the claims portal or the early-adopter benefit. The existing free AkiHQ hub manages business-facing Premium listing upgrades for each discovery vertical. For this programme the reward is **three months of AkiPasa Premium for the claimed business listing in AkiHQ** (normally EUR 11.99 per location/month), not AkiPasa personal Premium, AkiHQ-wide Premium, nor any paid AkiBusiness operating software.

The existing `claim_partner_rewards` grant remains scoped to one approved AkiPasa activities venue and expires after three calendar months. New forward-only migration `20261027093500_limit_partner_gifts_to_akipasa_venues.sql` explicitly restricts reward queuing, activation and Premium entitlement to `venues.discovery_vertical='activities'`, excluding accommodation/AkiDuermo. No Stripe, account-wide grant, payment or customer claim decision changes. Customer copy in the claim email and early-partner form uses EN/ES explicit product naming, and the success link navigates to the particular venue in AkiHQ. The moderation queue badge and decision guidance reflect AkiPasa/AkiHQ rather than incorrectly implying AkiBusiness. Regression tests assert correct URLs, product descriptions, and absence of AkiBusiness within claim decision emails. Previous emails are not replayed or changed, and no claim status transitions are issued by this correction. Route 66 remains pending staff verification.

## 2026-10-27 | Verified first-venue owners receive automatically expiring Premium after feedback

The new owner campaign links a previously **staff-approved** claim to a signed-in, email-confirmed account and a scoped feedback submission. The owner has to be the same claimant and still own the claimed venue. The existing bilingual first-party form at `/{locale}/business/early-partner?claim={claimId}` is authoritative; an external Google Form or typed email **alone is not verification**, nor can it activate entitlements. External Google Form provisioning is not part of this release. The business owner receives this invitation as part of the approval notification and no unverified/pending claim is automatically approved.

On the first valid feedback submission, a database trigger converts the linked pending reward into a **three-month, venue-specific listing Premium grant**, expiring exactly three calendar months from activation. The existing `akisuite_listing_private.listing_premium(p_venue)` entitlement check now also accepts an active, unexpired partner reward for that venue only while the original approved claimant remains owner. There are **no changes** to consumer Premium, staff account-wide Business grants, Stripe, paid operating plans, checkout or recurring billing. Repeat forms, re-claims, paid/previous Premium, unverified emails, other users, revoked ownership, missing onboarding, extra venues and expired gifts cannot extend or invent access. Past rewards are retained for audit. Capacity is controlled by service-only `claim_partner_campaign`, enabled for at most 25 first venues, reversible without deleting earned grants. A pending reward is not an activated benefit. The in-app confirmation reads the authorized reward status and actual expiration, rather than trusting a URL query flag.

New mirrored migration: `20261027081500_claim_partner_auto_trial.sql`. Release order: GitHub CI including SQL fixture, RLS/negative tests, format, brand production build; apply additive migration before app deploy; verify current entitlement source before approval; deploy exact tested source to the existing AkiPasa Worker and verify the signed-in owner flow. Never approve a live claimant as a deployment smoke test. Existing claim #4e66eb94 and all other pending claims remain unchanged until staff action. Roll back campaign enabled flag first if incidents occur, then remove UI/automatic trigger while retaining earned grants for the three-month term.

## 2026-10-27 | First venue owners: claim email and early-partner feedback

AkiPasa's authoritative claim decision emails are rendered in `src/lib/claim-decision-email.ts` and delivered through the existing audited Resend outbox. The moderation decision reason is **required** and shared verbatim in the customer email; it is not a private internal note. The moderation interface now discloses this and previews the automated approval/denial sections. Approved owners additionally receive a bilingual AkiPasa/AkiHQ early-partner invitation and link to an authenticated, claim-scoped survey. Rejections retain factual evidence guidance and resubmission instructions without any promotion.

The new `claim_owner_feedback` table accepts submissions only from the authenticated original claimant of an approved claim, using scoped RLS. Survey responses collect discovery attribution, product needs, optional free text and separate opt-in permission for tailored follow-up, not public reviews or newsletter consent. The `claim_partner_rewards` service-only queue records a proposed three-month business listing Premium gift once per claim. **This does not grant Premium automatically**, change Stripe or subscriptions, assume customer eligibility, or create a paid renewal. The founder team must check entitlement eligibility and fulfil grants manually with a known audited path before notifying the customer. An unverified customer must not see a false activation promise.

Release requires SQL migration verification before website deployment, protected session/RLS acceptance, passing claim email, SQL security, format and full site CI, plus a real hosted EN/ES survey smoke test. Resend claim mail delivery remains independent. Existing decisions and previously sent emails are not replayed. Rollback is to withdraw the invitation/route first; retain feedback/reward rows for audit. See `docs/CLAIM_EARLY_PARTNER_ONBOARDING_20261027.md`.

## 2026-10-27 | Founder-only Android Firebase push (feature-gated)

The source integrates Firebase project `akipasa-android` and Android application `com.akipasa` for data-only FCM without Firebase Analytics or Firebase Auth. Enrollment requires both the server UUID allowlist and a private active founder registry, explicit adult attestation, a current administrator profile and a matching live Supabase session; pending/underage, banned, deleted and revoked identities fail closed. The authorized rollout accounts are Alex and Andrew's business accounts only. Android checks authenticated first-party HTTPS eligibility before permission or token creation, keeps FCM auto-init off and binds each device to the current session. Multiple devices are supported; token reassignment receives a new device identity, and scoped withdrawal, logout/session revocation and current role checks prevent stale delivery. Cookie refresh uses the existing Supabase SSR session and native cookie store, without a second identity system.

New pending claims enqueue a service-only claim/device outbox. A post-commit database wake calls the fixed authenticated Worker endpoint immediately without delaying claim submission or Resend, and the five-minute cron recovers eligible failures. Production sending requires `AKIPASA_PUSH_ENABLED=true` and a valid nonfuture UTC `AKIPASA_PUSH_STARTED_AT`; SQL blocks claims or queued jobs from before that activation cutoff, so dark-launch history cannot replay. Set a fresh cutoff on every reactivation. Leases, bounded attempts/backoff, current recipient/claim rechecks, typed invalid-token cleanup and fixed error categories protect retries. Ambiguous provider outcomes are held, not blindly resent; successful acknowledgements pass a null error. `AKIPASA_PUSH_ENROLLMENT_ENABLED` and `AKIPASA_PUSH_TEST_ENABLED` separately permit a rate-limited genuine current-device test while production sending stays off, without creating a customer claim. Temporary authentication-service failures return unavailable, preserving valid native enrollment; an actual missing/invalid session is denied.

FCM carries only event/claim identifiers, locale and the session binding, with no applicant or venue details. Native WorkManager revalidates the current authenticated session before displaying generic branded EN/ES private notifications; durable bounded deduplication suppresses repeat events, and taps use canonical exact-claim links under existing staff authorization. The mandatory `test:founder-push` suite includes actual SQL migration execution and the installed-SDK session-refresh fixture. Full source/Cloudflare CI, live schema/configuration verification, a signed Android internal-test build and actual foreground/background/cold-start/revocation acceptance remain release gates. No real-device delivery or production activation is implied by source or fixture results. See `docs/FOUNDER_ANDROID_PUSH.md` for configuration, rollout and rollback; keep production sending off until those acceptance gates pass.

## 2026-10-25 | Android OAuth callback styling and return UX

AkiPasa's existing app-owned OAuth callback bridge is unchanged: the browser must not exchange a PKCE code stored with the initiating WebView's verifier. The temporary external-browser return page now uses AkiPasa's v3 icon, orange/branded responsive card, bilingual return instructions, a visible five-second timer/progress indicator and an immediate manual custom-scheme link. One-time code and existing safe continuation fields are retained; refresh/access tokens are not forwarded. The HTML is no-store, no-referrer, noindex and enforces a nonce-scoped script with no third-party dependencies. Other browser login and user onboarding/terms gates are unchanged. The old installed AkiPasa custom-scheme handler already exists: the web-only UX release should not require a new Android binary. Regression: callback and login unit tests, production build, browser rendering on Android Chrome, real-device OAuth cold/warm handoff and an exact-source release check; unit tests cannot confirm OS-level intent dispatch. Rollback: revert isolated HTML renderer and callback route changes; no SQL, Supabase settings, billing, permissions or customer data were changed.

## 2026-10-24 | Owner-approved monthly pricing and upgrade paths

The current commercial catalogue is `APPROVED_PRICING_20261024.md` and
`config/approved-pricing.json`. It supersedes older public tier/price descriptions:
AkiBusiness Basic/Standard/Pro €19.99/€48.99/€97.99; individuals €1.99 for each
AkiPasa/AkiDuermo/AkiCoches Premium; businesses €11.99/€24.99/€19.99 respectively.
Free AkiHQ access, historical machine identifiers and existing subscriber terms
are retained. EN/ES marketing and CTAs explain product-specific Premium upgrades
without activating billing or inventing benefits. Shared audience source remains
identical in the three discovery apps. Source, account, Stripe, SQL guard, service
worker and release dependencies are traced in that pricing contract and receipts.
The 36-case local pricing/lifecycle SQL suite passes; full checks, hosted CI and
exact-source live readback remain required before release acceptance.

## 2026-10-24 | Installed AkiPulse own-history export prerequisite

The shared project now has all nine additive HQ Pulse phases, including the
caller-only management privacy pager. Eleven installed function bodies match
canonical source, private mapping/audit remain empty and inaccessible to browser
table clients, and all native/funnel launch settings remain false. The privacy
reader allows authenticated callers only; anonymous and service execution are
denied. A rollback-only authenticated synthetic-subject read returned two complete
empty sections. Local actual-role SQL regressions pass 33 cases; this is not
positive live customer/provider acceptance. The central two-section adapter
retains authentication, bounded pagination, no-store and whole-export failure
semantics independently of dashboard/analytics gates. Current-master membership,
Android, media and prior contract entries are preserved during reconciliation.
Receipts and the verified provider-history collision recovery are recorded in
`docs/receipts/AKIPULSE_SCHEMA_20261024.json`; no customer rows, billing state,
tracking activation or migration-history DML changed. Exact-head CI and deployed
source verification remain required for the application release.

## 2026-10-22 | Audience-first membership catalogue supersedes five-card comparison

The canonical public/account membership now separates Individual and Business via
keyboard-accessible tabs, showing two offers at a time. Individual is free
discovery plus separately gated personal Premium; Business is free AkiHQ
ownership/listing management plus one product-specific business listing Premium
offer. AkiBusiness Standard/Plus/Pro are **not** presented as listing upgrades:
a separate operations-software handoff links to akibusiness.com. The dedicated
AkiHQ membership centre displays the three product-specific listing upgrades,
while AkiBusiness itself displays only its three paid operating packages.

AkiPasa, AkiDuermo and AkiCoches use byte-identical
`AkiSuiteAudienceStudio.tsx` and stylesheet; each adapter owns its product
wording, approved pricing and billing/readiness boundaries. This supersedes
the earlier five-card visual contract, which remains in history below.
Preserve all active/legacy entitlements, checkout gates, workspace/RLS scope,
server authorization, and Stripe webhook/ledger authority. Do not invent
personal prices on AkiDuermo/AkiCoches or activate purchase buttons before
the commercial gate opens. AkiHQ remains free; listing Premium is not an
AkiBusiness software subscription. No SQL, customer, Stripe or Cloudflare
configuration change. Release only after EN/ES, browser/device, CI and
deployed-SHA evidence; source rollback has no database impact.

## 2026-10-22 | Public and account membership source parity and product clarity

The public and account AkiPasa membership pages now reuse the exact five-card
AkiSuiteMembershipStudio markup/CSS used by the independent AkiCoches and
AkiDuermo products. The first two cards fall under the single AkiHQ logo and
the final three under the single AkiBusiness logo with one hairline divider.
Product branding is shown only in the group headings, never repeated on cards.
Cards retain one desktop row with horizontal scrolling on smaller screens.

The legacy AkiDuermo personal €5.99 plan is not renamed or repurposed: when an
older AkiPasa account link originates at AkiDuermo, the comparison shows the
€14.99 property listing offer and routes to the native AkiDuermo storefront
without initiating the historical €5.99 checkout. The two entitlements remain
separate.

AkiHQ explains free AkiPasa listing management; AkiPasa Listing Premium is
explicitly an AkiHQ listing upgrade and **does not** bundle AkiBusiness tools.
Standard/Plus/Pro remain independently priced per operating location, with
4/8/12 tools and existing monthly swap limits. Personal Premium stays
feature-gated and is offered separately below the five-card row; its existing
checkout path is preserved. Existing workspace selection, purchase gating,
Stripe action routing, entitlement checks, account and locale behavior
remain unchanged. No schema, production data, Stripe product, price or
claim/booking effect is introduced. Dependencies: /[locale]/membership,
account/subscription, membership adapters, original brand asset paths, EN/ES,
responsive scrolling, release CI and exact-head browser testing. Roll back
the presentation adapter/canonical copies without changing subscription data.

## 2026-10-22 | Map popup navigation and native WebView safe-area consistency

MapLibre popup anchors are created imperatively, outside React. Until now, tapping
a map pin's venue/event link performed a full-document navigation instead of
Next.js client routing. In the Android immersive WebView this path was reported
to introduce a persistent enlarged header and extra safe-area padding, while
Explore-to-detail client navigation kept the 48px header compact.

Map popup taps targeting the current web origin now use the Next.js router.
Standard external destinations, modified clicks and native link fallback remain
unchanged. Map popup links retain their href attributes. No native Android
bundle or Google Play upload is needed for this website change. Accept only
after testing Map -> Venue, Map -> Event, Explore -> detail, backwards navigation
and external accommodation links on a real Android device. The map navigation
difference is established in source; the header resolution remains a device
acceptance check rather than a confirmed outcome.

## 2026-10-22 | Android map-to-detail header inset persistence

The Android WebView marks `body[data-android-app="true"]` and its native window owns
camera cutout insets. The mobile app header is a fixed 48px across the Explore,
Map, Venue, and Event routes, including Next.js client-side navigation from
fullscreen Map into a detail page and back. A native-only high-specificity
CSS override in `src/app/portal-unity.css` prevents legacy safe-area rules
from expanding header height or search positioning after route changes.
Browser/PWA safe-area handling and other app frontends remain unchanged.
Physical device regression validation must cover Map → Event, Map → Venue,
Explore → Event, direct deep link, repeated back/forward, Android gesture
and button navigation; source checks alone do not confirm visual behavior.

## 2026-10-22 | Android native notification branding

The Android shell's locally-triggered debug notification now uses a monochrome 24dp
Android VectorDrawable traced from the existing AkiPasa pin-and-spark brand SVG
(`public/brand/logo-horizontal-light.svg`) for the status-bar/small icon.
The optional large notification artwork reuses the already-shipped AkiPasa
launcher foreground PNG (`ic_launcher_foreground`) instead of the generic Android
icon. The app posts only local test notifications through the explicit,
debug-only `com.akipasa.DEBUG_NOTIFICATION` intent; release builds cannot
trigger it. Android 13+ notification permission is requested for this test path.

This does not implement remote push delivery, Firebase/FCM registration,
server token storage, or notification dispatch. Verify the notification's
legibility in the Xiaomi status bar and notification shade after installing a
fresh Android debug build. A native Android rebuild/store bundle is required;
deploying the website alone does not change the notification icon.

## 2026-10-22 | Android release UI and OAuth return candidate

The `com.akipasa` Android shell uses the current AkiPasa orange pin/star raster
launcher identity and navy/cream system chrome. Its immersive window hides the
status and navigation bars on API 26+, lets an edge swipe reveal them briefly,
and restores immersive mode on focus return. It draws to the physical edges,
while the native root keeps WebView controls outside display cutouts and passes
keyboard insets through. Mobile app header and navigation heights are 48/60 CSS
pixels with 44+ pixel touch controls. Physical-device visual acceptance across
cutouts, keyboard, gesture/three-button navigation and light/dark remains required.
The server marks only the native WebView's AkiPasa user agent; that shell uses
the native system-bar insets and suppresses duplicate CSS safe-area padding in
its header, bottom navigation and search trigger. Browser/PWA safe areas remain
unchanged. The Android wrapper is now versionCode 3 / 1.0.2; this native change
requires a new installed build and signed bundle, whereas web CSS updates load
from the live site on refresh.

Google OAuth continues in a trusted external browser. An Android-originated
server action marks the existing HTTPS callback; the browser renders a no-store,
no-referrer return link using `akipasa://auth/callback` without exchanging the
PKCE code. The native app reconstructs the existing HTTPS callback inside its
own WebView, which retains the verifier and terms cookies; verified HTTPS App
Links can also return directly. Ordinary web OAuth, password, email and recovery
callbacks keep their existing contract. Test real debug and Play-signed devices,
Supabase redirect allowlisting, account/terms/onboarding and rejected/cancelled
flows before a store upload. No auth tokens or signing material enter the app.

## 2026-10-21 | Discovery membership studio layout contract (PR #275)

The AkiPasa public and account membership catalogue must use the same modern,
single-row five-offer visual hierarchy as the native AkiCoches and AkiDuermo
storefronts: AkiHQ free, AkiBusiness Standard/Plus/Pro and the origin-scoped
Listing Premium offer. Cards are equally spaced on wide screens and remain a
single, horizontally scrollable, keyboard-accessible row on narrow screens.
Original in-repository AkiHQ and AkiBusiness SVG brand marks appear above their
respective plan titles. Personal Premium remains separately feature-gated, and
may add a sixth card without removing available options.

This is presentation and catalogue ordering only. Keep the approved monthly
prices, checkout-readiness safeguards, existing subscription and Stripe logic,
workspace scope, team delegation, role checks, personal-launch gate and bilingual
links unchanged. Do not create artwork, enable checkout or alter entitlements.
Acceptance requires updated membership UI tests, exact-head lint/typecheck,
visual review at desktop/tablet/mobile sizes and full required PR CI. Production
merges and release verification remain gated on successful checks.

## 2026-10-20 | Authoritative contract recovery and integrity gate

The complete source-history contract text is restored from the last intact parent
blobs preceding #208, while preserving #208's security notes and subsequent verified
workflow/formatter additions. This repairs documentation transport corruption only;
existing application/security behavior and release evidence are unchanged. Exact
commits, blob IDs, source ranges and preservation checks are recorded in
`docs/CONTRACT_DOCUMENT_RECOVERY.md`. Future contract/change checks reject copied
transport markers in these two authoritative files, including documentation-only PRs.
Other documents and ordinary descriptions of partial API reads are not forbidden.

## 2026-10-20 | Restore consent-aware GA4 command delivery (PR #230)

AkiPasa's 8 October privacy-gating change accidentally broke the Google tag
command queue: the client-side `gtag` shim pushed rest-argument arrays into
`dataLayer` instead of native JavaScript `arguments` objects. The tag script
loaded, but Google did not process consent-default, consent-update or GA4 config
commands, and GA4 traffic dropped close to zero. Only the command envelope
changes: `ConsentAnalytics` must push native `arguments` objects, with the
existing GDPR consent checks left intact. No tag may load for a visitor who
has declined optional analytics and marketing. Existing consent withdrawal,
measurement ID `G-PW8547QDGD`, Ads destination, cookie expiry, privacy choices
and consent API are unchanged.

Isolated live-browser reproduction: with an analytics-consent cookie, gtag.js
loaded but reported `usedDefault=false` and `usedUpdate=false`, with no GA4
collection request. Injecting correctly formatted native-arguments commands
activated consent and produced a `g/collect` request. The anonymous consent API
returned HTTP 204. The regression test asserts native arguments for consent
and configuration. Deploy only after required CI and release verification;
confirm that opted-in visitors produce GA4 requests and opted-out visitors do
not load optional tags. Rollback must preserve denied-by-default GDPR gating
rather than restoring the old unconditional Google loader. No SQL, user data,
billing, Ads campaign spend, or other AkiSuite product is modified.

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

### Portal home unity (2026-10-10 candidate)

- AkiPasa consumer components, brand, homepage and navigation remain unchanged. New `portal-unity.css` tokens apply only to `body[data-product="akibusiness"|"akiduermo"]`; root layout assigns the existing middleware product identity. AkiBusiness uses yellow/navy; AkiDuermo green/teal. Uploaded icon masters live in `public/brand/{business,duermo,hq}-icon.png`; `PortalLogo` uses these in headers and product links. AkiHQ's purple AE is a link identity, not a change to the separate CRM repository.
- `BusinessHeader` keeps language/theme visible and groups product links plus authenticated logout inside a native disclosure. `StayHeader` is shared by Explore/Saved, property detail and map/member shells, with identical home, theme, language and settings controls. Auth/terms use the same mark. Existing cookie/locale, Auth and booking routes are preserved.
- AkiBusiness Home (`BusinessHome`) receives only server-authorized membership rows plus the pre-existing staff editorial row. It renders eight cards per page, name search (accent-insensitive), venue/stay filters, status filtering and name/status sort. Each opens the same product-aware venue editor. Owner-only deletion remains the existing reason + DELETE dialog behind an Options disclosure; editorial deletion remains excluded. Membership read errors are explicit rather than empty states.
- Analytics RPC fan-out now runs only for the Analytics view, avoiding per-property RPCs on Home. Membership/RLS, claim/create forms, event/reward/growth sections, booking APIs, storage, payments and analytics collection stay unchanged. No schema or production records change.
- AkiDuermo's welcome is compact and green, with the existing search/availability flow immediately below it. Five-link fixed navigation stays intact. Raster PWA icons for Business/Duermo are derived from uploaded masters, including maskable safe-area variants; their manifest omits the competing generic SVG. AkiPasa assets/manifest identity remain unchanged.
- Regression evidence: `tests/portal-home.test.tsx` and `scripts/test-portal-home-browser.mjs` (real components, disposable data/actions) cover EN/ES, light/dark and phone/tablet/short split-screen. CI tablet workflow runs the new 64-combination harness and saves screenshots. Full check, Cloudflare and live verification must be recorded before release; this section does not assert deployment.
- Published as draft PR #92 after user approval. CI installed Chrome; its first portal harness attempt exposed a missing browser `process.env` stub before component rendering. The harness now supplies disposable build-time defaults and logs page errors; browser acceptance is still pending a successful rerun.
- The corrected harness passed all 64 combinations on commit `22be0bd`. A final compact-hero override clears the inherited mobile 300px minimum; the harness now requires the search CTA above fixed bottom navigation on full-height screens. Final CI rerun and screenshot review remain pending.
- Final production code (`421a965`) passed local full check/Cloudflare packaging and all 64 tightened portal browser cases. Existing tablet routes passed; guest-route tests required their legacy logo-text selector to follow the new explicit auth-brand accessible name. Playwright suites now use separate output subdirectories to retain portal screenshots. Remaining CI results and artifacts are tracked in PR #92; production/physical install acceptance is unperformed.
- All five workflows passed on `b1a91ba`; screenshot review identified oversized default Business shortcut SVGs. Business Home now sets explicit icon dimensions; portal browser acceptance guards compact quick actions and uploads its evidence before the wider route suite. Final statuses/artifacts are tracked in PR #92.

### Shared portal header controls (2026-10-10 follow-up)

- `PortalHeaderTools` owns language, theme and Aki Apps disclosure for Business, Duermo discovery/property/member shells and Duermo localized auth/terms. Order, 44px controls, branded app cards and keyboard/outside-tap dismissal are shared. Business retains localized pathname/query switching; Duermo retains its locale cookie and `lang` callback. Each menu omits the current product.
- AkiPasa's menu entry uses its existing orange raster icon with the same `PortalLogo` wordmark/card treatment as the other products. Consumer AkiPasa header, routes and assets are unchanged. Business logout remains authenticated-only; Duermo Settings moves into the dropdown. Product URLs retain existing canonical hosts and locale parameters; no session transfer, roles, API, database, payments, media or consent changes.
- Verification: focused header/catalogue suite passes (10 cases); full checks, 64-combination browser acceptance and production smoke are tracked in the follow-up PR. Authenticated live owner and physical installation acceptance are not claimed.

### Staff ownership claim review (2026-10-10 candidate)

- Staff moderation Claims uses `staff_pending_venue_claims`: 20 pending claims per page, stable received-date/ID ordering and total count. SQL independently checks the current profile's moderator/administrator role before reading Auth email. PUBLIC/anon execution is revoked; no service-role client or public identity projection is added. Both regular venues and accommodation claims use this queue.
- Cards distinguish the applicant's account email/profile phone from the venue's existing phone/website; show name, account creation, claim receipt in venue city timezone, full escaped evidence, address, public listing link and reference IDs. Missing contacts are explicit, not fabricated. Current contact/profile details are live reads, not historical submission snapshots. The claim form stores evidence and claimant ID only; no separate application phone or IP/source-location tracking exists.
- Page-level authorization precedes loading contact data. Read failures show an error rather than an empty queue. Review mutations retain the audited `moderate_item` RPC and required decision reason, and preserve Claims/page on success/failure. No ownership, billing, automatic review, consent or email-send behavior changes.
- Apply `database/migrations/20261010105857_staff_claim_review_details.sql` (mirrored in Supabase migrations) before deploying. Rollback: revert application code, then drop only the new read function; claim/member records are untouched. Verification and release status are in the impact register.

- Claim review validation: local full check and Cloudflare packaging PASS; SQL enforces staff-only contact access in executable tests. PR #94 carries a 16-case real-component responsive browser harness. Local Chrome download and route-server environment block browser acceptance; CI and authenticated production status must be checked before release.

### Claim decision email notifications (2026-10-10 candidate)

- Every future staff/admin pending-to-approved/rejected claim transition queues one private `claim_decision_emails` row in the same transaction as the existing ownership grant and moderation audit. Historical decisions are not backfilled. Verified current Auth account email and profile locale select the recipient and EN/ES copy; missing/unverified email is blocked, never invented. Decision, reason, venue and applicant details are snapshotted.
- `claim-decision-email.ts` renders accessible branded HTML and plain text from `Alex at AkiPasa <alex@akipasa.com>` with the same reply address. Approval welcomes the owner and links to their existing management page. Denial includes the actual reviewer reason, identity/contact and official-business-evidence checklist, safe-data advice, and the existing claims form preselected to that venue. A new submission is reviewed again, with no approval guarantee or paid-plan claim.
- The successful claim action attempts immediate delivery; provider failure never reverses the committed decision. Worker cron dispatches due rows every five minutes using existing runtime secrets. Service-only leases, bounded batches, stable provider keys, capped exponential retries and persistent ambiguity tracking prevent concurrent/duplicate sends. Uncertain delivery older than 23 hours is held for operator review. Permanent provider errors or changed/deleted recipient accounts are blocked. `sent` means provider acceptance, not inbox delivery.
- Claimant/staff-only read RLS and explicit grants protect recipient/payload data; only the service role can lease/acknowledge. Claim/profile deletion cascades the outbox and account export includes only the claimant's rows. Booking, accommodation confirmation senders, public discovery, analytics, consent and billing are unchanged. New mirrored migration `20261010114606_claim_decision_emails.sql` must precede code rollout. Rollback: revert code and disable `claim_decision_queue`; preserve queued/audit history. Release evidence is recorded in the impact register; no deployment is implied here.

- Claims can use an isolated runtime `CLAIM_RESEND_API_KEY` (preferred), falling back to the existing RESEND_API_KEY when already configured. This separates claim activation from previously queued booking notifications. The existing release endpoint exposes only a claim-mail release marker and configuration boolean, never credentials or recipients; key presence alone is not provider/inbox acceptance.

### Venue and accommodation team access (2026-10-10)

- Basic AkiBusiness access accepts an existing editor, manager or owner row for the signed-in profile before the personal Business entitlement fallback. Home must not require a global organiser role for team members. Assignments on pending/unverified properties remain visible through existing tenant RLS. This applies to venues and AkiDuermo accommodation in the same managed list, workspace and protected actions.
- Team membership grants no paid Business Pro/consumer entitlement and changes no platform role. Server RPC/RLS retains editor content, manager operations and owner team/deletion boundaries; individual property access still checks `is_venue_member`. Removed members lose the membership access route on the next request. Failed membership reads never grant access. No schema/data migration is needed for current production policies.
- Successful team additions invalidate both localized Home routes. Home refreshes current membership on focus/visibility return and every 30 seconds while visible, retaining filters. This addresses stale open sessions; database acceptance alone does not prove the user’s browser symptom is resolved.
- Acceptance: `business-team-access.test.ts` checks guard/subscriber/Pro/error/revocation behavior; `business-team-home.test.tsx` invokes the actual Home loader with consumer membership in both property types/locales. Production and full validation status is recorded in the impact register.

### New claim notifications for staff (2026-10-11)

- A new pending `venue_claims` INSERT creates exactly one private `claim_submission_alerts` row in the same transaction. The insert trigger covers any venue-claim entry path (activity or accommodation), not just AkiBusiness's web form. Historical claims are not silently emailed retroactively.
- `submitVenueClaim` attempts immediate delivery **after** the claim is committed; the Cloudflare scheduled worker retries every five minutes using `dispatchClaimSubmissionAlerts`. SMTP/Gmail is not a prerequisite for Google Workspace to **receive** mail.
- Alert sender is the existing verified claim sender `Alex at AkiPasa <alex@akipasa.com>` via the existing Resend-backed `CLAIM_RESEND_API_KEY` (fallback `RESEND_API_KEY`) and service-key Supabase connection. One provider request goes to both `alex@akipasa.com` and `andrew@akipasa.com`. Never claim delivery without a provider acceptance ID and operational monitoring. If Resend sending is blocked by billing/configuration, the pending alert remains queued; Google Workspace sending requires separate OAuth/relay credentials.
- The alert contains only venue name, timestamp, claim reference and protected review URL. It does not copy claimant email, private phone, evidence or unverified documents into mail. Fixed recipients, provider idempotency key based on immutable claim ID, service-role-only leases and acknowledgments, bounded retry and ambiguous-delivery review preserve staff privacy and prevent storms.
- `public.staff_pending_venue_claim_count()` powers Staff summary and matches the staff-authorized paginated claim queue; zero is never inferred from a failed query. Existing moderation approval, rejection, ownership grants and claimant decision notifications are unchanged.
- Additive migrations mirrored under `database/migrations` and `supabase/migrations`: `20261010231800_staff_pending_claim_count.sql`, `20261011010000_claim_submission_alerts.sql`. Apply before the app release. No backfill of historical email sends or automatic ownership decision. The private outbox follows claimant account export/deletion as with decision notifications.

### Claim-specific applicant verification fields (2026-10-11)

Claim picker search results stay in normal flow beneath the search input,
including wrapped EN/ES headings and activity/accommodation controls. A bounded
results list scrolls without obscuring the input or displacing content over the
map. `scripts/test-claim-picker-browser.mjs` exercises the real component with
disposable search responses across locales, themes and responsive widths,
including selecting a result and clearing the selected venue. It validates map
container geometry, not MapLibre rendering or authenticated live claiming.

- The EN/ES AkiBusiness claim form `/[locale]/business?view=claims` uses the existing ClaimVenuePicker and now separately collects applicant full name and relationship to the business (required), optional applicant phone, business email, official venue URL and venue phone, plus the existing required evidence text. Mobile and light/dark forms must display these input controls.
- `submitVenueClaim` performs server-side Zod validation and inserts private `venue_claims.claim_details` (including `submission_locale`) alongside the immutable claim ID, claimant ID and evidence. It must retain the existing transactional staff alert outbox and immediate `dispatchClaimSubmissionAlerts` call. No canonical venue/profile fields may be modified by an unapproved claim.
- Staff moderation `staff_pending_venue_claims(integer)` includes `claimant.submission` from `claim_details` behind its existing moderator/administrator role check. Submitted applicant/venue contacts are labelled unverified and kept distinct from profile details and public listing. Historical claim rows default to an empty object and still render safely.
- Mirrored migration `20261010231500_venue_claim_details.sql` adds bounded private JSONB and preserves the staff RPC signature and pending-claims count. Apply before publishing this form. Relevant tests: `tests/claim-submission-details.test.ts`, `tests/staff-claims.test.tsx`, `tests/staff-claims-sql.test.ts`. Owner claim status, notifications and ownership decisions are unaffected.

### Staff claim-review workspace UX (2026-10-11)

- Staff moderation `/[locale]/staff/moderation?queue=claims` renders one selected claim at a time instead of duplicated large request cards. The page has a compact pageable claim selector (`&claim=<id>`), request summary, applicant-submitted unverified evidence, existing canonical venue/profile contact details, evidence text, references and a dedicated decision panel. Claims selection stays confined to the privileged 20-row staff RPC result; it does not create a new public read or bypass authorization.
- `src/app/[locale]/staff/ClaimReview.tsx` provides the claim-only layout and **preserves** the server `moderateItem` action/form parameters (`locale`, `targetType=venue_claim`, `targetId`, `claimPage`, `reason`, `decision=approved/rejected`), so existing audited ownership moderation and claimant notifications remain intact. Other queues continue using their existing `StaffQueue` cards. Only the claims tab hides automatic moderation settings, which apply to different publication queues.
- The optional Request More Information control opens the signed-in staff member's mail composer with an editable message to the authenticated claimant email. It does **not** change claim status or claim an automated support email. Checklist boxes are explicitly not persisted/audited; do not treat them as verified applicant claims. Unverified metadata is never promoted automatically to `venues` or `profiles`.
- Visual CSS lives in `src/app/[locale]/staff/claim-review.css`, imported only for the moderation route. Container queries stack two-column applicant/existing-record layout into one column for narrow tablets, phones and split windows. EN/ES, dark/light, venue vs accommodation links, long evidence and long addresses/phones must render without horizontal overflow.
- Browser harness `scripts/test-staff-claims-browser.mjs` checks 360/600/1536/640x400 across both locales and themes, layout columns, reviewer actions and DOM safety; `tests/staff-claims.test.tsx` guards focus selection, uniqueness and decision preservation. No database schema, new secret, email trigger, subscription or public catalogue behavior change. Rollback: revert UI files only.

### AkiSuite unified lifecycle emails (2026-10-11 release candidate)

- `suite_email_outbox` is the durable transactional source for claim receipts, one welcome per verified user/product (AkiPasa, AkiDuermo, AkiBusiness, AkiHQ), booking requests, cancellations, opted-in saved-event and saved-stay reminders. Unique `dedupe_key` and service-only leases/ACK prevent concurrent duplicate sends. Existing confirmed booking, staff claim-alert and decision queues remain separate and authoritative.
- `src/lib/suite-email-templates.ts` renders accessible branded EN/ES HTML/plain text, sender `AkiPasa Support <support@akipasa.com>`. Staff claim submissions remain English-only to Alex and Andrew, linked to authenticated moderation. Claimant receives a submission receipt in `venue_claims.claim_locale`, a separate column from private claimant details. All customer-facing booking confirmations now come from Support. Provider acceptance isn't proof of inbox receipt; Cloudflare's RESEND/CLAIM_RESEND secret must be verified.
- First-login welcome email calls `queue_suite_portal_welcome` only with authenticated verified sessions, with unique account+product keys. AkiPasa established accounts preceding release are excluded; AkiHQ separately queues via `elguiriashing/akihq` after workspace permission verification. User identity and existing product roles remain unchanged.
- Saved-event reminders require a valid published event occurrence approximately 48h away, account saved-event reference, and explicit opt-in. Saved-stay follow-ups require a persisted `suite_saved_stays` account-backed save at least five days old, no subsequent reservation and opt-in. AkiDuermo's anonymous browser saved list still works, but cannot cause unsolicited email. Prefs available in Account Saved and AkiDuermo Settings, default OFF.
- Account Saved and Following collections read stable 24-item pages with exact
  totals and localized stored-name search. Their cards provide explicit
  pending-aware unsave/unfollow actions with localized outcomes, then refresh the
  existing account-layout counts. Current catalogue names/slugs, reminder opt-in,
  exports, reference-table RLS and trusted behavior signals remain authoritative;
  no collection schema or permission change is introduced.
- An Account personalization withdrawal applies locally before the account sync,
  so optional behavior stops even if that POST fails. The control stays visibly
  Off and exposes an account-sync retry that preserves the other local consent
  choices; an error never restores optional consent.
- Passport reward-claim and enrollment cards translate stored workflow states in
  EN/ES and show a localized unknown-state fallback instead of raw backend values.
  Claim codes and state identifiers stay unchanged; all displayed claim and route
  deadlines use the shared Europe/Madrid civil-date formatter.
- Disabled membership actions identify the controlling access-read, included-plan,
  overlap, catalogue-readiness, workspace or add-on requirement in EN/ES. Links
  lead to the existing account retry, access, billing, workspace setup or required
  AkiHQ Pro section; entitlement and checkout gates remain unchanged.
- Booking request received and cancellation messages clearly distinguish pending from confirmed; existing booking confirmation email outboxes only activate on confirmed statuses. Cancellation never claims an unsupported refund. The 5-minute Cloudflare cron `dispatchSuiteEmails` revalidates current email verification, save/booking state, and consent before delivery, with bounded retry and no historical backfill.
- Mirrored `20261011013000_suite_emails.sql` migration must be applied before release. No live old decisions/customer notifications must be resent without verifying delivery and authorisation. Review Cloudflare runtime credentials before claiming production mail delivery.

### Claim-decision email 403 visibility and recovery (2026-10-11)

- Live evidence: five claim decisions, three staff submission alerts and one suite notice returned Resend HTTP 403 despite saved status/audited moderation. The production Cloudflare sending credential or its permissions must be repaired; direct Resend sample sends do not validate the worker secret. Gmail is not the current application sending transport.
- Staff moderation now redirects with a private, non-identifying `mail=sent|not_sent` flag after the immediate dispatch. An EN/ES notice warns when provider acceptance was not obtained; ownership decisions are never rolled back by email errors. The sender still needs the existing service-only queue and approved runtime secrets.
- A permanent/permission-related 403 is blocked rather than silently retried, so older rows require carefully selected manual requeue only after a new live test succeeds. Avoid replaying stale new-claim alerts or claim-received receipts after the claim is already decided. Operational SQL and verification: `docs/CLAIM_EMAIL_403_RECOVERY.md`.
- Scope: AkiPasa EN/ES authenticated Staff claim-review only; no consumer/business/duermo public data, roles, payments, email body, locale, account ownership, queue schema or cron cadence change. Cloudflare secrets and live replay are out-of-band production steps, not accomplished by merging UI code.

### Enforced Resend sender for business and booking notifications (2026-10-11)

- All app-owned Resend mail modules use `AkiPasa Support <support@akipasa.com>` as their From identity, and `support@akipasa.com` as Reply-To where applicable. This includes EN/ES claim decisions, internal claim alerts, suite welcome/request/cancellation/reminder mail, and confirmed event/stay bookings.
- The legacy `BOOKING_EMAIL_FROM` / per-call From override is removed from the booking confirmation sender, so a mismatched production environment variable cannot silently impersonate a different sender. Booking semantics, recipients, locale, keys, DB outboxes and retry behavior are unchanged.
- Live delivery still depends on a valid Cloudflare Resend sending API key for verified `akipasa.com`; a recorded provider 403 remains blocked. Supabase Auth's separate SMTP configuration must be checked independently before asserting that Auth templates use this sender.

### Canonical Resend credential selection (2026-10-11 follow-up)

- Live rejected claim email outbox records reported `provider_403` while a direct test with the connected Resend account and `support@akipasa.com` was delivered. The application previously prioritized an old `CLAIM_RESEND_API_KEY` over `RESEND_API_KEY`, potentially silently shadowing a newly corrected main key.
- Central `resendSendingKey` now selects trimmed `RESEND_API_KEY` first with `CLAIM_RESEND_API_KEY` retained as legacy fallback; all claim decision, claim staff alert, booking, accommodation and suite outbox dispatchers share this selector. Both Worker cron and server actions use the same preference; no change to sender identity or delivery queue permissions.
- Selection precedence alone cannot validate a production secret or confirm email delivery. Cloudflare must have a valid sending-enabled Resend key from the intended verified-domain account. Existing blocked outbox items are never automatically replayed. See `docs/CLAIM_EMAIL_403_RECOVERY.md`.

## 2026-10-13 | Canonical Resend recovery instruction

The claim-email recovery runbook inspects production `RESEND_API_KEY` first, matching `resendSendingKey` in `booking-mail-delivery.ts`. Only absent or blank primary keys use legacy `CLAIM_RESEND_API_KEY`; rotating that fallback cannot repair an invalid nonblank primary. No keys, runtime configuration, queue status or messages are changed. Existing key-precedence regression coverage remains authoritative; live credential repair and individually authorized requeues are operational dependencies, not accomplished by this documentation change.

Canonical-key recovery validation: the existing `tests/claim-decision-email.test.ts` suite passed 10/10 cases on 2026-10-13, including trimmed primary-key selection, absent/blank-primary legacy fallback and dispatcher selection. The isolated command retained the existing timeout limits; no credentials or real messages were used. Required exact-head CI remains the merge gate.

### Sticky mobile workspace menu overlay (2026-10-11 candidate)

- EN/ES Account, Staff, and Admin route layouts all mount the shared `WorkspaceShell`. Its mobile trigger was sticky but its drawer was explicitly styled as an in-flow block, leaving the expanded menu near the document's top after scrolling.
- The compact trigger remains sticky. A new mobile-only sticky navigation wrapper anchors the open drawer directly below the trigger, and the bounded drawer scrolls independently above page content without moving the document. The wrapper is hidden on desktop, preserving the desktop grid and horizontal sidebar navigation.
- Escape closes the menu and returns focus to the trigger; outside pointer-down and route-link activation close it; breakpoint changes to desktop still dismiss it. The shared role-gated menu items and localized labels are unchanged.
- This is presentation/navigation only. There is no change to routes, session, role authorization, Supabase, RLS, API, storage, booking, payment, translation, consent, email, analytics, or customer data. Revert the WorkspaceShell and CSS edits to roll back.
- Regression coverage in `tests/workspace-shell.test.tsx` checks Account/Staff/Admin mobile menus, anchored DOM/overlay CSS, outside click, Escape/focus, route selection and desktop grid exclusion. Full `npm run check`, real mobile browser assertions in EN/ES/light/dark, and Cloudflare production smoke are **pending** until CI/preview evidence is available; no deployment is implied.

### Staff operations dashboard and administrator-only audit (2026-10-11 candidate)

- Request: Staff workspace is a practical full-width operations surface, without the side audit feed or Staff audit navigation. The Admin dashboard, including its current activity feed and full audit, remains unchanged.
- Shared `WorkspaceShell` still enforces moderator-or-administrator access to Staff and administrator access to Admin; `src/app/[locale]/staff/page.tsx` renders bilingual EN/ES task-led priority cards (publishing, ownership claims, support), compact linked counts, and secondary creator/catalogue/promotion tools. Removed the staff `moderation_actions` homepage read, saving one round-trip and eliminating privileged log copy. Counts from failing sources display `—` rather than pretending zero. The Staff dashboard CSS is scoped to `.staff-dashboard` and can use full available width at 360–1536px, landscape and split-screen without altering Admin.
- Access boundary: legacy `/[locale]/staff/audit` checks `isAdministrator` server-side and redirects admins to `/[locale]/admin/audit`, but returns 404 for ordinary Staff. The legacy `/moderation?view=audit` route targets the Admin URL, itself guarded both by its layout and page. Staff menu and homepage no longer link to the full audit.
- Database: additive `20261011204631_staff_audit_admin_only_20261011.sql` in both migration directories tightens the existing `moderation_actions_operator_read` SELECT policy from moderator+administrator to authenticated administrators only. An authenticated Staff member is still allowed to carry out existing authorized moderation actions, while SQL SECURITY DEFINER writes and immutable audit history remain intact. No table/column or record is removed. The role boundary depends on correct `profiles.app_role` assignments: `administrator` must be reserved for approved operators.
- Dependencies: Staff home counters, claim queues, support cases, user/creator operations and existing role checks are unchanged; Admin can still review all audited activity. No CRM, AkiBusiness/AkiDuermo, booking, email, auth session, analytics, payments, map or consumer surface is changed. Rollback: revert UI files and, only when authorized, restore the previous policy expression; audit records are never deleted.
- Verification: `tests/staff-audit-access.test.ts` uses PGlite role simulation to deny consumer/organiser/moderator direct table reads and allow administrator. Also checks mirrored SQL, UI non-disclosure and responsive stylesheet. Full `npm run check`, Cloudflare package and browser evidence are required; do not claim deployment until the database policy is applied and the Staff/Admin live access split is verified.

### Staff promotions read-only inbox polish (2026-10-11 release candidate)

- Reported: Staff /[locale]/staff/promotions showed an oversized generic Operations header and a wall of the latest 50 promotion request messages and internal notes. It lacked filtering, useful service labels and concise date/status display.
- Source: `src/app/[locale]/staff/promotions/page.tsx` continues to use the authenticated moderator/administrator Staff layout, and explicitly checks `canModerate` before querying only the most recent 50 `promotion_requests` rows. Data flow is unchanged: Supabase `promotion_requests` and joined venue names -> server normalization -> bounded client `StaffPromotionsInbox` with local-only search/status filters and native `details` disclosure. The existing Admin promotion page remains responsible for state changes, scheduling and internal notes.
- EN/ES: localized dashboard labels, service/state names, Madrid-calendar dates, responsive cards at small/large widths, native keyboard-operable summaries, and open/working/closed filter groups. Unrecognized services/statuses display their original safe text instead of being discarded. Messages/notes are rendered as text and expanded on request. An unreadable Supabase response produces an explicit error rather than a false empty inbox. Counts and filters are **only for the latest 50 fetched requests**, not full database totals.
- CSS `staff-promotions.css` is scoped to this Staff route and hides only the redundant inherited Operations heading when this page is present. Main Staff dashboard, Admin, AkiBusiness/Other AkiSuite portals, global navigation, mobile drawer, roles and permissions do not change.
- No mutation/API/schema/RLS/cron/email/analytics/booking/payment changes or data backfill. The read-only Staff view does not enable editing promotion state; reversible by restoring the route and removing the dedicated component/CSS. Existing administrator accounts and audit policy stay untouched.
- Verification planned: `tests/staff-promotions-inbox.test.tsx` interactive search/status/expand/locales/empty and read-only coverage, plus full `npm run check`, Cloudflare build, CI tablet/browser and logged-in EN/ES live smoke where credentials permit. GitHub merge does not itself prove Cloudflare production promotion.

### Unified Admin suite: shared Rewards Centre, searchable workflows, visual safety (2026-10-12 candidate)

- User-reported: each Admin subroute repeats a giant generic "Administración" banner above its own page title, and gradient cards can clip labels behind the rounded/cropped border; some tools lack search/visible controls. Passports, Award Grants and Achievements should be one discoverable workflow, rather than three entries in horizontal Admin navigation.
- Navigation: `src/app/[locale]/admin/layout.tsx` continues to enforce administrator role using the existing Supabase profile check and `WorkspaceShell`. The shared shell has an opt-in `hidePageHeading` prop used **only** in Admin, leaving Staff/Account untouched. Admin's top nav keeps one Rewards item (`/admin/passports`) and marks it active on both the `/admin/passports/*` and `/admin/achievements/*` routes using `WorkspaceItem.matchPaths`. Existing deep links and authorized server actions remain valid.
- `RewardsTabs` provides one visually consistent Rewards Centre with three clear tabs (Passports campaigns, Grant Stamps & Awards, Achievements). Rendered on all three legacy route pages and venue-category editor. No reward migration, XP/grant math change, RPC contract, role elevation, idempotency change or reward history rewrite; just consolidated navigation and safer layout. Creation, member search/grant, achievement editing and venue categorization remain separate, guarded workflows.
- `AdminSearchList` is an EN/ES client-side accessible search/status/Show more control. It receives **only pre-authorized, already-loaded rows** as child JSX content, so original Next Server Action forms and role checks still operate on the server. Used for business applications (100 loaded), audit (150), commercial requests and feature slots (existing query bounds), privacy requests, passport campaigns, categories, city sample (100), and feature flags. Search is explicitly scoped to loaded data; it does NOT promise full-database coverage. Existing `UserSearch`, `VenueRelevanceReview`, `AchievementManager`, `AwardManager` keep their specialized server search, pagination, approval and grant workflows; `AITeamDashboard` adds local filtering to loaded tasks, schedules, approvals and activity.
- `admin-suite.css` is scoped under `.admin-workspace`, fixes section padding, minimum widths, line wrapping, header clipping and responsive control layout; it also styles compact rewards tabs and searchable cards. Other portals and consumer styling do not change. The generic Admin banner disappears from subpages rather than consuming an entire scroll. Existing Admin home operations hero remains its own section.
- Impact: UI and bounded local search only. No SQL migrations, permission/RLS modifications, audit access changes, funding/Stripe action changes, email send, booking, map, accommodation, content or personal data writes. No automated migrations to production. Forms preserve server action names, hidden input values and audit reasons; old URL links remain routable for backward compatibility. Roll back entire branch via application revert; no data rollback needed.
- Verification: added `tests/admin-suite.test.tsx` for search filtering, rewards route accessibility, preserved decision and grant links. Run `npm run check`, Cloudflare packaging, tablet/browser EN/ES light/dark (portrait/landscape/split view) before merge, plus authenticated production Admin smoke after connected deployment. Repo/CI evidence is distinct from actual Cloudflare active version and signed-in Admin access.

### Admin two-page layout regression and single disclosure chevron (2026-10-12 candidate)

- After the Admin-wide redesign, `/admin/users` still showed overlapping search label/input/help text at split-screen tablet widths and `/admin/promotions` displayed overly dense expanded commercial request editors. Follow-up PR #113 scopes layout repairs to Admin: explicit non-overlapping search rows, compact request summaries, grouped business message/form content, clear spacing and one-column date controls on narrow screens.
- `/admin/business-applications` also showed two rotating glyphs overlaid: global `details.settings-disclosure > summary::after` draws a chevron using borders, and the Admin suite adds `+`/`−` content to the same pseudo-element. The CSS fix targets only `details.settings-disclosure.full-width-disclosure`, suppresses native markers and the generic plus/minus, and renders a single border-based chevron rotating from 45° to 225° on disclosure. No new interactive element, JS state, action, or icon asset needed.
- All authorized Next Server Action forms, original record IDs, payment/claim/promotions decisions, audit reasons and Admin role protection are untouched. No SQL/RLS, API, storage, email, booking, payments or consumer/staff/business changes. Old links and reversible data remain.
- Regression: `tests/admin-suite.test.tsx` verifies the selected disclosure variant retains a single closed/open CSS chevron. Full `npm run check`, Cloudflare package, browser acceptance and authenticated production smoke are still required before claiming live completeness. UI-only rollback via reverting PR #113.

### Compact Admin Catalogue, Relevance and Configuration master-detail UI (2026-10-12 candidate)

- **Requested:** eliminate horizontally wasted space and tall repeated forms from Admin Catalogue (categories/cities), Catalogue Relevance review, and Platform Configuration, with **distinct desktop, tablet and phone experiences**, one-screen task focus and no loss of workflows. Screenshots showed expanded category/feature forms across the full width and identical repeated relevance decision forms for ~1,505 proposals.
- **Structure:** new `src/app/[locale]/admin/AdminWorkbench.tsx` renders a two-column record directory + exactly one selected editor for both catalogue taxonomies and feature flags. Desktop >=1450px uses a roughly 30/70 split, mid-width/tablet 701–1080px uses 38/62, and phone <=700px uses explicit Records/Editor controls with one pane visible at a time. Sidebar search is in-memory **only among the existing server-loaded rows**; categories retain their existing query, city list remains limited to first 100 and flag list is unchanged. Creating new category/city is a dedicated button/pane, not an always expanded form. A single form is in the DOM at a time for each selected record, avoiding repeated controls and making wide space useful.
- **Relevance:** `src/components/VenueRelevanceReview.tsx` preserves its existing authorized `/api/admin/venue-relevance` GET (search/action/offset, server-side 40-row pagination) and POST (`venueId`, fingerprint, decision action KEEP/DOWNRANK/HIDE, weight, reason). New side-by-side proposal list and selected evidence/decision editor reduce form clutter. Phone has Proposals/Review pane switching. Existing stale-proposal denial, manual override notice, API authorization, auditing and decision schema remain unchanged. A reloaded page retains current query/filter/offset but no unsupported client persistence is claimed. Loading/errors/pagination are still explicit.
- **Configuration:** one selected flag editor is shown alongside compact status-filterable flag list. Existing `set_feature_flag` action and required 10-character audit reason remain intact. Toggles do not automatically save or mutate production data; submit remains explicit. Admin-specific CSS `admin-compact.css` is only imported from the authenticated administrator layout and handles desktop/tablet/short-split-screen/phone with bounded scrolling in columns and vertical phone panes.
- **Safety scope:** no SQL migration, RLS/security scope change, role elevation, index/sitemap/map/SEO, billing, email, accommodation/venue data, rewards or feature-flag values changed. All three existing routes and EN/ES action redirects remain stable. Roll back through code revert without data restoration. Keep Admin access to the user's existing five authorized administrator accounts.
- **Regression:** new `tests/admin-compact-workbenches.test.tsx` verifies one active editor, list/editor phone controls, search/status selection, API POST decision payload and presence of endpoint security/unchanged RPCs. Update `tests/admin-suite.test.tsx` for new `AdminWorkbench` instead of previous search list. CI must pass `npm run check`, booking and tablet browser, Cloudflare packaging. Authenticated production UI plus exact deployed Worker commit still require separate verification; do not claim live deployment from merge alone.

### Compact Account workspace and Passport ownership (2026-10-12)

- Account uses the existing guarded WorkspaceShell with hidePageHeading and a scoped AccountPageHeader (one h1 per screen). Shared Account CSS explicitly resets inherited grid placements, supplies real header padding, wraps long copy and exposes every desktop navigation destination. Staff/Admin/Business shells retain their own layout. Profile, preferences, privacy, membership, collections and bookings remain existing server-authorized routes/actions.
- Progress is removed from Account navigation; the legacy /[locale]/account/rewards route checks locale/session and redirects to /[locale]/passports. Overview and Premium shortcuts link directly to Passport. No XP, stamps, achievements or reward data is removed. Account overview no longer reads the duplicate XP ledger and represents failed collection counts as unavailable.
- Responsive coverage must include EN/ES, both themes, phone/tablet/desktop and short windows, with text containment (not just document overflow), complete navigation, active edit disclosures, booking actions and long labels. The real-component browser harness uses disposable data/actions; production authentication remains a separate verification step. See the impact register for exact test and rollout results.
- Account failed reads must remain unavailable rather than becoming empty editable values, disabled consent or an apparent absence of billing/deletion records. Profile edit/media forms, the affected Privacy controls and new membership checkout wait for a successful read; localized retry keeps the original authorized workflows available after recovery. Successful missing-row defaults, independent data export and billing management for a successfully loaded customer remain intact.
- The companion public acceptance follow-up restores Passport motion-status feedback to the visible/accessibility tree and raises phone controls, the map legend summary and compact attribution toggle to 44px. Attribution and its expanded text have reserved space beside Privacy, Support and the short-window map controls; the status caption wraps within its own available width. Native attribution and privacy interactions are checked in both languages across phone, tablet, desktop and short windows. CSS-only changes preserve motion permission, reduced-motion handling, consent, map and reward behavior; browser tests open the current mobile drawers before exercising their controls.

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

## 2026-10-20 | Gated account completion and age declaration candidate

The shared eligibility contract uses a private, disabled-by-default signup cohort,
atomic caller-only completion and a terminal negative declaration. Existing users
remain exempt without being described as age verified. AkiPasa's server account
guard, password/Google callback paths, protected activity-table mutations and
optional tracking adapters consume this state; privacy/export/deletion, legal
notices, password recovery and sign-out remain available through safety routes.
Username and terms are required for an affirmative declaration; photo/bio are
optional and reuse current profile storage. Neither editable metadata nor a
client-side toggle unlocks the account. Existing legal text/version is unchanged.

See `docs/ACCOUNT_COMPLETION_RELEASE.md` and the dated legal memo. Independent
five-app adoption, complete privileged endpoint coverage, disposable hosted/real
PostgreSQL concurrent acceptance, responsive browser acceptance and legal review
remain activation gates. Source/schema flags remain off and no historic account
is backfilled. A source-only rollback after activation must retain eligibility
checks; never erase the cohort or user data to recover.

## 2026-10-20 | Shared referral attribution candidate

The additive referral foundation uses immutable shared-account attribution,
owner-scoped representative leads and privacy-safe aggregate dashboards.
`AKISUITE_REFERRALS_READY` defaults off. Signed/reconciled paid invoices produce
service-only append-only evidence; event/invoice deduplication and conservative
refund/dispute holds prevent duplicate or failed-payment rewards. Programme rules
are prospective only. SQL constraints keep discounts and payouts disabled even
for application administrators. No existing subscriptions/prices are migrated.
Public EN/ES referral landings preserve authentication/Terms return destinations;
no tracking cookie or cross-domain identity token is introduced. RLS, explicit
grants, account export, admin evidence export and audit accompany the schema.
See `docs/REFERRAL_ENGINE_20261020.md` for paths, checks, rollback and exact gaps.
No production release or authenticated acceptance is implied by this entry.

## 2026-10-20 | Explicit cross-product language contract

AkiSuite selectors and management/operations handoffs now retain EN/ES using
canonical product-specific route formats. AkiHQ remains free management;
AkiBusiness remains paid operations. The synchronized suite-navigation v1
contract rejects external/query/fragment/path-traversal destinations and can
carry only bounded explicit workspace identity and a validated public referral
code. No auth token or account identity crosses domains in links. Existing
server membership checks remain authoritative. Focused tests pass; complete
CI/build and canonical authenticated acceptance remain release gates. See
`docs/SUITE_NAVIGATION_V1.md`. No schema, billing or customer data changes.

## 2026-10-20 | Standalone listing allowance candidate

Migration20261020170415 installs independent akisuite_listing_private controls;
no historical Premium migration is required or activated. Free/Premium media8/250
is per listing and retains old assets. Free published events consume four IDs per
Europe/Madrid month and at most five inclusive dates; private retained publication
history stops unpublish/delete/recreate recovery. Legacy recurrence/duplication and
direct writes share guards. Admin review is bounded and advisory. Event creation
preserves controlled drafts on failure. The independent database gate defaults
closed; owner quota UI additionally requires AKISUITE_LISTING_LIMITS_READY.
Resolution groundwork uses a separate AKISUITE_LISTING_RESOLUTION_READY gate,
which stays off until direct-Storage bypass and true server processing are solved.
See LISTING_LIMITS_RELEASE.md and impact register for evidence/acceptance holds.

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

### Reserved listing upload boundary (2026-10-20)

The gated follow-up in docs/ENFORCED_LISTING_UPLOADS.md replaces venue/event direct
browser-authenticated writes with server-inspected bytes, quota reservations and
service Storage/readback plus one-use owner receipts. Migration173552 defaults
strictfalse. Both AkiPasa and AkiHQ must be deployed and actual Supabase Storage
acceptance completed before strict activation. Existing media are retained;
independent property schema remains absent and its uploader must remain gated.

## 2026-10-20 | Location-owned AkiBusiness operations billing

The `/[locale]/account/subscription/operations` route is the sole owner-authorised operations checkout handoff. The signed Stripe webhook reuses current subscription retrieval and an atomic private toolbox binding; listing/personal plans remain separate. Read `docs/OPERATIONS_BILLING_RELEASE.md` for exact price IDs, gate/merchant/tax checks, migration sequence, scheduled renewal downgrades and recovery. No checkout return grants access and no migration deletes retained data.

## 2026-10-20 | Combined gated AkiPasa mission candidate

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

## 2026-10-20 | First-invoice operations recovery

The existing five-minute central AkiPasa scheduled worker now polls a bounded, service-only leased queue of explicit operations bindings AND reserved hosted checkout sessions. It retrieves Stripe state using the existing server key and applies the same verified invoice/toolbox evaluator, so missing the first webhook cannot leave paid customers permanently unenrolled. No second webhook, new Stripe key or provider mutation is introduced. The existing operations billing readiness flag controls it. See `docs/OPERATIONS_FIRST_INVOICE_RECOVERY.md`.

### Hosted entitlement provenance compatibility

The canonical toolbox sync respects the existing entitlement source CHECK by
mapping Stripe to purchase, trial to trial and approved other grants to manual.
A forward-only function replacement preserves applied table migration history.
The fixture now includes the actual CHECK and nonempty twelve-tool catalogue;
paid activation asserts purchase provenance. The release manager's rollback-only
actual-schema acceptance preserves zero toolbox enrolment and legacy paid access.
Exact hashes, bounded acceptance and no-replay instructions are recorded in
`docs/AKISUITE_MISSION_INTEGRATION.md`.

### Referral administrative approval amendment (2026-10-20)

The standalone180654 amendment adds a gated administrator-only eligibility and
review-approval ledger, not a payable balance or cash operation. Verified Stripe
holds, unresolved disputes, recipient/rule and representative status dynamically
block effective approval; immutable snapshots and the existing audit/export retain
all decisions. Monetary/payout false constraints remain. See
REFERRAL_PAYOUT_REVIEW.md for the independent schema/workflow gates, acceptance
and retention-safe rollback. No programme rate or financial approval is invented.

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

## 2026-10-20 | Explicit reviewed renewal command queue

A separate service-only durable command queue allows an operator to enqueue the three approved legacy migrations after verified private provisioning/binding. The existing central worker/key can then create schedules from those SAME subscriptions, preview exact future zero invoices with inherited discounts/tax, preserve current paid periods and verify actual readback. No command is automatic; the separate migration gate defaults off. Read `docs/OPERATIONS_RENEWAL_COMMANDS.md` for the immutable snapshot, idempotency, rollback and operator evidence contract.

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

## 2026-10-20 | Referral audit sequence least privilege

Actual hosted default ACL metadata grants client/service capabilities to new
public identity sequences. A forward-only mirrored185822 migration revokes only
suite_referral_audit_id_seq, retaining owner-executed append-only audit triggers,
all financial false constraints and unrelated legacy sequence ACLs. Fresh-schema
role tests reproduce the inherited grants and prove denial plus valid audit appends.
Read REFERRAL_INSTALL_READINESS_20261020.md for ordered installation, final account
coverage, expected empty shape, ACL probes and retained-history rollback. No
production write, programme seeding or monetary/workflow activation is performed.

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

### Standalone listing templates and enhanced media (candidate)

Migration233027 extracts canonical listing template/folder/shared-library contracts
from the unapplied historical suite bundle, atop170415/173552. Default-false library
and server readiness gates preserve current deployments. Current CRM AND source/
target venue memberships intersect with authoritative listing Premium; exact
retained shared placements survive downgrade, and reused assets count with own
uploads/reservations toward8/250 under one lock. Templates create drafts only.
See LISTING_PREMIUM_LIBRARY.md for compatibility, acceptance and rollback. Native
independent-property schema remains absent and its uploader stays separately gated.

### Listing quota UUID resurrection guard (forward fix)

Additive233905 closes same-UUID deletion/recreation of a previously published
event, and prohibits event primary-key changes while listing enforcement is on.
Fresh drafts and ordinary edits remain protected by original RLS/account guards;
no history or customer row is rewritten. No application/script event upsert was
found. Direct INSERT of retained UUIDs, including upsert attempts, must fail.
See LISTING_EVENT_IDENTITY.md for exact regression and non-destructive rollout.

## 2026-10-21 | Canonical free hub and operating acquisition

The membership grid presents free AkiHQ and the existing approved monthly AkiBusiness Básico/Standard/Pro per-location catalogue (4/8/12 tools,1/2/unrestricted replacement allowances), read from OPERATION_PRICES. Historical paid HQ/Enterprise products remain in backend records/resolvers and billing controls, but are not advertised as current acquisition. Listing and personal Premium remain distinct and retain server readiness/ownership checks. Operating handoffs carry only locale and an explicitly validated location. The trusted membership-return header also allowlists the exact same-locale operations route and a single valid workspace, preserving sign-in intent while stripping arbitrary redirects. No billing IDs, prices, schemas, paid records or production flags changed.

New checkout server actions explicitly reject retired AkiHQ Standard/Pro, Business add-on and Enterprise acquisition even with all checkout gates enabled. Historical identifiers, subscription renewal synchronisation, customer access, billing portal and cancellation remain supported. Personal and listing Premium retain their existing authenticated checkout safeguards.

## 2026-10-20 | Operating referral eligibility and private representative evidence

The guarded immutable capture RPC excludes existing bindings in the optional actual
private operating-subscription ledger, alongside its original public-billing check.
The deployed account wrapper/body/owner/ACL are preserved using an exact source
anchor; the migration refuses an unguarded or unexpected source. Admin and approved
representative invoice projections share one non-callable private eligibility
helper. Representatives receive only their own bounded opaque subscription/invoice
references, frozen proposals, safe review states/dates and current holds. Customer
and provider identities, internal review notes/references and snapshots stay private.
The existing account dashboard adds an EN/ES responsive panel behind the separate
AKISUITE_REFERRAL_REP_EVIDENCE_READY schema flag, default off. There is no paid
state, payable balance, incentive activation or production mutation in this patch.
See REFERRAL_REPRESENTATIVE_EVIDENCE.md for dependencies, limits, rollback and
executed SQL/page/16-case browser evidence. Full hosted exact-head CI remains required.

## Listing schema-reader source configuration

Adds server-only LIMITS_READY and UPLOADS_READY runtime vars after the standalone
shared schema is installed. Database count/strict gates remain independently off;
strictfalse retains legacy authenticated upload. No customer, billing, global old
feature flag or library activation changes. See LISTING_SCHEMA_READINESS.md for
actual owner paths, native-property dependency, acceptance and coordinated rollback.

### Workspace picker versus listing quota usage

The library picker may list many authorized organisation assets. Listing upload
usage counts only this venue's owned media and actual slot/header/event uses,
including retained references without preview URLs. The available picker size is
not a quota count. Server reservation and final mutation guards remain authoritative.

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

## 2026-10-20 | Owner-visible verified renewal migration status

The read-only `crm_operations_migration_status` RPC projects only tier, effective date and scheduling state after service-recorded provider readback, matching sealed manifest/schedule/target price/zero invoice preview and audit evidence. It requires the current active owner membership and the bound payer identity, private operating location and approved legacy business cohort. Queued, prepared, blocked, foreign, detached, personal or already activated migrations produce no confirmation. The central operations page shows this separately from ordinary scheduled downgrades, explicitly distinguishing a scheduled renewal from confirmed renewal payment and tool activation. A sole owned location is selected without inventing a scope; multiple locations still require explicit selection. Both initial configuration and checkout use the same twelve EN/ES labels as the AkiBusiness toolbox, retaining existing keys. No provider writes, queue changes, entitlement grants or production flags accompany this read-only feature.

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

### Operating runtime diagnostics (2026-10-21)

The existing release endpoint adds three configuration-presence booleans only, without database/provider calls. Scheduled billing/migration work emits service-only fixed-enum private health behind a disabled-by-default SQL singleton; original results and failures are preserved. Migration processing remains enabled pending verified actual schedule receipts; checkout/tax remain closed. See [OPERATIONS_RUNTIME_DIAGNOSTICS.md](OPERATIONS_RUNTIME_DIAGNOSTICS.md) for exact dependency ancestry, 22 focused cases, separate operator gates and rollback. No production SQL or provider actions were performed by this source change.

## 2026-10-21 | Bounded own referral and prestige privacy export

A caller-only paged privacy RPC and bounded complete reader cover twelve explicit
referral/prestige sections independently of product, representative and onboarding
locks. Old raw referral exports and the unbounded prestige aggregate are replaced
only after separate private-export schema readiness. Payer/referrer projections
separate own invoice and proposed commission facts; customer/reviewer identities,
third-party contacts/free text, internal notes and snapshots stay private. Retained
expired own shipping remains exportable until actual purge. No new table grant,
financial record deletion, programme, intake or payout is introduced. The narrow
reviewer-FK removal preserves immutable historical actor UUIDs while allowing profile
deletion; those UUIDs are pseudonymous, not anonymous. Existing own shipping cascade,
authentication, no-store/fail-closed export and funnel privacy hook remain intact.
See PRIVATE_IDENTITY_EXPORT.md for limits, evidence, rollout and retention-review
boundaries. Exact integrated CI/deployment and actual-role acceptance remain required.

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

## 2026-10-21 | Canonical five-product account membership summary

The account membership hub now distinguishes five products: AkiPasa/AkiDuermo/AkiCoches discovery, free AkiHQ management and paid AkiBusiness operating tools per location. Historical listing or HQ billing identifiers do not imply an operating licence. Business uses a neutral authoritative operations-page handoff; HQ and Coches use canonical language-preserving links. Existing paid records, expiry/cancellation dates and billing portal remain visible; historical labels are explicit and current listing/personal interval controls cannot advertise retired HQ/Enterprise products. Listing Premium is separate from personal Premium and operating access. An untrusted checkout-success query now explains pending Stripe confirmation rather than claiming completed payment. Backend resolver, entitlement, subscription and billing-provider state are unchanged. Focused render tests cover both languages, exact links, historical records and false payment claims; integration CI/build/browser acceptance remains a release gate.

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

## 2026-10-21 — Stale identity access guard

The canonical `account_features_allowed()` function now requires the caller's
`auth.uid()` to retain a matching `public.profiles` row. This closes the window
where a still-valid JWT could pass account-completion checks after profile deletion,
while preserving legacy profiles without an onboarding record and completed profiles.
Pending/underage identities remain denied. The additive mirrored migration preserves
`SECURITY DEFINER`, the empty search path and authenticated-only execution. Focused
negative authorization and SQL permission tests pass; live readback on the authorised
shared project confirms a nonexistent profile is denied. No table, customer row,
billing object or feature flag changed.

## 2026-10-21 — Public membership choice boundary

Customer-facing membership pages present the fixed commercial catalogue without a
business-type or tool selector. AkiBusiness Standard, Plus and Pro still state their
4/8/12-tool allowances and monthly replacement rules, but tool choice remains inside
the authenticated, workspace-scoped AkiBusiness operating screen. This keeps the
public sales journey compact and consistent across products without changing price
IDs, entitlement keys, active subscriptions or checkout readiness.

## 2026-10-21 | Atomic disabled funnel deployment recovery

Preserves canonical242/243 SQL unchanged while generating12 short dependency-ordered
apply_migration phases with canonical/hash IDs, transaction-local timeouts, immediate
private ACL closure and disabledNULL-state assertions. The reported enum-only live
baseline resumes at verifiedphase01; no large request is replayed. Full SQL catalogue
parity, hostile-default permissions, phase rollback and all capture/privacy cases are
covered locally. No provider write, activation, retention approval or history repair
is performed. See TRUSTED_BUSINESS_FUNNEL_PHASED_DEPLOYMENT.md for receipt archival,
readback, interruption handling and the separate operator history-reconciliation gate.

## 2026-10-21 | Installed disabled funnel schema and privacy readiness

Release-manager apply_migration receipts for phases01–11 are archived with the
frozen manifest/phase hashes; enum00 was already present. Independently read-only
history/readback confirms disabled collection, NULL retention/approval/start, zero
optional rows,13 triggers and intended RPC/private grants. Source
AKISUITE_FUNNEL_READY=true now opens only installed identity-export readers and
bounded maintenance; it cannot activate collection or set retention. Focused SQL/
adapter tests preserve inactive reporting and restricted own-data export. No agent
production write, financial configuration or migration-history repair occurs.
Worker deployment and actual runtime acceptance remain separate release gates.

## 2026-10-21 | Independent property listing foundation (gated)

Native accommodation uses real property UUID ownership and CRM intersection,
separate property listing entitlements and verified service-upload reservations.
Free/Premium media quotas are8/250 with1920/3840 dimensions; retained old media
survive downgrade. New property schema refuses ambiguous historical/native data
for explicit reconciliation. No legacy venue inventory or billing state changes.
See NATIVE_ACCOMMODATION_FOUNDATION.md for roles, evidence and rollout gates.
This is implemented/tested source, not merged or production verified; native
inventory adapter compatibility remains a separately tracked follow-on.

## 2026-10-21 | Native property privacy before application

The still-unapplied001000 base is corrected in this descendant before release:
native Storage fails closed when disabled; anonymous/authenticated direct object
writes always fail, including broad old policies. Nullable SETNULL owners mark
retained properties private/orphaned for review; member/actor references cascade
on account deletion without deleting business media or assigning ownership.
11 actual-role privacy/foundation cases pass; see NATIVE_ACCOMMODATION_FOUNDATION.md.
Earlier244head is not an approved migration source. No live SQL or activation.

## 2026-10-21 | Native property inventory compatibility (gated)

Additive002500 uses distinct accommodation*property*\* inventory with immutable
property scope, RLS, composite identity FKs, non-overlapping rates/occupancy and
audited manager reservation status changes. AkiHQ maps native sections explicitly
and never falls back to existing venue tables. Native runtime/database inventory
gates default off; no customer booking/quote or payment path is enabled.
See NATIVE_ACCOMMODATION_INVENTORY.md for tests, corrected001000 prerequisite,
privacy preservation and actual-provider/concurrent acceptance requirements.

## 2026-10-21 | Native property review workspace (gated)

Forward005500 and bilingual admin/accommodation-review provide a bounded admin
queue for submitted revisions and orphaned properties, exact-revision decisions
with audit and preserved typed reasons, plus explicitNULL pagination hardening
for native owner/team readers. Private unsubmitted drafts are not queued; no
ownership transfer, financial approval, runtime flag or production data changes.
12 focused SQL/action/UI cases pass; see NATIVE_ACCOMMODATION_REVIEW.md.

## 2026-10-21 | Native private namespace compatibility

Production catalog confirms legacy accommodation_private exists and native
properties do not. The still-unapplied001000/002500/005500 sources now use
accommodation_property_private exclusively, preserving legacy functions/tables
and ACLs. Public property contracts remain stable.25 actual-role SQL cases,
including explicit existing legacy service grants, pass;3 migration audits0.
Earlier249/251/253 SQL snapshots must not be applied. No live DDL or activation.

## 2026-10-21 | Recover gated native property foundation on current Next 16 source

Reconciles immutable native255 into current master99feec0d without replacing the
current account eligibility, public membership boundaries, consent, referral,
library deletion compatibility or supported Next16 runtime. All native schema
uses accommodation_property_private, preserving existing accommodation_private.
New001000/002500/005500 remain unapplied and gated; historical244/249/251/253
copies must not be used. Forty scoped native/review/deletion cases pass locally;
hosted exact-head checks and provider/role acceptance remain release gates.
No live schema, customer row, flag, payment or primary branch changed here.

## 2026-10-21 | Atomic disabled native property deployment representation

New deterministic deployment files represent the unchanged corrected001000/002500/005500 canonical SQL as23 bounded transactions (≤4971bytes), each with2s lock/8s statement/15s idle transaction timeouts and disabled/empty postconditions. Table RLS/client ACL and function execution controls accompany creation atomically. A restrictive native Storage hold precedes bucket creation and is removed only after all permanent policies and the evidence trigger exist. Hostile-default-grant intermediate actual-role tests and normal/hostile final catalogue parity preserve legacy accommodation_private, existing bookings and other buckets. No application, locale, analytics, identity, billing, existing data or feature flag changes. The release owner subsequently applied all23 reviewed phases with all activation gates false; exact history/readback receipts and the phase21 provider-history collision recovery are archived. See NATIVE_ACCOMMODATION_ATOMIC_DEPLOYMENT.md for hashes, ordered receipts, uncertainty recovery and separate provider/activation gates.

## 2026-10-21 | Listing quota snapshot serialization

Forward181500 adds private per-venue/channel revision writes before existing
quota reads, preserving advisory keys2/17. Exact installed function anchors retain
all authorization, owner/OID/ACL/config and package/date/grandfather semantics;
unknown bodies fail atomically. No existing venue row is touched or history
backfilled. Local quota/metadata/receipt/isolation regressions pass; a dedicated
actual PostgreSQL RC/RR event/reservation/legacy Storage race job gates release.
All flags remain unchanged. See LISTING_QUOTA_SERIALIZATION.md.

## 2026-10-21 — Private merchant-stage classification

Observes existing billing/migration merchant GET without changing request, fixed
version, account verification or financial flow. New forward133839 adds only
nullable private per-task HTTP status/category/timestamp fields and a separate
service-only RPC using the existing enabled singleton gate. Bounded error-copy
inspection emits fixed classifications only; no raw messages, keys, IDs or provider
payloads enter telemetry. Original results/errors and customer/queue fixtures are
preserved. Focused86 tests and SQL permission audit pass; full exact CI and live
installation/deployment remain release-owner gates. See
OPERATIONS_MERCHANT_DIAGNOSTICS.md for categories, interpretation and rollback.
No production, primary, provider, customer, configuration or financial writes.

## 2026-10-21 | Complete own AkiPulse management privacy export

Extends central identity-only export with two allowlisted rental-link/history
sections using the separate authenticated my_pulse_management_export_page RPC.
Existing referral/prestige paging, completeness budgets,503/no-store response and
pending/underage privacy exception remain intact; no other-person data, business
authorization, marketing consent or analytics activation is added. Companion HQ
20261021145321 must be installed before this adapter deploys. Existing privacy
readiness stays independent of all HQ feature gates. See PRIVATE_IDENTITY_EXPORT.md
for exact dependency, projection, regression evidence and rollback constraints.
No source SQL, live data/configuration, financial or primary-branch mutation.

## 2026-10-21 | Standalone library public artwork and reference deletion

Additive175000 exposes only explicitly selected published destination artwork
from shared private-source media. Draft events, bins and unrelated images stay
private. Database triggers block direct referenced media/object deletion; reference
writes lock media plus Storage rows to close concurrent deletion races. Existing
intentional whole-venue deletion remains compatible without Storage cleanup or
ownership transfer. Seven new actual-role cases and the existing21 pass locally;
four independent PostgreSQL race scenarios are a separate exact-head hosted gate.
All library/strict flags remain unchanged. See LISTING_LIBRARY_REFERENCE_BOUNDARIES.md.

## 2026-10-21 | Repeatable-read shared media deletion safety

Corrects the still-unapplied175000 descendant: reference writes touch unchanged
media and Storage row metadata so old repeatable-read snapshots cannot miss a
committed placement after waiting. Bytes/paths remain unchanged; no security guard
is weakened. The real PostgreSQL matrix covers both isolation levels and both
orderings, while the full strict receipt flow runs all installed guards together.
Apply only the tested corrected child; frozen262 is not the production SQL source.
No live migration, activation or data mutation was performed here.

## 2026-10-21 | Reconciled master mission delivery ledger

The docs-only delivery ledger indexes all mission phases against source, exact-head
CI, applied SQL, runtime gates and manager-observed production identity. It preserves
historical integration records and links them to the current ledger. Queued customer
commands are not schedules; configured bindings are not merchant verification; a
merge is not a production marker. Native/funnel/Storage acceptance and the deliberate
Standard/Plus/Pro versus mission naming conflict remain explicit. No application,
price, customer, permission, database, primary branch or provider setting changes.
See AKISUITE_MISSION_DELIVERY_STATUS_20261021.md; refresh moving heads before release.

### Delivery-ledger review amendment

Record the approved EUR 24.99/44.99/64.99 per-location monthly amounts against stable
basico/standard/pro keys and current Standard/Plus/Pro label conflict. Preserve the
three valid 100%-forever coupons, paid-through dates and Personal subscriptions; no
immediate invoice/proration/new subscription. Include unresolved Supabase-owned
spatial_ref_sys write/TRUNCATE exposure (HQ59 actual 42501 rollback), Cloudflare
MCP-32603 deployment/pin blocker, live HQ e249 at 14:02 UTC and disabled-funnel owner/
foreign/privacy role acceptance at 13:59 UTC. PR261 new 6d6 head CI and PR262 guard
repair remain pending; neither is claimed installed/observed. Documentation only.

## 2026-10-21 | Coherent phased-readiness and library protection release

Integration preserves f1e99 primary plus frozen PR264 df012, PR265 9e1 and PR263 8a1 ancestry and reviewed immutable SQL/utilities. Master/impact append entries from all parents are retained. Schema-only funnel readiness is declared against the installed disabled schema; billing/migration true and checkout/tax false remain unchanged. No production or provider writes, quota181500 changes or premature migration closure. Delivery status distinguishes merged diagnostic source from unverified deployment, native foundation installed with gates off, HQ e249 live and funnel collection off. Exact combined CI remains required; release manager owns merge and activation.

## 2026-10-21 | Stay browser host-proxy transport cleanup

The existing isolated AkiDuermo guest-route browser spec now uses the same bounded GET-only connection-reset retry and wait-for-in-flight-route teardown as the previously reviewed frontend-health host proxy. This addresses two hosted socket-reset failures on local branding/image requests without changing any route, locale, privacy, keyboard, layout or consent assertion. HTTP errors and non-GET requests are never retried; intercepted errors are not ignored during cleanup. Application, provider, data, feature flags and canonical SQL are unchanged. Full exact-head browser CI remains the acceptance gate.

Baseline media quota accounting is independent of the enhanced-library feature gate: owned images, historical shared placements, stored objects and active upload reservations share one path-deduplicated allowance. New cross-listing placement is unavailable until the scoped enhanced library is enabled; historical associations remain retained. See [baseline media quota integrity](BASELINE_MEDIA_QUOTA_INTEGRITY.md); additive190000 requires the RR-safe181500 quota scope migration and changes no launch flags.

Enhanced-library placement admission also shares the complete Storage/reservation allowance, under the same RR-safe quota scope. Additive193000 builds on181500/190000 without changing membership, Premium reuse or historical retention rules. See [library reservation capacity](LIBRARY_RESERVATION_CAPACITY.md).

Listing upload namespace admission requires a canonical lowercase venue UUID prefix when base limits are active; historical case-variant object paths are retained and counted. See [listing Storage canonical prefix](LISTING_STORAGE_CANONICAL_PREFIX.md), additive200000 after190000; no flags are activated.

## 2026-10-21 | Event artwork tenant-target integrity

Confirmed an ordinary-owner placement could name another venue's public event,
and discovery trusted target*key without its per-event venue. Forward184000
validates new/edited event*\* associations while preserving valid draft bins and
member/staff access. Discovery intersects each placement with its specific event's
venue, hiding historical mismatches without deleting data. Five actual-policy SQL
and two real SDK regressions plus60 repository cases pass. No Premium flag, paid
access, ownership or live data changed. See EVENT_MEDIA_TARGET_SCOPE.md.

## 2026-10-24 | Bounded administrator audit overview

Live admin traces repeatedly waited 8.2–8.8 seconds; PostgREST timeout context
identified moderation_actions reads evaluating has_platform_role per row. The
75k-row table lacked an index for global latest-first reads. Forward migration
20261024013730 preserves the exact authenticated administrator-only SELECT rule,
wraps its row-independent guard in an initPlan and adds(created_at DESC,id DESC).
The overview uses that deterministic order; its work-area links and Admin shell
disable speculative prefetch of privileged workbenches. A local loading boundary
announces pending navigation. No role, RLS bypass, customer row, billing, locale,
storage, analytics or non-admin navigation change is introduced.

Nine actual-role PGlite cases cover admin, moderator, ordinary/restricted/missing
identities, anonymous denial, write denial, schema drift refusal and mirror parity.
A rollback-only live administrator read used the new index and took2.846ms for
five rows; this is query evidence, not whole-page latency. Full checks/CI and
exact-source deployment remain required. Rollback restores only the old policy
and removes the optional index; customer/audit records are retained.

## 2026-10-24 | Native accounts and shared billing bridge

Routine account/settings/membership screens now belong to each product while
reading and modifying the same authenticated profiles row. AkiBusiness selects
its package and creates a private location locally, without a public-venue claim
or the Pasa→HQ chain. Coches/Duermo free management links target their actual HQ
branch/property tools. The central bearer-only `/api/account/portal` verifies
Supabase identity, eligibility and terms, reads only caller billing, preserves
existing management-only portal configuration and returns Stripe to the fixed
originating product. Customer/profile/return URL inputs are not accepted. No
service key, cross-domain cookie, checkout activation or paid entitlement change.
Bilingual new tests cover native profile forms, role/ID stripping, billing identity
isolation, fixed destinations, partial failures, location idempotency and local
logout. See `CUSTOMER_JOURNEYS_20261024.md` for all eight journeys, dependency/release
order and explicit remaining shared safety/onboarding and provider acceptance.

## 2026-10-24 | AkiSelector private presentation engine (candidate)

AkiSelector is a dependency-free, React/CSS-only presentation primitive stored
in src/components/aki-selector. Its caller owns option IDs, labels, symbols,
effects and onValueChange callbacks. Controlled value or local defaultValue
provides selection without discovery APIs, queries, storage, analytics,
subscriptions, rewards or database integration. The six generic effect IDs are
ember, solar, bloom, breeze, aurora and quiet. The carousel offers touch swipe,
previous/next buttons, accessible radio semantics, arrow/Home/End navigation,
responsive geometry, reduced-motion support and an explicit animation-off
option. Labels/effects can change without altering selection logic. Visual
presets are examples, not public promises or products.

The internal lab lives at /en/admin/selector-lab and /es/admin/selector-lab,
inherits the administrator-gated layout and independently rechecks the signed-in
profile app_role. Unauthenticated, onboarding/terms-ineligible and non-admin
visitors receive the existing auth redirects or a not-found response. The path
is absent from public/Admin navigation; metadata requests no indexing or
following. The page has no server actions and its temporary settings exist in
client state only. There are no new grants, tables, SQL migrations, secrets,
provider settings, feature flags, pricing, or deployment targets. Other AkiSuite
frontends do not import it.

Regression: tests/akisuite-selector-engine.test.tsx covers controlled/uncontrolled
selection, keyboard focus, disabled options, empty states, editable previews and
server-side admin/noindex/navigation boundary source checks. This suite is
included by vitest.akisuite.config.ts. Full npm run check, hosted CI, admin
browser/mobile visual acceptance and exact-source deployment evidence remain
required. Motion performance must be reviewed on low-end Android before
consumer integration. Rollback: revert component, playground and documentation;
no provider or customer data require rollback.

## 2026-10-25 | Shared icon family v3

Owner-requested burgundy Coches (#3B101B) and space-grey HQ (#252830) tiles
are synchronized across all five product selectors, favicons, Apple/PWA and
mobile icon sources. Coches uses the current car-free mark; black artwork has
a fine brand-colour edge for legibility. Pasa, Duermo and the purple AB geometry
are preserved. Default dark canvases match the tiles; light and selected owner
themes remain available. Versioned URLs and the static operating suite cache
refresh remove stale selector artwork. Stable PWA IDs and app identifiers remain.
No roles, links, data, billing, analytics, storage or provider configuration change.
See AKISUITE_ICON_FAMILY.md for dependencies, checks, native rebuild limitations
and source-only rollback. Local visual/asset validation and required CI are
separate from exact-source production and signed native-device acceptance.

## 2026-10-25 | AkiSuite navigation and surface continuity

Owner-authorized tightening preserves identity, tenant permissions, booking and
billing authority. Discovery membership audience now survives explicit Business
handoffs, reload and browser history without enabling checkout. Duermo/Coches
share one desktop rail/mobile dock component where available; Coches membership
retains its product header. Pasa's auth selector uses all five canonical brands
and origins. Duermo auth stays teal; HQ marketing and login use one request
language, keep readable dark-surface text, and expose header controls. Business
login gains local home/language/appearance controls retaining input only in memory.
Each repository carries only its affected subset. No schema, feature activation,
provider setting, customer record or native signing change. Source revert is the
rollback. Full source, browser/CI and exact production checks remain required;
device/authenticated acceptance must not be inferred from fixtures.

## 2026-10-25 | AkiSelector workspace login integration

Alex explicitly selected the existing private lab's AkiSelector for the public
login workspace chooser. All five apps appear: Pasa orange, Duermo teal,
Coches red/burgundy, HQ yellow/space grey and Business purple. Reuse the
engine's card scene, swipe, keyboard navigation and reduced-motion behavior
in a compact sign-in adapter. Previewing an app never submits, navigates or
replaces a login form; opening another app is an explicit localized action
with only the bounded referral code passed across origins. Current product
is selected initially. Mobile keeps the chooser after the sign-in fields.
The static operating app uses a DOM adapter and the same scene styles, with
no framework runtime or third-party dependency added. The private lab keeps
its administrator-only route. No pricing, session, tenant, permissions or
provider setting changes. Source revert is rollback. Source, responsive
browser, exact live source and physical device acceptance remain distinct.

### 2026-10-25 | Reliable first-tap mobile menus

Initial page effects no longer dismiss the More/AkiSuite sheets; they close
only after an actual pathname change. This prevents a late initial route effect
from undoing an early tap, while preserving navigation dismissal, authorized
workspaces, focus containment and search hydration. The unchanged first-click
tablet acceptance and same-route/navigation regression cover the behavior.
No backend or permission change.

## 2026-10-26 | Direct workspace icon navigation

Owner-requested sign-in refinement: the five icon cards are the navigation
links themselves. Remove the visible previous/next controls, caption/count and
separate Open/current-workspace row from every public login chooser. Swiping
and Arrow/Home/End browse the carousel without navigation or draft changes;
an explicit tap/click or Enter on an icon follows its canonical localized link.
Suppress the compatibility click after a horizontal swipe so it cannot open an
app accidentally. Current app identity uses aria-current; browsing is distinct
from authorization and never submits the sign-in form. The private lab keeps
its original radio-selection controls by default through an opt-in link mode.

Dependencies: identical React engine/adapter/CSS copies in Pasa, Duermo, Coches
and HQ; equivalent static Business adapter at both guest sign-in entries.
Business selector assets advance to v2 and production offline cache to 155,
with release assertions retained. Existing bounded referral-only href helper,
EN/ES, product icons/palettes, reduced motion, roving focus, 44px active targets
and phone placement after the form remain. No session, permission, identity,
price, tenant, API/provider, database, analytics or customer-data changes.

Validation: destination/keyboard/private-lab regressions plus responsive browser
checks for first-click icon navigation, swipe click suppression, retained draft,
no footer/actions, localized/referral-safe URLs and zero scene scroll. Complete
hosted source/browser/Cloudflare checks and exact live-source verification are
required before release; installed native/device acceptance remains separate.
Rollback is a source revert and renewed Business asset/cache versions.

## 2026-10-26 | AkiPasa desktop rail matches approved discovery siblings

Owner explicitly approved the existing Duermo/Coches rails and requested Pasa
follow their geometry. Only Pasa changes: the desktop AkiSuite popup opens beside
the rail, bounded by the viewport, and avoids a backdrop-filter containing block.
Collapse switches width without animation; the account action keeps a 52px height
and a 21px icon. The collapse control is icon-only, retaining its accessible name.
Mobile sheets, authorized workspace links, EN/ES destinations, brand, persisted
collapse preference, authentication and product permissions remain unchanged.
No API, database, storage, analytics, provider, billing or sibling app mutations.
Regression extends the real browser rail test to 480px height and compact popup
bounds/account geometry. Required full check, hosted browser CI and production
source/visual verification remain separate gates. Rollback is a source revert.

## 2026-10-26 | Sunset discovery presentation refresh

The public CityDiscovery opening becomes an orange-lit editorial panel with a
responsive headline, framed photography and clearer image-arrow contrast. Styling
is local to CityDiscovery; sidebar, search, route destinations and saved preferences
remain authoritative. Reduced-motion visitors get no photo hover transform. No new
assets, network requests, data, analytics, API, role, price or provider changes.
Validate both locales, light/dark and phone/tablet/desktop for fit and readability
through full repository/browser CI and visual inspection before release. Source
revert restores the previous presentation without changing user state.

## 2026-10-26 | Open nationwide discovery presentation

Owner rejected the framed first section introduced in #295. Remove its border,
rounded container and inset padding; a subtle non-interactive radial glow now
fades behind the discovery area. Moderate the oversized heading. EN/ES intro
copy explicitly describes nationwide discovery and featured cities as starting
points; keep this clarification visible on phones. Preserve city links, filters,
sidebar, photo accessibility and reduced motion. No sibling app, auth, role,
API, data, storage, analytics, asset or provider changes. Full check and existing
responsive browser acceptance gate release; inspect desktop and phone captures
and verify exact production source. Source revert is the rollback path.

## 2026-10-26 | Reuse the approved discovery rail frame

Replace AppShell's legacy desktop rail markup with an adapter of the approved
Duermo/Coches DiscoveryNavigation v2 frame and stylesheet. Brand artwork is the
40px v3 Pasa tile; links use the same 21px icons, 256/80px expanded/compact rail,
spacing, pinned footer, 52px account action and viewport-bounded app popup.
Only Pasa's orange accent, existing localized routes and account actions differ.
Pasa retains its existing 850px mobile-shell boundary; its mobile More and Apps
sheets, focus containment and bottom navigation remain unchanged. Authorized
workspace links move into a labelled section of the desktop app popup, reducing
rail density without changing capability checks or server authorization.

Dependencies: AppShell, copied DiscoveryNavigation frame/CSS and small Pasa
adapter, Icons, v3 artwork, LanguageLink (retained safe next/query switching),
ThemeToggle, suiteHref/referral allowlist, roleCapabilities and local signOut.
Discover/Map links still use discoveryViewHref and preserve only allowed filters.
The existing true/false collapse storage key, storage events, map resize event,
path-change dismissal, outside dismissal, Escape and focus return are retained.
No API, database, RLS, storage, billing, analytics, provider or Android change.
Source revert is rollback. Public source remains master; no sibling source import
or production publication is implied by this candidate.

Validation: 20 focused rendered/interaction tests passed. A real Chromium harness
using the actual AppShell and production styles passed 48 expanded/compact states
across EN/ES, light/dark, guest/admin and 480/740/900px heights. All app destinations,
40px brand, widths, reachable footer and authorized popup links were checked;
compact screenshot inspected. Existing rail/UI browser assertions now follow the
shared frame's data-compact attribute. Full check, hosted CI, real-route browser
and deployed source verification are tracked separately before release.

Verification update: repository format/lint/typecheck and 1,959 Vitest cases in
`npm run check` passed, along with security/database checks. That command first
stopped at missing local automation dependencies; after restoring the existing
locked dependency installation, automation check/dry-run and the Next production
build passed. The real production-route rail viewport and cross-route theme/
collapse persistence Playwright cases passed separately against loopback fixtures.
The first browser start lacked the required fixture Supabase configuration; the
retry used explicit disposable localhost configuration and passed. No real
customer/provider acceptance or deployment is inferred.

### Shared rail focus-mode compatibility

The existing owner focus appearance preference also hides the new discovery
rail and releases its body offset. This preserves the prior navigation-free
view after replacing the legacy rail classes. No owner authorization or stored
preference changes. Real-component Chromium verifies hidden navigation and a
zero body offset in expanded/compact modes, then restoration after focus ends.

## 2026-10-26 | Cinematic AkiSelector energy and transitions

The login selector now uses five distinct vector-mask materials: Pasa flame
tongues/cinders, Duermo tidal ribbons, Coches diagonal velocity trails, HQ
precision orbital tracks and Business spectral curtains. The existing generic
effect IDs remain compatible with the private lab. Every activation has a
brief lens flare, dissipating wave and glass reflection. Outgoing artwork stays
mounted for a 650ms opacity decay; incoming energy ramps over 280ms while card
travel eases over 680ms. Interrupted changes converge via CSS transitions,
without JavaScript animation frames or timeouts. Inactive material loops pause.

Mouse hover previews only energy and retains selection, roving focus, current
app and href geometry; pointer exit restores selected energy. Touch/pen retain
swipe browsing and direct icon navigation with the compatibility-click guard.
Keyboard input clears hover preview. EN/ES, referral-only links, preserved
login drafts, mobile placement and administrator-only lab boundaries remain.
Both explicit motion-off and OS reduced motion remove loops/transitions/flare.

Dependencies: shared React engine/CSS in Pasa, Duermo, Coches and HQ; equivalent
DOM adapter and identical CSS in Business. Business engine CSS, adapter CSS and JS URLs advance to
v2/v3/v3 and its effective paid release cache to v156, including release assertions.
No authentication exchange, session, API, tenant/role, database, storage,
analytics, payment, provider configuration or Android binary change. This is
web-delivered presentation. Rollback restores source and advances static asset
versions/cache again. Source and real-browser evidence is recorded in the PR;
full CI, production deployment and physical-device acceptance are separate gates.

## 2026-10-26 | Product-specific AkiSelector opening stories

The five login choices opt into an optional product arrival independently from
the reusable ember/breeze/bloom/solar/aurora idle effect. Pasa drops a discovery
pin and sparks; Duermo rolls and softly lands a suitcase; Coches sends a red
coupe with spinning wheels and a light wake across the foreground; free AkiHQ
gathers locations into a management hub; operations AkiBusiness wakes a till
and prints a receipt. Each decorative vector story plays once over 1.25–1.7s,
then disappears as its material rises into the sustained hovering/orbit phase.
The Coches idle is slower and includes a red orbital arc. Returning to an app
restarts its story; uninterrupted idle does not replay it. Generic lab effects
remain compatible without product stories unless the caller opts in.

Dependencies: AkiSelector option arrival, WorkspaceSelector adapter, shared CSS
and the equivalent static Business DOM adapter. All artwork is inline SVG masks
and CSS; no image/provider calls, animation timers or new packages. Decorative
actors ignore pointer events and are hidden from assistive technology. Direct
links are immediate, with no animation wait; browsing, safe referral/locale
URLs, drafts, keyboard focus, swipe suppression and auth/session/permissions
remain intact. Reduced motion and motion-off hide opening stories and keep
static idle artwork. Business engine CSS v3 / adapter CSS v3 / JS v4 and the
effective release cache v157 advance together with release assertions.

Validation includes all five actual actor animations becoming visible, finishing
once and handing off to full idle opacity, plus source/component/browser parity.
The current report records completed checks and separate broader map acceptance.
No production data, SQL, storage, billing, analytics, provider configuration or
Android binary changes. Source revert plus fresh static versions is rollback.
GitHub publication is still awaiting the explicit authorization requested earlier;
no push, PR, merge or deployment is implied by this design refinement.

### Sidebar and selector release reconciliation

The shared discovery rail is reconciled with master selector release #298
(74b22a1). Both complete contract histories are retained. Selector components,
opening artwork, transition styles and regressions remain unchanged; navigation
uses its own frame classes and preserves focus-mode compatibility. Combined
current-head CI remains mandatory before the sidebar merge and deployment.

### Route privacy-control and navigation-name regression

Public browser acceptance exposed two issues in the shared-frame candidate.
Pasa keeps its existing route-owned privacy/consent positioning instead of the
sibling global positioning; this prevents map attribution overlapping Privacy
and retains detail/membership controls. The mobile-bottom-navigation browser
locator uses its exact accessible name, so the visible desktop AkiPasa
navigation is not mistaken for the hidden mobile dock. Keep all original
hidden/visible, hit-target and non-overlap assertions. No consent decision,
tracking gate, map provider, navigation destination or authorization changes.

The corrected real-route mobile navigation, rail/focus and cross-route theme/
collapse cases pass locally (3/3), and the production Next build passes. The
local map browser reports WebGL unavailable before mounting attribution, so
the unchanged EN/ES map attribution hit-target/non-overlap matrix must pass
hosted browser CI; no map assertion or browser gate is skipped or weakened.

## 2026-10-28 | App-first consumer discovery UI (new approved logo direction)

Scoped AkiPasa consumer discovery styling in `src/app/aki-app-first.css` imported by `src/app/globals.css`, plus `PlansFirstHero.module.css` mobile-first refinement. Inspiration: user-supplied orange fluid movement mark, strong geometric wordmark and near-black contrast. Actual uploaded raster logo is **not yet committed as a production asset**, so existing logos remain unchanged in this PR rather than shipping an inaccurate recreation.

Homepage changes: larger headline, mobile two-column date shortcuts, stronger orange primary action, subtle nonblocking radial flare, compact mobile floating nav with larger touch targets, and restrained event grid/empty-state visuals. Existing links, accessibility semantics, search, login, data/analytics, maps and tenant routes remain intact. Effects respect reduced-motion; no image generation, custom font, client tracking or new dependencies.

Release acceptance: review on 320px/375px/430px phones, tablet, desktop, touch navigation and bottom safe area; light/dark themes, focus visibility, reduced motion, Android immersive UI, ES/EN, empty event feed and performance. Check CSS cascade and competing nav styles. Complete required CI and Cloudflare build before merging; match exact deployed SHA. Rollback is removing the isolated import plus hero CSS tail. No database, billing, email, age policy or customer data changes.

Follow-up asset integration: `public/brand/pasa-2026-traced.svg` is a vector trace made from the founder-uploaded PNG; `BrandLogo.tsx` now uses its orange dynamic movement mark and dark endpoint circle in the app shell. It is a trace/preview, not a claim to replace an original designer-supplied editable vector. Wordmark remains DOM text for responsive size and accessibility. Check light/dark contrast and 24px icon legibility before merge; keep original supplied PNG as the definitive visual reference. Rollback restores the previous `BrandLogo.tsx` mark.

## 2026-10-28 | Young-adult social discovery messaging follow-up

The new `PlansFirstHero.tsx` EN/ES copy prioritizes live music, plans with friends and nearby activities for a Spain-first young-adult audience; all category, search, pricing, event, authentication, consent and age rules remain unchanged. Full brand/retention direction is recorded in `docs/AKIPASA_BRAND_RETENTION_20261028.md`. This branch is rebased conceptually on already merged app-first PR #320; it supersedes conflicting PR #319. Require the same six hosted CI workflows, responsive/browser accessibility review and exact-source Cloudflare verification before production. Rollback: restore only the prior hero copy. No DB, bulk marketing, analytics activation or billing changes.

## 2026-10-29 | Coordinated release branch retains visual gates

The combined release preserves current master Passport and security changes alongside the draft UI and private 3D studio. The visual workflow now runs for every PR carrying it, including the integration branch, rather than silently skipping branches whose names differ from the original design branch. The manual production workflow explicitly requires the strict route audit before inspecting bindings or publishing. No route acceptance is manufactured, no feature is activated, and no Worker or database is changed by this commit. Validation: source inspection and route inventory; final combined CI and actual screenshots remain required. Rollback reverts source without changing user data.

## 2026-10-26 | Mouse dragging, corner arrows and branded login names

The public login AkiSelector supports primary-button mouse dragging alongside
touch/pen swipes. Cards follow a bounded horizontal pointer offset; capture
starts only after 10px of horizontal intent, leaving ordinary clicks and
vertical touch scrolling intact. Release outside the scene is supported. A
45px horizontal release browses one enabled option, with wraparound; shorter
drags snap back and suppress their compatibility click. Pointer cancellation
and capture loss clear temporary offsets. Modified/right/middle clicks retain
ordinary link behavior, and starting a later pointer/keyboard action clears the
click guard. Native HTML link/image dragging is prevented within the scene.

Two localized, keyboard-accessible 44px circular arrows sit in the lower scene
corners. They browse in place without submitting, navigating or replacing the
login form; the separate footer/caption stays hidden. Generic lab callers opt
in via showBrowseArrows. Names use the individual product accent and self-hosted
Poppins Semibold 600, with a dark label backing for legibility over effects.
The Latin WOFF2 is vendored from @fontsource/poppins 5.3.0 with its SIL OFL;
requests stay on the app's own origin. Existing startup/idle artwork, motion-off,
reduced motion, EN/ES/referral-safe hrefs, current-product semantics, drafts and
auth/session/role behavior remain. No API, database, billing, analytics, provider
or native Android binary change.

Shared React engine, adapter, CSS and font assets are copied across four Next
apps; Business has an equivalent DOM adapter and matching assets. Business
engine/adapter CSS v4, JS v5 and paid release cache v158 include the font and
retain production assertions. Acceptance covers real mouse capture/release
outside the scene, follow-pointer geometry, short-drag suppression, immediate
subsequent clicks, arrows/wraparound/keyboard, touch and cancelled gestures,
loaded font/brand colours and responsive label bounds. Regression evidence is
recorded in the PR; exact-head CI and production verification gate release.
Rollback restores source with fresh static cache/asset versions; no data rollback.

Capture-transfer follow-up: descendant lostpointercapture events are ignored;
only loss on the scene cancels its gesture. Mouse movement with no primary
button held clears a pending gesture after an uncaptured outside release.
Acceptance now uses real Chromium touch input originating on a card descendant,
and covers outside vertical release followed by ordinary mouse hover.

CI follow-up: wait for the selected card’s finite transition before taking the
drag baseline. Account acceptance passed 310 cases; the initial selector check
measured a still-easing card on a busy runner. The >20px movement requirement
and real pointer input remain unchanged.

## 2026-10-29 | Selector drag reconciliation with consumer product reset

PR #299 mouse/touch drag, corner-arrow and local-font improvements are reconciled with current master without restoring the retired HQ/Business consumer choices. AkiPasa login still presents exactly AkiPasa, AkiDuermo and AkiCoches; authenticated business handoffs remain separate. The browser pointer helper receives the expected product list explicitly, preserving wraparound, movement, outside-release, touch and font assertions for the three-product chooser. Focused selector suites pass 20/20 locally; real browser and combined exact-head CI remain required. No auth, data, provider, billing or deployment changes. Rollback reverts the presentation/harness changes only.

## 2026-10-28 | Verified launch waitlist founder notifications

On the shared AkiPasa backend, after a first successful atomic `POST /api/launch-waitlist/confirm` token consumption, send one idempotency-keyed, HTML-escaped operational notification to alex@akipasa.com and andrew@akipasa.com through the canonical Resend account. Include product, verified identity/contact, location, audience, interest, separately opted-in marketing status, timestamp and id. Do not email founders on raw unverified submissions, honeypot hits, repeated or expired tokens, or registration lookups; this prevents anonymous inbox floods and ensures uniqueness. A failed notice is logged but does not reverse verified subscriber state or enable token replay. No tracking pixels, no mass mailing, no new public data API, no SQL/secret changes. Validate Resend mocked payload, HTML escaping, concurrent proof, CI and actual delivery on controlled test signup before considering external signup activation. Existing subscriber consent and service-role database access remain authoritative.

## 2026-10-29 | Verified waitlist notice acceptance and launch boundary

Founder notices require the exact server-only `LAUNCH_WAITLIST_FOUNDER_NOTICES_ENABLED=true` setting. Missing or malformed values leave existing email confirmation operational without sending founder mail. Tests are registered in `npm test` and exercise atomic proof consumption, expired/replayed proof, missing storage, malformed requests and provider rejection/timeout. Subscriber consent is never rolled back to retry a notice. Delivery is best effort after confirmation, not a durable outbox or a guaranteed delivery promise; gated-off or failed historical notices are not automatically replayed. The one-off self-editing preparation workflow is removed from the candidate. A controlled signup and actual provider delivery acceptance remain required before activation. No schema, billing, public data exposure or production configuration change. Cleanup tracker: #330.

## 2026-10-27 | Automation Worker Node CI security baseline

The Automation Worker checks and its manually dispatched production deployment workflow use an explicit Node.js 22.23.4 runtime, rather than an unbounded 22.x selector. This addresses the October 2026 Node.js Brotli security baseline in GitHub Actions. Cloudflare Workers run in their own runtime; this change neither claims a Workers engine vulnerability nor modifies their production code or cron schedule. No production deployment is implied. Verify the complete AkiSuite build-runtime inventory, and reconcile the 23 and 26 October Cloudflare Cron incidents separately in issue #305. GitHub PR #304 tracks CI acceptance.

## 2026-10-29 | Coordinated redesign recovery and creator journey continuity

The PR #326 integration retains the five-destination consumer navigation and its
existing route classification. Source-formatting recovery does not certify visual
acceptance. Sponsored EventCard class composition now uses the existing clsx
utility so the Tailwind formatter cannot remove a required class separator;
rendered EN/ES regressions exercise sponsored and ordinary cards. Paid placements
are explicitly labelled Sponsored / Patrocinado rather than ambiguous Featured.
Existing occurrence links, impression consent and recommendation behavior remain.

Creator directory, profile and private studio share one route-local cinematic
stylesheet. Context hidden by the old compact stylesheet is visible again;
category/search transitions preserve normalized query, locality and category.
Profile/category read failures withhold blind studio editing, and event or
verification-eligibility failures stay explicit rather than looking empty or
eligible. Original owner/session authorization, RPC mutations, review moderation,
storage, billing and location privacy remain unchanged. No schema/data writes.
The route matrix remains blocked until real screenshot/interaction acceptance;
local fixtures are not proof of authenticated production behavior.

## 2026-10-29 | Coordinated Tonight integration: dark launch and exact arrival

The Tonight source now includes a server-only `AKIPASA_TONIGHT_ENABLED` gate: only the exact value `true` exposes its homepage link, metadata and route; an unset or malformed value returns not-found before either discovery source is queried. Browser query parameters cannot activate it. The public-UI fixture explicitly enables the gate to test the planner; unconfigured browser tests verify the closed route. The temporary branch-writing staging workflow is removed. This is a source integration boundary, not authorization to enable the production flag.

`selectTonightEvents` compares actual Europe/Madrid evening/arrival instants, including the existing 04:00 night cutoff, rather than end-hour numbers. An event ending at 22:30 remains eligible for a 22:00 arrival, overnight events may continue after dawn, and a matching clock hour on another date is excluded. Current time remains a lower bound after midnight. Spanish singular/plural cocktail text matches published wording. Empty listings are described as published, not independently verified. Failed result sources display unknown counts and an unavailable summary, preserving their independent error states.

Rechecked linked-project metadata read-only at 2026-10-29 01:30 UTC: 75,370 venues, nine events, zero future-start scheduled occurrences (zero published future-start); three ongoing scheduled occurrences, only one attached to a published event. This does not establish nightlife launch supply. Passport PR #329 is merged in `master` at `0d1fac5d09bd13dff6fa5ec44bd84146ff90d5e5`; its read-only milestones and own-profile query are preserved by this integration. `check_ins` RLS remains enabled; no permission, customer record, XP, reward, billing, paid campaign or production configuration is changed. The existing recommendation service may write its existing request/item telemetry; "read-only planner" means no new business-state mutation, not a guarantee that the reused service performs no database writes.

Validation: focused Tonight release/domain tests, Passport read recovery and DST milestone tests are run locally; exact final integrated CI/build/browser and authenticated production acceptance remain required. Root coordinator owns the cinematic hero conflict and route-matrix acceptance. Revert these application changes or keep the Tonight gate off for rollback; retain existing Passport and customer history.

The first coordinated real-browser screenshot review also exposed mobile launch
notice occlusion by the fixed header and an undersized app-switcher control.
LaunchRibbon shares the existing content inset, and both header menu buttons keep
44px touch targets beside the reserved search control. No new navigation instance,
consent behavior, native inset or provider/data dependency is introduced.

## 2026-10-29 | Coordinated AkiPals renderer and migration verification

The private 3D studio now crops head triangles in model space rather than using
an absolute world-height clipping plane; changing avatar height cannot reveal
the base T-pose or slice its neck. Bounded vertex deformations implement face,
eye, brow, ear, chin and neck choices from original per-instance geometry, and
hair/glasses fit both body frames. The engine disposes replaced meshes and
skeleton textures, pauses while hidden, and renders reduced-motion changes on
demand instead of retaining an idle animation-frame loop. Save/export are held
while the selected model loads or fails. No authorization or API write changes.

The repository avatar migration's malformed DO dollar quote was repaired and
its previously missing Supabase mirror added. Actual PGlite execution/replay and
owner/other/anonymous/service-role tests protect storage and retained legacy
saves; existing hosted migration state is not changed by this source correction.
Real Chromium rendering/save/restore and 320/390/820/1440 captures run against a
loopback mock storage adapter, not a live authenticated account. Sculpted final
art, physical Android, combined-source CI and PR #326 integration remain release
requirements; these fixes do not establish Bitmoji-quality art or a live release.

### Tonight browser accessibility repair

Real Chromium 153 testing reproduced the hosted Tonight EN/ES planner failure: implicit select labels included option text, preventing stable Area/Zona, People/Personas and Distance labels. All six selectors now reference their visible label span with `aria-labelledby`; the browser assertions stay unchanged. Both real query round trips pass with the same filters and values. On the isolated development server, nine of ten cases passed (EN/ES, 390/1280 px, themes and reduced motion); the final ES/dark/1280 navigation failed with connection refused after that server exited, so the complete matrix is not claimed passed. EN dark phone and EN light desktop screenshots were inspected directly. Synthetic read-only venue data and empty events are explicitly fixture evidence, not production content or authenticated acceptance. Final integrated production build/browser remains the release gate.

## 2026-10-29 | Combined-release privacy and route compatibility

Own-account exports now include the new pals_avatar_profiles appearance under the existing authenticated caller filter, deterministic user_id ordering, bounded pagination and fail-closed export. Existing legacy saves remain exportable and auth-user deletion cascades new appearance records. Tonight uses the discovery visual family, and the source inventory now contains 103 pages (90 in scope, 13 other-product exclusions) without invented acceptance. Weekly quest tests join the mandatory test command. The obsolete commit-message-triggered Pals production workflow is retired so the manual source-verified production path and strict route gate remain authoritative for the combined tree. No runtime activation, migration application, email, billing or customer data change. Regression evidence: caller-filter/order export test and full matrix classification tests; final combined CI and role/device acceptance still required.

Narrow-phone screenshot review also requires complete primary navigation labels:
the canonical dock supplies a bounded font treatment and the product switcher uses
the shared globe icon, distinct from internal More. Browser evidence fast-forwards
finite transitions for stable light/dark captures; user motion preferences and
navigation behavior are unchanged.

## 2026-10-29 | Bilingual AkiPals identity entry and continuous garments

The consumer AkiPals entrance now describes the private human 3D avatar/wardrobe
and links authorized accounts to `/pals?lang=en|es`; it no longer reads legacy
mascot portraits or advertises adventures/play. Existing private authorization
and old game saves remain intact. The studio, controls, enum display labels,
status text and navigation are localized; stored enum values stay canonical.
Rounded swept garment/skin meshes replace ball shoulders and segmented sleeves,
and the head crop additionally checks actual head/neck rig weights to remove
remaining T-pose shoulder fragments. Hair, caps and glasses share a common head
pivot. Tabs support keyboard selection and edits retain focus. No public avatar,
location sharing, commerce, invitation or authentication boundary is added.

Real Chromium EN/ES save/reload/restore and 320/390/820/1440 captures are loopback
component evidence. The final avatar remains procedural prototype art, below the
approved premium sculpted character target; physical Android, live own-account
saving and final combined-source release acceptance are still required.

## 2026-10-29 | Retired temporary orchestration helpers

After local source and formatter recovery, remove the one-shot Pals visual formatter and isolated dependency-packaging workflow. Permanent CI/browser suites and canonical manual production workflow remain. The coordinated source/evidence/rollback ledger is docs/AKIPASA_COORDINATED_RELEASE_20261029.md; 103 source pages include the added gated Tonight route, with 90 in-scope routes still requiring genuine release acceptance. No production rollout or data mutation is implied.

The follow-up screenshot review repairs the Home no-results explanation: hiding
its legacy icon on phones no longer leaves paragraphs in a narrow grid column.
Recovery links retain their original filtering URLs and 44px touch targets.
The canonical dock grants the Community label sufficient width while preserving
all five destinations and the centered check-in column. Reduced-motion visitors
no longer receive the inherited shell fade-in. Browser assertions require full
paragraph/label widths and fully rendered main content before capturing evidence.

## 2026-10-29 | Repeatable avatar build validation

The generated, gitignored public/pals/runtime Three.js bundle is excluded from source linting, matching other compiler outputs. Original studio JS/TypeScript, bundle integrity tests and browser execution remain checked. This repairs a repeat-check failure after build generated minified vendor output; no source rule or application coverage is lowered. Full combined check/build is rerun after source freeze.

The final light-theme contrast probe caught white Community/roadmap surrounding
copy on cream and global dark heading colors inside their dark hero artwork.
These route-local styles now use theme-aware base text and explicit light hero/
card headings. LaunchRibbon has an opaque night-colored base behind its orange
lighting, so its first words remain readable in light mode; its link retains a
44px target. No routes, data, permissions, consent or mutation behavior change.
Final screenshot and contrast evidence must come from the corrected built source.

A 32-case computed contrast sweep additionally isolated the same inherited heading
color issue in the shared Check-in/Privacy/Terms hero family (six light-mode
phone/desktop failures). The canonical shared hero h1/h2 now explicitly use light
text on their fixed dark artwork. Base text contrast and all other sampled hero
families passed; corrected-source captures and gradient-aware contrast are rerun.

The final desktop empty-state probe also found explanatory copy auto-flowing into
the 62px icon column instead of its 726px content area. Shared CSS now assigns all
headings/paragraphs to the explicit content column; the existing phone block layout
is retained. Browser coverage asserts meaningful paragraph width on desktop too.

## 2026-10-29 | Observed automatic Cloudflare publication after verified cleanup

All seven hosted workflows passed cleanup PR #331 before merge f3d2687fa66e53d4e529118eb08210ad9cc0ff45. Cloudflare automatically published it as deployment 96e0e51f-474a-496c-b7b0-1303fe8187d7 / version 884dda44-e95d-4266-8ce1-d7a4de5c54db, independently confirmed by the public release endpoint. The manual GitHub workflow is not the sole publication path: merging must itself be treated as production-impacting. Draft #332 consolidates the original #326/#327/#328 with preserved ancestry and remains blocked by genuine route/device/art acceptance. See coordinated release ledger for 2,209-test, browser, contrast and test-only packaging receipts. No notices, Tonight launch, billing, commercial campaigns or public presence were activated.

## 2026-10-29 | Resume main release: truthful booking and continuous review surfaces

Alex paused further AkiPals development/publication and returned priority to the
single coordinated PR #332 redesign and customer journeys. The unpublished private
creator remains checkpointed separately; it grants no main-route acceptance.

Event booking reuses the existing BookingWizard and booking_available_slots
remaining-capacity aggregate, preserving authenticated event/occurrence context,
contact defaults and the original request_booking_v2 action. Read failures remain
unavailable; empty and full inventory are distinct. External/inactive settings do
not expose native requests. Return-query copy directs callers to their actual
booking history rather than asserting a mutation from a URL alone. The shared
wizard must prevent duplicate submission throughout a genuinely pending request;
its venue caller retains the same fields and action boundary.

Private business booking reads retain independent settings, notification,
inventory and pending-count failures. Unknown settings/contact configuration must
not expose a Save form with fallback values; dependent calendar editors wait for
their required reads. Healthy independent service/resource sections remain usable.
Recovery must restore authoritative settings before editing, including when React
retains the client component. Unknown pending counts are not zero. Missing rows
following successful reads retain their existing onboarding defaults.

Staff pending queues use bounded twenty-row reads, exact counts and deterministic
created_at/id ordering. Safe queue/page context survives existing decisions,
authentication returns and retries; audited RPC payloads and claim notification
semantics remain authoritative. Claims retain their existing privileged paged RPCs.
Native administrator review pages use a route-local shared card/form stylesheet,
visible headings and accessible pending/error/read-only states. Exact revision,
reason, administrator and orphaned-property boundaries remain unchanged.

These changes require focused regressions, actual responsive browser inspection,
full check and exact-head CI before handoff. Disposable fixtures do not prove live
authenticated roles or physical Android. The strict ninety-route acceptance gate
remains mandatory; no route is accepted by this entry. No migration, customer-row,
RLS/grant, consent, billing, email replay, Tonight activation or production change.
Rollback is a source revert preserving all booking, audit and identity history.

The consumer audit additionally reproduced the shared workspace drawer staying
open after browser Back. Dismissal follows actual pathname/query changes while
preserving initial and same-route interaction; Account browser fixtures retain the
real shared-layout identity to test this lifecycle instead of remounting it away.
Desktop navigation, role filtering, focus/Escape handling and native offsets remain
authoritative. Final integrated tests and physical-device review remain required.

Profile biography editing now matches the existing 2,000-character action and
onboarding limit. A retained 500-character biography previously became invalid
when edited because the form imposed 300; the existing data remains unchanged.
EN/ES helper text and native validation agree. No profile action, schema, visibility
or private identity boundary changes.

## 2026-10-29 | Below-fold consumer continuity and truthful fallback journeys

The next main-release pass reviews full pages rather than only first viewports.
Public evidence retains the original captures, visits lazy content, opens actual
Passport chapters and scrolls their internal containers. Loaded-image failures
remain visible in the receipt. Clipping the original traced brand image removes
its duplicate embedded lettering without redrawing or replacing approved artwork;
separate repeated-logo clip IDs preserve the semantic DOM wordmark. Roadmap copy
now describes private human 3D avatar testing, not mascot adventures; the AkiPals
engine remains user-paused.

Community task views reuse the existing workspace header with continuous scoped
form/history panels, localized display labels and corrected Spanish. Exact draft,
address, search/target, feature-gate, caller-read and server-action contracts remain.
Submission requires approval; a created query alone cannot prove submission.
Passport accepts its own generated cover/index chapter URLs on return and retains
existing city, feedback/default and invalid-query behavior. City names remain
readable on their original photographic cards. No XP/check-in/reward mutation.

The mobile dock reserves clearance after the outside privacy trigger, so a real
page-bottom visit can reach it. Map/Passport/auth/focus exceptions retain their
existing placements; native WebViews do not reserve a second safe area. Mobile
header artwork uses paired opaque night/background and light wordmark colours
instead of inheriting dark light-theme text over a scrolled dark header. Consent
choices, requests and motion permissions are unchanged.

Public missing/error views use a small public locale/product context and scoped
presentation inside existing shells, preserving product homes and authorization.
Errors never display provider messages, stacks or private route IDs. Explicit
retry revalidates reads; it does not replay form mutations. A global root-layout
failure uses a minimal neutral AkiSuite bilingual document with manual GET retry,
without assuming an unavailable product/session context. The existing authorized
Admin loading boundary reuses an honest indeterminate view. A global localized
loading boundary was rejected after an actual framework test changed404 to200;
existing404/307 contracts remain mandatory and their assertions are retained.
No production fault route, activation, database, grant, billing or provider change.
Full integrated/browser/CI and final source/device acceptance remain required.

## 2026-10-29 | Partial-read dashboard integrity and measured release repairs

Business management keeps known authorized places usable when an independent
membership/editorial/rental read fails; totals for an incomplete universe are
unknown, never zero or a complete count. Individual loyalty programmes,
redemptions, claims, categories, events, promotion and media reads have bounded
localized retry states. Withhold only controls that depend on unknown inputs;
a genuine new event composer remains usable when its own required reads succeed.
Unknown profile roles remain fail-closed for editorial access. Known per-place
analytics remain useful while incomplete aggregate totals stay unknown. Preserve
all existing account/tenant filters, actions, premium entitlements and audits.

Actual complete-app screenshots additionally exposed a dark mobile search glyph
over a dark header in light mode. Its scoped mobile palette pairs opaque background
and readable ink; the browser checks measure the real glyph/control colours,
including alpha composition and minimum targets, and exercise keyboard search.
Fallback captures are written to real artifact paths in addition to attachments.
Root-error test browser discovery delegates to installed Playwright unless an
explicit executable override is supplied; no machine-specific path is required.

The behaviour-events ingestion endpoint applies the existing streaming64000-byte
reader before parsing and rejects raw batches above25 before Zod element traversal.
Origin/media/error/session/account-consent/settings/rate/RPC semantics remain
unchanged; ingestion never becomes verified attendance. This mitigation does not
claim that every Zod collection or dependency advisory is resolved. The source-
backed dependency inventory is docs/AKIPASA_DEPENDENCY_AUDIT_20261029.md. Existing
hash-guarded MapLibre attribution backport remains mandatory. No production data,
consent, permission, dependency version, migration or deployment is changed.

Validation and current-source evidence remain in the execution ledger. The layout
checkpoint4e71 passed433 full-browser cases with29 explicit credential skips and
independent clean Cloudflare packaging; its tablet workflow exposed a portable-
browser harness defect subsequently repaired. No route/device acceptance implied.

Creator profile category inputs above6 and Prestige configure achievement lists
above1000 are also rejected before per-item Zod processing, using their unchanged
validation destination/messages. Prestige locale/feature gates remain first;
ordinary successful payloads still pass the existing authenticated-owner/admin
checks. Independent review and45 isolated actual-action/render regressions passed.
These guards are narrow runtime mitigations, not a claim that all Zod3 exposure
or dependency advisories have been eliminated.

## 2026-10-29 | Awards authority before validation and compact handover actions

Passport Awards now authenticates the caller and reads/checks the current
administrator role before validating its potentially large payload record.
Profile read errors fail closed even if stale data accompanies the failure.
Authorized valid/invalid requests retain their schema, arbitrary accepted keys,
nine actions, exact caller-bound RPC, idempotency and revalidation behavior.
Guest malformed requests intentionally follow existing auth/onboarding/terms
redirects; disallowed malformed callers receive the existing administrator denial
before field validation. No award, XP, audit, SQL or data-authority change.

Business handover remains a44px minimum touch target with fully readable EN/ES
labels but uses content width instead of stretching across desktop rows.
The existing Analytics navigation label is localized as Analítica in Spanish;
URLs, filters and all actions are unchanged. The default browser harness still
runs the complete160-state matrix, with an additional compact-width assertion.
Its explicit local handover-only mode stores evidence separately; it is not
used by the mandatory CI job. Final-source verification is in the mission ledger.

## 2026-10-29 | Consumer photographic visual correction (in progress)

Following Alex's additional Home/Map/Community/Profile/Login/Passport references,
the consumer presentation is being corrected toward near-black surfaces, warm
orange navigation, substantial atmospheric imagery and compact personal content.
Home retains its existing date/price/map destinations and Tonight feature gate.
The generated `/images/akipasa/nightlife-editorial.webp` is decorative rooftop
atmosphere, not evidence of a real venue, live event or crowd. Catalogue imagery
still takes precedence when present. No mock reference statistics, friends,
stamps or availability become application facts. AkiPals remains paused.

Auth provider availability, callbacks, form actions, consent and return paths;
Account authorization/private data; Community real-content actions; Passport
ledger/earned state and owner controls remain the existing contracts. Shared
consumer shell changes stay separate from independently branded product hosts.
Fresh integrated visual/function evidence is required for this wave; previous
checks and screenshot artifacts do not confer visual acceptance.

## 2026-10-29 | Disposable authenticated browser isolation

The optional manually dispatched full-site browser job requires an explicitly
separate QA Supabase origin/project reference, disposable credentials and QA venue
through secure GitHub configuration. Known live ref `vhpbvcfkcteswlsdjrfl` and
`akipasa` alias are rejected. Fixture mode remains limited to localhost.
The authenticated browser case uses a fixed-backend loopback proxy so canonical
business-host redirects and cookies remain local; external browser HTTP/WebSockets
are blocked. No production middleware, permission or redirect policy is changed.
This infrastructure has local regression evidence, not actual QA acceptance.
A provisioned QA backend/catalogue/accounts and external-media acceptance remain
outstanding; the sole currently connected Development-labelled project is live.

Home's inline search shares the existing GlobalSearch popover and remains disabled
until that sibling form attaches its actual navigation listeners. The dedicated
`data-search-handlers-ready` lifetime marker is independent of auto-submit pending
state, preserving same-value submissions and cleanup/replacement. No query,
validation, router, consent or feature-gate behavior changes. Auth's existing
support launcher stays reachable in normal document flow, respecting owner-focus
mode, rather than overlapping submit controls.

## 2026-10-29 | Preserve Account child destinations through auth and terms

A real local Auth/Next probe found Profile's requested destination collapsed to
Account root when current terms were missing. AccountLayout and independently
rendered child pages must both pass their correct return target to existing
requireUser. Middleware clears any incoming `x-akipasa-account-next` and derives
its replacement from the actual same-locale Account URL. A pure allowlisted
navigation sanitizer preserves existing collection/search, bookings and referral
filters and retains the established membership/operations sanitizer. Unknown,
duplicate, sensitive and transient feedback fields do not become auth return
state. This header is navigation metadata, never an identity or permission claim.
No global auth, terms, age, onboarding, role or private-read authority is changed.

Personal Account's navigation header and external privacy control use coherent
paired consumer colors, with redundant lower padding reduced while retaining
final dock/privacy clearance. Physical Passport paper search placeholders receive
an explicit readable color; the app's brightness tokens remain inherited.

## 2026-10-29 | Extended consumer contrast and detail-surface recovery

The complete hosted browser suite exposed a real paper city-caption regression:
cream foregrounds fell below4.5:1 against the conservative photograph/scrim bound.
City captions now use white over a stronger photographic scrim; the original
reload/contrast assertions are retained and cover every city caption.
The full Passport browser file is required for this correction.

Account-only workspace tokens now pair neutral dark/light surfaces and readable
destructive text across collections, bookings and privacy tools. Other products
and staff/business workspaces retain their existing tokens. Spotlight light-mode
cards use a light surface with inherited dark text, instead of a dark gradient
behind dark labels. Portrait event posters remain contained; venue photographs
retain cover fitting. Catalogue pressed buttons receive the existing selected
visual treatment without changing button semantics or actions.

## 2026-10-29 | Proposed first live Home and Login batch

This isolated candidate is based on the current production master, f3d2687, and
changes only Home's photographic opening/shared-search entrance and consumer
Login presentation. The broader coordinated PR332 remains separate and draft.
It does not import its database/native-product/Avatar/Passport/workspace changes.
Home keeps the existing date/price/map destinations. The inline search waits for
actual existing filter listeners; three GlobalSearch readiness-marker lines do
not change validation, serialization or router calls. Generated rooftop artwork
is decorative illustration, not real venue, crowd or event-supply evidence.

Consumer Login retains every existing auth action, provider-availability gate,
consent choice, return input, WorkspaceSelector and other-host decision. A focused
CSS skin adds branding/background/readable controls and removes the redundant
consumer-Login dock while retaining the visible Home exit. Its support launcher
moves into normal flow. Other product hosts and all other routes remain baseline.

This is a concrete staged-release proposal, not approval to bypass PR332's
90-route gate. Alex must explicitly approve changing the original single-release
boundary before this separate batch is published. Existing master checks, exact
reviewed source, production configuration preservation and rollback apply.

## 2026-10-29 | Live Home/Login preserved during overhaul reconciliation

The earlier staged proposal is now approved and live: PR333 merged as39cd9bb,
Worker8199ce83-b416-42d1-9568-9dc167601b6a. The coordinated candidate retains
that exact consumer-only Auth module/class, normal-flow support and Auth-only
dock hiding. Separate-product Auth styling remains isolated. Home retains its
existing default-off Tonight check; reconciliation never enables it. Both source
histories and their tests are preserved. This merge is into the draft overhaul,
not production. Full integrated checks and genuine route/device review remain.

## 2026-10-29 | Creator studio authentication continuity

The creator studio page, profile save and verification request now supply their
exact localized studio destination to the existing authentication/onboarding/
terms gate. A session lapse previously returned creators to Account root.
Profile media upload likewise supplies its existing allowlisted creator/Profile
return destination; file validation, storage ownership, caller-scoped profile
writes and error redirects remain unchanged. No user-provided redirect is trusted.
The real creator review action already preserves its detail/draft return path.
New isolated creator route/action browser evidence covers populated, empty and
failed reads, safe draft restoration, keyboard navigation and caller-bound writes.
It is explicitly not proof of live Auth/RLS, integrated Next routing or a physical
Android device. No feature gate, grant, SQL, XP, billing or production data change.

The same exact-task return applies to Account Profile save, Settings email/password
requests and Privacy deletion requests. Only navigation metadata changes; the
existing gate still runs before any profile write, provider mail or deletion
request. Original validation, confirmation, callback URLs and caller scope remain.

Actual shell-backed creator captures additionally exposed small yellow venue
labels against white event cards. They now use the readable theme highlight;
creator workspaces inherit the consumer neutral night surfaces instead of the
old navy workbench. Atmospheric hero fallbacks remain dark in both themes.
Measured text contrast and final-source shell-backed captures are required.

A separate clean local Creator fixture now faithfully applies the immutable
Supabase initial schema defaults before92 unchanged scoped source artifacts.
39 real Auth/REST checks prove private draft isolation and denied forged ownership,
reassignment, verification escalation and category writes. The earlier partial QA
fixture is preserved rather than broadly re-granted. Full canonical migration
parity and actual provider/device acceptance remain separate requirements.

## 2026-10-29 | Reproducible existing Profile edit grants

Actual Next/REST testing found that fresh checked-in replay rejected Creator's
Profile synchronization:0033 grants name/locale only, while0069 adds ordinary
editable profile fields without granting their updates. Read-only production
metadata confirms all15 required edit columns already allow authenticated UPDATE,
none allow anon UPDATE, and app_role remains denied. This is a source baseline
gap, not a demonstrated production outage or permission-expansion request.

New mirrored CLI-generated migration20261029231041 restores only those existing
15column grants. It fails closed unless RLS is enabled, exactly one canonical
public/permissive owner+role UPDATE policy exists, and no broad authenticated
table UPDATE or anonymous column UPDATE exists. It changes no policies/functions,
role/ID/terms/private privileges, rows, onboarding, billing or feature settings.
It has not been applied to production; that environment already has these rights.

21actual SQL regressions plus39actual isolated Auth/REST probes and5real Next
journeys pass, including healthy EN/ES Creator saves, other-account/private404,
unchecked terms/explicit acceptance/Studio return and a real pending review.
The separate fixture uses the official initial defaults and current scoped
account mutation coverage, preserving earlier failed receipts and original QA.
This remains scoped proof, not full canonical migration or physical-device
acceptance. Rollback keeps pre-existing live grants; fresh replay rollback must
restore its recorded pre-migration ACL, never blindly revoke production rights.

## 2026-10-29 | Preserve RPC-only terms acceptance records

Read-only live metadata found direct authenticated UPDATE privileges on both
profiles.terms_version and terms_accepted_at, despite0022/0033's RPC-only contract.
Owner RLS and existing BEFORE triggers do not protect those fields. This allows
own-user acceptance markers to be changed outside the intended server-stamped
RPC; it does not establish an age/onboarding or cross-account bypass.

The security-only mirrored migration20261029232451 revokes UPDATE on just those
two columns from PUBLIC/anon/authenticated. It preserves the existing RPC body,
execution ACL, policies, ordinary editing rights and all stored acceptance rows.
Preconditions verify RLS, no broad client table UPDATE, and the existing trusted
owner RPC's availability; postconditions ensure effective client denial and
continued RPC-owner access. Unsupported/inherited privileges fail atomically.
This source is prepared for independent review and explicit production approval;
no live SQL or customer-data change has occurred. The larger overhaul stays draft.

## 2026-10-30 | Home directory visual continuity

The Home nearby-business fallback now uses a scoped responsive card grid instead
of the legacy generic rows below the cinematic discovery section. A dark opaque
surface and restrained orange location accents remain consistent in both themes;
listing names, addresses, distances, claim status and destinations remain supplied
by the existing nearby RPC. That response has no photos, so the decoration does
not imply venue photography, open status, popularity or an event tonight.

The change affects consumer Home only: no query, pagination, backend/RLS, provider,
account, XP, consent, product boundary or Tonight gate changes. EN/ES labels and
20-card result pagination remain. The new actual-Next browser spec checks readable
labels, overflow, keyboard/reduced motion, source hashes and navigation across
360/390/820/1440 widths. Results and reviewer limitations belong in the execution
ledger/receipt; implementation alone does not grant route acceptance. A fresh
read-only aggregate at00:02UTC still found zero future occurrences; Tonight stays
default-off (AKIPASA_EVENT_SUPPLY_20261030.json).

## 2026-10-30 | Protected Passport chapter readability repair

The isolated small-release investigation rendered the actual async Passport page
and actual book with disposable identity/read/action adapters. Unlike guest-only
captures, populated/error/empty protected chapter captures exposed white metric
numbers on paper and overly broad brown paragraph rules inside dark embedded
cards. Metric children now use paper ink; paragraph overrides apply only to
paper panels, and the independently dark badge collection retains its own readable
ink through its existing semantic landmark. XP, reward actions, authorization,
private reads and stored records remain unchanged. A light-theme badge search
placeholder measured2.1183:1 before its explicit opaque text repair.
The protected fixture is visual
and caller-filter evidence, not production authorization or physical-device proof.

The short-tablet regression additionally reproduced an unreachable cover action
at820×900: normal scrolling left the button with zero viewport intersection.
The app locks Passport content through850px, while the book's small-screen
interior previously stopped at700px. Only the701–850px book atlas now provides
contained vertical scrolling. Other app scroll locks and chapter layouts remain.
The maintained four EN/ES/theme checks require full viewport visibility and an
ordinary click, emulated tap or keyboard Enter into the city index; no forced
click or enlarged viewport.

Desktop and populated-city review also found pale journal text and a category
control extending beyond the paper. The journal alone maps the three Passport
object tokens to paper ink/muted/surface, with a local light native-control scheme.
The photographic object and interface outside the journal inherit their existing
appearance. Desktop spread tracks now shrink within the available paper width.
The owner-appearance guard still rejects generic and broad palette overrides;
it permits only those exact three values on the exact top-level paper-journal
selector and verifies the mapping. No owner theme, role or data rule is relaxed.

## 2026-10-30 | Unapproved small Home-directory/Passport plus terms-security candidate

A separate review branch starts at immutable892a1948bb739d3ae6e88d091e085e88a940a294
(the deployed Home/Login source plus the reviewed, unapplied terms-record fix).
It imports only PassportBook.module.css and the Passport page's existing cover/
index query admission from overhaul source8f78b33ab07bf60b30530f08391cb943d856ee9f.
Paper colours stay local to physical book interiors; inherited application-theme
controls, real city photographs, earned/private progression, chapter navigation,
motion preferences, XP/check-in/reward authority and server actions remain intact.
The separately bounded Home directory card diff f489be6..8f78b33 and its scoped
stylesheet are included; the twelve earlier unshipped Home changes are excluded.
No shared shell or avatar/retention activation is included.
The original ninety-route acceptance gate remains unchanged and unfulfilled.
The earlier Home/Login exception does not authorize this Passport or SQL batch.
A new explicit owner decision, exact candidate validation and independent source/
device/provider review remain required before merge, SQL application or release.

Protected real-component captures found inherited metric/header ink unreadable on
paper, paragraph ink leaking into dark weekly cards, dark inherited badge titles,
and a2.118:1 light-theme badge placeholder. The Passport-local stylesheet scopes
paper text to its actual panels and gives the independent dark achievement object
readable text/placeholder. Synthetic protected component cases assert text and
placeholder contrast; no progression/read/action authority changes. Before proof
is retained. These repairs remain subject to the same explicit staged approval.

Measured release-candidate follow-up:820×900 cover access required bounded scroll
only on the701–850px Passport atlas. Desktop city journal text/control overflow
required a journal-only paper semantic palette/light native control scheme and
shrinkable proportional city columns. Photo stamps/interface tokens stay inherited.
The inherited-interface source test retains its prohibitions, allowing only the
three exact paper journal mappings once each; actual browser token/contrast/bounds
checks and two synthetic earned-city cases guard this boundary. No actions, real
awards, database permissions or shared shells change. Final validation is recorded
in the concrete release proposal; explicit owner exception remains required.

The release desktop navigation assertion is portable across local/CI origins,
while still enforcing the same origin, locale path, locality and full destination.
This is test-only; runtime and terms SQL hashes remain unchanged.

## 2026-10-30 | Approved Home/Passport production verification

Alex explicitly approved PR335 and its exact terms-record permission repair.
Reviewed79dacc3 merged as3d87eb7c995fbd0947cb25a771a43376d9462645 and automatically
deployed as Worker26e51e72-bb1e-49e9-a307-243e0203ef8d at100%; public release-source
and six EN/ES guest Home/Auth/Passport reads verified. Exact guarded terms SQL
7fe0fa1a applied once as20261030102908. Post-checks deny direct client terms edits,
preserve ordinary editing/RLS and the unchanged trusted acceptance RPC definition
and ACL. No customer-record mutation was used for evidence. Prior Worker8199 is
UI rollback; retain RPC-only terms protection on rollback. Full332 route/device
acceptance remains outstanding; Community336 is a draft follow-on, not deployed.
Full receipt: docs/receipts/AKIPASA_PRODUCTION_335_20261030.json.

## 2026-10-30 | Integrated Community pending and contrast regressions

Ported only the reviewed Community follow-on fixes into the broader overhaul:
existing AuthSubmitButton supplies localized disabled/pending-to-idle feedback;
empty report targets stay disabled; light accent text and form placeholders use
readable scoped ink. No payload, action, caller filter, permission, data, rate-limit,
consent, XP or feature-gate changes. The main browser harness keeps both actual
main-only cinematic/shared styles and now asserts placeholder contrast, original
caller filters and deferred submission resolution.272fixture cases pass; actual
page/identity/action adapters are documented, not live provider/RLS/device proof.

Passport capture readiness now waits for decoded loaded images and two browser
render frames before screenshots. Offscreen lazy images remain lazy; no runtime
loading or layout changes. Original early blank-image captures remain retained.
Full check/actual Next results are recorded in the ledger after execution.
No route acceptance or Community deployment is implied. See
receipts/AKIPASA_COMMUNITY_MAIN_INTEGRATION_20261030.json.

## 2026-10-30 | Community support repair integrated into coordinated candidate

The independent Community review found partial support/map overlap on390px; its
center narrowly remained usable. The public landing alone now places help in
normal flow with a visible label. Shared shell, support action/dialog and all
other routes remain unchanged; owner-focus hiding is retained. The added actual
Next Community suite covers full rectangle nonintersection, EN/ES/themes/widths,
truthful editorial/future copy and guest return boundaries. Full2639-case check
and optimized build plus35combined actualNext cases pass on this integrated
working tree; fixture272case evidence remains separate. No Community deployment
or final route/device acceptance. Alex's latest direction is consolidation into
PR332; PR336 remains supporting review evidence, not a competing release.

## 2026-10-30 | Photo Credits localized metadata and sitemap coverage

Actual source9533 review found Photo Credits inherited the generic Spanish brand
head, no canonical/hreflang and the root OpenGraph URL in both locales. Privacy
and Terms already had correct localized metadata. Photo Credits now uses the same
existing publicPageMetadata pattern, localized title/description and public static
sitemap registration. Public attribution content and licensing links are unchanged;
no auth, data, consent, provider or private indexing predicate changes. The existing
legal actualNext suite now asserts every legal route's canonical, reciprocal
EN/ES/x-default alternates and own OpenGraph URL, plus localized Photo Credits title.
The strengthened390px regression fails against the prior built source at the
missing canonical;8focused SEO/sitemap cases pass. Fresh full check/build/browser
results are recorded in the ledger after execution; no acceptance is inferred.

## 2026-10-30 | Hash-pinned canonical replay planning, no database execution

The new explicit partial replay manifest pins337raw SQL paths across both source
trees:97reviewed candidate-prefix paths,150unresolved,86exact-byte transports and
4excluded paths representing two mirrored historical bundles. The original95-source
Creator proof remains78application plus17external Storage inputs; it is not full
canonical parity. Platform/bootstrap, missing operating-source, history, conditional
coverage, external HQ and final security/customer-journey stops remain unresolved.

The checker is plan-only and cannot contact a database/network, load credentials,
spawn an apply process or change data. A structurally valid partial plan exits2
and always reports executable:false/fullCanonicalParity:false; drift exits1.
16focused regression cases guard hashes, ordering, excluded/unresolved sources,
false transport/completion claims, required stops, safe paths and apply refusal.
They are added to the existing check command without replacing any check/gate.
No SQL, production history, permissions, fixtures or customer records changed.
Source: AKIPASA_CANONICAL_REPLAY_PLAN_20261030.md and corresponding JSON/checker.

## 2026-10-30 | Recovered operating DDL admitted as source only

Three recovered operating definitions are preserved byte-for-byte under
`database/replay-only/recovered-operating/`, never in production migration roots.
Independent source review found no embedded credentials/customer literals or
destructive top-level/provider operations. Fresh authorized history metadata
SELECT pinned each raw statement SHA256/length/version/name; every retained copy
matches those exact bytes plus one finalLF. No lowercasing/comment/whitespace
normalization or invented upstream origin/license is used. Protected originals
and their permissions remain unchanged. No recovered DDL or customer write ran.

The source checker is fixed-allowlist/read-only and refuses hash/path/extra-file/
false-readiness changes and apply flags. Exit0 is source integrity only; no database
capability, standalone execution, fresh guard acceptance or canonical parity is
asserted.14focused Node cases pass and are added to check without replacing checks.
The canonical337-path inventory remains unchanged. Its three operating STOPs now
reference the source bundle but remain unresolved until fresh ordering/current
account coverage/ACL/customer-journey evidence exists. Historical authenticated
APIs predate age/onboarding/terms wrappers and must never be exposed standalone.
Current migration/seed/test/deployment scanners do not execute this directory;
new global SQL globs would require explicit review. Existing live terms/RLS/XP/
private identity/customer records and all original fixtures are untouched.

## 2026-10-30 | Staff exact-claim lookup honors canonical account eligibility

A bounded actual-source review/SQL proof confirmed the later exactclaim RPC skipped
onboarding eligibility while its list sibling and staff page enforce it. Supported
administrator role assignment can promote cohort-pending/underage consumers without
removing their lock; with a known pendingUUID those staff could use the older
lookup for claimant details. This is conditional/preconditioned source behavior,
not evidence of current affected production identities or exploitation. Production
metadata only was read; no private claim rows or live actor operations were used.

Mirrored forward20261030114106adds only the central fail-closed eligibility gate
after the original rolecheck, preserving exact filters/results/owner/OID/ACL/stable
empty-search-path definer and eligible legacy/completed staff. Trusted known-body/
helper/ACL preconditions and postverification fail atomically on drift; reapplication
is idempotent.37actual-source PGlite regressions pass, including canonical promotion,
negative states, unchanged records/helper/list,17drift cases andNULL fail-closed.
SQL permission audit reports0findings. The existing founder suite adds these tests;
no older test, check or gate is removed. Canonical inventory now includes339actual
migration paths,151unresolved/87mirrors; no new source is declared fresh-executable.
No production SQL, cohort/role/consent/customer data/XP/billing/notification changed.
Current-terms policy is outside this helper and is not claimed repaired. See
AKIPASA_STAFF_CLAIM_ACCOUNT_BOUNDARY_20261030.md and paired SQL receipt.

## 2026-10-30 | Complete public browser collection sharded without lowering gates

Exactdb3public-ui job124036234347 was cancelled at its20minute budget before the
546case collection completed; logs record no assertion failure. Evidence archive
was preserved. The same collection/environment now runs as two parallel shards,
with the original20minute budget per job and fail-fastfalse. Original public-ui
required context remains an always-run aggregate that succeeds only if allshards
succeed. Failed/cancelled/skipped/empty results fail the aggregate; no assertion,
case, workflow, permission or branch-protection requirement was removed.

Actual Playwright collection comparison under exactCI fixture flags gives546unique
cases split288/258, zero omissions/duplicates/extras. The initial default-env526
listing is retained separately; the difference is CI's existing test-only flags,
not omitted tests. Per-shard artifact names preserve both archives without upload
collisions, same paths/retention. Runtime CI is required on the resulting commit;
collection equivalence alone is not a browser pass or route acceptance. See
receipts/AKIPASA_PUBLIC_UI_SHARD_COVERAGE_20261030.json.

## 2026-10-30 | Map pins preserve the selected recurring event date

Actual MapPage supplied the event-only URL to ProductionMap, while its list cards
already used occurrenceHref. A later date-filtered recurring occurrence therefore
opened the detail selector's earlier default night. Map pins now reuse the existing
helper with the recommended occurrence ID; filters, recommendation authority,
coordinates, map rendering, price labels, auth, bookings and XP are unchanged.
The existing pin regression is strengthened; two EN/ES actual-page-to-real-selector
cases prove a second selected night survives even when an earlier future night
would be default. Before: three failures/59 passes. After: 81 discovery/selection/
booking-continuity cases pass. Synthetic identity/provider/render substitutions
are explicit; no live event data, availability or production acceptance is claimed.

## 2026-10-30 | Official Storage replay source archive, no execution

Seventeen unmodified upstream SQL inputs (15,011 bytes) are archived outside both
application migration roots with exact upstream commit, original filenames,
Apache 2.0 LICENSE and attribution. Independent pinned fetches match original QA
and scoped snapshots exactly; no normalization or customer credentials involved.
The fixed-allowlist checker pins SQL/license bytes, complete provenance, explicit
numeric order (00010 follows0009), nonexecution flags and prerequisites. Thirteen
Node cases cover changed/missing/extra/duplicate inputs, symlinks/path traversal,
forged provenance/readiness/license, order and apply refusal. Added to existing
check without replacing tests or gates. No network/DB/subprocess/apply capability
exists in the checker. Source integrity exit0 is not canonical replay, current
platform or Storage HTTP acceptance. The 339 application-path inventory and all
unresolved STOPs remain; no fixtures, migrations, policies or production changed.

## 2026-10-30 | Two redirect-only routes independently accepted

Only root and unlocalized Roadmap move to accepted after independent exact-source
review at6a923495 and actualNext308/target/campaign HTTP proof in successful run 41053750511. Reviewed CI merge tree equals source tree. User explicitly requires
redirect evidence rather than screenshots of nonexistent pages; existing URL field
links the real HTTP run and evidenceType makes that distinction explicit. Neither
destination page nor HQ gateway is accepted. HQ is a rendered200page and retains
its visual/tablet/external-access/device gaps. Matrix now2accepted/88inprogress/
13excluded; six fallback states and full owner/device/strict gates remain. No audit
assertion, workflow, schema, consent, role or production boundary was weakened.

## 2026-10-30 | Complete conversion tablet coverage and stable HQ captures

Existing conversion browser matrix lacked820tablet. Added exactly four EN/ES ×
light/dark820x1180 cases while retaining all previous546collection members; current
collection550, zero removed. Four new actualNext cases pass, covering membership,
referral, HQgateway and confirmation entrypoints. A screenshot could capture the
SVGlogo before final decoded paint: capture now waits for complete/naturalWidth,
decode and two browser renderframes, no arbitrary sleep/runtime loading change.
Twelve supplemental HQ guest states at360/820/1440 show decoded branding, nooverflow
and actualinline-fragment/control hit-test access. Initial multiline-anchor union
center false-positive is preserved; correct fragment checks pass. No runtime,
provider, cross-host authorization, payment/customer data or productbranding change.
AkiHQ remains separate from AkiBusiness. Root reviewed phone/tablet captures;
physicalAndroid/owner/fullroute/protectedpermission acceptance remains outstanding.

## 2026-10-30 | Consumer screen completion against the approved visual references

Alex rejected the prior Account/Profile/Settings candidate as a management dashboard.
Passing functional tests did not accept that design. Account now has a route-scoped
consumer presentation: compact Profile/Edit/Settings sections, the existing complete
authorized Menu, stronger caller identity, focused security rows and an illustrative
Discover CTA using existing licensed editorial artwork. Actual saved counts/identity
remain authoritative; no friends, visits, verification badges or activity is invented.
Auth, accountReturnPath, role-filtered destinations, database reads, form actions,
privacy/terms defaults and separate-product behavior are preserved. The measured
low-contrast active glyph/light label and missing mobile gutters are corrected in
Account-local CSS. The maintained harness adds390/820/1440 without removing its six
old sizes and serves only safe public image paths for real artwork captures.

Check-in replaces the generic navy hero/empty box with a compact camera-first
black/orange surface, decorative camera standby, meaningful three-step instructions,
clear camera opt-in and explicit verification/no-XP-on-open-or-scan notice. Scanner,
QR validation, geolocation/confirmation and reward logic are unchanged. The secondary
Map link moved above the camera after actual tablet keyboard testing found bottom
Dock overlap. Sixteen real-browser responsive camera lifecycle states and the six
existing QR/proof regressions pass in the isolated build; physical camera/GPS is a
separate acceptance requirement, not established by a synthetic software feed.

Creator Studio now has licensed editorial imagery, existing caller identity, orange
studio tabs and consistent editor/media/programme surfaces through the page bottom.
Portrait stays circular; cover preview becomes a readable wide banner. Only page
presentation, its module and safe local browser-asset support change. All queries,
actions, privacy/ownership/eligibility fields and defaults remain intact. The full
144-case maintained browser run and33targeted tests pass. A source-drift failure
caused by the independently fixed Map CSS is preserved; the reconciled run passes.

Venue/Event details preserve their photographic structure and interactions while
replacing legacy navy/blue below-fold panels, links/tabs and date ribbon with scoped
charcoal/orange and readable warm light ink. Sixty actualNext cases pass, retaining
all52original cases and adding1440/guest-return/event-state coverage;16additional
palette checks pass. Illustrative fixture artwork is labelled and changes no actual
venue/event data. Booking subroute authorization remains independently assessed.

Map's light results drawer had navy text on a forced dark panel. A Map-only shared
CSS override restores warm light surfaces/ink and readable fallback initials;
queries, pins, location consent and controls are untouched. Eight browser states
pass, measured text contrast at least5.9057light/10.999dark, nativeEscape/focus restore
pass; four maintained EN/ES/theme contrast cases are added without removing tests.

These implementations require the new integrated source check and fresh exact-head
CI. Prior c10 green workflows remain historical evidence, not approval of this dirty
working tree. All final screenshot/source hashes and remaining scope limits belong
in the integration ledger/receipts; no full-overhaul merge or deployment occurred.

## 2026-10-30 | Genuine business entry acceptance and live Android follow-up

Independent review accepts ONLY HQ's public gateway and the two Business/Duermo
membership redirect routes at reviewedc10source. Twenty gateway states,40captures,
native keyboard/three link destinations, noindex/nooverflow and native HTTP host
redirect chains are verified. Destination membership/external authenticated workspaces
and other protected business pages are not accepted by those entrypoint checks.
Matrix now5accepted/85inprogress/13excluded; six fallback states remain pending.

Alex explicitly reported that live Home, sign-in and Passport work on his physical
Android phone without broken/covered controls. This applies to approved335source3d87
and Worker26e only; device/browser version was not supplied. It does not accept the
new332screens. Fresh Cloudflare deployment metadata confirms26e still serves100%.

The separate disposable fixture also completed97application foundation sources plus
17officialStorage inputs and then four achievement/Passport prerequisites with real
GoTrue75migrations/helpers, normal synthetic Auth identities, negative permissions
and rollback-only cross-profile RLS probes. XP/accepted visits/permanent awards stay
zero; prefix receipts remain unchanged. Source4's missing native transaction boundary
uses explicit psql single-transaction without modifying bytes; a fixture-only schema
cache reload is recorded. This is bounded precoverage evidence, not full canonical
parity/StorageHTTP/current account-guard acceptance. Production/retained fixtures and
newstaffSQL application state are unchanged. Further backend expansion stopped to
prioritize the screen work Alex requested.

## 2026-10-30 | Complete static-page styling and preserve Map search intent

Terms, Privacy and Photo Credits now use legal-only neutral charcoal/warm orange
surfaces with centered, aligned editorial columns and readable attribution grids.
Roadmap's hero, phases, feature cards and final CTA no longer fall back to navy;
AkiPasa missing-page canvas/cards use neutral black. Other product branding,
legal wording, links, consent actions, HTTP404/noindex and recovery semantics are
unchanged. The exact light-hero ink assertion changes from old navy to intended
warm neutral rgb36/30/25, retaining the strict assertion. Focused legal20/fallback18,
Roadmap16contexts/5unit and48lowerlegal contexts pass;172actualcaptures reviewed.
The original strict old-color failures and build working-directory mistakes remain
recorded. Final source binding and candidate acceptance require fresh hosted CI.

Actual public Chromium confirmed live Map streets, labels, glyphs and vector tiles
render successfully; a local curl403/1010 was a browser fingerprint restriction,
not proof of a production basemap outage. It also reproduced a real bug: granted
GPS could override an explicit Málaga search and move the map to the test browser's
location. MapPage now disables automatic GPS for a valid explicit Spanish locality
or validated custom coordinates. ProductionMap's optional initial-location policy
uses a current ref, preserving default implicit behavior and all manual controls.
Late callbacks respect changed search intent; changing the policy does not recreate
the map, reset camera/filter state or duplicate telemetry. Retry keeps its prior
camera and does not trigger GPS again. Before proofs and147focused source/control
checks are recorded; query validation, privacy, venue access and analytics consent
remain unchanged. This fix is unmerged/undeployed until the candidate clears release.

Account's final visual review additionally caught a sticky Menu covering the
username and native Tab focusing a field under the fixed dock. Menu now scrolls
with its section navigation; mobile/tablet Account-only scroll padding/margins keep
native focus visible, with no forced clicks or JavaScript focus interception.
Maintained regressions retain existing assertions and exercise native Name→Username
Tab and three-point control hit tests. Final24source-rendered cases and28maintained
Profile cases pass; exact last-source hashes are recorded in the Account receipt.

## 2026-10-30 | Consistent Staff, Admin and Owner screen presentation

Staff now uses scoped charcoal/orange surfaces through navigation, queues, forms
and lower panels. A reproduced light-theme hero contrast failure (1.008:1) is
corrected to at least7.35:1 in measured maintained fixtures. The maintained browser
runner retains all80 original cases and adds actual overview/AppShell and820tablet
coverage for120 passing cases; real drawer keyboard/focus and action hit targets
are checked. Its zero-open-editor assertion is scoped to the workspace body after
real AppShell added unrelated GlobalSearch details; the original assertion remains.

Admin's local neutral tokens cover nested workbenches and lower fields. Three
Spanish Privacy option labels are localized, retaining exact state values, actual
handler, required reason and unchecked deletion confirmation. Owner's route-local
skin preserves every selected accent/base background, existing role guard, reads,
private controls and distinct AkiBusiness destination. The client launcher restores
only the server-provided signed selected image, JSON-quotes the CSS URL, and clears
private URL/flag on withdrawal or unmount. Photo overlay remains separate from base
background selection; no new storage URL/read or permission is introduced. Owner-only
ancestor styling reveals the existing body canvas without restyling other routes.

Exact227 CI found a personal Account test locator matching both valid Edit profile
links. It now checks the unique identity CTA and unique navigation link separately
with their original destination assertions; all32 local cases pass, independently
rerun by root. Neither link is hidden or removed. Fresh integrated check and new-head
CI are required; prior-head10 ordinary workflow successes and public browser shards
do not accept new bytes. No route acceptance, merge, deployment or SQL application.
See receipts/AKIPASA_OPERATIONS_SCREEN_INTEGRATION_20261030.json for source hashes
and actual test limitations. Physical Android and protected provider journeys remain
separate from the disposable read/action browser adapters.

## 2026-10-30 | Accelerated screen-family completion and truthful read failures

Six nonoverlapping workers completed consumer, discovery, social, operations,
review-gallery and static/fallback QA lanes under one integration owner. Fourteen
route presentations/technical defects and three fallback states are repaired in
this batch: protected recovery; Creator directory/profile; Passport Places; existing
AkiPals entrance palette only; Event/Venue booking and token Check-in presentation;
Staff claims/promotions; early-partner; Admin Promotions read recovery; Terms
acceptance and AkiPasa waitlist confirmation. Other brands remain separate.

Venue booking now distinguishes failed/malformed availability and venue reads from
genuine empty/missing data, supplies safe localized Retry and withholds the wizard
when capacity is unknown. Auth, external booking, genuine404, action payloads and
remaining values are preserved. Admin Promotions independently reports unknown
failed-read counts and withholds only dependent editors, retaining healthy sibling
lists and existing action fields/defaults. No provider/customer mutation is used.

Terms/waitlist keep unchecked required consent, version/token/return/POST behavior.
Actual light-theme review caught invisible waitlist headings; explicit AkiPasa-only
heading ink fixes it. Sixteen sibling-product captures remain pixel-identical.
Fallback error/loading now match warm404 tokens, with88native fixture cases and
six unchanged sibling-product captures. Shared edits are scoped; auth/RLS/billing/
verified visits/XP/private identities and all remaining gates are preserved.

Fullcheck EXIT0:2745Vitest/17groups,140initialNode cases,193routebuild. All runtime,
test and config source bytes stayed frozen. A later offline-only gallery text-wrap
correction has8focused tests/lint/format and independent390/1440 gallery validation;
its separate source hash is explicit rather than falsely attributing it to the
earlier fullcheck. Fresh exact-head CI remains required. Original failed/incorrect
fixture captures are retained; only actual-theme/source-bound finals support review.

Owner inventory covers90routes:89implementation-ready with scoped passing evidence,
one known token-read error recovery gap. This is not89formal acceptances or full
provider/device proof. The complete required-technical-evidence count is explicitly
unreconciled;5formal acceptances remain unchanged. Portable family galleries list
real source hashes, actual screenshots, CI links and missing/stale evidence. They
do not promote matrix status. No merge, deploy, new SQL or backend expansion.
See AKIPASA_SCREEN_FAMILY_READINESS_20261030.json and accelerated batch receipt.

## 2026-10-30 | Check-in token errors fail safely before rendering a form

Actual credential read errors previously became404 or, with stale returned data,
could render venue details and the submission form. The page now handles errors
first with generic localized unavailable/Retry copy. It emits no venue/error/token
values or form/idempotency UUID for an unknown read. Hidden/missing credentials and
hidden venue joins still404; successful flag/form behavior and verified attendance
authority are unchanged. Fifteen targeted regressions pass (four failed before),
16browser states pass, and fullcheck2760Vitest/17groups/140initialNode/193routebuild
passes against three frozen source files. No policy/grant or production write.

Separate bounded metadata review confirmed a real release dependency: the linked
project's private credential table permits managers/owners/platform roles, so normal
consumers cannot use this direct preview lookup. Existing check_in_by_token mutates
attendance/XP and must never be called to preview. A minimal authenticated read-only
preview RPC is being prepared as source only, preserving private table permissions
and existing canonical account_features_allowed() legacy/eligibility behavior. It
requires separate production migration approval and protected disposable-role proof
before release. Do not claim the retry presentation fixes that authorization gap.

## 2026-10-30 | Safe consumer Check-in preview and final discovered UI defects

The signed consumer token page now validates locale/token syntax, authenticates
with its localized return path, and reads only checkin_venue_preview(uuid). It no
longer selects private credential rows. The new source-only RPC uses existing
auth.uid/account_features_allowed() fail-closed eligibility, preserving intentionally
eligible legacy profiles. It returns only active-token published venue ID/name,
never credential IDs/tokens, private coordinates or profiles. Empty search_path,
explicit owner/schema/helper preconditions, authenticated-only nondelegable EXECUTE
and atomic postconditions preserve the private table's RLS/ACL and all existing
attendance/XP functions. Known Supabase service_role function defaults are explicitly
revoked on this new function; unknown default delegates cause atomic refusal.
No production SQL was applied. Deployment requires separate approval and target
preflight; missing RPC/errors render the existing generic unavailable/no-form state.

Actual enabled-page QA also found and repaired Hall's unnamed certificate link
using only its existing public title/alias; native Tab/Enter reaches the correct
certificate. Staff's permanent-delete control had a160px column flex basis and
incorrect orange primary styling; the venue danger-card-only override makes it
48px/crimson/white without changing required reason/DELETE validation or disabled
states. Business application panels/fields now use scoped consumer-shell tokens;
16separate AkiBusiness-host controls remain pixel-identical. No product merging,
form-action/consent/billing changes or destructive test submission occurred.

Fullcheck2783Vitest/17groups,140initialNode and193routebuild passes on16frozen
implementation/test/schema/inventory files.11PostgreSQL and23route tests,48token
render states,15Hall tests/8native keyboard cases and50Business/Staff tests pass.
Real inventory and two typing failures are preserved, repaired and retested, not
ignored. New2locale actual-HTTP compatibility tests are collected but still require
their configured CI run; unconfigured local500 is not counted as redirect proof.
The source-only inventory now341raw paths;97candidateprefix/152unresolved/88mirrors/
4excluded, all existing STOPs/nonexecution flags unchanged.

All90route layouts plus6fallbacks now have bounded review material:93image/HTTP
records and3export-only redirects with HTTP gaps explicit. This is not complete
Auth/provider/device acceptance. Alex approved only the Profile/Edit/Settings visual
direction at197source, not a merge or SQL change.5formal route acceptances remain.
Only the connected main Supabase project exists; a requested schema-only QA branch
cost confirmation expired, and re-listing confirms no branch/resource was created.
Actual isolated signed-in/provider and physical-device tests remain external gaps.

## 2026-10-31 | PR332 hosted inventory expectation correction

Published integrated head `970064ece3aa7ea3a76f8b8c35efa26569e065f4` passed its full
check and Cloudflare packaging. Its public UI shard 1 reported 321 passed,
17 skipped and one failed static inventory assertion: the test still expected
103 total routes after preserving #341's separate private World page. The actual
inventory is 104, with the same 90 in-scope pages. Only that expected total changes
to 104; the existing 90-page assertion and all route checks remain. The existing
Playwright inventory case now passes (one test, 3.0s), with scoped ESLint and
Prettier passing. No runtime or SQL source changed. The 650-file runtime manifest
remains `843a396f73e3df6f43ea5ce79ac2fbd26b664e5c1eb9ca0c472a47cadff9a34b`,
so the 93 real-backend checks and 24 authenticated route audits retain their exact
source binding. The failure is preserved in the [hosted job](https://github.com/elguiriashing/akipasa/actions/runs/41216901369/job/124583210533)
and `../reviews/pr332-ci-970064e-public-shard1.log` (SHA256 `c52abc18681693ceb68136a361642f029f2b550a1707aab98782144c99ec4acc`).
See `docs/AKIPASA_PR332_RELEASE_20261031.md` and its consolidated receipt for the
corrected test hash and qualifications. Fresh CI on the corrected head, merge and
verified application deployment remain pending; no physical-device pass is claimed.

## 2026-10-31 | Restore public shared-account deletion links

The remaining AkiSuite privacy PRs link to /en|es/account-deletion, which
returned the branded unavailable page on live source62140bfc. Add a fixed
locale-preserving307 redirect to the existing public privacy section and
bilingual instructions for signed-in requests and no-login support contact.
The notice identifies the shared five-product identity and human verification,
states the48-hour handling target, and distinguishes recording a request from
completed deletion and restricted retained business/provider/backup records.
No request is submitted by viewing the page or following the privacy link.

Dependencies: Next redirect configuration, existing public Privacy page,
localized account/privacy destination and existing support address. No new
page root or route-inventory reclassification; the104/90/14 review totals
remain intact. No identity executor, schema, retention job, provider setting,
customer data, mail, billing, authentication, role or permission changes.
Four maintained browser cases passed locally in Chromium with the repository
disposable public-page configuration: both locales at390/1440px, actual307 and
200 destination, no sign-in wall, fixed support/account links and no overflow.
EN phone and ES desktop full-page screenshots were visually inspected. An
initial missing-local-environment500 was corrected by using the existing CI
configuration; no application guard or assertion was weakened.
Full hosted CI and live public-link readback gate release. Revert these source
changes to roll back; no data rollback is needed.

## 2026-10-31 | Authored AkiPals models and exact World marker placement

Alex requested the newer character direction, compact mobile World controls,
and pins at the same venue coordinates as Explore. This bounded candidate
preserves the already released #341/#332/#342 application and does not reopen
the completed ninety-page review. It adds official Blender Foundation Rain v3
and Snow v4 characters, with CC-BY-4.0 attribution, source/archive/output hashes,
and repeatable offline export. The self-hosted GLBs contain complete authored
standing meshes, outfits and embedded colour textures. They use the shared
Three.js World/Wardrobe renderer; the full M3 CharacterStudio engine, skeletal
animation and arbitrary wardrobe fitting are not implemented by this change.
Rain/Snow expose character selection and bounded uniform height only. Classic
styling controls remain available for the preserved original model.

Appearance adds only the allowlisted model IDs classic-v2/rain-v3/snow-v4.
An existing saved appearance with no model field resolves to classic-v2 without
a write; a genuinely unsaved profile starts with Rain. Switching models retains
all existing appearance fields and requires the existing explicit Save action.
No asset URL, ownership claim or arbitrary model is accepted from the client.
The existing JSON-object/4096-byte storage constraint accepts this additive
field; no SQL, migration, account grant or customer-data backfill is required.
Actual renderer readiness and embedded texture success still gate Save/export,
with per-stage GPU resources and existing lifecycle/context-loss recovery.

World now opens directly on the map with compact Follow/Stop controls and the
two working navigation destinations. Help, venue details and nearby places open
on request and are dismissible; Stop remains visible while a venue is open.
The pin displacement came from position:relative overriding MapLibre's absolute
marker placement. The marker root now leaves projection/transform ownership to
MapLibre, with decorative styling inside its geographic anchor. Venue IDs and
raw longitude/latitude remain unchanged; nearby pagination and its truthful
truncation indicator are retained. No invented points or separating offsets.

Embedded GLB images require local blob decoding/fetching. Only private Wardrobe
and World gain the required blob CSP sources; other routes retain their existing
policy. Existing preview authorization, owner RLS, no-store/noindex, coarse venue
query centres and opt-in foreground-only GPS remain. There is no new public
presence, reward, camera, payment or provider activation.

Focused schema/API/executable-storage compatibility checks passed 32/32;
typecheck and four model-structure/resource-isolation cases passed, and actual
Rain/Snow browser images were visually inspected. The independently reviewed
eight-context World layout run, before final model/CSP
integration, measured at most 0.498px pin projection error across pan, zoom,
pitch/bearing and resize; restoring the old CSS produced 290.553px error. Short
phone default and venue-open captures were inspected. Final integrated real-GLB
browser acceptance, full check, clean-source Cloudflare packaging, exact PR CI
and deployed source/asset readback remain release gates. These fixtures do not
claim physical Android/GPS or live authenticated acceptance. Source rollback
preserves appearance and legacy game rows; restoring this version recovers any
explicit newer-model selection retained in those rows.

## 2026-10-31 | Home inline search and independent advanced filters

The Home hero now renders the existing public venue search as an inline text
field, rather than opening the extended filter popover. After two characters,
the debounced public search shows at most five matching venues, with localized
links, loading, truthful empty/error states and native Retry. Query changes abort
older responses; Escape hides results and focus reopens them. Each mounted search
instance has unique labels and result IDs. The header search retains the full
filter/pagination experience and its hydration readiness. No query/RPC, schema,
auth, provider, location, consent, reward or billing behavior changes.

The photographic hero keeps its dark local search palette in both page themes.
Actual AppShell testing exposed a small native Retry and dark-on-dark native
clear icon: hero-only 44px recovery styling and a matching native dark color
scheme repair both, leaving the extended search unchanged. Existing full-search
pagination and stale-response tests remain; new tests exercise the five-result
limit, separate instances and truthful retry. Disposable browser fixture counts
and real-shell evidence are qualified in the release receipt. They do not prove
physical Android or new real-provider authentication.

This bounded follow-up is based on production80ec55b and preserves the merged
#332 redesign, all90 prior route reviews, public deletion instructions and #343
private authored models/World. City Stories source and its unapplied migration
are excluded from this independent Home release. Existing deployment authority
applies; exact-head checks, reviewed source identity and automatic Cloudflare
publication verification remain mandatory. Roll back source without data changes.

Final bounded verification:32 actual Next EN/ES/dark/light/360/390/820/1440
Home cases passed, with32 captures and retained advanced-header/image/roadmap/
Escape/focus/overflow assertions. Eight independent final actual-AppShell
contexts verify44px native Retry and visible/clickable native clear. Strict route
audit passes against the completed332 inventory. The initial fullcheck passed
all prerequisites but hit a local whole-.next/tmp symlink module-resolution
failure during page collection; restoring a real.next with only cache linked
fixed the unchanged-source production build. The original failure is preserved;
fresh complete published-head CI remains mandatory. See
receipts/AKIPASA_HOME_INLINE_SEARCH_20261031.json.

## 2026-10-31 | Verified-visit city stories and camera permission repair

This new follow-up preserves production80ec55b/#332's90 accepted screens and
#343's restricted authored models. Community city circles now open a real city
story viewer with keyboard, native dialogs, explicit swipe/previous/next/pause,
reporting and truthful empty/error states. A compact horizontal strip combines
Add Story, Creators and city landmark circles; Suggest a Plan remains a working
contribution action. The initial nearby cities derive from a public selected area;
precise location is opt-in, calculated on-device and not sent to Stories APIs.
Three nearest available cities plus three most active by approved24-hour photo
counts are deduplicated. These counts are not crowd levels or occupancy.

Add Story fetches the authenticated owner's actual recent eligible check-ins,
requires explicit public opt-in and a chosen photo, and re-encodes/canonicalizes
an opaque WebP before upload. The server independently validates bounded static
WebP structure and rejects metadata, animation, unexpected fields and duplicate
multipart values. The server derives the published verified venue and canonical
city from an owned, accepted, credential-backed recent visit. Client coordinates,
selfie labels and photographs do not prove attendance or award XP. No AI/AR,
notification provider, payment or new reward behavior is introduced.

New private Stories tables and a restrictive private-bucket policy protect photo
objects even against unrelated permissive legacy storage policies. Source-only
migration20261031230204 and its mirror have NOT been applied. Collection starts
OFF and the server schema-readiness flag defaults OFF until the installed schema,
private storage, export and role boundaries are verified. Only existing eligible
moderator/administrator roles can review pending photos and approve/reject/remove
with an explicit reason. Public reads project no private profile/owner IDs,
precise visitor location, storage path or report details; media is authorized on
each request and served directly as no-store WebP. Photos await manual review.

Owner read/removal/export remains possible after publication eligibility changes.
Expiry revokes public access24 hours after reservation; it is not a claim of
physical image/backup deletion. Failed cleanup is reported and tracked privately.
Account/check-in/venue cascades remove linked metadata without blocking existing
account deletion; an opaque cleanup outbox survives. Account JSON export adds
bounded, cursor-validated own retained story/report/cleanup records, fails honestly
on missing required RPCs, and excludes staff review reasons/third-party text.
Schema readiness must remain enabled once records exist even when collection is
turned off. Rollback must preserve these privacy controls; stop collection first
and keep a Stories-compatible API/export deployment rather than silently return
an older incomplete export. Stronger physical-retention promises or an automated
cleanup schedule are not implemented by this change.

The live scanner's global camera=() header was independently confirmed to deny
camera on both actual HTTPS language routes. Only the exact bilingual Check-in
scanner page now permits same-origin camera. Microphone/payment remain denied;
other pages retain camera denial and existing one-time geolocation permission.
The scanner still requires a user action and device permission. Native file
capture in Stories is a separate mechanism and is not falsely described as
blocked by the scanner-policy observation. Physical Android/camera/GPS acceptance
is separate from Chromium fake-device or synthetic-coordinate testing.

Targeted units, executable PGlite policies/lifecycles and real component/browser
fixtures cover publication gates, private/owner/staff scope, opt-in, moderation,
withdrawal, metadata rejection, deletion cascades, export redaction and native
controls. Fixtures are not actual hosted Supabase Auth/storage or device proof.
Fresh full checks, exact-source browser results and independent review must gate
publication. New paid QA resources and production SQL still require actual owner
authorization; no customer data or production schema has been changed here.

The first fullcheck correctly rejected the two new unclassified migration paths.
Both are now explicitly inventoried by their actual hash: one unresolved source
and one byte-identical transport mirror, neither in the execution prefix. The
inventory grows341→343, unresolved152→153; all97 prior candidate entries, STOPs,
non-execution flags and existing assertions remain. Sixteen inventory safety
tests pass with additional assertions protecting the new source-only status.
This is classification of the new feature delta, not historical reconstruction
or permission to execute any migration.

## 2026-11-01 | Default-off foundation rollout and camera lifecycle verification

Public sharing needs both nonpublic server flags: schema readiness and
AKIPASA_COMMUNITY_STORIES_ENABLED. With neither flag set, the existing Community
places/contribution/creator navigation stays intact and no new upload controls or
Stories requests are shown. With schema readiness retained but publishing off,
My Photos still permits owner withdrawal/cleanup without eligibility requests or
upload forms. Staff's new photo entry remains hidden until the schema is ready.
Root upload POST also rejects disabled publication before reading the body or
accessing data/storage; current owner reads/deletion remain available. Query
parameters cannot activate these flags. SQL collection independently defaults
OFF and remains the direct-RPC authority.

The rollout can publish completed camera and existing read-recovery repairs now
while keeping photo sharing hidden. This does NOT apply the Stories migration or
claim a working hosted photo service. Before collection, obtain explicit resource/
SQL authority and real isolated Auth/storage proof; install reviewed schema with
collection OFF, verify export/storage, record a compatible schema-ready/UI-off
Worker rollback version, then enable collection/UI. Stop SQL collection first to
roll back, disable public UI, and retain schema readiness, My Photos and export.
Never silently revert retained user records to an older incomplete export build.

Enabling the existing scanner exposed three reproducible lifecycle failures:
repeated starts could create multiple streams, deferred detection could navigate
after Stop, and backgrounding retained a track. Nine focused tests now pass with
request generations, cancellable permission wait and stale-stream/detection/play
invalidation; Stop, background and unmount end tracks. Official QR validation and
healthy navigation remain. Native fake-device checks still require a fresh build;
no physical camera/Android or attendance proof is inferred.

Before this small final rollout/lifecycle delta, fullcheck passed3,232 Vitest
cases/18 groups and the optimized Next build (193 generated pages) at00de4db. Its earlier inventory
and accessible-contribution failures are preserved and genuinely repaired, with
all prior assertions retained. New targeted rollout/lifecycle regressions, fresh
build/native checks and all final-head CI remain required for the new source.
The tablet workflow adds one parallel Community/Staff evidence job, retaining
every existing job, threshold and assertion. SQL stays unapplied.

Home345 is separately merged as76bceebdcd69c779f57f8f117145dfd94d3e0496 and
independently deployed at100% as Worker05ebc787-5d2d-438c-9d53-ff6ac4fda243
through automatic master build53cbf577. Sixteen actual HTTPS Home cases passed
using genuine Casa1899 matches, EN/ES/themes/four widths;80 attempted Cloudflare
RUM writes were blocked, not falsely counted as zero attempts. No manual deploy
or production customer write. This source/history is preserved in the candidate.

## 2026-11-01 | Review repairs before the photo-foundation release

Fresh head133d3c3 CI passed all11 workflows (23 successful checks and one
conditional site-regression skip), including3,258 Vitest cases,140 Node cases,
optimized Next and Cloudflare builds. The tested synthetic merge tree matched
the reviewed source. Public browser shards passed590 with101 conditional skips.
This did not waive review: two real findings prevented merge.

Permissions-Policy belongs to a document. AppShell now forces a full document
navigation for ordinary links across the exact EN/ES scanner boundary in either
direction, preserving modified/new-tab/download and unrelated SPA navigation.
A navigation-entry check also refreshes document policy after programmatic router
and history transitions. Header policy remains camera-self only on the scanner,
with microphone/payment denied; native dock and history regressions supplement
the earlier direct-load camera tests.

My Photos now restores owner-only durable cleanup identifiers from its mine
response after close/reopen, instead of relying only on transient client state.
The bounded backlog can be drained by explicit retry and refresh, including
soft-deleted/expired or orphaned metadata. Ownership and ineligible-owner
withdrawal remain enforced, and collection-off does not strand existing records.
The mirrored additive SQL is still UNAPPLIED; its revised SHA256 is
28bbffb5b7cd3c943bc58de09580f57cb95929e71f7660fdbef2d62203ed7541.
Only the existing source/mirror hashes and derived inventory fingerprints changed;
canonical scope,
non-execution gates and STOPs remain intact. No hosted storage evidence, paid
resource, production SQL, photo activation or physical Android proof is claimed.
New targeted and exact-head validation is required before merging repaired source.

## 2026-11-01 | City Stories activation preparation

Alex approved isolated database testing within the previously proposed USD2 cap
and requested City Stories activation after verification. Production remains
38578ecc and dormant while real Auth/Storage checks are prepared. The temporary
branch zbfozgzlucdlutqgcwlc has no production data; failed provider history replay
is not schema parity. Only the current scoped dependencies are installed there.
My Photos now explains refreshing review status and the24-hour visibility limit
in EN/ES without internal verification language; labels, consent, ownership,
cleanup and publication gates are unchanged. Existing37 controller tests pass.
Initial private-key retrieval was rejected by automatic review. Alex then
explicitly approved encrypted QA-only server-key access. The approved five-minute
handoff completed without displaying credentials and was immediately replaced
with HTTP410; the branch-only configuration remains private. Real-provider
verification is in progress, not yet claimed complete.

The activation candidate adds source-controlled server bindings
SCHEMA_READY="true" and ENABLED="false". It MUST NOT merge before complete real
provider tests and installation of the reviewed production SQL with collection
OFF. Automatic master deployment then creates a schema-compatible UI-off
rollback version. A subsequent reviewed config release enables publishing only
after the collection/privacy/export checks pass. Explicit config values override
kept remote vars; other secret bindings are preserved. Do not patch latest
uploaded settings, which may describe unrelated unpublished preview code.

## 2026-11-01 | Real-provider Stories privacy dependency repair

The isolated hosted test exposed an existing complete-account-export failure:
`suite_email_outbox` is deliberately service-only, but the export reader tried a
direct authenticated table read. Production catalog-only inspection confirmed
RLS enabled, no client SELECT grant and no client policy; these boundaries must
remain intact. The candidate replaces that read with a bounded caller-session
RPC projection, derives ownership from `auth.uid()` and preserves export rights
when account-feature eligibility is revoked. A missing, malformed or incomplete
page still fails the entire download without returning partial personal data.
Known personal email fields are separated from provider internals and third-party
rental customer details. The additive export migration must be installed before
this candidate deploys; no direct client outbox grant or service-key export is
authorized by this repair. Existing delivery, cron, consent, billing and booking
mutations are unchanged.

Native viewport testing also found that scrolling the photo manager moved its
header and Close control out of view. Its header is made sticky within the
existing scroll container; focus, dismissal and overflow behavior require fresh
browser verification against the repaired source. These are candidate changes,
not evidence of production SQL, merge, activation or physical-phone acceptance.

## 2026-11-01 | Flush discovery hero and rolling local launch notice

- **Owner request:** AkiPasa Home photography starts immediately after the launch strip in desktop, tablet and handset orientations; the formerly static banner scrolls a truthful Costa del Sol-first announcement. Public Roadmap links are retitled **Our Roadmap** in English and **Nuestra hoja de ruta** in Spanish while preserving existing `/en/roadmap` and `/es/roadmap` routes.
- **Scope:** Client-side `LaunchRibbon` copy/styles, Home-only layout override in `PasaCinematic.css`, visible link/title copy on `AppShell`, localized Home/roadmap/footer, and focused E2E/contract tests. No backend, Auth, RLS, payments, geolocation, analytics, site-wide padding or alternate AkiSuite host changes.
- **Accessibility:** One read-once, visually hidden announcement; duplicate visual track excluded from screen readers; pause on hover/focus, stop animation for reduced motion, fixed Roadmap link stays keyboard/touch accessible. No unsupported dates or promises.
- **Verification:** Release only after exact-head CI, tested responsive Home geometry, EN/ES links and Cloudflare live version/source verification; physical device testing not claimed by emulation. Rollback reverts UI source only, no schema/data changes.

## 2026-11-01 | AkiPasa light-theme portrait header and launch marquee

- **Observed:** Actual Android Chrome screenshots show the consumer portrait/mobile header and launch strip retaining their dark palette after choosing light mode, while the desktop/landscape discovery rail is correctly light. The cause is hard-coded night colours in `PasaCinematic.css` for the mobile header and its controls, plus theme-unaware `LaunchRibbon.module.css`.
- **Change:** On mobile shell widths up to 850px, apply `html[data-theme="light"]` cream background, navy wordmark/icons and light, bordered menu/search controls. The reusable EN/ES marquee now uses the same cream/light ink and accessible orange roadmap link for all viewport widths. Preserve the existing dark palette, orange brand mark, announcement content/animation/reduced-motion, 44px touch targets, inset/header geometry, and landscape rail without restructuring navigation.
- **Boundaries:** AkiPasa client-side styling and Home browser regression only. No session/theme persistence logic, other suite host, auth/roles, database, API, analytics, personal data, consent, payment, CI or release flag changes.
- **Evidence/gate:** Home EN/ES, dark/light, 360/390/820/1440 viewport browser assertions cover computed header, launcher, search, marquee colours and unchanged image adjacency. New tests toggle light through the real More sheet, rotate 390x844 -> 844x390 -> 390x844 and reload, checking persistence and actual computed styling. Require fresh exact-head checks plus verified production Cloudflare build/deployment; test emulation is not physical Android certification. Rollback is CSS/test/doc-only.

## 2026-11-01 | Theme parity for canonical consumer dock and photographic Home controls

- **Owner evidence and request:** Android Chrome screenshots show cream light-mode AkiPasa header, announcement and page, but the fixed five-item consumer bottom dock remains dark. Owner also requests polished light/dark treatment for the Home "What are you in the mood for?" search, quick plan chips (Today/Tonight/This weekend/Free plans/Map), and relevant controls, not just the dock.
- **Root cause:** `PasaBottomDock.css` uses hard-coded near-black dock background and pale text regardless of `data-theme`. The `PlansFirstHero.module.css` plan links and `VenueQuickSearch.module.css` hero variant likewise lock dark surfaces; the photographic hero itself intentionally needs a dark gradient for the white headline.
- **Change:** AkiPasa-only, `html[data-theme="light"]` scoped warm cream dock with dark readable icon labels, clear orange active state and unchanged orange/white central Check-in treatment. Light search and dropdown receive cream/white surfaces, navy text, readable placeholders, search glyph, status/retry, focus and result states. Light quick-plan links use cream/navy surfaces and a saturated orange first action. Dark appearance and photographic contrast stay unchanged; all touch sizes, safe-area padding, focus, EN/ES labels and hrefs persist. At >=851px the existing responsive desktop sidebar remains canonical.
- **Scope and permissions:** Shared `PasaBottomDock` appears on Home, Map, Check-in, Community and signed-in Profile via the existing `AppShell`; the Auth/operations/owner-focus exceptions stay unchanged. No data, auth, RLS, API, Supabase, Cloudflare environment, analytics, email, sponsorship, payments, tracking, locale routing, map positioning or other AkiSuite host changes.
- **Evidence required:** Extend existing EN/ES dark/light Home browser matrix at 360/390/820/1440 for real computed dock/search/chip colours; add cross-route 390px and orientation 820/900px dock checks, including active destination, five labels and Check-in tap target. Regression also covers reduced motion and existing theme-toggle/landscape persistence. Fresh exact-head npm/check, browser, Cloudflare build and live read-only smoke required before completion. No claim of physical Android-device proof from emulation. CSS-only rollback; no schema or user data migration.

## 2026-11-01 | Exclusive discovery artwork and readable card surfaces

**Owner correction.** Follow-up screenshots after #352 show the storefront under transparent venue logos and pale, unreadable text in both themes. The shared component rendered both images simultaneously. The Home gradient reused the global card pseudo-element, whose existing opacity:0 and height:3px rules disabled that contrast layer. Earlier HTTP/source checks did not establish rendered visual acceptance.

**Runtime contract.** DiscoveryArtwork renders exactly one image: the selected published asset, or the neutral storefront when absent or failed. Source changes reset failure state. Transparency reveals only a white light-theme or black dark-theme backing, never the fallback illustration. The fallback SVG itself is transparent grey line art. Home cards put artwork above a solid themed information area rather than overlaying names/addresses/distances on imagery; claim labels have their own opaque backgrounds. Both themes retain readable text and keyboard focus. Home, Map and Event reuse the corrected shared artwork; event/map-specific media priority stays unchanged.

**Scope and dependencies.** Four runtime files only: DiscoveryArtwork component/styles, Home venue card styles and the storefront SVG. Existing AkiHQ Explore selection, claim metadata, public RLS/storage signing, URLs, pagination, locale handling, analytics and private AkiPals access are unchanged. No SQL, customer data, auth, secrets, billing or provider configuration changes. Rollback reverts these UI sources without touching stored media.

**Verification gates.** The new maintained browser suite exercises actual compiled artwork with transparent, absent and HTTP-failed images, recovery and live theme switching; screenshots sample the rendered transparent corner pixels. Actual Next Home in EN/ES at phone/desktop widths verifies one image, physical text/artwork separation, solid theme colours, absent hover-overlay dependency and at least 4.5:1 label contrast. Existing responsive Home, Map, Event and cross-app CI remain required. Inspect rendered evidence before merging; verify the exact deployed source and live DOM/image loading afterwards. Browser emulation is not physical Android certification. No pass or live release is claimed by this contract entry alone.
