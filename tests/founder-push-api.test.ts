import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  optionalUser: vi.fn(),
  createClient: vi.fn(),
  sendTest: vi.fn(),
}));
vi.mock("../src/lib/auth", () => ({ optionalUser: mocks.optionalUser }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("../src/lib/founder-push-delivery", () => ({
  sendFounderTestPush: mocks.sendTest,
  pushEnvironment: () => process.env,
}));
import { GET, POST, DELETE } from "../src/app/api/admin/push-devices/route";
import { POST as TEST } from "../src/app/api/admin/push-test/route";

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sessionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const deviceId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const token = "Synthetic_FCM_Token_For_Local_Tests";
const session = {
  access_token:
    "header." +
    Buffer.from(JSON.stringify({ session_id: sessionId })).toString(
      "base64url",
    ) +
    ".signature",
};
let rpc: ReturnType<typeof vi.fn>;
let profile: ReturnType<typeof vi.fn>;
let device: ReturnType<typeof vi.fn>;
function request(
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return new Request("https://akipasa.com/api/admin/push-devices", {
    method,
    headers: {
      Origin: "https://akipasa.com",
      "User-Agent": "AkiPasaAndroid/5",
      "Content-Type": "application/json",
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
beforeEach(() => {
  vi.stubEnv("AKIPASA_PUSH_ENABLED", "false");
  vi.stubEnv("AKIPASA_PUSH_ENROLLMENT_ENABLED", "true");
  vi.stubEnv("AKIPASA_PUSH_TEST_ENABLED", "true");
  vi.stubEnv("AKIPASA_PUSH_FOUNDER_IDS", userId);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-local-key");
  rpc = vi.fn(async (name: string) => ({
    data:
      name === "reserve_founder_push_test"
        ? [
            {
              token,
              user_id: userId,
              expires_at: new Date(Date.now() + 60000).toISOString(),
              session_id: sessionId,
              locale: "es",
              test_id: deviceId,
            },
          ]
        : true,
    error: null,
  }));
  profile = vi
    .fn()
    .mockResolvedValue({ data: { preferred_locale: "es" }, error: null });
  device = vi.fn().mockResolvedValue({ data: { id: deviceId }, error: null });
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: device,
  };
  mocks.createClient.mockReturnValue({
    rpc,
    from: vi.fn().mockReturnValue(query),
  });
  mocks.optionalUser.mockResolvedValue({
    user: { id: userId },
    supabase: {
      auth: {
        getSession: vi
          .fn()
          .mockResolvedValue({ data: { session }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: profile,
      }),
    },
  });
  mocks.sendTest.mockResolvedValue({ status: "sent", reason: "" });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
describe("founder enrollment authorization", () => {
  it("allows explicitly eligible dark-launch enrollment while production delivery is off", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      eligible: true,
      registration_key: sessionId,
      locale: "es",
      test_enabled: true,
    });
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(rpc).toHaveBeenCalledWith("active_founder_push_eligible", {
      p_user: userId,
      p_session: sessionId,
    });
  });
  it.each<Record<string, string>>([
    {},
    { Origin: "https://evil.invalid" },
    { "User-Agent": "ordinary-browser" },
  ])(
    "requires native first-party origin before querying identity %j",
    async (override) => {
      const req = Object.keys(override).length
        ? request("GET", undefined, override)
        : new Request("https://akipasa.com/api/admin/push-devices");
      expect((await GET(req)).status).toBe(403);
      expect(mocks.optionalUser).not.toHaveBeenCalled();
    },
  );
  it("does not infer founder status from administrator role", async () => {
    vi.stubEnv("AKIPASA_PUSH_FOUNDER_IDS", deviceId);
    expect((await GET(request())).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([0, 429, 503])(
    "preserves enrollment on transient Auth failure %i",
    async (status) => {
      mocks.optionalUser.mockResolvedValue({
        user: null,
        error: { status },
        supabase: {},
      });
      expect((await GET(request())).status).toBe(503);
      expect(rpc).not.toHaveBeenCalled();
    },
  );
  it("returns permanent denial for an invalid authenticated session", async () => {
    mocks.optionalUser.mockResolvedValue({
      user: null,
      error: { status: 401 },
      supabase: {},
    });
    expect((await GET(request())).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
  it("denies non-admin, underage, unconfirmed adult and revoked-session RPC outcomes", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await GET(request())).status).toBe(403);
    expect(
      (await POST(request("POST", { token, registration_key: sessionId })))
        .status,
    ).toBe(403);
    expect(rpc).not.toHaveBeenCalledWith(
      "register_founder_push_device",
      expect.anything(),
    );
  });
  it("fails closed on unavailable eligibility and unauthenticated sessions", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "unavailable" } });
    expect((await GET(request())).status).toBe(503);
    mocks.optionalUser.mockResolvedValue({ user: null });
    expect((await GET(request())).status).toBe(403);
  });
  it("prevents a token callback from an old account/session enrolling the current account", async () => {
    expect(
      (await POST(request("POST", { token, registration_key: deviceId })))
        .status,
    ).toBe(403);
    expect(rpc).not.toHaveBeenCalledWith(
      "register_founder_push_device",
      expect.anything(),
    );
  });
  it("registers only validated caller/session/token through the SQL authorization boundary", async () => {
    expect(
      (await POST(request("POST", { token, registration_key: sessionId })))
        .status,
    ).toBe(204);
    expect(rpc).toHaveBeenCalledWith("register_founder_push_device", {
      p_user: userId,
      p_session: sessionId,
      p_token: token,
    });
  });
  it.each([
    { token: "x", registration_key: sessionId },
    { token, registration_key: sessionId, user_id: deviceId },
    { token: "x".repeat(6000), registration_key: sessionId },
  ])("rejects malformed, spoofed and oversized bodies", async (body) => {
    expect((await POST(request("POST", body))).status).toBe(400);
    expect(mocks.optionalUser).not.toHaveBeenCalled();
  });
  it("allows token-scoped withdrawal after flags and founder permission are removed", async () => {
    vi.stubEnv("AKIPASA_PUSH_ENROLLMENT_ENABLED", "false");
    vi.stubEnv("AKIPASA_PUSH_FOUNDER_IDS", "");
    expect((await DELETE(request("DELETE", { token }))).status).toBe(204);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("revoke_founder_push_device", {
      p_user: userId,
      p_session: sessionId,
      p_token: token,
    });
  });
});
describe("safe real-device test", () => {
  it("requires its separate flag", async () => {
    vi.stubEnv("AKIPASA_PUSH_TEST_ENABLED", "false");
    expect(
      (await TEST(request("POST", { token, registration_key: sessionId })))
        .status,
    ).toBe(404);
    expect(mocks.sendTest).not.toHaveBeenCalled();
  });
  it("uses only a current-session existing device and a reserved test id without creating a claim", async () => {
    const response = await TEST(
      request("POST", { token, registration_key: sessionId }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      accepted: true,
      test_id: deviceId,
    });
    expect(rpc).toHaveBeenCalledWith("reserve_founder_push_test", {
      p_user: userId,
      p_session: sessionId,
      p_device: deviceId,
    });
    expect(mocks.sendTest).toHaveBeenCalledWith(
      expect.objectContaining({ AKIPASA_PUSH_ENABLED: "false" }),
      expect.objectContaining({
        token,
        user_id: userId,
        session_id: sessionId,
      }),
      deviceId,
    );
    expect(rpc.mock.calls.map((call) => call[0])).toEqual([
      "active_founder_push_eligible",
      "reserve_founder_push_test",
    ]);
  });
  it("refuses unknown devices and enforces the durable cooldown", async () => {
    device.mockResolvedValueOnce({ data: null, error: null });
    expect(
      (await TEST(request("POST", { token, registration_key: sessionId })))
        .status,
    ).toBe(403);
    rpc.mockImplementation(async (name: string) => ({
      data: name === "reserve_founder_push_test" ? [] : true,
      error: null,
    }));
    expect(
      (await TEST(request("POST", { token, registration_key: sessionId })))
        .status,
    ).toBe(429);
    expect(mocks.sendTest).not.toHaveBeenCalled();
  });
});
