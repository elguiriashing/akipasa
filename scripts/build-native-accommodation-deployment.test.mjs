import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  buildDeployment,
  deploymentDirectory,
  sourceMigrations,
  digest,
  splitSql,
} from "./build-native-accommodation-deployment.mjs";

test("native phases are deterministic, bounded, hashed and cover every canonical statement exactly once", async () => {
  const { files, manifest } = await buildDeployment();
  assert.equal(
    manifest.source_commit,
    "bea895b3ed1544d62aab92fa107a34aea42d45fb",
  );
  assert.deepEqual(await buildDeployment(), { files, manifest });
  for (const p of manifest.phases) {
    const sql = files[p.file];
    assert.equal(Buffer.byteLength(sql), p.bytes);
    assert.ok(p.bytes <= 5000);
    assert.equal(digest(sql), p.sha256);
    assert.match(
      sql,
      /begin;\nset local lock_timeout='2s';\nset local statement_timeout='8s';\nset local idle_in_transaction_session_timeout='15s';/,
    );
    assert.match(sql, /Native deployment requires empty/);
    assert.match(sql, /commit;\n$/);
    assert.equal(
      sql,
      fs.readFileSync(`${deploymentDirectory}/${p.file}`, "utf8"),
    );
  }
  for (const migration of sourceMigrations) {
    const source = fs.readFileSync(`database/migrations/${migration}`, "utf8");
    const expected = splitSql(source)
      .map((sql, i) => ({ sql, i }))
      .filter(
        ({ sql }) =>
          !/^(begin|commit);$/i.test(
            sql.replace(/^(?:\s|--[^\n]*(?:\n|$))+/, "").trim(),
          ),
      );
    const entries = manifest.phases
      .flatMap((p) => p.source_statements)
      .filter((s) => s.migration === migration);
    assert.equal(entries.length, expected.length);
    assert.deepEqual(
      entries.map((s) => s.statement),
      expected.map((x) => x.i + 1),
    );
    for (const [i, s] of entries.entries())
      assert.equal(s.sha256, digest(expected[i].sql));
  }
  assert.match(
    files[manifest.phases[0].file],
    /create policy native_deployment_bucket_hold/,
  );
  assert.match(
    files[manifest.phases.at(-1).file],
    /drop policy native_deployment_bucket_hold/,
  );
});

test("SQL splitter preserves nested comments, dollar bodies and quoted semicolons", () => {
  const sql = `/* outer /* nested ; */ */ select ';'; create function f() returns text language sql as $body$ select 'it''s;safe' $body$; -- ;\nselect "a;b";`;
  assert.equal(splitSql(sql).length, 3);
  assert.throws(() => splitSql("select 'unfinished"), /Unterminated/);
});

test("archived disabled installation receipts match every frozen manifest phase", async () => {
  const { manifest, files } = await buildDeployment();
  const receipt = JSON.parse(
    fs.readFileSync("docs/receipts/NATIVE_ACCOMMODATION_20261021.json", "utf8"),
  );
  assert.equal(receipt.manifest_sha256, digest(files["manifest.json"]));
  assert.deepEqual(receipt.canonical_sources, manifest.sources);
  assert.equal(receipt.history.length, manifest.phases.length);
  assert.equal(
    new Set(receipt.history.map((p) => p.provider_version)).size,
    manifest.phases.length,
  );
  for (const phase of manifest.phases) {
    const record = receipt.history.find((p) => p.phase === phase.id);
    assert.equal(record.sql_sha256, phase.sha256);
    assert.equal(record.migration_name, phase.migration_name);
    assert.match(record.provider_version, /^\d{14}$/);
  }
  const readback = receipt.independently_queried_final_readback;
  assert.deepEqual(readback.gates, {
    enabled: false,
    singleton: true,
    uploads_enforced: false,
    inventory_enabled: false,
  });
  assert.ok(Object.values(readback.table_rows).every((n) => n === 0));
  assert.equal(readback.bucket.public, false);
  assert.equal(readback.native_storage_objects, 0);
  assert.equal(readback.temporary_hold, 0);
  assert.equal(readback.native_functions, manifest.function_names.length);
});
