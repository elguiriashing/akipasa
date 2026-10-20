import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  contractDocumentProblems,
  controlledContractDocuments,
} from "./check-contract-document-integrity.mjs";

function fixture(run) {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "akipasa-contract-integrity-"),
  );
  fs.mkdirSync(path.join(root, "docs"));
  for (const [file, heading] of controlledContractDocuments)
    fs.writeFileSync(path.join(root, file), `${heading}\n\nVerified source.\n`);
  try {
    return run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("intact titles and ordinary discussion of truncated API reads remain valid", () =>
  fixture((root) => {
    fs.appendFileSync(
      path.join(root, controlledContractDocuments[0][0]),
      "\nFailed/truncated reads must not appear as zero activity.\n",
    );
    assert.deepEqual(contractDocumentProblems(root), []);
  }));
for (const marker of [
  "Warning: truncated output (original token count: 41514)",
  "Total output lines: 1231",
  "start…11514 tokens truncated…end",
  "start...25588 tokens truncated...end",
  "--- TRUNCATED --- 3 more items",
])
  test(`rejects controlled-source transport marker: ${marker}`, () =>
    fixture((root) => {
      const file = controlledContractDocuments[0][0];
      fs.appendFileSync(path.join(root, file), `\n${marker}\n`);
      assert.ok(
        contractDocumentProblems(root).some(
          (p) => p.path === file && p.reason.includes("transport"),
        ),
      );
    }));
test("does not scan arbitrary documents where a transport marker may be a legitimate example", () =>
  fixture((root) => {
    fs.writeFileSync(
      path.join(root, "docs/example.md"),
      "Warning: truncated output (original token count: 1)\n…1 tokens truncated…\n",
    );
    assert.deepEqual(contractDocumentProblems(root), []);
  }));
test("rejects missing, empty and title-less contracts", () =>
  fixture((root) => {
    fs.unlinkSync(path.join(root, controlledContractDocuments[0][0]));
    fs.writeFileSync(path.join(root, controlledContractDocuments[1][0]), "");
    const problems = contractDocumentProblems(root);
    assert.equal(problems.length, 2);
    assert.ok(problems.some((p) => p.reason.includes("missing or unreadable")));
    assert.ok(problems.some((p) => p.reason.includes("title")));
  }));
test("CLI fails on corrupt contract content even in a documentation-only checkout", () =>
  fixture((root) => {
    fs.appendFileSync(
      path.join(root, controlledContractDocuments[1][0]),
      "\nprefix…25588 tokens truncated…suffix\n",
    );
    const script = fileURLToPath(
      new URL("./check-contract-document-integrity.mjs", import.meta.url),
    );
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
    });
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /CHANGE_IMPACT_REGISTER\.md:\d+: tool transport/,
    );
  }));

test("the impact gate rejects corrupted docs before its documentation-only shortcut", () =>
  fixture((root) => {
    function git(...args) {
      const result = spawnSync(
        "git",
        [
          "-c",
          "user.name=Contract fixture",
          "-c",
          "user.email=fixture@example.test",
          ...args,
        ],
        { cwd: root, encoding: "utf8" },
      );
      assert.equal(result.status, 0, result.stderr);
      return result.stdout.trim();
    }
    git("init", "--quiet");
    git("add", "docs");
    git("commit", "-qm", "Intact fixture");
    const base = git("rev-parse", "HEAD");
    fs.appendFileSync(
      path.join(root, controlledContractDocuments[0][0]),
      "\nstart…11514 tokens truncated…end\n",
    );
    git("add", "docs");
    git("commit", "-qm", "Documentation-only corruption");
    const script = fileURLToPath(
      new URL("./check-change-contract.mjs", import.meta.url),
    );
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, AKIPASA_BASE_SHA: base },
    });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /tool transport/);
    assert.doesNotMatch(result.stdout, /Documentation-only PR/);
  }));
