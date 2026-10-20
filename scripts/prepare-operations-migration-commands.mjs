// Offline only. Run with Node22.6+ --experimental-strip-types; no network or apply mode.
import { readFile, writeFile } from "node:fs/promises";
import { buildMigrationManifest } from "../src/lib/operations-billing/migration-manifest.mjs";
import { operationsMigrationSnapshot } from "../src/lib/operations-migration-command.ts";
const flags = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const key = process.argv[i],
    value = process.argv[i + 1];
  if (
    !["--manifest", "--receipts", "--snapshots", "--output"].includes(key) ||
    !value ||
    flags[key]
  )
    throw Error("Explicit unique input/output arguments required");
  flags[key] = value;
}
if (Object.keys(flags).length !== 4)
  throw Error(
    "Usage: --manifest PRIVATE.json --receipts PRIVATE.json --snapshots PRIVATE.json --output NEW_PRIVATE.json",
  );
const read = async (name) => JSON.parse(await readFile(flags[name], "utf8"));
const [manifest, receipts, snapshots] = await Promise.all([
  read("--manifest"),
  read("--receipts"),
  read("--snapshots"),
]);
const rebuilt = buildMigrationManifest(snapshots.input);
if (
  manifest.manifestSha256 !== rebuilt.manifestSha256 ||
  manifest.manifestSha256 !== receipts.manifestSha256
)
  throw Error("Sealed review evidence mismatch");
const rows = manifest.rows.filter(
  (r) => r.action === "migrate_same_subscription_at_paid_renewal",
);
if (rows.length !== 3 || receipts.calls.length !== 3)
  throw Error("Exactly three approved migrations required");
const calls = rows.map((row) => {
  const applied = receipts.calls.filter(
    (r) => r.subscriptionId === row.subscriptionId,
  );
  const source = snapshots.input.subscriptions.filter(
    (s) => s.id === row.subscriptionId,
  );
  if (
    applied.length !== 1 ||
    source.length !== 1 ||
    applied[0].provisionedAndBound !== true ||
    !/^private-[a-f0-9-]{36}$/.test(applied[0].verifiedProvisionedWorkspace)
  )
    throw Error("Unique verified private provision/bind receipt required");
  const snapshot = operationsMigrationSnapshot(source[0]);
  if (
    snapshot.customer !== row.customerId ||
    snapshot.profileId !== row.profileId ||
    snapshot.status !== "active" ||
    snapshot.invoiceStatus !== "paid" ||
    snapshot.invoiceAmountDue !== 0 ||
    snapshot.invoiceAmountPaid !== 0 ||
    !Array.isArray(snapshot.discountIds) ||
    snapshot.discountIds.length !== 1
  )
    throw Error("Reviewed source payment/promotion scope mismatch");
  return {
    rpc: "enqueue_crm_operations_migration",
    params: {
      p_subscription: row.subscriptionId,
      p_workspace: applied[0].verifiedProvisionedWorkspace,
      p_manifest: manifest.manifestSha256,
      p_snapshot: snapshot,
    },
  };
});
const payload = {
  reviewOnly: true,
  requiresTestedDeploymentAndExplicitMigrationFlag: true,
  manifestSha256: manifest.manifestSha256,
  calls,
};
await writeFile(flags["--output"], JSON.stringify(payload, null, 2) + "\n", {
  mode: 0o600,
  flag: "wx",
});
console.log(
  JSON.stringify({
    mode: "dry-run",
    commands: calls.length,
    liveMutations: false,
    manifestSha256: manifest.manifestSha256,
  }),
);
