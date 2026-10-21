import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildDeployment,
  splitSql,
  digest,
  deploymentDirectory,
} from "./build-funnel-deployment.mjs";
test("deterministic deployment files match canonical sources and checked-in byte hashes", async () => {
  const { files, manifest } = await buildDeployment();
  for (const [file, content] of Object.entries(files))
    assert.equal(
      fs.readFileSync(`${deploymentDirectory}/${file}`, "utf8"),
      content,
      file,
    );
  const statements = manifest.phases.flatMap(
    (phase) => phase.source_statements,
  );
  assert.equal(
    new Set(statements.map((row) => `${row.migration}:${row.statement}`)).size,
    statements.length,
  );
  for (const phase of manifest.phases) {
    assert.equal(digest(files[phase.file]), phase.sha256);
    assert(phase.bytes < 6500);
    assert.match(files[phase.file], /lock_timeout='2s'/);
    assert.match(files[phase.file], /statement_timeout='8s'/);
    assert.match(files[phase.file], /^begin;/m);
    assert.match(files[phase.file], /commit;\n$/);
  }
  assert.equal(manifest.phases.length, 12);
});
test("SQL splitting preserves quoted semicolons, dollar function bodies and nested comments", () => {
  const source = `-- ; ignored\nselect 'a;''b'; /* outer; /*nested;*/ */ select "a;b"; create function x() returns void as $body$ begin perform ';'; end; $body$ language plpgsql;`;
  const result = splitSql(source);
  assert.equal(result.length, 3);
  assert.match(result[2], /perform ';'; end;/);
  for (const invalid of [
    "select 'broken;",
    "select $x$broken;",
    "/* unfinished",
    "select 1",
  ])
    assert.throws(() => splitSql(invalid));
});

test("archived installation receipts match frozen phase names and payload digests", async () => {
  const { files, manifest } = await buildDeployment();
  const receipt = JSON.parse(
    fs.readFileSync(
      `${deploymentDirectory}/installation-20261021.json`,
      "utf8",
    ),
  );
  assert.equal(receipt.manifest_sha256, digest(files["manifest.json"]));
  assert.equal(receipt.collection_activated, false);
  assert.equal(receipt.retention_approved, false);
  assert.equal(receipt.agent_production_writes, false);
  assert.equal(receipt.phases.length, 11);
  for (const row of receipt.phases) {
    const phase = manifest.phases.find((phase) => phase.id === row.id);
    assert(phase);
    assert.equal(row.phase_sha256, phase.sha256);
    assert.equal(row.migration_name, phase.migration_name);
    assert.match(row.actual_provider_version, /^\d{14}$/);
  }
  assert.equal(receipt.readback.optional_rows, 0);
  assert.equal(receipt.readback.settings.enabled, false);
});
