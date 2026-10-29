import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    include: [
      "tests/discovery-search-trigger.test.tsx",
      "tests/account-controls.test.tsx",
      "tests/account-unavailable.test.tsx",
      "tests/account-collections-ui.test.tsx",
      "tests/account-passport-redirect.test.ts",
      "tests/account-profile-website.test.ts",
      "tests/account-profile-media-action.test.ts",
      "tests/account-action-return.test.ts",
      "tests/profile-edit-grants-sql.test.ts",
      "tests/profile-terms-grants-sql.test.ts",
      "tests/account-collection-catalogue.test.ts",
      "tests/passport-read-recovery.test.tsx",
    ],
    environment: "jsdom",
  },
});
