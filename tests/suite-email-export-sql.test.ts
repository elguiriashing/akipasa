import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
let db: PGlite;
const migration = "20261101115853_suite_email_owner_export.sql";
const id = (n: number) =>
  `96000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
async function actor(n: number | null) {
  await db.exec("reset role");
  await db.query("select set_config('test.uid',$1,false)", [n ? id(n) : ""]);
  await db.exec("set role authenticated");
}
async function call(after: string | null = null, limit: number | null = 100) {
  const r = await db.query<{
    result: {
      items: Record<string, unknown>[];
      nextCursor: string | null;
      truncated: boolean;
    };
  }>("select public.my_suite_email_export_page($1::uuid,$2::int) result", [
    after,
    limit,
  ]);
  return r.rows[0].result;
}
async function seed(
  n: number,
  owner = 1,
  kind = "rental_booking_update",
  payload: object = {},
) {
  await db.exec("reset role");
  await db.query(
    "insert into suite_email_outbox(id,profile_id,kind,recipient,locale,payload,status)values($1,$2,$3,'owner@example.invalid','en',$4::jsonb,'blocked')",
    [id(n), id(owner), kind, JSON.stringify(payload)],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;grant usage on schema auth to authenticated,anon;create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create table public.suite_email_outbox(id uuid primary key,profile_id uuid not null,kind text not null,recipient text not null,locale text not null,payload jsonb not null,status text not null,created_at timestamptz not null default now(),available_at timestamptz not null default now(),first_attempt_at timestamptz,attempted_at timestamptz,sent_at timestamptz,attempts integer not null default 0,delivery_uncertain boolean not null default false,provider_message_id text default 'provider-secret',lease_id uuid default gen_random_uuid(),dedupe_key text default 'private-capability',last_error text default 'provider credential error');alter table suite_email_outbox enable row level security;revoke all on suite_email_outbox from public,anon,authenticated;`,
  );
  const sql = readFileSync("database/migrations/" + migration, "utf8");
  expect(sql).toBe(readFileSync("supabase/migrations/" + migration, "utf8"));
  await db.exec(sql);
}, 30000);
beforeEach(async () => {
  await db.exec("reset role;truncate suite_email_outbox;");
});
afterAll(async () => db?.close());
it("keeps private raw table denied and RPC anonymous execution denied", async () => {
  await seed(10);
  await db.exec("set role anon");
  await expect(call()).rejects.toThrow(/permission denied/);
  await expect(db.query("select * from suite_email_outbox")).rejects.toThrow(
    /permission denied/,
  );
  await actor(1);
  await expect(db.query("select * from suite_email_outbox")).rejects.toThrow(
    /permission denied/,
  );
});
it("rejects null identity and invalid limits without arbitrary owner input", async () => {
  await actor(null);
  await expect(call()).rejects.toThrow(/Authentication required/);
  await actor(1);
  for (const limit of [0, 101, -1, null])
    await expect(call(null, limit)).rejects.toThrow(
      /Invalid export page limit/,
    );
  expect(
    (
      await db.query<{ args: string }>(
        "select pg_get_function_identity_arguments('public.my_suite_email_export_page(uuid,integer)'::regprocedure) args",
      )
    ).rows[0].args,
  ).toBe("p_after uuid, p_limit integer");
});
it("exports only caller retained mail across every state without eligibility guard", async () => {
  await seed(10, 1);
  await seed(11, 2);
  await db.query("select set_config('test.eligible','false',false)");
  await actor(1);
  const p = await call();
  expect(p.items.map((x) => x.id)).toEqual([id(10)]);
  expect(p.items[0].status).toBe("blocked");
  expect(p.truncated).toBe(false);
  expect(p.nextCursor).toBe(null);
});
it("retains own raw rental personal fields with immutable customer provenance after booking deletion", async () => {
  const payload = {
    audience: "customer",
    bookingId: id(90),
    customerName: "Own Name",
    customerEmail: "own@example.invalid",
    customerPhone: "+34000000000",
    note: "Own full note ".repeat(100),
    resetUrl: "https://private.invalid/token",
    nested: { secret: "nested" },
  };
  await seed(10, 1, "rental_booking_update", payload);
  await actor(1);
  const p = await call();
  expect(p.items[0].payload).toEqual({
    audience: "customer",
    bookingId: id(90),
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    customerPhone: payload.customerPhone,
    note: payload.note,
  });
  expect(p.items[0].payload_excluded_field_count).toBe(2);
  expect(JSON.stringify(p)).not.toContain("provider-secret");
  expect(JSON.stringify(p)).not.toContain("credential error");
  expect(JSON.stringify(p)).not.toContain("private.invalid");
});
it("excludes operator's third-party renter contact and note while retaining own delivery metadata", async () => {
  await seed(10, 1, "rental_booking_update", {
    audience: "operator",
    companyName: "Company",
    customerName: "Other",
    customerEmail: "other@example.invalid",
    customerPhone: "private",
    note: "thirdparty",
  });
  await actor(1);
  const p = await call();
  expect(p.items[0].payload).toEqual({
    audience: "operator",
    companyName: "Company",
  });
  expect(p.items[0].recipient).toBe("owner@example.invalid");
  expect(p.items[0].projection_version).toBe("personal-mail-v1");
  expect(p.items[0].payload_excluded_field_count).toBe(4);
});
it("uses known kind-specific scalar payloads without nested capability leakage", async () => {
  await seed(10, 1, "welcome_akipasa", {
    displayName: "Own",
    product: "AkiPasa",
    customerEmail: "private",
    url: "https://secret",
    unknown: "secret",
    nested: { secret: true },
  });
  await seed(11, 1, "event_saved_reminder", {
    eventName: "Own event",
    eventId: id(4),
    startsAt: null,
    slug: "event",
    other: { x: 1 },
  });
  await actor(1);
  const p = await call();
  expect(p.items[0].payload).toEqual({
    displayName: "Own",
    product: "AkiPasa",
  });
  expect(p.items[1].payload).toEqual({
    eventName: "Own event",
    eventId: id(4),
    startsAt: null,
    slug: "event",
  });
});
it("uses stable bounded UUID keyset pages with no repeat or cross-owner records", async () => {
  await db.query(
    "insert into suite_email_outbox(id,profile_id,kind,recipient,locale,payload,status)select ('96000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,$1,'welcome_akipasa','owner@example.invalid','es','{}','sent' from generate_series(10,114)n",
    [id(1)],
  );
  await seed(1000, 2);
  await actor(1);
  const first = await call();
  expect(first.items).toHaveLength(100);
  expect(first.truncated).toBe(true);
  expect(first.nextCursor).toBe(id(109));
  const second = await call(first.nextCursor);
  expect(second.items).toHaveLength(5);
  expect(second.items[0].id).toBe(id(110));
  expect(second.truncated).toBe(false);
  expect(second.nextCursor).toBe(null);
});
it("includes every retained delivery state and preserves own attempts/timestamps", async () => {
  const statuses = [
    "pending",
    "sending",
    "sent",
    "failed",
    "blocked",
    "review",
    "cancelled",
  ];
  for (const [index, status] of statuses.entries()) {
    await seed(20 + index, 1, "welcome_akipasa", {
      displayName: "Own retained name",
    });
    await db.query(
      "update suite_email_outbox set status=$1,attempts=2,delivery_uncertain=true,attempted_at=now() where id=$2",
      [status, id(20 + index)],
    );
  }
  await actor(1);
  const result = await call();
  expect(result.items.map((row) => row.status)).toEqual(statuses);
  expect(
    result.items.every(
      (row) =>
        row.attempts === 2 &&
        row.delivery_uncertain === true &&
        typeof row.attempted_at === "string",
    ),
  ).toBe(true);
});
it("does not treat an unknown rental audience as permission to reveal contacts", async () => {
  await seed(10, 1, "rental_booking_update", {
    audience: "unknown",
    customerEmail: "third-party@example.invalid",
    note: "private",
    companyName: "Known company",
  });
  await actor(1);
  expect((await call()).items[0].payload).toEqual({
    audience: "unknown",
    companyName: "Known company",
  });
});
