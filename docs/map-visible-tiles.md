# Visible map areas

The browser loads compact marker tiles covering the visible area, with tile-edge padding. Up to four requests run concurrently; geographic coverage adapts with zoom to at most 32 requests per view. This bounds requests, not results: every marker in a requested tile is included, without a 2,000-record cutoff. Zooming out to Spain can still load all nationwide markers.

Completed tile coverage and marker IDs stay in memory for the mounted map, including empty tiles. Panning back does not download those areas again. Loaded parent tiles cover child tiles at closer zooms. Markers merge by ID; the source is updated once after a view load completes and only if data changed. Existing markers stay visible while new areas load. New arrivals may legitimately change nearby clusters; old data is never replaced by a truncated viewport. Errors keep successful areas and allow failed tiles to retry on subsequent movement.

Cloudflare partitions the same shared public snapshot into tiles inside the existing Durable Object. Edge cache keys include tile coordinates; snapshots still refresh once per shared cache lifecycle, not per visitor/pan. Only three zoom indexes remain in server memory. No new database query or provider is introduced. Venue details remain fetched on click and cards retain their independent limits. The legacy snapshot endpoint stays available for compatibility.

Cache scope is the mounted map; changing filters/remounting or refreshing starts a fresh client cache. The existing snapshot freshness rules still apply. Tile loading reduces initial transfer/parse work; speed remains dependent on connection and cold cache state.

## Persistent browser cache

Public compact marker tiles now persist across map remounts and browser visits in
IndexedDB (`akipasa-map-tiles-v1`). Only requested geographic tiles are read; the
entire nationwide dataset is not preloaded. Cached tiles render before network
refreshes. Tiles fetched within five minutes avoid another request; older tiles
(up to 24 hours) display while the visible area refreshes on reopening or movement.
Refreshes replace markers within each tile, removing deleted/moved markers there,
while retaining other explored areas. Unvisited areas refresh when revisited.

Storage is bounded to 256 tiles and approximately 12 MiB of serialized payload,
pruning oldest saved tiles on writes. Browsers may evict storage at any time.
Unavailable/blocked storage falls back to normal network loading; read/open waits
are bounded. Failed refreshes retain usable cached markers. Cache freshness is
additional to the existing shared snapshot/edge freshness window. It is not a
live status feed. Events, user data and venue detail cards are not persisted by
this cache, and clicking a venue still checks its public details independently.
