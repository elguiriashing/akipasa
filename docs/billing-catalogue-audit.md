# Billing catalogue and fulfillment audit — 28 September 2026

## Live catalogue

| Plan             | Monthly EUR | Annual EUR | Monthly price                  | Annual price                   |
| ---------------- | ----------: | ---------: | ------------------------------ | ------------------------------ |
| Personal Premium |        1.99 |      19.99 | price_1U7vvqGfzDhsgsQZ1QwqXMjR | price_1U7vwYGfzDhsgsQZ4aJ2vkEn |
| AkiHQ Business   |          20 |        190 | price_1Ty802GfzDhsgsQZPLHDu9qp | price_1Ty80FGfzDhsgsQZYrgDHG7Y |
| AkiHQ Pro        |          60 |        570 | price_1UB3nzGfzDhsgsQZ4HNDaIiM | price_1UB3okGfzDhsgsQZ2Wy6ArO8 |

All six prices existed, were active, and matched `wrangler.jsonc` and the live Spanish membership screen. Pro has one product with two recurring prices. Premium and Business retain their historical separate monthly/yearly products to avoid disturbing existing subscriptions.

Added plan/interval metadata to the current Premium prices and lookup keys to Premium and Business. Archived the obsolete EUR 5/month and EUR 48/year Premium prices for new purchases. Existing subscriptions are not migrated or charged; the webhook still recognizes those legacy IDs.

## Application changes

- Checkout retrieves the configured price and checks active status, EUR amount, interval and interval count against the advertised package before creating a session or upgrade.
- Approved venue owners can purchase Business as well as Pro without repeating business review. Existing Pro subscribers cannot accidentally buy a concurrent lower Business subscription.
- Fulfillment handles paid/no-payment-required Checkout, delayed successful Checkout, paid/failed invoices, and created/updated/deleted/paused/resumed subscriptions. It retrieves current subscription state, resolves the plan from the configured price, and uses existing subscription/customer ownership before server-created metadata fallback.
- Unknown products cannot grant access through plan metadata. Duplicate events retain the existing event lock and database event-order protections.
- Business-to-Pro pending upgrades use the existing customer/subscription identity and omit metadata changes unsupported by older API versions.
- The success page does not grant access. Failed, canceled, unpaid and paused states flow through the existing reconciliation trigger; free verified venue ownership remains independent of payment.

## Database audit

The live database contains the enabled billing-to-profile and profile-to-CRM package triggers. Premium maps to personal membership; Business and Pro map to their corresponding business tiers, with Pro including Business. CRM package definitions exist for all six business categories (seven tools for Business and twelve for Pro). No database schema or customer entitlement changes were required.

The sole live Stripe subscription at audit time was Business monthly, matching the database Business tier. No live Pro subscription was present; do not treat that purchase as a Pro end-to-end acceptance test.

## Deployment and verification

Deploy public-site `master`, retaining its current UI. After deployment, enable these events on the existing AkiPasa webhook:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `customer.subscription.resumed`
- `invoice.paid`
- `invoice.payment_failed`

Automated coverage validates all six price mappings, wrong amount/currency/interval and archived-price rejection, event fulfillment, delayed invoice cancellation safety, unpaid checkout, duplicate events and unrelated products. Run `npm run check` before deployment. Real paid purchases of all six variants were not performed.

Tax behavior on these existing prices is unspecified. This audit does not validate IVA/Stripe Tax configuration or change tax settings.

Rollback application changes with a revert commit; retain catalogue metadata and archived obsolete prices. If reverting the event handlers, restore the original four-event endpoint subscription list as well.
