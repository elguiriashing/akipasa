import { describe, expect, it, vi } from "vitest";
import { akiSuiteMembershipReturnPath } from "../src/lib/akisuite-catalogue";

it("retains only an approved single operating tier through authentication", () => {
  for (const locale of ["en", "es"] as const) {
    for (const tier of ["basico", "standard", "pro"]) {
      const path = `/${locale}/account/subscription/operations`;
      expect(
        akiSuiteMembershipReturnPath(
          locale,
          `${path}?workspace=private-owner&tier=${tier}&access_token=dummy&next=https://evil.invalid`,
        ),
      ).toBe(`${path}?workspace=private-owner&tier=${tier}`);
    }
    for (const query of [
      "tier=pro&tier=basico",
      "tier=enterprise",
      "tier=https://evil.invalid",
    ]) {
      const path = `/${locale}/account/subscription/operations`;
      expect(akiSuiteMembershipReturnPath(locale, `${path}?${query}`)).toBe(
        path,
      );
    }
  }
});
const fixture = vi.hoisted(() => ({
  next: null as string | null,
  requireUser: vi.fn(async () => {
    throw new Error("sign in required");
  }),
}));
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers(
      fixture.next ? { "x-akipasa-membership-next": fixture.next } : {},
    ),
}));
vi.mock("@/lib/auth", () => ({ requireUser: fixture.requireUser }));
vi.mock("@/components/WorkspaceShell", () => ({ WorkspaceShell: () => null }));
import AccountLayout from "../src/app/[locale]/account/layout";
describe("membership authentication return path", () => {
  for (const locale of ["en", "es"] as const)
    for (const app of ["akipasa", "akibusiness", "akiduermo", "akihq"]) {
      it(`keeps ${locale} ${app} through the parent layout`, async () => {
        fixture.next = `/${locale}/account/subscription?from=${app}`;
        await expect(
          AccountLayout({
            children: null,
            params: Promise.resolve({ locale }),
          }),
        ).rejects.toThrow("sign in required");
        expect(fixture.requireUser).toHaveBeenLastCalledWith(
          locale,
          fixture.next,
        );
      });
    }
  it("rejects external, wrong-locale and unrelated destinations", () => {
    for (const candidate of [
      "//attacker.example/en/account/subscription",
      "https://attacker.example/en/account/subscription",
      "/es/account/subscription",
      "/en/account/settings",
    ])
      expect(akiSuiteMembershipReturnPath("en", candidate)).toBe("/en/account");
  });
});
describe("operating subscription return scope", () => {
  for (const locale of ["en", "es"] as const)
    it(`retains ${locale} operations workspace through parent layout`, async () => {
      fixture.next = `/${locale}/account/subscription/operations?workspace=private-owner`;
      await expect(
        AccountLayout({ children: null, params: Promise.resolve({ locale }) }),
      ).rejects.toThrow("sign in required");
      expect(fixture.requireUser).toHaveBeenLastCalledWith(
        locale,
        fixture.next,
      );
    });
  it("drops unknown redirects, malformed and duplicate scopes without escaping allowed operations path", () => {
    for (const query of [
      "workspace=https://evil.invalid",
      "workspace=../evil",
      "workspace=one&workspace=two",
      "next=https://evil.invalid",
      "workspace=%2F%2Fevil.invalid",
    ])
      expect(
        akiSuiteMembershipReturnPath(
          "en",
          `/en/account/subscription/operations?${query}`,
        ),
      ).toBe("/en/account/subscription/operations");
    expect(
      akiSuiteMembershipReturnPath(
        "en",
        "https://evil.invalid/en/account/subscription/operations?workspace=private-owner",
      ),
    ).toBe("/en/account");
    expect(
      akiSuiteMembershipReturnPath(
        "en",
        "/es/account/subscription/operations?workspace=private-owner",
      ),
    ).toBe("/en/account");
  });
});
