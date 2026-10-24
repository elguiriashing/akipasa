import { afterAll, beforeAll, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  suiteOwner,
  suiteOther,
  suiteVenue,
  suiteEvent,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite;
const foreign = "bb000000-0000-4000-8000-000000000001",
  event = "bb000000-0000-4000-8000-000000000002",
  asset = "bb000000-0000-4000-8000-000000000003";
async function as(sql: string, role = "authenticated") {
  await db.exec(
    `set role ${role};select set_config('test.uid','${role === "anon" ? "" : suiteOwner}',false)`,
  );
  try {
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec("reset role");
  }
}
const insert = (key = event, kind = "event_banner") =>
  `insert into venue_media_placements(venue_id,media_id,placement,target_key,sort_order) values('${suiteVenue}','${asset}','${kind}','${key}',10000)`;
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(`create type app_role as enum('consumer','moderator','administrator');create function has_platform_role(roles app_role[]) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from profiles where id=auth.uid() and app_role=any(roles::text[]))$$;
 grant select on venues to anon,authenticated;grant select,insert,update,delete on venue_media_placements to authenticated;grant select on venue_media,venue_media_placements to anon;
 alter table venue_media enable row level security;alter table venue_media_placements enable row level security;alter table venue_media_placements add column sort_order integer default 0 check(sort_order between 0 and 10000);
 insert into venues(id,name) values('${foreign}','Foreign public venue');insert into venue_members values('${foreign}','${suiteOther}','owner');insert into events(id,venue_id,slug,title_es,status) values('${event}','${foreign}','foreign-public-event','Foreign public event','published');
 insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values('${asset}','${suiteVenue}','${suiteVenue}/owner.png','image/png',100);`);
  for (const [file, re] of [
    [
      "database/migrations/0002_identity_and_business.sql",
      /create policy venue_media_read[\s\S]*?;/,
    ],
    [
      "database/migrations/0090_media_library_event_price_display.sql",
      /create policy venue_media_placements_public_read[\s\S]*?;/,
    ],
    [
      "database/migrations/0090_media_library_event_price_display.sql",
      /create policy venue_media_placements_member_insert[\s\S]*?;/,
    ],
    [
      "database/migrations/0090_media_library_event_price_display.sql",
      /create policy venue_media_placements_member_update[\s\S]*?;/,
    ],
    [
      "database/migrations/0090_media_library_event_price_display.sql",
      /create policy venue_media_placements_member_delete[\s\S]*?;/,
    ],
  ] as const) {
    const policy = readFileSync(file, "utf8").match(re)?.[0];
    if (!policy) throw new Error("Original policy missing");
    await db.exec(policy);
  }
}, 30000);
afterAll(async () => db?.close());
it("reproduces cross-tenant public artwork injection despite lack of target ownership before repair", async () => {
  expect(
    (await as(`select is_venue_member('${foreign}') owns_target`)).rows,
  ).toEqual([{ owns_target: false }]);
  await as(insert());
  expect(
    (
      await as(
        `select p.target_key,m.storage_path from venue_media_placements p join venue_media m on m.id=p.media_id where p.target_key='${event}' order by p.sort_order`,
        "anon",
      )
    ).rows,
  ).toEqual([{ target_key: event, storage_path: `${suiteVenue}/owner.png` }]);
  await db.exec(
    readFileSync(
      "database/migrations/20261021184000_event_media_target_scope.sql",
      "utf8",
    ),
  );
  expect(
    (
      await db.query(
        `select count(*)::int n from venue_media_placements where target_key='${event}'`,
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
});
it("blocks new and edited foreign targets while retaining cleanup of historical rows", async () => {
  await expect(as(insert(event, "event_explore"))).rejects.toThrow(
    /another venue/,
  );
  await expect(
    as(
      `update venue_media_placements set placement='event_profile' where target_key='${event}'`,
    ),
  ).rejects.toThrow(/another venue/);
  expect(
    (
      await as(
        `delete from venue_media_placements where target_key='${event}' returning media_id`,
      )
    ).rows,
  ).toEqual([{ media_id: asset }]);
});
it("retains legitimate draft bins and every current selected event slot without Premium or library activation", async () => {
  await db.exec(`update events set status='draft' where id='${suiteEvent}'`);
  for (const kind of [
    "event_banner",
    "event_explore",
    "event_profile",
    "event_background",
    "event_map_vertical",
    "event_bin",
    "event_gallery",
  ]) {
    await as(insert(suiteEvent, kind));
  }
  expect(
    (
      await db.query(
        `select count(*)::int n from venue_media_placements where target_key='${suiteEvent}'`,
      )
    ).rows,
  ).toEqual([{ n: 7 }]);
  await as(insert("", "venue_cover"));
});
it("rejects missing or malformed event targets with no privileged helper endpoint", async () => {
  for (const key of [
    "",
    "not-an-event",
    "bb000000-0000-4000-8000-000000000099",
  ]) {
    await expect(as(insert(key, "event_explore"))).rejects.toThrow(
      /Event media target/,
    );
  }
  for (const role of ["anon", "authenticated", "service_role"]) {
    await expect(
      as("select guard_event_media_target_scope()", role),
    ).rejects.toThrow(/permission denied/);
  }
  expect(
    (await db.query(`select id from events order by id`)).rows,
  ).toHaveLength(2);
  expect((await db.query(`select id from venue_media`)).rows).toEqual([
    { id: asset },
  ]);
});

it("retains original destination membership isolation before any privileged target lookup", async () => {
  await expect(
    as(
      `insert into venue_media_placements(venue_id,media_id,placement,target_key) values('${foreign}','${asset}','event_banner','${event}')`,
    ),
  ).rejects.toThrow(/venue permission/);
  expect(
    (
      await db.query(
        `select count(*)::int n from venue_media_placements where venue_id='${foreign}'`,
      )
    ).rows,
  ).toEqual([{ n: 0 }]);
});
