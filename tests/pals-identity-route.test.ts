import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/pals/identity/route";
import { DEFAULT_APPEARANCE } from "@/lib/pals/avatar-v2";
import { previewAccess } from "@/lib/pals/server";

vi.mock("@/lib/pals/server", () => ({
  previewAccess: vi.fn(),
  privateHeaders: { "Cache-Control": "private, no-store" },
}));

const query = {
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
};
const from = vi.fn();
const request = (body: unknown, origin = "https://akipasa.com") =>
  new Request("https://akipasa.com/pals/identity", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });

describe("private Wardrobe account boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    from.mockReturnValue(query);
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.maybeSingle.mockResolvedValue({ data: null, error: null });
    query.upsert.mockResolvedValue({ error: null });
    vi.mocked(previewAccess).mockResolvedValue({
      user: { id: "caller-only" },
      allowed: true,
      supabase: { from },
    } as never);
  });

  it("denies guests before reading or saving an avatar", async () => {
    vi.mocked(previewAccess).mockResolvedValue({ user: null } as never);
    expect((await GET()).status).toBe(401);
    expect(
      (await POST(request({ appearance: DEFAULT_APPEARANCE, save: true })))
        .status,
    ).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it("hides the preview from non-invited signed-in accounts", async () => {
    vi.mocked(previewAccess).mockResolvedValue({
      user: { id: "other" },
      allowed: false,
    } as never);
    expect((await GET()).status).toBe(404);
    expect(from).not.toHaveBeenCalled();
  });

  it("reads only the authenticated owner's avatar without caching it", async () => {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(query.eq).toHaveBeenCalledWith("user_id", "caller-only");
    expect(await response.json()).toEqual({
      appearance: DEFAULT_APPEARANCE,
      saved: false,
    });
    expect(DEFAULT_APPEARANCE.model).toBe("rain-v3");
    expect(query.upsert).not.toHaveBeenCalled();
  });

  it("restores an existing model-less saved look as classic without rewriting it", async () => {
    const legacy: Record<string, unknown> = {
      ...DEFAULT_APPEARANCE,
      hair: "bun",
      hairColor: "blue",
      top: "jacket",
      bag: "backpack",
    };
    delete legacy.model;
    query.maybeSingle.mockResolvedValue({
      data: { appearance: legacy },
      error: null,
    });
    const response = await GET();
    expect(await response.json()).toEqual({
      appearance: { ...legacy, model: "classic-v2" },
      saved: true,
    });
    expect(query.upsert).not.toHaveBeenCalled();
  });

  it.each(["classic-v2", "rain-v3", "snow-v4"])(
    "saves the allowed %s model while preserving hidden wardrobe choices",
    async (model) => {
      const appearance = {
        ...DEFAULT_APPEARANCE,
        model,
        hair: "bun",
        top: "jacket",
        topColor: "purple",
        bag: "backpack",
      };
      const response = await POST(request({ appearance, save: true }));
      expect(response.status).toBe(200);
      expect(query.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: "caller-only", appearance }),
        { onConflict: "user_id" },
      );
      expect(await response.json()).toEqual({ appearance, saved: true });
    },
  );

  it.each([
    { model: "unknown-model" },
    { model: "https://example.invalid/model.glb" },
    { model: "/pals/models/unapproved.glb" },
    { assetUrl: "https://example.invalid/model.glb" },
  ])(
    "rejects unapproved model or asset input %j before saving",
    async (extra) => {
      const response = await POST(
        request({
          appearance: { ...DEFAULT_APPEARANCE, ...extra },
          save: true,
        }),
      );
      expect(response.status).toBe(400);
      expect(query.upsert).not.toHaveBeenCalled();
    },
  );

  it("uses the session owner rather than a client-selected owner on Save", async () => {
    const response = await POST(
      request({ appearance: DEFAULT_APPEARANCE, save: true }),
    );
    expect(response.status).toBe(200);
    expect(query.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "caller-only",
        appearance: DEFAULT_APPEARANCE,
      }),
      { onConflict: "user_id" },
    );
  });

  it("rejects forged ownership fields and cross-site writes", async () => {
    expect(
      (
        await POST(
          request({
            appearance: DEFAULT_APPEARANCE,
            save: true,
            user_id: "another-owner",
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          request(
            { appearance: DEFAULT_APPEARANCE, save: true },
            "https://example.invalid",
          ),
        )
      ).status,
    ).toBe(403);
    expect(query.upsert).not.toHaveBeenCalled();
  });

  it("does not persist local preview-only edits", async () => {
    expect(
      (await POST(request({ appearance: DEFAULT_APPEARANCE, save: false })))
        .status,
    ).toBe(200);
    expect(query.upsert).not.toHaveBeenCalled();
  });

  it("does not report a failed save as successful", async () => {
    query.upsert.mockResolvedValue({ error: { message: "Fixture failure" } });
    expect(
      (await POST(request({ appearance: DEFAULT_APPEARANCE, save: true })))
        .status,
    ).toBe(503);
  });
});
