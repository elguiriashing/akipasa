import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cpSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BUNDLE_PATH,
  EXPECTED_PROVENANCE,
  readStorageReplayBundle,
  validateStorageReplayBundle,
  runCli,
} from "./check-storage-replay-sources.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const load = () => readStorageReplayBundle(path.join(root, BUNDLE_PATH));
function mutated(fn) {
  const b = load();
  fn(b);
  assert.equal(validateStorageReplayBundle(b).sourceIntegrityValid, false);
}
test("exact source archive certifies integrity only", () => {
  const r = validateStorageReplayBundle(load());
  assert.equal(r.sourceIntegrityValid, true);
  assert.equal(r.sourceCount, 17);
  for (const k of [
    "databaseExecutionSupported",
    "storageHttpAcceptance",
    "freshOrderedGuardAcceptance",
    "fullCanonicalParity",
  ])
    assert.equal(r[k], false);
});
test("every SQL and license hash is independently pinned", () => {
  for (const file of [...EXPECTED_PROVENANCE.sourceOrder, "LICENSE"])
    mutated((b) => {
      const bytes = Buffer.from(b.snapshots.get(file));
      bytes[0] ^= 1;
      b.snapshots.set(file, bytes);
    });
});
test("SQL plus provenance forged together cannot pass", () =>
  mutated((b) => {
    const f = b.provenance.sources[0];
    f.sha256 = "0".repeat(64);
    b.snapshots.set(f.file, Buffer.from("select 1;"));
  }));
test("missing source and missing license fail", () => {
  for (const f of [EXPECTED_PROVENANCE.sourceOrder[0], "LICENSE"])
    mutated((b) => b.snapshots.delete(f));
});
test("duplicate file and source declarations fail", () => {
  mutated((b) => (b.files[0] = b.files[1]));
  mutated((b) => (b.provenance.sources[0] = b.provenance.sources[1]));
});
test("path traversal and extra SQL fail", () => {
  mutated((b) => (b.provenance.sources[0].file = "../escape.sql"));
  mutated((b) => b.snapshots.set("extra.sql", Buffer.from("select 1")));
});
test("explicit numeric order rejects lexical sorting", () =>
  mutated((b) => b.provenance.sourceOrder.sort()));
test("false readiness and relaxed prerequisites fail", () => {
  for (const k of [
    "productionMigration",
    "databaseExecutionSupported",
    "storageHttpAcceptance",
    "freshOrderedGuardAcceptance",
    "fullCanonicalParity",
    "noStandaloneExecution",
    "pristineFixtureOnly",
    "requiresFreshAuth",
    "requiresCurrentPlatformReview",
    "requiresCurrentAccountCoverage",
  ])
    mutated((b) => (b.provenance[k] = !b.provenance[k]));
});
test("upstream/license identity changes fail", () => {
  mutated((b) => (b.provenance.upstreamCommit = "master"));
  mutated((b) => (b.provenance.license.spdx = "MIT"));
});
test("exported authority deeply immutable", () => {
  assert.throws(() => EXPECTED_PROVENANCE.sourceOrder.reverse(), TypeError);
  assert.throws(() => {
    EXPECTED_PROVENANCE.sources[0].sha256 = "x";
  }, TypeError);
});
function fixture(fn) {
  const temp = mkdtempSync(path.join(os.tmpdir(), "storage-source-test-"));
  try {
    const bundle = path.join(temp, "bundle");
    cpSync(path.join(root, BUNDLE_PATH), bundle, { recursive: true });
    fn(bundle, temp);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}
test("reader refuses missing or extra on-disk files", () => {
  fixture((b) => {
    unlinkSync(path.join(b, "LICENSE"));
    assert.throws(() => readStorageReplayBundle(b), /allowlist/);
  });
  fixture((b) => {
    writeFileSync(path.join(b, "extra.sql"), "select 1");
    assert.throws(() => readStorageReplayBundle(b), /allowlist/);
  });
});
test("reader refuses file symlinks and symlinked directory", () =>
  fixture((b, t) => {
    const f = EXPECTED_PROVENANCE.sourceOrder[0];
    unlinkSync(path.join(b, f));
    symlinkSync(path.join(root, BUNDLE_PATH, f), path.join(b, f));
    assert.throws(() => readStorageReplayBundle(b), /allowlist/);
    const link = path.join(t, "link");
    symlinkSync(b, link);
    assert.throws(() => readStorageReplayBundle(link), /symlink/);
  }));
test("apply, execute and arbitrary paths are refused", () => {
  const old = console.error;
  console.error = () => {};
  try {
    for (const args of [
      ["--apply"],
      ["--execute"],
      ["--check", "--apply"],
      ["../other"],
    ])
      assert.equal(runCli(args), 1);
  } finally {
    console.error = old;
  }
});
