# Discovery pagination

Discover and Map render at most 20 event cards and 20 nearby business cards per
page. Previous/Next links preserve filters and the other list's page. Filter form
submissions reset the pages. Venue pagination happens in Postgres, using the
existing geography index, distance ordering and ID tie-breaking. Out-of-range
pages clamp to the last page; public venue status and existing RLS both apply.

Map venue markers load independently after the map initializes, for the visible
bounds. Moving the map cancels stale requests and debounces new requests. The map automatically follows UUID continuation cursors until every published
venue in those bounds has loaded, with no total marker cap. Each request contains
up to 2,000 rows to keep individual responses manageable. Batches progressively
update the existing MapLibre clusters, with loading progress visible until the
last batch. Zooming out to Spain loads all published venues across Spain;
card pagination never limits map coverage. Errors are explicitly marked as an
incomplete load, and moving the map retries. UUID keyset ordering avoids offset
shifts during imports; newly published records before the current cursor appear
on the next viewport refresh. This is not a frozen snapshot during publication. Coverage
includes mainland Spain, the islands, Ceuta and Melilla. Responses cache for 30
seconds. Event discovery keeps its existing provider and ranking pipeline, but
event cards are also paginated. This change does not redesign event retrieval.

Deploy `supabase/migrations/20260917212056_public_venue_pagination.sql` before
the frontend. Then deploy `supabase/migrations/20260918031030_complete_map_venue_pages.sql`
before the complete-coverage frontend. The old window RPC remains for older open
clients during rollout. The RPCs are read-only SECURITY INVOKER functions. No business rows
are modified. Roll back the frontend first; then drop both functions using their
signatures from the migration if the database change also needs reversal.

Publish from `master`, preserving the CityDiscovery design. The CRM publishing
queue and its progress are independent of this change.
