import { beforeAll, afterAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import type { PGlite } from "@electric-sql/pglite";
import {
  premiumDatabase,
  suiteOwner,
  suiteOther,
  suiteVenue,
  suiteVenueTwo,
} from "./fixtures/akisuite-premium-sql";
let db: PGlite;
const migration = "20261020233905_prevent_listing_event_identity_reuse.sql";
const used = "70000000-0000-4000-8000-000000000001",
  draft = "70000000-0000-4000-8000-000000000002",
  otherId = "70000000-0000-4000-8000-000000000003";
async function as(id: string, sql: string) {
  await db.exec(
    `set role authenticated;select set_config('test.uid','${id}',false)`,
  );
  try {
    if (sql.includes(";")) {
      await db.exec(sql);
      return { rows: [] as Record<string, unknown>[] };
    }
    return await db.query<Record<string, unknown>>(sql);
  } finally {
    await db.exec("reset role");
  }
}
const insert = (id: string, venue = suiteVenue) =>
  `insert into events(id,venue_id,slug,title_es,status) values('${id}','${venue}','identity-${id}','Retained identity fixture','draft')`;
beforeAll(async () => {
  db = await premiumDatabase(false);
  await db.exec(
    readFileSync(
      "database/migrations/20261020170415_listing_entitlement_limits.sql",
      "utf8",
    ),
  );
  await db.exec(`grant select,insert,update,delete on events,event_occurrences to authenticated;
 alter table events enable row level security;alter table event_occurrences enable row level security;
 create policy fixture_events_read on events for select to authenticated using(status='published' or is_venue_member(venue_id));
 create policy fixture_events_insert on events for insert to authenticated with check(is_venue_member(venue_id));
 create policy fixture_events_update on events for update to authenticated using(is_venue_member(venue_id)) with check(is_venue_member(venue_id));
 create policy fixture_events_delete on events for delete to authenticated using(is_venue_member(venue_id));
 create policy fixture_occurrence_member on event_occurrences to authenticated using(exists(select 1 from events e where e.id=event_id and is_venue_member(e.venue_id))) with check(exists(select 1 from events e where e.id=event_id and is_venue_member(e.venue_id)));
 update akisuite_listing_private.launch_settings set enabled=true;`);
  await as(suiteOwner, insert(used));
  await as(
    suiteOwner,
    `insert into event_occurrences(id,event_id,starts_at,ends_at,status) values('${used}','${used}','2040-06-01T10:00Z','2040-06-01T11:00Z','scheduled');update events set status='published' where id='${used}'`,
  );
  await as(
    suiteOwner,
    `delete from event_occurrences where event_id='${used}';delete from events where id='${used}'`,
  );
  // Demonstrate the actual-role bypass before applying the forward migration.
  await as(suiteOwner, insert(used));
  await as(
    suiteOwner,
    `insert into event_occurrences(id,event_id,starts_at,ends_at,status) values('${used}','${used}','2040-06-02T10:00Z','2040-06-02T11:00Z','scheduled');update events set status='published' where id='${used}'`,
  );
  expect(
    (
      await db.query(
        `select count(*)::int n from akisuite_listing_private.listing_event_months where event_id='${used}' and month='2040-06-01'`,
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
  await as(
    suiteOwner,
    `delete from event_occurrences where event_id='${used}';delete from events where id='${used}'`,
  );
  await db.exec(readFileSync(`database/migrations/${migration}`, "utf8"));
}, 30000);
afterAll(async () => db?.close());
it("denies same-UUID resurrection through direct authenticated INSERT in original or another owned venue", async () => {
  for (const venue of [suiteVenue, suiteVenueTwo])
    await expect(as(suiteOwner, insert(used, venue))).rejects.toThrow(
      /previously published/,
    );
  expect(
    (await db.query(`select count(*)::int n from events where id='${used}'`))
      .rows,
  ).toEqual([{ n: 0 }]);
  expect(
    (
      await db.query(
        `select count(*)::int n from akisuite_listing_private.listing_event_months where event_id='${used}'`,
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
});
it("preserves new drafts and ordinary UPDATE but denies primary-key replacement and upsert resurrection", async () => {
  await as(suiteOwner, insert(draft));
  await expect(
    as(suiteOwner, `update events set id='${otherId}' where id='${draft}'`),
  ).rejects.toThrow(/identity is immutable/);
  await as(
    suiteOwner,
    `update events set title_es='Legitimate draft edit' where id='${draft}'`,
  );
  expect(
    (await as(suiteOwner, `select title_es from events where id='${draft}'`))
      .rows,
  ).toEqual([{ title_es: "Legitimate draft edit" }]);
  await expect(
    as(
      suiteOwner,
      insert(used) +
        ` on conflict(id) do update set title_es=excluded.title_es`,
    ),
  ).rejects.toThrow(/previously published/);
});
it("does not grant outsiders table mutation or expose private trigger functions and quota records", async () => {
  await expect(as(suiteOther, insert(otherId))).rejects.toThrow(
    /row-level security/,
  );
  await expect(
    as(
      suiteOwner,
      "select * from akisuite_listing_private.listing_event_months",
    ),
  ).rejects.toThrow(/permission denied/);
  await expect(
    as(suiteOwner, "select akisuite_listing_private.guard_event_identity()"),
  ).rejects.toThrow(/permission denied/);
});
it("does not make Premium a way around immutable identity and retains publication history", async () => {
  await db.exec(
    `insert into billing_subscriptions values('${suiteOwner}','business','active','2040-01-01')`,
  );
  await expect(as(suiteOwner, insert(used))).rejects.toThrow(
    /previously published/,
  );
  expect(
    (
      await db.query(
        `select count(*)::int n from akisuite_listing_private.listing_event_months where event_id='${used}'`,
      )
    ).rows,
  ).toEqual([{ n: 1 }]);
});
it("intersects the real account-completion statement guard without allowing a restricted actor to create a fresh UUID", async () => {
  await db.exec(
    `alter table profiles add column created_at timestamptz default now();alter table profiles add column username text;alter table profiles add column bio text;alter table profiles add column preferred_locale text;alter table profiles add column terms_version text;alter table profiles add column terms_accepted_at timestamptz;alter table profiles add column updated_at timestamptz`,
  );
  await db.exec(
    readFileSync(
      "database/migrations/20261020170448_account_completion_age_declaration.sql",
      "utf8",
    ),
  );
  const coverage = readFileSync(
    "database/migrations/20261020180946_account_completion_database_coverage.sql",
    "utf8",
  ).match(/do \$mutations\$[\s\S]*?end \$mutations\$;/)?.[0];
  if (!coverage) throw Error("Actual mutation guard installer missing");
  await db.exec(coverage);
  await db.exec(
    `insert into account_private.onboarding(profile_id,status) values('${suiteOwner}','pending')`,
  );
  await expect(as(suiteOwner, insert(otherId))).rejects.toThrow(
    /account completion required/,
  );
  await expect(
    as(suiteOwner, `update events set id='${otherId}' where id='${draft}'`),
  ).rejects.toThrow(/account completion required/);
  await db.exec(
    `update account_private.onboarding set status='complete',declared_at=now(),completed_at=now(),terms_version='test-only' where profile_id='${suiteOwner}'`,
  );
  await as(suiteOwner, insert(otherId));
  await expect(as(suiteOwner, insert(used))).rejects.toThrow(
    /previously published/,
  );
  expect(readFileSync(`database/migrations/${migration}`, "utf8")).toBe(
    readFileSync(`supabase/migrations/${migration}`, "utf8"),
  );
});
