import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: [
      "tests/portal-home.test.tsx",
      "tests/akiduermo-search-api.test.ts",
      "tests/venue-media-upload.test.ts",
      "tests/venue-media-studio.test.tsx",
    ],
  },
});
