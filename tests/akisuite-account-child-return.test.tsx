import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { accountReturnPath } from "../src/lib/account-return-path";
const fixture = vi.hoisted(() => ({
  target: null as string | null,
  membership: null as string | null,
  requireUser: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({ requireUser: fixture.requireUser }));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers({
      ...(fixture.target ? { "x-akipasa-account-next": fixture.target } : {}),
      ...(fixture.membership
        ? { "x-akipasa-membership-next": fixture.membership }
        : {}),
    }),
}));
vi.mock("@/lib/supabase/middleware", () => ({
  refreshSession: async (request: NextRequest) =>
    NextResponse.next({ request: { headers: request.headers } }),
}));
import { middleware } from "../src/middleware";
import Layout from "../src/app/[locale]/account/layout";
import Profile from "../src/app/[locale]/account/profile/page";
import Settings from "../src/app/[locale]/account/settings/page";
import Privacy from "../src/app/[locale]/account/privacy/page";
import Premium from "../src/app/[locale]/account/premium/page";
import Activity from "../src/app/[locale]/account/activity/page";
import Rewards from "../src/app/[locale]/account/rewards/page";
import Saved from "../src/app/[locale]/account/saved/page";
import Following from "../src/app/[locale]/account/following/page";
import Bookings from "../src/app/[locale]/account/bookings/page";
import Referrals from "../src/app/[locale]/account/referrals/page";
import Operations from "../src/app/[locale]/account/subscription/operations/page";
beforeEach(() => {
  fixture.target = null;
  fixture.membership = null;
  fixture.requireUser.mockReset().mockRejectedValue(new Error("AUTH_BOUNDARY"));
});
afterEach(() => vi.clearAllMocks());
const pages = {
  profile: Profile,
  settings: Settings,
  privacy: Privacy,
  premium: Premium,
  activity: Activity,
  rewards: Rewards,
  saved: Saved,
  following: Following,
  bookings: Bookings,
  referrals: Referrals,
  "subscription/operations": Operations,
};
for (const locale of ["en", "es"] as const) {
  describe(`${locale} child return scope`, () => {
    for (const [child, Page] of Object.entries(pages))
      it(`preserves ${child} during parallel child authentication`, async () => {
        await expect(
          Page({
            params: Promise.resolve({ locale }),
            searchParams: Promise.resolve({}),
          }),
        ).rejects.toThrow("AUTH_BOUNDARY");
        expect(fixture.requireUser).toHaveBeenCalledWith(
          locale,
          `/${locale}/account/${child}`,
        );
      });
    it("overwrites forged current-path headers using the actual route", async () => {
      const response = await middleware(
        new NextRequest(
          `https://akipasa.com/${locale}/account/profile?updated=1&next=https://evil.invalid`,
          {
            headers: {
              "x-akipasa-account-next": "https://evil.invalid",
              "x-akipasa-membership-next": "/en/account/subscription",
            },
          },
        ),
      );
      const target = response.headers.get(
        "x-middleware-request-x-akipasa-account-next",
      );
      expect(target).toBe(`/${locale}/account/profile`);
      fixture.target = target;
      await expect(
        Layout({ children: null, params: Promise.resolve({ locale }) }),
      ).rejects.toThrow("AUTH_BOUNDARY");
      expect(fixture.requireUser).toHaveBeenCalledWith(
        locale,
        `/${locale}/account/profile`,
      );
    });
    it("preserves only actual supported collection/bookings/referral filters", () => {
      expect(
        accountReturnPath(
          locale,
          `/${locale}/account/saved?q=%20Costa%20%20del%20Sol%20&page=3&email=updated&token=secret`,
        ),
      ).toBe(`/${locale}/account/saved?q=Costa+del+Sol&page=3`);
      expect(
        accountReturnPath(
          locale,
          `/${locale}/account/following?q=M%C3%A1laga&page=2`,
        ),
      ).toBe(`/${locale}/account/following?q=M%C3%A1laga&page=2`);
      expect(
        accountReturnPath(
          locale,
          `/${locale}/account/bookings?tab=past&page=2&cancelled=1`,
        ),
      ).toBe(`/${locale}/account/bookings?tab=past&page=2`);
      expect(
        accountReturnPath(
          locale,
          `/${locale}/account/referrals?ref=ABCD1234&period=365&result=saved`,
        ),
      ).toBe(`/${locale}/account/referrals?ref=ABCD1234&period=365`);
      expect(
        accountReturnPath(
          locale,
          `/${locale}/account/profile?updated=1&error=none`,
        ),
      ).toBe(`/${locale}/account/profile`);
    });
    it("retains existing subscription and operations cross-product sanitizer", () => {
      expect(
        accountReturnPath(
          locale,
          `/${locale}/account/subscription?from=akiduermo&audience=business&access_token=secret`,
        ),
      ).toBe(
        `/${locale}/account/subscription?from=akiduermo&audience=business`,
      );
      expect(
        accountReturnPath(
          locale,
          `/${locale}/account/subscription/operations?workspace=qa-owner&tier=pro&next=https://evil.invalid`,
        ),
      ).toBe(
        `/${locale}/account/subscription/operations?workspace=qa-owner&tier=pro`,
      );
    });
    it("uses canonical page filters in child auth calls", async () => {
      await expect(
        Saved({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({
            q: "Málaga",
            page: "3",
            email: "updated",
          }),
        }),
      ).rejects.toThrow("AUTH_BOUNDARY");
      expect(fixture.requireUser).toHaveBeenLastCalledWith(
        locale,
        `/${locale}/account/saved?q=M%C3%A1laga&page=3`,
      );
      await expect(
        Operations({
          params: Promise.resolve({ locale }),
          searchParams: Promise.resolve({ workspace: "qa-owner", tier: "pro" }),
        }),
      ).rejects.toThrow("AUTH_BOUNDARY");
      expect(fixture.requireUser).toHaveBeenLastCalledWith(
        locale,
        `/${locale}/account/subscription/operations?workspace=qa-owner&tier=pro`,
      );
    });
  });
}
it.each([
  "//evil.invalid/en/account/profile",
  "https://evil.invalid/en/account/profile",
  "/es/account/profile",
  "/en/account/../profile",
  "/en/account/%2fprofile",
  "/en/account/unknown",
  "/en/account/export",
  "/en/account/profile\\evil",
])("rejects invalid target %s", (candidate) => {
  expect(accountReturnPath("en", candidate)).toBe("/en/account");
});
it("drops duplicate or invalid route filters", () => {
  expect(
    accountReturnPath("en", "/en/account/bookings?tab=past&tab=active&page=-1"),
  ).toBe("/en/account/bookings");
  expect(
    accountReturnPath("en", "/en/account/referrals?ref=evil&period=1"),
  ).toBe("/en/account/referrals");
});
it("does not forward spoofed account target on unrelated routes", async () => {
  const response = await middleware(
    new NextRequest("https://akipasa.com/en/map", {
      headers: { "x-akipasa-account-next": "/en/account/profile" },
    }),
  );
  expect(
    response.headers.get("x-middleware-request-x-akipasa-account-next"),
  ).toBeNull();
});
