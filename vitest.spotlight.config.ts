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
      "tests/contribution-draft.test.tsx",
      "tests/discovery-navigation.test.ts",
      "tests/event-occurrence.test.ts",
      "tests/event-booking-occurrence.test.ts",
      "tests/venue-booking-read-recovery.test.tsx",
      "tests/global-search-validation.test.tsx",
      "tests/discovery-filter-validation.test.ts",
      "tests/staff-ui-upgrades.test.tsx",
      "tests/auth-ux-upgrades.test.ts",
      "tests/auth-recovery-continuity.test.ts",
      "tests/auth-form-controls.test.tsx",
      "tests/support-dialog-upgrades.test.tsx",
      "tests/admin-read-recovery.test.tsx",
      "tests/workflow-continuity.test.tsx",
      "tests/creator-read-recovery.test.tsx",
      "tests/creator-review-action.test.ts",
    ],
  },
});
