import { beforeAll, afterAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  suiteOwner,
  suiteOther,
  suiteVenue,
  suiteVenueTwo,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite;
const retained = "91000000-0000-4000-8000-000000000001",
  kept = "91000000-0000-4000-8000-000000000002",
  fresh = "91000000-0000-4000-8000-000000000003",
  hash = "a".repeat(64);
async function as(user: string, sql: string, role = "authenticated") {
  await db.exec(
    `set role ${role};select set_config('test.uid','${user}',false)`,
  );
  try {
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec("reset role");
  }
}
const media = (id: string, name: string, venue = suiteVenue) =>
  `insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes,alt_es,sort_order) values('${id}','${venue}','${venue}/${name}.png','image/png',100,'Asset',0)`;
const place = (id = retained, key = "retained-event") =>
  `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenueTwo}','${id}','event_banner','${key}')`;
async function object(name: string) {
  await as(
    suiteOwner,
    `insert into storage.objects(bucket_id,name,metadata) values('event-media','${suiteVenue}/${name}.png','{"size":100,"mimetype":"image/png"}')`,
  );
}
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(
    "alter table storage.objects add column user_metadata jsonb;grant usage on schema storage to service_role;grant all on storage.objects to service_role",
  );
  for (const file of [
    "20261020170415_listing_entitlement_limits.sql",
    "20261020173552_enforced_listing_uploads.sql",
    "20261020233027_standalone_listing_premium_library.sql",
  ])
    await db.exec(readFileSync(`database/migrations/${file}`, "utf8"));
  await db.exec(`grant select,insert,update,delete on venue_media,venue_media_placements to authenticated;
 alter table venue_media enable row level security;alter table venue_media_placements enable row level security;
 create policy fixture_media_owner on venue_media to authenticated using(is_venue_member(venue_id)) with check(is_venue_member(venue_id));
 create policy fixture_placement_owner on venue_media_placements to authenticated using(is_venue_member(venue_id)) with check(is_venue_member(venue_id));
 update akisuite_listing_private.launch_settings set enabled=true,library_enabled=true;
 insert into billing_subscriptions values('${suiteOwner}','business','active','2040-01-01');`);
  await object("original");
  await object("kept");
  await as(suiteOwner, media(retained, "original"));
  await as(suiteOwner, media(kept, "kept"));
  await as(suiteOwner, place());
  await as(suiteOwner, place(kept, "kept-event"));
  await db.exec("delete from billing_subscriptions");
  // Demonstrate exact owner/RLS bypass before applying the forward guard.
  await as(
    suiteOwner,
    `delete from venue_media_placements where media_id='${retained}'`,
  );
  await as(suiteOwner, `delete from venue_media where id='${retained}'`);
  await object("replacement");
  await as(suiteOwner, media(retained, "replacement"));
  await as(suiteOwner, place());
  expect(
    (
      await as(
        suiteOwner,
        `select m.storage_path from venue_media m join venue_media_placements p on p.media_id=m.id where p.venue_id='${suiteVenueTwo}' and p.media_id='${retained}'`,
      )
    ).rows,
  ).toEqual([{ storage_path: `${suiteVenue}/replacement.png` }]);
  await as(
    suiteOwner,
    `delete from venue_media_placements where media_id='${retained}'`,
  );
  await as(suiteOwner, `delete from venue_media where id='${retained}'`);
  await db.exec(
    readFileSync(
      "database/migrations/20261021003500_prevent_retained_media_identity_reuse.sql",
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => db?.close());
it("rejects deleted retained UUID resurrection and upsert while leaving the tombstone intact", async () => {
  await expect(as(suiteOwner, media(retained, "replacement"))).rejects.toThrow(
    /identity cannot be recreated/,
  );
  await expect(
    as(
      suiteOwner,
      media(retained, "replacement") +
        " on conflict(id) do update set alt_es=excluded.alt_es",
    ),
  ).rejects.toThrow(/identity cannot be recreated/);
  expect(
    (
      await db.query(
        `select count(*)::int n from akisuite_listing_private.retained_media_reuse where media_id='${retained}'`,
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
});
it("rejects primary-key substitution to retained or fresh IDs and preserves legitimate metadata edits", async () => {
  await object("fresh");
  await as(suiteOwner, media(fresh, "fresh"));
  for (const id of [retained, "91000000-0000-4000-8000-000000000004"])
    await expect(
      as(suiteOwner, `update venue_media set id='${id}' where id='${fresh}'`),
    ).rejects.toThrow(/identity is immutable/);
  await as(
    suiteOwner,
    `update venue_media set alt_es='Legitimate caption' where id='${fresh}'`,
  );
  expect(
    (await as(suiteOwner, `select alt_es from venue_media where id='${fresh}'`))
      .rows,
  ).toEqual([{ alt_es: "Legitimate caption" }]);
});
it("preserves exact retained existing-asset reuse after downgrade but denies new placement targets and foreign owners", async () => {
  await as(
    suiteOwner,
    `delete from venue_media_placements where media_id='${kept}'`,
  );
  await as(suiteOwner, place(kept, "kept-event"));
  await expect(as(suiteOwner, place(kept, "new-free-event"))).rejects.toThrow(
    /Premium required/,
  );
  await expect(as(suiteOther, media(retained, "replacement"))).rejects.toThrow(
    /venue access required/i,
  );
  expect(
    (
      await as(
        suiteOwner,
        `select storage_path from venue_media where id='${kept}'`,
      )
    ).rows,
  ).toEqual([{ storage_path: `${suiteVenue}/kept.png` }]);
});
it("strict Storage rejects direct owner byte overwrite/INSERT, and a valid new receipt cannot resurrect retained UUID", async () => {
  await db.exec(
    "update akisuite_listing_private.launch_settings set uploads_enforced=true",
  );
  expect(
    (
      await as(
        suiteOwner,
        `update storage.objects set metadata='{"size":999}' where bucket_id='event-media' and name='${suiteVenue}/kept.png' returning name`,
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await db.query(
        `select metadata->>'size' size from storage.objects where bucket_id='event-media' and name='${suiteVenue}/kept.png'`,
      )
    ).rows,
  ).toEqual([{ size: "100" }]);
  await expect(
    as(
      suiteOwner,
      `insert into storage.objects(bucket_id,name,metadata) values('event-media','${suiteVenue}/overwrite.png','{"size":100}')`,
    ),
  ).rejects.toThrow(/row-level security/);
  const receipt = (
    await as(
      suiteOwner,
      `select reserve_listing_upload('${suiteVenue}','${hash}','image/png',100,1,1,null) receipt`,
    )
  ).rows[0].receipt as { id: string; path: string };
  await as(
    suiteOwner,
    `insert into storage.objects(bucket_id,name,metadata,user_metadata) values('event-media','${receipt.path}','{"size":100,"mimetype":"image/png"}','{"listing_upload_id":"${receipt.id}","sha256":"${hash}"}')`,
    "service_role",
  );
  await as(
    suiteOwner,
    `select complete_listing_upload('${receipt.id}','${hash}')`,
    "service_role",
  );
  await expect(
    as(
      suiteOwner,
      `insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('${retained}','${suiteVenue}','${receipt.path}','image/png',100)`,
    ),
  ).rejects.toThrow(/identity cannot be recreated/);
  expect(
    (
      await db.query(
        `select state from akisuite_listing_private.upload_reservations where id='${receipt.id}'`,
      )
    ).rows,
  ).toEqual([{ state: "uploaded" }]);
  await expect(
    as(
      suiteOwner,
      "select * from akisuite_listing_private.retained_media_reuse",
    ),
  ).rejects.toThrow(/permission denied/);
});
