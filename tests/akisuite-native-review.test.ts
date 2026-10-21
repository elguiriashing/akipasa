import { beforeAll, afterAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  suiteOwner,
  suiteOther,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite,
  pending: string,
  privateId: string,
  orphan: string,
  revision: string;
const third = "94000000-0000-4000-8000-000000000001";
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
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(
    `alter table profiles add column created_at timestamptz default now();alter table storage.objects add column user_metadata jsonb;insert into profiles(id,app_role) values('${third}','consumer');update profiles set app_role='administrator' where id='${suiteOwner}'`,
  );
  for (const file of [
    "20261020170448_account_completion_age_declaration.sql",
    "20261021001000_native_accommodation_listing_foundation.sql",
    "20261021005500_native_accommodation_review_queue.sql",
  ])
    await db.exec(readFileSync(`database/migrations/${file}`, "utf8"));
  await db.exec(
    "update accommodation_private.launch_settings set enabled=true",
  );
  pending = await create(suiteOther, "Submitted stay");
  privateId = await create(suiteOther, "Private draft stay");
  orphan = await create(third, "Orphaned stay");
  revision = String(
    (
      await as(
        suiteOther,
        `select save_accommodation_property_profile('${pending}','{"name":"Submitted stay","accommodation_type":"hotel","city":"Valencia","description_es":"Borrador enviado","description_en":"Submitted draft"}',true) revision`,
      )
    ).rows[0].revision,
  );
  await db.exec(`delete from profiles where id='${third}'`);
}, 30000);
afterAll(async () => db?.close());
it("lists only submitted/orphaned business revisions for current administrators and isolates private drafts", async () => {
  const rows = (
    await as(
      suiteOwner,
      "select * from accommodation_property_review_page(101,0)",
    )
  ).rows;
  expect(rows).toHaveLength(2);
  expect(rows.map((r) => r.id)).toEqual(
    expect.arrayContaining([pending, orphan]),
  );
  expect(rows.map((r) => r.id)).not.toContain(privateId);
  expect(rows.find((r) => r.id === orphan)).toMatchObject({
    orphaned: true,
    status: "private",
  });
  expect(rows.find((r) => r.id === pending)).toMatchObject({
    orphaned: false,
    status: "pending",
    revision_id: revision,
    city: "Valencia",
  });
  await expect(
    as(suiteOther, "select * from accommodation_property_review_page(101,0)"),
  ).rejects.toThrow(/Administrator required/);
  await expect(
    as("", "select * from accommodation_property_review_page(101,0)", "anon"),
  ).rejects.toThrow(/permission denied/);
});
it("bounds raw queue/property/team RPC pagination including explicit NULL", async () => {
  for (const args of ["null,0", "1,null", "102,0", "1,10001"])
    await expect(
      as(
        suiteOwner,
        `select * from accommodation_property_review_page(${args})`,
      ),
    ).rejects.toThrow(/Invalid pagination/);
  for (const args of ["null,0", "1,null"]) {
    await expect(
      as(
        suiteOther,
        `select * from managed_accommodation_properties_page(${args})`,
      ),
    ).rejects.toThrow(/Invalid pagination/);
    await expect(
      as(
        suiteOther,
        `select accommodation_property_team('${pending}',${args})`,
      ),
    ).rejects.toThrow(/Invalid pagination/);
  }
  expect(
    (
      await as(
        suiteOwner,
        "select * from accommodation_property_review_page(1,0)",
      )
    ).rows,
  ).toHaveLength(1);
});
it("rejects stale publication, preserves the current draft and reason boundary, and records exact reviewed revision", async () => {
  await expect(
    as(
      suiteOwner,
      `select review_accommodation_property('${pending}',true,gen_random_uuid(),'Reviewed listing evidence')`,
    ),
  ).rejects.toThrow(/Stale/);
  expect(
    (
      await as(
        suiteOwner,
        "select status from accommodation_property_review_page(101,0) where id='" +
          pending +
          "'",
      )
    ).rows,
  ).toEqual([{ status: "pending" }]);
  await as(
    suiteOwner,
    `select review_accommodation_property('${pending}',true,'${revision}','Reviewed listing evidence')`,
  );
  expect(
    (
      await db.query(
        `select status,owner_profile_id from accommodation_properties where id='${pending}'`,
      )
    ).rows,
  ).toEqual([{ status: "published", owner_profile_id: suiteOther }]);
  await expect(
    as(
      suiteOwner,
      `select review_accommodation_property('${orphan}',true,gen_random_uuid(),'Attempted ownership bypass')`,
    ),
  ).rejects.toThrow(/Stale/);
  expect(
    (
      await as(
        suiteOwner,
        "select id from accommodation_property_review_page(101,0)",
      )
    ).rows,
  ).toEqual([{ id: orphan }]);
});
it("denies disabled queue and restricted administrators with no empty-success fallback", async () => {
  await db.exec(
    "update accommodation_private.launch_settings set enabled=false",
  );
  await expect(
    as(suiteOwner, "select * from accommodation_property_review_page(101,0)"),
  ).rejects.toThrow(/Administrator required/);
  await db.exec(
    `update accommodation_private.launch_settings set enabled=true;insert into account_private.onboarding(profile_id) values('${suiteOwner}')`,
  );
  await expect(
    as(suiteOwner, "select * from accommodation_property_review_page(101,0)"),
  ).rejects.toThrow(/Administrator required/);
});
