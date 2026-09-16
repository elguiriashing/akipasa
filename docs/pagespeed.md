# PageSpeed fixes — September 2026

Source: https://pagespeed.web.dev/analysis/https-akipasa-com/6y1nj7dk0w?form_factor=mobile

The supplied mobile run scored 98 performance, 100 accessibility, 92 best
practices and 100 SEO. Its desktop companion also flagged a logo label mismatch.

Changes:

- Permit Cloudflare's already-injected analytics beacon at its exact script
  path and versioned subpaths. Keep the remaining CSP protections; automatic
  beacon reporting uses the existing same-origin connection permission.
- Load MapLibre's stylesheet with the map component, instead of every route.
  Keep mobile map controls at 44px with a scoped override that wins regardless
  of stylesheet loading order.
- Exclude the decorative logo letter and dot from accessible names.
- Resolve root and www redirects before session work or page rendering.
  Preserve query parameters and combine www/root normalization into one hop.

The canonical root redirect remains intentional for the Spanish/English URL
structure. Next.js compatibility JavaScript is retained; removing framework
polyfills to suppress an 11 KiB warning could break supported browsers. Shared
site CSS remains render-blocking to avoid an unstyled first paint. The reported
35ms reflow had no attributed application stack, so it is not claimed fixed.

The original report is a saved run. A new live mobile/desktop PageSpeed run is
needed after deployment to measure the resulting score; no score increase is
assumed from source changes alone.

The initial patch was tested on the older master UI: its shared stylesheet fell
from 32,338 to 22,321 gzip bytes. That result is historical, not a measurement of
the current redesign. See `deployment-source.md` for the source reconciliation.

The combined September 16 release preserves the current redesigned UI and these
fixes. Its shared CSS is 44,173 gzip bytes; MapLibre styles remain map-only. The
production and OpenNext builds passed. HTTP tests confirm sitemap/metadata,
redirect and CSP behavior plus the CSS split. A real-browser visual check and a
fresh live PageSpeed run remain outstanding.
