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
