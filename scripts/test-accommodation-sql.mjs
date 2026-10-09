import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const connection = process.env.TEST_ACCOMMODATION_DATABASE_URL;
if (!connection) throw new Error("TEST_ACCOMMODATION_DATABASE_URL required");
const target = new URL(connection);
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
  target.pathname !== "/accommodation_test"
)
  throw new Error(
    "Only a disposable local accommodation_test database is allowed",
  );
const sql = postgres(connection, { max: 8, onnotice: () => {} });
const migration = async (path) => {
  const client = postgres(connection, { max: 1, onnotice: () => {} });
  try {
    await client.unsafe(readFileSync(path, "utf8")).simple();
  } finally {
    await client.end();
  }
};
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1),
  otherOwner = id(2),
  editor = id(3),
  guest = id(4);
const venue = id(10),
  otherVenue = id(11),
  type = id(20),
  unit = id(30);
const auth = (user, fn) =>
  sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claim.sub', ${user}, true)`;
    await tx.unsafe("set local role authenticated");
    return fn(tx);
  });
const denied = (
  fn,
  pattern = /permission denied|row-level security|unavailable|exclusion constraint/,
) => assert.rejects(fn, (e) => pattern.test(e.message));
let count = 0;
const check = (name) => console.log(`PASS ${++count}: ${name}`);
try {
  await sql
    .unsafe(
      `
    do $$ begin
      if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if;
      if not exists(select from pg_roles where rolname='anon') then create role anon; end if;
      if not exists(select from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
    end $$;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth,public to anon,authenticated,service_role;
    create type public.venue_member_role as enum ('owner','manager','editor');
    create table public.venues(id uuid primary key, discovery_vertical text, status text, name text);
    create table public.profiles(id uuid primary key);
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    grant select on public.venues to authenticated,anon;
    create table public.venue_members(venue_id uuid references public.venues(id), profile_id uuid, role public.venue_member_role);
    create function public.is_venue_member(target_venue uuid, allowed_roles public.venue_member_role[] default array['owner','manager','editor']::public.venue_member_role[])
      returns boolean language sql stable security definer set search_path='' as $$
      select exists(select from public.venue_members where venue_id=target_venue and profile_id=auth.uid() and role=any(allowed_roles)) $$;
  `,
    )
    .simple();
  await migration(
    "supabase/migrations/20261009220000_accommodation_inventory_foundation.sql",
  );
  check("candidate migration executes in PostgreSQL, including btree_gist");
  for (const user of [owner, otherOwner, editor, guest])
    await sql`insert into public.profiles values(${user})`;
  await sql`insert into public.venues values(${venue},'accommodation','published','Test stay'),(${otherVenue},'accommodation','published','Other stay')`;
  await sql`insert into public.venue_members values(${venue},${owner},'owner'),(${otherVenue},${otherOwner},'owner'),(${venue},${editor},'editor')`;
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_room_types(id,venue_id,name,max_guests) values(${type},${venue},'Double',2)`,
  );
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_units(id,venue_id,room_type_id,name) values(${unit},${venue},${type},'Room 1')`,
  );
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_nightly_rates(venue_id,room_type_id,start_date,end_date_exclusive,nightly_price_cents) values(${venue},${type},'2027-03-01','2027-04-01',10000)`,
  );
  for (const user of [otherOwner, editor, guest]) {
    assert.equal(
      (await auth(user, (tx) => tx`select * from public.accommodation_units`))
        .length,
      0,
    );
    await denied(() =>
      auth(
        user,
        (tx) =>
          tx`insert into public.accommodation_room_types(venue_id,name,max_guests) values(${venue},'Denied',2)`,
      ),
    );
    assert.equal(
      (
        await auth(
          user,
          (tx) =>
            tx`update public.accommodation_units set name='Denied' where id=${unit} returning id`,
        )
      ).length,
      0,
    );
    assert.equal(
      (
        await auth(
          user,
          (tx) =>
            tx`delete from public.accommodation_units where id=${unit} returning id`,
        )
      ).length,
      0,
    );
  }
  await denied(() =>
    auth(
      owner,
      (tx) =>
        tx`update public.accommodation_units set venue_id=${otherVenue} where id=${unit}`,
    ),
  );
  await denied(() =>
    sql.begin(async (tx) => {
      await tx.unsafe("set local role anon");
      return tx`select * from public.accommodation_units`;
    }),
  );
  check(
    "owner CRUD works; editor, guest, other owner and anon cannot access inventory",
  );
  await denied(() =>
    auth(
      owner,
      (tx) =>
        tx`insert into public.accommodation_nightly_rates(venue_id,room_type_id,start_date,end_date_exclusive,nightly_price_cents) values(${venue},${type},'2027-03-20','2027-04-10',12000)`,
    ),
  );
  const reserve = (tx, key, arrival = "2027-03-27", departure = "2027-03-29") =>
    tx`insert into public.accommodation_reservations(venue_id,unit_id,check_in,check_out,guests,contact_name,contact_email,quoted_total_cents,idempotency_key) values(${venue},${unit},${arrival},${departure},2,'Test guest','guest@example.invalid',20000,${key}) returning id`;
  await denied(() => auth(guest, (tx) => reserve(tx, id(100))));
  await denied(() => auth(owner, (tx) => reserve(tx, id(101))));
  const [reservation] = await reserve(sql, id(102));
  await denied(() => reserve(sql, id(103)));
  await reserve(sql, id(104), "2027-03-29", "2027-03-30");
  await denied(() =>
    auth(
      owner,
      (tx) =>
        tx`insert into public.accommodation_unit_blocks(venue_id,unit_id,start_date,end_date_exclusive) values(${venue},${unit},'2027-03-28','2027-03-29')`,
    ),
  );
  assert.equal(
    (
      await auth(
        guest,
        (tx) => tx`select * from public.accommodation_reservations`,
      )
    ).length,
    0,
  );
  await denied(() =>
    auth(
      owner,
      (tx) =>
        tx`update public.accommodation_reservations set status='confirmed' where id=${reservation.id}`,
    ),
  );
  await sql`update public.accommodation_reservations set status='cancelled' where id=${reservation.id}`;
  await reserve(sql, id(105));
  check(
    "half-open checkout, DST nights, cancellation/rebooking, rate overlaps and denied guest writes",
  );
  for (const reverse of [false, true]) {
    const start = reverse ? "2027-04-10" : "2027-04-01";
    const end = reverse ? "2027-04-12" : "2027-04-03";
    let release;
    const locked = new Promise((resolve) => {
      release = resolve;
    });
    const first = sql.begin(async (tx) => {
      if (reverse) await reserve(tx, id(200), start, end);
      else await authBlock(tx, start, end);
      release();
      await tx`select pg_sleep(0.3)`;
    });
    await locked;
    const second = reverse
      ? auth(owner, (tx) => authBlock(tx, start, end))
      : sql.begin((tx) => reserve(tx, id(201), start, end));
    const result = await Promise.allSettled([first, second]);
    assert.equal(result[0].status, "fulfilled");
    assert.equal(result[1].status, "rejected");
    assert.match(result[1].reason.message, /unavailable/);
  }
  check("concurrent reservation/block writes serialize in both directions");
  const race = await Promise.allSettled([
    sql.begin((tx) => reserve(tx, id(300), "2027-05-01", "2027-05-03")),
    sql.begin((tx) => reserve(tx, id(301), "2027-05-01", "2027-05-03")),
  ]);
  assert.equal(race.filter((r) => r.status === "fulfilled").length, 1);
  check("concurrent last-unit reservations cannot both succeed");
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_booking_settings(venue_id,mode,policy) values(${venue},'request','All taxes included. Pay at property. Free cancellation before arrival.')`,
  );
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_nightly_rates(venue_id,room_type_id,start_date,end_date_exclusive,nightly_price_cents,minimum_nights) values(${venue},${type},'2027-06-01','2027-06-15',12000,2),(${venue},${type},'2027-06-15','2027-07-01',15000,2)`,
  );
  const quote = (
    user = guest,
    arrival = "2027-06-14",
    departure = "2027-06-16",
  ) =>
    auth(
      user,
      (tx) =>
        tx`select public.accommodation_create_quote(${type}::uuid,${arrival}::date,${departure}::date,2) as q`,
    );
  const q = (await quote())[0].q;
  assert.equal(q.snapshot.total_cents, 27000);
  assert.equal(q.snapshot.nights, 2);
  assert.equal(q.snapshot.prices.length, 2);
  await denied(
    () => quote(guest, "2027-06-14", "2027-06-15"),
    /Rates unavailable/,
  );
  await denied(
    () => quote(guest, "2027-07-01", "2027-07-03"),
    /Rates unavailable/,
  );
  await denied(
    () =>
      auth(
        guest,
        (tx) =>
          tx`select public.accommodation_create_quote(${type}::uuid,'2027-06-14','2027-06-16',3)`,
      ),
    /Room unavailable/,
  );
  check(
    "server quote covers every night, seasonal totals, capacity and minimum stay",
  );
  const book = (user, quoteId, key) =>
    auth(
      user,
      (tx) =>
        tx`select public.accommodation_request_booking(${quoteId}::uuid,${key}::uuid,'Test guest','guest@example.invalid','en') as id`,
    );
  await denied(() => book(otherOwner, q.id, id(400)), /Quote unavailable/);
  const results = await Promise.all([
    book(guest, q.id, id(401)),
    book(guest, q.id, id(401)),
  ]);
  assert.equal(results[0][0].id, results[1][0].id);
  const bookingId = results[0][0].id;
  assert.equal(
    (
      await auth(
        guest,
        (tx) => tx`select * from public.accommodation_reservations`,
      )
    ).length,
    1,
  );
  await denied(
    () =>
      auth(
        guest,
        (tx) =>
          tx`select public.accommodation_change_status(${bookingId}::uuid,'confirmed')`,
      ),
    /Not authorized/,
  );
  await denied(
    () =>
      auth(
        editor,
        (tx) =>
          tx`select public.accommodation_change_status(${bookingId}::uuid,'confirmed')`,
      ),
    /Not authorized/,
  );
  await auth(
    owner,
    (tx) =>
      tx`select public.accommodation_change_status(${bookingId}::uuid,'confirmed')`,
  );
  await auth(
    owner,
    (tx) =>
      tx`select public.accommodation_change_status(${bookingId}::uuid,'confirmed')`,
  );
  assert.equal(
    (
      await sql`select * from public.accommodation_confirmation_emails where booking_id=${bookingId}`
    ).length,
    2,
  );
  assert.equal(
    (
      await auth(
        guest,
        (tx) =>
          tx`select * from public.accommodation_confirmation_emails where booking_id=${bookingId}`,
      )
    ).length,
    1,
  );
  await denied(() =>
    auth(
      guest,
      (tx) => tx`select public.claim_accommodation_confirmation_emails()`,
    ),
  );
  const service = (fn) =>
    sql.begin(async (tx) => {
      await tx.unsafe("set local role service_role");
      return fn(tx);
    });
  const leases = await Promise.all([
    service(
      (tx) =>
        tx`select * from public.claim_accommodation_confirmation_emails()`,
    ),
    service(
      (tx) =>
        tx`select * from public.claim_accommodation_confirmation_emails()`,
    ),
  ]);
  assert.equal(leases.flat().length, 1);
  const lease = leases.flat()[0];
  assert.equal(
    (
      await service(
        (tx) =>
          tx`select public.finish_accommodation_confirmation_email(${bookingId}::uuid,'customer',${id(999)}::uuid,true,'message',null,false) as ok`,
      )
    )[0].ok,
    false,
  );
  await service(
    (tx) =>
      tx`select public.finish_accommodation_confirmation_email(${bookingId}::uuid,'customer',${lease.lease_id}::uuid,false,null,'timeout',true)`,
  );
  await sql`update public.accommodation_confirmation_emails set first_attempt_at=now()-interval '25 hours' where booking_id=${bookingId} and audience='customer'`;
  await service(
    (tx) => tx`select * from public.claim_accommodation_confirmation_emails()`,
  );
  assert.equal(
    (
      await sql`select status from public.accommodation_confirmation_emails where booking_id=${bookingId} and audience='customer'`
    )[0].status,
    "review",
  );
  check(
    "approval outbox dedupes; leases cannot double-send, wrong acknowledgments fail, ambiguous old mail is held",
  );
  await auth(
    guest,
    (tx) =>
      tx`select public.accommodation_change_status(${bookingId}::uuid,'cancelled')`,
  );
  await denied(
    () =>
      auth(
        owner,
        (tx) =>
          tx`select public.accommodation_change_status(${bookingId}::uuid,'confirmed')`,
      ),
    /Invalid reservation transition/,
  );
  assert.equal(
    (
      await auth(
        guest,
        (tx) =>
          tx`select * from public.accommodation_booking_audit where reservation_id=${bookingId}`,
      )
    ).length,
    3,
  );
  assert.equal(
    (
      await auth(
        otherOwner,
        (tx) =>
          tx`select * from public.accommodation_booking_audit where reservation_id=${bookingId}`,
      )
    ).length,
    0,
  );
  check(
    "atomic idempotent booking, customer read/cancel, manager approval and private audit",
  );
  const fresh = (await quote())[0].q;
  await auth(
    owner,
    (tx) =>
      tx`update public.accommodation_nightly_rates set nightly_price_cents=16000 where room_type_id=${type} and start_date='2027-06-15'`,
  );
  await denied(() => book(guest, fresh.id, id(402)), /Quote changed/);
  const last1 = (await quote())[0].q;
  const last2 = (await quote(otherOwner))[0].q;
  const lastRace = await Promise.allSettled([
    book(guest, last1.id, id(403)),
    book(otherOwner, last2.id, id(404)),
  ]);
  assert.equal(lastRace.filter((r) => r.status === "fulfilled").length, 1);
  const publicRooms = await sql.begin(async (tx) => {
    await tx.unsafe("set local role anon");
    return tx`select public.accommodation_available_rooms(${venue}::uuid,'2027-06-14','2027-06-16',2) as rooms`;
  });
  assert.deepEqual(publicRooms[0].rooms, []);
  check(
    "changed quotes rejected; competing RPC requests cannot reserve the last room twice",
  );
  const exp = (await quote(guest, "2027-06-20", "2027-06-22"))[0].q;
  await sql`update public.accommodation_quotes set expires_at=now()-interval '1 second' where id=${exp.id}`;
  await denied(() => book(guest, exp.id, id(501)), /Quote expired/);
  await auth(
    owner,
    (tx) =>
      tx`update public.accommodation_booking_settings set mode='disabled' where venue_id=${venue}`,
  );
  assert.deepEqual(
    (
      await sql`select public.accommodation_available_rooms(${venue}::uuid,'2027-06-20','2027-06-22',2) as rooms`
    )[0].rooms,
    [],
  );
  await denied(
    () => quote(guest, "2027-06-20", "2027-06-22"),
    /Booking unavailable/,
  );
  check("expired quotes and disabled properties cannot accept requests");
  // Both transactions establish a snapshot before either occupancy write commits.
  let unlock;
  const ready = new Promise((resolve) => {
    unlock = resolve;
  });
  const writer = sql.begin(async (tx) => {
    await authBlock(tx, "2027-08-01", "2027-08-03");
    unlock();
    await tx`select pg_sleep(0.3)`;
  });
  await ready;
  const stale = sql.begin("isolation level repeatable read", async (tx) => {
    await tx`select count(*) from public.accommodation_unit_blocks`;
    return reserve(tx, id(502), "2027-08-01", "2027-08-03");
  });
  const isolation = await Promise.allSettled([writer, stale]);
  assert.equal(isolation[0].status, "fulfilled");
  assert.equal(isolation[1].status, "rejected");
  assert.match(isolation[1].reason.message, /serialize|unavailable/);
  check(
    "repeatable-read snapshot races fail safely instead of hiding conflicts",
  );
  if (process.env.KEEP_ACCOMMODATION_TEST_DB !== "1") {
    await migration("database/operations/rollback-accommodation-bookings.sql");
    assert.equal(
      (
        await sql`select to_regclass('public.accommodation_reservations') as table`
      )[0].table,
      null,
    );
    check("candidate rollback executes cleanly and leaves legacy tables alone");
  }
  console.log(
    `ACCOMMODATION SQL ACCEPTANCE: ${count} groups passed; disposable local data only.`,
  );
} finally {
  await sql.end();
}
function authBlock(tx, start, end) {
  return tx`insert into public.accommodation_unit_blocks(venue_id,unit_id,start_date,end_date_exclusive) values(${venue},${unit},${start},${end})`;
}
