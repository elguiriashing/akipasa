# AkiSuite offer and entitlement scope matrix

**Checkpoint:** 2026-10-15, read-only review of AkiPasa `master` at
`cb400dfd43e52b4ae56dbafcc95646f25500605f`, the live Stripe account
`acct_1SVLH2GfzDhsgsQZ`, current source gates, and the pending subscription
migrations. This document is a reconciliation baseline; it does not activate
checkout, authorize repricing, or change any subscriber.

## Product target and observed offer state

The monthly amounts below are the approved target from the product brief. A blank
or gated capability means there is no truthful checkout promise yet. Free AkiHQ
management and free basic listing management remain available.

| Product / offer        | Approved target and billing scope                       | Current Stripe catalogue / source state                                                                                                                                                                                   | Readiness and next implementation boundary                                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AkiPasa Premium        | €1.99/month; individual AkiPasa account                 | Existing legacy `premium` is €1.99/month and €19.99/year. New `akipasa_premium` is €1.99/month and €19.10/year.                                                                                                           | Implemented personal benefits are double Passport XP, participating-venue member offers, and calendar export for saved events. Legacy Premium grants remain valid. The distinct new catalogue offer still cannot be sold until the migration, tax, sandbox and lifecycle gates below pass. |
| AkiDuermo Premium      | €1.99/month; individual AkiDuermo account               | No personal AkiDuermo Premium product. Existing new `akiduermo_premium` is €5.99/month and €57.50/year, currently described as property/business upgrade in rollout docs.                                                 | Do not reuse the €5.99 property offer as personal Premium. Define real individual benefits and align scope before creating/activating checkout.                                                                                                                                            |
| AkiCoches Premium      | €1.99/month; individual AkiCoches account               | No product or price found in the active live catalogue.                                                                                                                                                                   | Benefits and corresponding capability checks must be defined before checkout.                                                                                                                                                                                                              |
| AkiPasa for Business   | €14.99/month per AkiPasa listing/location               | New `akibusiness_premium` is €14.99/month and €143.90/year; its public name conflicts with the target AkiBusiness operations brand.                                                                                       | Keep current price IDs inactive for checkout. Separate the stable listing capability from application/product branding; verify listing-only enforcement and actual paid features.                                                                                                          |
| AkiDuermo for Business | €14.99/month per property/listing, not per room         | Existing `akiduermo_premium` is €5.99/month and €57.50/year.                                                                                                                                                              | Reconcile the current property-offer price with the approved €14.99 target. Target: independent accommodation management; coordinated schema/app changes are still required because current units/reservations require venue_id. No new price or repricing is performed here.                                                                                                   |
| AkiCoches for Business | €14.99/month per rental branch/listing, not per vehicle | No product or price found in the active live catalogue.                                                                                                                                                                   | Define branch-scoped paid capabilities and enforce them for only that branch before checkout.                                                                                                                                                                                              |
| AkiHQ                  | Free shared management hub; no AkiHQ subscription       | New live `akihq_standard` €20/month / €192/year and `akihq_pro` €60/month / €576/year; `akihq_business_addon` €7.99/month / €76.70/year; Aki Enterprise €79.99/month / €767.90/year. All are active Stripe price objects. | These offers conflict with the agreed free AkiHQ destination and must not be newly sold. Preserve existing historical contracts/entitlements where found; do not deactivate prices or mutate customers as part of this documentation.                                                      |
| AkiBusiness Standard   | €24.99/month per operating location                     | No matching operational product/price found. The independent AkiBusiness Worker still has all five AkiSuite gates false.                                                                                                  | Operational feature matrix, included staff definition, location entitlement, end-to-end acceptance and tax readiness are incomplete; no checkout.                                                                                                                                          |
| AkiBusiness Plus       | €44.99/month per operating location                     | No matching operational product/price found.                                                                                                                                                                              | Plus allocation is commercially and functionally undefined; keep only this offer unavailable until defined. Continue unrelated migration.                                                                                                                                                  |
| AkiBusiness Pro        | €64.99/month per operating location                     | No matching operational product/price found.                                                                                                                                                                              | Define only capabilities that exist and pass tests; location scope and staff limits must be enforced server-side before checkout.                                                                                                                                                          |

The 14 active `akisuite_2026_*` recurring prices in Stripe currently consist of
seven product keys with monthly and annual prices: `aki_enterprise`,
`akihq_business_addon`, `akihq_pro`, `akihq_standard`, `akiduermo_premium`,
`akibusiness_premium` and `akipasa_premium`. Their presence and `active=true`
are not proof that the product brief is implemented or checkout-ready. Stripe
price IDs, amounts, tax behavior and metadata are inventoried in
[`akisuite-live-price-audit.json`](./akisuite-live-price-audit.json); retain that
non-secret audit as the technical source for IDs.

## Legacy plan compatibility is separate from new offer semantics

A fresh live read found four active subscriptions, without reading or publishing
customer names or contact details:

- Two legacy `business` subscriptions, each at €20/month.
- One legacy `premium` subscription at €19.99/year.
- One legacy `business_pro` subscription at €570/year.

Existing Stripe plan/price IDs, renewal interval, cancellation behavior, discounts,
webhook reconciliation and grant history must remain unchanged. The codes
`premium`, `business`, and `business_pro` are historical capability identifiers,
not aliases for similarly named future applications or offers. In particular,
legacy `business_pro` must never confer new AkiBusiness operational access merely
because AkiBusiness now names the operations app. Existing SQL compatibility maps
legacy plans to old AkiPasa listing and AkiHQ capabilities; review that mapping
before any future semantic cleanup. Do not rename Stripe products, rewrite price
metadata, migrate subscribers, or infer user/business scope from matching names.

The current pending SQL migration deliberately maps old `business`/`business_pro`
to certain AkiSuite-era entitlements. It remains unapplied according to the
current runbook's live schema check. Any future code/schema work must preserve
legacy behavior while using separate stable capability IDs and explicit scope for
new listing and operating-location offers.

## Checkout and migration gates observed

- Wrangler/app config has `AKISUITE_CHECKOUT_ENABLED`,
  `AKISUITE_TAX_READY`, `AKISUITE_SUBSCRIPTIONS_READY`,
  `AKISUITE_FEATURES_READY`, and `AKISUITE_BILLING_VERIFIED` set to `false`.
  The standalone AkiBusiness worker also has all five false.
- AkiPasa source currently expects the seven 2026 plan keys, not the target
  personal Duermo/Coches + listing products + three location operations offers.
- The new `akisuite_billing_subscriptions` ledger and private launch settings are
  absent from the production schema per the latest runbook probe. The migrations
  remain pending; the legacy billing tables/webhook are still in use.
- Stripe live account has zero verified active tax registrations in the checked-in
  audit. The current 14 new prices have inclusive tax behavior, but no evidence
  supplied confirms the legal tax treatment, merchant invoice identity, VAT
  registration/jurisdiction, or suitability of the tax codes. Do not infer tax
  readiness from Stripe's `inclusive` setting.
- New personal benefits, listing-upgrade capability boundaries, operational tier
  allocations, Plus features, tax/VAT treatment, supported annual-price policy,
  and hosted sandbox/lifecycle acceptance are not complete. No new live checkout
  is safe until those specific items are resolved.
- Never grant access from checkout return URLs. Continue to require verified,
  idempotent, correctly scoped webhook processing and server-side authorization.

## Required scope invariants for the next billing implementation

1. Person Premium is scoped to the individual's account and never grants business
   ownership, team administration or operations access.
2. A listing upgrade is scoped to one product listing/property/branch. It cannot
   unlock another vertical or another company's listing. Accommodation is per
   property; rentals are per branch, regardless of room or vehicle count.
3. AkiHQ stays free for legitimate basic management. Listing upgrades are optional.
4. Operations access is scoped per operating location, independent of public
   listing purchases or existence. Staff access is permission-based and is not
   charged merely per sign-in.
5. Membership permissions and paid capabilities remain separate server-side
   checks. Changing a subscription must not expand tenant or role access.
6. Existing subscribers keep contracted prices and legacy access. New public brand
   names never redefine an existing Stripe ID, plan code or historical grant.

## Verification performed

Read-only Stripe API inventory on 2026-10-15 confirmed the live account identity,
active new product/price records and four active legacy subscriptions. Source
inspection confirmed all five AkiSuite checkout/readiness flags are false and the
new ledger migration is pending. Documentation validation: `git diff --check`
passed. Application test suites were not run because this change is documentation-only;
required PR checks remain authoritative. No Stripe writes, production data changes,
checkout sessions, customer emails or test charges were made. This is not sandbox,
webhook, authenticated-user, or production checkout acceptance.
