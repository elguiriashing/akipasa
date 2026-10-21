import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
const migration = "20261021001252_operations_runtime_health.sql";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role;create table public.untouched_customer_fixture(id int primary key,value text);insert into untouched_customer_fixture values(1,'preserve');grant usage on schema public to anon,authenticated,service_role;",
  );
  await db.exec(readFileSync("supabase/migrations/" + migration, "utf8"));
}, 30000);
afterAll(() => db.close());
type HealthTask = "cron" | "billing" | "migration";
type HealthRow = {
  singleton: boolean;
  enabled: boolean;
  last_tick_at: Date | string | null;
} & Record<`${HealthTask}_stage` | `${HealthTask}_outcome`, string | null> &
  Record<`${HealthTask}_updated_at`, Date | string | null>;
const health = async () => {
  await db.exec("reset role");
  return (
    await db.query<HealthRow>("select * from operations_runtime_private.health")
  ).rows[0];
};
const record = async (
  task: unknown = "cron",
  stage: unknown = "started",
  outcome: unknown = "running",
) =>
  (
    await db.query<{ recorded: boolean }>(
      "select public.record_operations_runtime_health($1,$2,$3) recorded",
      [task, stage, outcome],
    )
  ).rows[0].recorded;
it("mirrors source and defaults to one private disabled row", async () => {
  expect(readFileSync("database/migrations/" + migration, "utf8")).toBe(
    readFileSync("supabase/migrations/" + migration, "utf8"),
  );
  const row = await health();
  expect(row.enabled).toBe(false);
  expect(row.singleton).toBe(true);
  for (const [key, value] of Object.entries(row))
    if (!["enabled", "singleton"].includes(key)) expect(value).toBeNull();
  await expect(
    db.exec(
      "insert into operations_runtime_private.health(singleton)values(false)",
    ),
  ).rejects.toThrow(/check constraint/);
  await expect(
    db.exec(
      "insert into operations_runtime_private.health(singleton)values(true)",
    ),
  ).rejects.toThrow(/duplicate key/);
});
it("denies browser RPC execution at both layers and all raw health access", async () => {
  for (const role of ["anon", "authenticated"]) {
    await db.exec(`reset role;set role ${role}`);
    await expect(record()).rejects.toThrow(/permission denied/);
    await expect(
      db.exec(
        "select operations_runtime_private.record('cron','started','running')",
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      db.exec("select * from operations_runtime_private.health"),
    ).rejects.toThrow(/permission denied/);
  }
  await db.exec("reset role");
});
it("disabled calls are no-ops; service can read but cannot enable or directly mutate health", async () => {
  const before = await health();
  await db.exec("set role service_role");
  expect(await record()).toBe(false);
  expect(
    (await db.query("select enabled from operations_runtime_private.health"))
      .rows,
  ).toEqual([{ enabled: false }]);
  for (const sql of [
    "update operations_runtime_private.health set enabled=true",
    "delete from operations_runtime_private.health",
    "truncate operations_runtime_private.health",
    "insert into operations_runtime_private.health(singleton)values(false)",
  ])
    await expect(db.exec(sql)).rejects.toThrow(/permission denied/);
  expect(await health()).toEqual(before);
});
it("rejects arbitrary labels and nulls without storing payloads", async () => {
  await db.exec("set role service_role");
  for (const args of [
    ["customer-123", "started", "running"],
    ["cron", "secret_key", "ok"],
    ["billing", "work", "raw provider error"],
    [null, "started", "ok"],
    ["cron", null, "ok"],
    ["cron", "started", null],
  ] as const)
    await expect(record(...args)).rejects.toThrow(
      /Invalid runtime health classification/,
    );
  expect((await health()).last_tick_at).toBeNull();
});
it("updates only the target task, ticks only cron starts, retains a singleton and unrelated data", async () => {
  await db.exec(
    "update operations_runtime_private.health set enabled=true;set role service_role",
  );
  expect(await record()).toBe(true);
  const first = await health();
  expect(first.cron_stage).toBe("started");
  expect(first.last_tick_at).not.toBeNull();
  expect(first.last_tick_at).toEqual(first.cron_updated_at);
  await db.exec("set role service_role");
  expect(await record("billing", "merchant", "failed")).toBe(true);
  const second = await health();
  expect(second.billing_stage).toBe("merchant");
  expect(second.billing_outcome).toBe("failed");
  expect(second.last_tick_at).toEqual(first.last_tick_at);
  expect(second.cron_updated_at).toEqual(first.cron_updated_at);
  await db.exec("set role service_role");
  expect(await record("migration", "claim", "disabled")).toBe(true);
  expect(await record("cron", "completed", "ok")).toBe(true);
  const final = await health();
  expect(final.cron_stage).toBe("completed");
  expect(final.cron_outcome).toBe("ok");
  expect(final.migration_stage).toBe("claim");
  expect(final.migration_outcome).toBe("disabled");
  expect(final.last_tick_at).toEqual(first.last_tick_at);
  expect(final.billing_updated_at).toEqual(second.billing_updated_at);
  expect(
    (await db.query("select count(*) n from operations_runtime_private.health"))
      .rows[0],
  ).toEqual({ n: 1 });
  expect(
    (await db.query("select * from untouched_customer_fixture")).rows,
  ).toEqual([{ id: 1, value: "preserve" }]);
  await db.exec(
    "update operations_runtime_private.health set enabled=false;set role service_role",
  );
  expect(await record("migration", "completed", "ok")).toBe(false);
  expect((await health()).migration_stage).toBe("claim");
});
