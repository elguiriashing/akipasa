import {
  mapSnapshotSchema,
  type CompactMapMarker,
  type MapMarkerSnapshot,
} from "./map-snapshot";
export type MapTile = { z: number; x: number; y: number };
export type MapBounds = {
  west: number;
  east: number;
  south: number;
  north: number;
};
export const tileKey = ({ z, x, y }: MapTile) => `${z}/${x}/${y}`;
export function parseMapTile(path: string): MapTile | null {
  const match = /^\/api\/map\/tiles\/(\d{1,2})\/(\d{1,4})\/(\d{1,4})$/.exec(
    path,
  );
  if (!match) return null;
  const [z, x, y] = match.slice(1).map(Number);
  if (z > 12 || x >= 2 ** z || y >= 2 ** z) return null;
  return { z, x, y };
}
export function markerTile(
  longitude: number,
  latitude: number,
  z: number,
): MapTile {
  const n = 2 ** z;
  const lat =
    (Math.max(-85.05112878, Math.min(85.05112878, latitude)) * Math.PI) / 180;
  return {
    z,
    x: Math.max(0, Math.min(n - 1, Math.floor(((longitude + 180) / 360) * n))),
    y: Math.max(
      0,
      Math.min(
        n - 1,
        Math.floor(((1 - Math.asinh(Math.tan(lat)) / Math.PI) / 2) * n),
      ),
    ),
  };
}
export function tilesForBounds(bounds: MapBounds, zoom: number): MapTile[] {
  for (let z = Math.max(0, Math.min(12, Math.floor(zoom) + 1)); z >= 0; z--) {
    const spans =
      bounds.west <= bounds.east
        ? [[bounds.west, bounds.east]]
        : [
            [bounds.west, 180],
            [-180, bounds.east],
          ];
    const tiles = new Map<string, MapTile>();
    let tooMany = false;
    for (const [west, east] of spans) {
      const a = markerTile(west, bounds.north, z),
        b = markerTile(east, bounds.south, z);
      if ((b.x - a.x + 1) * (b.y - a.y + 1) > 32) {
        tooMany = true;
        break;
      }
      for (let x = a.x; x <= b.x; x++)
        for (let y = a.y; y <= b.y; y++) {
          const tile = { z, x, y };
          tiles.set(tileKey(tile), tile);
        }
    }
    if (!tooMany && tiles.size <= 32) return [...tiles.values()];
  }
  return [{ z: 0, x: 0, y: 0 }];
}
// Partition once per snapshot/zoom on the server; each response contains all
// markers in that geographic tile. Keep only three zoom indexes in memory.
export class MapTileIndex {
  private levels = new Map<number, Map<string, CompactMapMarker[]>>();
  constructor(private snapshot: MapMarkerSnapshot) {}
  read(tile: MapTile): MapMarkerSnapshot {
    let level = this.levels.get(tile.z);
    if (!level) {
      level = new Map();
      for (const marker of this.snapshot.markers) {
        const key = tileKey(markerTile(marker[1], marker[2], tile.z));
        const bucket = level.get(key) || [];
        bucket.push(marker);
        level.set(key, bucket);
      }
      this.levels.set(tile.z, level);
      if (this.levels.size > 3)
        this.levels.delete(this.levels.keys().next().value!);
    }
    const markers = level.get(tileKey(tile)) || [];
    return {
      version: 1,
      generatedAt: this.snapshot.generatedAt,
      count: markers.length,
      markers,
    };
  }
}
// One loader per mounted map. Completed tiles (including empty ones) and markers
// survive panning/zooming. A coarse loaded tile covers all its descendants.
export class MapTileLoader {
  private loaded = new Set<string>();
  private markers = new Map<string, CompactMapMarker>();
  values() {
    return [...this.markers.values()];
  }
  private covered(tile: MapTile) {
    for (let z = tile.z; z >= 0; z--) {
      const scale = 2 ** (tile.z - z);
      if (
        this.loaded.has(
          tileKey({
            z,
            x: Math.floor(tile.x / scale),
            y: Math.floor(tile.y / scale),
          }),
        )
      )
        return true;
    }
    return false;
  }
  async load(
    bounds: MapBounds,
    zoom: number,
    signal: AbortSignal,
    request: typeof fetch = fetch,
  ) {
    const queue = tilesForBounds(bounds, zoom).filter(
      (tile) => !this.covered(tile),
    );
    let failed = false,
      added = false;
    await Promise.all(
      Array.from({ length: Math.min(4, queue.length) }, async () => {
        while (queue.length && !signal.aborted) {
          const tile = queue.shift()!;
          try {
            const response = await request(`/api/map/tiles/${tileKey(tile)}`, {
              signal,
            });
            if (!response.ok) throw new Error("Map area unavailable");
            const data = mapSnapshotSchema.parse(await response.json());
            signal.throwIfAborted();
            for (const marker of data.markers) {
              const old = this.markers.get(marker[0]);
              if (!old || old.some((value, i) => value !== marker[i]))
                added = true;
              this.markers.set(marker[0], marker);
            }
            this.loaded.add(tileKey(tile));
          } catch {
            failed = true;
          }
        }
      }),
    );
    return { failed, added };
  }
}
