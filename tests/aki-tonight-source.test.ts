import { afterEach, describe, expect, it, vi } from "vitest";

const sources = vi.hoisted(() => ({
  ordinary: vi.fn(async () => []),
  live: vi.fn(async () => []),
  service: vi.fn(() => {
    throw new Error("No service credentials in this test");
  }),
}));

vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/auth", () => ({ optionalUser: vi.fn() }));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: sources.service,
}));
vi.mock("@/lib/repository", () => ({
  repository: { discover: sources.ordinary },
  SupabaseDiscoveryRepository: class {
    discover = sources.live;
  },
}));

import { recommendDiscovery } from "../src/lib/personalisation/server";

afterEach(() => vi.clearAllMocks());

describe("Tonight live supply boundary", () => {
  it("does not query the hybrid/fixture fallback for a live-only surface", async () => {
    const result = await recommendDiscovery({
      query: { locality: "fuengirola", time: "tonight" },
      surface: "akitonight",
      liveOnly: true,
    });
    expect(result.items).toEqual([]);
    expect(sources.live).toHaveBeenCalledOnce();
    expect(sources.ordinary).not.toHaveBeenCalled();
  });

  it("propagates live failure before ranking or telemetry instead of reporting empty supply", async () => {
    sources.live.mockRejectedValueOnce(new Error("catalogue unavailable"));
    await expect(
      recommendDiscovery({
        query: { time: "tonight" },
        surface: "akitonight",
        liveOnly: true,
      }),
    ).rejects.toThrow("catalogue unavailable");
    expect(sources.ordinary).not.toHaveBeenCalled();
    expect(sources.service).not.toHaveBeenCalled();
  });

  it("preserves the configured repository for existing discovery callers", async () => {
    await recommendDiscovery({ query: {}, surface: "discover" });
    expect(sources.ordinary).toHaveBeenCalledOnce();
    expect(sources.live).not.toHaveBeenCalled();
  });
});
