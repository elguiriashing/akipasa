# City discovery homepage

The homepage starts with Madrid, Barcelona, Málaga, Valencia and Sevilla, followed by three nearby cities. The existing event and venue results remain below these rows. Each tile opens discovery for its city with a 25 km radius and all upcoming times.

The shared top-right search button uses a native, dismissible popover on every localized page. It contains the existing location autocomplete, GPS button, radius, time, category, prices, dates and accessibility controls. Changes update Discover or Map in place; searches from other pages open Discover. Escape, the close button and outside clicks dismiss the panel. On phones the panel scrolls within the viewport, above the bottom navigation.

The city catalogue covers all 50 provincial capitals, Ceuta, Melilla and additional major destinations. GPS is reused automatically when permission is already granted; otherwise the visitor can request it with the location button. Distances are great-circle distances, not driving distances. Without GPS, an explicitly selected area is clearly labelled as the origin. Without either, the row shows three suggested escapes and asks the visitor to enable location; it does not claim these are nearby.

Photos are local WebP files in `public/images/cities`. `src/lib/city-photos.json` records each source, author, attribution, license and transformation. Public credits are available at `/es/photo-credits` and `/en/photo-credits`. Rebuild missing assets with `node scripts/collect-city-photos.mjs`; a city key argument refreshes that photo. Review any replacement visually and retain its attribution. Image derivatives retain their source license.

Validation: location tests cover geographic ranking, island destinations, catalogue/asset coverage and city links. `tests/e2e/city-discovery.spec.ts` covers mobile/tablet/desktop layouts, repeated live filters, tile links, GPS success and refusal, and cross-page search.

## Local validation — 12 September 2026

- Full app lint and database safety checks passed. The app test run passed 104 tests; the isolated workspace-shell rerun passed its remaining 9 tests after adding a mock for the separately browser-tested search component. Location tests passed all 10 cases.
- The changed UI passed its scoped TypeScript check. Desktop and mobile screenshots were inspected in both themes, with all city images loading and no document overflow.
- All six browser scenarios passed across the completed runs and focused reruns: 360, 390, 768 and 1440 px layouts; repeated filters; loaded city photos and links; GPS refresh from Vigo to Tenerife; denied GPS; and searches from Privacy and Map. The tests caught and fixed interactions before hydration and stale cached GPS on an explicit refresh. Logs are in `.task-logs/homepage-browser-final.log`, `homepage-browser-retry.log` and `homepage-browser-cross-page.log`.
- The initial repository-wide check encountered existing formatting in `src/components/BusinessPackageExplorer.tsx`. An initial production build stopped at an unrelated undefined `application` reference in subscription actions. Other ongoing work corrected those issues; the production release below subsequently passed its full builds. These files were left untouched by this redesign.
- The separate automation project passed 18 tests; three suites encountered Vitest RPC fetch timeouts on this host. No automation behavior was changed by this task.
- Browser acceptance uses an isolated source copy under `.task-logs/homepage-preview`, fixture catalogue data, and a local empty API stub. Production environment files were not copied. The preview does not represent live catalogue contents.
- The host ran out of disk space during acceptance. The preview's temporary webpack cache was cleared and disk caching disabled for the final isolated run. The temporary server was stopped after verification; screenshots remain available.

## Production release — 12 September 2026

The user authorized a live push. The shared public build was already being released by the authorized **Review role permission logic** task, so this task verified that its source included the homepage changes and independently checked the resulting deployment. The 314-file input fingerprint was unchanged during the release.

- Public Worker version: `2d11a124-0689-4fd5-9a02-a90a9eeece46`.
- Domains: `https://akipasa.com` and `https://www.akipasa.com`.
- Validation: full formatting; public lint, type checking, 113 tests and database safety; Next.js and OpenNext production builds; 41 automation tests and its dry run. The automation Worker was not deployed by this task.
- Both domains returned HTTP 200 with the new city rows and shared search. English, Privacy, Map and photo-credit routes also returned 200 with the search control. All 66 city photos returned 200 with WebP content.
- Live Chrome checks at 390 and 1440 px passed city-tile display, opening/changing/closing search, no document overflow and no page runtime errors. Emulated Vigo GPS returned Vigo, Pontevedra and Ourense. A transient direct-HTTP connection timeout cleared on retry.

Deployment output and independent verification are recorded in `.task-logs/homepage-production-deployment.txt`, `homepage-live-http.log` and `homepage-live-browser.log`. Production screenshots are `homepage-live-390.png`, `homepage-live-1440.png`, and their `homepage-live-search-*` counterparts in `.task-logs`.
