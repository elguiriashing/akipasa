# AkiSuite referral engine — 20 October 2026 candidate

## Contract and implementation

AkiHQ is the free organisation/management hub; AkiBusiness is the paid operating
suite. Referral attribution uses the shared Supabase account UUID, independent of
host cookies and the five repositories. No subscriptions, prices, Stripe coupons,
financial approvals or existing customer data are changed by this candidate.

Public links use `https://akipasa.com/{en|es}/referrals?ref=CODE`. Codes contain
8–24 uppercase ASCII letters/digits. This public landing preserves a bounded local
return through password/OAuth and Terms; the account dashboard asks the customer
to apply the code explicitly. A one-time authenticated RPC then records immutable
account attribution. It rejects self-referrals, existing subscribers, revoked or
expired codes, suspended programmes/representatives and exhausted usage caps.
The code row is locked before checking its usage limit. Repeated or concurrent
account captures cannot overwrite the first attribution. Source product is an
allowlisted product identifier, never an arbitrary URL or user ID.

All programme and code administration requires the existing administrator role
in both server actions and PostgreSQL RLS. Public enrolment generates a code only
for an active public programme, idempotently. Approved representatives can create
and update their own bounded lead records; other representatives cannot read or
write them, and suspension immediately prevents access. Referrers see counts,
code links and recent evidence types/dates, never customer identities or invoices.
Customers can export their own attribution and billing evidence through the
existing bounded account export. Administrator JSON export is bounded to 10,000
rows per table and uses normal authenticated RLS, not a service credential.

The existing signed, leased Stripe webhook remains authoritative. Only reconciled
known-product `invoice.paid` events with positive integer paid amounts, matching
customer ownership and the subscription price mapping create conversion evidence.
Failed/zero invoices never do. Event ID and invoice ID are independently unique.
The service-only SQL RPC checks the persisted customer mapping again. Refund and
new-dispute events retrieve the current Stripe charge customer and append a
conservative customer-level hold. A closed dispute never automatically releases a
hold. These holds deliberately require manual reconciliation before any future
payout implementation; they do not pretend an ambiguous charge-to-invoice mapping
is certain. A qualifying subscription's later invoices retain its original
attribution after the initial acquisition window.

Programmes can store prospective percentage/fixed discounts and commission rules,
terms versions, currency, start/end timestamps, attribution window and eligible
product IDs. Commission frequency must be explicitly selected (initial invoice or
each invoice), otherwise no calculation occurs. Only invoice-priced lines are used, including current and legacy Stripe price
shapes; mixed/unknown/truncated invoices require manual reconciliation. Initial-
invoice rules use Stripe billing_reason, not webhook arrival order. Each qualifying invoice freezes
its proposed rule and amount, rounded down to whole cents and capped at payment.
These are proposed calculations, **not approved earnings or liabilities**.
`monetary_enabled=false` and `payouts_enabled=false` are SQL CHECK constraints:
even an app administrator cannot activate them. There is no Stripe discount or
payout API call. Audit and billing evidence have no application UPDATE/DELETE
grants. Code owner/programme assignments cannot be rewritten after creation.

## Deployment and verification state

- Pull request: https://github.com/elguiriashing/akipasa/pull/213 (draft; not merged).
- Source: isolated branch `feature/shared-referral-foundation` in AkiPasa master.
- Migration: `20261020170421_shared_referral_foundation.sql`, generated using
  Supabase CLI and mirrored byte-for-byte under database/supabase migrations.
- Rollout gate: `AKISUITE_REFERRALS_READY=true`; defaults off. Navigation, writes,
  reads and webhook referral processing stay inactive until acceptance.
- Local tests: 31 domain/billing, bilingual rendered and PGlite role/RLS tests passed at the latest
  candidate; final command evidence below supersedes this intermediate count.
- No live migration, programme activation, billing change, message or payout.

## Remaining release gates and bounded gaps

1. Run final repository check/build and exact-commit hosted CI; complete browser
   screenshots and authenticated owner/admin/representative acceptance.
2. Verify the additive migration against the confirmed shared project, current
   role grants, real PostgreSQL concurrency and Supabase advisors. PGlite tests
   are not proof of hosted permission compatibility or multi-connection races.
3. Configure the existing Stripe webhook to include refund and dispute events;
   verify signed isolated sandbox paid/failed/refund/dispute/retry lifecycles.
4. Exercise anonymous ref preservation through all five independent apps and both
   signup methods. The account attribution itself is shared; new dashboards are
   implemented in AkiPasa, not duplicated into each independent product.
5. Financial and legal approval remains mandatory before a separate migration
   can unlock incentives: rates, recurring arrangements, thresholds, schedules,
   Spanish invoicing/tax/employment/contractor classification, programme terms,
   refund rules and retention. This candidate intentionally does not decide them.
6. Admin attribution-dispute/fraud case review and customer review requests are
   implemented with own-reporter isolation and immutable audit. Refund/dispute
   holds create deduplicated review cases. Resolving a case does not rewrite an
   attribution or approve a payment. Automated fraud adjudication, audited
   attribution reassignment, payout approval and disbursement are not enabled.
7. Financial evidence retains Stripe references with the profile UUID nulled on
   account erasure; programme/code ownership is nulled, leads cascade. Confirm
   lawful retention and deletion/anonymisation procedures before activation.
8. No new external analytics collection is introduced. Consent-respecting CTA
   funnel instrumentation is owned by the separate navigation/conversion work.

Rollback: disable the runtime gate and revert the application source. Keep the
compatible additive tables/audit/evidence and deny writes; do not delete customer
attribution or financial history as rollback.
