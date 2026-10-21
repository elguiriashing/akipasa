import { afterAll, beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import { premiumDatabase, suiteOwner } from "./fixtures/akisuite-premium-sql";
const venue = "abcccccc-0000-4000-8000-000000000001",
  upper = venue.toUpperCase();
let db: PGlite;
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
  await db.exec("alter table storage.objects add column user_metadata jsonb");
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
    `insert into venues(id,name)values('${venue}','Canonical namespace fixture');insert into venue_members values('${venue}','${suiteOwner}','owner');update akisuite_listing_private.launch_settings set enabled=true`,
  );
}, 30000);
afterAll(async () => db?.close());
it("reproduces uppercase UUID orphan uploads exceeding eight despite valid owner scoping", async () => {
  for (let n = 0; n < 9; n++)
    await as(
      `insert into storage.objects(bucket_id,name,metadata)values('event-media','${upper}/${n}.png','{"size":100}')`,
    );
  expect(
    (
      await db.query(
        `select count(*)::int n from storage.objects where split_part(name,'/',1)='${upper}'`,
      )
    ).rows,
  ).toEqual([{ n: 9 }]);
  expect(
    (
      await db.query(
        `select photos from akisuite_listing_private.media_usage('${venue}',null)`,
      )
    ).rows,
  ).toEqual([{ photos: 0 }]);
  const meta = `select oid,proowner,proacl::text,proconfig,prosecdef,provolatile from pg_proc where oid in('akisuite_listing_private.media_usage(uuid,text)'::regprocedure,'public.akisuite_listing_storage_upload_allowed(text)'::regprocedure)order by oid`;
  const before = (await db.query(meta)).rows;
  await db.exec(
    readFileSync(
      "database/migrations/20261021200000_listing_storage_canonical_prefix.sql",
      "utf8",
    ),
  );
  expect((await db.query(meta)).rows).toEqual(before);
});
it("retains and counts historical case variants while rejecting new canonical and uppercase paths over quota", async () => {
  expect(
    (
      await db.query(
        `select photos,total_bytes from akisuite_listing_private.media_usage('${venue}',null)`,
      )
    ).rows,
  ).toEqual([{ photos: 9, total_bytes: 900 }]);
  for (const prefix of [venue, upper])
    await expect(
      as(
        `insert into storage.objects(bucket_id,name,metadata)values('event-media','${prefix}/new.png','{"size":100}')`,
      ),
    ).rejects.toThrow(/row-level security/);
  expect(
    (
      await db.query(
        `select count(*)::int n from storage.objects where lower(split_part(name,'/',1))='${venue}'`,
      )
    ).rows,
  ).toEqual([{ n: 9 }]);
});
it("permits canonical eighth upload and denies noncanonical prefixes even below quota", async () => {
  await as(
    `delete from storage.objects where name in('${upper}/7.png','${upper}/8.png')`,
  );
  await expect(
    as(
      `insert into storage.objects(bucket_id,name,metadata)values('event-media','${upper}/extra.png','{"size":100}')`,
    ),
  ).rejects.toThrow(/row-level security/);
  await as(
    `insert into storage.objects(bucket_id,name,metadata)values('event-media','${venue}/eighth.png','{"size":100}')`,
  );
  await db.exec(
    "update akisuite_listing_private.launch_settings set uploads_enforced=true",
  );
  await expect(
    as(
      `select reserve_listing_upload('${venue}','${"a".repeat(64)}','image/png',100,1,1,null)`,
    ),
  ).rejects.toThrow(/allowance exceeded/i);
});
it("leaves explicitly disabled cohorts unchanged without rewriting existing object keys", async () => {
  await db.exec(
    "update akisuite_listing_private.launch_settings set enabled=false,uploads_enforced=false",
  );
  await as(
    `insert into storage.objects(bucket_id,name,metadata)values('event-media','${upper}/cohort-off.png','{"size":100}')`,
  );
  expect(
    (
      await db.query(
        `select count(*)::int n from storage.objects where split_part(name,'/',1)='${upper}'`,
      )
    ).rows,
  ).toEqual([{ n: 8 }]);
});
