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
