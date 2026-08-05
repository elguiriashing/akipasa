# Acceptance checklist

Automated evidence is produced by `npm test` and `npm run test:e2e`. Production browser verification is recorded in `docs/STATUS.md` per release.

- [x] Guest discovery, preset/custom dates, accessibility, free/paid and numeric price filters, midnight overlap and recurring occurrences.
- [x] Nationwide province-centre selection with Costa neighbourhood detail.
- [x] Location is requested only after a clear action, reduced client-side to the nearest named area, and denial leaves manual discovery usable.
- [x] Language switching preserves the current route and query.
- [x] Event and venue details, map fallback, favicon, manifest, privacy and terms.
- [x] Guest account actions redirect to authentication and export rejects unauthenticated access.
- [x] Email/password and Google signup require versioned Terms and Privacy consent; stale accounts must explicitly accept the current version.
- [x] Direct profile updates cannot modify platform roles or legal-acceptance evidence.
- [x] Account export is fail-closed and covers profile, account activity, provider metadata, privacy requests, passports, rewards and business-owned data.
- [x] Badge progress is visible on authenticated account and passport surfaces.
- [x] Roles and moderation permissions are enforced in RLS/RPCs.
- [x] Rollback-only production database acceptance verifies User, Business, Staff and Administrator boundaries, including cross-owner isolation and audit records.
- [x] Authenticated production browser acceptance verifies sign-in, favourites, follows, check-in/XP/stamps, business workspaces, QR material, moderation decisions, community reporting, report resolution and administrator controls with disposable QA data.
- [x] Reusable opt-in Playwright acceptance verifies all four role surfaces, enabled community/promotion actions, Administrator catalogue/feature controls, occurrence booking and bilingual media metadata/order controls against a disposable production identity, followed by exact-ID identity/membership/content cleanup verification.
- [x] Four platform roles remain distinct from owner/manager/editor venue membership; Administrator inherits venue management globally while Staff does not.
- [x] Administrator can create/update categories and Spanish localities and control community submissions, check-ins and promotion requests; Staff is rejected, every change is audited and disabled features are blocked at the database layer.
- [x] Community, check-in and business promotion screens read the operational switches and replace unavailable submission forms with bilingual explanatory states while existing reports/requests remain accessible.
- [x] Hourly finished-event expiry is registered in Supabase Cron, restricted from public roles, rollback-tested and covered by the database acceptance suite.
- [x] Check-in mutation is atomic, idempotent, cooldown/rate-limited and ledger-backed.
- [x] Business check-in material includes a locally generated, scannable QR code and testable destination.
- [x] Business owners can generate duplicate-safe daily or weekly recurring occurrences through an ownership-checked RPC.
- [x] Cancelled, postponed and sold-out occurrences are visibly labelled on direct event pages; invalid booking actions are suppressed.
- [x] Event and venue report links preselect the relevant item after authentication.
- [x] PostgreSQL-enforced hourly/daily limits reject excessive community submissions and reports with usable bilingual feedback.
- [x] Administrator deletion processing is audited; Staff is rejected, and completion requires confirmed identity deletion plus an absent linked profile.
- [x] Privileged RPCs explicitly deny PostgreSQL `PUBLIC`/anonymous execution except the intentionally public privacy-filtered analytics recorder.
- [x] Reward redemption checks balance and is venue-confirmed/audited.
- [x] Business analytics are exposed only through membership-checked aggregate RPCs.
- [x] Approved Supabase listings feed public discovery; fixture-only IDs are kept behind the provider boundary and provider outages fall back safely.
- [x] Sponsored content has an explicit label.
- [x] Image uploads enforce MIME type and 10 MB limit in UI, server action and storage metadata.
- [x] Published venue media is rendered from expiring signed URLs; draft/private venue objects remain blocked by storage RLS.
- [x] Venue phone, WhatsApp and website actions use validated E.164/HTTPS values enforced in UI, server actions and PostgreSQL.
- [x] Event pages expose minimum-age and event/venue accessibility information in both launch languages.
- [x] Business owners can edit individual occurrence dates, status and optional booking links while cross-owner event and occurrence updates remain blocked by RLS.
- [x] Business owners can remove uploaded venue media and edit bilingual alt text/order; team/Admin metadata edits preserve the original uploader identity.
- [x] Madrid wall-clock form input is converted correctly in winter and summer, and invalid DST-transition times are rejected.
- [x] Public interaction analytics accepts only a strict privacy-minimised schema and feeds venue-scoped aggregate reporting.
- [x] 360 px mobile browser suite passes.
- [x] Every public ES/EN screen is checked for successful rendering, labelled controls, horizontal overflow, broken internal links, guest-route safety, browser form contracts, SEO alternates and install/offline assets.
- [x] Production dependency audit reports zero known vulnerabilities.
- [x] Deterministic local database seed/reset commands use stable fixture IDs, transactional replacement and a tested loopback-only URL guard that rejects Supabase or other remote hosts.
- [x] Android exact-host navigation, unsafe-scheme rejection and download
      allow-listing have unit coverage; Android unit tests and lint pass.
- [x] Android clean build produces a debug APK and minified, signature-verified
      release AAB targeting API 36 without committing signing material.
- [x] Google Play accepts signed version 1 (1.0.0) for package `com.akipasa`,
      enables Play App Signing, and serves it from the active internal track.
- [x] Google Play closed Alpha is active for Spain with version 1 (1.0.0), a
      tester list, and the complete listing/content submission in review.
- [x] The configured internal tester accepted its invitation and Google Play
      accepted delivery of version 1 (1.0.0) to the Motorola Moto G24.
- [ ] Signed Android internal-track install must pass API 26 and API 36 device
      acceptance, including auth return, location, upload, download, billing,
      back/rotation, and offline recovery.
- [ ] Play App Signing Digital Asset Links must be deployed and verified before
      Google OAuth and Stripe callback return are release-ready.
- [ ] Phone, Apple and X sign-in require upstream provider credentials/accounts.
- [ ] Professional Spanish/EU legal review is required before representing the service as legally approved.
- [ ] Real production backup restore drill must be performed by an operator with backup access.
