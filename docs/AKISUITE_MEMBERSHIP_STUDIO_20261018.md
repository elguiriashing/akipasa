# AkiSuite membership studio (2026-10-18)

## Offer placement
- AkiPasa.com /en/membership and /es/membership: AkiPasa personal Premium (hidden until unlocked), AkiPasa Premium for businesses, AkiBusiness Standard, AkiBusiness Pro, AkiEnterprise.
- AkiDuermo.com /membership?lang=en|es: AkiDuermo personal Premium (hidden), property Premium for businesses, AkiBusiness Standard, AkiBusiness Pro, AkiEnterprise.
- AkiCoches.com /membership?lang=en|es: AkiCoches personal Premium (hidden), rental-branch Premium for businesses, AkiBusiness Standard, AkiBusiness Pro, AkiEnterprise.
- AkiHQ.app /en/membership and /es/membership: AkiHQ management-facing overview with business and Enterprise offers. The AkiBusiness paid operations app is not the discovery/pricing host.
- AkiPasa.com /en/account/subscription and /es/account/subscription remain the *billing-history and subscription-management* host until verified, cross-domain product checkout is ready. They must not show unrelated product's sales cards.

## Approved staged v2 catalogue (Stripe live account, products inactive)
- Personal discovery Premium: €1.99/month, €19.10/year per person, each discovery app.
- Premium for businesses: €14.99/month, €143.90/year per public venue/property/rental branch respectively.
- AkiBusiness Standard: €24.99/month, €239.90/year per operating location.
- AkiBusiness Pro: €64.99/month, €623.90/year per operating location.
- AkiBusiness Plus: €44.99/month, €431.90/year staged but intentionally omitted from requested five-card sales view.
- AkiEnterprise: **new bundled SKU and entitlement mapping not approved**. Display a non-purchasing enquiry action, NOT the active legacy €79.99/month Enterprise subscription.

All prices are staged before applicable taxes. The public studio routes enquiries by email and never claim to activate an inactive Stripe price. Existing billing plans, entitlement checks, workspaces and active subscriptions are deliberately unchanged.

## Adoption points gate
- Server-read `feature_flags.personal_premium_unlocked` defaults to false if row absent, database errors or unavailable config. It is never derived from client-side search or URL parameters.
- SQL seed: `database/migrations/20261018_akisuite_personal_premium_rollout.sql`, additive, disabled by default, **not yet applied by this branch**.
- The future Excel/Google Sheets job must verify source freshness, compute municipality-weighted active-user points, compare against an **explicitly approved threshold**, and write only the feature flag using privileged server credentials. The threshold is intentionally undefined until approved.
- Existing legacy AkiPasa personal checkout and plan replacement server actions also check the flag, while existing subscribers can still manage their current billing.
- Staged new v2 personal Stripe products remain inactive and MUST NOT be activated solely because the UI gate opens.

## Release hold
Do not merge/deploy unless each repository's lint/typecheck/tests/build and relevant browser breakpoints pass on the exact candidate heads. Review GitHub Action results and domain Worker source bindings. Do not merge AkiDuermo's application branch into main or trigger unintended worker cutover as a side-effect of a pricing-only release. Confirm checkout/account callbacks and Stripe webhooks remain on their trusted origins. Preserve GDPR/IVA approval gates.
