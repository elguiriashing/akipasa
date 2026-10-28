import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  is: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ rpc: db.rpc, from: db.from }),
}));

import { POST } from "../src/app/api/launch-waitlist/route";

const entryId = "20000000-0000-4000-8000-000000000022";
const request = (
  overrides: Record<string, unknown> = {},
  origin = "https://akiduermo.com",
) =>
  new Request("https://akipasa.com/api/launch-waitlist", {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      "cf-connecting-ip": "203.0.113.21",
    },
    body: JSON.stringify({
      product: "duermo",
      fullName: "Example Traveller",
      email: "example@example.com",
      city: "Fuengirola",
      audience: "person",
      locale: "en",
      interests: "",
      launchConsent: true,
      marketingConsent: false,
      turnstileToken: "synthetic-proof",
      website: "",
      ...overrides,
    }),
  });

function mockSender(
  result: "success" | "ambiguous" | "rejected" | "rate_limited" | "bad_success",
) {
  const sender = vi.fn(async (url: string, options?: RequestInit) => {
    if (url.includes("siteverify"))
      return Response.json({
        success: true,
        hostname: "akiduermo.com",
        action: "launch_waitlist",
      });
    if (url !== "https://api.resend.com/emails" || !options)
      throw new Error("unexpected outbound request");
    if (result === "ambiguous") throw new Error("simulated timeout");
    if (result === "rejected")
      return Response.json({ message: "invalid" }, { status: 400 });
    if (result === "rate_limited")
      return Response.json({ message: "retry" }, { status: 429 });
    if (result === "bad_success") return Response.json({}, { status: 200 });
    return Response.json({ id: "provider-id-123" });
  });
  vi.stubGlobal("fetch", sender);
  return sender;
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service-only");
  vi.stubEnv("LAUNCH_WAITLIST_TURNSTILE_SECRET", "synthetic-test-secret");
  vi.stubEnv("LAUNCH_WAITLIST_RATE_SECRET", "synthetic-test-hmac");
  vi.stubEnv("RESEND_API_KEY", "primary-test-key");
  vi.stubEnv("CLAIM_RESEND_API_KEY", "obsolete-claim-test-key");
  db.rpc.mockReset();
  db.from.mockReset();
  db.update.mockReset();
  db.eq.mockReset();
  db.is.mockReset();
  db.rpc.mockImplementation(async (name: string) => {
    if (name === "reserve_launch_waitlist_rate")
      return { data: true, error: null };
    if (name === "reserve_launch_waitlist_verification")
      return { data: [{ entry_id: entryId }], error: null };
    throw new Error("unexpected RPC " + name);
  });
  const chain = { update: db.update, eq: db.eq, is: db.is };
  db.update.mockReturnValue(chain);
  db.eq.mockReturnValue(chain);
  db.is.mockResolvedValue({ data: null, error: null });
  db.from.mockReturnValue(chain);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("launch waitlist provider boundary", () => {
  it("uses the primary Resend key and confirms accepted email", async () => {
    const sender = mockSender("success");
    const response = await POST(request());
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({
      ok: true,
      status: "check_email",
    });
    const mailCall = sender.mock.calls.find(
      ([url]) => url === "https://api.resend.com/emails",
    );
    expect(mailCall).toBeDefined();
    expect(mailCall?.[1]?.headers).toMatchObject({
      Authorization: "Bearer primary-test-key",
    });
    expect(db.from).not.toHaveBeenCalled();
  });

  for (const result of ["ambiguous", "rate_limited", "bad_success"] as const) {
    it(
      "preserves valid verification links after " + result + " delivery",
      async () => {
        mockSender(result);
        const response = await POST(request());
        expect(response.status).toBe(503);
        expect(db.from).not.toHaveBeenCalled();
        expect(db.rpc).toHaveBeenCalledWith(
          "reserve_launch_waitlist_verification",
          expect.objectContaining({ p_product: "duermo" }),
        );
      },
    );
  }

  it("clears only this token after definite provider rejection", async () => {
    mockSender("rejected");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(db.from).toHaveBeenCalledWith("launch_waitlist_entries");
    expect(db.update).toHaveBeenCalledWith({
      verification_hash: null,
      verification_expires_at: null,
      verification_sent_at: null,
    });
    expect(db.eq).toHaveBeenCalledWith("id", entryId);
    expect(db.eq).toHaveBeenCalledWith(
      "verification_hash",
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
    expect(db.is).toHaveBeenCalledWith("verified_at", null);
  });

  it("rejects wrong origins and missing consent before sending", async () => {
    const sender = mockSender("success");
    const wrongOrigin = await POST(request({}, "https://akicoches.com"));
    expect(wrongOrigin.status).toBe(400);
    const noConsent = await POST(request({ launchConsent: false }));
    expect(noConsent.status).toBe(400);
    expect(db.rpc).not.toHaveBeenCalled();
    expect(sender).not.toHaveBeenCalled();
  });
});
