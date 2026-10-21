import { beforeAll, afterAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  suiteOwner,
  suiteOther,
  suiteVenue,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite, property: string, foreign: string;
const room = "81000000-0000-4000-8000-000000000001",
  otherRoom = "81000000-0000-4000-8000-000000000002",
  unit = "82000000-0000-4000-8000-000000000001",
  booking = "83000000-0000-4000-8000-000000000001";
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
const createRoom = (id = room, p = property) =>
  `insert into accommodation_property_room_types(id,property_id,name,max_guests) values('${id}','${p}','Double',2)`;
const block = (start: string, end: string, p = property) =>
  `insert into accommodation_property_unit_blocks(property_id,unit_id,start_date,end_date_exclusive) values('${p}','${unit}','${start}','${end}')`;
const rate = (start: string, end: string, cents = 10000) =>
  `insert into accommodation_property_nightly_rates(property_id,room_type_id,start_date,end_date_exclusive,nightly_price_cents) values('${property}','${room}','${start}','${end}',${cents})`;
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(`alter table profiles add column created_at timestamptz default now();alter table storage.objects add column user_metadata jsonb;
 create table accommodation_room_types(id uuid primary key,venue_id uuid,name text);insert into accommodation_room_types values('${room}','${suiteVenue}','Legacy preserved');
 insert into accommodation_reservations(venue_id,check_in,check_out,status,quoted_total_cents) values('${suiteVenue}','2040-01-01','2040-01-03','confirmed',12345);`);
  for (const name of [
    "20261020170448_account_completion_age_declaration.sql",
    "20261021001000_native_accommodation_listing_foundation.sql",
    "20261021002500_native_accommodation_inventory.sql",
  ])
    await db.exec(readFileSync(`database/migrations/${name}`, "utf8"));
  await db.exec(
    "update accommodation_property_private.launch_settings set enabled=true",
  );
  property = String(
    (
      await as(
        suiteOwner,
        "select create_accommodation_property('Native inventory','ws_one') id",
      )
    ).rows[0].id,
  );
  foreign = String(
    (
      await as(
        suiteOther,
        "select create_accommodation_property('Other inventory','ws_two') id",
      )
    ).rows[0].id,
  );
}, 30000);
afterAll(async () => db?.close());
it("requires its own default-off inventory gate before authoritative writes", async () => {
  await expect(as(suiteOwner, createRoom())).rejects.toThrow(
    /row-level security/,
  );
  await db.exec(
    "update accommodation_property_private.launch_settings set inventory_enabled=true",
  );
  await as(suiteOwner, createRoom());
  await as(suiteOther, createRoom(otherRoom, foreign));
  expect(
    (
      await as(
        suiteOther,
        `select * from accommodation_property_room_types where property_id='${property}'`,
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await as(
        suiteOwner,
        `select id from accommodation_property_room_types where property_id='${property}'`,
      )
    ).rows,
  ).toEqual([{ id: room }]);
});
it("rejects cross-property FK substitution and immutable resource identity/scope mutation", async () => {
  await expect(
    as(
      suiteOwner,
      `insert into accommodation_property_units(property_id,room_type_id,name) values('${property}','${otherRoom}','101')`,
    ),
  ).rejects.toThrow(/foreign key/);
  await as(
    suiteOwner,
    `insert into accommodation_property_units(id,property_id,room_type_id,name) values('${unit}','${property}','${room}','101')`,
  );
  await expect(
    as(
      suiteOwner,
      `update accommodation_property_units set property_id='${foreign}' where id='${unit}'`,
    ),
  ).rejects.toThrow(/immutable|row-level security/);
  await expect(
    as(
      suiteOwner,
      `update accommodation_property_units set id=gen_random_uuid() where id='${unit}'`,
    ),
  ).rejects.toThrow(/immutable/);
  await expect(
    as(suiteOther, block("2040-02-01", "2040-02-04", foreign)),
  ).rejects.toThrow(/Unit property mismatch/);
});
it("prevents ambiguous overlapping rates and validates actual dates/prices without inventing prices", async () => {
  await as(suiteOwner, rate("2040-01-01", "2040-01-04"));
  await as(suiteOwner, rate("2040-01-04", "2040-01-07"));
  await expect(
    as(suiteOwner, rate("2040-01-03", "2040-01-05")),
  ).rejects.toThrow(/Overlapping/);
  await expect(
    as(suiteOwner, rate("2040-02-01", "2040-02-03", -1)),
  ).rejects.toThrow(/check constraint/);
  await expect(
    as(suiteOwner, rate("2040-02-04", "2040-02-02")),
  ).rejects.toThrow(/range lower bound|check constraint/);
});
it("uses shared unit locks and half-open dates for native blocks/reservations; denies forged bookings", async () => {
  await as(suiteOwner, block("2040-03-01", "2040-03-04"));
  await as(suiteOwner, block("2040-03-04", "2040-03-05"));
  await expect(
    as(suiteOwner, block("2040-03-03", "2040-03-06")),
  ).rejects.toThrow(/already blocked/);
  const values = `('${booking}','${property}','${unit}','2040-03-05','2040-03-07',2,'Approved fixture','guest@example.invalid',20000,'{"approved_test_quote":true}',gen_random_uuid())`;
  const insert = `insert into accommodation_property_reservations(id,property_id,unit_id,check_in,check_out,guests,contact_name,contact_email,quoted_total_cents,quote_snapshot,idempotency_key) values${values}`;
  await expect(as(suiteOwner, insert)).rejects.toThrow(/permission denied/);
  await db.exec(insert);
  await expect(
    as(suiteOwner, block("2040-03-06", "2040-03-08")),
  ).rejects.toThrow(/reserved/);
  await expect(
    as(
      suiteOwner,
      `update accommodation_property_reservations set quoted_total_cents=1 where id='${booking}'`,
    ),
  ).rejects.toThrow(/permission denied/);
  await expect(
    as(
      suiteOther,
      `select accommodation_property_change_status('${booking}','confirmed')`,
    ),
  ).rejects.toThrow(/membership required/);
});
it("allows only valid owner reservation transitions, idempotent retries and immutable audit", async () => {
  await expect(
    as(
      suiteOwner,
      `select accommodation_property_change_status('${booking}','completed')`,
    ),
  ).rejects.toThrow(/Invalid/);
  for (const state of ["confirmed", "confirmed", "checked_in", "completed"])
    await as(
      suiteOwner,
      `select accommodation_property_change_status('${booking}','${state}')`,
    );
  await expect(
    as(
      suiteOwner,
      `select accommodation_property_change_status('${booking}','confirmed')`,
    ),
  ).rejects.toThrow(/Invalid/);
  expect(
    (
      await db.query(
        `select count(*)::int n from accommodation_property_private.audit where property_id='${property}' and action='reservation_status'`,
      )
    ).rows,
  ).toEqual([{ n: 3 }]);
  expect(
    (await as(suiteOther, `select * from accommodation_property_reservations`))
      .rows,
  ).toHaveLength(0);
  await expect(
    as("", "select * from accommodation_property_reservations", "anon"),
  ).rejects.toThrow(/permission denied/);
});
it("requires explicit valid booking policy settings and keeps property identity immutable", async () => {
  await expect(
    as(
      suiteOwner,
      `insert into accommodation_property_booking_settings(property_id,mode) values('${property}','request')`,
    ),
  ).rejects.toThrow(/check constraint/);
  await as(
    suiteOwner,
    `insert into accommodation_property_booking_settings(property_id,mode,external_url) values('${property}','external','https://booking.example.invalid')`,
  );
  await as(
    suiteOwner,
    `update accommodation_property_booking_settings set mode='disabled' where property_id='${property}'`,
  );
  await expect(
    as(
      suiteOwner,
      `update accommodation_property_booking_settings set property_id='${foreign}' where property_id='${property}'`,
    ),
  ).rejects.toThrow(/immutable/);
});
it("revokes native inventory reads/writes on CRM suspension and account restriction without deleting rows", async () => {
  await db.exec(
    `update crm_workspace_members set status='suspended' where workspace_id='ws_one' and profile_id='${suiteOwner}'`,
  );
  expect(
    (await as(suiteOwner, "select * from accommodation_property_units")).rows,
  ).toHaveLength(0);
  await expect(
    as(suiteOwner, rate("2040-06-01", "2040-06-02")),
  ).rejects.toThrow(/Property inventory membership required/);
  await db.exec(
    `update crm_workspace_members set status='active' where workspace_id='ws_one' and profile_id='${suiteOwner}';insert into account_private.onboarding(profile_id) values('${suiteOwner}')`,
  );
  expect(
    (await as(suiteOwner, "select * from accommodation_property_units")).rows,
  ).toHaveLength(0);
  await db.exec(
    `delete from account_private.onboarding where profile_id='${suiteOwner}'`,
  );
  expect(
    (await as(suiteOwner, "select id from accommodation_property_units")).rows,
  ).toEqual([{ id: unit }]);
});
it("preserves legacy venue inventory and booking identities and values", async () => {
  expect(
    (await db.query("select * from accommodation_room_types")).rows,
  ).toEqual([{ id: room, venue_id: suiteVenue, name: "Legacy preserved" }]);
  expect(
    (
      await db.query(
        "select venue_id,status,quoted_total_cents from accommodation_reservations",
      )
    ).rows,
  ).toEqual([
    { venue_id: suiteVenue, status: "confirmed", quoted_total_cents: 12345 },
  ]);
});

it("customer profile deletion detaches native reservation identity without deleting business history", async () => {
  await db.exec(
    `update accommodation_property_reservations set profile_id='${suiteOther}' where id='${booking}';delete from profiles where id='${suiteOther}'`,
  );
  expect(
    (
      await db.query(
        `select profile_id,quoted_total_cents,status from accommodation_property_reservations where id='${booking}'`,
      )
    ).rows,
  ).toEqual([
    { profile_id: null, quoted_total_cents: 20000, status: "completed" },
  ]);
});
