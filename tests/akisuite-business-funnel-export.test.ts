import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { readBusinessFunnelExport } from "../src/lib/business-funnel-export";
const name = "20261021000745_trusted_funnel_privacy_export.sql";
const owner = "11111111-1111-4111-8111-111111111111",
  foreign = "22222222-2222-4222-8222-222222222222";
let db: PGlite;
const actor = async (id: string, role = "authenticated") =>
  db.exec(
    `reset role;select set_config('test.uid','${id}',false);set role ${role}`,
  );
const query = async (after = "0", until: string | null = null, limit = 500) =>
  (
    await db.query<{ r: unknown }>(
      "select my_business_funnel_export($1,$2,$3) r",
      [after, until, limit],
    )
  ).rows[0].r;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema suite_funnel_private;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
 create function public.account_features_allowed() returns boolean language plpgsql as $$begin raise exception 'Must not use feature lock for privacy';end$$;
 create table profiles(id uuid primary key,status text,birth_year int);
 create table suite_funnel_private.stages(analytics_id bigint primary key,profile_id uuid references profiles on delete cascade,stage text,workspace_id text,venue_id uuid,occurred_at timestamptz default now(),consented_at timestamptz default now(),proof_key text);
 revoke all on schema suite_funnel_private from public,anon,authenticated;
 revoke all on suite_funnel_private.stages from public,anon,authenticated;
 grant usage on schema public,auth to anon,authenticated;
 insert into profiles values('${owner}','pending',2020),('${foreign}','complete',1990);
 insert into suite_funnel_private.stages(analytics_id,profile_id,stage,workspace_id,proof_key) select g,'${owner}','payment_verified','own','stripe-invoice:in_private_'||g from generate_series(1,1201) g;
 insert into suite_funnel_private.stages(analytics_id,profile_id,stage,workspace_id,proof_key)values(1202,'${foreign}','payment_verified','FOREIGN','stripe-invoice:in_foreign');`);
  await db.exec(readFileSync("supabase/migrations/" + name, "utf8"));
}, 30000);
afterAll(() => db.close());
it("mirrors additive schema and permits pending/underage own privacy access without provider IDs or feature checks", async () => {
  expect(readFileSync("database/migrations/" + name, "utf8")).toBe(
    readFileSync("supabase/migrations/" + name, "utf8"),
  );
  await actor(owner);
  const r = (await query()) as {
    until: string;
    total: number;
    rows: Record<string, unknown>[];
  };
  expect(r.until).toBe("1201");
  expect(r.total).toBe(1201);
  expect(r.rows).toHaveLength(500);
  expect(r.rows[0]).toHaveProperty("consented_at");
  expect(r.rows[0]).not.toHaveProperty("proof_key");
  expect(JSON.stringify(r)).not.toMatch(/stripe-|FOREIGN/);
  await expect(
    db.exec("select * from suite_funnel_private.stages"),
  ).rejects.toThrow(/permission denied/);
});
it("paginates beyond REST row caps with fixed watermark, excluding later facts and foreign data", async () => {
  await actor(owner);
  const rpc = vi.fn(async (_name: string, args: Record<string, unknown>) => ({
    data: await query(
      args.p_after as string,
      args.p_until as string | null,
      args.p_limit as number,
    ),
    error: null,
  }));
  const r = await readBusinessFunnelExport({
    rpc,
  } as unknown as SupabaseClient);
  expect(r.failed).toBe(false);
  expect(r.data).toHaveLength(1201);
  expect(rpc).toHaveBeenCalledTimes(3);
  expect(rpc.mock.calls[1][1]).toEqual({
    p_after: "500",
    p_until: "1201",
    p_limit: 500,
  });
  await db.exec("reset role");
  await db.exec(
    `insert into suite_funnel_private.stages values(1203,'${owner}','checkout_started','own',null,now(),now(),'checkout:secret')`,
  );
  await actor(owner);
  const last = (await query("1000", "1201")) as {
    total: number;
    rows: unknown[];
  };
  expect(last.total).toBe(1201);
  expect(last.rows).toHaveLength(201);
  await actor(foreign);
  const f = (await query()) as {
    total: number;
    rows: Record<string, unknown>[];
  };
  expect(f.total).toBe(1);
  expect(f.rows[0].workspace_id).toBe("FOREIGN");
});
it("denies anonymous access and malformed continuations, with deletion retaining only actual own rows", async () => {
  await actor("", "anon");
  await expect(query()).rejects.toThrow(/permission denied/);
  await actor("");
  await expect(query()).rejects.toThrow(/Authentication/);
  await actor(owner);
  for (const args of [
    ["-1", null, 1],
    ["0", "garbage", 1],
    ["9999", "1", 1],
    ["0", null, 1001],
  ] as const)
    await expect(query(...args)).rejects.toThrow();
  await db.exec(`reset role;begin;delete from profiles where id='${owner}';`);
  await db.query("select set_config('test.uid',$1,false)", [owner]);
  expect(await query()).toEqual({ until: "0", total: 0, rows: [] });
  await db.exec("rollback");
});
const makeRow = (id: number) => ({
  analytics_id: String(id),
  stage: "payment_verified",
  workspace_id: "own",
  venue_id: null,
  occurred_at: "2026-10-21T00:00:00Z",
  consented_at: "2026-10-20T00:00:00Z",
});
it("rejects partial exports after failure, changed counts, malformed evidence or repeated continuation", async () => {
  for (const mode of ["error", "count", "repeat", "extra"]) {
    let calls = 0;
    const rpc = vi.fn(async () => {
      calls++;
      if (calls === 1)
        return {
          data: { until: "2", total: 2, rows: [makeRow(1)] },
          error: null,
        };
      if (mode === "error") return { error: { message: "transport" } };
      return {
        error: null,
        data: {
          until: "2",
          total: mode === "count" ? 3 : 2,
          rows: [
            mode === "extra"
              ? { ...makeRow(2), proof_key: "private" }
              : makeRow(mode === "repeat" ? 1 : 2),
          ],
        },
      };
    });
    expect(
      await readBusinessFunnelExport({ rpc } as unknown as SupabaseClient),
    ).toEqual({
      table: "business_funnel_observations",
      data: [],
      failed: true,
    });
  }
});
it("fails explicitly when bounded request budget cannot complete, without silent truncation", async () => {
  let id = 0;
  const rpc = vi.fn(async () => ({
    error: null,
    data: { until: "1000", total: 1000, rows: [makeRow(++id)] },
  }));
  const r = await readBusinessFunnelExport({
    rpc,
  } as unknown as SupabaseClient);
  expect(r.failed).toBe(true);
  expect(r.data).toEqual([]);
  expect(rpc).toHaveBeenCalledTimes(80);
});
it("preserves identity-only route, schema-ready export and full-export failure contract", () => {
  const source = readFileSync(
    "src/app/[locale]/account/export/route.ts",
    "utf8",
  );
  expect(source).toContain("supabase.auth.getUser()");
  expect(source).toContain("readBusinessFunnelExport(supabase)");
  expect(source).toContain('AKISUITE_FUNNEL_READY === "true"');
  expect(source).not.toMatch(
    /requireUser|requireAccountFeatures|account_features_allowed/,
  );
  expect(source).toContain("if (failedTables.length)");
  expect(source).toContain("status: 503");
  expect(source).toContain('"Cache-Control": "private, no-store"');
  expect(source).toContain('p_action: "export"');
  expect(source).toContain('"my_account_onboarding"');
});
