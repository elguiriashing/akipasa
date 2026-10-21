import fs from "node:fs";
import { format } from "prettier";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const deploymentDirectory =
  "database/deployments/trusted-business-funnel";
export const sourceMigrations = [
  "20261020234414_trusted_business_funnel.sql",
  "20261021000745_trusted_funnel_privacy_export.sql",
];
export const digest = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");
/** Split only unquoted top-level semicolons. Function bodies/comments stay byte-for-byte. */
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
const withoutComments = (value) =>
  value.replace(/^(?:\s|--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)+/, "");
const names = [
  "enum-prerequisite",
  "private-tables",
  "ledger-indexes",
  "billing-evidence-index",
  "capture-helpers",
  "privacy-helpers",
  "claim-workspace-checkout-functions",
  "billing-function",
  "privacy-and-integrity-triggers",
  "trusted-source-triggers",
  "manager-and-maintenance-rpcs",
  "own-identity-export",
];
function phaseFor(statement, migration) {
  const sql = withoutComments(statement);
  if (/^(begin|commit);$/i.test(sql)) return null;
  if (migration === sourceMigrations[1]) return 11;
  if (/^alter type /i.test(sql)) return 0;
  if (/^create index/i.test(sql))
    return sql.includes("suite_funnel_billing_evidence") ? 3 : 2;
  const fn = sql.match(/^create function (\S+)\(/i)?.[1];
  if (fn) {
    if (fn.startsWith("public.")) return 10;
    if (fn === "suite_funnel_private.protect_analytics") return 1;
    if (/\.(stamp_activation|subject_allowed|emit)$/.test(fn)) return 4;
    if (
      /\.(protect_analytics|remove_optional_event|lock_subject|withdraw)$/.test(
        fn,
      )
    )
      return 5;
    if (/\.billing_transition$/.test(fn)) return 7;
    if (/\.(claim_completed|hq_activated|checkout_started)$/.test(fn)) return 6;
    throw new Error(`Unclassified function ${fn}`);
  }
  if (
    /^create (constraint )?trigger /i.test(sql) &&
    /execute function suite_funnel_private\.protect_analytics\(/.test(sql)
  )
    return 1;
  if (/^create (constraint )?trigger /i.test(sql))
    return /execute function suite_funnel_private\.(claim_completed|hq_activated|checkout_started|billing_transition)\(/.test(
      sql,
    )
      ? 9
      : 8;
  if (/^(revoke|grant) .*function/i.test(sql)) return 10;
  if (
    /^(create schema|revoke .*schema|grant .*schema|create table|insert into|alter table|revoke .*settings|grant .*settings|grant .*stages|create policy)/i.test(
      sql,
    )
  )
    return 1;
  throw new Error(`Unclassified statement ${sql.slice(0, 150)}`);
}
const prerequisites = [
  null,
  "exists(select 1 from pg_catalog.pg_enum e join pg_catalog.pg_type t on t.oid=e.enumtypid join pg_catalog.pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='analytics_action' and e.enumlabel='suite_business_stage')",
  "to_regclass('suite_funnel_private.stages') is not null",
  "to_regclass('suite_funnel_private.suite_funnel_retention') is not null",
  "to_regclass('akibusiness_private.suite_funnel_billing_evidence') is not null",
  "to_regprocedure('suite_funnel_private.emit(text,text,uuid,text,uuid)') is not null",
  "to_regprocedure('suite_funnel_private.withdraw()') is not null",
  "to_regprocedure('suite_funnel_private.checkout_started()') is not null",
  "to_regprocedure('suite_funnel_private.billing_transition()') is not null",
  "exists(select 1 from pg_catalog.pg_trigger where tgname='suite_funnel_onboarding_withdraw' and not tgisinternal)",
  "exists(select 1 from pg_catalog.pg_trigger where tgname='suite_funnel_billing' and not tgisinternal)",
  "to_regprocedure('public.purge_suite_business_funnel(integer)') is not null",
];
const gate = `do $funnel_gate$ begin
 if not exists(select 1 from suite_funnel_private.settings where singleton and not enabled and retention_days is null and retention_approval_ref is null and enabled_since is null)
 then raise exception 'Funnel install requires disabled collection and NULL approval settings';end if;
 if exists(select 1 from suite_funnel_private.stages limit 1) then raise exception 'Funnel install requires an empty optional ledger';end if;
 if exists(select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and
  (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute')))
 then raise exception 'Private funnel function permissions are not closed';end if;
end $funnel_gate$;`;
export async function buildDeployment() {
  const phases = names.map((name, index) => ({
    id: String(index).padStart(2, "0"),
    name,
    statements: [],
    sources: [],
  }));
  const sources = sourceMigrations.map((name) => {
    const content = fs.readFileSync(
      path.join(root, "supabase/migrations", name),
      "utf8",
    );
    if (
      content !==
      fs.readFileSync(path.join(root, "database/migrations", name), "utf8")
    )
      throw new Error(`Migration mirrors differ: ${name}`);
    splitSql(content).forEach((statement, index) => {
      const phase = phaseFor(statement, name);
      if (phase === null) return;
      phases[phase].statements.push(statement);
      phases[phase].sources.push({
        migration: name,
        statement: index + 1,
        sha256: digest(statement),
      });
      // No function can commit with default PUBLIC or inherited client execution.
      const sql = withoutComments(statement);
      const fn = sql.match(
        /^create function (suite_funnel_private\.\w+)\(([^)]*)\)/i,
      );
      if (fn) {
        const signature = fn[2]
          .split(",")
          .filter(Boolean)
          .map((arg) => arg.trim().split(/\s+/)[1])
          .join(",");
        phases[phase].statements.push(
          `revoke all on function ${fn[1]}(${signature}) from public,anon,authenticated,service_role;`,
        );
      }
    });
    return { path: `supabase/migrations/${name}`, sha256: digest(content) };
  });
  const files = {};
  const manifestPhases = phases.map((phase, index) => {
    let content = `-- Generated from canonical migrations. DO NOT edit; run node scripts/build-funnel-deployment.mjs.\n-- Phase ${phase.id}: ${phase.name}. No collection activation.\nbegin;\nset local lock_timeout='2s';\nset local statement_timeout='8s';\nset local idle_in_transaction_session_timeout='15s';\n`;
    if (prerequisites[index])
      content += `do $funnel_dependency$ begin if not (${prerequisites[index]}) then raise exception 'Missing prerequisite for funnel phase ${phase.id}';end if;end $funnel_dependency$;\n`;
    if (index > 1) content += gate + "\n";
    content += phase.statements.join("\n") + "\n";
    if (index > 0) content += gate + "\n";
    content += "commit;\n";
    const file = `${phase.id}-${phase.name}.sql`;
    files[file] = content;
    return {
      id: phase.id,
      name: phase.name,
      file,
      migration_name: `funnel_${phase.sources[0].migration.split("_")[0]}_p${phase.id}_${digest(content).slice(0, 12)}`,
      depends_on: index === 0 ? [] : [phases[index - 1].id],
      bytes: Buffer.byteLength(content),
      sha256: digest(content),
      source_statements: phase.sources,
    };
  });
  const manifest = {
    version: 1,
    source_commit: "99feec0dc532598bb16f7a8b2afe8dad4752ef26",
    purpose:
      "Fresh disabled install of canonical funnel and own-identity export; not a new activation",
    sources,
    lock_timeout_ms: 2000,
    statement_timeout_ms: 8000,
    idle_transaction_timeout_ms: 15000,
    phases: manifestPhases,
  };
  files["preflight.sql"] =
    `-- Read-only metadata. An absent settings table is the reported recovery baseline.
select jsonb_build_object(
 'reserved_enum_present',exists(select 1 from pg_catalog.pg_enum e join pg_catalog.pg_type t on t.oid=e.enumtypid join pg_catalog.pg_namespace n on n.oid=t.typnamespace where n.nspname='public' and t.typname='analytics_action' and e.enumlabel='suite_business_stage'),
 'private_schema_present',to_regnamespace('suite_funnel_private') is not null,
 'settings_present',to_regclass('suite_funnel_private.settings') is not null,
 'stages_present',to_regclass('suite_funnel_private.stages') is not null,
 'privacy_rpc_present',to_regprocedure('public.my_business_funnel_export(text,text,integer)') is not null,
 'required_relations',(select jsonb_object_agg(name,to_regclass(name) is not null) from unnest(array['public.analytics_events','public.profiles','public.personalisation_settings','account_private.onboarding','public.venues','public.venue_members','public.venue_claims','public.crm_workspaces','public.crm_workspace_members','akibusiness_private.operations_checkouts','akibusiness_private.operations_subscriptions','akibusiness_private.toolboxes','akibusiness_private.operations_billing_events']) name),
 'account_guard_present',to_regprocedure('public.account_features_allowed()') is not null,
 'workspace_guard_present',to_regprocedure('public.crm_can_access_workspace(text)') is not null);
`;
  files["readback.sql"] =
    `-- Run only after all phases commit. Reads only new optional data and catalogue metadata.
select jsonb_build_object(
 'settings',(select jsonb_build_object('enabled',enabled,'retention_days',retention_days,'retention_approval_ref',retention_approval_ref,'enabled_since',enabled_since) from suite_funnel_private.settings where singleton),
 'optional_rows',(select count(*) from suite_funnel_private.stages),
 'private_client_execute_grants',(select count(*) from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='suite_funnel_private' and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('authenticated',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute'))),
 'trigger_count',(select count(*) from pg_catalog.pg_trigger where not tgisinternal and (tgname like 'suite_funnel_%' or tgname='trusted_funnel_analytics')),
 'manager_authenticated_execute',has_function_privilege('authenticated','public.suite_business_funnel(text,integer)','execute'),
 'manager_anon_execute',has_function_privilege('anon','public.suite_business_funnel(text,integer)','execute'),
 'maintenance_service_execute',has_function_privilege('service_role','public.purge_suite_business_funnel(integer)','execute'),
 'maintenance_authenticated_execute',has_function_privilege('authenticated','public.purge_suite_business_funnel(integer)','execute'),
 'privacy_authenticated_execute',has_function_privilege('authenticated','public.my_business_funnel_export(text,text,integer)','execute'),
 'privacy_anon_execute',has_function_privilege('anon','public.my_business_funnel_export(text,text,integer)','execute'));
`;
  manifest.auxiliary = ["preflight.sql", "readback.sql"].map((file) => ({
    file,
    bytes: Buffer.byteLength(files[file]),
    sha256: digest(files[file]),
  }));
  files["manifest.json"] = await format(JSON.stringify(manifest), {
    parser: "json",
  });
  return { files, manifest };
}
function manifestPhaseCount(files) {
  return Object.keys(files).filter((file) => /^\d{2}-/.test(file)).length;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const { files } = await buildDeployment();
  const directory = path.join(root, deploymentDirectory);
  fs.mkdirSync(directory, { recursive: true });
  for (const [file, content] of Object.entries(files)) {
    const destination = path.join(directory, file);
    if (process.argv.includes("--check")) {
      if (
        !fs.existsSync(destination) ||
        fs.readFileSync(destination, "utf8") !== content
      )
        throw new Error(`Generated deployment drift: ${file}`);
    } else fs.writeFileSync(destination, content);
  }
  console.log(
    `Funnel deployment ${process.argv.includes("--check") ? "verified" : "generated"}: ${manifestPhaseCount(files)} atomic phases`,
  );
}
