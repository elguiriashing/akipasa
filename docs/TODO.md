# TODO

Last reviewed: 2026-07-31.

## P0 - Critical

- [x] Enforce server-side authorization, RLS, role hardening, ownership, and
      audited privileged operations.
- [x] Implement HMAC, timestamp, device, and replay protection for voice
      commands.
- [ ] Rotate the previously exposed Telegram bot credential before any
      production automation deployment.
- [x] Provision automation D1/KV, install base secrets, apply remote migrations,
      and deploy after explicit approval.
- [x] Load truthful zero current figures and complete signed Worker-to-Telegram
      production delivery acceptance without logging sensitive content.
- [x] Validate the Telegram bot credential, bot identity, group type, and bot
      membership through read-only Bot API calls.
- [x] Add a non-financial `test the bot` voice command and full signed-route
      integration test for first production acceptance.
- [x] Obtain explicit approval for potentially billable D1/KV creation and one
      clearly labelled outbound connection-test message.
- [x] Install the Telegram webhook secret, deploy slash commands, and register
      the Bot API webhook/menu.
- [ ] Verify `/help` plus `/status` live after permission to send them from the
      user's Telegram account.

## P1 - High

- [x] Split account, staff, and administrator tools into route-based
      progressive-disclosure workspaces.
- [x] Add bounded administrator Auth/Google email search and audited role
      lifecycle migration with final-active-admin protection.
- [x] Apply migration `0027`, run database acceptance, and deploy the redesigned
      public Worker after explicit approval.
- [ ] Configure disposable administrator QA credentials and run authenticated
      live user-search, role grant/revoke, permission, and 360 px acceptance.
- [ ] Review and remove stale deterministic QA fixtures left by an older
      production acceptance run.
- [ ] Monitor and investigate intermittent 503s seen only during sustained
      post-deploy browser crawling.
- [x] Attribute error 1102 away from startup using the recorded 29 ms startup,
      audit request paths, and implement anonymous Auth, public-client, and
      browser-library optimizations.
- [x] Build the optimized OpenNext artifact outside the managed sandbox,
      dry-run/deploy it, and prove zero 1102/5xx responses under a controlled
      40-request production probe.
- [x] Deploy the paid-plan defensive 1,000 ms CPU and 100-subrequest invocation
      limits.
- [x] Apply migrations `0028` through `0030` for profile operations,
      onboarding, billing entitlements, atomic webhook idempotency, and staff
      grants.
- [x] Fix profile updates through a narrow self-profile RPC.
- [x] Put every Staff and Administration submenu directly on Account Overview
      for authorized roles.
- [x] Add searchable all-status staff catalogue records with audited
      venue/event edit and confirmed deletion RPCs.
- [x] Add durable business applications and block unapproved venue creation.
- [x] Configure live Stripe products for EUR 5/48 Premium and EUR 20/190
      Business monthly/yearly subscriptions.
- [x] Implement hosted Checkout/Portal, signed idempotent webhooks, and audited
      one-month, three-month, and indefinite staff access grants.
- [x] Create the restricted Stripe key and production webhook endpoint and
      install all three encrypted Worker secrets without placing credentials in
      source or documentation.
- [x] Implement concrete Premium benefits, profile projections, stale Stripe
      event protection, cancellation reconciliation, and paid Business gates.
- [ ] Apply migration `0033`, deploy, and complete real Premium and Business
      checkout/webhook/cancellation acceptance without exposing credentials.
- [x] Diagnose the Windows-built candidate at 0% traffic and restore the
      generated OpenNext entry point after reproducing a Next.js
      `workUnitAsyncStorage` invariant.
- [ ] Publish through the connected Cloudflare Linux build and pass a
      version-override smoke test before production promotion.
- [ ] Design and implement support conversation/message/assignment storage,
      APIs, retention, and permission policies before adding threaded inbox UI.
- [x] Deliver staff moderation/customer-support queues and administrator
      catalogue/feature controls.
- [x] Make business-owned launch venues/events editable and deletable.
- [x] Complete privacy request operations, abuse limits, report resolution,
      event expiry, idempotent check-ins, passports, redemption, and analytics.
- [x] Add the automation dashboard, D1 execution logs, retention, and manually
      gated CI deployment.
- [x] Add a graphical command catalogue with typed metadata, dedicated
      activity view, audited operator execution, and external-action confirmation.
- [x] Harden the Tasker/Termux launcher with private configuration permissions,
      HTTPS enforcement, spoken phrase forwarding, and bounded timeout behavior.
- [ ] Complete a non-production restore drill from a production backup.
- [ ] Obtain professional review of Spanish/EU privacy and terms documents.
- [ ] Validate real production auth email confirmation, magic-link, and
      password recovery.

## P2 - Medium

- [x] Add a secure native Android host that shares the production web/backend
      behavior, including App Links, external OAuth/billing, location, uploads,
      downloads, back/rotation state, offline retry, and URL-policy tests.
- [ ] Open and validate the accepted Motorola Moto G24 internal-test install,
      complete API 26/36 device acceptance, deploy and verify the staged
      Digital Asset Links file with approval, and after Google approves the
      submitted closed release run the required 12-tester/14-day test.
- [x] Add desktop collapsible navigation and a keyboard-accessible mobile
      drawer with direct route links.
- [x] Add unit/browser coverage for workspace navigation, debounced user
      search, direct routes, and 360 px overflow.
- [x] Replace long console pages with focused sub-pages and icon-led menus.
- [x] Add responsive spacing and visual hierarchy to account, community,
      passports, moderation, and administration.
- [x] Expose a public membership comparison from the homepage/header and add a
      direct Account Overview billing action.
- [x] Replace the mobile horizontal header and full-screen workspace overlay
      with compact, bounded menus; move Community and Passport tabs into the
      shared workspace navigation.
- [ ] Select and configure a production graphical map provider if required.
- [x] Add local authenticated Worker route integration tests for the command
      catalogue and operator execution.
- [ ] Add dashboard login rate limiting and remote Worker route acceptance.
- [x] Add authenticated, group-restricted, replay-safe Telegram slash commands
      backed by the shared command router and execution audit.
- [x] Support privacy browsers that omit `Origin` on same-origin dashboard
      forms while preserving explicit cross-site rejection.
- [ ] Add multiple automation companies/groups with per-device or per-tenant
      signing keys.
- [ ] Add queued job execution and retry policy for retriable downstream
      failures.
- [ ] Add automated financial ingestion rather than manual D1 updates.

## P3 - Nice to have

- [ ] Add Chart.js report graphics.
- [ ] Export PDF and CSV investor reports.
- [ ] Add AI-written summaries behind a provider interface.
- [ ] Add email investor delivery and multiple investor groups.
- [ ] Evaluate a screen-by-screen native UI rewrite, ticketing/payments,
      rotating QR tokens, and additional languages.

# Personalisation follow-up

- [ ] Run legal review of consent copy, lawful bases and retention periods.
- [ ] Add alerts for missed or repeatedly full scheduled retention batches and aggregation health.
- [ ] Add category-specific distance/time/planning-horizon features.
- [ ] Add feed/map tracking to every remaining card and map marker surface.
- [ ] Add notification/email delivery lifecycle integrations.
- [ ] Add trusted ticket/booking provider conversion webhooks.
- [ ] Add partner organisations, hashed API keys, edge rate limiting, usage metering and OpenAPI publication behind the disabled `partner_api` flag.
- [ ] Add social/collaborative and embedding candidate sources after Phase 1 has sufficient clean data.
