import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
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
// Original complete concurrency/RLS acceptance first creates real legacy history.
execFileSync(process.execPath, ["scripts/test-accommodation-sql.mjs"], {
  env: { ...process.env, KEEP_ACCOMMODATION_TEST_DB: "1" },
  stdio: "inherit",
});
const sql = postgres(connection, { max: 8, onnotice: () => {} });
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const owner = id(1),
  other = id(2),
  editor = id(3),
  guest = id(4),
  legacy = id(10);
const auth = (user, fn) =>
  sql.begin(async (tx) => {
    await tx`select set_config('request.jwt.claim.sub',${user},true)`;
    await tx.unsafe("set local role authenticated");
    return fn(tx);
  });
const denied = (fn) => assert.rejects(fn);
const publicRead = (fn) =>
  sql.begin(async (tx) => {
    await tx.unsafe("set local role anon");
    return fn(tx);
  });
let count = 0;
const check = (name) => console.log(`PASS independent ${++count}: ${name}`);
try {
  await sql
    .unsafe(
      `
    create type public.app_role as enum('consumer','moderator','administrator');
    alter table public.profiles add column preferred_locale text default 'es';
    alter table public.profiles add column app_role public.app_role not null default 'consumer';
    create function public.has_platform_role(roles public.app_role[]) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=auth.uid() and app_role=any(roles))$$;
    create table public.cities(id uuid primary key,name_es text);
    alter table public.venues add column slug text,add column address text,add column city_id uuid,add column location text,add column accommodation_type text,add column website_url text,add column description_es text,add column description_en text,add column verified boolean default false,add column search_document tsvector,add column discovery_enabled boolean default true;
    create function public.venue_relevance_enabled() returns boolean language sql as $$select true$$;
    create function public.venue_search_normalize(text) returns text language sql immutable as $$select lower(translate($1,'áéíóúÁÉÍÓÚ','aeiouAEIOU'))$$;
    create function public.public_stay_viewport(float8,float8,float8,float8,text,text) returns jsonb language plpgsql as $$begin if $1 is null or $2 is null or $3 is null or $4 is null or $1 >= $2 or $3 >= $4 then raise exception 'invalid bounds';end if;return '{"markers":[],"truncated":false}'::jsonb;end$$;
    create table public.suite_saved_stays(profile_id uuid,venue_id uuid not null references public.venues(id),locale text default 'es',saved_at timestamptz default now(),primary key(profile_id,venue_id));
    alter table public.suite_saved_stays enable row level security;
    grant select on public.suite_saved_stays to authenticated;
    create policy saved_own on public.suite_saved_stays for select to authenticated using(profile_id=auth.uid());
    create function public.suite_save_stay(uuid,boolean,text) returns boolean language sql as $$select false$$;
    revoke all on function public.suite_save_stay(uuid,boolean,text) from public,anon;
    grant execute on function public.suite_save_stay(uuid,boolean,text) to authenticated;
    create table public.crm_workspaces(id text primary key, owner_profile_id uuid,source_venue_id uuid unique,status text);
    create table public.crm_workspace_members(workspace_id text,profile_id uuid,role text,status text);
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,delete on storage.objects to anon,authenticated;
    alter table auth.users add column deleted_at timestamptz;
    create table public.suite_email_preferences(profile_id uuid,event_reminders boolean,stay_reminders boolean);
    create table public.saved_event_refs(profile_id uuid,event_key text,created_at timestamptz);
    create table public.event_occurrences(id uuid,event_id uuid,starts_at timestamptz,status text);
    create table public.events(id uuid,status text,title_es text,title_en text,slug text);
    create table public.suite_email_outbox(available_at timestamptz,dedupe_key text unique,kind text,profile_id uuid,recipient text,locale text,payload jsonb);
  `,
    )
    .simple();
  for (const user of [owner, other, editor, guest])
    await sql`insert into auth.users(id,email,email_confirmed_at) values(${user},${user + "@example.invalid"},now())`;
  await sql`insert into public.crm_workspaces values('location-one',${owner},${legacy},'active'),('private-two',${other},null,'active')`;
  await sql`insert into public.crm_workspace_members values('location-one',${owner},'owner','active'),('private-two',${other},'owner','active')`;
  await sql`insert into public.accommodation_room_types(venue_id,name,max_guests) values(${id(11)},'Historical stay',2)`;
  await sql`update public.venues set discovery_vertical='activities',name=${"L".repeat(200)} where id=${id(11)}`;
  const before =
    await sql`select id,venue_id,unit_id,status,quote_snapshot from public.accommodation_reservations order by id`;
  const migration = readFileSync(
    "supabase/migrations/20261016010000_independent_accommodation_properties.sql",
    "utf8",
  );
  assert.equal(
    migration,
    readFileSync(
      "database/migrations/20261016010000_independent_accommodation_properties.sql",
      "utf8",
    ),
  );
  const migrator = postgres(connection, { max: 1, onnotice: () => {} });
  try {
    await migrator.unsafe(migration).simple();
  } finally {
    await migrator.end();
  }
  await sql
    .unsafe(
      "create trigger suite_stay_booking_requested after insert on public.accommodation_reservations for each row execute function public.queue_suite_stay_lifecycle();create trigger suite_stay_booking_cancelled after update of status on public.accommodation_reservations for each row execute function public.queue_suite_stay_lifecycle();",
    )
    .simple();
  assert.deepEqual(
    await sql`select id,venue_id,unit_id,status,quote_snapshot from public.accommodation_reservations order by id`,
    before,
  );
  assert.equal(
    (
      await sql`select count(*)::int n from public.accommodation_reservations where property_id is distinct from venue_id`
    )[0].n,
    0,
  );
  assert.equal(
    (
      await sql`select workspace_id from public.accommodation_properties where id=${legacy}`
    )[0].workspace_id,
    "location-one",
  );
  assert.equal(
    (await sql`select count(*)::int n from public.crm_workspace_members`)[0].n,
    2,
  );
  assert.equal(
    (
      await sql`select status from public.accommodation_properties where id=${id(11)}`
    )[0].status,
    "private",
  );
  assert.equal(
    (
      await sql`select name from public.accommodation_properties where id=${id(11)}`
    )[0].name.length,
    200,
  );
  check(
    "actual legacy bookings/quotes/status/IDs preserved, exact existing workspace links retained",
  );
  await denied(() =>
    publicRead(
      (tx) => tx`select public.create_accommodation_property('Denied',null)`,
    ),
  );
  await denied(() =>
    auth(
      owner,
      (tx) =>
        tx`select public.create_accommodation_property('Denied','private-two')`,
    ),
  );
  const property = (
    await auth(
      owner,
      (tx) =>
        tx`select public.create_accommodation_property('Private stay',null) id`,
    )
  )[0].id;
  await denied(
    () =>
      sql`insert into public.venues(id,discovery_vertical,status,name) values(${property},'accommodation','published','Identity collision')`,
  );
  const another = (
    await auth(
      other,
      (tx) =>
        tx`select public.create_accommodation_property('Other stay','private-two') id`,
    )
  )[0].id;
  assert.equal((await sql`select count(*)::int n from public.venues`)[0].n, 2);
  assert.equal(
    (
      await sql`select legacy_venue_id from public.accommodation_properties where id=${property}`
    )[0].legacy_venue_id,
    null,
  );
  assert.equal(
    (
      await publicRead(
        (tx) => tx`select public.accommodation_property_public(${property}) p`,
      )
    )[0].p,
    null,
  );
  for (const user of [other, editor, guest])
    assert.equal(
      (
        await auth(
          user,
          (tx) =>
            tx`select * from public.accommodation_properties where id=${property}`,
        )
      ).length,
      0,
    );
  await denied(() =>
    auth(
      owner,
      (tx) =>
        tx`update public.accommodation_properties set status='published' where id=${property}`,
    ),
  );
  check(
    "new private property needs no venue; owner/workspace/publication boundaries enforced",
  );
  const type = id(601),
    unit = id(602);
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_room_types(id,property_id,name,max_guests) values(${type},${property},'Double',2)`,
  );
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_units(id,property_id,room_type_id,name) values(${unit},${property},${type},'101')`,
  );
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_nightly_rates(property_id,room_type_id,start_date,end_date_exclusive,nightly_price_cents) values(${property},${type},'2027-09-01','2027-10-01',10000)`,
  );
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_booking_settings(property_id,mode,policy) values(${property},'request','Taxes included. Pay at property.')`,
  );
  await denied(() =>
    auth(
      other,
      (tx) =>
        tx`insert into public.accommodation_units(property_id,room_type_id,name) values(${another},${type},'Forged')`,
    ),
  );
  await denied(() =>
    auth(
      owner,
      (tx) =>
        tx`update public.accommodation_units set property_id=${legacy} where id=${unit}`,
    ),
  );
  await denied(() =>
    auth(
      owner,
      (tx) =>
        tx`insert into public.accommodation_units(property_id,venue_id,room_type_id,name) values(${property},${legacy},${type},'Mismatch')`,
    ),
  );
  assert.deepEqual(
    (
      await publicRead(
        (tx) =>
          tx`select public.accommodation_available_rooms(${property},'2027-09-10','2027-09-12',2) rooms`,
      )
    )[0].rooms,
    [],
  );
  await sql`insert into public.accommodation_property_members values(${property},${editor},'manager')`;
  assert.equal(
    (
      await auth(
        editor,
        (tx) => tx`select * from public.accommodation_units where id=${unit}`,
      )
    ).length,
    1,
  );
  await sql`delete from public.accommodation_property_members where property_id=${property}`;
  assert.equal(
    (
      await auth(
        editor,
        (tx) => tx`select * from public.accommodation_units where id=${unit}`,
      )
    ).length,
    0,
  );
  check(
    "property inventory CRUD, composite ownership, reassignment denial and immediate revocation",
  );
  // Only disposable database owner publishes. No production flag or public test listing.
  await sql`update public.accommodation_properties set status='published' where id=${property}`;
  const quote = (user) =>
    auth(
      user,
      (tx) =>
        tx`select public.accommodation_create_quote(${type},'2027-09-10','2027-09-12',2) q`,
    );
  const q = (await quote(guest))[0].q;
  assert.equal(q.snapshot.total_cents, 20000);
  const book = (user, qid, key) =>
    auth(
      user,
      (tx) =>
        tx`select public.accommodation_request_booking(${qid},${key},'Test guest',${user + "@example.invalid"},'en') id`,
    );
  await denied(() => book(other, q.id, id(610)));
  const otherQuote = (await quote(other))[0].q;
  const race = await Promise.allSettled([
    book(guest, q.id, id(611)),
    book(other, otherQuote.id, id(612)),
  ]);
  assert.equal(race.filter((x) => x.status === "fulfilled").length, 1);
  const winner = race.find((x) => x.status === "fulfilled").value[0].id;
  const reserved = (
    await sql`select * from public.accommodation_reservations where id=${winner}`
  )[0];
  assert.equal(reserved.property_id, property);
  assert.equal(reserved.venue_id, null);
  await denied(() =>
    auth(
      other,
      (tx) =>
        tx`select public.accommodation_change_status(${winner},'confirmed')`,
    ),
  );
  await auth(
    owner,
    (tx) =>
      tx`select public.accommodation_change_status(${winner},'confirmed')`,
  );
  const mails =
    await sql`select * from public.accommodation_confirmation_emails where booking_id=${winner}`;
  assert.equal(mails.length, 2);
  assert.equal(mails[0].payload.propertyId, property);
  assert.equal(
    mails.find((m) => m.audience === "venue").recipient,
    owner + "@example.invalid",
  );
  await denied(() =>
    auth(
      owner,
      (tx) =>
        tx`insert into public.accommodation_unit_blocks(property_id,unit_id,start_date,end_date_exclusive) values(${property},${unit},'2027-09-11','2027-09-12')`,
    ),
  );
  await auth(
    reserved.profile_id,
    (tx) =>
      tx`select public.accommodation_change_status(${winner},'cancelled')`,
  );
  assert.equal(
    (
      await sql`select count(*)::int n from public.accommodation_confirmation_emails where booking_id=${winner} and status='cancelled'`
    )[0].n,
    2,
  );
  check(
    "independent quote/atomic last-unit request/confirmation/cancellation/outbox without venue",
  );
  const media = id(620),
    path = property + "/test.jpg";
  await auth(
    owner,
    (tx) =>
      tx`insert into storage.objects(bucket_id,name) values('accommodation-media',${path})`,
  );
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_property_media(id,property_id,storage_path) values(${media},${property},${path})`,
  );
  assert.equal(
    (await publicRead((tx) => tx`select * from storage.objects`)).length,
    0,
  );
  await auth(
    owner,
    (tx) =>
      tx`update public.accommodation_property_media set public_position=0 where id=${media}`,
  );
  assert.equal(
    (await publicRead((tx) => tx`select * from storage.objects`)).length,
    1,
  );
  await denied(() =>
    auth(
      other,
      (tx) =>
        tx`insert into storage.objects(bucket_id,name) values('accommodation-media',${property + "/forged.jpg"})`,
    ),
  );
  await sql`update public.accommodation_properties set status='private' where id=${property}`;
  assert.equal(
    (await publicRead((tx) => tx`select * from storage.objects`)).length,
    0,
  );
  check(
    "private media remains hidden until explicit placement and publication; cross-owner writes denied",
  );
  // Legacy writes still submit only venue_id and retain old upsert identity.
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_room_types(venue_id,name,max_guests) values(${legacy},'Legacy compatible',2)`,
  );
  await auth(
    owner,
    (tx) =>
      tx`insert into public.accommodation_booking_settings(venue_id,mode,policy) values(${legacy},'request','Existing legacy policy') on conflict(venue_id) do update set mode=excluded.mode`,
  );
  const legacyRows = await auth(
    owner,
    (tx) =>
      tx`select * from public.accommodation_room_types where venue_id=${legacy}`,
  );
  assert(legacyRows.every((r) => r.property_id === legacy));
  await sql`delete from public.venue_members where venue_id=${legacy} and profile_id=${owner}`;
  assert.equal(
    (
      await auth(
        owner,
        (tx) =>
          tx`select * from public.accommodation_room_types where venue_id=${legacy}`,
      )
    ).length,
    0,
  );
  check(
    "old-client writes/upserts remain compatible; legacy membership revocation remains authoritative",
  );

  const publicMigration = readFileSync(
    "supabase/migrations/20261016020000_independent_accommodation_public_contract.sql",
    "utf8",
  );
  assert.equal(
    publicMigration,
    readFileSync(
      "database/migrations/20261016020000_independent_accommodation_public_contract.sql",
      "utf8",
    ),
  );
  const publicMigrator = postgres(connection, { max: 1, onnotice: () => {} });
  try {
    await publicMigrator.unsafe(publicMigration).simple();
  } finally {
    await publicMigrator.end();
  }
  await sql`update public.venues set slug='legacy-stay',address='Old street',accommodation_type='hotel',search_document=to_tsvector('simple','test stay old street') where id=${legacy}`;
  const profile = {
    name: "Málaga Independent Stay",
    address: "Calle Fixture 1",
    city: "Málaga",
    latitude: 36.72,
    longitude: -4.42,
    accommodation_type: "hotel",
    website_url: null,
    description_es: "Alojamiento de prueba local",
    description_en: "Disposable local stay",
  };
  await denied(() =>
    auth(
      other,
      (tx) =>
        tx`select public.save_accommodation_property_profile(${property},${tx.json(profile)},true)`,
    ),
  );
  await auth(
    owner,
    (tx) =>
      tx`select public.save_accommodation_property_profile(${property},${tx.json(profile)},true)`,
  );
  assert.equal(
    (
      await publicRead(
        (tx) => tx`select public.accommodation_property_public(${property}) p`,
      )
    )[0].p,
    null,
  );
  await denied(() =>
    auth(
      owner,
      (tx) =>
        tx`select public.review_accommodation_property(${property},true,'Fixture approved only in isolated local SQL',(select review_revision from public.accommodation_properties where id=${property}))`,
    ),
  );
  await sql`update public.profiles set app_role='moderator' where id=${editor}`;
  await denied(() =>
    auth(
      owner,
      (tx) => tx`select public.pending_accommodation_properties(20,0)`,
    ),
  );
  assert.equal(
    (
      await auth(
        editor,
        (tx) => tx`select public.pending_accommodation_properties(20,0) q`,
      )
    )[0].q.total,
    1,
  );
  await denied(() =>
    auth(
      editor,
      (tx) =>
        tx`select public.review_accommodation_property(${property},true,'Stale review must fail',${id(999)})`,
    ),
  );
  await auth(
    editor,
    (tx) =>
      tx`select public.review_accommodation_property(${property},true,'Fixture approved only in isolated local SQL',(select review_revision from public.accommodation_properties where id=${property}))`,
  );
  const published = (
    await publicRead(
      (tx) => tx`select public.accommodation_property_public(${property}) p`,
    )
  )[0].p;
  assert.equal(published.name, profile.name);
  assert.equal(published.legacy_venue_id, null);
  assert.equal(published.slug, "stay-" + property);
  assert.equal(
    (
      await publicRead(
        (tx) =>
          tx`select public.accommodation_property_by_slug(${published.slug}) p`,
      )
    )[0].p.id,
    property,
  );
  const list = (
    await publicRead(
      (tx) =>
        tx`select public.accommodation_public_properties('malag','hotel',24,0) p`,
    )
  )[0].p;
  assert.equal(list.total, 1);
  assert.equal(list.rows[0].id, property);
  const all = (
    await publicRead(
      (tx) =>
        tx`select public.accommodation_public_properties('', 'all',1,0) p`,
    )
  )[0].p;
  assert.equal(all.total, 2);
  assert.equal(all.rows.length, 1);
  await denied(() =>
    publicRead(
      (tx) =>
        tx`select public.accommodation_public_properties('', 'all',999,0)`,
    ),
  );
  const map = (
    await publicRead(
      (tx) =>
        tx`select public.accommodation_public_viewport(-5,-4,36,37,'hotel','malaga') p`,
    )
  )[0].p;
  assert.deepEqual(map.markers, [[property, -4.42, 36.72, 0, 1]]);
  await auth(
    guest,
    (tx) => tx`select public.suite_save_stay(${property},true,'en')`,
  );
  const saved = await auth(
    guest,
    (tx) => tx`select * from public.suite_saved_stays`,
  );
  assert.equal(saved[0].property_id, property);
  assert.equal(saved[0].venue_id, null);
  assert.equal(
    (await auth(other, (tx) => tx`select * from public.suite_saved_stays`))
      .length,
    0,
  );
  await sql`insert into public.suite_email_preferences values(${guest},false,true)`;
  await sql`update public.suite_saved_stays set saved_at=now()-interval '6 days' where profile_id=${guest}`;
  await sql`select public.queue_due_suite_reminders()`;
  await sql`select public.queue_due_suite_reminders()`;
  const reminders =
    await sql`select * from public.suite_email_outbox where kind='stay_saved_reminder'`;
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].payload.propertyId, property);
  await auth(
    guest,
    (tx) => tx`select public.suite_save_stay(${property},false,'en')`,
  );
  assert.equal(
    (await auth(guest, (tx) => tx`select * from public.suite_saved_stays`))
      .length,
    0,
  );
  await auth(
    owner,
    (tx) =>
      tx`select public.save_accommodation_property_profile(${property},${tx.json({ ...profile, name: "Revised stay" })},false)`,
  );
  assert.equal(
    (
      await publicRead(
        (tx) => tx`select public.accommodation_property_public(${property}) p`,
      )
    )[0].p,
    null,
  );
  assert.equal(
    (
      await sql`select count(*)::int n from public.accommodation_property_reviews where property_id=${property}`
    )[0].n,
    3,
  );
  check(
    "staff-reviewed independent profile, unified prefix discovery/map/detail, saved ownership and edit re-review",
  );
  const historyCount = (
    await sql`select count(*)::int n from public.accommodation_reservations where property_id=${property}`
  )[0].n;
  await sql`delete from public.profiles where id=${editor}`;
  assert.equal(
    (
      await sql`select count(*)::int n from public.accommodation_property_reviews where property_id=${property} and actor_id is null`
    )[0].n,
    1,
  );
  await sql`update public.accommodation_properties set status='published' where id=${property}`;
  await sql`insert into public.accommodation_property_members values(${property},${other},'manager')`;
  await sql`delete from public.profiles where id=${owner}`;
  const retained = (
    await sql`select * from public.accommodation_properties where id=${property}`
  )[0];
  assert.equal(retained.owner_profile_id, null);
  assert.equal(retained.status, "private");
  assert.equal(
    (
      await auth(
        other,
        (tx) =>
          tx`select public.can_manage_accommodation_property(${property}) allowed`,
      )
    )[0].allowed,
    true,
  );
  assert.equal(
    (
      await sql`select count(*)::int n from public.accommodation_reservations where property_id=${property}`
    )[0].n,
    historyCount,
  );
  check(
    "owner/staff account erasure preserves property/bookings/audit and holds ownerless public activation",
  );
  console.log(
    `INDEPENDENT ACCOMMODATION SQL: ${count} groups passed, disposable PostgreSQL only`,
  );
} finally {
  await sql.end();
}
