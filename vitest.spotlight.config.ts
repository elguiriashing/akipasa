import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: [
      "tests/venue-spotlight.test.tsx",
      "tests/event-spotlight.test.tsx",
      "tests/share-button.test.tsx",
      "tests/public-ui-upgrades.test.tsx",
      "tests/staff-ui-upgrades.test.tsx",
      "tests/auth-ux-upgrades.test.ts",
      "tests/support-dialog-upgrades.test.tsx",
      "tests/admin-read-recovery.test.tsx",
      "tests/workflow-continuity.test.tsx",
    ],
  },
});
