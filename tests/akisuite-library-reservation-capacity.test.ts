import { afterAll, beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  suiteOwner,
  suiteVenue,
  suiteVenueTwo,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite;
const image = "af000000-0000-4000-8000-000000000001";
async function as(sql: string) {
  await db.exec(
    `set role authenticated;select set_config('test.uid','${suiteOwner}',false)`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
const place = (target: string) =>
  as(
    `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenue}','${image}','venue_gallery','${target}')`,
  );
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(
    "alter table storage.objects add column user_metadata jsonb;grant select,insert,update,delete on venue_media_placements to authenticated;alter table venue_media_placements enable row level security;create policy fixture_member on venue_media_placements to authenticated using(is_venue_member(venue_id)) with check(is_venue_member(venue_id))",
  );
  for (const f of [
    "20261020170415_listing_entitlement_limits.sql",
    "20261020173552_enforced_listing_uploads.sql",
    "20261020233027_standalone_listing_premium_library.sql",
    "20261021003500_prevent_retained_media_identity_reuse.sql",
    "20261021004500_library_requires_verified_uploads.sql",
    "20261021181500_listing_quota_scope_serialization.sql",
    "20261021190000_baseline_media_quota_integrity.sql",
  ])
    await db.exec(readFileSync(`database/migrations/${f}`, "utf8"));
  await db.exec(
    `insert into storage.objects values('event-media','${suiteVenueTwo}/shared.png','{"size":100}',null);insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('${image}','${suiteVenueTwo}','${suiteVenueTwo}/shared.png','image/png',100);insert into akisuite_listing_private.retained_media_reuse values('${suiteVenue}','${image}','venue_gallery','retained'),('${suiteVenue}','${image}','venue_gallery','duplicate');update akisuite_listing_private.launch_settings set enabled=true,uploads_enforced=true`,
  );
  for (let n = 0; n < 8; n++)
    await as(
      `select reserve_listing_upload('${suiteVenue}','${"b".repeat(64)}','image/png',100,1,1,null)`,
    );
  await db.exec(
    "update akisuite_listing_private.launch_settings set library_enabled=true",
  );
}, 30000);
afterAll(async () => db?.close());
it("reproduces retained free reuse exceeding eight pending uploads before the forward fix", async () => {
  await place("retained");
  expect(
    (
      await db.query(
        `select photos from akisuite_listing_private.media_usage('${suiteVenue}',null)`,
      )
    ).rows,
  ).toEqual([{ photos: 9 }]);
  await as(`delete from venue_media_placements where venue_id='${suiteVenue}'`);
  const meta =
    "select oid,proowner,proacl::text,proconfig,prosecdef,provolatile from pg_proc where oid='akisuite_listing_private.guard_library_placement()'::regprocedure";
  const before = (await db.query(meta)).rows;
  await db.exec(
    readFileSync(
      "database/migrations/20261021193000_library_reservation_capacity.sql",
      "utf8",
    ),
  );
  expect((await db.query(meta)).rows).toEqual(before);
});
it("rejects free historical reuse when pending reservations exhaust capacity without deleting its history", async () => {
  await expect(place("retained")).rejects.toThrow(/allowance exceeded/i);
  expect(
    (
      await db.query(
        "select count(*)::int n from akisuite_listing_private.upload_reservations",
      )
    ).rows,
  ).toEqual([{ n: 8 }]);
  expect(
    (
      await db.query(
        "select count(*)::int n from akisuite_listing_private.retained_media_reuse",
      )
    ).rows,
  ).toEqual([{ n: 2 }]);
});
it("allows the eighth path and repeated placements of its already-counted image", async () => {
  await db.exec(
    `delete from akisuite_listing_private.upload_reservations where id=(select id from akisuite_listing_private.upload_reservations limit 1)`,
  );
  await place("retained");
  await place("duplicate");
  expect(
    (
      await db.query(
        `select photos from akisuite_listing_private.media_usage('${suiteVenue}',null)`,
      )
    ).rows,
  ).toEqual([{ photos: 8 }]);
  expect(
    (
      await db.query(
        `select count(*)::int n from venue_media_placements where venue_id='${suiteVenue}'`,
      )
    ).rows,
  ).toEqual([{ n: 2 }]);
});
it("blocks a Premium 251st path when 250 uploads are pending and leaves the monetary configuration unchanged", async () => {
  await as(`delete from venue_media_placements where venue_id='${suiteVenue}'`);
  await db.exec(
    `delete from akisuite_listing_private.upload_reservations;insert into billing_subscriptions values('${suiteOwner}','business','active','2040-01-01');insert into akisuite_listing_private.upload_reservations(venue_id,actor,storage_path,digest,mime_type,size_bytes,width,height) select '${suiteVenue}','${suiteOwner}','${suiteVenue}/'||g||'.png','${"c".repeat(64)}','image/png',100,1,1 from generate_series(1,250)g`,
  );
  await expect(place("premium")).rejects.toThrow(/allowance exceeded/i);
  expect(
    (
      await db.query(
        `select photos from akisuite_listing_private.media_usage('${suiteVenue}',null)`,
      )
    ).rows,
  ).toEqual([{ photos: 250 }]);
});
it("requires byte capacity even below the Premium photo count and never exposes its private helper", async () => {
  await db.exec(
    `delete from akisuite_listing_private.upload_reservations;insert into akisuite_listing_private.upload_reservations(venue_id,actor,storage_path,digest,mime_type,size_bytes,width,height) select '${suiteVenue}','${suiteOwner}','${suiteVenue}/'||g||'.png','${"d".repeat(64)}','image/png',10485760,1,1 from generate_series(1,103)g`,
  );
  await expect(place("premium")).rejects.toThrow(/allowance exceeded/i);
  expect(
    (
      await db.query(
        `select has_function_privilege('authenticated','akisuite_listing_private.check_placement_capacity(uuid,uuid)','EXECUTE') auth,has_function_privilege('anon','akisuite_listing_private.check_placement_capacity(uuid,uuid)','EXECUTE') anon,has_function_privilege('service_role','akisuite_listing_private.check_placement_capacity(uuid,uuid)','EXECUTE') service`,
      )
    ).rows,
  ).toEqual([{ auth: false, anon: false, service: false }]);
});
