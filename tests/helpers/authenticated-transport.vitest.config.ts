import { defineConfig } from "vitest/config";

// Run in the browser-enabled CI job after Playwright Chromium installation.
// This suite uses only a disposable loopback HTTP fixture, never QA credentials.
export default defineConfig({
  test: {
    include: ["tests/authenticated-local-transport.test.ts"],
    environment: "node",
  },
});
