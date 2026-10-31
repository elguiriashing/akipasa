import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  refreshSession: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  permanentRedirect: mocks.permanentRedirect,
}));
vi.mock("@/lib/supabase/middleware", () => ({
  refreshSession: mocks.refreshSession,
}));

import Home from "../src/app/page";
import BusinessMemberships from "../src/app/[locale]/business/memberships/page";
import DuermoMemberships from "../src/app/[locale]/duermo/memberships/page";
import { middleware } from "../src/middleware";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`temporary:${path}`);
  });
  mocks.permanentRedirect.mockImplementation((path: string) => {
    throw new Error(`permanent:${path}`);
  });
  mocks.refreshSession.mockImplementation(async (request: NextRequest) =>
    NextResponse.next({ request: { headers: request.headers } }),
  );
});

describe("redirect-only source pages", () => {
  it("keeps the root fallback permanent and Spanish", () => {
    expect(() => Home()).toThrow("permanent:/es");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  for (const [product, page] of [
    ["akibusiness", BusinessMemberships],
    ["akiduermo", DuermoMemberships],
  ] as const) {
    it.each(["en", "es", "fr", "en/../../auth", ""])(
      `${product} keeps canonical catalogue attribution for locale %j`,
      async (locale) => {
        const language = locale === "en" ? "en" : "es";
        await expect(
          page({ params: Promise.resolve({ locale }) }),
        ).rejects.toThrow(`temporary:/${language}/membership?from=${product}`);
        expect(mocks.redirect).toHaveBeenCalledTimes(1);
        expect(mocks.permanentRedirect).not.toHaveBeenCalled();
      },
    );
  }
});

describe("actual middleware entrypoint routing", () => {
  it.each(["akipasa.com", "www.akipasa.com"])(
    "%s root normalizes in one hop without losing campaign attribution",
    async (host) => {
      const query =
        "utm_source=partner&utm_campaign=costa%20del%20sol&campaign=a&campaign=b";
      const response = await middleware(
        new NextRequest(`https://${host}/?${query}`),
      );
      expect(response.status).toBe(308);
      const target = new URL(response.headers.get("location")!);
      expect(target.origin).toBe("https://akipasa.com");
      expect(target.pathname).toBe("/es");
      expect(target.search).toBe(`?${query}`);
      expect(mocks.refreshSession).not.toHaveBeenCalled();
    },
  );

  it.each(["en", "es"])(
    "%s legacy business membership first reaches its existing product host",
    async (locale) => {
      const response = await middleware(
        new NextRequest(
          `https://akipasa.com/${locale}/business/memberships?source=discovery&from=akiduermo`,
        ),
      );
      expect(response.status).toBe(307);
      const target = new URL(response.headers.get("location")!);
      expect(target.origin).toBe("https://business.akipasa.com");
      expect(target.pathname).toBe(`/${locale}/business/memberships`);
      expect(target.searchParams.get("source")).toBe("discovery");
      expect(mocks.refreshSession).not.toHaveBeenCalled();
      // The page's fixed attribution is authoritative after this host handoff.
      await expect(
        BusinessMemberships({ params: Promise.resolve({ locale }) }),
      ).rejects.toThrow(`temporary:/${locale}/membership?from=akibusiness`);
    },
  );
});
