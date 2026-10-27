import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequestCookies } from "next/dist/server/web/spec-extension/cookies";
import {
  appendMutableCookies,
  MutableRequestCookiesAdapter,
} from "next/dist/server/web/spec-extension/adapters/request-cookies";

const mocks = vi.hoisted(() => ({ cookies: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
// Keep the real Supabase SSR/Auth SDK, cookie serialization and native API path.
import { GET } from "../src/app/api/admin/push-devices/route";

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const sessionId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const cookieName = "sb-fixture-auth-token";
const user = {
  id: userId,
  aud: "authenticated",
  role: "authenticated",
  email: "founder@example.invalid",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
};
const jwt = (expiresAt: number) =>
  [
    { alg: "HS256", typ: "JWT" },
    {
      sub: userId,
      session_id: sessionId,
      aud: "authenticated",
      role: "authenticated",
      exp: expiresAt,
    },
  ]
    .map((part) => Buffer.from(JSON.stringify(part)).toString("base64url"))
    .join(".") + ".synthetic-signature";
let fetcher: ReturnType<typeof vi.fn>;
let refreshedToken: string;
let cookieStore: ReturnType<typeof MutableRequestCookiesAdapter.wrap>;

beforeEach(() => {
  const now = Math.floor(Date.now() / 1000);
  const oldSession = {
    access_token: jwt(now - 600),
    refresh_token: "synthetic-old-refresh",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now - 600,
    user,
  };
  refreshedToken = jwt(now + 3600);
  const cookie =
    "base64-" + Buffer.from(JSON.stringify(oldSession)).toString("base64url");
  cookieStore = MutableRequestCookiesAdapter.wrap(
    new RequestCookies(new Headers({ Cookie: cookieName + "=" + cookie })),
  );
  mocks.cookies.mockResolvedValue(cookieStore);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "synthetic-anon");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-service");
  vi.stubEnv("AKIPASA_PUSH_FOUNDER_IDS", userId);
  vi.stubEnv("AKIPASA_PUSH_ENROLLMENT_ENABLED", "true");
  vi.stubEnv("AKIPASA_PUSH_TEST_ENABLED", "false");
  fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.origin !== "https://fixture.supabase.co")
      throw new Error("Unexpected external request");
    if (url.pathname === "/auth/v1/token") {
      expect(url.searchParams.get("grant_type")).toBe("refresh_token");
      expect(JSON.parse(String(init?.body))).toEqual({
        refresh_token: "synthetic-old-refresh",
      });
      return Response.json({
        access_token: refreshedToken,
        refresh_token: "synthetic-rotated-refresh",
        token_type: "bearer",
        expires_in: 3600,
        user,
      });
    }
    if (url.pathname === "/auth/v1/user") return Response.json(user);
    if (url.pathname === "/rest/v1/rpc/active_founder_push_eligible") {
      expect(JSON.parse(String(init?.body))).toEqual({
        p_user: userId,
        p_session: sessionId,
      });
      return Response.json(true);
    }
    if (url.pathname === "/rest/v1/profiles")
      return Response.json({ preferred_locale: "es" });
    throw new Error("Unexpected fixture request: " + url.pathname);
  });
  vi.stubGlobal("fetch", fetcher);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("closed-app founder session refresh", () => {
  const request = () =>
    new Request("https://akipasa.com/api/admin/push-devices", {
      headers: {
        Origin: "https://akipasa.com",
        "User-Agent": "AkiPasaAndroid/5",
      },
    });
  it("refreshes an expired access cookie and returns the same session binding with rotated Set-Cookie", async () => {
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      eligible: true,
      registration_key: sessionId,
      locale: "es",
    });
    // This is the installed Next AppRoute handler's response-cookie merge, using
    // its real mutable cookie adapter rather than a fake auth/session result.
    const headers = new Headers(response.headers);
    expect(appendMutableCookies(headers, cookieStore)).toBe(true);
    expect(headers.get("set-cookie")).toContain(cookieName + "=");
    const saved = cookieStore
      .getAll()
      .filter((item) => item.name.startsWith(cookieName))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((item) => item.value)
      .join("");
    const session = JSON.parse(
      Buffer.from(saved.slice("base64-".length), "base64url").toString("utf8"),
    );
    expect(session.access_token).toBe(refreshedToken);
    expect(session.refresh_token).toBe("synthetic-rotated-refresh");
    expect(
      fetcher.mock.calls.filter(([url]) =>
        String(url).includes("/auth/v1/token"),
      ),
    ).toHaveLength(1);
  });
  it("fails closed when the refresh token is revoked and never checks device eligibility", async () => {
    fetcher.mockResolvedValue(
      Response.json(
        { error_code: "refresh_token_not_found", msg: "Invalid Refresh Token" },
        { status: 400 },
      ),
    );
    const response = await GET(request());
    expect(response.status).toBe(403);
    expect(
      fetcher.mock.calls.some(([url]) => String(url).includes("/rest/v1/")),
    ).toBe(false);
  });
});
