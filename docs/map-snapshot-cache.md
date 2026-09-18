# Shared nationwide map cache

The map loads one compact JSON snapshot from `/api/map/snapshot`. Each marker is
`[venueId, longitude, latitude, unclaimedFlag]`. There is no total marker cap and
no camera-dependent loading. All venues are drawn together; card lists remain
20 per page. Venue names, addresses and profile URLs load only on a pin click,
from `/api/map/venue/:id`, with at most 200 detail results retained in that map
instance. Events keep their existing provider and data flow.

## Database and cache boundaries

`public_map_marker_snapshot()` returns all published venue markers across Spain
in one consistent SQL statement. It uses SECURITY INVOKER and the public
publishable key: cached output never depends on login cookies or privileged
credentials. Coordinates are rounded to six decimal places (roughly decimetre
precision). Neither private venue fields nor CRM data are cached.

`custom-worker.ts` intercepts the snapshot endpoint before Next and middleware.
The Cloudflare Cache API retains a copy per data centre for five minutes. URL
query strings, cookies and the www alias do not create separate cache entries.
Browsers cache for one minute; ETags support conditional requests. Responses
include `X-Map-Cache`, `ETag` and `X-Map-Snapshot-Created` for verification.

All cache misses reach **one globally named SQLite Durable Object**. It persists
the complete snapshot in 60 KB chunks, updated in an atomic transaction. One
shared promise coalesces simultaneous cold loads or refreshes. Eviction or deploy
restores the saved snapshot from SQLite instead of refetching Supabase.

Snapshots refresh on demand after 15 minutes. During a refresh, the last complete
snapshot remains available. Failed refreshes back off for one minute; snapshots
older than one hour require a successful refresh or return 503. Errors are never
edge-cached. Newly published, removed or moved venues typically reach a fresh
map within about 21 minutes (15-minute snapshot + five-minute edge + one-minute
browser cache); an already open map remains stable until a page reload. During a
database outage, cached markers can be older. Pin details independently recheck
published status. This is a public discovery cache, not a real-time feed.

## Capacity and cost

One thousand simultaneous requests do not cause one thousand snapshot SQL scans.
The cache manager test coalesces 1,000 simulated cold readers to one build; warm
edge hits avoid the Durable Object and Supabase entirely. This is a concurrency
regression test, not a production load benchmark or a throughput SLA. Cold edge
misses still transfer the full snapshot from the Durable Object. Visitors still
download all compact markers and cluster them locally, so mobile memory and
network use still grow with venue count. Event retrieval and twenty-card list
queries are separate workloads.

Snapshot database egress depends on refresh frequency and marker payload size,
not map visitor count. At continuous traffic, there are approximately 96 builds
per day, plus rare retries/cold recovery; idle periods do not build snapshots.
A new Durable Object namespace uses the existing Cloudflare account and its
included quotas/usage billing. No Supabase or Workers plan upgrade is performed.

## Deployment and rollback

1. Apply `20260918094627_compact_public_map_snapshot.sql`.
2. Deploy the public site's master branch. Wrangler registers the `MapSnapshot`
   SQLite class via migration `map-snapshot-v1` and the `MAP_SNAPSHOTS` binding.
3. Warm `/api/map/snapshot`; confirm the next request is a HIT with the same ETag,
   valid count and schema. Check a clicked venue's details and both card lists.

Use the Cloudflare build/preview to exercise caching locally. The plain Next dev
snapshot route intentionally returns 503 instead of an unbounded database fallback.
For rollback, restore the previous frontend/Worker entry point while retaining the
Durable Object migration and namespace. Do not delete its data as a rollback step.
The old marker-page RPC/API remains for already open older clients. The new SQL
function can be removed only after the snapshot Worker no longer calls it.
