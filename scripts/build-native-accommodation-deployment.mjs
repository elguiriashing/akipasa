import fs from "node:fs";
import { format } from "prettier";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const deploymentDirectory = "database/deployments/native-accommodation";
export const sourceMigrations = [
  "20261021001000_native_accommodation_listing_foundation.sql",
  "20261021002500_native_accommodation_inventory.sql",
  "20261021005500_native_accommodation_review_queue.sql",
];
const expectedSourceHashes = {
  "20261021001000_native_accommodation_listing_foundation.sql":
    "58618402b44d6f7feb183275514422a91741772eb77737d0423e862348a7c43a",
  "20261021002500_native_accommodation_inventory.sql":
    "f4646aa11d0136e194beffb1f8b387f998fbb39c85696b25347304045391556f",
  "20261021005500_native_accommodation_review_queue.sql":
    "e97bfa130e5ade157c308fe48ffe4516341f509a9e7bcb0ac2bd8131ddeb7170",
};
export const digest = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
// Provenance: trusted-business-funnel splitter; copied verbatim, no sibling import.
export function splitSql(source) {
  const statements = [];
  let start = 0,
    quote = null,
    dollar = null,
    line = false,
    block = 0;
  for (let i = 0; i < source.length; i++) {
    const c = source[i],
      n = source[i + 1];
    if (line) {
      if (c === "\n") line = false;
      continue;
    }
    if (block) {
      if (c === "/" && n === "*") {
        block++;
        i++;
      } else if (c === "*" && n === "/") {
        block--;
        i++;
      }
      continue;
    }
    if (dollar) {
      if (source.startsWith(dollar, i)) {
        i += dollar.length - 1;
        dollar = null;
      }
      continue;
    }
    if (quote) {
      if (c === quote) {
        if (n === quote) i++;
        else quote = null;
      }
      continue;
    }
    if (c === "-" && n === "-") {
      line = true;
      i++;
      continue;
    }
    if (c === "/" && n === "*") {
      block = 1;
      i++;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      continue;
    }
    if (c === "$") {
      const match = source.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/);
      if (match) {
        dollar = match[0];
        i += dollar.length - 1;
        continue;
      }
    }
    if (c === ";") {
      statements.push(source.slice(start, i + 1).trim());
      start = i + 1;
    }
  }
  if (quote || dollar || block)
    throw new Error("Unterminated SQL literal/comment");
  if (source.slice(start).trim()) throw new Error("Unterminated SQL statement");
  return statements;
}

const clean = (s) =>
  s.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, "");
function commaList(s) {
  const result = [];
  let start = 0,
    depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "(") depth++;
    if (s[i] === ")") depth--;
    if (s[i] === "," && !depth) {
      result.push(s.slice(start, i).trim());
      start = i + 1;
    }
  }
  result.push(s.slice(start).trim());
  return result;
}
const hold = "native_deployment_bucket_hold";
const wrapper =
  "begin;\nset local lock_timeout='2s';\nset local statement_timeout='8s';\nset local idle_in_transaction_session_timeout='15s';\n";
const gate = `do $native_closed$ declare r record; v boolean;begin
 if to_regclass('accommodation_property_private.launch_settings') is not null then
  if not exists(select 1 from accommodation_property_private.launch_settings) or exists(select 1 from accommodation_property_private.launch_settings s where s.enabled or s.uploads_enforced or coalesce(to_jsonb(s)->>'inventory_enabled','false')<>'false') then raise exception 'Native deployment requires disabled settings';end if;
 end if;
 for r in select c.oid::regclass t from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='r' and ((n.nspname='accommodation_property_private' and c.relname<>'launch_settings') or (n.nspname='public' and (c.relname='accommodation_properties' or c.relname like 'accommodation_property_%'))) loop
  execute format('select exists(select 1 from %s limit 1)',r.t) into v;if v then raise exception 'Native deployment requires empty tables';end if;
 end loop;
 if exists(select 1 from storage.buckets where id='accommodation-media' and public) then raise exception 'Native bucket must remain private';end if;
 if exists(select 1 from storage.objects where bucket_id='accommodation-media') then raise exception 'Native deployment requires empty Storage';end if;
end $native_closed$;`;
const holdCheck = `do $native_hold$ begin if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='${hold}' and permissive='RESTRICTIVE' and cmd='ALL') then raise exception 'Native Storage hold missing';end if;end $native_hold$;`;
export async function buildDeployment() {
  const statements = [];
  const sources = sourceMigrations.map((migration) => {
    const content = fs.readFileSync(
      path.join(root, "database/migrations", migration),
      "utf8",
    );
    if (digest(content) !== expectedSourceHashes[migration])
      throw new Error(
        "Canonical native source changed; review a new deployment contract: " +
          migration,
      );
    if (
      content !==
      fs.readFileSync(path.join(root, "supabase/migrations", migration), "utf8")
    )
      throw Error("Migration mirrors differ: " + migration);
    splitSql(content).forEach((sql, index) => {
      if (!/^(begin|commit);$/i.test(clean(sql)))
        statements.push({
          sql,
          migration,
          statement: index + 1,
          sha256: digest(sql),
        });
    });
    return {
      path: "database/migrations/" + migration,
      sha256: digest(content),
    };
  });
  const functionAcls = new Map();
  for (const { sql: raw } of statements) {
    const sql = clean(raw),
      m = sql.match(
        /^(revoke|grant) (.+?) on function ([\s\S]+?) (from|to) ([\s\S]+);$/i,
      );
    if (m)
      for (const identity of commaList(m[3])) {
        const name = identity.slice(0, identity.indexOf("("));
        if (!functionAcls.has(name)) functionAcls.set(name, []);
        functionAcls
          .get(name)
          .push(`${m[1]} ${m[2]} on function ${identity} ${m[4]} ${m[5]};`);
      }
  }
  const units = [];
  for (const item of statements) {
    const sql = clean(item.sql);
    let extra = [];
    const table = sql.match(/^create table ([\w.]+)\(/i)?.[1];
    if (table)
      extra.push(
        `alter table ${table} enable row level security;`,
        `revoke all on ${table} from public,anon,authenticated;`,
      );
    const schema = sql.match(/^create schema ([\w]+);/i)?.[1];
    if (schema)
      extra.push(
        `revoke all on schema ${schema} from public,anon,authenticated;`,
      );
    const fn = sql.match(
      /^create(?: or replace)? function ([\w.]+)\(([^)]*)\)/i,
    );
    if (fn) {
      if (fn[1].startsWith("accommodation_property_private.")) {
        const types = commaList(fn[2])
          .filter(Boolean)
          .map((a) => a.trim().split(/\s+/)[1])
          .join(",");
        extra.push(
          `revoke all on function ${fn[1]}(${types}) from public,anon,authenticated,service_role;`,
        );
      } else {
        const acl = functionAcls.get(fn[1]);
        if (!acl?.length)
          throw Error("Missing canonical function ACL " + fn[1]);
        extra.push(...acl);
      }
    }
    units.push({
      sql: [item.sql, ...extra].join("\n"),
      sources: [
        {
          migration: item.migration,
          statement: item.statement,
          sha256: item.sha256,
        },
      ],
    });
  }
  const first = units.shift();
  if (!first.sql.includes("Shared account eligibility contract required"))
    throw Error("Unexpected native preflight");
  const preflight = `do $native_fresh$ begin
 if to_regnamespace('accommodation_property_private') is not null then raise exception 'Native schema already exists; reconcile exact deployment receipts';end if;
 if not exists(select 1 from pg_class where oid='storage.objects'::regclass and relrowsecurity) or not exists(select 1 from pg_class where oid='storage.buckets'::regclass and relrowsecurity) then raise exception 'Storage RLS prerequisite required';end if;
 if exists(select 1 from pg_policy p where p.polrelid='storage.buckets'::regclass and p.polpermissive and p.polcmd in('*','a','w','d') and (0=any(p.polroles) or exists(select 1 from pg_roles r where r.oid=any(p.polroles) and (pg_has_role('anon',r.oid,'USAGE') or pg_has_role('authenticated',r.oid,'USAGE'))))) then raise exception 'Client bucket mutation policy requires explicit privacy review';end if;
 if exists(select 1 from pg_policy where polrelid='storage.objects'::regclass and polname='${hold}') then raise exception 'Native Storage hold already exists; inspect prior receipt';end if;
end $native_fresh$;`;
  const groups = [
    {
      units: [
        first,
        { sql: preflight, sources: [] },
        {
          sql: `create policy ${hold} on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'accommodation-media') with check(bucket_id<>'accommodation-media');`,
          sources: [],
        },
      ],
    },
  ];
  let group = { units: [] };
  const render = (g, index) =>
    `-- Generated canonical native accommodation deployment phase ${String(index).padStart(2, "0")}. No activation.\n${wrapper}${index > 0 ? holdCheck + "\n" : ""}${g.units.map((x) => x.sql).join("\n")}\n${gate}\ncommit;\n`;
  for (const unit of units) {
    const candidate = { units: [...group.units, unit] };
    if (
      group.units.length &&
      Buffer.byteLength(render(candidate, groups.length)) > 5000
    ) {
      groups.push(group);
      group = { units: [] };
    }
    group.units.push(unit);
  }
  if (group.units.length) groups.push(group);
  const finalCheck = `do $native_final$ begin
 if (select count(*) from pg_policies where schemaname='storage' and tablename='objects' and policyname in('accommodation_native_bucket_read','accommodation_native_bucket_delete','accommodation_storage_read','accommodation_storage_delete','accommodation_storage_no_insert','accommodation_storage_no_update'))<>6 or not exists(select 1 from pg_trigger where tgrelid='storage.objects'::regclass and tgname='native_accommodation_storage_evidence' and not tgisinternal) then raise exception 'Native final Storage protection incomplete';end if;
 if to_regprocedure('public.accommodation_property_review_page(integer,integer)') is null or not exists(select 1 from accommodation_property_private.launch_settings s where not s.enabled and not s.uploads_enforced and not s.inventory_enabled) then raise exception 'Native final gated schema incomplete';end if;
end $native_final$;`;
  groups.push({
    units: [
      { sql: finalCheck, sources: [] },
      { sql: `drop policy ${hold} on storage.objects;`, sources: [] },
    ],
  });
  const files = {};
  const phases = groups.map((g, i) => {
    const file = String(i).padStart(2, "0") + "-native.sql",
      sql = render(g, i),
      bytes = Buffer.byteLength(sql);
    files[file] = sql;
    return {
      id: String(i).padStart(2, "0"),
      file,
      migration_name: `native_20261021_p${String(i).padStart(2, "0")}_${digest(sql).slice(0, 12)}`,
      depends_on: i ? [String(i - 1).padStart(2, "0")] : [],
      bytes,
      sha256: digest(sql),
      oversize_reason:
        bytes > 5000
          ? "Single indivisible canonical statement plus atomic security closure and mandatory gates"
          : null,
      source_statements: g.units.flatMap((x) => x.sources),
    };
  });
  const function_names = [
    ...new Set(
      statements
        .map(
          (x) =>
            clean(x.sql).match(
              /^create(?: or replace)? function ([\w.]+)\(/i,
            )?.[1],
        )
        .filter(Boolean),
    ),
  ].sort();
  const table_names = statements
    .map((x) => clean(x.sql).match(/^create table ([\w.]+)\(/i)?.[1])
    .filter(Boolean)
    .sort();
  const manifest = {
    version: 1,
    function_names,
    table_names,
    source_commit: "bea895b3ed1544d62aab92fa107a34aea42d45fb",
    purpose:
      "Fresh disabled native property install; no canonical migration replay or activation",
    sources,
    lock_timeout_ms: 2000,
    statement_timeout_ms: 8000,
    idle_transaction_timeout_ms: 15000,
    phases,
  };
  files["preflight.sql"] =
    `select jsonb_build_object('native_schema_present',to_regnamespace('accommodation_property_private') is not null,'account_contract_present',to_regprocedure('public.account_features_allowed()') is not null,'storage_objects_rls',(select relrowsecurity from pg_class where oid='storage.objects'::regclass),'storage_buckets_rls',(select relrowsecurity from pg_class where oid='storage.buckets'::regclass),'native_bucket',(select jsonb_build_object('id',id,'public',public) from storage.buckets where id='accommodation-media'),'native_storage_objects',(select count(*) from storage.objects where bucket_id='accommodation-media'),'bucket_policies',(select coalesce(jsonb_agg(jsonb_build_object('name',policyname,'roles',roles,'cmd',cmd,'permissive',permissive)),'[]') from pg_policies where schemaname='storage' and tablename='buckets'),'temporary_hold',(select count(*) from pg_policies where policyname='native_deployment_bucket_hold')) as native_preflight;\n`;
  files["readback.sql"] =
    `select jsonb_build_object('gates',(select to_jsonb(s) from accommodation_property_private.launch_settings s),'table_rows',jsonb_build_object(${table_names
      .filter((n) => !n.endsWith(".launch_settings"))
      .map((n) => `'${n}',(select count(*) from ${n})`)
      .join(
        ",",
      )}),'bucket',(select jsonb_build_object('id',id,'public',public,'file_size_limit',file_size_limit,'allowed_mime_types',allowed_mime_types) from storage.buckets where id='accommodation-media'),'native_storage_objects',(select count(*) from storage.objects where bucket_id='accommodation-media'),'temporary_hold',(select count(*) from pg_policies where policyname='native_deployment_bucket_hold'),'native_functions',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname||'.'||p.proname in(${function_names.map((n) => `'${n}'`).join(",")})),'legacy_schema_present',to_regnamespace('accommodation_private') is not null) as native_readback;\n`;
  files["manifest.json"] = await format(JSON.stringify(manifest), {
    parser: "json",
  });
  return { files, manifest };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { files, manifest } = await buildDeployment();
  const target = path.join(root, deploymentDirectory);
  fs.mkdirSync(target, { recursive: true });
  for (const name of fs.readdirSync(target))
    if (/^\d{2}-native\.sql$/.test(name) && !Object.hasOwn(files, name))
      fs.unlinkSync(path.join(target, name));
  for (const [name, content] of Object.entries(files))
    fs.writeFileSync(path.join(target, name), content);
  console.log(`Generated ${manifest.phases.length} gated native phases.`);
}
