# Product readiness release · 26 September 2026

## Delivered

- Loyalty rejects missing/non-finite location values, absent idempotency keys, unusable or unverified venue locations and reuse of a request key for another venue. Check-in, reward issuance and redemption serialize on the same profile row. A ready claim is returned idempotently, its stamp cost is captured, and repeat redemption cannot debit twice. Passport reward issuance uses the same lock. Expired stamp claims can be replaced without losing earned stamps.
- Owner dashboards explicitly authorize the venue, present a profile/photo/event/loyalty checklist, flag missing upcoming dates and show scoped 30-day aggregate engagement, accepted check-ins and redemptions. Clicks are labelled as intent rather than customers, sales or Google impressions. Report failures display unavailable, not false zeroes.
- Separate measurement, recommendation and advertising choices apply on both public hosts. Google Analytics is not loaded until measurement permission is saved. Withdrawal disables measurement and clears its accessible cookies; withdrawing personalisation clears queued behavioural events. Privacy choices remain accessible. Existing account controls no longer silently toggle all three purposes.
- Event-to-stay links carry destination and Madrid dates; stay detail carries location and selected dates back to events. The accommodation experience remains a clearly labelled planning preview, with no live rates, availability, booking checkout or invented photos/reviews.
- Stay maps request a bounded viewport from PostGIS, including active search/type filters. At most 1,000 markers render per request, with a zoom-in notice when more match. They no longer download all matching IDs countrywide. Map initialization failures show a list-view fallback message; the cloud acceptance browser has WebGL disabled, so actual pin rendering still needs the Android check. Imported punctuation is cleaned for display only, preserving source names.
- Public pricing explains free approved-venue management and optional HQ upgrades. External mailbox/social connectors are labelled as a pilot. Existing subscriptions and prices remain intact.
- HQ customer inbox removes implicit example-conversation generation and labels local records/composer actions as internal notes, not delivered messages. The real platform mailbox remains separate and access restricted.
- Public master gains a CI gate. `/api/health/release` checks critical billing/search/loyalty/report/map database contracts and returns 503 on mismatch. This is a contract check, not an uptime guarantee or full migration-from-empty proof.

## Deployment

Apply migration 0084 (timestamped Supabase mirror), check the live contract and map queries, then publish AkiPasa master and AkiHQ main. The standalone integration Worker is not deployed by these frontend pushes. Do not weaken its tenant restrictions to make unavailable integrations look connected.

For rollback, revert frontend commits first; retain the additive stamp-cost column and hardened reward functions. Keep no-charge recovery and free venue ownership from the earlier release. Full SQL rollback would require restoring prior function definitions and would restore known loyalty vulnerabilities; it is not the preferred recovery.

## Verification and honest limits

Local database fixture tests exercise validation, balance/replay, scoped reporting and passport claims. Geometry is stubbed in that fixture, so actual spatial filtering is checked separately against the live read-only catalogue. The fixture engine does not prove independent-session PostgreSQL concurrency: the shared row-lock design still needs an actual simultaneous device/session acceptance pass. No real user stamps or rewards are created to test production. No external email or payment is sent.

Verified: the full public check passed 240 application tests, 41 automation tests, database safety, formatting, lint, type checking and the production build. HQ passed 315 tests with one pre-existing skip. The live database contract reports ready; an anonymous Fuengirola-area viewport returned 220 stays. Inspect live home, privacy choices, membership and AkiDuermo handoff/map. An authenticated browser is needed for owner/staff acceptance below.

## Alex's acceptance checklist

Use test accounts and a test venue/reward; avoid issuing a valuable real reward during testing.

1. **Free owner:** new ordinary account → claim a specific venue while signed out → sign in → approve from Staff → reopen Business. Confirm exact venue retained, no checkout required; edit description, upload an authorised photo and create a real future event. Check the checklist updates after publishing. A second unrelated account must not manage it.
2. **Billing/HQ:** existing subscribed account → membership status → its own HQ workspace. Test owner and restricted employee independently. In a Stripe sandbox, exercise upgrade, cancellation and duplicate/out-of-order notifications; cancellation must preserve free venue ownership. Do not run another real payment just for this check.
3. **Loyalty on two phones:** at the test venue, allow location and scan QR; repeat scan should award nothing extra. Deny location and scan from elsewhere; no stamps. At the threshold, request/redeem the same reward simultaneously in two sessions; one debit/reward only. Test an expired claim and an unauthorised staff account.
4. **Owner results:** opted-in visitor opens venue/event and clicks directions/website; reopen owner dashboard. Compare labelled interactions with check-ins/redemptions. These are not Google impressions or sales.
5. **HQ operations:** non-platform owner creates a contact/task/calendar item/product; restricted employee can only use granted tools; a second business sees none of these records. Two staff edit the same record to check conflict handling. Complete a test POS transaction/refund against test stock and verify quantities and audit history. The customer inbox must say internal note and must not imply delivery.
6. **Your Android phone:** fresh privacy choice → reject optional → search/claim stay usable. Enable analytics only; personalisation/marketing stay off. Reopen Privacy choices and withdraw. Test map pins and hotel filters, long forms, search scrolling, QR/camera permissions, and event-to-stay date/location handoff.

## Needs service/operational work, not more frontend labels

- No private signed-in user/staff acceptance is claimed here.
- Real provider OAuth scopes/callback approval, tenant credentials and successful mail/social round trips are prerequisites for customer integrations. The Cloudflare integration Worker version/bindings still need authenticated deployment inspection.
- Printer rollout remains paused. Card acquiring, fiscal/IVA/AEAT acceptance, receipts and hardware require their separate provider/device acceptance; local POS records do not prove those services.
- AkiDuermo needs participating accommodation providers, rates/inventory, cancellations/support and payment decisions before booking checkout can be offered.
- The first locality needs real owner-approved photos and maintained events. This release cannot manufacture supply or demonstrate retention.
- Commercial data/API sales require a defined product, access/metering and privacy governance. No user-level data is newly exposed or sold in this release.
- A full historical migration-from-empty repair, isolated staging and restore drill remain separate infrastructure work. Current release checks cover the contracts changed here.

## Database advisory review

The post-migration review retains the earlier findings. The one added authenticated security-definer entry is `venue_owner_results`, which checks the authenticated account's membership before returning aggregates; its cross-venue denial is tested. Existing PostGIS extension placement/`spatial_ref_sys`, intentionally closed operational tables and disabled leaked-password protection remain infrastructure follow-up, not a claim of an all-clear security audit. [Supabase advisory documentation](https://supabase.com/docs/guides/database/database-linter).
