import { afterAll, beforeAll, expect, it } from "vitest";
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
const media = "94000000-0000-4000-8000-000000000001";
const fix = "20261021014000_listing_library_deletion_compatibility.sql";
async function as(id: string, sql: string, role = "authenticated") {
  await db.exec(`set role ${role};select set_config('test.uid','${id}',false)`);
  try {
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec("reset role");
  }
}
async function receipt(event = suiteEvent) {
  return (
    await as(
      suiteOwner,
      `select reserve_listing_upload('${suiteVenue}','${"a".repeat(64)}','image/png',100,1,1,'${event}') receipt`,
    )
  ).rows[0].receipt as { id: string; path: string };
}
beforeAll(async () => {
  db = await premiumDatabase(false);
  // Match the existing CRM/profile and catalogue lifecycle, not a new deletion API.
  await db.exec(`
    create type app_role as enum ('consumer','moderator','administrator');
    create function has_platform_role(roles app_role[]) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and app_role=any(roles::text[]))$$;
    create table event_submissions(duplicate_of uuid,published_event_id uuid,published_venue_id uuid);
    create table moderation_actions(actor_id uuid,action text,target_type text,target_id uuid,reason text,metadata jsonb);
    alter table venue_members add foreign key(venue_id) references venues on delete cascade,add foreign key(profile_id) references profiles on delete cascade;
    alter table venue_media add foreign key(venue_id) references venues on delete cascade;
    alter table crm_workspaces add foreign key(source_venue_id) references venues on delete set null,add foreign key(owner_profile_id) references profiles on delete set null;
    alter table crm_workspace_members add foreign key(workspace_id) references crm_workspaces on delete cascade,add foreign key(profile_id) references profiles on delete cascade;
    alter table crm_workspace_venues add foreign key(workspace_id) references crm_workspaces on delete cascade,add foreign key(venue_id) references venues on delete cascade;
    alter table storage.objects add column user_metadata jsonb;
    grant select,insert,update,delete on venue_media to authenticated;
    grant usage on schema storage to service_role;grant all on storage.objects to service_role;
  `);
  const deletion = readFileSync(
    "database/migrations/0060_crm_unclaimed_catalogue_and_cascade_deletion.sql",
    "utf8",
  );
  for (const name of ["delete_owned_venue", "operator_delete_catalogue_item"]) {
    const body = deletion.match(
      new RegExp(`create or replace function ${name}[\\s\\S]*?end\\$\\$;`),
    )?.[0];
    if (!body) throw new Error(`Original deletion RPC missing: ${name}`);
    await db.exec(body);
  }
  await db.exec(
    "revoke all on function delete_owned_venue(uuid,text,text),operator_delete_catalogue_item(text,uuid,text,text) from public,anon;grant execute on function delete_owned_venue(uuid,text,text),operator_delete_catalogue_item(text,uuid,text,text) to authenticated",
  );
  for (const name of [
    "20261020170415_listing_entitlement_limits.sql",
    "20261020173552_enforced_listing_uploads.sql",
    "20261020233027_standalone_listing_premium_library.sql",
    "20261021003500_prevent_retained_media_identity_reuse.sql",
    "20261021004500_library_requires_verified_uploads.sql",
  ])
    await db.exec(readFileSync(`database/migrations/${name}`, "utf8"));
  await db.exec(
    `insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('${media}','${suiteVenue}','${suiteVenue}/retained.png','image/png',100);insert into storage.objects(bucket_id,name,metadata) values('event-media','${suiteVenue}/retained.png','{"size":100}');insert into billing_subscriptions values('${suiteOwner}','business','active','2040-01-01');update akisuite_listing_private.launch_settings set enabled=true,uploads_enforced=true,library_enabled=true;`,
  );
  template = String(
    (
      await as(
        suiteOwner,
        `select save_akisuite_event_template('${suiteEvent}','Retained snapshot') id`,
      )
    ).rows[0].id,
  );
  folder = String(
    (
      await as(
        suiteOwner,
        `select set_akisuite_media_folder('${media}','Retained folder') id`,
      )
    ).rows[0].id,
  );
}, 30000);
afterAll(async () => db?.close());
it("reproduces the real owner and operator venue deletion regression before the forward repair", async () => {
  await expect(
    as(
      suiteOwner,
      `select delete_owned_venue('${suiteVenue}','DELETE','Owner deletion requested')`,
    ),
  ).rejects.toThrow(/akisuite_event_templates_source_venue_id_fkey/);
  await db.exec(
    `update profiles set app_role='administrator' where id='${suiteOther}'`,
  );
  await expect(
    as(
      suiteOther,
      `select operator_delete_catalogue_item('venue','${suiteVenue}','DELETE','Administrator deletion requested')`,
    ),
  ).rejects.toThrow(/akisuite_event_templates_source_venue_id_fkey/);
  expect(
    (
      await db.query(
        `select source_event_id from akisuite_event_templates where id='${template}'`,
      )
    ).rows,
  ).toEqual([{ source_event_id: suiteEvent }]);
  await db.exec("delete from akisuite_event_templates");
  await expect(
    as(
      suiteOwner,
      `select delete_owned_venue('${suiteVenue}','DELETE','Owner deletion requested')`,
    ),
  ).rejects.toThrow(/akisuite_media_folders_venue_id_fkey/);
  template = String(
    (
      await as(
        suiteOwner,
        `select save_akisuite_event_template('${suiteEvent}','Retained snapshot') id`,
      )
    ).rows[0].id,
  );
  await receipt();
  await expect(
    as(
      suiteOther,
      `select operator_delete_catalogue_item('event','${suiteEvent}','DELETE','Administrator deletion requested')`,
    ),
  ).rejects.toThrow(/upload_reservations_event_id_fkey/);
  await db.exec(readFileSync(`database/migrations/${fix}`, "utf8"));
});
it("keeps exact owner/staff authorization and confirmation checks", async () => {
  await expect(
    as(
      suiteOther,
      `select delete_owned_venue('${suiteVenue}','DELETE','Unauthorized owner request')`,
    ),
  ).rejects.toThrow(/owner permission/);
  await expect(
    as(
      suiteOwner,
      `select operator_delete_catalogue_item('venue','${suiteVenue}','DELETE','Unauthorized operator request')`,
    ),
  ).rejects.toThrow(/staff role/);
  await expect(
    as(
      suiteOwner,
      `select delete_owned_venue('${suiteVenue}','NO','Owner deletion requested')`,
    ),
  ).rejects.toThrow(/confirmation/);
});
it("allows the actual operator event deletion while retaining image, receipt and template snapshot", async () => {
  await as(
    suiteOther,
    `select operator_delete_catalogue_item('event','${suiteEvent}','DELETE','Administrator deletion requested')`,
  );
  expect(
    (
      await db.query(
        "select event_id from akisuite_listing_private.upload_reservations",
      )
    ).rows,
  ).toEqual([{ event_id: null }]);
  expect(
    (
      await db.query(
        `select source_event_id,source_venue_id from akisuite_event_templates where id='${template}'`,
      )
    ).rows,
  ).toEqual([{ source_event_id: null, source_venue_id: suiteVenue }]);
  expect((await db.query("select id from venue_media")).rows).toEqual([
    { id: media },
  ]);
});
it("allows the actual owner venue deletion, archives library metadata and preserves unrelated business data and Storage", async () => {
  await as(
    suiteOwner,
    `select delete_owned_venue('${suiteVenue}','DELETE','Owner deletion requested')`,
  );
  expect(
    (
      await db.query(
        `select workspace_id,source_venue_id,template_document->>'title_es' title from akisuite_event_templates where id='${template}'`,
      )
    ).rows,
  ).toEqual([
    {
      workspace_id: "ws_one",
      source_venue_id: null,
      title: "Poesía en Málaga",
    },
  ]);
  expect(
    (
      await db.query(
        `select workspace_id,venue_id from akisuite_media_folders where id='${folder}'`,
      )
    ).rows,
  ).toEqual([{ workspace_id: "ws_one", venue_id: null }]);
  expect(
    (
      await db.query(
        "select count(*)::int n from akisuite_listing_private.upload_reservations",
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
  expect((await db.query("select id from venues")).rows).toEqual([
    { id: suiteVenueTwo },
  ]);
  expect(
    (await db.query("select count(*)::int n from storage.objects")).rows,
  ).toEqual([{ n: 1 }]);
  expect(
    (
      await as(
        suiteOwner,
        `select * from akisuite_templates_for_venue('${suiteVenueTwo}')`,
      )
    ).rows,
  ).toEqual([]);
  await expect(
    as(
      suiteOwner,
      `select create_akisuite_event_from_template('${template}','${suiteVenueTwo}','archived-template')`,
    ),
  ).rejects.toThrow(/Template access/);
  await expect(
    as(
      suiteOwner,
      `update akisuite_event_templates set source_venue_id='${suiteVenueTwo}' where id='${template}'`,
    ),
  ).rejects.toThrow(/permission denied/);
  expect(
    (await db.query("select action from moderation_actions order by action"))
      .rows,
  ).toEqual([{ action: "deleted" }, { action: "operator_deleted" }]);
});
it("allows the exact staff venue deletion with retained library rows and receipts", async () => {
  const venue = "96000000-0000-4000-8000-000000000001";
  const event = "96000000-0000-4000-8000-000000000002";
  await db.exec(
    `insert into venues(id,name) values('${venue}','Operator deletion fixture');insert into venue_members values('${venue}','${suiteOwner}','owner');insert into crm_workspace_venues values('ws_one','${venue}');insert into events(id,venue_id,slug,status) values('${event}','${venue}','staff-deletion-fixture','draft')`,
  );
  const id = String(
    (
      await as(
        suiteOwner,
        `select save_akisuite_event_template('${event}','Operator snapshot') id`,
      )
    ).rows[0].id,
  );
  await as(
    suiteOwner,
    `select reserve_listing_upload('${venue}','${"c".repeat(64)}','image/png',100,1,1,'${event}')`,
  );
  await as(
    suiteOther,
    `select operator_delete_catalogue_item('venue','${venue}','DELETE','Administrator deletion requested')`,
  );
  expect(
    (
      await db.query(
        `select source_venue_id,source_event_id from akisuite_event_templates where id='${id}'`,
      )
    ).rows,
  ).toEqual([{ source_venue_id: null, source_event_id: null }]);
  expect(
    (
      await db.query(
        `select id from akisuite_listing_private.upload_reservations where venue_id='${venue}'`,
      )
    ).rows,
  ).toEqual([]);
  expect((await db.query("select id from venues")).rows).toEqual([
    { id: suiteVenueTwo },
  ]);
});
it("does not introduce a new workspace-deletion blocker or scope reassignment", async () => {
  // No current workspace-delete RPC exists: simulate the existing reviewed operator
  // lifecycle, without granting browser DELETE or bypassing financial restrictions.
  await db.exec("delete from crm_workspaces where id='ws_one'");
  expect(
    (
      await db.query(
        "select workspace_id from akisuite_event_templates where name='Retained snapshot'",
      )
    ).rows,
  ).toEqual([{ workspace_id: null }]);
  expect(
    (await db.query("select workspace_id from akisuite_media_folders")).rows,
  ).toEqual([{ workspace_id: null }]);
  expect((await db.query("select id from crm_workspaces")).rows).toEqual([
    { id: "ws_two" },
  ]);
  expect(
    (await as(suiteOwner, "select * from akisuite_event_templates")).rows,
  ).toEqual([]);
});
it("does not block profile erasure with upload receipts or transfer retained business media", async () => {
  const event = "95000000-0000-4000-8000-000000000001";
  await db.exec(
    `insert into events(id,venue_id,slug,status) values('${event}','${suiteVenueTwo}','retained-event','draft')`,
  );
  const r = (
    await as(
      suiteOwner,
      `select reserve_listing_upload('${suiteVenueTwo}','${"b".repeat(64)}','image/png',100,1,1,'${event}') receipt`,
    )
  ).rows[0].receipt as { id: string; path: string };
  await as(
    suiteOwner,
    `insert into storage.objects(bucket_id,name,metadata,user_metadata) values('event-media','${r.path}','{"size":100,"mimetype":"image/png"}','{"listing_upload_id":"${r.id}","sha256":"${"b".repeat(64)}"}')`,
    "service_role",
  );
  await as(
    suiteOwner,
    `select complete_listing_upload('${r.id}','${"b".repeat(64)}')`,
    "service_role",
  );
  await as(
    suiteOwner,
    `insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('${media}','${suiteVenueTwo}','${r.path}','image/png',100)`,
  );
  await db.exec(`delete from profiles where id='${suiteOwner}'`);
  expect(
    (await db.query(`select id,venue_id from venue_media where id='${media}'`))
      .rows,
  ).toEqual([{ id: media, venue_id: suiteVenueTwo }]);
  expect(
    (await db.query(`select name from storage.objects where name='${r.path}'`))
      .rows,
  ).toEqual([{ name: r.path }]);
  expect(
    (
      await db.query(
        `select id from akisuite_listing_private.upload_reservations where id='${r.id}'`,
      )
    ).rows,
  ).toEqual([]);
  expect(
    (
      await db.query(
        `select created_by from akisuite_event_templates where id='${template}'`,
      )
    ).rows,
  ).toEqual([{ created_by: null }]);
  expect((await db.query("select id from venues")).rows).toEqual([
    { id: suiteVenueTwo },
  ]);
  expect((await db.query("select id from events")).rows).toEqual([
    { id: event },
  ]);
  expect(
    (
      await db.query(
        `select * from venue_members where venue_id='${suiteVenueTwo}'`,
      )
    ).rows,
  ).toEqual([]);
});
