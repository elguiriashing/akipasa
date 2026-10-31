#!/usr/bin/env node
// Source integrity only. No database client, network, subprocess or apply path.
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BUNDLE_PATH = "database/replay-only/recovered-operating";
export const EXPECTED_SOURCES = Object.freeze([
  Object.freeze({
    file: "20261016092914_private_operating_location.sql",
    snapshotBytes: 4701,
    snapshotSha256:
      "0436f81e3f15ff88c2b68b6eedeeb15bba6f9188423b4be751d6af57db72a97a",
    rawBytes: 4700,
    rawSha256:
      "c5c02a15d34f558d64228aff4902a2c3581c1bd26691dd4e4949c8f517d0a838",
    version: "20261016092914",
    name: "private_operating_location",
  }),
  Object.freeze({
    file: "20261016093118_operating_organisations.sql",
    snapshotBytes: 13608,
    snapshotSha256:
      "b9d06ab3b40ac3614d739bb8cc386680e9692f878a14c0163a22ecfbd9f79317",
    rawBytes: 13607,
    rawSha256:
      "5093d6814cd8be936ce81112839b448325e8b2e076b1e86b0e174b593163124a",
    version: "20261016093118",
    name: "operating_organisations",
  }),
  Object.freeze({
    file: "20261016093336_rental_operating_location.sql",
    snapshotBytes: 4047,
    snapshotSha256:
      "90e765599a4f276395c81a9b3e58b031918e4dfd157393c05394cbf7437d36c5",
    rawBytes: 4046,
    rawSha256:
      "3de7c127197c430ccc8954ab9b197d4bc670bd4dfe8934cfa8a6009f2c67d367",
    version: "20261016093336",
    name: "rental_operating_location",
  }),
]);
const FILES = [
  ...EXPECTED_SOURCES.map((source) => source.file),
  "PROVENANCE.json",
  "README.md",
];
const CONDITIONS = Object.freeze({
  version: 1,
  mode: "immutable-replay-only-source-bundle",
  admissionStatus: "reviewable-local-source-bundle",
  noStandaloneExecution: true,
  requiresCurrentAccountCoverage: true,
  pristineFixtureOnly: true,
  productionMigration: false,
  databaseExecutionSupported: false,
  freshOrderedGuardAcceptance: false,
  fullCanonicalParity: false,
});
const ACCOUNT_SOURCES = [
  "database/migrations/20261020170448_account_completion_age_declaration.sql",
  "database/migrations/20261020180946_account_completion_database_coverage.sql",
  "database/migrations/20261020190818_account_identity_existence_guard.sql",
];
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

/** Read a fixed local five-file bundle; never follow source or provenance paths. */
export function readOperatingReplayBundle(directory) {
  const expectedRoot = path.resolve(directory);
  if (
    lstatSync(expectedRoot).isSymbolicLink() ||
    realpathSync(expectedRoot) !== expectedRoot
  )
    throw new Error(
      "Replay-only bundle must be a real directory without symlinked parents",
    );
  const files = readdirSync(expectedRoot, { withFileTypes: true });
  for (const entry of files) {
    if (!FILES.includes(entry.name) || !entry.isFile())
      throw new Error(`Unexpected or non-regular bundle entry: ${entry.name}`);
  }
  for (const expected of FILES)
    if (!files.some((entry) => entry.name === expected))
      throw new Error(`Missing bundle entry: ${expected}`);
  return {
    provenance: JSON.parse(
      readFileSync(path.join(expectedRoot, "PROVENANCE.json"), "utf8"),
    ),
    snapshots: new Map(
      EXPECTED_SOURCES.map(({ file }) => [
        file,
        readFileSync(path.join(expectedRoot, file)),
      ]),
    ),
    files: files.map((entry) => entry.name),
  };
}

/** Pin both retained snapshot bytes and original-history bytes; execute neither. */
export function validateOperatingReplayBundle({
  provenance,
  snapshots,
  files,
}) {
  const errors = [];
  const fail = (message) => errors.push(message);
  for (const [condition, expected] of Object.entries(CONDITIONS))
    if (provenance?.[condition] !== expected)
      fail(
        `Replay-only condition must remain ${JSON.stringify(expected)}: ${condition}`,
      );
  if (
    !Array.isArray(files) ||
    files.length !== FILES.length ||
    new Set(files).size !== files.length ||
    files.some((file) => !FILES.includes(file))
  )
    fail(
      "Bundle must contain exactly the three allowlisted SQL files, provenance and README",
    );
  if (!(snapshots instanceof Map) || snapshots.size !== EXPECTED_SOURCES.length)
    fail("Snapshot set must contain exactly three pinned sources");
  else
    for (const file of snapshots.keys())
      if (!EXPECTED_SOURCES.some((source) => source.file === file))
        fail(`Unsafe or extra SQL source: ${String(file)}`);
  const declared = new Map();
  const sources = Array.isArray(provenance?.sources) ? provenance.sources : [];
  if (sources.length !== EXPECTED_SOURCES.length)
    fail("Provenance must declare exactly three source identities");
  for (const source of sources) {
    if (!EXPECTED_SOURCES.some((expected) => expected.file === source?.file)) {
      fail(
        `Unsafe or non-allowlisted provenance path: ${String(source?.file)}`,
      );
      continue;
    }
    if (declared.has(source.file))
      fail(`Duplicate provenance source: ${source.file}`);
    declared.set(source.file, source);
  }
  if (
    JSON.stringify(provenance?.sourceOrder) !==
    JSON.stringify(EXPECTED_SOURCES.map((source) => source.file))
  )
    fail(
      "Original three-source history order must remain explicit and unchanged",
    );
  if (
    provenance?.origin?.kind !== "recovered-project-migration-history" ||
    provenance.origin.projectRef !== "vhpbvcfkcteswlsdjrfl" ||
    provenance.origin.metadataSource !==
      "supabase_migrations.schema_migrations" ||
    provenance.origin.access !== "authorized-read-only-metadata" ||
    provenance.origin.observedDate !== "2026-10-30" ||
    provenance.origin.observedApproximateUtc !== "11:10" ||
    provenance.origin.observationPrecision !== "approximate-minute-window" ||
    provenance.origin.rawHistoryIsSnapshot !== false
  )
    fail(
      "Preserve the authorized raw-history observation and distinct snapshot provenance",
    );
  if (
    JSON.stringify(provenance?.requiredLaterAccountSources) !==
    JSON.stringify(ACCOUNT_SOURCES)
  )
    fail(
      "Current onboarding, coverage and identity dependencies must remain required",
    );
  if (
    provenance?.requiredBeforeCheckoutSource !==
    "database/migrations/20261020172801_operations_checkout_lifecycle.sql"
  )
    fail("Recovered operating types must precede the existing checkout source");
  for (const expected of EXPECTED_SOURCES) {
    const entry = declared.get(expected.file);
    if (
      !entry ||
      entry.snapshotBytes !== expected.snapshotBytes ||
      entry.snapshotSha256 !== expected.snapshotSha256 ||
      entry.rawHistory?.version !== expected.version ||
      entry.rawHistory?.name !== expected.name ||
      entry.rawHistory?.statementCount !== 1 ||
      entry.rawHistory?.bytes !== expected.rawBytes ||
      entry.rawHistory?.sha256 !== expected.rawSha256 ||
      entry.historyByteTransform !== "remove-exactly-one-final-LF-byte"
    )
      fail(`Pinned snapshot/history identity mismatch: ${expected.file}`);
    const bytes =
      snapshots instanceof Map ? snapshots.get(expected.file) : undefined;
    if (!Buffer.isBuffer(bytes)) {
      fail(`Missing byte snapshot: ${expected.file}`);
      continue;
    }
    if (
      bytes.length !== expected.snapshotBytes ||
      hash(bytes) !== expected.snapshotSha256
    )
      fail(`Snapshot byte/hash drift: ${expected.file}`);
    // Do not trim, normalize comments/whitespace/case or strip every trailing LF.
    // Historical SQL itself may end in LF; remove precisely the one extra byte.
    if (bytes[bytes.length - 1] !== 0x0a) {
      fail(`Snapshot lacks the exact final LF byte: ${expected.file}`);
      continue;
    }
    const raw = bytes.subarray(0, bytes.length - 1);
    if (raw.length !== expected.rawBytes || hash(raw) !== expected.rawSha256)
      fail(`Raw-history exact-final-LF binding mismatch: ${expected.file}`);
  }
  return {
    sourceIntegrityValid: errors.length === 0,
    sourceCount: EXPECTED_SOURCES.length,
    rawHistoryBinding: "snapshot-minus-exactly-one-final-LF-byte",
    noStandaloneExecution: true,
    requiresCurrentAccountCoverage: true,
    pristineFixtureOnly: true,
    databaseExecutionSupported: false,
    freshOrderedGuardAcceptance: false,
    fullCanonicalParity: false,
    errors,
  };
}

export function runCli(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) {
    console.error(
      "Read-only source checker: only --check is supported; there is no apply mode.",
    );
    return 1;
  }
  try {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const result = validateOperatingReplayBundle(
      readOperatingReplayBundle(path.join(root, BUNDLE_PATH)),
    );
    console.log(JSON.stringify(result, null, 2));
    // 0 certifies only these source bytes, never DB execution or release readiness.
    return result.sourceIntegrityValid ? 0 : 1;
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Source validation failed",
    );
    return 1;
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  process.exitCode = runCli();
