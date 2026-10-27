import { generateKeyPairSync } from "node:crypto";
import {
  beforeAll,
  beforeEach,
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
import {
  classifyFcmResponse,
  dispatchFounderClaimPushes,
  sendFounderPush,
  sendFounderTestPush,
  type PushEnv,
} from "../src/lib/founder-push-delivery";

const founder = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const session = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const claim = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
let env: PushEnv;
let fetcher: ReturnType<typeof vi.fn>;
let rpc: ReturnType<typeof vi.fn>;
let claimRead: ReturnType<typeof vi.fn>;
let cleanup: ReturnType<typeof vi.fn>;
let jobs: {
  device_id: string;
  claim_id: string;
  lease_id: string;
  created_at: string;
}[];
beforeAll(() => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  env = {
    AKIPASA_PUSH_ENABLED: "true",
    AKIPASA_PUSH_STARTED_AT: "2026-01-01T00:00:00.000Z",
    AKIPASA_PUSH_ENROLLMENT_ENABLED: "true",
    AKIPASA_PUSH_TEST_ENABLED: "true",
    AKIPASA_PUSH_FOUNDER_IDS: founder,
    NEXT_PUBLIC_SUPABASE_URL: "https://fixture.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "synthetic-key",
    FIREBASE_PROJECT_ID: "fixture-push",
    FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify({
      project_id: "fixture-push",
      client_email: "sender@fixture-push.iam.gserviceaccount.com",
      private_key: privateKey.export({ format: "pem", type: "pkcs8" }),
    }),
  };
});
beforeEach(() => {
  jobs = [1, 2].map((id) => ({
    device_id: "device-" + id,
    claim_id: claim,
    lease_id: "lease-" + id,
    created_at: new Date().toISOString(),
  }));
  rpc = vi.fn(async (name: string, args?: { p_device?: string }) => ({
    data:
      name === "claim_due_push_deliveries"
        ? jobs
        : name === "active_founder_push_device"
          ? [
              {
                token: "token-" + args?.p_device,
                user_id: founder,
                session_id: session,
                expires_at: new Date(Date.now() + 60000).toISOString(),
                locale: "es",
              },
            ]
          : true,
    error: null,
  }));
  claimRead = vi
    .fn()
    .mockResolvedValue({ data: { status: "pending" }, error: null });
  cleanup = vi.fn().mockResolvedValue({ error: null });
  mocks.createClient.mockReturnValue({
    rpc,
    from: vi.fn((table: string) =>
      table === "venue_claims"
        ? {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: claimRead,
          }
        : { delete: vi.fn().mockReturnValue({ eq: cleanup }) },
    ),
  });
  fetcher = vi.fn(async (url: string) =>
    url.includes("oauth2")
      ? Response.json({ access_token: "synthetic-access-token" })
      : Response.json({ name: "projects/fixture-push/messages/test" }),
  );
  vi.stubGlobal("fetch", fetcher);
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("FCM outcome classification", () => {
  it.each([400, 404, 410])(
    "does not erase registrations merely on HTTP %i",
    (status) => {
      expect(
        classifyFcmResponse(status, { error: { status: "INVALID_ARGUMENT" } })
          .invalidToken,
      ).not.toBe(true);
    },
  );
  it("only cleans up typed UNREGISTERED tokens", () => {
    expect(
      classifyFcmResponse(404, {
        error: {
          details: [
            {
              "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError",
              errorCode: "UNREGISTERED",
            },
          ],
        },
      }),
    ).toEqual({
      status: "blocked",
      reason: "token_unregistered",
      invalidToken: true,
    });
  });
  it.each([429, 500, 503])(
    "retries provider-rejected transient HTTP %i",
    (status) => {
      expect(classifyFcmResponse(status, {})).toEqual({
        status: "failed",
        reason: "provider_retryable",
      });
    },
  );
  it("holds ambiguous success/timeouts and permanent credential errors", async () => {
    expect(classifyFcmResponse(200, {})).toEqual({
      status: "blocked",
      reason: "provider_unconfirmed",
    });
    expect(classifyFcmResponse(403, {})).toEqual({
      status: "blocked",
      reason: "provider_configuration",
    });
    fetcher.mockRejectedValue(new Error("synthetic timeout"));
    expect(
      await sendFounderPush(
        "synthetic-token",
        {},
        "synthetic-access",
        "fixture-push",
      ),
    ).toEqual({ status: "blocked", reason: "provider_unconfirmed" });
  });
});
describe("leased founder delivery", () => {
  it("does no provider or database work with production gate off", async () => {
    expect(
      await dispatchFounderClaimPushes({
        ...env,
        AKIPASA_PUSH_ENABLED: "false",
      }),
    ).toEqual({ configured: false, sent: 0 });
    expect(fetcher).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("does not lease messages when OAuth credentials are unavailable", async () => {
    fetcher.mockResolvedValue(new Response(null, { status: 403 }));
    expect(await dispatchFounderClaimPushes(env)).toEqual({
      configured: true,
      sent: 0,
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it.each([undefined, "", "invalid", "2999-01-01T00:00:00Z"])(
    "does no work without a valid activation cutoff (%s)",
    async (startedAt) => {
      expect(
        await dispatchFounderClaimPushes({
          ...env,
          AKIPASA_PUSH_STARTED_AT: startedAt,
        }),
      ).toEqual({ configured: false, sent: 0 });
      expect(fetcher).not.toHaveBeenCalled();
      expect(mocks.createClient).not.toHaveBeenCalled();
    },
  );
  it("sends one data-only message per eligible device with stable claim identity and session binding", async () => {
    expect(await dispatchFounderClaimPushes(env, claim)).toEqual({
      configured: true,
      sent: 2,
    });
    expect(rpc).toHaveBeenCalledWith("claim_due_push_deliveries", {
      p_claim: claim,
      p_started_at: env.AKIPASA_PUSH_STARTED_AT,
    });
    const messages = fetcher.mock.calls
      .filter((call) => String(call[0]).includes("fcm.googleapis.com"))
      .map(
        (call) =>
          JSON.parse(String((call as unknown as [string, RequestInit])[1].body))
            .message,
      );
    expect(messages).toHaveLength(2);
    expect(messages.map((message) => message.token)).toEqual([
      "token-device-1",
      "token-device-2",
    ]);
    for (const message of messages) {
      expect(message).not.toHaveProperty("notification");
      expect(message.data).toEqual({
        type: "venue_claim",
        claim_id: claim,
        event_id: claim,
        registration_key: session,
        locale: "es",
      });
    }
    // The actual SQL RPC rejects empty error strings, including successful ACKs.
    expect(rpc).toHaveBeenCalledWith(
      "finish_claim_push_delivery",
      expect.objectContaining({
        p_status: "sent",
        p_lease: "lease-1",
        p_error: null,
      }),
    );
  });
  it("never sends to revoked sessions or users absent from the environment allowlist", async () => {
    rpc.mockImplementation(async (name: string) => ({
      data:
        name === "claim_due_push_deliveries"
          ? jobs
          : name === "active_founder_push_device"
            ? []
            : true,
      error: null,
    }));
    expect((await dispatchFounderClaimPushes(env)).sent).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith(
      "finish_claim_push_delivery",
      expect.objectContaining({ p_status: "blocked", p_error: "ineligible" }),
    );
  });
  it("rechecks pending claim status before FCM", async () => {
    claimRead.mockResolvedValue({ data: { status: "approved" }, error: null });
    expect((await dispatchFounderClaimPushes(env)).sent).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("retries read failures safely before attempting provider delivery", async () => {
    claimRead.mockResolvedValue({ data: null, error: { code: "unavailable" } });
    await dispatchFounderClaimPushes(env);
    expect(rpc).toHaveBeenCalledWith(
      "finish_claim_push_delivery",
      expect.objectContaining({
        p_status: "failed",
        p_error: "eligibility_unavailable",
      }),
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("leaves timed-out sends blocked, avoiding duplicate retries without provider idempotency", async () => {
    fetcher.mockImplementation(async (url: string) => {
      if (url.includes("oauth2"))
        return Response.json({ access_token: "synthetic-access" });
      throw new Error("timeout");
    });
    await dispatchFounderClaimPushes(env);
    expect(rpc).toHaveBeenCalledWith(
      "finish_claim_push_delivery",
      expect.objectContaining({
        p_status: "blocked",
        p_error: "provider_unconfirmed",
      }),
    );
    expect(cleanup).not.toHaveBeenCalled();
  });
  it("supports genuine gated test data without customer claims while production is off", async () => {
    expect(
      await sendFounderTestPush(
        { ...env, AKIPASA_PUSH_ENABLED: "false" },
        {
          token: "synthetic-device-token",
          user_id: founder,
          session_id: session,
          expires_at: new Date(Date.now() + 60000).toISOString(),
          locale: "en",
        },
        claim,
      ),
    ).toEqual({ status: "sent", reason: "" });
    expect(mocks.createClient).not.toHaveBeenCalled();
    const send = fetcher.mock.calls.find((call) =>
      String(call[0]).includes("fcm.googleapis.com"),
    ) as unknown as [string, RequestInit];
    expect(JSON.parse(String(send[1].body)).message.data).toEqual({
      type: "founder_test",
      test_id: claim,
      event_id: claim,
      registration_key: session,
      locale: "en",
    });
  });
});
