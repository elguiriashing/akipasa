import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    include: [
      "tests/akisuite-*.test.ts",
      "tests/akisuite-*.test.tsx",
      "tests/business-growth-overview.test.ts",
      "tests/pasa-mobility-operations.test.ts",
    ],
    environment: "node",
  },
});
