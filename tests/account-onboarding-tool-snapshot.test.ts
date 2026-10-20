import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, expect, it } from "vitest";
const actor = "11111111-1111-4111-8111-111111111111";
const tools = [
  "crm",
  "inbox",
  "tasks",
  "calendar",
  "inventory",
  "pos",
  "sales",
  "marketing",
  "automation",
  "collaboration",
  "employees",
  "knowledge",
];
const modules: Record<string, string> = {
  tasks: "tasks",
  projects: "tasks",
  contacts: "crm",
  companies: "crm",
  deals: "crm",
  leads: "crm",
  pipelines: "crm",
  products: "inventory",
  warehouses: "inventory",
  invoices: "sales",
  campaigns: "marketing",
  pages: "marketing",
  forms: "marketing",
  automations: "automation",
  conversations: "inbox",
  feed: "collaboration",
  events: "calendar",
  knowledge: "knowledge",
  employees: "employees",
};
const initial = Object.fromEntries(
  Object.keys(modules).map((key) => [key, [{ secret: `retained-${key}` }]]),
);
let db: PGlite;
async function owner() {
  await db.exec(
    `reset role;set request.jwt.claim.sub='${actor}';set role authenticated`,
  );
}
async function read() {
  return (
    await db.query<{
      data: { data: Record<string, unknown>; updated_at: string };
    }>("select akihq_security.read_workspace_snapshot('tenant') data")
  ).rows[0].data;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role authenticated;create schema auth;create schema akihq_security;
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table public.profiles(id uuid,app_role text);insert into profiles values('${actor}','consumer');
 create table public.crm_workspaces(id text primary key,name text,slug text,timezone text,currency text,status text);insert into crm_workspaces values('tenant','Tenant','tenant','Europe/Madrid','EUR','active');
 create table public.workspace_snapshots(workspace_id text primary key,data jsonb,updated_by uuid,updated_at timestamptz);
 create table public.test_licences(tool text primary key);
 create function public.crm_can_access_workspace(w text)returns boolean language sql stable security definer as $$select w='tenant' and auth.uid()='${actor}'::uuid$$;
 create function public.crm_can_operate_workspace(w text)returns boolean language sql stable security definer as $$select public.crm_can_access_workspace(w)$$;
 create function public.crm_has_tool(w text,t text)returns boolean language sql stable security definer as $$select public.crm_can_access_workspace(w) and exists(select 1 from public.test_licences where tool=case t when 'sites' then 'marketing' else t end)$$;
 create function public.crm_member_has_tool(w text,t text)returns boolean language sql stable security definer as $$select public.crm_has_tool(w,t)$$;
 create function akihq_security.can_administer(w text)returns boolean language sql stable security definer as $$select public.crm_can_access_workspace(w)$$;
 create function akihq_security.workspace_access(w text)returns jsonb language plpgsql stable security definer as $$begin if not public.crm_can_access_workspace(w)then raise exception 'Workspace access required';end if;return '{}'::jsonb;end$$;
 grant usage on schema auth,akihq_security to authenticated;
 revoke all on public.workspace_snapshots from authenticated;`);
  await db.exec(
    readFileSync(
      new URL("./fixtures/account-tool-snapshot.sql", import.meta.url),
      "utf8",
    ),
  );
});
afterAll(async () => db.close());
it.each(tools)(
  "generic snapshot owner read/write intersects the %s licence for every module",
  async (tool) => {
    await db.exec("reset role;delete from public.test_licences");
    await db.query("insert into public.test_licences values($1)", [tool]);
    await db.query(
      "insert into public.workspace_snapshots values('tenant',$1,$2,clock_timestamp()) on conflict(workspace_id)do update set data=excluded.data,updated_at=excluded.updated_at",
      [initial, actor],
    );
    await owner();
    const current = await read();
    for (const [key, required] of Object.entries(modules))
      expect(current.data[key]).toEqual(required === tool ? initial[key] : []);
    const proposed = Object.fromEntries(
      Object.keys(modules).map((key) => [key, [{ secret: `changed-${key}` }]]),
    );
    await db.query(
      "select akihq_security.write_workspace_snapshot('tenant',$1,$2::timestamptz)",
      [proposed, current.updated_at],
    );
    const returned = await read();
    await db.exec("reset role");
    const raw = (
      await db.query<{ data: Record<string, unknown> }>(
        "select data from workspace_snapshots where workspace_id='tenant'",
      )
    ).rows[0].data;
    for (const [key, required] of Object.entries(modules)) {
      expect(raw[key]).toEqual(
        required === tool ? proposed[key] : initial[key],
      );
      expect(returned.data[key]).toEqual(
        required === tool ? proposed[key] : [],
      );
    }
  },
);
it("raw legacy snapshots remain unreadable to authenticated callers", async () => {
  await owner();
  await expect(
    db.query("select * from public.workspace_snapshots"),
  ).rejects.toThrow(/permission denied/);
});
it("retains disabled tool data and restores it when the licence returns", async () => {
  await db.exec(
    "reset role;delete from test_licences;insert into test_licences values('inventory')",
  );
  await db.query("update workspace_snapshots set data=$1", [initial]);
  await owner();
  expect((await read()).data.contacts).toEqual([]);
  await db.exec(
    "reset role;delete from test_licences;insert into test_licences values('crm')",
  );
  await owner();
  expect((await read()).data.contacts).toEqual(initial.contacts);
});
