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
    ],
  },
});
