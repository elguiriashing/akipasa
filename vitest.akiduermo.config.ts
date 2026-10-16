import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: [
      "tests/independent-accommodation-review.test.tsx",
      "tests/independent-accommodation-media.test.ts",
      "tests/independent-accommodation-api.test.ts",
      "tests/independent-accommodation-terms.test.ts",
      "tests/portal-home.test.tsx",
      "tests/business-team-home.test.tsx",
      "tests/business-team-refresh.test.tsx",
      "tests/staff-claims.test.tsx",
      "tests/akiduermo-search-api.test.ts",
      "tests/venue-media-upload.test.ts",
      "tests/venue-media-studio.test.tsx",
      "tests/venue-catalogue.test.ts",
      "tests/venue-catalogue-visibility.test.tsx",
      "tests/stay-ui-upgrades.test.tsx",
      "tests/admin-city-integrity.test.tsx",
      "tests/akiduermo-manager.test.tsx",
    ],
  },
});
