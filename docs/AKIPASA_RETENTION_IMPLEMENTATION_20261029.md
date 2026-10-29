# AkiPasa retention, discovery and revenue implementation tracker

**Started:** 2026-10-29 (Europe/Madrid)  
**Source of truth:** this file for the October retention mission; supplement, do not supersede, `docs/AKIPASA_MASTER.md`, `docs/CHANGE_IMPACT_REGISTER.md`, #310, #314, #316, PR #326 and PR #327.  
**Status:** Phase 0 audited; Phase 1 in progress; NO confirmed deployment for this mission.

## Evidence-backed inventory and gap analysis (read-only audit, 29 October)

| Capability                             | Existing state                                                                                                                                 | Classification                                       | Decision                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Events/discovery/maps                  | Published-event repository, consent-aware ranking, sponsorship labels, MapLibre, local preset searches, existing event detail and booking URLs | Implemented; requires improvement                    | Build intent-first AkiTonight on existing server repository, no second catalogue                       |
| Tonight shortcuts                      | PlansFirstHero: today/tonight/weekend/free/map                                                                                                 | Already implemented, reusable                        | Keep original shortcuts; add guided AkiTonight route                                                   |
| Real event inventory                   | 9 events / 0 future scheduled occurrences in connected project at audit time; issue #316 open                                                  | Missing launch content                               | Honest zero-result text, separate real venue suggestions; no fake dates/popularity                     |
| Venue discovery                        | `public_nearby_venue_page` retrieves 20/page, activities-only, published, not location-quarantined, deduplicated                               | Already implemented, reusable                        | Bounded fallback; never imply hours or selected activity verified                                      |
| Passport & XP                          | Passports, enrollments, progress, stamps, achievements, check-ins and server XP ledger already exist                                           | Already implemented, requires extension              | Preserve ledgers. Add non-monetary pilot quests from accepted venue-credential check-ins; no client XP |
| AkiPals                                | Old mascot game private; human-avatar PR #327 draft; conflicts with cinematic PR #326                                                          | Partially implemented and migrating                  | Do not add more gacha; separate reconciliation release                                                 |
| Crews / private planning               | Public community journey and saved/followed data; no approved friends/crew ACL schema                                                          | Missing; existing community partial                  | Private opt-in invites with RLS after age/moderation policy                                            |
| Merchant campaigns                     | Sponsored events/feature slots, promotion requests, AkiHQ owner views                                                                          | Partially implemented                                | Future AkiHQ managed campaign lifecycle; no charges now                                                |
| Rewards                                | Business rewards, claims, confirmed redemptions, loyalty ledgers exist                                                                         | Already implemented but needs verification/extension | Prefer extending canonical claims, not new currency                                                    |
| Personalisation                        | Ranked recommendations, preference signals, explicit consent, ranking experiments schema                                                       | Implemented, requires improvement                    | Reuse `recommendDiscovery`; do not profile minors                                                      |
| Push/email                             | Founders FCM stage, shared Resend infrastructure, consent settings                                                                             | Partially implemented                                | No new marketing or notifications in Phase 1                                                           |
| Age assurance                          | PR #300 draft; third-party provider pending                                                                                                    | Partially implemented; not ready                     | No friend-location presence, public minor profiling or public reviews                                  |
| Nationwide points or financial balance | No approved funded economy                                                                                                                     | Missing intentionally                                | Defer                                                                                                  |
| AkiPulse presence & live crowd         | No verified public aggregate crowd signal                                                                                                      | Missing intentionally                                | Do not fabricate; age/privacy threshold gate                                                           |

### Phase 0 infrastructure and release collision

- AkiPasa primary branch `master`, read at `0faf0f7b4391a164749841771b96e000a3f1f629`.
- PR #326 is **draft** and changes homepage, hero, Passport styling, route matrix and major consumer UI. Source route inventory 102; at its earlier gate 89 still required visual acceptance. PR #327 human AkiPals is also draft. Neither is proof of a live release.
- Latest connected AkiPasa Cloudflare Worker deployment observed 2026-10-28 14:15:44 UTC, preceding this mission; do not infer branch publication.
- Existing public schema and RLS underpin consumers. No new tables, migrations, grants or Stripe changes in first AkiTonight slice.

## Priorities and dependencies

1. **P0 AkiTonight**: localized intent form -> allowed current real recommendation pipeline -> verified scheduled event cards -> nearby published venue fallback -> share/map/detail. Read-only, no migration. [IN PROGRESS]
2. **P0 AkiPassport weekly pilot**: check-ins proven by accepted venue credentials -> compute distinct-venue week progress -> own-user Passport presentation -> review evidence before new XP rules. Additive, no XP writes. [NEXT]
3. **P0 AkiCrews**: requires verified identity and participant-only ACL, invitation expiry, block/report, data deletion; add separate migration and RLS tests. [PLANNED]
4. **P0 AkiBoost foundation in AkiHQ**: requires merchant venue ownership, editorial review, billing gate, sponsor disclosure and attribution. [PLANNED; €49–€149 and €0.75 are NOT live prices]
5. **P1 Verified Rewards**: use existing reward claim/redemption records, add QR redemption/anti-abuse via audited RPC only after operator test. [PLANNED]
6. **P1 recommendations/weekly opt-in digest**: existing ranking, explicit marketing preference/age gate, frequency caps and unsubscribe. [PLANNED]
7. **P2 avatars, AkiPulse, ticketing; P3 nationwide points**: stage separately with privacy, compliance and partner acceptance. [DEFERRED]

### First delivery: AkiTonight read-only discovery

- Branch: `feature/akitonight-verified-discovery-20261029`.
- Entry: /es/tonight and /en/tonight, linking from the existing plans-first hero.
- Filters: mood, area, party context/size, published ticket-price ceiling, approximate start and radius.
- Server: `recommendDiscovery` and `public_nearby_venue_page`; never writes XP, check-in, offers, subscriptions, bookings or campaign status.
- Every query is allowlisted and consent remains controlled by the existing recommendation pipeline.
- Sponsored labels remain owned by `EventCard`, and group size is **not** capacity verification.
- The public venue fallback must not be described as available tonight, open, compatible with the selected mood, or offering a booking.
- Roll back by reverting the hero entry/link and route. The direct route is `noindex` until inventory quality and usage are accepted.
- In-flight redesign PR #326 must add /[locale]/tonight to its route matrix, verify responsive light/dark + Android UX, then reconcile shared hero edits before either production release.
- No billing, marketing mail, RLS or data migration required.

## Acceptance and risk checklist

- [ ] Focused unit tests pass for parameter allowlists, keyword precision, timezone, expiry and sponsor ordering
- [ ] Lint, format, typecheck, full checks, builds and browser suites pass on **exact PR head**
- [ ] Test EN/ES, narrow Android WebView, tablet, desktop, light/dark, keyboard labels and reduced motion
- [ ] Test with zero upcoming events and genuine venues; with both data sources offline; and with active real events
- [ ] Confirm recommendation consent/analytics and sponsored labels on live browser
- [ ] Confirm PR #326 route inventory and visual release gate before merge/release
- [ ] Curate legitimate future event dates, venue source, age/price, licence and event permission (#316)
- [ ] Verify public deployed source SHA, error logs, mobile navigation and rollback after approved deployment

## Reporting status legend

- **PLANNED:** backlog only
- **IN PROGRESS:** authored on development branch
- **PR OPEN:** reviewable GitHub pull request, not merged
- **MERGED:** integrated into target branch, not automatically live
- **DEPLOYED:** Cloudflare deploy independently confirmed
- **VERIFIED IN PRODUCTION:** exact deployed source + browsers/permissions/events accepted

**Customer-facing release remains blocked until actual real-event inventory and pending cinematic-route acceptance are reconciled.**
