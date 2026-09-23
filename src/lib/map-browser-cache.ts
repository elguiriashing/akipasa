import { mapSnapshotSchema, type MapMarkerSnapshot } from "./map-snapshot";

export const MAP_CACHE_FRESH_MS = 5 * 60_000;
export const MAP_CACHE_MAX_AGE_MS = 24 * 60 * 60_000;
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_TILES = 256;
export type CachedMapTile = { data: MapMarkerSnapshot; savedAt: number };
export interface MapTileCache {
  read(key: string): Promise<CachedMapTile | null>;
  write(key: string, value: CachedMapTile): Promise<void>;
}

// Public compact markers only. Storage denial, eviction, quota and blocked upgrades
// must never prevent loading the map from the network.
export class BrowserMapTileCache implements MapTileCache {
  private connection?: Promise<IDBDatabase | null>;
  private open() {
    return (this.connection ??= new Promise<IDBDatabase | null>((resolve) => {
      if (typeof indexedDB === "undefined") return resolve(null);
      let finished = false;
      const finish = (db: IDBDatabase | null) => {
        if (finished) {
          db?.close();
          return;
        }
        finished = true;
        clearTimeout(timer);
        resolve(db);
      };
      const timer = setTimeout(() => finish(null), 300);
      try {
        const request = indexedDB.open("akipasa-map-tiles-v2", 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore("tiles", {
            keyPath: "key",
          });
          const metadata = request.result.createObjectStore("metadata", {
            keyPath: "key",
          });
          metadata.createIndex("savedAt", "savedAt");
        };
        request.onsuccess = () => {
          request.result.onversionchange = () => request.result.close();
          finish(request.result);
        };
        request.onerror = () => finish(null);
        request.onblocked = () => finish(null);
      } catch {
        finish(null);
      }
    }));
  }
  async read(key: string): Promise<CachedMapTile | null> {
    const db = await this.open();
    if (!db) return null;
    return new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 300);
      const finish = (value: CachedMapTile | null) => {
        clearTimeout(timer);
        resolve(value);
      };
      try {
        const request = db.transaction("tiles").objectStore("tiles").get(key);
        request.onerror = () => finish(null);
        request.onsuccess = () => {
          const entry = request.result;
          const age = Date.now() - entry?.savedAt;
          if (!Number.isFinite(age) || age < 0 || age > MAP_CACHE_MAX_AGE_MS)
            return finish(null);
          const data = mapSnapshotSchema.safeParse(entry.data);
          finish(
            data.success ? { data: data.data, savedAt: entry.savedAt } : null,
          );
        };
      } catch {
        finish(null);
      }
    });
  }
  async write(key: string, value: CachedMapTile): Promise<void> {
    const db = await this.open();
    if (!db) return;
    const bytes = JSON.stringify(value).length * 2;
    if (bytes > MAX_BYTES) return;
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(["tiles", "metadata"], "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
        tx.onabort = () => resolve();
        const store = tx.objectStore("tiles");
        store.put({ key, ...value, bytes });
        const metadata = tx.objectStore("metadata");
        metadata.put({ key, savedAt: value.savedAt, bytes });
        // Newest entries first: bound both total payload and number of records.
        let size = 0,
          count = 0;
        const cursor = metadata.index("savedAt").openCursor(null, "prev");
        cursor.onsuccess = () => {
          const row = cursor.result;
          if (!row) return;
          size += row.value.bytes;
          count++;
          if (
            size > MAX_BYTES ||
            count > MAX_TILES ||
            Date.now() - row.value.savedAt > MAP_CACHE_MAX_AGE_MS
          ) {
            store.delete(row.primaryKey);
            row.delete();
          }
          row.continue();
        };
      } catch {
        resolve();
      }
    });
  }
}
