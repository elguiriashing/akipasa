import { afterAll, beforeAll, expect, it } from "vitest";
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
const migration =
  "database/migrations/20261021190000_baseline_media_quota_integrity.sql";
const image = (n: number) =>
  `ae000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
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
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(
    "alter table storage.objects add column user_metadata jsonb;grant select,insert,update,delete on venue_media,venue_media_placements to authenticated;alter table venue_media_placements enable row level security;create policy target_member on venue_media_placements to authenticated using(is_venue_member(venue_id)) with check(is_venue_member(venue_id));",
  );
  for (const f of [
    "20261020170415_listing_entitlement_limits.sql",
    "20261020173552_enforced_listing_uploads.sql",
    "20261020233027_standalone_listing_premium_library.sql",
    "20261021003500_prevent_retained_media_identity_reuse.sql",
    "20261021004500_library_requires_verified_uploads.sql",
    "20261021181500_listing_quota_scope_serialization.sql",
  ])
    await db.exec(readFileSync(`database/migrations/${f}`, "utf8"));
  await db.exec(
    `update venue_members set profile_id='${suiteOther}' where venue_id='${suiteVenueTwo}';update venues set discovery_vertical='accommodation' where id='${suiteVenue}';`,
  );
  for (let n = 1; n <= 9; n++)
    await db.exec(
      `insert into storage.objects values('event-media','${suiteVenueTwo}/${n}.png','{"size":100}',null);insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('${image(n)}','${suiteVenueTwo}','${suiteVenueTwo}/${n}.png','image/png',100)`,
    );
  await db.exec(
    "update akisuite_listing_private.launch_settings set enabled=true",
  );
}, 30000);
afterAll(async () => db?.close());
it("reproduces nine foreign public assets through legitimate target-member permission while enhanced library is disabled", async () => {
  for (let n = 1; n <= 9; n++)
    await as(
      `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenue}','${image(n)}','venue_gallery','stay_header')`,
    );
  expect(
    (
      await db.query(
        `select count(*)::int n from venue_media_placements where venue_id='${suiteVenue}'`,
      )
    ).rows,
  ).toEqual([{ n: 9 }]);
  expect(
    (
      await db.query(
        `select count(*)::int n from venue_media where venue_id='${suiteVenue}'`,
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  const meta =
    "select oid,proowner,proacl::text,proconfig,prosecdef,provolatile from pg_proc where oid in('public.reserve_listing_upload(uuid,text,text,integer,integer,integer,uuid)'::regprocedure,'public.akisuite_listing_storage_upload_allowed(text)'::regprocedure,'akisuite_listing_private.guard_media_quota()'::regprocedure) order by oid";
  const before = (await db.query(meta)).rows;
  await db.exec(readFileSync(migration, "utf8"));
  expect((await db.query(meta)).rows).toEqual(before);
  expect(
    (
      await db.query(
        "select enabled,uploads_enforced,library_enabled from akisuite_listing_private.launch_settings",
      )
    ).rows,
  ).toEqual([
    { enabled: true, uploads_enforced: false, library_enabled: false },
  ]);
});
it("retains all historical cross-listing placements but denies a new association or changing its asset", async () => {
  await as(
    `update venue_media_placements set target_key='archive' where venue_id='${suiteVenue}'`,
  );
  await expect(
    as(
      `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenue}','${image(1)}','venue_gallery','new')`,
    ),
  ).rejects.toThrow(/Enhanced media library/);
  await expect(
    as(
      `update venue_media_placements set media_id='${image(2)}' where venue_id='${suiteVenue}' and media_id='${image(1)}'`,
    ),
  ).rejects.toThrow(/Enhanced media library/);
  expect(
    (
      await db.query(
        `select count(*)::int n from venue_media_placements where venue_id='${suiteVenue}'`,
      )
    ).rows,
  ).toEqual([{ n: 9 }]);
});
it("counts historical foreign assets for raw storage writes with library disabled", async () => {
  await expect(
    as(
      `insert into storage.objects(bucket_id,name,metadata) values('event-media','${suiteVenue}/new.png','{"size":100}')`,
    ),
  ).rejects.toThrow(/row-level security/);
  expect(
    (
      await db.query(
        `select * from akisuite_listing_private.media_usage('${suiteVenue}',null)`,
      )
    ).rows,
  ).toEqual([{ photos: 9, total_bytes: 900 }]);
});
it("rejects media registration over the aggregate allowance even when own-media count is zero", async () => {
  await db.exec(
    `insert into storage.objects(bucket_id,name,metadata) values('event-media','${suiteVenue}/orphan.png','{"size":100}')`,
  );
  await expect(
    as(
      `insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('${image(20)}','${suiteVenue}','${suiteVenue}/orphan.png','image/png',100)`,
    ),
  ).rejects.toThrow(/allowance exceeded/i);
  expect(
    (
      await db.query(
        `select count(*)::int n from venue_media where venue_id='${suiteVenue}'`,
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  await db.exec(
    `delete from storage.objects where name='${suiteVenue}/orphan.png'`,
  );
});
it("counts historical foreign assets for verified reservations and retains all data after rejected attempts", async () => {
  await db.exec(
    "update akisuite_listing_private.launch_settings set uploads_enforced=true",
  );
  await expect(
    as(
      `select reserve_listing_upload('${suiteVenue}','${"a".repeat(64)}','image/png',100,1,1,null)`,
    ),
  ).rejects.toThrow(/allowance exceeded/i);
  expect(
    (
      await db.query(
        `select count(*)::int n from akisuite_listing_private.upload_reservations`,
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  expect(
    (await db.query(`select count(*)::int n from venue_media`)).rows,
  ).toEqual([{ n: 9 }]);
});
it("permits the eighth unique path, deduplicates repeated placements, and denies the ninth reservation", async () => {
  await as(
    `delete from venue_media_placements where media_id in('${image(8)}','${image(9)}')`,
  );
  await as(
    `select reserve_listing_upload('${suiteVenue}','${"b".repeat(64)}','image/png',100,1,1,null)`,
  );
  expect(
    (
      await db.query(
        `select photos from akisuite_listing_private.media_usage('${suiteVenue}',null)`,
      )
    ).rows,
  ).toEqual([{ photos: 8 }]);
  await expect(
    as(
      `select reserve_listing_upload('${suiteVenue}','${"c".repeat(64)}','image/png',100,1,1,null)`,
    ),
  ).rejects.toThrow(/allowance exceeded/i);
  await db.exec(
    "update akisuite_listing_private.launch_settings set uploads_enforced=false",
  );
  await expect(
    as(
      `insert into storage.objects(bucket_id,name,metadata) values('event-media','${suiteVenue}/legacy-rollback.png','{"size":100}')`,
    ),
  ).rejects.toThrow(/row-level security/);
});
it("does not expose private accounting or activate disabled cohorts", async () => {
  expect(
    (
      await db.query(
        `select has_function_privilege('authenticated','akisuite_listing_private.media_usage(uuid,text)','EXECUTE') auth,has_function_privilege('anon','akisuite_listing_private.media_usage(uuid,text)','EXECUTE') anon,has_function_privilege('service_role','akisuite_listing_private.media_usage(uuid,text)','EXECUTE') service`,
      )
    ).rows,
  ).toEqual([{ auth: false, anon: false, service: false }]);
  await db.exec(
    "update akisuite_listing_private.launch_settings set enabled=false",
  );
  await as(
    `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenue}','${image(9)}','venue_gallery','legacy')`,
  );
  await as(
    `insert into storage.objects(bucket_id,name,metadata) values('event-media','${suiteVenue}/cohort-off.png','{"size":100}')`,
  );
  expect(
    (
      await db.query(
        "select enabled,uploads_enforced,library_enabled from akisuite_listing_private.launch_settings",
      )
    ).rows,
  ).toEqual([
    { enabled: false, uploads_enforced: false, library_enabled: false },
  ]);
});
it("retains licensed enhanced-library reuse and ordinary same-listing placement behavior", async () => {
  await db.exec(
    `update venue_members set profile_id='${suiteOwner}' where venue_id='${suiteVenueTwo}';insert into billing_subscriptions values('${suiteOwner}','business','active','2040-01-01');update akisuite_listing_private.launch_settings set enabled=true,uploads_enforced=true,library_enabled=true`,
  );
  await as(
    `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenue}','${image(9)}','venue_gallery','premium')`,
  );
  await db.exec(
    "update akisuite_listing_private.launch_settings set library_enabled=false",
  );
  await as(
    `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenueTwo}','${image(9)}','venue_gallery','same-listing')`,
  );
  expect(
    (
      await db.query(
        `select count(*)::int n from venue_media_placements where target_key in('premium','same-listing')`,
      )
    ).rows,
  ).toEqual([{ n: 2 }]);
});
