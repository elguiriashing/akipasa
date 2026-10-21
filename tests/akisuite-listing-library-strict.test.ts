import { beforeAll, afterAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  suiteOwner,
  suiteVenue,
  suiteVenueTwo,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite;
const hash = "b".repeat(64),
  media = "93000000-0000-4000-8000-000000000001";
async function as(sql: string, role = "authenticated") {
  await db.exec(
    `set role ${role};select set_config('test.uid','${suiteOwner}',false)`,
  );
  try {
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec("reset role");
  }
}
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(
    "alter table storage.objects add column user_metadata jsonb;grant usage on schema storage to service_role;grant all on storage.objects to service_role;grant select,insert,update,delete on venue_media,venue_media_placements to authenticated",
  );
  for (const file of [
    "20261020170415_listing_entitlement_limits.sql",
    "20261020173552_enforced_listing_uploads.sql",
    "20261020233027_standalone_listing_premium_library.sql",
    "20261021003500_prevent_retained_media_identity_reuse.sql",
    "20261021004500_library_requires_verified_uploads.sql",
  ])
    await db.exec(readFileSync(`database/migrations/${file}`, "utf8"));
}, 30000);
afterAll(async () => db?.close());
it("rejects library activation with legacy byte overwrites and preserves default-off state", async () => {
  await expect(
    db.exec(
      "update akisuite_listing_private.launch_settings set enabled=true,library_enabled=true",
    ),
  ).rejects.toThrow(/listing_library_requires_verified_uploads/);
  expect(
    (
      await db.query(
        "select enabled,library_enabled,uploads_enforced from akisuite_listing_private.launch_settings",
      )
    ).rows,
  ).toEqual([
    { enabled: false, library_enabled: false, uploads_enforced: false },
  ]);
  await db.exec(
    "update akisuite_listing_private.launch_settings set enabled=true,uploads_enforced=true,library_enabled=true",
  );
});
it("permits actual authenticated receipt flow under all active guards and denies direct owner overwrite", async () => {
  await db.exec(
    `insert into billing_subscriptions values('${suiteOwner}','business','active','2040-01-01')`,
  );
  const r = (
    await as(
      `select reserve_listing_upload('${suiteVenue}','${hash}','image/png',100,1,1,null) receipt`,
    )
  ).rows[0].receipt as { id: string; path: string };
  await as(
    `insert into storage.objects(bucket_id,name,metadata,user_metadata) values('event-media','${r.path}','{"size":100,"mimetype":"image/png"}','{"listing_upload_id":"${r.id}","sha256":"${hash}"}')`,
    "service_role",
  );
  await as(
    `select complete_listing_upload('${r.id}','${hash}')`,
    "service_role",
  );
  await as(
    `insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('${media}','${suiteVenue}','${r.path}','image/png',100)`,
  );
  await as(
    `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenueTwo}','${media}','event_banner','strict-library-event')`,
  );
  expect(
    (
      await as(
        `update storage.objects set metadata='{"size":999}' where name='${r.path}' returning name`,
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await db.query(
        `select state from akisuite_listing_private.upload_reservations where id='${r.id}'`,
      )
    ).rows,
  ).toEqual([{ state: "committed" }]);
});
it("rejects disabling strict byte controls while the library is active and supports atomic safe deactivation", async () => {
  await expect(
    db.exec(
      "update akisuite_listing_private.launch_settings set uploads_enforced=false",
    ),
  ).rejects.toThrow(/listing_library_requires_verified_uploads/);
  expect(
    (
      await db.query(
        "select library_enabled,uploads_enforced from akisuite_listing_private.launch_settings",
      )
    ).rows,
  ).toEqual([{ library_enabled: true, uploads_enforced: true }]);
  await db.exec(
    "update akisuite_listing_private.launch_settings set library_enabled=false,uploads_enforced=false",
  );
  expect((await db.query("select id from venue_media")).rows).toEqual([
    { id: media },
  ]);
});
