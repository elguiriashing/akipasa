# AkiPasa brand refresh — September 2026

Reference: Alex's orange pin-and-spark logo kit.

| Role                                  | Colour                  |
| ------------------------------------- | ----------------------- |
| Primary actions, pin, Pasa            | Sunset orange `#F26B1D` |
| Light-mode text, dark-mode background | Navy `#14213D`          |
| Spark and wordmark dot                | Yellow `#FFBE2E`        |
| Light-mode canvas, dark-mode text     | Cream `#FAF7F2`         |

The shared CSS palette covers discovery, search, venue/event pages, membership,
subscriptions, account, business, staff, admin and shared accommodation surfaces.
Hard-coded dark green surfaces and overlays have navy replacements. Semantic
success/error colours, map category colours and explicit owner accent choices
remain distinct. Primary orange buttons use navy text.

`BrandLogo` and `BrandMark` provide the shared horizontal wordmark and geometric
pin/spark. Mobile navigation, desktop navigation and workspace marks use these.
SVG favicon and all four PNG app icons use the navy app tile. Reusable transparent
horizontal and stacked light/dark SVG lockups live in `public/brand`. SVG wordmarks
use a system font stack; they are recreations from the supplied raster reference,
not original outlined vector masters.

Light and dark themes now use CSS as the single palette source; the theme manager
sets the active theme without injecting a competing inline palette. The offline
page and PWA manifest use the new identity and the shell cache version is bumped.
Taglines are “Go out. Explore. Enjoy.” and “Sal. Explora. Disfruta.”

This checkout is the public-site `master` source. The separate CRM source on
`main` is not included in this change. No payment configuration, subscriptions,
venue data or production records are changed.

Validation: `npm run check` passed in an isolated checkout (formatting, lint,
TypeScript, 266 app/subscription tests, 41 automation tests, database safety,
automation dry-run and production build). The production UI was inspected at
390px and 1440px in light and dark modes for discovery, membership, authentication
and map: all 16 combinations had the expected palette/logo and no horizontal
overflow. Preview data used local fixtures and empty read-only database responses.
Live authenticated accounts and external map tiles were not verified here.

## Map follow-up

The basemap now follows the active light/dark theme, including changes while the
map is open. Palette updates repaint existing layers without replacing the map,
resetting the camera, or touching discovery marker layers. Dark mode retains
navy land and blue water; light mode uses cream land, pale blue water and navy
labels. Theme observers are disconnected when the map unmounts.

Map vertical filters have separate opaque button surfaces without an enclosing
panel. The legend follows the theme and its collapsed summary is 36px tall.
