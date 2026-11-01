// @vitest-environment node
import { beforeEach, afterEach, expect, it, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  getUser: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
  remove: vi.fn(),
  service: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: { getUser: fixture.getUser },
    rpc: fixture.rpc,
  }),
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: () => {
    fixture.service();
    return {
      storage: {
        from: () => ({
          upload: fixture.upload,
          download: fixture.download,
          remove: fixture.remove,
        }),
      },
    };
  },
}));
import { handleStoryRequest } from "../src/lib/community-stories/http";
const id = "123e4567-e89b-12d3-a456-426614174000";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AKIPASA_COMMUNITY_STORIES_SCHEMA_READY", "true");
  vi.stubEnv("AKIPASA_COMMUNITY_STORIES_ENABLED", "true");
  fixture.getUser.mockResolvedValue({ data: { user: { id } }, error: null });
  fixture.rpc.mockResolvedValue({ data: null, error: null });
  fixture.upload.mockResolvedValue({ error: null });
  fixture.remove.mockResolvedValue({ error: null });
});
it("rejects cross-origin writes before authentication or database calls", async () => {
  const result = await handleStoryRequest(
    new Request("https://app.test/api/community/stories", {
      method: "POST",
      headers: { origin: "https://evil.test" },
    }),
  );
  expect(result.status).toBe(403);
  expect(fixture.getUser).not.toHaveBeenCalled();
  expect(fixture.rpc).not.toHaveBeenCalled();
});
it("returns JSON401 for guest writes without touching private storage", async () => {
  fixture.getUser.mockResolvedValue({ data: { user: null }, error: null });
  const result = await handleStoryRequest(
    new Request("https://app.test/api/community/stories", {
      method: "POST",
      headers: { origin: "https://app.test" },
    }),
  );
  expect(result.status).toBe(401);
  expect(fixture.rpc).not.toHaveBeenCalled();
  expect(fixture.service).not.toHaveBeenCalled();
});
it("does not fetch private media without explicit RPC authorization", async () => {
  const result = await handleStoryRequest(
    new Request(`https://app.test/api/community/stories/${id}/media`),
    [id, "media"],
  );
  expect(result.status).toBe(404);
  expect(fixture.rpc).toHaveBeenCalledWith("community_stories_api", {
    p_action: "media",
    p_payload: { id },
  });
  expect(fixture.service).not.toHaveBeenCalled();
});
it("labels missing backend as unavailable, never a fabricated empty feed", async () => {
  fixture.rpc.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
  const result = await handleStoryRequest(
    new Request("https://app.test/api/community/stories/cities"),
    ["cities"],
  );
  expect(result.status).toBe(503);
  expect(await result.json()).toMatchObject({ error: { code: "unavailable" } });
});
it("serves only WebP with no sniffing or reusable public cache", async () => {
  fixture.rpc.mockResolvedValue({ data: { id }, error: null });
  fixture.download.mockResolvedValue({
    data: new Blob(["bytes"]),
    error: null,
  });
  const result = await handleStoryRequest(
    new Request(`https://app.test/api/community/stories/${id}/media`),
    [id, "media"],
  );
  expect(result.status).toBe(200);
  expect(result.headers.get("content-type")).toBe("image/webp");
  expect(result.headers.get("x-content-type-options")).toBe("nosniff");
  expect(result.headers.get("cache-control")).toContain("no-store");
});
it("rejects arbitrary city and cursor input without querying", async () => {
  for (const query of ["city=../../private", "city=malaga&cursor=forged"])
    expect(
      (
        await handleStoryRequest(
          new Request(`https://app.test/api/community/stories?${query}`),
        )
      ).status,
    ).toBe(400);
  expect(fixture.rpc).not.toHaveBeenCalled();
});
it("requires a bounded reason and never lets client status approve a story", async () => {
  const result = await handleStoryRequest(
    new Request(`https://app.test/api/community/stories/${id}/moderate`, {
      method: "POST",
      headers: {
        origin: "https://app.test",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        decision: "approve",
        reason: "",
        status: "approved",
      }),
    }),
    [id, "moderate"],
  );
  expect(result.status).toBe(400);
  expect(fixture.rpc).not.toHaveBeenCalled();
});
it("does not delete storage until the caller-owned RPC succeeds", async () => {
  fixture.rpc.mockResolvedValue({ data: null, error: { code: "42501" } });
  const result = await handleStoryRequest(
    new Request(`https://app.test/api/community/stories/${id}`, {
      method: "DELETE",
      headers: { origin: "https://app.test" },
    }),
    [id],
  );
  expect(result.status).toBe(403);
  expect(fixture.service).not.toHaveBeenCalled();
});
function uploadRequest(publicOptIn = "true", extra = false) {
  const bytes = new Uint8Array(30);
  const view = new DataView(bytes.buffer);
  for (const [at, text] of [
    [0, "RIFF"],
    [8, "WEBP"],
    [12, "VP8 "],
  ] as const)
    [...text].forEach((c, i) => (bytes[at + i] = c.charCodeAt(0)));
  view.setUint32(4, 22, true);
  view.setUint32(16, 10, true);
  bytes.set([0x9d, 1, 0x2a], 23);
  view.setUint16(26, 100, true);
  view.setUint16(28, 100, true);
  const form = new FormData();
  for (const [key, value] of Object.entries({
    checkInId: id,
    kind: "venue",
    caption: "Actual visit",
    publicOptIn,
  }))
    form.set(key, value);
  form.set("file", new File([bytes], "photo.webp", { type: "image/webp" }));
  if (extra) form.set("cityId", "forged");
  return new Request("https://app.test/api/community/stories", {
    method: "POST",
    headers: { origin: "https://app.test" },
    body: form,
  });
}
it("validates metadata and explicit consent before reservation or storage", async () => {
  expect((await handleStoryRequest(uploadRequest("false"))).status).toBe(403);
  expect((await handleStoryRequest(uploadRequest("true", true))).status).toBe(
    400,
  );
  expect(fixture.rpc).not.toHaveBeenCalled();
  expect(fixture.service).not.toHaveBeenCalled();
});
it("publishes only pending after authenticated reserve, private upload and finalize", async () => {
  fixture.rpc.mockImplementation(
    async (_name: string, { p_action }: { p_action: string }) => ({
      data:
        p_action === "reserve"
          ? { id }
          : { story: { id, status: "pending" }, moderation: "manual" },
      error: null,
    }),
  );
  const result = await handleStoryRequest(uploadRequest());
  expect(result.status).toBe(201);
  expect(await result.json()).toMatchObject({
    story: { status: "pending" },
    moderation: "manual",
  });
  expect(fixture.rpc.mock.calls.map((call) => call[1].p_action)).toEqual([
    "reserve",
    "finalize",
  ]);
  expect(fixture.upload).toHaveBeenCalledWith(
    `${id}.webp`,
    expect.any(Uint8Array),
    { contentType: "image/webp", upsert: false, cacheControl: "0" },
  );
});
it("aborts failed uploads so the verified check-in can be retried", async () => {
  fixture.rpc.mockResolvedValue({ data: { id }, error: null });
  fixture.upload.mockResolvedValue({
    error: { message: "storage unavailable" },
  });
  const result = await handleStoryRequest(uploadRequest());
  expect(result.status).toBe(503);
  expect(fixture.rpc.mock.calls.map((call) => call[1].p_action)).toEqual([
    "reserve",
    "abort",
    "cleanup-complete",
  ]);
});
it("aborts a reservation when storage upload throws, not only when it returns an error", async () => {
  fixture.rpc.mockResolvedValue({ data: { id }, error: null });
  fixture.upload.mockRejectedValue(new TypeError("transport disconnected"));
  const result = await handleStoryRequest(uploadRequest());
  expect(result.status).toBe(503);
  expect(fixture.rpc.mock.calls.map((call) => call[1].p_action)).toEqual([
    "reserve",
    "abort",
    "cleanup-complete",
  ]);
  expect(fixture.remove).toHaveBeenCalledWith([`${id}.webp`]);
});
it.each(["returned", "thrown"])(
  "reports pending private cleanup after access revocation when storage %s failure occurs",
  async (kind) => {
    fixture.rpc.mockResolvedValue({ data: { deleted: true }, error: null });
    if (kind === "returned")
      fixture.remove.mockResolvedValue({ error: { message: "unavailable" } });
    else fixture.remove.mockRejectedValue(new Error("disconnected"));
    const result = await handleStoryRequest(
      new Request(`https://app.test/api/community/stories/${id}`, {
        method: "DELETE",
        headers: { origin: "https://app.test" },
      }),
      [id],
    );
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({
      deleted: true,
      mediaCleanup: "pending",
    });
    expect(fixture.rpc.mock.calls.map((call) => call[1].p_action)).toEqual([
      "delete",
    ]);
  },
);
it("confirms removal only after storage acknowledgment and canonical metadata absence", async () => {
  fixture.rpc.mockImplementation(
    async (_name: string, { p_action }: { p_action: string }) => ({
      data: p_action === "delete" ? { deleted: true } : { removed: true },
      error: null,
    }),
  );
  const result = await handleStoryRequest(
    new Request(`https://app.test/api/community/stories/${id}`, {
      method: "DELETE",
      headers: { origin: "https://app.test" },
    }),
    [id],
  );
  expect(await result.json()).toEqual({
    deleted: true,
    mediaCleanup: "removed",
  });
  expect(fixture.rpc.mock.calls.map((call) => call[1].p_action)).toEqual([
    "delete",
    "cleanup-complete",
  ]);
});
it("does not remove a concurrently finalized image if canonical abort refuses", async () => {
  fixture.rpc.mockImplementation(
    async (_name: string, { p_action }: { p_action: string }) => {
      if (p_action === "reserve") return { data: { id }, error: null };
      return { data: null, error: { code: "42501" } };
    },
  );
  fixture.upload.mockRejectedValue(new Error("ambiguous transport"));
  const result = await handleStoryRequest(uploadRequest());
  expect(result.status).toBe(503);
  expect((await result.json()).mediaCleanup).toBe("pending");
  expect(fixture.remove).not.toHaveBeenCalled();
});
it("classifies provider transport TypeError as unavailable rather than blaming valid input", async () => {
  fixture.rpc.mockRejectedValue(new TypeError("provider disconnected"));
  const result = await handleStoryRequest(
    new Request("https://app.test/api/community/stories/cities"),
    ["cities"],
  );
  expect(result.status).toBe(503);
  expect(await result.json()).toMatchObject({ error: { code: "unavailable" } });
});

afterEach(() => vi.unstubAllEnvs());
it("does not collect or query anything before schema/export readiness is explicit", async () => {
  vi.stubEnv("AKIPASA_COMMUNITY_STORIES_SCHEMA_READY", "");
  const result = await handleStoryRequest(uploadRequest());
  expect(result.status).toBe(503);
  expect(fixture.getUser).not.toHaveBeenCalled();
  expect(fixture.rpc).not.toHaveBeenCalled();
  expect(fixture.service).not.toHaveBeenCalled();
});

it.each(["", "false"])(
  "pauses new uploads before consuming a body or querying when UI flag is %s",
  async (flag) => {
    vi.stubEnv("AKIPASA_COMMUNITY_STORIES_ENABLED", flag);
    const request = uploadRequest();
    const result = await handleStoryRequest(request);
    expect(result.status).toBe(503);
    expect(await result.json()).toMatchObject({
      error: { code: "collection_paused" },
    });
    expect(request.bodyUsed).toBe(false);
    expect(fixture.getUser).not.toHaveBeenCalled();
    expect(fixture.rpc).not.toHaveBeenCalled();
    expect(fixture.service).not.toHaveBeenCalled();
    expect(fixture.upload).not.toHaveBeenCalled();
  },
);
it("still rejects cross-origin submissions while collection is paused", async () => {
  vi.stubEnv("AKIPASA_COMMUNITY_STORIES_ENABLED", "false");
  const result = await handleStoryRequest(
    new Request("https://app.test/api/community/stories", {
      method: "POST",
      headers: { origin: "https://evil.test" },
      body: "unread",
    }),
  );
  expect(result.status).toBe(403);
  expect(fixture.rpc).not.toHaveBeenCalled();
});
it("keeps authenticated owner listing and withdrawal available with collection paused", async () => {
  vi.stubEnv("AKIPASA_COMMUNITY_STORIES_ENABLED", "false");
  fixture.rpc.mockImplementation(
    async (_name: string, { p_action }: { p_action: string }) => ({
      data:
        p_action === "mine"
          ? { stories: [{ id, status: "pending" }], available: true }
          : p_action === "delete"
            ? { deleted: true }
            : { removed: true },
      error: null,
    }),
  );
  const mine = await handleStoryRequest(
    new Request("https://app.test/api/community/stories/mine"),
    ["mine"],
  );
  expect(mine.status).toBe(200);
  expect(await mine.json()).toMatchObject({ stories: [{ id }] });
  const deleted = await handleStoryRequest(
    new Request(`https://app.test/api/community/stories/${id}`, {
      method: "DELETE",
      headers: { origin: "https://app.test" },
    }),
    [id],
  );
  expect(deleted.status).toBe(200);
  expect(await deleted.json()).toEqual({
    deleted: true,
    mediaCleanup: "removed",
  });
  expect(fixture.rpc.mock.calls.map((call) => call[1].p_action)).toEqual([
    "mine",
    "delete",
    "cleanup-complete",
  ]);
  expect(fixture.upload).not.toHaveBeenCalled();
});
it("does not bypass authentication for owner reads during a collection pause", async () => {
  vi.stubEnv("AKIPASA_COMMUNITY_STORIES_ENABLED", "false");
  fixture.getUser.mockResolvedValue({ data: { user: null }, error: null });
  const result = await handleStoryRequest(
    new Request("https://app.test/api/community/stories/mine"),
    ["mine"],
  );
  expect(result.status).toBe(401);
  expect(fixture.rpc).not.toHaveBeenCalled();
});
it("returns durable owner cleanup controls on a read during a publishing pause without touching storage", async () => {
  vi.stubEnv("AKIPASA_COMMUNITY_STORIES_ENABLED", "false");
  const mine = {
    stories: [],
    available: true,
    cleanupPendingIds: [id],
    cleanupPendingHasMore: true,
  };
  fixture.rpc.mockResolvedValue({ data: mine, error: null });
  const result = await handleStoryRequest(
    new Request("https://app.test/api/community/stories/mine"),
    ["mine"],
  );
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual(mine);
  expect(fixture.rpc).toHaveBeenCalledWith("community_stories_api", {
    p_action: "mine",
    p_payload: { queue: "pending" },
  });
  expect(fixture.getUser).toHaveBeenCalledOnce();
  expect(fixture.service).not.toHaveBeenCalled();
});
it("does not remove an orphaned object unless the canonical owner cleanup task authorizes DELETE", async () => {
  fixture.rpc.mockResolvedValue({ data: null, error: null });
  const result = await handleStoryRequest(
    new Request(`https://app.test/api/community/stories/${id}`, {
      method: "DELETE",
      headers: { origin: "https://app.test" },
    }),
    [id],
  );
  expect(result.status).toBe(404);
  expect(fixture.rpc).toHaveBeenCalledWith("community_stories_api", {
    p_action: "delete",
    p_payload: { id },
  });
  expect(fixture.service).not.toHaveBeenCalled();
  expect(fixture.remove).not.toHaveBeenCalled();
});
