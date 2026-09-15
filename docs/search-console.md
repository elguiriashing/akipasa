# Google Search Console

The production sitemap index is **https://akipasa.com/sitemap.xml**. Submit this
single URL in the verified property's **Sitemaps** report. `robots.txt` also
advertises it for automatic discovery. No Google Analytics tag is required.

The index links to the six public general pages in English and Spanish and paged
venue/event sitemaps. Catalogue pages use anonymous Supabase access and include
only published records. An event also requires a published venue and an
occurrence. Drafts, archived events, account data and staff/business workspaces
are excluded. New published content is picked up automatically; no rebuild or
manual resubmission is needed. Successful XML responses can be cached for five
minutes. Each catalogue sitemap contains at most 1,000 records / 2,000 URLs.
Database failures return 503 with a retry interval instead of an empty sitemap.

Public pages publish a canonical URL on `https://akipasa.com`, reciprocal `es`
and `en` alternates, a Spanish `x-default`, and localized titles/descriptions.
Venue timestamps come from the stored `updated_at`. Static pages and events do
not invent `lastmod` dates; event occurrence changes don't reliably update the
parent timestamp. Google ignores sitemap priority and change frequency, so those
fields are omitted. Structured data describes the website, public places and
events using the actual page data.

Private/authentication pages send `X-Robots-Tag: noindex, nofollow`. They remain
crawlable so Google can read that instruction. Authentication and authorization,
not robots.txt, protect the data. API crawling is disallowed. XML and robots
requests bypass session refresh and do not set session cookies.

## Account-side checks

- Keep the DNS TXT verification record if using a Domain property. Website code
  cannot create or replace Search Console ownership. A Domain property covers
  HTTP/HTTPS and www/apex; a URL-prefix property must match the canonical HTTPS
  host. Do not remove an existing verification method.
- Submit `https://akipasa.com/sitemap.xml` once. Check that Google reports success
  for the index and child sitemaps.
- Inspect the English/Spanish homepages and one published venue with **Test live
  URL**. Confirm crawling is allowed and the declared canonical matches. Request
  indexing for representative pages if needed; the sitemap handles discovery of
  the catalogue.
- Review **Page indexing**, **HTTPS**, **Core Web Vitals**, **Manual actions** and
  **Security issues** as Google gathers data. Reports and indexing are controlled
  by Google; a successful sitemap submission does not guarantee indexing or
  ranking. Empty reports on a new property can take time to populate.

Sources: [Google sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
[Sitemaps report](https://support.google.com/webmasters/answer/7451001).
