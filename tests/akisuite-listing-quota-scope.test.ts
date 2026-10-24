import { afterAll, beforeAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  suiteOwner,
  suiteVenue,
  suiteVenueTwo,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite;
const file =
  "database/migrations/20261021181500_listing_quota_scope_serialization.sql";
let original: string;
let metadata: unknown[];
let definitions: Array<{ oid: number; definition: string }>;
const meta = `select oid,proowner,proacl::text,proconfig,prosecdef,provolatile from pg_proc where proname in('enforce_listing_event','guard_media_quota','akisuite_listing_storage_upload_allowed','reserve_listing_upload_legacy','guard_library_media','guard_library_placement') order by oid`;
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
    "alter table storage.objects add column user_metadata jsonb;grant select,insert,update,delete on events,event_occurrences,venue_media to authenticated",
  );
  for (const f of [
    "20261020170415_listing_entitlement_limits.sql",
    "20261020173552_enforced_listing_uploads.sql",
    "20261020233027_standalone_listing_premium_library.sql",
    "20261021003500_prevent_retained_media_identity_reuse.sql",
    "20261021004500_library_requires_verified_uploads.sql",
  ]) {
    await db.exec(readFileSync(`database/migrations/${f}`, "utf8"));
  }
  original = String(
    (
      await db.query<{ definition: string }>(
        "select pg_get_functiondef('akisuite_listing_private.guard_media_quota()'::regprocedure) definition",
      )
    ).rows[0].definition,
  );
  metadata = (await db.query(meta)).rows;
  definitions = (
    await db.query<{ oid: number; definition: string }>(
      `select oid,pg_get_functiondef(oid) definition from pg_proc where proname in('enforce_listing_event','guard_media_quota','akisuite_listing_storage_upload_allowed','reserve_listing_upload_legacy','guard_library_media','guard_library_placement') order by oid`,
    )
  ).rows;
}, 30000);
afterAll(async () => db?.close());
it("refuses unknown installed function bodies atomically instead of replacing authorization with a stale copy", async () => {
  await db.exec(
    original.replace(
      "hashtextextended(v_scope,2)",
      "hashtextextended(v_scope, 2)",
    ),
  );
  await expect(db.exec(readFileSync(file, "utf8"))).rejects.toThrow(
    /canonical quota anchor/,
  );
  await db.exec("rollback");
  expect(
    (
      await db.query(
        "select to_regclass('akisuite_listing_private.quota_scopes') relation",
      )
    ).rows,
  ).toEqual([{ relation: null }]);
  await db.exec(original);
  await db.exec(readFileSync(file, "utf8"));
  expect((await db.query(meta)).rows).toEqual(metadata);
  const after = (
    await db.query<{ oid: number; definition: string }>(
      `select oid,pg_get_functiondef(oid) definition from pg_proc where proname in('enforce_listing_event','guard_media_quota','akisuite_listing_storage_upload_allowed','reserve_listing_upload_legacy','guard_library_media','guard_library_placement') order by oid`,
    )
  ).rows;
  expect(
    after.map((row) => ({
      ...row,
      definition: row.definition.replace(
        /\n perform akisuite_listing_private\.claim_quota_scope\([^;]*\);/g,
        "",
      ),
    })),
  ).toEqual(definitions);
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
it("leaves disabled cohorts untouched and creates no quota scope until enforcement is active", async () => {
  await db.exec(
    `insert into storage.objects(bucket_id,name,metadata) values('event-media','${suiteVenue}/legacy.png','{"size":100}');insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('98000000-0000-4000-8000-000000000001','${suiteVenue}','${suiteVenue}/legacy.png','image/png',100)`,
  );
  expect(
    (await db.query("select * from akisuite_listing_private.quota_scopes"))
      .rows,
  ).toEqual([]);
  await db.exec(
    "update akisuite_listing_private.launch_settings set enabled=true,uploads_enforced=true",
  );
});
it("keeps eight-photo reservation accounting, preserves historical media and rolls back failed-scope writes", async () => {
  for (let n = 0; n < 7; n++)
    await as(
      `select reserve_listing_upload('${suiteVenue}','${"a".repeat(64)}','image/png',100,1,1,null)`,
    );
  const before = (
    await db.query(
      "select revision from akisuite_listing_private.quota_scopes where channel=2",
    )
  ).rows;
  await expect(
    as(
      `select reserve_listing_upload('${suiteVenue}','${"b".repeat(64)}','image/png',100,1,1,null)`,
    ),
  ).rejects.toThrow(/allowance exceeded/);
  expect(
    (
      await db.query(
        "select revision from akisuite_listing_private.quota_scopes where channel=2",
      )
    ).rows,
  ).toEqual(before);
  expect(
    (await db.query("select count(*)::int n from venue_media")).rows,
  ).toEqual([{ n: 1 }]);
  expect(
    (
      await db.query(
        "select count(*)::int n from akisuite_listing_private.upload_reservations",
      )
    ).rows,
  ).toEqual([{ n: 7 }]);
});
it("retains four distinct Madrid-calendar events without changing draft or monthly ledger semantics", async () => {
  for (let n = 1; n <= 5; n++) {
    const id = `99000000-0000-4000-8000-00000000000${n}`;
    await as(
      `insert into events(id,venue_id,slug,title_es,status) values('${id}','${suiteVenue}','quota-scope-${n}','Quota scope ${n}','draft')`,
    );
    await as(
      `insert into event_occurrences(id,event_id,starts_at,ends_at,status) values('${id}','${id}','2030-06-01T10:00Z','2030-06-05T11:00Z','scheduled')`,
    );
    if (n < 5)
      await as(`update events set status='published' where id='${id}'`);
    else
      await expect(
        as(`update events set status='published' where id='${id}'`),
      ).rejects.toThrow(/four distinct events/);
  }
  expect(
    (
      await db.query(
        "select count(*)::int n from akisuite_listing_private.listing_event_months where month='2030-06-01'",
      )
    ).rows,
  ).toEqual([{ n: 4 }]);
  expect(
    (await db.query("select status from events where slug='quota-scope-5'"))
      .rows,
  ).toEqual([{ status: "draft" }]);
});
it("runs all patched media paths with real service receipts and independent venue scopes", async () => {
  await db.exec(
    `grant usage on schema storage to service_role;grant all on storage.objects to service_role;grant select,insert,update,delete on venue_media_placements to authenticated;insert into billing_subscriptions values('${suiteOwner}','business','active','2040-01-01');update akisuite_listing_private.launch_settings set library_enabled=true`,
  );
  const hash = "c".repeat(64),
    media = "ab000000-0000-4000-8000-000000000001";
  const receipt = (
    await as(
      `select reserve_listing_upload('${suiteVenueTwo}','${hash}','image/png',100,1,1,null) receipt`,
    )
  ).rows[0].receipt as { id: string; path: string };
  await as(
    `insert into storage.objects(bucket_id,name,metadata,user_metadata) values('event-media','${receipt.path}','{"size":100,"mimetype":"image/png"}','{"listing_upload_id":"${receipt.id}","sha256":"${hash}"}')`,
    "service_role",
  );
  await as(
    `select complete_listing_upload('${receipt.id}','${hash}')`,
    "service_role",
  );
  await as(
    `insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('${media}','${suiteVenueTwo}','${receipt.path}','image/png',100)`,
  );
  await as(
    `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenue}','${media}','venue_cover','')`,
  );
  expect(
    (
      await db.query(
        "select state from akisuite_listing_private.upload_reservations where media_id='" +
          media +
          "'",
      )
    ).rows,
  ).toEqual([{ state: "committed" }]);
  expect(
    (
      await db.query<{ revision: number }>(
        `select revision from akisuite_listing_private.quota_scopes where venue_id='${suiteVenueTwo}' and channel=2`,
      )
    ).rows[0].revision,
  ).toBeGreaterThanOrEqual(3);
  expect(
    (
      await as(
        `select akisuite_listing_storage_upload_allowed('${suiteVenueTwo}/future.png') allowed`,
      )
    ).rows,
  ).toEqual([{ allowed: true }]);
});
it("keeps quota state and the revision helper private for every browser/service role", async () => {
  for (const role of ["anon", "authenticated", "service_role"]) {
    await expect(
      as("select * from akisuite_listing_private.quota_scopes", role),
    ).rejects.toThrow(/permission denied/);
    await expect(
      as(
        `select akisuite_listing_private.claim_quota_scope('${suiteVenue}',2)`,
        role,
      ),
    ).rejects.toThrow(/permission denied/);
  }
});
