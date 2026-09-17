# Discovery pagination

Discover and Map render at most 20 event cards and 20 nearby business cards per
page. Previous/Next links preserve filters and the other list's page. Filter form
submissions reset the pages. Venue pagination happens in Postgres, using the
existing geography index, distance ordering and ID tie-breaking. Out-of-range
pages clamp to the last page; public venue status and existing RLS both apply.

Map venue markers load independently after the map initializes, for the visible
bounds. Moving the map cancels stale requests and debounces new requests. Each
response contains at most 2,000 venues; when truncated, the UI asks visitors to
zoom in. Cluster counts reflect loaded markers, not nationwide totals. Coverage
includes mainland Spain, the islands, Ceuta and Melilla. Responses cache for 30
seconds. Event discovery keeps its existing provider and ranking pipeline, but
event cards are also paginated. This change does not redesign event retrieval.

Deploy `supabase/migrations/20260917212056_public_venue_pagination.sql` before
the frontend. The RPCs are read-only SECURITY INVOKER functions. No business rows
are modified. Roll back the frontend first; then drop both functions using their
signatures from the migration if the database change also needs reversal.

Publish from `master`, preserving the CityDiscovery design. The CRM publishing
queue and its progress are independent of this change.
