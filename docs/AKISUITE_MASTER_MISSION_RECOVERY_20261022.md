# AkiSuite master mission — verified recovery checkpoint (2026-10-22)

Scope: original mission "Subscription Toolboxes, Premium Entitlements, Growth Engine, Referrals, Conversion Funnels & User Experience". This is **evidence tracking**, not a feature launch or approval.

## Release invariants
- AkiHQ is the **free** management hub; AkiBusiness is the **paid** operating suite. Do not regress to historical role names still appearing in copied docs.
- Discovery products AkiPasa, AkiDuermo, AkiCoches stay independent.
- Keep existing Stripe identifiers/prices, customer subscriptions, credentials, RLS, and historical media and event records intact.
- No commission disbursements, physical trophies or legal-policy cutover without explicit approvals.
- Database and feature flags must be accepted independently of GitHub CI before claiming production ready.

## GitHub inventory observed 22 October
| Repo | Branch | Open PRs | Observations |
| --- | --- | --- | --- |
| elguiriashing/akipasa | master | #271, #8 | #271 export adapter depends on HQ #77 private-export migration; #8 remains legal-review draft |
| elguiriashing/AkiDuermo | main | none | Membership styling merged via #35; production acceptance not established by PR queue |
| elguiriashing/AkiCoches | main | none | Membership styling merged via #39; production acceptance not established by PR queue |
| elguiriashing/akihq | main | #61 | Gated listing template/media consumer depends on upstream shared schema |
| elguiriashing/AkiBusiness | main | none | Plan naming merged via #39, no approved price changes |

## Verified database inventory
Shared Supabase project `vhpbvcfkcteswlsdjrfl` is healthy. Public RPC names observed include `crm_toolbox_save`, `crm_toolbox_rotate`, `crm_toolbox_delegate`, `crm_toolbox_billing_sync`, `suite_capture_referral`, `suite_referral_dashboard`, `suite_record_referral_billing`, `prestige_admin`, `prestige_member`, `akipulse_scopes` and `akipulse_business_funnel`. Presence alone is **not** proof of correct RLS, billing or production acceptance.

As of this checkpoint `to_regprocedure('public.akipulse_scopes_v2(text,integer,integer)')` and `to_regprocedure('public.my_pulse_management_export_page(text,integer,text)')` both returned NULL. Verify the actual privacy-export signature from HQ #77 before applying any migration. No SQL writes were made in this recovery pass.

Installed migrations observed through `20261021142454` (listing library reference boundaries); the separate HQ Pulse explicit scope phases and privacy-export companion require reconciliation against migration history before execution. Do not blindly replay creation DDL.

## Outstanding integration gates
1. Reconcile shared migration history and function grants in order: prior identity schema, listing library, eight HQ explicit-scope phases, separate HQ #77 privacy export. Test actual PostgreSQL foreign/user/admin permissions, concurrency, and migration idempotence.
2. Reconcile conflicts on AkiPasa #271 and AkiHQ #61 with current primary trees. Both reported `mergeable=false`; do not force merge. Exact-head workflow runs were successful when checked, but are not proof that the currently diverged trees are ready.
3. Keep AkiPasa #8 draft. Final EU/Spain legal wording and cookie SDK inventory require approval; do not promote legal copy by CI alone.
4. Validate Cloudflare domains, routes, exact Worker deployed source SHA, authentication and billing. Workers observed: `akipasa`, `akiduermo`, `akicoches`, `akihq-management-preview`, `akibusiness-preview`. Worker existence/modification timestamp does not prove canonical production binding.
5. Test original mission matrix end-to-end: toolbox 4/8/12 and monthly swap rules, staff intersection and immediate revocation, 8/250 images, 4 events/month and 5 days, referrals and Stripe verified payments, AkiPulse scope/consent, prestige proofs, 18+ onboarding and bilingual navigation.
6. Release only exact tested commits and accepted migrations; verify live journeys and record rollback. Keep unavailable flags disabled.

## Status interpretation
- **Implemented in code or schema:** several toolbox, referrals, prestige, Pulse, library and memberships foundations.
- **Tested:** focused/historical PR workflow runs exist; complete live integration not verified.
- **Merged:** membership redesigns and multiple infrastructure PRs.
- **Production verified:** **not asserted** for this original mission as a whole.
- **Blocked:** #271 and #61 integration/migrations; #8 legal approval. All other phases require acceptance evidence, not an assumption of failure or success.

## Next operator instructions
Inspect `AGENTS.md`, `docs/AKIPASA_MASTER.md`, `docs/CHANGE_IMPACT_REGISTER.md` and release contracts before changing behavior. Continue independent implementation while dependencies are blocked. Record each change with exact commit SHA, tests, migration result, merge SHA, deployed SHA and acceptance proof. Do not mark an item complete on the basis of a closed PR alone.
