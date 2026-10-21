import { beforeAll, afterAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  suiteOwner,
  suiteOther,
  suiteVenue,
  suiteVenueTwo,
  suiteEvent,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite;
let template: string;
let folder: string;
const media = "50000000-0000-4000-8000-000000000001";
const migration = "20261020233027_standalone_listing_premium_library.sql";
async function as(id: string, sql: string) {
  await db.exec(
    `set role authenticated;select set_config('test.uid','${id}',false)`,
  );
  try {
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec("reset role");
  }
}
const paid = () =>
  db.exec(
    `insert into billing_subscriptions values('${suiteOwner}','business','active','2040-01-01')`,
  );
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(
    readFileSync(
      "database/migrations/20261020170415_listing_entitlement_limits.sql",
      "utf8",
    ),
  );
  await db.exec("alter table storage.objects add column user_metadata jsonb");
  await db.exec(
    readFileSync(
      "database/migrations/20261020173552_enforced_listing_uploads.sql",
      "utf8",
    ),
  );
  await db.exec(readFileSync(`database/migrations/${migration}`, "utf8"));
  await db.exec(
    readFileSync(
      "database/migrations/20261020233905_prevent_listing_event_identity_reuse.sql",
      "utf8",
    ),
  );
  await db.exec(`grant select,update on venue_media to authenticated;
 insert into venue_media(id,venue_id,storage_path,alt_es,mime_type,size_bytes,sort_order) values('${media}','${suiteVenue}','${suiteVenue}/one.jpg','One image','image/jpeg',100,0);
 insert into storage.objects values('event-media','${suiteVenue}/one.jpg','{"size":100}');`);
  await paid();
}, 30000);
afterAll(async () => db?.close());
it("installs independently with library disabled and rejects all template writes until gated", async () => {
  await expect(
    as(
      suiteOwner,
      `select save_akisuite_event_template('${suiteEvent}','Reusable event')`,
    ),
  ).rejects.toThrow(/Premium and scoped/);
  expect(
    (
      await as(
        suiteOwner,
        `select listing_limits_info('${suiteVenue}') as info`,
      )
    ).rows[0].info,
  ).toMatchObject({ library_enabled: false, premium: true });
  await db.exec(
    "update akisuite_listing_private.launch_settings set enabled=true,library_enabled=true",
  );
});
it("saves bounded snapshots and creates a same-workspace member draft without dates or recurrence", async () => {
  template = String(
    (
      await as(
        suiteOwner,
        `select save_akisuite_event_template('${suiteEvent}','Reusable event') as id`,
      )
    ).rows[0].id,
  );
  const event = String(
    (
      await as(
        suiteOwner,
        `select create_akisuite_event_from_template('${template}','${suiteVenueTwo}','reused-event') as id`,
      )
    ).rows[0].id,
  );
  expect(
    (await db.query(`select status,title_es from events where id='${event}'`))
      .rows,
  ).toEqual([{ status: "draft", title_es: "Poesía en Málaga" }]);
  expect(
    (
      await db.query(
        `select count(*)::int as n from event_occurrences where event_id='${event}'`,
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  expect(
    (
      await as(
        suiteOwner,
        `select * from akisuite_templates_for_venue('${suiteVenueTwo}')`,
      )
    ).rows,
  ).toEqual([{ id: template, name: "Reusable event" }]);
});
it("denies outsiders, inactive CRM members, source-membership loss, arbitrary document writes and raw template reads", async () => {
  await expect(
    as(
      suiteOther,
      `select create_akisuite_event_from_template('${template}','${suiteVenueTwo}','stolen')`,
    ),
  ).rejects.toThrow(/scoped/);
  expect(
    (await as(suiteOwner, "select * from akisuite_event_templates")).rows,
  ).toEqual([]);
  await expect(
    as(
      suiteOwner,
      `insert into akisuite_event_templates(workspace_id,source_venue_id,name,template_document) values('ws_one','${suiteVenue}','Forged','{}')`,
    ),
  ).rejects.toThrow(/permission denied/);
  await db.exec(
    `update crm_workspace_members set status='inactive' where profile_id='${suiteOwner}'`,
  );
  await expect(
    as(
      suiteOwner,
      `select save_akisuite_event_template('${suiteEvent}','Hidden')`,
    ),
  ).rejects.toThrow(/scoped/);
  await db.exec(
    `update crm_workspace_members set status='active' where profile_id='${suiteOwner}';delete from venue_members where venue_id='${suiteVenue}'`,
  );
  expect(
    (
      await as(
        suiteOwner,
        `select * from akisuite_templates_for_venue('${suiteVenueTwo}')`,
      )
    ).rows,
  ).toEqual([]);
  await db.exec(
    `insert into venue_members values('${suiteVenue}','${suiteOwner}','owner')`,
  );
});
it("rejects cross-workspace reuse even with active memberships in both organisations and anonymous/private RPC bypasses", async () => {
  const third = "20000000-0000-4000-8000-000000000003";
  await db.exec(
    `insert into venues(id,name) values('${third}','Third fixture');insert into venue_members values('${third}','${suiteOther}','owner'),('${third}','${suiteOwner}','manager');insert into crm_workspace_venues values('ws_two','${third}');insert into crm_workspace_members values('ws_two','${suiteOwner}','manager','active',null);insert into billing_subscriptions values('${suiteOther}','business','active','2040-01-01')`,
  );
  await expect(
    as(
      suiteOwner,
      `select create_akisuite_event_from_template('${template}','${third}','cross-workspace')`,
    ),
  ).rejects.toThrow(/Template access/);
  expect(
    (
      await as(
        suiteOwner,
        `select akisuite_media_allowed('${third}','${media}') as ok`,
      )
    ).rows,
  ).toEqual([{ ok: false }]);
  await expect(
    as(
      suiteOwner,
      `select akisuite_listing_private.reserve_listing_upload_legacy('${suiteVenue}','${"a".repeat(64)}','image/jpeg',100,1,1,null)`,
    ),
  ).rejects.toThrow(/permission denied/);
  await db.exec("set role anon");
  try {
    await expect(
      db.exec(
        `select save_akisuite_event_template('${suiteEvent}','Anonymous')`,
      ),
    ).rejects.toThrow(/permission denied/);
  } finally {
    await db.exec("reset role");
  }
});
it("assigns folders only under owner premium and prevents forged other-venue folders and stored identity moves", async () => {
  folder = String(
    (
      await as(
        suiteOwner,
        `select set_akisuite_media_folder('${media}','Campaign') as id`,
      )
    ).rows[0].id,
  );
  expect(
    (
      await as(
        suiteOwner,
        `select folder_name from akisuite_media_library('${suiteVenue}')`,
      )
    ).rows,
  ).toEqual([{ folder_name: "Campaign" }]);
  await expect(
    as(suiteOther, `select set_akisuite_media_folder('${media}','Stolen')`),
  ).rejects.toThrow(/scoped/);
  await expect(
    as(
      suiteOwner,
      `update venue_media set venue_id='${suiteVenueTwo}' where id='${media}'`,
    ),
  ).rejects.toThrow(/immutable/);
  await db.exec(
    `insert into akisuite_media_folders(workspace_id,venue_id,name) values('ws_one','${suiteVenueTwo}','Other venue')`,
  );
  const forged = String(
    (
      await db.query<{ id: string }>(
        "select id from akisuite_media_folders where name='Other venue'",
      )
    ).rows[0].id,
  );
  await expect(
    as(
      suiteOwner,
      `update venue_media set akisuite_folder_id='${forged}' where id='${media}'`,
    ),
  ).rejects.toThrow(/scoped folder/);
});
it("enables scoped Premium shared reuse and retains exact placements on downgrade without licensing new reuse", async () => {
  await db.exec(
    `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenueTwo}','${media}','event_banner','licensed-event')`,
  );
  // Definer trigger still evaluates the original authenticated owner identity.
  await db.exec("delete from billing_subscriptions");
  expect(
    (
      await as(
        suiteOwner,
        `select akisuite_media_allowed('${suiteVenueTwo}','${media}') as ok`,
      )
    ).rows,
  ).toEqual([{ ok: true }]);
  expect(
    (
      await as(
        suiteOwner,
        `select id from akisuite_media_library('${suiteVenueTwo}')`,
      )
    ).rows,
  ).toEqual([{ id: media }]);
  await expect(
    db.exec(
      `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenueTwo}','${media}','event_banner','new-event')`,
    ),
  ).rejects.toThrow(/Premium required/);
  await expect(
    as(
      suiteOwner,
      `select save_akisuite_event_template('${suiteEvent}','Free bypass')`,
    ),
  ).rejects.toThrow(/scoped/);
  await expect(
    as(
      suiteOwner,
      `select set_akisuite_media_folder('${media}','Free folder')`,
    ),
  ).rejects.toThrow(/scoped/);
  expect(
    (await db.query("select count(*)::int as n from akisuite_event_templates"))
      .rows,
  ).toEqual([{ n: 1 }]);
  expect(
    (
      await db.query(
        `select akisuite_folder_id from venue_media where id='${media}'`,
      )
    ).rows,
  ).toEqual([{ akisuite_folder_id: folder }]);
});
it("counts retained shared assets with own uploads under the same quota lock; no foreign caller may inspect usage", async () => {
  // Seven own stored assets plus one retained shared asset consume the target free8 allowance.
  await db.exec(
    "update akisuite_listing_private.launch_settings set library_enabled=false,enabled=false",
  );
  for (let i = 1; i <= 7; i++)
    await db.exec(
      `insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('60000000-0000-4000-8000-${String(i).padStart(12, "0")}','${suiteVenueTwo}','${suiteVenueTwo}/${i}.jpg','image/jpeg',100)`,
    );
  await db.exec(
    `insert into storage.objects values('event-media','${suiteVenueTwo}/new.jpg','{"size":100}');update akisuite_listing_private.launch_settings set enabled=true,library_enabled=true`,
  );
  await expect(
    db.exec(
      `insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values(gen_random_uuid(),'${suiteVenueTwo}','${suiteVenueTwo}/new.jpg','image/jpeg',100)`,
    ),
  ).rejects.toThrow(/allowance exceeded/i);
  await db.exec(
    `delete from storage.objects where name='${suiteVenueTwo}/new.jpg';update akisuite_listing_private.launch_settings set uploads_enforced=true`,
  );
  await expect(
    as(
      suiteOwner,
      `select reserve_listing_upload('${suiteVenueTwo}','${"a".repeat(64)}','image/jpeg',100,1,1,null)`,
    ),
  ).rejects.toThrow(/allowance exceeded/i);
  expect(
    (
      await db.query(
        "select count(*)::int as n from akisuite_listing_private.upload_reservations",
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  await expect(
    as(suiteOther, `select akisuite_media_in_use('${media}')`),
  ).rejects.toThrow(/owner required/);
  expect(readFileSync(`database/migrations/${migration}`, "utf8")).toBe(
    readFileSync(`supabase/migrations/${migration}`, "utf8"),
  );
});
