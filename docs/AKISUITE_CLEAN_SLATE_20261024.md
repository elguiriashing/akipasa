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
- At the first audience recovery checkpoint, the shared component and CSS were
  byte-identical across the three discovery sources. Their then-current SHA256 values were
  a163d6d940da2c2042705a785b99fd8b75813d1c0f872c3f2a39793289dfd06e and
  450ae9de832eaa6c459883f3503ef5d4091ee76bb740ab70f78ca894c96d87c1.
- Local AkiPasa membership render/UI/checkout regressions: 20/20 passed on
  reviewed source. Existing provider/checkout gates were preserved.
- Business password recovery/release/integration regressions: 15/15 passed
  after installing the locked gateway dependencies; suite navigation 14/14.
  The first recovery-test attempt failed only because jsdom was not installed;
  the successful rerun is the acceptance result.

## Current recovery milestones

- AkiPasa#276 merged as `5d3afa13e2ab5ae242d8803960f727b1da22a773` after
  fresh green CI, preserving this ledger and historical recovery evidence.
- AkiPasa#271 reconciled current master, passed full local checks, 21 private
  export cases and every exact-head hosted check, then merged as
  `9cde05250dec9fd77020ce0631c556c77b1872bb`.
- AkiHQ#61 reconciled current main and its test inventory, fixed the fleet media
  caller's missing Premium/library props, passed 43 focused cases, full local
  checks and hosted CI, then merged as `e7bffb655b3a602ca0b4661a1ab0eea213fc9205`.
  This releases gated source; library/upload activation and real Storage
  acceptance remain separate.
- Installed all nine reviewed Pulse schema phases on the confirmed shared
  project. All eleven public function bodies matched canonical source; own
  management-export role probes passed with rollback-only empty synthetic
  identity reads. Canonical/provider history, hashes and one precisely verified
  idempotent timestamp-collision recovery are archived in
  `receipts/AKIPULSE_SCHEMA_20261024.json`. No historical rows were rewritten.
- AkiDuermo's stale deployment pin was advanced only to CI-passed main
  `09c1b8a46b76310c64867e28ae2b21423c116269`. Provider build
  `bad3df02-cd3d-46ee-a85f-46b11316d410` succeeded. The exact live source and new
  audience UI were observed. The source-pin safeguard remains intact.
- Before the pricing amendment, all five homepages and exact release stamps
  were read successfully. Membership cards were inspected on Pasa, Duermo and
  Coches, including EN/ES and narrow layouts, without payment or customer writes.
- Anonymous account routes for HQ, Duermo, Coches and Pasa reach their proper
  local sign-in screens with bounded local return paths. Business's anonymous
  login renders without the previous redirect loop. Full OAuth, recovery,
  refresh-token and authenticated role acceptance are not inferred from forms.

## Approved pricing amendment and current release work

Alex explicitly superseded previous prices and public tier names on 24 October.
See [the full pricing contract](APPROVED_PRICING_20261024.md) and the identical
`config/approved-pricing.json` catalogues in all five repositories.

AkiBusiness Basic/Standard/Pro are €19.99/€48.99/€97.99 monthly per operating
location. Each discovery product's individual Premium is €1.99/month. Business
Premium is AkiPasa €11.99, AkiDuermo €24.99 and AkiCoches €19.99 monthly, upgrading
that product's free AkiHQ experience. No new annual price is inferred.

Nine new named Stripe price/product records were created in the confirmed live
account. Four active subscriptions still use their existing legacy prices; none
were charged, repriced or migrated. No renewal schedule was created.
The additive two-function exact-price guard is installed as provider history
`20261024005037` and read back against canonical source. Ownership, security
search path and anonymous denial are retained. The local lifecycle/role suite
passes 36/36. Receipts: `receipts/APPROVED_PRICING_20261024.json`.

Current source changes update public audience cards, AkiHQ comparisons, account
and growth copy, server pricing checks, Business landing/comparison/toolbox,
EN/ES upgrade CTAs, source bindings and cache versions. The Business fallback
workflow also corrects its retired Pages target to the already canonical
`akibusiness-selfowned-staging`, with strict owner/repository/branch/source checks.
Full local source/build checks and fresh exact-head hosted CI passed. All five
canonical production releases and their EN/ES prices were observed. The pricing
presentation release is PASS; new checkout/entitlement activation remains BLOCKED
by the pre-existing acceptance gates. See
`receipts/APPROVED_PRICING_RELEASE_20261024.json` for the immutable release snapshot.

| Product     | Reviewed merge / live source at acceptance                                    | Provider release evidence                                                                                                                                            |
| ----------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AkiPasa     | `d336749d74d19da8193e664ea765edda9985bc03` (#285)                             | Worker build `a91635a0-6322-4fa5-9426-731fbf357605` succeeded; live source matched; both audiences EN/ES verified.                                                   |
| AkiDuermo   | `83e5898b4655e5a5c11f4431228361741282eb46` (#40)                              | Worker build `41bdb10a-d3f2-472e-bc6a-a4fb2edd2ae5` succeeded after advancing the protected source pin to reviewed main; both audiences EN/ES verified.              |
| AkiCoches   | `c135e537c622e26d9478d7b1c75b5e457aadc351` (#43)                              | Worker build `df4ea7c7-d5b0-4475-a067-0aa65bb6be0b` succeeded; both audiences EN/ES verified.                                                                        |
| AkiHQ       | `74679795a9702b7f4dd0a33df381d6d88b81939d` (#83)                              | Fresh Worker build `4b37b9c1-d87f-4f69-884d-f0f6d3a63f86` succeeded; EN/ES membership verified.                                                                      |
| AkiBusiness | `190be837d1d7ba3f404309955647b7b4b8dd8a53` (#45 pricing, #46 manual fallback) | Canonical Pages deployment `e977fddc-e127-42ab-8293-62c0a51affa0` succeeded; clean live source matched; Basic/Standard/Pro and tier-specific account links verified. |

AkiHQ's first successful provider build returned 1105 on the live membership
route. The prior runtime was immediately restored, then the unchanged reviewed
source was freshly built and deployed. Both locale routes now render correctly;
the initial error's cause is unproven. Packaged local workerd requests also returned
200 in both languages. Provider success alone was not accepted as a live pass.

AkiBusiness's optional GitHub publisher lacked its separate token, while the
canonical connected Cloudflare deployment worked. #46 keeps that fallback manual
and preserves all target/token checks; no new credential or wider permission was
created.

The three discovery audience components remain byte-identical with current
SHA256 `cd20af892bf10be96dba428546008c1f5bfaaaccc439bb15d3d1893d0d9bdb51`;
their CSS remains `450ae9de832eaa6c459883f3503ef5d4091ee76bb740ab70f78ca894c96d87c1`.
All five approved-pricing JSON files are byte-identical with SHA256
`46ed8a3c8c3084fb0b34e5bc0fcc75ab9a957c56e0a8abf6d1a11589a22a5631`.

Active Pasa version `986b244a-a4f8-4bbc-a954-88a16051c5d0` has all 53 prior
bindings, with only the three approved monthly price IDs changed. The eight
secret bindings, annual/legacy offers and all other bindings are unchanged.
Checkout/subscription/tax gates remain false. No separate settings patch was
needed: the reviewed source deployment applied the explicit price bindings.
Read-only Stripe recheck still found four active legacy subscriptions, each on
its original price and without a schedule, and zero subscription schedules.
The database still has three legacy bindings and three queued migration commands;
none were executed or regenerated by this release.

## Canonical provider mapping and acceptance limits

| Product     | Existing production target                                | Evidence / release gate                                                                                                                                     |
| ----------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AkiPasa     | Worker `akipasa`, repository `master`                     | Pricing source `d336749d` verified live with correct EN/ES individual/business prices and gates.                                                            |
| AkiDuermo   | Worker `akiduermo`, repository `main`                     | Pricing source `83e5898b` verified live; protected source pin retained.                                                                                     |
| AkiCoches   | Worker `akicoches`, repository `main`                     | Pricing source `c135e537` verified live.                                                                                                                    |
| AkiHQ       | Worker `akihq-management-preview`, repository `main`      | Canonical `akihq.app`; Pages `akihq` serves legacy CRM and cannot establish canonical rollout.                                                              |
| AkiBusiness | Pages `akibusiness-selfowned-staging`, `AkiBusiness/main` | Canonical `akibusiness.com` and `operations.akipasa.com`; old `akibusiness-operations-preview` is historical.                                               |
| QR hub      | Worker `akihq-qr-hub`                                     | Complete public audience journeys observed: free yellow HQ, purple Business operations, orange Pasa, mint Duermo and coral Coches; canonical links correct. |

Cloudflare, GitHub and Supabase connectors work. The local connected browser
became unavailable during the pricing amendment; the separate cloud browser can
still inspect public live UI. Direct terminal requests later received network
403s on all five domains; that does not establish a production outage.
Do not invent successful live checks from provider/CI alone.

## Database and activation boundaries

Project `vhpbvcfkcteswlsdjrfl` is the confirmed shared backend, despite its
Development label. Pulse and revised price validation are now installed. Native
property inventory, the commercial-funnel database switch and listing library /
strict upload switches remain disabled; source readiness is not activation.
Existing role/RLS, mapping history, customer data and old booking authority are
preserved. Advisors were retrieved; intentional private deny-all tables are not
repaired by broadening access. Existing issue #207 retains advisor ownership.

The only remaining old PR is legal draft AkiPasa#8: retain draft/noindex and legal
acceptance version until professional and operational evidence gates are met.
All five pricing candidates are merged and their canonical live source stamps
were verified. This ledger records acceptance at that checkpoint; later
documentation-only commits may advance the public source stamp.

## Historical requirement ownership and acceptance

| Workstream                 | State at recovery | Authoritative tracking / remaining evidence                                                                                                                                                                                                                                                                           |
| -------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Membership presentation    | PASS (bounded)    | Approved names/prices, free HQ distinction and stronger EN/ES business CTAs verified on all five live products; source/build/hosted responsive checks passed. Current production pricing was inspected at desktop width; physical mobile acceptance remains separate. #200 retains checkout/entitlement launch gates. |
| Cross-domain auth          | PARTIAL           | Existing host-only identity paths; safe signed-out/login/callback/recovery/logout/role acceptance on all five products.                                                                                                                                                                                               |
| ISP connectivity           | BLOCKED           | #203; remote success cannot resolve affected Spanish ISP evidence. Need affected-network trace/TCP/TLS comparison. Do not rewrite DNS speculatively.                                                                                                                                                                  |
| Independent property model | PARTIAL           | AkiDuermo#17; native schema is installed disabled, legacy bookings remain authoritative until accepted cutover.                                                                                                                                                                                                       |
| Stay bookings              | BLOCKED           | AkiDuermo#20; disposable authenticated guest/owner, concurrency, cancellation and history acceptance.                                                                                                                                                                                                                 |
| Venue bookings             | PARTIAL           | #72; existing resources/offering/slot engine, confirm actual safe production acceptance.                                                                                                                                                                                                                              |
| Rentals                    | PARTIAL           | Independent branches/fleets/request semantics exist; verify owned/foreign roles and overlap without false confirmations.                                                                                                                                                                                              |
| Organisation/team tools    | PARTIAL           | #284 coordination; verify independent locations, invitation access, revocation and server-scoped delegation.                                                                                                                                                                                                          |
| Toolbox/billing            | PARTIAL           | #124 and current runbooks; verify 4/8/12 tools, monthly cycle replacement and legacy continuity. 24 October explicit pricing approval supersedes old amounts; customer migrations still require reviewed execution.                                                                                                   |
| Pulse/export               | PARTIAL           | Nine schema phases and #271 merged; preserve whole-export failure behavior and complete authenticated acceptance.                                                                                                                                                                                                     |
| Premium templates/media    | PARTIAL           | HQ#61 merged gated; real strict-upload/library acceptance remains.                                                                                                                                                                                                                                                    |
| Claims/notifications       | PARTIAL           | Existing submission/decision/outbox contracts; verify owned listing becomes non-claimable and provider acceptance without bulk replay.                                                                                                                                                                                |
| Search/map/data quality    | PARTIAL           | #284; preserve quarantine/location corrections, verify literal name/city/address and map/list parity. No approximate mass deletion.                                                                                                                                                                                   |
| Passport/Pals              | PARTIAL           | #284; source foundations exist; public launch/physical rewards/monetization are not inferred from a private preview.                                                                                                                                                                                                  |
| PoS/hospitality            | BLOCKED           | AkiBusiness#25; code/testing evidence separate from authenticated tablet/service acceptance.                                                                                                                                                                                                                          |
| Printers/devices           | BLOCKED           | AkiBusiness#24; actual 58/80 mm/bar/kitchen hardware and disconnect/retry acceptance required.                                                                                                                                                                                                                        |
| Payment processing         | BLOCKED           | AkiBusiness#23; recorded tender is not captured payment. No real charge/refund authorized.                                                                                                                                                                                                                            |
| Spanish fiscal issuance    | BLOCKED           | AkiBusiness#22; official specifications/professional acceptance; retain disabled fiscal issuance.                                                                                                                                                                                                                     |
| Android/store              | PARTIAL           | #185, AkiDuermo#18, AkiBusiness#27; preserve package/signing continuity; store approval and real-device acceptance are external gates.                                                                                                                                                                                |
| Legal                      | BLOCKED           | #8 and AkiDuermo#19; updated incorporation documents do not replace professional review.                                                                                                                                                                                                                              |
| GA4/SEO/performance        | PARTIAL           | #284; GA4 command-envelope repair exists; verify consent-aware collection and current crawl/source behavior before claiming recovery.                                                                                                                                                                                 |
| QR/brand links             | PASS (public)     | #284; root-to-business and root-to-discovery journeys, colors and canonical product links observed in the live browser.                                                                                                                                                                                               |

## Recovery and reporting

Hourly separate-task progress updates are enabled at Alex's request after the
15-minute scheduling limit was explained. These inspect observable evidence;
they cannot detect whether the active engineering chat is frozen. They must
never claim background execution based only on a lack of commits.

After each meaningful milestone, update #284 with merge/build/source/test evidence.
Before final handoff, refresh this document and produce the requested PASS/FAIL/
BLOCKED scorecard. The mission is not complete while critical acceptance remains
unverified. Keep independent safe engineering moving while external gates wait.

The pricing and public QR rows above are bounded PASS results. Historical
failed attempts (the first HQ deployment and optional Business publisher) were
recovered and are retained as incident evidence, not hidden or presented as
current failures. All remaining PARTIAL/BLOCKED rows still require their stated
evidence; this pricing release does not certify the entire clean-slate mission.

Queued migration commands now bind their reviewed catalogue version and target price
in the immutable snapshot. Commands lacking that binding or naming an old offer
are blocked before any Stripe write. The three pre-existing queued commands need
a separately reviewed migration decision; this pricing release does not execute or
regenerate them. Regression cases cover missing, old-version and wrong-price approvals.
