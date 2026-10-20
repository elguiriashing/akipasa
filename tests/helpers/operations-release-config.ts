import { readFileSync } from "node:fs";
// Controlled repository JSONC currently uses trailing commas, with no comments.
// Read the actual release configuration so handler regressions exercise its gates.
export const operationsReleaseVars = (
  JSON.parse(
    readFileSync("wrangler.jsonc", "utf8").replace(/,\s*([}\]])/g, "$1"),
  ) as { vars: Record<string, string> }
).vars;
