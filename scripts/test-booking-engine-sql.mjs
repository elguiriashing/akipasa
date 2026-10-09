import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const connection = process.env.TEST_BOOKING_DATABASE_URL;
if (!connection) throw new Error("TEST_BOOKING_DATABASE_URL required");
const parsed = new URL(connection);
if (
  !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname) ||
  parsed.pathname !== "/booking_test"
)
  throw new Error(
    "Booking database smoke test only accepts a local booking_test database",
  );

const sql = postgres(connection, { max: 1, onnotice: () => {} });
const venue = "00000000-0000-4000-8000-000000000001";
const resource = "00000000-0000-4000-8000-000000000002";
const anotherVenue = "00000000-0000-4000-8000-000000000003";
try {
  await sql
    .unsafe(
      `
    create role authenticated;
    create role anon;
    create type public.venue_member_role as enum ('owner','manager','editor');
    create table public.venues(id uuid primary key);
    create table public.venue_booking_settings(
      venue_id uuid primary key references public.venues(id),
      mode text not null,
      active boolean not null default true
    );
    create table public.venue_availability_slots(
      id uuid primary key default gen_random_uuid(),
      venue_id uuid not null references public.venues(id),
      starts_at timestamptz not null,
      ends_at timestamptz not null,
      capacity integer not null,
      active boolean not null default true
    );
    create function public.is_venue_member(uuid,public.venue_member_role[])
      returns boolean language sql stable as
      $$ select current_setting('akipasa.member',true) is distinct from 'off' $$;
  `,
    )
    .simple();

  for (const filename of [
    "supabase/migrations/20261009115000_booking_resources.sql",
    "supabase/migrations/20261009120000_recurring_booking_slots.sql",
  ])
    await sql.unsafe(readFileSync(filename, "utf8")).simple();

  await sql`insert into public.venues (id) values (${venue}),(${anotherVenue})`;
  await sql`insert into public.venue_booking_settings(venue_id,mode) values (${venue},'request')`;
  await sql`insert into public.booking_resources(id,venue_id,name,kind,capacity) values (${resource},${venue},'Buggy 1','vehicle',2)`;

  const schedule = () => sql`select public.create_recurring_booking_slots(
    ${venue}::uuid,
    (current_date + 14)::date,
    (current_date + 20)::date,
    array[1,2,3,4,5,6,7]::integer[],
    '09:30'::time,
    60,
    2,
    ${resource}::uuid
  ) as count`;
  const first = await schedule();
  assert.equal(first[0].count, 7, "Seven days should generate seven slots");
  const second = await schedule();
  assert.equal(second[0].count, 0, "Repeated schedule should be idempotent");

  const rows =
    await sql`select starts_at,ends_at from public.venue_availability_slots where resource_id=${resource} order by starts_at`;
  assert.equal(rows.length, 7);
  assert.equal(+rows[0].ends_at - +rows[0].starts_at, 60 * 60000);

  const overlapStart = new Date(+rows[0].starts_at + 15 * 60000);
  const overlapEnd = new Date(+rows[0].starts_at + 75 * 60000);
  await assert.rejects(
    () => sql`insert into public.venue_availability_slots(venue_id,resource_id,starts_at,ends_at,capacity)
      values (${venue},${resource},${overlapStart},${overlapEnd},1)`,
    (error) => error.code === "23P01",
    "A single resource must not be double-bookable",
  );

  await assert.rejects(
    () => sql`insert into public.venue_availability_slots(venue_id,resource_id,starts_at,ends_at,capacity)
      values (${venue},${resource},${new Date(+rows[0].starts_at + 30 * 86400000)},${new Date(+rows[0].ends_at + 30 * 86400000)},3)`,
    (error) => /capacity exceeds/i.test(error.message),
    "Slots may not exceed resource capacity",
  );

  await assert.rejects(
    () => sql`insert into public.venue_availability_slots(venue_id,resource_id,starts_at,ends_at,capacity)
      values (${anotherVenue},${resource},${new Date(+rows[0].starts_at + 31 * 86400000)},${new Date(+rows[0].ends_at + 31 * 86400000)},1)`,
    (error) =>
      error.code === "23503" || /resource unavailable/i.test(error.message),
    "A resource may not be used by another venue",
  );

  await sql.unsafe("set akipasa.member = 'off'");
  await assert.rejects(schedule, (error) =>
    /not authorized/i.test(error.message),
  );
  await sql.unsafe("set akipasa.member = 'on'");

  await assert.rejects(
    () => sql`select public.create_recurring_booking_slots(
      ${venue}::uuid,'2027-03-28'::date,'2027-03-28'::date,
      array[7]::integer[],'02:30'::time,60,1,null::uuid)`,
    (error) => /nonexistent local time/i.test(error.message),
    "Spring DST gap must reject impossible local times",
  );

  await sql`update public.venue_booking_settings set mode='disabled' where venue_id=${venue}`;
  await assert.rejects(schedule, (error) =>
    /enable native bookings first/i.test(error.message),
  );

  console.log(
    "PASS: recurrence, idempotent retry, overlaps, capacity, tenant isolation, authorization, DST, disabled mode",
  );
} finally {
  await sql.end();
}
