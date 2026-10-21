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
