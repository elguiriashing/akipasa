import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  inventoryFingerprint,
  PLAN_PATH,
  scanSqlInventory,
  validatePlan,
} from "./check-canonical-replay-plan.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const frozen = JSON.parse(readFileSync(path.join(root, PLAN_PATH), "utf8"));
const clone = () => structuredClone(frozen);
const inventory = () =>
  new Map(frozen.entries.map((entry) => [entry.path, entry.sha256]));
const invalid = (plan, pattern, actual = inventory()) => {
  const result = validatePlan(plan, actual);
  assert.equal(result.structurallyValid, false);
  assert.equal(result.executable, false);
  assert(
    result.errors.some((error) => pattern.test(error)),
    result.errors.join("\n"),
  );
};

test("current repository inventory validates only as a blocked partial plan", () => {
  const result = validatePlan(frozen, scanSqlInventory(root));
  assert.equal(result.structurallyValid, true, result.errors.join("\n"));
  assert.equal(result.fullCanonicalParity, false);
  assert.equal(result.executable, false);
  assert.equal(result.databaseExecutionSupported, false);
  assert.equal(result.inventoryCount, 339);
  assert.equal(result.candidateSourceCount, 97);
  assert.equal(result.unresolvedSourceCount, 151);
  assert.equal(frozen.evidence.scopedCreatorCounts.applicationSql, 78);
  assert.equal(frozen.evidence.scopedCreatorCounts.officialStorageSql, 17);
  assert.equal(frozen.evidence.scopedCreatorCounts.selectedTotal, 95);
});

test("content drift fails even if path and manifest counts are unchanged", () => {
  const actual = inventory();
  actual.set(frozen.entries[0].path, "f".repeat(64));
  invalid(clone(), /Source hash drift/, actual);
});

test("removed, new and omitted source paths require explicit classification", () => {
  const removed = inventory();
  removed.delete(frozen.entries[0].path);
  invalid(clone(), /Missing source file/, removed);
  const added = inventory();
  added.set("database/migrations/9999_unreviewed_source.sql", "e".repeat(64));
  invalid(clone(), /Unclassified inventory source/, added);
  const plan = clone();
  plan.entries.splice(0, 1);
  invalid(plan, /Unclassified inventory source/);
});

test("duplicate inventory and candidate entries cannot become two executions", () => {
  const plan = clone();
  plan.entries.push(structuredClone(plan.entries[0]));
  invalid(plan, /Duplicate inventory entry/);
  const duplicate = clone();
  duplicate.candidateOrder.push(duplicate.candidateOrder[0]);
  invalid(duplicate, /Duplicate candidate source/);
});

test("historical bundles stay excluded even if a manifest attempts to relabel them", () => {
  const plan = clone();
  const excluded = plan.entries.find(
    (entry) => entry.classification === "excluded-historical-bundle",
  );
  plan.candidateOrder.push(excluded.path);
  invalid(plan, /Excluded, transport or unresolved source/);
  excluded.classification = "reviewed-candidate-prefix";
  invalid(plan, /Known historical bundle must remain excluded/);
});

test("unresolved files and byte-identical aliases cannot be scheduled", () => {
  for (const classification of ["unresolved", "byte-identical-transport"]) {
    const plan = clone();
    plan.candidateOrder.push(
      plan.entries.find((entry) => entry.classification === classification)
        .path,
    );
    invalid(plan, /Excluded, transport or unresolved source/);
  }
});

test("a transport alias requires full byte identity, not a similar name", () => {
  const plan = clone();
  const alias = plan.entries.find(
    (entry) => entry.classification === "byte-identical-transport",
  );
  alias.aliasOf = plan.entries.find(
    (entry) =>
      entry.path.startsWith("database/") && entry.sha256 !== alias.sha256,
  ).path;
  invalid(plan, /Transport requires an exact-byte database source/);
});

test("source prerequisites must precede consumers, including both0079 paths", () => {
  const plan = clone();
  [plan.candidateOrder[0], plan.candidateOrder[1]] = [
    plan.candidateOrder[1],
    plan.candidateOrder[0],
  ];
  invalid(plan, /Dependency order violation/);
  const missing = clone();
  const index = missing.candidateOrder.findIndex((file) =>
    file.endsWith("0079_rate_limit_public_analytics.sql"),
  );
  assert(index > 0);
  missing.candidateOrder.splice(index, 1);
  invalid(missing, /Selected prefix source missing/);
});

test("unknown, unresolved and cyclic prerequisites are rejected", () => {
  const unknown = clone();
  unknown.entries[0].requires.push(
    "database/migrations/9998_missing_source.sql",
  );
  invalid(unknown, /Unknown dependency/);
  const unresolved = clone();
  const required = unresolved.entries.find(
    (entry) => entry.classification === "unresolved",
  );
  unresolved.entries
    .find((entry) => entry.path === unresolved.candidateOrder[0])
    .requires.push(required.path);
  invalid(unresolved, /Unresolved required source blocks/);
  const cycle = clone();
  cycle.entries
    .find((entry) => entry.path === cycle.candidateOrder[0])
    .requires.push(cycle.candidateOrder[1]);
  invalid(cycle, /Dependency cycle/);
});

test("platform, normal Auth bootstrap and all three missing operating sources retain STOPs", () => {
  for (const id of [
    "stop:platform-baseline",
    "stop:synthetic-admin-bootstrap",
    "stop:operating-private-location",
    "stop:operating-organisations",
    "stop:rental-operating-location",
  ]) {
    const plan = clone();
    plan.stops = plan.stops.filter((stop) => stop.id !== id);
    invalid(plan, /Missing required STOP boundary/);
  }
  const plan = clone();
  plan.entries.find((entry) =>
    entry.path.endsWith("/0074_crm_multi_tenant_workspaces.sql"),
  ).requires = [];
  invalid(plan, /normal-Auth synthetic administrator prerequisite/);
  const noOperating = clone();
  noOperating.entries.find((entry) =>
    entry.path.endsWith("/20261020172801_operations_checkout_lifecycle.sql"),
  ).requires = [];
  invalid(noOperating, /missing-source admission boundary/);
});

test("unverified completion or resolved evidence claims never turn readiness green", () => {
  for (const field of [
    "complete",
    "schemaParityVerified",
    "databaseExecutionSupported",
  ]) {
    const plan = clone();
    plan[field] = true;
    invalid(plan, /explicitly partial, non-executable/);
  }
  const resolved = clone();
  resolved.stops[0].resolved = true;
  invalid(resolved, /Unverified STOP boundary/);
  const verification = clone();
  verification.requiredVerifications.schemaFunctionAclFingerprint = true;
  invalid(verification, /Unperformed canonical verification/);
});

test("external or traversal paths cannot be admitted as migration files", () => {
  for (const file of [
    "/tmp/recovered.sql",
    "database/migrations/../../recovered.sql",
    "https://example.test/migration.sql",
  ]) {
    const plan = clone();
    plan.entries[0].path = file;
    invalid(plan, /Unsafe source path/);
  }
});

test("the scanner refuses SQL symlinks instead of reading outside the source tree", () => {
  const fixture = mkdtempSync(path.join(tmpdir(), "akipasa-plan-"));
  try {
    for (const prefix of ["database/migrations", "supabase/migrations"])
      mkdirSync(path.join(fixture, prefix), { recursive: true });
    writeFileSync(path.join(fixture, "outside.sql"), "select 'fixture';\n");
    symlinkSync(
      path.join(fixture, "outside.sql"),
      path.join(fixture, "database/migrations/0001_escape.sql"),
    );
    assert.throws(
      () => scanSqlInventory(fixture),
      /Not a regular migration source/,
    );
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

test("inventory fingerprints are path-sensitive and deterministic", () => {
  const actual = inventory();
  assert.equal(
    inventoryFingerprint(actual, "database/migrations"),
    frozen.inventoryFingerprints["database/migrations"],
  );
  assert.equal(
    inventoryFingerprint(new Map([...actual].reverse()), "database/migrations"),
    frozen.inventoryFingerprints["database/migrations"],
  );
  const first = [...actual].find(([file]) => file.startsWith("database/"));
  actual.delete(first[0]);
  actual.set("database/migrations/9997_renamed.sql", first[1]);
  assert.notEqual(
    inventoryFingerprint(actual, "database/migrations"),
    frozen.inventoryFingerprints["database/migrations"],
  );
});

test("CLI exits blocked for a consistent plan and refuses apply-like flags", () => {
  const script = fileURLToPath(
    new URL("./check-canonical-replay-plan.mjs", import.meta.url),
  );
  const planned = spawnSync(process.execPath, [script, "--plan"], {
    encoding: "utf8",
  });
  assert.equal(planned.status, 2, planned.stderr);
  assert.equal(JSON.parse(planned.stdout).structurallyValid, true);
  assert.equal(JSON.parse(planned.stdout).executable, false);
  const refused = spawnSync(process.execPath, [script, "--apply"], {
    encoding: "utf8",
  });
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /no database apply mode/);
  assert.equal(refused.stdout, "");
});

test("external Storage and normalized history evidence cannot be relabeled as complete app replay", () => {
  const mixed = clone();
  mixed.evidence.scopedCreatorCounts.applicationSql = 95;
  invalid(mixed, /evidence must remain distinct/);
  const admitted = clone();
  admitted.evidence.externalStorageSnapshots[0].admittedToRepository = true;
  invalid(admitted, /evidence must remain distinct/);
  const history = clone();
  history.evidence.historyCounts.normalizedCommittedMatches = 247;
  invalid(history, /unresolved classifications must retain honest totals/);
});
