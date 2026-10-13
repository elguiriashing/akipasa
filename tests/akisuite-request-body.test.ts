import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upload: vi.fn(),
  authenticate: vi.fn(),
  agent: vi.fn(),
}));

vi.mock("../src/app/[locale]/business/venue/[id]/actions", () => ({
  uploadVenueImage: mocks.upload,
}));
vi.mock("../src/lib/ai-team/auth", () => ({
  requireAIUser: mocks.authenticate,
  AIAccessError: class extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code: string,
    ) {
      super(message);
    }
  },
  aiErrorResponse: (error: { status?: number; code?: string }) =>
    Response.json(
      { ok: false, error: error.code || "ai_request_failed" },
      { status: error.status || 400 },
    ),
}));
vi.mock("../src/lib/ai-team/gateway", () => ({
  runAIAgent: mocks.agent,
}));

import { POST as uploadMedia } from "../src/app/api/business/venue-media/route";
import { POST as supportChat } from "../src/app/api/support-agent/chat/route";

const mediaUrl = "https://business.akipasa.com/api/business/venue-media";
const chatUrl = "https://akipasa.com/api/support-agent/chat";
const encoder = new TextEncoder();

function streamedRequest(
  url: string,
  chunks: string[],
  contentType: string,
  declaredLength?: string,
) {
  const cancel = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      const chunk = chunks.shift();
      if (chunk === undefined) controller.close();
      else controller.enqueue(encoder.encode(chunk));
    },
    cancel,
  });
  const headers = new Headers({
    origin: new URL(url).origin,
    "content-type": contentType,
  });
  if (declaredLength !== undefined)
    headers.set("content-length", declaredLength);
  return {
    request: new Request(url, {
      method: "POST",
      headers,
      body: stream,
      duplex: "half",
    } as RequestInit),
    cancel,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.upload.mockResolvedValue({ ok: true, media: { id: "test-media" } });
  mocks.authenticate.mockResolvedValue({
    user: { id: "test-user" },
    service: {},
  });
  mocks.agent.mockResolvedValue({ text: "Support answer" });
});

describe("venue-media request bounds", () => {
  it.each([undefined, "1"])(
    "rejects oversized multipart streams with content-length %s before upload",
    async (declaredLength) => {
      const boundary = "audit-boundary";
      const chunks = [
        `--${boundary}\r\nContent-Disposition: form-data; name="padding"\r\n\r\n`,
        ...Array.from({ length: 60 }, () => "x".repeat(256 * 1024)),
        `\r\n--${boundary}--\r\n`,
      ];
      const attempt = streamedRequest(
        mediaUrl,
        chunks,
        `multipart/form-data; boundary=${boundary}`,
        declaredLength,
      );
      const response = await uploadMedia(attempt.request);
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({
        ok: false,
        error: "invalid-file",
      });
      expect(mocks.upload).not.toHaveBeenCalled();
      expect(attempt.cancel).toHaveBeenCalledOnce();
      expect(chunks.length).toBeGreaterThan(0);
    },
  );

  it("keeps valid binary multipart bytes and existing authorization results", async () => {
    const body = new FormData();
    const bytes = new Uint8Array([0, 128, 255, 10]);
    body.set("image", new File([bytes], "a.png", { type: "image/png" }));
    body.set("venueId", "test-venue");
    mocks.upload.mockResolvedValue({ ok: false, error: "permissions" });
    const response = await uploadMedia(
      new Request(mediaUrl, {
        method: "POST",
        headers: { origin: new URL(mediaUrl).origin },
        body,
      }),
    );
    expect(response.status).toBe(422);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    const passed = mocks.upload.mock.calls[0][0] as FormData;
    expect(passed.get("venueId")).toBe("test-venue");
    expect(passed.get("inline")).toBe("1");
    const image = passed.get("image") as File;
    expect(image.name).toBe("a.png");
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(bytes);
    expect(await response.json()).toEqual({
      ok: false,
      error: "permissions",
    });
  });

  it("keeps the oversized response when upstream cancellation fails", async () => {
    const attempt = streamedRequest(
      mediaUrl,
      ["x".repeat(12 * 1024 * 1024), "trailing", "more"],
      "multipart/form-data; boundary=unused",
    );
    attempt.cancel.mockRejectedValue(new Error("Upstream cancellation failed"));
    expect((await uploadMedia(attempt.request)).status).toBe(413);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("rejects malformed multipart and wrong origins without upload", async () => {
    const attempt = streamedRequest(
      mediaUrl,
      ["invalid"],
      "multipart/form-data; boundary=missing",
    );
    expect((await uploadMedia(attempt.request)).status).toBe(400);
    const wrongOrigin = streamedRequest(mediaUrl, [], "multipart/form-data");
    wrongOrigin.request.headers.set("origin", "https://untrusted.example");
    expect((await uploadMedia(wrongOrigin.request)).status).toBe(403);
    expect(mocks.upload).not.toHaveBeenCalled();
  });
});

describe("support-chat request bounds", () => {
  const valid = {
    message: "Help with my AkiPasa account",
    locale: "es",
    surface: "site_contact",
    pagePath: "/es/contact",
  };

  it.each([undefined, "1"])(
    "rejects oversized JSON with content-length %s before auth or provider work",
    async (declaredLength) => {
      const attempt = streamedRequest(
        chatUrl,
        [
          JSON.stringify({ ...valid, padding: "x".repeat(8_000) }),
          " ".repeat(1_000),
          " ".repeat(1_000),
        ],
        "application/json",
        declaredLength,
      );
      const response = await supportChat(attempt.request);
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ ok: false, error: "too_large" });
      expect(mocks.authenticate).not.toHaveBeenCalled();
      expect(mocks.agent).not.toHaveBeenCalled();
      expect(attempt.cancel).toHaveBeenCalledOnce();
    },
  );

  it("keeps small support requests and authenticated identity", async () => {
    const attempt = streamedRequest(
      chatUrl,
      [JSON.stringify(valid)],
      "application/json",
    );
    const response = await supportChat(attempt.request);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, text: "Support answer" });
    expect(mocks.authenticate).toHaveBeenCalledOnce();
    expect(mocks.agent).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: "test-user", allowedToolNames: [] }),
    );
  });

  it("counts UTF-8 bytes rather than characters across JSON chunks", async () => {
    const value = JSON.stringify({ ...valid, padding: "ñ".repeat(4_000) });
    expect(value.length).toBeLessThan(8_000);
    const attempt = streamedRequest(
      chatUrl,
      [value.slice(0, 2_000), value.slice(2_000), " ", " "],
      "application/json",
    );
    expect((await supportChat(attempt.request)).status).toBe(413);
    expect(mocks.authenticate).not.toHaveBeenCalled();
    expect(mocks.agent).not.toHaveBeenCalled();
  });

  it("preserves authentication and origin denials", async () => {
    const attempt = streamedRequest(
      chatUrl,
      [JSON.stringify(valid)],
      "application/json",
    );
    mocks.authenticate.mockRejectedValue({ status: 401, code: "unauthorized" });
    expect((await supportChat(attempt.request)).status).toBe(401);
    const wrongOrigin = streamedRequest(chatUrl, [], "application/json");
    wrongOrigin.request.headers.set("origin", "https://untrusted.example");
    expect((await supportChat(wrongOrigin.request)).status).toBe(403);
    expect(mocks.agent).not.toHaveBeenCalled();
  });

  it("rejects malformed or invalid JSON before auth and provider work", async () => {
    for (const value of ["{invalid", '{"message":"missing fields"}']) {
      const attempt = streamedRequest(chatUrl, [value], "application/json");
      const response = await supportChat(attempt.request);
      expect(response.status).toBe(400);
      expect(mocks.authenticate).not.toHaveBeenCalled();
      expect(mocks.agent).not.toHaveBeenCalled();
    }
  });
});
