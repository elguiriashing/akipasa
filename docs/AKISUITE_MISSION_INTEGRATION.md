# AkiPasa mission integration checkpoint — 20 October 2026

This candidate combines independently reviewed source branches without changing the
five-product deployment split. AkiHQ is the free management hub; AkiBusiness owns
paid operations. This branch has not been merged or deployed. No production
migration, flag activation, subscription mutation, charge, payout, address intake
or physical order was performed.

## Included source

Base master: `a272f2a0edbd49e30676d30fef87d72f2248793f`.

| PR   | Exact included head                        | Scope                                                                       |
| ---- | ------------------------------------------ | --------------------------------------------------------------------------- |
| #211 | `39e240a33727926bf5685c05d3c7032215798e5e` | Contextual claim/management prompts and consent-aware funnel events         |
| #212 | `89b1312bf22fdae8caf36ef416ae40b8d434e15f` | Gated account completion, age declaration and privacy safety                |
| #213 | `7cb0d8410cddfa3536a6ea6ae0a9af6054fa55f0` | Shared referral attribution, dashboards, billing adapter and admin studio   |
| #214 | `bdb8e46a8df32a1d9f886f62a0f0d07c389224a5` | Five-product EN/ES navigation and referral propagation                      |
| #215 | `4e2effa7de0a9ade3f68afc06dc1a73c4d7622bd` | Retained-media safe listing quota/event limits                              |
| #216 | `b9e8ff13b1c710bc3e506dbf2790244d4d5b0cad` | Verified digital prestige, private physical request/delivery infrastructure |
| #217 | `2e1d710f175ac860a0fac4aa96fa5ae03e81846a` | Atomic server-validated reserved listing uploads                            |
| #218 | `fdb8446ff1ae31926f2cd4ee907b959ac8d0e433` | Exact-history contract recovery and narrow integrity gate                   |
| #219 | `22c4d35de6cfee085cd61b9c978defffc8a3b3e9` | Authoritative operations checkout, billing lifecycle and toolbox schema     |
| #220 | `72d4ed5a2ab5d45cf0da60d73674636745c9d778` | Safe cross-product account task resume and locale envelope                  |
| #221 | `1d96b30e7c04d06d7087877b62bb5a7ddb6c43b6` | Gated admin referral eligibility/payout approval audit; no disbursement     |
| #223 | `3395b4a7a0e63f2166d7e309c3c339f165206ff3` | Central first-invoice recovery and strict merchant/tax defaults             |
| #224 | `0a01ed40e84a0916cdf2c5147e946e1c7a42ffb6` | Direct RPC, permission predicate, mutation and Storage onboarding guards    |
| #225 | `1f4c47218e74e9a34e60fa532a0898253dc6a4cc` | Empty service-only reviewed renewal command queue; dual gates off           |

Local sequential merge commits preserve every included source head as ancestry.
Publication must retain those heads as commit parents/ancestors and compare the
complete remote tree to the locally checked tree. Independent source PRs remain
open until the release manager resolves their final disposition.

## Integration resolutions

- The restored complete contracts retain every line of the intact #208 parent,
  plus all verified later release and feature entries. A complete-line sequence
  comparison reports only equal/insert operations after formatting.
- Package commands retain every existing suite, and add contextual CTA, suite
  selector/referral, onboarding, prestige and operations lifecycle tests. The
  integrity guard remains before the documentation-only shortcut.
- Account export retains both schema-ready gated receipts: onboarding and
  Passport awards/physical requests. Both use the caller session. Two additional
  regressions assert combined export for a restricted account and no partial
  attachment if either ready schema fails.
- Onboarding privacy links to the separate Prestige privacy safety route outside
  the guarded account layout. Identity-only export/delete/read/withdraw remains
  available; reward activity and shipping intake retain server eligibility checks.
- Suite navigation source from contextual CTAs and language work is identical;
  no independent implementation or sibling-source import is introduced.
- The completion-resume contract uses the actual plural `/passports` route;
  EN/ES regressions preserve the prestige task through the completion envelope.
- The referral billing adapter composes with the sole signed AkiPasa Stripe
  webhook and the operations billing module; no second webhook is created.
- Both listing migrations precede strict uploads; strict provider acceptance and
  independent accommodation schema dependencies remain explicit in the source
  runbooks. No fake venue link is introduced for independent properties.

## Verification and activation

After #220, the expanded onboarding suite passes 45 cases, including two added
canonical Passport resume regressions. Types and the final production Next build pass after adding the new
completion-resume route.

Integrated check: format, lint, types, security (33), database safety/conflicts
(2), automation checks/41 tests/Worker dry-run, and production Next build passed.
Primary suite: 649 passed and one unchanged Spanish-text PGlite test exceeded its
existing five-second limit under parallel load; both tests passed unchanged in an
isolated rerun (1.3-second SQL case). Remaining suites passed: subscriptions 21,
Duermo 113, Spotlight 222, Pals 93, account 65, AkiSuite 199, onboarding 26, prestige 42
(including the two combined-export regressions), navigation 23, operations 23 Node
and 11 focused adapters. Counts are suite executions, not distinct requirements.
No assertion or timeout was weakened. Hosted full exact-head CI remains required.

Real Chromium143 component acceptance passed 64 prestige and 32 onboarding cases
on the combined source: EN/ES, themes, phone/tablet/desktop, keyboard/reduced
motion, PNG dimensions and private shipping/privacy/delivery actions. Fixtures
are synthetic; this is not live OAuth, Storage, invoice or authenticated tenant
acceptance. Individual-source green CI is not integrated-tree evidence.

Use the source runbooks for the separate legal, tax, provider sandbox, hosted
schema/RLS/concurrency and cross-app activation requirements. Schema-ready,
billing, listing, referral and prestige gates remain off until their own verified
acceptance. Shipping/fulfilment and cash commission disbursement remain disabled.
The current two eligible Passport venues cannot support a claim that City Master
completion is realistically available or that completion takes two–three years.

Rollback before activation is a source revert while preserving additive schema
and customer records. After paid billing or cohort activation, retain authoritative
entitlement/eligibility enforcement and follow the relevant forward recovery
runbook; do not erase ledgers, addresses, media, progress or ownership.

## Hosted audit follow-up

The first integration SQL audit rejected schema-wide table ACL syntax. The
canonical toolbox migration now names its exact four tables for browser-role
revocation and service-role SELECT, preserving intended privileges while avoiding
incidental grants over other tables in the private schema. Both migration copies
remain identical. The changed-migration audit and all eight executed SQL
lifecycle/role cases pass before the next publication. Independent Business uses
the same canonical migration.

Release-manager update: the original 312-line toolbox migration was already
applied to the shared project with zero enrolled workspaces before this equivalent
ACL syntax change. Original SHA256:
`b6b92500771ac1796a0056df53cd720ce6dd42fb5515b523432664b3930931e6`.
The initial explicit-table-only candidate SHA256 was
`ca7dda82db66e8507ad278e17659f3eab8bcc367397a22f2cafae86fd33f484f`.
Do not replay the table-creating migration. Preserve its applied history; if a
hosted ACL reconciliation is needed, use a separate reviewed additive ACL-only
followup. This integration change does not mutate the live schema or enrol users.

## Central first-invoice recovery

Included #223 adds a bounded leased central billing recovery queue before the
first toolbox exists, through the existing AkiPasa scheduled Worker and Stripe
credential. It only reads Stripe; verified invoice/customer/workspace binding and
atomic entitlement application remain authoritative. Failures retry, missing
payment defers, and duplicate provider snapshots do not double-apply. Merchant
checks and optional automatic-tax defaults are explicit. No new provider secret,
customer subscription migration, live charge or flag activation is performed by
this integration. Its additive migration preserves the applied toolbox history.

## Hosted source-constraint correction

A release-manager rollback-only test against the actual schema found that the
historical entitlement provenance CHECK permits plan/trial/purchase/manual/platform,
so the old toolbox INSERT source was invalid. The canonical migration now maps
Stripe to purchase, trial to trial and approved other grants to manual. Final
canonical SHA256: `51ddae16c3f3d3b56c67356f6dd8c89fe48b27d927c300d867e3dc6bd69d4755`.
Forward-only migration `20261020181726_toolbox_entitlement_source_compatibility.sql`
replaces only the guarded sync function; SHA256:
`d3127457ef5bb01e0aa6d28d47ba85a6b4a727c4cb0b6190f68b161ca33e7d46`.
It retains the function execution boundary. Preserve the original applied migration;
never replay table creation to obtain this fix.

The release manager reports this forward correction applied successfully, then a
rollback-only actual-owner test verified Basic CRM allowed, Inventory/PoS denied,
owner rotation denied and underlying Inventory RLS returned no unauthorized rows.
The rollback left zero enrolled toolboxes and the three prepared bindings, with
legacy paid access unchanged. This is bounded database acceptance, not live UI,
provider checkout or full subscription migration acceptance.

The Pasa SQL fixture now includes the actual source CHECK and twelve catalogue
rows, rather than an empty catalogue that skipped the invalid INSERT. Paid
application asserts twelve active purchase entitlements; invalid provenance fails.
The canonical plus forward migration execute in the fixture. Current operations
suite passes 26 Node cases (15 pure plus 11 SQL role/lifecycle cases) and 20 adapter
cases; types pass. Full format and changed-migration audit are rerun for publication.
The copied Business canonical/forward source has identical hashes.

## Referral review studio

Included #221 was reviewed by the release manager after all seven hosted source
workflows passed. It adds strict administrator eligibility and payout-review
records, source-event/configuration snapshots, suspension/revocation checks,
idempotent decisions, audit/export, and bilingual review forms. Cash payouts
remain disabled and no bank/provider transfer is implemented. No commission
percentage or payout threshold is activated by this integration. Its 41 focused
SQL/page cases are rerun on the combined source before publication.

## Account coverage and task preservation

Included #224 retains exact deployed function bodies/owners/ACLs while adding the
account eligibility intersection to inventoried direct RPCs, permission predicates,
mutations and nonessential uploads. Its own portability, deletion, consent and
profile-rectification paths remain available; enrollment/backfill is disabled.
The original predicate/definition backups and full-schema staging manifest must
be reviewed before cohort activation. No existing account is backfilled.

The completion task allowlist now preserves only four additional bounded actual
route keys: vehicle/start/end for car selection and dates, and page for stay
booking history. EN/ES regressions reject duplicate vehicle keys, credentials and
URL-shaped values while preserving valid task state; destinations still validate
booking data independently. All origins remain fixed by product identity.

## Final integrated coverage freeze

The integration additionally covers the new private toolbox owner predicate, six
new referral RPCs and nine referral mutation tables. These exact additions were
reviewed with the onboarding implementer. Pending/negative users cannot bypass
the soft lock through toolbox snapshot/configuration, referral join/capture,
representative lead writes or administrative payout review; exempt users retain
the original function bodies/ACLs and service-only verified billing stays ungated.
Own privacy exports/deletion remain separate safety paths. Two actual-membership
SQL cases and two six-RPC/direct-lead cases verify the extra intersections.

Final scoped evidence: onboarding 70/70 (including original-task EN/ES preservation,
actual copied snapshot predicates and direct guards), referrals 41/41, operations
26 Node plus 20 adapters; TypeScript and affected-file ESLint pass. The source is
frozen after #221/#223/#224 and these integration corrections. Exact final hosted
CI, Cloudflare packaging and authenticated acceptance remain release gates.
No further feature source is added while this candidate is awaiting those gates.

## Reviewed renewal-command execution

Included #225 supplies the private, default-disabled execution infrastructure for
three separately sealed operator-reviewed migrations, using the existing central
Stripe credential. The queue is empty until explicitly service-enqueued; browser
roles cannot read/write it. Two flags, actual merchant/immutable binding checks,
unchanged paid source snapshot, stable idempotency keys, exact existing discount,
zero-amount future invoice preview and unchanged provider readback are required.
Only same-subscription schedule creation and future-phase updates are implemented;
there is no charge, invoice-finalization, payout or duplicate-subscription path.

Independent review added subscription+full-schedule rereads just before the phase
write to refuse changes made during preview. Exact-phase reread and source
assertions follow the write. There is no provider atomic compare-and-swap; keep a
controlled operator window and inspect actual payloads/readbacks before activation.
Neither this integration nor its tests enqueue commands or call live Stripe.
The release manager reviews the three exact sealed payloads after tested deployment
before considering the separate command flag. No general-purpose editor is exposed.

The independent command review also corrected offline seal verification: complete
manifest content must equal its deterministic reconstruction, so an altered row
cannot reuse a claimed hash. Two actual CLI subprocess regressions reject tampered
rows and accept semantically identical JSON key ordering before receipt validation.
No private real snapshots are used in tests or committed.

Final #225 integration verification: operations 29 Node cases (including actual
SQL roles/command queue and two real offline CLI subprocess regressions) plus
35 adapters pass. Types, affected-file ESLint, full-repository format, contract
integrity, exact historical-line preservation and 24-file migration permission
audit all pass. The application source is frozen for final hosted CI/Worker
packaging. The earlier full application/96-case component browser evidence remains
recorded above; the new command paths require separate operator activation and
provider readback, and are not claimed as already executed against customers.

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

The isolated Spotlight amendment also preserves immutable privacy follow-up
#226 (`d9f90673c7135534da73804ec70c53e894ed488b`) as ancestry. The combined
source differs from that privacy candidate only in this acceptance spec and
verification notes. Operations 32 Node and 42 adapter cases, TypeScript and
contract checks pass after combination. Exact-head hosted build/browser gates
remain required; neither frozen source branch was changed.

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

Combined-master validation: privacy/analytics 22, onboarding 70, operations
32 Node plus 42 adapters pass. TypeScript, scoped ESLint, contract integrity and
whitespace checks pass. PR #230 test content is byte-identical to current master;
the only component delta from master is the mission tracking-eligibility
intersection. No acceptance assertion or timeout was relaxed.

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
