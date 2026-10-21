import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { operationsReleaseVars } from "./helpers/operations-release-config";
import { createBusinessFunnelFixture } from "./helpers/business-funnel-fixture";
import { verifiedFunnelPhases } from "./helpers/business-funnel-installation";
import { purgeBusinessFunnel } from "../src/lib/business-funnel-maintenance";
import { readBusinessFunnelExport } from "../src/lib/business-funnel-export";
let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
beforeAll(async () => {
  db = new PGlite();
  await createBusinessFunnelFixture(db);
  for (const phase of verifiedFunnelPhases()) await db.exec(phase.sql);
}, 30000);
afterAll(() => db.close());
it("marks only installed schema readers/maintenance ready, leaving financial acquisition gates closed", () => {
  expect(operationsReleaseVars.AKISUITE_FUNNEL_READY).toBe("true");
  for (const gate of [
    "AKIBUSINESS_OPERATIONS_CHECKOUT_READY",
    "AKIBUSINESS_OPERATIONS_TAX_READY",
    "AKISUITE_CHECKOUT_ENABLED",
    "AKISUITE_TAX_READY",
    "AKISUITE_SUBSCRIPTIONS_READY",
    "AKISUITE_FEATURES_READY",
  ])
    expect(operationsReleaseVars[gate]).toBe("false");
  expect(operationsReleaseVars.AKIBUSINESS_OPERATIONS_MIGRATIONS_READY).toBe(
    "true",
  );
});
it("readiness can invoke only bounded maintenance and cannot activate or approve collection", async () => {
  const before = (await db.query("select * from suite_funnel_private.settings"))
    .rows;
  const fetcher = vi.fn(async (url: unknown, options?: RequestInit) => {
    expect(String(url)).toBe(
      "https://funnel-fixture.test/rest/v1/rpc/purge_suite_business_funnel",
    );
    expect(JSON.parse(String(options?.body))).toEqual({ p_limit: 500 });
    await db.exec("set role service_role");
    const result = (
      await db.query<{ removed: number }>(
        "select public.purge_suite_business_funnel(500) removed",
      )
    ).rows[0].removed;
    await db.exec("reset role");
    return Response.json(result);
  });
  expect(
    await purgeBusinessFunnel(
      {
        ...operationsReleaseVars,
        NEXT_PUBLIC_SUPABASE_URL: "https://funnel-fixture.test",
        SUPABASE_SERVICE_ROLE_KEY: "disposable-private-fixture",
      },
      fetcher as typeof fetch,
    ),
  ).toEqual({ enabled: true, removed: 0 });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(
    (await db.query("select * from suite_funnel_private.settings")).rows,
  ).toEqual(before);
  expect(before[0]).toMatchObject({
    enabled: false,
    retention_days: null,
    retention_approval_ref: null,
    enabled_since: null,
  });
});
it("installed readers return inactive reporting and complete empty privacy exports without capturing data", async () => {
  await db.exec(
    `begin;select set_config('test.uid','${owner}',true);insert into crm_workspaces values('ready-workspace','${owner}','active',null);insert into crm_workspace_members values('ready-workspace','${owner}','owner','active');commit;select set_config('test.uid','${owner}',false);set role authenticated;`,
  );
  expect(
    (
      await db.query(
        "select public.suite_business_funnel('ready-workspace') result",
      )
    ).rows[0],
  ).toEqual({ result: { available: false, reason: "not_activated" } });
  await db.exec("reset role");
  await db.exec(
    `insert into account_private.onboarding values('${owner}','underage');set role authenticated`,
  );
  const rpc = vi.fn(async () => ({
    error: null,
    data: (
      await db.query<{ result: unknown }>(
        "select public.my_business_funnel_export() result",
      )
    ).rows[0].result,
  }));
  expect(
    await readBusinessFunnelExport({ rpc } as unknown as SupabaseClient),
  ).toEqual({ table: "business_funnel_observations", data: [], failed: false });
  await db.exec("reset role");
  expect(
    (await db.query("select count(*) n from suite_funnel_private.stages"))
      .rows[0],
  ).toEqual({ n: 0 });
  expect(
    (
      await db.query(
        "select enabled,retention_days,retention_approval_ref from suite_funnel_private.settings",
      )
    ).rows[0],
  ).toEqual({
    enabled: false,
    retention_days: null,
    retention_approval_ref: null,
  });
});
