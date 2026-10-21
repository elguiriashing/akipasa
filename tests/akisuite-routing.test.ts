import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
vi.mock("@/lib/supabase/middleware", () => ({
  refreshSession: async (request: NextRequest) =>
    NextResponse.next({ request: { headers: request.headers } }),
}));
import { middleware } from "../src/middleware";
describe("shared EN/ES membership host aliases", () => {
  it("overwrites spoofed membership headers and does not apply them to unrelated account routes", async () => {
    const forged = { "x-akipasa-membership-next": "https://attacker.example" };
    const request = new NextRequest(
      "https://akipasa.com/en/account/subscription?from=akiduermo",
      { headers: forged },
    );
    const response = await middleware(request);
    expect(
      response.headers.get("x-middleware-request-x-akipasa-membership-next"),
    ).toBe("/en/account/subscription?from=akiduermo");
    const unrelated = await middleware(
      new NextRequest("https://akipasa.com/en/account/settings", {
        headers: forged,
      }),
    );
    expect(
      unrelated.headers.get("x-middleware-request-x-akipasa-membership-next"),
    ).toBeNull();
  });
  for (const locale of ["en", "es"]) {
    for (const host of [
      "business.akipasa.com",
      "akiduermo.akipasa.com",
      "akipasa.com",
    ]) {
      for (const path of [
        "membership",
        "memberships",
        "account/membership",
        "account/memberships",
      ]) {
        it(`${host}/${locale}/${path} reaches the canonical catalogue or account`, async () => {
          const response = await middleware(
            new NextRequest(`https://${host}/${locale}/${path}`),
          );
          const location = response.headers.get("location");
          if (host === "akiduermo.akipasa.com" && path === "membership") {
            const target = new URL(location!);
            expect(target.hostname).toBe(host);
            expect(target.pathname).toBe("/membership");
            expect(target.searchParams.get("lang")).toBe(locale);
          } else if (host === "akipasa.com" && path === "membership")
            expect(location).toBeNull();
          else {
            const target = new URL(location!);
            expect(target.hostname).toBe("akipasa.com");
            expect(target.pathname).toBe(
              `/${locale}/${path.startsWith("account/") ? "account/subscription" : "membership"}`,
            );
            if (host !== "akipasa.com")
              expect(target.searchParams.get("from")).toBe(
                host === "business.akipasa.com" ? "akibusiness" : "akiduermo",
              );
          }
        });
      }
    }
  }
});
describe("trusted operating account destination", () => {
  for (const locale of ["en", "es"])
    it(`overwrites spoofed headers and preserves only validated ${locale} workspace`, async () => {
      const response = await middleware(
        new NextRequest(
          `https://akipasa.com/${locale}/account/subscription/operations?workspace=private-owner&next=https://evil.invalid`,
          { headers: { "x-akipasa-membership-next": "https://evil.invalid" } },
        ),
      );
      expect(
        response.headers.get("x-middleware-request-x-akipasa-membership-next"),
      ).toBe(
        `/${locale}/account/subscription/operations?workspace=private-owner`,
      );
    });
});
