import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  esbuild: { jsx: "automatic" },
  test: {
    include: [
      "tests/checkin-scanner-lifecycle.test.tsx",
      "tests/community-stories-*.test.ts",
      "tests/community-stories-*.test.tsx",
      "tests/city-stories.test.tsx",
      "tests/story-moderation.test.tsx",
      "src/components/community/CheckinStoryComposer.test.tsx",
      "src/components/community/CheckinStories.test.tsx",
    ],
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
  },
});
