# Project Status

Last verified: 2026-08-01.

## Completed

- Native Android project exists under `Android/` with package
  `com.akipasa`, API 36 target, API 26 minimum, production web/backend
  parity, secure navigation, external OAuth/billing handoff, App Links,
  location, uploads, downloads, back/rotation state, and offline retry UI.
- Android source includes a Play release guide and unit coverage for its URL
  security boundary; it contains no signing key, credential, or second
  database.
- Clean Android unit, lint, debug APK, and minified release AAB tasks pass for
  `com.akipasa`. The signature-verified version 1 (1.0.0) bundle is accepted
  by Google Play and published on the active internal-testing track. Play App
  Signing is enabled and its fingerprint is staged for web deployment. The
  full root repository check passes.
- Google Play closed testing is active for Spain and version 1 (1.0.0), with
  the release and all required listing/content changes submitted for review.
  The configured account has accepted the internal-test invitation; Google
  Play accepted the install request for the configured Motorola Moto G24 and
  now offers installation on additional devices. Physical app acceptance is
  still outstanding.

- Public bilingual AkiPasa application and isolated voice automation Worker.
- Production Supabase migrations `0001` through `0030`; automation D1/KV
  provisioned and migrated.
- Account progressive-disclosure hierarchy with Overview, Profile, Saved,
  Following, Rewards, Activity, Privacy, and Settings routes.
- Staff workspace with Overview, Moderation, Support reports, Catalogue,
  Promotions, and Audit routes.
- Administrator workspace with Overview, Users, Privacy, Catalogue,
  Promotions, Passports, Settings, and Audit routes.
- Responsive collapsible desktop sidebar and accessible, bounded mobile menu
  with route state, initial focus, explicit close, and Escape close.
- Public membership comparison is directly available from the header and
  homepage; Account Overview links directly to billing.
- Community and Passports use the shared workspace menu instead of duplicated
  horizontal console navigation.
- Mobile-first membership and navigation release `351fed6` is live. Production
  acceptance found no horizontal overflow, matched both plan headings, kept
  the desktop navigation/sidebar behavior, and returned 40/40 successful
  controlled requests.
- Administrator user CRM starts empty and performs debounced server-side
  search by primary email, Google identity email, or display name.
- Migration `0027` implements bounded administrator-only Auth lookup and
  audited role changes with self-change and final-active-admin protection.
- Migration `0027` is applied and rollback-only production acceptance returned
  `ok = true`.
- Production was restored to Worker version
  `beb39dc8-442b-489f-a261-7c1570157a0b` after the redesigned release exceeded
  Cloudflare resource limits.
- Existing feature-slot and commercial-request operations remain available on
  the focused Promotions route.
- Error 1102 is attributed to request CPU/free-tier limits: the rejected
  release's recorded Worker startup was only 29 ms.
- The corrected candidate removes anonymous Auth calls, uses a sessionless
  public Supabase client, and removes MapLibre/QR libraries from server chunks.
- Lint, strict TypeScript, 48 tests, the production Next build, and local
  mobile/desktop navigation acceptance pass; one credential-gated production
  browser test remains conditional on disposable QA credentials.
- Optimized Worker version `0ebdae82-4a7f-42de-b5cb-409ac84cc184` is deployed
  to both production domains. Its upload is 7,128.55 KiB (1,390.16 KiB gzip),
  startup is 35 ms, and 40 controlled live requests returned 40 successful
  responses with no Worker error.
- Workers Paid is active. Defensive public Worker ceilings of 1,000 ms CPU and
  100 subrequests per invocation are deployed.
- Local profile fix uses a narrow self-update RPC rather than writing a
  non-granted timestamp column.
- Local Account Overview gives Staff and Administrators direct links to every
  privileged submenu.
- Local staff catalogue lists all venue/event statuses with search, filters,
  dedicated edit records, required reasons, confirmation, and audited RPCs.
- Local business onboarding stores reviewable applications and prevents
  unapproved users from bypassing onboarding to create venues.
- Stripe live products exist for Premium at EUR 5/month or EUR 48/year and
  Business at EUR 20/month or EUR 190/year.
- Signed, replay-safe Stripe webhook processing, hosted Checkout/Portal
  actions, membership UI, entitlement tables, and audited one-month,
  three-month, or indefinite staff grants are implemented locally.
- Migrations `0028` through `0030` were applied successfully to production.
- Restricted live Stripe key, four-event production webhook, and all three
  encrypted Worker secrets are configured.
- Connected Cloudflare build now runs `npm run build:cloudflare` and deploys
  with `--keep-vars`.
- Lint, strict types, 53 application tests, database safety, and the production
  Next build pass for the current candidate.
- A clean temporary release snapshot generated 81 pages and a 153-asset Worker
  bundle. Its Windows-built artifact failed App Router HTML requests in a
  0%-traffic production test with a Next.js `workUnitAsyncStorage` invariant,
  so it was not promoted.
- The deployment contract now uses OpenNext's generated Worker entry directly
  and requires a connected Linux build plus version-override smoke test.
- Connected Linux build `b3ce1533-da2e-4aea-b371-f3a3fa197160` deployed Worker
  version `1cc76e9c-8866-40ac-83a2-1c9d58f10313`; both locales and 40
  controlled requests passed without a Worker error.

## 🚧 In Progress

- Android API 26/36 device acceptance, Google closed-test review, and the
  required 12-tester/14-day production-access period.
- Authenticated production browser acceptance.
- Monitoring for recurrence of the previous release's intermittent
  503/aborted requests.
- Telegram `/help` and `/status` live acceptance.

## Blocked

- Android verified App Links need an approved web deployment of the staged
  `/.well-known/assetlinks.json`, followed by live and device verification.
- Public production access is gated by Google Play: after the submitted closed
  release is approved, obtain at least 12 opted-in testers and keep that test
  running with at least 12 testers for 14 days before requesting production
  access.
- Authenticated browser checks require disposable QA credentials.
- The managed Windows sandbox blocks OpenNext esbuild's parent-directory scan;
  the approved external build was denied by execution policy on 2026-07-28.
- Threaded customer-support conversations require a new database/API design;
  only report cases and resolution are currently backed.
- Clustered mapping, legal review, and backup restore need external operator or
  provider decisions.

## Next Up

1. Open the installed internal-test build on the Motorola Moto G24 and run
   signed-release acceptance on the physical phone.
2. After closed-test approval, recruit at least 12 opted-in testers and keep
   the test active for 14 continuous days, then request production access.
3. Test the signed release on API 26 and API 36 devices.
4. With explicit deployment approval, publish the staged Digital Asset Links
   file and verify the live association.
5. Complete authenticated Checkout and webhook delivery acceptance with a
   disposable customer and explicit approval for the live payment.
6. Continue monitoring Worker 5xx/1102 rates.
7. Run authenticated production acceptance with disposable administrator QA
   credentials.
8. Inspect stale deterministic QA rows from an older run and plan a reviewed
   cleanup.
9. Design support conversations before adding inbox/conversation UI.
