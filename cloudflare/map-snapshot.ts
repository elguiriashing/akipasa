import {
  MapSnapshotCache,
  type CachedMapSnapshot,
} from "../src/lib/map-snapshot-cache";
import { mapSnapshotSchema } from "../src/lib/map-snapshot";

// Structural interfaces keep Next's typecheck independent of generated bindings.
interface SnapshotState {
  storage: {
    sql: {
      exec<T extends Record<string, unknown> = Record<string, unknown>>(
        query: string,
        ...params: (string | number)[]
      ): { toArray(): T[] };
    };
    transactionSync<T>(callback: () => T): T;
  };
  waitUntil(work: Promise<unknown>): void;
}
export type SnapshotEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
};

export class MapSnapshot {
  private cache: MapSnapshotCache;
  constructor(
    private state: SnapshotState,
    env: SnapshotEnvironment,
  ) {
    const sql = state.storage.sql;
    sql.exec(
      "CREATE TABLE IF NOT EXISTS snapshot_chunks (part INTEGER PRIMARY KEY, body TEXT NOT NULL)",
    );
    sql.exec(
      "CREATE TABLE IF NOT EXISTS snapshot_meta (id INTEGER PRIMARY KEY, created_at INTEGER NOT NULL, etag TEXT NOT NULL)",
    );
    this.cache = new MapSnapshotCache(
      {
        load() {
          const meta = sql
            .exec<{
              created_at: number;
              etag: string;
            }>("SELECT created_at, etag FROM snapshot_meta WHERE id=1")
            .toArray()[0];
          if (!meta) return undefined;
          const body = sql
            .exec<{ body: string }>(
              "SELECT body FROM snapshot_chunks ORDER BY part",
            )
            .toArray()
            .map((row) => row.body)
            .join("");
          return { body, createdAt: meta.created_at, etag: meta.etag };
        },
        save(snapshot) {
          state.storage.transactionSync(() => {
            sql.exec("DELETE FROM snapshot_chunks");
            // Keep each SQLite row well below its value/row size limits.
            for (
              let offset = 0;
              offset < snapshot.body.length;
              offset += 60_000
            )
              sql.exec(
                "INSERT INTO snapshot_chunks(part,body) VALUES (?,?)",
                offset / 60_000,
                snapshot.body.slice(offset, offset + 60_000),
              );
            sql.exec(
              "INSERT OR REPLACE INTO snapshot_meta(id,created_at,etag) VALUES (1,?,?)",
              snapshot.createdAt,
              snapshot.etag,
            );
          });
        },
      },
      async (): Promise<CachedMapSnapshot> => {
        const response = await fetch(
          `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/public_map_marker_snapshot`,
          {
            method: "POST",
            headers: {
              apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
              "Content-Type": "application/json",
            },
            body: "{}",
            signal: AbortSignal.timeout(25_000),
          },
        );
        if (!response.ok)
          throw new Error("Map snapshot database request failed");
        const snapshot = mapSnapshotSchema.parse(await response.json());
        const body = JSON.stringify(snapshot);
        const hash = await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(body),
        );
        const etag =
          '"' +
          Array.from(new Uint8Array(hash), (byte) =>
            byte.toString(16).padStart(2, "0"),
          ).join("") +
          '"';
        console.info(
          JSON.stringify({
            event: "map_snapshot_built",
            count: snapshot.count,
            bytes: body.length,
          }),
        );
        return { body, etag, createdAt: Date.now() };
      },
    );
  }
  async fetch() {
    try {
      const snapshot = await this.cache.read((work) =>
        this.state.waitUntil(work),
      );
      return new Response(snapshot.body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=60, s-maxage=300",
          ETag: snapshot.etag,
          "X-Map-Snapshot-Created": new Date(snapshot.createdAt).toISOString(),
        },
      });
    } catch {
      return Response.json(
        { error: "Map temporarily unavailable" },
        {
          status: 503,
          headers: { "Cache-Control": "no-store", "Retry-After": "60" },
        },
      );
    }
  }
}
