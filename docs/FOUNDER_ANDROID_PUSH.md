# AkiPasa Founder Android Push (FCM)

Status: source-only candidate, DEFAULT DISABLED. Feature may not be advertised live until Firebase, Supabase migration, founder IDs, CI and signed-device acceptance are verified.

## Firebase console (project `akipasa-android`)

1. Project settings > General: Android app `com.akipasa` is registered. The client `google-services.json` is committed beneath `Android/app/` (contains only client config, NOT a service account).
2. Project settings > **Cloud Messaging**: confirm Cloud Messaging API (V1) is enabled. The **Integrations** catalogue is irrelevant.
3. Use **Google Cloud IAM & Admin > Service Accounts** to create/select a dedicated FCM sender for this project. Prefer a custom role containing only `cloudmessaging.messages.create`; do not grant project Editor, Owner, Firebase Admin or Analytics permissions. The runtime exchanges the confidential service-account assertion for a short-lived OAuth token scoped to Firebase Messaging. Store the credential exclusively as a **Cloudflare Worker secret** `FIREBASE_SERVICE_ACCOUNT_JSON`; NEVER commit it or paste it into chat. Remove any temporary download after verified secure transfer. Rotate/revoke its key through IAM when required. A future keyless broker requires separate reviewed infrastructure and is not implemented here.
4. Cloudflare runtime secrets/settings (server only):
   - `AKIPASA_PUSH_ENABLED=true` (LAST, after all acceptance).
   - `AKIPASA_PUSH_STARTED_AT=<activation UTC timestamp>` is required for production delivery: `YYYY-MM-DDTHH:mm:ssZ` or exactly three fractional digits. Missing, malformed, impossible or future timestamps fail closed. Set it to the actual activation time on every enable/reactivation, never to the migration or deployment time. Claims and queued jobs older than this cutoff, including retries, are blocked permanently rather than replayed.
   - `AKIPASA_PUSH_ENROLLMENT_ENABLED=true` enables only authorized native enrollment; it does not send claim events.
   - `AKIPASA_PUSH_TEST_ENABLED=true` permits explicit tests on the caller's registered device when enrollment is enabled; it does not send claim events.
   - `AKIPASA_PUSH_FOUNDER_IDS=<founder UUID 1>,<founder UUID 2>`, authoritative Supabase auth user UUIDs for the two owner-approved business accounts only. Exclude the separate Gmail administrator; retain actual account identifiers in private configuration.
   - `FIREBASE_PROJECT_ID=akipasa-android`.
   - `FIREBASE_SERVICE_ACCOUNT_JSON` as confidential worker secret.
   - `AKIPASA_PUSH_WEBHOOK_SECRET`, at least 32 cryptographically random characters, matching Supabase Vault secret `akipasa_push_webhook_secret`. Never put its value into source or logs.
   - Existing Supabase URL and service role credentials must remain correctly configured.
5. Apply the reviewed additive SQL migration `20261027001500_founder_push_claims.sql` (identical database/Supabase mirrors) to the verified production project below. The allowlist starts empty; configure only the owner-approved founder UUIDs with the recorded adult attestation. Both the private database allowlist and Worker UUID allowlist are required, together with current administrator role and live session. Do not modify unrelated administrators or user profile roles.
6. Build and sign a new Android AAB, ship via Play internal testing. Run a signed-in founder device through Staff; Android asks for notification permission on Android 13+. Other accounts never initialize FCM merely by launching the consumer app. Visiting Staff again refreshes a token registration lease.
7. Use the authenticated founder test-notification action on an enrolled Android device. It sends an explicitly labelled test event and creates no venue, customer, or ownership claim. Keep automatic production claim delivery disabled during this acceptance. Confirm receipt in foreground/background, exact-claim navigation separately using authorized existing records, logout, suspended founder account, stale/rotated tokens, no applicant information in notifications, no consumer FCM token, and no duplicate retry on uncertain delivery.
8. Existing Resend founder emails are independent and remain operational.

## Safety

- DB tables are inaccessible to browser SQL/REST roles; only service_role can view tokens. The HTTP registration route requires Supabase authentication plus current administrator app_role and a private founder UUID allowlist.
- FCM data-only payload contains event type/UUID, the claim UUID for claim events or test UUID for test events, locale and a Supabase session binding. No applicant, venue, contact or evidence content is sent. Display uses generic branded EN/ES text only after a fresh server eligibility check and matching payload/local/current session; offline or denied checks produce no notification.
- Email fallback remains separate. The claim insert creates a private per-device outbox entry; optional pg_net sends a post-commit wake-up containing only the claim UUID to the fixed authenticated Worker endpoint. This starts immediate push dispatch without adding provider latency to claim submission or email. Cloudflare cron scans due pushes every **five minutes** for recovery. A missing Vault secret disables the wake-up without rejecting the claim or email.
- A signed-out founder's push device records are revoked before sign-out. Remote session revocation and account switch require acceptance before production.
- Stale deliveries (>1 hour) are skipped; the required activation cutoff also rejects disabled-period claims and queued retries. Update the cutoff every time production delivery is re-enabled.
- Device enrollment expires after 30 days and is renewed through authorized foreground registration. A device left closed beyond that lease does not receive founder notifications until authorized registration renews it; ordinary access-token refresh alone does not renew the device lease.
- Turn off by setting `AKIPASA_PUSH_ENABLED=false` immediately. Do not disable existing email notifications.

## Testing without a customer claim

With production delivery **false**, configure credentials and the reviewed allowlists, then enable only enrollment and explicit tests. Install the signed test build, log into the intended founder account and enter Staff. Allow Android notifications and use **Send test notification**. The private endpoint accepts only the current authenticated session's registered token, validates both allowlists/adult/current admin/live session, and enforces a 60-second device cooldown.

`POST /api/admin/push-test` returns `accepted: true` and a test UUID only after FCM accepts the request. It does not create a claim, send a Resend email, or prove device receipt. The Android receiver revalidates the live account/session before showing the branded test notification. Repeat with the app backgrounded using another authorized test initiation and record the observed device result. Do not enable the production switch from HTTP acceptance alone.

The native request contract is first-party HTTPS with the current WebView cookie, `Origin: https://akipasa.com` and the native user agent. `GET /api/admin/push-devices` returns `{eligible:true, registration_key, locale, test_enabled}` after server authorization; `registration_key` identifies the current Supabase session. The corresponding POST accepts only `{token, registration_key}` and returns 204 on registration. DELETE accepts only `{token}` and withdraws that caller/session's token even after enrollment is disabled. Neither route accepts a recipient user ID.

The test POST accepts the same token/session fields and returns 200 `{accepted:true,test_id}` only on provider acceptance. A missing gate returns 404, denied identity/binding/device 403, malformed input 400, the atomic cooldown 429, and unavailable/unconfirmed processing 503. Responses are private/no-store. Supabase SSR refreshes expired access cookies from the existing refresh cookie; Next attaches rotated `Set-Cookie` headers, and native code persists them only if the originating account cookie snapshot is still current. Refresh retains the same session binding; session revocation does not.

## Release gates and rollback

All new flags default closed. Complete local SQL/native/API checks and full required CI, apply and verify the backward-compatible schema, merge only the reviewed passing source and record the Cloudflare build/deployment and live source SHA. Production delivery remains false throughout. Sign with the existing upload identity, distribute only through internal testing, and install the updated binary; a website deployment cannot update the installed native receiver. Enable automatic claim delivery only after actual authorized-device receipt, exact-claim navigation and revocation acceptance, setting a fresh activation cutoff at that time.

For rollback, close production delivery first, then enrollment/tests as necessary. Retain private outbox/audit history. Remove the Vault wake secret or disable the new push trigger if needed; preserve the existing independent email trigger. Restore the previous verified Worker version if application behavior regresses. Never publish a Play production release as part of this procedure.

Focused local evidence: the six-file founder suite passed 67 cases, including 17 actual PGlite migration/role cases, two installed Supabase SDK/Next cookie-adapter refresh cases and transient Auth failure coverage. It used borrowed checkout dependencies, so this does not replace an exact locked install or full CI. The suite is mandatory through `npm test` and `npm run check`. Native Gradle execution was stopped after 313 seconds without task progress; no native pass, signed build, installation or real-device receipt is established.

## Firebase analytics

**No Firebase Analytics SDK is added.** Do not import it from the Firebase setup wizard. The SDK's automatic FCM initialization is disabled for ordinary discovery users.

## Configuration evidence, 27 October 2026

- Firebase Console General confirmed project `akipasa-android`, number `238525224046`, Android package `com.akipasa`, app ID `1:238525224046:android:5f9ae20ec798a9a833427f`.
- Firebase Console Cloud Messaging explicitly showed HTTP v1 enabled and the legacy API disabled. The project remains on Spark; this work does not require a plan upgrade.
- The production Worker uses `https://akipasa.supabase.co`. Its API response identifies project `vhpbvcfkcteswlsdjrfl`; the dashboard name **AkiPasa Development** is misleading and must not be used to choose a different database. Match the project reference and production endpoint before migration.
- The owner explicitly selected only the two business-email founder accounts and confirmed both founders are adults. The separate Gmail administrator is excluded. UUIDs belong in the private allowlist and Worker configuration, not client bundles. Current administrator status and a valid session remain additional mandatory checks.
- Before this change, production Worker version `d408d831-6764-4909-9fcc-65422ddf8c01` served 100% of traffic, and no Firebase or push settings/secrets were present. This records the inspected baseline, not a new deployment.
- Firebase API enablement and successful CI are not proof that a device received a push. Record the installed build, authorized account, timestamp, server result, device observation and tap result before enabling automatic claim delivery.

## Physical-device acceptance

Keep a receipt for each check: initial permission denial and later grant; both founders; multiple devices on one account; an unlisted administrator; moderator, owner, consumer and underage denial; foreground/background/closed app; duplicate event; logout; account switch; remote session revocation; admin removal; notification permission withdrawal; invalid token and transient Firebase failure; exact selected claim beyond page one; EN/ES authentication return.

Android force-stop and vendor battery restrictions can prevent background execution. Record Xiaomi behavior directly rather than promising delivery while the operating system has stopped the application. A Firebase accepted-message ID proves provider acceptance only. An observed system notification on the intended device is required to claim delivery.
