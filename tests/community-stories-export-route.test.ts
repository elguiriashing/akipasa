import { afterEach, beforeEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  user: {
    id: "98000000-0000-4000-8000-000000000001",
    email: "synthetic@example.invalid",
  } as { id: string; email: string } | null,
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: fixture.user }, error: null }),
    },
    rpc: fixture.rpc,
    from() {
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        order: () => q,
        range: () => q,
        retry: async () => ({ data: [], error: null, count: 0 }),
      };
      return q;
    },
  }),
}));
import { GET } from "../src/app/[locale]/account/export/route";
beforeEach(() => {
  vi.clearAllMocks();
  fixture.user = {
    id: "98000000-0000-4000-8000-000000000001",
    email: "synthetic@example.invalid",
  };
  for (const key of [
    "AKIPASA_COMMUNITY_STORIES_SCHEMA_READY",
    "AKISUITE_FUNNEL_READY",
    "AKISUITE_PRIVATE_IDENTITY_EXPORTS_READY",
    "AKIPASA_PRESTIGE_SCHEMA_READY",
    "AKISUITE_SUBSCRIPTIONS_READY",
    "AKISUITE_REFERRALS_READY",
    "AKIPASA_ACCOUNT_COMPLETION_ENABLED",
  ])
    vi.stubEnv(key, "false");
  fixture.rpc.mockImplementation(
    async (name: string, input?: { p_payload?: { section: string } }) =>
      name === "community_stories_api"
        ? {
            data: {
              section: input!.p_payload!.section,
              items: [],
              nextCursor: null,
              truncated: false,
            },
            error: null,
          }
        : { data: [], error: null },
  );
});
afterEach(() => vi.unstubAllEnvs());
it("leaves prior-release exports unchanged while Stories schema is not enabled", async () => {
  const response = await GET();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data).not.toHaveProperty("community_stories");
  expect(
    fixture.rpc.mock.calls.some(([name]) => name === "community_stories_api"),
  ).toBe(false);
});
it("exports all three complete caller-only sections once schema readiness is on", async () => {
  vi.stubEnv("AKIPASA_COMMUNITY_STORIES_SCHEMA_READY", "true");
  const response = await GET();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data.community_stories).toEqual([]);
  expect(body.data.community_story_reports).toEqual([]);
  expect(body.data.community_story_media_cleanup).toEqual([]);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  const calls = fixture.rpc.mock.calls.filter(
    ([name]) => name === "community_stories_api",
  );
  expect(calls).toHaveLength(3);
  for (const [, input] of calls)
    expect(input).toMatchObject({
      p_action: "export",
      p_payload: { after: null, limit: 100 },
    });
});
it("returns503 rather than false-complete200 when the expected Stories RPC is missing", async () => {
  vi.stubEnv("AKIPASA_COMMUNITY_STORIES_SCHEMA_READY", "true");
  fixture.rpc.mockImplementation(async (name: string) =>
    name === "community_stories_api"
      ? {
          data: null,
          error: { code: "PGRST202", message: "Private internal detail" },
        }
      : { data: [], error: null },
  );
  const response = await GET();
  expect(response.status).toBe(503);
  const body = await response.json();
  expect(body.unavailable_tables).toEqual([
    "community_stories",
    "community_story_reports",
    "community_story_media_cleanup",
  ]);
  expect(body).not.toHaveProperty("data");
  expect(JSON.stringify(body)).not.toContain("Private internal detail");
});
it("keeps guests out before any export RPC", async () => {
  vi.stubEnv("AKIPASA_COMMUNITY_STORIES_SCHEMA_READY", "true");
  fixture.user = null;
  expect((await GET()).status).toBe(401);
  expect(fixture.rpc).not.toHaveBeenCalled();
});
