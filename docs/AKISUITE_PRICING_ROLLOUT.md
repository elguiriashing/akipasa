# AkiSuite commercial separation: staged foundation

Requested 2026-10-12. The isolated catalogue is not connected to Stripe checkout, database entitlements or customer-facing prices.

Legacy billing currently maps premium, business and business_pro; business and business_pro represent old AkiHQ tiers, not AkiBusiness Premium. Never rename these in place or revoke existing subscriptions. The connected live Stripe account is labelled Alex Ashing LTD, and merchant ownership must be confirmed before creation of paid products.

Rollout scope: verify merchant and VAT rules; create product/price IDs in approved account; add workspace entitlements and backward-compatible database/webhook processing; build AkiBusiness Growth, recurrence, duplication, templates and server-enforced media quotas; add AkiDuermo features; update EN/ES membership and account screens; coordinate AkiHQ; run lint, typecheck, unit, browser, checkout and webhook tests before release. The consumer account must display only consumer membership.

Annual EUR prices in cents are Math.round(monthlyCents * 12 * 0.8). Enterprise €79.99 monthly includes AkiPasa Premium, AkiBusiness Premium, AkiDuermo Premium, AkiHQ Pro. The €7.99 add-on requires active HQ Pro, including on renewal/downgrade.

Dependencies: consumer and business accounts, staff roles, Stripe webhook, Supabase billing grants and RLS, media storage, event scheduling, analytics consent, localization, Cloudflare environment. Rollback: revert isolated catalogue commit; no Stripe resources or migrations created.

Verification: code review only. Automated checks and production tests not yet run; do not merge to live.
