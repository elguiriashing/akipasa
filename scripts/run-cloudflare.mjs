import { spawnSync } from "node:child_process";
import path from "node:path";

const action = process.argv[2];
if (action !== "build") {
  console.error("Usage: node scripts/run-cloudflare.mjs build");
  process.exit(2);
}

const cli = path.join(
  process.cwd(),
  "node_modules",
  "@opennextjs",
  "cloudflare",
  "dist",
  "cli",
  "index.js",
);
const result = spawnSync(process.execPath, [cli, action], {
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_DATA_PROVIDER: "hybrid",
  },
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
