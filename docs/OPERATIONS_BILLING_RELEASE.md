# Operations billing release checkpoint — 2026-10-20

## Contract

AkiHQ remains the free ownership/location hub. AkiBusiness operations are per private operating location. Listing Premium and personal Premium are independent. Canonical approved monthly EUR prices are Básico 24.99 (`price_1USgZRGfzDhsgsQZaZYnAjZC`), Standard 44.99 (`price_1USgZhGfzDhsgsQZBLuFFQ3c`), Pro 64.99 (`price_1USgZiGfzDhsgsQZYEgPv3HL`). No annual price is invented.

The sole signed leased Stripe webhook remains AkiPasa. It retrieves the current subscription and expanded invoice, validates actual paid invoice lines and customer/workspace binding, then atomically synchronizes authoritative tool access. Checkout return pages never activate access. Duplicate webhook/cron events are idempotent. Failed renewals do not extend paid access; failed upgrades retain the existing paid tier until expiry. Canceled/unpaid/paused/incomplete/expired states cannot grant access. Trials and promotional access must use an explicit separately approved entitlement, never an unpaid checkout inference.

Owner-only checkout reserves one durable workspace lease before contacting Stripe. A customer cannot create a second subscription for the same workspace or bypass an existing legacy business subscription. Expired/ambiguous reservations remain held for service reconciliation, rather than automatically allowing duplicate async payments. Pro automatically selects all12; lower tiers require exact4/8. Upgrade confirmation uses a dedicated hosted portal restricted to the three approved prices and always_invoice; only verified paid invoices expand tools. Lower tiers use an explicit schedule on the SAME subscription, preserving current paid phase/settings and applying the selected lower price at paid renewal with proration none. They never use an immediate portal downgrade.

## Legacy migration

The approved three legacy business/business_pro customers move to Básico monthly at their current paid renewal; annual business_pro remains paid through its annual expiry before becoming monthly. Personal Premium remains untouched. No production customer data is committed.

Run the offline `tools/prepare-operations-migration.mjs --input PRIVATE.json --output PRIVATE-manifest.json` in AkiBusiness. Input must be a complete current Stripe/ledger/ownership snapshot and explicit reviewed scope approvals. It performs no network calls and has no apply mode. Missing/mismatched payments, schedules, owners, scopes, partial snapshots or unexpected source settings block readiness. SHA256 seals the deterministic manifest; output is mode0600 and refuses overwrite. A reviewed fallback initial toolbox is crm/tasks/calendar/employees; owners can choose another exact4 before activation.

For each ready row: verify live source still matches sealed snapshot; invoke service-only `provision_crm_operations_migration` using the deterministic request ID and approved profile/name; inspect private workspace and owner membership; bind with `bind_crm_operations_migration`; allow owner initial configuration at the operations account screen; retrieve/create same-subscription schedule and use the strict schedule preview recipe. Preserve existing phase/taxes/discounts/payment settings through paid expiry. Confirm provider schedule readback and invoice preview before applying a live schedule. Store provider schedule ID and immutable evidence. Do not revoke legacy ledger access early. The first verified operations invoice retires only that migrated business ledger row atomically; personal records remain.

Initial owner configuration is editable only while no toolbox row exists. Activation permanently closes this path; subsequent swaps use normal monthly limits. Provisioning is private and creates no public venue, and never impersonates a user.

## Required release gates

Apply the current canonical toolbox migration first, then `20261020172801_operations_checkout_lifecycle.sql` once in the shared Supabase project. The identical database/supabase copies are alternative migration runners, not two executions. Verify real-schema migration and privilege advisors. PGlite tests execute least-privilege owner/service paths and deny cross-owner access, but do not substitute for hosted schema acceptance.

Activate the existing inactive prices only after approved release. Verify `STRIPE_MERCHANT_ACCOUNT_ID`, actual Spanish tax registration and automatic-tax settings; tax readiness is not a legal determination. Configure `STRIPE_OPERATIONS_PORTAL_CONFIGURATION_ID` with only approved3 prices and always_invoice. Runtime flags `AKIBUSINESS_OPERATIONS_CHECKOUT_READY`, `AKIBUSINESS_OPERATIONS_BILLING_READY`, `AKIBUSINESS_OPERATIONS_TAX_READY` default off until these checks and sandbox flows pass. The AkiBusiness cron requires a restricted read-only `STRIPE_TOOLBOX_RESTRICTED_KEY`; no second webhook or Stripe write key is added to Business.

Verify sandbox checkout, paid/unpaid upgrade, scheduled downgrade, renewal, cancel, refund/dispute referral hold and cron missed-event recovery; then exact-commit CI/build and EN/ES mobile/tablet/browser acceptance before enabling. Refunds/chargebacks retain existing platform referral hold handling; no commissions/payouts are enabled. No live subscription, price activation, schema or charge was performed by this implementation.

## Known recovery / rollback

A stale checkout lease or >23-hour ambiguous schedule-create response requires service reconciliation with Stripe before release/reuse. Automated operator UI/release RPC is not supplied. Scheduled change conflicts fail closed and need review; cancellation/resubscribe of a previously bound workspace needs explicit service reconciliation. Preserve bindings/evidence and retained tool data. Disable checkout flag to stop new changes; disable billing flag to revert to existing cron behavior only after checking already-enrolled subscriptions. Never blindly disable tool enforcement or delete migrations/ledger. Rollback of paid enrollment requires reviewed grandfather access, not deletion of customer data.

## Local evidence

Pure lifecycle/manifest tests15; worker adapter2 and toolbox10; actual SQL role/transaction tests8; checkout7 and schedule4. Typecheck and scoped lint/format are recorded at handoff. Hosted exact-commit CI, full integrated build and provider sandbox acceptance remain release gates.
