# AkiPasa Radar × After Dark: single-release acceptance

**Scope:** All 103 source page routes. The 13 separate-product routes are deliberately excluded; 90 other consumer, operational and cross-product pages require review. The definitive source of route state is `docs/AKIPASA_UI_ROUTE_MATRIX_20261028.json`.

**Current status:** work in progress. Ordinary GitHub workflows being green is not a substitute for this checklist. Never mark an unreviewed route accepted or merge solely to make the site appear updated.

## Shared visual contract

All AkiPasa consumer pages use `AppShell` and its canonical `PasaBottomDock` (Home / Map / Check-in / Community / Profile), `LaunchRibbon` and global visual tokens. Authenticated Account, Admin and Staff subpages reuse the existing `WorkspaceShell` and `PasaSharedSurfaces.css` rather than copying new menus, navbars or cards per page. Event and venue details use the existing Spotlight templates and tracked actions. No change is allowed to check-in proof, rewards ledger, permission logic, billing, RLS, consent or age gates without separate verification.

## Route review batches

| Group                   | Where                                                       | Evidence needed                                                                                                                                                     |
| ----------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Discovery and launch    | Home, Map, Check-in, Community, Roadmap and root redirects  | English and Spanish; 360/390px phone, 820px tablet, 1440px desktop; real populated and honest empty states; filter preservation, accessible controls and proper SEO |
| Venue and event detail  | Venues and events including booking subpages                | Event time/price truthfulness, real images and claims; booking flow, direction actions, mobile bottom bar and browser back; isolated Spotlight six-viewport fixture |
| Personal journeys       | Login/recover, onboarding, Profile and all Account subpages | OAuth and redirect return, settings, consent and privacy, clear error states, no cross-tenant data, light/dark, Android WebView inset and touch targets             |
| Collectibles and social | Passport, Prestige subpages, AkiPals and Community creators | Existing awards and wardrobe state preserved; truthful private AkiPals gate; no fictitious Friends graph or private location exposure                               |
| Operations              | Admin, Staff, owner and business entry routes               | Real role gates, support/moderation/claims/billing read and write permissions, tablet and desktop navigation, error states and auditability                         |
| Shared entrypoints      | Root, /roadmap, /hq-login, waitlist confirmation            | Redirects, consent, correct product identity and operational safety                                                                                                 |

## Evidence requirements

Review the six shared error, not-found and existing Admin loading states in
`docs/AKIPASA_UI_FALLBACK_MATRIX_20261029.json` alongside their parent routes.
The page-only inventory does not prove fallback-state acceptance. Preserve the
original 404/307 guest and missing-route contracts; a global loading boundary was
rejected after actual Next testing changed 404 to 200. Root-layout failures use
the separate neutral bilingual global-error document. These states remain in
progress until genuine reviewed-source/browser/device evidence exists.

A route may move to `in-progress` when its common component or visual styling is implemented. **In-progress is never a sign-off.** For an `accepted` status, record a meaningful reviewer and the exact code commit reviewed, along with accessible GitHub Actions / PR links to real screenshots and functional test results. Use this object under the relevant route record:

```json
{
  "status": "accepted",
  "acceptance": {
    "reviewer": "GitHub reviewer login or responsible tester",
    "reviewedCommit": "40-character reviewed source SHA",
    "screenshots": "https://github.com/elguiriashing/akipasa/actions/runs/<real-run>",
    "functionalTests": "https://github.com/elguiriashing/akipasa/actions/runs/<real-run>"
  }
}
```

Replace the placeholders only with real evidence. A missing or malformed record is rejected by `scripts/pasa-ui-route-audit.mjs`.

## Actual screenshot inspection checkpoint

The earlier successful Account CI run `40787776091` produced real responsive captures for ten Account subpages at six viewport sizes in both languages and themes. The earlier tablet CI run `40787776158` captured Spotlight venue/event routes and operations components. The reviewed contact sheets showed functional content and no obvious missing Account screen, but the Account layout was still more utilitarian than the requested cinematic reference. The shared profile hero and workbench changes in this PR were added **after** those captures and must be screenshot-reviewed again at the final source SHA. No Account, Venue or Event route was marked accepted on that earlier evidence.

The upgraded public screenshot audit now explicitly includes both languages of Home, Map, Check-in, Community, Roadmap, Passport, Login, membership and legal pages. A source-driven guest-gate suite exercises the real Account, Admin and Staff page inventory; that is security evidence, **not** proof of an authenticated admin visual experience. Keep the red strict gate until the actual output and required role-specific UI changes have been reviewed.

## Pre-merge and production

1. Check every route in the source matrix; attach evidence and validate `npm run release:pasa-audit` successfully with **zero** outstanding in-scope routes.
2. Require exact-head green contract, npm check/build, public/UI, account, onboarding, booking, AkiPals and tablet workflows. Verify screenshots rather than assuming the existence of artifacts proves the visual match.
3. Review every new CSS selector in dark and light modes, reduced motion, keyboard, touch, desktop, Android safe-area and EN/ES. Exercise real action paths using disposable test fixtures; never award XP or take live payments for testing.
4. Reconcile relevant outstanding PR changes and confirm GitHub reviewers, no blocking threads, up-to-date master and rollback-ready source SHA.
5. Merge **once** with expected head SHA only after all requirements are actually satisfied.
6. Cloudflare connected builds can automatically publish `master`: this was observed on 29 October when cleanup merge `f3d2687f` reached production without a manual dispatch. Treat merging as production-impacting and require all acceptance gates before merging. `.github/workflows/brand-production.yml` remains an explicit manual release path with `DEPLOY_AKIPASA`; it is not the sole publication path. Verify the exact merged source after automatic publication, or use the reviewed manual path only if a release is still needed.
7. Confirm Cloudflare Worker version and HTTPS production content match the built source; check public Home, Map, Community, Check-in, /roadmap, venue/event pages, login and app routing. Keep the prior working Worker version as rollback.

No automation or operator may change all `pending` values to `accepted` to force a release. A deliberate red visual acceptance workflow is expected before actual review is complete.
