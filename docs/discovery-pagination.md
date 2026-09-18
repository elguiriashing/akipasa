# Discovery pagination

Discover and Map render at most 20 event cards and 20 nearby business cards per
page. Previous/Next links preserve filters and the other list's page. Filter form
submissions reset the pages. Venue pagination happens in Postgres, using the
existing geography index, distance ordering and ID tie-breaking. Out-of-range
pages clamp to the last page; public venue status and existing RLS both apply.

Map venue markers load once after the map initializes, across all Spain (including
islands, Ceuta and Melilla), independently of the camera and card filters. The
loader follows UUID continuation cursors until exhaustion with no total marker
cap. Each request contains up to 2,000 rows as a transport batch only.

The full dataset is assigned to MapLibre in one update after the final batch.
Progress text updates while downloading, but partial venue batches are not drawn.
Panning and zooming do not fetch, clear, or replace venue data. MapLibre handles
normal zoom-dependent clustering against the same nationwide dataset. This avoids
clusters jumping as partial batches arrive or viewport boundaries change.

The dataset stays fixed for that map instance; refresh the page to see newly
published venues or retry a failed load. UUID ordering avoids offset shifts during
imports, but a load is not a transactionally frozen snapshot. Card lists still
use 20 results per page. Event retrieval and ranking are unchanged.
Responses cache for 30 seconds.

Deploy `supabase/migrations/20260917212056_public_venue_pagination.sql` before
the frontend. Then deploy `supabase/migrations/20260918031030_complete_map_venue_pages.sql`
before the complete-coverage frontend. The old window RPC remains for older open
clients during rollout. The RPCs are read-only SECURITY INVOKER functions. No business rows
are modified. Roll back the frontend first; then drop both functions using their
signatures from the migration if the database change also needs reversal.

Publish from `master`, preserving the CityDiscovery design. The CRM publishing
queue and its progress are independent of this change.
