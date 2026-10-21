# AkiSuite master mission: delivery and release status

Checkpoint: **21 October 2026**. This is a reconciled delivery ledger, not a claim
that the mission is complete. GitHub source/CI was read for this report; production
and database observations below are explicitly attributed to the release manager.
Public marker checks were supplied around **13:50 UTC**, followed by the
**14:02 UTC** HQ readback below.
Later updates are identified separately. This documentation task changes no
application, database, primary branch, provider configuration or customer record.

This report supplements, rather than replaces, the historical
[mission integration](AKISUITE_MISSION_INTEGRATION.md) and
[post-migration integration](AKISUITE_POST_MIGRATION_INTEGRATION.md) records. Their
candidate-era statements about unapplied SQL, flags and unmerged source are not
current operational instructions. Use the applied-state ledger below before any
DDL; do not replay historical table-creating or anchor-based migrations.

## A. Executive summary

The five applications remain independent. AkiPasa discovers venues/events,
AkiDuermo accommodation, and AkiCoches rentals. **AkiHQ is the free management hub;
AkiBusiness is the paid operating suite.** Shared identity and scoped permissions
are retained. No historical repository-role reversal or monorepo is introduced.

The toolbox, operating billing/recovery, staff intersections, listing safeguards,
referral infrastructure, private exports, profile completion, prestige and language
contracts have substantial implemented and tested source. The supported Next 16
Pasa integration 252 is merged; current Pasa f1e99f19 also includes subsequent work.
HQ, Business and Coches public source markers match their current primaries;
Pasa's newer merge awaits production identity verification.
**Duermo production still serves edd37 while main is 2df3**, so the new all-five
roundtrip cannot be called production complete.

The three authorised legacy customer commands remain **queued with zero attempts**
at the last manager check. Merchant verification fails despite configured binding
presence. **No customer schedule, subscription change or new entitlement is claimed.**
Diagnostics are being extended, not bypassed; financial migration closure is pending.

Listing activation flags remain off, the onboarding cohort is NULL, and there are
zero prestige/referral programmes; cash payouts remain disabled. The trusted funnel
schema has now been installed through eleven bounded phases; collection stays off. Independent native
property implementation is engineering work in progress: Pasa 260 and HQ 72/73
are merged with their consumers gated. HQ e249 is now verified live; the newer Pasa
marker is not yet verified. Existing customer records are preserved.

Current public operating labels are **Standard / Plus / Pro**, deliberately merged
through separate work across the five products. The mission specified
**Básico / Standard / Pro**. This conflict is **not resolved by this report**: the
4/8/12 mechanics must not be silently assigned to the wrong displayed Standard.
No price, Stripe identifier or commercial naming decision is changed here.

The release manager confirmed the approved monthly amounts and stable plan keys:

| Stable billing key | Mission name | Current public label | EUR per location/month | Active tools | Replacements per monthly rotation   |
| ------------------ | ------------ | -------------------- | ---------------------- | ------------ | ----------------------------------- |
| basico             | Básico       | Standard             | 24.99                  | 4 of 12      | 1                                   |
| standard           | Standard     | Plus                 | 44.99                  | 8 of 12      | 2                                   |
| pro                | Pro          | Pro                  | 64.99                  | All 12       | Unrestricted; no selection required |

This mapping records the conflict; it does not approve a rename or infer billing
identity from display text. No tax arrangement or new Stripe identifier is inferred.
The three authorised legacy customers' valid **100% forever coupons** and existing
paid-through renewal dates must be preserved. The migration must create **zero
immediate invoices, prorations or new subscriptions**. Personal subscriptions remain
unchanged. A queued command is not evidence that any customer has migrated.

A separate **critical platform permission blocker** remains: the release manager
observed anonymous/authenticated write and TRUNCATE exposure on spatial_ref_sys,
which is owned by Supabase_admin. HQ59's source fix is merged, but the actual apply
failed with 42501 and rolled back. Repair requires the provider/extension owner;
there is no self-escalation or successful live repair claim. Repeated Cloudflare
connector **MCP-32603** errors also make its API unusable, blocking the gateway
release path and Duermo source-pin changes. Browser fallback is not approved.
These are engineering/provider dependencies, not new business-decision gates.

## B. Feature-by-feature status matrix

“Tested” means the bounded automated/role evidence described in section F, not a
live paid/private journey. “Merged” includes source integrated through 252 even if
an original feature PR remains open. Production source identity is distinct from
feature activation, actual-role acceptance and external-provider success.

### Foundations and subscription toolbox (mission 1,2,10)

| Requirement                                                      | Implementation / testing                                                                                                                   | Merge status                                                    | Production / remaining gate                                                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Five repositories, correct product roles, shared identity        | Independent source and release contracts; existing users/ownership retained                                                                | Pasa 252 and independent releases                               | Four fresh current markers, including HQ e249; Duermo source pin unresolved. No role reversal                  |
| Canonical 12 tools                                               | crm, inbox, tasks, calendar, inventory, pos, sales, marketing, automation, collaboration, employees, **knowledge**; source catalogue tests | Toolbox29 via Business integration; Pasa 252                    | Catalogue implemented; analytics/dashboard/integrations/admin are shells, not a13th tool                       |
| Tier sizes 4/8/12 and replacement allowances 1/2/unrestricted    | Server/SQL validation and retained active-versus-next selections                                                                           | Merged                                                          | New paid customer activation not verified; public naming conflict above remains                                |
| Draft saves cannot accumulate extra swaps                        | Differences measured against active selection; repeated-save/early-activation tests                                                        | Merged                                                          | Requires actual enrolled owner/API acceptance; three legacy customers unchanged                                |
| Fullscreen toolbox UI, allowance/reset/save/next date            | EN/ES responsive active/pending interface and browser fixtures                                                                             | Business source merged                                          | Authenticated live toolbox journey not accepted; public catalogue selector removed by 259 intentionally        |
| Monthly rotation, annual monthly anniversaries                   | Atomic idempotent rotation/history, anchored calendar and missed-run recovery; month-end/leap/timezone cases                               | Merged; toolbox/forward compatibility SQL installed per manager | No new production toolboxes/rotation completion claimed; actual scheduler/provider retry acceptance remains    |
| Upgrade/downgrade/effective paid dates/failure                   | Verified invoice/customer/location reconciliation; retained data and delayed effective changes                                             | Merged; operating foundations installed                         | Merchant/provider acceptance and actual paid journeys pending; failed payments must not grant access           |
| Trials, staff grants, legacy access and administrative overrides | Existing entitlement sources intersected; legacy records retained; provenance correction tested                                            | Merged; forward correction 181726 applied                       | Preserve legitimate existing access. No blanket old-plan remap or paid-feature revocation inferred             |
| Existing three approved customer migrations                      | Sealed scope/snapshot/preview/readback and service-only queue                                                                              | Queue/runtime source merged                                     | **Three queued, attempts 0; merchant rejection; not scheduled.** No immediate charge or duplicate subscription |
| Instant role/individual staff delegation                         | Licensed active tool AND workspace/location AND valid membership AND role/individual authority; direct RPC/RLS tests                       | Merged                                                          | Live owner/staff/leaver/multi-location/cache journey remains; delegation is not monthly locked                 |
| Orphaned grants and retained tool data                           | Underlying predicates re-evaluate active toolbox; removed tools denied; data retained                                                      | Merged                                                          | Actual rotation-plus-client-cache acceptance pending; frontend flags are not security                          |
| Owner rotation notifications                                     | Durable database outbox/inbox, independent central retry and scoped owner readers                                                          | Merged; private notification setting enabled per manager        | Prior drain enabledtrue/completed0/failed0: **no delivered/read notice claimed**. No new email sender          |
| Least privilege and migrations                                   | Explicit grants/RLS, definer boundaries, caller guards and additive forward repairs                                                        | Merged/applied where itemised inD                               | Do not replay applied source; provider, Storage and full authenticated acceptance remain                       |

The least-privilege matrix remains **blocked for the platform-owned extension**:
HQ59 is source-merged, but spatial_ref_sys's actual write/TRUNCATE grants remain
exposed after the 42501 rollback. Provider-owned extension repair is outstanding.
Cloudflare API/gateway and Duermo source-pin release dependencies also remain open.

### Free and Premium listings (mission 3)

| Requirement                                              | Implementation / testing                                                                                                       | Merge status                                                 | Production / remaining gate                                                                                                                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eight free /250 Premium photos, preserved older assets   | Standalone quota/history/reservations, placement counts and downgrade retention; SQL role fixtures                             | Merged252; schema installed per manager                      | **Listing flags all off. Target 8/250 is not claimed active live**; historic15-image documents are superseded policy history                                                       |
| Resolution/quality differences                           | Standard 1920px/JPEG0.8; Premium 3840px/JPEG0.9 preprocessing, bounded static JPEG/PNG/WebP inspection and digest/receipt path | Merged                                                       | Byte parsing is not full server pixel re-encoding. Real Storage/direct overwrite/provider acceptance pending                                                                       |
| Shared media, folders, templates and reuse               | Membership-scoped library, owned/placed counts, retained-ID/tombstone guards, no unused-picker double count                    | Merged252; existing library/identity/invariant SQL installed | Library remains off; strict verified uploads are a database prerequisite                                                                                                           |
| Free 4 distinct events/month, five Madrid calendar dates | Backend ledger, cross-month counting, edits/status/deletion/concurrency/legacy API controls                                    | Merged; event identity repair applied                        | Flags off; live publisher/legacy API/concurrency acceptance still required                                                                                                         |
| Free recurrence/templates/duplication restrictions       | Server guards; legitimate Premium recurrence and drafts retain data                                                            | Merged                                                       | No active Premium journey claimed; revalidate after verified checkout                                                                                                              |
| Perpetual/recreated/fake-event safeguards                | Duration/quota/identity protection and review signals, including UUID resurrection denial                                      | Merged234 via 252                                            | Moderation acceptance/tuning and legitimate festival cases remain; no claim of perfect automated fraud detection                                                                   |
| Contextual listing upgrades and preserved drafts         | Separate listing versus operations entitlement, bilingual gated handoff, pending payment confirmation                          | Merged                                                       | Checkout/tax/provider gates and real return revalidation remain; return URL alone is not payment proof                                                                             |
| Library-compatible authorised deletion                   | 014000 nullable SET NULL/cascade relations, archived-snapshot privacy and upload-receipt compatibility                         | Source merged                                                | **Manager now applied014000:** expected FKs/five indexes verified; 44 media/9 events unchanged; flags unchanged                                                                    |
| Independent native accommodation model/uploader          | Correct namespace accommodation_property_private; real-role quotas/receipt/privacy/inventory/review fixtures                   | **Pasa 260 and HQ 72/73 merged**                             | Corrected native foundation installed in 23 bounded phases; three gates false, 13 tables empty. Actual Storage journey pending; do not replay historical SQL or invent venue links |
| Native property media/management UX                      | HQ consumer reconciled with current management, task resume and loyalty; approval/revision and inventory scopes                | HQ 72 merge 69fe; HQ 73 merge e249                           | HQ e249 production identity verified at 14:02 UTC; new Pasa identity unverified; all required 260/72/73 CI passed; actual native Storage journey pending                           |

### Commercial conversion and language (mission 4,9)

| Requirement                                             | Implementation / testing                                                                                            | Merge status                                   | Production / remaining gate                                                                                                                                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Claim→free HQ→paid Business contextual CTAs             | Role/context-aware bilingual discovery and hub prompts; entitlement-aware/pending confirmation copy                 | Independent source merged                      | Current public releases partly verified; no claim of measured conversions or universal authenticated coverage                                                                                                      |
| Category-specific operating previews                    | Accurate capability examples/handoffs without fabricated sales/results                                              | Merged                                         | Real business-category and already-entitled acceptance remains; avoid duplicate irrelevant acquisition prompts                                                                                                     |
| Consent-aware impressions/clicks                        | Existing approved analytics and consent boundaries reused; denied tracking/withdrawal fixtures                      | Merged                                         | Observations are not verified claims/payments or causal attribution; no optional collection activation assumed                                                                                                     |
| Trusted claim/HQ/checkout/payment/upgrade/cancel stages | Future-only private proof ledger, tenant scope, bounded retention and own privacy export implemented                | 242/243 source via 252                         | **Canonical stage/proof/privacy schema now installed** in eleven bounded phases; enabled false, zero rows, candidate264 schema readiness declared true, runtime deployment unverified and no collection activation |
| Cross-domain referrals/EN–ES navigation                 | Canonical fixed product URLs, saved locale and safe referral/task envelope; malicious/duplicate redirect tests      | Source merged across products                  | Duermo production remains older source. All-five real email/Google/claim/payment roundtrip still incomplete                                                                                                        |
| All selector/mobile/account/auth/CTA paths              | Desktop/mobile selectors, management links and actual native completion callers retain language and bounded context | Source integrated, current releases in C       | Real authenticated cross-domain acceptance remains separate from source/rendered fixtures                                                                                                                          |
| Management scope after completion                       | Real property/company/organisation aliases, vehicle/dates/page and strict single public code                        | Pasa 252/HQ 70 and independent consumer source | Destination reauthorises scope; no query-supplied permission. Duermo pin and provider sessions remain                                                                                                              |

### AkiPulse and paid analytics (mission 5)

| Requirement                                      | Implementation / testing                                                                                                          | Merge status                                                 | Production / remaining gate                                                                                                                                      |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unified free Growth/Analytics workspace          | Overview, recorded interactions/events, current/prior periods, period/location controls, responsive EN/ES                         | HQ 50/58 integrated into current HQ                          | Earlier read-only Pulse activation/owner–foreign DB acceptance recorded; fresh current public marker verified, private UI not reaccepted                         |
| Organisation/venue/property/fleet bookings       | Manager-scoped bounded created-request cohorts/current statuses; explicit linked scopes and coverage exclusions                   | HQ 58 source/180504 applied                                  | No confirmation-time/payment/revenue/occupancy inference. Independent native property and org-fleet mappings remain engineering work                             |
| Explainable health                               | Listing completeness/readiness has measured components and recommendations                                                        | Merged                                                       | Broader engagement/operating health score is **partial**, not invented or complete                                                                               |
| Acquisition sources/conversion funnel            | Separate tenant stage backend source exists                                                                                       | Pasa 242/243 merged                                          | Stage schema installed; owner/foreign/privacy role checks passed with collection off; no accepted HQ consumer/causal attribution. Keep unavailable states honest |
| Paid PoS/stock/staff comparisons                 | Source tools pos/inventory/employees independently required; immutable events/valuation, equal local periods/DST, bounded exports | Business 32 via merged integration; SQL previously installed | Fresh advanced-report runtime/private session acceptance not supplied; no free HQ leak or13th tool                                                               |
| Revenue/cost/profit integrity and large datasets | Recorded currencies/sales separated from settlements; unknown costs stay unknown; partial/truncated indicators and bounded scopes | Source tested                                                | No fabricated profit, tips, unique visitors, productivity or sitewide Google venue attribution. Realistic query plans/load remain                                |

### Referrals and sales (mission 6)

| Requirement                                         | Implementation / testing                                                                                                                | Merge status                                       | Production / remaining gate                                                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Public/rep/partner programmes and unique codes      | Configurable products/dates/limits/prospective terms, immutable first capture and self/duplicate prevention                             | 213/221 via 252; foundation/review installed       | **Zero programmes; payouts/monetary CHECKs false.** Potential 10% is configurable, not activated                                |
| Public referral dashboard/share/history             | Own codes and privacy-safe counts/history; explicit account capture; strict cross-domain task code                                      | Source merged                                      | No real acquisition/signup/payment attribution accepted; Duermo old source remains relevant                                     |
| Rep leads/subscription/proposed eligibility/history | Approved-own access, private evaluator, bounded opaque invoices/reviews and current holds                                               | 237 via 252;234107 applied                         | Guard/exclusion/ACL readbacks accepted; presentation/readiness and actual rep sessions remain. No paid state or payable balance |
| Existing-customer exclusion                         | Legacy and actual optional private operating ledger checks; account guard/first attribution preserved                                   | 237 source merged; applied                         | Do not replay anchor-based234107. Merchant/customer conversion journey remains blocked                                          |
| Admin studio, disputes/fraud, approvals/export      | Admin-only configuration, immutable review/audit, idempotent staged approval and bounded export                                         | Source merged; review schema installed             | Private review/programme activation unapproved; no arbitrary reassignment or automated fraud adjudication claimed               |
| Verified Stripe conversion/retries/refund/dispute   | Single signed webhook, reconciled customer/subscription/invoice facts, independent event/invoice uniqueness, conservative dynamic holds | Source merged                                      | Signed isolated sandbox and live permitted webhook delivery acceptance still required; failed payment cannot earn commission    |
| Cash/tax/contractor/payout model                    | Financial rules prospective/configurable; actual transfer/disbursement deliberately absent                                              | Disabled by contract/source                        | Andrew/accounting/legal decisions remain. No invented percentage, recurring basis, threshold, schedule or tax approval          |
| Own privacy for customer/rep/admin records          | Caller-only twelve-section safe export, suspended/restricted access, complete bounded pagination and retained own shipping              | 248 via 252;001138 installed/reader declared ready | Own-role/ACL readbacks recorded; real privacy file/session acceptance remains. Third-party raw notes/IDs omitted explicitly     |

### Passport prestige (mission 7)

| Requirement                                               | Implementation / testing                                                                                                          | Merge status                           | Production / remaining gate                                                                                                                   |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Trusted digital trophies/certificates/profile/Hall/share  | Server natural-achievement verification, manual/test exclusion, opt-in visibility and revocation/privacy paths                    | 216 via 252; prestige schema installed | **Zero programmes; launch off.** No issued achievement, customer award or public Hall launch claimed                                          |
| Physical eligibility/serial/request/admin/shipping/status | Unique serials, private address intake/retention controls, admin review and manual delivery-state infrastructure                  | Source merged                          | Physical intake/delivery/ordering disabled; budget/criteria/procedures/purge acceptance required. No automatic order/purchase/shipment        |
| Difficulty/progression analysis                           | Existing ten categories, holographic50/category and city100; theoretical50–500 distinct places plus verified coverage constraints | Analysis documented                    | No supported two-to-three-year promise. Approve meaningful milestones using current actual coverage; existing progress retained               |
| Shipping export/deletion and financial audit integrity    | Own retained expired addresses exportable; existing cascade; review-actor blocking FK removed while actor UUID/history retained   | 248 merged/applied                     | UUIDs are pseudonymous, not anonymous. No invented financial retention period or automatic audit deletion; professional policy review remains |

### Identity, age and shared security (mission 8,10–13)

| Requirement                                      | Implementation / testing                                                                                                       | Merge status                                       | Production / remaining gate                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Email/Google first-login completion              | Username/minimal mandatory terms/adult declaration; optional avatar/bio; intended task resume                                  | Source merged, shared schema installed             | **Cohort NULL; no backfill/enrollment.** Actual provider/session acceptance and approved legal version remain                     |
| Server soft lock, staff/backwards compatibility  | Listed RPCs/predicates/mutations/Storage guarded; existing profiles exempt; stale-profile JWT repair                           | Source merged; coverage/repair applied per manager | All-five compatibility before cohort activation; do not indiscriminately lock existing users/staff                                |
| Underage negative state/retry and privacy safety | Persistent negative declaration; separate export/delete/privacy/recovery/sign-out paths                                        | Source/role/HTTP tests pass                        | No proof of verified age or prevention of lying/new accounts. Real support/appeal/privacy acceptance remains                      |
| GDPR/Spanish/DSA/Google/cookie review            | 20Oct legal engineering memo cites BOE/EUR-Lex/AEPD/EDPB/Google; separate terms/optional tracking; no ID/DOB sent to analytics | Memo and technical safeguards merged               | Professional legal approval still required; revalidate requirements at activation. An 18+ checkbox is not full compliance         |
| Security and release discipline                  | Fixed scopes/origins, RLS/grants, secrets server-only, immutable billing/audits, retained data, feature-specific rollback      | Tested source and itemised SQL/readbacks           | No live charge, payout, destructive migration or fulfilment authorised by this report; open deployment/acceptance gates stay open |

## C. Repository and source ledger

| Product     | Current primary / relevant merge                                                                                                                                                                                                                                                                                                                         | Production evidence supplied by manager                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| AkiPasa     | f1e99f19696da2d15334ed56d114433d4580d9b4 (261 from 6d6d56042d1ed60ef267d4f901efcbf8cdf333a0, after 260 from 5e8411148ce028587cca175a09272cc481132b2e), after 99feec0dc532598bb16f7a8b2afe8dad4752ef26;252 merged 93518afd38e99e007082265becc6b5dd29c24eea from 8798b77a80aa4289036b68d635e8c7df81c2d4ff;259 keeps public tool selection out of discovery | 99fe marker verified around 13:50; operations configured/billing/migrations true. “Configured” is binding presence only |
| AkiHQ       | Latest 73 merge e2492a4f09b46fa9987729fc04561f9a72fc76c6, after 72 merge 69fe676bdff90a8b30c9f196f724575cdd3e386b from source 065d093b0a9479f264fa750a74a6ec6b2f4cdf8a; prior main 781d6855adc172e355f83ca52d66b9be0de418ba includes 70/71                                                                                                               | **e2492a4f09b46fa9987729fc04561f9a72fc76c6 verified live at 14:02 UTC**. Both 72/73 consumers deployed but gated        |
| AkiBusiness | 8c81b12e7c2c353ba7540b9abb77ab9d47115317, merge 39 from 78ded8eb2d96d702ca03c7a9e60a110161c0a86e                                                                                                                                                                                                                                                         | 8c81 verified; clean role-swap true and product AkiBusiness. No actual paid tool/customer journey inferred              |
| AkiDuermo   | 2df3a8992c59a36eab69c23e88f9b5e407b4df17, merge 34 from e76b5f18cc529d0b833578665e1cc50a42ab461a                                                                                                                                                                                                                                                         | **Still edd37b5041950111cb2dc2e26ff62bc3560ae0ac**. Source pin blocks current deployment; do not call main live         |
| AkiCoches   | 756c83a9aed8ea1cdd7740bef0de4a008da02152, merge 38 from 9fab42f6ecd8c7ea39065dcb4055463d462f772e                                                                                                                                                                                                                                                         | 756c83 verified around 13:50; authenticated fleet/booking/management acceptance separate                                |

The release manager subsequently reviewed all required checks as successful and
merged Pasa 260 exact 5e8411148ce028587cca175a09272cc481132b2e as bea895b3;
HQ 72 exact 065d093 as 69fe676, then HQ 73 exact 93a56 as e2492a4f. HQ 73 corrects
expired-Premium policy refresh while preserving captions and failing closed.
At 13:57 UTC, reads still showed Pasa 99fe/HQ 781; the later 14:02 UTC
manager read verified HQ e249 exact current source. Pasa remains99fe despite
master f1e99f19. HQ native consumers remain gated. The native foundation is now installed with all three activation gates false.
Moving integration heads must be rechecked before any merge/deploy; this ledger
does not authorise a stale force merge.

The Standard/Plus/Pro naming merges are visible in Business 39, Duermo 34 and Coches 38
and corresponding Pasa/HQ work. Keep this deliberate independent change visible
when reconciling the original requested names; do not reinterpret billing tiers
from display text or revive historical paid HQ roles. Older pricing documents also
contain retired paid HQ/Enterprise and 15-free-photo descriptions: treat them as
historical evidence, not current entitlement authority.

## D. Database, billing and runtime state

All installed-state statements are release-manager observations, not production
writes by this reporting task. The shared target project has been independently
confirmed in the release workflow; no credentials or private customer manifest is
included here. Full migration filenames/hashes and prerequisites remain in source
runbooks; timestamps below identify the family, not permission to replay it.

| Family                                                                           | Latest verified state / safeguard                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Toolbox 170509 / compatibility 181726, operating checkout/recovery/commands      | Installed foundations and legacy bindings; preserve original applied history. Three sealed commands queued/attempts 0; merchant verification fails; no customer changes                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Notification 181233/183515 and central retry                                     | Private setting enabled; prior drain 0 completed/0 failed; no email or actual owner delivery receipt claimed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Listing 170415, strict 173552, library 233027, identity 003500, invariant 004500 | Installed per manager; **all listing activation flags off**, 44 media/9 events retained. Strict bytes/provider acceptance unverified                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Library deletion 014000                                                          | **Now applied successfully**; expected nullable SET NULL/cascade FKs and five indexes present; 44 media/9 events unchanged, flags unchanged                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Referral 170421/review 180654/audit sequence 185822                              | Installed; explicit client/service sequence capabilities denied;0 programmes, cash false                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Referral 234107                                                                  | Applied and read back: guarded capture plus actual operating exclusion, anonymous rep-RPC denied/raw evaluator denied; never replay anchor substitution                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Onboarding 170448/corrected 180946 and stale-profile repair                      | Installed/guarded; cohort NULL, no activation/backfill. Privacy exceptions remain available                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Private export 001138                                                            | Installed with caller-only read/ACL acceptance and reader declared ready through 252; no financial history deletion. Other actors are redacted; retained own shipping included                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Prestige 170436                                                                  | Installed, 0 programmes, launch/physical operations off; no ordering/fulfilment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Pulse 180504 / operational analytics 173202                                      | Read-only scoped/underlying-tool source and SQL installed in earlier acceptance; do not infer new source mappings or advanced-report live activation                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Trusted funnel 234414 / privacy 000745                                           | **Canonical 242/243 schema now installed** in eleven short phases after existing enum. Enabled false, retention/reference/enabled_since NULL, zero rows, 13 triggers; zero private client EXECUTE grants. Manager/privacy anon denied/auth allowed; maintenance auth denied/service allowed. Prior production FUNNEL_READY unset; candidate264 declares schema-reader readiness true only. No collection activation. At 13:59 UTC, read-only rollback role QA passed owner disabled/not_activated, own empty privacy export and foreign 42501 denial; collection false, zero capture failures and rows |
| Critical spatial_ref_sys permissions                                             | HQ59 source fix merged; actual apply failed 42501 and rolled back. Supabase_admin extension ownership prevents caller repair; anonymous/authenticated write/TRUNCATE exposure unresolved. Provider/extension-owner repair required; do not self-escalate                                                                                                                                                                                                                                                                                                                                               |
| Native property 001000/002500/005500                                             | Corrected foundation installed through 23 short phases/23 history records, final version 20261021142249; three gates false, 13 tables empty, private bucket 10 MiB/zero objects, 26 functions. Temporary hold removed. Legacy private function/owner/ACL fingerprint unchanged; private client EXECUTE zero, receipt RPC auth denied/service allowed. Existing accommodation_private untouched; no historical replay                                                                                                                                                                                   |
| Runtime health 001252                                                            | Installed private service-only diagnostics. Public configured/billing/migrations booleans are not proof of merchant validity, cron work or schedules                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Merchant health 133839                                                           | Newly installed: six nullable fixed category/status/time fields; anon/auth RPC denied, service allowed, existing health enabled. Observer 261 exact 6d6 passed all seven hosted workflows and merged as f1e99; **new diagnostic production source and actual merchant category not yet verified**, last supplied production marker 99fe                                                                                                                                                                                                                                                                |

Do not close migration processing on the strength of enqueue, flag presence, a
scheduler tick, CI or an empty notification drain. Closure requires all three actual
future schedule/readback receipts. Preserve original paid expiry, tax/discount and
legacy records; no immediate charge, duplicate subscription or invented receipt.
All three valid forever coupons and paid-through dates remain protected; Personal
subscriptions are unchanged. Zero immediate invoice/proration/new-subscription
behaviour is required, not claimed accomplished by queueing.
The current merchant failure is an engineering/provider diagnostic blocker until
its actual cause is observed, not a reason to bypass validation or ask again for
the already-authorised migration.

## E. Reviewable sources and links

- Pasa[252](https://github.com/elguiriashing/akipasa/pull/252),
  [237 referral evidence](https://github.com/elguiriashing/akipasa/pull/237),
  [248 private export](https://github.com/elguiriashing/akipasa/pull/248),
  [260 native integration](https://github.com/elguiriashing/akipasa/pull/260),
  [261 merchant diagnostics](https://github.com/elguiriashing/akipasa/pull/261),
  [262 library guard](https://github.com/elguiriashing/akipasa/pull/262).
- HQ[58 scoped Pulse](https://github.com/elguiriashing/akihq/pull/58),
  [59 extension permission repair](https://github.com/elguiriashing/akihq/pull/59),
  [70 task contract](https://github.com/elguiriashing/akihq/pull/70),
  [71 venue loyalty](https://github.com/elguiriashing/akihq/pull/71),
  [72 native consumer](https://github.com/elguiriashing/akihq/pull/72),
  [73 policy refresh](https://github.com/elguiriashing/akihq/pull/73).
- Business[39](https://github.com/elguiriashing/AkiBusiness/pull/39),
  Duermo[34](https://github.com/elguiriashing/AkiDuermo/pull/34),
  Coches[38](https://github.com/elguiriashing/AkiCoches/pull/38).
- Public entry points:[AkiPasa](https://akipasa.com),
  [AkiDuermo](https://akiduermo.com),[AkiCoches](https://akicoches.com),
  [AkiHQ](https://akihq.app),[AkiBusiness](https://akibusiness.com).
  Entry-point availability does not establish private feature acceptance.

Runbook index: OPERATIONS_BILLING_RELEASE, OPERATIONS_RUNTIME_DIAGNOSTICS,
REFERRAL_ENGINE_20261020, REFERRAL_REPRESENTATIVE_EVIDENCE, REFERRAL_PAYOUT_REVIEW,
PRIVATE_IDENTITY_EXPORT, ACCOUNT_COMPLETION_RELEASE, ACCOUNT_DATABASE_COVERAGE,
ACCOUNT_COMPLETION_LEGAL_REVIEW_20261020, LISTING_LIMITS_RELEASE,
LISTING_LIBRARY_DELETION_COMPATIBILITY, PASSPORT_PRESTIGE and
TRUSTED_BUSINESS_FUNNEL. HQ owns AKIPULSE_MISSION_PROGRESS; Business owns
MASTER-MISSION-20261020 and OPERATIONAL-ANALYTICS-20261020. Preserve old evidence
while correcting its use as a current-state claim.

## F. Testing and exact-source evidence

Fresh GitHub read of Pasa 252 exact source 8798b77 confirms **eight green workflows**:
full app/Worker 39586513927; tablet 39586514207; account/public UI 39586513877;
SQL 39586513888; contract 39586513803; docs 39586513909; representative
SQL/page/browser 39586513886; booking 39586513953. Current 99fe has green
full public 39593878616 and booking live smoke 39593878625. These are distinct heads;
252's results must not be relabelled as new native260 or all private production tests.

Fresh independent source checks: Business 39 head 78ded8eb has five green workflows
(operations 39583498047, toolbox 39583498175, inventory 39583498087,
course 39583497998, kitchen 39583498027); HQ 71 head 577a2331 has management
39585218934 green; Duermo 34e76b5f has 39583408850 green; Coches 38
9fab42f has 39583452954 green. HQ 72 exact 065d093 has 39610252890 green,
then manager reviewed local full check/build and merged it. Pasa 260 exact 5e8411
has green contract 39610239276, SQL 39610239140, docs 39610239581,
PostgreSQL accommodation39610239205 and booking 39610239501; public UI,
full app/Worker and tablet were running at the initial read, then the manager
confirmed all required checks successful and merged the exact head. HQ 73
exact 93a56 also passed all required checks before its manager-reviewed merge.

Recorded focused evidence is useful but overlapping: toolbox/calendar/permission
SQL and browser cases cover4/8/12, swaps, annual/month-end/leap/timezones,
instant grants/revocation and venue/leaver isolation. Referral 237 had 58 focused and
16 real-component browser cases. Privacy248 had 22 new cases plus overlapping
37 private/funnel, 6 legacy prestige export and 10 account cases, including 1,202 SQL
and 1,201 reader rows, redaction, suspended/underage privacy and retained-shipping/
reviewer deletion. Pulse scoped SQL had 15 real role cases and64 component
locale/theme/viewport cases; paid analytics had 16 component cases. The integrated
source record documents 385 AkiSuite/94 onboarding/65 account and other suite
executions; counts overlap and are **not summed as unique tests or requirements**.
Native260 records 40 focused cases; its required hosted gates subsequently passed,
while real production/Storage acceptance remains open.

After its branch/PR synchronisation repair by closing and reopening, diagnostics
PR261's actual immutable head is 6d6d56042d1ed60ef267d4f901efcbf8cdf333a0,
not the earlier 7ae head. All seven hosted workflows passed; the release manager merged it as f1e99f19696da2d15334ed56d114433d4580d9b4. Local full npm run check and 119 combined focused cases passed. This is not a production merchant observation. PR265 exact 9e1d93aba5998c2e7a334c570025373160c2408b corrects PR262 for both isolation levels; the manager reports eight actual PostgreSQL concurrency cases and its hosted CI green. The release manager subsequently installed exact2659e1: readback confirms repeatable-read row-touch/shared reader present, private trigger anonymous/authenticated EXECUTE zero, all three listing flags false and existing 44 media/nine events unchanged. This integration still requires its own exact CI.

At 13:59 UTC the release manager's read-only rollback transaction against the
installed funnel passed three assertions: owned manager disabled/not_activated,
caller-only empty privacy export, and foreign scope denied 42501. This proves the
bounded installed role paths with collection off, not real collection or attribution.

Browser fixtures and disposable databases are not real OAuth, customer payment,
Storage or private tenant sessions. Earlier actual hosted owner/foreign Pulse/RLS
and installed export/guard metadata acceptance remain bounded evidence, not proof
of every current UI. Important unresolved acceptance: signed isolated Stripe
lifecycles/merchant and schedules; all-five actual auth/language handoffs; strict
Storage bytes/direct APIs/concurrency; native owner/admin revision/inventory and
media; production staff/cache rotations; realistic large-tenant query plans;
full accessibility and actual privacy/underage sessions. Failed/timed-out/tool-hung
QA is never recorded as a pass. Do not repeat large live rollback transactions to
manufacture evidence.

The original PR263 report was docs-only. This integration preserves frozen PR264 phased deployment utility/readiness, PR265 repeatable-read protection and PR263 ancestry on f1e99. Combined source checks and exact hosted CI are required before merge; their results belong to the final integration head. No production action is claimed for preparing this source.

## G. Production verification and gated work

Confirmed by manager around 13:50 UTC: Pasa 99fe, HQ 781d, Business 8c81 with correct
paid role, Coches 756c; Duermo remains edd37. The 14:02 UTC read verified HQ e249 exact current primary; Pasa 99fe
remains live despite newer primary f1e99f19. HQ native consumers are deployed/gated. There is no claim of a newly authenticated private browser
or actual checkout/commission/physical shipment. Three customers are unchanged.

Public source matches do not open listing flags, enrol an onboarding cohort, seed a
reward/referral programme, activate the installed funnel schema or validate merchant
credentials. Collection/acquisition remains gated. Private export readiness is
separate and must remain compatible while retained data exists. No sitewide GA4,
Search Console or platform impressions are attributed to an individual venue.

Rollback is feature-specific: retain billing recovery for already-paid access,
queues/ledgers, ownership, media/events/progress, privacy readers and immutable audit.
Do not replay creation DDL, undo legitimate deletion, restore a blocking FK, disable
strict uploads beneath an active library, delete history or close migration retry
before actual receipts. Technical provider failures do not authorise a live charge.

## H. Decisions versus engineering dependencies

Genuine decisions: reconcile the requested Básico/Standard/Pro names with deliberate
Standard/Plus/Pro source and its existing financial mapping; final legal/age-policy/
terms/retention/appeal and higher-assurance assessment; Andrew/accounting/legal
commission/discount/basis/eligibility/payout model; prestige milestones/coverage and
physical budget/qualification/retention/operating procedure. Approved operating
prices and the three already-approved customer migrations are not new requests for
permission. No new monetary/legal value is selected here.

Engineering/release work, **not a business-decision blocker**: diagnose the merchant
verification result with the new service-only observer; accept the installed, disabled funnel schema;
restore the unusable Cloudflare API/gateway release path and fix Duermo's source pin; verify installed native foundations and actual Storage acceptance; verify Pasa f1e99f19
deployment; HQ e249 is now public-marker verified; connect genuinely
scoped funnel/property/org-fleet adapters; finish authenticated/provider/performance
acceptance and truthful evidence. Continue independent work while one dependency
is blocked.

## I. Prioritised outstanding work

| Priority | Exact next action / reason                                                                                                                                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Verify merged 261/f1e99 diagnostic production source, read the first actual sanitized category/status/time, correct only the validated provider/configuration cause, then process three sealed commands and verify every actual future schedule. They remain queued 0 attempts, not migrated |
| P0       | Verify already-merged Pasa 260/261/f1e99f19 production marker; HQ 72/73/e249 is verified live at 14:02 UTC. Keep native gates off until corrected SQL, ownership, bytes and revision/inventory acceptance pass                                                                               |
| P0       | Resolve repeated Cloudflare MCP-32603 API failures/gateway deployment access and Duermo source pin and deploy tested current source; verify public identity and real language/referral/account handoffs. Do not call current main live while marker is edd37                                 |
| P0       | Verify installed phased funnel role/privacy/retention and tenant source facts, then accept the schema-ready consumer before collection activation. Schema now installed, enabled false, zero rows. No whole historical replay                                                                |
| P0       | Obtain provider/extension-owner repair for the actual spatial_ref_sys write/TRUNCATE exposure. HQ59 source merged, actual 42501 apply rolled back; no self-escalation                                                                                                                        |
| P1       | Accept strict Storage/library paths and grandfathered quotas/events, with retained 44 media/9 events;014000 compatibility is applied, not outstanding. Flags remain off                                                                                                                      |
| P1       | Run actual owner/staff/rep/admin/pending/underage/provider/privacy flows; retain cohort NULL, 0 programmes and cash/physical gates until their evidence/decisions are complete                                                                                                               |
| P1       | Reconcile tier labels without silently remapping prices, tools or existing subscriptions; preserve current independent work until authorised resolution                                                                                                                                      |
| P2       | Finish measured broader health and true scoped acquisition/property/org-fleet analytics; explain coverage and unknown costs instead of fabricating totals/profit                                                                                                                             |
| P2       | Validate realistic large datasets, query plans, concurrency, device/accessibility and privacy retention/purge procedures; do not equate a single CI run with full acceptance                                                                                                                 |
| Release  | Refresh this ledger with exact final heads, production markers, flags and operator receipts; close no feature/issue solely because source is merged. Keep customer IDs, sealed payloads and credentials out of public docs                                                                   |

## Reviewed integration checkpoint after PR261

This candidate preserves original ancestry of PR264 df012bd6ea6a7d0ab1943b10ccbaf3ec7bbcd743, PR265 9e1d93aba5998c2e7a334c570025373160c2408b and PR263 8a1e93c59a1c9bdd85f77b21a6aa073e0aa6625e on merged primary f1e99f19696da2d15334ed56d114433d4580d9b4. Reviewed deployment phase SQL, manifest, utilities and library security source are unchanged. The separate 181500 quota follow-up is excluded. Billing/migration processing remain true; checkout/tax remain false. No commands, provider calls, SQL or primary writes are performed by this integration.

The release manager subsequently installed the corrected native foundation in 23 bounded phases with 23 history records (final version 20261021142249). A phase21 history timestamp collision required reviewed idempotent CREATE OR REPLACE replay only; no history DML was used. All three native gates remain false, all 13 tables empty, the private bucket contains zero objects with a 10 MiB limit, and 26 functions are present. Legacy private function/owner/ACL fingerprints match before and after; private client EXECUTE is zero, receipt RPC auth denied/service allowed. Existing 44 media and nine events are unchanged. The separate native deployment receipt utility is outside this batch. Actual owner/admin/Storage acceptance remains pending.

The manager also installed the Pulse74 projection RPC: authenticated execute allowed, anonymous denied, DB collection false and zero rows. HQ74 reader source CI is pending at this checkpoint, so this is not a live analytics collection claim. HQ e249 remains production-marker verified. The funnel schema is installed with collection off; schema-reader readiness in this candidate does not approve retention or enable capture.

The release manager installed corrected library reference guard 175000 from exact PR265 9e1 after all eight actual PostgreSQL CI cases passed. Readback verified the repeatable-read row-touch/shared reader, zero anonymous/authenticated private trigger EXECUTE, all three listing flags false and existing 44 media/nine events unchanged. This is installed protection, not library activation. Quota266/181500 remains outside this batch.
