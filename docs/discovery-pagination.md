# Discovery pagination

Discover and Map render at most 20 event cards and 20 nearby business cards per
page. Previous/Next links preserve filters and the other list's page. Filter form
submissions reset the pages. Venue pagination happens in Postgres, using the
existing geography index, distance ordering and ID tie-breaking. Out-of-range
pages clamp to the last page; public venue status and existing RLS both apply.

Map venue markers load once across all Spain from a compact shared snapshot.
Panning and zooming never refetch venue data. The complete dataset is assigned
to MapLibre together, retaining stable clustering and full nationwide coverage.
Pin details load on demand. See [map-snapshot-cache.md](map-snapshot-cache.md) for
refresh timing, the Cloudflare edge/Durable Object cache, capacity and rollback.

Deploy `supabase/migrations/20260917212056_public_venue_pagination.sql` before
the frontend. Then deploy `supabase/migrations/20260918031030_complete_map_venue_pages.sql`
before the complete-coverage frontend. The old window RPC remains for older open
clients during rollout. The RPCs are read-only SECURITY INVOKER functions. No business rows
are modified. Roll back the frontend first; then drop both functions using their
signatures from the migration if the database change also needs reversal.

Publish from `master`, preserving the CityDiscovery design. The CRM publishing
queue and its progress are independent of this change.
