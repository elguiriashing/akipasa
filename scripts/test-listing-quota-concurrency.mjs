import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import {
  premiumDatabase,
  suiteOwner,
} from "../tests/fixtures/akisuite-premium-sql.ts";
const connection = process.env.TEST_LISTING_QUOTA_DATABASE_URL;
if (!connection) throw new Error("TEST_LISTING_QUOTA_DATABASE_URL required");
const target = new URL(connection);
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) ||
  target.pathname !== "/listing_quota_test"
)
  throw new Error("Only disposable local listing_quota_test is allowed");
const clients = Array.from({ length: 3 }, () =>
  postgres(connection, { max: 1, onnotice: () => {} }),
);
const [admin, a, b] = clients;
const id = (n) => `aa000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const facade = {
  exec: (sql) => admin.unsafe(sql).simple(),
  query: async (sql, params = []) => ({
    rows: await admin.unsafe(sql, params),
  }),
};
async function begin(client, isolation = "READ COMMITTED") {
  await client
    .unsafe(
      `begin isolation level ${isolation};set local role authenticated;set local statement_timeout='8s'`,
    )
    .simple();
  await client`select set_config('test.uid',${suiteOwner},true)`;
  await client`select count(*) from events`;
  const [mode] =
    await client`select current_setting('transaction_isolation') isolation`;
  assert.equal(mode.isolation, isolation.toLowerCase());
}
async function as(client, callback) {
  await begin(client);
  try {
    const result = await callback(client);
    await client`commit`;
    return result;
  } catch (error) {
    await client`rollback`;
    throw error;
  }
}
async function blocked(pid) {
  const end = Date.now() + 5000;
  while (Date.now() < end) {
    const [state] =
      await admin`select wait_event_type from pg_stat_activity where pid=${pid}`;
    if (state?.wait_event_type === "Lock") return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Expected competing transaction to wait on scope lock");
}
const capture = (p) =>
  p.then(
    (rows) => ({ rows }),
    (error) => ({ error }),
  );
const reserve = (client, venue) =>
  client`select reserve_listing_upload(${venue},${"a".repeat(64)},'image/png',100,1,1,null)`;
const cases = [];
try {
  await premiumDatabase(false, facade);
  await admin
    .unsafe(
      "alter table storage.objects add column user_metadata jsonb;grant select,insert,update,delete on events,event_occurrences,venue_media_placements to authenticated;alter table venue_media_placements enable row level security;create policy fixture_placement_owner on venue_media_placements to authenticated using(is_venue_member(venue_id)) with check(is_venue_member(venue_id));alter table events enable row level security;alter table event_occurrences enable row level security;create policy fixture_event_owner on events to authenticated using(is_venue_member(venue_id)) with check(is_venue_member(venue_id));create policy fixture_occurrence_owner on event_occurrences to authenticated using(exists(select 1 from events where id=event_id and is_venue_member(venue_id))) with check(exists(select 1 from events where id=event_id and is_venue_member(venue_id)))",
    )
    .simple();
  for (const file of [
    "20261020170415_listing_entitlement_limits.sql",
    "20261020173552_enforced_listing_uploads.sql",
    "20261020233027_standalone_listing_premium_library.sql",
    "20261020233905_prevent_listing_event_identity_reuse.sql",
    "20261021003500_prevent_retained_media_identity_reuse.sql",
    "20261021004500_library_requires_verified_uploads.sql",
  ])
    await admin
      .unsafe(readFileSync(`database/migrations/${file}`, "utf8"))
      .simple();
  await admin
    .unsafe(
      "update akisuite_listing_private.launch_settings set enabled=true,uploads_enforced=true",
    )
    .simple();
  let sequence = 100;
  // Seed real legacy data BEFORE the forward helper exists: each race therefore
  // exercises first scope INSERT against an older RR snapshot, without backfill.
  for (const kind of [
    "events",
    "reservations",
    "legacy-storage",
    "shared-reservations",
    "shared-storage",
    "library-placement",
    "case-storage",
  ]) {
    for (const isolation of ["READ COMMITTED", "REPEATABLE READ"]) {
      const venue = id(++sequence);
      await admin`insert into venues(id,name) values(${venue},'Disposable quota fixture')`;
      await admin`insert into venue_members values(${venue},${suiteOwner},'owner')`;
      const scenario = { kind, isolation, venue };
      if (kind === "events") {
        scenario.events = [];
        for (let n = 0; n < 5; n++) {
          const event = id(++sequence);
          scenario.events.push(event);
          await admin`insert into events(id,venue_id,slug,title_es,status) values(${event},${venue},${`quota-race-${sequence}`},${`Quota race ${sequence}`},'draft')`;
          await admin`insert into event_occurrences(id,event_id,starts_at,ends_at,status) values(${id(++sequence)},${event},'2030-06-01T10:00Z','2030-06-01T11:00Z','scheduled')`;
          if (n < 3)
            await as(
              a,
              (client) =>
                client`update events set status='published' where id=${event}`,
            );
        }
      } else if (kind === "library-placement") {
        scenario.media = [];
        for (let n = 0; n < 7; n++)
          await as(a, (client) => reserve(client, venue));
        await admin
          .unsafe(
            "update akisuite_listing_private.launch_settings set enabled=false,uploads_enforced=false",
          )
          .simple();
        const source = id(++sequence);
        await admin`insert into venues(id,name) values(${source},'Disposable authorized library source')`;
        await admin`insert into venue_members values(${source},${suiteOwner},'owner')`;
        await admin`insert into crm_workspace_venues values('ws_one',${source}),('ws_one',${venue})`;
        for (let n = 0; n < 2; n++) {
          const media = id(++sequence),
            path = `${source}/${n}.png`;
          scenario.media.push(media);
          await admin`insert into storage.objects(bucket_id,name,metadata) values('event-media',${path},'{"size":100}')`;
          await admin`insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values(${media},${source},${path},'image/png',100)`;
          await admin`insert into akisuite_listing_private.retained_media_reuse values(${venue},${media},'venue_gallery','stay_header')`;
        }
        await admin
          .unsafe(
            "update akisuite_listing_private.launch_settings set enabled=true,uploads_enforced=true",
          )
          .simple();
      } else if (kind.startsWith("shared-")) {
        await admin
          .unsafe(
            "update akisuite_listing_private.launch_settings set enabled=false,uploads_enforced=false",
          )
          .simple();
        const source = id(++sequence);
        await admin`insert into venues(id,name) values(${source},'Disposable foreign library source')`;
        for (let n = 0; n < 7; n++) {
          const media = id(++sequence),
            path = `${source}/${n}.png`;
          await admin`insert into storage.objects(bucket_id,name,metadata) values('event-media',${path},'{"size":100}')`;
          await admin`insert into venue_media(id,venue_id,storage_path,mime_type,size_bytes) values(${media},${source},${path},'image/png',100)`;
          await admin`insert into venue_media_placements(venue_id,media_id,placement,target_key) values(${venue},${media},'venue_gallery','stay_header')`;
        }
        await admin
          .unsafe(
            "update akisuite_listing_private.launch_settings set enabled=true,uploads_enforced=true",
          )
          .simple();
      } else if (kind === "reservations") {
        for (let n = 0; n < 7; n++)
          await as(a, (client) => reserve(client, venue));
      } else {
        for (let n = 0; n < 7; n++)
          await admin`insert into storage.objects(bucket_id,name,metadata) values('event-media',${`${kind === "case-storage" ? venue.toUpperCase() : venue}/${n}.png`},'{"size":100}')`;
      }
      cases.push(scenario);
    }
  }
  const metadata = async () =>
    Array.from(
      await admin`select oid,proowner,proacl::text,proconfig,prosecdef,provolatile from pg_proc where proname in('enforce_listing_event','guard_media_quota','akisuite_listing_storage_upload_allowed','reserve_listing_upload_legacy','guard_library_media','guard_library_placement') order by oid`,
      (row) => ({ ...row }),
    );
  const before = await metadata();
  await admin
    .unsafe(
      readFileSync(
        "database/migrations/20261021181500_listing_quota_scope_serialization.sql",
        "utf8",
      ),
    )
    .simple();
  assert.deepEqual(await metadata(), before);
  await admin
    .unsafe(
      readFileSync(
        "database/migrations/20261021190000_baseline_media_quota_integrity.sql",
        "utf8",
      ),
    )
    .simple();
  assert.deepEqual(await metadata(), before);
  await admin
    .unsafe(
      readFileSync(
        "database/migrations/20261021193000_library_reservation_capacity.sql",
        "utf8",
      ),
    )
    .simple();
  assert.deepEqual(await metadata(), before);
  await admin
    .unsafe(
      readFileSync(
        "database/migrations/20261021200000_listing_storage_canonical_prefix.sql",
        "utf8",
      ),
    )
    .simple();
  assert.deepEqual(await metadata(), before);
  assert.equal(
    (
      await admin`select count(*)::int n from akisuite_listing_private.quota_scopes`
    )[0].n,
    0,
  );
  const [{ pid }] = await b`select pg_backend_pid() pid`;
  for (const c of cases) {
    const isStorage = [
      "legacy-storage",
      "shared-storage",
      "case-storage",
    ].includes(c.kind);
    await admin
      .unsafe(
        `update akisuite_listing_private.launch_settings set uploads_enforced=${!isStorage},library_enabled=${c.kind === "library-placement"}`,
      )
      .simple();
    const operation = (client, n) =>
      c.kind === "events"
        ? client`update events set status='published' where id=${c.events[n + 3]}`
        : c.kind === "library-placement"
          ? client`insert into venue_media_placements(venue_id,media_id,placement,target_key) values(${c.venue},${c.media[n]},'venue_gallery','stay_header')`
          : ["reservations", "shared-reservations"].includes(c.kind)
            ? reserve(client, c.venue)
            : client`insert into storage.objects(bucket_id,name,metadata) values('event-media',${`${c.venue}/${n + 7}.png`},'{"size":100}')`;
    await begin(a, c.isolation);
    await begin(b, c.isolation);
    await operation(a, 0);
    const competing = capture(operation(b, 1));
    await blocked(pid);
    await a`commit`;
    const result = await competing;
    const quotaError = isStorage ? "42501" : "PT402";
    assert.equal(
      result.error?.code,
      c.isolation === "REPEATABLE READ" ? "40001" : quotaError,
    );
    await b`rollback`;
    if (c.kind === "events") {
      assert.equal(
        (
          await admin`select count(*)::int n from akisuite_listing_private.listing_event_months where venue_id=${c.venue}`
        )[0].n,
        4,
      );
      assert.equal(
        (await admin`select status from events where id=${c.events[4]}`)[0]
          .status,
        "draft",
      );
    } else if (c.kind === "case-storage") {
      assert.equal(
        (
          await admin`select photos::int n from akisuite_listing_private.media_usage(${c.venue},null)`
        )[0].n,
        8,
      );
      assert.equal(
        (
          await admin`select count(*)::int n from storage.objects where lower(split_part(name,'/',1))=${c.venue}`
        )[0].n,
        8,
      );
    } else if (c.kind === "library-placement") {
      assert.equal(
        (
          await admin`select photos::int n from akisuite_listing_private.media_usage(${c.venue},null)`
        )[0].n,
        8,
      );
      assert.equal(
        (
          await admin`select count(*)::int n from venue_media_placements where venue_id=${c.venue}`
        )[0].n,
        1,
      );
      assert.equal(
        (
          await admin`select count(*)::int n from akisuite_listing_private.upload_reservations where venue_id=${c.venue}`
        )[0].n,
        7,
      );
    } else if (c.kind.startsWith("shared-")) {
      assert.equal(
        (
          await admin`select photos::int n from akisuite_listing_private.media_usage(${c.venue},null)`
        )[0].n,
        8,
      );
      assert.equal(
        (
          await admin`select count(*)::int n from venue_media_placements where venue_id=${c.venue}`
        )[0].n,
        7,
      );
    } else if (c.kind === "reservations")
      assert.equal(
        (
          await admin`select count(*)::int n from akisuite_listing_private.upload_reservations where venue_id=${c.venue}`
        )[0].n,
        8,
      );
    else
      assert.equal(
        (
          await admin`select count(*)::int n from storage.objects where split_part(name,'/',1)=${c.venue}`
        )[0].n,
        8,
      );
    // RR retries must use a fresh snapshot and observe the exhausted allowance.
    await begin(b);
    const retry = await capture(operation(b, 1));
    assert.equal(retry.error?.code, quotaError);
    await b`rollback`;
    console.log(
      `PASS ${c.isolation} ${c.kind}: first allowed, concurrent excess rejected; fresh retry denied`,
    );
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await Promise.allSettled([a.unsafe("rollback"), b.unsafe("rollback")]);
  await Promise.all(clients.map((client) => client.end({ timeout: 1 })));
}
