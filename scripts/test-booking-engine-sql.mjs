import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const connection = process.env.TEST_BOOKING_DATABASE_URL;
if (!connection) throw new Error("TEST_BOOKING_DATABASE_URL required");
const target = new URL(connection);
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
  target.pathname !== "/booking_test"
)
  throw new Error(
    "Acceptance tests require a disposable local booking_test database",
  );
const sql = postgres(connection, { max: 8, onnotice: () => {} });
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1),
  customer = id(2),
  stranger = id(3),
  editor = id(4),
  otherOwner = id(5);
const venue = id(10),
  otherVenue = id(11),
  resource = id(20),
  offering = id(30);
const auth = (user, fn) =>
  sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claim.sub', ${user}, true)`;
    await tx.unsafe("set local role authenticated");
    return fn(tx);
  });
const service = (fn) =>
  sql.begin(async (tx) => {
    await tx.unsafe("set local role service_role");
    return fn(tx);
  });
const rejected = (fn, pattern) =>
  assert.rejects(fn, (e) => pattern.test(e.message));
let passed = 0;
const check = (name) => {
  passed++;
  console.log(`PASS ${passed}: ${name}`);
};
try {
  await sql
    .unsafe(
      `
    create role authenticated;
    create role anon;
    create role service_role bypassrls;
    create schema auth;
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth,public to authenticated,anon,service_role;
    grant execute on function auth.uid() to authenticated,anon,service_role;
    create type public.venue_member_role as enum ('owner','manager','editor');
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create table public.profiles(id uuid primary key references auth.users(id),app_role text default 'consumer');
    create table public.venues(id uuid primary key,name text,slug text,address text,status text default 'published');
    create table public.venue_members(venue_id uuid references public.venues(id),profile_id uuid references public.profiles(id),role public.venue_member_role);
    create table public.events(id uuid primary key,venue_id uuid references public.venues(id),status text);
    create table public.venue_booking_settings(venue_id uuid primary key references public.venues(id),mode text not null,active boolean not null default true);
    create table public.venue_availability_slots(id uuid primary key default gen_random_uuid(),venue_id uuid references public.venues(id),starts_at timestamptz not null,ends_at timestamptz not null,capacity int check(capacity between 1 and 10000),active boolean default true,check(ends_at>starts_at));
    create table public.booking_requests(id uuid primary key default gen_random_uuid(),profile_id uuid references public.profiles(id) not null,venue_id uuid references public.venues(id) not null,event_id uuid references public.events(id),slot_id uuid references public.venue_availability_slots(id),party_size int not null check(party_size between 1 and 100),contact_name text not null,contact_email text not null,contact_phone text,notes text,status text not null default 'requested' check(status in ('requested','confirmed','declined','completed','cancelled')),created_at timestamptz default now(),updated_at timestamptz default now());
    create function public.is_venue_member(target_venue uuid,allowed_roles public.venue_member_role[] default array['owner','manager','editor']::public.venue_member_role[])
      returns boolean language sql stable security definer set search_path='' as $$
        select exists(select 1 from public.profiles where id=auth.uid() and app_role='administrator')
        or exists(select 1 from public.venue_members where venue_id=target_venue and profile_id=auth.uid() and role=any(allowed_roles))
      $$;
    grant select on public.venues,public.venue_booking_settings,public.venue_availability_slots,public.booking_requests to authenticated;
    grant select on public.venues,public.venue_booking_settings,public.venue_availability_slots to anon;
    grant update on public.booking_requests to authenticated;
    grant insert,update,delete on public.venue_availability_slots to authenticated;
    grant all on all tables in schema public to service_role;
    alter table public.booking_requests enable row level security;
    create policy booking_requests_read on public.booking_requests for select to authenticated using(profile_id=auth.uid() or public.is_venue_member(venue_id));
    create policy booking_requests_update on public.booking_requests for update to authenticated using(profile_id=auth.uid() or public.is_venue_member(venue_id)) with check(profile_id=auth.uid() or public.is_venue_member(venue_id));
    alter table public.venue_availability_slots enable row level security;
    create policy booking_slots_manage on public.venue_availability_slots for all to authenticated using(public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[])) with check(public.is_venue_member(venue_id,array['owner','manager']::public.venue_member_role[]));
    create policy booking_slots_public_read on public.venue_availability_slots for select to anon,authenticated using((active and starts_at>now()) or public.is_venue_member(venue_id));
  `,
    )
    .simple();
  const migrationSql = postgres(connection, { max: 1, onnotice: () => {} });
  try {
    for (const file of [
      "20261009113000_booking_offerings.sql",
      "20261009115000_booking_resources.sql",
      "20261009120000_recurring_booking_slots.sql",
      "20261009160000_booking_notification_email.sql",
      "20261009170000_booking_release_integrity.sql",
    ])
      await sql
        .unsafe(readFileSync(`supabase/migrations/${file}`, "utf8"))
        .simple();
  } finally {
    await migrationSql.end();
  }

  check("all additive release migrations compile in PostgreSQL");
  for (const user of [owner, customer, stranger, editor, otherOwner]) {
    await sql`insert into auth.users values(${user},${`${user}@example.com`},now())`;
    await sql`insert into public.profiles(id) values(${user})`;
  }
  await sql`insert into public.venues values(${venue},'Example venue','example','Test address','published'),(${otherVenue},'Other venue','other','Other address','published')`;
  await sql`insert into public.venue_members values(${venue},${owner},'owner'),(${venue},${editor},'editor'),(${otherVenue},${otherOwner},'owner')`;
  await sql`insert into public.venue_booking_settings(venue_id,mode) values(${venue},'request'),(${otherVenue},'request')`;
  await auth(
    owner,
    (tx) =>
      tx`insert into public.booking_resources(id,venue_id,name,kind,capacity) values(${resource},${venue},'Vehicle 1','vehicle',2)`,
  );
  await auth(
    owner,
    (tx) =>
      tx`insert into public.booking_offerings(id,venue_id,name,kind,duration_minutes,capacity) values(${offering},${venue},'Tour','experience',60,2)`,
  );
  await rejected(
    () =>
      auth(
        stranger,
        (tx) =>
          tx`insert into public.booking_resources(venue_id,name,kind,capacity) values(${venue},'Bad','vehicle',2)`,
      ),
    /row-level security/,
  );
  const schedule = (tx) =>
    tx`select public.create_recurring_booking_slots(${venue}::uuid,current_date+14,current_date+20,array[1,2,3,4,5,6,7],'09:30'::time,60,2,${resource}::uuid,${offering}::uuid) as n`;
  assert.equal((await auth(owner, schedule))[0].n, 7);
  assert.equal((await auth(owner, schedule))[0].n, 0);
  await rejected(() => auth(editor, schedule), /not authorized/);
  await rejected(() => auth(stranger, schedule), /not authorized/);
  check("actual owner/editor/stranger roles and recurring idempotency");
  const [slot] =
    await sql`select * from public.venue_availability_slots where resource_id=${resource} order by starts_at`;
  await rejected(
    () =>
      auth(
        owner,
        (tx) =>
          tx`insert into public.venue_availability_slots(venue_id,resource_id,starts_at,ends_at,capacity) values(${venue},${resource},${new Date(+slot.starts_at + 60000)},${new Date(+slot.ends_at + 60000)},1)`,
      ),
    /exclusion constraint/,
  );
  await rejected(
    () =>
      auth(
        owner,
        (tx) =>
          tx`insert into public.venue_availability_slots(venue_id,resource_id,starts_at,ends_at,capacity) values(${venue},${resource},now()+interval '60 days',now()+interval '60 days 1 hour',3)`,
      ),
    /resource capacity/,
  );
  await rejected(
    () =>
      auth(
        owner,
        (tx) =>
          tx`insert into public.venue_availability_slots(venue_id,offering_id,starts_at,ends_at,capacity) values(${venue},${offering},now()+interval '60 days',now()+interval '60 days 1 hour',3)`,
      ),
    /offering capacity/,
  );
  await rejected(
    () =>
      auth(
        otherOwner,
        (tx) =>
          tx`insert into public.venue_availability_slots(venue_id,offering_id,starts_at,ends_at,capacity) values(${otherVenue},${offering},now()+interval '60 days',now()+interval '60 days 1 hour',1)`,
      ),
    /offering unavailable|foreign key/,
  );
  check("resource overlap, capacity and cross-tenant offerings are denied");
  const [[dst]] = await Promise.all([
    sql`select (make_date(extract(year from current_date)::int+1,3,31)-extract(dow from make_date(extract(year from current_date)::int+1,3,31))::int)::text as date`,
  ]);
  await rejected(
    () =>
      auth(
        owner,
        (tx) =>
          tx`select public.create_recurring_booking_slots(${venue}::uuid,${dst.date}::date,${dst.date}::date,array[7],'02:30'::time,60,1)`,
      ),
    /nonexistent local time/,
  );
  check("impossible spring DST civil times rejected");
  const request = (user, key, party = 1, slotId = slot.id) =>
    auth(
      user,
      (tx) =>
        tx`select public.request_booking_v2(${slotId}::uuid,null,${party},'Test guest','guest@example.com','','',${key}::uuid,'en',${venue}::uuid) as id`,
    );
  const key = id(101);
  const first = (await request(customer, key))[0].id;
  assert.equal((await request(customer, key))[0].id, first);
  await rejected(() => request(customer, key, 2), /request key reused/);
  assert.equal(
    (await sql`select count(*)::int as n from public.booking_requests`)[0].n,
    1,
  );
  check("same request key does not reserve twice, changed payload is rejected");
  const race = await Promise.allSettled([
    request(stranger, id(102)),
    request(otherOwner, id(103)),
  ]);
  assert.equal(race.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(
    (
      await sql`select sum(party_size)::int as n from public.booking_requests where slot_id=${slot.id}`
    )[0].n,
    2,
  );
  const publicSlots = await sql.begin(async (tx) => {
    await tx.unsafe("set local role anon");
    return tx`select * from public.booking_available_slots(${venue}::uuid)`;
  });
  assert.equal(publicSlots.find((x) => x.id === slot.id).remaining, 0);
  assert.equal(
    Object.keys(publicSlots[0]).some((k) => /contact|email|profile/.test(k)),
    false,
  );
  check(
    "concurrent final seat requests cannot overbook and aggregate reads contain no PII",
  );
  await rejected(
    () =>
      auth(
        customer,
        (tx) =>
          tx`update public.booking_requests set status='confirmed' where id=${first}`,
      ),
    /venue manager required/,
  );
  await rejected(
    () =>
      auth(
        customer,
        (tx) =>
          tx`update public.booking_requests set party_size=99 where id=${first}`,
      ),
    /permission denied/,
  );
  await rejected(
    () =>
      auth(
        editor,
        (tx) =>
          tx`select public.approve_booking_and_queue_emails(${venue}::uuid,${first}::uuid)`,
      ),
    /venue manager required/,
  );
  assert.equal(
    (
      await auth(
        stranger,
        (tx) => tx`select id from public.booking_requests where id=${first}`,
      )
    ).length,
    0,
  );
  check(
    "customers cannot approve, rewrite capacity or read another customer; editor cannot approve",
  );
  await auth(
    owner,
    (tx) =>
      tx`insert into public.booking_notification_settings values(${venue},'owner-inbox@example.com','es')`,
  );
  assert.equal(
    (
      await auth(
        customer,
        (tx) =>
          tx`select * from public.booking_notification_settings where venue_id=${venue}`,
      )
    ).length,
    0,
  );
  const approve = () =>
    auth(
      owner,
      (tx) =>
        tx`select public.approve_booking_and_queue_emails(${venue}::uuid,${first}::uuid) as ok`,
    );
  const approvals = await Promise.all([approve(), approve()]);
  assert.equal(approvals.filter((x) => x[0].ok).length, 1);
  const emails =
    await sql`select * from public.booking_confirmation_emails where booking_id=${first} order by audience`;
  assert.equal(emails.length, 2);
  assert.equal(emails[0].payload.locale, "en");
  assert.equal(emails[1].payload.locale, "es");
  assert.equal(emails[0].recipient, "guest@example.com");
  assert.equal(emails[1].recipient, "owner-inbox@example.com");
  await rejected(
    () =>
      auth(
        owner,
        (tx) =>
          tx`insert into public.booking_confirmation_emails(booking_id,venue_id,audience,payload) values(${first},${venue},'customer','{}')`,
      ),
    /permission denied/,
  );
  await rejected(
    () =>
      auth(
        customer,
        (tx) => tx`select public.claim_booking_confirmation_emails()`,
      ),
    /permission denied/,
  );
  check(
    "approval creates two immutable private audience snapshots exactly once",
  );
  const claims = await Promise.all([
    service(
      (tx) => tx`select * from public.claim_booking_confirmation_emails()`,
    ),
    service(
      (tx) => tx`select * from public.claim_booking_confirmation_emails()`,
    ),
  ]);
  assert.equal(claims.flat().length, 2);
  const lease = claims.flat()[0];
  const wrong = await service(
    (tx) =>
      tx`select public.finish_booking_confirmation_email(${lease.booking_id}::uuid,${lease.audience},${id(999)}::uuid,true,'provider','',false) as ok`,
  );
  assert.equal(wrong[0].ok, false);
  await service(
    (tx) =>
      tx`select public.finish_booking_confirmation_email(${lease.booking_id}::uuid,${lease.audience},${lease.lease_id}::uuid,false,null,'provider_timeout',true)`,
  );
  await sql`update public.booking_confirmation_emails set first_attempt_at=now()-interval '25 hours' where booking_id=${lease.booking_id} and audience=${lease.audience}`;
  await service(
    (tx) => tx`select * from public.claim_booking_confirmation_emails()`,
  );
  assert.equal(
    (
      await sql`select status from public.booking_confirmation_emails where booking_id=${lease.booking_id} and audience=${lease.audience}`
    )[0].status,
    "review",
  );
  check(
    "outbox leasing is concurrency-safe; stale acknowledgments and >24h uncertain resends denied",
  );
  const other = claims.flat()[1];
  await sql`update public.booking_confirmation_emails set attempted_at=now()-interval '11 minutes' where booking_id=${other.booking_id} and audience=${other.audience}`;
  assert.equal(
    (
      await service(
        (tx) => tx`select * from public.claim_booking_confirmation_emails()`,
      )
    ).length,
    1,
  );
  check("crashed sender leases are recoverable");
  await auth(
    customer,
    (tx) =>
      tx`update public.booking_requests set status='cancelled' where id=${first}`,
  );
  await rejected(approve, /invalid booking transition/);
  assert.equal(
    (
      await service(
        (tx) => tx`select * from public.claim_booking_confirmation_emails()`,
      )
    ).length,
    0,
  );
  assert.equal(
    (
      await auth(
        customer,
        (tx) => tx`select public.my_booking_history('past',0) as h`,
      )
    )[0].h.bookings[0].id,
    first,
  );
  check(
    "customer cancellation releases places, cancels unsent email and cannot be reopened",
  );
  const pastSlot = id(800),
    pastBooking = id(801);
  await sql`insert into public.venue_availability_slots(id,venue_id,starts_at,ends_at,capacity,active) values(${pastSlot},${venue},now()-interval '2 days',now()-interval '1 day',100,false)`;
  await sql`insert into public.booking_requests(id,profile_id,venue_id,slot_id,party_size,contact_name,contact_email,status,created_at) values(${pastBooking},${customer},${venue},${pastSlot},1,'Past guest','guest@example.com','completed',now()-interval '5 days')`;
  assert.equal(
    (
      await auth(
        customer,
        (tx) =>
          tx`select * from public.venue_availability_slots where id=${pastSlot}`,
      )
    ).length,
    0,
  );
  const history = (
    await auth(
      customer,
      (tx) => tx`select public.my_booking_history('past',0) as h`,
    )
  )[0].h;
  assert.ok(history.bookings.find((x) => x.id === pastBooking).slot.starts_at);
  assert.equal(
    (
      await auth(
        stranger,
        (tx) => tx`select public.my_booking_history('past',0) as h`,
      )
    )[0].h.bookings.some((x) => x.id === pastBooking),
    false,
  );
  for (let n = 0; n < 22; n++)
    await sql`insert into public.booking_requests(profile_id,venue_id,slot_id,party_size,contact_name,contact_email,status,created_at) values(${customer},${venue},${pastSlot},1,'Past guest','guest@example.com','completed',now()-interval '5 days')`;
  const page1 = (
    await auth(
      customer,
      (tx) => tx`select public.my_booking_history('past',0) as h`,
    )
  )[0].h;
  const page2 = (
    await auth(
      customer,
      (tx) => tx`select public.my_booking_history('past',1) as h`,
    )
  )[0].h;
  assert.equal(page1.counts.past, 24);
  assert.equal(page1.bookings.length, 20);
  assert.equal(page2.bookings.length, 4);
  check(
    "own historical inactive slots retain date metadata and history is paginated without leakage",
  );
  await sql`update public.booking_resources set active=false where id=${resource}`;
  const [future] =
    await sql`select id from public.venue_availability_slots where resource_id=${resource} order by starts_at desc`;
  await rejected(
    () => request(customer, id(600), 1, future.id),
    /resource unavailable/,
  );
  await sql`update public.booking_resources set active=true where id=${resource}`;
  await sql`update public.venue_booking_settings set mode='disabled' where venue_id=${venue}`;
  await rejected(
    () => request(customer, id(601), 1, future.id),
    /booking unavailable/,
  );
  assert.equal(
    (
      await auth(
        customer,
        (tx) =>
          tx`select * from public.booking_available_slots(${venue}::uuid)`,
      )
    ).length,
    0,
  );
  check("inactive resources and disabled mode cannot accept bookings");
  console.log(
    `BOOKING RELEASE ACCEPTANCE: ${passed} groups passed; no production database or email provider used.`,
  );
} finally {
  await sql.end();
}
