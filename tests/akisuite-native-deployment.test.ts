import type { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
import {
  nativeDeploymentFixture,
  nativeOwner,
} from "./helpers/native-deployment-fixture";
import {
  buildDeployment,
  deploymentDirectory,
  sourceMigrations,
  digest,
} from "../scripts/build-native-accommodation-deployment.mjs";
let canonical: PGlite, phased: PGlite;
const deployment = await buildDeployment();
const functionFilter = deployment.manifest.function_names
  .map((n) => `'${n}'`)
  .join(",");
const phases = deployment.manifest.phases.map((p) => ({
  ...p,
  sql: readFileSync(`${deploymentDirectory}/${p.file}`, "utf8"),
}));
async function as(db: PGlite, role: string, sql: string) {
  await db.exec(
    `set role ${role};select set_config('test.uid','${nativeOwner}',false)`,
  );
  try {
    return await db.query(sql);
  } finally {
    try {
      await db.exec("reset role");
    } catch {
      /* A failed probe statement retains its original error until rollback to savepoint. */
    }
  }
}
beforeAll(async () => {
  canonical = await nativeDeploymentFixture();
  phased = await nativeDeploymentFixture();
  for (const file of sourceMigrations)
    await canonical.exec(readFileSync(`database/migrations/${file}`, "utf8"));
}, 30000);
afterAll(async () => {
  await canonical?.close();
  await phased?.close();
});

async function catalogue(db: PGlite) {
  return (
    await db.query(`
 select 'function' kind,n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' name,pg_get_functiondef(p.oid) definition,
 (select jsonb_agg(jsonb_build_array(coalesce(r.rolname,'PUBLIC'),a.privilege_type,a.is_grantable) order by coalesce(r.rolname,'PUBLIC'),a.privilege_type) from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a left join pg_roles r on r.oid=a.grantee) privileges
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='accommodation_private' or n.nspname||'.'||p.proname in(${functionFilter})
 union all
 select 'table',n.nspname||'.'||c.relname,jsonb_build_object('rls',c.relrowsecurity,'force',c.relforcerowsecurity,'columns',(select jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid)) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),'constraints',(select jsonb_agg(jsonb_build_array(co.conname,pg_get_constraintdef(co.oid)) order by co.conname) from pg_constraint co where co.conrelid=c.oid))::text,
 (select jsonb_agg(jsonb_build_array(coalesce(r.rolname,'PUBLIC'),a.privilege_type,a.is_grantable) order by coalesce(r.rolname,'PUBLIC'),a.privilege_type) from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) a left join pg_roles r on r.oid=a.grantee)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname in('accommodation_property_private','accommodation_private','storage') or (n.nspname='public' and c.relname like 'accommodation%'))
 union all
 select 'sequence',n.nspname||'.'||c.relname,jsonb_build_array(s.seqstart,s.seqincrement,s.seqmax,s.seqmin,s.seqcache,s.seqcycle)::text,
 (select jsonb_agg(jsonb_build_array(coalesce(r.rolname,'PUBLIC'),a.privilege_type,a.is_grantable) order by coalesce(r.rolname,'PUBLIC'),a.privilege_type) from aclexplode(coalesce(c.relacl,acldefault('S',c.relowner))) a left join pg_roles r on r.oid=a.grantee)
 from pg_sequence s join pg_class c on c.oid=s.seqrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in('accommodation_property_private','accommodation_private')
 union all
 select 'trigger',n.nspname||'.'||c.relname||'.'||t.tgname,pg_get_triggerdef(t.oid),null::jsonb from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and (n.nspname='accommodation_property_private' or t.tgname like '%accommodation%' or t.tgname like 'native_%')
 union all
 select 'index',schemaname||'.'||indexname,indexdef,null::jsonb from pg_indexes where schemaname in('accommodation_property_private','accommodation_private','storage') or (schemaname='public' and tablename like 'accommodation%')
 union all
 select 'policy',schemaname||'.'||tablename||'.'||policyname,jsonb_build_object('permissive',permissive,'roles',roles,'cmd',cmd,'qual',qual,'check',with_check)::text,null::jsonb from pg_policies where schemaname in('accommodation_property_private','accommodation_private','storage') or (schemaname='public' and tablename like 'accommodation%')
 union all
 select 'schema',n.nspname,'schema ACL',(select jsonb_agg(jsonb_build_array(coalesce(r.rolname,'PUBLIC'),a.privilege_type,a.is_grantable) order by coalesce(r.rolname,'PUBLIC'),a.privilege_type) from aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a left join pg_roles r on r.oid=a.grantee) from pg_namespace n where n.nspname in('accommodation_property_private','accommodation_private','storage')
 order by kind,name`)
  ).rows;
}

it("fails atomically on unsafe existing bucket mutation policies and non-fresh native state", async () => {
  const db = await nativeDeploymentFixture();
  try {
    await db.exec(
      "create policy unsafe_buckets on storage.buckets to authenticated using(true) with check(true)",
    );
    await expect(db.exec(phases[0].sql)).rejects.toThrow(
      /bucket mutation policy/,
    );
    await db.exec("rollback");
    expect(
      (
        await db.query(
          "select to_regnamespace('accommodation_property_private') is null absent",
        )
      ).rows[0],
    ).toEqual({ absent: true });
    expect(
      (
        await db.query(
          "select count(*) n from pg_policies where policyname='native_deployment_bucket_hold'",
        )
      ).rows[0],
    ).toEqual({ n: 0 });
    await db.exec(
      "drop policy unsafe_buckets on storage.buckets;create schema accommodation_property_private",
    );
    await expect(db.exec(phases[0].sql)).rejects.toThrow(
      /Native schema already exists/,
    );
    await db.exec("rollback");
  } finally {
    await db.close();
  }
});

async function assertStorageClosed(db: PGlite) {
  // Disposable rollback-only probe: disable only the owner-controlled native evidence trigger,
  // so client RLS is tested independently even after the final trigger exists.
  await db.exec("begin");
  try {
    if (
      (
        await db.query<{ n: number }>(
          "select count(*) n from pg_trigger where tgname='native_accommodation_storage_evidence' and not tgisinternal",
        )
      ).rows[0].n
    )
      await db.exec(
        "alter table storage.objects disable trigger native_accommodation_storage_evidence",
      );
    await db.exec(
      "insert into storage.buckets(id,name,public) values('accommodation-media','accommodation-media',false) on conflict(id) do nothing;insert into storage.objects(bucket_id,name,metadata,user_metadata) values('accommodation-media','probe.png','{}','{}')",
    );
    for (const role of ["anon", "authenticated"]) {
      expect(
        (
          await as(
            db,
            role,
            "select * from storage.objects where bucket_id='accommodation-media'",
          )
        ).rows,
      ).toEqual([]);
      expect(
        (
          await as(
            db,
            role,
            "update storage.objects set metadata='{}' where bucket_id='accommodation-media' returning name",
          )
        ).rows,
      ).toEqual([]);
      expect(
        (
          await as(
            db,
            role,
            "delete from storage.objects where bucket_id='accommodation-media' returning name",
          )
        ).rows,
      ).toEqual([]);
      // A failed statement aborts its savepoint only, retaining the enclosing probe.
      await db.exec("savepoint rejected_insert");
      await expect(
        as(
          db,
          role,
          "insert into storage.objects(bucket_id,name) values('accommodation-media','forged.png')",
        ),
      ).rejects.toThrow(/row-level security/);
      await db.exec("rollback to savepoint rejected_insert;reset role");
      await db.exec("savepoint rejected_move");
      await expect(
        as(
          db,
          role,
          "update storage.objects set bucket_id='accommodation-media' where bucket_id='legacy-media'",
        ),
      ).rejects.toThrow(/row-level security/);
      await db.exec("rollback to savepoint rejected_move;reset role");
      expect(
        (
          await as(
            db,
            role,
            "select name from storage.objects where bucket_id='legacy-media'",
          )
        ).rows,
      ).toEqual([{ name: "keep.png" }]);
    }
  } finally {
    await db.exec("rollback");
  }
}

it("keeps every committed boundary closed under hostile default grants, with disabled/empty gates and unchanged legacy access", async () => {
  for (const phase of phases) {
    if (phase.id === "01") {
      const before = await catalogue(phased);
      await expect(
        phased.exec(
          phase.sql.replace(/\ncommit;\n$/, "\nselect 1/0;\ncommit;\n"),
        ),
      ).rejects.toThrow(/division by zero/);
      await phased.exec("rollback");
      expect(await catalogue(phased)).toEqual(before);
    }
    expect(digest(phase.sql)).toBe(phase.sha256);
    await phased.exec(phase.sql);
    expect(
      (
        await phased.query(
          "select current_setting('lock_timeout') lock,current_setting('statement_timeout') statement,current_setting('idle_in_transaction_session_timeout') idle",
        )
      ).rows[0],
    ).toEqual({ lock: "0", statement: "0", idle: "0" });
    const tables = (
      await phased.query<{ name: string; rls: boolean }>(
        "select c.oid::regclass::text name,c.relrowsecurity rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and (n.nspname='accommodation_property_private' or(n.nspname='public' and(c.relname='accommodation_properties' or c.relname like 'accommodation_property_%'))) order by name",
      )
    ).rows;
    for (const table of tables) {
      expect(table.rls).toBe(true);
      for (const role of ["anon", "authenticated"]) {
        try {
          expect(
            (await as(phased, role, `select * from ${table.name}`)).rows,
          ).toEqual([]);
        } catch (e) {
          expect(String(e)).toMatch(/permission denied/);
        }
      }
    }
    expect(
      (
        await phased.query(
          "select count(*) n from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where (n.nspname='accommodation_property_private' or(n.nspname='public' and p.proname like '%accommodation%')) and a.grantee=0",
        )
      ).rows[0],
    ).toEqual({ n: 0 });
    const functions = (
      await phased.query<{ identity: string }>(
        "select p.oid::regprocedure::text identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='accommodation_property_private'",
      )
    ).rows;
    for (const fn of functions)
      for (const role of ["anon", "authenticated", "service_role"])
        expect(
          (
            await phased.query(
              "select has_function_privilege($1,$2,'execute') allowed",
              [role, fn.identity],
            )
          ).rows[0],
        ).toEqual({ allowed: false });
    if (
      tables.some(
        (t) => t.name === "accommodation_property_private.launch_settings",
      )
    )
      expect(
        (
          await phased.query(
            "select to_jsonb(s) - 'singleton' gates from accommodation_property_private.launch_settings s",
          )
        ).rows[0],
      ).toEqual({
        gates:
          phase.source_statements.some((s) => s.migration.includes("002500")) ||
          tables.some((t) => t.name.endsWith("room_types"))
            ? {
                enabled: false,
                uploads_enforced: false,
                inventory_enabled: false,
              }
            : { enabled: false, uploads_enforced: false },
      });
    expect(
      (
        await as(
          phased,
          "service_role",
          "select accommodation_private.legacy_helper() value",
        )
      ).rows[0],
    ).toEqual({ value: "retained" });
    expect(
      (await phased.query("select * from public.accommodation_reservations"))
        .rows,
    ).toEqual([{ legacy_id: "retained-booking" }]);
    // The fully privileged owner is still gated off through every newly callable RPC.
    const publicFunctions = (
      await phased.query<{ name: string; args: string; identity: string }>(
        `select p.proname name,array_to_string(array(select 'null::'||format_type(t,null) from unnest(p.proargtypes) t),',') args,p.oid::regprocedure::text identity from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and n.nspname||'.'||p.proname in(${functionFilter})`,
      )
    ).rows;
    for (const fn of publicFunctions) {
      try {
        const result = await as(
          phased,
          "authenticated",
          `select to_jsonb(public.${fn.name}(${fn.args})) value`,
        );
        expect(result.rows).toEqual([{ value: false }]);
      } catch (e) {
        expect(String(e)).toMatch(
          /permission denied|Account access required|Property membership required|Property owner required|Property uploads unavailable|Administrator required/,
        );
      }
    }
    for (const fn of publicFunctions.filter((f) =>
      ["complete_accommodation_upload", "cancel_accommodation_upload"].includes(
        f.name,
      ),
    ))
      expect(
        (
          await phased.query(
            "select has_function_privilege('authenticated',$1,'execute') allowed",
            [fn.identity],
          )
        ).rows[0],
      ).toEqual({ allowed: false });
    if (publicFunctions.some((f) => f.name === "cancel_accommodation_upload"))
      expect(
        (
          await as(
            phased,
            "service_role",
            "select cancel_accommodation_upload(null) value",
          )
        ).rows,
      ).toEqual([{ value: false }]);
    if (publicFunctions.some((f) => f.name === "complete_accommodation_upload"))
      await expect(
        as(
          phased,
          "service_role",
          "select complete_accommodation_upload(null,null)",
        ),
      ).rejects.toThrow(/Invalid receipt/);
    await assertStorageClosed(phased);
  }
}, 60000);

it("matches the complete canonical final catalogue and retained data, without a deployment hold or activation", async () => {
  expect(await catalogue(phased)).toEqual(await catalogue(canonical));
  const readback = (
    await phased.query<{ native_readback: unknown }>(
      deployment.files["readback.sql"],
    )
  ).rows[0].native_readback as {
    gates: Record<string, boolean>;
    table_rows: Record<string, number>;
    native_functions: number;
  };
  expect(Object.values(readback.table_rows).every((n) => n === 0)).toBe(true);
  expect(readback.gates).toEqual({
    singleton: true,
    enabled: false,
    uploads_enforced: false,
    inventory_enabled: false,
  });
  expect(readback.native_functions).toBe(
    deployment.manifest.function_names.length,
  );
  expect(
    (
      await phased.query(
        "select count(*) n from pg_policies where policyname='native_deployment_bucket_hold'",
      )
    ).rows[0],
  ).toEqual({ n: 0 });
  expect(
    (await phased.query("select * from storage.buckets order by id")).rows,
  ).toEqual(
    (await canonical.query("select * from storage.buckets order by id")).rows,
  );
  expect(
    (
      await phased.query(
        "select * from storage.objects order by bucket_id,name",
      )
    ).rows,
  ).toEqual(
    (
      await canonical.query(
        "select * from storage.objects order by bucket_id,name",
      )
    ).rows,
  );
});

it("also matches canonical final ACLs with ordinary PostgreSQL defaults", async () => {
  const ordinary = await nativeDeploymentFixture(false),
    divided = await nativeDeploymentFixture(false);
  try {
    for (const file of sourceMigrations)
      await ordinary.exec(readFileSync(`database/migrations/${file}`, "utf8"));
    for (const phase of phases) await divided.exec(phase.sql);
    expect(await catalogue(divided)).toEqual(await catalogue(ordinary));
  } finally {
    await ordinary.close();
    await divided.close();
  }
}, 30000);

it("refuses nonempty native data without deleting or modifying that data", async () => {
  const db = await nativeDeploymentFixture();
  try {
    let next = 0;
    for (const phase of phases) {
      await db.exec(phase.sql);
      next++;
      if (
        (
          await db.query<{ ready: boolean }>(
            "select to_regclass('public.accommodation_properties') is not null ready",
          )
        ).rows[0].ready
      )
        break;
    }
    await db.exec(
      `insert into public.accommodation_properties(name,owner_profile_id) values('Unexpected retained property','${nativeOwner}')`,
    );
    await expect(db.exec(phases[next].sql)).rejects.toThrow(/requires empty/);
    await db.exec("rollback");
    expect(
      (await db.query("select name from accommodation_properties")).rows,
    ).toEqual([{ name: "Unexpected retained property" }]);
    expect(
      (
        await db.query(
          "select enabled,uploads_enforced from accommodation_property_private.launch_settings",
        )
      ).rows[0],
    ).toEqual({ enabled: false, uploads_enforced: false });
  } finally {
    await db.close();
  }
}, 30000);

it("replays only the specifically reviewed phase21 after a committed body and missing provider receipt", async () => {
  const db = await nativeDeploymentFixture();
  try {
    const reviewed = phases.find((p) => p.id === "21")!;
    expect(reviewed.sql).toContain(
      "create or replace function public.accommodation_property_team",
    );
    expect(reviewed.sql).not.toMatch(
      /\bcreate\s+(?:table|schema|index)\b|\binsert into\b/i,
    );
    for (const phase of phases.filter((p) => Number(p.id) <= 21))
      await db.exec(phase.sql);
    const beforeReplay = await catalogue(db);
    await db.exec(reviewed.sql);
    expect(await catalogue(db)).toEqual(beforeReplay);
    expect(
      (
        await db.query(
          "select count(*) n from pg_policies where policyname='native_deployment_bucket_hold'",
        )
      ).rows[0],
    ).toEqual({ n: 1 });
    await db.exec(phases.find((p) => p.id === "22")!.sql);
    expect(await catalogue(db)).toEqual(await catalogue(canonical));
    await expect(db.exec(phases[0].sql)).rejects.toThrow(/already exists/);
    await db.exec("rollback");
    expect(
      (await db.query("select * from accommodation_private.legacy_settings"))
        .rows,
    ).toEqual([{ value: "retained" }]);
  } finally {
    await db.close();
  }
}, 30000);
