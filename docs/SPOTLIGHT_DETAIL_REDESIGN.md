# Spotlight venue and event detail redesign

## Requested result and source

Alex selected **01 / Aki Spotlight** from the responsive design concepts and
explicitly requested implementation plus a live merge on 2026-10-12. The
isolated branch starts at public `master` commit `c651a69`; `main` is not the
public application source.

The venue page should pair public photography with venue identity and visiting
actions, then show compact catalogue previews and upcoming events. The event
page should instead pair event artwork with timing, host, access and its
existing reservation action. Desktop and landscape tablet use horizontal
space; portrait tablet, phone and split-screen recompose the same content.
Both `/en` and `/es`, and both light and dark themes, are required.

## Current behavior and dependency trace

The current public detail routes use a shared generic cover, facts and
equal-weight action grid (`app-detail-page`, `compact-app.css`). Large images
and vertically repeated sections consume space before useful details.

| Boundary             | Preserved contract                                                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Public routes        | `/[locale]/venues/[slug]` and `/[locale]/events/[slug]`; existing metadata, canonical/hreflang, JSON-LD and locale text selection               |
| Catalogue reads      | Existing repository adapter, published venue/event rows, published catalogue sections and existing repository media/placement selections        |
| Personal state       | Existing authenticated saved/followed/going actions and checks; anonymous login handoffs; no new privileges                                     |
| Booking              | Existing external/native/disabled venue modes and event cancellation/sold-out gates; requests continue to the authoritative booking routes/RPCs |
| Event timing         | Existing selected occurrence, full start/end dates and Europe/Madrid rendering; custom official-event location remains distinct from host venue |
| Menu                 | Current published items, prices, allergens and event-linked section IDs; no copied menu records or fake sample data                             |
| Other venue features | Contact links, premium offers, loyalty/progress and additional actions remain reachable                                                         |
| Portals              | Existing accommodation redirects and AkiBusiness editor sources remain intact; no AkiHQ or AkiDuermo layout redesign                            |
| Analytics            | Existing consent-controlled AnalyticsView, TrackedLink and share signals; no new event stream or personal data                                  |
| Infrastructure       | No migrations, SQL/RLS, secrets, storage uploads, billing, mail or production record changes                                                    |

Source owners: venue route, `VenueSpotlightSections` and venue-scoped CSS;
event route and event-scoped CSS; shared `spotlight-detail.css`, `ShareButton`
and the existing SVG icon set. CSS is scoped to `.spotlight-page` and its
venue/event variants so other product pages retain their existing styling.

Mockup photographs, sample opening status and categories are illustrative.
The implementation must only render real available fields and handle missing
artwork/catalogue/booking without inventing content. Logo-only artwork must
not be stretched into a giant cover.

## Acceptance and release evidence

- `npm run check` passed after implementation: Prettier, ESLint, full
  TypeScript, 623 automated tests across application/database/automation
  suites, local database safety, automation Worker dry-run and the Next
  production build. Twenty new focused tests cover both detail layouts and
  sharing; existing server-action/booking restrictions remain exercised.
- Initial browser inspection found a mobile venue grid span that stacked the
  visiting actions, and an existing floating support button overlapping that
  bar. The mobile actions now use one row; the duplicate floating launcher is
  hidden only on these mobile detail pages, while footer Contact still opens
  the same support flow. The browser gate checks both action targets.
- A complete dedicated Chromium run passed all 28 cases (48 responsive
  venue/event visits plus four edge-case scenarios) with zero unexpected local
  adapter operations. It checks real route rendering, published menu/allergen
  navigation, share, SEO, host/auth links, booking gates, long/missing content
  and hit-tested mobile actions in EN/ES/light/dark at 360×800, 390×844,
  600×500, 820×1312, 1280×800 and 1536×960. Final visual refinements give the
  event reservation action the remaining bar width beside a 44px directions
  icon and respect reduced motion; the default full matrix is rerun on that
  final source before packaging. The final default command passed all 28 in
  38.2 seconds, including the 44px icon-width guard; representative desktop,
  tablet and phone screenshots were inspected.
- The existing broad `npm run test:e2e` was run in a separate source snapshot
  with fixture mode and disposable loopback Supabase settings. Its production
  build passed, but the generic suite did not pass. Empty catalogue fixtures,
  old discovery/auth/Passport selectors, conflicting root redirect and PWA
  icon expectations, plus an unavailable external business redirect affected
  tests outside these detail routes. The previously documented discovery
  heading and ambiguous Passport selector failures were observed again.
  The run was interrupted after repeated five-minute waits on the obsolete
  `Search plans` selector rather than waiting for six identical long timeouts.
  Partial output contained 22 pass, 21 assertion-failure, 13 timeout and 29
  skip markers; 20 of 105 cases had no terminal marker. The reporter did not
  finalize, so these are diagnostic counts, not a completed suite result.
  No existing test or acceptance gate was weakened. The snapshot predates
  only the subsequent Spotlight layout/class refinements; it contains no
  production credentials or records. Required Spotlight CI uses its own
  populated disposable adapter and does not depend on those empty fixtures.
- `npm run build:cloudflare` and `wrangler deploy --dry-run` passed on the
  final application source. The package retains the existing asset, Durable
  Object and AkiHQ gateway bindings. No deployment settings or secrets change.
- Final default browser acceptance and packaging passed. GitHub CI and live
  rollout verification are recorded in the PR release record after the
  authorized merge; local checks alone do not establish live promotion.

Browser acceptance must use disposable local catalogue responses, not write
test records or send booking/notification messages in production. Inspect
desktop, landscape tablet, portrait tablet, phone and short split-screen in
both locales/themes. Check the hero arrangement, horizontal overflow, long
text, actions, linked host, section navigation, missing data and published
menu/allergen access. Default fixture arrays are empty; a fixture-mode 404 is
not evidence that a redesigned detail page works.

Release only the tested branch into the current `master`, inspect connected
Cloudflare deployment status and the live CityDiscovery/venue/event routes.
Source-only rollback is a revert of this change; no data rollback is needed.
Automated/local acceptance and unauthenticated production checks must remain
distinct from signed-in production validation.
