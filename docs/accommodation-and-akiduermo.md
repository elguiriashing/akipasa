# Accommodation separation and AkiDuermo preview

The September 2026 cleanup scanned all 75,366 published, unclaimed venues.
It recovered the original categories from the source-details workbook, matching
stable external IDs rather than names or street addresses. 74,827 venues matched
source rows. 21,000 confirmed accommodation venues were reclassified; 54,366
unclaimed activity venues and the existing claimed venue were retained. The
full venue count remains 75,367. Claimed/member-owned venues were not modified.

Confirmed types: 9,983 hotels, 4,719 rural houses, 2,803 hostels, 2,446 guest
houses, 520 apartments, 492 campsites, 33 motels and 4 student accommodation
listings. A further 231 records have accommodation wording but activity source
categories. They remain activities and appear in AkiHQ's “Accommodation: mixed
labels” review filter. Examples include hotel bars, hotel restaurants and venues
named Hotel California. Do not assume that “Casa”, “Villa” or a hotel name alone
identifies the accommodation business rather than an independently listed bar.

## Storage and scope

`venues.discovery_vertical` is the authoritative activities/accommodation
field. `accommodation_type` retains the subtype. CRM JSON also receives category,
discoveryVertical and accommodationType without replacing its original type.
CRM filters resolve the linked venue so subsequent JSON edits cannot silently
change the public category. Existing IDs, slugs, claim state and source data stay
intact. Unpublished/import-review records are outside this cleanup.

The private, RLS-protected `akiduermo` schema stores source categories, pre-change
classification fields, evidence, and mixed-label review candidates. Its invoker
view references existing venue IDs. It is not exposed through PostgREST. Existing
workspace authorization remains on `crm_company_list`; anonymous callers cannot
read private audit/review tables. Both repositories retain the same migration
files because they share the database. Do not reapply them to the linked project.

`database/operations/classify-accommodation.sql` is the idempotent data operation.
It only processes active, unclaimed, unverified venues without venue members or
pending/approved claims and preserves the original field values for rollback.
Re-running it skips already-classified venues. It does not classify new imports
automatically: repeat a source review for a separately authorized import batch.

## Discovery and map compatibility

Nearby lists and general venue search exclude accommodation. The map starts
with Events & venues; its separate Accommodation switch displays forest-green
pins (#166534). The new v2 compact marker adds an accommodation bit without
removing any markers from the full snapshot. Browser, edge and durable snapshot
caches use new namespaces/keys. Legacy open tabs receive activity-only v1 tuples.
Both verticals retain viewport tile loading and complete marker coverage.

Existing venue URLs stay reachable and display an accommodation badge. Actual
events at accommodation properties are still activities and are not removed.

## AkiDuermo

`/akiduermo` is an unlisted, noindex discovery preview. The custom domain
`akiduermo.akipasa.com` routes to the same Worker; middleware rewrites its root
to the preview. The design uses a mobile search, destination photography already
in AkiPasa, property-type filters, twelve-result pagination, local-device saved
stays, details and an accommodation-only map. Property image placeholders are
clearly labelled; no invented reviews, photos, amenities, prices or availability.

Dates and guests are trip-planning inputs only. The interface explicitly states
that availability is not checked and no booking/payment is taken. Property
websites are limited to HTTP(S), without URL credentials. The false
`akiduermo_public` flag reserves a future full product launch; the explicit
preview route is intentionally available while that launch remains disabled.
No booking engine, host onboarding, room inventory, payments or legal rental
verification is implied by a source category or by the preview.

## Validation

Migration SQL was exercised in a PostgreSQL-compatible local engine, covering
nearby exclusion, full classified marker counts, CRM filters, access denial and
private schema permissions. Database reconciliation found 21,000 venue audit
rows, 21,000 CRM audit rows, zero claimed venues changed and no deletions.
The application suite includes vertical/cache and query/link validation tests.

The repository-wide `npm run check` currently stops at pre-existing formatting
in VenueQuickSearch and venue-search. Its existing lint warnings include the
Google Analytics script and the search input's ARIA role. Changed new components
are linted separately, and typecheck, unit tests and build are run directly.

## Shared ecosystem styling

AkiDuermo now consumes AkiPasa's global colour tokens and inherited font stack,
shared `Icon` component, orange A brand mark and ThemeManager/ThemeToggle.
Cards, pill buttons, selected states and navigation follow the same visual
language in both light and dark modes. Theme preferences are saved per origin.
The accommodation map classification and forest-green pins remain unchanged.
The stay navigation is available on desktop and fixed above the mobile safe
area; mobile form text stays at 16px and interactive controls at least 44px.

On mobile and tablet, the hero and search card are separated by a 16px gap,
with aligned outer edges. The overlapping search treatment is desktop-only.

AkiDuermo supports English and Spanish using a header EN/ES switch beside the
shared theme control. Switching keeps the current search, dates, map/list view
and saved stays. A first-party language cookie remembers the choice for a year;
`?lang=es` or `?lang=en` overrides it for shareable links. Middleware validates
the locale before setting the server-rendered document language and metadata.
Map labels, accessibility text, trip summaries, property categories and AkiPasa
links follow the selected language; imported property names remain unchanged.

### Dedicated stay pages and host isolation

Explore cards and map popups now share canonical AkiDuermo `/stays/[slug]`
links, preserving EN/ES. Old localized venue links on the stay host redirect to
these pages. Other primary-app routes redirect to akipasa.com; mutation requests
and unrelated API endpoints are rejected on the stay host to prevent a second
AkiPasa shell or broken authentication flow.

Property pages read only published accommodation via the public Supabase client.
They include actual property media when available, explicit photo placeholders,
overview, location, verified-information caveats, device-local saving, language
and theme controls, and a responsive date/guest planning panel. No room inventory,
rates, availability, reviews or reservations are fabricated. The form is a preview
and does not create a booking or take payment. Property website and directions
links are external; activity discovery explicitly links to the primary domain.
