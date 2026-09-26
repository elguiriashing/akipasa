# Business access, billing and catalogue search repair

Approved owners and managers of verified, published venues receive free Business access. Pending claimants can submit and track their claim without subscribing. Ownership does not grant Business Pro. Removing membership or suspending the venue reconciles access.

The live billing schema lacked the Stripe event timestamp column and entitlement reconciliation triggers. Migration 0082 restores these and makes failed or abandoned webhook processing retryable. The webhook reads current Stripe subscription-item period dates, preserves legacy payload compatibility, and records useful database errors. Checkout return refreshes server-owned membership state; the URL itself grants no access.

Search now queries all published venues using an indexed normalized document. Ranking occurs before pagination, with stable ordering, totals, scroll loading and a keyboard-accessible load-more button. Accommodation results link to AkiDuermo. No private or unpublished venues are exposed.

## Deployment

Apply 0082, then 0083, before publishing the public-site master branch. The timestamped Supabase migration files are identical mirrors. Reconcile an existing paid subscription only from verified Stripe data and its existing customer/profile mapping; do not create another charge or subscription.

## Validation

The application check includes typechecking, lint, build and automated tests. Database tests cover approval/revocation, isolation, payment cancellation, stale events, missing live triggers, webhook retries, search beyond 300 matches, normalization and unpublished rows. UI tests cover scroll pagination, query resets and stale responses. Cloudflare/OpenNext builds separately. Live browser acceptance covers homepage preservation and search; authenticated payment and claim approval require real account access and are not simulated by changing client state.

## Rollback

Revert the application commit before removing search RPC/index/column. Retain additive billing timestamp columns and restored billing triggers. Restore prior entitlement functions only if free ownership access must be withdrawn; then reconcile affected profiles. Do not reverse an existing paid subscription or modify Stripe pricing as a code rollback.
