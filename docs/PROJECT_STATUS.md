# Project Status

Last verified: 2026-07-28.

## Completed

- Public bilingual AkiPasa application and isolated voice automation Worker.
- Production Supabase migrations `0001` through `0030`; automation D1/KV
  provisioned and migrated.
- Account progressive-disclosure hierarchy with Overview, Profile, Saved,
  Following, Rewards, Activity, Privacy, and Settings routes.
- Staff workspace with Overview, Moderation, Support reports, Catalogue,
  Promotions, and Audit routes.
- Administrator workspace with Overview, Users, Privacy, Catalogue,
  Promotions, Passports, Settings, and Audit routes.
- Responsive collapsible desktop sidebar and accessible mobile drawer with
  route state, initial focus, backdrop close, and Escape close.
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
- Lint, strict TypeScript, 48 tests, the production Next build, and 18 local
  mobile browser tests pass; one credential-gated browser test is skipped.
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

## 🚧 In Progress

- Authenticated production browser acceptance and live 360 px visual review.
- Publish the reviewed source to the connected Cloudflare Linux build.
- Smoke-test the connected build at 0% traffic before promotion.
- Monitoring for recurrence of the previous release's intermittent
  503/aborted requests.
- Telegram `/help` and `/status` live acceptance.

## Blocked

- Authenticated browser checks require disposable QA credentials.
- The managed Windows sandbox blocks OpenNext esbuild's parent-directory scan;
  the approved external build was denied by execution policy on 2026-07-28.
- Publishing to the connected Cloudflare build is blocked because the managed
  environment denies writes to `.git`; a narrow approved `git add`, commit, and
  push is required.
- Direct Wrangler production upload of the fresh artifact was denied by the
  managed execution policy on 2026-07-28 despite explicit operator approval.
- Threaded customer-support conversations require a new database/API design;
  only report cases and resolution are currently backed.
- Clustered mapping, legal review, and backup restore need external operator or
  provider decisions.

## Next Up

1. Commit/push the reviewed source so the configured connected Linux build can
   produce the production candidate.
2. Smoke-test profile, catalogue, onboarding, Checkout, and webhook delivery
   while confirming encrypted secrets remain installed.
3. Complete authenticated browser acceptance for the dependent release.
4. Continue monitoring Worker 5xx/1102 rates.
5. Run authenticated production acceptance with disposable administrator QA
   credentials.
6. Inspect stale deterministic QA rows from an older run and plan a reviewed
   cleanup.
7. Monitor Worker 5xx rates and investigate if intermittent crawling failures
   recur outside test load.
8. Design support conversations before adding inbox/conversation UI.
