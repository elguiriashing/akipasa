import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: [
      "tests/founder-push*.test.ts",
      "tests/staff-claim-account-eligibility.test.ts",
      "tests/checkin-venue-preview-sql.test.ts",
    ],
    environment: "node",
  },
});
