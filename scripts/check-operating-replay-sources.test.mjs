import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  BUNDLE_PATH,
  EXPECTED_SOURCES,
  readOperatingReplayBundle,
  validateOperatingReplayBundle,
} from "./check-operating-replay-sources.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const original = readOperatingReplayBundle(path.join(root, BUNDLE_PATH));
const fixture = () => ({
  provenance: structuredClone(original.provenance),
  snapshots: new Map(
    [...original.snapshots].map(([file, bytes]) => [file, Buffer.from(bytes)]),
  ),
  files: [...original.files],
});
const invalid = (bundle, pattern) => {
  const result = validateOperatingReplayBundle(bundle);
  assert.equal(result.sourceIntegrityValid, false);
  assert.equal(result.databaseExecutionSupported, false);
  assert.equal(result.freshOrderedGuardAcceptance, false);
  assert.equal(result.fullCanonicalParity, false);
  assert(
    result.errors.some((error) => pattern.test(error)),
    result.errors.join("\n"),
  );
};
const first = EXPECTED_SOURCES[0].file;

function temporaryBundle(action) {
  const directory = mkdtempSync(path.join(tmpdir(), "akipasa-replay-source-"));
  try {
    for (const [file, bytes] of original.snapshots)
      writeFileSync(path.join(directory, file), bytes);
    writeFileSync(
      path.join(directory, "PROVENANCE.json"),
      JSON.stringify(original.provenance),
    );
    writeFileSync(
      path.join(directory, "README.md"),
      "Synthetic package test, no SQL execution.\n",
    );
    action(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test("the admitted package pins both snapshots and distinct raw-history bytes", () => {
  const result = validateOperatingReplayBundle(original);
  assert.equal(result.sourceIntegrityValid, true, result.errors.join("\n"));
  assert.equal(result.sourceCount, 3);
  assert.equal(result.noStandaloneExecution, true);
  assert.equal(result.requiresCurrentAccountCoverage, true);
  assert.equal(result.pristineFixtureOnly, true);
  assert.equal(result.databaseExecutionSupported, false);
  assert.equal(result.freshOrderedGuardAcceptance, false);
  assert.equal(result.fullCanonicalParity, false);
  for (const source of original.provenance.sources) {
    assert.equal(source.snapshotBytes, source.rawHistory.bytes + 1);
    assert.notEqual(source.snapshotSha256, source.rawHistory.sha256);
    assert.equal(
      source.historyByteTransform,
      "remove-exactly-one-final-LF-byte",
    );
  }
});

test("same-length source mutation fails snapshot and raw-history bindings", () => {
  const bundle = fixture();
  const bytes = bundle.snapshots.get(first);
  bytes[0] ^= 1;
  invalid(bundle, /Snapshot byte\/hash drift/);
  invalid(bundle, /Raw-history exact-final-LF binding mismatch/);
});

test("missing, additional, CRLF or altered terminal bytes are not normalized away", () => {
  for (const mutate of [
    (bytes) => bytes.subarray(0, bytes.length - 1),
    (bytes) => Buffer.concat([bytes, Buffer.from("\n")]),
    (bytes) =>
      Buffer.concat([bytes.subarray(0, bytes.length - 1), Buffer.from("\r\n")]),
    (bytes) =>
      Buffer.concat([bytes.subarray(0, bytes.length - 1), Buffer.from(" ")]),
  ]) {
    const bundle = fixture();
    bundle.snapshots.set(first, mutate(bundle.snapshots.get(first)));
    invalid(bundle, /Snapshot byte\/hash drift/);
  }
  const notLf = fixture();
  notLf.snapshots.set(
    first,
    Buffer.concat([
      notLf.snapshots.get(first).subarray(0, -1),
      Buffer.from(" "),
    ]),
  );
  invalid(notLf, /lacks the exact final LF byte/);
});

test("comments, case and whitespace changes remain byte changes", () => {
  for (const mutate of [
    (text) => text.replace("create table", "CREATE TABLE"),
    (text) => text.replace("\n\n", "\n"),
    (text) => text.replace(/^--[^\n]*\n/, ""),
  ]) {
    const bundle = fixture();
    const changed = Buffer.from(
      mutate(bundle.snapshots.get(first).toString("utf8")),
    );
    assert.notDeepEqual(changed, original.snapshots.get(first));
    bundle.snapshots.set(first, changed);
    invalid(bundle, /Snapshot byte\/hash drift/);
  }
});

test("changing provenance hashes to match tampered source cannot change pinned identities", () => {
  const bundle = fixture();
  bundle.provenance.sources[0].snapshotSha256 = "f".repeat(64);
  bundle.provenance.sources[0].rawHistory.sha256 = "e".repeat(64);
  invalid(bundle, /Pinned snapshot\/history identity mismatch/);
});

test("raw-history hash is never replaced with the retained snapshot hash", () => {
  const bundle = fixture();
  bundle.provenance.sources[0].rawHistory.sha256 =
    bundle.provenance.sources[0].snapshotSha256;
  invalid(bundle, /Pinned snapshot\/history identity mismatch/);
  bundle.provenance.origin.rawHistoryIsSnapshot = true;
  invalid(bundle, /distinct snapshot provenance/);
});

test("history version, name, byte length and transform are all pinned", () => {
  for (const mutate of [
    (source) => (source.rawHistory.version = "20261016092915"),
    (source) => (source.rawHistory.name = "relabelled"),
    (source) => (source.rawHistory.bytes += 1),
    (source) => (source.rawHistory.statementCount = 2),
    (source) => (source.historyByteTransform = "trim-trailing-whitespace"),
  ]) {
    const bundle = fixture();
    mutate(bundle.provenance.sources[0]);
    invalid(bundle, /Pinned snapshot\/history identity mismatch/);
  }
});

test("missing, duplicate and extra declared sources cannot be admitted", () => {
  const missing = fixture();
  missing.provenance.sources.pop();
  invalid(missing, /exactly three source identities/);
  const duplicate = fixture();
  duplicate.provenance.sources[1] = structuredClone(
    duplicate.provenance.sources[0],
  );
  invalid(duplicate, /Duplicate provenance source/);
  const extra = fixture();
  extra.provenance.sources.push({ file: "9999_unreviewed.sql" });
  invalid(extra, /non-allowlisted provenance path/);
});

test("unsafe paths and extra SQL are rejected without reading arbitrary provenance paths", () => {
  for (const file of [
    "../outside.sql",
    "/tmp/outside.sql",
    "https://example.test/source.sql",
  ]) {
    const bundle = fixture();
    bundle.provenance.sources[0].file = file;
    invalid(bundle, /Unsafe or non-allowlisted provenance path/);
  }
  const extra = fixture();
  extra.snapshots.set("9999_extra.sql", Buffer.from("select 'not executed';"));
  extra.files.push("9999_extra.sql");
  invalid(extra, /exactly the three allowlisted SQL files/);
  invalid(extra, /exactly three pinned sources/);
});

test("standalone, non-pristine, weakened-coverage or false acceptance flags cannot pass", () => {
  for (const flag of [
    "noStandaloneExecution",
    "requiresCurrentAccountCoverage",
    "pristineFixtureOnly",
    "productionMigration",
    "databaseExecutionSupported",
    "freshOrderedGuardAcceptance",
    "fullCanonicalParity",
  ]) {
    const bundle = fixture();
    bundle.provenance[flag] = !bundle.provenance[flag];
    invalid(bundle, new RegExp(flag));
  }
});

test("source order and current account dependencies cannot be dropped or reversed", () => {
  const order = fixture();
  order.provenance.sourceOrder.reverse();
  invalid(order, /history order/);
  const coverage = fixture();
  coverage.provenance.requiredLaterAccountSources.splice(1, 1);
  invalid(coverage, /coverage and identity dependencies/);
  const checkout = fixture();
  checkout.provenance.requiredBeforeCheckoutSource = null;
  invalid(checkout, /precede the existing checkout source/);
});

test("metadata observation cannot become a claimed exact timestamp or another project", () => {
  for (const [key, value] of [
    ["projectRef", "unverified-project"],
    ["access", "production-write"],
    ["observationPrecision", "exact"],
    ["observedDate", "2026-10-31"],
  ]) {
    const bundle = fixture();
    bundle.provenance.origin[key] = value;
    invalid(bundle, /authorized raw-history observation/);
  }
});

test("filesystem scanner rejects extra SQL, missing metadata and symlinks", () => {
  temporaryBundle((directory) => {
    writeFileSync(
      path.join(directory, "9999_extra.sql"),
      "select 'synthetic';\n",
    );
    assert.throws(
      () => readOperatingReplayBundle(directory),
      /Unexpected or non-regular/,
    );
  });
  temporaryBundle((directory) => {
    rmSync(path.join(directory, "PROVENANCE.json"));
    assert.throws(
      () => readOperatingReplayBundle(directory),
      /Missing bundle entry/,
    );
  });
  temporaryBundle((directory) => {
    const file = path.join(directory, first);
    rmSync(file);
    symlinkSync(path.join(directory, "README.md"), file);
    assert.throws(
      () => readOperatingReplayBundle(directory),
      /Unexpected or non-regular/,
    );
  });
});

test("CLI checks source integrity only and refuses every apply-like option", () => {
  const script = fileURLToPath(
    new URL("./check-operating-replay-sources.mjs", import.meta.url),
  );
  const checked = spawnSync(process.execPath, [script, "--check"], {
    encoding: "utf8",
  });
  assert.equal(checked.status, 0, checked.stderr);
  const result = JSON.parse(checked.stdout);
  assert.equal(result.sourceIntegrityValid, true);
  assert.equal(result.databaseExecutionSupported, false);
  assert.equal(result.freshOrderedGuardAcceptance, false);
  for (const flag of [
    "--apply",
    "--execute",
    "--production",
    "--check=/tmp/other",
  ]) {
    const refused = spawnSync(process.execPath, [script, flag], {
      encoding: "utf8",
    });
    assert.equal(refused.status, 1);
    assert.match(refused.stderr, /there is no apply mode/);
    assert.equal(refused.stdout, "");
  }
});
