# AkiSuite clean-slate recovery — 24 October 2026

Mission status: IN PROGRESS. This is an evidence ledger, not a claim of complete
production acceptance. Coordinator: [akipasa#284](https://github.com/elguiriashing/akipasa/issues/284).

## Authoritative product boundaries

AkiPasa, AkiDuermo and AkiCoches are independent discovery applications.
AkiHQ is their free management hub. AkiBusiness is paid operations software.
Retain existing user identities, historical subscriptions, independent rental and
property ownership, host-only sessions, RLS and existing release safeguards.

## Starting repository inventory

| Repository  | Production branch | Starting source                          | Starting open PRs     |
| ----------- | ----------------- | ---------------------------------------- | --------------------- |
| akipasa     | master            | 75ff7ee913461431a5d3d2aca7bdae780b88ca1e | 283, 277, 276, 271, 8 |
| AkiDuermo   | main              | 09c1b8a46b76310c64867e28ae2b21423c116269 | 37                    |
| AkiCoches   | main              | da5444e84bd93150b4d76f109d4e7dc6ef332d01 | 41                    |
| akihq       | main              | b8496ec095943f7b54c8d07f84567dbacea1421f | 61                    |
| AkiBusiness | main              | ebf295cb5b06c2c760c7f69ab62a3f7b25dfd30f | none                  |

GitHub was re-queried. The attached handoff's ninth PR, AkiBusiness#44, was
already merged. All five production branches reported unprotected at inspection;
this does not waive required checks or permit unsafe releases.

## Completed recovery decisions

- AkiPasa#283 merged as ec1a5d1a084b29b80f0d3b641f85a2f8f2da3641.
  Exact head d2b3fbc passed contract, format, full check, account, public,
  onboarding, booking, three tablet jobs and Cloudflare build checks.
  The old selector review is corrected in the actual discovery browser test
  and its obsolete thread was resolved.
- AkiPasa#277, AkiDuermo#37 and AkiCoches#41 closed as superseded without
  merging. Branches/commits remain intact and each PR has an explanation.
- The shared audience component and CSS are byte-identical across the three
  current discovery sources. Their SHA256 values are
  a163d6d940da2c2042705a785b99fd8b75813d1c0f872c3f2a39793289dfd06e and
  450ae9de832eaa6c459883f3503ef5d4091ee76bb740ab70f78ca894c96d87c1.
- Local AkiPasa membership render/UI/checkout regressions: 20/20 passed on
  reviewed source. Existing provider/checkout gates were preserved.
- Business password recovery/release/integration regressions: 15/15 passed
  after installing the locked gateway dependencies; suite navigation 14/14.
  The first recovery-test attempt failed only because jsdom was not installed;
  the successful rerun is the acceptance result.

## Production evidence and pending rollout

| Product     | Provider evidence                                                                                                       | Runtime evidence / remaining check                                                                                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AkiBusiness | Pages akibusiness-selfowned-staging, main ebf295c, successful canonical deployment afdc29e1-e4a8-4a4f-92a7-fdd1cae74d25 | release-source.json matches ebf295c; anonymous login HTTP 200; existing browser session reaches app dashboard without redirect loop. Fresh signed-out OAuth/recovery remains separate. |
| AkiPasa     | Worker akipasa; prior active version 67a60a9d-bf09-49ef-8e55-70f5e91b3c0c                                               | #283 merged; wait for its production build and verify exact merged SHA plus EN/ES membership and homepage.                                                                             |
| AkiDuermo   | Worker akiduermo; prior active version 626e9cff-e57d-47ee-86c7-e4727e04c58c                                             | Live membership still showed five-card design. Pin advanced from 890e295 to CI-passed 09c1b8a; build bad3df02-cd3d-46ee-a85f-46b11316d410 queued. Verify completion and exact source.  |
| AkiCoches   | Worker akicoches; active version 92de2c07-0c96-409e-aa01-3116c60899a7                                                   | Main da5444e must be compared with release-source and actual membership behavior.                                                                                                      |
| AkiHQ       | Canonical akihq.app maps to Worker akihq-management-preview, active version 9c383c2c-aa1e-4199-9893-8fded6b4c101        | Verify source b8496ec on actual canonical Worker. Pages akihq success alone is insufficient because its domains include legacy crm.akipasa.com.                                        |
| QR hub      | qr.akihq.app maps to Worker akihq-qr-hub, version 06a1ed02-0b2a-4410-a50b-5b7c88b27e78                                  | Check personal/business journey and source colors: Pasa orange, HQ yellow, Business purple.                                                                                            |

The existing Cloudflare credentials/connections work. The terminal contains no
Cloudflare deployment token; use the connected, source-stamped Workers Builds
and Pages paths. Do not request unnecessary reconnects or invent deployment success.

## Remaining PR dependency decisions

| PR          | Classification | Exact next step                                                                                                                             |
| ----------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| akipasa#276 | PARTIAL        | Incorporate this recovery ledger, require fresh exact-head CI, merge documentation safely.                                                  |
| akipasa#271 | BLOCKED        | Resolve current-master conflict only with accepted HQ#77 Pulse schema/own-export dependencies; keep complete-export failure behavior.       |
| akihq#61    | BLOCKED        | Reconcile current-main conflicts and verify installed library functions plus strict-upload/provider acceptance before dependent UI release. |
| akipasa#8   | BLOCKED        | Preserve draft/noindex and existing terms acceptance version until counsel/operational evidence gates are actually satisfied.               |

## Shared database read-only checkpoint

Connected project vhpbvcfkcteswlsdjrfl is ACTIVE_HEALTHY; its label is AkiPasa
Development, while repository release evidence identifies it as the shared live
backend. Native property and disabled commercial-funnel phases are already in
migration history; do not replay them.

The actual public function catalogue lacks akipulse_scopes_v2 and
my_pulse_management_export_page. HQ's nine staged additive Pulse migrations
include explicit scope adapters, organization/native/rental reports and own
management-history export. Their presence in Git is not installation evidence.
The private account_features_allowed helper exists with authenticated execution
and anonymous execution denied.

Security/performance advisor results were fetched and retained for classification.
Private deny-all RLS tables are not automatically vulnerabilities. #207 owns the
backlog. Review each exposed table/view/function and intended caller before any
policy/grant change. No database schema, customer row or feature gate was changed
by this checkpoint.

## Historical requirement ownership and acceptance

| Workstream                 | State at recovery | Authoritative tracking / remaining evidence                                                                                                          |
| -------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Membership presentation    | PARTIAL           | #200 and merged #283; complete all three exact-SHA production/EN/ES/responsive checks. Older five-card requests are superseded.                      |
| Cross-domain auth          | PARTIAL           | Existing host-only identity paths; safe signed-out/login/callback/recovery/logout/role acceptance on all five products.                              |
| ISP connectivity           | BLOCKED           | #203; remote success cannot resolve affected Spanish ISP evidence. Need affected-network trace/TCP/TLS comparison. Do not rewrite DNS speculatively. |
| Independent property model | PARTIAL           | AkiDuermo#17; native schema is installed disabled, legacy bookings remain authoritative until accepted cutover.                                      |
| Stay bookings              | BLOCKED           | AkiDuermo#20; disposable authenticated guest/owner, concurrency, cancellation and history acceptance.                                                |
| Venue bookings             | PARTIAL           | #72; existing resources/offering/slot engine, confirm actual safe production acceptance.                                                             |
| Rentals                    | PARTIAL           | Independent branches/fleets/request semantics exist; verify owned/foreign roles and overlap without false confirmations.                             |
| Organisation/team tools    | PARTIAL           | #284 coordination; verify independent locations, invitation access, revocation and server-scoped delegation.                                         |
| Toolbox/billing            | PARTIAL           | #124 and current runbooks; verify 4/8/12 tools, monthly cycle replacement and legacy continuity. No new prices/customer migration by inference.      |
| Pulse/export               | BLOCKED           | #271 and HQ#77 nine schema phases; never hide a missing export section behind an unrelated feature flag.                                             |
| Premium templates/media    | BLOCKED           | HQ#61; schema and real strict-upload/library acceptance.                                                                                             |
| Claims/notifications       | PARTIAL           | Existing submission/decision/outbox contracts; verify owned listing becomes non-claimable and provider acceptance without bulk replay.               |
| Search/map/data quality    | PARTIAL           | #284; preserve quarantine/location corrections, verify literal name/city/address and map/list parity. No approximate mass deletion.                  |
| Passport/Pals              | PARTIAL           | #284; source foundations exist; public launch/physical rewards/monetization are not inferred from a private preview.                                 |
| PoS/hospitality            | BLOCKED           | AkiBusiness#25; code/testing evidence separate from authenticated tablet/service acceptance.                                                         |
| Printers/devices           | BLOCKED           | AkiBusiness#24; actual 58/80 mm/bar/kitchen hardware and disconnect/retry acceptance required.                                                       |
| Payment processing         | BLOCKED           | AkiBusiness#23; recorded tender is not captured payment. No real charge/refund authorized.                                                           |
| Spanish fiscal issuance    | BLOCKED           | AkiBusiness#22; official specifications/professional acceptance; retain disabled fiscal issuance.                                                    |
| Android/store              | PARTIAL           | #185, AkiDuermo#18, AkiBusiness#27; preserve package/signing continuity; store approval and real-device acceptance are external gates.               |
| Legal                      | BLOCKED           | #8 and AkiDuermo#19; updated incorporation documents do not replace professional review.                                                             |
| GA4/SEO/performance        | PARTIAL           | #284; GA4 command-envelope repair exists; verify consent-aware collection and current crawl/source behavior before claiming recovery.                |
| QR/brand links             | PARTIAL           | #284; verify canonical destinations and actual source assets/colors.                                                                                 |

## Recovery and reporting

Hourly separate-task progress updates are enabled at Alex's request after the
15-minute scheduling limit was explained. These inspect observable evidence;
they cannot detect whether the active engineering chat is frozen. They must
never claim background execution based only on a lack of commits.

After each meaningful milestone, update #284 with merge/build/source/test evidence.
Before final handoff, refresh this document and produce the requested PASS/FAIL/
BLOCKED scorecard. The mission is not complete while critical acceptance remains
unverified. Keep independent safe engineering moving while external gates wait.
