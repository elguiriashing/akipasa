# AkiPasa Radar × After Dark: full-app redesign contract

## Added public rollout communications: Costa del Sol first

- The shared `LaunchRibbon` is a non-scrolling, bilingual announcement on public discovery paths and venue/event pages; links to the same localized /roadmap. Avoid showing it on login, admin or the roadmap itself.
- `/roadmap` redirects to `/es/roadmap`. Both `/{locale}/roadmap` variants have canonical URLs and the public SEO catalogue. The page is a compact, responsive four-stage timeline and six-feature plan.
- No release date is asserted before quality checks and formal communication. The public plan describes launch preparation and location expansion following verified demand rather than false nationwide coverage.
- The public Home no-results state links to the roadmap alongside the existing search-expansion actions. Keep no-event truthful; never create fake events or fake signups.
- Canonical copy and statuses reside in `src/lib/pasa-roadmap.ts` and `tests/pasa-roadmap.test.ts`; both new pages are registered in the strict route matrix. Remaining #326 release gates are unchanged.


Date: 2026-10-28. Status: implementation specification; NOT deployed.
Base: master at creation. Visual reference: Alex's approved Index, Map, Community, AkiPals, Passport, Login and Profile concepts.

## Non-negotiable principles

- Preserve existing routes, Supabase RLS/auth, search, map/filter/query persistence, verified check-in, reviews moderation/age restrictions, consent, pricing, accessibility, analytics protections, SEO, deep links, EN/ES, PWA and Android return flow. No replacing working game or business logic with mock data.
- One source of truth for responsive shell and mobile dock: extend `src/components/AppShell.tsx` and `DiscoveryNavigation.tsx` instead of inventing per-route nav. Five mobile destinations in order: Home / Map / Check-in / Community / Profile. Check-in launches existing verified flow (define safe entry from current token route), never fake an event. Passport and AkiPals are secondary destinations, accessible from Profile, Community and rewards; preserve their actual route and saved state.
- Shared design tokens and primitives: `PasaShell`, `PasaBottomDock`, `PasaTopbar`, `PasaFilterChip`, `PasaVenueCard`, `PasaEventCard`, `PasaMediaHero`, `PasaActionBar`, `PasaEmptyState`, `PasaSheet`, `PasaSkeleton`, `PasaBadge`; adapt/rename existing implementations, no duplicate lookalikes. One icon source and unified active/focus/disabled state.
- Visual direction: obsidian/ink base, luminous orange intent markers, restrained electric blue for map positions, photography-led event imagery, dark gradient overlays, readable high contrast; Passport as parchment/ink/stamp inset inside shared chrome; AkiPals' existing family/vector system rather than a new cat-only game.

## Feature areas & user journeys

1. Home / index: Tonight / nearby / weekend, real recommendations with legitimate distance/time/status; responsive event and venue cards; keep empty/data fallbacks.
2. Map: MapLibre existing provider, glowing pins keyed to real event/venue category, bounded visible-results queries, drawer and selected-state sync, clustering, list fallback, permission-denied/geolocation disabled states.
3. Check-in: unified primary action with unauthenticated sign-in return, permission and verified-presence handling, anti-abuse, eligible events, XP/Passport/Pals grant integrity, idempotent submission and success/failure states. No manufactured QR.
4. Community: current moderated feed/creators plus Friends/Following/Nearby panels only behind existing permissions or genuinely implemented backend; no fake friends or public location exposure. Age, consent and privacy gates remain authoritative.
5. AkiPals: preserve existing catalogue, 10 families, vector layer rendering, legacy schema-1 save compatibility, wardrobe, inventory, rewards, care/adventures and tests. Redesign UI only unless changing behavior through separately tested migrations.
6. Passport: existing achievements, city stamps, places, prestige, sharing, collections, private/public security; parchment pages integrated inside shell.
7. Login/onboarding: OAuth/redirect, email, recovery, profile completion, under-18 safeguards, consent and locale/referral continuity. Full screen cinematic background with accessible fallbacks.
8. Profile/account: activity, saved, following, bookings, privacy, memberships, rewards, settings, referrals, account completion and deletion/export without losing functionality.
9. Venue/event detail and booking: real hero/media, identity, opening hours, dates, organizer/location, map, verified reviews, save/share/check-in/booking actions, legal/promoted labels, fallback images and in-app return. Preserve IDs, canonical/SEO, booking flows and schema.
10. Supporting areas: city discovery, creators, membership, privacy/terms, support and errors; authenticated owner/staff/admin consoles must be audited and themed without breaking operational flows. Separate AkiBusiness/HQ/Duermo/Coches host contexts must NOT inherit consumer-only CSS.

## Complete route audit

Build a CI-generated manifest from every `src/app/**/page.tsx` plus route groups, dynamic detail routes and API action endpoints. Mark each as consumer-redesigned, shared-shell-only, business/administrative explicitly exempt-but-verified, or other-product host. Fail release on any unclassified route, not on a manually maintained seven-screen checklist. Test both locales and phone/tablet/desktop; light/dark and 200/400% zoom, keyboard and screen reader.

## Implementation sequence (one release branch, commits can be staged)

A. Inventory all routes, existing shared components, current PR conflicts, baseline screenshots and current E2E workflows. Wait for or consciously reconcile pending #324 event cards and #325 founder notices, avoid overwrites.
B. Create single theme/tokens, design primitives and unified responsive shell. Validate dock and dialogs in map, full screen, signed-in/out.
C. Implement Home + Map + venue/event cards/details and booking UI with existing queries and data contracts.
D. Implement Community + friend subviews only backed by verified real models; Check-in flows and grant integrity.
E. Implement AkiPals + Passport visuals reusing existing models, no loss of inventories or achievements.
F. Implement Login/onboarding + profile/account + secondary routes, legal/support/administrative audit. Confirm all route classifications.
G. CI full gate, screenshot baselines and manual smoke tests on actual Android; deploy preview and test exact source SHA, obtain release acceptance, then merge **once** and verify Cloudflare production deployment and rollback.

## Required release gates

- Format, lint, typecheck, existing full npm check / npm test / security / db-safety and Cloudflare build.
- Every page loads in ES and EN, authenticated vs anonymous; both light/dark with no unreadable text.
- Playwright screenshots (not mocks) from baseline with approved intentional diffs at 360x800, 390x844, 768x1024, 1440x900; iOS/Android viewport safe areas, keyboard overlaps, portrait/landscape; axe/keyboard and reduced-motion.
- Verify real location and permission-denied map, empty/list fallback, selected pin to detail, filters persistent on Home ↔ Map, live nearby events.
- Verify sign-in/redirect/deep-link/return, profile completion, save/favourite/follow, Community moderation and consent, idempotent check-in and XP, Pals wardrobe persistence and legacy save migration, Passport awards and public/private sharing, venue/event booking, payments boundaries and no unauthorized writes.
- No duplicate nav implementations: code scan for dock styles/markup beyond single shared component and tested exceptions; all links and active states consistent.
- Reconcile open PRs and verify exact-head CI, Cloudflare preview and production SHA independently. Keep master untouched until gates pass; rollback planned. No assertion of release without evidence.

## Inspected implementation findings (2026-10-28)

- `src/components/AppShell.tsx` currently defines four `primaryNav` entries (Discover, Map, Community, Account), and also renders a separate `.app-bottom-nav` directly; `DiscoveryNavigation.tsx` handles desktop navigation. The new five-destination dock must be composed in **one** exported component and injected into AppShell, with one canonical route descriptor array shared by desktop/mobile. Do not duplicate nav markup or styles to simulate consistency.
- Existing `src/app/globals.css` imports `discovery-redesign.css` and `aki-app-first.css` and already contains layered workspace overrides. Consolidate or deliberately scope overrides: avoid a new final CSS file that simply overrides every previous final CSS file.
- Current npm scripts include `check`, `test:pals`, `test:pals:browser`, `test:passport-db`, `test:booking:browser`, `test:onboarding:browser`, `test:e2e` and `build:cloudflare`. Add route-coverage and shared-navigation checks into the existing `check` pipeline, not a disconnected manual checklist.
- Existing PR #324 addresses live event cards, #325 verified launch-waitlist notifications; integrate by reviewing actual changed files and reconciling with latest master before final exact-head CI. Do not silently drop those fixes.
- Existing deployed Cloudflare Worker `akipasa` has an active deployment; redesign delivery must not modify it before the consolidated release gate passes.

## Screen-by-screen UX acceptance contract

| Surface            | New visual behaviour                                                                             | Existing behaviour to preserve                                               |
| ------------------ | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Home               | editorial photo hero; Tonight / Nearby / Weekend; concise live event cards                       | real ranked results, filters, consent, locale, availability truthfulness     |
| Map                | map dominates; distinct category pins, selected-venue sheet and list fallback                    | MapLibre, clustering, privacy and geolocation failure, URL state             |
| Check-in           | dock centre launches one shared verify/check-in entry, modal or route as existing model requires | auth return, check-in proof, one-time award, anti-fraud, safe cancellation   |
| Community          | feed plus Friends/Following/Nearby **only** where real backend entitlement exists                | moderation, blocking, reporting, minor safety, no location leakage           |
| AkiPals            | mascot stage, wardrobe, inventory, quests and XP                                                 | character family catalogue, user ownership, versioned saved-state migrations |
| Passport           | parchment book under dark common shell; stamps and milestones                                    | awarded history, visibility controls, public-share rules                     |
| Login              | cinematic splash and obvious OAuth/email options                                                 | callback, passkeys where supported, legal/consent/referral, deep-link return |
| Profile            | identity, interests, activity and prominent access to Pals + Passport                            | editing, privacy, account export/deletion, membership and claims             |
| Venue              | photo-led media hero, succinct metadata and sticky action strip                                  | identity, hours, claim ownership, QR, favorites, reviews, directions         |
| Event              | poster/photo hero, date and ticket/action hierarchy                                              | occurrence/timezone, organiser, booking and anti-fake-event validations      |
| Secondary routes   | shared typographic system and controls, purpose-specific content layouts                         | every pre-existing route/action, including empty/loading/error states        |
| Admin and business | shared design primitives only where safe; do not apply consumer dock to workspaces               | permission boundaries, moderation, staff tools, owner operations             |

## Single-release acceptance evidence

1. Generate route manifest from source (all `page.tsx`, dynamic variations and both locales) and reconcile every entry against a designated visual owner. Include metadata routes, error/not-found pages and loading states as a separate explicit inventory.
2. Add static test that only the shared dock owns dock markup/styles and that Home/Map/Check-in/Community/Profile route definitions are stable. No styling copied into individual pages.
3. Capture screenshots **of the built branch**, not concept art, at common Android, iPhone, tablet and desktop sizes. Include dark and light, empty/data-populated, authenticated and anonymous, and EN/ES.
4. Exercise actual return links and sensitive mutations in a disposable test context. Never create fake user check-ins or invoke live payment operations for testing.
5. Preserve canonical page URLs, structured data, accessibility focus, reduced-motion, touch target sizes, Android WebView inset handling and Cloudflare source pin.
6. Require exact branch-head green checks and signed release acceptance; merge once, verify deployed Worker version against merge source, run production read-only probes, and retain a fast rollback pointer.

**Release scope clarification:** Single atomic public release does not prohibit iterative commits on the same draft branch. It forbids piecemeal consumer UI deployment, not normal isolated development and CI feedback.
