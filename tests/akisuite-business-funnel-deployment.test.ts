import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import { createBusinessFunnelFixture } from "./helpers/business-funnel-fixture";
import { verifiedFunnelPhases } from "./helpers/business-funnel-installation";
const owner = "11111111-1111-4111-8111-111111111111";
let canonical: PGlite, phased: PGlite;
async function setup(db: PGlite) {
  await createBusinessFunnelFixture(db);
  // Hostile default grants model provider defaults; each committed phase must close them.
  await db.exec(
    "alter default privileges grant execute on functions to anon,authenticated,service_role;alter default privileges grant all on tables to anon,authenticated,service_role;",
  );
}
beforeAll(async () => {
  canonical = new PGlite();
  phased = new PGlite();
  await setup(canonical);
  await setup(phased);
  await canonical.exec(
    readFileSync(
      "supabase/migrations/20261020234414_trusted_business_funnel.sql",
      "utf8",
    ),
  );
  await canonical.exec(
    readFileSync(
      "supabase/migrations/20261021000745_trusted_funnel_privacy_export.sql",
      "utf8",
    ),
  );
}, 30000);
afterAll(async () => {
  await canonical.close();
  await phased.close();
});
async function absent(db: PGlite, name: string) {
  return (
    await db.query<{ absent: boolean }>(
      "select to_regclass($1) is null absent",
      [name],
    )
  ).rows[0].absent;
}
it("rejects missing dependencies atomically before exposing private schema or partial export", async () => {
  const phases = verifiedFunnelPhases();
  const preflight = (
    await phased.query(
      readFileSync(
        "database/deployments/trusted-business-funnel/preflight.sql",
        "utf8",
      ),
    )
  ).rows[0] as Record<
    string,
    { settings_present: boolean; reserved_enum_present: boolean }
  >;
  expect(Object.values(preflight)[0].settings_present).toBe(false);
  expect(Object.values(preflight)[0].reserved_enum_present).toBe(false);

  await expect(phased.exec(phases[1].sql)).rejects.toThrow(
    /Missing prerequisite/,
  );
  await phased.exec("rollback");
  expect(await absent(phased, "suite_funnel_private.settings")).toBe(true);
  await phased.exec(phases[0].sql);
  await phased.exec(phases[1].sql);
  await expect(phased.exec(phases[11].sql)).rejects.toThrow(
    /Missing prerequisite/,
  );
  await phased.exec("rollback");
  expect(
    await absent(phased, "suite_funnel_private.suite_funnel_subject_export"),
  ).toBe(true);
  // The enum is already installed in the reported recovery baseline: resume at phase01.
  expect(
    (
      await phased.query(
        "select count(*) n from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='analytics_action' and e.enumlabel='suite_business_stage'",
      )
    ).rows[0],
  ).toEqual({ n: 1 });
});
it("commits closed ACLs and disabled NULL settings at every boundary, rolling back failed phases", async () => {
  const phases = verifiedFunnelPhases();
  for (const phase of phases.slice(2)) {
    if (phase.id === "03") {
      await expect(
        phased.exec(
          phase.sql.replace(/\ncommit;\n$/, "\nselect 1/0;\ncommit;\n"),
        ),
      ).rejects.toThrow(/division by zero/);
      await phased.exec("rollback");
      expect(
        await absent(
          phased,
          "akibusiness_private.suite_funnel_billing_evidence",
        ),
      ).toBe(true);
    }
    await phased.exec(phase.sql);
    expect(
      (
        await phased.query(
          "select enabled,retention_days,retention_approval_ref,enabled_since from suite_funnel_private.settings",
        )
      ).rows,
    ).toEqual([
      {
        enabled: false,
        retention_days: null,
        retention_approval_ref: null,
        enabled_since: null,
      },
    ]);
    expect(
      (await phased.query("select count(*) n from suite_funnel_private.stages"))
        .rows[0],
    ).toEqual({ n: 0 });
    expect(
      (
        await phased.query(
          "select count(*) n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute'))",
        )
      ).rows[0],
    ).toEqual({ n: 0 });
    expect(
      (await phased.query("select current_setting('lock_timeout') value"))
        .rows[0],
    ).toEqual({ value: "0" });
    expect(
      (await phased.query("select current_setting('statement_timeout') value"))
        .rows[0],
    ).toEqual({ value: "0" });
    await phased.exec(
      `select set_config('test.uid','${owner}',false);set role authenticated`,
    );
    await expect(
      phased.exec("select * from suite_funnel_private.stages"),
    ).rejects.toThrow(/permission denied/);
    await expect(
      phased.exec(
        "select public.record_fixture_analytics('suite_business_stage')",
      ),
    ).rejects.toThrow(/Trusted funnel evidence required/);
    await phased.exec("reset role");
  }
}, 30000);
async function catalogue(db: PGlite) {
  return (
    await db.query(`
 select 'function' kind,n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' name,
 pg_get_functiondef(p.oid) definition,
 (select jsonb_agg(jsonb_build_array(coalesce(r.rolname,'PUBLIC'),a.privilege_type,a.is_grantable) order by coalesce(r.rolname,'PUBLIC'),a.privilege_type) from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a left join pg_roles r on r.oid=a.grantee) privileges
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' or (n.nspname='public' and p.proname in('suite_business_funnel','purge_suite_business_funnel','my_business_funnel_export'))
 union all
 select 'table',n.nspname||'.'||c.relname,jsonb_build_object('rls',c.relrowsecurity,'force',c.relforcerowsecurity,'columns',(select jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),'constraints',(select jsonb_agg(jsonb_build_array(co.conname,pg_get_constraintdef(co.oid)) order by co.conname) from pg_constraint co where co.conrelid=c.oid))::text,
 (select jsonb_agg(jsonb_build_array(coalesce(r.rolname,'PUBLIC'),a.privilege_type,a.is_grantable) order by coalesce(r.rolname,'PUBLIC'),a.privilege_type) from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a left join pg_roles r on r.oid=a.grantee)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='suite_funnel_private' and c.relkind='r'
 union all
 select 'trigger',t.tgname,pg_get_triggerdef(t.oid),null::jsonb from pg_trigger t where not t.tgisinternal and (t.tgname like 'suite_funnel_%' or t.tgname='trusted_funnel_analytics')
 union all
 select 'index',schemaname||'.'||indexname,indexdef,null::jsonb from pg_indexes where schemaname='suite_funnel_private' or indexname='suite_funnel_billing_evidence'
 union all
 select 'policy',schemaname||'.'||tablename||'.'||policyname,jsonb_build_object('permissive',permissive,'roles',roles,'cmd',cmd,'qual',qual,'check',with_check)::text,null::jsonb from pg_policies where schemaname='suite_funnel_private'
 union all
 select 'schema',n.nspname,'private schema',
 (select jsonb_agg(jsonb_build_array(coalesce(r.rolname,'PUBLIC'),a.privilege_type,a.is_grantable) order by coalesce(r.rolname,'PUBLIC'),a.privilege_type) from aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a left join pg_roles r on r.oid=a.grantee)
 from pg_namespace n where n.nspname='suite_funnel_private'
 order by kind,name`)
  ).rows;
}
it("matches canonical function bodies, trigger definitions, constraints, indexes, RLS, policies and ACLs", async () => {
  expect(await catalogue(phased)).toEqual(await catalogue(canonical));
  const result = (
    await phased.query(
      readFileSync(
        "database/deployments/trusted-business-funnel/readback.sql",
        "utf8",
      ),
    )
  ).rows[0];
  expect(Object.values(result as Record<string, unknown>)[0]).toMatchObject({
    optional_rows: 0,
    private_client_execute_grants: 0,
    trigger_count: 13,
    manager_authenticated_execute: true,
    manager_anon_execute: false,
    maintenance_service_execute: true,
    maintenance_authenticated_execute: false,
    privacy_authenticated_execute: true,
    privacy_anon_execute: false,
  });

  // Full privacy RPC remains available even with account-only features denied.
  for (const db of [canonical, phased]) {
    await db.exec(
      `select set_config('test.uid','${owner}',false);set role authenticated`,
    );
    expect(
      (await db.query("select my_business_funnel_export() result")).rows[0],
    ).toEqual({ result: { until: "0", total: 0, rows: [] } });
    await db.exec("reset role");
    expect((await db.query("select count(*) n from profiles")).rows[0]).toEqual(
      { n: 3 },
    );
    expect(
      (await db.query("select count(*) n from analytics_events")).rows[0],
    ).toEqual({ n: 0 });
  }
});
