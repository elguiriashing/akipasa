import { beforeAll, afterAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  suiteOwner,
  suiteOther,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite, property: string, free: string, paid: string;
const hash = "a".repeat(64);
async function as<T extends Record<string, unknown>>(
  user: string,
  sql: string,
  role = "authenticated",
) {
  await db.exec(
    `set role ${role};select set_config('test.uid','${user}',false)`,
  );
  try {
    return await db.query<T>(sql);
  } finally {
    await db.exec("reset role");
  }
}
async function create(
  name: string,
  workspace: string | null = null,
  user = suiteOwner,
) {
  return String(
    (
      await as(
        user,
        `select public.create_accommodation_property('${name}',${workspace ? `'${workspace}'` : "null"}) id`,
      )
    ).rows[0].id,
  );
}
async function reserve(id: string, width = 1920, user = suiteOwner) {
  return (
    await as(
      user,
      `select public.reserve_accommodation_upload('${id}','${hash}','image/png',100,${width},100) receipt`,
    )
  ).rows[0].receipt as { id: string; path: string };
}
async function store(receipt: { id: string; path: string }) {
  await as(
    suiteOwner,
    `insert into storage.objects(bucket_id,name,metadata,user_metadata) values('accommodation-media','${receipt.path}','{"size":100,"mimetype":"image/png"}','{"accommodation_upload_id":"${receipt.id}","sha256":"${hash}"}')`,
    "service_role",
  );
  await as(
    suiteOwner,
    `select complete_accommodation_upload('${receipt.id}','${hash}')`,
    "service_role",
  );
}
async function commit(
  id: string,
  r: { id: string; path: string },
  user = suiteOwner,
) {
  await as(
    user,
    `insert into accommodation_property_media(property_id,storage_path,mime_type,size_bytes) values('${id}','${r.path}','image/png',100)`,
  );
}
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(
    `alter table profiles add column created_at timestamptz default now();alter table storage.objects add column user_metadata jsonb;grant usage on schema storage to service_role;grant all on storage.objects to service_role;`,
  );
  await db.exec(
    readFileSync(
      "database/migrations/20261020170448_account_completion_age_declaration.sql",
      "utf8",
    ),
  );
  const sql = readFileSync(
    "database/migrations/20261021001000_native_accommodation_listing_foundation.sql",
    "utf8",
  );
  await db.exec(sql);
}, 30000);
afterAll(async () => db?.close());
it("keeps all native gates off and fails closed before native creation", async () => {
  await expect(create("Gated stay")).rejects.toThrow(/Account access/);
  expect(
    (
      await db.query(
        "select enabled,uploads_enforced from accommodation_property_private.launch_settings",
      )
    ).rows,
  ).toEqual([{ enabled: false, uploads_enforced: false }]);
  await db.exec(
    "update accommodation_property_private.launch_settings set enabled=true,uploads_enforced=true",
  );
});
it("creates genuine private properties owned by caller, intersects CRM ownership, denies foreign namespaces", async () => {
  property = await create("Native stay", "ws_one");
  free = await create("Free stay");
  paid = await create("Premium stay");
  const row = (
    await as(
      suiteOwner,
      `select id,owner_profile_id,workspace_id,legacy_venue_id,status from accommodation_properties where id='${property}'`,
    )
  ).rows[0];
  expect(row).toMatchObject({
    id: property,
    owner_profile_id: suiteOwner,
    workspace_id: "ws_one",
    legacy_venue_id: null,
    status: "private",
  });
  await expect(create("Foreign workspace", "ws_two")).rejects.toThrow(
    /Workspace owner/,
  );
  expect(
    (
      await as(
        suiteOther,
        `select * from accommodation_properties where id='${property}'`,
      )
    ).rows,
  ).toHaveLength(0);
  await expect(
    as(suiteOther, `select accommodation_listing_info('${property}')`),
  ).rejects.toThrow(/membership/);
  await expect(
    as(
      suiteOwner,
      `update accommodation_properties set owner_profile_id='${suiteOther}' where id='${property}'`,
    ),
  ).rejects.toThrow(/permission denied/);
  await expect(
    as(
      suiteOwner,
      "select * from accommodation_property_private.property_entitlements",
    ),
  ).rejects.toThrow(/permission denied/);
});
it("intersects per-property delegation and active CRM membership with immediate revoke", async () => {
  await expect(
    as(
      suiteOwner,
      `select set_accommodation_property_member('${property}','${suiteOther}','manager')`,
    ),
  ).rejects.toThrow(/organisation membership/);
  await db.exec(
    `insert into crm_workspace_members(workspace_id,profile_id,role,status) values('ws_one','${suiteOther}','staff','active')`,
  );
  await as(
    suiteOwner,
    `select set_accommodation_property_member('${property}','${suiteOther}','manager')`,
  );
  expect(
    (
      await as(
        suiteOther,
        `select can_manage_accommodation_property('${property}') allowed`,
      )
    ).rows[0].allowed,
  ).toBe(true);
  await expect(
    as(
      suiteOther,
      `select set_accommodation_property_member('${property}','${suiteOwner}',null)`,
    ),
  ).rejects.toThrow(/owner required/);
  await db.exec(
    `update crm_workspace_members set status='suspended' where workspace_id='ws_one' and profile_id='${suiteOther}'`,
  );
  expect(
    (
      await as(
        suiteOther,
        `select can_manage_accommodation_property('${property}') allowed`,
      )
    ).rows[0].allowed,
  ).toBe(false);
  await db.exec(
    `update crm_workspace_members set status='active' where workspace_id='ws_one' and profile_id='${suiteOther}'`,
  );
  await as(
    suiteOwner,
    `select set_accommodation_property_member('${property}','${suiteOther}',null)`,
  );
  expect(
    (
      await as(
        suiteOther,
        `select can_manage_accommodation_property('${property}') allowed`,
      )
    ).rows[0].allowed,
  ).toBe(false);
});
it("accounts eight pending upload reservations under lock, rejects unverified/direct/foreign/resolution writes", async () => {
  const pending = [];
  for (let i = 0; i < 8; i++) pending.push(await reserve(free));
  await expect(reserve(free)).rejects.toThrow(/allowance exceeded/);
  await expect(reserve(property, 1921)).rejects.toThrow(/resolution allowance/);
  await expect(reserve(property, 1920, suiteOther)).rejects.toThrow(
    /unavailable/,
  );
  await expect(commit(free, pending[0])).rejects.toThrow(/receipt required/);
  await expect(
    as(
      suiteOwner,
      `select complete_accommodation_upload('${pending[0].id}','${hash}')`,
    ),
  ).rejects.toThrow(/permission denied/);
  await expect(
    as(
      suiteOwner,
      `insert into storage.objects(bucket_id,name) values('accommodation-media','${pending[0].path}')`,
    ),
  ).rejects.toThrow(/reservation required|row-level security/);
  await expect(
    as(
      suiteOwner,
      `insert into storage.objects(bucket_id,name,metadata,user_metadata) values('accommodation-media','${free}/forged.png','{}','{}')`,
      "service_role",
    ),
  ).rejects.toThrow(/reservation required/);
  for (const receipt of pending) {
    await store(receipt);
    await commit(free, receipt);
  }
  await expect(reserve(free)).rejects.toThrow(/allowance exceeded/);
  expect(
    (await as(suiteOwner, `select accommodation_listing_info('${free}') info`))
      .rows[0].info,
  ).toMatchObject({ premium: false, photos: 8, used: 8, max_dimension: 1920 });
  await expect(
    as(
      suiteOwner,
      `update accommodation_property_media set storage_path='${property}/stolen.png' where property_id='${free}'`,
    ),
  ).rejects.toThrow(/immutable/);
});
it("separates native paid grants, permits 250 at higher resolution, retains all metadata after downgrade", async () => {
  await db.exec(
    `insert into accommodation_property_private.property_entitlements(property_id,source,reference) values('${paid}','admin_override','reviewed test evidence')`,
  );
  for (let i = 0; i < 250; i++) await reserve(paid, 3840);
  await expect(reserve(paid, 3840)).rejects.toThrow(/allowance exceeded/);
  expect(
    (await as(suiteOwner, `select accommodation_listing_info('${free}') info`))
      .rows[0].info,
  ).toMatchObject({ premium: false, photos: 8 });
  await db.exec(
    `update accommodation_property_private.property_entitlements set revoked_at=now() where property_id='${paid}'`,
  );
  await expect(reserve(paid)).rejects.toThrow(/allowance exceeded/);
  expect(
    (
      await db.query(
        `select count(*)::int n from accommodation_property_private.upload_reservations where property_id='${paid}'`,
      )
    ).rows,
  ).toEqual([{ n: 250 }]);
});
it("retains historical over-quota media without deletion and denies new uploads", async () => {
  // Data imported by an explicit reviewed migration may exceed new quota: retain it.
  await db.exec(
    "alter table accommodation_property_media disable trigger accommodation_verified_media",
  );
  await db.exec(
    `insert into accommodation_property_media(property_id,storage_path,mime_type,size_bytes) select '${free}','${free}/historical-'||i||'.png','image/png',100 from generate_series(1,3)i`,
  );
  await db.exec(
    "alter table accommodation_property_media enable trigger accommodation_verified_media",
  );
  await expect(reserve(free)).rejects.toThrow(/allowance exceeded/);
  expect(
    (
      await as(
        suiteOwner,
        `select count(*)::int n from accommodation_property_media where property_id='${free}'`,
      )
    ).rows,
  ).toEqual([{ n: 11 }]);
});
it("denies pending/underage accounts, service receipt after revoke, and immutable audit mutation", async () => {
  const r = await reserve(property);
  await db.exec(
    `insert into account_private.onboarding(profile_id) values('${suiteOwner}')`,
  );
  expect(
    (
      await as(
        suiteOwner,
        `select can_manage_accommodation_property('${property}') allowed`,
      )
    ).rows[0].allowed,
  ).toBe(false);
  await expect(create("Pending stay")).rejects.toThrow(/Account access/);
  await store(r).then(
    () => {
      throw Error("receipt unexpectedly allowed");
    },
    (e) => expect(String(e)).toMatch(/completion required/i),
  );
  await db.exec(
    `delete from account_private.onboarding where profile_id='${suiteOwner}'`,
  );
  await expect(
    db.exec("delete from accommodation_property_private.audit"),
  ).rejects.toThrow(/Immutable/);
  await expect(
    as(suiteOther, "select * from accommodation_property_private.audit"),
  ).rejects.toThrow(/permission denied/);
});
it("requires admin review for property publication and manual listing grants; private storage stays private", async () => {
  await expect(
    as(
      suiteOwner,
      `select set_accommodation_listing_grant('${property}','approved-case')`,
    ),
  ).rejects.toThrow(/Administrator/);
  await expect(
    as(
      suiteOwner,
      `select review_accommodation_property('${free}',true,gen_random_uuid(),'approved review evidence')`,
    ),
  ).rejects.toThrow(/Administrator/);
  const revision = String(
    (
      await as(
        suiteOwner,
        `select save_accommodation_property_profile('${free}','{"name":"Reviewed accommodation","accommodation_type":"hotel"}',true) revision`,
      )
    ).rows[0].revision,
  );
  await db.exec(
    `update profiles set app_role='administrator' where id='${suiteOwner}'`,
  );
  await expect(
    as(
      suiteOwner,
      `select review_accommodation_property('${free}',true,gen_random_uuid(),'approved review evidence')`,
    ),
  ).rejects.toThrow(/Stale/);
  await as(
    suiteOwner,
    `select review_accommodation_property('${free}',true,'${revision}','approved review evidence')`,
  );
  await as(
    suiteOwner,
    `select set_accommodation_listing_grant('${property}','approved-case')`,
  );
  expect(
    (
      await as(
        suiteOwner,
        `select accommodation_listing_info('${property}') info`,
      )
    ).rows[0].info,
  ).toMatchObject({ premium: true, photos: 250 });
  await as(
    suiteOwner,
    `select set_accommodation_listing_grant('${property}','approved-case',null,true)`,
  );
  expect(
    (
      await as(
        suiteOwner,
        `select accommodation_listing_info('${property}') info`,
      )
    ).rows[0].info,
  ).toMatchObject({ premium: false, photos: 8 });
  await db.exec(
    `update profiles set app_role='consumer' where id='${suiteOwner}'`,
  );
  expect(
    (
      await as(
        "",
        `select count(*)::int n from storage.objects where bucket_id='accommodation-media'`,
        "anon",
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  await as(
    suiteOwner,
    `update accommodation_property_media set public_position=0 where id=(select id from accommodation_property_media where property_id='${free}' and storage_path not like '%historical%' limit 1)`,
  );
  expect(
    (
      await as(
        "",
        `select count(*)::int n from storage.objects where bucket_id='accommodation-media'`,
        "anon",
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
  await expect(
    as("", `select * from accommodation_properties`, "anon"),
  ).rejects.toThrow(/permission denied/);
});
