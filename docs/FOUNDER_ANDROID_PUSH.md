# AkiPasa Founder Android Push (FCM)

Status: source-only candidate, DEFAULT DISABLED. Feature may not be advertised live until Firebase, Supabase migration, founder IDs, CI and signed-device acceptance are verified.

## Firebase console (project `akipasa-android`)

1. Project settings > General: Android app `com.akipasa` is registered. The client `google-services.json` is committed beneath `Android/app/` (contains only client config, NOT a service account).
2. Project settings > **Cloud Messaging**: confirm Cloud Messaging API (V1) is enabled. The **Integrations** catalogue is irrelevant.
3. Use **Google Cloud IAM & Admin > Service Accounts** to create/select a dedicated least-privilege FCM sender service account for the Firebase project, with `Firebase Cloud Messaging API Admin` or a narrower custom role with `cloudmessaging.messages.create`. Only if organizational policy permits: generate a JSON key and store the entire JSON as a **Cloudflare Worker secret** `FIREBASE_SERVICE_ACCOUNT_JSON`; NEVER commit it or paste it into chat. Prefer a keyless signing/broker approach before production if feasible.
4. Cloudflare runtime secrets/settings (server only):
   - `AKIPASA_PUSH_ENABLED=true` (LAST, after all acceptance).
   - `AKIPASA_PUSH_FOUNDER_IDS=<founder UUID 1>,<founder UUID 2>`, authoritative Supabase auth user UUIDs for Alex and Andrew, not email addresses; define which Alex account(s).
   - `FIREBASE_PROJECT_ID=akipasa-android`.
   - `FIREBASE_SERVICE_ACCOUNT_JSON` as confidential worker secret.
   - Existing Supabase URL and service role credentials must remain correctly configured.
5. Apply the additive SQL migration `20261027001500_founder_push_claims.sql` to the **actual production Supabase project** after proper review and backup; do not substitute the development project.
6. Build and sign a new Android AAB, ship via Play internal testing. Run a signed-in founder device through Staff; Android asks for notification permission on Android 13+. Other accounts never initialize FCM merely by launching the consumer app. Visiting Staff again refreshes a token registration lease.
7. Submit a synthetic non-customer claim under controlled test fixtures. Confirm FCM receipt, exact-claim open (including later pages), logout, suspended founder account, stale/rotated tokens, no PII in notifications, no consumer FCM token, and no duplicate retry on uncertain delivery.
8. Existing Resend founder emails are independent and remain operational.

## Safety

- DB tables are inaccessible to browser SQL/REST roles; only service_role can view tokens. The HTTP registration route requires Supabase authentication plus current administrator app_role and a private founder UUID allowlist.
- FCM data-only payload contains a claim UUID and event type. Applicant name, phone, email and evidence never leave the authenticated staff panel.
- Email fallback remains separate. A Cloudflare cron scans due pushes every **five minutes**; this is not guaranteed instantaneous delivery. A verified event-driven wake-up is follow-on work.
- A signed-out founder's push device records are revoked before sign-out. Remote session revocation and account switch require acceptance before production.
- Stale deliveries (>1 hour) are skipped; legacy claims are never replayed.
- Turn off by setting `AKIPASA_PUSH_ENABLED=false` immediately. Do not disable existing email notifications.

## Firebase analytics

**No Firebase Analytics SDK is added.** Do not import it from the Firebase setup wizard. The SDK's automatic FCM initialization is disabled for ordinary discovery users.
