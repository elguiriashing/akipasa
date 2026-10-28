# AkiPasa Radar × After Dark: full-app redesign contract
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
