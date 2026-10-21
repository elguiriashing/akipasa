# Representative evidence and operating-customer eligibility

Status: implemented and locally tested, not merged/deployed/applied by this branch.
No production data, referral programme, account cohort, price, commercial rule or
cash capability is activated. Root separately reports foundation/review/sequence
repair and corrected account coverage installed; that does not install this patch.

## Installation and access contract

Apply the mirrored additive migration `20261020234107_referral_representative_evidence.sql`
with one canonical runner after foundation170421, review180654 and final corrected
account coverage180946 (PR232). Do not replay installed history. The capture
amendment requires the account guard marker and exactly one known eligibility
anchor; unexpected source aborts the transaction. It uses PostgreSQL's deployed
function definition, preserving its full caller guard, declarations, first-write
immutability, owner, security attributes and existing ACL. The optional
`akibusiness_private.operations_subscriptions` adapter queries only whether the
caller already has a binding. Any existing binding, including canceled history,
excludes a new-customer claim, matching the existing public-billing exclusion.
Absent private schema remains supported. There is no public grant on that ledger.

One private invoice evaluator now supplies both the existing admin eligibility
RPC and the new representative projection, so dynamic rule/recipient/refund/dispute/
case checks agree. The admin RPC retains caller account eligibility and administrator
requirements. Private helper execution is revoked from PUBLIC, anonymous,
authenticated and service roles; only owner-executed guarded projections call it.
The existing immutable review ledger and prospective snapshots are reused. No
commission rule is selected and no raw financial rows are made visible to reps.

`suite_referral_representative_evidence(integer)` takes only a period (30/90/365
recording days); caller UUID is always `auth.uid()`. A completed/exempt account
and currently approved representative record are required before source reads.
Suspended/pending/foreign representatives cannot select someone else's projection.
The return includes only owned codes and verified paid-invoice evidence, grouped
under opaque subscription/invoice references. No customer UUID/name/email, Stripe
customer/subscription/invoice/event ID, admin identity, review note, document
reference or internal evidence snapshot is returned. Product labels/terms versions
are recorded facts. Raw invoice/review RLS and write permissions stay unchanged.

The window is UTC rolling recording time, not invoice payment time, business revenue
or a statement of live subscription status. It returns at most50 subscriptions,
10 newest invoices per subscription and10 newest reviews per invoice, with explicit
truncation indicators and window invoice counts. Existing owner/recording-time and
review indexes support these bounded filters. History older than the selected window
is retained. The UI never silently interprets an incomplete response as complete.

Statuses are pending, administrative approval, held or rejected. Eligibility and
holds are recomputed on every read; a verified refund/dispute can hold an earlier
approval without rewriting it. There is deliberately no `paid` state. Every return
keeps `payable=false` and `payouts_enabled=false`; database monetary/payout CHECKs
remain false. Proposed amounts use the frozen minor-currency units, not a fabricated
payable balance. A terms-version string is not a legal/accounting approval.

## Presentation and rollout

The existing account referral dashboard contains the EN/ES representative panel.
It queries the new RPC only for approved representatives when both
`AKISUITE_REFERRALS_READY=true` and the separate
`AKISUITE_REFERRAL_REP_EVIDENCE_READY=true` are set. The new flag defaults off.
Readiness is schema compatibility, not financial or review-workflow activation.
Failure/invalid schema shows unavailable; it never invents zero revenue or rewards.
Period selection, real history disclosures, touch controls, responsive cards and
keyboard disclosure behavior are implemented. The shared task-resume module is
owned by the independent cross-app follow-up; this patch does not alter it.

Before readiness, review exact-head hosted checks and correct-project installation,
then simple actual-role reads for own/foreign/pending/suspended accounts and existing
customer capture. Do not repeat large hosted QA transactions or live charges as
part of this patch. No money activation or permanent programme seed is required.
Rollback disables only the new presentation gate; retain the eligibility exclusion,
shared guarded evaluator and historical evidence. Never restore an unguarded capture
body or old broad grants to make an older consumer work.

## Executed evidence

58 focused SQL/billing/rendered tests pass, including11 new actual-role PostgreSQL
fixtures and6 integrated page cases. Fixtures install the real foundation, review
and corrected account-wrapper block before the new migration. They cover missing
optional schema, bound canceled operating customer, legacy public ledger,
first-attribution immutability, caller restriction, approved/foreign/pending/
suspended representatives, direct RLS reads, private-helper denial, immutable review
projection, dynamic refund/dispute/case holds, explicit limits and false cash gates.
Fixture123minor-unit rules are synthetic test data, never programme configuration.

The real component and styles pass16 Chromium cases: EN/ES × light/dark × phone,
tablet portrait/landscape and desktop. Assertions include no horizontal overflow,
keyboard order/disclosure, period choice,44px targets and no client errors. Two
phone screenshots were inspected. These are marked disposable fixtures, not
production authentication, live financial transactions or provider acceptance.
TypeScript/scoped ESLint and mirrored SQL permission audit pass. Final hosted
full checks/build, source merge, production application and actual-user acceptance
remain separate gates and will be recorded with their exact heads.
