# AkiSuite commercial separation: staged foundation

Requested 2026-10-12. The isolated catalogue is not connected to Stripe checkout, database entitlements or customer-facing prices.

Legacy billing currently maps premium, business and business_pro; business and business_pro represent old AkiHQ tiers, not AkiBusiness Premium. Never rename these in place or revoke existing subscriptions. The connected live Stripe account is labelled Alex Ashing LTD, and merchant ownership must be confirmed before creation of paid products.

Rollout scope: verify merchant and VAT rules; create product/price IDs in approved account; add workspace entitlements and backward-compatible database/webhook processing; build AkiBusiness Growth, recurrence, duplication, templates and server-enforced media quotas; add AkiDuermo features; update EN/ES membership and account screens; coordinate AkiHQ; run lint, typecheck, unit, browser, checkout and webhook tests before release. The consumer account must display only consumer membership.

Annual EUR prices in cents are Math.round(monthlyCents _ 12 _ 0.8). Enterprise €79.99 monthly includes AkiPasa Premium, AkiBusiness Premium, AkiDuermo Premium, AkiHQ Pro. The €7.99 add-on requires active HQ Pro, including on renewal/downgrade.

Dependencies: consumer and business accounts, staff roles, Stripe webhook, Supabase billing grants and RLS, media storage, event scheduling, analytics consent, localization, Cloudflare environment. Rollback: revert isolated catalogue commit; no Stripe resources or migrations created.

Verification: code review only. Automated checks and production tests not yet run; do not merge to live.

## Staged Growth UX

The Growth tab presents managed venues, events, and reported AkiPasa venue analytics with responsive layouts and direct links to existing event and venue editors. Premium is clearly marked unavailable, so no customer can accidentally purchase unfinished benefits. This is not implementation of recurrence, media quota, billing products or full historical reporting. Existing promotion requests remain unchanged.

CI note: All changed Growth and catalogue files were formatted through the existing PR formatter. The release remains gated by the complete verification suite and billing migration.

## Staged Stripe validation adapter

The typed src/lib/akisuite-stripe.ts maps each future AkiSuite plan/interval to a distinct environment price ID. Before new Checkout it validates Stripe active state, EUR amount, yearly discount, cadence and plan/interval metadata, and refuses the discounted HQ add-on unless HQ Pro is active. It does not enable checkout, process webhook events or grant database entitlements. Existing Stripe legacy price mapping stays intact. The live connected account lists as Alex Ashing LTD and had no active Stripe Tax registrations on 2026-10-12. Company-of-record and tax registrations must be verified before enabling new checkout. Unit tests are in tests/akisuite-stripe.test.ts.

## Staged backend billing, 2026-10-12

New migration `database/migrations/20261012180000_akisuite_subscription_entitlements.sql` creates an additive new subscriptions ledger, RLS, chronological webhook sync RPC and legacy-compatible entitlement expansion. Existing `billing_subscriptions`, `premium`, `business`, `business_pro` remain intact. The existing signed webhook now routes **recognised configured new price IDs** into `sync_akisuite_subscription`, while unknown prices are ignored. New Checkout code in `src/app/[locale]/account/subscription/akisuite-actions.ts` is deliberately gated behind AKISUITE_CHECKOUT_ENABLED, AKISUITE_TAX_READY, and AKISUITE_STRIPE_ACCOUNT_ID, plus new Stripe price configuration, matching account identity and per-user overlap checks. Without all gates no session is created. The new checkout action is not yet connected to public or account membership screens.

**Deployment requirements before production:** Verify SQL migration against disposable Postgres including RLS, subscription changes and legacy regression; verify webhook tests and expiry/downgrade semantics. Confirm organisation ownership model for workspace-level plans (current staged ledger is per billing profile). Configure Stripe Product tax codes and tax registrations and test actual customer tax breakdown. Validate AkiHQ access with new AkiHQ Pro, consumer plan badges, free venue ownership, multi-venue organisation and existing staff grants. Add live products only in correct legal account; avoid double billing when migrating subscriptions. Integrate pricing controls in AkiBusiness and AkiDuermo and update existing membership cards only after checkout prices exist. **This is not a finished/live billing migration.**

## Unified membership UX

All four AkiSuite products are now shown in one bilingual, responsive membership centre (`AkiSuiteMembershipHub`) on the canonical account billing page. The account shows exact subscriptions only when read successfully, categorises historical paid AkiPasa and AkiHQ plans correctly, and allows payment management through existing Stripe Customer Portal. New AkiSuite records are queried only once `AKISUITE_SUBSCRIPTIONS_READY=true` to avoid exposing a missing migration as a false empty list. Public `/membership` now always shows the new pricing grid with checkout disabled until explicitly enabled; old purchasable plans remain disclosed separately for existing customer continuity. Aliases `/account/membership` and `/account/memberships` redirect to canonical account subscription. Companion AkiHQ PR #25 adds the shared link.

## CI repair checkpoint

Fixed the unsupported Growth navigation icon, removed a duplicate subscription-error alert, and added the membership hub regression test to the formatting workflow. Re-run all checks before approving deployment. Keep paid checkout disabled until its database and feature gates have been verified.

Stripe webhook unit tests now explicitly resolve the new price-validation adapter in Vitest. Formatter committed the changed test file; a fresh full verification run is required before merge.

Membership recovery now gates the central billing action on profile-read success, preventing duplicate payment controls during partial account failures. The formatter has normalised the patch and a fresh full CI run is required.

The responsive public-browser suite now explicitly checks the seven-plan catalogue and expands legacy plans before asserting their preserved account-creation links. The formatter has committed the updated browser assertions.
