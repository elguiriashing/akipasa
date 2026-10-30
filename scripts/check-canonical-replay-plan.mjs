#!/usr/bin/env node
// Deliberately no database client, shell, network, credentials or apply mode.
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const PLAN_PATH = "docs/AKIPASA_CANONICAL_REPLAY_PLAN_20261030.json";
const ROOTS = ["database/migrations", "supabase/migrations"];
const CLASSIFICATIONS = new Set([
  "reviewed-candidate-prefix",
  "excluded-historical-bundle",
  "byte-identical-transport",
  "unresolved",
]);
const STOP_IDS = [
  "stop:platform-baseline",
  "stop:synthetic-admin-bootstrap",
  "stop:operating-private-location",
  "stop:operating-organisations",
  "stop:rental-operating-location",
  "stop:complete-foundations-before-coverage",
  "stop:pristine-library-baseline",
  "stop:history-reconciliation",
  "stop:external-hq-boundary",
  "stop:final-security-and-customer-journeys",
];
const EXCLUDED = new Map([
  [
    "20261012180000_akisuite_subscription_entitlements.sql",
    "293c8ce593dcd51ca5c5a620b9366da1e4d179c7e6a8c9da195163116d11c8cf",
  ],
  [
    "20261012201529_akisuite_premium_workspaces.sql",
    "30139b6f894ab030f12435ff26d5dbea6c393c967739de4b49804ba1a4b2e569",
  ],
]);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const sha256 = /^[a-f0-9]{64}$/;
const safeSource = /^(database|supabase)\/migrations\/[a-zA-Z0-9_.-]+\.sql$/;

export function inventoryFingerprint(inventory, prefix) {
  const digest = createHash("sha256");
  for (const [file, digestHex] of [...inventory].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0,
  )) {
    if (file.startsWith(`${prefix}/`)) {
      digest.update(file);
      digest.update("\0");
      digest.update(Buffer.from(digestHex, "hex"));
    }
  }
  return digest.digest("hex");
}

/** Read only committed-source-shaped SQL paths, never external snapshots. */
export function scanSqlInventory(root) {
  const inventory = new Map();
  const base = realpathSync(root);
  for (const prefix of ROOTS) {
    const directory = path.join(base, prefix);
    if (lstatSync(directory).isSymbolicLink())
      throw new Error(`Migration directory must not be a symlink: ${prefix}`);
    for (const item of readdirSync(directory, { withFileTypes: true })) {
      if (!item.name.endsWith(".sql")) continue;
      const relative = `${prefix}/${item.name}`;
      if (!safeSource.test(relative) || !item.isFile())
        throw new Error(`Not a regular migration source: ${relative}`);
      const absolute = path.join(base, relative);
      if (realpathSync(absolute) !== absolute)
        throw new Error(`Migration source escaped its root: ${relative}`);
      inventory.set(relative, hash(readFileSync(absolute)));
    }
  }
  return inventory;
}

/** Consistency validation is not execution approval or schema-parity proof. */
export function validatePlan(plan, inventory) {
  const errors = [];
  const fail = (message) => errors.push(message);
  if (
    plan.version !== 1 ||
    plan.mode !== "plan-only" ||
    plan.status !== "partial-not-executable" ||
    plan.complete !== false ||
    plan.schemaParityVerified !== false ||
    plan.databaseExecutionSupported !== false
  )
    fail("This tool supports only an explicitly partial, non-executable plan");
  if (JSON.stringify(plan.inventoryRoots) !== JSON.stringify(ROOTS))
    fail("Inventory roots must remain the two explicit repository SQL trees");
  if (
    !plan.requiredVerifications ||
    !Object.keys(plan.requiredVerifications).length ||
    Object.values(plan.requiredVerifications).some((value) => value !== false)
  )
    fail("Unperformed canonical verification must remain explicitly false");
  const entries = Array.isArray(plan.entries) ? plan.entries : [];
  const byPath = new Map();
  for (const entry of entries) {
    if (!safeSource.test(entry.path || "")) {
      fail(`Unsafe source path: ${String(entry.path)}`);
      continue;
    }
    if (byPath.has(entry.path))
      fail(`Duplicate inventory entry: ${entry.path}`);
    byPath.set(entry.path, entry);
    if (!sha256.test(entry.sha256 || "")) fail(`Invalid SHA256: ${entry.path}`);
    if (!CLASSIFICATIONS.has(entry.classification))
      fail(`Unknown classification: ${entry.path}`);
    if (!Array.isArray(entry.requires))
      fail(`Dependencies must be explicit: ${entry.path}`);
    else if (new Set(entry.requires).size !== entry.requires.length)
      fail(`Duplicate dependency: ${entry.path}`);
    if (!inventory.has(entry.path)) fail(`Missing source file: ${entry.path}`);
    else if (inventory.get(entry.path) !== entry.sha256)
      fail(`Source hash drift: ${entry.path}`);
    const excludedHash = EXCLUDED.get(path.posix.basename(entry.path));
    if (
      excludedHash &&
      (entry.classification !== "excluded-historical-bundle" ||
        entry.sha256 !== excludedHash)
    )
      fail(
        `Known historical bundle must remain excluded and pinned: ${entry.path}`,
      );
    if (entry.scopedCreatorEvidence?.sha256 !== undefined) {
      if (entry.scopedCreatorEvidence.sha256 !== entry.sha256)
        fail(`Scoped evidence hash differs from source: ${entry.path}`);
    }
    if (entry.filenameVersion !== undefined) {
      if (!/^\d{14}$/.test(entry.filenameVersion))
        fail(`Invalid literal filename version: ${entry.path}`);
      else if (
        !path.posix.basename(entry.path).startsWith(`${entry.filenameVersion}_`)
      )
        fail(
          `Filename version must not become a guessed historical mapping: ${entry.path}`,
        );
    }
  }
  for (const actual of inventory.keys())
    if (!byPath.has(actual)) fail(`Unclassified inventory source: ${actual}`);
  for (const prefix of ROOTS)
    if (
      plan.inventoryFingerprints?.[prefix] !==
      inventoryFingerprint(inventory, prefix)
    )
      fail(`Inventory fingerprint drift: ${prefix}`);

  const storage = plan.evidence?.externalStorageSnapshots;
  const scoped = plan.evidence?.scopedCreatorCounts;
  const scopedEntries = entries.filter((entry) => entry.scopedCreatorEvidence);
  if (
    !Array.isArray(storage) ||
    storage.length !== 17 ||
    new Set(storage.map((entry) => entry.name)).size !== storage.length ||
    storage.some(
      (entry) =>
        !sha256.test(entry.sha256 || "") ||
        entry.admittedToRepository !== false,
    ) ||
    scoped?.applicationSql !== scopedEntries.length ||
    scoped?.officialStorageSql !== storage.length ||
    scoped?.selectedTotal !== scopedEntries.length + storage.length
  )
    fail(
      "Scoped78-application/17-external-Storage evidence must remain distinct and consistent",
    );
  const history = plan.evidence?.historyCounts;
  if (
    !history ||
    Object.values(history.classificationCounts || {}).reduce(
      (sum, value) => sum + value,
      0,
    ) !== history.unresolved ||
    history.normalizedCommittedMatches + history.unresolved !== history.total
  )
    fail(
      "Historical normalized matches and unresolved classifications must retain honest totals",
    );

  const stops = new Map();
  for (const stop of Array.isArray(plan.stops) ? plan.stops : []) {
    if (stops.has(stop.id)) fail(`Duplicate STOP boundary: ${stop.id}`);
    stops.set(stop.id, stop);
    if (stop.resolved !== false || !stop.reason?.trim())
      fail(`Unverified STOP boundary must remain unresolved: ${stop.id}`);
  }
  for (const id of STOP_IDS)
    if (!stops.has(id)) fail(`Missing required STOP boundary: ${id}`);

  const order = Array.isArray(plan.candidateOrder) ? plan.candidateOrder : [];
  const positions = new Map();
  for (const [index, file] of order.entries()) {
    if (positions.has(file)) fail(`Duplicate candidate source: ${file}`);
    positions.set(file, index);
    const entry = byPath.get(file);
    if (!entry || entry.classification !== "reviewed-candidate-prefix")
      fail(
        `Excluded, transport or unresolved source cannot enter candidate order: ${file}`,
      );
  }
  for (const entry of entries) {
    if (
      entry.classification === "reviewed-candidate-prefix" &&
      !positions.has(entry.path)
    )
      fail(
        `Selected prefix source missing from candidate order: ${entry.path}`,
      );
    if (entry.classification === "byte-identical-transport") {
      const canonical = byPath.get(entry.aliasOf);
      if (
        !canonical ||
        !entry.path.startsWith("supabase/migrations/") ||
        !entry.aliasOf.startsWith("database/migrations/") ||
        canonical.sha256 !== entry.sha256
      )
        fail(`Transport requires an exact-byte database source: ${entry.path}`);
      if (positions.has(entry.path))
        fail(`Duplicate transport execution: ${entry.path}`);
    } else if (entry.aliasOf !== undefined) {
      fail(`Only byte-identical transports may declare aliasOf: ${entry.path}`);
    }
    for (const dependency of Array.isArray(entry.requires)
      ? entry.requires
      : []) {
      if (!byPath.has(dependency) && !stops.has(dependency)) {
        fail(`Unknown dependency ${dependency} required by ${entry.path}`);
        continue;
      }
      if (positions.has(entry.path) && byPath.has(dependency)) {
        const parent = byPath.get(dependency);
        if (
          parent.classification !== "reviewed-candidate-prefix" ||
          !positions.has(dependency)
        )
          fail(
            `Unresolved required source blocks candidate ${entry.path}: ${dependency}`,
          );
        else if (positions.get(dependency) >= positions.get(entry.path))
          fail(
            `Dependency order violation: ${dependency} before ${entry.path}`,
          );
      }
    }
  }
  const visiting = new Set(),
    visited = new Set();
  const visit = (file) => {
    if (visiting.has(file)) {
      fail(`Dependency cycle: ${file}`);
      return;
    }
    if (visited.has(file)) return;
    visiting.add(file);
    for (const dependency of Array.isArray(byPath.get(file)?.requires)
      ? byPath.get(file).requires
      : [])
      if (byPath.has(dependency)) visit(dependency);
    visiting.delete(file);
    visited.add(file);
  };
  for (const file of byPath.keys()) visit(file);
  const first = byPath.get(order[0]);
  if (!first?.requires?.includes("stop:platform-baseline"))
    fail("The first candidate requires the real platform-baseline STOP");
  const crm = entries.find((entry) =>
    /\/0074_crm_multi_tenant_workspaces\.sql$/.test(entry.path),
  );
  if (!crm?.requires?.includes("stop:synthetic-admin-bootstrap"))
    fail(
      "CRM0074 must retain the normal-Auth synthetic administrator prerequisite",
    );
  const checkout = byPath.get(
    "database/migrations/20261020172801_operations_checkout_lifecycle.sql",
  );
  for (const id of [
    "stop:operating-private-location",
    "stop:operating-organisations",
    "stop:rental-operating-location",
  ])
    if (!checkout?.requires?.includes(id))
      fail(`Checkout must retain missing-source admission boundary: ${id}`);
  const counts = {};
  for (const entry of entries)
    counts[entry.classification] = (counts[entry.classification] || 0) + 1;
  return {
    structurallyValid: errors.length === 0,
    executable: false,
    fullCanonicalParity: false,
    databaseExecutionSupported: false,
    inventoryCount: inventory.size,
    classifications: counts,
    candidateSourceCount: order.length,
    candidateOrder: order,
    unresolvedSourceCount: counts.unresolved || 0,
    stops: [...stops.values()],
    errors,
  };
}

export function runCli(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--plan")) {
    console.error(
      "Plan-only tool: only --plan is supported; there is no database apply mode.",
    );
    return 1;
  }
  try {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const plan = JSON.parse(readFileSync(path.join(root, PLAN_PATH), "utf8"));
    const result = validatePlan(plan, scanSqlInventory(root));
    console.log(JSON.stringify(result, null, 2));
    // 2 means a consistent partial plan is blocked, never green release readiness.
    return result.structurallyValid ? 2 : 1;
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Plan validation failed",
    );
    return 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = runCli();
