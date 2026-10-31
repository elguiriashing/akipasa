import { beforeEach, describe, expect, it, vi } from "vitest";
import { behaviourBatchSchema } from "../src/lib/personalisation/schema";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  user: vi.fn(),
  tracking: vi.fn(),
  service: vi.fn(),
  rpc: vi.fn(),
  settings: vi.fn(),
}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/account-onboarding-server", () => ({
  accountTrackingAllowed: mocks.tracking,
}));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: mocks.user,
}));
vi.mock("@/lib/supabase/service", () => ({
  createSupabaseServiceClient: mocks.service,
}));
import { POST } from "../src/app/api/v1/behaviour/events/route";

const event = {
  event_id: "00000000-0000-4000-8000-000000000001",
  schema_version: 1,
  event_type: "venue_opened",
  occurred_at: "2026-10-29T12:00:00Z",
  surface: "discovery",
};
function request(body: string | Uint8Array, length?: string) {
  const bytes =
    typeof body === "string" ? new TextEncoder().encode(body) : body;
  return new Request("https://akipasa.test/api/v1/behaviour/events", {
    method: "POST",
    headers: {
      origin: "https://akipasa.test",
      "content-type": "application/json",
      ...(length === undefined ? {} : { "content-length": length }),
    },
    body: new ReadableStream({
      start(controller) {
        for (let offset = 0; offset < bytes.length; offset += 1024)
          controller.enqueue(bytes.slice(offset, offset + 1024));
        controller.close();
      },
    }),
    duplex: "half",
  } as RequestInit);
}
beforeEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  mocks.cookies.mockResolvedValue({
    get: (name: string) => ({
      value: name === "ak_personalisation" ? "granted" : "fixture",
    }),
  });
  mocks.user.mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: mocks.settings }) }),
    }),
  });
  mocks.settings.mockResolvedValue({ data: { personalisation_enabled: true } });
  mocks.tracking.mockResolvedValue(true);
  mocks.rpc.mockResolvedValue({ data: { accepted: 1 }, error: null });
  mocks.service.mockReturnValue({ rpc: mocks.rpc });
});
describe("behaviour request validation boundary", () => {
  it.each([undefined, "1"])(
    "enforces streamed byte limit with declared length %s before schema or backend",
    async (length) => {
      const schema = vi.spyOn(behaviourBatchSchema, "safeParse");
      const response = await POST(
        request(
          JSON.stringify({ events: [], padding: "x".repeat(64000) }),
          length,
        ),
      );
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual({ error: "payload_too_large" });
      expect(schema).not.toHaveBeenCalled();
      expect(mocks.cookies).not.toHaveBeenCalled();
      expect(mocks.service).not.toHaveBeenCalled();
    },
  );
  it("rejects declared oversized bodies before reading", async () => {
    const response = await POST(request("{}", "64001"));
    expect(response.status).toBe(413);
    expect(mocks.user).not.toHaveBeenCalled();
  });
  it("rejects 26 raw events before element validation or backend access", async () => {
    const schema = vi.spyOn(behaviourBatchSchema, "safeParse");
    const response = await POST(
      request(JSON.stringify({ events: Array(26).fill(event) })),
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid_behaviour_batch" });
    expect(schema).not.toHaveBeenCalled();
    expect(mocks.cookies).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it.each(["{", new Uint8Array([0xff])])(
    "retains invalid batch response for malformed JSON/UTF8",
    async (body) => {
      const response = await POST(request(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "invalid_behaviour_batch",
      });
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it("preserves same-origin rejection before parsing", async () => {
    const response = await POST(
      new Request("https://akipasa.test/api/v1/behaviour/events", {
        method: "POST",
        headers: { origin: "https://other.test" },
        body: "{}",
      }),
    );
    expect(response.status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("retains unsupported media status", async () => {
    const response = await POST(
      new Request("https://akipasa.test/api/v1/behaviour/events", {
        method: "POST",
        headers: {
          origin: "https://akipasa.test",
          "content-type": "text/plain",
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(415);
  });
  it("retains empty/invalid batch rejection", async () => {
    expect((await POST(request('{"events":[]}'))).status).toBe(400);
  });
  it.each([1, 25])(
    "preserves legitimate %s-event batches and unverified authority",
    async (count) => {
      const response = await POST(
        request(JSON.stringify({ events: Array(count).fill(event) })),
      );
      expect(response.status).toBe(200);
      expect(mocks.rpc).toHaveBeenCalledWith(
        "ingest_behaviour_batch",
        expect.objectContaining({
          p_events: Array(count).fill(event),
          p_verified: false,
          p_profile: null,
          p_personalisation_allowed: true,
        }),
      );
    },
  );
  it("accepts the exact64000-byte boundary without changing legitimate payloads", async () => {
    const body = JSON.stringify({ events: [event] });
    const response = await POST(
      request(body + " ".repeat(64000 - new TextEncoder().encode(body).length)),
    );
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledOnce();
  });
  it("counts UTF8 bytes instead of JavaScript characters", async () => {
    const response = await POST(
      request(JSON.stringify({ events: [], padding: "é".repeat(32000) }), "1"),
    );
    expect(response.status).toBe(413);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("retains missing-session response without service access", async () => {
    mocks.cookies.mockResolvedValue({ get: () => undefined });
    const response = await POST(request(JSON.stringify({ events: [event] })));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "tracking_session_missing",
    });
    expect(mocks.service).not.toHaveBeenCalled();
  });
  it("retains account consent denial as204 without ingestion", async () => {
    mocks.user.mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: "fixture-user" } } }),
      },
    });
    mocks.tracking.mockResolvedValue(false);
    expect(
      (await POST(request(JSON.stringify({ events: [event] })))).status,
    ).toBe(204);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("retains denied anonymous consent in RPC rather than enabling it", async () => {
    mocks.cookies.mockResolvedValue({
      get: (name: string) => ({
        value: name === "ak_personalisation" ? "denied" : "fixture",
      }),
    });
    expect(
      (await POST(request(JSON.stringify({ events: [event] })))).status,
    ).toBe(200);
    expect(mocks.rpc.mock.calls[0][1].p_personalisation_allowed).toBe(false);
  });
  it.each([
    ["rate limit exceeded", 429, "rate_limited"],
    ["unavailable", 503, "ingestion_unavailable"],
  ])("retains backend %s response", async (message, status, error) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message } });
    const response = await POST(request(JSON.stringify({ events: [event] })));
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error });
  });
});
