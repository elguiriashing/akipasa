#!/usr/bin/env node
/** Protect only the two authoritative contracts from copied tool transport output. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const controlledContractDocuments = [
  ["docs/AKIPASA_MASTER.md", "# AKIPASA MASTER SYSTEM CONTRACT"],
  ["docs/CHANGE_IMPACT_REGISTER.md", "# Change Impact Register"],
];
const transportMarkers = [
  /^\s*Warning:\s+truncated output\b/i,
  /^\s*Total output lines:\s*\d+\s*$/i,
  /(?:\u2026|\.{3})\s*\d+\s+tokens? truncated(?:\u2026|\.{3})/i,
  /---\s*TRUNCATED\s*---/,
];

export function contractDocumentProblems(root = process.cwd()) {
  const problems = [];
  for (const [relative, heading] of controlledContractDocuments) {
    let text;
    try {
      text = fs.readFileSync(path.join(root, relative), "utf8");
    } catch {
      problems.push({
        path: relative,
        line: 1,
        reason: "contract missing or unreadable",
      });
      continue;
    }
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
    const first = lines.findIndex((line) => line.trim());
    if (first < 0 || lines[first] !== heading)
      problems.push({
        path: relative,
        line: Math.max(1, first + 1),
        reason: "canonical title missing before contract content",
      });
    lines.forEach((line, index) => {
      if (transportMarkers.some((pattern) => pattern.test(line)))
        problems.push({
          path: relative,
          line: index + 1,
          reason: "tool transport/truncation marker in authoritative source",
        });
    });
  }
  return problems;
}

export function reportContractDocumentProblems(problems) {
  for (const problem of problems)
    console.error(`${problem.path}:${problem.line}: ${problem.reason}`);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const problems = contractDocumentProblems();
  reportContractDocumentProblems(problems);
  if (problems.length) process.exitCode = 1;
  else console.log("Authoritative contract integrity passed.");
}
