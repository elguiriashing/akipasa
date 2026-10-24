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
const assets = [1, 2, 3, 4].map(
  (n) => `97000000-0000-4000-8000-00000000000${n}`,
);
const migration = "20261021175000_listing_library_reference_boundaries.sql";
async function as(sql: string, role = "authenticated", user = suiteOwner) {
  await db.exec(
    `set role ${role};select set_config('test.uid','${role === "anon" ? "" : user}',false)`,
  );
  try {
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec("reset role");
  }
}
async function flags(on: boolean) {
  await db.exec(
    `update akisuite_listing_private.launch_settings set enabled=${on},library_enabled=${on},uploads_enforced=${on}`,
  );
}
async function media(n: number) {
  await db.exec(
    `insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('${assets[n - 1]}','${suiteVenue}','${suiteVenue}/${n}.png','image/png',100)`,
  );
}
async function object(n: number) {
  await db.exec(
    `insert into storage.objects(bucket_id,name,metadata) values('event-media','${suiteVenue}/${n}.png','{"size":100}')`,
  );
}
async function place(n: number, kind: string, key = "") {
  await as(
    `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${suiteVenueTwo}','${assets[n - 1]}','${kind}','${key}')`,
  );
}
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(`alter table storage.objects add column user_metadata jsonb;
 alter table venue_media add foreign key(venue_id) references venues on delete cascade;
 alter table venue_media_placements add foreign key(media_id) references venue_media on delete cascade,add foreign key(venue_id) references venues on delete cascade;
 alter table venue_media enable row level security;alter table venue_media_placements enable row level security;
 grant select on venue_media,venue_media_placements to anon;
 grant select on venues to anon,authenticated;
 alter table venues enable row level security;
 create policy fixture_venue_read on venues for select to anon,authenticated using(status='published' or is_venue_member(id));
 grant select,insert,update,delete on venue_media,venue_media_placements to authenticated;
 create policy fixture_media_write on venue_media for insert to authenticated with check(is_venue_member(venue_id));
 create policy fixture_media_update on venue_media for update to authenticated using(is_venue_member(venue_id)) with check(is_venue_member(venue_id));
 create policy fixture_placement on venue_media_placements to authenticated using(is_venue_member(venue_id)) with check(is_venue_member(venue_id));
 drop policy fixture_storage_authenticated on storage.objects;
 drop policy fixture_storage_public_read on storage.objects;
 create policy fixture_storage_owner_read on storage.objects for select to authenticated using(is_venue_member(split_part(name,'/',1)::uuid));
 create policy fixture_storage_owner_delete on storage.objects for delete to authenticated using(bucket_id='event-media' and is_venue_member(split_part(name,'/',1)::uuid));
 update venues set status='draft' where id='${suiteVenue}';
 update events set venue_id='${suiteVenueTwo}',status='draft' where id='${suiteEvent}';
 insert into billing_subscriptions values('${suiteOwner}','business','active','2040-01-01');`);
  // Use the actual deployed baseline predicates rather than an all-readable fixture.
  const baseline = readFileSync(
    "database/migrations/0002_identity_and_business.sql",
    "utf8",
  ).match(/create policy venue_media_read[\s\S]*?;/)?.[0];
  const storage = readFileSync(
    "database/migrations/0016_venue_contacts_and_public_media.sql",
    "utf8",
  ).match(/create policy event_media_published_read[\s\S]*?;/)?.[0];
  const deletion = readFileSync(
    "database/migrations/0019_venue_media_team_management.sql",
    "utf8",
  ).match(/create policy venue_media_member_delete[\s\S]*?;/)?.[0];
  if (!baseline || !storage || !deletion)
    throw new Error("Baseline policies missing");
  await db.exec(baseline + storage + deletion);
  for (const name of [
    "20261020170415_listing_entitlement_limits.sql",
    "20261020173552_enforced_listing_uploads.sql",
    "20261020233027_standalone_listing_premium_library.sql",
    "20261021003500_prevent_retained_media_identity_reuse.sql",
    "20261021004500_library_requires_verified_uploads.sql",
  ])
    await db.exec(readFileSync(`database/migrations/${name}`, "utf8"));
  for (let n = 1; n <= 4; n++) {
    await media(n);
    await object(n);
  }
  await flags(true);
  await place(1, "venue_cover");
  await place(2, "event_banner", suiteEvent);
  await place(3, "event_bin", suiteEvent);
}, 30000);
afterAll(async () => db?.close());
it("reproduces private-source public artwork invisibility and both direct deletion bypasses before repair", async () => {
  expect((await as("select id from venue_media", "anon")).rows).toEqual([]);
  expect((await as("select name from storage.objects", "anon")).rows).toEqual(
    [],
  );
  expect(
    (
      await as(
        `delete from storage.objects where name='${suiteVenue}/1.png' returning name`,
      )
    ).rows,
  ).toHaveLength(1);
  await object(1);
  expect(
    (await as(`delete from venue_media where id='${assets[0]}' returning id`))
      .rows,
  ).toHaveLength(1);
  expect(
    (
      await db.query(
        `select * from venue_media_placements where media_id='${assets[0]}'`,
      )
    ).rows,
  ).toEqual([]);
  await flags(false);
  await media(1);
  await flags(true);
  await place(1, "venue_cover");
  await db.exec(readFileSync(`database/migrations/${migration}`, "utf8"));
});
it("exposes only explicit published destination artwork to anonymous and unrelated authenticated readers", async () => {
  for (const role of ["anon", "authenticated"]) {
    expect(
      (await as("select id from venue_media order by id", role, suiteOther))
        .rows,
    ).toEqual([{ id: assets[0] }]);
    expect(
      (
        await as(
          "select name from storage.objects order by name",
          role,
          suiteOther,
        )
      ).rows,
    ).toEqual([{ name: `${suiteVenue}/1.png` }]);
  }
  await db.exec(
    `update events set status='published' where id='${suiteEvent}'`,
  );
  expect(
    (await as("select id from venue_media order by id", "anon")).rows,
  ).toEqual([{ id: assets[0] }, { id: assets[1] }]);
  await db.exec(`update venues set status='draft' where id='${suiteVenueTwo}'`);
  expect((await as("select id from venue_media", "anon")).rows).toEqual([]);
  await db.exec(
    `update venues set status='published' where id='${suiteVenueTwo}'`,
  );
});
it("does not publish bins, arbitrary targets or unrelated source images and changes no legacy access while gated off", async () => {
  await as(
    `update venue_media_placements set target_key='not-a-public-target' where media_id='${assets[0]}'`,
  );
  expect(
    (await as("select id from venue_media order by id", "anon")).rows,
  ).toEqual([{ id: assets[1] }]);
  await as(
    `update venue_media_placements set target_key='' where media_id='${assets[0]}'`,
  );
  await flags(false);
  expect((await as("select id from venue_media", "anon")).rows).toEqual([]);
  expect((await as("select name from storage.objects", "anon")).rows).toEqual(
    [],
  );
  await flags(true);
});
it("denies direct media and Storage deletion including the source owner until all references are explicitly detached", async () => {
  await expect(
    as(`delete from venue_media where id='${assets[0]}'`),
  ).rejects.toThrow(/Remove media placements/);
  await expect(
    as(`delete from storage.objects where name='${suiteVenue}/1.png'`),
  ).rejects.toThrow(/Remove media placements/);
  expect(
    (await db.query(`select id from venue_media where id='${assets[0]}'`)).rows,
  ).toHaveLength(1);
  expect(
    (
      await db.query(
        `select name from storage.objects where name='${suiteVenue}/1.png'`,
      )
    ).rows,
  ).toHaveLength(1);
  await as(`delete from venue_media_placements where media_id='${assets[0]}'`);
  expect(
    (
      await as(
        `delete from storage.objects where name='${suiteVenue}/1.png' returning name`,
      )
    ).rows,
  ).toHaveLength(1);
  expect(
    (await as(`delete from venue_media where id='${assets[0]}' returning id`))
      .rows,
  ).toHaveLength(1);
});
it("rejects adding references to a removed object, rolling back entitlement-history effects", async () => {
  await as(`delete from storage.objects where name='${suiteVenue}/4.png'`);
  await expect(place(4, "venue_profile")).rejects.toThrow(
    /Stored media no longer exists/,
  );
  expect(
    (
      await db.query(
        `select * from akisuite_listing_private.retained_media_reuse where media_id='${assets[3]}'`,
      )
    ).rows,
  ).toEqual([]);
  expect(
    (
      await db.query(
        `select * from venue_media_placements where media_id='${assets[3]}'`,
      )
    ).rows,
  ).toEqual([]);
});
it("does not turn private trigger helpers into callable browser mutation APIs", async () => {
  await expect(
    as("select akisuite_listing_private.protect_referenced_object()"),
  ).rejects.toThrow(/permission denied/);
  await expect(
    as("select akisuite_listing_private.lock_shared_media_reference()", "anon"),
  ).rejects.toThrow(/permission denied/);
  expect(
    (
      await as(
        "select listing_shared_media_visible(null,'not-a-storage-path') visible",
        "anon",
      )
    ).rows,
  ).toEqual([{ visible: false }]);
});

it("preserves the existing explicit owner venue deletion while retaining other venues and Storage objects", async () => {
  await db.exec(
    readFileSync(
      "database/migrations/20261021014000_listing_library_deletion_compatibility.sql",
      "utf8",
    ),
  );
  await db.exec(
    "create table event_submissions(duplicate_of uuid,published_event_id uuid,published_venue_id uuid);create table moderation_actions(actor_id uuid,action text,target_type text,target_id uuid,reason text,metadata jsonb)",
  );
  const original = readFileSync(
    "database/migrations/0060_crm_unclaimed_catalogue_and_cascade_deletion.sql",
    "utf8",
  ).match(/create or replace function delete_owned_venue[\s\S]*?end\$\$;/)?.[0];
  if (!original) throw new Error("Original owner deletion missing");
  await db.exec(original);
  await db.exec(
    "revoke all on function delete_owned_venue(uuid,text,text) from public,anon;grant execute on function delete_owned_venue(uuid,text,text) to authenticated",
  );
  await as(
    `select delete_owned_venue('${suiteVenue}','DELETE','Owner requested complete venue deletion')`,
  );
  expect((await db.query(`select id from venues`)).rows).toEqual([
    { id: suiteVenueTwo },
  ]);
  expect((await db.query(`select id from events`)).rows).toEqual([
    { id: suiteEvent },
  ]);
  expect((await db.query("select id from venue_media")).rows).toEqual([]);
  expect((await db.query("select * from venue_media_placements")).rows).toEqual(
    [],
  );
  expect(
    (await db.query("select count(*)::int n from storage.objects")).rows,
  ).toEqual([{ n: 2 }]);
  expect(
    (
      await db.query<{ n: number }>(
        "select count(*)::int n from akisuite_listing_private.retained_media_reuse",
      )
    ).rows[0].n,
  ).toBeGreaterThan(0);
});
