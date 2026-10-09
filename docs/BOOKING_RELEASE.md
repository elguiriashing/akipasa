# Booking release runbook

## User setup after deployment

1. In Resend, create an API key with **Sending access** scoped to the verified **akipasa.com** domain.
2. In Cloudflare, open **Workers & Pages → akipasa → Settings → Variables and Secrets → Add**.
3. Choose **Secret**. Variable name: **RESEND_API_KEY**. Value: paste the Resend key. Choose **Deploy**, not only Save version.
4. This is the production Worker's runtime secret, not a build-only variable, frontend NEXT_PUBLIC variable, Cloudflare API token or Supabase key. Never put it in source code or commit an environment file.
5. Sender defaults to **AkiPasa <contact@akipasa.com>**. A separate BOOKING_EMAIL_FROM runtime value is optional, not required. The already-used SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must remain configured; do not replace them with the Resend key.
6. In each venue's **Reservations → Settings**, optionally set a dedicated venue confirmation address. Otherwise the queue uses an actual verified owner address. If neither exists, the business view shows the missing-recipient status until configured and retried.

Approvals and My Bookings work without the mail key. Messages stay queued, without consuming attempts, until configuration exists. After the key is deployed, the five-minute scheduled dispatcher processes due confirmations for bookings that are still confirmed. Approval also attempts immediate delivery. Queued messages are not retroactively created for bookings confirmed before this release.

## Deployment acceptance

- Run the app's checks and Cloudflare packaging on the exact PR commit.
- Run the disposable PostgreSQL integration suite including the two new migrations; test permission denial, overbooking races, idempotency, date handling, history isolation, outbox claims and retry leases.
- Run customer and manager browser acceptance at 360px and desktop in both locales and themes. Download and inspect the screenshots, not merely the exit status. The harness loads actual dashboard-scoped CSS and uses customer-visible mode labels.
- Apply `20261009160000_booking_notification_email.sql`, then `20261009170000_booking_release_integrity.sql`. No historical booking, offering or resource row is deleted.
- Merge only the tested head to master. A successful GitHub build is not Cloudflare edge deployment proof.
- Verify GET `/api/bookings/release` returns `2026-10-09-booking-ux-r1`, and inspect EN/ES public home, venue detail and anonymous protected routes. Verify the same release marker on business.akipasa.com.
- Record actual post-merge build and live-check evidence in the PR. Authenticated production behavior and real provider delivery require a valid session/runtime secret; do not invent this evidence.

### Wider site regression limitation

The existing 63-case `npm run test:e2e` suite was attempted in an isolated runner and timed out after 20 minutes. Its discovery/map loaders still called the unprovisioned local Supabase catalogue despite fixture mode, producing repeated `Public venue query failed: TypeError: fetch failed` errors. This is **blocked**, not passing, and is separate from the booking-specific browser matrix and actual PostgreSQL role/capacity acceptance. No existing test file or pre-existing repository check was removed. The new workflow retains the broad suite as an explicit manual staging run requiring `BOOKING_STAGING_SUPABASE_URL` and `BOOKING_STAGING_SUPABASE_ANON_KEY`; do not substitute production credentials or claim it passed. Booking component/browser, SQL and standard repository checks remain automatic PR gates. Production public-route smoke evidence is captured separately after the connected deployment.

## Email operations

The outbox records customer and venue messages independently. Status `sent` means the provider accepted the request and returned an ID. Delivery, bounce or inbox placement must be checked in Resend logs; they are not implied by `sent`.

A missing key does not claim a message or exhaust retries. Failed deliveries retry with backoff; ten-minute expired leases recover after worker interruptions. Stable provider keys and immutable snapshots make retry safe within the provider window. An ambiguous message older than 23 hours goes to `review` rather than being blindly resent after the provider's 24-hour idempotency retention. Check the provider log before resolving such cases manually. Never send confirmation for a cancelled booking.

Private queue payloads and settings are not public catalogue data. Account deletion cascades through bookings to queued mail; customer exports contain their own booking data and their customer-facing confirmation snapshot, not private venue recipient settings.

## Rollback

Keep the additive schema and data. Do not drop outbox tables or loosen the new grants/policies to make an old client pass. Pause cron delivery when investigating provider faults; restore a compatible reviewed Worker version and re-run capacity, authorization and save-navigation smoke tests. Never unconditionally replay successful or uncertain old messages.
