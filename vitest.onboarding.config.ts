import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    include: [
      "tests/account-onboarding*.test.ts",
      "tests/account-onboarding-ui.test.tsx",
      "tests/terms-accept-action.test.ts",
    ],
    environment: "node",
  },
});
