import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
vi.mock("@/lib/supabase/middleware", () => ({
  refreshSession: async () => NextResponse.next(),
}));
import { middleware } from "../src/middleware";
describe("shared EN/ES membership host aliases", () => {
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
          if (host === "akipasa.com" && path === "membership")
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
