import { spawnSync } from "node:child_process";
const result = spawnSync(
  process.execPath,
  [
    "node_modules/vitest/vitest.mjs",
    "run",
    "--config",
    "vitest.akisuite.config.ts",
    "--maxWorkers=1",
    "tests/akisuite-business-funnel.test.ts",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, AKISUITE_FUNNEL_SQL_MODE: "phased" },
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
