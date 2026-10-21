import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
const migration = "20261021133839_operations_merchant_health.sql";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role;grant usage on schema public to anon,authenticated,service_role;create table public.untouched_customers(id int primary key,value text);insert into public.untouched_customers values(1,'retained');create table public.untouched_queue(id int primary key,attempts int);insert into public.untouched_queue values(1,0);",
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261021001252_operations_runtime_health.sql",
      "utf8",
    ),
  );
  await db.exec(readFileSync("supabase/migrations/" + migration, "utf8"));
}, 30000);
afterAll(() => db.close());
async function row() {
  await db.exec("reset role");
  return (
    await db.query<Record<string, unknown>>(
      "select * from operations_runtime_private.health",
    )
  ).rows[0];
}
async function record(
  task: unknown = "billing",
  status: unknown = 401,
  category: unknown = "authentication",
) {
  return (
    await db.query<{ recorded: boolean }>(
      "select public.record_operations_merchant_health($1,$2,$3) recorded",
      [task, status, category],
    )
  ).rows[0].recorded;
}
it("is mirrored, forward-only, defaults null and retains the existing closed singleton", async () => {
  expect(readFileSync("database/migrations/" + migration, "utf8")).toBe(
    readFileSync("supabase/migrations/" + migration, "utf8"),
  );
  const r = await row();
  expect(r.enabled).toBe(false);
  expect(r.last_tick_at).toBeNull();
  for (const [key, value] of Object.entries(r))
    if (key.includes("merchant")) expect(value).toBeNull();
});
it("both RPC layers and raw private data remain forbidden to browser roles", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`reset role;set role ${role}`);
    await expect(record()).rejects.toThrow(/permission denied/);
    await expect(
      db.exec(
        "select operations_runtime_private.record_merchant('billing',401,'authentication')",
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.exec("select * from operations_runtime_private.health"),
    ).rejects.toThrow(/permission denied/);
  }
});
it("service cannot activate/directly mutate telemetry, and disabled recording is a strict no-op", async () => {
  const before = await row();
  await db.exec("set role service_role");
  expect(await record()).toBe(false);
  expect(
    (await db.query("select enabled from operations_runtime_private.health"))
      .rows[0],
  ).toEqual({ enabled: false });
  for (const sql of [
    "update operations_runtime_private.health set enabled=true",
    "update operations_runtime_private.health set billing_merchant_category='ok'",
    "delete from operations_runtime_private.health",
    "truncate operations_runtime_private.health",
  ])
    await expect(db.exec(sql)).rejects.toThrow(/permission denied/);
  expect(await row()).toEqual(before);
});
it("rejects arbitrary text, customer identifiers, invalid status and missing classification before writes", async () => {
  const before = await row();
  await db.exec("set role service_role");
  for (const args of [
    ["customer-123", 401, "authentication"],
    ["cron", 401, "authentication"],
    ["billing", 0, "network"],
    ["billing", 600, "rejected"],
    ["billing", 401, "raw-secret"],
    ["billing", null, "ok"],
    ["billing", 200, "network"],
    ["billing", null, null],
    [null, 401, "authentication"],
  ])
    await expect(record(args[0], args[1], args[2])).rejects.toThrow(
      /Invalid merchant health classification/,
    );
  expect(await row()).toEqual(before);
});
it("records only the requested task under existing enablement without altering cron, queue or customer state", async () => {
  await db.exec(
    "reset role;update operations_runtime_private.health set enabled=true;set role service_role;select public.record_operations_runtime_health('cron','started','running')",
  );
  const before = await row();
  await db.exec("set role service_role");
  expect(await record()).toBe(true);
  const billing = await row();
  expect(billing.billing_merchant_http_status).toBe(401);
  expect(billing.billing_merchant_category).toBe("authentication");
  expect(billing.billing_merchant_updated_at).not.toBeNull();
  expect(billing.migration_merchant_category).toBeNull();
  expect(billing.last_tick_at).toEqual(before.last_tick_at);
  expect(billing.cron_updated_at).toEqual(before.cron_updated_at);
  expect(billing.billing_stage).toBeNull();
  await db.exec("set role service_role");
  expect(await record("migration", null, "network")).toBe(true);
  const both = await row();
  expect(both.billing_merchant_updated_at).toEqual(
    billing.billing_merchant_updated_at,
  );
  expect(both.migration_merchant_category).toBe("network");
  expect(both.migration_merchant_http_status).toBeNull();
  expect(
    (await db.query("select * from public.untouched_customers")).rows,
  ).toEqual([{ id: 1, value: "retained" }]);
  expect((await db.query("select * from public.untouched_queue")).rows).toEqual(
    [{ id: 1, attempts: 0 }],
  );
  await db.exec(
    "update operations_runtime_private.health set enabled=false;set role service_role",
  );
  expect(await record("migration", 400, "api_version")).toBe(false);
  expect((await row()).migration_merchant_category).toBe("network");
});
