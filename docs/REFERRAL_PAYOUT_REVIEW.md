# Referral payout administrative review

This amendment depends only on the shared referral foundation170421 and preserves
its monetary_enabled=false, payouts_enabled=false and billing eligibility
held_unapproved constraints. No Stripe payment, transfer, payout endpoint, payable
balance, invoice instruction or monetary activation is introduced. Existing
configured prospective values are reused; no rate, threshold, schedule, recurring
arrangement or legal approval is selected by this change.

Migration180654 adds an administrator-only immutable decision ledger, caller-only
administrator eligibility/queue/decision RPCs, explicit sequence/table/function
privileges and a private disabled workflow gate. Application schema readiness
AKISUITE_REFERRAL_APPROVAL_SCHEMA_READY defaults off. Apply the additive migration
before setting that runtime readiness flag; it displays history and includes it
in the existing administrator export, without enabling decisions. A reviewed
separate gate change to akisuite_referral_private.review_settings.enabled is
required before any administrative eligibility or approval records can be added.
No production migration or gate activation is performed by this patch.

Eligible bookkeeping requires verified paid-invoice evidence with a positive
frozen prospective commission and a nonempty terms version, a valid recipient,
active programme/code and approved representative where applicable. An unresolved
code case or any verified refund/dispute hold for the customer blocks it. Holds
are deliberately conservative: resolving a case does not erase Stripe evidence.
No case resolution releases a billing hold in this amendment. Narrow reversals
would need a separately reviewed financial policy and new immutable evidence.

Approval requires a prior eligibility decision, a reason and a document reference.
It records the operator's administrative review only; it does not assert that the
referenced terms have legal/accounting approval and cannot create a payable amount.
Current eligibility is recomputed on every queue/read and decision. A later hold,
revocation or suspension immediately makes the effective approval false, while the
original decision and evidence snapshot remain intact. RPC request UUIDs are
idempotent and cannot be reused for different payloads. Monotonic revisions order
decisions even within one transaction. No browser or service role may update,
delete, truncate or insert directly into this ledger or mutate its sequence.
Existing append-only configuration audit receives every decision through a trigger.
Only administrators read the raw review ledger or queue; representatives cannot
see other representatives' records or private invoice/customer data.

The existing fraud/dispute case UI, reporter-scoped RLS, immutable audit and
bounded exact-count JSON export are reused. The export includes the new ledger
only after schema readiness, retains no-store and aborts on provider/count/limit
failure. Keep schema readiness set after records exist so later exports include
all historical decisions, even when the private workflow gate is turned off.

## Rollout and rollback

1. Validate foundation+amendment on the actual target schema and run exact-head CI.
2. Apply180654 with review gate disabled; verify anon/foreign representative/admin
   role acceptance, no money capability and untouched historical evidence.
3. Deploy the schema-ready consumer only after the migration exists. Confirm
   bounded queue and JSON export, EN/ES, keyboard and mobile/tablet acceptance.
4. Andrew/commercial, accounting and legal must approve the intended terms and
   processes before deciding whether to enable this administrative workflow.
   Actual cash remains prohibited by existing database constraints regardless.
5. Before any future cash feature, independently verify Spanish invoicing, tax,
   employment/contractor rules, approved commission rules, payout process and
   authenticated Stripe sandbox reconciliation. That is a separate release.

Rollback disables the private review gate and restores a compatible application.
Retain immutable ledger/audit/billing data and schema readiness for exports. Never
rewrite historical snapshots, release verified holds silently or mark money paid.

## Evidence

Real-role PostgreSQL/PGlite tests cover disabled gates, missing/null admin role,
foreign representatives, function/direct-write/sequence denials, evidence
requirements, two-step approval, document requirement, idempotency, immutable
snapshots/audit, dynamic refund/fraud holds, suspension and unchanged cash gates.
Rendered EN/ES/admin authorization and gated export tests cover the UI contract.
PGlite is a bounded serialized database check; real concurrent sessions, hosted
schema/RLS/advisors, provider/authenticated and responsive acceptance remain
release gates. No live financial transaction is a permitted test.
