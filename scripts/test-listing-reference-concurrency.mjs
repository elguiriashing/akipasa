import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const connection = process.env.TEST_LISTING_DATABASE_URL;
if (!connection) throw new Error("TEST_LISTING_DATABASE_URL required");
const target = new URL(connection);
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
  target.pathname !== "/listing_reference_test"
)
  throw new Error("Only disposable local listing_reference_test is allowed");
const clients = Array.from({ length: 3 }, () =>
  postgres(connection, { max: 1, onnotice: () => {} }),
);
const [admin, a, b] = clients;
const owner = "11000000-0000-4000-8000-000000000001";
const venue = "22000000-0000-4000-8000-000000000001";
const destination = "22000000-0000-4000-8000-000000000002";
async function begin(client, isolation) {
  await client
    .unsafe(
      `begin isolation level ${isolation};set local role authenticated;set local statement_timeout='8s'`,
    )
    .simple();
  await client`select set_config('test.uid',${owner},true)`;
  await client`select count(*) from public.venue_media`; // Establish the RR snapshot before either operation.
  const [mode] =
    await client`select current_setting('transaction_isolation') isolation`;
  assert.equal(mode.isolation, isolation.toLowerCase());
}
async function blocked(pid) {
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    const [state] =
      await admin`select wait_event_type from pg_stat_activity where pid=${pid}`;
    if (state?.wait_event_type === "Lock") return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(
    "Expected independently connected operation to wait for a row lock",
  );
}
const captured = (promise) =>
  promise.then(
    (rows) => ({ rows }),
    (error) => ({ error }),
  );
try {
  // Minimal reference-lifecycle fixture. Quota/billing/ownership intersections are
  // exercised separately by the full actual-role entitlement suites. No production DB.
  await admin
    .unsafe(
      `
    create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;create schema storage;create schema akisuite_listing_private;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
    create table public.venues(id uuid primary key,status text);
    create table public.venue_members(venue_id uuid,profile_id uuid);
    create function public.is_venue_member(v uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.venue_members where venue_id=v and profile_id=auth.uid())$$;
    create table public.events(id uuid primary key,venue_id uuid,status text);
    create table public.venue_media(id uuid primary key,venue_id uuid references public.venues on delete cascade,storage_path text unique,sort_order integer default 0);
    create table public.venue_media_placements(venue_id uuid references public.venues on delete cascade,media_id uuid references public.venue_media on delete cascade,placement text,target_key text);
    create table storage.objects(bucket_id text,name text,primary key(bucket_id,name));
    create table akisuite_listing_private.launch_settings(singleton boolean primary key,library_enabled boolean);
    insert into akisuite_listing_private.launch_settings values(true,true);
    insert into public.venues values('${venue}','draft'),('${destination}','published');
    insert into public.venue_members values('${venue}','${owner}'),('${destination}','${owner}');
    alter table public.venue_media enable row level security;alter table public.venue_media_placements enable row level security;alter table storage.objects enable row level security;
    grant usage on schema auth,storage to anon,authenticated;
    grant select,insert,delete,update on public.venue_media,public.venue_media_placements,storage.objects to authenticated;
    create policy media_owner on public.venue_media to authenticated using(public.is_venue_member(venue_id)) with check(public.is_venue_member(venue_id));
    create policy placement_owner on public.venue_media_placements to authenticated using(public.is_venue_member(venue_id)) with check(public.is_venue_member(venue_id));
    create policy object_owner on storage.objects to authenticated using(public.is_venue_member(split_part(name,'/',1)::uuid)) with check(public.is_venue_member(split_part(name,'/',1)::uuid));
  `,
    )
    .simple();
  await admin
    .unsafe(
      readFileSync(
        "database/migrations/20261021175000_listing_library_reference_boundaries.sql",
        "utf8",
      ),
    )
    .simple();
  const [{ pid: aPid }] = await a`select pg_backend_pid() pid`;
  const [{ pid: bPid }] = await b`select pg_backend_pid() pid`;
  assert.notEqual(aPid, bPid);
  let index = 0;
  for (const isolation of ["READ COMMITTED", "REPEATABLE READ"]) {
    for (const table of ["object", "media"]) {
      for (const first of ["reference", "delete"]) {
        const media = `33000000-0000-4000-8000-${String(++index).padStart(12, "0")}`;
        const path = `${venue}/${index}.png`;
        await admin`insert into public.venue_media(id,venue_id,storage_path) values(${media},${venue},${path})`;
        await admin`insert into storage.objects values('event-media',${path})`;
        const place = (client) =>
          client`insert into public.venue_media_placements values(${destination},${media},'venue_cover','')`;
        const remove = (client) =>
          table === "object"
            ? client`delete from storage.objects where bucket_id='event-media' and name=${path}`
            : client`delete from public.venue_media where id=${media}`;
        await begin(a, isolation);
        await begin(b, isolation);
        if (first === "reference") {
          await place(a);
          const deleting = captured(remove(b));
          await blocked(bPid);
          await a`commit`;
          const result = await deleting;
          assert.equal(
            result.error?.code,
            isolation === "READ COMMITTED" ? "23503" : "40001",
            `${table} deletion must reject after reference commits`,
          );
          await b`rollback`;
          assert.equal(
            (
              await admin`select * from public.venue_media_placements where media_id=${media}`
            ).length,
            1,
          );
          assert.equal(
            (await admin`select * from storage.objects where name=${path}`)
              .length,
            1,
          );
        } else {
          await remove(b);
          const referencing = captured(place(a));
          await blocked(aPid);
          await b`commit`;
          const result = await referencing;
          assert.equal(
            result.error?.code,
            isolation === "READ COMMITTED" ? "23503" : "40001",
            `reference must reject after ${table} deletion commits`,
          );
          await a`rollback`;
          assert.equal(
            (
              await admin`select * from public.venue_media_placements where media_id=${media}`
            ).length,
            0,
          );
        }
        console.log(
          `PASS ${isolation} ${table}: ${first} wins; concurrent counterpart safely rejected`,
        );
      }
    }
  }
} finally {
  await Promise.allSettled([a.unsafe("rollback"), b.unsafe("rollback")]);
  await Promise.all(clients.map((client) => client.end({ timeout: 1 })));
}
