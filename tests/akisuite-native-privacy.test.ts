import { beforeAll, afterAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  suiteOwner,
  suiteOther,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite, property: string, ownedByOther: string;
const orphanPath = "92000000-0000-4000-8000-000000000001/existing-private.png",
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
async function create(user: string, name: string) {
  return String(
    (await as(user, `select create_accommodation_property('${name}') id`))
      .rows[0].id,
  );
}
async function receipt(p: string, user = suiteOwner) {
  return (
    await as(
      user,
      `select reserve_accommodation_upload('${p}','${hash}','image/png',100,1,1) receipt`,
    )
  ).rows[0].receipt as { id: string; path: string };
}
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(`alter table profiles add column created_at timestamptz default now();alter table storage.objects add column user_metadata jsonb;grant usage on schema storage to service_role;grant all on storage.objects to service_role;grant select,insert,update,delete on storage.objects to anon;create policy fixture_broad_anon_all on storage.objects to anon using(true) with check(true);
 insert into storage.objects(bucket_id,name,metadata) values('accommodation-media','${orphanPath}','{"size":100,"mimetype":"image/png"}');`);
  // Reproduce the pre-migration broad legacy read policy, then prove it is intersected.
  expect(
    (
      await as(
        "",
        `select name from storage.objects where bucket_id='accommodation-media'`,
        "anon",
      )
    ).rows,
  ).toEqual([{ name: orphanPath }]);
  for (const name of [
    "20261020170448_account_completion_age_declaration.sql",
    "20261021001000_native_accommodation_listing_foundation.sql",
  ])
    await db.exec(readFileSync(`database/migrations/${name}`, "utf8"));
}, 30000);
afterAll(async () => db?.close());
it("default-off native storage is private against broad legacy SELECT/DELETE and direct INSERT/UPDATE", async () => {
  for (const [user, role] of [
    ["", "anon"],
    [suiteOwner, "authenticated"],
    [suiteOther, "authenticated"],
  ]) {
    expect(
      (
        await as(
          user,
          "select name from storage.objects where bucket_id='accommodation-media'",
          role,
        )
      ).rows,
    ).toHaveLength(0);
    {
      expect(
        (
          await as(
            user,
            "delete from storage.objects where bucket_id='accommodation-media' returning name",
            role,
          )
        ).rows,
      ).toHaveLength(0);
      expect(
        (
          await as(
            user,
            `update storage.objects set metadata='{"size":999}' where bucket_id='accommodation-media' returning name`,
            role,
          )
        ).rows,
      ).toHaveLength(0);
    }
    await expect(
      as(
        user,
        `insert into storage.objects(bucket_id,name) values('accommodation-media','${orphanPath}.forged')`,
        role,
      ),
    ).rejects.toThrow(
      /row-level security|permission denied|Approved service upload reservation required/,
    );
  }
  expect(
    (
      await db.query(
        `select name,metadata->>'size' size from storage.objects where bucket_id='accommodation-media'`,
      )
    ).rows,
  ).toEqual([{ name: orphanPath, size: "100" }]);
});
it("allows only current property owner/member reads/deletes when enabled; outsiders and disabled gates remain denied", async () => {
  await db.exec(
    "update accommodation_private.launch_settings set enabled=true,uploads_enforced=true",
  );
  property = await create(suiteOwner, "Owned private property");
  ownedByOther = await create(suiteOther, "Other property");
  const r = await receipt(property);
  await as(
    suiteOwner,
    `insert into storage.objects(bucket_id,name,metadata,user_metadata) values('accommodation-media','${r.path}','{"size":100,"mimetype":"image/png"}','{"accommodation_upload_id":"${r.id}","sha256":"${hash}"}')`,
    "service_role",
  );
  await as(
    suiteOwner,
    `select complete_accommodation_upload('${r.id}','${hash}')`,
    "service_role",
  );
  await as(
    suiteOwner,
    `insert into accommodation_property_media(property_id,storage_path,mime_type,size_bytes) values('${property}','${r.path}','image/png',100)`,
  );
  expect(
    (
      await as(
        suiteOwner,
        `select name from storage.objects where name='${r.path}'`,
      )
    ).rows,
  ).toEqual([{ name: r.path }]);
  expect(
    (
      await as(
        suiteOther,
        `select name from storage.objects where name='${r.path}'`,
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await as(
        suiteOther,
        `delete from storage.objects where name='${r.path}' returning name`,
      )
    ).rows,
  ).toHaveLength(0);
  await db.exec(
    `update accommodation_properties set status='published' where id='${property}'`,
  );
  await as(
    suiteOwner,
    `update accommodation_property_media set public_position=0 where property_id='${property}'`,
  );
  expect(
    (
      await as(
        "",
        `select name from storage.objects where name='${r.path}'`,
        "anon",
      )
    ).rows,
  ).toEqual([{ name: r.path }]);
  expect(
    (
      await as(
        "",
        `delete from storage.objects where name='${r.path}' returning name`,
        "anon",
      )
    ).rows,
  ).toHaveLength(0);
  await db.exec(
    "update accommodation_private.launch_settings set enabled=false,uploads_enforced=false",
  );
  expect(
    (
      await as(
        suiteOwner,
        `select name from storage.objects where name='${r.path}'`,
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await as(
        suiteOwner,
        `delete from storage.objects where name='${r.path}' returning name`,
      )
    ).rows,
  ).toHaveLength(0);
  await db.exec(
    "update accommodation_private.launch_settings set enabled=true,uploads_enforced=true",
  );
});
it("profile deletion detaches ownership for review and cascades memberships/receipts without deleting retained business media", async () => {
  await as(
    suiteOwner,
    `select set_accommodation_property_member('${property}','${suiteOther}','manager')`,
  );
  await as(
    suiteOther,
    `select set_accommodation_property_member('${ownedByOther}','${suiteOwner}','manager')`,
  );
  const ownerPending = await receipt(property);
  const memberPending = await receipt(ownedByOther, suiteOwner);
  expect(ownerPending.id).not.toBe(memberPending.id);
  await db.exec(`delete from profiles where id='${suiteOwner}'`);
  expect(
    (
      await db.query(
        `select owner_profile_id,status,orphaned_at is not null review from accommodation_properties where id='${property}'`,
      )
    ).rows,
  ).toEqual([{ owner_profile_id: null, status: "private", review: true }]);
  expect(
    (
      await db.query(
        `select count(*)::int n from accommodation_property_media where property_id='${property}'`,
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
  expect(
    (
      await db.query(
        `select count(*)::int n from accommodation_property_members where profile_id='${suiteOwner}'`,
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  expect(
    (
      await db.query(
        `select count(*)::int n from accommodation_private.upload_reservations where actor='${suiteOwner}'`,
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  expect(
    (
      await as(
        suiteOther,
        `select can_manage_accommodation_property('${property}') allowed`,
      )
    ).rows,
  ).toEqual([{ allowed: false }]);
  expect(
    (
      await as(
        suiteOther,
        `select * from accommodation_property_media where property_id='${property}'`,
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await db.query<{ n: number }>(
        `select count(*)::int n from accommodation_private.audit where property_id='${property}'`,
      )
    ).rows[0].n,
  ).toBeGreaterThan(0);
});
