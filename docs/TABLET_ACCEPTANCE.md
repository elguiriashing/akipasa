# AkiSuite tablet release candidate — PR #79

This candidate fixes the supplied portrait AkiBusiness login and split-screen managed-venue screenshots. It does not certify every authenticated route or a physical Android installation.

## Changes

- AkiBusiness and AkiPasa auth use a centered single column below 1200 CSS pixels; sign-in, signup, magic link and recovery remain available. Portal choices stay beneath the form.
- Managed venue names and owner actions stack/wrap in tablet split windows. Delete still requires its original reason and DELETE confirmation; the dialog scrolls in short windows.
- AkiDuermo search fields use flexible tracks and a three-column tablet arrangement; listing cards use two columns at intermediate widths.
- All three hosts expose separate application names, branded raster icons, 192/512px maskable variants, manifests and service workers. AkiPasa retains its previous implicit `/es` installation identity. Host detection is consistent across routing, metadata, manifest and SVG fallback.
- The service worker stops caching the manifest; it retains network-first navigation and never caches authenticated responses or API data.

## Acceptance matrix

Viewports: 390×844, 600×960, 768×1024, 820×1180, 1024×768, 1280×800 and 640×400 CSS pixels. Both EN/ES and light/dark are tested.

| Surface                      | Automated evidence                                                                                                                                | Boundary                                                                                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public AkiPasa and AkiDuermo | Four route matrices: home, auth, membership, map, passport, community, privacy, terms, stay discovery; page width and navigation sheet open/close | Fixture discovery with unavailable live backend; external resources blocked for deterministic layout checks; existing consent-version cookie with optional choices defaulting to false |
| AkiBusiness auth             | Four modes across 28 locale/theme/viewport combinations; actual virtual-host routing and form bounds                                              | No real password, OAuth, magic email or recovery request submitted                                                                                                                     |
| PWA resources                | Three manifests, PNG/SVG resources, service worker and offline page return on the correct host                                                    | Headless HTTP acceptance; Android WebAPK install/update remains untested                                                                                                               |
| Venue management             | 28 real-component combinations; action bounds, all dashboard tabs, booking subtabs and form bounds, delete confirm/cancel                         | Disposable component actions; no authenticated production records loaded or deleted                                                                                                    |
| Application checks           | Format, lint, types, unit suites, database safety, automation checks and Next build                                                               | No production smoke or DB mutation                                                                                                                                                     |

Commands: `npm run check`, `npm run build:cloudflare`, `npx playwright test tests/e2e/tablet-suite.spec.ts --workers=2`, `node scripts/test-tablet-browser.mjs`. The tablet workflow uploads browser evidence. Local Chromium 153 was used because the usual Playwright browser download failed.

## Production hold

- The broad existing `npm run test:e2e` attempt is not green: test backend data is unavailable and older selectors/expectations do not match current screens. The run was interrupted after recorded failures rather than counted as a pass.
- Provision a disposable authenticated staging backend and verify populated venue/event/menu/media/team/claim screens and each role; the static inventory includes 110 routes. No exhaustive authenticated sign-off is claimed.
- Use the Android tablet to verify fresh install names/icons, existing install updates, portrait/landscape rotation, split-window resizing, keyboard-open forms, back navigation and standalone launch paths.
- Inspect required PR/connected Cloudflare checks on the exact head before merge. Releasing production remains a separate step; no merge or production promotion is performed here.

Rollback: revert this PR's application and asset changes. No migration, booking data, permissions, prices, advertising settings or production records were changed.
