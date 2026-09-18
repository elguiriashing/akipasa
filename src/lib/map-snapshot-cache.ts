export const SNAPSHOT_FRESH_MS = 15 * 60_000;
export const SNAPSHOT_MAX_AGE_MS = 60 * 60_000;
export const SNAPSHOT_RETRY_MS = 60_000;
export type CachedMapSnapshot = {
  body: string;
  createdAt: number;
  etag: string;
};
export type SnapshotStore = {
  load(): CachedMapSnapshot | undefined;
  save(snapshot: CachedMapSnapshot): void;
};

// One instance lives inside one globally named Durable Object. Sharing a promise
// alone in a normal Worker would only coalesce requests inside that isolate.
export class MapSnapshotCache {
  private current: CachedMapSnapshot | undefined;
  private pending: Promise<CachedMapSnapshot> | undefined;
  private retryAt = 0;

  constructor(
    private store: SnapshotStore,
    private build: () => Promise<CachedMapSnapshot>,
    private now: () => number = Date.now,
  ) {
    this.current = store.load();
  }

  async read(
    waitUntil: (work: Promise<unknown>) => void,
  ): Promise<CachedMapSnapshot> {
    const current = this.current;
    const age = current ? this.now() - current.createdAt : Infinity;
    if (current && age < SNAPSHOT_FRESH_MS) return current;
    if (this.now() < this.retryAt) {
      if (current && age < SNAPSHOT_MAX_AGE_MS) return current;
      throw new Error("Map snapshot temporarily unavailable");
    }
    if (!this.pending) {
      this.pending = this.build()
        .then((snapshot) => {
          // Persist the complete result atomically before making it visible.
          this.store.save(snapshot);
          this.current = snapshot;
          this.retryAt = 0;
          return snapshot;
        })
        .catch((error: unknown) => {
          this.retryAt = this.now() + SNAPSHOT_RETRY_MS;
          throw error;
        })
        .finally(() => {
          this.pending = undefined;
        });
    }
    if (current && age < SNAPSHOT_MAX_AGE_MS) {
      waitUntil(this.pending.catch(() => undefined));
      return current;
    }
    return this.pending;
  }
}
