import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  grantPremium,
  suiteVenue,
  suiteVenueTwo,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite;
let n = 10;
async function event(start: string, end: string, venue = suiteVenue) {
  const id = `30000000-0000-4000-8000-${String(n++).padStart(12, "0")}`;
  await db.query(
    "insert into events(id,venue_id,slug,title_es,status) values($1,$2,$3,'Festival','draft')",
    [id, venue, id],
  );
  await db.query(
    "insert into event_occurrences values($1,$2,$3,$4,'scheduled',null,null)",
    [id, id, start, end],
  );
  await db.query("update events set status='published' where id=$1", [id]);
  return id;
}
beforeAll(async () => {
  db = await premiumDatabase();
  await db.exec(
    readFileSync(
      "database/migrations/20261020170415_listing_entitlement_limits.sql",
      "utf8",
    ),
  );
  await db.exec(
    "update akisuite_private.launch_settings set enabled=true; update akisuite_listing_private.launch_settings set enabled=true",
  );
}, 30000);
afterAll(async () => {
  await db?.close();
});
describe("database listing limits", () => {
  it("counts Europe/Madrid dates and retains drafts when publication fails", async () => {
    await expect(
      event("2030-01-01T23:30Z", "2030-01-06T00:30Z"),
    ).resolves.toBeTruthy();
    await expect(
      event("2030-02-01T00:00Z", "2030-02-06T00:00Z"),
    ).rejects.toThrow("five calendar days");
  });
  it("counts spanning events in both months and deletion does not restore allowance", async () => {
    const first = await event("2030-03-31T18:00Z", "2030-04-01T18:00Z");
    for (let i = 0; i < 3; i++)
      await event(
        `2030-04-${String(10 + i).padStart(2, "0")}T10:00Z`,
        `2030-04-${String(10 + i).padStart(2, "0")}T12:00Z`,
      );
    await db.query("delete from event_occurrences where event_id=$1", [first]);
    await db.query("delete from events where id=$1", [first]);
    await expect(
      event("2030-04-20T10:00Z", "2030-04-20T12:00Z"),
    ).rejects.toThrow("four distinct events");
    await expect(
      event("2030-05-01T10:00Z", "2030-05-01T12:00Z"),
    ).resolves.toBeTruthy();
  });
  it("blocks direct occurrence edits exceeding duration and preserves data", async () => {
    const id = await event("2030-06-01T10:00Z", "2030-06-01T12:00Z");
    await expect(
      db.query(
        "update event_occurrences set ends_at='2030-06-08T12:00Z' where event_id=$1",
        [id],
      ),
    ).rejects.toThrow("five calendar days");
    expect(
      (
        await db.query("select * from event_occurrences where event_id=$1", [
          id,
        ])
      ).rows,
    ).toHaveLength(1);
  });
  it("limits media to eight per listing, not a shared workspace", async () => {
    for (let i = 0; i < 8; i++) {
      const id = `50000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`;
      const path = `${suiteVenue}/${i}.jpg`;
      await db.query(
        "insert into storage.objects values('event-media',$1,'{\"size\":1000}')",
        [path],
      );
      await db.query(
        "insert into venue_media(id,venue_id,storage_path) values($1,$2,$3)",
        [id, suiteVenue, path],
      );
    }
    expect(
      (
        await db.query(
          "select public.akisuite_listing_storage_upload_allowed($1) as allowed",
          [`${suiteVenue}/new.jpg`],
        )
      ).rows[0],
    ).toEqual({ allowed: false });
    expect(
      (
        await db.query(
          "select public.akisuite_listing_storage_upload_allowed($1) as allowed",
          [`${suiteVenueTwo}/new.jpg`],
        )
      ).rows[0],
    ).toEqual({ allowed: true });
  });
  it("keeps quota history inaccessible to browser roles", async () => {
    await db.exec("set role authenticated");
    await expect(
      db.exec("delete from akisuite_listing_private.listing_event_months"),
    ).rejects.toThrow();
    await db.exec("reset role");
  });
  it("caps Premium storage at 250 objects", async () => {
    await grantPremium(db, "akibusiness_premium");
    await db.exec(`insert into storage.objects(bucket_id,name,metadata)
      select 'event-media','${suiteVenueTwo}/'||i||'.jpg','{"size":1000}'::jsonb from generate_series(1,250) i`);
    expect(
      (
        await db.query(
          "select public.akisuite_listing_storage_upload_allowed($1) as allowed",
          [`${suiteVenueTwo}/251.jpg`],
        )
      ).rows[0],
    ).toEqual({ allowed: false });
  });
  it("supports Premium duration, legacy recurrence protection and downgrade retention", async () => {
    await grantPremium(db, "akibusiness_premium");
    const id = await event("2030-07-01T10:00Z", "2030-07-20T12:00Z");
    await db.exec("select set_config('test.uid','',false)");
    await expect(
      event("2030-09-01T10:00Z", "2030-09-20T12:00Z"),
    ).resolves.toBeTruthy();
    await db.exec(
      "select set_config('test.uid','10000000-0000-4000-8000-000000000001',false)",
    );
    await db.exec(
      "update public.akisuite_billing_subscriptions set status='canceled'",
    );
    expect(
      (await db.query("select * from events where id=$1", [id])).rows,
    ).toHaveLength(1);
    await expect(
      db.query(
        "update events set title_es='Updated retained title',status='published' where id=$1",
        [id],
      ),
    ).resolves.toBeTruthy();
    await expect(
      db.query(
        "update event_occurrences set status='cancelled' where event_id=$1",
        [id],
      ),
    ).resolves.toBeTruthy();
    await expect(
      db.query(
        "select public.set_owned_event_recurrence($1,'2030-08-01','2030-08-02','weekly',1,2)",
        [id],
      ),
    ).rejects.toThrow("Premium required");
    await expect(
      db.query("select public.duplicate_owned_event($1,'new-copy')", [id]),
    ).rejects.toThrow("Premium required");
  });
});

it("installs standalone on the legacy live schema without old suite migrations", async () => {
  const legacy = await premiumDatabase(false);
  try {
    await legacy.exec(
      readFileSync(
        "database/migrations/20261020170415_listing_entitlement_limits.sql",
        "utf8",
      ),
    );
    expect(
      (
        await legacy.query(
          `select public.listing_limits_info('${suiteVenue}') as info`,
        )
      ).rows[0],
    ).toMatchObject({ info: { enabled: false, premium: false, photos: 8 } });
    await legacy.exec(
      `insert into billing_subscriptions values('10000000-0000-4000-8000-000000000001','business','active','2040-01-01'); update akisuite_listing_private.launch_settings set enabled=true;`,
    );
    expect(
      (
        await legacy.query(
          `select public.listing_limits_info('${suiteVenue}') as info`,
        )
      ).rows[0],
    ).toMatchObject({ info: { enabled: true, premium: true, photos: 250 } });
    await legacy.exec("set role authenticated");
    await expect(
      legacy.query("select * from public.listing_event_review_queue()"),
    ).rejects.toThrow("Administrator required");
    await legacy.exec(
      "reset role; update profiles set app_role='administrator' where id='10000000-0000-4000-8000-000000000001'",
    );
    expect(
      (await legacy.query("select * from public.listing_event_review_queue()"))
        .rows,
    ).toEqual([]);
  } finally {
    await legacy.close();
  }
}, 30000);
