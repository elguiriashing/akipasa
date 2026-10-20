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
The explicit-table candidate SHA256 is
`ca7dda82db66e8507ad278e17659f3eab8bcc367397a22f2cafae86fd33f484f`.
Do not replay the table-creating migration. Preserve its applied history; if a
hosted ACL reconciliation is needed, use a separate reviewed additive ACL-only
followup. This integration change does not mutate the live schema or enrol users.
