import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("../src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: [
      "tests/community-stories-export.test.ts",
      "tests/community-stories-export-route.test.ts",
    ],
  },
});
