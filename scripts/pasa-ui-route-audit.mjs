#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve("src/app");
const manifestPath = "docs/AKIPASA_UI_ROUTE_MATRIX_20261028.json";
const inventory = JSON.parse(readFileSync(manifestPath, "utf8"));

function pageFiles(dir) {
  const files = [];
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const current = path.join(dir, item.name);
    if (item.isDirectory()) files.push(...pageFiles(current));
    else if (item.isFile() && item.name === "page.tsx") {
      files.push(path.relative(process.cwd(), current).replaceAll(path.sep, "/"));
    }
  }
  return files;
}

const actual = pageFiles(root).sort();
const expected = Object.keys(inventory.routes).sort();
const missing = actual.filter((name) => !expected.includes(name));
const removed = expected.filter((name) => !actual.includes(name));
const invalid = expected.filter((name) => {
  const record = inventory.routes[name];
  return !["consumer", "operational", "other-product", "cross-product"].includes(record.scope) ||
    !["in-progress", "pending", "accepted", "excluded"].includes(record.status);
});
if (missing.length || removed.length || invalid.length) {
  console.error(JSON.stringify({ missing, removed, invalid }, null, 2));
  process.exit(1);
}
const outstanding = expected.filter((name) => {
  const item = inventory.routes[name];
  return item.scope !== "other-product" && item.status !== "accepted";
});
console.log(`Pasa route audit: ${expected.length} routes inventoried, ${outstanding.length} awaiting release acceptance.`);
if (process.argv.includes("--strict") && outstanding.length) {
  console.error("Release blocked. Not all in-scope pages have passed visual and functional acceptance:");
  for (const file of outstanding) console.error(`  ${file}`);
  process.exit(2);
}
